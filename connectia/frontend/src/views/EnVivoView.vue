<template>
  <section class="live">
    <header>
      <h1>En vivo</h1>
      <p>Transmisiones de tu comunidad</p>
    </header>

    <p v-if="disabled" class="warn">Live streaming no está activo en esta comunidad.</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="!loading && !disabled && !items.length" class="empty">No hay emisiones programadas o en vivo.</p>

    <article v-if="liveNow" class="card now">
      <span class="badge">LIVE</span>
      <h2>{{ liveNow.title }}</h2>
      <div class="player">
        <iframe
          v-if="embedUrl(liveNow.streamUrl)"
          :src="embedUrl(liveNow.streamUrl)"
          title="Live"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        />
        <a v-else :href="liveNow.streamUrl" target="_blank" rel="noopener">Abrir transmisión</a>
      </div>
    </article>

    <ul class="list">
      <li v-for="item in upcoming" :key="item.id" class="card">
        <h3>{{ item.title }}</h3>
        <p class="meta">{{ statusLabel(item) }} · {{ formatWhen(item.startsAt) }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const liveNow = ref(null)
const loading = ref(true)
const error = ref('')
const disabled = ref(false)

const upcoming = computed(() =>
  items.value.filter((i) => !liveNow.value || i.id !== liveNow.value.id),
)

function embedUrl(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`
  if (/\.m3u8(\?|$)/i.test(url || '')) return ''
  return ''
}

function statusLabel(item) {
  if (item.effectiveStatus === 'live') return 'En vivo'
  if (item.effectiveStatus === 'scheduled') return 'Programado'
  return item.effectiveStatus || item.status
}

function formatWhen(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/live/active')
    items.value = data.items || []
    liveNow.value = data.liveNow || null
    if (liveNow.value?.id) {
      await api.post(`/live/${liveNow.value.id}/view`).catch(() => {})
    }
  } catch (e) {
    if (e?.response?.status === 403) disabled.value = true
    else error.value = e?.response?.data?.error || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.live { padding: 1rem 1.1rem 2rem; max-width: 40rem; margin: 0 auto; }
header h1 { margin: 0 0 0.25rem; font-size: 1.45rem; }
header p { margin: 0 0 1rem; opacity: 0.7; }
.card {
  background: color-mix(in srgb, canvas 92%, canvasText 8%);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}
.now { border: 1px solid #dc2626; }
.badge {
  display: inline-block;
  background: #dc2626;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}
.player { margin-top: 0.75rem; aspect-ratio: 16/9; background: #000; border-radius: 10px; overflow: hidden; }
.player iframe { width: 100%; height: 100%; border: 0; }
.list { list-style: none; padding: 0; margin: 0; }
.meta { opacity: 0.65; font-size: 0.9rem; }
.err { color: #b91c1c; }
.warn { color: #b45309; }
.empty { opacity: 0.65; }
</style>
