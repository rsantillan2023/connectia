<template>
  <section class="detail">
    <header class="detail-bar">
      <button type="button" class="detail-back" aria-label="Volver a Mis solicitudes" @click="goBack">
        <AppIcon name="back" :size="22" />
      </button>
      <div class="detail-bar-text">
        <p class="detail-bar-title">{{ barTitle }}</p>
        <p class="detail-bar-sub">Mis solicitudes</p>
      </div>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <template v-else-if="req">
      <div class="detail-body">
        <header class="hero">
          <div class="hero-top">
            <span class="code">{{ req.codigo }}</span>
            <span class="estado" :data-estado="req.estado">{{ req.estadoLabel || req.estado }}</span>
          </div>
          <div v-if="req.mediaUrl" class="hero-media">
            <PostMedia :url="req.mediaUrl" :alt="req.titulo" />
          </div>
          <h1>{{ req.titulo }}</h1>
          <p class="hero-meta">
            <span>{{ req.tipoNombre }}</span>
            <span v-if="req.area"> · {{ req.area }}</span>
            <span v-if="req.origen === 'admin'"> · Pedido de gestión</span>
          </p>
          <p v-if="req.cuerpo" class="hero-note">{{ req.cuerpo }}</p>
        </header>

        <form
          v-if="req.needsCompletion"
          class="panel complete"
          @submit.prevent="completeForm"
        >
          <h2>Completá estos datos</h2>
          <template v-for="c in req.camposDefinicion" :key="c.key">
            <label class="field">
              <span>{{ c.label }}<em v-if="c.required"> *</em></span>
              <select
                v-if="c.tipo === 'select'"
                v-model="completeFields[c.key]"
                :required="c.required"
              >
                <option value="">Elegí…</option>
                <option v-for="o in c.opciones" :key="o" :value="o">{{ o }}</option>
              </select>
              <label v-else-if="c.tipo === 'check'" class="check">
                <input v-model="completeFields[c.key]" type="checkbox" />
                {{ c.placeholder || 'Sí' }}
              </label>
              <textarea
                v-else-if="c.tipo === 'textarea'"
                v-model="completeFields[c.key]"
                rows="3"
                :placeholder="c.placeholder"
                :required="c.required"
              />
              <input
                v-else
                v-model="completeFields[c.key]"
                :type="inputType(c.tipo)"
                :placeholder="c.placeholder"
                :required="c.required"
              />
            </label>
          </template>
          <p v-if="completeError" class="err inline">{{ completeError }}</p>
          <button class="btn-primary" :disabled="completing">
            {{ completing ? 'Enviando…' : 'Enviar datos' }}
          </button>
        </form>

        <div v-if="req.camposValores?.length" class="panel">
          <h2>Datos</h2>
          <dl class="data-list">
            <div v-for="c in req.camposValores" :key="c.key" class="data-row">
              <dt>{{ c.label }}</dt>
              <dd>{{ formatCampo(c) }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="req.messages?.length" class="thread">
          <h2>Conversación</h2>
          <div
            v-for="m in req.messages"
            :key="m.id"
            class="bubble"
            :class="m.isAdmin ? 'is-admin' : 'is-user'"
          >
            <p class="bubble-meta">
              {{ m.authorName }}{{ m.isAdmin ? ' · Gestión' : '' }}
              <span>· {{ formatDate(m.createdAt) }}</span>
            </p>
            <p class="bubble-text">{{ m.texto }}</p>
            <div v-if="m.adjuntos?.length" class="bubble-files">
              <a
                v-for="(a, i) in m.adjuntos"
                :key="i"
                :href="a.url"
                target="_blank"
                rel="noopener"
              >{{ a.nombre || 'Adjunto' }}</a>
            </div>
          </div>
        </div>

        <form v-if="canReply && !req.needsCompletion" class="panel composer" @submit.prevent="sendMessage">
          <h2>Tu respuesta</h2>
          <textarea
            v-model="reply"
            rows="3"
            placeholder="Escribí un mensaje…"
          />
          <button
            v-if="!showAttach"
            type="button"
            class="linkish"
            @click="showAttach = true"
          >
            Adjuntar enlace
          </button>
          <input
            v-else
            v-model="adjuntoUrl"
            type="url"
            placeholder="https://… (enlace opcional)"
          />
          <button class="btn-primary" :disabled="sending || (!reply.trim() && !adjuntoUrl.trim())">
            {{ sending ? 'Enviando…' : 'Enviar mensaje' }}
          </button>
        </form>

        <div v-if="canRate" class="panel rate">
          <h2>¿Cómo quedó la resolución?</h2>
          <p class="hint">Si querés, calificá y cerrá. También podés cerrar sin calificar abajo.</p>
          <div class="stars" role="group" aria-label="Calificación">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="star"
              :class="{ on: rating >= n }"
              :aria-label="`${n} de 5`"
              :aria-pressed="rating === n"
              @click="rating = n"
            >
              ★
            </button>
          </div>
          <button
            class="btn-primary"
            :disabled="!rating || closing"
            @click="closeWithRating"
          >
            {{ closing ? 'Cerrando…' : 'Cerrar y calificar' }}
          </button>
        </div>

        <div v-if="userActions.length" class="panel actions">
          <h2>Otras acciones</h2>
          <button
            v-for="a in userActions"
            :key="a.key"
            type="button"
            class="btn-action"
            :class="a.tone"
            :disabled="changing"
            @click="changeEstado(a.key)"
          >
            {{ a.label }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import PostMedia from '../components/PostMedia.vue'

const route = useRoute()
const router = useRouter()
const req = ref(null)
const transitions = ref([])
const calificables = ref([])
const terminales = ref([])
const labelMap = ref({})
const loading = ref(true)
const error = ref('')
const reply = ref('')
const adjuntoUrl = ref('')
const showAttach = ref(false)
const sending = ref(false)
const rating = ref(null)
const closing = ref(false)
const changing = ref(false)
const completeFields = ref({})
const completing = ref(false)
const completeError = ref('')

const canReply = computed(() => req.value && !terminales.value.includes(req.value.estado) && !req.value.needsCompletion)
const canRate = computed(() => req.value && calificables.value.includes(req.value.estado) && !req.value.rating && !req.value.needsCompletion)

const ACTION_COPY = {
  cerrada: { label: 'Cerrar sin calificar', tone: 'muted' },
  abierta: { label: 'Reabrir solicitud', tone: 'primary' },
  en_proceso: { label: 'Marcar en proceso', tone: 'muted' },
  cancelada: { label: 'Cancelar solicitud', tone: 'danger' },
  a_completar: { label: 'Pedir más datos', tone: 'muted' },
  en_espera: { label: 'Poner en espera', tone: 'muted' },
  escalada: { label: 'Escalar', tone: 'muted' },
  resuelta: { label: 'Marcar como resuelta', tone: 'primary' },
}

const ACTION_ORDER = ['resuelta', 'cerrada', 'abierta']

const userActions = computed(() => {
  const keys = [...(transitions.value || [])].sort((a, b) => {
    const ia = ACTION_ORDER.indexOf(a)
    const ib = ACTION_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  return keys.map((key) => ({
    key,
    label: ACTION_COPY[key]?.label || `Pasar a ${labelMap.value[key] || key}`,
    tone: ACTION_COPY[key]?.tone || 'muted',
  }))
})

const barTitle = computed(() => {
  const t = String(req.value?.titulo || '').trim()
  if (!t) return 'Solicitud'
  return t.length > 42 ? `${t.slice(0, 40)}…` : t
})

function goBack() {
  if ((window.history.state?.position ?? 0) > 0) {
    router.back()
    return
  }
  router.replace({ name: 'solicitudes' })
}

function inputType(tipo) {
  if (tipo === 'number') return 'number'
  if (tipo === 'date') return 'date'
  if (tipo === 'email') return 'email'
  if (tipo === 'url') return 'url'
  return 'text'
}

function formatCampo(c) {
  if (c.tipo === 'check') return c.value ? 'Sí' : 'No'
  return c.value === '' || c.value == null ? '—' : String(c.value)
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

async function load() {
  loading.value = true
  error.value = ''
  showAttach.value = false
  adjuntoUrl.value = ''
  reply.value = ''
  rating.value = null
  try {
    const [{ data }, { data: cfg }] = await Promise.all([
      api.get(`/requests/${route.params.id}`),
      api.get('/requests/meta/config'),
    ])
    req.value = data.request
    transitions.value = data.transitions || []
    calificables.value = data.config?.estadosCalificables || cfg.config?.estadosCalificables || []
    terminales.value = data.config?.estadosTerminales || cfg.config?.estadosTerminales || []
    const map = {}
    for (const e of cfg.config?.estados || []) map[e.key] = e.label
    labelMap.value = map
    const fields = {}
    for (const c of data.request?.camposDefinicion || []) {
      fields[c.key] = c.tipo === 'check' ? false : ''
    }
    completeFields.value = fields
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
    req.value = null
  } finally {
    loading.value = false
  }
}

async function completeForm() {
  completeError.value = ''
  completing.value = true
  try {
    const { data } = await api.post(`/requests/${req.value.id}/complete`, { campos: completeFields.value })
    req.value = data.request
  } catch (e) {
    completeError.value = e.response?.data?.error || 'No se pudo completar'
  } finally {
    completing.value = false
  }
}

async function sendMessage() {
  if (!reply.value.trim() && !adjuntoUrl.value.trim()) return
  sending.value = true
  try {
    const payload = { texto: reply.value || '(adjunto)' }
    if (adjuntoUrl.value.trim()) payload.adjuntos = [{ url: adjuntoUrl.value.trim() }]
    const { data } = await api.post(`/requests/${req.value.id}/messages`, payload)
    req.value = data.request
    transitions.value = data.transitions || []
    reply.value = ''
    adjuntoUrl.value = ''
    showAttach.value = false
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo enviar'
  } finally {
    sending.value = false
  }
}

async function closeWithRating() {
  closing.value = true
  try {
    const { data } = await api.patch(`/requests/${req.value.id}`, { rating: rating.value })
    req.value = data.request
    transitions.value = data.transitions || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cerrar'
  } finally {
    closing.value = false
  }
}

async function changeEstado(estado) {
  changing.value = true
  try {
    const { data } = await api.patch(`/requests/${req.value.id}`, { estado })
    req.value = data.request
    transitions.value = data.transitions || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cambiar el estado'
  } finally {
    changing.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.detail {
  padding-bottom: 24px;
}

.detail-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cx-border);
  background: var(--cx-surface);
  position: sticky;
  top: 0;
  z-index: 5;
}

.detail-back {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--cx-text);
  display: grid;
  place-items: center;
}

.detail-bar-text {
  min-width: 0;
}

.detail-bar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cx-text);
}

.detail-bar-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--cx-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-body {
  padding: 14px 14px 8px;
  display: grid;
  gap: 14px;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.hero-media {
  margin: 0 0 12px;
  border-radius: 14px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 16 / 9;
}

.hero-media :deep(.pmedia),
.hero-media :deep(.el) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
}

.estado {
  --st: var(--cx-muted);
  font-size: 11px;
  font-weight: 700;
  color: var(--st);
  background: color-mix(in srgb, var(--st) 14%, transparent);
  border-radius: 999px;
  padding: 4px 10px;
}

.estado[data-estado='abierta'] { --st: #0284c7; }
.estado[data-estado='en_proceso'] { --st: #ca8a04; }
.estado[data-estado='a_completar'] { --st: #ea580c; }
.estado[data-estado='en_espera'] { --st: #7c3aed; }
.estado[data-estado='escalada'] { --st: #db2777; }
.estado[data-estado='resuelta'] { --st: var(--brand-primary); }
.estado[data-estado='cerrada'] { --st: #64748b; }
.estado[data-estado='cancelada'] { --st: #dc2626; }

.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.55rem;
  line-height: 1.25;
  color: var(--cx-text);
}

.hero-meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
}

.hero-note {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-text);
  white-space: pre-wrap;
}

.panel {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 10px;
}

.panel h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--cx-muted);
}

.hint {
  margin: -4px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
}

.field {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: var(--cx-muted);
}

.field em {
  color: #b45309;
  font-style: normal;
}

.field input,
.field select,
.field textarea,
.composer textarea,
.composer input {
  width: 100%;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cx-text);
  font-size: 14px;
}

.data-list {
  margin: 0;
  display: grid;
  gap: 10px;
}

.data-row {
  display: grid;
  gap: 2px;
}

.data-row dt {
  font-size: 12px;
  color: var(--cx-muted);
}

.data-row dd {
  margin: 0;
  font-size: 14px;
  color: var(--cx-text);
  word-break: break-word;
}

.thread {
  display: grid;
  gap: 10px;
}

.thread h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--cx-muted);
}

.bubble {
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid var(--cx-border);
}

.bubble.is-admin {
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
  border-color: color-mix(in srgb, var(--brand-primary) 22%, var(--cx-border));
  margin-right: 18px;
}

.bubble.is-user {
  background: var(--cx-surface);
  margin-left: 18px;
}

.bubble-meta {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--cx-muted);
}

.bubble-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-text);
  white-space: pre-wrap;
}

.bubble-files {
  margin-top: 8px;
  display: grid;
  gap: 4px;
}

.bubble-files a {
  font-size: 12px;
  color: var(--brand-primary);
}

.composer .linkish {
  justify-self: start;
  border: 0;
  background: transparent;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
}

.btn-primary {
  border: 0;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.stars {
  display: flex;
  gap: 6px;
}

.star {
  width: 44px;
  height: 44px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: var(--cx-input);
  color: var(--cx-muted);
  font-size: 22px;
  line-height: 1;
}

.star.on {
  color: #ca8a04;
  background: color-mix(in srgb, #ca8a04 14%, transparent);
  border-color: color-mix(in srgb, #ca8a04 35%, var(--cx-border));
}

.actions {
  gap: 8px;
}

.btn-action {
  width: 100%;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 650;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  text-align: center;
}

.btn-action.primary {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--cx-border));
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
}

.btn-action.danger {
  border-color: color-mix(in srgb, var(--cx-danger) 35%, var(--cx-border));
  color: var(--cx-danger);
  background: color-mix(in srgb, var(--cx-danger) 8%, transparent);
}

.muted {
  padding: 24px;
  color: var(--cx-muted);
  font-size: 14px;
}

.err {
  margin: 10px 14px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  background: #fff7ed;
  color: #9a3412;
}

.err.inline {
  margin: 0;
}
</style>
