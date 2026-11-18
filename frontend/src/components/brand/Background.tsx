import { cn } from '@/lib/utils'

/** Page background: reeded (fluted) glass with orange light behind it — pure CSS (`.bz-bg` in index.css). */
export function Background({ calm, className }: { calm?: boolean; className?: string }) {
  return (
    <div className={cn('bz-bg', calm && 'bz-bg-calm', className)} aria-hidden="true">
      <i className="bg-base" /><i className="bg-shift" /><i className="bg-ribs" /><i className="bg-grain" />
    </div>
  )
}

export default Background
