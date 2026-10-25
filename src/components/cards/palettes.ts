/** Each card has its own bold palette. Text colors were checked for WCAG contrast on their background. */
export interface Palette {
  bg: string
  fg: string
  /** Secondary text, same hue as fg but softer. */
  muted: string
  accent: string
  accent2: string
  /** Surface for chips / panels on top of bg. */
  panel: string
}

export const PALETTES = {
  intro: {
    bg: '#5B2EFF',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.78)',
    accent: '#D7FF3A',
    accent2: '#FF7AB6',
    panel: 'rgba(255,255,255,0.12)',
  },
  total: {
    bg: '#E0145A',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.82)',
    accent: '#FFE14D',
    accent2: '#2B0A3D',
    panel: 'rgba(43,10,61,0.22)',
  },
  who: {
    bg: '#D7FF3A',
    fg: '#121212',
    muted: 'rgba(18,18,18,0.72)',
    accent: '#5B2EFF',
    accent2: '#E0145A',
    panel: 'rgba(18,18,18,0.08)',
  },
  peak: {
    bg: '#0B1033',
    fg: '#F4F1FF',
    muted: 'rgba(244,241,255,0.72)',
    accent: '#3AF0FF',
    accent2: '#FF8A3D',
    panel: 'rgba(255,255,255,0.08)',
  },
  silence: {
    bg: '#FF6A1F',
    fg: '#1B0B00',
    muted: 'rgba(27,11,0,0.75)',
    accent: '#FFF3E0',
    accent2: '#3A1CC9',
    panel: 'rgba(27,11,0,0.10)',
  },
  reply: {
    bg: '#1E4BFF',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.8)',
    accent: '#FFB8E0',
    accent2: '#D7FF3A',
    panel: 'rgba(255,255,255,0.12)',
  },
  words: {
    bg: '#FFF1DC',
    fg: '#1A1A1A',
    muted: 'rgba(26,26,26,0.7)',
    accent: '#E5261B',
    accent2: '#1E4BFF',
    panel: 'rgba(26,26,26,0.06)',
  },
  emojis: {
    bg: '#FFD400',
    fg: '#1A1033',
    muted: 'rgba(26,16,51,0.74)',
    accent: '#6A1FF0',
    accent2: '#E0145A',
    panel: 'rgba(26,16,51,0.08)',
  },
  laugh: {
    bg: '#D6127A',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.82)',
    accent: '#FFE14D',
    accent2: '#2BFFB8',
    panel: 'rgba(255,255,255,0.14)',
  },
  awards: {
    bg: '#121212',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.72)',
    accent: '#FFC531',
    accent2: '#FF7AB6',
    panel: 'rgba(255,255,255,0.07)',
  },
  starter: {
    bg: '#00C2A8',
    fg: '#04201C',
    muted: 'rgba(4,32,28,0.74)',
    accent: '#FFFFFF',
    accent2: '#3A1CC9',
    panel: 'rgba(4,32,28,0.10)',
  },
  summary: {
    bg: '#16083F',
    fg: '#FFFFFF',
    muted: 'rgba(255,255,255,0.75)',
    accent: '#D7FF3A',
    accent2: '#FF7AB6',
    panel: 'rgba(255,255,255,0.08)',
  },
} satisfies Record<string, Palette>

export type PaletteName = keyof typeof PALETTES

/** Rotating palettes for multiple award cards. */
export const AWARD_PALETTES: Palette[] = [
  PALETTES.awards,
  { ...PALETTES.awards, bg: '#2A0E5C', accent: '#D7FF3A', panel: 'rgba(255,255,255,0.08)' },
  { ...PALETTES.awards, bg: '#0F2E2A', accent: '#FFB8E0', accent2: '#3AF0FF' },
  { ...PALETTES.awards, bg: '#3B0A1F', accent: '#FFE14D', accent2: '#3AF0FF' },
]

/** Colors for people in bar charts (on any card background, inside panels). */
export const PERSON_COLORS = [
  '#5B2EFF',
  '#E0145A',
  '#FF8A3D',
  '#00A88F',
  '#1E4BFF',
  '#B5179E',
  '#7A5C00',
  '#3A3A3A',
]
