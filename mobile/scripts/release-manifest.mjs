// Writes latest.json — what the in-app updater reads — next to the built APK.
//
//   node scripts/release-manifest.mjs <apk> <out-dir>
//
// Reads from the environment (set by .github/workflows/android.yml):
//   GITHUB_REPOSITORY, RELEASE_TAG, APK_NAME, ANDROID_VERSION_CODE,
//   CAR360_CHANNEL, PREVIOUS_TAG (optional)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const [apkPath, outDir] = process.argv.slice(2)
if (!apkPath || !outDir) {
  console.error('usage: release-manifest.mjs <apk> <out-dir>')
  process.exit(1)
}

const env = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name}`)
  return value
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const bytes = fs.readFileSync(apkPath)

/** Commit subjects since the previous Android release that touched the app. */
function releaseNotes() {
  const log = (range) =>
    execFileSync(
      'git',
      // :(top) — CI runs this from mobile/, but the paths are repo-relative
      ['log', '--no-merges', '--pretty=%s', ...range, '--', ':(top)mobile', ':(top)shared'],
      { encoding: 'utf8' },
    )
  const previous = process.env.PREVIOUS_TAG
  let out
  try {
    out = log(previous ? [`${previous}..HEAD`] : ['-n', '10', 'HEAD'])
  } catch {
    // an unknown tag must not block a release — fall back to recent history
    out = log(['-n', '10', 'HEAD'])
  }
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
}

const tag = env('RELEASE_TAG')
const apkName = env('APK_NAME')
const manifest = {
  versionCode: Number(env('ANDROID_VERSION_CODE')),
  versionName: pkg.version,
  channel: env('CAR360_CHANNEL') === 'stable' ? 'stable' : 'beta',
  apk: {
    url: `https://github.com/${env('GITHUB_REPOSITORY')}/releases/download/${tag}/${apkName}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.length,
  },
  notes: releaseNotes(),
  publishedAt: new Date().toISOString(),
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(
  path.join(outDir, 'notes.md'),
  [`**Car360 ${manifest.versionName} (build ${manifest.versionCode})** · ${manifest.channel}`, '', ...manifest.notes.map((n) => `- ${n}`)].join('\n') +
    '\n',
)
console.log(JSON.stringify(manifest, null, 2))
