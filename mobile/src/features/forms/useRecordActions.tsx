import { useRouter } from 'expo-router'
import { Pencil, Trash2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import type { InsuranceRecord, ServiceRecord } from '@shared/types'
import { deleteRecord } from '../../data/mutations'
import { ActionSheet, ConfirmDialog, useSnackbar } from '../../ui'

type Kind = { sub: 'services'; rec: ServiceRecord } | { sub: 'insurances'; rec: InsuranceRecord }

const EDITOR = { services: '/car/[id]/service-edit', insurances: '/car/[id]/insurance-edit' } as const
const NOUN = { services: 'הטיפול', insurances: 'הפוליסה' } as const

/** Long-press on a service or a policy: edit or delete (after asking). */
export function useRecordActions() {
  const router = useRouter()
  const snack = useSnackbar()
  const [acting, setActing] = useState<(Kind & { title: string }) | null>(null)
  const [deleting, setDeleting] = useState<(Kind & { title: string }) | null>(null)

  const remove = async (k: Kind) => {
    try {
      await deleteRecord(k.sub, k.rec)
      snack(`${NOUN[k.sub]} נמחק${k.sub === 'insurances' ? 'ה' : ''}`, { tone: 'info' })
    } catch {
      snack('המחיקה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }

  const element = (
    <>
      {acting && (
        <ActionSheet
          title={acting.title}
          onClose={() => setActing(null)}
          actions={[
            {
              icon: Pencil,
              label: 'עריכה',
              onPress: () => router.push({ pathname: EDITOR[acting.sub], params: { id: acting.rec.carId, rid: acting.rec.id } }),
            },
            { icon: Trash2, label: 'מחיקה', destructive: true, onPress: () => setDeleting(acting) },
          ]}
        />
      )}
      <ConfirmDialog
        visible={deleting !== null}
        title={`למחוק את ${deleting ? NOUN[deleting.sub] : ''}?`}
        message={`"${deleting?.title ?? ''}" יימחק יחד עם התמונות שלו. אי אפשר לשחזר.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const k = deleting
          setDeleting(null)
          if (k) void remove(k)
        }}
      />
    </>
  )

  const openService = useCallback((rec: ServiceRecord) => setActing({ sub: 'services', rec, title: rec.title || 'טיפול' }), [])
  const openPolicy = useCallback(
    (rec: InsuranceRecord) => setActing({ sub: 'insurances', rec, title: [rec.kind, rec.company].filter(Boolean).join(' · ') }),
    [],
  )
  return { openService, openPolicy, element }
}
