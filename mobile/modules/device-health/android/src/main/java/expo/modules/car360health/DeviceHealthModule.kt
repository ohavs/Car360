package expo.modules.car360health

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The system settings that decide whether a scheduled reminder actually rings
 * on time — for the "why didn't I get a notification?" screen.
 */
class DeviceHealthModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun start(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    (appContext.currentActivity ?: context).startActivity(intent)
  }

  override fun definition() = ModuleDefinition {
    Name("CarDeviceHealth")

    /** exact alarms: without them Android may delay a reminder by minutes to hours */
    Function("canScheduleExactAlarms") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        start(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")))
      }
    }

    /** battery optimisation: vendors (Samsung, Xiaomi) may hold alarms of optimised apps */
    Function("isIgnoringBatteryOptimizations") {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      power.isIgnoringBatteryOptimizations(context.packageName)
    }

    /** the system's own "allow Car360 to run in the background?" dialog */
    Function("requestIgnoreBatteryOptimizations") {
      runCatching {
        start(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")))
      }.onFailure {
        start(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      }
    }

    /** Car360's notification settings (all channels) */
    Function("openNotificationSettings") {
      start(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
    }

    /** one channel's settings (sound, importance) */
    Function("openChannelSettings") { channelId: String ->
      start(
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          .putExtra(Settings.EXTRA_CHANNEL_ID, channelId),
      )
    }

    /** "samsung", "xiaomi"… — for vendor-specific battery advice */
    Function("manufacturer") {
      Build.MANUFACTURER.lowercase()
    }
  }
}
