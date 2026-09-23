import * as Clipboard from 'expo-clipboard'
import { Copy, FileDown, Link2, Link2Off, RefreshCw, Send, UserMinus, UserPlus, Users } from 'lucide-react-native'
import { useState } from 'react'
import { Share, StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car } from '@shared/types'
import { PUBLIC_BASE, publishPassport, setSharedWith, unpublishPassport } from '../../data/share'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, ConfirmDialog, IconButton, ListItem, SectionHeader, Sheet, Text, TextField, useSnackbar } from '../../ui'
import { useAuth } from '../auth/AuthProvider'
import { sharePassportPdf } from './passportPdf'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Everything about sharing one car, in one sheet: the passport as a PDF, a
 *  public read-only link, and the family members who can edit it with you. */
export function ShareSheet({ car, onClose }: { car: Car; onClose: () => void }) {
  const { user } = useAuth()
  const { colors } = useTheme()
  const snack = useSnackbar()
  const isOwner = car.ownerId === user?.uid
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'pdf' | 'link' | 'invite' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const url = car.publicToken ? `${PUBLIC_BASE}${car.publicToken}` : null
  const name = carDisplayName(car)

  const run = async (kind: 'pdf' | 'link' | 'invite', work: () => Promise<void>, failure: string) => {
    setBusy(kind)
    try {
      await work()
    } catch {
      snack(failure, { tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const shareLink = (link: string) =>
    void Share.share({ message: `הדרכון של ${name} ב-Car360:\n${link}`, title: `דרכון רכב · ${name}` }).catch(() => {})

  const invite = () => {
    const normalized = email.trim().toLowerCase()
    if (!EMAIL.test(normalized)) return setEmailError('כתובת אימייל לא תקינה')
    if (car.sharedWith.includes(normalized) || normalized === user?.email.toLowerCase()) return setEmailError('כבר יש לו גישה')
    void run(
      'invite',
      async () => {
        await setSharedWith(car, [...car.sharedWith, normalized])
        setEmail('')
        snack(`${normalized} יכול עכשיו לראות ולערוך את ${name}`, { tone: 'success' })
      },
      'השיתוף נכשל. בדקו את החיבור.',
    )
  }

  return (
    <Sheet visible onClose={onClose} title={`שיתוף · ${name}`}>
      <ListItem
        icon={FileDown}
        title="דרכון רכב (PDF)"
        subtitle="כל הפרטים וההיסטוריה במסמך אחד — מצוין למכירה"
        trailing={busy === 'pdf' ? <Text tone="muted">מכין…</Text> : undefined}
        onPress={() => void run('pdf', () => sharePassportPdf(car), 'לא הצלחנו להכין את הקובץ')}
      />

      <SectionHeader title="קישור לצפייה" />
      <Text variant="caption" tone="muted">
        כל מי שמקבל את הקישור רואה את הדרכון לקריאה בלבד, בלי חשבון. בלי מסמכים ובלי פרטי קשר.
      </Text>
      {url ? (
        <>
          <View style={[styles.link, { backgroundColor: colors.surfaceContainer }]}>
            <Link2 size={18} color={colors.muted} />
            <Text variant="caption" numberOfLines={1} style={styles.url}>
              {url}
            </Text>
            <IconButton
              icon={Copy}
              label="העתקת הקישור"
              onPress={() => void Clipboard.setStringAsync(url).then(() => snack('הקישור הועתק', { tone: 'success' }))}
            />
          </View>
          <Button label="שליחת הקישור" icon={Send} onPress={() => shareLink(url)} />
          <View style={styles.row}>
            <Button
              label="עדכון לנתונים של היום"
              icon={RefreshCw}
              variant="outlined"
              loading={busy === 'link'}
              style={styles.flex}
              onPress={() =>
                void run('link', async () => {
                  await publishPassport(car)
                  snack('הקישור מציג עכשיו את הנתונים העדכניים', { tone: 'success' })
                }, 'העדכון נכשל')
              }
            />
            <IconButton icon={Link2Off} label="ביטול הקישור" onPress={() => setRevoking(true)} />
          </View>
        </>
      ) : (
        <Button
          label="יצירת קישור ושליחה"
          icon={Link2}
          variant="tonal"
          loading={busy === 'link'}
          onPress={() =>
            void run('link', async () => {
              const token = await publishPassport(car)
              shareLink(`${PUBLIC_BASE}${token}`)
            }, 'יצירת הקישור נכשלה')
          }
        />
      )}

      <SectionHeader title="בני משפחה ושותפים" />
      <Text variant="caption" tone="muted">
        מי שמשותף רואה את הרכב אצלו, עורך טיפולים ומסמכים ומקבל תזכורות. הוא נכנס עם חשבון Google של הכתובת הזו.
      </Text>
      {car.sharedWith.length > 0 && (
        <View>
          {car.sharedWith.map((e) => (
            <ListItem
              key={e}
              icon={Users}
              title={e}
              trailing={isOwner ? <IconButton icon={UserMinus} label={`הסרת ${e}`} onPress={() => setRemoving(e)} /> : undefined}
            />
          ))}
        </View>
      )}
      {isOwner ? (
        <View style={styles.row}>
          <TextField
            label="אימייל"
            value={email}
            onChangeText={(t) => {
              setEmail(t)
              setEmailError(null)
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            ltr
            style={styles.flex}
            onSubmitEditing={invite}
          />
          <IconButton icon={UserPlus} label="הוספה" tonal onPress={invite} />
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          רק הבעלים של הרכב יכול להוסיף או להסיר שותפים.
        </Text>
      )}

      <ConfirmDialog
        visible={removing !== null}
        title="להסיר את השיתוף?"
        message={`${removing ?? ''} לא יראה יותר את ${name}.`}
        confirmLabel="הסרה"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const e = removing
          setRemoving(null)
          if (e) void run('invite', () => setSharedWith(car, car.sharedWith.filter((x) => x !== e)), 'ההסרה נכשלה')
        }}
      />
      <ConfirmDialog
        visible={revoking}
        title="לבטל את הקישור?"
        message="מי שקיבל אותו לא יוכל לפתוח אותו יותר. אפשר ליצור קישור חדש בכל עת."
        confirmLabel="ביטול הקישור"
        destructive
        onCancel={() => setRevoking(false)}
        onConfirm={() => {
          setRevoking(false)
          void run('link', async () => {
            await unpublishPassport(car)
            snack('הקישור בוטל', { tone: 'info' })
          }, 'הביטול נכשל')
        }}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.field, paddingStart: space.md },
  url: { flex: 1, writingDirection: 'ltr' },
})
