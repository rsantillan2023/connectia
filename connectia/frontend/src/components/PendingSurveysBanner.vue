<template>
  <!-- Banner compacto si hay pendientes y el modal ya se cerró -->
  <div
    v-if="showBanner"
    class="pending-banner"
    role="status"
  >
    <div class="pending-banner__text">
      <p class="pending-banner__title">
        {{ pendingSurveyCount === 1 ? 'Tenés 1 encuesta pendiente' : `Tenés ${pendingSurveyCount} encuestas pendientes` }}
      </p>
      <p class="pending-banner__hint">Respondé para completar lo que te pidió tu organización.</p>
    </div>
    <RouterLink class="pending-banner__btn" to="/encuestas" @click="dismissLaunchModal()">
      Ver
    </RouterLink>
    <button
      type="button"
      class="pending-banner__close"
      aria-label="Ocultar aviso"
      title="Ocultar"
      @click="dismissBanner"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  <!-- Modal al iniciar la app -->
  <Teleport to="body">
    <div v-if="showLaunchModal" class="pending-modal-root" role="dialog" aria-modal="true" aria-labelledby="pending-modal-title">
      <button type="button" class="pending-modal-backdrop" aria-label="Cerrar" @click="dismissLaunchModal()" />
      <div class="pending-modal">
        <div class="pending-modal__head">
          <h2 id="pending-modal-title" class="pending-modal__title">Tenés algo pendiente</h2>
          <p class="pending-modal__lead">
            {{ pendingSurveyCount === 1
              ? 'Hay una encuesta esperando tu respuesta.'
              : `Hay ${pendingSurveyCount} encuestas esperando tu respuesta.` }}
          </p>
        </div>
        <ul class="pending-modal__list">
          <li v-for="s in pendingSurveys.slice(0, 5)" :key="s.id">
            <RouterLink :to="s.href" class="pending-modal__link" @click="onOpenSurvey(s)">
              <span class="pending-modal__name">{{ s.titulo }}</span>
              <span v-if="s.descripcion" class="pending-modal__desc">{{ s.descripcion }}</span>
            </RouterLink>
          </li>
        </ul>
        <div class="pending-modal__actions">
          <RouterLink class="pending-modal__primary" to="/encuestas" @click="dismissLaunchModal()">
            Ir a encuestas
          </RouterLink>
          <button type="button" class="pending-modal__ghost" @click="dismissLaunchModal()">
            Más tarde
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePendingSurveys } from '../composables/usePendingSurveys'
import { ensurePushSubscription } from '../composables/usePushSubscribe'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const {
  pendingSurveys,
  pendingSurveyCount,
  notifications,
  showLaunchModal,
  showBanner,
  refresh,
  dismissLaunchModal,
  dismissBanner,
  markRead,
} = usePendingSurveys()

async function onOpenSurvey(s) {
  const related = notifications.value.find((n) => n.refId === s.id)
  if (related?.id) await markRead(related.id)
  dismissLaunchModal()
}

onMounted(async () => {
  if (!auth.isAuthenticated) return
  await refresh()
  // Pedir push después de mostrar pendientes (no bloquea UX)
  ensurePushSubscription().catch(() => {})
})
</script>

<style scoped>
.pending-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 10px 0;
  padding: 10px 8px 10px 12px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
}

.pending-banner__text {
  flex: 1;
  min-width: 0;
}

.pending-banner__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--cx-text);
}

.pending-banner__hint {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--cx-muted);
}

.pending-banner__btn {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: var(--brand-primary);
  text-decoration: none;
}

.pending-banner__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  display: grid;
  place-items: center;
  background: transparent;
  color: var(--cx-muted);
  cursor: pointer;
}

.pending-banner__close:hover,
.pending-banner__close:focus-visible {
  color: var(--cx-text);
  background: color-mix(in srgb, var(--cx-text) 8%, transparent);
}

.pending-modal-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(12px, env(safe-area-inset-top))
    16px
    max(12px, env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.pending-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.45);
}

.pending-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(420px, 100%);
  max-height: min(88dvh, calc(100svh - 24px));
  margin: 0;
  padding: 20px 18px 12px;
  border-radius: 18px;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.28);
  box-sizing: border-box;
  overflow: hidden;
}

.pending-modal__head {
  flex-shrink: 0;
}

.pending-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--cx-text);
}

.pending-modal__lead {
  margin: 6px 0 14px;
  font-size: 13px;
  color: var(--cx-muted);
  line-height: 1.4;
}

.pending-modal__list {
  list-style: none;
  margin: 0;
  padding: 0 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.pending-modal__link {
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  text-decoration: none;
  background: var(--cx-bg, #f8fafc);
}

.pending-modal__name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--cx-text);
  overflow-wrap: anywhere;
}

.pending-modal__desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--cx-muted);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pending-modal__actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding-top: 4px;
}

.pending-modal__primary {
  display: block;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  color: white;
  background: var(--brand-primary);
  text-decoration: none;
}

.pending-modal__ghost {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font-size: 13px;
  padding: 10px;
}
</style>
