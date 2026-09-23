import type { ServiceRecord } from '@shared/types'
import { EditorFallback } from '../../../features/forms/EditorFallback'
import { useRecordParam } from '../../../features/forms/useRecordParam'
import { ServiceForm } from '../../../features/services/ServiceForm'

export default function ServiceEditScreen() {
  const { car, record, loading, missing } = useRecordParam<ServiceRecord>('services')
  if (!car || loading || missing) return <EditorFallback title="טיפול" loading={loading} />
  return <ServiceForm key={record?.id ?? 'new'} car={car} initial={record} />
}
