// Writes a stand-in google-services.json so the native project still compiles
// before the real one (Firebase Console → Android app) is available. A build
// made with it cannot sign in or reach Firestore, so CI never publishes it.
import fs from 'node:fs'

const file = new URL('../google-services.json', import.meta.url)
if (fs.existsSync(file)) {
  console.log('google-services.json already present — leaving it alone')
  process.exit(0)
}

fs.writeFileSync(
  file,
  JSON.stringify(
    {
      project_info: {
        project_number: '160829353648',
        project_id: 'car360-50b44',
        storage_bucket: 'car360-50b44.firebasestorage.app',
      },
      client: [
        {
          client_info: {
            mobilesdk_app_id: '1:160829353648:android:0000000000000000000000',
            android_client_info: { package_name: 'com.ohavs.car360' },
          },
          oauth_client: [],
          api_key: [{ current_key: 'placeholder-not-a-real-key' }],
          services: { appinvite_service: { other_platform_oauth_client: [] } },
        },
      ],
      configuration_version: '1',
    },
    null,
    2,
  ) + '\n',
)
console.log('wrote placeholder google-services.json')
