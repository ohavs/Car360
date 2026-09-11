import { useSyncExternalStore } from 'react'

/** Home-screen density. Lives in Settings → עיצוב (it's a preference, not a
 *  control the user needs on the home screen itself). */
export type HomeLayoutId = 'bento' | 'stack' | 'compact'

const KEY = 'car360:homeLayout'
const EVENT = 'car360:homeLayout-changed'

export function getHomeLayout(): HomeLayoutId {
  const s = localStorage.getItem(KEY)
  return s === 'stack' || s === 'compact' ? s : 'bento'
}

export function setHomeLayout(layout: HomeLayoutId): void {
  localStorage.setItem(KEY, layout)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** Read the layout reactively — stays in sync across screens. */
export function useHomeLayout(): HomeLayoutId {
  return useSyncExternalStore(subscribe, getHomeLayout, () => 'bento' as const)
}
