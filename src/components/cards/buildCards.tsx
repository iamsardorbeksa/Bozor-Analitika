import type { ReactElement } from 'react'
import type { Translator } from '../../i18n'
import {
  AwardsCard,
  IntroCard,
  LaughCard,
  PeakHourCard,
  ReplySpeedCard,
  SilenceCard,
  StarterCard,
  SummaryCard,
  TopEmojisCard,
  TopWordsCard,
  TotalCard,
  WhoTalksCard,
  type CardData,
} from './cards'
import { AWARD_PALETTES, PALETTES, type Palette } from './palettes'

export interface CardSpec {
  id: string
  /** Accessible name, also used as the file name when saving. */
  title: string
  palette: Palette
  render: (isStatic: boolean) => ReactElement
}

/** People shown per award card in group chats. */
const GROUP_AWARDS_PER_CARD = 3

/** Decide which cards to show (skipping ones without data) and in what order. */
export function buildCards(data: CardData, realNames: string[], t: Translator['t']): CardSpec[] {
  const { stats } = data
  const cards: CardSpec[] = []
  const add = (id: string, title: string, palette: Palette, render: CardSpec['render']) =>
    cards.push({ id, title, palette, render })

  add('intro', t('cardTitle.intro'), PALETTES.intro, (s) => <IntroCard data={data} isStatic={s} />)
  add('total', t('cardTitle.total'), PALETTES.total, (s) => <TotalCard data={data} isStatic={s} />)
  if (stats.people.length > 1) {
    add('who', t('cardTitle.who'), PALETTES.who, (s) => <WhoTalksCard data={data} isStatic={s} />)
  }
  add('peak', t('cardTitle.peak'), PALETTES.peak, (s) => <PeakHourCard data={data} isStatic={s} />)
  if (stats.longestSilence && stats.longestSilence.ms > 0) {
    add('silence', t('cardTitle.silence'), PALETTES.silence, (s) => (
      <SilenceCard data={data} isStatic={s} />
    ))
  }
  if (stats.people.some((p) => p.medianReplyMs !== null) && stats.people.length > 1) {
    add('reply', t('cardTitle.reply'), PALETTES.reply, (s) => (
      <ReplySpeedCard data={data} isStatic={s} />
    ))
  }
  if (stats.topWords.length >= 3) {
    add('words', t('cardTitle.words'), PALETTES.words, (s) => (
      <TopWordsCard data={data} isStatic={s} realNames={realNames} />
    ))
  }
  if (stats.totalEmojis >= 3) {
    add('emojis', t('cardTitle.emojis'), PALETTES.emojis, (s) => (
      <TopEmojisCard data={data} isStatic={s} />
    ))
  }
  add('laugh', t('cardTitle.laugh'), PALETTES.laugh, (s) => <LaughCard data={data} isStatic={s} />)

  // Awards: one card per person in 1-on-1 chats, a few people per card in groups.
  const awarded = [...new Set(data.awards.map((a) => a.personIndex))].sort((a, b) => a - b)
  const perCard = stats.isGroup ? GROUP_AWARDS_PER_CARD : 1
  for (let i = 0; i < awarded.length; i += perCard) {
    const people = awarded.slice(i, i + perCard)
    const paletteIndex = i / perCard
    add(
      `awards-${paletteIndex + 1}`,
      t('cardTitle.awards', { names: people.map((p) => data.names[p]).join(', ') }),
      AWARD_PALETTES[paletteIndex % AWARD_PALETTES.length],
      (s) => <AwardsCard data={data} isStatic={s} people={people} paletteIndex={paletteIndex} />,
    )
  }

  if (stats.people.length > 1 && stats.totalConversations > 1) {
    add('starter', t('cardTitle.starter'), PALETTES.starter, (s) => (
      <StarterCard data={data} isStatic={s} />
    ))
  }
  add('summary', t('cardTitle.summary'), PALETTES.summary, (s) => (
    <SummaryCard data={data} isStatic={s} realNames={realNames} />
  ))
  return cards
}
