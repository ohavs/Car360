/**
 * Car360 — scheduled push reminders.
 *
 * Runs every morning, scans every car for test / insurance / service / custom /
 * block reminders and sends an FCM push to the car owner's devices when an item
 * is due — honouring the owner's per-type lead-time settings
 * (users/{uid}.notifications). Invalid tokens are pruned.
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

const DAY = 24 * 60 * 60 * 1000
/** Notify only on these day-counts (within the configured lead time) so users
 *  aren't spammed daily. */
const MILESTONES = [30, 14, 7, 3, 1, 0]

const DEFAULT_PREFS = { test: 30, insurance: 14, service: 14, custom: 3, block: 7 }

function daysLeft(iso) {
  if (!iso) return null
  const due = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / DAY)
}

/** Alert if the item is due within its lead window, on a milestone day. */
function shouldNotify(dl, lead) {
  if (!lead || lead <= 0 || dl == null || dl < 0 || dl > lead) return false
  return MILESTONES.includes(dl) || dl === lead
}

function duePhrase(d) {
  if (d === 0) return 'היום'
  if (d === 1) return 'מחר'
  return `בעוד ${d} ימים`
}

/** Build the notifications owed for one car (0..n). */
function carNotifications(car, prefs, insurances, services, reminders) {
  const name = car.nickname || `${car.make || ''} ${car.model || ''}`.trim() || car.plate || 'הרכב'
  const out = []
  const add = (dl, lead, title) => {
    if (shouldNotify(dl, lead)) out.push({ title, body: `${name} · ${duePhrase(dl)}` })
  }

  add(daysLeft(car.testExpiry), prefs.test, 'חידוש טסט (רישוי שנתי)')

  // latest end-date per insurance kind (mirrors the app)
  const latestByKind = new Map()
  for (const ins of insurances) {
    const prev = latestByKind.get(ins.kind)
    if (!prev || (ins.endDate || '') > prev) latestByKind.set(ins.kind, ins.endDate)
  }
  for (const [kind, endDate] of latestByKind) {
    add(daysLeft(endDate), prefs.insurance, `סיום ביטוח ${kind}`)
  }

  for (const s of services) {
    if (s.nextDueDate) add(daysLeft(s.nextDueDate), prefs.service, `טיפול קרוב: ${s.title || ''}`.trim())
  }

  for (const r of reminders) {
    if (!r.done) add(daysLeft(r.dueDate), prefs.custom, r.title || 'תזכורת')
  }

  for (const b of car.blocks || []) {
    if (b.type === 'date' && b.remind && b.value) add(daysLeft(b.value), prefs.block, b.title || 'תזכורת')
  }

  return out
}

export const dailyReminderPush = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Asia/Jerusalem', region: 'us-central1' },
  async () => {
    const carsSnap = await db.collection('cars').get()
    const prefsCache = new Map()
    let sent = 0

    for (const carDoc of carsSnap.docs) {
      const car = carDoc.data()
      if (!car.ownerId) continue

      // per-owner notification preferences (cached)
      let prefs = prefsCache.get(car.ownerId)
      if (!prefs) {
        const userSnap = await db.collection('users').doc(car.ownerId).get()
        prefs = { ...DEFAULT_PREFS, ...(userSnap.data()?.notifications || {}) }
        prefsCache.set(car.ownerId, prefs)
      }

      const [insSnap, svcSnap, remSnap] = await Promise.all([
        carDoc.ref.collection('insurances').get(),
        carDoc.ref.collection('services').get(),
        carDoc.ref.collection('reminders').get(),
      ])
      const notifs = carNotifications(
        car,
        prefs,
        insSnap.docs.map((d) => d.data()),
        svcSnap.docs.map((d) => d.data()),
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
