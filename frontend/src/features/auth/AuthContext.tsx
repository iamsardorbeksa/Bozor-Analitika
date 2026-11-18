import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { tokenStore } from '@/api/client'
import { Api } from '@/api/endpoints'
import type { Role, User } from '@/api/types'
import i18n from '@/i18n'

interface AuthState {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<User>
  register: (body: Parameters<typeof Api.register>[0]) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
  setUser: (u: User) => void
}

const Ctx = React.createContext<AuthState | null>(null)

export const homeFor = (role: Role) => (role === 'seller' ? '/app/seller' : role === 'admin' ? '/app/admin' : '/app')

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [ready, setReady] = React.useState(false)
  const qc = useQueryClient()

  const refresh = React.useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setReady(true); return }
    try {
      setUser(await Api.me())
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])

  const logout = React.useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.clear()
  }, [qc])

  React.useEffect(() => {
    const h = () => { setUser(null); qc.clear() }
    window.addEventListener('bozor:logout', h)
    return () => window.removeEventListener('bozor:logout', h)
  }, [qc])

  const value = React.useMemo<AuthState>(() => ({
    user, ready, logout, refresh, setUser,
    login: async (email, password) => {
      const r = await Api.login(email, password)
      tokenStore.set(r.access_token)
      qc.clear()
      setUser(r.user)
      return r.user
    },
    register: async (body) => {
      const r = await Api.register(body)
      tokenStore.set(r.access_token)
      setUser(r.user)
      if (body.language) void i18n.changeLanguage(body.language)
      return r.user
    },
  }), [user, ready, logout, refresh, qc])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}

/** Guards a route subtree: requires login, and optionally specific roles. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <div className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-mint border-t-brand" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}
