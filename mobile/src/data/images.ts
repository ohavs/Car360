import { deleteObject, getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import DocumentScanner from 'react-native-document-scanner-plugin'
import { File, Paths } from 'expo-file-system'
import ImageTools from '../../modules/image-tools'
import { enqueue } from './uploadQueue'

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

/** Storage isn't set up for the project: the only way to keep the photo is inline. */
const STORAGE_MISSING = ['storage/unauthorized', 'storage/bucket-not-found', 'storage/project-not-found', 'storage/unauthenticated']

/**
 * Stores a local photo and returns the URL to save in Firestore (`owner` is
 * the document that will hold it). Online: uploads and returns the download
 * URL. Offline: the photo waits on the phone and uploads itself later (see
 * uploadQueue). Only if Storage isn't enabled at all does it fall back to an
 * inline image, like the web app.
 */
export async function uploadImage(localUri: string, path: string, profile: ImageProfile, owner: string): Promise<string> {
  const small = await compress(localUri, profile)
  try {
    const target = ref(getStorage(), path)
    await putFile(target, small.uri, { contentType: 'image/webp' })
    return await getDownloadURL(target)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (STORAGE_MISSING.includes(code)) {
      const inline = await compress(localUri, profile, true)
      return `data:image/webp;base64,${inline.base64}`
    }
    return await enqueue(small.uri, path, owner)
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

export type PickSource = 'camera' | 'library' | 'scan' | 'pdf'

/** Camera, gallery, or the document scanner (Google's: finds the edges,
 *  straightens and crops); returns local URIs, empty when cancelled. */
export async function pickImages(source: PickSource, multiple: boolean): Promise<string[]> {
  if (source === 'pdf') {
    // a PDF becomes page images (on the device), then goes through the same
    // compression as photos — ~200KB a page, viewable and zoomable in the app
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (res.canceled || !res.assets[0]) return []
    const pages = await ImageTools.renderPdf(res.assets[0].uri, multiple ? PDF_MAX_PAGES : 1, 1600)
    return pages
  }
  if (source === 'scan') {
    const res = await DocumentScanner.scanDocument({ maxNumDocuments: multiple ? 10 : 1, croppedImageQuality: 95 })
    return res.status === 'success' ? (res.scannedImages ?? []) : []
  }
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

/** a long PDF stops here — policies and receipts are a few pages */
export const PDF_MAX_PAGES = 8

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
  owner: string,
): Promise<{ photos: string[]; thumbs: string[] }> {
  const now = Date.now()
  const stored = await Promise.all(
    photos.map(async (p, i) => {
      if (!isLocal(p)) {
        const at = previous?.photos.indexOf(p) ?? -1
        return { photo: p, thumb: (at >= 0 && previous?.thumbs?.[at]) || p }
      }
      const photo = await uploadImage(p, `${dir}/${id}-${i}-${now}.webp`, 'document', owner)
      // a thumbnail problem must never block the save
      const thumb = await uploadImage(p, `${dir}/${id}-${i}-${now}-thumb.webp`, 'thumb', owner).catch(() => photo)
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

/**
 * Cuts the car out of its photo (on the device, ML Kit). Returns a local
 * transparent PNG; the photo is shrunk first so it takes a second, not ten.
 * Throws ModelNotReady while Play services is still fetching the model.
 */
export async function removeBackground(uri: string): Promise<string> {
  let local = uri
  if (uri.startsWith('http')) {
    local = (await File.downloadFileAsync(uri, new File(Paths.cache, `car360-src-${Date.now()}.img`))).uri
  }
  const small = await compress(local, 'hero')
  try {
    return await ImageTools.removeBackground(small.uri)
  } catch (e) {
    if (String((e as { code?: string }).code ?? e).includes('MODEL_DOWNLOADING')) throw new ModelNotReady()
    throw e
  }
}

export class ModelNotReady extends Error {}

/** A document page: the full image to read, and a small one for grids. */
export async function storeDocumentImage(local: string, carId: string, id: string): Promise<{ imageUrl: string; thumbUrl: string }> {
  const now = Date.now()
  const owner = `cars/${carId}/documents/${id}`
  const imageUrl = await uploadImage(local, `cars/${carId}/documents/${id}-${now}.webp`, 'document', owner)
  // a thumbnail problem never blocks the save — the grid falls back to the full image
  const thumbUrl = await uploadImage(local, `cars/${carId}/documents/${id}-${now}-thumb.webp`, 'thumb', owner).catch(() => imageUrl)
  return { imageUrl, thumbUrl }
}
