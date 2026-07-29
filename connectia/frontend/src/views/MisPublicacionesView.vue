<template>
  <section class="mine">
    <header class="head">
      <button type="button" class="back" aria-label="Volver" @click="router.push('/muro')">
        <AppIcon name="back" :size="20" />
      </button>
      <div>
        <h1>Mis publicaciones</h1>
        <p>Estado de lo que enviaste al muro</p>
      </div>
    </header>

    <p v-if="error" class="banner">{{ error }}</p>
    <div v-if="loading" class="empty">Cargando…</div>

    <article v-for="p in items" :key="p.id" class="card">
      <div class="meta">
        <span class="badge" :data-status="p.status">{{ statusLabel(p.status) }}</span>
        <span class="date">{{ formatDate(p.createdAt) }}</span>
      </div>
      <h2>{{ p.titulo }}</h2>
      <p class="body">{{ p.cuerpo }}</p>
      <p v-if="p.status === 'rejected' && p.rejectionReason" class="reject">
        Motivo: {{ p.rejectionReason }}
      </p>
      <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.titulo" class="thumb" />
    </article>

    <div v-if="!loading && !items.length" class="empty">Todavía no enviaste ninguna publicación.</div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const items = ref([])
const loading = ref(true)
const error = ref('')

function statusLabel(s) {
  return (
    {
      pending_review: 'En revisión',
      published: 'En el muro',
      rejected: 'Rechazada',
      draft: 'Borrador',
    }[s] || s
  )
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/posts/mine')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar tus publicaciones'
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mine {
  padding: 12px 14px 28px;
  display: grid;
  gap: 12px;
}
.head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.head h1 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}
.head p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
}
.back {
  border: 0;
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  color: var(--brand-primary);
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.banner {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  background: #fff7ed;
  color: #9a3412;
}
.empty {
  padding: 36px 12px;
  text-align: center;
  color: var(--cx-muted);
  font-size: 14px;
}
.card {
  border: 1px solid var(--cx-border);
  border-radius: 16px;
  padding: 12px;
  background: var(--cx-surface);
}
.meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 9px;
}
.badge[data-status='pending_review'] {
  background: color-mix(in srgb, #ca8a04 18%, transparent);
  color: #a16207;
}
.badge[data-status='published'] {
  background: color-mix(in srgb, #0f766e 16%, transparent);
  color: #0f766e;
}
.badge[data-status='rejected'] {
  background: color-mix(in srgb, #dc2626 14%, transparent);
  color: #b91c1c;
}
.date {
  font-size: 11px;
  color: var(--cx-muted);
}
.card h2 {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 700;
}
.body {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  white-space: pre-wrap;
}
.reject {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b91c1c;
}
.thumb {
  margin-top: 10px;
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 12px;
}
</style>
