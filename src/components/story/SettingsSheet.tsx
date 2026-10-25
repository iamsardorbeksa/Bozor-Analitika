import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'
import { LANG_LABELS, LANGS } from '../../i18n/lang'
import type { TimeRange } from '../../lib/stats/compute'
import type { DateOrder } from '../../lib/types'
import type { LoadedInfo } from '../../worker/protocol'
import { DateOrderToggle } from '../ui/DateOrderToggle'
import { Icon } from '../ui/Icon'
import { RangePicker } from '../ui/RangePicker'

export function SettingsSheet({
  info,
  range,
  hideNames,
  busy,
  onHideNames,
  onRangeChange,
  onDateOrderChange,
  onClose,
}: {
  info: LoadedInfo
  range: TimeRange
  hideNames: boolean
  busy: boolean
  onHideNames: (v: boolean) => void
  onRangeChange: (r: TimeRange) => void
  onDateOrderChange: (o: DateOrder) => void
  onClose: () => void
}) {
  const { t, lang, setLang } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="font-display text-xl font-extrabold">
            {t('settings.title')}
          </h2>
          <button
            className="story-icon-btn is-dark"
            onClick={onClose}
            aria-label={t('story.close')}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="sheet-section">
          <label className="switch-row">
            <span>
              <span className="block font-bold">{t('story.hideNames')}</span>
              <span className="sheet-help">{t('settings.hideNamesHelp')}</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={hideNames}
              onChange={(e) => onHideNames(e.target.checked)}
            />
          </label>
        </div>

        <div className="sheet-section">
          <div className="font-bold">{t('range.label')}</div>
          <div className="mt-2">
            <RangePicker value={range} onChange={onRangeChange} disabled={busy} />
          </div>
        </div>

        {info.platform === 'whatsapp' && info.dateOrder && info.dateOrder !== 'YMD' && (
          <div className="sheet-section">
            <div className="font-bold">{t('dates.title')}</div>
            <DateOrderToggle
              order={info.dateOrder}
              ambiguous={info.dateOrderAmbiguous}
              onChange={onDateOrderChange}
              disabled={busy}
            />
          </div>
        )}

        <div className="sheet-section">
          <div className="font-bold">{t('settings.language')}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                className={`pill ${l === lang ? 'is-active' : ''}`}
                aria-pressed={l === lang}
                onClick={() => setLang(l)}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
