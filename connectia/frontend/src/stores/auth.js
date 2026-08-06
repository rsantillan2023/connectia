import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { useThemeStore } from './theme'
import { applyBrandingCssVars } from '../utils/applyBrandingCssVars'

const REMEMBER_KEY = 'cx_remember'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('cx_access') || '')
  const refreshToken = ref(localStorage.getItem('cx_refresh') || '')
  const user = ref(JSON.parse(localStorage.getItem('cx_user') || 'null'))
  const tenant = ref(JSON.parse(localStorage.getItem('cx_tenant') || 'null'))
  const remember = ref(localStorage.getItem(REMEMBER_KEY) === '1')

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const needsTerms = computed(() => Boolean(user.value?.needsTerms))

  function storage() {
    return remember.value ? localStorage : sessionStorage
  }

  function clearBoth() {
    ;['cx_access', 'cx_refresh', 'cx_user', 'cx_tenant'].forEach((k) => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
  }

  function persist() {
    clearBoth()
    const s = storage()
    s.setItem('cx_access', accessToken.value || '')
    s.setItem('cx_refresh', refreshToken.value || '')
    s.setItem('cx_user', JSON.stringify(user.value))
    s.setItem('cx_tenant', JSON.stringify(tenant.value))
    localStorage.setItem(REMEMBER_KEY, remember.value ? '1' : '0')
  }

  function hydrateFromSession() {
    if (accessToken.value) return
    const a = sessionStorage.getItem('cx_access')
    if (a) {
      accessToken.value = a
      refreshToken.value = sessionStorage.getItem('cx_refresh') || ''
      user.value = JSON.parse(sessionStorage.getItem('cx_user') || 'null')
      tenant.value = JSON.parse(sessionStorage.getItem('cx_tenant') || 'null')
    }
  }
  hydrateFromSession()

  if (tenant.value) {
    queueMicrotask(() => {
      useThemeStore().initFromTenant(tenant.value)
      if (tenant.value?.branding) applyBrandingCssVars(tenant.value.branding)
    })
  }

  function applySession(data, rememberMe = true) {
    remember.value = rememberMe
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    user.value = data.user
    tenant.value = data.tenant
    if (tenant.value?.branding) {
      applyBrandingCssVars(tenant.value.branding)
    }
    useThemeStore().initFromTenant(tenant.value)
    persist()
    return data
  }

  async function preLogin(empCodigo) {
    const { data } = await api.post('/auth/pre-login', { empCodigo })
    return data
  }

  async function resolveTenants(identifier) {
    const { data } = await api.post('/auth/resolve-tenants', { identifier })
    return data
  }

  async function login({ empCodigo, usuario, password, mode = 'password', rememberMe = true }) {
    remember.value = rememberMe
    const { data } = await api.post('/auth/login', { empCodigo, usuario, password, mode })
    if (data.requires2fa) return data
    return applySession(data, rememberMe)
  }

  async function verify2fa({ challengeToken, code, rememberMe = true }) {
    const { data } = await api.post('/auth/2fa/verify', { challengeToken, code })
    return applySession(data, rememberMe)
  }

  async function resend2fa(challengeToken) {
    const { data } = await api.post('/auth/2fa/resend', { challengeToken })
    return data
  }

  async function tokenLogin(token, rememberMe = true) {
    const { data } = await api.post('/auth/token-login', { token })
    if (data.requires2fa) return data
    return applySession(data, rememberMe)
  }

  async function legacyLogin({ empCodigo, token, rememberMe = true }) {
    const { data } = await api.post('/auth/legacy-login', { empCodigo, token })
    if (data.requires2fa) return data
    return applySession(data, rememberMe)
  }

  async function refresh() {
    const { data } = await api.post(
      '/auth/refresh',
      { refreshToken: refreshToken.value },
      { __skipRefresh: true },
    )
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    if (data.user) user.value = { ...user.value, ...data.user }
    if (data.tenant) tenant.value = data.tenant
    persist()
    return data
  }

  async function logout(scope = 'current') {
    const token = accessToken.value
    const refresh = refreshToken.value
    // Limpiar YA (si la API cuelga, el usuario igual sale)
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    tenant.value = null
    clearBoth()
    try {
      sessionStorage.removeItem('cx_splash_played')
      sessionStorage.removeItem('cx_splash_pre')
      sessionStorage.removeItem('cx_splash_post')
    } catch {
      /* ignore */
    }
    if (token) {
      try {
        await api.post(
          '/auth/logout',
          { scope, refreshToken: refresh },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 2500,
            __skipRefresh: true,
          },
        )
      } catch {
        /* ignorar */
      }
    }
  }

  async function acceptTerms(version) {
    const { data } = await api.post('/auth/accept-terms', { version })
    user.value = {
      ...user.value,
      termsAcceptedVersion: data.termsAcceptedVersion,
      needsTerms: false,
    }
    persist()
  }

  /** Actualiza branding/tema del tenant en sesión (p. ej. desde GET /menu). */
  function patchTenant(partial = {}) {
    if (!tenant.value) return
    tenant.value = { ...tenant.value, ...partial }
    if (partial.branding) {
      applyBrandingCssVars({
        ...(tenant.value.branding || {}),
        ...partial.branding,
      })
    }
    persist()
  }

  function patchUser(partial = {}) {
    if (!user.value) {
      user.value = { ...partial }
    } else {
      user.value = { ...user.value, ...partial }
    }
    persist()
  }

  return {
    accessToken,
    refreshToken,
    user,
    tenant,
    remember,
    isAuthenticated,
    needsTerms,
    preLogin,
    resolveTenants,
    login,
    verify2fa,
    resend2fa,
    tokenLogin,
    legacyLogin,
    applySession,
    refresh,
    logout,
    acceptTerms,
    patchTenant,
    patchUser,
  }
})
