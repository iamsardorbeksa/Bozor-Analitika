import { Loader2, Mic } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ListeningOverlay } from './ListeningOverlay'
import { useVoiceInput } from './useVoiceInput'
import type { MicState } from './voice'
import './voice.css'

/**
 * Microphone button: tap to talk, tap again (or the pill's stop button, or Esc) to finish.
 * While listening/transcribing it shows the full-screen Gemini-style glow overlay.
 * Denied / unsupported / error states show a toast and the overlay closes.
 */
export function MicButton({ onText, onStateChange, size = 46, className, disabled }: {
  onText: (text: string) => void
  onStateChange?: (s: MicState) => void
  size?: number
  className?: string
  disabled?: boolean
}) {
  const { t } = useTranslation('voice')
  const handleState = React.useCallback((s: MicState) => {
    onStateChange?.(s)
    if (s === 'denied') toast.error(t('denied'), { description: t('deniedHint') })
    else if (s === 'unsupported') toast.error(t('unsupported'), { description: t('unsupportedHint') })
    else if (s === 'error') toast.error(t('error'), { description: t('errorHint') })
  }, [onStateChange, t])
  const v = useVoiceInput({ onText, onState: handleState })
  const label = v.state === 'listening' ? t('stop') : t('start')

  return (
    <>
      <button type="button" className={cn('mic-btn', className)} data-state={v.state} style={{ ['--mic-size' as string]: `${size}px` }}
        onClick={v.toggle} disabled={disabled || v.state === 'working'} aria-label={label} title={label} aria-pressed={v.state === 'listening'}>
        {v.state === 'working' ? <Loader2 className="size-[18px] animate-spin" /> : <Mic className="size-[19px]" strokeWidth={2.1} />}
      </button>
      <ListeningOverlay state={v.state === 'listening' || v.state === 'working' ? v.state : null}
        analyser={v.analyser} partial={v.partial} onStop={v.stop} />
    </>
  )
}
