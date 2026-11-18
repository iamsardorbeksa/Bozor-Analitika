import { useQuery } from '@tanstack/react-query'
import { Api } from '@/api/endpoints'
import type { Mover } from '@/api/types'

/** Every product's 7-day move (backend caches this). One request feeds hero, ticker and snapshot. */
export function useAllMovers() {
  return useQuery({ queryKey: ['landing', 'movers-all'], queryFn: () => Api.movers(7, 700), staleTime: 120_000 })
}

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: Api.overview, staleTime: 60_000 })

export const STAPLES = ['kartoshka', 'piyoz', 'pomidor', 'sabzi', 'olma', 'guruch']

export function pickBySlug(movers: Mover[] | undefined, slug: string) {
  return movers?.find((m) => m.slug === slug)
}

export const useHistory = (productId?: string, days = 30) =>
  useQuery({ queryKey: ['history', productId, days], queryFn: () => Api.productHistory(productId!, days), enabled: !!productId, staleTime: 120_000 })
