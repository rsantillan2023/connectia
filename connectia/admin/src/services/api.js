import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
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

api.interceptors.request.use((config) => {
  // Evita /api/api/... cuando una vista pasa paths con prefijo /api
  const base = String(config.baseURL || api.defaults.baseURL || '')
  let url = String(config.url || '')
  if (/\/api\/?$/i.test(base) && /^\/?api\//i.test(url)) {
    url = url.replace(/^\/?api\//i, '/')
    config.url = url.startsWith('/') ? url : `/${url}`
  }
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

    if (isAuthUrl(url) || config.__skipRefresh) {
      return Promise.reject(error)
    }

    if (status !== 401 || config.__retried) {
      return Promise.reject(error)
    }

    const auth = useAuthStore()
    if (!auth.refreshToken) {
      auth.clearSessionLocal()
      if (router.currentRoute.value?.path !== '/login') {
        router.replace('/login').catch(() => {})
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
      auth.clearSessionLocal()
      if (router.currentRoute.value?.path !== '/login') {
        router.replace('/login').catch(() => {})
      }
      return Promise.reject(error)
    }
  },
)

export default api
