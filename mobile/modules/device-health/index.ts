import { requireNativeModule } from 'expo'

declare class CarDeviceHealthModule {
  canScheduleExactAlarms(): boolean
  openExactAlarmSettings(): void
  isIgnoringBatteryOptimizations(): boolean
  requestIgnoreBatteryOptimizations(): void
  openNotificationSettings(): void
  openChannelSettings(channelId: string): void
  manufacturer(): string
}

export default requireNativeModule<CarDeviceHealthModule>('CarDeviceHealth')
