import { SearchX } from 'lucide-react-native'
import { radius } from '../../theme/tokens'
import { AppBar, EmptyState, Screen, Skeleton } from '../../ui'

/** What an editor shows while its record loads, or once it is gone. */
export function EditorFallback({ title, loading }: { title: string; loading: boolean }) {
  return (
    <Screen header={<AppBar title={title} back />}>
      {loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} height={56} radius={radius.field} />)
      ) : (
        <EmptyState icon={SearchX} title="לא נמצא" subtitle="ייתכן שהפריט נמחק ממכשיר אחר" />
      )}
    </Screen>
  )
}
