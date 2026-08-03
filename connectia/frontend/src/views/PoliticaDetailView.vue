<template>
  <section class="detail">
    <button type="button" class="back" @click="$router.push('/politicas')">← Políticas</button>
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err" role="alert">{{ error }}</p>
    <article v-else-if="policy">
      <span class="cat">{{ policy.category }} · v{{ policy.version }}</span>
      <h1>{{ policy.titulo }}</h1>
      <p v-if="policy.resumen" class="lead">{{ policy.resumen }}</p>
      <div class="body">{{ policy.cuerpo }}</div>

      <div v-if="policy.requiresAck" class="ack-box">
        <p v-if="policy.ackedByMe" class="ok">Ya aceptaste esta versión.</p>
        <template v-else>
          <p class="hint">
            Leé el contenido completo y confirmá tu aceptación. Queda registrado con fecha y versión.
          </p>
          <label class="read-check">
            <input v-model="confirmedRead" type="checkbox" />
            Declaro haber leído esta política
          </label>
          <button type="button" class="ack-btn" :disabled="acking || !canAck" @click="ack">
            {{ acking ? 'Registrando…' : 'Acepto esta política' }}
          </button>
          <p v-if="ackError" class="err">{{ ackError }}</p>
        </template>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const policy = ref(null)
const loading = ref(true)
const error = ref('')
const openedAt = ref('')
const opened = ref(false)
const confirmedRead = ref(false)
const acking = ref(false)
const ackError = ref('')

const canAck = computed(() => opened.value && confirmedRead.value)

async function markOpened() {
  if (!policy.value || policy.value.ackedByMe || !policy.value.requiresAck) {
    opened.value = true
    return
  }
  if (opened.value && openedAt.value) return
  opened.value = true
  openedAt.value = new Date().toISOString()
  try {
    const { data } = await api.post(`/policies/${policy.value.id}/open`)
    if (data?.openedAt) openedAt.value = data.openedAt
  } catch {
    /* openedAt local alcanza para el acuse */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  opened.value = false
  openedAt.value = ''
  confirmedRead.value = false
  ackError.value = ''
  try {
    const { data } = await api.get(`/policies/${route.params.id}`)
    policy.value = data.policy
    await markOpened()
  } catch (e) {
    error.value = e.response?.data?.error || 'Política no encontrada'
    policy.value = null
  } finally {
    loading.value = false
  }
}

async function ack() {
  if (!policy.value || !canAck.value) return
  acking.value = true
  ackError.value = ''
  try {
    const { data } = await api.post(`/policies/${policy.value.id}/ack`, {
      opened: true,
      openedAt: openedAt.value || new Date().toISOString(),
      version: policy.value.version,
    })
    policy.value = data.policy
  } catch (e) {
    ackError.value = e.response?.data?.error || 'No se pudo registrar el acuse'
  } finally {
    acking.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.detail {
  padding: 16px 16px 88px;
  max-width: 720px;
  margin: 0 auto;
}
.back {
  border: none;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  padding: 0;
  margin-bottom: 12px;
  cursor: pointer;
}
.cat {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--brand-primary, #0f766e);
}
h1 {
  font-size: 1.35rem;
  margin: 6px 0 10px;
}
.lead {
  color: #64748b;
  margin: 0 0 14px;
}
.body {
  white-space: pre-wrap;
  line-height: 1.55;
  margin-bottom: 20px;
}
.ack-box {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  background: #f8fafc;
}
.hint {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 0.9rem;
}
.read-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 0.95rem;
  color: #0f172a;
  cursor: pointer;
}
.read-check input {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.ack-btn {
  width: 100%;
  border: none;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}
.ack-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ok {
  color: #065f46;
  font-weight: 600;
  margin: 0;
}
.err {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}
</style>
