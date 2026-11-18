import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, homeFor, useAuth } from '@/features/auth/AuthContext'
import AppLayout from '@/layouts/AppLayout'
import PublicLayout from '@/layouts/PublicLayout'

const p = <T,>(f: () => Promise<{ default: T }>) => lazy(f as never)

// public
const Landing = p(() => import('@/pages/public/Landing'))
const Login = p(() => import('@/pages/public/Login'))
const Register = p(() => import('@/pages/public/Register'))
const ForgotPassword = p(() => import('@/pages/public/ForgotPassword'))
const About = p(() => import('@/pages/public/About'))
const NotFound = p(() => import('@/pages/public/NotFound'))
const Agents = p(() => import('@/pages/public/Agents'))
const AgentDesk = p(() => import('@/pages/shared/AgentDesk'))
// buyer + shared market pages
const BuyerOverview = p(() => import('@/pages/buyer/Overview'))
const MarketExplorer = p(() => import('@/pages/buyer/MarketExplorer'))
const OfferDetail = p(() => import('@/pages/buyer/OfferDetail'))
const PriceComparison = p(() => import('@/pages/buyer/PriceComparison'))
const MarketAnalytics = p(() => import('@/pages/buyer/MarketAnalytics'))
const SavedOffers = p(() => import('@/pages/buyer/SavedOffers'))
const PurchaseRequests = p(() => import('@/pages/buyer/PurchaseRequests'))
const Alerts = p(() => import('@/pages/buyer/Alerts'))
const Tenders = p(() => import('@/pages/buyer/Tenders'))
const TenderForm = p(() => import('@/pages/buyer/TenderForm'))
const TenderDetail = p(() => import('@/pages/buyer/TenderDetail'))
const Contracts = p(() => import('@/pages/shared/Contracts'))
const ContractView = p(() => import('@/pages/shared/ContractView'))
const AIAnalyst = p(() => import('@/pages/shared/AIAnalyst'))
const MarketMap = p(() => import('@/pages/shared/MarketMap'))
const Notifications = p(() => import('@/pages/shared/Notifications'))
const Settings = p(() => import('@/pages/shared/Settings'))
// seller
const SellerOverview = p(() => import('@/pages/seller/Overview'))
const SellerProducts = p(() => import('@/pages/seller/Products'))
const ProductForm = p(() => import('@/pages/seller/ProductForm'))
const IncomingRequests = p(() => import('@/pages/seller/IncomingRequests'))
const SalesAnalytics = p(() => import('@/pages/seller/SalesAnalytics'))
const MarketIntelligence = p(() => import('@/pages/seller/MarketIntelligence'))
const BusinessProfile = p(() => import('@/pages/seller/BusinessProfile'))
const TenderBoard = p(() => import('@/pages/seller/TenderBoard'))
const TenderView = p(() => import('@/pages/seller/TenderView'))
const MyBids = p(() => import('@/pages/seller/MyBids'))
// admin
const AdminOverview = p(() => import('@/pages/admin/Overview'))
const AdminUsers = p(() => import('@/pages/admin/Users'))
const AdminVerifications = p(() => import('@/pages/admin/Verifications'))
const AdminProducts = p(() => import('@/pages/admin/Products'))
const AdminOffers = p(() => import('@/pages/admin/Offers'))
const AdminPrices = p(() => import('@/pages/admin/PriceMonitoring'))
const AdminReports = p(() => import('@/pages/admin/Reports'))
const AdminAnalytics = p(() => import('@/pages/admin/PlatformAnalytics'))

const Fallback = () => (
  <div className="grid min-h-[50vh] place-items-center"><div className="size-7 animate-spin rounded-full border-2 border-mint border-t-brand" /></div>
)

function AppIndex() {
  const { user } = useAuth()
  if (user && user.role !== 'buyer') return <Navigate to={homeFor(user.role)} replace />
  return <BuyerOverview />
}

const buyer = (el: ReactNode) => <RequireAuth roles={['buyer']}>{el}</RequireAuth>
const seller = (el: ReactNode) => <RequireAuth roles={['seller']}>{el}</RequireAuth>
const admin = (el: ReactNode) => <RequireAuth roles={['admin']}>{el}</RequireAuth>

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="market" element={<MarketExplorer basePath="/market" />} />
          <Route path="market/:offerId" element={<OfferDetail basePath="/market" />} />
          <Route path="insights" element={<MarketAnalytics />} />
          <Route path="map" element={<MarketMap basePath="/market" />} />
          <Route path="about" element={<About />} />
          <Route path="agents" element={<Agents />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />

        <Route path="app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<AppIndex />} />
          <Route path="market" element={<MarketExplorer basePath="/app/market" />} />
          <Route path="market/:offerId" element={<OfferDetail basePath="/app/market" />} />
          <Route path="compare" element={<PriceComparison />} />
          <Route path="analytics" element={<MarketAnalytics />} />
          <Route path="ai" element={<AIAnalyst />} />
          <Route path="agents" element={<AgentDesk />} />
          <Route path="map" element={<MarketMap basePath="/app/market" />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="saved" element={buyer(<SavedOffers />)} />
          <Route path="requests" element={buyer(<PurchaseRequests />)} />
          <Route path="alerts" element={buyer(<Alerts />)} />
          <Route path="tenders" element={buyer(<Tenders />)} />
          <Route path="tenders/new" element={buyer(<TenderForm />)} />
          <Route path="tenders/:id" element={buyer(<TenderDetail />)} />
          <Route path="contracts" element={<RequireAuth roles={['buyer', 'seller', 'admin']}><Contracts /></RequireAuth>} />
          <Route path="contracts/:id" element={<RequireAuth roles={['buyer', 'seller', 'admin']}><ContractView /></RequireAuth>} />

          <Route path="seller" element={seller(<SellerOverview />)} />
          <Route path="seller/products" element={seller(<SellerProducts />)} />
          <Route path="seller/products/new" element={seller(<ProductForm />)} />
          <Route path="seller/products/:offerId/edit" element={seller(<ProductForm />)} />
          <Route path="seller/requests" element={seller(<IncomingRequests />)} />
          <Route path="seller/analytics" element={seller(<SalesAnalytics />)} />
          <Route path="seller/intelligence" element={seller(<MarketIntelligence />)} />
          <Route path="seller/profile" element={seller(<BusinessProfile />)} />
          <Route path="seller/tenders" element={seller(<TenderBoard />)} />
          <Route path="seller/tenders/:id" element={seller(<TenderView />)} />
          <Route path="seller/bids" element={seller(<MyBids />)} />

          <Route path="admin" element={admin(<AdminOverview />)} />
          <Route path="admin/users" element={admin(<AdminUsers />)} />
          <Route path="admin/verifications" element={admin(<AdminVerifications />)} />
          <Route path="admin/products" element={admin(<AdminProducts />)} />
          <Route path="admin/offers" element={admin(<AdminOffers />)} />
          <Route path="admin/prices" element={admin(<AdminPrices />)} />
          <Route path="admin/reports" element={admin(<AdminReports />)} />
          <Route path="admin/analytics" element={admin(<AdminAnalytics />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
