import { deleteObject, getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

/** Same budgets as the web app: a phone photo becomes ~100–350KB of WebP. */
const PROFILES = {
  hero: { max: 1280, quality: 0.82 },
  document: { max: 1600, quality: 0.8 },
  thumb: { max: 480, quality: 0.7 },
} as const

export type ImageProfile = keyof typeof PROFILES

export interface Compressed {
  uri: string
  base64?: string
}

/** Resize (never upscale) and re-encode as WebP on the device. */
export async function compress(uri: string, profile: ImageProfile, withBase64 = false): Promise<Compressed> {
  const { max, quality } = PROFILES[profile]
  const probe = await ImageManipulator.manipulate(uri).renderAsync()
  const scale = Math.min(1, max / Math.max(probe.width, probe.height))
  const context = ImageManipulator.manipulate(uri)
  if (scale < 1) context.resize({ width: Math.round(probe.width * scale), height: Math.round(probe.height * scale) })
  const image = await context.renderAsync()
  const out = await image.saveAsync({ format: SaveFormat.WEBP, compress: quality, base64: withBase64 })
  return { uri: out.uri, base64: out.base64 }
}

/**
 * Stores a local photo and returns the URL to save in Firestore.
 * With Storage available: uploads and returns its download URL. Without it
 * (not enabled, offline): keeps the compressed image inline as a data URL,
 * exactly like the web app does, so saving never fails over a photo.
 */
export async function uploadImage(localUri: string, path: string, profile: ImageProfile): Promise<string> {
  const small = await compress(localUri, profile, true)
  try {
    const target = ref(getStorage(), path)
    await putFile(target, small.uri, { contentType: 'image/webp' })
    return await getDownloadURL(target)
  } catch {
    return `data:image/webp;base64,${small.base64}`
  }
}

export async function deleteImage(url: string): Promise<void> {
  if (!url.startsWith('https://')) return
  try {
    await deleteObject(ref(getStorage(), url))
  } catch {
    // already gone or not ours — never block a delete over a photo
  }
}

export type PickSource = 'camera' | 'library'

/** Camera or gallery; returns local URIs (empty when cancelled or refused). */
export async function pickImages(source: PickSource, multiple: boolean): Promise<string[]> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) throw new PermissionDenied()
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    return res.canceled ? [] : res.assets.map((a) => a.uri)
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 1,
  })
  return res.canceled ? [] : res.assets.map((a) => a.uri)
}

export class PermissionDenied extends Error {}

/** A photo that is still on the device (not yet uploaded). */
export const isLocal = (uri: string) => uri.startsWith('file:') || uri.startsWith('content:')

/**
 * Uploads the photos of a record that are still local, with a small
 * thumbnail for each (index-aligned, like the web app). Photos already
 * stored keep their URL and their previous thumbnail.
 */
export async function storePhotos(
  photos: string[],
  previous: { photos: string[]; thumbs?: string[] } | undefined,
  dir: string,
  id: string,
): Promise<{ photos: string[]; thumbs: string[] }> {
  const now = Date.now()
  const stored = await Promise.all(
    photos.map(async (p, i) => {
      if (!isLocal(p)) {
        const at = previous?.photos.indexOf(p) ?? -1
        return { photo: p, thumb: (at >= 0 && previous?.thumbs?.[at]) || p }
      }
      const photo = await uploadImage(p, `${dir}/${id}-${i}-${now}.webp`, 'document')
      // a thumbnail problem must never block the save
      const thumb = await uploadImage(p, `${dir}/${id}-${i}-${now}-thumb.webp`, 'thumb').catch(() => photo)
      return { photo, thumb }
    }),
  )
  return { photos: stored.map((s) => s.photo), thumbs: stored.map((s) => s.thumb) }
}

/** Photos the user removed from a record while editing — delete them from Storage after the save. */
export function removedPhotos(
  previous: { photos: string[]; thumbs?: string[] } | undefined,
  kept: string[],
): string[] {
  if (!previous) return []
  return previous.photos.flatMap((p, i) => {
    if (kept.includes(p)) return []
    const thumb = previous.thumbs?.[i]
    return thumb && thumb !== p ? [p, thumb] : [p]
  })
}
