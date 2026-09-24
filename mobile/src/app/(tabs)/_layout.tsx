import { Tabs, type BottomTabBarProps } from 'expo-router/tabs'
import { Bell, FileText, House, Settings } from 'lucide-react-native'
import { useReminders } from '../../data/RemindersProvider'
import { useRegistrySync } from '../../data/registrySync'
import { useUpdates } from '../../features/updates/UpdateProvider'
import { NavigationBar, type NavItem } from '../../ui'

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { reminders } = useReminders()
  const { hasUpdate } = useUpdates()
  // what needs attention now: overdue or due within a week
  const urgent = reminders.filter((r) => r.daysLeft <= 7).length

  const items: NavItem[] = [
    { key: 'index', label: 'בית', icon: House },
    { key: 'reminders', label: 'תזכורות', icon: Bell, badge: urgent },
    { key: 'documents', label: 'מסמכים', icon: FileText },
    { key: 'settings', label: 'הגדרות', icon: Settings, badge: hasUpdate },
  ]
  const active = state.routes[state.index]?.name ?? 'index'

  return (
    <NavigationBar
      items={items}
      activeKey={active}
      onSelect={(key) => {
        const route = state.routes.find((r) => r.name === key)
        if (!route) return
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
        if (!event.defaultPrevented) navigation.navigate(route.name)
      }}
    />
  )
}

export default function TabsLayout() {
  // test dates follow the Ministry of Transport without a manual fetch
  useRegistrySync()
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // back from any tab returns home; back on home leaves the app
      backBehavior="firstRoute"
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="reminders" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="settings" />
    </Tabs>
  )
}
