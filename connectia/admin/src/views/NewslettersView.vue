<template>
  <div class="nls">
    <header class="nls-hero">
      <div>
        <h1>Newsletters</h1>
        <p>
          Boletines personalizados por audiencia. Deben <strong>revisarse y aprobarse</strong> antes
          de enviarse. Acá queda la auditoría de cada envío.
        </p>
        <ScreenHelp
          purpose="Moderar borradores de newsletter armados desde Publicaciones y consultar el historial de envíos con destinatarios y bitácora."
          can-do="Filtrar por estado; abrir detalle; editar asunto/resúmenes en revisión; aprobar, rechazar, cancelar o enviar (solo aprobados); descargar PDF."
        />
      </div>
      <div class="hero-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">
          {{ loading ? 'Actualizando…' : 'Actualizar' }}
        </button>
        <RouterLink class="btn-primary" to="/publicaciones">Armar desde publicaciones</RouterLink>
      </div>
    </header>

    <div class="filters">
      <button
        v-for="f in statusFilters"
        :key="String(f.value)"
        type="button"
        class="chip"
        :class="{ on: statusFilter === f.value }"
        @click="statusFilter = f.value; load()"
      >
        {{ f.label }}
        <template v-if="f.value === 'pending_review' && stats.pending_review"> ({{ stats.pending_review }})</template>
        <template v-else-if="f.value === 'approved' && stats.approved"> ({{ stats.approved }})</template>
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="!mailConfigured" class="warn">Mail no configurado en el servidor — podés revisar y aprobar, pero el envío fallará hasta configurar EMAIL_USER / EMAIL_PASSWORD.</p>

    <div class="list">
      <article
        v-for="n in items"
        :key="n.id"
        class="row"
        @click="openDetail(n.id)"
      >
        <div class="row-main">
          <div class="meta">
            <span class="status-badge" :data-status="n.status">{{ statusLabel(n.status) }}</span>
            <span>{{ formatDate(n.createdAt) }}</span>
            <span v-if="n.createdBy?.name">por {{ n.createdBy.name }}</span>
            <span>{{ n.totals?.variants || 0 }} versión{{ (n.totals?.variants || 0) === 1 ? '' : 'es' }}</span>
          </div>
          <h2>{{ n.subject }}</h2>
          <p class="excerpt">
            {{ n.posts?.length || 0 }} pub{{ (n.posts?.length || 0) === 1 ? '' : 's' }}
            · {{ n.totals?.emailable || 0 }} con email
            · {{ n.totals?.recipients || 0 }} en audiencia
            <template v-if="n.status === 'sent'">
              · enviados {{ n.totals?.emailed || 0 }}
              <template v-if="n.totals?.failed"> · fallidos {{ n.totals.failed }}</template>
            </template>
          </p>
        </div>
        <div class="row-actions" @click.stop>
          <button
            type="button"
            class="link-btn"
            :disabled="pdfBusyId === n.id"
            title="Descargar newsletter en PDF"
            @click="downloadPdf(n.id, n.subject)"
          >
            {{ pdfBusyId === n.id ? 'PDF…' : 'Descargar PDF' }}
          </button>
          <button type="button" class="link-btn" @click="openDetail(n.id)">Ver / moderar</button>
        </div>
      </article>
      <p v-if="!items.length && !loading && !error" class="empty">
        Todavía no hay newsletters. Armá uno desde Publicaciones → Armar newsletter.
      </p>
    </div>

    <div v-if="detail" class="sheet" @click.self="closeDetail">
      <div class="sheet-panel nl-detail" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <div>
            <p class="kicker">Moderación y auditoría</p>
            <h2>{{ detail.subject }}</h2>
            <p>
              <span class="status-badge inline" :data-status="detail.status">{{ statusLabel(detail.status) }}</span>
              · creado {{ formatDate(detail.createdAt) }}
              <template v-if="detail.createdBy?.name"> por {{ detail.createdBy.name }}</template>
            </p>
          </div>
          <button type="button" class="icon-btn" aria-label="Cerrar" @click="closeDetail">×</button>
        </header>

        <div class="sheet-form detail-body">
          <p v-if="detailError" class="err">{{ detailError }}</p>
          <p v-if="detailOk" class="ok">{{ detailOk }}</p>

          <section v-if="canEdit" class="block">
            <h3>Asunto</h3>
            <input v-model="editSubject" class="input" maxlength="200" />
          </section>
          <section v-else class="block">
            <h3>Asunto</h3>
            <p class="plain">{{ detail.subject }}</p>
          </section>

          <section class="block">
            <h3>Publicaciones</h3>
            <ul class="posts">
              <li v-for="p in detail.posts" :key="p.postId">
                <span class="tipo">{{ tipoLabel(p.tipo) }}</span>
                <strong>{{ p.titulo }}</strong>
                <span class="muted">Audiencia: {{ p.audienceMode === 'restricted' ? 'restringida' : 'toda la comunidad' }}</span>
              </li>
            </ul>
          </section>

          <section class="block">
            <h3>Versiones por audiencia (revisar resúmenes)</h3>
            <div v-for="(v, i) in editVariants" :key="v.fingerprint" class="variant">
              <div class="variant-head">
                <strong>Versión {{ i + 1 }}</strong>
                <span class="muted">{{ v.emailableCount }} email · {{ v.recipientCount }} personas · {{ v.postIds.length }} pubs</span>
                <span v-if="v.summaryAi" class="ai-tag">Resumen IA</span>
              </div>
              <textarea
                v-if="canEdit"
                v-model="v.summary"
                class="input"
                rows="3"
                maxlength="2000"
              />
              <blockquote v-else>{{ v.summary }}</blockquote>
              <button type="button" class="link-btn" @click="previewVariant(v.fingerprint)">Vista previa HTML</button>
            </div>
          </section>

          <section v-if="htmlPreview" class="block preview-block">
            <h3>Vista previa del mail</h3>
            <iframe class="preview-frame" :srcdoc="htmlPreview" title="Vista previa newsletter" />
          </section>

          <section class="block">
            <h3>Destinatarios</h3>
            <p class="muted" style="margin:0 0 8px">
              Desmarcá a quien no deba recibir el envío. Área y grupos se muestran para moderar con contexto.
            </p>
            <div class="stats-row">
              <div><strong>{{ audienceCount }}</strong><span>audiencia</span></div>
              <div><strong>{{ emailableCount }}</strong><span>con email</span></div>
              <div><strong>{{ detail.totals?.emailed || 0 }}</strong><span>enviados</span></div>
              <div><strong>{{ detail.totals?.failed || 0 }}</strong><span>fallidos</span></div>
            </div>
            <div class="rec-toolbar" v-if="canEdit">
              <input v-model="recQ" class="input" type="search" placeholder="Buscar nombre, email, área…" />
              <button type="button" class="link-btn" :disabled="busy" @click="setAllIncluded(true)">Marcar todos</button>
              <button type="button" class="link-btn" :disabled="busy" @click="setAllIncluded(false)">Desmarcar todos</button>
            </div>
            <form v-if="canEdit" class="add-email" @submit.prevent="addExternal">
              <input v-model="addEmail" class="input" type="email" required placeholder="Agregar email cualquiera…" />
              <input v-model="addNombre" class="input" type="text" maxlength="120" placeholder="Nombre (opcional)" />
              <button type="submit" class="btn-primary" :disabled="busy || !addEmail.trim()">Agregar</button>
            </form>
            <div class="table-wrap">
              <table class="grid">
                <thead>
                  <tr>
                    <th v-if="canEdit"></th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Área / grupos</th>
                    <th>Estado</th>
                    <th v-if="canEdit"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in recipientsFiltered.slice(0, 120)"
                    :key="(r.userId || r.email) + r.fingerprint"
                    :class="{ off: r.included === false }"
                  >
                    <td v-if="canEdit">
                      <input
                        type="checkbox"
                        :checked="r.included !== false"
                        :disabled="busy"
                        @change="toggleIncluded(r, $event.target.checked)"
                      />
                    </td>
                    <td>
                      {{ r.nombre }}
                      <span v-if="r.isExternal" class="ext-tag">Externo</span>
                    </td>
                    <td>{{ r.email || '—' }}</td>
                    <td class="org-cell">
                      <span>{{ r.areaNombre || (r.isExternal ? 'Externo' : 'Sin área') }}</span>
                      <span v-if="(r.groupNombres || []).length" class="muted"> · {{ r.groupNombres.join(', ') }}</span>
                      <span v-if="!r.canEmail" class="muted"> · sin email</span>
                    </td>
                    <td>
                      <span class="deliv" :data-s="r.deliveryStatus">{{ deliveryLabel(r.deliveryStatus) }}</span>
                      <span v-if="r.included === false" class="muted"> excluido</span>
                      <span v-if="r.error" class="muted"> {{ r.error }}</span>
                    </td>
                    <td v-if="canEdit">
                      <button
                        v-if="r.isExternal"
                        type="button"
                        class="link-btn danger"
                        :disabled="busy"
                        @click="removeExternal(r)"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="recipientsFiltered.length > 120" class="muted">Mostrando 120 de {{ recipientsFiltered.length }}.</p>
            </div>
          </section>

          <section class="block">
            <h3>Bitácora de auditoría</h3>
            <ol class="audit">
              <li v-for="(a, i) in detail.auditLog || []" :key="i">
                <time>{{ formatDate(a.at) }}</time>
                <strong>{{ auditActionLabel(a.action) }}</strong>
                <span v-if="a.byName">· {{ a.byName }}</span>
                <span v-if="a.note" class="muted"> — {{ a.note }}</span>
              </li>
            </ol>
            <p v-if="detail.rejectionReason" class="err">Rechazo: {{ detail.rejectionReason }}</p>
          </section>
        </div>

        <footer class="sheet-foot">
          <button
            type="button"
            class="btn-ghost"
            :disabled="busy || pdfBusyId === detail.id"
            title="Descargar newsletter en PDF"
            @click="downloadPdf(detail.id, detail.subject)"
          >
            {{ pdfBusyId === detail.id ? 'Generando PDF…' : 'Descargar PDF' }}
          </button>
          <div class="foot-right">
            <button v-if="canEdit" type="button" class="btn-ghost" :disabled="busy" @click="saveEdits">
              {{ saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <button
              v-if="detail.status === 'pending_review'"
              type="button"
              class="btn-ghost danger"
              :disabled="busy"
              @click="rejectNl"
            >
              Rechazar
            </button>
            <button
              v-if="['pending_review', 'approved'].includes(detail.status)"
              type="button"
              class="btn-ghost"
              :disabled="busy"
              @click="cancelNl"
            >
              Cancelar
            </button>
            <button
              v-if="detail.status === 'pending_review'"
              type="button"
              class="btn-primary"
              :disabled="busy"
              @click="approveNl"
            >
              {{ approving ? 'Aprobando…' : 'Aprobar' }}
            </button>
            <button
              v-if="detail.status === 'approved'"
              type="button"
              class="btn-primary"
              :disabled="busy || !mailConfigured || !emailableCount"
              @click="sendNl"
            >
              {{ sending ? 'Enviando…' : `Enviar a ${emailableCount}` }}
            </button>
            <button type="button" class="btn-ghost" :disabled="busy" @click="closeDetail">Cerrar</button>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const route = useRoute()
const items = ref([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')
const mailConfigured = ref(true)
const stats = ref({ pending_review: 0, approved: 0, sent: 0, rejected: 0 })

const detail = ref(null)
const editSubject = ref('')
const editVariants = ref([])
const detailError = ref('')
const detailOk = ref('')
const busy = ref(false)
const pdfBusyId = ref(null)
const saving = ref(false)
const approving = ref(false)
const sending = ref(false)
const htmlPreview = ref('')
const recQ = ref('')
const addEmail = ref('')
const addNombre = ref('')

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'pending_review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'sent', label: 'Enviados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const canEdit = computed(() => ['pending_review', 'approved'].includes(detail.value?.status))
const audienceCount = computed(() => (detail.value?.recipients || []).length || detail.value?.totals?.recipients || 0)
const emailableCount = computed(() => {
  const list = detail.value?.recipients
  if (Array.isArray(list) && list.length) {
    return list.filter((r) => r.canEmail && r.included !== false).length
  }
  return detail.value?.totals?.emailable || 0
})
const recipientsFiltered = computed(() => {
  let list = [...(detail.value?.recipients || [])]
  const q = recQ.value.trim().toLowerCase()
  if (q) {
    list = list.filter((r) =>
      [r.nombre, r.email, r.areaNombre, ...(r.groupNombres || [])].join(' ').toLowerCase().includes(q),
    )
  }
  return list
})

async function toggleIncluded(r, included) {
  r.included = included
  busy.value = true
  detailError.value = ''
  try {
    const patch = { fingerprint: r.fingerprint, included }
    if (r.userId) patch.userId = r.userId
    if (r.email) patch.email = r.email
    const { data } = await api.patch(`/admin/newsletters/${detail.value.id}`, {
      recipients: [patch],
    })
    applyDetail(data.newsletter)
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo actualizar'
  } finally {
    busy.value = false
  }
}

async function setAllIncluded(included) {
  const patch = (detail.value?.recipients || []).map((r) => ({
    userId: r.userId || undefined,
    email: r.email,
    fingerprint: r.fingerprint,
    included,
  }))
  busy.value = true
  try {
    const { data } = await api.patch(`/admin/newsletters/${detail.value.id}`, { recipients: patch })
    applyDetail(data.newsletter)
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo actualizar'
  } finally {
    busy.value = false
  }
}

async function addExternal() {
  const email = addEmail.value.trim()
  if (!email || !detail.value?.id) return
  busy.value = true
  detailError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${detail.value.id}`, {
      addEmails: [{ email, nombre: addNombre.value.trim() || undefined }],
    })
    applyDetail(data.newsletter)
    addEmail.value = ''
    addNombre.value = ''
    detailOk.value = 'Email externo agregado'
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo agregar'
  } finally {
    busy.value = false
  }
}

async function removeExternal(r) {
  if (!r?.email) return
  busy.value = true
  try {
    const { data } = await api.patch(`/admin/newsletters/${detail.value.id}`, {
      removeEmails: [r.email],
    })
    applyDetail(data.newsletter)
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo quitar'
  } finally {
    busy.value = false
  }
}

function statusLabel(s) {
  return {
    pending_review: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    sending: 'Enviando',
    sent: 'Enviado',
    cancelled: 'Cancelado',
  }[s] || s
}

function deliveryLabel(s) {
  return { pending: 'Pendiente', skipped: 'Sin email', sent: 'Enviado', failed: 'Fallido' }[s] || s
}

function auditActionLabel(a) {
  return {
    created: 'Creado',
    edited: 'Editado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
    sending_started: 'Envío iniciado',
    sent: 'Enviado',
  }[a] || a
}

function tipoLabel(t) {
  return { noticia: 'Noticia', aviso: 'Aviso', beneficio: 'Beneficio', evento: 'Evento', celebracion: 'Celebración', general: 'General' }[t] || t
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(d)
  }
}

async function loadStats() {
  try {
    const { data } = await api.get('/admin/newsletters/stats')
    stats.value = data
  } catch {
    /* ignore */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await api.get('/admin/newsletters', { params })
    items.value = data.newsletters || []
    mailConfigured.value = data.mailConfigured !== false
    await loadStats()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

function applyDetail(n) {
  detail.value = n
  editSubject.value = n.subject || ''
  editVariants.value = (n.variants || []).map((v) => ({ ...v }))
  htmlPreview.value = ''
  detailError.value = ''
  detailOk.value = ''
}

async function openDetail(id) {
  detailError.value = ''
  detailOk.value = ''
  busy.value = true
  try {
    const { data } = await api.get(`/admin/newsletters/${id}`)
    applyDetail(data.newsletter)
    mailConfigured.value = data.mailConfigured !== false
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo abrir'
  } finally {
    busy.value = false
  }
}

function closeDetail() {
  if (sending.value) return
  detail.value = null
  htmlPreview.value = ''
}

async function saveEdits() {
  if (!detail.value || !canEdit.value) return
  saving.value = true
  busy.value = true
  detailError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${detail.value.id}`, {
      subject: editSubject.value,
      variants: editVariants.value.map((v) => ({
        fingerprint: v.fingerprint,
        summary: v.summary,
      })),
    })
    applyDetail(data.newsletter)
    detailOk.value = 'Cambios guardados'
    await load()
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo guardar'
  } finally {
    saving.value = false
    busy.value = false
  }
}

async function approveNl() {
  if (!detail.value) return
  if (canEdit.value && (editSubject.value !== detail.value.subject || summariesChanged())) {
    await saveEdits()
    if (detailError.value) return
  }
  approving.value = true
  busy.value = true
  detailError.value = ''
  try {
    const { data } = await api.post(`/admin/newsletters/${detail.value.id}/approve`, {})
    applyDetail(data.newsletter)
    detailOk.value = 'Aprobado. Ya podés enviarlo.'
    await load()
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo aprobar'
  } finally {
    approving.value = false
    busy.value = false
  }
}

function summariesChanged() {
  const orig = detail.value?.variants || []
  return editVariants.value.some((v, i) => (orig[i]?.summary || '') !== (v.summary || ''))
}

async function rejectNl() {
  const reason = window.prompt('Motivo del rechazo (obligatorio):')
  if (reason == null) return
  if (!String(reason).trim()) {
    detailError.value = 'El motivo es obligatorio'
    return
  }
  busy.value = true
  detailError.value = ''
  try {
    const { data } = await api.post(`/admin/newsletters/${detail.value.id}/reject`, {
      reason: String(reason).trim(),
    })
    applyDetail(data.newsletter)
    detailOk.value = 'Newsletter rechazado'
    await load()
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo rechazar'
  } finally {
    busy.value = false
  }
}

async function cancelNl() {
  if (!window.confirm('¿Cancelar este newsletter? No se podrá enviar.')) return
  busy.value = true
  try {
    const { data } = await api.post(`/admin/newsletters/${detail.value.id}/cancel`, {
      note: 'Cancelado desde auditoría',
    })
    applyDetail(data.newsletter)
    detailOk.value = 'Cancelado'
    await load()
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo cancelar'
  } finally {
    busy.value = false
  }
}

async function sendNl() {
  if (!detail.value || detail.value.status !== 'approved') return
  if (!window.confirm(`¿Enviar el newsletter aprobado a ${emailableCount.value} personas? Esta acción queda auditada.`)) {
    return
  }
  sending.value = true
  busy.value = true
  detailError.value = ''
  try {
    const { data } = await api.post(`/admin/newsletters/${detail.value.id}/send`)
    applyDetail(data.newsletter)
    detailOk.value = `Enviado: ${data.emailed} ok` + (data.failed ? `, ${data.failed} fallidos` : '')
    await load()
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo enviar'
  } finally {
    sending.value = false
    busy.value = false
  }
}

async function previewVariant(fingerprint) {
  if (!detail.value) return
  try {
    const { data } = await api.get(`/admin/newsletters/${detail.value.id}/preview-html`, {
      params: { fingerprint },
    })
    htmlPreview.value = data.html || ''
  } catch (e) {
    detailError.value = e.response?.data?.error || e.message || 'No se pudo previsualizar'
  }
}

function pdfFilename(id, subject) {
  const slug = String(subject || 'newsletter')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase()
  return `${slug || 'newsletter'}-${String(id).slice(-6)}.pdf`
}

async function blobErrorMessage(err) {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const json = JSON.parse(text)
      return json.error || text || 'No se pudo descargar el PDF'
    } catch {
      return 'No se pudo descargar el PDF'
    }
  }
  return err?.response?.data?.error || err?.message || 'No se pudo descargar el PDF'
}

async function downloadPdf(id, subject = '') {
  const nlId = id || detail.value?.id
  if (!nlId || pdfBusyId.value === nlId) return
  pdfBusyId.value = nlId
  detailError.value = ''
  error.value = ''
  try {
    const { data } = await api.get(`/admin/newsletters/${nlId}/pdf`, {
      responseType: 'blob',
    })
    if (data instanceof Blob && data.type && data.type.includes('json')) {
      const text = await data.text()
      let msg = 'No se pudo descargar el PDF'
      try {
        msg = JSON.parse(text).error || msg
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename(nlId, subject || detail.value?.subject)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    const msg = await blobErrorMessage(e)
    if (detail.value?.id === nlId) detailError.value = msg
    else error.value = msg
  } finally {
    pdfBusyId.value = null
  }
}

onMounted(async () => {
  await load()
  const openId = String(route.query.id || '')
  if (openId) openDetail(openId)
})
</script>

<style scoped>
.nls { max-width: 1100px; color: var(--cx-text); }
.nls-hero { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.nls-hero h1 { margin: 0; font-size: 1.55rem; font-weight: 700; }
.nls-hero p { margin: 6px 0 0; max-width: 58ch; font-size: 14px; color: var(--cx-muted); line-height: 1.45; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
.btn-primary, .btn-ghost, a.btn-primary {
  border-radius: 12px; padding: 11px 16px; font-weight: 700; font-size: 14px; text-decoration: none;
  display: inline-flex; align-items: center;
}
.btn-primary, a.btn-primary { border: 0; background: #0f766e; color: #fff; }
.btn-ghost { border: 1px solid var(--cx-border); background: transparent; color: var(--cx-text); font-weight: 600; }
.btn-ghost.danger { color: #b91c1c; border-color: color-mix(in srgb, #b91c1c 35%, var(--cx-border)); }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.chip {
  border: 1px solid var(--cx-border); background: var(--cx-surface); color: var(--cx-text);
  border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600;
}
.chip.on { background: #0f766e; border-color: #0f766e; color: #fff; }
.list { display: grid; gap: 10px; }
.row {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px;
  border: 1px solid var(--cx-border); background: var(--cx-surface); border-radius: 16px; padding: 14px; cursor: pointer;
}
.row:hover { border-color: #0f766e; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--cx-muted); margin-bottom: 6px; }
.row h2 { margin: 0; font-size: 1.05rem; }
.excerpt { margin: 6px 0 0; font-size: 13px; color: var(--cx-muted); }
.empty { text-align: center; color: var(--cx-muted); padding: 28px; }
.err { color: #b91c1c; background: #fef2f2; border-radius: 12px; padding: 10px 12px; font-size: 13px; }
.warn { color: #92400e; background: #fffbeb; border-radius: 12px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
.ok { color: #065f46; background: #ecfdf5; border-radius: 12px; padding: 10px 12px; font-size: 13px; font-weight: 600; }
.status-badge {
  display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 8px; border-radius: 6px; background: #e5e7eb; color: #374151;
}
.status-badge[data-status='pending_review'] { background: #fef3c7; color: #92400e; }
.status-badge[data-status='approved'] { background: #dbeafe; color: #1e40af; }
.status-badge[data-status='sent'] { background: #d1fae5; color: #065f46; }
.status-badge[data-status='rejected'] { background: #fee2e2; color: #991b1b; }
.status-badge[data-status='cancelled'] { background: #f3f4f6; color: #6b7280; }
.status-badge[data-status='sending'] { background: #e0e7ff; color: #3730a3; }
.status-badge.inline { vertical-align: middle; }
.link-btn { border: 0; background: transparent; color: #0f766e; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
.link-btn:disabled { opacity: 0.55; cursor: wait; }
.link-btn.danger { color: #b91c1c; }
.row-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
.sheet {
  position: fixed; inset: 0; z-index: 80; background: rgba(15, 23, 42, 0.5);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.sheet-panel {
  width: min(760px, 100%); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--cx-surface); color: var(--cx-text); border-radius: 20px; border: 1px solid var(--cx-border);
}
.sheet-head {
  display: flex; justify-content: space-between; gap: 12px; padding: 18px 20px 12px; border-bottom: 1px solid var(--cx-border);
}
.sheet-head h2 { margin: 0; font-size: 1.2rem; }
.sheet-head p { margin: 4px 0 0; font-size: 13px; color: var(--cx-muted); }
.kicker { font-size: 11px !important; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e !important; }
.sheet-form { padding: 16px 20px; overflow-y: auto; flex: 1; }
.sheet-foot {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center;
  padding: 12px 20px 16px; border-top: 1px solid var(--cx-border);
}
.foot-right { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--cx-border);
  background: var(--cx-input); color: var(--cx-text); font-size: 20px; line-height: 1;
}
.block { margin-bottom: 18px; }
.block h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--cx-muted); }
.input {
  width: 100%; border: 1px solid var(--cx-border); background: var(--cx-input); color: var(--cx-text);
  border-radius: 12px; padding: 10px 12px; font-size: 14px; box-sizing: border-box;
}
.plain { margin: 0; font-size: 15px; font-weight: 600; }
.posts { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.posts li {
  display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--cx-border); border-radius: 12px;
}
.tipo { font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase; }
.muted { color: var(--cx-muted); font-size: 12px; }
.variant {
  border: 1px solid var(--cx-border); border-radius: 14px; padding: 12px; margin-bottom: 10px;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.variant-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.ai-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0f766e;
  background: color-mix(in srgb, #0f766e 12%, transparent); border-radius: 6px; padding: 2px 6px;
}
.variant blockquote {
  margin: 0 0 8px; padding: 10px 12px; border-left: 3px solid #0f766e; border-radius: 0 10px 10px 0;
  background: color-mix(in srgb, #0f766e 8%, transparent); font-size: 14px; line-height: 1.5;
}
.stats-row {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px;
}
.stats-row div {
  text-align: center; padding: 10px; border-radius: 12px; border: 1px solid var(--cx-border);
}
.stats-row strong { display: block; font-size: 1.2rem; color: #0f766e; }
.stats-row span { font-size: 11px; color: var(--cx-muted); }
.table-wrap { overflow-x: auto; border: 1px solid var(--cx-border); border-radius: 12px; }
.rec-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.rec-toolbar .input { flex: 1; min-width: 180px; }
.add-email {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 10px;
}
@media (max-width: 640px) {
  .add-email { grid-template-columns: 1fr; }
}
.ext-tag {
  display: inline-block; margin-left: 6px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; color: #0f766e;
  background: color-mix(in srgb, #0f766e 12%, transparent);
  border-radius: 6px; padding: 2px 6px;
}
.grid tbody tr.off { opacity: 0.55; }
.org-cell { font-size: 12px; max-width: 220px; }
.grid { width: 100%; border-collapse: collapse; font-size: 13px; }
.grid th, .grid td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--cx-border); }
.deliv[data-s='sent'] { color: #065f46; font-weight: 600; }
.deliv[data-s='failed'] { color: #b91c1c; font-weight: 600; }
.deliv[data-s='skipped'] { color: #6b7280; }
.audit { margin: 0; padding-left: 18px; display: grid; gap: 8px; font-size: 13px; }
.audit time { color: var(--cx-muted); font-size: 12px; margin-right: 6px; }
.preview-frame {
  width: 100%; height: 360px; border: 1px solid var(--cx-border); border-radius: 12px; background: #fff;
}
@media (max-width: 700px) {
  .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
