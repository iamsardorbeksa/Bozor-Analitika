import { useI18n } from '../../i18n'
import type { DictKey } from '../../i18n/en'
import type { TimeRange } from '../../lib/stats/compute'

const RANGES: { value: TimeRange; key: DictKey }[] = [
  { value: 'all', key: 'range.all' },
  { value: 'year', key: 'range.year' },
  { value: '6months', key: 'range.6months' },
  { value: '30days', key: 'range.30days' },
]

export function RangePicker({
  value,
  onChange,
  disabled,
}: {
  value: TimeRange
  onChange: (r: TimeRange) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend className="sr-only">{t('range.label')}</legend>
      {RANGES.map((r) => (
        <label key={r.value} className={`segmented-item ${value === r.value ? 'is-active' : ''}`}>
          <input
            type="radio"
            name="range"
            value={r.value}
            checked={value === r.value}
            onChange={() => onChange(r.value)}
            className="sr-only"
          />
          {t(r.key)}
        </label>
      ))}
    </fieldset>
  )
}
