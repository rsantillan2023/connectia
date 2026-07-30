import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { translateUi, uiLocaleFromTenant } from '../i18n/modismos'

export function useUiText() {
  const auth = useAuthStore()
  const locale = computed(() => uiLocaleFromTenant(auth.tenant))
  function t(text) {
    return translateUi(text, locale.value)
  }
  return { t, locale }
}
