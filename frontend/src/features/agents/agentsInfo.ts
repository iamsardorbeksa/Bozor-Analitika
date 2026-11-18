// The four agents as characters (names, roles, jobs are in i18n: agents:agent.<id>.*).
// voice: VoiceLab voice ids per language (Uzbek = native speakers). pitch >1 younger, <1 older —
// done in the browser by playing the audio faster/slower without keeping pitch, so it costs nothing.

export type AgentId = 'planner' | 'scout' | 'analyst' | 'finance'

export interface VoiceCharacter {
  uz?: string; en?: string; ru?: string
  pitch: number; rate: number; female?: boolean
}

export interface AgentInfo {
  n: 1 | 2 | 3 | 4
  id: AgentId
  color: string
  img: string
  voice: VoiceCharacter
}

export const AGENTS: AgentInfo[] = [
  { n: 1, id: 'planner', color: '#2f56b0', img: '/img/agents/mirzo.svg',
    voice: { uz: 'voice_be56058a-8f15-48bb-904b-4fe92531d5b1', en: 'voice_ba626fc6-18c5-408f-8376-d49b95047bd7', pitch: 1.18, rate: 1.08 } },
  { n: 2, id: 'scout', color: '#d07a0c', img: '/img/agents/dallol.svg',
    voice: { uz: 'voice_5e592ada-eca8-42e3-98fa-469c1c8fc999', en: 'voice_oUhQK9VMv-QO8w17IELbSGKF', pitch: 1.0, rate: 1.12 } },
  { n: 3, id: 'analyst', color: '#7b4ea3', img: '/img/agents/tarozibon.svg',
    voice: { uz: 'voice_ba303813-3023-48aa-a454-4b5705669d35', en: 'voice_4lA0S3282v3UoEBmpxOApz6w', pitch: 0.88, rate: 0.88 } },
  { n: 4, id: 'finance', color: '#12855a', img: '/img/agents/xazinachi.svg',
    voice: { uz: 'voice_2785aabd-21b5-4cc7-9845-2230186ef7d9', en: 'voice_Xqxok0jKVM__CT74ptlRc_w0', pitch: 1.0, rate: 1.0, female: true } },
]

/** The voice that reads the final plan. */
export const NARRATOR: VoiceCharacter = {
  uz: 'voice_4ef06e6b-2229-4023-ad66-c2a7a2b736ff', en: 'voice_951965ee-7f84-4e74-b93a-1c30c03ef21a', pitch: 1, rate: 1, female: true,
}

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id)!
