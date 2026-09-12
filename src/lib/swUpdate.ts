/** Service-worker update handling.
 *
 *  The registration vite-plugin-pwa injects only calls `register()` once on
 *  load. The worker itself ships skipWaiting+clientsClaim, so a new version
 *  takes control as soon as the browser happens to notice it — but nothing
 *  ever reloads the open page, so the app keeps running the old bundle. On an
 *  installed PWA that is reopened rather than navigated, the browser may not
 *  check for a new worker for days, so a deploy could stay invisible
 *  indefinitely.
 *
 *  So: check for updates whenever the app comes back to the foreground (and on
 *  a slow timer while it is open), and reload once the new worker has actually
 *  taken over — but never yank the page out from under someone who is in the
 *  middle of filling in a form. */

const CHECK_EVERY_MS = 60_000
/** Reloads closer together than this count as one burst. */
const BURST_MS = 60_000
/** More than this many reloads in a burst is a fight, not a deploy. */
const MAX_RELOADS_PER_BURST = 3
const LOOP_KEY = 'car360:swReloads'

/** A sheet, dialog or the search overlay is open — the user is mid-task and a
 *  reload would throw away what they typed. */
function busy(): boolean {
  return document.body.classList.contains('overlay-open')
}

/** A reload driven by a worker we do not control is a trap: if two workers
 *  ever fight over this scope, each claim would reload the page and the fight
 *  would restart. Reload only for our own worker, and cap how many reloads a
 *  single burst may cause — a budget rather than a cooldown, so an ordinary
 *  update is never swallowed, only a genuine storm is stopped. */
function reloadIsSane(): boolean {
  const url = navigator.serviceWorker.controller?.scriptURL ?? ''
  if (!url.endsWith('/sw.js')) return false
  try {
    const now = Date.now()
    const raw = sessionStorage.getItem(LOOP_KEY)
    const prev = raw ? (JSON.parse(raw) as { first: number; n: number }) : null
    // a burst that has gone quiet is forgotten
    if (!prev || now - prev.first > BURST_MS) {
      sessionStorage.setItem(LOOP_KEY, JSON.stringify({ first: now, n: 1 }))
      return true
    }
    if (prev.n >= MAX_RELOADS_PER_BURST) return false
    sessionStorage.setItem(LOOP_KEY, JSON.stringify({ first: prev.first, n: prev.n + 1 }))
  } catch {
    /* storage unavailable — proceed, the scriptURL check still guards us */
  }
  return true
}

/** Older builds registered the push worker without a scope, so it landed on
 *  "/" and competed with this one for control of every page. Clear any such
 *  registration left on the device. */
async function dropStrayRegistrations(): Promise<void> {
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) {
      const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? ''
      const scope = new URL(reg.scope).pathname
      if (url.includes('firebase-messaging-sw.js') && scope === '/') await reg.unregister()
    }
  } catch {
    /* nothing we can do — the scriptURL guard above still prevents the loop */
  }
}

export function initServiceWorkerUpdates(): void {
  if (!('serviceWorker' in navigator)) return

  // On a brand-new install the worker claims this page for the first time,
  // which fires controllerchange without anything having changed — that one
  // must not reload. Every controllerchange after it is a real update. A
  // controller already present at startup means the install happened on an
  // earlier visit, so there is no first claim to swallow.
  let claimed = Boolean(navigator.serviceWorker.controller)
  let pending = false
  let reloading = false

  const doReload = () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }

  /** A new worker took over. Decide once whether this warrants a reload, then
   *  either do it or hold it until the user is free. */
  const onUpdate = () => {
    if (reloading || pending) return
    if (!reloadIsSane()) return
    if (busy()) {
      pending = true
      return
    }
    doReload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!claimed) {
      claimed = true
      return
    }
    onUpdate()
  })

  /** The user closed whatever they were doing. This reload was already judged
   *  sane when it was deferred, so it is not re-checked — re-running the
   *  anti-flap guard here would swallow the very update we chose to wait for. */
  const flush = () => {
    if (pending && !busy()) doReload()
  }

  void dropStrayRegistrations()

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      const check = () => {
        if (document.visibilityState !== 'visible') return
        void reg.update().catch(() => {
          /* offline or the server is unreachable — try again next time */
        })
      }

      check()
      const timer = window.setInterval(() => {
        check()
        flush()
      }, CHECK_EVERY_MS)

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          check()
          flush()
        }
      })
      window.addEventListener('focus', () => {
        check()
        flush()
      })
      window.addEventListener('pagehide', () => window.clearInterval(timer))
    })
    .catch(() => {
      /* SW unsupported or blocked — the app works, it just won't self-update */
    })
}
