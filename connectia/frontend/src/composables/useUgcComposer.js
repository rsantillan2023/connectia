import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const open = ref(false)
const toast = ref('')
let toastTimer

export function useUgcComposer() {
  const auth = useAuthStore()

  const ugcEnabled = computed(() => Boolean(auth.tenant?.ugc?.enabled))
  const ugcRequireApproval = computed(() => auth.tenant?.ugc?.requireApproval !== false)

  function openComposer() {
    if (!ugcEnabled.value) return
    open.value = true
  }

  function closeComposer() {
    open.value = false
  }

  function onCreated(post) {
    open.value = false
    toast.value =
      post?.status === 'published'
        ? 'Publicación publicada en el muro.'
        : 'Enviada a revisión. Te avisamos cuando un admin la apruebe.'
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
    }, 4200)
  }

  return {
    open,
    toast,
    ugcEnabled,
    ugcRequireApproval,
    openComposer,
    closeComposer,
    onCreated,
  }
}
