import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const PREF_KEY = 'cx_theme_pref'

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Política tenant: light | dark | system
 * Preferencia usuario (si system): light | dark | system
 */
export const useThemeStore = defineStore('theme', () => {
  const policy = ref('system')
  const preference = ref(localStorage.getItem(PREF_KEY) || 'system')
  const resolved = ref('light')

  const canToggle = computed(() => policy.value === 'system')
  const label = computed(() => (resolved.value === 'dark' ? 'Oscuro' : 'Claro'))

  function resolve() {
    if (policy.value === 'light') return 'light'
    if (policy.value === 'dark') return 'dark'
    if (preference.value === 'light' || preference.value === 'dark') return preference.value
    return systemDark() ? 'dark' : 'light'
  }

  function apply() {
    resolved.value = resolve()
    document.documentElement.setAttribute('data-theme', resolved.value)
    document.documentElement.style.colorScheme = resolved.value
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved.value === 'dark' ? '#0f172a' : '#0F766E')
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

  /** Alterna claro ↔ oscuro (solo si política = system) */
  function toggle() {
    if (!canToggle.value) return
    setPreference(resolved.value === 'dark' ? 'light' : 'dark')
  }

  function initFromTenant(tenant) {
    setPolicy(tenant?.themeMode || 'system')
  }

  if (typeof window !== 'undefined') {
    apply()
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (policy.value === 'system' && preference.value === 'system') apply()
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
