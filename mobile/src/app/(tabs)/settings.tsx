import { Image } from 'expo-image'
import { DatabaseBackup, FileSearch, LogOut, Palette } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useGarage } from '../../data/CarsProvider'
import { shareBackup } from '../../data/backup'
import { useAuth } from '../../features/auth/AuthProvider'
import { NotificationsPanel } from '../../features/notifications/NotificationsPanel'
import { AppearancePanel } from '../../features/settings/AppearancePanel'
import { UpdatePanel } from '../../features/updates/UpdatePanel'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { AppBar, Card, ConfirmDialog, ListItem, Screen, SectionHeader, Text, useSnackbar } from '../../ui'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { colors } = useTheme()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const router = useRouter()
  const { cars } = useGarage()
  const snack = useSnackbar()
  const [backingUp, setBackingUp] = useState(false)

  return (
    <Screen header={<AppBar title="הגדרות" />}>
      <Card>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}>
            {user?.photoUrl ? (
              <Image source={user.photoUrl} style={styles.avatarImage} />
            ) : (
              <Text variant="title">{(user?.displayName ?? '?').slice(0, 1)}</Text>
            )}
          </View>
          <View style={styles.profileText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {user?.displayName}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.ltr}>
              {user?.email}
            </Text>
          </View>
        </View>
      </Card>

      <NotificationsPanel />

      <AppearancePanel />

      <SectionHeader title="כלים ונתונים" />
      <Card padded={false}>
        <ListItem
          icon={FileSearch}
          title="דוח רכב"
          subtitle="בדיקה לפי מספר רישוי — גם לרכב שחושבים לקנות"
          onPress={() => router.push('/report')}
        />
        <ListItem
          icon={DatabaseBackup}
          title="גיבוי הנתונים"
          subtitle={backingUp ? 'מכין את הקובץ…' : 'כל הרכבים וההיסטוריה בקובץ אחד, לשמירה בדרייב או במייל'}
          onPress={() => {
            if (backingUp) return
            setBackingUp(true)
            shareBackup(cars)
              .catch(() => snack('הגיבוי נכשל. בדקו את החיבור ונסו שוב.', { tone: 'error' }))
              .finally(() => setBackingUp(false))
          }}
        />
        <ListItem
          icon={Palette}
          title="גלריית עיצוב"
          subtitle="כל רכיבי האפליקציה בכל המצבים — לאישור שפת העיצוב"
          onPress={() => router.push('/gallery')}
        />
      </Card>

      <UpdatePanel />

      <Card padded={false}>
        <ListItem icon={LogOut} tone="danger" title="התנתקות" onPress={() => setConfirmSignOut(true)} />
      </Card>

      <ConfirmDialog
        visible={confirmSignOut}
        title="להתנתק?"
        message="תמיד אפשר להתחבר שוב עם Google. הנתונים נשארים שמורים בחשבון."
        confirmLabel="התנתקות"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false)
          void signOut()
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  ltr: {
    writingDirection: 'ltr',
    textAlign: 'right',
  },
})
