import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'

/**
 * Opens the share sheet for a stored photo — a Storage URL (downloaded to the
 * cache first) or an inline data: image from the web app's older records.
 */
export async function sharePhoto(url: string, name = 'car360'): Promise<void> {
  const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'car360'
  let uri: string
  if (url.startsWith('data:')) {
    const [meta, data] = url.split(',', 2)
    const ext = meta.includes('png') ? 'png' : meta.includes('jpeg') ? 'jpg' : 'webp'
    const file = new File(Paths.cache, `${safe}-${Date.now()}.${ext}`)
    file.write(data, { encoding: 'base64' })
    uri = file.uri
  } else if (url.startsWith('http')) {
    const file = new File(Paths.cache, `${safe}-${Date.now()}.webp`)
    uri = (await File.downloadFileAsync(url, file)).uri
  } else {
    uri = url
  }
  await shareAsync(uri, { dialogTitle: name })
}
