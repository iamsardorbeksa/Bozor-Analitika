import { api } from './client'
import type * as T from './types'

const get = <R>(url: string, params?: object) => api.get<R>(url, { params }).then((r) => r.data)
const post = <R>(url: string, body?: unknown) => api.post<R>(url, body).then((r) => r.data)
const patch = <R>(url: string, body?: unknown) => api.patch<R>(url, body).then((r) => r.data)
const del = <R>(url: string) => api.delete<R>(url).then((r) => r.data)

/** Drop empty values so they aren't sent as query params. */
export const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false))

export interface OfferQuery {
  q?: string; category?: string; product_id?: string; region_id?: string; market_id?: string
  min_price?: number; max_price?: number; min_qty?: number; quality?: T.Quality
  verified_only?: boolean; delivery_only?: boolean
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'qty_desc' | 'popular'; page?: number; page_size?: number
}

export const Api = {
  // auth
  login: (email: string, password: string) => post<T.TokenOut>('/api/auth/login', { email, password }),
  register: (body: {
    full_name: string; email: string; phone: string; password: string; role: 'buyer' | 'seller'
    business_name?: string; region_id: string; business_category?: string; language: string
  }) => post<T.TokenOut>('/api/auth/register', body),
  forgotPassword: (email: string) => post<{ message: string }>('/api/auth/forgot-password', { email }),
  me: () => get<T.User>('/api/auth/me'),
  updateMe: (body: Partial<Pick<T.User, 'full_name' | 'phone' | 'region_id' | 'language' | 'business_category'>>) => patch<T.User>('/api/auth/me', body),
  changePassword: (current_password: string, new_password: string) => post<{ message: string }>('/api/auth/change-password', { current_password, new_password }),

  // catalog
  regions: () => get<T.Region[]>('/api/regions'),
  categories: () => get<T.Category[]>('/api/categories'),
  products: (category?: string) => get<T.Product[]>('/api/products', clean({ category })),
  markets: () => get<T.Market[]>('/api/markets'),
  supplier: (id: string) => get<T.Supplier>(`/api/suppliers/${id}`),

  // offers
  offers: (q: OfferQuery) => get<T.Page<T.Offer>>('/api/offers', clean({ ...q })),
  offer: (id: string) => get<T.OfferDetail>(`/api/offers/${id}`),
  compare: (product_id: string, quantity: number, region_id?: string, verified_only?: boolean) =>
    get<T.CompareOut>('/api/offers/compare', clean({ product_id, quantity, region_id, verified_only })),
  reportOffer: (id: string, reason: 'price_suspicious' | 'fake_seller' | 'wrong_info' | 'other', details?: string) =>
    post<{ message: string }>(`/api/offers/${id}/report`, { reason, details }),

  // seller offers
  myOffers: (q: { q?: string; status?: T.OfferStatus; sort?: string; page?: number; page_size?: number } = {}) =>
    get<T.Page<T.Offer>>('/api/offers/mine', clean({ ...q })),
  createOffer: (body: T.OfferInput) => post<T.Offer>('/api/offers', body),
  updateOffer: (id: string, body: Partial<T.OfferInput>) => patch<T.Offer>(`/api/offers/${id}`, body),
  setOfferStatus: (id: string, status: 'active' | 'paused') => post<T.Offer>(`/api/offers/${id}/status`, { status }),
  deleteOffer: (id: string) => del<{ message: string }>(`/api/offers/${id}`),
  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ url: string }>('/api/uploads/image', fd).then((r) => r.data)
  },
  myBusiness: () => get<T.Business>('/api/businesses/me'),
  updateBusiness: (body: Partial<Pick<T.Business, 'name' | 'category' | 'description' | 'phone' | 'region_id' | 'market_id'>>) =>
    patch<T.Business>('/api/businesses/me', body),
  verificationHistory: () =>
    get<{ id: string; status: T.VerificationStatus; document_note: string | null; review_note: string | null; created_at: string; reviewed_at: string | null }[]>(
      '/api/businesses/me/verification'),
  requestVerification: (document_note: string) => post<{ message: string }>('/api/businesses/me/verification', { document_note }),

  // analytics
  overview: () => get<T.Overview>('/api/analytics/overview'),
  movers: (days = 7, limit = 10, category?: string) => get<T.Mover[]>('/api/analytics/movers', clean({ days, limit, category })),
  productStats: (id: string, region_id?: string) => get<T.MarketStats>(`/api/analytics/products/${id}/stats`, clean({ region_id })),
  productHistory: (id: string, days = 30, region_id?: string) =>
    get<{ series: T.SeriesPoint[]; change_pct: number | null }>(`/api/analytics/products/${id}/history`, clean({ days, region_id })),
  productRegional: (id: string) => get<T.RegionalRow[]>(`/api/analytics/products/${id}/regional`),
  productForecast: (id: string, horizon = 7) => get<T.Forecast>(`/api/analytics/products/${id}/forecast`, { horizon }),
  productSupplyDemand: (id: string) => get<T.SupplyDemand>(`/api/analytics/products/${id}/supply-demand`),
  supplyDemand: () => get<{ rows: T.SupplyDemandRow[]; demand_gaps: T.DemandGap[] }>('/api/analytics/supply-demand'),
  buyerDashboard: () => get<T.BuyerDashboard>('/api/analytics/buyer-dashboard'),
  sellerDashboard: () => get<T.SellerDashboard>('/api/analytics/seller-dashboard'),

  // AI
  aiStatus: () => get<T.AIStatus>('/api/ai/status'),
  aiChat: (message: string, language: string, conversation_id?: string) =>
    post<T.AIChatOut>('/api/ai/chat', clean({ message, language, conversation_id })),
  aiConversations: () => get<T.Conversation[]>('/api/ai/conversations'),
  aiConversation: (id: string) => get<T.AIMessage[]>(`/api/ai/conversations/${id}`),
  aiDeleteConversation: (id: string) => del<{ message: string }>(`/api/ai/conversations/${id}`),

  // buyer
  favorites: () => get<T.Favorite[]>('/api/favorites'),
  addFavorite: (offerId: string) => post<{ message: string }>(`/api/favorites/${offerId}`),
  removeFavorite: (offerId: string) => del<{ message: string }>(`/api/favorites/${offerId}`),
  requests: (status?: T.RequestStatus) => get<T.PurchaseRequest[]>('/api/requests', clean({ status })),
  createRequest: (body: { offer_id: string; quantity: number; preferred_price?: number; delivery_region_id?: string; requirements?: string }) =>
    post<T.PurchaseRequest>('/api/requests', clean(body)),
  requestAction: (id: string, action: 'accept' | 'reject' | 'counter' | 'complete' | 'cancel', extra: { counter_price?: number; message?: string } = {}) =>
    post<T.PurchaseRequest>(`/api/requests/${id}/action`, clean({ action, ...extra })),
  notifications: (unread_only = false) => get<T.Notification[]>('/api/notifications', clean({ unread_only })),
  unreadCount: () => get<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => post<{ message: string }>(`/api/notifications/${id}/read`),
  markAllRead: () => post<{ message: string }>('/api/notifications/read-all'),
  alerts: () => get<T.PriceAlert[]>('/api/alerts'),
  createAlert: (body: { product_id: string; region_id?: string | null; condition: T.AlertCondition; threshold?: number | null }) =>
    post<T.PriceAlert>('/api/alerts', body),
  updateAlert: (id: string, body: Partial<{ region_id: string | null; condition: T.AlertCondition; threshold: number | null; is_active: boolean }>) =>
    patch<T.PriceAlert>(`/api/alerts/${id}`, body),
  deleteAlert: (id: string) => del<{ message: string }>(`/api/alerts/${id}`),
  checkAlerts: () => post<{ triggered: number }>('/api/alerts/check'),

  // admin
  adminDashboard: () => get<T.AdminDashboard>('/api/admin/dashboard'),
  adminUsers: (q: { q?: string; role?: T.Role; is_active?: boolean; page?: number; page_size?: number }) =>
    get<T.Page<T.AdminUser>>('/api/admin/users', clean({ ...q })),
  adminSetActive: (id: string, is_active: boolean) => post<{ message: string }>(`/api/admin/users/${id}/active`, { is_active }),
  adminVerifications: (status?: T.VerificationStatus | '') => get<T.VerificationRequest[]>('/api/admin/verifications', { status: status ?? 'pending' }),
  adminApprove: (id: string, note?: string) => post<{ message: string }>(`/api/admin/verifications/${id}/approve`, { note }),
  adminReject: (id: string, note?: string) => post<{ message: string }>(`/api/admin/verifications/${id}/reject`, { note }),
  adminOffers: (q: { q?: string; status?: T.OfferStatus; flagged?: boolean; page?: number; page_size?: number }) =>
    get<T.Page<T.AdminOffer>>('/api/admin/offers', clean({ ...q })),
  adminRemoveOffer: (id: string, note?: string) => post<{ message: string }>(`/api/admin/offers/${id}/remove`, { note }),
  adminRestoreOffer: (id: string) => post<{ message: string }>(`/api/admin/offers/${id}/restore`),
  adminReports: (status?: 'open' | 'resolved' | 'dismissed' | '') => get<T.OfferReport[]>('/api/admin/reports', { status: status ?? 'open' }),
  adminResolveReport: (id: string, status: 'resolved' | 'dismissed', remove_offer = false) =>
    post<{ message: string }>(`/api/admin/reports/${id}/resolve`, { status, remove_offer }),
  adminCategories: () => get<T.AdminCategory[]>('/api/admin/categories'),
  adminCreateCategory: (body: Omit<T.AdminCategory, 'id' | 'products'>) => post<{ message: string }>('/api/admin/categories', body),
  adminUpdateCategory: (id: string, body: Omit<T.AdminCategory, 'id' | 'products'>) => patch<{ message: string }>(`/api/admin/categories/${id}`, body),
  adminPriceMonitoring: () => get<{ movers: T.Mover[]; spikes: T.Mover[]; supply: T.SupplyDemandRow[] }>('/api/admin/price-monitoring'),
  adminAuditLogs: (limit = 100) => get<T.AuditEntry[]>('/api/admin/audit-logs', { limit }),
}
