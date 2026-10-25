import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { APP_CONFIG } from '../../config'
import { I18nProvider, useI18n } from '../../i18n'
import { assignAwards } from '../../lib/awards'
import { renderCardToPng } from '../../lib/export/image'
import { downloadBlob, shareOrDownload, slug, zipFiles } from '../../lib/export/share'
import type { ChatStats, TimeRange } from '../../lib/stats/compute'
import type { DateOrder } from '../../lib/types'
import type { LoadedInfo } from '../../worker/protocol'
import { buildCards } from '../cards/buildCards'
import type { CardData } from '../cards/cards'
import { CARD_H, CARD_W } from '../cards/primitives'
import { Icon } from '../ui/Icon'
import { SettingsSheet } from './SettingsSheet'

interface Props {
  stats: ChatStats
  info: LoadedInfo
  range: TimeRange
  busy: boolean
  error: string | null
  isDemo: boolean
  onRangeChange: (range: TimeRange) => void
  onDateOrderChange: (order: DateOrder) => void
  onClose: () => void
}

const letter = (i: number) =>
  i < 26
    ? String.fromCharCode(65 + i)
    : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26))

export function StoryView({
  stats,
  info,
  range,
  busy,
  error,
  isDemo,
  onRangeChange,
  onDateOrderChange,
  onClose,
}: Props) {
  const i18n = useI18n()
  const { t, lang } = i18n
  const [index, setIndex] = useState(0)
  const [hideNames, setHideNames] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [working, setWorking] = useState<null | { label: string; done?: number; total?: number }>(
    null,
  )
  const [toast, setToast] = useState<string | null>(null)

  const realNames = useMemo(() => stats.people.map((p) => p.name), [stats])
  const names = useMemo(
    () =>
      hideNames ? stats.people.map((_, i) => t('common.person', { letter: letter(i) })) : realNames,
    [hideNames, stats, realNames, t],
  )
  const awards = useMemo(() => assignAwards(stats), [stats])
  const data: CardData = useMemo(
    () => ({ stats, awards, names, hideNames, range }),
    [stats, awards, names, hideNames, range],
  )
  const cards = useMemo(() => buildCards(data, realNames, t), [data, realNames, t])
  const current = Math.min(index, cards.length - 1)
  const card = cards[current]

  // New stats (range / date order change) → back to the first card.
  const [seenStats, setSeenStats] = useState(stats)
  if (seenStats !== stats) {
    setSeenStats(stats)
    setIndex(0)
  }

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta))),
    [cards.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Home') setIndex(0)
      else if (e.key === 'End') setIndex(cards.length - 1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose, settingsOpen, cards.length])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  // ---- scale the fixed 360×640 card to the available stage
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setScale(Math.max(0.4, Math.min(width / CARD_W, height / CARD_H)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- tap & swipe
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = pointer.current
    pointer.current = null
    if (!start) return
    if ((e.target as HTMLElement).closest('button,a')) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      go(e.clientX - rect.left < rect.width * 0.33 ? -1 : 1)
    }
  }

  // ---- export
  const fileName = (i: number) =>
    `${slug(APP_CONFIG.name)}-${String(i + 1).padStart(2, '0')}-${cards[i].id}.png`
  const renderPng = (i: number) =>
    renderCardToPng(<I18nProvider lang={lang}>{cards[i].render(true)}</I18nProvider>)

  const saveCurrent = async () => {
    setWorking({ label: t('story.saving') })
    try {
      downloadBlob(await renderPng(current), fileName(current))
      setToast(t('story.saved'))
    } catch {
      setToast(t('story.exportError'))
    } finally {
      setWorking(null)
    }
  }

  const shareCurrent = async () => {
    setWorking({ label: t('story.preparing') })
    try {
      const blob = await renderPng(current)
      const result = await shareOrDownload(
        blob,
        fileName(current),
        t('share.text', { url: APP_CONFIG.siteUrl }),
      )
      if (result === 'downloaded') setToast(t('story.saved'))
    } catch {
      setToast(t('story.exportError'))
    } finally {
      setWorking(null)
    }
  }

  const saveAll = async () => {
    setWorking({ label: t('story.zipping'), done: 0, total: cards.length })
    try {
      const files: { name: string; blob: Blob }[] = []
      for (let i = 0; i < cards.length; i++) {
        files.push({ name: fileName(i), blob: await renderPng(i) })
        setWorking({ label: t('story.zipping'), done: i + 1, total: cards.length })
      }
      downloadBlob(await zipFiles(files), `${slug(APP_CONFIG.name)}.zip`)
      setToast(t('story.savedAll'))
    } catch {
      setToast(t('story.exportError'))
    } finally {
      setWorking(null)
    }
  }

  const isLast = current === cards.length - 1

  return (
    <div
      className="story-root"
      style={{
        ['--story-a' as string]: card.palette.bg,
        ['--story-b' as string]: card.palette.accent,
      }}
    >
      <div className="story-bg" aria-hidden="true">
        <span className="story-blob story-blob-1" />
        <span className="story-blob story-blob-2" />
        <span className="story-blob story-blob-3" />
      </div>

      <div className="story-frame">
        {/* Top bar: progress + controls */}
        <div className="story-top">
          <div className="story-progress" role="tablist" aria-label={t('story.progress')}>
            {cards.map((c, i) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={i === current}
                aria-label={t('story.goTo', { n: i + 1, title: c.title })}
                className="story-seg"
                onClick={() => setIndex(i)}
              >
                <span
                  className={`story-seg-fill ${i < current ? 'is-done' : i === current ? 'is-active' : ''}`}
                />
              </button>
            ))}
          </div>
          <div className="story-controls">
            <button className="story-icon-btn" onClick={onClose} aria-label={t('story.close')}>
              <Icon name="close" />
            </button>
            <div className="story-counter" aria-hidden="true">
              {current + 1} / {cards.length}
            </div>
            <button
              className={`story-chip ${hideNames ? 'is-on' : ''}`}
              onClick={() => setHideNames((h) => !h)}
              aria-pressed={hideNames}
            >
              <Icon name={hideNames ? 'eyeOff' : 'eye'} size={16} />
              {t('story.hideNames')}
            </button>
            <button
              className="story-icon-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('story.settings')}
            >
              <Icon name="sliders" />
            </button>
          </div>
        </div>

        {/* Card stage */}
        <div
          ref={stageRef}
          className="story-stage"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          aria-roledescription="carousel"
          aria-label={t('story.carousel')}
        >
          <div
            className="story-card-wrap"
            style={{ width: CARD_W * scale, height: CARD_H * scale }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <div key={`${card.id}-${hideNames}-${lang}`} className="story-card-enter">
                {card.render(false)}
              </div>
            </div>
          </div>
          <button
            className="story-nav story-nav-prev"
            onClick={() => go(-1)}
            disabled={current === 0}
            aria-label={t('story.prev')}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            className="story-nav story-nav-next"
            onClick={() => go(1)}
            disabled={isLast}
            aria-label={t('story.next')}
          >
            <Icon name="chevronRight" />
          </button>
          {busy && (
            <div className="story-busy" role="status">
              <span className="spinner" /> {t('story.recomputing')}
            </div>
          )}
          {!busy && error && (
            <div className="story-busy" role="alert">
              {error}
            </div>
          )}
          {!busy && !error && isDemo && <div className="story-demo">{t('demo.banner')}</div>}
        </div>

        {/* Actions */}
        <div className="story-actions">
          <button className="story-action" onClick={saveCurrent} disabled={!!working}>
            <Icon name="download" size={18} /> {t('story.save')}
          </button>
          <button
            className="story-action story-action-primary"
            onClick={shareCurrent}
            disabled={!!working}
          >
            <Icon name="share" size={18} /> {t('story.share')}
          </button>
          <button
            className={`story-action ${isLast ? 'story-action-glow' : ''}`}
            onClick={saveAll}
            disabled={!!working}
          >
            <Icon name="zip" size={18} /> {t('story.saveAll')}
          </button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {t('story.announce', { n: current + 1, total: cards.length, title: card.title })}
      </div>

      {working && (
        <div className="story-working" role="status" aria-live="assertive">
          <span className="spinner" />
          {working.label}
          {working.total ? ` ${working.done}/${working.total}` : ''}
        </div>
      )}
      {toast && (
        <div className="story-toast" role="status">
          {toast}
        </div>
      )}

      {settingsOpen && (
        <SettingsSheet
          info={info}
          range={range}
          hideNames={hideNames}
          busy={busy}
          onHideNames={setHideNames}
          onRangeChange={onRangeChange}
          onDateOrderChange={onDateOrderChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
