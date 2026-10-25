import { useI18n } from '../../i18n'
import type { DateOrder } from '../../lib/types'

/** "Dates look wrong?" switch between DD/MM and MM/DD for WhatsApp exports. */
export function DateOrderToggle({
  order,
  ambiguous,
  onChange,
  disabled,
}: {
  order: DateOrder
  ambiguous?: boolean
  onChange: (o: DateOrder) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  if (order === 'YMD') return null
  const other: DateOrder = order === 'DMY' ? 'MDY' : 'DMY'
  const label = (o: DateOrder) => (o === 'DMY' ? t('dates.dmy') : t('dates.mdy'))
  return (
    <div className={`date-toggle ${ambiguous ? 'is-ambiguous' : ''}`}>
      <span>
        {t('dates.current', { format: label(order) })}{' '}
        {ambiguous && <span className="date-toggle-hint">{t('dates.guess')}</span>}
      </span>
      <button
        type="button"
        className="link-btn"
        onClick={() => onChange(other)}
        disabled={disabled}
      >
        {t('dates.wrong', { format: label(other) })}
      </button>
    </div>
  )
}
