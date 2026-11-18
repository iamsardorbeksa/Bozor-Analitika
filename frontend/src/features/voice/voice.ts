// Voice in and out, in the current UI language.
// Speech -> text: 1) VoiceLab through our backend (/api/voice/stt) when /api/voice/status says stt,
//                 2) else the browser's SpeechRecognition (uz-UZ / ru-RU / en-US).
// Text -> speech: 1) VoiceLab (/api/voice/tts) with a per-agent voice, 2) else speechSynthesis
//                 (for Uzbek a Turkish / Kazakh / Azerbaijani voice reads Latin Uzbek far better than English).
import * as React from 'react'
import { transcribe, tts, voiceStatus, type AgentLang } from '@/api/agents'
import type { VoiceCharacter } from '@/features/agents/agentsInfo'
import { currentLang } from '@/lib/format'

export type MicState = 'idle' | 'listening' | 'working' | 'denied' | 'unsupported' | 'error'

export interface ListenSession {
  /** Stop recording and transcribe what was said. */
  stop(): void
  /** Abort without transcribing. */
  cancel(): void
  /** Live microphone analyser for level meters (null when unavailable). */
  analyser: AnalyserNode | null
}

export interface ListenOptions {
  language?: AgentLang
  onText: (text: string) => void
  onState: (state: MicState) => void
  /** interim words (browser recognition only) */
  onPartial?: (text: string) => void
}

const SPEECH_LANG: Record<AgentLang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
const MAX_MS = 20_000

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any
const getSR = (): (new () => SR) | null =>
  typeof window === 'undefined' ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
/* eslint-enable @typescript-eslint/no-explicit-any */

export function voiceInputSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!getSR() || (!!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined')
}

function micError(e: unknown): MicState {
  const name = (e as { name?: string })?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
  return 'error'
}

/** Level meter: AudioContext + AnalyserNode on the mic stream. */
function meter(stream: MediaStream): { analyser: AnalyserNode | null; close: () => void } {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.6
    src.connect(analyser)
    return { analyser, close: () => { void ctx.close().catch(() => {}) } }
  } catch {
    return { analyser: null, close: () => {} }
  }
}

/** Root-mean-square level 0..1 of the current analyser frame. */
export function rmsLevel(analyser: AnalyserNode, buf?: Uint8Array<ArrayBuffer>): number {
  const data = buf ?? new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
  return Math.sqrt(sum / data.length)
}

export async function startListening(opts: ListenOptions): Promise<ListenSession | null> {
  const language = opts.language ?? currentLang()
  const hasRecorder = !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'
  const SRClass = getSR()
  if (!hasRecorder && !SRClass) { opts.onState('unsupported'); return null }
  const status = hasRecorder ? await voiceStatus() : { stt: false, tts: false }
  if (status.stt && hasRecorder) return recordAndTranscribe(opts, language)
  if (SRClass) return browserRecognition(opts, language, SRClass)
  // recorder exists but no server STT and no browser recognition
  opts.onState('unsupported')
  return null
}

async function recordAndTranscribe(opts: ListenOptions, language: AgentLang): Promise<ListenSession | null> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch (e) {
    opts.onState(micError(e))
    return null
  }
  const m = meter(stream)
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  let cancelled = false
  let raf = 0
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const release = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((tr) => tr.stop()); m.close() }
  rec.onstop = async () => {
    release()
    clearTimeout(timer)
    if (cancelled) { opts.onState('idle'); return }
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
    if (blob.size < 1200) { opts.onState('idle'); return }   // nothing recorded
    opts.onState('working')
    try {
      const text = await transcribe(blob, language)
      if (!text) { opts.onState('error'); return }
      opts.onText(text)
      opts.onState('idle')
    } catch {
      opts.onState('error')
    }
  }
  rec.start(250)
  opts.onState('listening')
  const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop() }, MAX_MS)

  // Simple voice-activity detection: after speech was heard, ~1.6 s of silence ends the recording.
  if (m.analyser) {
    const buf = new Uint8Array(m.analyser.fftSize)
    let spoke = false, quietSince = 0
    const tick = () => {
      if (rec.state !== 'recording') return
      const lvl = rmsLevel(m.analyser!, buf)
      const now = performance.now()
      if (lvl > 0.045) { spoke = true; quietSince = 0 }
      else if (spoke) {
        if (!quietSince) quietSince = now
        else if (now - quietSince > 1600) { rec.stop(); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  return {
    analyser: m.analyser,
    stop() { if (rec.state === 'recording') rec.stop() },
    cancel() { cancelled = true; if (rec.state === 'recording') rec.stop(); else release() },
  }
}

async function browserRecognition(opts: ListenOptions, language: AgentLang, SRClass: new () => SR): Promise<ListenSession | null> {
  // Open the mic ourselves too: gives a clear permission answer and a live level meter.
  let stream: MediaStream | null = null
  if (navigator.mediaDevices?.getUserMedia) {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch (e) { if (micError(e) === 'denied') { opts.onState('denied'); return null } }
  }
  const m = stream ? meter(stream) : { analyser: null, close: () => {} }
  const release = () => { stream?.getTracks().forEach((tr) => tr.stop()); m.close() }

  let r: SR
  try { r = new SRClass() } catch { release(); opts.onState('unsupported'); return null }
  r.lang = SPEECH_LANG[language]
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  let finalText = ''
  let failed: MicState | null = null
  let cancelled = false
  r.onresult = (e: SR) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) finalText += res[0].transcript
      else interim += res[0].transcript
    }
    opts.onPartial?.((finalText + ' ' + interim).trim())
  }
  r.onerror = (e: SR) => {
    const err = e?.error as string
    if (err === 'not-allowed' || err === 'service-not-allowed') failed = 'denied'
    else if (err === 'no-speech' || err === 'aborted') failed = null
    else if (err === 'language-not-supported') failed = 'unsupported'
    else failed = 'error'
  }
  r.onend = () => {
    clearTimeout(timer)
    release()
    if (cancelled) { opts.onState('idle'); return }
    if (failed) { opts.onState(failed); return }
    const text = finalText.trim()
    if (text) opts.onText(text)
    opts.onState('idle')
  }
  try { r.start() } catch { release(); opts.onState('error'); return null }
  opts.onState('listening')
  const timer = setTimeout(() => { try { r.stop() } catch { /* already stopped */ } }, MAX_MS)
  return {
    analyser: m.analyser,
    stop() { try { r.stop() } catch { /* ignore */ } },
    cancel() { cancelled = true; try { r.abort() } catch { /* ignore */ } },
  }
}

// ------------------------------------------------------------------ text -> speech
let audio: HTMLAudioElement | null = null
let generation = 0
const audioCache = new Map<string, Blob>()

// tiny store: which "speak key" is playing right now (for 🔊 / ■ toggles)
let speakingKey: string | null = null
const listeners = new Set<() => void>()
function setSpeaking(k: string | null) { speakingKey = k; listeners.forEach((l) => l()) }
export function useSpeaking(): string | null {
  return React.useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => speakingKey, () => null)
}

export function stopSpeaking() {
  generation++
  if (audio) { audio.pause(); audio = null }
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
  setSpeaking(null)
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = window.speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 600)
  })
}

const FEMALE = /female|milena|samantha|karen|victoria|alena|katya|zira|svetlana|irina|seda|filiz|aigul/i

/**
 * Read text aloud. character = an agent's voice ({uz,en,pitch,rate,female}).
 * Resolves when playback ends (or fails). `key` identifies the speaker for useSpeaking().
 */
export async function speak(text: string, character: VoiceCharacter | null = null, opts: { language?: AgentLang; key?: string } = {}): Promise<void> {
  stopSpeaking()
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return
  const my = generation
  const lang = opts.language ?? currentLang()
  const key = opts.key ?? 'default'
  setSpeaking(key)
  const finish = () => { if (my === generation) setSpeaking(null) }
  const pitch = character?.pitch ?? 1, rate = character?.rate ?? 1
  const voiceId = character?.[lang]

  const status = await voiceStatus()
  if (my !== generation) return
  if (status.tts && (!character || voiceId)) {
    try {
      const cacheKey = `${voiceId ?? 'default'}|${lang}|${clean}`
      let blob = audioCache.get(cacheKey)
      if (!blob) {
        blob = await tts(clean, lang, voiceId, rate / pitch)
        audioCache.set(cacheKey, blob)
      }
      if (my !== generation) return
      const url = URL.createObjectURL(blob)
      const a = new Audio(url)
      ;(a as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = false   // playbackRate also shifts pitch
      a.playbackRate = pitch
      audio = a
      await new Promise<void>((resolve) => {
        a.onended = () => resolve()
        a.onerror = () => resolve()
        a.onpause = () => resolve()
        a.play().catch(() => resolve())
      })
      URL.revokeObjectURL(url)
      finish()
      return
    } catch { /* fall back to the browser voice */ }
  }
  if (my !== generation) return
  if (!('speechSynthesis' in window)) { finish(); return }
  const all = await loadVoices()
  if (my !== generation) return
  const prefs = lang === 'uz' ? ['uz', 'tr', 'kk', 'az'] : [lang]
  const voices = prefs.map((l) => all.filter((v) => v.lang?.toLowerCase().startsWith(l))).find((list) => list.length) ?? []
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = voices[0]?.lang ?? { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[lang]
  const voice = (character?.female && voices.find((v) => FEMALE.test(v.name))) || voices[0]
  if (voice) u.voice = voice
  u.pitch = Math.min(2, pitch * (character?.female && !(voice && FEMALE.test(voice.name)) ? 1.1 : 1))
  u.rate = rate
  await new Promise<void>((resolve) => {
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
  finish()
}

/** Markdown / emoji noise out, so a reply reads naturally. */
export function stripForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/[*_~>#|]/g, '')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim()
    .slice(0, 1400)
}
