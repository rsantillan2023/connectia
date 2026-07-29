import { computed, ref } from 'vue'

const DISMISS_KEY = 'cx_install_dismissed_at'
/** Si cerró el aviso, volver a mostrar a los 14 días (patrón habitual) */
const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const deferredPrompt = ref(null)
const installed = ref(false)
const dismissedAt = ref(0)
let listening = false

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function readDismissed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0)
  } catch {
    return 0
  }
}

export function usePwaInstall() {
  const standalone = computed(() => installed.value || isStandalone())

  const canPrompt = computed(() => Boolean(deferredPrompt.value))

  const shouldShow = computed(() => {
    if (standalone.value) return false
    if (!dismissedAt.value) return true
    return Date.now() - dismissedAt.value >= REMIND_AFTER_MS
  })

  function init() {
    if (listening) return
    listening = true
    installed.value = isStandalone()
    dismissedAt.value = readDismissed()

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e
    })

    window.addEventListener('appinstalled', () => {
      installed.value = true
      deferredPrompt.value = null
      try {
        localStorage.removeItem(DISMISS_KEY)
      } catch {
        /* ignore */
      }
    })
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return { outcome: 'unavailable' }
    deferredPrompt.value.prompt()
    let outcome = 'dismissed'
    try {
      const choice = await deferredPrompt.value.userChoice
      outcome = choice?.outcome || 'dismissed'
    } catch {
      /* ignore */
    }
    deferredPrompt.value = null
    if (outcome === 'accepted') installed.value = true
    return { outcome }
  }

  function dismiss() {
    dismissedAt.value = Date.now()
    try {
      localStorage.setItem(DISMISS_KEY, String(dismissedAt.value))
    } catch {
      /* ignore */
    }
  }

  return {
    canPrompt,
    shouldShow,
    standalone,
    init,
    promptInstall,
    dismiss,
  }
}
