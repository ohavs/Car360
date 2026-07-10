/** Pull a vibrant dominant color out of a car photo so the cockpit can theme
 *  itself per-car. Runs on a tiny downscaled canvas — cheap and synchronous
 *  once the image has loaded. Falls back to null on any error (tainted canvas,
 *  load failure) so callers keep the default theme. */

export interface CarColor {
  hex: string
  /** h s l for building soft glows */
  h: number
  s: number
  l: number
}

const cache = new Map<string, CarColor | null>()

export async function extractCarColor(src: string): Promise<CarColor | null> {
  if (cache.has(src)) return cache.get(src) ?? null
  try {
    const color = await compute(src)
    cache.set(src, color)
    return color
  } catch {
    cache.set(src, null)
    return null
  }
}

function compute(src: string): Promise<CarColor | null> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error('load'))
    img.onload = () => {
      const w = 48
      const h = Math.max(1, Math.round((img.height / img.width) * w))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('ctx'))
      ctx.drawImage(img, 0, 0, w, h)
      const { data } = ctx.getImageData(0, 0, w, h)

      // pick the most saturated, reasonably-bright pixels (skip transparent /
      // near-white / near-black background & glass)
      let best: { score: number; r: number; g: number; b: number } | null = null
      let rSum = 0, gSum = 0, bSum = 0, n = 0
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a < 200) continue
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const l = (max + min) / 2 / 255
        const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
        if (l < 0.12 || l > 0.9) continue
        rSum += r; gSum += g; bSum += b; n++
        const score = s * (1 - Math.abs(l - 0.5))
        if (!best || score > best.score) best = { score, r, g, b }
      }
      if (!best && n === 0) return resolve(null)

      // if nothing vibrant, use the average (handles greys/blacks gracefully)
      const chosen =
        best && best.score > 0.06 ? best : { r: rSum / n, g: gSum / n, b: bSum / n }
      resolve(toColor(chosen.r, chosen.g, chosen.b))
    }
    img.src = src
  })
}

function toColor(r: number, g: number, b: number): CarColor {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  // nudge toward a usable accent: cap lightness, lift saturation a touch
  const S = Math.min(1, Math.max(0.35, s))
  const L = Math.min(0.62, Math.max(0.42, l))
  return { hex: hslToHex(h, S, L), h, s: S, l: L }
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
