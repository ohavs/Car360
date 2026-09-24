import type { LucideIcon } from 'lucide-react-native'
import { View } from 'react-native'
import { ListItem } from './ListItem'
import { Sheet } from './Sheet'

export interface SheetAction {
  icon: LucideIcon
  label: string
  subtitle?: string
  /** destructive actions are red — and should ask for confirmation next */
  destructive?: boolean
  onPress: () => void
}

/** What you can do with an item — opened by a long press on it. */
export function ActionSheet({ title, actions, onClose }: { title: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <Sheet visible onClose={onClose} title={title}>
      <View>
        {actions.map((a) => (
          <ListItem
            key={a.label}
            icon={a.icon}
            title={a.label}
            subtitle={a.subtitle}
            tone={a.destructive ? 'danger' : 'onSurface'}
            onPress={() => {
              onClose()
              a.onPress()
            }}
          />
        ))}
      </View>
    </Sheet>
  )
}
