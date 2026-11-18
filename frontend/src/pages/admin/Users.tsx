import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, UserCheck, UserX, Users as UsersIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { AdminUser, Role } from '@/api/types'
import { Badge, VerifiedBadge } from '@/components/market'
import { ConfirmDialog } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/input'
import { PageHeader, Pagination, Segmented } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { useDebounced } from '@/hooks/useScrollTop'
import { formatDate, timeAgo, uz } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

const PAGE_SIZE = 20

export default function AdminUsers() {
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [search, setSearch] = React.useState('')
  const [role, setRole] = React.useState<'' | Role>('')
  const [active, setActive] = React.useState<'all' | 'active' | 'suspended'>('all')
  const [page, setPage] = React.useState(1)
  const dq = useDebounced(search, 300)
  React.useEffect(() => setPage(1), [dq, role, active])

  const q = useQuery({
    queryKey: ['admin-users', { q: dq, role, active, page }],
    queryFn: () => Api.adminUsers({ q: dq || undefined, role: role || undefined, is_active: active === 'all' ? undefined : active === 'active', page, page_size: PAGE_SIZE }),
    placeholderData: (p) => p,
  })
  const [target, setTarget] = React.useState<AdminUser | null>(null)
  const m = useMutation({
    mutationFn: (u: AdminUser) => Api.adminSetActive(u.id, !u.is_active),
    onSuccess: (_, u) => {
      toast.success(t(u.is_active ? 'users.suspended' : 'users.reactivated', { name: uz(u.full_name) }))
      setTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const columns: Column<AdminUser>[] = [
    {
      key: 'name', header: t('users.col.user'), sortValue: (u) => u.full_name,
      cell: (u) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-ink-soft">{u.full_name.slice(0, 1)}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5"><span className="truncate font-medium">{uz(u.full_name)}</span></div>
            <p className="truncate text-xs text-muted">{u.email}{u.phone && <> · <span className="font-mono">{u.phone}</span></>}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: t('users.col.role'), sortValue: (u) => u.role, cell: (u) => <Badge tone={u.role === 'admin' ? 'dark' : u.role === 'seller' ? 'brand' : 'info'}>{t(`common:roles.${u.role}`)}</Badge> },
    { key: 'region', header: t('common:fields.region'), sortValue: (u) => u.region, cell: (u) => <span className="text-ink-soft">{u.region ? uz(u.region) : '—'}</span> },
    {
      key: 'business', header: t('users.col.business'), sortValue: (u) => u.business?.name,
      cell: (u) => u.business ? (
        <div className="flex min-w-[140px] items-center gap-1.5"><span className="truncate">{uz(u.business.name)}</span><VerifiedBadge status={u.business.verification_status} /></div>
      ) : <span className="text-muted">—</span>,
    },
    { key: 'created', header: t('users.col.created'), sortValue: (u) => u.created_at, cell: (u) => <span className="text-xs whitespace-nowrap text-muted">{formatDate(u.created_at)}</span> },
    { key: 'login', header: t('users.col.lastLogin'), sortValue: (u) => u.last_login_at ?? '', cell: (u) => <span className="text-xs whitespace-nowrap text-muted">{u.last_login_at ? timeAgo(u.last_login_at) : t('users.never')}</span> },
    { key: 'status', header: t('common:fields.status'), sortValue: (u) => (u.is_active ? 1 : 0), cell: (u) => <Badge tone={u.is_active ? 'brand' : 'danger'}><span className="size-1.5 rounded-full bg-current opacity-70" />{u.is_active ? t('common:status.active') : t('common:status.suspended')}</Badge> },
    {
      key: 'actions', header: <span className="sr-only">{t('users.col.actions')}</span>, align: 'right',
      cell: (u) => u.id === me?.id || u.role === 'admin' ? null : (
        <Button size="sm" variant={u.is_active ? 'danger-outline' : 'outline'} onClick={() => setTarget(u)}>
          {u.is_active ? <><UserX /> {t('users.suspend')}</> : <><UserCheck /> {t('users.reactivate')}</>}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader eyebrow={t('users.eyebrow')} title={t('users.title')} description={t('users.subtitle')} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:max-w-sm"><Input icon={<Search />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('users.search')} aria-label={t('common:actions.search')} /></div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <div className="w-40">
            <Select value={role} onChange={(e) => setRole(e.target.value as '' | Role)} aria-label={t('users.col.role')}>
              <option value="">{t('users.allRoles')}</option>
              {(['buyer', 'seller', 'admin'] as const).map((r) => <option key={r} value={r}>{t(`common:roles.${r}`)}</option>)}
            </Select>
          </div>
          <Segmented id="users-active" value={active} onChange={setActive} options={[
            { value: 'all', label: t('users.all') }, { value: 'active', label: t('common:status.active') }, { value: 'suspended', label: t('common:status.suspended') },
          ]} />
        </div>
      </div>
      <Card className="overflow-hidden">
        {q.isLoading ? <div className="p-5"><SkeletonList rows={8} /></div>
          : q.isError || !q.data ? <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>
          : q.data.items.length === 0 ? <div className="p-5"><EmptyState icon={<UsersIcon />} title={t('common:states.noResults')} description={t('common:states.noResultsHint')} /></div>
          : <DataTable columns={columns} rows={q.data.items} rowKey={(u) => u.id} rowClassName={(u) => (!u.is_active ? 'bg-danger-50/40' : undefined)} />}
      </Card>
      {q.data && <Pagination page={q.data.page} pages={q.data.pages} total={q.data.total} pageSize={q.data.page_size} onChange={setPage} />}

      <ConfirmDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} tone={target?.is_active ? 'danger' : 'primary'}
        title={target?.is_active ? t('users.suspendTitle') : t('users.reactivateTitle')}
        description={target ? t(target.is_active ? 'users.suspendBody' : 'users.reactivateBody', { name: uz(target.full_name), email: target.email }) : undefined}
        confirmLabel={target?.is_active ? t('users.suspend') : t('users.reactivate')} loading={m.isPending}
        onConfirm={() => target && m.mutate(target)} />
    </div>
  )
}
