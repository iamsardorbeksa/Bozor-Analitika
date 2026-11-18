import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />
}

/** Generic grid of skeleton cards / rows while a query loads. */
export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-busy>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string
}) {
  const { t } = useTranslation()
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-white/55 backdrop-blur px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-mint text-brand-600 [&_svg]:size-6">{icon ?? <Inbox />}</div>
      <p className="font-semibold text-ink">{title ?? t('states.emptyTitle')}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function ErrorState({ onRetry, message, className }: { onRetry?: () => void; message?: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-2xl border border-[#efcdc9] bg-danger-50/60 px-6 py-12 text-center', className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-white text-danger"><AlertTriangle className="size-5" /></div>
      <p className="font-semibold">{t('states.errorTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message ?? t('states.errorBody')}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RotateCw /> {t('actions.retry')}</Button>}
    </div>
  )
}

/** Renders loading / error / empty / content for a TanStack query in one line. */
export function QueryState<T>({ query, children, skeleton, empty, isEmpty }: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown; error?: unknown }
  children: (data: T) => React.ReactNode
  skeleton?: React.ReactNode
  empty?: React.ReactNode
  isEmpty?: (d: T) => boolean
}) {
  if (query.isLoading) return <>{skeleton ?? <SkeletonList />}</>
  if (query.isError || query.data === undefined) return <ErrorState onRetry={() => query.refetch()} />
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState />}</>
  return <>{children(query.data)}</>
}
