/**
 * Car360 — scheduled push reminders.
 *
 * Runs every morning, scans every car for test / insurance / custom reminders
 * that fall due on a milestone (14, 7, 3, 1 or 0 days away) and sends an FCM
 * push to the car owner's registered devices. Invalid tokens are pruned.
 *
 * Deploy (needs the Blaze plan — scheduled functions require it):
 *   cd functions && npm install && cd ..
 *   npx firebase-tools@13 deploy --only functions --project car360-50b44
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

/** Notify only on these day-counts so users aren't spammed daily. */
const MILESTONES = new Set([14, 7, 3, 1, 0])
const DAY = 24 * 60 * 60 * 1000

function daysLeft(iso) {
  if (!iso) return null
  const due = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / DAY)
}

function duePhrase(d) {
  if (d === 0) return 'היום'
  if (d === 1) return 'מחר'
  return `בעוד ${d} ימים`
}

/** Build the notifications owed for one car (0..n). */
function carNotifications(car, insurances, reminders) {
  const name = car.nickname || `${car.make || ''} ${car.model || ''}`.trim() || car.plate || 'הרכב'
  const out = []
  const push = (dl, title) => {
    if (dl != null && MILESTONES.has(dl)) out.push({ title, body: `${name} · ${duePhrase(dl)}` })
  }

  push(daysLeft(car.testExpiry), 'תזכורת טסט')
  for (const ins of insurances) {
    push(daysLeft(ins.endDate), `ביטוח ${ins.kind || ''}`.trim() + ' לקראת סיום')
  }
  for (const rem of reminders) {
    if (!rem.done) push(daysLeft(rem.dueDate), rem.title || 'תזכורת')
  }
  return out
}

export const dailyReminderPush = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Asia/Jerusalem', region: 'us-central1' },
  async () => {
    const carsSnap = await db.collection('cars').get()
    let sent = 0

    for (const carDoc of carsSnap.docs) {
      const car = carDoc.data()
      if (!car.ownerId) continue

      const [insSnap, remSnap] = await Promise.all([
        carDoc.ref.collection('insurances').get(),
        carDoc.ref.collection('reminders').get(),
      ])
      const notifs = carNotifications(
        car,
        insSnap.docs.map((d) => d.data()),
        remSnap.docs.map((d) => d.data()),
      )
      if (notifs.length === 0) continue

      const tokensSnap = await db.collection('users').doc(car.ownerId).collection('fcmTokens').get()
      const tokens = tokensSnap.docs.map((d) => d.id)
      if (tokens.length === 0) continue

      for (const n of notifs) {
        const res = await getMessaging().sendEachForMulticast({
          tokens,
          notification: { title: n.title, body: n.body },
          data: { url: '/reminders', tag: 'car360-reminder' },
          webpush: { fcmOptions: { link: '/reminders' } },
        })
        sent += res.successCount

        // prune tokens the FCM service reports as gone
        res.responses.forEach((r, i) => {
          const code = r.error?.code
          if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
            void tokensSnap.docs[i].ref.delete()
          }
        })
      }
    }

    logger.info(`Car360 reminder push complete — ${sent} messages sent.`)
  },
)
