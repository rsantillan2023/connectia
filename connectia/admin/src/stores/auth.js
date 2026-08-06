import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { useThemeStore } from './theme'
import { hasAdminPanelAccess, isFullAdminUser, userHasCapability } from '../utils/adminCapabilities'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('cxa_access') || '')
  const refreshToken = ref(localStorage.getItem('cxa_refresh') || '')
  const user = ref(JSON.parse(localStorage.getItem('cxa_user') || 'null'))
  const tenant = ref(JSON.parse(localStorage.getItem('cxa_tenant') || 'null'))
  const isAuthenticated = computed(() => Boolean(accessToken.value))

  const isPlatformAdmin = computed(() => {
    const roles = user.value?.roles || []
    const caps = user.value?.capabilities || []
    return roles.includes('platform') || caps.includes('platform.admin')
  })

  const isFullAdmin = computed(() => isFullAdminUser(user.value))

  const canAccessAdmin = computed(() => hasAdminPanelAccess(user.value))

  function can(cap) {
    return userHasCapability(user.value, cap)
  }

  function persist() {
    localStorage.setItem('cxa_access', accessToken.value || '')
    localStorage.setItem('cxa_refresh', refreshToken.value || '')
    localStorage.setItem('cxa_user', JSON.stringify(user.value))
    localStorage.setItem('cxa_tenant', JSON.stringify(tenant.value))
  }

  function clearSessionLocal() {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    tenant.value = null
    ;['cxa_access', 'cxa_refresh', 'cxa_user', 'cxa_tenant'].forEach((k) => {
      localStorage.removeItem(k)
    })
  }

  async function login({ empCodigo, usuario, password }) {
    const { data } = await api.post('/auth/login', { empCodigo, usuario, password })
    if (!hasAdminPanelAccess(data.user)) {
      throw new Error('Este usuario no tiene acceso al admin. Pedile permisos al administrador del tenant.')
    }
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken || ''
    user.value = data.user
    tenant.value = data.tenant
    useThemeStore().initFromTenant(tenant.value)
    persist()
    return data
  }

  async function refresh() {
    const { data } = await api.post(
      '/auth/refresh',
      { refreshToken: refreshToken.value },
      { __skipRefresh: true },
    )
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken || ''
    if (data.user) user.value = { ...user.value, ...data.user }
    persist()
    return data
  }

  async function logout(scope = 'current') {
    const token = accessToken.value
    const refresh = refreshToken.value
    clearSessionLocal()
    if (!token) return
    try {
      await api.post(
        '/auth/logout',
        { scope, refreshToken: refresh },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 1500,
          __skipRefresh: true,
        },
      )
    } catch {
      /* ignorar: la sesión local ya se limpió */
    }
  }

  if (tenant.value) {
    queueMicrotask(() => useThemeStore().initFromTenant(tenant.value))
  }

  return {
    accessToken,
    refreshToken,
    user,
    tenant,
    isAuthenticated,
    isPlatformAdmin,
    isFullAdmin,
    canAccessAdmin,
    can,
    login,
    refresh,
    logout,
    clearSessionLocal,
  }
})
