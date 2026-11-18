import * as React from 'react'
import { startListening, stopSpeaking, type ListenSession, type MicState } from './voice'

/** Mic session state for one input. toggle() starts or stops (stopping transcribes what was said). */
export function useVoiceInput({ onText, onState }: { onText: (text: string) => void; onState?: (s: MicState) => void }) {
  const [state, setState] = React.useState<MicState>('idle')
  const [partial, setPartial] = React.useState('')
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null)
  const session = React.useRef<ListenSession | null>(null)
  const starting = React.useRef(false)
  const textRef = React.useRef(onText)
  const stateRef = React.useRef(onState)
  textRef.current = onText
  stateRef.current = onState

  const update = React.useCallback((s: MicState) => {
    setState(s)
    stateRef.current?.(s)
    if (s !== 'listening') { session.current = null; setAnalyser(null) }
    if (s === 'idle' || s === 'listening') setPartial((p) => (s === 'listening' ? '' : p))
  }, [])

  const start = React.useCallback(async () => {
    if (session.current || starting.current) return
    starting.current = true
    stopSpeaking()
    setPartial('')
    try {
      const s = await startListening({
        onText: (t) => textRef.current(t),
        onState: update,
        onPartial: setPartial,
      })
      session.current = s
      setAnalyser(s?.analyser ?? null)
    } finally {
      starting.current = false
    }
  }, [update])

  const stop = React.useCallback(() => { session.current?.stop() }, [])
  const cancel = React.useCallback(() => { session.current?.cancel(); session.current = null }, [])
  const toggle = React.useCallback(() => {
    if (state === 'working') return
    if (session.current) stop()
    else void start()
  }, [start, stop, state])

  React.useEffect(() => () => { session.current?.cancel() }, [])

  return { state, partial, analyser, start, stop, cancel, toggle }
}
