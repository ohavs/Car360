package expo.modules.car360updater

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

private const val ACTION_INSTALL_STATUS = "com.ohavs.car360.UPDATE_INSTALL_STATUS"
private const val APK_NAME = "car360-update.apk"
private const val PROGRESS_INTERVAL_MS = 120L
private const val KEY_RESUME_UPDATE = "resume_update"

/**
 * In-app updates for a sideloaded app.
 *
 * download() streams the APK from the GitHub release into the cache while
 * hashing it, so a truncated or tampered file is rejected before Android ever
 * sees it. install() hands it to PackageInstaller as a session — on Android 12+
 * an app that updates *itself* may skip the confirmation dialog entirely; where
 * the system still wants one, we get STATUS_PENDING_USER_ACTION and show it.
 */
class AppUpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val cancelled = AtomicBoolean(false)
  private val downloading = AtomicBoolean(false)
  private var statusReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("CarAppUpdater")

    Events("onDownloadProgress", "onInstallStatus")

    OnCreate {
      ensureStatusReceiver()
    }

    OnDestroy {
      statusReceiver?.let { runCatching { context.unregisterReceiver(it) } }
      statusReceiver = null
    }

    /** Whether the user has allowed Car360 to install apps ("install unknown apps"). */
    Function("canRequestPackageInstalls") {
      context.packageManager.canRequestPackageInstalls()
    }

    /** Opens the one system screen where "allow from this source" is toggled for Car360. */
    Function("openInstallPermissionSettings") {
      // Android may restart the app when that permission changes; remember
      // that an update was under way so the next launch can pick it up
      prefs().edit().putBoolean(KEY_RESUME_UPDATE, true).apply()
      val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      (appContext.currentActivity ?: context).startActivity(intent)
    }

    /** true once after the user was sent to grant the install permission */
    Function("consumeResumeRequest") {
      val requested = prefs().getBoolean(KEY_RESUME_UPDATE, false)
      if (requested) prefs().edit().remove(KEY_RESUME_UPDATE).apply()
      requested
    }

    /** Set by the receiver after an update, read once by JS to show "what's new". */
    Function("consumeJustUpdated") {
      val version = prefs().getString(KEY_JUST_UPDATED, null)
      if (version != null) prefs().edit().remove(KEY_JUST_UPDATED).apply()
      AppReplacedReceiver.dismissNotification(context)
      version
    }

    AsyncFunction("download") { url: String, sha256: String, expectedSize: Double, promise: Promise ->
      if (!downloading.compareAndSet(false, true)) {
        promise.reject("E_BUSY", "A download is already in progress", null)
        return@AsyncFunction
      }
      cancelled.set(false)
      thread(name = "car360-update-download") {
        try {
          val file = downloadVerified(url, sha256, expectedSize.toLong())
          promise.resolve(file.absolutePath)
        } catch (e: DownloadCancelled) {
          promise.reject("E_CANCELLED", "The download was cancelled", e)
        } catch (e: ChecksumMismatch) {
          promise.reject("E_CHECKSUM", e.message, e)
        } catch (e: Exception) {
          promise.reject("E_DOWNLOAD", e.message ?: "Download failed", e)
        } finally {
          downloading.set(false)
        }
      }
    }

    Function("cancelDownload") {
      cancelled.set(true)
    }

    AsyncFunction("install") { path: String, promise: Promise ->
      try {
        commitInstallSession(File(path))
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_INSTALL", e.message ?: "Could not start the installation", e)
      }
    }

    /** Frees the cache space an earlier update used. Safe to call on every launch. */
    Function("cleanup") {
      if (!downloading.get()) updatesDir().deleteRecursively()
    }
  }

  private fun updatesDir() = File(context.cacheDir, "updates")

  private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun downloadVerified(url: String, sha256: String, expectedSize: Long): File {
    val dir = updatesDir().apply { mkdirs() }
    val partial = File(dir, "$APK_NAME.part")
    val target = File(dir, APK_NAME)
    partial.delete()
    target.delete()

    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      // GitHub answers release downloads with a redirect to its asset CDN
      instanceFollowRedirects = true
      connectTimeout = 20_000
      readTimeout = 30_000
      setRequestProperty("Accept", "application/octet-stream")
    }
    try {
      val code = connection.responseCode
      if (code !in 200..299) throw IOException("Server answered HTTP $code")

      val total = connection.contentLengthLong.takeIf { it > 0 } ?: expectedSize
      val digest = MessageDigest.getInstance("SHA-256")
      var received = 0L
      var lastEmit = 0L

      connection.inputStream.use { input ->
        partial.outputStream().use { output ->
          val buffer = ByteArray(64 * 1024)
          while (true) {
            if (cancelled.get()) throw DownloadCancelled()
            val read = input.read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            digest.update(buffer, 0, read)
            received += read
            val now = System.currentTimeMillis()
            if (now - lastEmit >= PROGRESS_INTERVAL_MS) {
              lastEmit = now
              emitProgress(received, total)
            }
          }
        }
      }
      emitProgress(received, total)

      if (expectedSize > 0 && received != expectedSize) {
        partial.delete()
        throw ChecksumMismatch("Expected $expectedSize bytes but received $received")
      }
      val actual = digest.digest().joinToString("") { "%02x".format(it) }
      if (!actual.equals(sha256.trim(), ignoreCase = true)) {
        partial.delete()
        throw ChecksumMismatch("The downloaded file does not match its checksum")
      }
      if (!partial.renameTo(target)) throw IOException("Could not finalise the downloaded file")
      return target
    } catch (e: Exception) {
      partial.delete()
      throw e
    } finally {
      connection.disconnect()
    }
  }

  private fun emitProgress(received: Long, total: Long) {
    sendEvent(
      "onDownloadProgress",
      mapOf("received" to received.toDouble(), "total" to total.toDouble())
    )
  }

  private fun commitInstallSession(apk: File) {
    if (!apk.exists()) throw IOException("The update file is missing — download it again")
    // without it a "please confirm" status would arrive with nobody to show the dialog
    ensureStatusReceiver()

    val installer = context.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
      setAppPackageName(context.packageName)
      setSize(apk.length())
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
      }
    }

    val sessionId = installer.createSession(params)
    installer.openSession(sessionId).use { session ->
      apk.inputStream().use { input ->
        session.openWrite(APK_NAME, 0, apk.length()).use { output ->
          input.copyTo(output)
          session.fsync(output)
        }
      }
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or
        // the installer fills the status extras in, so the intent must stay mutable
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
      val statusIntent = Intent(ACTION_INSTALL_STATUS).setPackage(context.packageName)
      val pending = PendingIntent.getBroadcast(context, sessionId, statusIntent, flags)
      session.commit(pending.intentSender)
    }
  }

  private fun ensureStatusReceiver() {
    if (statusReceiver != null) return
    val ctx = appContext.reactContext ?: return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context, intent: Intent) {
        handleInstallStatus(receiverContext, intent)
      }
    }
    val filter = IntentFilter(ACTION_INSTALL_STATUS)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      ctx.registerReceiver(receiver, filter)
    }
    statusReceiver = receiver
  }

  private fun handleInstallStatus(receiverContext: Context, intent: Intent) {
    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
    val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
    when (status) {
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        val confirm: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableExtra(Intent.EXTRA_INTENT)
        }
        if (confirm != null) {
          confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          (appContext.currentActivity ?: receiverContext).startActivity(confirm)
        }
        sendEvent("onInstallStatus", mapOf("status" to "pendingUserAction"))
      }
      PackageInstaller.STATUS_SUCCESS ->
        // usually never seen: Android stops this process to replace the app
        sendEvent("onInstallStatus", mapOf("status" to "success"))
      else ->
        sendEvent(
          "onInstallStatus",
          mapOf("status" to "failure", "code" to status, "message" to (message ?: "Installation failed"))
        )
    }
  }

  private class DownloadCancelled : Exception()
  private class ChecksumMismatch(message: String) : Exception(message)
}
