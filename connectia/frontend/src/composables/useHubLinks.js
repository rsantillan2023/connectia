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
    if (Array.isArray(quick)) return quick
    // En muro no inventar botones: solo los configurados como acceso rápido.
    if (surface === 'muro') return []
    return grouped.value[cat] || []
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
      const meta = Object.fromEntries((data.categoryMeta || []).map((c) => [c.nombre, c]))
      const rawCats = data.categories || Object.keys(grouped.value)
      categories.value = [...rawCats].sort((a, b) => {
        const ao = meta[a]?.orden
        const bo = meta[b]?.orden
        if (ao != null || bo != null) {
          return (Number(ao) || 100) - (Number(bo) || 100) || String(a).localeCompare(String(b), 'es')
        }
        return rawCats.indexOf(a) - rawCats.indexOf(b)
      })
      for (const cat of Object.keys(quickByCategory.value)) {
        const list = quickByCategory.value[cat]
        if (!Array.isArray(list)) continue
        quickByCategory.value[cat] = [...list].sort(
          (a, b) =>
            (Number(a.order) || 100) - (Number(b.order) || 100) ||
            String(a.titulo || '').localeCompare(String(b.titulo || ''), 'es'),
        )
      }
      for (const cat of Object.keys(grouped.value)) {
        const list = grouped.value[cat]
        if (!Array.isArray(list)) continue
        grouped.value[cat] = [...list].sort(
          (a, b) =>
            (Number(a.order) || 100) - (Number(b.order) || 100) ||
            String(a.titulo || '').localeCompare(String(b.titulo || ''), 'es'),
        )
      }
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
