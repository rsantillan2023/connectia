import { ref, computed, watch } from 'vue'
import { isMuroFeedPath } from '../utils/muroFeed'

const expanded = ref(false)
const hasLinks = ref(false)

/**
 * Estado compartido: franja de enlaces del muro (colapsable) + botón del header.
 */
export function useMuroHubStrip() {
  const isOpen = computed(() => expanded.value)

  function open() {
    expanded.value = true
  }

  function close() {
    expanded.value = false
  }

  function toggle() {
    expanded.value = !expanded.value
  }

  function setHasLinks(v) {
    hasLinks.value = Boolean(v)
  }

  /** Al salir del feed del muro (clásico o portal), volver a colapsar. */
  function bindRouteCollapse(route) {
    return watch(
      () => route.path,
      (p) => {
        if (!isMuroFeedPath(p)) expanded.value = false
      },
    )
  }

  return {
    expanded,
    isOpen,
    hasLinks,
    open,
    close,
    toggle,
    setHasLinks,
    bindRouteCollapse,
  }
}
