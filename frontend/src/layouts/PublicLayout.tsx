import { ArrowUpRight, LogIn, Menu, Store, X } from 'lucide-react'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Background } from '@/components/brand/Background'
import { LanguageSwitcher } from '@/components/brand/LanguageSwitcher'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { SoundToggle } from '@/components/brand/SoundToggle'
import { SECTIONS } from '@/components/landing/util'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { homeFor, useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

/** The five public sections, shown as a centred segmented pill (BuyAI top bar). */
function useTabs() {
  const { t } = useTranslation()
  return [
    { to: '/', label: t('nav.ask'), end: true },
    { to: '/market', label: t('nav.market') },
    { to: '/insights', label: t('nav.analytics') },
    { to: '/agents', label: t('nav.agents') },
    { to: '/map', label: t('nav.map') },
  ]
}

function Nav() {
  const { t } = useTranslation('landing')
  const { t: tc } = useTranslation()
  const { user } = useAuth()
  const loc = useLocation()
  const isLanding = loc.pathname === '/'
  const tabs = useTabs()
  const [open, setOpen] = React.useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })
  React.useEffect(() => setOpen(false), [loc.pathname, loc.hash])
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sellerTo = user?.role === 'seller' ? '/app/seller' : '/register?role=seller'
  const sellerActive = loc.pathname === '/register' && loc.search.includes('role=seller')
  const links = [
    { href: '/#platform', label: t('nav.platform') },
    { href: '/#insights', label: t('nav.insights') },
    { href: '/#how', label: t('nav.how') },
    { href: '/#business', label: t('nav.business') },
    { href: '/about', label: t('nav.about') },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/55 backdrop-blur-[18px] backdrop-saturate-[1.3]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3 xl:grid-cols-[1fr_auto_1fr] md:px-5">
        <Logo collapse className="col-start-1 row-start-1 justify-self-start" />

        <nav aria-label={tc('nav.primary')}
          className="col-span-2 col-start-1 row-start-2 flex gap-0.5 justify-self-stretch overflow-x-auto rounded-full border border-line bg-ink/5 p-1 [scrollbar-width:none] xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-self-center">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) => cn('relative flex-1 rounded-full px-2 py-[7px] text-center text-[13px] font-semibold sm:px-3 sm:text-[14px] whitespace-nowrap transition-colors xl:flex-none xl:px-[18px] xl:text-[15px]',
                isActive ? 'text-white' : 'text-muted hover:text-ink')}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="public-seg" className="absolute inset-0 rounded-full bg-ink shadow-[0_4px_14px_rgba(17,19,23,.2)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="col-start-2 row-start-1 flex items-center gap-1.5 justify-self-end sm:gap-2 xl:col-start-3">
          <Link to={sellerTo}
            className={cn('inline-flex h-[38px] items-center gap-1.5 rounded-full border px-3 text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(17,19,23,.2)] transition-colors sm:px-3.5',
              sellerActive ? 'border-brand bg-brand' : 'border-ink bg-ink hover:border-brand hover:bg-brand')}>
            <Store className="size-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">{tc('nav.sellerCta')}</span>
          </Link>
          <SoundToggle />
          <LanguageSwitcher />
          {user ? (
            <Link to={homeFor(user.role)} aria-label={tc('nav.openApp')} title={tc('nav.openApp')}
              className="hidden h-[38px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[14px] font-semibold text-ink hover:border-line-strong min-[480px]:inline-flex">
              <span className="hidden lg:inline">{tc('nav.account')}</span><ArrowUpRight className="size-4" />
            </Link>
          ) : (
            <Link to="/login" aria-label={t('nav.signIn')}
              className="hidden h-[38px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[14px] font-semibold text-ink hover:border-line-strong min-[480px]:inline-flex">
              <LogIn className="size-4" /><span className="hidden lg:inline">{t('nav.signIn')}</span>
            </Link>
          )}
          <button className="grid size-[38px] place-items-center rounded-full border border-line bg-white text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)} aria-label={t('nav.menu')} aria-expanded={open}>
            {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>
      {isLanding && (
        <motion.div aria-hidden className="absolute right-0 bottom-0 left-0 h-[2px] origin-left bg-brand" style={{ scaleX: progress }} />
      )}
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="absolute inset-x-3 top-full mt-2 rounded-[22px] border border-white/80 bg-white/92 p-2 shadow-[var(--shadow-pop)] backdrop-blur-xl lg:hidden" aria-label={t('nav.menu')}>
            {links.map((l, i) => (
              <motion.div key={l.href} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link to={l.href} className="block rounded-xl px-4 py-3 text-[16px] font-medium text-ink hover:bg-ink/5">{l.label}</Link>
              </motion.div>
            ))}
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line p-2 pt-3">
              {user ? (
                <Button asChild className="col-span-2"><Link to={homeFor(user.role)}>{tc('nav.openApp')} <ArrowUpRight /></Link></Button>
              ) : (
                <>
                  <Button asChild variant="outline"><Link to="/login">{t('nav.signIn')}</Link></Button>
                  <Button asChild><Link to="/register">{t('nav.getStarted')}</Link></Button>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

/** Desktop section index (right edge): shows where you are and jumps anywhere. */
function SectionRail() {
  const { t } = useTranslation('landing')
  const [active, setActive] = React.useState('top')
  React.useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
    }, { rootMargin: '-45% 0px -50% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
  return (
    <nav aria-label={t('nav.onThisPage')} className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col items-end gap-2.5 2xl:flex">
      {SECTIONS.map((s, i) => {
        const on = active === s.id
        return (
          <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-3" aria-current={on ? 'true' : undefined}>
            <span className={cn('rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] text-white opacity-0 transition-opacity group-hover:opacity-100', on && 'opacity-100')}>
              {String(i).padStart(2, '0')} {t(`nav.sections.${s.key}`)}
            </span>
            <span className={cn('block h-[2px] rounded-full transition-all duration-300', on ? 'w-7 bg-brand' : 'w-3.5 bg-ink/25 group-hover:w-5')} />
          </a>
        )
      })}
    </nav>
  )
}

export function Footer() {
  const { t } = useTranslation('landing')
  const [legal, setLegal] = React.useState<null | 'privacy' | 'terms'>(null)
  const cols = [
    { h: t('footer.platform'), items: [['/market', t('footer.explorer')], ['/insights', t('footer.analytics')], ['/map', t('footer.map')], ['/app/ai', t('footer.ai')]] },
    { h: t('footer.buyers'), items: [['/app/compare', t('footer.compare')], ['/app/alerts', t('footer.alerts')], ['/register', t('nav.getStarted')]] },
    { h: t('footer.sellers'), items: [['/register?role=seller', t('footer.publish')], ['/app/seller/profile', t('footer.verify')]] },
    { h: t('footer.company'), items: [['/about', t('footer.about')], ['/#insights', t('footer.insights')], ['/#faq', t('footer.faq')]] },
  ]
  return (
    <footer className="px-3 pb-3 md:px-5 md:pb-5">
      <div className="glass mx-auto max-w-[1240px] rounded-[28px] border border-white/80 px-5 pt-14 pb-8 shadow-[var(--shadow-card)] md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2.5"><LogoMark /><span className="text-[17px] font-extrabold tracking-[-0.035em] text-ink">Bozor<span className="text-brand">·</span><span className="font-light">Analitika</span></span></div>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
            <p className="mt-6 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">{t('footer.contact')}</p>
            <p className="mt-2 text-sm text-ink-soft">{t('footer.location')}</p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <p className="mb-4 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">{c.h}</p>
              <ul className="space-y-2.5 text-[14px]">{c.items.map(([to, l]) => <li key={to + l}><Link to={to} className="text-ink-soft hover:text-brand-600">{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Bozor-Analitika. {t('footer.rights')}</span>
          <div className="flex gap-5">
            <button onClick={() => setLegal('privacy')} className="hover:text-ink">{t('footer.privacy')}</button>
            <button onClick={() => setLegal('terms')} className="hover:text-ink">{t('footer.terms')}</button>
            <span className="font-mono">UZ · RU · EN</span>
          </div>
        </div>
      </div>
      <Dialog open={!!legal} onOpenChange={(o) => !o && setLegal(null)}>
        {legal && (
          <DialogContent title={t(`footer.${legal}`)}>
            <p className="text-[15px] leading-relaxed text-ink-soft">{t(`footer.${legal}Body`)}</p>
          </DialogContent>
        )}
      </Dialog>
    </footer>
  )
}

export default function PublicLayout() {
  const loc = useLocation()
  const isLanding = loc.pathname === '/'
  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <Nav />
      {isLanding && <SectionRail />}
      <main className="flex-1">
        {isLanding ? <Outlet /> : (
          <div className="mx-auto w-full max-w-[1240px] px-4 pt-8 pb-12 md:px-6 md:pt-10">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><Outlet /></motion.div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
