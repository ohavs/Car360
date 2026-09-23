import * as Application from 'expo-application'
import Constants from 'expo-constants'

/** What CI publishes next to every APK (see .github/workflows/android.yml). */
export interface ReleaseInfo {
  versionCode: number
  versionName: string
  channel: 'stable' | 'beta'
  apk: { url: string; sha256: string; size: number }
  notes: string[]
  publishedAt: string
}

export type Channel = 'stable' | 'beta'

const extra = Constants.expoConfig?.extra ?? {}
const REPO: string = extra.updates?.repo ?? 'ohavs/Car360'

/** Builds from `main` follow stable releases; every other build (branch
 *  builds, local builds) follows beta, which also includes stable ones. */
export const buildChannel: Channel = extra.channel === 'stable' ? 'stable' : 'beta'

export const installedVersion = {
  code: Number(Application.nativeBuildVersion ?? 0),
  name: Application.nativeApplicationVersion ?? '0.0.0',
}

class NotFound extends Error {}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
  if (res.status === 404) throw new NotFound(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

function parseRelease(raw: unknown): ReleaseInfo {
  const r = raw as Partial<ReleaseInfo> | null
  const apk = r?.apk
  if (
    !r ||
    typeof r.versionCode !== 'number' ||
    typeof r.versionName !== 'string' ||
    !apk ||
    typeof apk.url !== 'string' ||
    typeof apk.sha256 !== 'string' ||
    typeof apk.size !== 'number'
  ) {
    throw new Error('latest.json is malformed')
  }
  return {
    versionCode: r.versionCode,
    versionName: r.versionName,
    channel: r.channel === 'stable' ? 'stable' : 'beta',
    apk: { url: apk.url, sha256: apk.sha256, size: apk.size },
    notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === 'string') : [],
    publishedAt: typeof r.publishedAt === 'string' ? r.publishedAt : '',
  }
}

interface GitHubRelease {
  tag_name: string
  draft: boolean
  assets: { name: string; browser_download_url: string }[]
}

/** tags look like android-v0.1.0-b57 — the number after "b" is the versionCode */
function codeFromTag(tag: string): number {
  const m = /-b(\d+)$/.exec(tag)
  return m ? Number(m[1]) : 0
}

/** The newest published build for a channel, or null when there is none yet. */
export async function findLatestRelease(channel: Channel): Promise<ReleaseInfo | null> {
  try {
    if (channel === 'stable') {
      // a stable redirect URL that always points at the newest non-prerelease
      return parseRelease(await fetchJson(`https://github.com/${REPO}/releases/latest/download/latest.json`))
    }
    const releases = await fetchJson<GitHubRelease[]>(`https://api.github.com/repos/${REPO}/releases?per_page=30`)
    const newest = releases
      .filter((r) => !r.draft && r.tag_name.startsWith('android-'))
      .sort((a, b) => codeFromTag(b.tag_name) - codeFromTag(a.tag_name))[0]
    const manifest = newest?.assets.find((a) => a.name === 'latest.json')
    if (!manifest) return null
    return parseRelease(await fetchJson(manifest.browser_download_url))
  } catch (error) {
    if (error instanceof NotFound) return null
    throw error
  }
}
