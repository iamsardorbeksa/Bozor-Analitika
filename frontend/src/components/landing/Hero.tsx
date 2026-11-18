import { AskPanel } from '@/features/agents/AskPanel'

/**
 * Landing hero = the BuyAI ask panel: say or type a shopping list, four AI agents work it out
 * (Mirzo → Dallol → Tarozibon ota → Xazinachi opa) and the purchase plan appears below, on the same page.
 */
export function Hero() {
  return (
    <section id="top" className="relative px-4 pt-24 pb-10 md:px-8 md:pt-28 lg:pb-16">
      <div className="mx-auto max-w-[1160px]">
        <AskPanel />
      </div>
    </section>
  )
}

export { AskPanel as AgentRunSection }
