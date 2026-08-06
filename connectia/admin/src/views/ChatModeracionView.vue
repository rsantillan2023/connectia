<template>
  <section class="chat-mod">
    <header class="head">
      <div>
        <h1>Chat y moderación</h1>
        <p>Retención, denuncias y cierre de conversaciones (§8)</p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="reload">Actualizar</button>
    </header>

    <div v-if="stats" class="stats">
      <div class="stat"><strong>{{ stats.chats }}</strong><span>Chats activos</span></div>
      <div class="stat"><strong>{{ stats.groups }}</strong><span>Grupos</span></div>
      <div class="stat"><strong>{{ stats.adminChannels ?? 0 }}</strong><span>Canales admin</span></div>
      <div class="stat warn"><strong>{{ stats.openReports }}</strong><span>Denuncias abiertas</span></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Canales de la organización</h2>
        <button type="button" class="btn primary" @click="openCreate = true">Nuevo canal</button>
      </div>
      <p class="hint-top">
        Creá un grupo para toda la comunidad, áreas/grupos o personas. Podés enviar mensajes desde acá
        y elegir si admiten respuestas.
      </p>
      <table v-if="channels.length">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Miembros</th>
            <th>Respuestas</th>
            <th>Último mensaje</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in channels" :key="c.id">
            <td>
              <strong>{{ c.title }}</strong>
              <div class="muted small">{{ audienceLabel(c.audience) }}</div>
            </td>
            <td>{{ c.memberCount }}</td>
            <td>
              <button type="button" class="btn sm" @click="toggleReplies(c)">
                {{ c.allowReplies ? 'Permitidas' : 'Solo lectura' }}
              </button>
            </td>
            <td>
              <span class="muted">{{ c.lastMessagePreview || '—' }}</span>
              <div class="muted small">{{ formatDate(c.lastMessageAt) }}</div>
            </td>
            <td class="actions">
              <button type="button" class="btn sm" @click="openSend(c)">Enviar mensaje</button>
              <button type="button" class="btn sm ghost" @click="syncChannel(c)">Sync miembros</button>
              <button type="button" class="btn sm" @click="openThread({ chatId: c.id, reporterName: 'Admin', reason: 'Vista de canal', status: 'resolved', messageId: null, id: null })">
                Ver hilo
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Todavía no hay canales admin. Creá el primero.</p>
    </div>

    <div class="panel">
      <h2>Política de retención</h2>
      <form class="cfg-split" @submit.prevent="saveConfig">
        <aside class="cfg-explain" aria-label="Qué es la retención">
          <p class="cfg-explain-title">¿Qué controlás acá?</p>
          <p>
            La retención define <strong>cuánto tiempo se ven los mensajes</strong> en el chat de la
            organización. Pasado ese plazo, dejan de mostrarse al abrir la conversación.
          </p>
          <ul>
            <li>
              <strong>Con días &gt; 0:</strong> solo aparecen mensajes dentro de esa ventana (ej.
              365 = último año).
            </li>
            <li>
              <strong>Con 0:</strong> no hay caducidad automática; el historial se muestra sin
              límite de antigüedad.
            </li>
            <li>
              No borra denuncias ni cierra chats: eso se gestiona en el apartado de denuncias.
            </li>
          </ul>
          <p class="cfg-explain-live">{{ retentionSummary }}</p>
        </aside>

        <div class="cfg-controls">
          <fieldset class="cfg-block">
            <legend>Retención de mensajes</legend>
            <label>
              Días de retención
              <input v-model.number="cfg.retentionDays" type="number" min="0" max="3650" />
              <small>
                Ventana visible del historial. Rango 0–3650 (hasta ~10 años). 0 = sin caducidad.
              </small>
            </label>
          </fieldset>

          <fieldset class="cfg-block">
            <legend>Capacidades del chat</legend>
            <label class="check">
              <input v-model="cfg.allowGroups" type="checkbox" />
              <span>
                Permitir grupos
                <small>Si está off, los usuarios no pueden crear chats grupales.</small>
              </span>
            </label>
            <label class="check">
              <input v-model="cfg.allowAttachments" type="checkbox" />
              <span>
                Permitir adjuntos
                <small>Imágenes, PDF y videos permitidos en mensajes.</small>
              </span>
            </label>
            <label :class="{ dim: !cfg.allowAttachments }">
              Máx. MB por adjunto
              <input
                v-model.number="cfg.maxAttachmentMb"
                type="number"
                min="1"
                max="50"
                :disabled="!cfg.allowAttachments"
              />
              <small>Tope de tamaño por archivo (1–50 MB). Solo aplica si hay adjuntos.</small>
            </label>
          </fieldset>

          <div class="cfg-actions">
            <button type="submit" class="btn primary" :disabled="savingCfg">
              {{ savingCfg ? 'Guardando…' : 'Guardar política' }}
            </button>
            <p v-if="cfgMsg" class="ok">{{ cfgMsg }}</p>
          </div>
        </div>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Denuncias</h2>
        <select v-model="statusFilter" @change="loadReports">
          <option value="open">Abiertas</option>
          <option value="resolved">Resueltas</option>
          <option value="dismissed">Descartadas</option>
        </select>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <table v-if="reports.length">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Quien denuncia</th>
            <th>Motivo</th>
            <th>Chat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>{{ formatDate(r.createdAt) }}</td>
            <td>{{ r.reporterName }}</td>
            <td>{{ r.reason }}</td>
            <td><code>{{ shortId(r.chatId) }}</code></td>
            <td class="actions">
              <button type="button" class="btn sm" @click="openThread(r)">Ver conversación</button>
              <template v-if="r.status === 'open'">
                <button type="button" class="btn sm" @click="resolve(r, 'resolved', false)">Resolver</button>
                <button type="button" class="btn sm" @click="resolve(r, 'resolved', true)">
                  Resolver y cerrar
                </button>
                <button type="button" class="btn sm ghost" @click="resolve(r, 'dismissed', false)">
                  Descartar
                </button>
              </template>
              <span v-else class="badge">{{ r.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">No hay denuncias en este filtro.</p>
    </div>

    <Teleport to="body">
      <div v-if="openCreate" class="modal-root" @keydown.esc="openCreate = false">
        <button type="button" class="modal-backdrop" aria-label="Cerrar" @click="openCreate = false" />
        <div class="modal modal-form" role="dialog" aria-modal="true">
          <header class="modal-head">
            <h2>Nuevo canal</h2>
            <button type="button" class="modal-x" @click="openCreate = false">×</button>
          </header>
          <form class="create-form" @submit.prevent="createChannel">
            <label>
              Nombre del canal
              <input v-model="draft.title" type="text" maxlength="80" required placeholder="Ej. Avisos generales" />
            </label>
            <fieldset>
              <legend>Audiencia</legend>
              <div class="modes">
                <button type="button" class="mode" :class="{ on: draft.audience.mode === 'all' }" @click="setMode('all')">
                  Toda la organización
                </button>
                <button
                  type="button"
                  class="mode"
                  :class="{ on: draft.audience.mode === 'restricted' }"
                  @click="setMode('restricted')"
                >
                  Áreas / grupos
                </button>
                <button type="button" class="mode" :class="{ on: draft.audience.mode === 'users' }" @click="setMode('users')">
                  Personas
                </button>
              </div>
              <div v-if="draft.audience.mode === 'restricted'" class="picks">
                <div>
                  <p class="muted small">Áreas</p>
                  <label v-for="a in areas" :key="a.id" class="check-row">
                    <input v-model="draft.audience.areaIds" type="checkbox" :value="String(a.id)" />
                    {{ a.nombre || a.name }}
                  </label>
                </div>
                <div>
                  <p class="muted small">Grupos</p>
                  <label v-for="g in groups" :key="g.id" class="check-row">
                    <input v-model="draft.audience.groupIds" type="checkbox" :value="String(g.id)" />
                    {{ g.nombre || g.name }}
                  </label>
                </div>
              </div>
              <div v-if="draft.audience.mode === 'users' || draft.audience.mode === 'restricted'" class="user-pick">
                <input
                  v-model="userQ"
                  type="search"
                  placeholder="Buscar persona…"
                  @input="searchUsers"
                />
                <ul v-if="userResults.length" class="user-results">
                  <li v-for="u in userResults" :key="u.id">
                    <button type="button" @click="addUser(u)">
                      {{ u.nombre }} {{ u.apellido }} · @{{ u.usuario }}
                    </button>
                  </li>
                </ul>
                <div class="chips">
                  <span v-for="id in draft.audience.userIds" :key="id" class="chip">
                    {{ userLabel(id) }}
                    <button type="button" @click="removeUser(id)">×</button>
                  </span>
                </div>
              </div>
            </fieldset>
            <label class="check-row">
              <input v-model="draft.allowReplies" type="checkbox" />
              Permitir que los miembros respondan
            </label>
            <label>
              Primer mensaje (opcional)
              <textarea v-model="draft.message" rows="3" placeholder="Llega al chat de cada miembro…" />
            </label>
            <p v-if="createError" class="err">{{ createError }}</p>
            <div class="modal-foot">
              <button type="button" class="btn" @click="openCreate = false">Cancelar</button>
              <button type="submit" class="btn primary" :disabled="creating">
                {{ creating ? 'Creando…' : 'Crear canal' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="sendTarget" class="modal-root" @keydown.esc="sendTarget = null">
        <button type="button" class="modal-backdrop" aria-label="Cerrar" @click="sendTarget = null" />
        <div class="modal modal-form" role="dialog" aria-modal="true">
          <header class="modal-head">
            <div>
              <h2>Enviar a {{ sendTarget.title }}</h2>
              <p>{{ sendTarget.allowReplies ? 'Los miembros pueden responder' : 'Canal de solo lectura' }}</p>
            </div>
            <button type="button" class="modal-x" @click="sendTarget = null">×</button>
          </header>
          <form class="create-form" @submit.prevent="sendMessage">
            <label>
              Mensaje
              <textarea v-model="sendText" rows="4" required placeholder="Escribí el aviso…" />
            </label>
            <p v-if="sendError" class="err">{{ sendError }}</p>
            <div class="modal-foot">
              <button type="button" class="btn" @click="sendTarget = null">Cancelar</button>
              <button type="submit" class="btn primary" :disabled="sending">
                {{ sending ? 'Enviando…' : 'Enviar al chat' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="threadOpen" class="modal-root" @keydown.esc="closeThread">
        <button type="button" class="modal-backdrop" aria-label="Cerrar" @click="closeThread" />
        <div class="modal" role="dialog" aria-modal="true" aria-label="Conversación denunciada">
          <header class="modal-head">
            <div>
              <h2>{{ threadChat?.title || 'Conversación' }}</h2>
              <p v-if="activeReport?.reason && activeReport?.id">
                Denuncia de <strong>{{ activeReport.reporterName }}</strong>:
                {{ activeReport.reason }}
              </p>
              <p v-else-if="threadChat?.createdByAdmin" class="muted">
                Canal admin · {{ threadChat.allowReplies ? 'admite respuestas' : 'solo lectura' }}
              </p>
              <p v-if="threadChat?.closedAt" class="warn-line">
                Chat cerrado · {{ threadChat.closedReason || 'Moderación' }}
              </p>
            </div>
            <button type="button" class="modal-x" @click="closeThread">×</button>
          </header>

          <div v-if="threadChat?.participants?.length" class="participants">
            <span v-for="p in threadChat.participants" :key="p.id" class="pill">
              {{ p.displayName || p.usuario || 'Usuario' }}
              <em v-if="p.activo === false">(inactivo)</em>
            </span>
          </div>

          <p v-if="threadLoading" class="muted">Cargando hilo…</p>
          <p v-if="threadError" class="err">{{ threadError }}</p>

          <div ref="threadBox" class="thread">
            <div
              v-for="m in threadMessages"
              :key="m.id"
              class="bubble"
              :class="{ highlight: m.highlighted }"
            >
              <p class="meta">
                <strong>{{ m.authorName || 'Usuario' }}</strong>
                · {{ formatDate(m.createdAt) }}
              </p>
              <p v-if="m.deleted" class="muted">Mensaje eliminado</p>
              <p v-else class="texto">{{ m.texto }}</p>
              <div v-if="m.adjuntos?.length" class="files">
                <a
                  v-for="(a, i) in m.adjuntos"
                  :key="i"
                  :href="a.url"
                  target="_blank"
                  rel="noopener"
                >
                  {{ a.nombre || 'Adjunto' }}
                </a>
              </div>
            </div>
            <p v-if="!threadLoading && !threadMessages.length" class="muted">Sin mensajes.</p>
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn" @click="closeThread">Cerrar</button>
            <template v-if="activeReport?.status === 'open'">
              <button type="button" class="btn" @click="resolve(activeReport, 'dismissed', false)">
                Descartar denuncia
              </button>
              <button type="button" class="btn" @click="resolve(activeReport, 'resolved', false)">
                Resolver
              </button>
              <button
                type="button"
                class="btn primary"
                @click="resolve(activeReport, 'resolved', true)"
              >
                Resolver y cerrar chat
              </button>
            </template>
            <button
              v-else-if="threadChat && !threadChat.closedAt"
              type="button"
              class="btn primary"
              @click="closeChatOnly"
            >
              Cerrar chat
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const loading = ref(false)
const savingCfg = ref(false)
const error = ref('')
const cfgMsg = ref('')
const stats = ref(null)
const reports = ref([])
const channels = ref([])
const statusFilter = ref('open')
const cfg = reactive({
  retentionDays: 365,
  allowGroups: true,
  allowAttachments: true,
  maxAttachmentMb: 15,
})

const retentionSummary = computed(() => {
  const days = Number(cfg.retentionDays)
  if (!Number.isFinite(days) || days < 0) {
    return 'Indicá un número de días válido (0–3650).'
  }
  if (days === 0) {
    return 'Ahora: sin caducidad — se muestra todo el historial disponible.'
  }
  if (days === 1) {
    return 'Ahora: solo se muestran mensajes de las últimas 24 horas.'
  }
  if (days < 30) {
    return `Ahora: solo se muestran mensajes de los últimos ${days} días.`
  }
  if (days < 365) {
    const months = Math.round(days / 30)
    return `Ahora: ventana de ${days} días (~${months} mes${months === 1 ? '' : 'es'}).`
  }
  const years = Math.round((days / 365) * 10) / 10
  return `Ahora: ventana de ${days} días (~${years} año${years === 1 ? '' : 's'}).`
})

const areas = ref([])
const groups = ref([])
const openCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const draft = reactive({
  title: '',
  message: '',
  allowReplies: true,
  audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
})
const userQ = ref('')
const userResults = ref([])
const userCache = ref({})
let userTimer = null

const sendTarget = ref(null)
const sendText = ref('')
const sending = ref(false)
const sendError = ref('')

const threadOpen = ref(false)
const threadLoading = ref(false)
const threadError = ref('')
const threadChat = ref(null)
const threadMessages = ref([])
const activeReport = ref(null)
const threadBox = ref(null)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(id) {
  return String(id || '').slice(-6)
}

function audienceLabel(a) {
  if (!a) return ''
  if (a.mode === 'all') return 'Toda la organización'
  if (a.mode === 'users') return `${(a.userIds || []).length} persona(s)`
  const parts = []
  if (a.areaIds?.length) parts.push(`${a.areaIds.length} área(s)`)
  if (a.groupIds?.length) parts.push(`${a.groupIds.length} grupo(s)`)
  if (a.userIds?.length) parts.push(`${a.userIds.length} persona(s)`)
  return parts.join(' · ') || 'Audiencia'
}

function setMode(mode) {
  draft.audience.mode = mode
  if (mode === 'all') {
    draft.audience.areaIds = []
    draft.audience.groupIds = []
    draft.audience.userIds = []
  }
}

function userLabel(id) {
  return userCache.value[id]?.label || shortId(id)
}

function addUser(u) {
  const id = String(u.id)
  userCache.value = {
    ...userCache.value,
    [id]: { label: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.usuario || id },
  }
  if (!draft.audience.userIds.includes(id)) draft.audience.userIds.push(id)
  userQ.value = ''
  userResults.value = []
}

function removeUser(id) {
  draft.audience.userIds = draft.audience.userIds.filter((x) => x !== id)
}

function searchUsers() {
  clearTimeout(userTimer)
  userTimer = setTimeout(async () => {
    const q = userQ.value.trim()
    if (q.length < 2) {
      userResults.value = []
      return
    }
    try {
      const { data } = await api.get('/admin/users', { params: { q, activo: 'true' } })
      userResults.value = (Array.isArray(data?.items) ? data.items : []).slice(0, 12)
    } catch {
      userResults.value = []
    }
  }, 220)
}

async function loadOrg() {
  try {
    const [a, g] = await Promise.all([api.get('/admin/org/areas'), api.get('/admin/org/groups')])
    areas.value = Array.isArray(a.data?.items) ? a.data.items : []
    groups.value = Array.isArray(g.data?.items) ? g.data.items : []
  } catch {
    areas.value = []
    groups.value = []
  }
}

async function loadStats() {
  const { data } = await api.get('/admin/chat/stats')
  stats.value = data
  if (data?.config) Object.assign(cfg, data.config)
}

async function loadReports() {
  const { data } = await api.get('/admin/chat/reports', { params: { status: statusFilter.value } })
  reports.value = Array.isArray(data?.items) ? data.items : []
}

async function loadChannels() {
  const { data } = await api.get('/admin/chat/channels')
  channels.value = Array.isArray(data?.items) ? data.items : []
}

async function loadConfig() {
  const { data } = await api.get('/admin/chat/config')
  if (data?.config) Object.assign(cfg, data.config)
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadStats(), loadReports(), loadConfig(), loadChannels(), loadOrg()])
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar'
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  savingCfg.value = true
  cfgMsg.value = ''
  try {
    const { data } = await api.patch('/admin/chat/config', {
      retentionDays: cfg.retentionDays,
      allowGroups: cfg.allowGroups,
      allowAttachments: cfg.allowAttachments,
      maxAttachmentMb: cfg.maxAttachmentMb,
    })
    if (data?.config) Object.assign(cfg, data.config)
    cfgMsg.value = 'Política guardada'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    savingCfg.value = false
  }
}

async function createChannel() {
  creating.value = true
  createError.value = ''
  try {
    await api.post('/admin/chat/channels', {
      title: draft.title.trim(),
      message: draft.message.trim() || undefined,
      allowReplies: draft.allowReplies,
      audience: { ...draft.audience },
    })
    openCreate.value = false
    draft.title = ''
    draft.message = ''
    draft.allowReplies = true
    draft.audience = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
    await Promise.all([loadChannels(), loadStats()])
  } catch (e) {
    createError.value = e.response?.data?.error || 'No se pudo crear'
  } finally {
    creating.value = false
  }
}

function openSend(c) {
  sendTarget.value = c
  sendText.value = ''
  sendError.value = ''
}

async function sendMessage() {
  if (!sendTarget.value) return
  sending.value = true
  sendError.value = ''
  try {
    await api.post(`/admin/chat/channels/${sendTarget.value.id}/messages`, {
      texto: sendText.value.trim(),
    })
    sendTarget.value = null
    sendText.value = ''
    await loadChannels()
  } catch (e) {
    sendError.value = e.response?.data?.error || 'No se pudo enviar'
  } finally {
    sending.value = false
  }
}

async function toggleReplies(c) {
  try {
    const { data } = await api.patch(`/admin/chat/channels/${c.id}`, {
      allowReplies: !c.allowReplies,
    })
    if (data?.channel) {
      const i = channels.value.findIndex((x) => x.id === c.id)
      if (i >= 0) channels.value[i] = data.channel
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo actualizar'
  }
}

async function syncChannel(c) {
  try {
    const { data } = await api.post(`/admin/chat/channels/${c.id}/sync`)
    if (data?.channel) {
      const i = channels.value.findIndex((x) => x.id === c.id)
      if (i >= 0) channels.value[i] = data.channel
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo sincronizar'
  }
}

async function openThread(r) {
  activeReport.value = r
  threadOpen.value = true
  threadLoading.value = true
  threadError.value = ''
  threadChat.value = null
  threadMessages.value = []
  try {
    const { data } = await api.get(`/admin/chat/chats/${r.chatId}`, {
      params: { messageId: r.messageId || undefined, limit: 150 },
    })
    threadChat.value = data?.chat || null
    threadMessages.value = Array.isArray(data?.messages) ? data.messages : []
    await nextTick()
    const box = threadBox.value
    if (box) {
      const hi = box.querySelector('.bubble.highlight')
      if (hi) hi.scrollIntoView({ block: 'center' })
      else box.scrollTop = box.scrollHeight
    }
  } catch (e) {
    threadError.value = e.response?.data?.error || 'No se pudo cargar la conversación'
  } finally {
    threadLoading.value = false
  }
}

function closeThread() {
  threadOpen.value = false
  activeReport.value = null
  threadChat.value = null
  threadMessages.value = []
  threadError.value = ''
}

async function resolve(r, status, closeChat) {
  if (!r?.id) return
  const notes = window.prompt('Notas (opcional)') || ''
  try {
    await api.post(`/admin/chat/reports/${r.id}/resolve`, { status, notes, closeChat })
    await loadReports()
    await loadStats()
    if (threadOpen.value && activeReport.value?.id === r.id) {
      activeReport.value = { ...activeReport.value, status }
      if (closeChat && threadChat.value) {
        threadChat.value = {
          ...threadChat.value,
          closedAt: new Date().toISOString(),
          closedReason: 'Moderación',
        }
      }
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo resolver'
  }
}

async function closeChatOnly() {
  if (!threadChat.value?.id) return
  if (!window.confirm('¿Cerrar esta conversación para los participantes?')) return
  try {
    await api.post(`/admin/chat/chats/${threadChat.value.id}/close`, { reason: 'Moderación' })
    threadChat.value = {
      ...threadChat.value,
      closedAt: new Date().toISOString(),
      closedReason: 'Moderación',
    }
    await loadStats()
  } catch (e) {
    threadError.value = e.response?.data?.error || 'No se pudo cerrar el chat'
  }
}

onMounted(reload)
</script>

<style scoped>
.chat-mod {
  padding: 8px 4px 40px;
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}
.head h1 {
  margin: 0;
  font-size: 1.5rem;
}
.head p {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: 14px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.stat {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat strong {
  font-size: 1.4rem;
}
.stat span {
  font-size: 12px;
  color: var(--ink-soft);
}
.stat.warn strong {
  color: var(--warn);
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 1.05rem;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-head h2 {
  margin: 0;
}
.cfg-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
  gap: 20px;
  align-items: start;
}
.cfg-explain {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ink-soft);
}
.cfg-explain-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 650;
  color: var(--ink);
}
.cfg-explain p {
  margin: 0 0 10px;
}
.cfg-explain ul {
  margin: 0 0 12px;
  padding-left: 1.1rem;
  display: grid;
  gap: 8px;
}
.cfg-explain li {
  color: var(--ink-soft);
}
.cfg-explain strong {
  color: var(--ink);
  font-weight: 600;
}
.cfg-explain-live {
  margin: 0 !important;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--ok-bg);
  border: 1px solid #a7f3d0;
  color: var(--ok);
  font-size: 12.5px;
  font-weight: 550;
}
.cfg-controls {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.cfg-block {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: grid;
  gap: 12px;
}
.cfg-block legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 650;
  color: var(--brand-primary);
}
.cfg-controls label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--ink);
}
.cfg-controls label.dim {
  opacity: 0.55;
}
.cfg-controls input[type='number'] {
  padding: 8px 10px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  max-width: 160px;
}
.cfg-controls .check {
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
}
.cfg-controls .check span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cfg-controls .check input {
  margin-top: 2px;
}
.cfg-controls small {
  color: var(--ink-faint);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 400;
}
.cfg-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.btn {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}
.btn.primary {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.btn.sm {
  padding: 6px 8px;
  font-size: 12px;
}
.btn.ghost {
  background: transparent;
}
.badge {
  font-size: 12px;
  color: var(--ink-soft);
}
.muted {
  color: var(--ink-faint);
}
.err {
  color: var(--bad);
}
.ok {
  color: var(--ok);
  font-size: 13px;
  margin: 0;
}
.hint-top {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ink-soft);
}
.small {
  font-size: 11px;
}
.create-form {
  padding: 0 18px 8px;
  display: grid;
  gap: 12px;
}
.create-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.create-form input[type='text'],
.create-form input[type='search'],
.create-form textarea {
  padding: 8px 10px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  font: inherit;
}
.create-form fieldset {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
}
.modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.mode {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
}
.mode.on {
  border-color: var(--brand-primary);
  background: var(--ok-bg);
  color: var(--brand-primary);
  font-weight: 600;
}
.picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.check-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.user-results {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  max-height: 160px;
  overflow: auto;
}
.user-results button {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
}
.user-results button:hover {
  background: var(--panel-2);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--panel-2);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
}
.chip button {
  border: none;
  background: transparent;
  cursor: pointer;
}
.modal-form {
  max-height: min(90vh, 860px);
  overflow: auto;
}

.modal-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
}
.modal {
  position: relative;
  width: min(720px, 100%);
  max-height: min(88vh, 900px);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 16px;
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.modal-head h2 {
  margin: 0;
  font-size: 1.15rem;
}
.modal-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ink-soft);
}
.warn-line {
  color: var(--warn) !important;
}
.modal-x {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink-soft);
}
.participants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--panel-2);
}
.pill {
  font-size: 12px;
  background: var(--panel-2);
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--ink);
}
.pill em {
  font-style: normal;
  color: var(--ink-faint);
  margin-left: 4px;
}
.thread {
  flex: 1;
  min-height: 240px;
  overflow: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--panel-2);
}
.bubble {
  align-self: stretch;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
}
.bubble.highlight {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}
.meta {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--ink-soft);
}
.texto {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink);
}
.files {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.files a {
  font-size: 13px;
  color: var(--brand-primary);
}
.modal-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: 1fr 1fr;
  }
  .cfg-split {
    grid-template-columns: 1fr;
  }
}
</style>
