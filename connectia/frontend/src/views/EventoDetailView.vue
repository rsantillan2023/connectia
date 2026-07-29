<template>
  <section class="ed">
    <button type="button" class="ed-back" @click="$router.push('/agenda')">← Agenda</button>

    <p v-if="loading" class="ed-muted">Cargando…</p>
    <p v-if="error" class="ed-err" role="alert">{{ error }}</p>

    <template v-if="item && !loading">
      <div v-if="item.imageUrl" class="ed-hero">
        <img :src="item.imageUrl" alt="" />
      </div>

      <div class="ed-body">
        <div class="ed-tags">
          <span class="pill" :style="{ background: item.tipoColor || '#0f766e' }">{{ item.tipoLabel }}</span>
          <span v-if="item.rsvp?.estado" class="pill soft">{{ rsvpLabel }}</span>
        </div>

        <h1>{{ item.titulo }}</h1>
        <p class="ed-when">{{ whenLabel }}</p>
        <p v-if="item.lugar" class="ed-lugar">{{ item.lugar }}</p>
        <a v-if="item.ubicacionUrl" class="ed-link" :href="item.ubicacionUrl" target="_blank" rel="noopener">
          Abrir ubicación
        </a>

        <div class="ed-block">
          <h2>Descripción</h2>
          <p class="ed-text">{{ item.descripcion || 'Sin descripción.' }}</p>
        </div>

        <div v-if="item.media?.length" class="ed-media">
          <a
            v-for="(m, i) in item.media"
            :key="i"
            :href="m.url"
            target="_blank"
            rel="noopener"
            class="ed-media-item"
          >
            {{ m.nombre || m.url }}
          </a>
        </div>

        <p v-if="item.cupo != null" class="ed-cupo">
          Cupo: {{ item.rsvpConfirmados || 0 }} / {{ item.cupo }}
          <span v-if="item.cupoRestante != null">(quedan {{ item.cupoRestante }})</span>
        </p>

        <div class="ed-actions">
          <button
            type="button"
            class="ed-cta"
            :disabled="busy || item.rsvp?.estado === 'confirmado'"
            @click="rsvp('confirmado')"
          >
            {{ item.rsvp?.estado === 'confirmado' ? 'Confirmado' : 'Confirmar asistencia' }}
          </button>
          <button
            type="button"
            class="ed-cta ghost"
            :disabled="busy"
            @click="rsvp('rechazado')"
          >
            No asisto
          </button>
          <button
            v-if="item.rsvp"
            type="button"
            class="ed-cta ghost danger"
            :disabled="busy"
            @click="clearRsvp"
          >
            Eliminar respuesta
          </button>
        </div>

        <p class="ed-hint">Al confirmar, el evento se copia a tu Outlook/Google si están conectados.</p>
        <p v-if="okMsg" class="ed-ok">{{ okMsg }}</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const item = ref(null)
const loading = ref(true)
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const timezone = ref('America/Argentina/Buenos_Aires')

const rsvpLabel = computed(() => {
  if (item.value?.rsvp?.estado === 'confirmado') return 'Vas a asistir'
  if (item.value?.rsvp?.estado === 'rechazado') return 'No asistís'
  return ''
})

const whenLabel = computed(() => {
  if (!item.value?.inicio) return ''
  try {
    const opts = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: item.value.allDay ? undefined : '2-digit',
      minute: item.value.allDay ? undefined : '2-digit',
      timeZone: timezone.value,
    }
    const a = new Intl.DateTimeFormat('es-AR', opts).format(new Date(item.value.inicio))
    if (item.value.allDay) return `${a} · Todo el día`
    const b = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone.value,
    }).format(new Date(item.value.fin))
    return `${a} – ${b}`
  } catch {
    return item.value.inicio
  }
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/events/${route.params.id}`)
    item.value = data.item
    if (data.timezone) timezone.value = data.timezone
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No encontrado'
  } finally {
    loading.value = false
  }
}

async function rsvp(estado) {
  busy.value = true
  okMsg.value = ''
  error.value = ''
  try {
    const { data } = await api.post(`/events/${route.params.id}/rsvp`, {
      estado,
      syncPersonal: true,
    })
    item.value = data.item
    okMsg.value = estado === 'confirmado' ? 'Asistencia confirmada' : 'Respuesta guardada'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function clearRsvp() {
  busy.value = true
  try {
    const { data } = await api.delete(`/events/${route.params.id}/rsvp`)
    if (data.item) item.value = data.item
    else if (item.value) item.value = { ...item.value, rsvp: null }
    okMsg.value = 'Respuesta eliminada'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ed {
  padding: 1rem 1rem 5rem;
  max-width: 560px;
  margin: 0 auto;
}
.ed-back {
  border: 0;
  background: transparent;
  color: #0f766e;
  font: inherit;
  padding: 0;
  margin-bottom: 0.75rem;
  cursor: pointer;
}
.ed-hero {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 0.85rem;
  aspect-ratio: 16/9;
  background: #e2e8f0;
}
.ed-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ed-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.pill {
  font-size: 0.72rem;
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
}
.pill.soft {
  background: #ccfbf1;
  color: #0f766e;
}
h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}
.ed-when,
.ed-lugar {
  margin: 0.15rem 0;
  color: #475569;
  font-size: 0.95rem;
}
.ed-link {
  display: inline-block;
  margin: 0.4rem 0;
  color: #0f766e;
}
.ed-block {
  margin: 1rem 0;
}
.ed-block h2 {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.ed-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
}
.ed-media {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.ed-media-item {
  color: #0f766e;
  font-size: 0.9rem;
}
.ed-cupo {
  font-size: 0.85rem;
  color: #64748b;
}
.ed-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 1rem;
}
.ed-cta {
  border: 0;
  background: #0f766e;
  color: #fff;
  border-radius: 12px;
  padding: 0.75rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.ed-cta:disabled {
  opacity: 0.55;
}
.ed-cta.ghost {
  background: #fff;
  color: #0f766e;
  border: 1px solid #0f766e;
}
.ed-cta.danger {
  color: #b91c1c;
  border-color: #fecaca;
}
.ed-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 0.65rem;
}
.ed-err {
  color: #b91c1c;
}
.ed-ok {
  color: #0f766e;
}
.ed-muted {
  color: #94a3b8;
}
</style>
