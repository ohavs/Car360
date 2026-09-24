import { createContext, useContext, type ReactNode } from 'react'
import { useGarage } from './CarsProvider'
import { useAllReminders } from './reminders'

type Reminders = ReturnType<typeof useAllReminders>

const Ctx = createContext<Reminders | null>(null)

/** One live subscription to every car's reminders, shared by the tab bar,
 *  home, the reminders tab and the notification scheduler — instead of each
 *  of them opening its own listeners. */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { cars } = useGarage()
  return <Ctx.Provider value={useAllReminders(cars)}>{children}</Ctx.Provider>
}

export function useReminders(): Reminders {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useReminders must be used inside RemindersProvider')
  return ctx
}
