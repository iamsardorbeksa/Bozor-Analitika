import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-xl border border-line-strong bg-white/90 px-3 text-sm text-ink placeholder:text-[#8a8f99] transition-[border,box-shadow] duration-150 hover:border-[rgba(17,19,23,.28)] focus:border-brand focus:shadow-[0_0_0_4px_rgba(255,90,31,.14)] focus:outline-none disabled:bg-paper disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_3px_rgba(192,53,43,.12)]'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; suffix?: React.ReactNode }>(
  ({ className, icon, suffix, ...p }, ref) => {
    if (!icon && !suffix) return <input ref={ref} className={cn(base, 'h-10', className)} {...p} />
    return (
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted [&_svg]:size-4">{icon}</span>}
        <input ref={ref} className={cn(base, 'h-10', icon && 'pl-9', suffix && 'pr-14', className)} {...p} />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[88px] resize-y py-2.5 leading-relaxed', className)} {...p} />
))
Textarea.displayName = 'Textarea'

/** Native select styled to match — accessible and works on mobile. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(base, 'h-10 cursor-pointer appearance-none pr-9', className)} {...p}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
  </div>
))
Select.displayName = 'Select'

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-[13px] font-medium text-ink-soft', className)} {...p} />
}

export function Field({ label, error, hint, htmlFor, children, className }: {
  label?: React.ReactNode; error?: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
