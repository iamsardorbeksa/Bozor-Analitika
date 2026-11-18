// Calls POST /api/agents/run once, then reveals the four agents one after another (~700 ms apart)
// so people can watch them work. Every number comes from the backend; this file only paces the reveal.
import * as React from 'react'
import { runAgents, type AgentLang, type AgentRunResult } from '@/api/agents'
import { stopSpeaking } from '@/features/voice/voice'
import { errorMessage } from '@/lib/utils'

export type CardState = 'wait' | 'run' | 'done'
export type RunPhase = 'idle' | 'running' | 'done'

const STEP_MS = 700
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useAgentRun({ onFinished }: { onFinished?: (r: AgentRunResult) => void } = {}) {
  const [cards, setCards] = React.useState<CardState[]>(['wait', 'wait', 'wait', 'wait'])
  const [phase, setPhase] = React.useState<RunPhase>('idle')
  const [result, setResult] = React.useState<AgentRunResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState('')
  const [runKey, setRunKey] = React.useState(0)
  const runId = React.useRef(0)
  const finished = React.useRef(onFinished)
  finished.current = onFinished

  const start = React.useCallback(async (text: string, regionIds: string[], language: AgentLang) => {
    const my = ++runId.current
    const alive = () => my === runId.current
    const set = (i: number, s: CardState) => alive() && setCards((cs) => cs.map((c, k) => (k === i ? s : c)))
    const step = reduceMotion() ? 120 : STEP_MS
    stopSpeaking()
    setMessage(text)
    setRunKey(my)
    setResult(null)
    setError(null)
    setPhase('running')
    setCards(['run', 'wait', 'wait', 'wait'])
    const t0 = performance.now()
    try {
      const res = await runAgents(text, regionIds, language)
      const waited = performance.now() - t0
      if (waited < step + 200) await sleep(step + 200 - waited)
      if (!alive()) return
      setResult(res)
      set(0, 'done')
      if (!res.planner.items.length) { setPhase('done'); return }
      for (let i = 1; i < 4; i++) {
        await sleep(120)
        set(i, 'run')
        await sleep(step)
        if (!alive()) return
        set(i, 'done')
      }
      setPhase('done')
      finished.current?.(res)
    } catch (e) {
      if (!alive()) return
      setError(errorMessage(e, 'network error'))
      setCards(['wait', 'wait', 'wait', 'wait'])
      setPhase('done')
    }
  }, [])

  const reset = React.useCallback(() => {
    runId.current++
    stopSpeaking()
    setPhase('idle'); setResult(null); setError(null); setCards(['wait', 'wait', 'wait', 'wait'])
  }, [])

  return { cards, phase, result, error, message, runKey, start, reset }
}
