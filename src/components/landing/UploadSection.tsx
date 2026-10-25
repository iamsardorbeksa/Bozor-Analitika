import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n'
import type { DictKey } from '../../i18n/en'
import type { ParseErrorCode } from '../../lib/types'
import { Icon, type IconName } from '../ui/Icon'

type Tab = 'whatsapp' | 'telegram'

interface Step {
  key: DictKey
  icon: string
}

const WA_IPHONE: Step[] = [
  { key: 'steps.wa.iphone.1', icon: '💬' },
  { key: 'steps.wa.iphone.2', icon: '👤' },
  { key: 'steps.wa.iphone.3', icon: '📤' },
  { key: 'steps.wa.iphone.4', icon: '📄' },
]
const WA_ANDROID: Step[] = [
  { key: 'steps.wa.android.1', icon: '💬' },
  { key: 'steps.wa.android.2', icon: '⋮' },
  { key: 'steps.wa.android.3', icon: '📤' },
  { key: 'steps.wa.android.4', icon: '📄' },
]
const TELEGRAM: Step[] = [
  { key: 'steps.tg.1', icon: '🖥️' },
  { key: 'steps.tg.2', icon: '⋮' },
  { key: 'steps.tg.3', icon: '🚫' },
  { key: 'steps.tg.4', icon: '{ }' },
  { key: 'steps.tg.5', icon: '📄' },
]

function StepList({ title, icon, steps }: { title: string; icon: IconName; steps: Step[] }) {
  const { t } = useI18n()
  return (
    <div className="steps-col">
      <h3 className="flex items-center gap-2 font-extrabold">
        <Icon name={icon} size={18} /> {title}
      </h3>
      <ol className="mt-3 grid gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className="step">
            <span className="step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="step-icon" aria-hidden="true">
              {s.icon}
            </span>
            <span>{t(s.key)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function UploadSection({
  onFile,
  error,
  onDismissError,
}: {
  onFile: (file: File) => void
  error: ParseErrorCode | null
  onDismissError: () => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('whatsapp')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tabs: Tab[] = ['whatsapp', 'telegram']

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = tab === 'whatsapp' ? 'telegram' : 'whatsapp'
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <section id="upload" className="section scroll-mt-20">
      <div className={`upload-shell ${tab}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="section-title">{t('upload.title')}</h2>
          <div role="tablist" aria-label={t('upload.tabs')} className="tabs" onKeyDown={onTabKey}>
            {tabs.map((id) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                className={`tab ${tab === id ? 'is-active' : ''} ${id}`}
                onClick={() => setTab(id)}
              >
                {id === 'whatsapp' ? '💬 WhatsApp' : '✈️ Telegram'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-box mt-6" role="alert">
            <Icon name="alert" size={22} />
            <div className="flex-1">
              <p className="font-extrabold">{t('error.title')}</p>
              <p className="mt-1">{t(`error.${error}`)}</p>
            </div>
            <button
              className="story-icon-btn is-dark shrink-0"
              onClick={onDismissError}
              aria-label={t('story.close')}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}

        <div
          className={`dropzone mt-6 ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon" aria-hidden="true">
            <Icon name="upload" size={30} />
          </div>
          <p className="font-display mt-4 text-xl font-extrabold">
            {dragging ? t('upload.dropActive') : t('upload.drop')}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--page-muted)]">
            {tab === 'whatsapp' ? t('upload.accepts.whatsapp') : t('upload.accepts.telegram')}
          </p>
          <p className="my-3 text-sm font-bold text-[var(--page-muted)]">{t('upload.or')}</p>
          <button className="btn-primary upload-btn" onClick={() => inputRef.current?.click()}>
            <span className="flex items-center gap-2">
              <Icon name="upload" size={18} /> {t('upload.button')}
            </span>
            <span className="upload-btn-sub">
              <Icon name="lock" size={12} /> {t('privacy.badge')}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.zip,.json,text/plain,application/json,application/zip"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              e.target.value = ''
            }}
          />
        </div>

        <div id="how" className="scroll-mt-20">
          <h3 className="mt-10 text-sm font-extrabold tracking-[0.14em] text-[var(--page-muted)] uppercase">
            {t('steps.title')}
          </h3>
          {tab === 'whatsapp' ? (
            <div
              id="panel-whatsapp"
              role="tabpanel"
              aria-labelledby="tab-whatsapp"
              className="mt-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <StepList title={t('steps.wa.iphone')} icon="phone" steps={WA_IPHONE} />
                <StepList title={t('steps.wa.android')} icon="phone" steps={WA_ANDROID} />
              </div>
              <p className="tip mt-4">💡 {t('steps.wa.tip')}</p>
            </div>
          ) : (
            <div
              id="panel-telegram"
              role="tabpanel"
              aria-labelledby="tab-telegram"
              className="mt-4"
            >
              <p className="note">
                <Icon name="alert" size={18} /> {t('steps.tg.note')}
              </p>
              <div className="mt-4">
                <StepList title={t('steps.tg.desktop')} icon="desktop" steps={TELEGRAM} />
              </div>
              <p className="tip mt-4">💡 {t('steps.tg.tip')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
