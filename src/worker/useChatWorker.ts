import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { ChatStats, TimeRange } from '../lib/stats/compute'
import type { DateOrder, ParseErrorCode } from '../lib/types'
import type { LoadedInfo, Phase, WorkerRequest, WorkerResponse } from './protocol'

export type ChatStatus = 'idle' | 'loading' | 'ready' | 'computing' | 'done' | 'error'

export interface ChatState {
  status: ChatStatus
  phase: Phase
  fraction: number
  info: LoadedInfo | null
  stats: ChatStats | null
  range: TimeRange
  error: ParseErrorCode | null
  /** Set when the file came from the built-in demo. */
  isDemo: boolean
  /** Generate the story right after loading (used by the demo). */
  autoGenerate: boolean
}

type Action =
  | { type: 'start'; isDemo: boolean; autoGenerate: boolean }
  | { type: 'busy'; status: 'loading' | 'computing'; autoGenerate?: boolean }
  | { type: 'range'; range: TimeRange }
  | { type: 'reset' }
  | WorkerResponse

const initial: ChatState = {
  status: 'idle',
  phase: 'reading',
  fraction: 0,
  info: null,
  stats: null,
  range: 'all',
  error: null,
  isDemo: false,
  autoGenerate: false,
}

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'start':
      return {
        ...initial,
        status: 'loading',
        isDemo: action.isDemo,
        autoGenerate: action.autoGenerate,
      }
    case 'busy':
      return {
        ...state,
        status: action.status,
        fraction: 0,
        error: null,
        autoGenerate: action.autoGenerate ?? state.autoGenerate,
      }
    case 'range':
      return { ...state, range: action.range }
    case 'reset':
      return initial
    case 'progress':
      return { ...state, phase: action.phase, fraction: action.fraction }
    case 'loaded':
      return { ...state, status: 'ready', info: action.info, stats: null, fraction: 1 }
    case 'stats':
      return {
        ...state,
        status: 'done',
        stats: action.stats,
        range: action.range,
        autoGenerate: false,
      }
    case 'error':
      return { ...state, status: 'error', error: action.code }
  }
}

/** Owns the parsing worker and exposes a small state machine to the UI. */
export function useChatWorker() {
  const [state, dispatch] = useReducer(reducer, initial)
  const workerRef = useRef<Worker | null>(null)

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const w = new Worker(new URL('./chat.worker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (e: MessageEvent<WorkerResponse>) => dispatch(e.data)
      w.onerror = (e) => {
        e.preventDefault()
        dispatch({ type: 'error', code: 'unknown' })
      }
      workerRef.current = w
    }
    return workerRef.current
  }, [])

  useEffect(() => () => workerRef.current?.terminate(), [])

  const send = useCallback((req: WorkerRequest) => getWorker().postMessage(req), [getWorker])

  const load = useCallback(
    (file: Blob, name: string, opts: { isDemo?: boolean; autoGenerate?: boolean } = {}) => {
      // Start from a fresh worker so memory from a previous (huge) chat is released.
      workerRef.current?.terminate()
      workerRef.current = null
      dispatch({ type: 'start', isDemo: !!opts.isDemo, autoGenerate: !!opts.autoGenerate })
      send({ type: 'load', file, name })
    },
    [send],
  )

  const compute = useCallback(
    (range: TimeRange) => {
      dispatch({ type: 'busy', status: 'computing' })
      dispatch({ type: 'range', range })
      send({ type: 'compute', range })
    },
    [send],
  )

  const selectChat = useCallback(
    (index: number, regenerate = false) => {
      dispatch({ type: 'busy', status: 'loading', autoGenerate: regenerate })
      send({ type: 'selectChat', index })
    },
    [send],
  )

  const setDateOrder = useCallback(
    (order: DateOrder, regenerate = false) => {
      dispatch({ type: 'busy', status: 'loading', autoGenerate: regenerate })
      send({ type: 'setDateOrder', order })
    },
    [send],
  )

  const setRange = useCallback((range: TimeRange) => dispatch({ type: 'range', range }), [])

  const reset = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    dispatch({ type: 'reset' })
  }, [])

  return { state, load, compute, setRange, selectChat, setDateOrder, reset }
}
