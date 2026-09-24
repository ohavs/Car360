import { Image } from 'expo-image'
import { Camera, FileType2, ImagePlus, Images, ScanLine, X } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { pickImages, PermissionDenied, type PickSource } from '../data/images'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { ConfirmDialog } from './Dialog'
import { useSnackbar } from './feedback'
import { ListItem } from './ListItem'
import { PhotoViewer } from './PhotoViewer'
import { Touchable } from './Pressable'
import { Sheet } from './Sheet'
import { Text } from './Text'

/** Attached photos: tap to view, ✕ to remove (after asking), + to add from
 *  the camera or the gallery. Photos stay local until the form is saved. */
export function PhotoStrip({
  photos,
  onChange,
  label = 'תמונות',
  multiple = true,
}: {
  photos: string[]
  onChange: (photos: string[]) => void
  label?: string
  multiple?: boolean
}) {
  const { colors } = useTheme()
  const snack = useSnackbar()
  const [choosing, setChoosing] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)

  const add = async (source: PickSource) => {
    setChoosing(false)
    try {
      const picked = await pickImages(source, multiple)
      if (picked.length) onChange(multiple ? [...photos, ...picked] : picked.slice(0, 1))
    } catch (e) {
      snack(e instanceof PermissionDenied ? 'צריך לאשר גישה למצלמה בהגדרות הטלפון' : 'פתיחת הקובץ נכשלה — נסו שוב', {
        tone: 'error',
      })
    }
  }

  return (
    <View style={styles.root}>
      <Text variant="label" tone="onSurfaceVariant">
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {photos.map((uri, i) => (
          <View key={`${i}-${uri.slice(-16)}`}>
            <Touchable feedback="scale" onPress={() => setViewing(i)} accessibilityLabel={`תמונה ${i + 1}`} style={styles.thumb}>
              <Image source={uri} style={styles.image} contentFit="cover" />
            </Touchable>
            <Touchable
              borderless
              onPress={() => setRemoving(i)}
              accessibilityLabel={`הסרת תמונה ${i + 1}`}
              hitSlop={8}
              style={styles.remove}
            >
              <X size={12} color="#ffffff" strokeWidth={3} />
            </Touchable>
          </View>
        ))}
        {(multiple || photos.length === 0) && (
          <Touchable feedback="scale"
            onPress={() => setChoosing(true)}
            accessibilityRole="button"
            accessibilityLabel={`הוספת ${label}`}
            style={[styles.thumb, styles.add, { backgroundColor: colors.surfaceContainer, borderColor: colors.outline }]}
          >
            <ImagePlus size={24} color={colors.onSurfaceVariant} strokeWidth={1.8} />
          </Touchable>
        )}
      </ScrollView>

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title={`הוספת ${label}`}>
        <View>
          <ListItem icon={ScanLine} title="סריקת מסמך" subtitle="חיתוך ויישור אוטומטיים — לקבלות ופוליסות" onPress={() => void add('scan')} />
          <ListItem icon={Camera} title="צילום במצלמה" onPress={() => void add('camera')} />
          <ListItem
            icon={FileType2}
            title="קובץ PDF"
            subtitle={multiple ? 'כל עמוד נשמר כתמונה דחוסה' : 'העמוד הראשון נשמר כתמונה'}
            onPress={() => void add('pdf')}
          />
          <ListItem icon={Images} title="בחירה מהגלריה" subtitle={multiple ? 'אפשר לבחור כמה ביחד' : undefined} onPress={() => void add('library')} />
        </View>
      </Sheet>

      {viewing !== null && <PhotoViewer photos={photos} index={viewing} title={label} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        visible={removing !== null}
        title="להסיר את התמונה?"
        message="התמונה תוסר מהרשומה כשתשמרו. אפשר לצרף אותה מחדש בכל עת."
        confirmLabel="הסרה"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          onChange(photos.filter((_, j) => j !== removing))
          setRemoving(null)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  strip: { gap: space.sm, paddingTop: 6 },
  thumb: { width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  remove: {
    position: 'absolute',
    top: 4,
    end: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
