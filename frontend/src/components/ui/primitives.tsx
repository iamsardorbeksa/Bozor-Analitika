/* Radix-based primitives in the shadcn/ui pattern: Dialog, Dropdown, Tabs, Tooltip, Switch, Popover. */
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------- Dialog
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, title, description, wide, ...p }: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode; description?: React.ReactNode; wide?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#111317]/30 backdrop-blur-[3px] data-[state=open]:animate-[fade_.15s_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-white/80 bg-white/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-xl focus:outline-none data-[state=open]:animate-[pop_.18s_cubic-bezier(.2,.9,.3,1.2)]',
          wide ? 'max-w-2xl' : 'max-w-md', className,
        )}
        {...p}
      >
        <div className="mb-5 pr-8">
          <DialogPrimitive.Title className="text-lg font-extrabold tracking-[-0.03em]">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description>
            : <DialogPrimitive.Description className="sr-only">{typeof title === 'string' ? title : ''}</DialogPrimitive.Description>}
        </div>
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-full p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// ---------------------------------------------------------------- Dropdown
export const Dropdown = DropdownPrimitive.Root
export const DropdownTrigger = DropdownPrimitive.Trigger

export function DropdownContent({ className, align = 'end', ...p }: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn('z-50 min-w-[180px] rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur-xl data-[state=open]:animate-[menu_.14s_ease-out]', className)}
        {...p}
      />
    </DropdownPrimitive.Portal>
  )
}

export function DropdownItem({ className, danger, ...p }: React.ComponentProps<typeof DropdownPrimitive.Item> & { danger?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft outline-none select-none data-[highlighted]:bg-ink/5 data-[highlighted]:text-ink [&_svg]:size-4 [&_svg]:text-muted',
        danger && 'text-danger data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger [&_svg]:text-danger', className,
      )}
      {...p}
    />
  )
}
export const DropdownSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-line" />
export const DropdownLabel = ({ className, ...p }: React.ComponentProps<typeof DropdownPrimitive.Label>) => (
  <DropdownPrimitive.Label className={cn('px-2.5 py-1.5 text-xs text-muted', className)} {...p} />
)

// ---------------------------------------------------------------- Tabs
export const Tabs = TabsPrimitive.Root
export function TabsList({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex items-center gap-0.5 rounded-full border border-line bg-ink/5 p-1', className)} {...p} />
}
export function TabsTrigger({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn('rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-[0_4px_14px_rgba(17,19,23,.2)]', className)}
      {...p}
    />
  )
}
export const TabsContent = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn('mt-4 focus:outline-none', className)} {...p} />
)

// ---------------------------------------------------------------- Tooltip
export const TooltipProvider = TooltipPrimitive.Provider
export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  if (!content) return <>{children}</>
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-50 max-w-[260px] rounded-lg bg-ink px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg">
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// ---------------------------------------------------------------- Switch
export function Switch({ className, ...p }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn('relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-line-strong transition-colors data-[state=checked]:bg-brand', className)}
      {...p}
    >
      <SwitchPrimitive.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  )
}

// ---------------------------------------------------------------- Popover
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export function PopoverContent({ className, align = 'end', ...p }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={8}
        className={cn('z-50 rounded-2xl border border-white/80 bg-white/92 shadow-[var(--shadow-lift)] backdrop-blur-xl focus:outline-none data-[state=open]:animate-[menu_.14s_ease-out]', className)} {...p} />
    </PopoverPrimitive.Portal>
  )
}
