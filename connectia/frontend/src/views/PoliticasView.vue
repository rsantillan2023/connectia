<template>
  <section class="pol">
    <header class="pol-head">
      <h1>Políticas</h1>
      <p v-if="pendingCount">Tenés {{ pendingCount }} política(s) pendiente(s) de aceptación.</p>
      <p v-else>Biblioteca de políticas corporativas de tu comunidad.</p>
    </header>

    <div class="pol-toolbar">
      <input
        v-model="q"
        type="search"
        class="pol-search"
        placeholder="Buscar políticas…"
        @keyup.enter="load"
      />
      <button type="button" class="pol-btn" @click="load">Buscar</button>
    </div>

    <label class="pol-check">
      <input v-model="pendingOnly" type="checkbox" @change="load" />
      Solo pendientes de acuse
    </label>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando…</p>

    <ul v-if="!loading" class="pol-list">
      <li v-for="p in items" :key="p.id">
        <button type="button" class="pol-card" @click="$router.push(`/politicas/${p.id}`)">
          <div class="pol-card-top">
            <strong>{{ p.titulo }}</strong>
            <span v-if="p.pendingAck" class="badge warn">Pendiente</span>
            <span v-else-if="p.ackedByMe" class="badge ok">Aceptada</span>
          </div>
          <p>{{ p.resumen || p.category }} · v{{ p.version }}</p>
        </button>
      </li>
    </ul>
    <p v-if="!loading && !items.length" class="muted center">No hay políticas para mostrar.</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const pendingCount = ref(0)
const q = ref('')
const pendingOnly = ref(false)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (pendingOnly.value) params.pending = '1'
    const { data } = await api.get('/policies', { params })
    items.value = data.items || []
    pendingCount.value = data.pendingCount || 0
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las políticas'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.pol {
  padding: 16px 16px 88px;
  max-width: 720px;
  margin: 0 auto;
}
.pol-head h1 {
  margin: 0 0 4px;
  font-size: 1.45rem;
}
.pol-head p {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}
.pol-toolbar {
  display: flex;
  gap: 8px;
  margin: 14px 0 10px;
}
.pol-search {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
}
.pol-btn {
  border: none;
  background: #0f766e;
  color: #fff;
  border-radius: 12px;
  padding: 0 14px;
  font-weight: 600;
}
.pol-check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
  margin-bottom: 12px;
}
.pol-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.pol-card {
  width: 100%;
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}
.pol-card-top {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.pol-card-top strong {
  flex: 1;
}
.pol-card p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.88rem;
}
.badge {
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 8px;
}
.badge.warn {
  background: #fef3c7;
  color: #92400e;
}
.badge.ok {
  background: #d1fae5;
  color: #065f46;
}
.err {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}
.center {
  text-align: center;
  margin-top: 24px;
}
</style>
