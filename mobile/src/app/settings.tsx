import { Image } from 'expo-image'
import { LogOut, Palette } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAuth } from '../features/auth/AuthProvider'
import { AppearancePanel } from '../features/settings/AppearancePanel'
import { UpdatePanel } from '../features/updates/UpdatePanel'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { AppBar, Card, ConfirmDialog, ListItem, Screen, Text } from '../ui'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { colors } = useTheme()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const router = useRouter()

  return (
    <Screen header={<AppBar title="הגדרות" back />}>
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

      <AppearancePanel />

      <Card padded={false}>
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
