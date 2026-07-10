/** Best-effort on-device OCR for car documents (insurance, licence, test).
 *  Uses Tesseract.js (Hebrew + English) entirely in the browser — no upload,
 *  no API key. First run downloads the language models (cached afterwards).
 *  Lazily imported so it never weighs down the main bundle. */

export interface ScanResult {
  text: string
  /** best guess for an expiry / relevant date, ISO yyyy-mm-dd */
  date?: string
  /** longest digit run that looks like a policy / document number */
  number?: string
}

export async function scanDocument(
  source: File | Blob | string,
  onProgress?: (pct: number) => void,
): Promise<ScanResult> {
  const { recognize } = await import('tesseract.js')
  const { data } = await recognize(source, 'heb+eng', {
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress(m.progress)
      }
    },
  })
  const text: string = data.text ?? ''
  return { text, date: extractDate(text), number: extractNumber(text) }
}

/** Find the most likely date and normalise to ISO. Prefers the latest date
 *  found (usually the expiry). Handles dd/mm/yyyy, dd.mm.yy, yyyy-mm-dd. */
function extractDate(text: string): string | undefined {
  const isos: string[] = []
  const re = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})|(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let y: number, mo: number, d: number
    if (m[4]) {
      y = Number(m[4])
      mo = Number(m[5])
      d = Number(m[6])
    } else {
      d = Number(m[1])
      mo = Number(m[2])
      y = Number(m[3])
      if (y < 100) y += 2000
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) continue
    isos.push(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  if (isos.length === 0) return undefined
  // the furthest-future date is most likely the "valid until"
  return isos.sort().at(-1)
}

function extractNumber(text: string): string | undefined {
  const nums = text.match(/\d{6,}/g)
  if (!nums) return undefined
  return nums.sort((a, b) => b.length - a.length)[0]
}
