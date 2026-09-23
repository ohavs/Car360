import { useLocalSearchParams } from 'expo-router'
import type { InsuranceKind, InsuranceRecord } from '@shared/types'
import { useLiveSub } from '../../../data/live'
import { EditorFallback } from '../../../features/forms/EditorFallback'
import { useRecordParam } from '../../../features/forms/useRecordParam'
import { InsuranceForm } from '../../../features/insurance/InsuranceForm'

/** ?rid= edits a policy · ?kind= renews the latest policy of that kind */
export default function InsuranceEditScreen() {
  const { car, record, loading, missing } = useRecordParam<InsuranceRecord>('insurances')
  const { kind } = useLocalSearchParams<{ kind?: InsuranceKind }>()
  const all = useLiveSub<InsuranceRecord>(kind ? car?.id : undefined, 'insurances')
  if (!car || loading || missing || (kind && all.loading)) return <EditorFallback title="פוליסה" loading={loading || all.loading} />
  const previous = kind
    ? all.items.filter((p) => p.kind === kind).sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))[0]
    : undefined
  return <InsuranceForm key={record?.id ?? kind ?? 'new'} car={car} initial={record} renewKind={kind} previous={previous} />
}
