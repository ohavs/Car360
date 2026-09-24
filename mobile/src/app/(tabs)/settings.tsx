import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CarFront, DatabaseBackup, LogOut } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useGarage } from '../../data/CarsProvider'
import { shareBackup } from '../../data/backup'
import { useAuth } from '../../features/auth/AuthProvider'
import { NotificationsPanel } from '../../features/notifications/NotificationsPanel'
import { AppearancePanel } from '../../features/settings/AppearancePanel'
import { UpdatePanel } from '../../features/updates/UpdatePanel'
import { useUpdates } from '../../features/updates/UpdateProvider'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { AppBar, Card, ConfirmDialog, ListItem, Screen, SectionHeader, Text, useSnackbar, type ScreenScroll } from '../../ui'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { colors } = useTheme()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const { cars } = useGarage()
  const snack = useSnackbar()
  const router = useRouter()
  const { hasUpdate } = useUpdates()
  const [backingUp, setBackingUp] = useState(false)
  // arriving from the "new version" card: glide down to the update section
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const scrollRef = useRef<ScreenScroll>(null)
  const [updateY, setUpdateY] = useState<number | null>(null)
  useEffect(() => {
    if (focus !== 'update' || updateY === null) return
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, updateY - space.lg), animated: true })
      router.setParams({ focus: undefined })
    }, 250)
    return () => clearTimeout(t)
  }, [focus, updateY, router])

  return (
    <Screen header={<AppBar title="הגדרות" />} scrollRef={scrollRef}>
      <SectionHeader title="חשבון" />
      <Card padded={false}>
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
        <ListItem icon={LogOut} tone="danger" title="התנתקות" onPress={() => setConfirmSignOut(true)} />
      </Card>

      <NotificationsPanel />

      <SectionHeader title="מראה" />
      <AppearancePanel />

      <SectionHeader title="כלים ונתונים" />
      <Card padded={false}>
        <ListItem icon={CarFront} title="הרכבים שלי" subtitle="סדר, ארכיון לרכב שנמכר, מחיקה" onPress={() => router.push('/garage')} />
        <ListItem
          icon={DatabaseBackup}
          title="גיבוי הנתונים"
          subtitle={backingUp ? 'מכין את הקובץ…' : 'כל הרכבים וההיסטוריה בקובץ אחד, לשמירה בדרייב או במייל'}
          onPress={() => {
            if (backingUp) return
            setBackingUp(true)
            shareBackup(cars)
              .catch(() => snack('הגיבוי נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' }))
              .finally(() => setBackingUp(false))
          }}
        />
      </Card>

      <View onLayout={(e) => setUpdateY(e.nativeEvent.layout.y)} style={styles.section}>
        <SectionHeader title={hasUpdate ? 'עדכון זמין' : 'עדכונים'} />
        <UpdatePanel />
      </View>

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
  section: { gap: space.lg },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
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
