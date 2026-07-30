<template>
  <section class="conocimiento">
    <header class="conocimiento-head">
      <h1>Conocimiento</h1>
      <p>Publicaciones marcadas como biblioteca de conocimiento de la comunidad.</p>
    </header>
    <p v-if="error" class="banner">{{ error }}</p>
    <div v-if="loading && !items.length" class="empty">Cargando…</div>
    <div v-else-if="!items.length" class="empty">Todavía no hay piezas de conocimiento publicadas.</div>
    <ul v-else class="list">
      <li v-for="p in items" :key="p.id">
        <button type="button" class="card" @click="open(p)">
          <img v-if="cover(p)" :src="cover(p)" alt="" class="thumb" />
          <div class="body">
            <span v-if="p.section" class="section">{{ p.section }}</span>
            <strong>{{ p.titulo }}</strong>
            <small>{{ excerpt(p.cuerpo) }}</small>
          </div>
        </button>
      </li>
    </ul>
    <button v-if="hasMore" type="button" class="more" :disabled="loadingMore" @click="loadMore">
      {{ loadingMore ? 'Cargando…' : 'Ver más' }}
    </button>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const router = useRouter()
const items = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const hasMore = ref(false)
const size = 12

function cover(p) {
  return resolveMediaUrl(p.imageUrl || p.imageUrls?.[0] || '')
}

function excerpt(t) {
  const s = String(t || '').replace(/<[^>]+>/g, ' ').trim()
  return s.length > 120 ? `${s.slice(0, 117)}…` : s
}

function open(p) {
  router.push(`/muro/${p.id}`)
}

async function fetchPage(p, append) {
  const { data } = await api.get('/posts/feed', {
    params: { page: p, size, knowledge: 1 },
  })
  const next = Array.isArray(data?.items) ? data.items : []
  total.value = Number(data?.total) || next.length
  items.value = append ? [...items.value, ...next] : next
  hasMore.value = items.value.length < total.value
}

async function load() {
  loading.value = true
  error.value = ''
  page.value = 1
  try {
    await fetchPage(1, false)
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cargar el conocimiento'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    page.value += 1
    await fetchPage(page.value, true)
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar más'
    page.value -= 1
  } finally {
    loadingMore.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.conocimiento {
  padding: 8px 4px 24px;
}
.conocimiento-head h1 {
  margin: 0 0 4px;
  font-size: 1.25rem;
}
.conocimiento-head p {
  margin: 0 0 14px;
  color: var(--u-muted, #64748b);
  font-size: 0.9rem;
}
.banner {
  background: #fef2f2;
  color: #991b1b;
  padding: 10px 12px;
  border-radius: 10px;
}
.empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--u-muted, #64748b);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.card {
  width: 100%;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  text-align: left;
  border: 1px solid var(--u-border, #e2e8f0);
  background: var(--u-surface, #fff);
  border-radius: 14px;
  padding: 10px;
  cursor: pointer;
}
.thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
  background: #e2e8f0;
}
.body {
  display: grid;
  gap: 4px;
  align-content: start;
}
.section {
  font-size: 11px;
  color: #0f766e;
  font-weight: 600;
  text-transform: uppercase;
}
.body strong {
  font-size: 0.95rem;
}
.body small {
  color: var(--u-muted, #64748b);
  line-height: 1.35;
}
.more {
  margin-top: 14px;
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 12px;
  background: #0f766e;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.more:disabled {
  opacity: 0.6;
}
</style>
