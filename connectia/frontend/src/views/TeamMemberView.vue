<template>
  <section class="tm" v-if="item">
    <header class="tm-head">
      <button type="button" class="link" @click="$router.push('/mi-equipo')">←</button>
      <h1>{{ item.nombre }}</h1>
    </header>
    <p class="muted">{{ item.cargo || 'Sin cargo' }} · {{ item.email || '—' }}</p>
    <p class="muted">Último login: {{ formatDate(item.lastLoginAt) }}</p>

    <h2>Tareas (si Ola 31)</h2>
    <ul class="list">
      <li v-for="t in activity.tasks" :key="t.id">
        {{ t.titulo }} · {{ t.status }} · {{ t.prioridad }}
      </li>
      <li v-if="!activity.tasks?.length" class="muted">Sin tareas visibles</li>
    </ul>

    <h2>Relevamientos de campo</h2>
    <ul class="list">
      <li v-for="r in activity.relevamientos" :key="r.id">
        {{ r.day }} · {{ r.formTitle }}{{ r.stopLabel ? ` · ${r.stopLabel}` : '' }} · {{ r.status }}
      </li>
      <li v-if="!activity.relevamientos?.length" class="muted">Sin relevamientos (o módulo off)</li>
    </ul>

    <h2>Ausencias</h2>
    <ul class="list">
      <li v-for="a in activity.absences" :key="a.id">
        {{ a.tipo }} · {{ a.estado }} · {{ formatDate(a.desde) }} → {{ formatDate(a.hasta) }}
      </li>
      <li v-if="!activity.absences?.length" class="muted">Sin ausencias</li>
    </ul>

    <h2>Licencias</h2>
    <ul class="list">
      <li v-for="a in activity.licenses" :key="a.id">
        {{ a.tipo || 'Licencia' }} · {{ a.estado }} · {{ formatDate(a.desde) }} → {{ formatDate(a.hasta) }}
      </li>
      <li v-if="!activity.licenses?.length" class="muted">Sin licencias</li>
    </ul>

    <h2>Pubs dirigidas al miembro</h2>
    <ul class="list">
      <li v-for="p in activity.posts" :key="p.id">{{ p.titulo }}</li>
      <li v-if="!activity.posts?.length" class="muted">Sin pubs recientes</li>
    </ul>
    <p v-if="error" class="err">{{ error }}</p>
  </section>
  <p v-else class="muted pad">{{ error || 'Cargando…' }}</p>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const item = ref(null)
const activity = ref({ posts: [], tasks: [] })
const error = ref('')

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/team/members/${route.params.userId}`)
    item.value = data.item
    activity.value = data.activity || { posts: [], tasks: [], absences: [], licenses: [], relevamientos: [] }
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cargar la ficha'
  }
})
</script>

<style scoped>
.tm { padding: 1rem 1rem 5rem; }
.pad { padding: 1rem; }
.tm-head { display: flex; align-items: center; gap: 0.5rem; }
.tm-head h1 { margin: 0; font-size: 1.15rem; }
.link { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.muted { color: #64748b; font-size: 0.85rem; }
h2 { font-size: 1rem; margin: 1.25rem 0 0.5rem; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.list li { background: #f8fafc; border-radius: 8px; padding: 0.55rem 0.75rem; font-size: 0.9rem; }
.err { color: #b91c1c; }
</style>
