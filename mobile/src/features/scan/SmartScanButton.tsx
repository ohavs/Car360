import { Sparkles } from 'lucide-react-native'
import { useState } from 'react'
import { PermissionDenied, pickImages } from '../../data/images'
import { Button, useSnackbar } from '../../ui'
import { smartScanAvailable } from './smartScan'

/**
 * Scan a document (edges found, straightened) and let Gemini read it; the
 * fields and the scanned page go to `onResult` to pre-fill the form.
 * Renders nothing when smart scan isn't configured.
 */
export function SmartScanButton<T extends object>({
  label,
  read,
  onResult,
}: {
  label: string
  read: (uri: string) => Promise<T>
  onResult: (fields: T, page: string) => void
}) {
  const snack = useSnackbar()
  const [busy, setBusy] = useState(false)
  if (!smartScanAvailable) return null

  const run = async () => {
    let page: string | undefined
    try {
      ;[page] = await pickImages('scan', false)
    } catch (e) {
      snack(e instanceof PermissionDenied ? 'צריך לאשר גישה למצלמה בהגדרות הטלפון' : 'פתיחת הסורק נכשלה — נסו שוב', { tone: 'error' })
      return
    }
    if (!page) return
    setBusy(true)
    try {
      const fields = await read(page)
      const found = Object.values(fields).filter((v) => v !== undefined).length
      onResult(fields, page)
      snack(found ? `מולאו ${found} שדות — בדקו לפני השמירה` : 'לא זיהינו פרטים — הצילום צורף, מלאו ידנית', {
        tone: found ? 'success' : 'info',
      })
    } catch {
      // the page is still worth keeping as a photo of the document
      onResult({} as T, page)
      snack('הקריאה החכמה נכשלה — הצילום צורף, מלאו ידנית', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return <Button label={busy ? 'קורא את המסמך…' : label} icon={Sparkles} variant="tonal" loading={busy} onPress={() => void run()} />
}
