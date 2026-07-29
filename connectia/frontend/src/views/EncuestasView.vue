<template>
  <section class="enc">
    <header class="enc-head">
      <h1>Encuestas</h1>
      <p v-if="pending.length">{{ pendingHint }}</p>
      <p v-else>Consultá lo que ya respondiste o esperá nuevas encuestas.</p>
    </header>

    <p v-if="error" class="enc-err" role="alert">{{ error }}</p>

    <div v-if="loading" class="enc-skel" aria-busy="true" aria-label="Cargando encuestas">
      <div v-for="n in 3" :key="n" class="enc-skel-card" />
    </div>

    <template v-else>
      <section v-if="pending.length" class="enc-section" aria-labelledby="enc-pending-title">
        <div class="enc-section-head">
          <h2 id="enc-pending-title">Pendientes</h2>
          <span class="enc-count">{{ pending.length }}</span>
        </div>
        <div class="enc-list">
          <button
            v-for="s in pending"
            :key="s.id"
            type="button"
            class="enc-card enc-card--pending"
            @click="$router.push(`/encuestas/${s.id}`)"
          >
            <span class="enc-card-icon" aria-hidden="true">
              <AppIcon name="clipboard" :size="20" />
            </span>
            <div class="enc-card-body">
              <h3>{{ s.titulo }}</h3>
              <p>
                {{ s.questionCount }} pregunta{{ s.questionCount === 1 ? '' : 's' }}
                <span v-if="scheduleHint(s)"> · {{ scheduleHint(s) }}</span>
              </p>
            </div>
            <span class="enc-card-cta">Responder</span>
          </button>
        </div>
      </section>

      <section v-if="done.length" class="enc-section" aria-labelledby="enc-done-title">
        <div class="enc-section-head">
          <h2 id="enc-done-title">Respondidas</h2>
          <span class="enc-count enc-count--muted">{{ done.length }}</span>
        </div>
        <div class="enc-list">
          <button
            v-for="s in done"
            :key="s.id"
            type="button"
            class="enc-card enc-card--done"
            @click="$router.push(`/encuestas/${s.id}`)"
          >
            <span class="enc-card-icon enc-card-icon--done" aria-hidden="true">
              <AppIcon name="check" :size="20" />
            </span>
            <div class="enc-card-body">
              <h3>{{ s.titulo }}</h3>
              <p>
                {{ s.questionCount }} pregunta{{ s.questionCount === 1 ? '' : 's' }}
                <span v-if="scheduleHint(s)"> · {{ scheduleHint(s) }}</span>
              </p>
            </div>
            <span class="enc-card-cta enc-card-cta--ghost">Ver</span>
          </button>
        </div>
      </section>

      <div v-if="!items.length" class="enc-empty">
        <span class="enc-empty-icon" aria-hidden="true">
          <AppIcon name="clipboard" :size="28" />
        </span>
        <p class="enc-empty-title">No hay encuestas abiertas</p>
        <p class="enc-empty-hint">Cuando tu organización publique una, va a aparecer acá.</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'

const items = ref([])
const loading = ref(true)
const error = ref('')

const pending = computed(() => items.value.filter((s) => !s.answered))
const done = computed(() => items.value.filter((s) => s.answered))
const pendingHint = computed(() => {
  const n = pending.value.length
  return n === 1
    ? 'Tenés 1 encuesta esperando tu respuesta'
    : `Tenés ${n} encuestas esperando tu respuesta`
})

function scheduleHint(s) {
  if (s.endsAt) {
    try {
      return `Hasta ${new Date(s.endsAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })}`
    } catch {
      /* ignore */
    }
  }
  if (s.startsAt) {
    try {
      return `Desde ${new Date(s.startsAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })}`
    } catch {
      /* ignore */
    }
  }
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/surveys')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.enc {
  padding: 16px 16px 32px;
}
.enc-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  color: var(--cx-text);
}
.enc-head p {
  margin: 6px 0 0;
  color: var(--cx-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}
.enc-section {
  margin-top: 20px;
}
.enc-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.enc-section-head h2 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cx-muted);
}
.enc-count {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
  color: var(--brand-primary);
}
.enc-count--muted {
  background: color-mix(in srgb, var(--cx-muted) 16%, transparent);
  color: var(--cx-muted);
}
.enc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.enc-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.enc-card:active {
  transform: scale(0.985);
}
.enc-card--pending {
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.enc-card--done {
  opacity: 0.92;
}
.enc-card-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.enc-card-icon--done {
  background: color-mix(in srgb, var(--cx-ok) 12%, transparent);
  color: var(--cx-ok);
}
.enc-card-body {
  flex: 1;
  min-width: 0;
}
.enc-card-body h3 {
  margin: 0 0 4px;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--cx-text);
  line-height: 1.3;
}
.enc-card-body p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--cx-muted);
  line-height: 1.35;
}
.enc-card-cta {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
}
.enc-card-cta--ghost {
  background: color-mix(in srgb, var(--cx-muted) 12%, transparent);
  color: var(--cx-muted);
}
.enc-skel {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.enc-skel-card {
  height: 76px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 0%,
    color-mix(in srgb, var(--cx-muted) 14%, transparent) 50%,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: enc-shimmer 1.2s ease-in-out infinite;
}
@keyframes enc-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.enc-empty {
  margin-top: 48px;
  text-align: center;
  padding: 0 12px;
}
.enc-empty-icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  color: var(--brand-primary);
}
.enc-empty-title {
  margin: 0;
  font-weight: 700;
  color: var(--cx-text);
}
.enc-empty-hint {
  margin: 6px 0 0;
  font-size: 0.88rem;
  color: var(--cx-muted);
  line-height: 1.4;
}
.enc-err {
  margin: 12px 0 0;
  color: var(--cx-danger);
  font-size: 0.9rem;
}
</style>
