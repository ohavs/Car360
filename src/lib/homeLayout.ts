import { IconLayoutBento, IconLayoutGrid, IconLayoutStack } from '../components/icons'

/** Home-screen density. Lives here (not in HomePage) because the control moved
 *  to Settings — it is configuration, not something to carry on the home
 *  screen itself. */
export type LayoutId = 'bento' | 'stack' | 'compact'

const KEY = 'car360:homeLayout'

export const LAYOUT_OPTIONS: { id: LayoutId; label: string; icon: typeof IconLayoutBento }[] = [
  { id: 'bento', label: 'לוח משבצות', icon: IconLayoutBento },
  { id: 'stack', label: 'טור יחיד', icon: IconLayoutStack },
  { id: 'compact', label: 'רשת קומפקטית', icon: IconLayoutGrid },
]

export function readLayout(): LayoutId {
  const s = localStorage.getItem(KEY)
  return s === 'stack' || s === 'compact' ? s : 'bento'
}

export function writeLayout(l: LayoutId): void {
  localStorage.setItem(KEY, l)
}
