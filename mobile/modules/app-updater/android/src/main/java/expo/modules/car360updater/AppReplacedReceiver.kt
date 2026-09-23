package expo.modules.car360updater

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

internal const val PREFS_NAME = "car360_updater"
internal const val KEY_JUST_UPDATED = "just_updated_to"
private const val CHANNEL_ID = "app-updates"
private const val NOTIFICATION_ID = 36001

/**
 * Runs in the new version the moment an update has replaced the app.
 *
 * Installing an update stops the running app, and Android 10+ does not let a
 * background broadcast open an activity. So the new version asks to be brought
 * back (which some devices allow) and, in any case, posts a notification the
 * user can tap to return. It also leaves a note for JS to show "what's new".
 */
class AppReplacedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return

    val version = runCatching {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName
    }.getOrNull() ?: ""

    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_JUST_UPDATED, version)
      .apply()

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      ?: return

    runCatching { context.startActivity(launch) }
    postUpdatedNotification(context, version, launch)
  }

  private fun postUpdatedNotification(context: Context, version: String, launch: Intent) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = context.getSystemService(NotificationManager::class.java) ?: return

    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "עדכוני אפליקציה", NotificationManager.IMPORTANCE_DEFAULT)
    )

    val tap = PendingIntent.getActivity(
      context,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.car360_notification)
      .setColor(0xFFDC2626.toInt())
      .setContentTitle("Car360 עודכן")
      .setContentText(if (version.isNotEmpty()) "גרסה $version מוכנה · הקישו לפתיחה" else "הקישו לפתיחה")
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()
    manager.notify(NOTIFICATION_ID, notification)
  }

  companion object {
    fun dismissNotification(context: Context) {
      context.getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
    }
  }
}
