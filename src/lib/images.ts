import imageCompression from 'browser-image-compression'

/** Compression profiles: the hero car photo gets a bit more resolution than
 *  receipts/documents. All output is WebP to keep payloads small. */
const PROFILES = {
  hero: { maxSizeMB: 0.35, maxWidthOrHeight: 1280 },
  document: { maxSizeMB: 0.25, maxWidthOrHeight: 1600 },
  thumb: { maxSizeMB: 0.08, maxWidthOrHeight: 480 },
} as const

export type ImageProfile = keyof typeof PROFILES

/** Compress a user-picked image and return it as a data URL.
 *  Keeps the app fast: a 6MB phone photo becomes ~100-350KB. */
export async function compressToDataUrl(file: File, profile: ImageProfile = 'document'): Promise<string> {
  const opts = PROFILES[profile]
  const compressed = await imageCompression(file, {
    maxSizeMB: opts.maxSizeMB,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  })
  return blobToDataUrl(compressed)
}

export async function compressToBlob(file: File, profile: ImageProfile = 'document'): Promise<Blob> {
  const opts = PROFILES[profile]
  return imageCompression(file, {
    maxSizeMB: opts.maxSizeMB,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  })
}

/** Build a small rendition of an already-compressed image so lists can show a
 *  64px square without downloading the full ~250KB original.
 *
 *  Returns null on any failure — callers must fall back to the full image, so
 *  a thumbnail problem can never block saving the record itself. */
export async function makeThumb(dataUrl: string): Promise<string | null> {
  try {
    if (!dataUrl.startsWith('data:')) return null
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], 'photo.webp', { type: blob.type || 'image/webp' })
    return await compressToDataUrl(file, 'thumb')
  } catch {
    return null
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
