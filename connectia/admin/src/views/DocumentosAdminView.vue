<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Documentos</h1>
        <p>Archivos por tipo (PDF, imagen, Word…) y repositorio (servidor, URL, S3, SAP…)</p>
        <ScreenHelp
          purpose="ABM de documentos corporativos visibles en Mis documentos de la app."
          can-do="Crear/editar con tipo y repositorio; audiencia por comunidad, áreas/grupos o usuarios; bandeja externa (URL/S3/Drive) con patrón de nombre → usuario; sync SAP; firma y reporte."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" @click="openDropPanel">Bandeja externa</button>
        <button type="button" class="btn-ghost" @click="loadReport">Reporte descargas</button>
        <button type="button" class="btn-ghost" :disabled="sapSyncing" @click="syncSap">
          {{ sapSyncing ? 'Sync…' : 'Sync SAP' }}
        </button>
        <button type="button" class="btn-primary" @click="openNew">Nuevo documento</button>
      </div>
    </header>
    <p v-if="!sapConfigured" class="hint">
      SAP no configurado (SAP_DOCS_ENABLED / SAP_DOCS_BASE_URL). S3/Azure quedan listos con variables de entorno.
    </p>
    <p v-if="error" class="err">{{ error }}</p>
    <table class="table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Repositorio</th>
          <th>Categoría</th>
          <th>Audiencia</th>
          <th>Estado</th>
          <th>Firma</th>
          <th>Descargas</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in items" :key="d.id">
          <td>
            {{ d.titulo }}
            <span v-if="d.repository === 'sap' || d.source === 'sap'" class="pill soft">SAP</span>
            <span v-if="d.source === 'drop'" class="pill soft">Bandeja</span>
          </td>
          <td><span class="type-pill" :data-type="d.fileType">{{ d.fileTypeLabel || d.fileType || '—' }}</span></td>
          <td>{{ d.repositoryLabel || d.repository || '—' }}</td>
          <td>{{ d.category }}</td>
          <td>{{ audienceLabel(d) }}</td>
          <td>{{ d.status }}</td>
          <td>{{ d.requiresSignature ? `${d.signatureCount || 0} firma(s)` : '—' }}</td>
          <td>{{ d.downloadCount }}</td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="edit(d)">Editar</button>
            <button type="button" class="btn-ghost danger" @click="remove(d)">Borrar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length && !error" class="hint">Todavía no hay documentos.</p>

    <div v-if="report" class="report">
      <h3>Reporte de descargas</h3>
      <p class="hint">Total: {{ report.totalDownloads }}</p>
      <ul>
        <li v-for="r in report.ranking" :key="r.id">
          <b>{{ r.titulo }}</b> · {{ r.downloadCount }} descargas · {{ r.category }}
          · {{ r.fileType || '' }} · {{ r.repository || '' }}
        </li>
      </ul>
      <button type="button" class="btn-ghost" @click="exportReportCsv">Exportar CSV</button>
    </div>

    <div v-if="dropOpen" class="sheet" @click.self="dropOpen = false">
      <form class="panel panel-wide" @submit.prevent="saveDropConfig">
        <h2>Bandeja externa</h2>
        <p class="hint">
          Un tercero deja archivos en Drive, S3 o un índice URL. Connectia lee el listado, aplica un patrón de
          nombre (DNI, CUIL, legajo…) y publica el documento <b>solo</b> para el usuario coincidente.
        </p>

        <label class="check">
          <input v-model="dropConfig.enabled" type="checkbox" />
          Habilitar bandeja externa
        </label>

        <label>Origen
          <select v-model="dropConfig.source" class="input">
            <option v-for="s in dropMeta.sources" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <p class="hint">{{ currentDropSourceHint }}</p>

        <template v-if="dropConfig.source === 'url' || dropConfig.source === 's3'">
          <label>URL del manifiesto / índice JSON
            <input v-model="dropConfig.listUrl" class="input" placeholder="https://…/files.json" />
          </label>
          <label>Plantilla de URL del archivo (opcional)
            <input
              v-model="dropConfig.fileUrlTemplate"
              class="input"
              placeholder="https://cdn.ejemplo.com/docs/{name}"
            />
          </label>
        </template>

        <template v-if="dropConfig.source === 's3'">
          <div class="aud-lists">
            <label>Bucket
              <input v-model="dropConfig.s3.bucket" class="input" placeholder="mi-bucket" />
            </label>
            <label>Prefix
              <input v-model="dropConfig.s3.prefix" class="input" placeholder="recibos/" />
            </label>
            <label>Region
              <input v-model="dropConfig.s3.region" class="input" placeholder="us-east-1" />
            </label>
            <label>Public base URL
              <input v-model="dropConfig.s3.publicBaseUrl" class="input" placeholder="https://cdn…" />
            </label>
            <label>Endpoint (MinIO / custom)
              <input v-model="dropConfig.s3.endpoint" class="input" placeholder="https://s3.…" />
            </label>
          </div>
          <p class="hint">Credenciales: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (o S3_*) en el servidor.</p>
        </template>

        <template v-if="dropConfig.source === 'gdrive'">
          <label>listUrl (Apps Script / proxy) — opcional
            <input v-model="dropConfig.gdrive.listUrl" class="input" placeholder="https://…" />
          </label>
          <div class="aud-lists">
            <label>Folder ID
              <input v-model="dropConfig.gdrive.folderId" class="input" />
            </label>
            <label>API key {{ dropConfig.gdrive.apiKeySet ? '(cargada)' : '' }}
              <input
                v-model="dropConfig.gdrive.apiKey"
                class="input"
                type="password"
                autocomplete="off"
                placeholder="Dejá vacío para no cambiar"
              />
            </label>
          </div>
        </template>

        <label>Patrón de nombre
          <input v-model="dropConfig.namePattern" class="input" required placeholder="{dni}_recibo_{periodo}.pdf" />
        </label>
        <p class="hint">{{ dropMeta.patternHelp }}</p>

        <div class="aud-lists">
          <label>Token del patrón que identifica al usuario
            <input v-model="dropConfig.matchToken" class="input" placeholder="dni" />
          </label>
          <label>Campo del usuario
            <select v-model="dropConfig.matchField" class="input">
              <option v-for="f in dropMeta.matchFields" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>
          </label>
        </div>
        <label class="check">
          <input v-model="dropConfig.stripNonDigits" type="checkbox" />
          Normalizar quitando puntos/guiones (recomendado para DNI/CUIL)
        </label>

        <div class="aud-lists">
          <label>Título del documento
            <input v-model="dropConfig.tituloTemplate" class="input" placeholder="Recibo {periodo}" />
          </label>
          <label>Categoría
            <input v-model="dropConfig.category" class="input" />
          </label>
        </div>
        <label class="check">
          <input v-model="dropConfig.requiresSignature" type="checkbox" />
          Requiere firma al publicar
        </label>

        <div class="drop-test">
          <label>Probar un nombre de archivo
            <input v-model="dropTestName" class="input" placeholder="30111222_recibo_202603.pdf" />
          </label>
          <button type="button" class="btn-ghost" :disabled="dropTesting" @click="runDropTest">
            {{ dropTesting ? 'Probando…' : 'Probar patrón' }}
          </button>
          <pre v-if="dropTestResult" class="drop-pre">{{ dropTestResult }}</pre>
        </div>

        <div v-if="dropSyncResult" class="drop-sync-result">
          <h3>Último sync</h3>
          <pre class="drop-pre">{{ dropSyncResult }}</pre>
        </div>
        <p v-if="dropConfig.lastSyncSummary" class="hint">
          Último sync guardado: {{ formatDropSummary(dropConfig.lastSyncSummary) }}
        </p>

        <p v-if="dropError" class="err">{{ dropError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="dropOpen = false">Cerrar</button>
          <button type="button" class="btn-ghost" :disabled="dropSyncing" @click="runDropSync(true)">
            Simular
          </button>
          <button type="button" class="btn-ghost" :disabled="dropSyncing" @click="runDropSync(false)">
            {{ dropSyncing ? 'Sincronizando…' : 'Sincronizar ahora' }}
          </button>
          <button type="submit" class="btn-primary" :disabled="dropSaving">Guardar config</button>
        </div>
      </form>
    </div>

    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar' : 'Nuevo' }} documento</h2>
        <label>Título<input v-model="draft.titulo" class="input" required /></label>
        <label>Descripción<textarea v-model="draft.descripcion" rows="2" class="input" /></label>
        <label>Categoría / carpeta
          <input v-model="draft.category" class="input" placeholder="Ej: Recibos de sueldo, Contratos, Código de ética" />
        </label>
        <p class="hint">En Mis documentos cada categoría se ve como una carpeta del explorador.</p>

        <label>Tipo de archivo
          <select v-model="draft.fileType" class="input">
            <option v-for="t in fileTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </label>

        <label>Repositorio
          <select v-model="draft.repository" class="input" @change="onRepoChange">
            <option
              v-for="r in repositories.filter((x) => !x.syncOnly || draft.repository === 'sap')"
              :key="r.id"
              :value="r.id"
            >
              {{ r.label }}
            </option>
          </select>
        </label>
        <p class="hint">{{ currentRepo?.description }}</p>

        <div v-if="draft.repository === 'server'" class="upload-box">
          <label class="file-label">
            Subir archivo al servidor
            <input type="file" class="file-input" @change="onFileSelected" />
          </label>
          <p v-if="uploading" class="hint">Subiendo…</p>
          <p v-if="draft.fileName" class="hint">Archivo: {{ draft.fileName }} ({{ formatSize(draft.fileSize) }})</p>
        </div>

        <label v-if="draft.repository !== 'server' || draft.fileUrl">
          {{ draft.repository === 'server' ? 'URL / ruta en servidor' : 'URL del archivo' }}
          <input
            v-model="draft.fileUrl"
            class="input"
            :required="draft.repository !== 'server'"
            :placeholder="urlPlaceholder"
          />
        </label>

        <label v-if="needsStorageKey">
          Storage key (S3 key / blob path)
          <input v-model="draft.storageKey" class="input" placeholder="carpeta/archivo.pdf" />
        </label>

        <fieldset class="audience">
          <legend>Audiencia</legend>
          <p class="hint">Quién ve este documento en Mis documentos: toda la comunidad, áreas/grupos, o solo personas.</p>
          <div class="audience-modes">
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'all' }"
              @click="setAudienceMode('all')"
            >
              <strong>Toda la comunidad</strong>
              <small>Todos los miembros</small>
            </button>
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'restricted' }"
              @click="setAudienceMode('restricted')"
            >
              <strong>Áreas y/o grupos</strong>
              <small>+ personas puntuales</small>
            </button>
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'users' }"
              @click="setAudienceMode('users')"
            >
              <strong>Solo personas</strong>
              <small>Destinatarios puntuales</small>
            </button>
          </div>

          <div v-if="draft.audience.mode === 'restricted'" class="aud-lists">
            <div>
              <p class="aud-title">Áreas</p>
              <label v-for="a in orgAreas" :key="a.id" class="check">
                <input type="checkbox" :value="a.id" v-model="draft.audience.areaIds" />
                {{ a.nombre }}
              </label>
              <p v-if="!orgAreas.length" class="hint">No hay áreas. Creálas en Organización.</p>
            </div>
            <div>
              <p class="aud-title">Grupos</p>
              <label v-for="g in orgGroups" :key="g.id" class="check">
                <input type="checkbox" :value="g.id" v-model="draft.audience.groupIds" />
                {{ g.nombre }}
              </label>
              <p v-if="!orgGroups.length" class="hint">No hay grupos. Creálos en Organización.</p>
            </div>
          </div>

          <div
            v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'"
            class="audience-users"
          >
            <p class="aud-title">
              {{ draft.audience.mode === 'users' ? 'Destinatarios puntuales' : 'También incluir personas puntuales' }}
            </p>
            <p class="hint">
              {{
                draft.audience.mode === 'users'
                  ? 'Solo estas personas verán el documento.'
                  : 'Sumá gente de otras áreas (o individuales) además de las áreas/grupos marcados.'
              }}
            </p>
            <input
              v-model="audienceUserQuery"
              class="input"
              type="search"
              placeholder="Buscar por nombre, usuario o email…"
              @input="onAudienceUserQuery"
            />
            <p v-if="audienceUserSearching" class="hint">Buscando…</p>
            <ul v-else-if="audienceUserResults.length" class="audience-user-results">
              <li v-for="u in audienceUserResults" :key="u.id">
                <button
                  type="button"
                  class="audience-user-add"
                  :disabled="draft.audience.userIds.includes(u.id)"
                  @click="addAudienceUser(u)"
                >
                  <strong>{{ u.label }}</strong>
                  <small>{{ u.usuario }}{{ u.email ? ` · ${u.email}` : '' }}</small>
                </button>
              </li>
            </ul>
            <p v-else-if="audienceUserQuery.trim().length >= 2" class="hint">Sin resultados.</p>
            <div v-if="selectedAudienceUsers.length" class="audience-user-chips">
              <span v-for="u in selectedAudienceUsers" :key="u.id" class="audience-chip">
                {{ u.label }}
                <button
                  type="button"
                  class="audience-chip-x"
                  :title="`Quitar ${u.label}`"
                  @click="removeAudienceUser(u.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <p v-else class="hint">Todavía no agregaste personas puntuales.</p>
          </div>
        </fieldset>

        <label>Estado
          <select v-model="draft.status" class="input">
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
        <label class="check">
          <input v-model="draft.requiresSignature" type="checkbox" />
          Requiere firma antes de descargar
        </label>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving || uploading">Guardar</button>
        </div>
        <p v-if="formError" class="err">{{ formError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const draft = ref(null)
const error = ref('')
const formError = ref('')
const saving = ref(false)
const uploading = ref(false)
const sapConfigured = ref(false)
const sapSyncing = ref(false)
const report = ref(null)
const fileTypes = ref([])
const repositories = ref([])
const orgAreas = ref([])
const orgGroups = ref([])

const dropOpen = ref(false)
const dropConfig = ref(emptyDropConfig())
const dropMeta = ref({ sources: [], matchFields: [], patternHelp: '' })
const dropSaving = ref(false)
const dropSyncing = ref(false)
const dropTesting = ref(false)
const dropError = ref('')
const dropTestName = ref('')
const dropTestResult = ref('')
const dropSyncResult = ref('')

const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null

const currentRepo = computed(() => repositories.value.find((r) => r.id === draft.value?.repository))
const needsStorageKey = computed(() => Boolean(currentRepo.value?.needsStorageKey))
const urlPlaceholder = computed(() => {
  const id = draft.value?.repository
  if (id === 's3') return 'https://bucket.s3…/archivo.pdf o dejá storage key'
  if (id === 'sharepoint' || id === 'onedrive') return 'https://….sharepoint.com/…'
  if (id === 'gdrive') return 'https://drive.google.com/…'
  if (id === 'azure_blob') return 'https://….blob.core.windows.net/…'
  return 'https://…'
})

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => {
    const cached = audienceUserCache.value[id]
    if (cached) return cached
    return { id, label: id, usuario: '', email: '' }
  })
})

const currentDropSourceHint = computed(() => {
  const id = dropConfig.value?.source
  return dropMeta.value.sources?.find((s) => s.id === id)?.hint || ''
})

function emptyDropConfig() {
  return {
    enabled: false,
    source: 'url',
    namePattern: '{dni}_recibo_{periodo}.pdf',
    matchToken: 'dni',
    matchField: 'dni',
    stripNonDigits: true,
    tituloTemplate: 'Documento {periodo}',
    category: 'personal',
    requiresSignature: false,
    publishOnMatch: true,
    listUrl: '',
    fileUrlTemplate: '',
    s3: { bucket: '', prefix: '', region: 'us-east-1', endpoint: '', publicBaseUrl: '' },
    gdrive: { folderId: '', apiKey: '', listUrl: '', apiKeySet: false },
    lastSyncAt: null,
    lastSyncSummary: null,
  }
}

function applyDropConfig(cfg) {
  const base = emptyDropConfig()
  const c = cfg || {}
  dropConfig.value = {
    ...base,
    ...c,
    s3: { ...base.s3, ...(c.s3 || {}) },
    gdrive: { ...base.gdrive, ...(c.gdrive || {}) },
  }
  if (c.meta) {
    dropMeta.value = {
      sources: c.meta.sources || [],
      matchFields: c.meta.matchFields || [],
      patternHelp: c.meta.patternHelp || '',
    }
  }
}

async function load() {
  try {
    const { data } = await api.get('/admin/documents')
    items.value = data.items || []
    sapConfigured.value = Boolean(data.sapConfigured)
    fileTypes.value = data.meta?.fileTypes || []
    repositories.value = data.meta?.repositories || []
    orgAreas.value = data.org?.areas || []
    orgGroups.value = data.org?.groups || []
    if (data.docsDrop) applyDropConfig(data.docsDrop)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function openDropPanel() {
  dropOpen.value = true
  dropError.value = ''
  dropTestResult.value = ''
  dropSyncResult.value = ''
  try {
    const { data } = await api.get('/admin/documents/drop-config')
    applyDropConfig(data.config)
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
  }
}

async function saveDropConfig() {
  dropSaving.value = true
  dropError.value = ''
  try {
    const { data } = await api.put('/admin/documents/drop-config', { config: dropConfig.value })
    applyDropConfig(data.config)
    return true
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    return false
  } finally {
    dropSaving.value = false
  }
}

async function runDropTest() {
  dropTesting.value = true
  dropError.value = ''
  dropTestResult.value = ''
  try {
    const { data } = await api.post('/admin/documents/drop-test', {
      fileName: dropTestName.value,
      config: dropConfig.value,
    })
    dropTestResult.value = JSON.stringify(data, null, 2)
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    if (e.response?.data) dropTestResult.value = JSON.stringify(e.response.data, null, 2)
  } finally {
    dropTesting.value = false
  }
}

async function runDropSync(dryRun) {
  dropSyncing.value = true
  dropError.value = ''
  dropSyncResult.value = ''
  try {
    const saved = await saveDropConfig()
    if (!saved) return
    const { data } = await api.post('/admin/documents/drop-sync', { dryRun: Boolean(dryRun) })
    dropSyncResult.value = JSON.stringify(data.summary || data, null, 2)
    if (!dryRun) await load()
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    if (e.response?.data) dropSyncResult.value = JSON.stringify(e.response.data, null, 2)
  } finally {
    dropSyncing.value = false
  }
}

function formatDropSummary(s) {
  if (!s) return '—'
  return `listados ${s.listed ?? 0} · matched ${s.matched ?? 0} · sin match ${s.unmatched ?? 0} · patrón ${s.patternMiss ?? 0} · upsert ${s.upserted ?? 0}`
}

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function normalizeAudienceDraft(a) {
  const mode = ['restricted', 'users', 'none'].includes(a?.mode) ? a.mode : 'all'
  return {
    mode,
    areaIds: mode === 'restricted' ? [...(a?.areaIds || [])].map(String) : [],
    groupIds: mode === 'restricted' ? [...(a?.groupIds || [])].map(String) : [],
    userIds: mode === 'restricted' || mode === 'users' ? [...(a?.userIds || [])].map(String) : [],
  }
}

function setAudienceMode(mode) {
  if (!draft.value) return
  const prev = draft.value.audience || emptyAudience()
  draft.value.audience = normalizeAudienceDraft({
    ...prev,
    mode,
    userIds: mode === 'restricted' || mode === 'users' ? prev.userIds || [] : [],
    areaIds: mode === 'restricted' ? prev.areaIds || [] : [],
    groupIds: mode === 'restricted' ? prev.groupIds || [] : [],
  })
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  if (mode === 'restricted' || mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}

function audienceLabel(d) {
  const a = d?.audience
  if (!a || a.mode === 'all') return 'Todos'
  if (a.mode === 'none') return 'Nadie'
  if (a.mode === 'users') {
    const n = (a.userIds || []).length
    return n ? `${n} persona${n === 1 ? '' : 's'}` : 'Sin personas'
  }
  const areas = (a.areaIds || [])
    .map((id) => orgAreas.value.find((x) => x.id === id)?.nombre)
    .filter(Boolean)
  const groups = (a.groupIds || [])
    .map((id) => orgGroups.value.find((x) => x.id === id)?.nombre)
    .filter(Boolean)
  const parts = [...areas, ...groups]
  const extra = (a.userIds || []).length
  if (extra) parts.push(`+${extra} persona${extra === 1 ? '' : 's'}`)
  return parts.length ? parts.join(', ') : 'Segmentada'
}

function cacheAudienceUser(u) {
  if (!u?.id) return
  audienceUserCache.value = {
    ...audienceUserCache.value,
    [u.id]: {
      id: u.id,
      label: u.label || [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || u.id,
      usuario: u.usuario || '',
      email: u.email || '',
      areaId: u.areaId || null,
    },
  }
}

async function searchAudienceUsers(q) {
  const query = String(q || '').trim()
  if (query.length < 2) {
    audienceUserResults.value = []
    return
  }
  audienceUserSearching.value = true
  try {
    const { data } = await api.get('/admin/documents/audience-candidates', { params: { q: query } })
    const list = data.items || []
    list.forEach(cacheAudienceUser)
    audienceUserResults.value = list.filter((u) => !(draft.value?.audience?.userIds || []).includes(u.id))
  } catch {
    audienceUserResults.value = []
  } finally {
    audienceUserSearching.value = false
  }
}

function onAudienceUserQuery() {
  clearTimeout(audienceUserSearchTimer)
  audienceUserSearchTimer = setTimeout(() => searchAudienceUsers(audienceUserQuery.value), 250)
}

function addAudienceUser(u) {
  if (!draft.value || !u?.id) return
  cacheAudienceUser(u)
  const ids = draft.value.audience.userIds || []
  if (!ids.includes(u.id)) draft.value.audience.userIds = [...ids, u.id]
  audienceUserResults.value = audienceUserResults.value.filter((x) => x.id !== u.id)
}

function removeAudienceUser(id) {
  if (!draft.value) return
  draft.value.audience.userIds = (draft.value.audience.userIds || []).filter((x) => x !== id)
}

async function ensureAudienceUsersHydrated() {
  const ids = draft.value?.audience?.userIds || []
  const missing = ids.filter((id) => !audienceUserCache.value[id])
  if (!missing.length) return
  try {
    const { data } = await api.get('/admin/documents/audience-candidates', {
      params: { ids: missing.join(',') },
    })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

function openNew() {
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  draft.value = {
    titulo: '',
    descripcion: '',
    category: 'general',
    fileUrl: '',
    fileType: 'pdf',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    repository: 'server',
    storageKey: '',
    status: 'published',
    requiresSignature: false,
    audience: emptyAudience(),
  }
}

function edit(d) {
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  draft.value = {
    id: d.id,
    titulo: d.titulo,
    descripcion: d.descripcion || '',
    category: d.category || 'general',
    fileUrl: d.fileUrl,
    fileType: d.fileType || 'other',
    fileName: d.fileName || '',
    fileSize: d.fileSize || 0,
    mimeType: d.mimeType || '',
    repository: d.repository || 'url',
    storageKey: d.storageKey || '',
    status: d.status,
    requiresSignature: Boolean(d.requiresSignature),
    audience: normalizeAudienceDraft(d.audience || emptyAudience()),
  }
  if (draft.value.audience.mode === 'restricted' || draft.value.audience.mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}

function onRepoChange() {
  if (!draft.value) return
  if (draft.value.repository === 'server' && !draft.value.fileUrl) {
    // wait for upload
  }
}

function formatSize(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

async function onFileSelected(e) {
  const file = e.target?.files?.[0]
  if (!file || !draft.value) return
  uploading.value = true
  formError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/documents/upload', fd)
    draft.value.fileUrl = data.fileUrl || data.url
    draft.value.fileName = data.fileName || file.name
    draft.value.fileSize = data.fileSize || file.size
    draft.value.mimeType = data.mimeType || file.type
    draft.value.fileType = data.fileType || draft.value.fileType
    draft.value.storageKey = data.storageKey || ''
    draft.value.repository = 'server'
  } catch (err) {
    formError.value = err.response?.data?.error || err.message || 'No se pudo subir'
  } finally {
    uploading.value = false
    if (e.target) e.target.value = ''
  }
}

async function save() {
  if (!draft.value) return
  if (draft.value.repository === 'server' && !draft.value.fileUrl) {
    formError.value = 'Subí un archivo al servidor'
    return
  }
  const audience = normalizeAudienceDraft(draft.value.audience)
  if (audience.mode === 'users' && !audience.userIds.length) {
    formError.value = 'Elegí al menos un destinatario puntual'
    return
  }
  if (
    audience.mode === 'restricted' &&
    !audience.areaIds.length &&
    !audience.groupIds.length &&
    !audience.userIds.length
  ) {
    formError.value = 'Elegí al menos un área, grupo o persona'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      ...draft.value,
      audience,
    }
    if (draft.value.id) await api.patch(`/admin/documents/${draft.value.id}`, body)
    else await api.post('/admin/documents', body)
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function remove(d) {
  if (!confirm(`¿Borrar “${d.titulo}”?`)) return
  try {
    await api.delete(`/admin/documents/${d.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function syncSap() {
  sapSyncing.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/documents/sap-sync')
    alert(data.message || `Sincronizados: ${data.upserted}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    sapSyncing.value = false
  }
}

async function loadReport() {
  try {
    const { data } = await api.get('/admin/documents/report')
    report.value = data
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function exportReportCsv() {
  if (!report.value?.ranking?.length) return
  const rows = [['titulo', 'categoria', 'tipo', 'repositorio', 'descargas', 'firmas', 'status']]
  for (const r of report.value.ranking) {
    rows.push([
      r.titulo,
      r.category,
      r.fileType,
      r.repository,
      r.downloadCount,
      r.signatureCount,
      r.status,
    ])
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reporte-descargas-documentos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<style scoped>
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.page-head h1 { margin: 0; font-size: 1.5rem; }
.page-head p { margin: 4px 0 0; color: #64748b; }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
.actions { display: flex; gap: 8px; }
.sheet { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 40; padding: 12px; }
.panel {
  width: min(620px, 100%); max-height: 92vh; overflow: auto;
  background: #fff; border-radius: 16px; padding: 20px; display: grid; gap: 10px;
}
.panel-wide { width: min(760px, 100%); }
.drop-test, .drop-sync-result { display: grid; gap: 8px; margin-top: 4px; }
.drop-pre {
  margin: 0; padding: 10px; border-radius: 10px; background: #0f172a; color: #e2e8f0;
  font-size: 0.75rem; overflow: auto; max-height: 220px;
}
.input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.footer { display: flex; justify-content: flex-end; gap: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; }
.btn-primary { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.btn-ghost.danger { color: #b91c1c; }
.err { color: #b91c1c; }
.hint { color: #64748b; font-size: 0.85rem; margin: 0; }
.pill.soft { display: inline-block; margin-left: 6px; font-size: 0.7rem; padding: 2px 6px; border-radius: 999px; background: #e2e8f0; }
.type-pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.03em; padding: 3px 8px; border-radius: 6px; background: #ecfdf5; color: #0f766e;
}
.type-pill[data-type='pdf'] { background: #fef2f2; color: #b91c1c; }
.type-pill[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.type-pill[data-type='word'] { background: #eff6ff; color: #1e40af; }
.type-pill[data-type='excel'] { background: #ecfdf5; color: #047857; }
.type-pill[data-type='powerpoint'] { background: #fff7ed; color: #c2410c; }
.report { margin-top: 20px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.report ul { margin: 8px 0; padding-left: 18px; }
.upload-box {
  border: 1px dashed #94a3b8; border-radius: 12px; padding: 12px; background: #f8fafc;
}
.file-label { font-size: 0.85rem; }
.file-input { margin-top: 8px; width: 100%; }
.audience {
  border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin: 0;
  display: grid; gap: 10px;
}
.audience legend { padding: 0 6px; font-size: 0.8rem; font-weight: 700; color: #64748b; }
.audience-modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.aud-mode {
  text-align: left; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;
  background: #fff; cursor: pointer; display: grid; gap: 2px;
}
.aud-mode strong { font-size: 0.82rem; color: #0f172a; }
.aud-mode small { font-size: 0.72rem; color: #64748b; }
.aud-mode.on { border-color: #0f766e; background: color-mix(in srgb, #0f766e 8%, #fff); }
.aud-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.aud-title { margin: 0 0 4px; font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; }
.audience-users {
  display: grid; gap: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc;
}
.audience-user-results { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 180px; overflow-y: auto; }
.audience-user-add {
  width: 100%; text-align: left; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px;
  padding: 8px 10px; cursor: pointer;
}
.audience-user-add:hover:not(:disabled) { border-color: #0f766e; background: color-mix(in srgb, #0f766e 8%, #fff); }
.audience-user-add:disabled { opacity: 0.5; cursor: default; }
.audience-user-add strong { display: block; font-size: 13px; }
.audience-user-add small { display: block; margin-top: 2px; font-size: 11px; color: #64748b; }
.audience-user-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.audience-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px 5px 10px;
  border-radius: 999px; font-size: 12px; font-weight: 600;
  background: color-mix(in srgb, #0f766e 12%, #fff); color: #0f766e;
}
.audience-chip-x {
  border: 0; background: transparent; color: inherit; font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px;
}
@media (max-width: 560px) {
  .aud-lists, .audience-modes { grid-template-columns: 1fr; }
}
</style>
