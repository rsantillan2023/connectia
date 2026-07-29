import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

/**
 * Carga enlaces del hub y abre acciones (navigate / webview / copy / external).
 * @param {{ surface?: 'hub' | 'muro' }} [options]
 */
export function useHubLinks(options = {}) {
  const router = useRouter()
  const surface = options.surface === 'muro' ? 'muro' : 'hub'
  const grouped = ref({})
  const quickByCategory = ref({})
  const categories = ref([])
  const activeCat = ref('')
  const loading = ref(false)
  const error = ref('')
  const toast = ref('')
  const webview = ref(null)
  let toastTimer

  const activeQuick = computed(() => {
    const cat = activeCat.value
    if (!cat) return []
    const quick = quickByCategory.value[cat]
    if (Array.isArray(quick) && quick.length) return quick.slice(0, 3)
    return (grouped.value[cat] || []).slice(0, 3)
  })

  const activeMore = computed(() => {
    const cat = activeCat.value
    if (!cat) return []
    const quickIds = new Set(activeQuick.value.map((l) => l.id))
    return (grouped.value[cat] || []).filter((l) => !quickIds.has(l.id))
  })

  function showToast(msg) {
    toast.value = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
    }, 2200)
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/hub', {
        params: surface === 'muro' ? { for: 'muro' } : undefined,
      })
      grouped.value = data.grouped || {}
      quickByCategory.value = data.quickByCategory || {}
      categories.value = data.categories || Object.keys(grouped.value)
      if (!activeCat.value || !categories.value.includes(activeCat.value)) {
        activeCat.value = categories.value[0] || ''
      }
    } catch (e) {
      error.value = e.response?.data?.error || e.message
    } finally {
      loading.value = false
    }
  }

  async function openLink(l) {
    try {
      const { data } = await api.post(`/hub/${l.id}/click`)
      const action = data.action || (data.openMode === 'internal' ? 'navigate' : 'external')

      if (action === 'copy') {
        await navigator.clipboard.writeText(data.text || '')
        showToast(data.message || 'Copiado')
        return
      }
      if (action === 'webview') {
        webview.value = { url: data.url, title: data.title || l.titulo }
        return
      }
      if (action === 'navigate') {
        const path = data.path || data.url
        if (path?.startsWith('/')) {
          router.push({ path, query: data.query || undefined })
          return
        }
      }
      const url = data.url || l.url || l.target
      if (url) window.open(url, '_blank', 'noopener')
    } catch (e) {
      error.value = e.response?.data?.error || e.message
    }
  }

  function shortTitle(t, max = 16) {
    const s = String(t || '').trim()
    if (s.length <= max) return s
    return `${s.slice(0, max - 1)}…`
  }

  return {
    grouped,
    quickByCategory,
    categories,
    activeCat,
    activeQuick,
    activeMore,
    loading,
    error,
    toast,
    webview,
    load,
    openLink,
    shortTitle,
    showToast,
  }
}
