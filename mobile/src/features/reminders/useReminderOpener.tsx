import { useRouter } from 'expo-router'
import { CalendarClock, CheckCircle2, ChevronLeft, RefreshCw } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import type { Car, CustomReminder, DerivedReminder } from '@shared/types'
import { dueLabel, formatDate } from '@shared/utils'
import { patchCar } from '../../data/mutations'
import { routeForReminder } from '../../data/reminders'
import { ListItem, Sheet, useSnackbar } from '../../ui'
import { TestSheet } from '../cars/TestSheet'
import { ReminderSheet } from './ReminderSheet'

type Open =
  | { kind: 'test' | 'license'; carId: string }
  | { kind: 'custom'; reminder: CustomReminder }
  | { kind: 'actions'; reminder: DerivedReminder }
  | null

/** the record id at the end of a reminder key: svc:{car}:{id}, block:{car}:{id}, ins:{car}:{kind} */
const keyTail = (key: string) => key.split(':').slice(2).join(':')

/**
 * A tap on a reminder opens what it is about right there — the test date in
 * a sheet, your own reminder in its editor, and for the rest a short list of
 * what you can do ("done", "renew") — instead of sending you elsewhere.
 */
export function useReminderOpener(cars: Car[], customs: CustomReminder[], activeCarId?: string) {
  const router = useRouter()
  const snack = useSnackbar()
  const [open, setOpen] = useState<Open>(null)

  const openReminder = (r: DerivedReminder) => {
    if (r.source === 'test' || r.source === 'license') return setOpen({ kind: r.source, carId: r.carId })
    if (r.source === 'custom') {
      const custom = customs.find((c) => c.id === r.customId && c.carId === r.carId)
      if (custom) return setOpen({ kind: 'custom', reminder: custom })
    }
    if (r.source === 'service' || r.source === 'insurance' || r.source === 'block') return setOpen({ kind: 'actions', reminder: r })
    router.push(routeForReminder(r) as never)
  }

  const close = () => setOpen(null)
  const go = (href: Parameters<typeof router.push>[0]) => {
    close()
    router.push(href)
  }

  const blockDone = async (r: DerivedReminder) => {
    close()
    const car = cars.find((c) => c.id === r.carId)
    if (!car) return
    const id = keyTail(r.key)
    try {
      await patchCar(car.id, { blocks: car.blocks.map((b) => (b.id === id ? { ...b, remind: false } : b)) })
      snack(`"${r.title}" סומן כבוצע`, {
        tone: 'success',
        action: { label: 'ביטול', onPress: () => void patchCar(car.id, { blocks: car.blocks }) },
      })
    } catch {
      snack('העדכון נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }

  // the live car, so the sheet shows a change the moment it's saved
  const car = open && (open.kind === 'test' || open.kind === 'license') ? cars.find((c) => c.id === open.carId) : undefined

  let sheet = null
  if (open?.kind === 'custom') {
    sheet = <ReminderSheet key={open.reminder.id} cars={cars} defaultCarId={activeCarId} reminder={open.reminder} onClose={close} />
  } else if (car && open && (open.kind === 'test' || open.kind === 'license')) {
    sheet = <TestSheet key={`${open.kind}:${car.id}`} car={car} kind={open.kind} onClose={close} />
  } else if (open?.kind === 'actions') {
    const r = open.reminder
    const tail = keyTail(r.key)
    sheet = (
      <Sheet visible onClose={close} title={r.title}>
        <View>
          <ListItem icon={CalendarClock} title={`${formatDate(r.dueDate)} · ${dueLabel(r.dueDate)}`} subtitle={r.carName} />
          {r.source === 'service' && (
            <>
              <ListItem
                icon={CheckCircle2}
                tone="success"
                title="סימון כבוצע"
                subtitle="תיעוד הטיפול עם התאריך שבו נעשה — והתזכורת נסגרת"
                onPress={() => go({ pathname: '/car/[id]/service-edit', params: { id: r.carId, from: tail } })}
              />
              <ListItem icon={ChevronLeft} title="לכל הטיפולים" onPress={() => go(`/car/${r.carId}/services`)} />
            </>
          )}
          {r.source === 'insurance' && (
            <>
              <ListItem
                icon={RefreshCw}
                tone="success"
                title="חידשתי את הביטוח"
                subtitle="פוליסה חדשה, עם התאריכים של השנה הבאה"
                onPress={() => go({ pathname: '/car/[id]/insurance-edit', params: { id: r.carId, kind: tail } })}
              />
              <ListItem icon={ChevronLeft} title="לכל הפוליסות" onPress={() => go(`/car/${r.carId}/insurance`)} />
            </>
          )}
          {r.source === 'block' && (
            <>
              <ListItem icon={CheckCircle2} tone="success" title="סימון כבוצע" subtitle="התזכורת לא תופיע יותר" onPress={() => void blockDone(r)} />
              <ListItem icon={ChevronLeft} title="לפרטי הרכב" onPress={() => go(`/car/${r.carId}`)} />
            </>
          )}
        </View>
      </Sheet>
    )
  }

  return {
    openReminder,
    openTest: (carId: string) => setOpen({ kind: 'test', carId }),
    sheet,
  }
}
