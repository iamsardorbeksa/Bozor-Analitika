import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp, BarChart3, Bot, Calculator, Cpu, Database, History, Info, LineChart, MapPinned, MessageSquarePlus, Scale, Search, ShieldCheck, Trash2,
  Square, TrendingUp, User, Users, Volume2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { AIMessage, Conversation } from '@/api/types'
import { EvidenceCard } from '@/components/ai/EvidenceCard'
import { Markdown } from '@/components/ai/Markdown'
import { ThinkingIndicator } from '@/components/ai/Thinking'
import { Badge } from '@/components/market'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { MicButton } from '@/features/voice/MicButton'
import { speak, stopSpeaking, stripForSpeech, useSpeaking } from '@/features/voice/voice'
import { isSoundOn } from '@/hooks/useSound'
import { formatDate, timeAgo } from '@/lib/format'
import { TOOL_NAMES, humanizeAnswer, toolLabel } from '@/lib/humanize'
import { cn, errorMessage } from '@/lib/utils'

const SUGGESTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const
const TOOL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  search_products: Search, compare_offers: Scale, get_price_history: LineChart, get_price_forecast: TrendingUp,
  get_regional_comparison: MapPinned, get_market_statistics: BarChart3, analyze_supply_demand: Database,
  calculate_purchase_cost: Calculator, recommend_suppliers: Users,
}

export default function AIAnalyst(_props: { basePath?: string }) {
  const { t, i18n } = useTranslation(['ai', 'common'])
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [conversationId, setConversationId] = React.useState<string | undefined>()
  const [messages, setMessages] = React.useState<AIMessage[]>([])
  const [loadingConv, setLoadingConv] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [toDelete, setToDelete] = React.useState<Conversation | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textRef = React.useRef<HTMLTextAreaElement>(null)

  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: Api.aiStatus, staleTime: 60_000 })
  const conversations = useQuery({ queryKey: ['ai', 'conversations'], queryFn: Api.aiConversations })

  const chat = useMutation({
    mutationFn: (text: string) => Api.aiChat(text, (i18n.resolvedLanguage ?? 'uz').slice(0, 2), conversationId),
    onMutate: (text) => {
      const tmp: AIMessage = { id: `local-${Date.now()}`, role: 'user', content: text, tool_calls: null, mode: null, created_at: new Date().toISOString() }
      setMessages((m) => [...m, tmp])
      return { tmpId: tmp.id }
    },
    onSuccess: (res) => {
      setConversationId(res.conversation_id)
      setMessages((m) => [...m, res.message])
      // sound on: read the reply aloud (markdown stripped)
      if (isSoundOn()) void speak(stripForSpeech(humanizeAnswer(res.message.content, t)), null, { key: `msg-${res.message.id}` })
      if (res.ai_available !== status.data?.ai_available) void qc.invalidateQueries({ queryKey: ['ai', 'status'] })
      void qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
    onError: (err, text, ctx) => {
      setMessages((m) => m.filter((x) => x.id !== ctx?.tmpId))
      setInput(text)
      toast.error(t('errors.send'), { description: errorMessage(err, t('common:toast.error')) })
    },
  })

  const send = React.useCallback((raw: string) => {
    const text = raw.trim()
    if (!text || chat.isPending) return
    setInput('')
    stopSpeaking()
    chat.mutate(text)
  }, [chat])

  // voice: put the transcript in the box, show it briefly, then send it
  const sendRef = React.useRef(send)
  sendRef.current = send
  const voiceTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(voiceTimer.current), [])
  const onVoiceText = React.useCallback((heard: string) => {
    setInput(heard)
    clearTimeout(voiceTimer.current)
    voiceTimer.current = window.setTimeout(() => sendRef.current(heard), 700)
  }, [])

  // ?q= prefill + auto-send once
  const autoSent = React.useRef(false)
  React.useEffect(() => {
    const q = params.get('q')
    if (!q || autoSent.current) return
    autoSent.current = true
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next, { replace: true })
    send(q)
  }, [params, setParams, send])

  // auto-scroll to newest
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, chat.isPending, loadingConv])

  // grow textarea
  React.useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const openConversation = async (c: Conversation) => {
    setHistoryOpen(false)
    if (c.id === conversationId || chat.isPending) return
    setConversationId(c.id)
    setMessages([])
    setLoadingConv(true)
    try {
      const msgs = await qc.fetchQuery({ queryKey: ['ai', 'conversation', c.id], queryFn: () => Api.aiConversation(c.id), staleTime: 0 })
      setMessages(msgs)
    } catch (e) {
      toast.error(errorMessage(e, t('common:toast.error')))
      setConversationId(undefined)
    } finally {
      setLoadingConv(false)
    }
  }

  const newConversation = () => {
    if (chat.isPending) return
    setConversationId(undefined)
    setMessages([])
    setHistoryOpen(false)
    textRef.current?.focus()
  }

  const del = useMutation({
    mutationFn: (id: string) => Api.aiDeleteConversation(id),
    onSuccess: (_r, id) => {
      toast.success(t('history.deleted'))
      if (id === conversationId) newConversation()
      void qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
      setToDelete(null)
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const sidebar = (
    <ConversationList query={conversations} activeId={conversationId} onOpen={openConversation} onDelete={setToDelete} onNew={newConversation} />
  )

  const aiAvailable = status.data?.ai_available
  // the status endpoint reports `engine` ("gemini" | "claude" | "deterministic"); older backends only `mode`
  const engine = ((status.data as { engine?: string } | undefined)?.engine ?? status.data?.mode ?? 'deterministic') as string

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] gap-4 md:h-[calc(100dvh-9rem)]">
      {/* sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] lg:flex">
        {sidebar}
      </aside>

      {/* main */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-forest text-white"><Bot className="size-[18px]" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{t('title')}</h1>
            <p className="truncate text-xs text-muted">{t('subtitle')}</p>
          </div>
          {status.data && (
            <span className={cn('hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] sm:inline-flex',
              aiAvailable ? 'border-[#cfe8dc] bg-mint-50 text-brand' : 'border-line bg-paper text-ink-soft')}>
              <span className={cn('size-1.5 rounded-full', aiAvailable ? 'bg-emerald' : 'bg-saffron')} />
              {aiAvailable ? t(`mode.${engine === 'gemini' ? 'gemini' : 'claude'}`) : t('mode.deterministic')}
            </span>
          )}
          <Button variant="outline" size="icon-sm" className="lg:hidden" onClick={() => setHistoryOpen(true)} aria-label={t('history.title')}><History /></Button>
          <Button variant="outline" size="sm" onClick={newConversation} disabled={chat.isPending}><MessageSquarePlus /><span className="hidden sm:inline">{t('history.new')}</span></Button>
        </header>

        {status.data && !aiAvailable && (
          <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2 text-[12px] text-ink-soft">
            <Info className="size-3.5 shrink-0 text-muted" />
            <p><span className="font-medium text-ink">{t('banner.title')}</span> {t('banner.body')}</p>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 md:px-6">
            {loadingConv ? (
              <div className="space-y-4">
                <Skeleton className="ml-auto h-10 w-2/3" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="ml-auto h-10 w-1/2" />
              </div>
            ) : messages.length === 0 && !chat.isPending ? (
              <Welcome tools={status.data?.tools ?? []} onPick={send} />
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((m) => <MessageView key={m.id} m={m} />)}
              </AnimatePresence>
            )}
            {chat.isPending && <ThinkingIndicator />}
          </div>
        </div>

        {/* composer */}
        <div className="border-t border-line bg-[#fafbf9] px-3 py-3 md:px-4">
          {messages.length > 0 && !chat.isPending && (
            <div className="mx-auto mb-2 flex max-w-3xl gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {SUGGESTIONS.slice(0, 5).map((k) => (
                <button key={k} onClick={() => send(t(`suggestions.${k}`))}
                  className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] text-ink-soft hover:border-brand hover:text-brand">
                  {t(`suggestions.${k}`)}
                </button>
              ))}
            </div>
          )}
          <form className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-line-strong bg-white p-1.5 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(32,168,120,.15)]"
            onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <textarea ref={textRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} disabled={chat.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) }
              }}
              placeholder={t('composer.placeholder')} aria-label={t('composer.placeholder')}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-[#9aa59f] disabled:opacity-60" />
            <MicButton onText={onVoiceText} size={36} disabled={chat.isPending} className="self-end" />
            <Button type="submit" size="icon" disabled={!input.trim() || chat.isPending} loading={chat.isPending} aria-label={t('composer.send')}>
              {!chat.isPending && <ArrowUp />}
            </Button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10.5px] text-muted">{t('composer.hint')}</p>
        </div>
      </section>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent title={t('history.title')} className="p-0 pt-6">
          <div className="flex max-h-[65vh] flex-col">{sidebar}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent title={t('history.deleteTitle')} description={t('history.deleteBody', { title: toDelete?.title ?? '' })}>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)}>{t('common:actions.cancel')}</Button>
            <Button variant="danger" loading={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}><Trash2 />{t('common:actions.delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------- sidebar
function ConversationList({ query, activeId, onOpen, onDelete, onNew }: {
  query: { data: Conversation[] | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown }
  activeId?: string; onOpen: (c: Conversation) => void; onDelete: (c: Conversation) => void; onNew: () => void
}) {
  const { t } = useTranslation('ai')
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('history.title')}</span>
        <Button variant="ghost" size="icon-sm" onClick={onNew} aria-label={t('history.new')}><MessageSquarePlus /></Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {query.isLoading ? <div className="space-y-2 px-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          : query.isError ? <ErrorState className="mx-2 py-6" onRetry={() => query.refetch()} />
          : !query.data?.length ? <p className="px-3 py-8 text-center text-xs text-muted">{t('history.empty')}</p>
          : query.data.map((c) => (
            <div key={c.id} className={cn('group relative flex items-center rounded-lg', c.id === activeId ? 'bg-mint-50' : 'hover:bg-paper')}>
              {c.id === activeId && <motion.span layoutId="conv-active" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-brand" />}
              <button onClick={() => onOpen(c)} className="min-w-0 flex-1 px-3 py-2 text-left">
                <div className={cn('truncate text-[13px]', c.id === activeId ? 'font-medium text-ink' : 'text-ink-soft')}>{c.title}</div>
                <div className="text-[11px] text-muted">{timeAgo(c.created_at)}</div>
              </button>
              <button onClick={() => onDelete(c)} aria-label={t('history.delete')}
                className="mr-1.5 rounded-md p-1.5 text-muted opacity-100 hover:bg-danger-50 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- messages
function ModeBadge({ mode }: { mode: AIMessage['mode'] | 'gemini' }) {
  const { t } = useTranslation('ai')
  if (!mode) return null
  if (mode === 'gemini') return <Badge tone="dark"><Cpu />{t('mode.gemini')}</Badge>
  return mode === 'claude'
    ? <Badge tone="dark"><Cpu />{t('mode.claude')}</Badge>
    : <Badge tone="outline"><Database />{t('mode.deterministic')}</Badge>
}

function ReadAloud({ id, text }: { id: string; text: string }) {
  const { t } = useTranslation('voice')
  const speaking = useSpeaking()
  const key = `msg-${id}`
  const on = speaking === key
  return (
    <button type="button" onClick={() => (on ? stopSpeaking() : void speak(stripForSpeech(text), null, { key }))}
      className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-paper hover:text-ink', on && 'text-brand')}
      aria-label={on ? t('stopReading') : t('readAloud')} title={on ? t('stopReading') : t('readAloud')}>
      {on ? <Square className="size-3" fill="currentColor" /> : <Volume2 className="size-3.5" />}
    </button>
  )
}

function MessageView({ m }: { m: AIMessage }) {
  const { t } = useTranslation(['ai', 'analytics'])
  const text = React.useMemo(() => (m.role === 'assistant' ? humanizeAnswer(m.content, t) : m.content), [m.content, m.role, t])
  if (m.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-2.5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-forest px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-white">{m.content}</div>
        <div className="hidden size-7 shrink-0 place-items-center rounded-lg bg-mint text-brand sm:grid"><User className="size-3.5" /></div>
      </motion.div>
    )
  }
  const calls = m.tool_calls ?? []
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      <div className="hidden size-7 shrink-0 place-items-center rounded-lg bg-forest text-white sm:grid"><Bot className="size-3.5" /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="font-medium text-ink-soft">{t('analyst')}</span>
          <ModeBadge mode={m.mode as AIMessage['mode'] | 'gemini'} />
          <span title={formatDate(m.created_at, true)}>{timeAgo(m.created_at)}</span>
          <ReadAloud id={m.id} text={text} />
        </div>
        <Markdown text={text} />
        {calls.length > 0 && (
          <div className="mt-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-muted uppercase">
              <ShieldCheck className="size-3.5 text-brand" />{t('ev.title', { count: calls.length })}
            </div>
            <div className="space-y-2.5">
              {calls.map((c, i) => <EvidenceCard key={i} call={c} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------- empty state
function Welcome({ tools, onPick }: { tools: string[]; onPick: (q: string) => void }) {
  const { t } = useTranslation('ai')
  return (
    <div className="py-4">
      <div className="mb-6">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-brand uppercase">{t('welcome.eyebrow')}</div>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{t('welcome.title')}</h2>
        <p className="mt-1.5 max-w-xl text-sm text-muted">{t('welcome.body')}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((k, i) => (
          <motion.button key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => onPick(t(`suggestions.${k}`))}
            className="group flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 text-left text-[13.5px] text-ink-soft transition-colors hover:border-brand hover:bg-mint-50 hover:text-ink">
            <span className="mt-0.5 font-mono text-[11px] text-muted group-hover:text-brand">{String(i + 1).padStart(2, '0')}</span>
            {t(`suggestions.${k}`)}
          </motion.button>
        ))}
      </div>
      {tools.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong p-3.5">
          <div className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('welcome.tools')}</div>
          <div className="flex flex-wrap gap-1.5">
            {tools.filter((x) => (TOOL_NAMES as readonly string[]).includes(x)).map((x) => {
              const Icon = TOOL_ICON[x] ?? Search
              return <span key={x} className="inline-flex items-center gap-1.5 rounded-md bg-paper px-2 py-1 text-[12px] text-ink-soft"><Icon className="size-3.5 text-brand" />{toolLabel(t, x)}</span>
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-muted">{t('welcome.honesty')}</p>
        </div>
      )}
    </div>
  )
}
