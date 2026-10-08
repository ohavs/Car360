import { CheckCircle2, FileType2, Images, PenLine, RotateCcw, ScanLine, Sparkles, TriangleAlert, X } from 'lucide-react-native'
import { useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { pickErrorMessage, pickImages, type PickSource } from '../../data/images'
import { recordCrash } from '../../lib/crashLog'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { ActionSheet, Button, IconButton, Spinner, Text, useSnackbar } from '../../ui'
import { MAX_READ_PAGES, smartScanAvailable, SmartScanError } from './smartScan'

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'done'; filled: string[]; missing: string[] }
  | { kind: 'failed'; busy: boolean; pages: string[] }

/**
 * Adding a record that usually comes on paper (a policy, a receipt): first
 * pick how — scan, PDF, a photo, or by hand — instead of facing every field
 * and every button at once. A document is read by Gemini to pre-fill the
 * form, and its pages are always attached, whether or not the read worked.
 *
 * `sheet` goes anywhere in the form, `status` at its top: it says what was
 * filled and what is left to fill by hand.
 */
export function useSmartFill<T extends object>({
  subject,
  read,
  labels,
  openOnStart,
  onResult,
}: {
  /** "הפוליסה", "הקבלה" */
  subject: string
  read: (pages: string[]) => Promise<T>
  /** what each field is called, for "filled / still missing" */
  labels: Record<keyof T & string, string>
  /** a new record: the choice comes first */
  openOnStart: boolean
  /** fields found (only those) and pages to attach (none on a retry) */
  onResult: (fields: Partial<T>, pages: string[]) => void
}): { sheet: ReactNode; status: ReactNode; open: () => void; available: boolean } {
  const snack = useSnackbar()
  const { colors } = useTheme()
  const [choosing, setChoosing] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  // after the screen has slid in, not during
  useEffect(() => {
    if (!openOnStart || !smartScanAvailable) return
    const t = setTimeout(() => setChoosing(true), 350)
    return () => clearTimeout(t)
  }, [openOnStart])

  const readPages = async (pages: string[], attach: boolean) => {
    setPhase({ kind: 'reading' })
    try {
      const raw = await read(pages)
      const fields = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Partial<T>
      onResult(fields, attach ? pages : [])
      const keys = Object.keys(labels) as (keyof T & string)[]
      setPhase({
        kind: 'done',
        filled: keys.filter((k) => k in fields).map((k) => labels[k]),
        missing: keys.filter((k) => !(k in fields)).map((k) => labels[k]),
      })
    } catch (e) {
      // the pages are still worth keeping as photos of the document
      if (attach) onResult({}, pages)
      const busy = e instanceof SmartScanError && e.kind === 'busy'
      if (!busy) recordCrash(e, false)
      setPhase({ kind: 'failed', busy, pages })
    }
  }

  const pick = async (source: PickSource) => {
    let pages: string[]
    try {
      pages = await pickImages(source, source === 'pdf')
    } catch (e) {
      snack(pickErrorMessage(e), { tone: 'error' })
      return
    }
    if (pages.length) await readPages(pages, true)
  }

  const sheet = choosing ? (
    <ActionSheet
      title={`איך להוסיף את ${subject}?`}
      onClose={() => setChoosing(false)}
      actions={[
        {
          icon: ScanLine,
          label: 'סריקה במצלמה',
          subtitle: 'נצלם, ננסה למלא את הפרטים לבד ונצרף את הצילום',
          onPress: () => void pick('scan'),
        },
        {
          icon: FileType2,
          label: 'קובץ PDF',
          subtitle: `נקרא עד ${MAX_READ_PAGES} עמודים ראשונים; כל העמודים יצורפו כתמונות`,
          onPress: () => void pick('pdf'),
        },
        { icon: Images, label: 'תמונה מהגלריה', subtitle: 'צילום מסך או תמונה של המסמך', onPress: () => void pick('library') },
        { icon: PenLine, label: 'הזנה ידנית', subtitle: 'ממלאים בעצמכם, ואפשר לצרף צילומים בהמשך', onPress: () => {} },
      ]}
    />
  ) : null

  let status: ReactNode = null
  if (phase.kind === 'idle' && openOnStart && smartScanAvailable) {
    status = <Button label="מילוי אוטומטי ממסמך" icon={Sparkles} variant="text" onPress={() => setChoosing(true)} />
  } else if (phase.kind === 'reading') {
    status = (
      <View style={[styles.box, { backgroundColor: colors.surfaceContainer }]}>
        <Spinner />
        <View style={styles.text}>
          <Text variant="bodyStrong">קורא את {subject}…</Text>
          <Text variant="caption" tone="muted">
            זה לוקח כמה שניות
          </Text>
        </View>
      </View>
    )
  } else if (phase.kind === 'done') {
    const none = phase.filled.length === 0
    status = (
      <View style={[styles.box, { backgroundColor: none ? colors.warningContainer : colors.successContainer }]}>
        {none ? (
          <TriangleAlert size={20} color={colors.warning} strokeWidth={2.2} />
        ) : (
          <CheckCircle2 size={20} color={colors.success} strokeWidth={2.2} />
        )}
        <View style={styles.text}>
          <Text variant="bodyStrong">{none ? 'לא זיהינו פרטים במסמך' : `מולאו מהמסמך: ${phase.filled.join(', ')}`}</Text>
          {phase.missing.length > 0 && (
            <Text variant="caption" tone="onSurfaceVariant">
              {none ? 'מלאו ידנית' : `לא נמצאו — מלאו ידנית: ${phase.missing.join(', ')}`}
            </Text>
          )}
          <Text variant="caption" tone="muted">
            בדקו את הפרטים לפני השמירה. המסמך צורף לצילומים.
          </Text>
        </View>
        <IconButton icon={X} label="סגירה" onPress={() => setPhase({ kind: 'idle' })} />
      </View>
    )
  } else if (phase.kind === 'failed') {
    status = (
      <View style={[styles.box, { backgroundColor: colors.warningContainer }]}>
        <TriangleAlert size={20} color={colors.warning} strokeWidth={2.2} />
        <View style={styles.text}>
          <Text variant="bodyStrong">{phase.busy ? 'שירות הקריאה עמוס כרגע' : 'הקריאה האוטומטית לא הצליחה'}</Text>
          <Text variant="caption" tone="onSurfaceVariant">
            המסמך צורף לצילומים. אפשר לנסות שוב או למלא ידנית.
          </Text>
          <View style={styles.actions}>
            <Button label="ניסיון חוזר" icon={RotateCcw} variant="tonal" onPress={() => void readPages(phase.pages, false)} />
          </View>
        </View>
        <IconButton icon={X} label="סגירה" onPress={() => setPhase({ kind: 'idle' })} />
      </View>
    )
  }

  return { sheet, status, open: () => setChoosing(true), available: smartScanAvailable }
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radius.card, padding: space.md },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', marginTop: space.sm },
})
