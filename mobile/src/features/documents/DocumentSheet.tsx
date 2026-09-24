import { Image } from 'expo-image'
import { Camera, FileType2, Images, ScanLine, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CarDocument, DocumentCategory } from '@shared/types'
import { newId } from '@shared/utils'
import { deleteImage, isLocal, PermissionDenied, pickImages, storeDocumentImage, type PickSource } from '../../data/images'
import { deleteRecord, saveRecord } from '../../data/mutations'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, ConfirmDialog, FilterChips, Sheet, Text, TextField, Touchable, useSnackbar } from '../../ui'

export const CATEGORIES: DocumentCategory[] = ['רישיון רכב', 'ביטוח', 'טסט', 'קבלה', 'תמונה', 'אחר']

/** Add a document (photo first, then name and category) or edit one. */
export function DocumentSheet({
  carId,
  doc,
  onClose,
}: {
  carId: string
  /** undefined: a new document */
  doc?: CarDocument
  onClose: () => void
}) {
  const { colors } = useTheme()
  const snack = useSnackbar()
  const [start] = useState<CarDocument>(
    () => doc ?? { id: newId(), carId, title: '', category: 'רישיון רכב', imageUrl: '', createdAt: 0, updatedAt: 0 },
  )
  const [draft, setDraft] = useState(start)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)

  // a multi-page PDF: the first page is this document, the rest become
  // "<name> · עמ׳ 2/3"… next to it
  const [morePages, setMorePages] = useState<string[]>([])

  const pick = async (source: PickSource) => {
    try {
      const [uri, ...rest] = await pickImages(source, !doc && source === 'pdf')
      if (uri) {
        setDraft((d) => ({ ...d, imageUrl: uri }))
        setMorePages(rest)
        setError(null)
      }
    } catch (e) {
      snack(e instanceof PermissionDenied ? 'צריך לאשר גישה למצלמה בהגדרות הטלפון' : 'פתיחת הקובץ נכשלה — נסו שוב', { tone: 'error' })
    }
  }

  const save = async () => {
    if (!draft.imageUrl) return setError('צלמו או בחרו תמונה של המסמך')
    setSaving(true)
    try {
      const now = Date.now()
      const stored = isLocal(draft.imageUrl)
        ? await storeDocumentImage(draft.imageUrl, carId, draft.id)
        : { imageUrl: draft.imageUrl, thumbUrl: draft.thumbUrl }
      const imageUrl = stored.imageUrl
      await saveRecord('documents', {
        ...draft,
        ...stored,
        title: draft.title.trim() || draft.category,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      })
      if (doc?.imageUrl && doc.imageUrl !== imageUrl) {
        void deleteImage(doc.imageUrl)
        if (doc.thumbUrl && doc.thumbUrl !== doc.imageUrl) void deleteImage(doc.thumbUrl)
      }
      const title = draft.title.trim() || draft.category
      const total = morePages.length + 1
      for (const [i, page] of morePages.entries()) {
        const id = newId()
        const pageImages = await storeDocumentImage(page, carId, id)
        await saveRecord('documents', {
          id,
          carId,
          category: draft.category,
          title: `${title} · עמ׳ ${i + 2}/${total}`,
          ...pageImages,
          createdAt: now - i - 1,
          updatedAt: now,
        })
      }
      snack(doc ? 'המסמך עודכן' : total > 1 ? `המסמך נשמר (${total} עמודים)` : 'המסמך נשמר', { tone: 'success' })
      onClose()
    } catch {
      snack('השמירה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirming(false)
    try {
      await deleteRecord('documents', start)
      snack('המסמך נמחק', { tone: 'info' })
      onClose()
    } catch {
      snack('המחיקה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      dirty={dirty}
      title={doc ? 'עריכת מסמך' : 'מסמך חדש'}
      footer={
        <View style={styles.footer}>
          {doc && <Button label="מחיקה" icon={Trash2} variant="dangerText" onPress={() => setConfirming(true)} />}
          <Button label="שמירה" onPress={() => void save()} loading={saving} style={styles.flex} />
        </View>
      }
    >
      {draft.imageUrl ? (
        <Touchable feedback="scale"
          onPress={() => void pick('library')}
          accessibilityLabel="החלפת התמונה"
          style={[styles.preview, { backgroundColor: colors.surfaceContainer }]}
        >
          <Image source={draft.imageUrl} style={styles.image} contentFit="contain" />
        </Touchable>
      ) : (
        <View style={styles.pickerColumn}>
          <Button label="סריקת מסמך" icon={ScanLine} size="large" onPress={() => void pick('scan')} />
          <View style={styles.pickers}>
            <Button label="צילום" icon={Camera} variant="tonal" onPress={() => void pick('camera')} style={styles.flex} />
            <Button label="מהגלריה" icon={Images} variant="outlined" onPress={() => void pick('library')} style={styles.flex} />
          </View>
          <Button label="קובץ PDF" icon={FileType2} variant="text" onPress={() => void pick('pdf')} />
        </View>
      )}
      {draft.imageUrl && morePages.length > 0 ? (
        <Text variant="caption" tone="muted" align="center">
          ועוד {morePages.length} עמודים מה-PDF — יישמרו כמסמכים נפרדים
        </Text>
      ) : null}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
      <FilterChips<DocumentCategory>
        value={draft.category}
        onChange={(category) => setDraft((d) => ({ ...d, category }))}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      <TextField
        label="שם המסמך"
        placeholder={draft.category}
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
      />
      <ConfirmDialog
        visible={confirming}
        title="למחוק את המסמך?"
        message={`"${start.title}" יימחק לצמיתות.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  flex: { flex: 1 },
  pickers: { flexDirection: 'row', gap: space.md },
  pickerColumn: { gap: space.md },
  preview: { height: 220, borderRadius: radius.card, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
})
