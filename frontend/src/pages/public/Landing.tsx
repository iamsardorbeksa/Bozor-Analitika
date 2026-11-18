import { MotionConfig } from 'motion/react'
import { AIDemo } from '@/components/landing/AIDemo'
import { Business } from '@/components/landing/Business'
import { Capabilities } from '@/components/landing/Capabilities'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FAQ, FinalCTA, Insights } from '@/components/landing/Insights'
import { MarketSnapshot } from '@/components/landing/MarketSnapshot'
import { Problem } from '@/components/landing/Problem'
import { Regions } from '@/components/landing/Regions'

/**
 * Landing page. Section order follows the buyer's journey: see the market → recognise the
 * problem → how the platform works → what it can do → the AI analyst → regional view →
 * who it's for → learn more → questions → start. All motion respects prefers-reduced-motion.
 */
export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <Hero />
      <MarketSnapshot />
      <Problem />
      <HowItWorks />
      <Capabilities />
      <AIDemo />
      <Regions />
      <Business />
      <Insights />
      <FAQ />
      <FinalCTA />
    </MotionConfig>
  )
}
