/** Auto-fill car details from the Israeli Ministry of Transport open data
 *  (data.gov.il CKAN). Runs entirely client-side; the dataset is public and
 *  CORS-enabled. Best-effort: any network/shape issue returns null so the
 *  user just fills the form manually. */

// "רכב פרטי ומסחרי" — private & commercial vehicles registry
const RESOURCE_ID = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const ENDPOINT = 'https://data.gov.il/api/3/action/datastore_search'

export interface VehicleLookup {
  make?: string
  model?: string
  year?: number
  color?: string
  fuelType?: string
  vin?: string
  testExpiry?: string
}

interface RegistryRecord {
  tozeret_nm?: string
  kinuy_mishari?: string
  degem_nm?: string
  shnat_yitzur?: number | string
  tzeva_rechev?: string
  sug_delek_nm?: string
  misgeret?: string
  tokef_dt?: string
}

const FUEL_MAP: [RegExp, string][] = [
  [/היבר/, 'היברידי'],
  [/חשמל/, 'חשמלי'],
  [/דיזל|סולר/, 'דיזל'],
  [/בנזין/, 'בנזין'],
  [/גז|גפמ|גפ״מ/, 'גפ״מ (גז)'],
]

function normalizeFuel(raw?: string): string | undefined {
  if (!raw) return undefined
  for (const [re, label] of FUEL_MAP) if (re.test(raw)) return label
  return raw
}

function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined
  const m = raw.match(/\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : undefined
}

function titleCase(s?: string): string | undefined {
  return s?.trim() || undefined
}

/** Look up a car by its Israeli plate number. Returns the mapped fields,
 *  or null if not found / offline. */
export async function lookupVehicle(plate: string): Promise<VehicleLookup | null> {
  const digits = plate.replace(/\D/g, '')
  if (digits.length < 5) return null

  const url =
    `${ENDPOINT}?resource_id=${RESOURCE_ID}` +
    `&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: Number(digits) }))}` +
    `&limit=1`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as {
      success?: boolean
      result?: { records?: RegistryRecord[] }
    }
    const rec = json?.result?.records?.[0]
    if (!json.success || !rec) return null

    const out: VehicleLookup = {
      make: titleCase(rec.tozeret_nm),
      model: titleCase(rec.kinuy_mishari || rec.degem_nm),
      year: rec.shnat_yitzur ? Number(rec.shnat_yitzur) : undefined,
      color: titleCase(rec.tzeva_rechev),
      fuelType: normalizeFuel(rec.sug_delek_nm),
      vin: titleCase(rec.misgeret),
      testExpiry: normalizeDate(rec.tokef_dt),
    }
    // return null if literally nothing usable came back
    return Object.values(out).some((v) => v !== undefined) ? out : null
  } catch {
    return null
  }
}
