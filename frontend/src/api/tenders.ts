/** Buyer requests (tenders) -> producer offers (bids) -> e-signed contracts. Backend: app/api/tenders.py */
import { api } from './client'
import { clean } from './endpoints'
import type { Page, Quality } from './types'

export type TenderStatus = 'open' | 'awarded' | 'contracted' | 'closed' | 'expired'
export type BidStatus = 'submitted' | 'accepted' | 'rejected' | 'withdrawn'
export type ContractStatus = 'awaiting_seller' | 'signed' | 'declined' | 'cancelled'
export type PaymentTerms = 'prepay_100' | 'prepay_50' | 'prepay_30' | 'on_delivery' | 'deferred_15' | 'deferred_30'
export const PAYMENT_TERMS: PaymentTerms[] = ['on_delivery', 'deferred_15', 'deferred_30', 'prepay_30', 'prepay_50', 'prepay_100']

export interface Named { id: string | null; slug: string | null; name_uz: string; name_ru: string; name_en: string; emoji: string | null }

export interface Bid {
  id: string; tender_id: string
  business: { id: string; name: string; rating: number; verified: boolean; completed_deals: number; region: string | null; phone: string | null }
  unit_price: number; delivery_price: number; total: number; lead_time_days: number; ready_date: string
  payment_terms: PaymentTerms; quality: Quality; warranty_months: number; valid_days: number; valid_until: string
  min_quantity: number | null; comment: string | null; status: BidStatus; created_at: string; updated_at: string
  score: number | null; badges: ('cheapest' | 'fastest' | 'recommended')[]; meets_deadline: boolean | null; within_budget: boolean | null
}

export interface Tender {
  id: string; number: string; title: string; description: string | null
  category: Named; product: Named | null; quantity: number; unit: string
  target_price: number | null; estimated_value: number | null; market_price: number | null
  quality: Quality | null; payment_terms: PaymentTerms | null; delivery_required: boolean
  region: Named; delivery_address: string | null; needed_by: string; closes_at: string
  status: TenderStatus; created_at: string; views_count: number; bids_count: number; buyer_label: string
  is_mine: boolean; matches_me: boolean | null; my_bid: Bid | null; contract_id: string | null
}
export interface TenderDetail extends Tender { bids: Bid[] }

export interface TenderInput {
  category: string; product_id?: string | null; title: string; description?: string | null; quantity: number; unit: string
  target_price?: number | null; quality?: Quality | null; payment_terms?: PaymentTerms | null; delivery_required: boolean
  delivery_region_id: string; delivery_address?: string | null; needed_by: string; closes_at: string
}
export interface BidInput {
  unit_price: number; delivery_price: number; lead_time_days: number; payment_terms: PaymentTerms; quality: Quality
  warranty_months: number; valid_days: number; min_quantity?: number | null; comment?: string | null
}

export interface Party {
  name: string; address: string; region: string | null; stir: string; oked: string; bank: string; mfo: string; account: string
  phone: string | null; director: string; signer_title?: string
}
export interface ContractTerms {
  number: string; date: string; city: string; tender_number: string; buyer: Party; seller: Party
  item: { title: string; product_uz: string | null; product_ru: string | null; product_en: string | null; category_uz: string; category_ru: string; category_en: string
    description: string | null; quantity: number; unit: string; quality: Quality; unit_price: number; goods_amount: number }
  delivery: { price: number; included: boolean; address: string; region: string; lead_time_days: number; date: string; needed_by: string }
  payment: { terms: PaymentTerms; prepay_pct: number; prepay_amount: number; rest_amount: number; deferral_days: number }
  total_amount: number; vat_note: string; warranty_months: number; penalty_pct_per_day: number; penalty_cap_pct: number
  seller_conditions: string | null; buyer_extra_terms: string | null; demo: boolean
}
export interface Contract {
  id: string; number: string; status: ContractStatus; tender_id: string; tender_number: string; tender_title: string; bid_id: string
  total_amount: number; terms: ContractTerms
  buyer_signer: string; buyer_signer_title: string; buyer_signed_at: string; buyer_signature: string; buyer_cert: string
  seller_signer: string | null; seller_signer_title: string | null; seller_signed_at: string | null; seller_signature: string | null; seller_cert: string | null
  decline_reason: string | null; created_at: string; updated_at: string; my_role: 'buyer' | 'seller' | 'admin'; counterparty: string
  verification: { buyer_valid: boolean; seller_valid: boolean | null; document_hash: string } | null
}

export interface BoardQuery {
  q?: string; category?: string; region_id?: string; min_qty?: number; max_qty?: number; min_budget?: number; max_budget?: number
  matching?: boolean; hide_mine?: boolean; closing_days?: number; status?: TenderStatus | ''
  sort?: 'newest' | 'closing_soon' | 'needed_soon' | 'qty_asc' | 'qty_desc' | 'budget_asc' | 'budget_desc' | 'value_desc' | 'fewest_bids'
  page?: number; page_size?: number
}

const get = <R>(url: string, params?: object) => api.get<R>(url, { params }).then((r) => r.data)
const post = <R>(url: string, body?: unknown) => api.post<R>(url, body).then((r) => r.data)

export const TendersApi = {
  // buyer
  create: (body: TenderInput) => post<Tender>('/api/tenders', body),
  mine: (status?: TenderStatus) => get<Tender[]>('/api/tenders/mine', clean({ status })),
  detail: (id: string) => get<TenderDetail>(`/api/tenders/${id}`),
  cancel: (id: string) => post<Tender>(`/api/tenders/${id}/cancel`),
  extend: (id: string, closes_at: string) => post<Tender>(`/api/tenders/${id}/extend`, { closes_at }),
  award: (id: string, body: { bid_id: string; buyer_company: string; signer_title: string; delivery_address: string; extra_terms?: string | null; pin: string }) =>
    post<Contract>(`/api/tenders/${id}/award`, body),
  summary: () => get<Record<string, number>>('/api/tenders/summary'),
  // producer
  board: (q: BoardQuery) => get<Page<Tender>>('/api/tenders', clean({ ...q })),
  bid: (id: string, body: BidInput) => post<Bid>(`/api/tenders/${id}/bid`, body),
  withdraw: (id: string) => post<Bid>(`/api/tenders/${id}/bid/withdraw`),
  myBids: (status?: BidStatus) => get<{ bid: Bid; tender: Tender }[]>('/api/bids/mine', clean({ status })),
  // contracts
  contracts: (status?: ContractStatus) => get<Contract[]>('/api/contracts', clean({ status })),
  contract: (id: string) => get<Contract>(`/api/contracts/${id}`),
  sign: (id: string, body: { signer_name: string; signer_title: string; pin: string }) => post<Contract>(`/api/contracts/${id}/sign`, body),
  decline: (id: string, reason: string) => post<Contract>(`/api/contracts/${id}/decline`, { reason }),
  cancelContract: (id: string) => post<Contract>(`/api/contracts/${id}/cancel`),
}
