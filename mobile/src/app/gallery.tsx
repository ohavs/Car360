import { Bell, Car, FileText, Plus, Shield, Trash2, Wrench } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppearancePanel } from '../features/settings/AppearancePanel'
import { space } from '../theme/tokens'
import {
  AppBar,
  Button,
  Card,
  ConfirmDialog,
  DateField,
  Dropdown,
  EmptyState,
  EXPIRY_PRESETS,
  FAB,
  FilterChips,
  ListItem,
  NumberField,
  Plate,
  PlateField,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedButtons,
  Sheet,
  SheetSelect,
  Skeleton,
  StatusChip,
  Switch,
  Text,
  TextField,
  TimeField,
  useSnackbar,
} from '../ui'

const FUEL = ['בנזין', 'דיזל', 'היברידי', 'חשמלי', 'גפ״מ (גז)'].map((f) => ({ value: f, label: f }))
const GARAGES = [
  'מוסך המרכז',
  'מוסך השרון',
  'צמיגי הצפון',
  'מוסך מורשה טויוטה',
  'מוסך מורשה מאזדה',
  'פנצ׳רייה 24/7',
  'מוסך הדרום',
  'מוסך אבי',
  'שירות מהיר',
  'מרכז שירות יונדאי',
].map((g) => ({ value: g, label: g }))
type Kind = 'חובה' | 'מקיף' | 'צד ג׳' | 'אחר'
type Category = 'הכל' | 'רישיון' | 'ביטוח' | 'טסט' | 'קבלה'

/** Every building block in every state, on the real device and theme —
 *  the place to judge the design language before screens are built. */
export default function GalleryScreen() {
  const snack = useSnackbar()
  const [name, setName] = useState('')
  const [garage, setGarage] = useState('מוסך המרכז')
  const [email, setEmail] = useState('not-an-email')
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState<number | undefined>(1850)
  const [plate, setPlate] = useState('1234567')
  const [fuel, setFuel] = useState<string | undefined>()
  const [garagePick, setGaragePick] = useState<string | undefined>()
  const [kind, setKind] = useState<Kind>('מקיף')
  const [category, setCategory] = useState<Category>('הכל')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [extended, setExtended] = useState(true)

  return (
    <View style={styles.root}>
      <Screen header={<AppBar title="גלריית עיצוב" subtitle="כל רכיב, בכל מצב — כך תיראה האפליקציה" back />}>
        <AppearancePanel />

        <SectionHeader title="טיפוגרפיה" />
        <Card style={styles.stack}>
          <Text variant="display">כותרת ראשית</Text>
          <Text variant="headline">כותרת מסך</Text>
          <Text variant="title">כותרת כרטיס</Text>
          <Text variant="body">טקסט רגיל — כך נראה תיאור או הערה ארוכה שממשיכה לשורה נוספת.</Text>
          <Text variant="label" tone="onSurfaceVariant">
            תווית · טקסט משני
          </Text>
          <Text variant="caption" tone="muted">
            הערת שוליים קטנה
          </Text>
        </Card>

        <SectionHeader title="כפתורים" />
        <Card style={styles.stack}>
          <Button label="שמירה" onPress={() => snack('נשמר', { tone: 'success' })} />
          <Button label="טיפול חדש" icon={Plus} variant="brand" onPress={() => {}} />
          <Button label="משני" variant="tonal" onPress={() => {}} />
          <Button label="מסגרת" variant="outlined" onPress={() => {}} />
          <Button label="קישור טקסט" variant="text" onPress={() => {}} />
          <Button label="מחיקה" icon={Trash2} variant="danger" onPress={() => setConfirm(true)} />
          <Button
            label="שומר…"
            loading={loading}
            onPress={() => {
              setLoading(true)
              setTimeout(() => setLoading(false), 1500)
            }}
          />
          <Button label="לא זמין" disabled onPress={() => {}} />
        </Card>

        <SectionHeader title="שדות טקסט" />
        <Card style={styles.stack}>
          <TextField label="כינוי לרכב" value={name} onChangeText={setName} returnKeyType="next" />
          <TextField label="מוסך" value={garage} onChangeText={setGarage} leadingIcon={Wrench} hint="השם כפי שמופיע בקבלה" />
          <TextField
            label="אימייל לשיתוף"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            ltr
            error={/^\S+@\S+\.\S+$/.test(email) ? null : 'כתובת האימייל לא תקינה'}
          />
          <NumberField label="עלות" value={cost} onChangeValue={setCost} suffix="₪" decimal />
          <PlateField label="לוחית רישוי" value={plate} onChangeText={setPlate} />
          <TextField label="הערות" value={notes} onChangeText={setNotes} multiline />
          <TextField label="שדה נעול" value="לא ניתן לעריכה" editable={false} />
        </Card>

        <SectionHeader title="בחירה" />
        <Card style={styles.stack}>
          <SegmentedButtons<Kind>
            label="סוג ביטוח"
            value={kind}
            onChange={setKind}
            options={(['חובה', 'מקיף', 'צד ג׳', 'אחר'] as Kind[]).map((k) => ({ value: k, label: k }))}
          />
          <Dropdown label="סוג דלק" value={fuel} options={FUEL} onChange={setFuel} placeholder="בחירת סוג דלק" />
          <SheetSelect label="מוסך קבוע" value={garagePick} options={GARAGES} onChange={setGaragePick} />
          <DateField label="תוקף טסט" value={date} onChange={setDate} presets={EXPIRY_PRESETS} hint="מזין את התזכורות וההתראות" />
          <TimeField label="שעת תזכורת" value={time} onChange={setTime} />
        </Card>
        <FilterChips<Category>
          value={category}
          onChange={setCategory}
          options={(['הכל', 'רישיון', 'ביטוח', 'טסט', 'קבלה'] as Category[]).map((c) => ({ value: c, label: c }))}
        />

        <SectionHeader title="רשימות ומתגים" />
        <Card padded={false}>
          <ListItem icon={Bell} title="התראות" subtitle="תזכורות לפני שמשהו פג" trailing={<Switch label="התראות" value={on} onValueChange={setOn} />} onPress={() => setOn(!on)} />
          <ListItem icon={Shield} title="גיבוי אוטומטי" trailing={<Switch label="גיבוי" value={off} onValueChange={setOff} />} onPress={() => setOff(!off)} />
          <ListItem icon={Car} title="מתג מושבת" trailing={<Switch label="מושבת" value={false} onValueChange={() => {}} disabled />} />
          <ListItem icon={FileText} title="שורה שמובילה למסך" subtitle="עם כתובית" onPress={() => {}} />
        </Card>

        <SectionHeader title="סטטוס" />
        <Card style={styles.row}>
          <StatusChip tone="ok" label="בעוד 120 ימים" />
          <StatusChip tone="warn" label="בעוד 12 ימים" />
          <StatusChip tone="danger" label="פג לפני 3 ימים" />
          <StatusChip tone="neutral" label="לא הוזן" />
          <Plate plate="1234567" />
        </Card>
        <Card style={styles.stack}>
          <ProgressBar value={0.62} />
          <Skeleton height={20} width="70%" />
          <Skeleton height={56} />
        </Card>

        <SectionHeader title="חלונות" />
        <Card style={styles.stack}>
          <Button label="דיאלוג אישור מחיקה" variant="tonal" onPress={() => setConfirm(true)} />
          <Button label="גיליון עם טופס (נסו לצאת בלי לשמור)" variant="tonal" onPress={() => setSheet(true)} />
          <Button label="הודעה: הצלחה" variant="tonal" onPress={() => snack('הטיפול נשמר', { tone: 'success' })} />
          <Button
            label="הודעה: שגיאה עם פעולה"
            variant="tonal"
            onPress={() => snack('השמירה נכשלה', { tone: 'error', action: { label: 'נסו שוב', onPress: () => {} } })}
          />
          <Button
            label="הודעה: ביטול פעולה"
            variant="tonal"
            onPress={() => snack('התזכורת סומנה כבוצעה', { action: { label: 'ביטול', onPress: () => {} } })}
          />
          <Button label={extended ? 'לכווץ את ה-FAB' : 'להרחיב את ה-FAB'} variant="tonal" onPress={() => setExtended((v) => !v)} />
        </Card>

        <SectionHeader title="מצב ריק" />
        <Card>
          <EmptyState
            icon={Wrench}
            title="אין טיפולים מתועדים"
            subtitle="תיעוד טיפולים שומר על ערך הרכב ועוזר לזכור מה נעשה ומתי"
            action={<Button label="טיפול ראשון" icon={Plus} onPress={() => {}} />}
          />
        </Card>
        <View style={styles.fabSpace} />
      </Screen>

      <FAB icon={Plus} label="הוספה" extended={extended} onPress={() => snack('כאן ייפתח גיליון ההוספה')} />

      <ConfirmDialog
        visible={confirm}
        title="למחוק את הטיפול?"
        message={'"טיפול 15,000" יימחק לצמיתות כולל התמונות המצורפות.'}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          snack('הטיפול נמחק', { tone: 'success' })
        }}
      />

      <Sheet
        visible={sheet}
        onClose={() => {
          setSheet(false)
          setDraft('')
        }}
        title="תזכורת חדשה"
        dirty={draft.trim().length > 0}
        footer={
          <Button
            label="שמירה"
            size="large"
            onPress={() => {
              setSheet(false)
              setDraft('')
              snack('התזכורת נוספה', { tone: 'success' })
            }}
          />
        }
      >
        <TextField label="מה להזכיר?" value={draft} onChangeText={setDraft} />
        <Text variant="caption" tone="muted">
          כתבו משהו ונסו לסגור בהחלקה, בלחיצה על הרקע, ב-✕ או בכפתור החזרה.
        </Text>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stack: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  fabSpace: {
    height: 72,
  },
})
