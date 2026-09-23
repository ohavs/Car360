import { printToFileAsync } from 'expo-print'
import { shareAsync } from 'expo-sharing'
import { carDisplayName } from '@shared/reminders'
import type { Car, InsuranceRecord, ServiceRecord } from '@shared/types'
import { formatDate, formatMoney, formatNumber, formatPlate } from '@shared/utils'
import { loadHistory } from '../../data/share'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The same document as the web app's PassportView, as a printable page. */
export function passportHtml(car: Car, services: ServiceRecord[], insurances: InsuranceRecord[]): string {
  const sorted = [...services].sort((a, b) => b.date.localeCompare(a.date))
  const total = sorted.reduce((s, r) => s + (r.cost ?? 0), 0)
  const policies = [...insurances].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))
  const row = (label: string, value?: string | number) =>
    value === undefined || value === '' ? '' : `<div class="kv"><span>${esc(label)}</span><b>${esc(value)}</b></div>`

  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: 'Heebo', 'Noto Sans Hebrew', Arial, sans-serif; color: #111; font-size: 12px; }
  header { display: flex; align-items: center; gap: 18px; border-bottom: 4px solid #111; padding-bottom: 14px; }
  header img { max-height: 90px; max-width: 150px; object-fit: contain; }
  .brand { font-size: 10px; font-weight: 700; letter-spacing: .15em; color: #666; }
  h1 { font-size: 28px; font-weight: 900; margin: 2px 0 6px; }
  .plate { display: inline-block; background: #fcd34d; border: 2px solid #111; border-radius: 6px; padding: 3px 12px;
           font-size: 20px; font-weight: 900; letter-spacing: .12em; direction: ltr; }
  h2 { font-size: 15px; font-weight: 900; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .kv { display: flex; justify-content: space-between; border-bottom: 1px dotted #ddd; padding: 3px 0; }
  .kv span { color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: right; color: #666; border-bottom: 2px solid #ccc; padding: 5px 4px; }
  td { border-bottom: 1px solid #eee; padding: 5px 4px; vertical-align: top; }
  .total { text-align: left; font-weight: 900; margin-top: 8px; }
  footer { margin-top: 28px; color: #888; font-size: 10px; text-align: center; }
</style></head><body>
<header>
  ${car.imageUrl ? `<img src="${esc(car.imageUrl)}">` : ''}
  <div><div class="brand">CAR360 · דרכון רכב</div><h1>${esc(carDisplayName(car))}</h1><span class="plate">${esc(formatPlate(car.plate))}</span></div>
</header>
<h2>פרטי הרכב</h2>
<div class="grid">
  ${row('יצרן', car.make)}${row('דגם', car.model)}${row('שנת ייצור', car.year)}${row('צבע', car.color)}
  ${row('סוג דלק', car.fuelType)}${row('תוקף טסט', car.testExpiry && formatDate(car.testExpiry))}${row('מספר שלדה', car.vin)}
</div>
<h2>היסטוריית טיפולים (${sorted.length})</h2>
${
  sorted.length === 0
    ? '<p>לא תועדו טיפולים.</p>'
    : `<table><tr><th>תאריך</th><th>טיפול</th><th>ק״מ</th><th>עלות</th></tr>${sorted
        .map(
          (s) =>
            `<tr><td>${esc(formatDate(s.date))}</td><td><b>${esc(s.title)}</b>${s.garage ? ` · ${esc(s.garage)}` : ''}</td><td>${
              s.odometer != null ? esc(formatNumber(s.odometer)) : '—'
            }</td><td>${s.cost != null ? esc(formatMoney(s.cost)) : '—'}</td></tr>`,
        )
        .join('')}</table>${total > 0 ? `<div class="total">סה״כ: ${esc(formatMoney(total))}</div>` : ''}`
}
<h2>ביטוחים (${policies.length})</h2>
${
  policies.length === 0
    ? '<p>לא תועדו ביטוחים.</p>'
    : `<table><tr><th>סוג</th><th>חברה</th><th>בתוקף עד</th></tr>${policies
        .map((p) => `<tr><td>${esc(p.kind)}</td><td>${esc(p.company)}</td><td>${esc(formatDate(p.endDate))}</td></tr>`)
        .join('')}</table>`
}
<footer>הופק ב-Car360 · ${esc(formatDate(new Date().toISOString().slice(0, 10)))}</footer>
</body></html>`
}

/** Builds the passport PDF and opens the share sheet (WhatsApp, mail, Drive…). */
export async function sharePassportPdf(car: Car): Promise<void> {
  const { services, insurances } = await loadHistory(car.id)
  const { uri } = await printToFileAsync({ html: passportHtml(car, services, insurances) })
  await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `דרכון רכב · ${carDisplayName(car)}`, UTI: 'com.adobe.pdf' })
}
