/** Optional Gemini vision helper for "smart scan" of car documents.
 *  When VITE_GEMINI_API_KEY is set, insurance/licence photos are read by
 *  Gemini (excellent Hebrew document understanding) and returned as structured
 *  fields. Without a key the app falls back to on-device Tesseract OCR.
 *
 *  NOTE: the key ships in the client bundle, so restrict it in Google Cloud
 *  Console (HTTP-referrer restriction to the app domain + limit to the
 *  "Generative Language API"). Fine for a personal app; never use an
 *  unrestricted key. */

import { compressToDataUrl } from './images'
import type { InsuranceKind } from '../types'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.0-flash'

export const isGeminiConfigured = Boolean(API_KEY)

export interface InsuranceFields {
  company?: string
  kind?: InsuranceKind
  policyNumber?: string
  startDate?: string
  endDate?: string
  cost?: number
  agentName?: string
  agentPhone?: string
}

const INSURANCE_SCHEMA = {
  type: 'object',
  properties: {
    company: { type: 'string', description: 'שם חברת הביטוח' },
    kind: { type: 'string', enum: ['חובה', 'מקיף', 'צד ג׳', 'אחר'], description: 'סוג הפוליסה' },
    policyNumber: { type: 'string', description: 'מספר הפוליסה' },
    startDate: { type: 'string', description: 'תחילת תוקף בפורמט YYYY-MM-DD' },
    endDate: { type: 'string', description: 'סיום תוקף בפורמט YYYY-MM-DD' },
    cost: { type: 'number', description: 'עלות שנתית בשקלים, מספר בלבד' },
    agentName: { type: 'string', description: 'שם סוכן הביטוח' },
    agentPhone: { type: 'string', description: 'טלפון הסוכן' },
  },
}

const INSURANCE_PROMPT =
  'זוהי תמונה של פוליסת ביטוח רכב בישראל. חלץ את הפרטים שמופיעים במסמך והחזר JSON בלבד. ' +
  'תאריכים בפורמט YYYY-MM-DD. אם שדה לא מופיע בבירור — השמט אותו לגמרי (אל תנחש). ' +
  'עלות כמספר בלבד ללא סימנים.'

/** Send a compressed image + schema prompt to Gemini and return parsed fields.
 *  Throws on network / auth errors so callers can fall back to Tesseract. */
async function extract<T>(file: File, prompt: string, schema: object): Promise<T> {
  if (!API_KEY) throw new Error('Gemini not configured')
  const dataUrl = await compressToDataUrl(file, 'document')
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/webp', data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const json = await res.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini empty response')
  return JSON.parse(text) as T
}

/** Extract structured insurance-policy fields from a document photo. */
export async function extractInsurance(file: File): Promise<InsuranceFields> {
  const raw = await extract<InsuranceFields>(file, INSURANCE_PROMPT, INSURANCE_SCHEMA)
  // keep only sane values
  const out: InsuranceFields = {}
  if (raw.company?.trim()) out.company = raw.company.trim()
  if (raw.kind && ['חובה', 'מקיף', 'צד ג׳', 'אחר'].includes(raw.kind)) out.kind = raw.kind
  if (raw.policyNumber?.toString().trim()) out.policyNumber = raw.policyNumber.toString().trim()
  if (isIsoDate(raw.startDate)) out.startDate = raw.startDate
  if (isIsoDate(raw.endDate)) out.endDate = raw.endDate
  if (typeof raw.cost === 'number' && raw.cost > 0) out.cost = raw.cost
  if (raw.agentName?.trim()) out.agentName = raw.agentName.trim()
  if (raw.agentPhone?.toString().trim()) out.agentPhone = raw.agentPhone.toString().trim()
  return out
}

function isIsoDate(v?: string): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
