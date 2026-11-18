import axios from 'axios'

const TOKEN_KEY = 'bozor.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ }
  },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 60_000,
})

api.interceptors.request.use((config) => {
  const t = tokenStore.get()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new Event('bozor:logout'))
    }
    return Promise.reject(err)
  },
)
