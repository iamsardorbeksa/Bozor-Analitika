// Four agents + voice API (see docs/AGENTS_CONTRACT.md). Money = UZS as JSON numbers.
import { api } from './client'

export type AgentLang = 'uz' | 'ru' | 'en'
export type Engine = 'gemini' | 'deterministic'
export type Signal = 'buy_now' | 'wait' | 'stable'
export type Verdict = 'enough' | 'borrow' | 'wait_and_save' | 'partial' | 'unknown_cash'

export interface AgentOffer {
  offer_id: string; supplier: string; business_id: string; verified: boolean; rating: number
  region_name: string; market_name: string | null; unit: string; unit_price: number; delivery_price: number
  delivery_days: number; total_cost: number; available_qty: number | null; min_order_qty: number; quality: string; updated_at: string
  source_site?: string | null; source_url?: string | null; location_note?: string | null
}

export interface PlannerItem {
  product_id: string; slug: string; name_uz: string; name_ru: string; name_en: string
  emoji: string; unit: string; category_slug: string; quantity: number
}
export interface AgentRegion { id: string; name_uz: string; name_ru: string; name_en: string }

export interface PlannerCategory { slug: string; name_uz: string; name_ru: string; name_en: string }
export interface PlannerOut {
  /** "price_list" when the request was for a whole category ("eng arzon sabzavotlar") */
  mode?: 'order' | 'price_list'
  categories?: PlannerCategory[]
  items: PlannerItem[]; cash: number | null; deadline_days: number | null
  regions: AgentRegion[]; unmatched: string[]; note: string | null
}
export interface ScoutItem {
  product_id: string; quantity: number; best: AgentOffer | null; alternatives: AgentOffer[]
  offers_considered: number; cheaper_than: number
}
export interface FlaggedOffer {
  offer_id: string; supplier: string; unit_price: number; vs_median_pct: number; kind: 'overpriced' | 'suspicious_cheap'
}
export interface AnalystItem {
  product_id: string; market_avg: number | null; best_vs_avg_pct: number | null
  change_7d_pct: number | null; change_30d_pct: number | null; spark: number[]
  forecast: { sufficient: boolean; horizon_days: number; expected_change_pct: number | null; confidence: 'insufficient' | 'low' | 'medium' | 'high' }
  signal: Signal; wait_days: number | null; expected_saving: number | null; flagged: FlaggedOffer[]
}
export interface LoanInfo {
  type: 'working_capital' | 'microloan'; annual_rate_pct: number; best_bank: string; best_bank_rate_pct: number
  monthly_interest: number; as_of: string; source: string
}
export interface FinanceOut {
  total: number; cash: number | null; shortfall: number | null; verdict: Verdict; loan: LoanInfo | null
  expected_price_change_pct: number | null; tax_note: string
}
export interface FinalOut {
  lines: { product_id: string; advice: Signal; text: string }[]
  products_total: number; delivery_total: number; grand_total: number; savings_vs_average: number | null
  explanation: string; explanation_engine: 'gemini' | 'template'
}
export interface AgentRunResult {
  engine: Engine
  planner: PlannerOut
  scout: { items: ScoutItem[] }
  analyst: { items: AnalystItem[] }
  finance: FinanceOut
  final: FinalOut
}

export interface VoiceStatus { stt: boolean; tts: boolean }
export interface AIStatusFull {
  ai_available: boolean; engine?: 'gemini' | 'claude' | 'deterministic'; mode: string; model: string | null; tools: string[]
}

export const runAgents = (message: string, region_ids: string[], language: AgentLang) =>
  api.post<AgentRunResult>('/api/agents/run', { message, region_ids, language }, { timeout: 90_000 }).then((r) => r.data)

let statusCache: { at: number; value: VoiceStatus } | null = null
let statusInflight: Promise<VoiceStatus> | null = null
/** Voice availability (cached 5 min; any error = both false -> browser fallback). */
export function voiceStatus(): Promise<VoiceStatus> {
  if (statusCache && Date.now() - statusCache.at < 5 * 60_000) return Promise.resolve(statusCache.value)
  statusInflight ??= api.get<VoiceStatus>('/api/voice/status', { timeout: 6000 })
    .then((r) => ({ stt: !!r.data?.stt, tts: !!r.data?.tts }))
    .catch(() => ({ stt: false, tts: false }))
    .then((value) => { statusCache = { at: Date.now(), value }; statusInflight = null; return value })
  return statusInflight
}

export function transcribe(blob: Blob, language: AgentLang): Promise<string> {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const fd = new FormData()
  fd.append('audio', blob, `speech.${ext}`)
  fd.append('language', language)
  return api.post<{ text: string }>('/api/voice/stt', fd, { timeout: 60_000 }).then((r) => (r.data?.text ?? '').trim())
}

export function tts(text: string, language: AgentLang, voiceId?: string, speed?: number): Promise<Blob> {
  return api.post<Blob>('/api/voice/tts', {
    text: text.slice(0, 1500), language,
    ...(voiceId ? { voice_id: voiceId } : {}),
    ...(speed ? { speed: Math.min(2, Math.max(0.5, +speed.toFixed(2))) } : {}),
  }, { responseType: 'blob', timeout: 60_000 }).then((r) => {
    if (!r.data || !(r.data.type || '').includes('audio')) throw new Error('no audio')
    return r.data
  })
}

export const aiStatusFull = () => api.get<AIStatusFull>('/api/ai/status').then((r) => r.data)
