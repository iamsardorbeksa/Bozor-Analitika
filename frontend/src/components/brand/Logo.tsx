import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Mark: black rounded square, a bazaar-dome arch with a rising orange price index inside it. */
export function LogoMark({ size = 32, className, light }: { size?: number; className?: string; light?: boolean }) {
  const base = light ? '#ffffff' : '#111317'
  const fg = light ? '#111317' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill={base} />
      <path d="M7.5 24V15.5a8.5 8.5 0 0 1 17 0V24" fill="none" stroke={fg} strokeOpacity=".35" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="5.6" r="1.3" fill="#ff5a1f" />
      <rect x="11" y="18" width="2.4" height="6" rx="1.2" fill={fg} opacity=".55" />
      <rect x="14.8" y="15" width="2.4" height="9" rx="1.2" fill={fg} opacity=".85" />
      <rect x="18.6" y="12" width="2.4" height="12" rx="1.2" fill="#ff5a1f" />
    </svg>
  )
}

export function Logo({ to = '/', light, className, compact, collapse }: { to?: string; light?: boolean; className?: string; compact?: boolean; collapse?: boolean }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Bozor-Analitika">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" light={light} />
      {!compact && (
        <span className={cn('text-[17px] leading-none font-extrabold tracking-[-0.035em]', light ? 'text-white' : 'text-ink', collapse && 'max-[430px]:hidden')}>
          Bozor<span className="text-brand">·</span><span className="font-light">Analitika</span>
        </span>
      )}
    </Link>
  )
}
