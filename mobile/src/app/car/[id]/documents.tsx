import { FileText } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { carDisplayName } from '@shared/reminders'
import type { CarDocument, DocumentCategory } from '@shared/types'
import { useLiveSub } from '../../../data/live'
import { DocumentGrid } from '../../../features/cars/DocumentGrid'
import { useCarParam } from '../../../features/cars/useCarParam'
import { radius } from '../../../theme/tokens'
import { AppBar, EmptyState, FilterChips, PhotoViewer, Screen, Skeleton } from '../../../ui'

type Filter = 'הכל' | DocumentCategory
const FILTERS: Filter[] = ['הכל', 'רישיון רכב', 'ביטוח', 'טסט', 'קבלה', 'תמונה', 'אחר']

export default function CarDocumentsScreen() {
  const { id, car } = useCarParam()
  const { items, loading } = useLiveSub<CarDocument>(id, 'documents')
  const [filter, setFilter] = useState<Filter>('הכל')
  const [viewing, setViewing] = useState<number | null>(null)
  const shown = useMemo(
    () => [...items].filter((d) => filter === 'הכל' || d.category === filter).sort((a, b) => b.createdAt - a.createdAt),
    [items, filter],
  )

  return (
    <Screen header={<AppBar title="מסמכים ותמונות" subtitle={car ? carDisplayName(car) : undefined} back />}>
      <FilterChips<Filter> value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f }))} />
      {loading ? (
        <Skeleton height={180} radius={radius.card} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filter === 'הכל' ? 'אין מסמכים עדיין' : `אין מסמכים בקטגוריית ${filter}`}
          subtitle="רישיון רכב, פוליסות, קבלות — הכל זמין תמיד בכיס"
        />
      ) : (
        <DocumentGrid docs={shown} onOpen={setViewing} />
      )}
      {viewing !== null && (
        <PhotoViewer
          photos={shown.map((d) => d.imageUrl)}
          index={viewing}
          title={shown[viewing]?.title}
          onClose={() => setViewing(null)}
        />
      )}
    </Screen>
  )
}
