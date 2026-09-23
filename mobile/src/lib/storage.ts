import Storage from 'expo-sqlite/kv-store'

/** Small, synchronous on-device preferences (theme, open sections, drafts).
 *  Synchronous so the first frame already renders with the saved theme. */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(`car360:${key}`)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    if (value === undefined || value === null) Storage.removeItemSync(`car360:${key}`)
    else Storage.setItemSync(`car360:${key}`, JSON.stringify(value))
  } catch {
    // storage unavailable — the preference just will not survive a restart
  }
}
