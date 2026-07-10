import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PassportView from '../components/PassportView'
import { IconDownload, IconShield } from '../components/icons'
import { Spinner } from '../components/ui'
import { repo } from '../data'
import type { PublicPassport } from '../types'

/** Public, read-only passport reachable via a shared link (`/p/:token`).
 *  No authentication required — reads a frozen snapshot by token. */
export default function PublicPassportPage() {
  const { token } = useParams()
  const [passport, setPassport] = useState<PublicPassport | null | undefined>(undefined)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void repo
      .getPublicPassport(token)
      .then((p) => !cancelled && setPassport(p))
      .catch(() => !cancelled && setPassport(null))
    return () => {
      cancelled = true
    }
  }, [token])

  if (passport === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <Spinner />
      </div>
    )
  }

  if (passport === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-neutral-100 px-8 text-center text-black" dir="rtl">
        <span className="flex size-16 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
          <IconShield size={30} />
        </span>
        <h1 className="text-xl font-black">הקישור אינו זמין</h1>
        <p className="max-w-xs text-sm text-neutral-500">
          ייתכן שהקישור פג תוקף או שבעל הרכב ביטל אותו. בקשו קישור עדכני.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-neutral-100 text-black print:bg-white" dir="rtl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/90 px-4 py-3 pt-safe shadow-sm backdrop-blur print:hidden">
        <p className="text-sm font-bold text-neutral-500">דרכון רכב · לצפייה בלבד</p>
        <button
          onClick={() => window.print()}
          className="flex min-h-11 items-center gap-2 rounded-full bg-black px-5 font-bold text-white active:scale-95"
        >
          <IconDownload size={18} />
          שמירה / הדפסה
        </button>
      </div>

      <PassportView car={passport.car} services={passport.services} insurances={passport.insurances} />
    </div>
  )
}
