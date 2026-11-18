// "Xarid rejasi": final advice, where to buy each product, totals, explanation, loan rates and tax note.
import { BadgeCheck, Square, Volume2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AgentRunResult } from '@/api/agents'
import { ProductGlyph } from '@/components/market'
import { speak, stopSpeaking, useSpeaking } from '@/features/voice/voice'
import i18n from '@/i18n'
import { ln, uz } from '@/lib/format'
import { NARRATOR } from './agentsInfo'
import { mln, pct, som, useOfferHref, useProducts } from './parts'
import './agents.css'

const t0 = (k: string, o?: Record<string, unknown>): string => String(i18n.t(k, o ?? {}))

/** What the narrator reads: the per-product advice lines + total (+ savings). Short on purpose. */
export function narratorText(r: AgentRunResult): string {
  const t = t0
  const lines = r.final.lines.map((l) => l.text.trim().replace(/[.。]$/, '')).filter(Boolean)
  const parts = [...lines, t('agents:plan.speakTotal', { total: mln(r.final.grand_total) }).replace(/\.$/, '')]
  if (r.final.savings_vs_average != null && r.final.savings_vs_average > 0) parts.push(t('agents:plan.speakSaved', { sum: mln(r.final.savings_vs_average) }).replace(/\.$/, ''))
  parts.push(t(`agents:finance.verdict.${r.finance.verdict}`).replace(/\.$/, ''))
  return parts.join('. ').replace(/[·*⚠✓]/g, ' ') + '.'
}

export function PlanCard({ result }: { result: AgentRunResult }) {
  const { t } = useTranslation(['agents', 'common'])
  const products = useProducts(result)
  const href = useOfferHref()
  const speaking = useSpeaking()
  const reading = speaking === 'plan'
  const fin = result.final
  const f = result.finance
  const byId = (id: string) => products.get(id)

  const toggleRead = () => {
    if (reading) { stopSpeaking(); return }
    void speak(narratorText(result), NARRATOR, { key: 'plan' })
  }

  return (
    <section className="ba ba-plan" aria-labelledby="plan-title">
      <div className="ba-plan-head">
        <h2 id="plan-title">{t('plan.title')}</h2>
        <button type="button" className={`ba-btn-ghost ${reading ? 'on' : ''}`} onClick={toggleRead} aria-pressed={reading}>
          {reading ? <Square className="size-3.5" fill="currentColor" /> : <Volume2 className="size-4" />}
          {reading ? t('plan.stop') : t('plan.readAloud')}
        </button>
      </div>

      {fin.lines.length > 0 && (
        <div className="ba-final">
          <h3>💡 {t('plan.advice')}</h3>
          <ul>
            {fin.lines.map((l) => {
              const p = byId(l.product_id)
              const best = result.scout.items.find((s) => s.product_id === l.product_id)?.best
              return (
                <li key={l.product_id} className={l.advice}>
                  {p && !l.text.includes(ln(p, 'name')) && <b>{ln(p, 'name')}: </b>}{l.text}
                  {best && <small>{t('plan.where', { seller: uz(best.supplier), region: best.region_name, price: som(best.unit_price) })}</small>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="ba-table-wrap">
        <table className="ba-table ba-plan-table">
          <thead>
            <tr>
              <th>{t('plan.colProduct')}</th><th>{t('plan.colWhere')}</th>
              <th className="num">{t('plan.colPrice')}</th><th className="num">{t('plan.colVs')}</th><th className="num">{t('plan.colTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {result.scout.items.map((s) => {
              const p = byId(s.product_id)
              const a = result.analyst.items.find((x) => x.product_id === s.product_id)
              const unit = t(`common:units.${p?.unit ?? 'kg'}`, p?.unit ?? '')
              const cell = (
                <span className="ba-pcell">
                  <ProductGlyph emoji={p?.emoji} category={p?.category_slug} name={p ? ln(p, 'name') : ''} size={34} />
                  <span><b>{p ? ln(p, 'name') : ''}</b><span className="ba-sub">{s.quantity} {unit}</span></span>
                </span>
              )
              if (!s.best) return <tr key={s.product_id}><td>{cell}</td><td colSpan={4} className="ba-muted">{t('plan.noOffer')}</td></tr>
              const o = s.best
              const vs = a?.best_vs_avg_pct
              return (
                <tr key={s.product_id}>
                  <td>{cell}</td>
                  <td>
                    <Link to={href(o)} title={t('plan.open')}>{uz(o.supplier)}</Link>
                    {o.verified && <BadgeCheck className="ml-1 inline size-3.5 fill-[#12855a] align-[-2px] text-white" />}
                    <span className="ba-sub">{[o.market_name && uz(o.market_name), o.region_name].filter(Boolean).join(', ')}</span>
                  </td>
                  <td className="num">
                    {som(o.unit_price)}
                    <span className="ba-sub">{t('plan.delivery')} {o.delivery_price ? som(o.delivery_price) : t('plan.free')}</span>
                  </td>
                  <td className="num">
                    <span className={vs == null ? '' : vs < 0 ? 'ba-good' : 'ba-bad'}>{pct(vs)}</span>
                    {a?.market_avg != null && <span className="ba-sub">{t('plan.avg', { price: som(a.market_avg) })}</span>}
                  </td>
                  <td className="num"><b>{mln(o.total_cost)}</b></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="ba-totals">
        <div className="ba-total"><span>{t('plan.tiles.products')}</span><b>{mln(fin.products_total)}</b></div>
        <div className="ba-total"><span>{t('plan.tiles.delivery')}</span><b>{mln(fin.delivery_total)}</b></div>
        <div className="ba-total"><span>{t('plan.tiles.total')}</span><b>{mln(fin.grand_total)}</b></div>
        <div className="ba-total good"><span>{t('plan.tiles.savings')}</span><b>{fin.savings_vs_average == null ? '—' : mln(Math.max(0, fin.savings_vs_average))}</b></div>
      </div>

      {fin.explanation && (
        <p className="ba-explain">
          {fin.explanation}
          <span className="src">{fin.explanation_engine === 'gemini' ? t('plan.explainGemini') : t('plan.explainTemplate')}</span>
        </p>
      )}

      <details>
        <summary>{t('plan.rates', { date: f.loan?.as_of ?? '2026-10-19' })}</summary>
        {f.loan ? (
          <div className="ba-table-wrap">
            <table className="ba-table">
              <tbody>
                <tr><td>{t('plan.ratesType')}</td><td className="num">{t(`finance.loanType.${f.loan.type}`)}</td></tr>
                <tr><td>{t('plan.ratesAvg')}</td><td className="num">{f.loan.annual_rate_pct}%</td></tr>
                <tr><td>{t('plan.ratesBest')}</td><td className="num">{f.loan.best_bank} · {f.loan.best_bank_rate_pct}%</td></tr>
                <tr><td>{t('plan.ratesMonthly')}</td><td className="num"><b>{som(f.loan.monthly_interest)}</b></td></tr>
              </tbody>
            </table>
            <p className="ba-hint">{t('plan.ratesNote', { source: f.loan.source })}</p>
          </div>
        ) : <p className="ba-hint">{t('plan.ratesNone')}</p>}
      </details>
      <details>
        <summary>{t('plan.tax')}</summary>
        {f.tax_note && <p style={{ lineHeight: 1.55 }}>{f.tax_note}</p>}
        <p className="ba-hint">{t('plan.taxNote')}</p>
      </details>
    </section>
  )
}
