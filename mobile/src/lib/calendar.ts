import { createEventInCalendarAsync } from 'expo-calendar/legacy'

/**
 * Opens the phone's own calendar (Google Calendar) with an all-day event
 * filled in — the user picks the calendar and saves. No calendar permission:
 * the system dialog does the writing.
 */
export async function addToCalendar({ title, date, notes }: { title: string; date: string; notes?: string }): Promise<void> {
  const [y, m, d] = date.split('-').map(Number)
  await createEventInCalendarAsync({
    title,
    startDate: new Date(y, m - 1, d),
    endDate: new Date(y, m - 1, d + 1),
    allDay: true,
    notes: notes ? `${notes}\n\nנוסף מ-Car360` : 'נוסף מ-Car360',
  })
}
