import { FileType2, Images, ScanLine, Sparkles } from 'lucide-react-native'
import { useState } from 'react'
import { pickErrorMessage, pickImages, type PickSource } from '../../data/images'
import { recordCrash } from '../../lib/crashLog'
import { ActionSheet, Button, useSnackbar } from '../../ui'
import { MAX_READ_PAGES, smartScanAvailable, SmartScanError } from './smartScan'

/**
 * Scan a document, or take a PDF or a photo of it, and let Gemini read it;
 * the fields and the pages go to `onResult` to pre-fill the form.
 * Renders nothing when smart scan isn't configured.
 */
export function SmartScanButton<T extends object>({
  label,
  read,
  onResult,
}: {
  label: string
  read: (pages: string[]) => Promise<T>
  onResult: (fields: T, pages: string[]) => void
}) {
  const snack = useSnackbar()
  const [busy, setBusy] = useState(false)
  const [choosing, setChoosing] = useState(false)
  if (!smartScanAvailable) return null

  const run = async (source: PickSource) => {
    let pages: string[]
    try {
      pages = await pickImages(source, source === 'pdf')
    } catch (e) {
      snack(pickErrorMessage(e), { tone: 'error' })
      return
    }
    if (!pages.length) return
    setBusy(true)
    try {
      const fields = await read(pages)
      const found = Object.values(fields).filter((v) => v !== undefined).length
      onResult(fields, pages)
      snack(found ? `מולאו ${found} שדות — בדקו לפני השמירה` : 'לא זיהינו פרטים — המסמך צורף, מלאו ידנית', {
        tone: found ? 'success' : 'info',
      })
    } catch (e) {
      // the pages are still worth keeping as photos of the document
      onResult({} as T, pages)
      const busyNow = e instanceof SmartScanError && e.kind === 'busy'
      if (!busyNow) recordCrash(e, false)
      snack(
        busyNow
          ? 'שירות הקריאה החכמה עמוס כרגע — המסמך צורף. נסו שוב בעוד דקה או מלאו ידנית'
          : 'הקריאה החכמה נכשלה — המסמך צורף, מלאו ידנית',
        { tone: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button label={busy ? 'קורא את המסמך…' : label} icon={Sparkles} variant="tonal" loading={busy} onPress={() => setChoosing(true)} />
      {choosing && (
        <ActionSheet
          title={label}
          onClose={() => setChoosing(false)}
          actions={[
            { icon: ScanLine, label: 'סריקה במצלמה', subtitle: 'חיתוך ויישור אוטומטיים', onPress: () => void run('scan') },
            {
              icon: FileType2,
              label: 'מקובץ PDF',
              subtitle: `נקרא עד ${MAX_READ_PAGES} עמודים ראשונים; כל העמודים יצורפו`,
              onPress: () => void run('pdf'),
            },
            { icon: Images, label: 'תמונה מהגלריה', subtitle: 'צילום מסך או תמונה של המסמך', onPress: () => void run('library') },
          ]}
        />
      )}
    </>
  )
}
