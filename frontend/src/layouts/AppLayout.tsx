import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, BarChart3, Bell, BellRing, Bookmark, Bot, Boxes, Building2, ChartLine, ClipboardList, Flag, Inbox, LayoutDashboard,
  LogOut, Map, Menu, PackagePlus, Radar, Scale, Search, Settings, ShieldCheck, Store, Tags, Users, UsersRound, X,
  FileSignature, Megaphone, MessageSquareQuote, SquarePen,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Api } from '@/api/endpoints'
import type { Role } from '@/api/types'
import { Background } from '@/components/brand/Background'
import { LanguageSwitcher } from '@/components/brand/LanguageSwitcher'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { SoundToggle } from '@/components/brand/SoundToggle'
import { timeAgo, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }
type Section = { title: string; items: Item[] }

function useNav(role: Role): Section[] {
  const { t } = useTranslation()
  const n = (k: string) => t(`nav.${k}`)
  if (role === 'seller')
    return [
      { title: n('sections.main'), items: [
        { to: '/app/seller', label: n('overview'), icon: LayoutDashboard, end: true },
        { to: '/app/seller/tenders', label: n('tenderBoard'), icon: Megaphone },
        { to: '/app/seller/bids', label: n('myBids'), icon: MessageSquareQuote },
        { to: '/app/contracts', label: n('contracts'), icon: FileSignature },
        { to: '/app/seller/products', label: n('myProducts'), icon: Boxes, end: true },
        { to: '/app/seller/products/new', label: n('addProduct'), icon: PackagePlus },
        { to: '/app/seller/requests', label: n('incomingRequests'), icon: Inbox },
      ] },
      { title: n('sections.market'), items: [
        { to: '/app/seller/analytics', label: n('salesAnalytics'), icon: BarChart3 },
        { to: '/app/seller/intelligence', label: n('marketIntelligence'), icon: Radar },
        { to: '/app/agents', label: n('agents'), icon: UsersRound },
        { to: '/app/ai', label: n('aiAnalyst'), icon: Bot },
        { to: '/app/map', label: n('marketMap'), icon: Map },
      ] },
      { title: n('sections.account'), items: [
        { to: '/app/seller/profile', label: n('businessProfile'), icon: Building2 },
        { to: '/app/notifications', label: n('notifications'), icon: Bell },
        { to: '/app/settings', label: n('settings'), icon: Settings },
      ] },
    ]
  if (role === 'admin')
    return [
      { title: n('sections.main'), items: [
        { to: '/app/admin', label: n('overview'), icon: LayoutDashboard, end: true },
        { to: '/app/admin/users', label: n('users'), icon: Users },
        { to: '/app/admin/verifications', label: n('sellerVerification'), icon: ShieldCheck },
      ] },
      { title: n('sections.manage'), items: [
        { to: '/app/admin/products', label: n('products'), icon: Tags },
        { to: '/app/admin/offers', label: n('marketOffers'), icon: Store },
        { to: '/app/admin/prices', label: n('priceMonitoring'), icon: Activity },
        { to: '/app/admin/reports', label: n('reports'), icon: Flag },
        { to: '/app/admin/analytics', label: n('platformAnalytics'), icon: ChartLine },
      ] },
      { title: n('sections.account'), items: [
        { to: '/app/map', label: n('marketMap'), icon: Map },
        { to: '/app/settings', label: n('settings'), icon: Settings },
      ] },
    ]
  return [
    { title: n('sections.main'), items: [
      { to: '/app', label: n('overview'), icon: LayoutDashboard, end: true },
      { to: '/app/tenders', label: n('myTenders'), icon: Megaphone, end: true },
      { to: '/app/tenders/new', label: n('newTender'), icon: SquarePen },
      { to: '/app/contracts', label: n('contracts'), icon: FileSignature },
    ] },
    { title: n('sections.marketData'), items: [
      { to: '/app/market', label: n('marketExplorer'), icon: Store },
      { to: '/app/compare', label: n('priceComparison'), icon: Scale },
      { to: '/app/analytics', label: n('marketAnalytics'), icon: ChartLine },
      { to: '/app/agents', label: n('agents'), icon: UsersRound },
      { to: '/app/ai', label: n('aiAnalyst'), icon: Bot },
      { to: '/app/map', label: n('marketMap'), icon: Map },
    ] },
    { title: n('sections.account'), items: [
      { to: '/app/saved', label: n('savedOffers'), icon: Bookmark },
      { to: '/app/requests', label: n('purchaseRequests'), icon: ClipboardList },
      { to: '/app/alerts', label: n('alerts'), icon: BellRing },
      { to: '/app/notifications', label: n('notifications'), icon: Bell },
      { to: '/app/settings', label: n('settings'), icon: Settings },
    ] },
  ]
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const sections = useNav(user!.role)
  return (
    <div className="flex h-full flex-col border-r border-white/70 bg-white/[0.72] text-ink shadow-[var(--shadow-card)] backdrop-blur-xl backdrop-saturate-[1.2] lg:rounded-[26px] lg:border">
      <div className="flex h-16 items-center px-5"><Logo to="/" /></div>
      <div className="mx-4 mb-2 flex items-center gap-2 truncate rounded-full border border-line bg-white/80 px-3 py-1.5 text-[11.5px] font-medium text-ink-soft">
        <span className="size-1.5 shrink-0 rounded-full bg-brand animate-pulse-dot" />
        {t(`roles.${user!.role}`)}{user!.business ? ` · ${uz(user!.business.name)}` : ''}
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((s) => (
          <div key={s.title} className="mt-4">
            <div className="px-2.5 pb-1.5 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-muted/80 uppercase">{s.title}</div>
            {s.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate}
                className={({ isActive }) => cn('relative flex items-center gap-3 rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors',
                  isActive ? 'text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-ink shadow-[0_4px_14px_rgba(17,19,23,.2)]" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                    <it.icon className={cn('relative size-[18px]', isActive ? 'text-brand' : 'text-muted')} />
                    <span className="relative">{it.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mx-4 mb-4 h-[3px] rounded-full bg-gradient-to-r from-brand via-brand/40 to-transparent" aria-hidden />
    </div>
  )
}

function Notifications() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const count = useQuery({ queryKey: ['notifications', 'count'], queryFn: Api.unreadCount, refetchInterval: 30_000 })
  const list = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => Api.notifications(), enabled: open })
  const readAll = useMutation({ mutationFn: Api.markAllRead, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const n = count.data?.count ?? 0
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={t('nav.notifications')} className="relative grid size-[38px] place-items-center rounded-full border border-line bg-white text-ink hover:border-line-strong">
        <Bell className="size-[18px]" />
        <AnimatePresence>
          {n > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-white">{n > 9 ? '9+' : n}</motion.span>
          )}
        </AnimatePresence>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-semibold">{t('nav.notifications')}</p>
          <Button variant="link" size="sm" onClick={() => readAll.mutate()} disabled={!n}>{t('actions.markAllRead')}</Button>
        </div>
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
          {list.isLoading ? <div className="p-4 text-sm text-muted">{t('states.loading')}</div>
            : !list.data?.length ? <div className="p-6 text-center text-sm text-muted">{t('states.emptyTitle')}</div>
            : list.data.slice(0, 8).map((x) => (
              <button key={x.id} onClick={() => { setOpen(false); Api.markRead(x.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })); if (x.link) nav(x.link) }}
                className="flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-ink/[0.03]">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', x.is_read ? 'bg-transparent' : 'bg-brand')} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{uz(x.title)}</span>
                  <span className="line-clamp-2 block text-xs text-muted">{uz(x.body)}</span>
                  <span className="mt-1 block text-[11px] text-muted/80">{timeAgo(x.created_at)}</span>
                </span>
              </button>
            ))}
        </div>
        <Link to="/app/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-brand-600 hover:bg-ink/[0.03]">{t('actions.viewAll')}</Link>
      </PopoverContent>
    </Popover>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const initials = user!.full_name.split(' ').map((s) => s[0]).slice(0, 2).join('')
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white/55 px-4 backdrop-blur-[18px] backdrop-saturate-[1.3] md:px-6">
      <button className="grid size-[38px] place-items-center rounded-full border border-line bg-white lg:hidden" onClick={onMenu} aria-label="Menu"><Menu className="size-5" /></button>
      <form className="relative max-w-md flex-1" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/app/market?q=${encodeURIComponent(q.trim())}`) }}>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('actions.search')}
          className="h-10 w-full rounded-full border border-line bg-white/90 pr-14 pl-10 text-sm placeholder:text-[#8a8f99] focus:border-brand focus:shadow-[0_0_0_4px_rgba(255,90,31,.14)] focus:outline-none" />
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-line bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">Ctrl K</kbd>
      </form>
      <div className="ml-auto flex items-center gap-2">
        <SoundToggle className="max-sm:hidden" />
        <LanguageSwitcher />
        <Notifications />
        <Dropdown>
          <DropdownTrigger className="flex items-center gap-2 rounded-full border border-line bg-white py-[3px] pr-1 pl-[3px] hover:border-line-strong md:pr-3">
            <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{initials}</span>
            <span className="hidden text-left md:block">
              <span className="block max-w-[140px] truncate text-[13px] leading-tight font-medium">{user!.full_name}</span>
              <span className="block text-[11px] leading-tight text-muted">{t(`roles.${user!.role}`)}</span>
            </span>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>{user!.email}</DropdownLabel>
            <DropdownSeparator />
            <DropdownItem onSelect={() => nav('/app/settings')}><Settings /> {t('nav.settings')}</DropdownItem>
            <DropdownItem onSelect={() => nav('/')}><Store /> {t('nav.home')}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger onSelect={() => { logout(); nav('/login') }}><LogOut /> {t('nav.logout')}</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const loc = useLocation()
  return (
    <div className="relative min-h-screen">
      <Background calm />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] p-3 pr-0 lg:block"><Sidebar /></aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[272px] lg:hidden" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 400, damping: 40 }}>
              <button className="absolute top-4 right-3 z-10 rounded-full p-1.5 text-muted hover:bg-ink/5" onClick={() => setMobileOpen(false)} aria-label="Close"><X className="size-5" /></button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
