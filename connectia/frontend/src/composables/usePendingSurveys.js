import { ref, computed } from 'vue'
import api from '../services/api'
import { useNotifBadge } from './useNotifBadge'

const DISMISS_KEY = 'cx_pending_surveys_dismiss_session'
const BANNER_DISMISS_KEY = 'cx_pending_surveys_banner_dismiss'

const loading = ref(false)
const pendingSurveys = ref([])
const notifications = ref([])
const showLaunchModal = ref(false)
const bannerDismissed = ref(false)
const loaded = ref(false)

export function usePendingSurveys() {
  const { setUnread, refreshBadge, unreadCount: badgeUnread } = useNotifBadge()
  const pendingSurveyCount = computed(() => pendingSurveys.value.length)
  const unreadCount = computed(() => notifications.value.length)
  const showBanner = computed(
    () => pendingSurveyCount.value > 0 && !showLaunchModal.value && !bannerDismissed.value,
  )

  async function refresh() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications/pending')
      pendingSurveys.value = Array.isArray(data?.pendingSurveys) ? data.pendingSurveys : []
      notifications.value = Array.isArray(data?.notifications) ? data.notifications : []
      loaded.value = true
      setUnread(data?.unreadCount ?? notifications.value.length)

      bannerDismissed.value = sessionStorage.getItem(BANNER_DISMISS_KEY) === '1'

      const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
      if (data?.showOnLaunch && pendingSurveys.value.length > 0 && !dismissed) {
        showLaunchModal.value = true
      }
      return data
    } catch {
      pendingSurveys.value = []
      notifications.value = []
      return null
    } finally {
      loading.value = false
    }
  }

  function dismissLaunchModal({ rememberSession = true } = {}) {
    showLaunchModal.value = false
    if (rememberSession) sessionStorage.setItem(DISMISS_KEY, '1')
  }

  function dismissBanner() {
    bannerDismissed.value = true
    sessionStorage.setItem(BANNER_DISMISS_KEY, '1')
  }

  async function markRead(id) {
    try {
      await api.post(`/notifications/${id}/read`)
      notifications.value = notifications.value.filter((n) => n.id !== id)
      setUnread(Math.max(0, badgeUnread.value - 1))
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      notifications.value = []
      setUnread(0)
      refreshBadge()
    } catch {
      /* ignore */
    }
  }

  return {
    loading,
    loaded,
    pendingSurveys,
    notifications,
    pendingSurveyCount,
    unreadCount,
    showLaunchModal,
    showBanner,
    refresh,
    dismissLaunchModal,
    dismissBanner,
    markRead,
    markAllRead,
  }
}
