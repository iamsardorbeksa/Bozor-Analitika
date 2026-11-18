import { AskPanel } from '@/features/agents/AskPanel'

/** In-app /app/agents: the same ask panel and four-agent run inside the app shell. */
export default function AgentDesk() {
  return (
    <div className="mx-auto max-w-[1160px] pb-10">
      <AskPanel compact showStats={false} agentsHref="/agents" />
    </div>
  )
}
