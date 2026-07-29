import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Pull-to-refresh sobre un contenedor con scroll (p. ej. `.u-main`).
 * Solo se activa con un dedo y con scrollTop ≈ 0.
 */
export function usePullToRefresh({
  getScrollEl,
  onRefresh,
  threshold = 72,
  maxPull = 120,
} = {}) {
  const pullDistance = ref(0)
  const refreshing = ref(false)
  const pulling = ref(false)

  const progress = computed(() => Math.min(1, pullDistance.value / threshold))
  const ready = computed(() => pullDistance.value >= threshold)

  let startY = 0
  let active = false
  let el = null
  let bindTries = 0

  function resolveEl() {
    el = getScrollEl?.() || null
    return el
  }

  function atTop() {
    const node = el || resolveEl()
    if (!node) return false
    return node.scrollTop <= 2
  }

  function resetPull() {
    pullDistance.value = 0
    pulling.value = false
  }

  function onTouchStart(e) {
    if (refreshing.value || e.touches.length !== 1) return
    resolveEl()
    if (!el || !atTop()) {
      active = false
      return
    }
    startY = e.touches[0].clientY
    active = true
    resetPull()
  }

  function onTouchMove(e) {
    if (!active || refreshing.value || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY

    // Dedo hacia arriba → cancela el gesto de refresh
    if (dy <= 0) {
      resetPull()
      if (dy < -10) active = false
      return
    }

    // Si el scroll ya no está arriba y todavía no arrancamos el pull, abortar
    if (!atTop() && !pulling.value) {
      active = false
      resetPull()
      return
    }

    // Resistencia elástica
    const damped = Math.min(maxPull, dy * 0.5)
    pullDistance.value = damped
    pulling.value = damped > 6

    // Bloquear el scroll del contenedor apenas hay tirón hacia abajo en el tope
    if (damped > 2) {
      e.preventDefault()
    }
  }

  async function onTouchEnd() {
    if (!active) return
    active = false
    const shouldRefresh = ready.value && !refreshing.value
    pulling.value = false
    if (!shouldRefresh) {
      pullDistance.value = 0
      return
    }
    refreshing.value = true
    pullDistance.value = Math.max(48, threshold * 0.7)
    try {
      await onRefresh?.()
      // Volver arriba para ver lo nuevo
      const node = el || resolveEl()
      if (node) node.scrollTop = 0
    } finally {
      refreshing.value = false
      pullDistance.value = 0
    }
  }

  function bind() {
    unbind()
    resolveEl()
    if (!el) {
      if (bindTries < 20) {
        bindTries += 1
        setTimeout(bind, 50)
      }
      return
    }
    bindTries = 0
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
  }

  function unbind() {
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
    el = null
  }

  onMounted(() => {
    requestAnimationFrame(() => bind())
  })
  onBeforeUnmount(unbind)

  return { pullDistance, refreshing, pulling, progress, ready }
}
