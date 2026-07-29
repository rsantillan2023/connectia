<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Beneficios y billetera</h1>
        <p class="text-sm text-slate-500 mt-1">
          Catálogo, premios, canjes y puntos. Segmentá por audiencia; billetera según capability del tenant.
        </p>
        <ScreenHelp
          purpose="ABM del catálogo §18: beneficios/premios, partners, reglas de puntos por comunidad, acreditación y canjes."
          can-do="Publicar beneficios, definir puntos por uso del muro, cargar partners, acreditar y ver canjes."
        />
      </div>
      <div class="flex gap-2 flex-wrap">
        <button type="button" class="btn-ghost" @click="seedDefaults" :disabled="busy">Catálogo base</button>
        <button type="button" class="btn-ghost" @click="openRules">
          {{ panel === 'rules' ? 'Ver catálogo' : 'Reglas de puntos' }}
        </button>
        <button type="button" class="btn-ghost" @click="panel = panel === 'wallets' ? 'list' : 'wallets'">
          {{ panel === 'wallets' ? 'Ver catálogo' : 'Puntos' }}
        </button>
        <button type="button" class="btn-ghost" @click="panel = panel === 'partners' ? 'list' : 'partners'">
          {{ panel === 'partners' ? 'Ver catálogo' : 'Partners' }}
        </button>
        <button type="button" class="btn-ghost" @click="loadReport">Canjes</button>
        <button class="btn-primary" @click="openNew">+ Beneficio</button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <!-- Reglas de puntos por comunidad -->
    <section v-if="panel === 'rules'" class="mt-4 panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Reglas de puntos por uso</h2>
          <p class="text-sm text-slate-500 mt-1">
            Sumá puntos automáticamente cuando la comunidad publica, reacciona, comenta, guarda o comparte.
            Requiere capability <code>beneficios.billetera</code>.
          </p>
          <p v-if="rulesMeta.walletEnabled === false" class="text-sm text-amber-700 mt-1">
            La billetera no está activa en este tenant: las reglas no acreditarán hasta habilitarla en Comunidad.
          </p>
        </div>
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedRules">Cargar defaults</button>
      </div>
      <table class="w-full text-sm mt-3">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Acción</th>
            <th class="p-2">Puntos</th>
            <th class="p-2">Tope/día</th>
            <th class="p-2">Activa</th>
            <th class="p-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.event" class="border-t">
            <td class="p-2">
              <div class="font-medium">{{ r.eventLabel || r.label }}</div>
              <div class="text-xs text-slate-400 font-mono">{{ r.event }}</div>
            </td>
            <td class="p-2">
              <input v-model.number="r.points" class="input w-24" type="number" min="0" />
            </td>
            <td class="p-2">
              <input
                v-model="r.dailyCap"
                class="input w-24"
                type="number"
                min="0"
                placeholder="∞"
              />
            </td>
            <td class="p-2">
              <label class="inline-flex items-center gap-2">
                <input v-model="r.enabled" type="checkbox" />
                Sí
              </label>
            </td>
            <td class="p-2 text-right">
              <button type="button" class="btn-primary text-sm" :disabled="busy" @click="saveRule(r)">
                Guardar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Wallets / credit -->
    <section v-if="panel === 'wallets'" class="mt-4 panel">
      <h2 class="text-lg font-semibold">Acreditar puntos</h2>
      <div class="grid gap-2 mt-2" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
        <input v-model="credit.q" class="input" placeholder="Buscar usuario…" @input="searchCreditUser" />
        <input v-model.number="credit.amount" class="input" type="number" placeholder="Monto (+/-)" />
        <input v-model="credit.concept" class="input" placeholder="Concepto" />
        <button type="button" class="btn-primary" :disabled="!credit.userId || busy" @click="doCredit">
          Acreditar
        </button>
      </div>
      <ul v-if="creditResults.length" class="user-results mt-2">
        <li v-for="u in creditResults" :key="u.id">
          <button type="button" @click="pickCreditUser(u)">
            {{ u.label }} <span class="muted">@{{ u.usuario }}</span>
          </button>
        </li>
      </ul>
      <p v-if="credit.userId" class="text-sm mt-2">Destino: <strong>{{ credit.userLabel }}</strong></p>

      <h3 class="mt-4 font-medium">Saldos</h3>
      <table class="w-full text-sm mt-2">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Usuario</th>
            <th class="p-2">Nombre</th>
            <th class="p-2">Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in wallets" :key="w.userId" class="border-t">
            <td class="p-2">{{ w.usuario }}</td>
            <td class="p-2">{{ w.nombre }}</td>
            <td class="p-2 font-semibold">{{ w.balance }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Partners -->
    <section v-if="panel === 'partners'" class="mt-4 panel">
      <h2 class="text-lg font-semibold">Partners / enlaces</h2>
      <p class="text-sm text-slate-500">Requiere capability <code>beneficios.partners</code> en Comunidad para verse en la app.</p>
      <div class="grid gap-2 mt-3" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))">
        <input v-model="partnerDraft.titulo" class="input" placeholder="Título" />
        <input v-model="partnerDraft.url" class="input" placeholder="URL" />
        <input v-model="partnerDraft.descripcion" class="input" placeholder="Descripción" />
        <button type="button" class="btn-primary" @click="savePartner">Agregar</button>
      </div>
      <ul class="mt-3 space-y-2">
        <li v-for="p in partners" :key="p.id" class="flex justify-between gap-2 items-center border rounded-lg p-2">
          <div>
            <strong>{{ p.titulo }}</strong>
            <div class="text-xs text-slate-500 truncate">{{ p.url }}</div>
          </div>
          <button type="button" class="text-red-600 text-sm" @click="deletePartner(p)">Eliminar</button>
        </li>
      </ul>
    </section>

    <!-- Report -->
    <section v-if="panel === 'report'" class="mt-4 panel">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Canjes recientes</h2>
        <button type="button" class="btn-ghost" @click="panel = 'list'">Volver</button>
      </div>
      <table class="w-full text-sm mt-2">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Fecha</th>
            <th class="p-2">Beneficio</th>
            <th class="p-2">Código</th>
            <th class="p-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in report" :key="r.id" class="border-t">
            <td class="p-2">{{ formatDate(r.createdAt) }}</td>
            <td class="p-2">{{ r.benefitTitulo }}</td>
            <td class="p-2 font-mono text-xs">{{ r.code }}</td>
            <td class="p-2">{{ r.pointsSpent }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!report.length" class="text-sm text-slate-500 mt-2">Sin canjes en el período.</p>
    </section>

    <!-- List -->
    <template v-if="panel === 'list'">
      <div class="mt-4 flex flex-wrap gap-2 items-center">
        <input v-model="q" class="input min-w-[200px]" placeholder="Buscar…" @keyup.enter="load" />
        <select v-model="kind" class="input" @change="load">
          <option value="">Todos</option>
          <option value="benefit">Beneficios</option>
          <option value="reward">Premios</option>
        </select>
        <select v-model="status" class="input" @change="load">
          <option value="">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivados</option>
        </select>
        <button class="btn-ghost" @click="load">Buscar</button>
      </div>

      <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
              <th class="p-3">Título</th>
              <th class="p-3">Tipo</th>
              <th class="p-3">Pts</th>
              <th class="p-3">Estado</th>
              <th class="p-3">Audiencia</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in items" :key="d.id" class="border-t align-top">
              <td class="p-3">
                <strong>{{ d.titulo }}</strong>
                <div class="text-xs text-slate-500">{{ d.categoriaLabel }}</div>
              </td>
              <td class="p-3">{{ d.kindLabel }}</td>
              <td class="p-3">{{ d.costoPuntos || '—' }}</td>
              <td class="p-3">{{ d.status }}</td>
              <td class="p-3">{{ audienceLabel(d) }}</td>
              <td class="p-3 text-right whitespace-nowrap">
                <button type="button" class="text-teal-700 text-sm font-medium" @click="openEdit(d)">Editar</button>
                <button type="button" class="text-red-600 text-sm ml-2" @click="archive(d)">Archivar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Sheet -->
    <div v-if="draft" class="sheet-backdrop" @click.self="draft = null">
      <div class="sheet">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-lg font-semibold">{{ draft.id ? 'Editar' : 'Nuevo' }} beneficio</h2>
          <button type="button" class="btn-ghost" @click="draft = null">Cerrar</button>
        </div>
        <div class="grid gap-3">
          <label class="lbl">Título<input v-model="draft.titulo" class="input" /></label>
          <label class="lbl">Descripción<textarea v-model="draft.descripcion" class="input" rows="3" /></label>
          <label class="lbl">Condiciones<textarea v-model="draft.condiciones" class="input" rows="2" /></label>
          <div class="grid gap-2" style="grid-template-columns: 1fr 1fr">
            <label class="lbl">
              Tipo
              <select v-model="draft.kind" class="input">
                <option value="benefit">Beneficio</option>
                <option value="reward">Premio</option>
              </select>
            </label>
            <label class="lbl">
              Categoría
              <select v-model="draft.categoria" class="input">
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
            </label>
          </div>
          <div class="grid gap-2" style="grid-template-columns: 1fr 1fr 1fr">
            <label class="lbl">Puntos<input v-model.number="draft.costoPuntos" type="number" min="0" class="input" /></label>
            <label class="lbl">Stock<input v-model="draft.stock" class="input" placeholder="∞" /></label>
            <label class="lbl">
              Estado
              <select v-model="draft.status" class="input">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
          </div>
          <label class="lbl">
            Imagen
            <input v-model="draft.imageUrl" class="input" placeholder="URL o subí un archivo" />
            <input type="file" accept="image/*" class="mt-1 text-sm" @change="onImageFile" />
          </label>
          <div class="grid gap-2" style="grid-template-columns: 1fr 1fr">
            <label class="lbl">Lat<input v-model="draft.lat" class="input" placeholder="-34.60" /></label>
            <label class="lbl">Lng<input v-model="draft.lng" class="input" placeholder="-58.38" /></label>
          </div>
          <label class="lbl">Sucursal<input v-model="draft.sucursal" class="input" /></label>
          <label class="lbl">Partner<input v-model="draft.partnerName" class="input" /></label>
          <label class="lbl">URL partner<input v-model="draft.partnerUrl" class="input" /></label>

          <fieldset class="audience">
            <legend>Audiencia</legend>
            <div class="audience-modes">
              <button type="button" :class="{ on: draft.audience.mode === 'all' }" @click="setAudMode('all')">Toda la comunidad</button>
              <button type="button" :class="{ on: draft.audience.mode === 'restricted' }" @click="setAudMode('restricted')">Áreas / grupos</button>
              <button type="button" :class="{ on: draft.audience.mode === 'users' }" @click="setAudMode('users')">Personas</button>
            </div>
            <div v-if="draft.audience.mode === 'restricted'" class="aud-lists">
              <div>
                <p class="hint">Áreas</p>
                <label v-for="a in org.areas" :key="a.id" class="check">
                  <input type="checkbox" :value="a.id" v-model="draft.audience.areaIds" />
                  {{ a.nombre }}
                </label>
              </div>
              <div>
                <p class="hint">Grupos</p>
                <label v-for="g in org.groups" :key="g.id" class="check">
                  <input type="checkbox" :value="g.id" v-model="draft.audience.groupIds" />
                  {{ g.nombre }}
                </label>
              </div>
            </div>
            <div v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'" class="mt-2">
              <input
                v-model="audienceUserQuery"
                class="input"
                placeholder="Buscar personas…"
                @input="searchAudienceUsers"
              />
              <ul class="user-results">
                <li v-for="u in audienceUserResults" :key="u.id">
                  <button type="button" :disabled="draft.audience.userIds.includes(u.id)" @click="addAudienceUser(u)">
                    + {{ u.label }}
                  </button>
                </li>
              </ul>
              <div class="chips">
                <span v-for="u in selectedAudienceUsers" :key="u.id" class="chip">
                  {{ u.label }}
                  <button type="button" @click="removeAudienceUser(u.id)">×</button>
                </span>
              </div>
            </div>
          </fieldset>

          <div class="flex gap-2 justify-end">
            <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
            <button type="button" class="btn-primary" :disabled="busy" @click="save">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const categories = ref([])
const org = ref({ areas: [], groups: [] })
const q = ref('')
const kind = ref('')
const status = ref('')
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const draft = ref(null)
const panel = ref('list')
const wallets = ref([])
const partners = ref([])
const report = ref([])
const partnerDraft = ref({ titulo: '', url: '', descripcion: '' })
const credit = ref({ q: '', userId: '', userLabel: '', amount: 500, concept: 'Acreditación admin' })
const creditResults = ref([])
const rules = ref([])
const rulesMeta = ref({ walletEnabled: true })
const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserCache = ref({})
let audienceTimer = null
let creditTimer = null

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function audienceLabel(d) {
  const a = d?.audience
  if (!a || a.mode === 'all') return 'Todos'
  if (a.mode === 'users') return `${(a.userIds || []).length} personas`
  if (a.mode === 'none') return 'Nadie'
  const n = (a.areaIds?.length || 0) + (a.groupIds?.length || 0) + (a.userIds?.length || 0)
  return `Segmentado (${n})`
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => audienceUserCache.value[id] || { id, label: id })
})

async function load() {
  error.value = ''
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (kind.value) params.kind = kind.value
    if (status.value) params.status = status.value
    const { data } = await api.get('/admin/benefits', { params })
    items.value = data.items || []
    categories.value = data.categories || []
    org.value = data.org || { areas: [], groups: [] }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
  }
}

function openNew() {
  draft.value = {
    titulo: '',
    descripcion: '',
    condiciones: '',
    kind: 'benefit',
    categoria: 'otros',
    costoPuntos: 0,
    stock: '',
    status: 'published',
    imageUrl: '',
    partnerName: '',
    partnerUrl: '',
    lat: '',
    lng: '',
    sucursal: '',
    audience: emptyAudience(),
  }
}

function openEdit(d) {
  const aud = d.audience || emptyAudience()
  draft.value = {
    id: d.id,
    titulo: d.titulo,
    descripcion: d.descripcion,
    condiciones: d.condiciones,
    kind: d.kind,
    categoria: d.categoria,
    costoPuntos: d.costoPuntos,
    stock: d.stock == null ? '' : d.stock,
    status: d.status,
    imageUrl: d.imageUrl,
    partnerName: d.partnerName,
    partnerUrl: d.partnerUrl,
    lat: d.lat ?? '',
    lng: d.lng ?? '',
    sucursal: d.sucursal || '',
    audience: {
      mode: aud.mode || 'all',
      areaIds: (aud.areaIds || []).map(String),
      groupIds: (aud.groupIds || []).map(String),
      userIds: (aud.userIds || []).map(String),
    },
  }
  if (draft.value.audience.userIds.length) hydrateAudienceUsers(draft.value.audience.userIds)
}

function setAudMode(mode) {
  draft.value.audience = {
    mode,
    areaIds: mode === 'restricted' ? draft.value.audience.areaIds : [],
    groupIds: mode === 'restricted' ? draft.value.audience.groupIds : [],
    userIds: mode === 'users' || mode === 'restricted' ? draft.value.audience.userIds : [],
  }
}

async function hydrateAudienceUsers(ids) {
  try {
    const { data } = await api.get('/admin/benefits/audience-candidates', {
      params: { ids: ids.join(',') },
    })
    const cache = { ...audienceUserCache.value }
    for (const u of data.items || []) cache[u.id] = u
    audienceUserCache.value = cache
  } catch {
    /* ignore */
  }
}

function searchAudienceUsers() {
  clearTimeout(audienceTimer)
  audienceTimer = setTimeout(async () => {
    const qv = audienceUserQuery.value.trim()
    if (qv.length < 2) {
      audienceUserResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    audienceUserResults.value = data.items || []
  }, 250)
}

function addAudienceUser(u) {
  audienceUserCache.value = { ...audienceUserCache.value, [u.id]: u }
  if (!draft.value.audience.userIds.includes(u.id)) draft.value.audience.userIds.push(u.id)
}

function removeAudienceUser(id) {
  draft.value.audience.userIds = draft.value.audience.userIds.filter((x) => x !== id)
}

async function onImageFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/benefits/upload', fd)
    draft.value.imageUrl = data.url || data.urls?.[0] || ''
    okMsg.value = 'Imagen subida'
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo subir la imagen'
  }
}

async function save() {
  if (!draft.value?.titulo?.trim()) {
    error.value = 'Título obligatorio'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const body = {
      ...draft.value,
      stock: draft.value.stock === '' ? null : Number(draft.value.stock),
      lat: draft.value.lat === '' ? null : Number(draft.value.lat),
      lng: draft.value.lng === '' ? null : Number(draft.value.lng),
    }
    if (draft.value.id) {
      await api.patch(`/admin/benefits/${draft.value.id}`, body)
      okMsg.value = 'Beneficio actualizado'
    } else {
      await api.post('/admin/benefits', body)
      okMsg.value = 'Beneficio creado'
    }
    draft.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    busy.value = false
  }
}

async function archive(d) {
  if (!confirm(`Archivar «${d.titulo}»?`)) return
  try {
    await api.delete(`/admin/benefits/${d.id}`)
    okMsg.value = 'Archivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo archivar'
  }
}

async function seedDefaults() {
  busy.value = true
  try {
    const { data } = await api.post('/admin/benefits/seed-defaults')
    okMsg.value = `Catálogo base: ${data.created} nuevos, ${data.skipped} ya existían`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al seed'
  } finally {
    busy.value = false
  }
}

async function loadWallets() {
  const { data } = await api.get('/admin/benefits/wallets')
  wallets.value = data.items || []
}

async function loadPartners() {
  const { data } = await api.get('/admin/benefits/partners')
  partners.value = data.items || []
}

async function loadReport() {
  panel.value = 'report'
  const { data } = await api.get('/admin/benefits/report')
  report.value = data.items || []
}

function searchCreditUser() {
  clearTimeout(creditTimer)
  creditTimer = setTimeout(async () => {
    const qv = credit.value.q.trim()
    if (qv.length < 2) {
      creditResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    creditResults.value = data.items || []
  }, 250)
}

function pickCreditUser(u) {
  credit.value.userId = u.id
  credit.value.userLabel = u.label
  credit.value.q = u.usuario
  creditResults.value = []
}

async function openRules() {
  if (panel.value === 'rules') {
    panel.value = 'list'
    return
  }
  panel.value = 'rules'
  await loadRules()
}

async function loadRules() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/points-rules')
    rules.value = (data.items || []).map((r) => ({
      ...r,
      dailyCap: r.dailyCap == null ? '' : r.dailyCap,
    }))
    rulesMeta.value = { walletEnabled: data.walletEnabled !== false }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las reglas'
  }
}

async function saveRule(r) {
  busy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const dailyCap =
      r.dailyCap === '' || r.dailyCap == null || Number.isNaN(Number(r.dailyCap))
        ? null
        : Number(r.dailyCap)
    const { data } = await api.put(`/admin/points-rules/${r.event}`, {
      points: Number(r.points) || 0,
      dailyCap,
      enabled: Boolean(r.enabled),
      label: r.label || r.eventLabel,
    })
    okMsg.value = `Regla «${data.rule?.eventLabel || r.event}» guardada`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar la regla'
  } finally {
    busy.value = false
  }
}

async function seedRules() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/points-rules/seed')
    okMsg.value = `Defaults: ${data.created} nuevas, ${data.skipped} ya existían`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron crear defaults'
  } finally {
    busy.value = false
  }
}

async function doCredit() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/benefits/credit', {
      userId: credit.value.userId,
      amount: Number(credit.value.amount),
      concept: credit.value.concept,
      idempotencyKey: `admin-credit:${credit.value.userId}:${Date.now()}`,
    })
    okMsg.value = `Saldo actualizado: ${data.balance} pts`
    await loadWallets()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo acreditar'
  } finally {
    busy.value = false
  }
}

async function savePartner() {
  try {
    await api.post('/admin/benefits/partners', partnerDraft.value)
    partnerDraft.value = { titulo: '', url: '', descripcion: '' }
    okMsg.value = 'Partner agregado'
    await loadPartners()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar partner'
  }
}

async function deletePartner(p) {
  if (!confirm(`Eliminar «${p.titulo}»?`)) return
  await api.delete(`/admin/benefits/partners/${p.id}`)
  await loadPartners()
}

onMounted(async () => {
  await load()
})

watch(panel, async (p) => {
  if (p === 'wallets') await loadWallets()
  if (p === 'partners') await loadPartners()
})
</script>

<style scoped>
.btn-primary {
  border-radius: 0.5rem;
  background: #0f766e;
  color: #fff;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.btn-ghost {
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
}
.input {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  width: 100%;
}
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}
.sheet {
  width: min(480px, 100%);
  height: 100%;
  background: #fff;
  overflow: auto;
  padding: 1.25rem;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
}
.audience {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.75rem;
}
.audience-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.audience-modes button {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
}
.audience-modes button.on {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}
.aud-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.check {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
.hint {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
}
.user-results {
  list-style: none;
  margin: 0.35rem 0;
  padding: 0;
}
.user-results button {
  border: none;
  background: #f8fafc;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
}
.chip {
  background: #ecfdf5;
  color: #0f766e;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}
.chip button {
  border: none;
  background: transparent;
  color: #0f766e;
}
.muted {
  color: #94a3b8;
}
</style>
