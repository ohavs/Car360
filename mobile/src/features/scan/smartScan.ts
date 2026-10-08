import Constants from 'expo-constants'
import type { InsuranceKind } from '@shared/types'
import { compress } from '../../data/images'

/**
 * "Smart scan": Gemini reads a policy or a receipt (very good at Hebrew
 * documents — on-device text recognition doesn't do Hebrew) and returns the
 * fields, which pre-fill the form for the user to check.
 *
 * The key ships inside the app, so it must be restricted in Google Cloud to
 * this Android app (package + signing SHA-1) and to the Generative Language
 * API — the two headers below are what that restriction checks.
 */
const config = (Constants.expoConfig?.extra?.gemini ?? {}) as { key?: string; model?: string }
const PACKAGE = 'com.ohavs.car360'
const CERT_SHA1 = '46DAFCF00754ED2F640D3541C25958CF645B1189'

export const smartScanAvailable = Boolean(config.key)

/** Google retires model versions; the "-latest" aliases follow the current
 *  Flash, and the lite one stands in when Flash is overloaded. */
const MODELS = [...new Set([config.model, 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean) as string[])]

/** Why a smart read failed — the button words its message by it. */
export class SmartScanError extends Error {
  constructor(
    readonly kind: 'busy' | 'refused' | 'unreadable',
    message: string,
  ) {
    super(message)
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function call(model: string, body: string): Promise<Response> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 45_000)
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Android-Package': PACKAGE, 'X-Android-Cert': CERT_SHA1 },
      body,
      signal: abort.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Reads up to a few pages of one document (a scan, or a PDF's pages). */
async function extract<T>(pages: string[], prompt: string, schema: object): Promise<T> {
  if (!config.key) throw new SmartScanError('refused', 'smart scan not configured')
  const images = await Promise.all(pages.slice(0, MAX_READ_PAGES).map((p) => compress(p, 'document', true)))
  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, ...images.map((i) => ({ inlineData: { mimeType: 'image/webp', data: i.base64 } }))],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
  })

  let last = ''
  for (const model of MODELS) {
    // a busy model gets one more try before the next one takes over
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response
      try {
        res = await call(model, body)
      } catch (e) {
        last = `${model}: ${(e as Error).message}`
        break
      }
      if (res.ok) {
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new SmartScanError('unreadable', `${model}: empty response`)
        return JSON.parse(text) as T
      }
      last = `${model}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`
      if (res.status === 404) break // retired or unknown model — try the next
      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) await wait(1500)
        continue
      }
      // 400/403: a bad request or a key restriction — another model won't help
      throw new SmartScanError('refused', last)
    }
  }
  throw new SmartScanError('busy', last)
}

/** a policy's details sit on its first pages; more only costs time */
export const MAX_READ_PAGES = 3

const isIso = (v?: string): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() || undefined : undefined)
const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined)

export interface PolicyFields {
  company?: string
  kind?: InsuranceKind
  policyNumber?: string
  startDate?: string
  endDate?: string
  cost?: number
  agentName?: string
  agentPhone?: string
}

const KINDS: InsuranceKind[] = ['חובה', 'מקיף', 'צד ג׳', 'אחר']

export async function scanPolicy(pages: string[]): Promise<PolicyFields> {
  const raw = await extract<Record<string, unknown>>(
    pages,
    'אלה עמודים של פוליסת ביטוח רכב בישראל (עמוד אחד או יותר). חלץ את הפרטים שמופיעים במסמך והחזר JSON בלבד. ' +
      'תאריכים בפורמט YYYY-MM-DD. אם שדה לא מופיע בבירור — השמט אותו (אל תנחש). עלות כמספר בלבד.',
    {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'שם חברת הביטוח' },
        kind: { type: 'string', enum: KINDS, description: 'סוג הפוליסה' },
        policyNumber: { type: 'string', description: 'מספר הפוליסה' },
        startDate: { type: 'string', description: 'תחילת תוקף YYYY-MM-DD' },
        endDate: { type: 'string', description: 'סיום תוקף YYYY-MM-DD' },
        cost: { type: 'number', description: 'עלות שנתית בשקלים' },
        agentName: { type: 'string', description: 'שם סוכן הביטוח' },
        agentPhone: { type: 'string', description: 'טלפון הסוכן' },
      },
    },
  )
  return {
    company: str(raw.company),
    kind: KINDS.includes(raw.kind as InsuranceKind) ? (raw.kind as InsuranceKind) : undefined,
    policyNumber: str(raw.policyNumber),
    startDate: isIso(raw.startDate as string) ? (raw.startDate as string) : undefined,
    endDate: isIso(raw.endDate as string) ? (raw.endDate as string) : undefined,
    cost: num(raw.cost),
    agentName: str(raw.agentName),
    agentPhone: str(raw.agentPhone),
  }
}

export interface ReceiptFields {
  title?: string
  garage?: string
  date?: string
  cost?: number
  odometer?: number
}

export async function scanReceipt(pages: string[]): Promise<ReceiptFields> {
  const raw = await extract<Record<string, unknown>>(
    pages,
    'זוהי קבלה או חשבונית של מוסך בישראל. חלץ מה נעשה ברכב (תיאור קצר, למשל "טיפול 30,000" או "החלפת בלמים"), ' +
      'שם המוסך, תאריך בפורמט YYYY-MM-DD, הסכום הכולל לתשלום, וקילומטראז׳ אם מופיע. JSON בלבד; שדה שלא מופיע בבירור — השמט.',
    {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'מה נעשה, בקצרה' },
        garage: { type: 'string', description: 'שם המוסך' },
        date: { type: 'string', description: 'תאריך YYYY-MM-DD' },
        cost: { type: 'number', description: 'סכום כולל בשקלים' },
        odometer: { type: 'number', description: 'קילומטראז׳' },
      },
    },
  )
  return {
    title: str(raw.title),
    garage: str(raw.garage),
    date: isIso(raw.date as string) ? (raw.date as string) : undefined,
    cost: num(raw.cost),
    odometer: num(raw.odometer),
  }
}
