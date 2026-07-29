import { ref, computed } from 'vue'
import api from '../services/api'

const unreadCount = ref(0)
let inflight = null

export function useNotifBadge() {
  const hasUnread = computed(() => unreadCount.value > 0)
  const badgeLabel = computed(() => {
    const n = unreadCount.value
    if (n <= 0) return ''
    return n > 99 ? '99+' : String(n)
  })

  function setUnread(n) {
    unreadCount.value = Math.max(0, Number(n) || 0)
  }

  async function refreshBadge() {
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const { data } = await api.get('/notifications/unread-count', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        setUnread(data?.unreadCount)
      } catch {
        /* ignore */
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  return {
    unreadCount,
    hasUnread,
    badgeLabel,
    setUnread,
    refreshBadge,
  }
}
