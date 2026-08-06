<template>
  <section class="docs">
    <header class="docs-head">
      <div>
        <h1>Mis documentos</h1>
        <p>{{ subtitle }}</p>
      </div>
      <button type="button" class="docs-publish-btn" @click="openPublish">Publicar</button>
    </header>

    <nav class="docs-crumb" aria-label="Ubicación">
      <button type="button" class="crumb-link" :class="{ current: !category }" @click="goRoot">
        Mis documentos
      </button>
      <template v-for="(seg, i) in pathSegments" :key="seg.path">
        <span class="crumb-sep" aria-hidden="true">/</span>
        <button
          type="button"
          class="crumb-link"
          :class="{ current: i === pathSegments.length - 1 }"
          @click="openFolder(seg.path)"
        >
          {{ folderLabel(seg.label) }}
        </button>
      </template>
    </nav>

    <div class="docs-toolbar">
      <input
        v-model="q"
        type="search"
        class="docs-search"
        :placeholder="category ? 'Buscar en esta carpeta…' : 'Buscar en todas las carpetas…'"
        @keyup.enter="load"
      />
      <button type="button" class="docs-search-btn" @click="load">Buscar</button>
    </div>

    <div v-if="category || q" class="docs-filters">
      <button
        v-for="t in typeFilters"
        :key="t.id || 'all'"
        type="button"
        :class="{ on: fileType === t.id }"
        @click="setFileType(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" class="docs-err">{{ error }}</p>
    <p v-if="loading" class="docs-muted">Cargando…</p>

    <section v-if="!loading && showFolders && minePending.length" class="docs-mine">
      <h2>En aprobación</h2>
      <p class="docs-muted">Tus publicaciones pendientes. Cuando las aprueben, aparecerán para la audiencia elegida.</p>
      <ul class="docs-list">
        <li v-for="d in minePending" :key="d.id" class="file-row mine-row">
          <div class="docs-icon" :data-type="d.fileType" aria-hidden="true">{{ typeGlyph(d.fileType) }}</div>
          <div class="docs-main">
            <strong>{{ d.titulo }}</strong>
            <p>{{ audienceLabel(d) }} · {{ folderLabel(d.category) }}</p>
            <p class="docs-meta">
              <span class="docs-badge">{{ statusLabel(d.status) }}</span>
              <span v-if="d.fileName">· {{ d.fileName }}</span>
            </p>
          </div>
        </li>
      </ul>
    </section>

    <!-- Vista carpetas (raíz o subcarpetas) — mismo lenguaje visual que Admin -->
    <div v-if="!loading && showFolders" class="folder-grid">
      <button
        v-if="showParentFolder"
        type="button"
        class="folder-card folder-card--up"
        title="Subir a la carpeta anterior"
        @click="goParent"
      >
        <span class="folder-visual folder-visual--up" aria-hidden="true">
          <span class="folder-up-glyph">..</span>
        </span>
        <span class="folder-meta">
          <strong>{{ parentFolderLabel }}</strong>
          <small>Carpeta anterior</small>
        </span>
      </button>
      <button
        v-for="f in visibleFolders"
        :key="f.id || f.path"
        type="button"
        class="folder-card"
        @click="openFolder(f.id || f.path)"
      >
        <span class="folder-visual" aria-hidden="true">
          <span class="folder-tab" />
          <span class="folder-body-shape" />
          <span v-if="f.subCount" class="folder-badge">{{ f.subCount }}</span>
        </span>
        <span class="folder-meta">
          <strong>{{ folderLabel(f.name || f.label) }}</strong>
          <small>
            {{ f.count ?? f.fileCount ?? 0 }}
            {{ (f.count ?? f.fileCount ?? 0) === 1 ? 'archivo' : 'archivos' }}
            <template v-if="f.subCount">
              · {{ f.subCount }} {{ f.subCount === 1 ? 'subcarpeta' : 'subcarpetas' }}
            </template>
          </small>
        </span>
      </button>
      <p v-if="!visibleFolders.length && !category && !showParentFolder" class="docs-muted center">
        No hay carpetas con documentos para vos.
      </p>
    </div>

    <!-- Vista archivos -->
    <div v-if="!loading && showFiles" class="file-board">
      <article v-for="d in items" :key="d.id" class="file-card">
        <div class="file-card-avatar" :data-type="d.fileType" aria-hidden="true">
          {{ typeGlyph(d.fileType) }}
        </div>
        <div class="file-card-body">
          <div class="file-card-row1">
            <strong :title="d.titulo">{{ d.titulo }}</strong>
            <span
              v-if="d.requiresSignature"
              class="file-sign-pill"
              :data-ok="d.signedByMe ? '1' : '0'"
            >{{ d.signedByMe ? 'Firmado' : 'Firma' }}</span>
          </div>
          <div class="file-card-row2">
            <small class="file-card-meta">
              <button
                v-if="!category && d.category"
                type="button"
                class="path-link"
                @click="openFolder(d.category)"
              >{{ folderPathLabel(d.category) }}</button>
              <template v-if="!category && d.category"> · </template>
              <span>{{ d.fileTypeLabel || d.fileType || 'Archivo' }}</span>
              <template v-if="d.fileSize"> · {{ formatSize(d.fileSize) }}</template>
            </small>
            <div class="file-card-actions">
              <button
                v-if="d.requiresSignature && !d.signedByMe"
                type="button"
                class="file-action file-action--accent"
                @click="openSign(d)"
              >
                Firmar
              </button>
              <button
                type="button"
                class="file-icon-btn"
                title="Ver info"
                aria-label="Ver información del archivo"
                @click="openDetail(d)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                type="button"
                class="file-icon-btn"
                title="Abrir"
                aria-label="Abrir"
                :disabled="busyId === d.id"
                @click="openDoc(d)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button
                type="button"
                class="file-icon-btn"
                title="Descargar"
                aria-label="Descargar"
                :disabled="busyId === d.id"
                @click="downloadDoc(d)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
    <p v-if="!loading && showFiles && !items.length && !visibleFolders.length" class="docs-muted center">
      {{ q ? 'No hay resultados.' : 'Esta carpeta está vacía.' }}
    </p>
    <p v-else-if="!loading && showFiles && !items.length && visibleFolders.length" class="docs-muted center">
      No hay archivos en este nivel; abrí una subcarpeta.
    </p>

    <Teleport to="body">
    <div
      v-if="detailDoc"
      class="detail-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del documento"
      @click.self="closeDetail"
      @keydown.escape.prevent="closeDetail"
    >
      <div class="detail-sheet">
        <div class="detail-handle" aria-hidden="true" />
        <button type="button" class="detail-x" aria-label="Cerrar" @click="closeDetail">×</button>

        <div class="detail-head">
          <div class="detail-avatar" :data-type="detailDoc.fileType" aria-hidden="true">
            {{ typeGlyph(detailDoc.fileType) }}
          </div>
          <h2>{{ detailDoc.titulo }}</h2>
          <p class="detail-sub">
            {{ detailDoc.fileTypeLabel || detailDoc.fileType || 'Archivo' }}
            <template v-if="detailDoc.fileSize"> · {{ formatSize(detailDoc.fileSize) }}</template>
          </p>
          <p v-if="detailDoc.descripcion" class="detail-desc">{{ detailDoc.descripcion }}</p>
          <div class="detail-tags">
            <span class="detail-tag" :data-status="detailDoc.status">{{ statusLabel(detailDoc.status) }}</span>
            <span
              v-if="detailDoc.requiresSignature"
              class="detail-tag"
              :data-sign="detailDoc.signedByMe ? 'ok' : 'pending'"
            >{{ detailDoc.signedByMe ? 'Firmado' : 'Requiere firma' }}</span>
          </div>
        </div>

        <div class="detail-list">
          <button type="button" class="detail-row detail-row--btn" @click="openFolderFromDetail(detailDoc.category)">
            <span>Carpeta</span>
            <strong>{{ folderPathLabel(detailDoc.category) }} ›</strong>
          </button>
          <div class="detail-row">
            <span>Archivo</span>
            <strong>{{ detailDoc.fileName || '—' }}</strong>
          </div>
          <div class="detail-row">
            <span>Audiencia</span>
            <strong>{{ audienceLabel(detailDoc) }}</strong>
          </div>
          <div class="detail-row">
            <span>Repositorio</span>
            <strong>{{ detailDoc.repositoryLabel || detailDoc.repository || '—' }}</strong>
          </div>
          <div class="detail-row">
            <span>Origen</span>
            <strong>{{ sourceLabel(detailDoc) }}</strong>
          </div>
          <div class="detail-row">
            <span>Publicado por</span>
            <strong>{{ detailDoc.authorName || '—' }}</strong>
          </div>
          <div class="detail-row">
            <span>Publicado</span>
            <strong>{{ formatDocDate(detailDoc.publishedAt) }}</strong>
          </div>
          <div class="detail-row">
            <span>Actualizado</span>
            <strong>{{ formatDocDate(detailDoc.updatedAt) }}</strong>
          </div>
          <div class="detail-row">
            <span>Descargas</span>
            <strong>{{ detailDoc.downloadCount || 0 }}</strong>
          </div>
          <div class="detail-row">
            <span>Firmas</span>
            <strong>
              <template v-if="detailDoc.requiresSignature">{{ detailDoc.signatureCount || 0 }}</template>
              <template v-else>No requiere</template>
            </strong>
          </div>
          <div v-if="detailDoc.mimeType" class="detail-row">
            <span>MIME</span>
            <strong>{{ detailDoc.mimeType }}</strong>
          </div>
        </div>

        <div class="detail-bar">
          <button
            v-if="detailDoc.requiresSignature && !detailDoc.signedByMe"
            type="button"
            class="detail-bar-btn detail-bar-btn--soft"
            @click="openSignFromDetail"
          >
            Firmar
          </button>
          <button
            type="button"
            class="detail-bar-btn detail-bar-btn--ghost"
            :disabled="busyId === detailDoc.id"
            @click="downloadDoc(detailDoc)"
          >
            Descargar
          </button>
          <button
            type="button"
            class="detail-bar-btn detail-bar-btn--primary"
            :disabled="busyId === detailDoc.id"
            @click="openDoc(detailDoc)"
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <div v-if="signDoc" class="docs-sheet" @click.self="signDoc = null">
      <form class="docs-panel" @submit.prevent="confirmSign">
        <h2>Firmar documento</h2>
        <p>{{ signDoc.titulo }}</p>
        <p class="docs-muted">Escribí tu nombre completo como evidencia de aceptación.</p>
        <input v-model="signName" class="docs-search" required minlength="3" placeholder="Nombre y apellido" />
        <div class="docs-actions" style="justify-content: flex-end; margin-top: 12px">
          <button type="button" class="docs-sign" @click="signDoc = null">Cancelar</button>
          <button type="submit" class="docs-open" :disabled="signing">{{ signing ? '…' : 'Confirmar firma' }}</button>
        </div>
        <p v-if="signError" class="docs-err">{{ signError }}</p>
      </form>
    </div>

    <div v-if="showPublish" class="docs-sheet" @click.self="closePublish">
      <form class="docs-panel docs-panel-tall" @submit.prevent="submitPublish">
        <h2>Publicar documento</h2>
        <p class="docs-muted">Se envía a aprobación. Al aprobarlo, queda visible según la audiencia.</p>

        <label class="docs-field">
          <span>Título</span>
          <input v-model="publish.titulo" class="docs-search" required maxlength="200" placeholder="Nombre del documento" />
        </label>
        <label class="docs-field">
          <span>Descripción (opcional)</span>
          <textarea v-model="publish.descripcion" class="docs-search" rows="2" maxlength="1000" placeholder="Breve contexto" />
        </label>
        <label class="docs-field">
          <span>Carpeta / categoría</span>
          <input
            v-model="publish.category"
            class="docs-search"
            list="doc-cat-hints"
            maxlength="80"
            placeholder="general"
          />
          <datalist id="doc-cat-hints">
            <option v-for="c in categoryHints" :key="c" :value="c" />
          </datalist>
        </label>
        <label class="docs-field">
          <span>Archivo</span>
          <input type="file" class="docs-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv" @change="onFilePick" />
          <small v-if="publish.fileName" class="docs-muted">{{ publish.fileName }} · {{ formatSize(publish.fileSize) }}</small>
        </label>

        <fieldset class="docs-audience">
          <legend>¿Para quién?</legend>
          <label class="docs-radio">
            <input v-model="publish.target" type="radio" value="empresa" />
            Toda la empresa
          </label>
          <label class="docs-radio">
            <input v-model="publish.target" type="radio" value="area" />
            Un área
          </label>
          <label class="docs-radio">
            <input v-model="publish.target" type="radio" value="persona" />
            Una persona
          </label>

          <select v-if="publish.target === 'area'" v-model="publish.areaId" class="docs-search" required>
            <option disabled value="">Elegí un área…</option>
            <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>

          <div v-if="publish.target === 'persona'" class="docs-person-pick">
            <input
              v-model="userQ"
              type="search"
              class="docs-search"
              placeholder="Buscar persona…"
              @input="searchUsers"
            />
            <select v-model="publish.userId" class="docs-search" required>
              <option disabled value="">Elegí una persona…</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nombre }} (@{{ u.usuario }})</option>
            </select>
          </div>
        </fieldset>

        <p v-if="publishError" class="docs-err">{{ publishError }}</p>
        <p v-if="publishOk" class="docs-ok">{{ publishOk }}</p>
        <div class="docs-actions" style="justify-content: flex-end; margin-top: 12px">
          <button type="button" class="docs-sign" @click="closePublish">Cancelar</button>
          <button type="submit" class="docs-open" :disabled="publishing">
            {{ publishing ? 'Enviando…' : 'Enviar a aprobación' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const route = useRoute()
const router = useRouter()

const items = ref([])
const folders = ref([])
const q = ref('')
const category = ref('')
const fileType = ref('')
const loading = ref(true)
const error = ref('')
const busyId = ref('')
const detailDoc = ref(null)
const signDoc = ref(null)
const signName = ref('')
const signing = ref(false)
const signError = ref('')

const showPublish = ref(false)
const publishing = ref(false)
const publishError = ref('')
const publishOk = ref('')
const areas = ref([])
const users = ref([])
const categoryHints = ref(['general', 'políticas', 'comunicación', 'RRHH', 'TI'])
const mine = ref([])
const userQ = ref('')
let userSearchTimer = null

const publish = ref({
  titulo: '',
  descripcion: '',
  category: 'general',
  target: 'empresa',
  areaId: '',
  userId: '',
  fileUrl: '',
  fileName: '',
  fileSize: 0,
  mimeType: '',
  fileType: '',
  storageKey: '',
})

const minePending = computed(() => (mine.value || []).filter((d) => d.status === 'draft'))

const typeFilters = [
  { id: '', label: 'Todo tipo' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Imagen' },
  { id: 'word', label: 'Word' },
  { id: 'excel', label: 'Excel' },
  { id: 'powerpoint', label: 'PPT' },
  { id: 'text', label: 'Texto' },
  { id: 'other', label: 'Otros' },
]

/** Etiquetas amigables para categorías técnicas / seed */
const FOLDER_LABELS = {
  general: 'General',
  personal: 'Personales',
  rrhh: 'RRHH',
  'recibos de sueldo': 'Recibos de sueldo',
  recibos: 'Recibos de sueldo',
  'codigo de etica': 'Código de ética',
  'código de ética': 'Código de ética',
  etica: 'Código de ética',
  contratos: 'Contratos',
  comunicación: 'Comunicación',
  comunicacion: 'Comunicación',
  ti: 'TI',
  connectia: 'Connectyx',
}

const showFolders = computed(() => !q.value.trim())
const showFiles = computed(() => Boolean(category.value || q.value.trim()))
const visibleFolders = computed(() => folders.value || [])
const showParentFolder = computed(() => Boolean(category.value && !q.value.trim()))

const pathSegments = computed(() => {
  const parts = String(category.value || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
  const out = []
  let acc = ''
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p
    out.push({ label: p, path: acc })
  }
  return out
})

const subtitle = computed(() => {
  if (q.value.trim()) return 'Resultados de búsqueda'
  if (category.value) {
    const files = items.value.length
    const subs = visibleFolders.value.length
    const parts = []
    if (subs) parts.push(`${subs} subcarpeta${subs === 1 ? '' : 's'}`)
    parts.push(`${files} archivo${files === 1 ? '' : 's'}`)
    return parts.join(' · ')
  }
  return 'Explorá tus carpetas y abrí lo que necesitás'
})

function folderLabel(name) {
  const raw = String(name || 'general').trim() || 'general'
  const last = raw.split('/').map((s) => s.trim()).filter(Boolean).pop() || raw
  const key = last.toLowerCase()
  return FOLDER_LABELS[key] || last
}

const parentFolderLabel = computed(() => {
  if (!category.value) return 'Mis documentos'
  const parts = category.value.split('/').filter(Boolean)
  if (parts.length <= 1) return 'Mis documentos'
  return folderLabel(parts[parts.length - 2])
})

function folderPathLabel(name) {
  const raw = String(name || 'general').trim() || 'general'
  return raw
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => folderLabel(seg))
    .join(' / ')
}

function typeGlyph(t) {
  return (
    {
      pdf: 'PDF',
      image: 'IMG',
      word: 'DOC',
      excel: 'XLS',
      powerpoint: 'PPT',
      text: 'TXT',
      other: 'FILE',
    }[t] || 'FILE'
  )
}

function formatSize(n) {
  const b = Number(n) || 0
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function formatDocDate(raw) {
  if (!raw) return '—'
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return '—'
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const hh = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function sourceLabel(d) {
  const s = String(d?.source || '').toLowerCase()
  if (s === 'sap') return 'SAP'
  if (s === 'zip' || s === 'zip-library') return 'Import ZIP'
  if (s === 'drop') return 'Almacenamiento externo'
  if (d?.origin === 'member') return 'Publicado por miembro'
  if (s === 'manual' || !s) return 'Carga manual'
  return s
}

function openDetail(d) {
  detailDoc.value = d
}

function closeDetail() {
  detailDoc.value = null
}

function openFolderFromDetail(path) {
  closeDetail()
  openFolder(path)
}

function openSignFromDetail() {
  const d = detailDoc.value
  closeDetail()
  if (d) openSign(d)
}

function statusLabel(s) {
  if (s === 'draft') return 'Pendiente de aprobación'
  if (s === 'published') return 'Publicado'
  if (s === 'archived') return 'Archivado'
  return s || '—'
}

function audienceLabel(d) {
  const a = d?.audience || {}
  if (a.mode === 'all') return 'Toda la empresa'
  if (a.mode === 'users') return 'Persona específica'
  if (a.mode === 'restricted') return 'Área / grupo'
  return 'Audiencia definida'
}

async function loadMine() {
  try {
    const { data } = await api.get('/documents/mine')
    mine.value = data.items || []
  } catch {
    mine.value = []
  }
}

async function loadPublishMeta(q = '') {
  try {
    const { data } = await api.get('/documents/publish-meta', { params: { q: q || undefined } })
    areas.value = data.areas || []
    users.value = data.users || []
    if (data.categoriesHint?.length) categoryHints.value = data.categoriesHint
  } catch {
    /* meta opcional */
  }
}

function searchUsers() {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(() => loadPublishMeta(userQ.value.trim()), 280)
}

function resetPublish() {
  publish.value = {
    titulo: '',
    descripcion: '',
    category: 'general',
    target: 'empresa',
    areaId: '',
    userId: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    fileType: '',
    storageKey: '',
  }
  publishError.value = ''
  publishOk.value = ''
  userQ.value = ''
}

async function openPublish() {
  resetPublish()
  showPublish.value = true
  await loadPublishMeta()
}

function closePublish() {
  showPublish.value = false
  publishOk.value = ''
  publishError.value = ''
}

async function onFilePick(ev) {
  const file = ev.target?.files?.[0]
  if (!file) return
  publishError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    publish.value.fileUrl = data.fileUrl || data.url
    publish.value.fileName = data.fileName || file.name
    publish.value.fileSize = data.fileSize || file.size
    publish.value.mimeType = data.mimeType || file.type
    publish.value.fileType = data.fileType || ''
    publish.value.storageKey = data.storageKey || ''
    if (!publish.value.titulo.trim()) {
      publish.value.titulo = String(data.fileName || file.name).replace(/\.[^.]+$/, '').slice(0, 200)
    }
  } catch (e) {
    publishError.value = e.response?.data?.error || e.message
    publish.value.fileUrl = ''
    ev.target.value = ''
  }
}

async function submitPublish() {
  publishError.value = ''
  publishOk.value = ''
  if (!publish.value.fileUrl) {
    publishError.value = 'Subí un archivo primero'
    return
  }
  if (publish.value.target === 'area' && !publish.value.areaId) {
    publishError.value = 'Elegí un área'
    return
  }
  if (publish.value.target === 'persona' && !publish.value.userId) {
    publishError.value = 'Elegí una persona'
    return
  }
  publishing.value = true
  try {
    const { data } = await api.post('/documents', {
      titulo: publish.value.titulo.trim(),
      descripcion: publish.value.descripcion.trim(),
      category: publish.value.category.trim() || 'general',
      target: publish.value.target,
      areaId: publish.value.areaId || undefined,
      userId: publish.value.userId || undefined,
      fileUrl: publish.value.fileUrl,
      fileName: publish.value.fileName,
      fileSize: publish.value.fileSize,
      mimeType: publish.value.mimeType,
      fileType: publish.value.fileType,
      storageKey: publish.value.storageKey,
    })
    publishOk.value = data.message || 'Enviado a aprobación'
    await loadMine()
    setTimeout(() => {
      closePublish()
    }, 1400)
  } catch (e) {
    publishError.value = e.response?.data?.error || e.message
  } finally {
    publishing.value = false
  }
}

function syncRouteQuery() {
  const query = { ...route.query }
  if (category.value) query.folder = category.value
  else delete query.folder
  if (q.value.trim()) query.q = q.value.trim()
  else delete query.q
  if (fileType.value) query.type = fileType.value
  else delete query.type
  router.replace({ query })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/documents', {
      params: {
        q: q.value.trim() || undefined,
        category: category.value || undefined,
        fileType: fileType.value || undefined,
      },
    })
    items.value = data.items || []
    folders.value = data.folders || (data.categories || []).map((c) => ({ id: c, name: c, count: 0 }))
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function openFolder(id) {
  category.value = String(id || '').trim()
  q.value = ''
  fileType.value = ''
  syncRouteQuery()
  load()
}

function goParent() {
  if (!category.value) {
    goRoot()
    return
  }
  const parts = category.value.split('/').filter(Boolean)
  parts.pop()
  category.value = parts.join('/')
  fileType.value = ''
  syncRouteQuery()
  load()
}

function goRoot() {
  category.value = ''
  fileType.value = ''
  syncRouteQuery()
  load()
}

function setFileType(id) {
  fileType.value = id
  syncRouteQuery()
  load()
}

function openSign(d) {
  signDoc.value = d
  signName.value = ''
  signError.value = ''
}

async function confirmSign() {
  if (!signDoc.value) return
  signing.value = true
  signError.value = ''
  try {
    await api.post(`/documents/${signDoc.value.id}/sign`, { fullNameTyped: signName.value.trim() })
    signDoc.value = null
    await load()
  } catch (e) {
    signError.value = e.response?.data?.error || e.message
  } finally {
    signing.value = false
  }
}

async function resolveDocAccess(d) {
  if (d.requiresSignature && !d.signedByMe) {
    openSign(d)
    return null
  }
  const { data } = await api.post(`/documents/${d.id}/download`)
  return {
    fileName: data.fileName || d.fileName || d.titulo || 'documento',
    mimeType: data.mimeType || d.mimeType || '',
    fileType: data.fileType || d.fileType || '',
    fileUrl: data.fileUrl || d.fileUrl || '',
  }
}

function isBrowserPreviewable(mime = '', fileName = '') {
  const m = String(mime).toLowerCase()
  const n = String(fileName).toLowerCase()
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(n)) return true
  if (m === 'application/pdf' || n.endsWith('.pdf')) return true
  if (m.startsWith('text/') || /\.(txt|md|csv|rtf)$/i.test(n)) return true
  return false
}

function parseContentFileName(contentDisposition, fallback) {
  const cd = String(contentDisposition || '')
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      /* ignore */
    }
  }
  const plain = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;]+)/i)
  if (plain?.[1]) return plain[1].trim()
  return fallback
}

/**
 * Descarga el binario autenticado con MIME corregido (docx ≠ zip).
 */
async function fetchDocBlob(d, disposition = 'inline') {
  const access = await resolveDocAccess(d)
  if (!access) return null

  const res = await api.get(`/documents/${d.id}/content`, {
    responseType: 'arraybuffer',
    params: { disposition },
    timeout: 60000,
  })
  const ct = String(res.headers['content-type'] || '').split(';')[0].trim()
  if (ct.includes('application/json')) {
    const text = new TextDecoder().decode(res.data)
    const json = JSON.parse(text)
    if (json?.external && json.fileUrl) {
      return {
        external: true,
        url: resolveMediaUrl(json.fileUrl),
        fileName: json.fileName || access.fileName,
        mimeType: json.mimeType || access.mimeType,
      }
    }
    throw new Error(json?.error || 'No se pudo obtener el archivo')
  }

  const mimeType = ct || access.mimeType || 'application/octet-stream'
  const fileName = parseContentFileName(res.headers['content-disposition'], access.fileName)
  return {
    external: false,
    blob: new Blob([res.data], { type: mimeType }),
    fileName,
    mimeType,
  }
}

async function openDoc(d) {
  busyId.value = d.id
  error.value = ''
  try {
    const file = await fetchDocBlob(d, 'inline')
    if (!file) return
    if (file.external) {
      window.open(file.url, '_blank', 'noopener')
      return
    }
    const url = URL.createObjectURL(file.blob)
    if (isBrowserPreviewable(file.mimeType, file.fileName)) {
      window.open(url, '_blank', 'noopener')
    } else {
      // Office / otros: forzar nombre .docx/.xlsx para que el SO no lo abra como ZIP
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busyId.value = ''
  }
}

async function downloadDoc(d) {
  busyId.value = d.id
  error.value = ''
  try {
    const file = await fetchDocBlob(d, 'attachment')
    if (!file) return
    if (file.external) {
      const a = document.createElement('a')
      a.href = file.url
      a.download = file.fileName
      a.rel = 'noopener'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
      return
    }
    const url = URL.createObjectURL(file.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busyId.value = ''
  }
}

async function openFromQuery() {
  const id = route.query.doc
  if (!id) return
  let d = items.value.find((x) => x.id === id)
  if (!d) {
    // Puede estar en otra carpeta: buscar sin filtro
    try {
      const { data } = await api.get('/documents')
      d = (data.items || []).find((x) => x.id === id)
      if (d?.category) {
        category.value = d.category
        await load()
        d = items.value.find((x) => x.id === id) || d
      }
    } catch {
      /* ignore */
    }
  }
  if (d) await openDoc(d)
}

function applyRouteState() {
  category.value = String(route.query.folder || '').trim()
  q.value = String(route.query.q || '').trim()
  fileType.value = String(route.query.type || '').trim()
}

watch(
  () => route.query.doc,
  () => openFromQuery(),
)

onMounted(async () => {
  applyRouteState()
  await Promise.all([load(), loadMine()])
  await openFromQuery()
})
</script>

<style scoped>
.docs {
  padding: 16px 16px 32px;
  min-height: 100%;
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--brand-primary, #0f766e) 10%, transparent), transparent 55%),
    radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--brand-secondary, #6b3fa0) 8%, transparent), transparent 50%),
    var(--cx-page, #f8fafc);
}
.docs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.docs-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}
.docs-head p {
  margin: 6px 0 0;
  color: var(--muted, #64748b);
  font-size: 0.9rem;
}
.docs-publish-btn {
  flex-shrink: 0;
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  background: var(--brand-primary, #0f766e);
  color: #fff;
}

.docs-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 14px 0 12px;
  font-size: 0.85rem;
}
.crumb-link {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
}
.crumb-link.current { color: #0f172a; cursor: default; }
.crumb-sep { color: #94a3b8; }
.crumb-current { color: #0f172a; font-weight: 700; }

.docs-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 12px;
}
.docs-search {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, #cbd5e1 80%, transparent);
  border-radius: 12px;
  padding: 11px 14px;
  font: inherit;
  background: color-mix(in srgb, #fff 88%, transparent);
  backdrop-filter: blur(8px);
}
.docs-search-btn {
  border: 0;
  border-radius: 12px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
  background: var(--brand-primary, #0f766e);
  color: #fff;
}

.docs-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.docs-filters button {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 0.78rem;
  cursor: pointer;
}
.docs-filters button.on {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-color: transparent;
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.folder-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  border: 1px solid color-mix(in srgb, #e2e8f0 85%, transparent);
  border-radius: 18px;
  padding: 16px 14px 14px;
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--brand-primary, #0f766e) 6%, #fff) 0%,
      #fff 48%);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.folder-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 40%, #e2e8f0);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.09);
}
.folder-card:active { transform: translateY(-1px); }
.folder-card--up {
  background:
    linear-gradient(165deg,
      color-mix(in srgb, #64748b 8%, #fff) 0%,
      #fff 48%);
  border-style: dashed;
}
.folder-card--up:hover {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, #e2e8f0);
}
.folder-visual {
  position: relative;
  width: 56px;
  height: 44px;
}
.folder-visual--up {
  display: grid;
  place-items: center;
  width: 56px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, #64748b 12%, #fff);
  border: 1px dashed color-mix(in srgb, #64748b 35%, #e2e8f0);
}
.folder-up-glyph {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  color: #64748b;
  letter-spacing: 0.04em;
}
.folder-tab {
  position: absolute;
  left: 0;
  top: 0;
  width: 22px;
  height: 12px;
  border-radius: 6px 8px 0 0;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #fbbf24);
}
.folder-body-shape {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 8px;
  border-radius: 8px 12px 10px 10px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--brand-primary, #0f766e) 72%, #f59e0b),
    color-mix(in srgb, var(--brand-primary, #0f766e) 88%, #d97706)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.folder-badge {
  position: absolute;
  right: -4px;
  top: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: var(--brand-primary, #0f766e);
  font-size: 0.68rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.folder-meta { min-width: 0; display: grid; gap: 3px; }
.folder-meta strong {
  font-size: 0.95rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-meta small { color: #64748b; font-size: 0.75rem; }

.docs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.file-board {
  display: grid;
  gap: 10px;
  margin-bottom: 8px;
}
.file-card {
  display: grid;
  grid-template-columns: 10% 90%;
  align-items: center;
  gap: 0 10px;
  padding: 10px 12px 10px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.file-card-avatar {
  width: 100%;
  aspect-ratio: 1;
  max-width: 48px;
  max-height: 48px;
  margin: 0 auto;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: #ecfdf5;
  color: var(--brand-primary, #0f766e);
}
.file-card-avatar[data-type='pdf'] { background: #fef2f2; color: #b91c1c; }
.file-card-avatar[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.file-card-avatar[data-type='word'] { background: #dbeafe; color: #1e40af; }
.file-card-avatar[data-type='excel'] { background: #d1fae5; color: #047857; }
.file-card-avatar[data-type='powerpoint'] { background: #ffedd5; color: #c2410c; }
.file-card-avatar[data-type='text'] { background: #f1f5f9; color: #475569; }
.file-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.file-card-row1 {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.file-card-row1 strong {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-card-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.file-card-meta {
  flex: 1;
  min-width: 0;
  color: #64748b;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-sign-pill {
  display: inline-flex;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: #fff7ed;
  color: #c2410c;
}
.file-sign-pill[data-ok='1'] {
  background: #ecfdf5;
  color: #047857;
}
.file-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.file-icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  padding: 0;
}
.file-icon-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 45%, #e2e8f0);
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, #fff);
}
.file-icon-btn:disabled {
  opacity: 0.45;
  cursor: wait;
}
.file-action {
  border: 0;
  border-radius: 10px;
  padding: 6px 10px;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
}
.file-action--accent {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
}
.docs-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: #ecfdf5;
  color: var(--brand-primary, #0f766e);
  flex-shrink: 0;
}
.docs-icon[data-type='pdf'] { background: #fef2f2; color: #b91c1c; }
.docs-icon[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.docs-icon[data-type='word'] { background: #dbeafe; color: #1e40af; }
.docs-icon[data-type='excel'] { background: #d1fae5; color: #047857; }
.docs-icon[data-type='powerpoint'] { background: #ffedd5; color: #c2410c; }
.docs-icon[data-type='text'] { background: #f1f5f9; color: #475569; }
.docs-main { min-width: 0; }
.docs-list strong { display: block; color: #0f172a; }
.docs-list p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }
.docs-path { margin-top: 2px !important; }
.path-link {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  cursor: pointer;
}
.docs-meta { display: flex; flex-wrap: wrap; gap: 4px; }
.docs-actions { display: flex; gap: 6px; flex-shrink: 0; }
.docs-open, .docs-sign {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}
.docs-open { background: var(--brand-primary, #0f766e); color: #fff; }
.docs-sign { background: #f1f5f9; color: #0f172a; }
.docs-open--ghost {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
}

/* Modal detalle — bottom sheet app */
.detail-scrim {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.48);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
.detail-sheet {
  position: relative;
  width: min(480px, 100%);
  max-height: min(92vh, 760px);
  display: flex;
  flex-direction: column;
  background: #f4f6f8;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.22);
  overflow: hidden;
  animation: detail-up 0.22s ease-out;
}
@keyframes detail-up {
  from { transform: translateY(24px); opacity: 0.6; }
  to { transform: translateY(0); opacity: 1; }
}
.detail-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #cbd5e1;
  margin: 10px auto 0;
  flex-shrink: 0;
}
.detail-x {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}
.detail-head {
  padding: 8px 20px 16px;
  text-align: center;
}
.detail-avatar {
  width: 72px;
  height: 72px;
  margin: 4px auto 12px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  background: #ecfdf5;
  color: var(--brand-primary, #0f766e);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}
.detail-avatar[data-type='pdf'] { background: #fef2f2; color: #b91c1c; }
.detail-avatar[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.detail-avatar[data-type='word'] { background: #dbeafe; color: #1e40af; }
.detail-avatar[data-type='excel'] { background: #d1fae5; color: #047857; }
.detail-avatar[data-type='powerpoint'] { background: #ffedd5; color: #c2410c; }
.detail-avatar[data-type='text'] { background: #f1f5f9; color: #475569; }
.detail-head h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.3;
  color: #0f172a;
  word-break: break-word;
}
.detail-sub {
  margin: 6px 0 0;
  font-size: 0.84rem;
  color: #64748b;
}
.detail-desc {
  margin: 10px 0 0;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.4;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}
.detail-tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #334155;
}
.detail-tag[data-status='published'] { background: #d1fae5; color: #047857; }
.detail-tag[data-status='draft'] { background: #ffedd5; color: #c2410c; }
.detail-tag[data-status='archived'] { background: #e2e8f0; color: #64748b; }
.detail-tag[data-sign='ok'] { background: #d1fae5; color: #047857; }
.detail-tag[data-sign='pending'] { background: #ffedd5; color: #c2410c; }
.detail-list {
  margin: 0 12px 12px;
  padding: 4px 0;
  border-radius: 16px;
  background: #fff;
  overflow: auto;
  flex: 1;
  min-height: 0;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.detail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.86rem;
}
.detail-row:last-child { border-bottom: 0; }
.detail-row span {
  color: #64748b;
  flex-shrink: 0;
}
.detail-row strong {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}
.detail-row--btn {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.detail-row--btn:active { background: #f8fafc; }
.detail-row--btn strong { color: var(--brand-primary, #0f766e); }
.detail-bar {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 8px;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #eef2f7;
  flex-shrink: 0;
}
.detail-bar-btn {
  border: 0;
  border-radius: 14px;
  padding: 12px 10px;
  font: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.detail-bar-btn:disabled { opacity: 0.5; cursor: wait; }
.detail-bar-btn--primary {
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.detail-bar-btn--ghost {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
}
.detail-bar-btn--soft {
  background: #fff7ed;
  color: #c2410c;
}
@media (min-width: 640px) {
  .detail-scrim {
    align-items: center;
    padding: 24px;
  }
  .detail-sheet {
    border-radius: 22px;
    max-height: min(86vh, 720px);
  }
}
.docs-muted { color: #64748b; }
.docs-muted.center { text-align: center; margin-top: 28px; }
.docs-err { color: #b91c1c; }
.docs-ok { color: #047857; font-size: 0.9rem; margin: 8px 0 0; }
.docs-mine {
  margin: 0 0 20px;
  padding: 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 18%, #e2e8f0);
}
.docs-mine h2 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.docs-mine .docs-list { margin-top: 10px; }
.mine-row { background: #fff; }
.docs-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.72rem;
  font-weight: 700;
}
.docs-sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: end center;
  z-index: 40;
  padding: 16px;
}
.docs-panel {
  width: min(440px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  max-height: min(90vh, 720px);
  overflow: auto;
}
.docs-panel h2 { margin: 0 0 6px; font-size: 1.1rem; }
.docs-field {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}
.docs-field .docs-search,
.docs-field textarea { font-weight: 400; }
.docs-file {
  font: inherit;
  font-weight: 400;
  font-size: 0.85rem;
}
.docs-audience {
  margin: 14px 0 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: grid;
  gap: 8px;
}
.docs-audience legend {
  padding: 0 4px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}
.docs-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
}
.docs-person-pick {
  display: grid;
  gap: 8px;
}

@media (max-width: 520px) {
  .folder-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .file-card-row2 {
    flex-wrap: nowrap;
  }
  .file-icon-btn {
    width: 34px;
    height: 34px;
  }
}
</style>
