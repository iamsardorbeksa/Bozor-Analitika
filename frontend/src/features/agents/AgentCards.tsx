// The four agent cards (2×2) that fill in one after another with each agent's real output.
import { BadgeCheck, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AgentRunResult, AnalystItem, PlannerItem, ScoutItem } from '@/api/agents'
import i18n from '@/i18n'
import { SourceBadge } from '@/components/market'
import { ln, uz } from '@/lib/format'
import { AgentCard } from './AgentCard'
import { AGENTS } from './agentsInfo'
import { CountUp, Emoji, PriceRange, Spark, absPct, mln, pct, som, useOfferHref, useProducts } from './parts'
import type { CardState, RunPhase } from './useAgentRun'
import './agents.css'

type Products = Map<string, PlannerItem>

export function AgentCards({ cards, phase, result, message }: {
  cards: CardState[]; phase: RunPhase; result: AgentRunResult | null; message: string
}) {
  const { t } = useTranslation(['agents', 'common'])
  const products = useProducts(result)
  const qty = (it: { quantity: number; unit?: string }, unit: string) => `${fmtQty(it.quantity)} ${t(`common:units.${unit}`, unit)}`
  const name = (id: string) => { const p = products.get(id); return p ? ln(p, 'name') : '' }
  const speech = result ? spokenLines(result, name, qty) : null

  return (
    <div className="ba">
      <h2 className="ba-section-title">
        {phase === 'running' && <span className="ba-spinner" aria-hidden />}
        {t(phase === 'running' ? 'run.title' : 'run.titleDone')}
      </h2>
      <div className="ba-pipeline">
        {AGENTS.map((a, i) => (
          <AgentCard key={a.id} agent={a} state={cards[i]} speakText={speech?.[i]}>
            {i === 0 && <PlannerBody state={cards[0]} result={result} message={message} qty={qty} />}
            {i === 1 && cards[1] === 'run' && <p className="ba-shimmer">{t('scout.loading')}</p>}
            {i === 1 && cards[1] === 'done' && result && <ScoutBody result={result} products={products} />}
            {i === 2 && cards[2] === 'done' && result && <AnalystBody result={result} products={products} />}
            {i === 3 && cards[3] === 'done' && result && <FinanceBody result={result} />}
          </AgentCard>
        ))}
      </div>
    </div>
  )
}

const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(1)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// ---------------------------------------------------------------- 1. Mirzo
function PlannerBody({ state, result, message, qty }: {
  state: CardState; result: AgentRunResult | null; message: string; qty: (it: { quantity: number }, unit: string) => string
}) {
  const { t } = useTranslation('agents')
  if (state === 'wait') return null
  if (state === 'run' || !result) {
    return (
      <>
        <div className="ba-sentence">{message}</div>
        <p className="ba-shimmer">{t('planner.reading')}</p>
      </>
    )
  }
  const p = result.planner
  const regions = p.regions.length ? p.regions.map((r) => ln(r, 'name')).join(', ') : t('planner.allRegions')
  return (
    <>
      <div className="ba-sentence">{message}</div>
      {(p.categories?.length ?? 0) > 0 && (
        <div className="ba-tags">
          {p.categories!.map((c) => (
            <span key={c.slug} className="ba-tag" style={{ background: 'var(--color-ink)', color: '#fff', borderColor: 'var(--color-ink)' }}>
              {t('planner.category')}: {ln(c, 'name')}
            </span>
          ))}
        </div>
      )}
      {p.items.length > 0 && p.note && <p className="ba-small ba-muted">{p.note}</p>}
      {p.items.length > 0 ? (
        <div className="ba-tags">
          {p.items.map((it) => (
            <span key={it.product_id} className="ba-tag"><Emoji e={it.emoji} /> {ln(it, 'name')} · {qty(it, it.unit)}</span>
          ))}
          <span className={`ba-tag ${p.cash == null ? 'grey' : ''}`}>{t('planner.cash')}: {p.cash == null ? t('planner.notSaid') : mln(p.cash)}</span>
          <span className={`ba-tag ${p.deadline_days == null ? 'grey' : ''}`}>
            {t('planner.deadline')}: {p.deadline_days == null ? t('planner.notSaid') : t('planner.days', { n: p.deadline_days })}
          </span>
        </div>
      ) : (
        <p className="ba-tag amber" style={{ borderRadius: 10, padding: '8px 10px', lineHeight: 1.5 }}>{p.note || t('planner.nothing')}</p>
      )}
      <p className="ba-small ba-muted">{t('planner.regions', { list: regions })}</p>
      {p.unmatched.length > 0 && <p className="ba-small ba-muted">{t('planner.unmatched', { list: p.unmatched.join(', ') })}</p>}
      <p className="ba-small ba-muted">{result.engine === 'gemini' ? t('run.engineGemini') : t('run.engineDeterministic')}</p>
    </>
  )
}

// ---------------------------------------------------------------- 2. Dallol
function ScoutBody({ result, products }: { result: AgentRunResult; products: Products }) {
  const { t } = useTranslation(['agents', 'common'])
  const checked = result.scout.items.reduce((s, x) => s + x.offers_considered, 0)
  return (
    <>
      <p><span className="ba-counter"><CountUp to={checked} /></span> <span className="ba-muted">/ {t('scout.checked', { n: checked })}</span></p>
      {result.scout.items.map((s) => {
        const p = products.get(s.product_id)
        const avg = result.analyst.items.find((a) => a.product_id === s.product_id)?.market_avg ?? null
        return (
          <div key={s.product_id} style={{ display: 'grid', gap: 6 }}>
            <div className="ba-label"><Emoji e={p?.emoji} /> {p ? ln(p, 'name') : ''}</div>
            {s.best ? <BestOffer s={s} avg={avg} unit={p?.unit ?? s.best.unit} /> : <p className="ba-muted">{t('scout.none')}</p>}
          </div>
        )
      })}
    </>
  )
}

function BestOffer({ s, avg, unit }: { s: ScoutItem; avg: number | null; unit: string }) {
  const { t } = useTranslation(['agents', 'common'])
  const [open, setOpen] = React.useState(false)
  const href = useOfferHref()
  const o = s.best!
  const all = [o, ...s.alternatives]
  return (
    <>
      <div className="ba-best">
        <div className="ba-best-top">
          <b className="ba-best-price">{som(o.unit_price)}</b>
          <small className="ba-muted">/ {t(`common:units.${unit}`, unit)}</small>
          <span className="ba-best-total">{t('scout.total')} {mln(o.total_cost)}</span>
        </div>
        <div className="ba-best-seller">
          <Link to={href(o)}>{uz(o.supplier)}</Link>
          {o.verified && <BadgeCheck className="size-3.5 fill-[#12855a] text-white" aria-label="verified" />}
          <span>· {o.location_note && o.source_site === 'olx.uz' ? o.location_note : o.region_name}</span>
          {o.source_site && <SourceBadge site={o.source_site} url={o.source_url} link className="ml-1" />}
          {o.delivery_days > 0 && <span className="inline-flex items-center gap-1">· <Truck className="size-3" /> {t('scout.days', { n: o.delivery_days })}</span>}
        </div>
        {s.alternatives.length > 0 && <PriceRange prices={s.alternatives.map((a) => a.unit_price)} best={o.unit_price} avg={avg} avgLabel={t('scout.avg')} />}
      </div>
      {s.cheaper_than > 0 && (
        <button type="button" className="ba-link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('scout.hide') : t('scout.cheaperThan', { n: s.cheaper_than })} {open ? <ChevronUp className="inline size-3.5" /> : <ChevronDown className="inline size-3.5" />}
        </button>
      )}
      {open && (
        <div className="ba-proof">
          <table>
            <thead><tr><th>#</th><th>{t('scout.colSeller')}</th><th className="num">{t('scout.colPrice')}</th><th className="num">{t('scout.colDelivery')}</th><th className="num">{t('scout.colTotal')}</th></tr></thead>
            <tbody>
              {all.map((a, i) => (
                <tr key={a.offer_id} className={i === 0 ? 'chosen' : ''}>
                  <td>{i + 1}</td>
                  <td><Link to={href(a)}>{uz(a.supplier)}</Link> <small className="ba-muted">{a.source_site ?? a.region_name}</small></td>
                  <td className="num">{som(a.unit_price)}</td>
                  <td className="num">{a.delivery_price ? som(a.delivery_price) : t('scout.free')}</td>
                  <td className="num"><b>{mln(a.total_cost)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- 3. Tarozibon ota
function AnalystBody({ result, products }: { result: AgentRunResult; products: Products }) {
  return <>{result.analyst.items.map((a) => <AnalystRow key={a.product_id} a={a} p={products.get(a.product_id)} />)}</>
}

function AnalystRow({ a, p }: { a: AnalystItem; p?: PlannerItem }) {
  const { t } = useTranslation('agents')
  const [open, setOpen] = React.useState(false)
  const vs = a.best_vs_avg_pct
  const f = a.forecast
  return (
    <div className="ba-verdict">
      <div className="ba-vhead">
        <Emoji e={p?.emoji} size={18} /><b>{p ? ln(p, 'name') : ''}</b>
        <span className={`ba-signal ${a.signal}`}>{t(`analyst.signal.${a.signal}`)}</span>
      </div>
      <div className="ba-vbody">
        <div className={`ba-vs ${vs == null ? '' : vs < 0 ? 'down' : 'up'}`}>
          {vs == null ? <small>{t('analyst.noAvg')}</small> : <><b>{pct(vs)}</b><small>{t('analyst.vsAvg')}</small></>}
        </div>
        <Spark data={a.spark} forecastPct={f.sufficient ? f.expected_change_pct : null} horizon={f.horizon_days} />
      </div>
      {(a.change_7d_pct != null || a.change_30d_pct != null) && (
        <small className="ba-muted">{t('analyst.change', { d7: pct(a.change_7d_pct), d30: pct(a.change_30d_pct) })}</small>
      )}
      <small className="ba-muted">
        {f.sufficient && f.expected_change_pct != null ? t('analyst.forecast', { days: f.horizon_days, pct: pct(f.expected_change_pct) }) : t('analyst.noForecast')}
      </small>
      {a.signal === 'wait' && a.wait_days != null && a.expected_saving != null && a.expected_saving > 0 && (
        <small className="ba-bad">{t('analyst.waitSave', { days: a.wait_days, sum: som(a.expected_saving) })}</small>
      )}
      {a.flagged.length > 0 ? (
        <>
          <button type="button" className="ba-flag-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
            ⚠ {t('analyst.flagged', { n: a.flagged.length })} {open ? '▴' : '▾'}
          </button>
          {open && a.flagged.map((fl) => (
            <div key={fl.offer_id} className={`ba-flag ${fl.kind === 'overpriced' ? 'over' : 'cheap'}`}>
              {t(fl.kind === 'overpriced' ? 'analyst.overpriced' : 'analyst.cheap', { supplier: uz(fl.supplier), pct: absPct(fl.vs_median_pct) })}
            </div>
          ))}
        </>
      ) : <small className="ba-muted">{t('analyst.noFlags')}</small>}
    </div>
  )
}

// ---------------------------------------------------------------- 4. Xazinachi opa
function FinanceBody({ result }: { result: AgentRunResult }) {
  const { t } = useTranslation('agents')
  const f = result.finance
  const [w, setW] = React.useState(0)
  const target = f.cash != null && f.total > 0 ? Math.min(100, (100 * f.cash) / f.total) : 0
  React.useEffect(() => { const id = setTimeout(() => setW(target), 60); return () => clearTimeout(id) }, [target])
  const short = (f.shortfall ?? 0) > 0
  return (
    <>
      <div className="ba-money">
        <span>{t('finance.need')}</span><b><CountUp to={f.total} format={mln} /></b>
        <span>{t('finance.have')}</span><b>{f.cash != null ? <CountUp to={f.cash} format={mln} /> : '—'}</b>
      </div>
      {f.cash != null && <div className={`ba-gauge ${short ? 'short' : ''}`}><i style={{ width: `${w}%` }} /></div>}
      {f.cash == null ? <p className="ba-muted">{t('finance.nocash')}</p>
        : short ? <p className="ba-bad">{t('finance.short', { sum: mln(f.shortfall) })}</p>
        : <p className="ba-good">{t('finance.enough', { sum: mln(f.cash - f.total) })}</p>}
      {f.loan && (
        <div className="ba-loan">
          {t('finance.loan', { type: t(`finance.loanType.${f.loan.type}`), rate: f.loan.annual_rate_pct, bank: f.loan.best_bank, best: f.loan.best_bank_rate_pct })}
          <br /><b>{t('finance.interest', { sum: som(f.loan.monthly_interest) })}</b>
        </div>
      )}
      {f.expected_price_change_pct != null && Math.abs(f.expected_price_change_pct) >= 0.1 && (
        <small className="ba-muted">{t('finance.priceChange', { pct: pct(f.expected_price_change_pct) })}</small>
      )}
      {f.verdict !== 'unknown_cash' && <p style={{ fontWeight: 600, lineHeight: 1.45 }}>{t(`finance.verdict.${f.verdict}`)}</p>}
    </>
  )
}

// ---------------------------------------------------------------- what each agent says out loud (short)
function spokenLines(
  r: AgentRunResult,
  name: (id: string) => string,
  qty: (it: { quantity: number }, unit: string) => string,
): string[] {
  const t = (k: string, o?: Record<string, unknown>): string => String(i18n.t(k, o ?? {}))
  const p = r.planner
  const planner = p.items.length
    ? t('agents:speak.planner', {
      items: p.items.map((it) => `${ln(it, 'name')} ${qty(it, it.unit)}`).join(', '),
      cash: p.cash == null ? t('agents:planner.notSaid') : mln(p.cash),
      deadline: p.deadline_days == null ? t('agents:planner.notSaid') : t('agents:planner.days', { n: p.deadline_days }),
    })
    : p.note || t('agents:planner.nothing')
  const scout = r.scout.items.map((s) => s.best
    ? t('agents:speak.scoutLine', { product: name(s.product_id), seller: uz(s.best.supplier), region: s.best.region_name, price: som(s.best.unit_price) })
    : `${name(s.product_id)}: ${t('agents:scout.none')}`).join('. ')
  const analyst = r.analyst.items.map((a) => t('agents:speak.analystLine', { product: name(a.product_id), signal: t(`agents:analyst.signal.${a.signal}`) })).join('. ')
  const f = r.finance
  const finance = t('agents:speak.finance', { need: mln(f.total), verdict: t(`agents:finance.verdict.${f.verdict}`) })
  return [planner, scout, analyst, finance].map((s) => s.replace(/[·*⚠✓]/g, ' ').slice(0, 600))
}
