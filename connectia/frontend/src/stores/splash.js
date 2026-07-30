import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'
import { resolveMediaUrl } from '../utils/media'

const PRE_KEY = 'cx_splash_pre'
const POST_KEY = 'cx_splash_post'

function readFlag(key) {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

/** Normaliza branding.splash + campos legacy */
export function resolveSplashConfig(branding = {}, tenantNombre = '') {
  const s = branding.splash || {}
  const durationRaw =
    s.durationSec === 0 || s.durationSec
      ? Number(s.durationSec)
      : branding.splashDurationSec === 0 || branding.splashDurationSec
        ? Number(branding.splashDurationSec)
        : 2
  const durationSec = Number.isFinite(durationRaw) ? Math.min(30, Math.max(0, durationRaw)) : 2
  const primary = branding.primary || '#0F766E'
  return {
    enabledPreLogin: s.enabledPreLogin !== false,
    enabledPostLogin: s.enabledPostLogin !== false,
    durationSec,
    title: s.title || branding.splashTitle || tenantNombre || 'Connectyx',
    subtitle: s.subtitle || branding.splashSubtitle || 'Tu comunidad',
    logoUrl: resolveMediaUrl(s.logoUrl || branding.logoUrl || ''),
    bgColor: s.bgColor || '',
    bgImageUrl: resolveMediaUrl(s.bgImageUrl || ''),
    textColor: s.textColor || '',
    showLogo: s.showLogo !== false,
    showTitle: s.showTitle !== false,
    showSubtitle: s.showSubtitle !== false,
    primary,
  }
}

export const useSplashStore = defineStore('splash', () => {
  const visible = ref(false)
  const playing = ref(false)
  const active = ref(resolveSplashConfig())

  const title = computed(() => active.value.title)
  const subtitle = computed(() => active.value.subtitle)
  const logoUrl = computed(() => active.value.logoUrl)
  const primary = computed(() => active.value.primary)
  const bgColor = computed(() => active.value.bgColor)
  const bgImageUrl = computed(() => active.value.bgImageUrl)
  const textColor = computed(() => active.value.textColor)
  const showLogo = computed(() => active.value.showLogo)
  const showTitle = computed(() => active.value.showTitle)
  const showSubtitle = computed(() => active.value.showSubtitle)

  function applyFromAuth() {
    const auth = useAuthStore()
    active.value = resolveSplashConfig(auth.tenant?.branding || {}, auth.tenant?.nombre || '')
  }

  /**
   * @param {'pre'|'post'} moment
   * @param {{ force?: boolean, branding?: object, tenantNombre?: string }} opts
   */
  async function play(moment = 'post', opts = {}) {
    if (playing.value) return
    const { force = false, branding, tenantNombre } = opts
    const cfg = branding
      ? resolveSplashConfig(branding, tenantNombre || '')
      : (() => {
          const auth = useAuthStore()
          return resolveSplashConfig(auth.tenant?.branding || {}, auth.tenant?.nombre || '')
        })()

    if (moment === 'pre' && !cfg.enabledPreLogin) return
    if (moment === 'post' && !cfg.enabledPostLogin) return
    if (cfg.durationSec <= 0) return

    const flag = moment === 'pre' ? PRE_KEY : POST_KEY
    if (!force && readFlag(flag)) return

    active.value = cfg
    playing.value = true
    visible.value = true
    try {
      await new Promise((r) => setTimeout(r, cfg.durationSec * 1000))
      writeFlag(flag)
    } finally {
      visible.value = false
      playing.value = false
    }
  }

  function resetSession() {
    try {
      sessionStorage.removeItem(PRE_KEY)
      sessionStorage.removeItem(POST_KEY)
    } catch {
      /* ignore */
    }
  }

  return {
    visible,
    playing,
    title,
    subtitle,
    logoUrl,
    primary,
    bgColor,
    bgImageUrl,
    textColor,
    showLogo,
    showTitle,
    showSubtitle,
    applyFromAuth,
    play,
    resetSession,
  }
})
