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
      <template v-if="category">
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span class="crumb-current">{{ folderLabel(category) }}</span>
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

    <!-- Vista carpetas (raíz, sin búsqueda) -->
    <div v-if="!loading && showFolders" class="folder-grid">
      <button
        v-for="f in visibleFolders"
        :key="f.id"
        type="button"
        class="folder-card"
        @click="openFolder(f.id)"
      >
        <span class="folder-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              class="folder-back"
              d="M6 14c0-2.2 1.8-4 4-4h8.2c1.1 0 2.1.4 2.8 1.2l1.8 1.8c.7.8 1.7 1.2 2.8 1.2H38c2.2 0 4 1.8 4 4v18c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4V14z"
            />
            <path
              class="folder-front"
              d="M6 20h36v18c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4V20z"
            />
          </svg>
        </span>
        <span class="folder-body">
          <strong>{{ folderLabel(f.name) }}</strong>
          <small>{{ f.count }} {{ f.count === 1 ? 'archivo' : 'archivos' }}</small>
        </span>
        <span class="folder-chevron" aria-hidden="true">›</span>
      </button>
      <p v-if="!visibleFolders.length" class="docs-muted center">No hay carpetas con documentos para vos.</p>
    </div>

    <!-- Vista archivos (dentro de carpeta o resultados de búsqueda) -->
    <ul v-if="!loading && showFiles" class="docs-list">
      <li v-for="d in items" :key="d.id" class="file-row">
        <div class="docs-icon" :data-type="d.fileType" aria-hidden="true">
          {{ typeGlyph(d.fileType) }}
        </div>
        <div class="docs-main">
          <strong>{{ d.titulo }}</strong>
          <p v-if="!category" class="docs-path">
            <button type="button" class="path-link" @click="openFolder(d.category)">
              {{ folderLabel(d.category) }}
            </button>
          </p>
          <p>{{ d.descripcion || d.fileName || 'Sin descripción' }}</p>
          <p class="docs-meta">
            <span>{{ d.fileTypeLabel || d.fileType || 'Archivo' }}</span>
            <span v-if="d.fileSize">· {{ formatSize(d.fileSize) }}</span>
            <span v-if="d.requiresSignature">· {{ d.signedByMe ? 'Firmado' : 'Pendiente de firma' }}</span>
          </p>
        </div>
        <div class="docs-actions">
          <button
            v-if="d.requiresSignature && !d.signedByMe"
            type="button"
            class="docs-sign"
            @click="openSign(d)"
          >
            Firmar
          </button>
          <button type="button" class="docs-open" :disabled="opening === d.id" @click="openDoc(d)">
            {{ opening === d.id ? '…' : 'Abrir' }}
          </button>
        </div>
      </li>
    </ul>
    <p v-if="!loading && showFiles && !items.length" class="docs-muted center">
      {{ q ? 'No hay resultados.' : 'Esta carpeta está vacía.' }}
    </p>

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

const route = useRoute()
const router = useRouter()

const items = ref([])
const folders = ref([])
const q = ref('')
const category = ref('')
const fileType = ref('')
const loading = ref(true)
const error = ref('')
const opening = ref('')
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
  connectia: 'Connectia',
}

const showFolders = computed(() => !category.value && !q.value.trim())
const showFiles = computed(() => Boolean(category.value || q.value.trim()))
const visibleFolders = computed(() => folders.value || [])

const subtitle = computed(() => {
  if (category.value) return `${items.value.length} archivo${items.value.length === 1 ? '' : 's'} en esta carpeta`
  if (q.value.trim()) return 'Resultados de búsqueda'
  return 'Explorá tus carpetas y abrí lo que necesitás'
})

function folderLabel(name) {
  const raw = String(name || 'general').trim() || 'general'
  const key = raw.toLowerCase()
  return FOLDER_LABELS[key] || raw
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

async function openDoc(d) {
  opening.value = d.id
  error.value = ''
  try {
    if (d.requiresSignature && !d.signedByMe) {
      openSign(d)
      return
    }
    const { data } = await api.post(`/documents/${d.id}/download`)
    const url = data.fileUrl || d.fileUrl
    if (url) window.open(url, '_blank', 'noopener')
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    opening.value = ''
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
    radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--brand-secondary, #134e4a) 8%, transparent), transparent 50%),
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
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.folder-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  border: 1px solid color-mix(in srgb, #e2e8f0 90%, transparent);
  border-radius: 16px;
  padding: 14px 12px;
  background: color-mix(in srgb, #fff 92%, transparent);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.folder-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, #e2e8f0);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}
.folder-card:active { transform: translateY(0); }
.folder-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
}
.folder-icon svg { width: 40px; height: 40px; }
.folder-back { fill: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #fbbf24); }
.folder-front { fill: color-mix(in srgb, var(--brand-primary, #0f766e) 75%, #f59e0b); opacity: 0.92; }
.folder-body { min-width: 0; display: grid; gap: 2px; }
.folder-body strong {
  font-size: 0.92rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-body small { color: #64748b; font-size: 0.75rem; }
.folder-chevron {
  color: #94a3b8;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1;
}

.docs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.file-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
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
  color: #0f766e;
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
  .folder-grid { grid-template-columns: 1fr; }
  .file-row { grid-template-columns: 40px minmax(0, 1fr); }
  .docs-actions { grid-column: 1 / -1; justify-content: flex-end; }
}
</style>
