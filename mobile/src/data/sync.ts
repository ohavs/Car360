/**
 * Writes that are safe on this phone but not yet on the server.
 *
 * Firestore keeps every write in its on-device cache the moment it is made
 * and syncs it when the connection returns — but on Android the write's
 * promise only settles once the *server* confirms. Offline (an underground
 * car park) that means a "saving…" spinner that never ends. `commit` waits a
 * short moment for the server and otherwise carries on: the data is already
 * safe locally, and the listeners below let the UI say so.
 */
const GRACE_MS = 1500

type Listener = () => void
const listeners = new Set<Listener>()

/** Called once per write that had to be left for later. */
export function onQueuedWrite(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function commit(write: Promise<unknown>): Promise<void> {
  let settled = false
  // a real failure (rules, bad data) still surfaces if it comes quickly
  const done = write.then(
    () => {
      settled = true
    },
    (e: unknown) => {
      settled = true
      throw e
    },
  )
  const grace = new Promise<void>((resolve) => setTimeout(resolve, GRACE_MS))
  await Promise.race([done, grace])
  if (!settled) {
    // keep the eventual outcome from surfacing as an unhandled rejection
    done.catch(() => {})
    listeners.forEach((l) => l())
  }
}
