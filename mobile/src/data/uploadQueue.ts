import { doc, getDoc, getFirestore, updateDoc } from '@react-native-firebase/firestore'
import { getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage'
import { Directory, File, Paths } from 'expo-file-system'
import { readPref, writePref } from '../lib/storage'

/**
 * Photos taken without a connection. The compressed file waits in the app's
 * own storage and the record points at it (so this phone shows it at once);
 * when the network returns it is uploaded and the record is switched to the
 * real URL. Nothing is inlined into Firestore, so a record never outgrows
 * its 1MB limit over photos.
 */
interface Pending {
  /** file:// URI saved in the record until the upload lands */
  local: string
  /** Storage path to upload to */
  path: string
  /** Firestore document that references `local` (cars/… or cars/…/sub/…) */
  owner: string
}

const KEY = 'uploadQueue'
const dir = () => new Directory(Paths.document, 'pending-uploads')
const read = () => readPref<Pending[]>(KEY, [])
const write = (items: Pending[]) => writePref(KEY, items)

type Listener = () => void
const listeners = new Set<Listener>()
export const onEnqueued = (l: Listener) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const pendingCount = () => read().length

/** Keeps a compressed photo for later and returns the URI to store meanwhile. */
export async function enqueue(compressedUri: string, path: string, owner: string): Promise<string> {
  const folder = dir()
  if (!folder.exists) folder.create({ intermediates: true })
  const file = new File(folder, path.replace(/[^\w.-]+/g, '_'))
  if (file.exists) file.delete()
  await new File(compressedUri).copy(file)
  write([...read(), { local: file.uri, path, owner }])
  listeners.forEach((l) => l())
  return file.uri
}

const FIELDS = ['imageUrl', 'photos', 'thumbs'] as const

let running = false

/** Uploads what's waiting; safe to call often (one run at a time). */
export async function processUploadQueue(): Promise<void> {
  if (running) return
  running = true
  try {
    for (const item of read()) {
      const file = new File(item.local)
      const drop = () => {
        write(read().filter((i) => i.local !== item.local))
        if (file.exists) file.delete()
      }
      if (!file.exists) {
        drop()
        continue
      }
      let url: string
      try {
        const target = ref(getStorage(), item.path)
        await putFile(target, item.local, { contentType: 'image/webp' })
        url = await getDownloadURL(target)
      } catch {
        // still offline — stop for now, the next run retries in order
        break
      }
      const snap = await getDoc(doc(getFirestore(), item.owner))
      const data = snap.data() as Record<string, unknown> | undefined
      if (data) {
        const patch: Record<string, unknown> = {}
        for (const f of FIELDS) {
          const v = data[f]
          if (v === item.local) patch[f] = url
          else if (Array.isArray(v) && v.includes(item.local)) patch[f] = v.map((x) => (x === item.local ? url : x))
        }
        if (Object.keys(patch).length) await updateDoc(doc(getFirestore(), item.owner), patch)
      }
      drop()
    }
  } finally {
    running = false
  }
}
