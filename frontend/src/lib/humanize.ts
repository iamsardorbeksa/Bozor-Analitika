/* Turn internal identifiers (analysis-tool names, model/method codes, signal codes) into plain, translated text. */
import type { TFunction } from 'i18next'

export const TOOL_NAMES = [
  'search_products', 'compare_offers', 'get_price_history', 'get_price_forecast', 'get_regional_comparison',
  'get_market_statistics', 'analyze_supply_demand', 'calculate_purchase_cost', 'recommend_suppliers',
] as const

/** "compare_offers" -> "Compared offers" (translated). Unknown names get a generic label, never the raw name. */
export function toolLabel(t: TFunction, name: string): string {
  return (TOOL_NAMES as readonly string[]).includes(name) ? t(`ai:tools.${name}`) : t('ai:tools.other')
}

/** Forecast method code ("holt_damped+linear_regression") -> human description. */
export function methodLabel(t: TFunction, method: string | null | undefined): string {
  if (!method) return '—'
  const m = method.toLowerCase()
  const key = m.includes('holt') && m.includes('linear') ? 'blend' : m.includes('holt') ? 'holt' : m.includes('linear') ? 'linear' : 'other'
  return t(`analytics:forecast.methods.${key}`)
}

const TOOLS_RE = new RegExp('`?\\b(' + TOOL_NAMES.join('|') + ')\\b(?:\\(\\))?`?', 'g')

/**
 * Clean an analyst answer before it is shown: replace tool names, method and signal codes with
 * translated labels and drop sample-data disclaimers. Purely presentational; numbers are untouched.
 */
export function humanizeAnswer(text: string, t: TFunction): string {
  if (!text) return text
  let s = text

  // sample-data disclaimer lines (e.g. "_Note: figures are based on demo data…_")
  s = s.split('\n').filter((line) => !/(demo|демо|demonstrat|демонстрац|namoyish)/i.test(line) || line.trim().length > 260).join('\n')
  s = s.replace(/\s*\([^()\n]*(demo|демо)[^()\n]*\)/gi, '')

  // the cost formula written as code
  s = s.replace(/`?total_cost\s*=\s*\(?quantity\s*[*×]\s*unit_price\)?\s*\+\s*delivery_cost`?/gi, t('ai:ev.formula'))

  // tool names, with or without backticks / call parentheses
  s = s.replace(TOOLS_RE, (_m, name: string) => toolLabel(t, name))

  // forecast method codes
  s = s.replace(/`?\b(holt_damped(?:\+linear_regression)?|linear_regression)\b`?/g, (_m, code: string) => methodLabel(t, code))

  // confidence levels written as English codes inside other languages: "ishonchlilik: **low**"
  s = s.replace(/(confidence|ishonchlilik|уверенность)(\s*:\s*)(\**)(insufficient|low|medium|high)\b(\**)/gi,
    (_m, w: string, sep: string, a: string, lvl: string, b: string) => `${w}${sep}${a}${t(`analytics:forecast.level.${lvl.toLowerCase()}`)}${b}`)

  // supply/demand signal codes ("signal: undersupplied", "demand_gap")
  s = s.replace(/(signal|сигнал)(\s*:\s*)(\**)`?(demand_gap|undersupplied|oversupplied|balanced)`?\b(\**)/gi,
    (_m, w: string, sep: string, a: string, code: string, b: string) => `${w}${sep}${a}${t(`analytics:sd.signal.${code.toLowerCase()}`)}${b}`)
  s = s.replace(/`?\bdemand_gap\b`?/g, () => t('analytics:sd.signal.demand_gap'))

  // any other `snake_case` identifier in code spans -> plain words
  s = s.replace(/`([a-z]+(?:_[a-z]+)+)(?:\(\))?`/g, (_m, id: string) => id.replace(/_/g, ' '))
  return s.replace(/\n{3,}/g, '\n\n').trim()
}
