<template>
  <section class="aus">
    <button type="button" class="aus-back" @click="$router.push('/ausencias')">← Volver</button>
    <p v-if="loading" class="aus-muted">Cargando…</p>
    <p v-else-if="error" class="aus-err">{{ error }}</p>
    <template v-else-if="item">
      <p class="aus-code">{{ item.codigo }}</p>
      <h1>{{ item.tipoNombre }}</h1>
      <p>{{ item.estadoLabel }} · {{ item.desde }} → {{ item.hasta }} ({{ item.dias }} d)</p>
      <p v-if="item.motivo">{{ item.motivo }}</p>
      <div v-if="item.adjuntos?.length" class="aus-adj">
        <p class="aus-muted">Adjuntos</p>
        <a
          v-for="(a, i) in item.adjuntos"
          :key="i"
          class="aus-adj-link"
          :href="mediaUrl(a.url)"
          target="_blank"
          rel="noopener"
        >
          {{ a.nombre || 'Archivo' }}
        </a>
      </div>
      <p v-if="item.decisionComentario" class="aus-muted">
        Decisión: {{ item.decisionByName }} — {{ item.decisionComentario }}
      </p>
      <p v-if="item.ecrSync && item.ecrSync.status && item.ecrSync.status !== 'none'" class="aus-muted">
        Sync ECR: {{ ecrSyncLabel(item.ecrSync) }}
      </p>
      <button
        v-if="item.estado === 'pendiente'"
        type="button"
        class="aus-ghost"
        :disabled="busy"
        @click="cancel"
      >
        Cancelar
      </button>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const route = useRoute()
const item = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

function mediaUrl(url) {
  return resolveMediaUrl(url)
}

function ecrSyncLabel(sync) {
  const map = {
    synced: 'sincronizado',
    pending: 'pendiente',
    error: 'error',
    deferred: 'diferido',
  }
  const s = map[sync.status] || sync.status
  return sync.note ? `${s} · ${sync.note}` : s
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/ausentismos/${route.params.id}`)
    item.value = data.absence
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No encontrado'
  } finally {
    loading.value = false
  }
}

async function cancel() {
  busy.value = true
  try {
    const { data } = await api.post(`/ausentismos/${route.params.id}/cancel`, {})
    item.value = data.absence
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.aus {
  padding: 1rem 1rem 5rem;
}
.aus-back {
  border: 0;
  background: transparent;
  color: #0f766e;
  padding: 0;
  margin-bottom: 0.75rem;
}
.aus-code {
  color: #64748b;
  font-size: 0.8rem;
}
.aus-ghost {
  margin-top: 1rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
}
.aus-adj {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.35rem;
}
.aus-adj-link {
  color: #0f766e;
  font-size: 0.9rem;
}
.aus-err {
  color: #b91c1c;
}
.aus-muted {
  color: #64748b;
  font-size: 0.85rem;
}
</style>
