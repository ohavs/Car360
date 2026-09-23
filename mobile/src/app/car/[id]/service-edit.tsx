import { useLocalSearchParams } from 'expo-router'
import type { ServiceRecord } from '@shared/types'
import { useLiveSub } from '../../../data/live'
import { EditorFallback } from '../../../features/forms/EditorFallback'
import { useRecordParam } from '../../../features/forms/useRecordParam'
import { ServiceForm } from '../../../features/services/ServiceForm'

/** ?rid= edits a service · ?from= records that a due service was done */
export default function ServiceEditScreen() {
  const { car, record, loading, missing } = useRecordParam<ServiceRecord>('services')
  const { from } = useLocalSearchParams<{ from?: string }>()
  const all = useLiveSub<ServiceRecord>(from ? car?.id : undefined, 'services')
  if (!car || loading || missing || (from && all.loading)) return <EditorFallback title="טיפול" loading={loading || all.loading} />
  const source = from ? all.items.find((s) => s.id === from) : undefined
  return <ServiceForm key={record?.id ?? from ?? 'new'} car={car} initial={record} from={source} />
}
