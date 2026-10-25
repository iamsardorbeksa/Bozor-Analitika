import { useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingScreen } from './components/LoadingScreen'
import { Landing } from './components/landing/Landing'
import { PrivacyPage } from './components/PrivacyPage'
import { SetupScreen } from './components/SetupScreen'
import { StoryView } from './components/story/StoryView'
import { I18nProvider, useI18n } from './i18n'
import type { ChatStats } from './lib/stats/compute'
import { useChatWorker } from './worker/useChatWorker'

function useHashRoute(): string {
  const read = () => window.location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onHash = () => setRoute(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

function Main() {
  const { t } = useI18n()
  const chat = useChatWorker()
  const { state } = chat
  const route = useHashRoute()
  // Keep the story on screen while it is being recomputed (range / date order changes).
  const [storyStats, setStoryStats] = useState<ChatStats | null>(null)

  const [seenStats, setSeenStats] = useState(state.stats)
  if (state.stats !== seenStats) {
    setSeenStats(state.stats)
    if (state.stats) setStoryStats(state.stats)
  }

  useEffect(() => {
    if (state.status === 'ready' && state.autoGenerate) chat.compute(state.range)
  }, [state.status, state.autoGenerate, state.range, chat])

  const onPrivacy = route === 'privacy'
  const inStory = storyStats !== null
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [onPrivacy, inStory])

  const loadDemo = useCallback(
    async (kind: 'whatsapp' | 'telegram') => {
      const demo = await import('./lib/demo/demoChats')
      const file =
        kind === 'whatsapp'
          ? new File([demo.generateWhatsAppDemo()], 'demo-whatsapp.txt', { type: 'text/plain' })
          : new File([demo.generateTelegramDemo()], 'demo-telegram.json', {
              type: 'application/json',
            })
      chat.load(file, file.name, { isDemo: true, autoGenerate: true })
    },
    [chat],
  )

  const closeStory = useCallback(() => {
    setStoryStats(null)
    if (state.isDemo) chat.reset()
  }, [chat, state.isDemo])

  const busy = state.status === 'loading' || state.status === 'computing'

  if (storyStats && state.info) {
    return (
      <StoryView
        stats={storyStats}
        info={state.info}
        range={state.range}
        busy={busy}
        error={state.status === 'error' && state.error ? t(`error.${state.error}`) : null}
        isDemo={state.isDemo}
        onRangeChange={(r) => chat.compute(r)}
        onDateOrderChange={(o) => chat.setDateOrder(o, true)}
        onClose={closeStory}
      />
    )
  }
  if (busy) return <LoadingScreen phase={state.phase} fraction={state.fraction} />
  if (state.info && state.status !== 'idle') {
    return (
      <SetupScreen
        info={state.info}
        range={state.range}
        error={state.status === 'error' && state.error ? t(`error.${state.error}`) : null}
        onRangeChange={chat.setRange}
        onGenerate={() => chat.compute(state.range)}
        onSelectChat={(i) => chat.selectChat(i)}
        onDateOrderChange={(o) => chat.setDateOrder(o)}
        onBack={chat.reset}
      />
    )
  }
  if (route === 'privacy') return <PrivacyPage />
  return (
    <Landing
      onFile={(file) => chat.load(file, file.name)}
      onDemo={loadDemo}
      error={state.status === 'error' ? state.error : null}
      onDismissError={chat.reset}
    />
  )
}

function SafeMain() {
  const { t } = useI18n()
  return (
    <ErrorBoundary title={t('error.title')} message={t('error.unknown')} action={t('error.reload')}>
      <Main />
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <SafeMain />
    </I18nProvider>
  )
}
