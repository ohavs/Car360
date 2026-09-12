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

/** A sheet, dialog or the search overlay is open — the user is mid-task and a
 *  reload would throw away what they typed. */
function busy(): boolean {
  return document.body.classList.contains('overlay-open')
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

  const reloadWhenIdle = () => {
    if (reloading) return
    if (busy()) {
      pending = true
      return
    }
    reloading = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!claimed) {
      claimed = true
      return
    }
    reloadWhenIdle()
  })

  // the user closed whatever they were doing — now it is safe
  const flush = () => {
    if (pending) reloadWhenIdle()
  }

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
