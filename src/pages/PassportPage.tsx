import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CarSilhouette from '../components/cars/CarSilhouette'
import { IconChevronRight, IconDownload } from '../components/icons'
import { Spinner } from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { repo } from '../data'
import { carDisplayName } from '../lib/reminders'
import { formatDate, formatMoney, formatNumber, formatPlate } from '../lib/utils'
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
  const sortedServices = [...(services ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const totalSpend = sortedServices.reduce((s, r) => s + (r.cost ?? 0), 0)

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
        <div className="mx-auto max-w-2xl bg-white p-8 print:max-w-none print:p-6 print:shadow-none">
          {/* header */}
          <header className="flex items-center gap-5 border-b-4 border-black pb-5">
            <div className="flex h-24 w-32 shrink-0 items-center justify-center">
              {car.imageUrl ? (
                <img src={car.imageUrl} alt="" className="max-h-24 w-auto object-contain" />
              ) : (
                <CarSilhouette className="h-16 w-auto text-neutral-800" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Car360 · דרכון רכב</p>
              <h1 className="text-3xl font-black leading-tight">{carDisplayName(car)}</h1>
              <p className="mt-1 inline-block rounded-md bg-amber-300 px-3 py-1 text-xl font-black tracking-widest" dir="ltr">
                {formatPlate(car.plate)}
              </p>
            </div>
          </header>

          {/* details */}
          <Section title="פרטי הרכב">
            <Grid>
              {car.make && <Row label="יצרן" value={car.make} />}
              {car.model && <Row label="דגם" value={car.model} />}
              {car.year != null && <Row label="שנת ייצור" value={String(car.year)} />}
              {car.color && <Row label="צבע" value={car.color} />}
              {car.fuelType && <Row label="סוג דלק" value={car.fuelType} />}
              {car.testExpiry && <Row label="תוקף טסט" value={formatDate(car.testExpiry)} />}
              {car.vin && <Row label="מספר שלדה" value={car.vin} ltr />}
            </Grid>
          </Section>

          {/* services */}
          <Section title={`היסטוריית טיפולים (${sortedServices.length})`}>
            {sortedServices.length === 0 ? (
              <p className="text-sm text-neutral-500">לא תועדו טיפולים.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-neutral-300 text-right text-neutral-500">
                    <th className="py-1.5 font-bold">תאריך</th>
                    <th className="py-1.5 font-bold">טיפול</th>
                    <th className="py-1.5 font-bold">ק״מ</th>
                    <th className="py-1.5 font-bold">עלות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedServices.map((s) => (
                    <tr key={s.id} className="border-b border-neutral-200">
                      <td className="py-1.5 whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="py-1.5 font-semibold">
                        {s.title}
                        {s.garage ? ` · ${s.garage}` : ''}
                      </td>
                      <td className="py-1.5">{s.odometer != null ? formatNumber(s.odometer) : '—'}</td>
                      <td className="py-1.5">{s.cost != null ? formatMoney(s.cost) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {totalSpend > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-black font-black">
                      <td className="py-2" colSpan={3}>
                        סה״כ הוצאות מתועדות
                      </td>
                      <td className="py-2">{formatMoney(totalSpend)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </Section>

          {/* insurances */}
          <Section title={`ביטוחים (${insurances!.length})`}>
            {insurances!.length === 0 ? (
              <p className="text-sm text-neutral-500">לא תועדו פוליסות.</p>
            ) : (
              <Grid>
                {[...insurances!]
                  .sort((a, b) => b.endDate.localeCompare(a.endDate))
                  .map((ins) => (
                    <Row
                      key={ins.id}
                      label={`${ins.kind} · ${ins.company}`}
                      value={`עד ${formatDate(ins.endDate)}`}
                    />
                  ))}
              </Grid>
            )}
          </Section>

          <footer className="mt-8 border-t border-neutral-300 pt-3 text-center text-xs text-neutral-400">
            הופק ב-{formatDate(new Date().toISOString().slice(0, 10))} · Car360
          </footer>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-lg font-black">{title}</h2>
      {children}
    </section>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">{children}</dl>
}
function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dotted border-neutral-200 py-1">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-sm font-bold" dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  )
}
