import { useQuery } from '@tanstack/react-query'
import { Api } from '@/api/endpoints'

const STATIC = { staleTime: 10 * 60_000 }

export const useRegions = () => useQuery({ queryKey: ['regions'], queryFn: Api.regions, ...STATIC })
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: Api.categories, ...STATIC })
export const useProducts = (category?: string) =>
  useQuery({ queryKey: ['products', category ?? 'all'], queryFn: () => Api.products(category), ...STATIC })
export const useMarkets = () => useQuery({ queryKey: ['markets'], queryFn: Api.markets, staleTime: 60_000 })
