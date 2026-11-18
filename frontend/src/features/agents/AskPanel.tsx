// The BuyAI ask panel: headline, shopping-list box (text or voice), region picker, examples,
// stats strip, then the four agents and the purchase plan below it on the same page.
import { useQuery } from '@tanstack/react-query'
import { ArrowUp, MapPin } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import type { AgentRunResult } from '@/api/agents'
import { Api } from '@/api/endpoints'
import { useRegions } from '@/hooks/useCatalog'
import { isSoundOn } from '@/hooks/useSound'
import { MicButton } from '@/features/voice/MicButton'
import { speak } from '@/features/voice/voice'
import { currentLang, ln } from '@/lib/format'
import { AgentCards } from './AgentCards'
import { AGENTS, NARRATOR } from './agentsInfo'
import { CountUp } from './parts'
import { PlanCard, narratorText } from './PlanCard'
import { useAgentRun } from './useAgentRun'
import './agents.css'

const EXAMPLES = ['e1', 'e2', 'e3'] as const

export function AskPanel({ compact = false, showStats = true, agentsHref = '/agents' }: { compact?: boolean; showStats?: boolean; agentsHref?: string }) {
  const { t } = useTranslation(['agents', 'voice'])
  const [text, setText] = React.useState('')
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set())   // empty = all regions
  const [regionsOpen, setRegionsOpen] = React.useState(false)
  const [note, setNote] = React.useState<{ kind: 'heard' | 'hint'; text: string } | null>(null)
  const box = React.useRef<HTMLTextAreaElement>(null)
  const agentsEl = React.useRef<HTMLDivElement>(null)
  const planEl = React.useRef<HTMLDivElement>(null)
  const autoSend = React.useRef<number | undefined>(undefined)
  const regions = useRegions()
  const location = useLocation()

  const onFinished = React.useCallback((r: AgentRunResult) => {
    if (isSoundOn()) void speak(narratorText(r), NARRATOR, { key: 'plan' })
  }, [])
  const run = useAgentRun({ onFinished })
  const running = run.phase === 'running'

  // the box grows with the text (up to 120px)
  React.useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  // /#ask (from the Agentlar page CTA): bring the box into view and focus it
  React.useEffect(() => {
    if (location.hash !== '#ask') return
    const id = setTimeout(() => { box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); box.current?.focus({ preventScroll: true }) }, 250)
    return () => clearTimeout(id)
  }, [location.hash])

  // scroll to the agents when a run starts, and to the plan when it is ready
  React.useEffect(() => {
    if (running) agentsEl.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [running, run.runKey])
  React.useEffect(() => {
    if (run.phase !== 'done' || !run.result?.planner.items.length) return
    const id = setTimeout(() => planEl.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
    return () => clearTimeout(id)
  }, [run.phase, run.result])

  React.useEffect(() => () => clearTimeout(autoSend.current), [])

  function ask(sentence = text) {
    const s = sentence.trim()
    if (!s) { setNote({ kind: 'hint', text: t('hero.empty') }); box.current?.focus(); return }
    clearTimeout(autoSend.current)
    setRegionsOpen(false)
    void run.start(s, [...picked], currentLang())
  }

  // voice: show what was heard, then send it automatically
  const onHeard = (heard: string) => {
    setText(heard)
    setNote({ kind: 'heard', text: t('hero.heard', { text: heard }) })
    clearTimeout(autoSend.current)
    autoSend.current = window.setTimeout(() => { setNote(null); ask(heard) }, 900)
  }

  const list = regions.data ?? []
  const pickedNames = list.filter((r) => picked.has(r.id)).map((r) => ln(r, 'name'))
  const summary = !pickedNames.length ? t('regions.all')
    : pickedNames.length > 2 ? `${pickedNames.slice(0, 2).join(', ')} ${t('regions.more', { n: pickedNames.length - 2 })}` : pickedNames.join(', ')
  const toggleRegion = (id: string) => setPicked((old) => {
    const n = new Set(old)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n.size === list.length ? new Set() : n
  })

  return (
    <div className="ba">
      <div className={`ba-hero-panel ${compact ? 'compact' : ''}`} id="ask">
        <h1 className="ba-h1">{t('hero.title1')}<em>{t('hero.title2')}</em></h1>
        <p className="ba-hero-agents">
          {AGENTS.map((a, i) => (
            <React.Fragment key={a.id}>
              {i === 3 ? ` ${t('hero.and')} ` : i > 0 ? ', ' : ''}
              <Link to={agentsHref} className="ba-ag" style={{ color: a.color }}>{t(`agent.${a.id}.name`)}</Link>
            </React.Fragment>
          ))}{' '}{t('hero.agentsTail')}
        </p>

        <form className="ba-askbox" autoComplete="off" onSubmit={(e) => { e.preventDefault(); ask() }}>
          <textarea ref={box} rows={1} value={text} placeholder={t('hero.placeholder')} aria-label={t('hero.askLabel')}
            onChange={(e) => { setText(e.target.value); if (note) setNote(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask() } }} />
          <MicButton onText={onHeard} size={50} disabled={running} />
          <button type="submit" className="ba-send" aria-label={t('hero.send')} title={t('hero.send')} disabled={running}>
            <ArrowUp className="size-5" strokeWidth={2.6} />
          </button>
        </form>
        <p className={`ba-note ${note?.kind === 'heard' ? 'heard' : ''}`} aria-live="polite">{note?.text ?? ''}</p>

        <div className="ba-region-row">
          <button type="button" className="ba-region-pill" aria-expanded={regionsOpen} onClick={() => setRegionsOpen(!regionsOpen)}>
            <MapPin className="size-[15px] shrink-0" /><span>{t('regions.label')}</span>: <b>{summary}</b>
          </button>
          {regionsOpen && (
            <div className="ba-region-panel">
              <div className="ba-chips">
                <button type="button" className={`ba-chip all ${picked.size === 0 ? 'on' : ''}`} aria-pressed={picked.size === 0} onClick={() => setPicked(new Set())}>
                  {t('regions.selectAll')}
                </button>
                {list.map((r) => (
                  <button key={r.id} type="button" className={`ba-chip ${picked.has(r.id) ? 'on' : ''}`} aria-pressed={picked.has(r.id)} onClick={() => toggleRegion(r.id)}>
                    {ln(r, 'name')}
                  </button>
                ))}
              </div>
              <p className="ba-hint">{t('regions.hint')}</p>
              <button type="button" className="ba-btn-small" onClick={() => setRegionsOpen(false)}>{t('regions.done')}</button>
            </div>
          )}
        </div>

        <div className="ba-suggestions">
          {EXAMPLES.map((k) => (
            <button key={k} type="button" className="ba-sugg" disabled={running} onClick={() => { const s = t(`examples.${k}`); setText(s); setNote(null); ask(s) }}>
              {t(`examples.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {showStats && <Stats regions={list.length} />}

      {run.phase !== 'idle' && (
        <div ref={agentsEl} style={{ marginTop: 44, scrollMarginTop: 140 }}>
          <AgentCards cards={run.cards} phase={run.phase} result={run.result} message={run.message} />
        </div>
      )}
      {run.error && (
        <div className="ba-error" role="alert">
          <span>{t('run.error', { msg: run.error })}</span>
          <button type="button" className="ba-btn-small" style={{ marginTop: 0 }} onClick={() => ask(run.message)}>{t('run.retry')}</button>
        </div>
      )}
      {run.phase === 'done' && run.result && run.result.planner.items.length > 0 && (
        <div ref={planEl} style={{ scrollMarginTop: 140 }}><PlanCard result={run.result} /></div>
      )}
    </div>
  )
}

function Stats({ regions }: { regions: number }) {
  const { t } = useTranslation('agents')
  const overview = useQuery({ queryKey: ['overview'], queryFn: Api.overview, staleTime: 60_000 })
  const o = overview.data
  const items: [number | undefined, string][] = [
    [o?.active_offers, 'stats.offers'], [o?.products_tracked, 'stats.products'], [o?.active_suppliers, 'stats.suppliers'], [regions || undefined, 'stats.regions'],
  ]
  return (
    <div className="ba-stats">
      {items.map(([n, key]) => (
        <div className="ba-stat" key={key}><b>{n == null ? '—' : <CountUp to={n} />}</b><span>{t(key)}</span></div>
      ))}
    </div>
  )
}
