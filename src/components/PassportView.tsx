import CarSilhouette from './cars/CarSilhouette'
import { formatDate, formatMoney, formatNumber, formatPlate } from '../lib/utils'
import type { InsuranceRecord, PublicPassport, ServiceRecord } from '../types'

type PassportCar = PublicPassport['car']

function displayName(car: PassportCar): string {
  return car.nickname || `${car.make} ${car.model}`.trim() || car.plate
}

/** The printable passport document body — pure presentation, shared by the
 *  owner's preview (PassportPage) and the public link (PublicPassportPage). */
export default function PassportView({
  car,
  services,
  insurances,
}: {
  car: PassportCar
  services: ServiceRecord[]
  insurances: InsuranceRecord[]
}) {
  const sortedServices = [...services].sort((a, b) => b.date.localeCompare(a.date))
  const totalSpend = sortedServices.reduce((s, r) => s + (r.cost ?? 0), 0)

  return (
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
          <h1 className="text-3xl font-black leading-tight">{displayName(car)}</h1>
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
      <Section title={`ביטוחים (${insurances.length})`}>
        {insurances.length === 0 ? (
          <p className="text-sm text-neutral-500">לא תועדו פוליסות.</p>
        ) : (
          <Grid>
            {[...insurances]
              .sort((a, b) => b.endDate.localeCompare(a.endDate))
              .map((ins) => (
                <Row key={ins.id} label={`${ins.kind} · ${ins.company}`} value={`עד ${formatDate(ins.endDate)}`} />
              ))}
          </Grid>
        )}
      </Section>

      <footer className="mt-8 border-t border-neutral-300 pt-3 text-center text-xs text-neutral-400">
        הופק ב-{formatDate(new Date().toISOString().slice(0, 10))} · Car360
      </footer>
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
