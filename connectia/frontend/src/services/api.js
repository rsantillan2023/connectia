import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'

const api = axios.create({
  // En dev usamos /api (proxy de Vite) para que el móvil en LAN no pegue a localhost
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

/** Evita tormenta de refresh en paralelo */
let refreshPromise = null

function isAuthUrl(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/pre-login') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  )
}

function clearSessionLocal() {
  const auth = useAuthStore()
  auth.accessToken = ''
  auth.refreshToken = ''
  auth.user = null
  auth.tenant = null
  ;['cx_access', 'cx_refresh', 'cx_user', 'cx_tenant'].forEach((k) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  })
}

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken && !isAuthUrl(config.url || '')) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const config = error.config || {}
    const status = error.response?.status
    const url = config.url || ''

    // Nunca reintentar refresh/login: corta el bucle 401→refresh→401
    if (isAuthUrl(url) || config.__skipRefresh) {
      return Promise.reject(error)
    }

    if (status !== 401 || config.__retried) {
      return Promise.reject(error)
    }

    const auth = useAuthStore()
    if (!auth.refreshToken) {
      clearSessionLocal()
      if (router.currentRoute.value?.name !== 'login') {
        router.replace({ name: 'login' }).catch(() => {})
      }
      return Promise.reject(error)
    }

    config.__retried = true

    try {
      if (!refreshPromise) {
        refreshPromise = auth.refresh().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
      if (!auth.accessToken) {
        throw new Error('sin access tras refresh')
      }
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${auth.accessToken}`
      return api.request(config)
    } catch {
      clearSessionLocal()
      if (router.currentRoute.value?.name !== 'login') {
        router.replace({ name: 'login' }).catch(() => {})
      }
      return Promise.reject(error)
    }
  },
)

export default api
