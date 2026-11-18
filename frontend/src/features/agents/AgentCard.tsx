import { Square, Volume2 } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { speak, stopSpeaking, useSpeaking } from '@/features/voice/voice'
import type { AgentInfo } from './agentsInfo'
import type { CardState } from './useAgentRun'

const STATUS: Record<CardState, string> = { wait: 'status.wait', run: 'status.run', done: 'status.done' }

/** One agent: coloured top border, avatar with coloured ring + number badge, "01 / 04", name, role, job, status pill, 🔊. */
export function AgentCard({ agent, state, speakText, children }: {
  agent: AgentInfo
  state: CardState
  speakText?: string
  children?: React.ReactNode
}) {
  const { t } = useTranslation('agents')
  const speaking = useSpeaking()
  const key = `agent-${agent.id}`
  const on = speaking === key
  const name = t(`agent.${agent.id}.name`)
  const toggle = () => {
    if (on) { stopSpeaking(); return }
    if (speakText) void speak(speakText, agent.voice, { key })
  }
  return (
    <article className="ba-agent" data-state={state} style={{ ['--c' as string]: agent.color }} aria-busy={state === 'run'}>
      <header>
        <span className="ba-avatar">
          <img src={agent.img} alt="" width={56} height={56} />
          <i className="ba-badge-num">{agent.n}</i>
        </span>
        <div className="who">
          <span className="idx">0{agent.n} / 04</span>
          <h3>{name}</h3>
          <p className="role">{t(`agent.${agent.id}.role`)}</p>
          <p className="job">{t(`agent.${agent.id}.job`)}</p>
        </div>
        <div className="ba-head-right">
          <span className="ba-state" data-s={state}>{t(STATUS[state])}</span>
          {state === 'done' && speakText && (
            <button type="button" className={`ba-voice ${on ? 'on' : ''}`} onClick={toggle}
              title={on ? t('plan.stop') : t('plan.readAloud')} aria-label={`${name}: ${on ? t('plan.stop') : t('plan.readAloud')}`}>
              {on ? <Square className="size-3" fill="currentColor" /> : <Volume2 className="size-4" />}
            </button>
          )}
        </div>
      </header>
      {children && <div className="ba-feed">{children}</div>}
    </article>
  )
}
