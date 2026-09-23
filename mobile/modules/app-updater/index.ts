import { NativeModule, requireNativeModule } from 'expo'

export interface DownloadProgress {
  received: number
  total: number
}

export type InstallStatus =
  | { status: 'pendingUserAction' }
  | { status: 'success' }
  | { status: 'failure'; code: number; message: string }

type Events = {
  onDownloadProgress: (event: DownloadProgress) => void
  onInstallStatus: (event: InstallStatus) => void
}

declare class CarAppUpdaterModule extends NativeModule<Events> {
  /** false until the user allows "install unknown apps" for Car360 */
  canRequestPackageInstalls(): boolean
  openInstallPermissionSettings(): void
  /** true once, on the launch after the user was sent to grant the install permission */
  consumeResumeRequest(): boolean
  /** the version name this launch was updated to, once; null otherwise */
  consumeJustUpdated(): string | null
  /** resolves with the local path of the verified APK */
  download(url: string, sha256: string, expectedSize: number): Promise<string>
  cancelDownload(): void
  install(path: string): Promise<void>
  cleanup(): void
}

export default requireNativeModule<CarAppUpdaterModule>('CarAppUpdater')
