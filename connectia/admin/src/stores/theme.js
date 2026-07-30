import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const PREF_KEY = 'cxa_theme_pref'

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = defineStore('theme', () => {
  /** Política tenant (light|dark|system). En admin no bloquea el toggle. */
  const policy = ref('system')
  /** Preferencia usuario — default oscuro (prototipo Hiryx pantallas). */
  const preference = ref(localStorage.getItem(PREF_KEY) || 'dark')
  const resolved = ref('dark')

  /** En admin siempre se puede cambiar claro/oscuro (pantallas). */
  const canToggle = computed(() => true)
  const label = computed(() => (resolved.value === 'dark' ? 'Oscuro' : 'Claro'))

  function resolve() {
    if (preference.value === 'light' || preference.value === 'dark') return preference.value
    if (policy.value === 'light') return 'light'
    if (policy.value === 'dark') return 'dark'
    return systemDark() ? 'dark' : 'light'
  }

  function apply() {
    resolved.value = resolve()
    document.documentElement.setAttribute('data-theme', resolved.value)
    document.documentElement.style.colorScheme = resolved.value
  }

  function setPolicy(mode) {
    if (['light', 'dark', 'system'].includes(mode)) policy.value = mode
    else policy.value = 'system'
    apply()
  }

  function setPreference(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) return
    preference.value = mode
    localStorage.setItem(PREF_KEY, mode)
    apply()
  }

  function toggle() {
    setPreference(resolved.value === 'dark' ? 'light' : 'dark')
  }

  function initFromTenant(tenant) {
    // No forzar tema del tenant en admin: pantallas usan prototipo (oscuro default + toggle).
    if (tenant?.themeMode && ['light', 'dark', 'system'].includes(tenant.themeMode)) {
      policy.value = tenant.themeMode
    } else {
      policy.value = 'system'
    }
    document.documentElement.style.setProperty('--brand-primary', '#6b5bf0')
    document.documentElement.style.setProperty('--brand-secondary', '#4a37c8')
    apply()
  }

  if (typeof window !== 'undefined') {
    apply()
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (preference.value === 'system') apply()
    })
  }

  return {
    policy,
    preference,
    resolved,
    canToggle,
    label,
    apply,
    setPolicy,
    setPreference,
    toggle,
    initFromTenant,
  }
})
