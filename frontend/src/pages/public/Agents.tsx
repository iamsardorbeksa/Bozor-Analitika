import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AGENTS } from '@/features/agents/agentsInfo'
import '@/features/agents/agents.css'

// ---- business model: every number is a PLAN or an ESTIMATE (rounded on screen) ----
const USD_SOM = 12_000
const SELLER_FEE_PCT = 1            // seller pays ~1% of an order that came through the platform
const BANK_FEE_USD = 15             // per approved loan referral
const DATA_SUB_USD = 30             // monthly price-data subscription
const PREMIUM_USD = 10              // multi-branch business, per month
const TOKENS_IN = 4000, TOKENS_OUT = 700                 // one plan = parse + explain, rounded up
const PRICE_IN = 0.75 / 1e6, PRICE_OUT = 3.75 / 1e6      // Gemini Flash, USD per token (approx., paid tier)
const AI_PER_PLAN = TOKENS_IN * PRICE_IN + TOKENS_OUT * PRICE_OUT   // ≈ $0.006
const PLANS_PER_MONTH = 30          // about one plan a day
const HOSTING_USD_MONTH = 45        // server + database, shared
const BUSINESSES = 1000
const BUYS_SOM_MONTH = 20_000_000   // a teahouse buying ~20 mln so‘m a month through the platform

function unitEconomics() {
  const ai = AI_PER_PLAN * PLANS_PER_MONTH
  const hosting = HOSTING_USD_MONTH / BUSINESSES
  const cost = ai + hosting
  const revenue = (BUYS_SOM_MONTH * SELLER_FEE_PCT) / 100 / USD_SOM
  return { ai, hosting, cost, revenue, margin: revenue - cost }
}
/** "≈ $0.006", "≈ $0.17", "≈ $17" — rounded, no false precision */
const usd = (n: number) => `≈ $${n < 0.01 ? n.toFixed(3) : n < 1 ? n.toFixed(2) : Math.round(n)}`

export default function Agents() {
  const { t } = useTranslation('agents')
  const u = unitEconomics()
  const streams: [string, Record<string, number>][] = [
    ['s1', { pct: SELLER_FEE_PCT }], ['s2', { usd: BANK_FEE_USD }], ['s3', { usd: DATA_SUB_USD }], ['s4', { usd: PREMIUM_USD }],
  ]
  return (
    <div className="ba mx-auto max-w-[1160px] px-4 pt-24 pb-16 md:px-8 md:pt-28">
      <h1 className="ba-page-title">{t('team.title')}</h1>
      <p className="ba-team-sub">{t('team.sub')}</p>

      <div className="ba-team">
        {AGENTS.map((a) => (
          <article key={a.id} className="ba-member" style={{ ['--c' as string]: a.color }}>
            <span className="ava"><img src={a.img} alt="" width={120} height={120} /><i>{a.n}</i></span>
            <span className="step">0{a.n} / 04</span>
            <h3>{t(`agent.${a.id}.name`)}</h3>
            <p className="epithet">{t(`agent.${a.id}.role`)}</p>
            <p>{t(`agent.${a.id}.job`)}</p>
          </article>
        ))}
      </div>

      <section className="ba-bm">
        <h2>{t('bm.title')}</h2>
        <p>{t('bm.sub')}</p>
        <div className="ba-streams">
          {streams.map(([k, p], i) => (
            <article key={k}>
              <span className="step">0{i + 1}</span>
              <h3>{t(`bm.${k}h`)}</h3>
              <p>{t(`bm.${k}p`, p)}</p>
            </article>
          ))}
        </div>

        <h3 className="ba-bm-h">{t('bm.costTitle')} <span className="ba-est">{t('bm.estimate')}</span></h3>
        <div className="ba-bm-table ba-table-wrap">
          <table className="ba-table">
            <tbody>
              <tr><td>{t('bm.cPlan')}</td><td className="num">{usd(AI_PER_PLAN)}</td></tr>
              <tr><td>{t('bm.cAi', { n: PLANS_PER_MONTH })}</td><td className="num">{usd(u.ai)}</td></tr>
              <tr><td>{t('bm.cHost', { n: BUSINESSES.toLocaleString('en').replace(',', ' ') })}</td><td className="num">{usd(u.hosting)}</td></tr>
              <tr><td><b>{t('bm.cTotal')}</b></td><td className="num"><b>{usd(u.cost)}</b></td></tr>
              <tr><td>{t('bm.cRev', { mln: BUYS_SOM_MONTH / 1e6, pct: SELLER_FEE_PCT })}</td><td className="num good">{usd(u.revenue)}</td></tr>
              <tr><td><b>{t('bm.cMargin')}</b></td><td className="num good"><b>{usd(u.margin)}</b></td></tr>
            </tbody>
          </table>
        </div>
        <p className="ba-hint">{t('bm.free')} {t('bm.note')}</p>
      </section>

      <div className="ba-cta">
        <div>
          <h2>{t('team.ctaTitle')}</h2>
          <p>{t('team.ctaBody')}</p>
        </div>
        <Link to="/#ask">{t('team.ctaButton')} <ArrowRight className="size-4" /></Link>
      </div>
    </div>
  )
}
