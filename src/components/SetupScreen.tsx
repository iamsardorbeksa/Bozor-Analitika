import { useI18n } from '../i18n'
import type { TimeRange } from '../lib/stats/compute'
import type { DateOrder } from '../lib/types'
import type { LoadedInfo } from '../worker/protocol'
import { DateOrderToggle } from './ui/DateOrderToggle'
import { Icon } from './ui/Icon'
import { RangePicker } from './ui/RangePicker'

const MAX_CHIPS = 8

export function SetupScreen({
  info,
  range,
  error,
  onRangeChange,
  onGenerate,
  onSelectChat,
  onDateOrderChange,
  onBack,
}: {
  info: LoadedInfo
  range: TimeRange
  error: string | null
  onRangeChange: (r: TimeRange) => void
  onGenerate: () => void
  onSelectChat: (i: number) => void
  onDateOrderChange: (o: DateOrder) => void
  onBack: () => void
}) {
  const { t, tp, shortDate } = useI18n()
  const shown = info.participants.slice(0, MAX_CHIPS)
  const more = info.participants.length - shown.length
  return (
    <main className="setup-page">
      <div className="setup-card">
        <button className="link-btn inline-flex items-center gap-1 text-sm" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> {t('setup.another')}
        </button>

        <div className="mt-6 flex items-center gap-3">
          <span className={`platform-badge ${info.platform}`}>
            {info.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
          </span>
          <span className="text-sm font-bold text-[var(--page-muted)]">
            {shortDate(info.first)} — {shortDate(info.last)}
          </span>
        </div>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">
          {t('setup.title')}
        </h1>
        {info.chatName && <p className="mt-2 text-lg font-extrabold">{info.chatName}</p>}
        <p className="mt-1 font-semibold text-[var(--page-muted)]">
          {tp('setup.messages', info.messageCount)} · {tp('setup.people', info.participants.length)}
        </p>

        <ul
          className="mt-4 flex flex-wrap gap-2"
          aria-label={tp('setup.people', info.participants.length)}
        >
          {shown.map((name) => (
            <li key={name} className="chip">
              {name}
            </li>
          ))}
          {more > 0 && <li className="chip chip-muted">{t('setup.andMore', { n: more })}</li>}
        </ul>

        {info.chats && info.chats.length > 1 && (
          <fieldset className="setup-section">
            <legend className="font-bold">{t('setup.pickChat')}</legend>
            <div className="chat-list mt-3">
              {info.chats.slice(0, 60).map((c, i) => (
                <label
                  key={i}
                  className={`chat-option ${i === info.selectedChat ? 'is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="chat"
                    className="sr-only"
                    checked={i === info.selectedChat}
                    onChange={() => onSelectChat(i)}
                  />
                  <span className="truncate font-bold">{c.name}</span>
                  <span className="shrink-0 text-sm text-[var(--page-muted)]">
                    {tp('setup.chatMessages', c.messageCount)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {info.platform === 'whatsapp' && info.dateOrder && info.dateOrder !== 'YMD' && (
          <div className="setup-section">
            <div className="font-bold">{t('dates.title')}</div>
            <DateOrderToggle
              order={info.dateOrder}
              ambiguous={info.dateOrderAmbiguous}
              onChange={onDateOrderChange}
            />
          </div>
        )}

        <div className="setup-section">
          <div className="mb-2 font-bold">{t('setup.range')}</div>
          <RangePicker value={range} onChange={onRangeChange} />
        </div>

        {error && (
          <p className="error-inline mt-5" role="alert">
            <Icon name="alert" size={18} /> {error}
          </p>
        )}

        <button className="btn-primary mt-7 w-full" onClick={onGenerate}>
          <Icon name="sparkle" /> {t('setup.generate')}
        </button>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--page-muted)]">
          <Icon name="lock" size={16} /> {t('privacy.badge')}
        </p>
      </div>
    </main>
  )
}
