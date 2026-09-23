import type { InsuranceRecord } from '@shared/types'
import { EditorFallback } from '../../../features/forms/EditorFallback'
import { useRecordParam } from '../../../features/forms/useRecordParam'
import { InsuranceForm } from '../../../features/insurance/InsuranceForm'

export default function InsuranceEditScreen() {
  const { car, record, loading, missing } = useRecordParam<InsuranceRecord>('insurances')
  if (!car || loading || missing) return <EditorFallback title="פוליסה" loading={loading} />
  return <InsuranceForm key={record?.id ?? 'new'} car={car} initial={record} />
}
