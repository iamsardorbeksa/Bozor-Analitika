import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n'
import { LANG_LABELS, LANGS, type Lang } from '../../i18n/lang'
import { Icon } from './Icon'

/**
 * Language picker styled like the rest of the site (a native <select> list can't be styled).
 * Accessible as a menu of radio items: arrow keys / Home / End to move, Enter to pick, Esc to close.
 */
export function LangMenu() {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  // Close on outside click / tap.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Move focus to the current language when the menu opens.
  useEffect(() => {
    if (open) itemRefs.current[LANGS.indexOf(lang)]?.focus()
  }, [open, lang])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const choose = (l: Lang) => {
    setLang(l)
    close()
  }

  const onMenuKey = (e: KeyboardEvent) => {
    const items = itemRefs.current
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const focus = (n: number) => items[(n + items.length) % items.length]?.focus()
    if (e.key === 'ArrowDown') focus(i + 1)
    else if (e.key === 'ArrowUp') focus(i - 1)
    else if (e.key === 'Home') focus(0)
    else if (e.key === 'End') focus(items.length - 1)
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') close(false)
    else return
    if (e.key !== 'Tab') e.preventDefault()
  }

  return (
    <div className="lang-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`header-btn lang-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${t('lang.label')}: ${LANG_LABELS[lang]}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <Icon name="globe" size={18} />
        <span className="lang-trigger-label">{LANG_LABELS[lang]}</span>
        <Icon name="chevronDown" size={16} className="lang-chevron" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('lang.label')}
          className="lang-popover"
          onKeyDown={onMenuKey}
        >
          {LANGS.map((l, i) => {
            const active = l === lang
            return (
              <button
                key={l}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={l}
                dir={l === 'ar' ? 'rtl' : 'ltr'}
                tabIndex={active ? 0 : -1}
                className={`lang-item ${active ? 'is-active' : ''}`}
                onClick={() => choose(l)}
              >
                <span className="lang-code" aria-hidden="true">
                  {l.toUpperCase()}
                </span>
                <span className="lang-name">{LANG_LABELS[l]}</span>
                {active && <Icon name="check" size={18} className="lang-check" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
