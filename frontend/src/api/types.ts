// Types mirror the FastAPI schemas (backend/app/schemas). Money is UZS as a JSON number.
export type Role = 'buyer' | 'seller' | 'admin'
export type Quality = 'premium' | 'first' | 'standard' | 'economy'
export type OfferStatus = 'active' | 'paused' | 'expired' | 'removed'
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type RequestStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
export type AlertCondition = 'below' | 'above' | 'change_pct' | 'verified_listing'

export interface Page<T> { items: T[]; total: number; page: number; page_size: number; pages: number }

export interface Region { id: string; code: string; name_uz: string; name_ru: string; name_en: string; lat: number; lng: number }
export interface Category { id: string; slug: string; name_uz: string; name_ru: string; name_en: string; icon: string; offer_count?: number }
export interface Product { id: string; slug: string; category_id: string; name_uz: string; name_ru: string; name_en: string; unit: string; image_url: string | null
  /** Product symbol (emoji), rendered with the Noto Color Emoji font */
  emoji: string }

export interface MarketTopOffer { id: string; product_emoji: string; product_name_uz: string; product_name_ru: string; product_name_en: string; unit: string; unit_price: number; supplier: string; verified: boolean }
export interface Market {
  id: string; name: string; region_id: string; type: 'bazaar' | 'wholesale' | 'warehouse'; address: string | null; lat: number; lng: number
  approximate_location: boolean; region_name_uz: string; region_name_ru: string; region_name_en: string
  offer_count: number; supplier_count: number; top_offers: MarketTopOffer[]
}

export interface BusinessBrief { id: string; name: string; verification_status: VerificationStatus }
export interface User {
  id: string; email: string; phone: string | null; full_name: string; role: Role; region_id: string | null
  business_category: string | null; language: 'uz' | 'ru' | 'en'; is_active: boolean; is_demo: boolean; created_at: string
  business: BusinessBrief | null
}
export interface TokenOut { access_token: string; token_type: string; user: User }

export interface SupplierBrief { id: string; name: string; rating: number; verification_status: VerificationStatus; completed_deals: number; phone: string | null }
export interface Offer {
  id: string; title: string; description: string | null; image_url: string | null; unit: string
  unit_price: number; available_qty: number | null; min_order_qty: number; quality: Quality
  delivery_available: boolean; delivery_price: number; delivery_days: number; location_note: string | null
  valid_until: string | null; status: OfferStatus; source: 'seller' | 'demo' | 'field' | 'web'; is_demo: boolean; views_count: number
  /** set for real prices read from a public website (korzinka.uz, olx.uz); stock is then unknown */
  source_site?: string | null; source_url?: string | null
  created_at: string; updated_at: string; product_id: string; region_id: string; market_id: string | null
  business: SupplierBrief; product_name_uz: string; product_name_ru: string; product_name_en: string
  category_slug: string; product_emoji: string; region_name: string; market_name: string | null; is_favorite: boolean
}

export interface OfferInput {
  product_id: string; title: string; description?: string | null; image_url?: string | null; unit: string
  unit_price: number; available_qty: number; min_order_qty: number; quality: Quality
  delivery_available: boolean; delivery_price: number; delivery_days: number
  region_id: string; market_id?: string | null; location_note?: string | null; valid_until?: string | null
}

export interface SeriesPoint { date: string; avg: number; min: number; max: number; count: number }

export interface MarketStats {
  count: number; avg: number | null; min: number | null; max: number | null; median: number | null
  change_7d_pct: number | null; change_30d_pct: number | null; total_qty: number; verified_count: number
  last_updated: string | null; history_days: number; excluded_outliers: number
}

export interface OfferDetail {
  offer: Offer; market_stats: MarketStats; series: SeriesPoint[]
  offer_history: { price: number; recorded_at: string }[]; similar: Offer[]
}

export interface CompareRow {
  offer: Offer; quantity: number; subtotal: number; delivery_cost: number; total_cost: number
  meets_moq: boolean; enough_stock: boolean; score: number
  score_breakdown: { cost: number; quality: number; reliability: number; delivery: number; availability: number }
  /** reason codes, e.g. "lowest_total", "more_expensive:120000", "verified_supplier", "high_rating:4.8",
   *  "quality:premium", "delivery_days:2", "pickup_only", "insufficient_stock", "below_moq:100" */
  reasons: string[]; is_recommended: boolean; is_cheapest: boolean
}
export interface CompareOut {
  product_id: string; quantity: number; rows: CompareRow[]; recommended_offer_id: string | null
  cheapest_offer_id: string | null; savings_vs_average: number | null; note: string
}

export interface Mover {
  product_id: string; slug: string; emoji: string; category_slug: string; offers?: number; name_uz: string; name_ru: string; name_en: string; unit: string
  current_avg: number; previous_avg: number; change_pct: number; spark: number[]
}

export interface RegionalRow {
  region_id: string; region_code: string; region_name_uz: string; region_name_ru: string; region_name_en: string
  lat: number; lng: number; count: number; avg: number | null; min: number | null; max: number | null; median: number | null
  diff_vs_national_pct: number | null; last_updated: string
}

export interface Forecast {
  sufficient: boolean; points: number; min_points: number; method: string | null
  confidence: 'insufficient' | 'low' | 'medium' | 'high'; confidence_score?: number; expected_change_pct?: number
  history: SeriesPoint[]; forecast: { date: string; value: number; lower: number; upper: number }[]
}

export interface SupplyDemand {
  product_id: string; period_days: number
  observed: { active_offers: number; total_available_qty: number; purchase_inquiries: number; offer_views: number; searches: number; inquiry_to_offer_ratio: number | null }
  estimated: { interest_index: number; supply_level: 'none' | 'low' | 'medium' | 'high'; signal: 'demand_gap' | 'undersupplied' | 'oversupplied' | 'balanced'; disclaimer: string }
}
export interface SupplyDemandRow extends SupplyDemand { slug: string; emoji: string; name_uz: string; name_ru: string; name_en: string; unit: string }
export interface DemandGap { product_id: string; slug: string; emoji: string; name_uz: string; name_ru: string; name_en: string; searches: number; active_offers: number }

export interface Overview {
  active_offers: number; active_suppliers: number; products_tracked: number; price_records: number
  demo_offers: number; is_demo_data: boolean; last_updated: string | null; movers: Mover[]
}

export interface BuyerDashboard {
  kpis: { total_offers: number; avg_price: number | null; active_suppliers: number; potential_savings_per_100_units: number; open_requests: number; active_alerts: number }
  movers: Mover[]
  chart_products: { product_id: string; emoji: string; name_uz: string; name_ru: string; name_en: string; series: SeriesPoint[] }[]
  popular: { product_id: string; emoji: string; category_slug: string; name_uz: string; name_ru: string; name_en: string; unit: string; image_url: string | null; views: number; offers: number; min_price: number }[]
  recommended: (Offer & { score: number; reasons: string[] })[]
  recent_activity: Offer[]
  alerts: { id: string; title: string; body: string; link: string | null; created_at: string; is_read: boolean }[]
  is_demo_data: boolean
}

export interface SellerDashboard {
  business: { id: string; name: string; verification_status: VerificationStatus; rating: number; completed_deals: number }
  kpis: { active_products: number; active_offers: number; paused_offers: number; incoming_inquiries: number; total_views: number; views_30d: number; avg_listed_price: number | null; completed_deals: number }
  views_series: { date: string; views: number }[]
  most_viewed: { offer_id: string; title: string; views: number; unit_price: number; unit: string }[]
  competitiveness: {
    offer_id: string; product_id: string; emoji: string; title: string; product_name_uz: string; product_name_ru: string; product_name_en: string; unit: string
    your_price: number; market_avg: number | null; market_min: number | null; market_max: number | null; competitors: number
    diff_vs_avg_pct: number | null; position: 'cheapest' | 'below_avg' | 'above_avg'; views: number; inquiries: number
    demand: SupplyDemand['estimated']
  }[]
  recent_requests: { id: string; status: RequestStatus; buyer: string; product: string | null; quantity: number | null; created_at: string }[]
}

export interface RequestItem { id: string; product_id: string; quantity: number; preferred_price: number | null; product: Product }
export interface PurchaseRequest {
  id: string; status: RequestStatus; requirements: string | null; counter_price: number | null; seller_message: string | null
  created_at: string; updated_at: string; offer_id: string | null; delivery_region_id: string | null; items: RequestItem[]
  buyer_name: string; buyer_phone: string | null; business_id: string; business_name: string
  offer_title: string | null; offer_unit: string | null; offer_unit_price: number | null; estimated_total: number | null
}

export interface Notification { id: string; kind: 'price_alert' | 'request' | 'verification' | 'system' | string; title: string; body: string; link: string | null; is_read: boolean; created_at: string }

export interface PriceAlert {
  id: string; product_id: string; region_id: string | null; condition: AlertCondition; threshold: number | null
  baseline_price: number | null; is_active: boolean; last_triggered_at: string | null; created_at: string
  product: Product; current_price: number | null
}

export interface Favorite { id: string; created_at: string; offer: Offer }

export interface Business {
  id: string; name: string; category: string | null; description: string | null; phone: string | null
  region_id: string | null; market_id: string | null; rating: number; completed_deals: number
  verification_status: VerificationStatus; verified_at: string | null; created_at: string
}
export interface Supplier {
  id: string; name: string; category: string | null; description: string | null; phone: string | null; rating: number
  completed_deals: number; verification_status: VerificationStatus; region: string | null; market: string | null
  active_offers: number; member_since: string
}

export interface ToolCall { name: string; input: Record<string, unknown>; output: Record<string, unknown> & { error?: string } }
export interface AIMessage { id: string; role: 'user' | 'assistant'; content: string; tool_calls: ToolCall[] | null; mode: 'claude' | 'deterministic' | null; created_at: string }
export interface AIChatOut { conversation_id: string; message: AIMessage; ai_available: boolean }
export interface AIStatus { ai_available: boolean; model: string | null; mode: 'claude' | 'deterministic'; tools: string[] }
export interface Conversation { id: string; title: string; created_at: string }

// ---- admin
export interface AdminDashboard {
  kpis: { total_users: number; buyers: number; sellers: number; active_buyers: number; active_sellers: number; verified_sellers: number
    pending_verifications: number; total_offers: number; active_offers: number; purchase_requests: number; open_reports: number }
  by_category: { slug: string; name_uz: string; name_ru: string; name_en: string; offers: number }[]
  by_region: { code: string; name_uz: string; name_ru: string; name_en: string; offers: number; views: number }[]
  signups: { date: string; count: number }[]
  spikes: Mover[]
  demand_gaps: DemandGap[]
}
export interface AdminUser {
  id: string; full_name: string; email: string; phone: string | null; role: Role; is_active: boolean; is_demo: boolean
  region: string | null; created_at: string; last_login_at: string | null
  business: { id: string; name: string; verification_status: VerificationStatus } | null
}
export interface VerificationRequest {
  id: string; status: VerificationStatus; document_note: string | null; review_note: string | null; created_at: string; reviewed_at: string | null
  business: { id: string; name: string; category: string | null; phone: string | null; rating: number; region: string | null; owner: string; email: string; offers: number; created_at: string }
}
export interface AdminOffer extends Offer { median_ratio: number | null; suspicious: boolean; open_reports: number }
export interface OfferReport { id: string; reason: string; details: string | null; status: 'open' | 'resolved' | 'dismissed'; created_at: string; offer: Offer }
export interface AdminCategory { id: string; slug: string; name_uz: string; name_ru: string; name_en: string; icon: string; products: number }
export interface AuditEntry { id: string; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown> | null; actor: string | null; created_at: string }
