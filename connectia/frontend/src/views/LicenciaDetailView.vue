<template>
  <section class="lic">
    <button type="button" class="lic-back" @click="$router.push('/licencias')">← Volver</button>
    <p v-if="loading" class="lic-muted">Cargando…</p>
    <p v-else-if="error" class="lic-err">{{ error }}</p>
    <template v-else-if="item">
      <header class="lic-head">
        <div>
          <p class="lic-code">{{ item.codigo }}</p>
          <h1>{{ item.tipoNombre }}</h1>
          <span class="lic-estado" :data-estado="item.estado">{{ item.estadoLabel }}</span>
        </div>
      </header>
      <dl class="lic-grid">
        <div><dt>Desde</dt><dd>{{ item.desde }}</dd></div>
        <div><dt>Hasta</dt><dd>{{ item.hasta }}</dd></div>
        <div><dt>Días</dt><dd>{{ item.dias }}</dd></div>
        <div v-if="item.saldoAntes != null"><dt>Saldo al pedir</dt><dd>{{ item.saldoAntes }}</dd></div>
      </dl>
      <p v-if="item.motivo" class="lic-motivo">{{ item.motivo }}</p>
      <div v-if="item.adjuntos?.length" class="lic-adj">
        <p class="lic-meta">Adjuntos</p>
        <a
          v-for="(a, i) in item.adjuntos"
          :key="i"
          class="lic-adj-link"
          :href="mediaUrl(a.url)"
          target="_blank"
          rel="noopener"
        >
          {{ a.nombre || 'Archivo' }}
        </a>
      </div>
      <p v-if="item.decisionComentario" class="lic-meta">
        Decisión: {{ item.decisionByName }} — {{ item.decisionComentario }}
      </p>
      <button
        v-if="item.estado === 'pendiente'"
        type="button"
        class="lic-ghost"
        :disabled="busy"
        @click="cancel"
      >
        Cancelar solicitud
      </button>
      <ul v-if="item.historial?.length" class="lic-hist">
        <li v-for="(h, i) in item.historial" :key="i">
          <strong>{{ h.estado }}</strong> · {{ h.actorName }}
          <span v-if="h.comentario"> — {{ h.comentario }}</span>
        </li>
      </ul>
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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/licencias/${route.params.id}`)
    item.value = data.license
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No encontrado'
  } finally {
    loading.value = false
  }
}

async function cancel() {
  busy.value = true
  try {
    const { data } = await api.post(`/licencias/${route.params.id}/cancel`, {})
    item.value = data.license
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cancelar'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.lic {
  padding: 1rem 1rem 5rem;
}
.lic-back {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  padding: 0;
  margin-bottom: 0.75rem;
}
.lic-head h1 {
  margin: 0.2rem 0;
  font-size: 1.3rem;
}
.lic-code {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
}
.lic-estado {
  font-size: 0.85rem;
  font-weight: 600;
}
.lic-estado[data-estado='pendiente'] {
  color: #b45309;
}
.lic-estado[data-estado='aprobada'] {
  color: #047857;
}
.lic-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 1rem 0;
}
.lic-grid dt {
  font-size: 0.75rem;
  color: #64748b;
}
.lic-grid dd {
  margin: 0.15rem 0 0;
  font-weight: 600;
}
.lic-motivo {
  background: #f8fafc;
  padding: 0.85rem;
  border-radius: 0.75rem;
}
.lic-adj {
  margin: 0.75rem 0;
  display: grid;
  gap: 0.35rem;
}
.lic-adj-link {
  color: var(--brand-primary, #0f766e);
  font-size: 0.9rem;
}
.lic-ghost {
  margin-top: 1rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
}
.lic-hist {
  margin-top: 1.25rem;
  padding-left: 1.1rem;
  color: #475569;
  font-size: 0.85rem;
}
.lic-err {
  color: #b91c1c;
}
.lic-muted,
.lic-meta {
  color: #64748b;
}
</style>
