import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PassportView from '../components/PassportView'
import { IconChevronRight, IconDownload } from '../components/icons'
import { Spinner } from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { repo } from '../data'
import type { InsuranceRecord, ServiceRecord } from '../types'

/** Printable "car passport" — a clean summary of the whole record, ideal for
 *  selling the car. Rendered outside the app shell so it prints on its own. */
export default function PassportPage() {
  const { id } = useParams()
  const { cars } = useCars()
  const car = cars.find((c) => c.id === id)
  const [services, setServices] = useState<ServiceRecord[] | null>(null)
  const [insurances, setInsurances] = useState<InsuranceRecord[] | null>(null)

  useEffect(() => {
    if (!id) return
    void repo.listServices(id).then(setServices)
    void repo.listInsurances(id).then(setInsurances)
  }, [id])

  const navigate = useNavigate()

  if (!car) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <Spinner />
      </div>
    )
  }

  const loading = services === null || insurances === null

  return (
    <div className="min-h-dvh bg-neutral-100 text-black print:bg-white" dir="rtl">
      {/* screen-only toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/90 px-4 py-3 pt-safe shadow-sm backdrop-blur print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex size-11 items-center justify-center rounded-full bg-neutral-100 active:scale-90"
          aria-label="חזרה"
        >
          <IconChevronRight size={22} />
        </button>
        <p className="text-sm font-bold text-neutral-500">תצוגה מקדימה · דרכון רכב</p>
        <button
          onClick={() => window.print()}
          className="flex min-h-11 items-center gap-2 rounded-full bg-black px-5 font-bold text-white active:scale-95"
        >
          <IconDownload size={18} />
          שמירה / הדפסה
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : (
        <PassportView car={car} services={services!} insurances={insurances!} />
      )}
    </div>
  )
}
