/**
 * Car360 — scheduled push reminders.
 *
 * Runs every morning, scans every car for test / license / insurance / service /
 * custom / block reminders and sends an FCM push to the devices of the car's
 * owner and of everyone it is shared with, when an item is due — honouring each
 * person's per-type lead-time settings (users/{uid}.notifications). Invalid
 * tokens are pruned.
 *
 * The Android app schedules the same alerts on the phone itself (see
 * shared/notifySchedule.ts). The push is the safety net for a phone that hasn't
 * opened the app lately, so Android devices seen in the last few days are
 * skipped; otherwise both carry the same tag and Android shows only one.
 *
 * Deploy (needs the Blaze plan — scheduled functions require it):
 *   cd functions && npm install && cd ..
 *   npx firebase-tools@13 deploy --only functions --project car360-50b44
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
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
/** an Android phone that opened the app this recently has the alerts scheduled locally */
const ANDROID_FRESH_MS = 3 * DAY

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
  if (d === 7) return 'בעוד שבוע'
  if (d === 14) return 'בעוד שבועיים'
  if (d === 30) return 'בעוד חודש'
  return `בעוד ${d} ימים`
}

/** Build the notifications owed for one car (0..n). Keys, titles and urls
 *  match the app's (shared/reminders.ts, shared/notifySchedule.ts). */
function carNotifications(car, prefs, insurances, services, reminders) {
  const name = car.nickname || `${car.make || ''} ${car.model || ''}`.trim() || car.plate || 'הרכב'
  const out = []
  const add = (key, dueDate, lead, title, url) => {
    const dl = daysLeft(dueDate)
    if (shouldNotify(dl, lead)) out.push({ tag: `${key}:${dl}`, title, body: `${name} · ${duePhrase(dl)}`, url })
  }
  const carUrl = `/car/${car.id}`

  add(`test:${car.id}`, car.testExpiry, prefs.test, 'חידוש טסט (רישוי שנתי)', carUrl)
  add(`license:${car.id}`, car.licenseExpiry, prefs.test, 'חידוש רישיון רכב', carUrl)

  for (const b of car.blocks || []) {
    if (b.type === 'date' && b.remind && b.value) add(`block:${car.id}:${b.id}`, b.value, prefs.block, b.title || 'תזכורת', carUrl)
  }

  // latest end-date per insurance kind (mirrors the app)
  const latestByKind = new Map()
  for (const ins of insurances) {
    if (!ins.endDate) continue
    const prev = latestByKind.get(ins.kind)
    if (!prev || ins.endDate > prev) latestByKind.set(ins.kind, ins.endDate)
  }
  for (const [kind, endDate] of latestByKind) {
    add(`ins:${car.id}:${kind}`, endDate, prefs.insurance, `סיום ביטוח ${kind}`, `${carUrl}/insurance`)
  }

  for (const s of services) {
    if (s.nextDueDate) add(`svc:${car.id}:${s.id}`, s.nextDueDate, prefs.service, `טיפול קרוב: ${s.title || ''}`.trim(), `${carUrl}/services`)
  }

  for (const r of reminders) {
    if (!r.done) add(`custom:${car.id}:${r.id}`, r.dueDate, prefs.custom, r.title || 'תזכורת', '/reminders')
  }

  return out
}

/** The message for one alert: a normal notification on the web, and on
 *  Android the reminders channel with the same tag the phone uses locally. */
function message(tokens, n) {
  return {
    tokens,
    notification: { title: n.title, body: n.body },
    data: { url: n.url, tag: n.tag },
    android: {
      priority: 'high',
      notification: { channelId: 'reminders', tag: n.tag, color: '#dc2626' },
    },
    webpush: { fcmOptions: { link: n.url } },
  }
}

/** uids of the people a car is shared with (users/{uid}.email is set by the apps at sign-in). */
async function uidsByEmail(emails, cache) {
  const out = []
  const missing = []
  for (const e of emails.map((x) => String(x).toLowerCase())) {
    if (cache.has(e)) {
      if (cache.get(e)) out.push(cache.get(e))
    } else missing.push(e)
  }
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30)
    const snap = await db.collection('users').where('email', 'in', chunk).get()
    const found = new Map(snap.docs.map((d) => [d.data().email, d.id]))
    for (const e of chunk) {
      cache.set(e, found.get(e) ?? null)
      if (found.get(e)) out.push(found.get(e))
    }
  }
  return out
}

/** A person's notification prefs and the devices worth pushing to. */
async function recipient(uid, cache) {
  if (cache.has(uid)) return cache.get(uid)
  const [userSnap, tokensSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(uid).collection('fcmTokens').get(),
  ])
  const now = Date.now()
  const devices = tokensSnap.docs.filter((d) => {
    const t = d.data()
    return !(t.platform === 'android' && (t.updatedAt ?? 0) > now - ANDROID_FRESH_MS)
  })
  const r = {
    prefs: { ...DEFAULT_PREFS, ...(userSnap.data()?.notifications || {}) },
    docs: devices,
    total: tokensSnap.size,
  }
  cache.set(uid, r)
  return r
}

async function send(n, rec) {
  if (rec.docs.length === 0) return 0
  const res = await getMessaging().sendEachForMulticast(message(rec.docs.map((d) => d.id), n))
  res.responses.forEach((r, i) => {
    const code = r.error?.code
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
      void rec.docs[i].ref.delete()
    }
  })
  return res.successCount
}

export const dailyReminderPush = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Asia/Jerusalem', region: 'us-central1' },
  async () => {
    const carsSnap = await db.collection('cars').get()
    const people = new Map()
    const emails = new Map()
    let sent = 0
    const stats = { cars: carsSnap.size, withDue: 0, people: new Set(), noDevice: new Set(), tokens: 0 }

    for (const carDoc of carsSnap.docs) {
      const car = { id: carDoc.id, ...carDoc.data() }
      // no owner, or sold/archived: nothing to remind about
      if (!car.ownerId || car.archived) continue
      const uids = [car.ownerId, ...(await uidsByEmail(car.sharedWith || [], emails))]

      const [insSnap, svcSnap, remSnap] = await Promise.all([
        carDoc.ref.collection('insurances').get(),
        carDoc.ref.collection('services').get(),
        carDoc.ref.collection('reminders').get(),
      ])
      const records = [insSnap, svcSnap, remSnap].map((snap) => snap.docs.map((d) => d.data()))

      let due = false
      for (const uid of new Set(uids)) {
        const rec = await recipient(uid, people)
        const notifs = carNotifications(car, rec.prefs, ...records)
        if (notifs.length === 0) continue
        due = true
        stats.people.add(uid)
        if (rec.total === 0) stats.noDevice.add(uid)
        stats.tokens += rec.docs.length
        for (const n of notifs) sent += await send(n, rec)
      }
      if (due) stats.withDue++
    }

    logger.info(
      `Car360 reminder push complete — ${sent} messages sent. ` +
        `cars=${stats.cars} carsWithDueItems=${stats.withDue} ` +
        `people=${stats.people.size} peopleWithoutDevice=${stats.noDevice.size} pushedDevices=${stats.tokens}`,
    )
    if (stats.withDue > 0 && stats.noDevice.size === stats.people.size) {
      logger.warn(
        'Reminders were due but no device is registered for push — users granted notification ' +
          'permission without an FCM token being stored (see ensurePushRegistered on the client).',
      )
    }
  },
)

/** On-demand test push to the caller's own devices (for the "send test" button).
 *  Lets a user confirm push works while the app is closed, without waiting for
 *  the scheduled run. */
export const sendTestPush = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'יש להתחבר')

  const tokensSnap = await db.collection('users').doc(uid).collection('fcmTokens').get()
  const tokens = tokensSnap.docs.map((d) => d.id)
  if (tokens.length === 0) return { sent: 0 }

  const res = await getMessaging().sendEachForMulticast(
    message(tokens, { title: 'Car360 · בדיקה', body: 'התראת ניסיון מהשרת — זה עובד! 🎉', url: '/reminders', tag: 'car360-test' }),
  )

  res.responses.forEach((r, i) => {
    const code = r.error?.code
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
      void tokensSnap.docs[i].ref.delete()
    }
  })
  return { sent: res.successCount }
})
