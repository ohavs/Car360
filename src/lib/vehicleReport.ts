/** Deep vehicle report — squeezes every available drop of public data about a
 *  car from its plate number.
 *
 *  Strategy (all client-side, no API keys, no paid services):
 *   1. SEED sources: known Ministry of Transport datasets on data.gov.il (CKAN).
 *   2. DISCOVERY: search the CKAN catalog for *every* other dataset that is
 *      keyed by a plate number, so new/renamed datasets are picked up
 *      automatically instead of rotting behind hardcoded UUIDs. Cached 24h.
 *   3. QUERY every source in parallel and merge the records.
 *   4. VIN decode via NHTSA vPIC (free, worldwide) for engine/body/plant/safety
 *      details the Israeli registry doesn't publish.
 *
 *  Nothing is thrown away: fields we don't explicitly map are still surfaced in
 *  a per-source "additional data" section.
 */

const CKAN = 'https://data.gov.il/api/3/action'
const CACHE_KEY = 'car360:datagov:sources:v1'
const CACHE_TTL = 24 * 60 * 60 * 1000

export interface SourceDef {
  resourceId: string
  /** human title shown in the report's sources list */
  title: string
  /** field holding the plate number (resolved lazily) */
  plateField?: string
  /** seeds are always queried even if discovery fails */
  seed?: boolean
}

/** Confirmed Ministry of Transport resources (verified against data.gov.il). */
export const SEED_SOURCES: SourceDef[] = [
  { resourceId: '053cea08-09bc-40ec-8f7a-156f0677aff3', title: 'רכב פרטי ומסחרי — מאגר הרישוי', plateField: 'mispar_rechev', seed: true },
  { resourceId: '0866573c-40cd-4ca8-91d2-9dd2d7a492e5', title: 'רכב פרטי ומסחרי — המשך', plateField: 'mispar_rechev', seed: true },
  { resourceId: 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f', title: 'כלי רכב דו-גלגליים', plateField: 'mispar_rechev', seed: true },
  { resourceId: '36bf1404-0be4-49d2-82dc-2f1ead4a8b93', title: 'ריקול (קריאת שירות) שטרם בוצע', plateField: 'mispar_rechev', seed: true },
  { resourceId: 'c8b9f9c8-4612-4068-934f-d4acd2e3c06e', title: 'תג חניה לנכה', plateField: 'mispar_rechev', seed: true },
]

/** Catalog keywords used to discover further plate-keyed datasets. */
const DISCOVERY_QUERIES = [
  'רכב',
  'רישוי כלי רכב',
  'ריקול',
  'ירידה מהכביש',
  'יבוא אישי',
  'מבחן רכב',
  'נסועה קילומטראז',
]

export interface RawHit {
  source: SourceDef
  record: Record<string, unknown>
}

export interface VehicleReport {
  plate: string
  hits: RawHit[]
  /** merged view of every field found, first non-empty value wins */
  merged: Record<string, unknown>
  vin?: string
  vinDecode?: Record<string, string>
  /** sources that actually returned a record */
  matchedSources: string[]
  /** sources queried in total */
  queriedCount: number
  errors: string[]
}

/* ------------------------------ CKAN plumbing ----------------------------- */

async function ckan<T>(action: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${CKAN}/${action}?${qs}`)
  if (!res.ok) throw new Error(`CKAN ${action} ${res.status}`)
  const json = (await res.json()) as { success?: boolean; result?: T }
  if (!json.success) throw new Error(`CKAN ${action} unsuccessful`)
  return json.result as T
}

const PLATE_FIELD_RE = /^(mispar_rechev|misparrechev|mspr_rechev|rechev_mispar|mis_rechev)$/i

/** Resolve which column holds the plate number for a resource (0-row probe). */
async function resolvePlateField(resourceId: string): Promise<string | null> {
  try {
    const r = await ckan<{ fields?: { id: string }[] }>('datastore_search', {
      resource_id: resourceId,
      limit: '0',
    })
    const ids = (r.fields ?? []).map((f) => f.id)
    return (
      ids.find((id) => PLATE_FIELD_RE.test(id)) ??
      ids.find((id) => /mispar/i.test(id) && /rechev/i.test(id)) ??
      null
    )
  } catch {
    return null
  }
}

/* ------------------------------- discovery -------------------------------- */

interface CachedSources {
  at: number
  sources: SourceDef[]
}

function readCache(): SourceDef[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as CachedSources
    if (Date.now() - c.at > CACHE_TTL) return null
    return c.sources
  } catch {
    return null
  }
}

function writeCache(sources: SourceDef[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), sources } satisfies CachedSources))
  } catch {
    /* quota — non-fatal */
  }
}

interface Pkg {
  title?: string
  resources?: { id: string; name?: string; datastore_active?: boolean }[]
}

/** Find every datastore resource in the catalog that is keyed by a plate. */
export async function discoverSources(): Promise<SourceDef[]> {
  const cached = readCache()
  if (cached) return cached

  const found = new Map<string, SourceDef>()
  for (const s of SEED_SOURCES) found.set(s.resourceId, s)

  try {
    const results = await Promise.allSettled(
      DISCOVERY_QUERIES.map((q) =>
        ckan<{ results?: Pkg[] }>('package_search', { q, rows: '40' }),
      ),
    )
    const candidates: SourceDef[] = []
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      for (const pkg of r.value.results ?? []) {
        for (const res of pkg.resources ?? []) {
          if (!res.datastore_active || found.has(res.id)) continue
          if (candidates.some((c) => c.resourceId === res.id)) continue
          candidates.push({
            resourceId: res.id,
            title: [pkg.title, res.name].filter(Boolean).join(' · ') || 'מאגר נוסף',
          })
        }
      }
    }
    // probe candidates for a plate column (bounded, in parallel)
    const probes = await Promise.allSettled(
      candidates.slice(0, 40).map(async (c) => ({ ...c, plateField: await resolvePlateField(c.resourceId) })),
    )
    for (const p of probes) {
      if (p.status === 'fulfilled' && p.value.plateField) {
        found.set(p.value.resourceId, { ...p.value, plateField: p.value.plateField })
      }
    }
  } catch {
    /* discovery is best-effort — seeds still work */
  }

  const sources = [...found.values()]
  writeCache(sources)
  return sources
}

/* --------------------------------- query ---------------------------------- */

async function querySource(src: SourceDef, plate: number): Promise<RawHit[]> {
  let field = src.plateField
  if (!field) {
    field = (await resolvePlateField(src.resourceId)) ?? undefined
    if (!field) return []
  }
  const r = await ckan<{ records?: Record<string, unknown>[] }>('datastore_search', {
    resource_id: src.resourceId,
    filters: JSON.stringify({ [field]: plate }),
    limit: '20',
  })
  return (r.records ?? []).map((record) => ({ source: { ...src, plateField: field }, record }))
}

const EMPTY_RE = /^(|null|undefined|לא ידוע|לא רלוונטי|-|0000-00-00)$/i

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return EMPTY_RE.test(v.trim())
  return false
}

/* ------------------------------ VIN decoding ------------------------------ */

/** Decode a 17-char VIN via NHTSA vPIC (free, CORS-enabled, worldwide). */
export async function decodeVin(vin: string): Promise<Record<string, string> | null> {
  const clean = vin.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(clean)) return null
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(clean)}?format=json`,
    )
    if (!res.ok) return null
    const json = (await res.json()) as { Results?: Record<string, string>[] }
    const row = json.Results?.[0]
    if (!row) return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.trim() && !/^(Not Applicable|0)$/i.test(v.trim())) out[k] = v.trim()
    }
    return Object.keys(out).length > 2 ? out : null
  } catch {
    return null
  }
}

/* --------------------------------- report --------------------------------- */

export function normalizePlate(input: string): string {
  return input.replace(/\D/g, '')
}

/** Build the deepest report we can for a plate number. */
export async function buildVehicleReport(
  plateInput: string,
  onProgress?: (done: number, total: number) => void,
): Promise<VehicleReport> {
  const plate = normalizePlate(plateInput)
  const errors: string[] = []
  const report: VehicleReport = {
    plate,
    hits: [],
    merged: {},
    matchedSources: [],
    queriedCount: 0,
    errors,
  }
  if (plate.length < 5) {
    errors.push('מספר רישוי לא תקין')
    return report
  }

  let sources: SourceDef[]
  try {
    sources = await discoverSources()
  } catch {
    sources = SEED_SOURCES
  }
  report.queriedCount = sources.length

  let done = 0
  const results = await Promise.allSettled(
    sources.map(async (s) => {
      const hits = await querySource(s, Number(plate))
      onProgress?.(++done, sources.length)
      return hits
    }),
  )

  for (const r of results) {
    if (r.status === 'fulfilled') report.hits.push(...r.value)
  }

  // merge: first non-empty value per field wins (seeds are ordered first)
  for (const hit of report.hits) {
    for (const [k, v] of Object.entries(hit.record)) {
      if (k === '_id' || k === 'rank') continue
      if (isEmpty(v)) continue
      if (isEmpty(report.merged[k])) report.merged[k] = v
    }
    if (!report.matchedSources.includes(hit.source.title)) report.matchedSources.push(hit.source.title)
  }

  const vin = firstString(report.merged, ['misgeret', 'shilda', 'vin'])
  if (vin) {
    report.vin = vin
    report.vinDecode = (await decodeVin(vin)) ?? undefined
  }

  return report
}

export function firstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (!isEmpty(v)) return String(v).trim()
  }
  return undefined
}

export { isEmpty }
