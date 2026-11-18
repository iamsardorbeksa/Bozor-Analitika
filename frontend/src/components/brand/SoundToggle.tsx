import { Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSound } from '@/hooks/useSound'
import { cn } from '@/lib/utils'

/** Round speaker button in the top bar: global sound on/off (persisted in localStorage `bozor.sound`). */
export function SoundToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { soundOn, toggleSound } = useSound()
  const label = soundOn ? t('nav.soundOn') : t('nav.soundOff')
  return (
    <button type="button" onClick={toggleSound} aria-pressed={soundOn} title={label} aria-label={label}
      className={cn('grid size-[38px] shrink-0 place-items-center rounded-full border bg-white transition-colors',
        soundOn ? 'border-brand text-brand' : 'border-line text-ink hover:border-line-strong', className)}>
      {soundOn ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
    </button>
  )
}
