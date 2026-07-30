<template>
  <div class="rv">
    <header class="rv-head">
      <div>
        <h1>Reservas</h1>
        <p>Configurá sedes, tipos de activo y recursos · aprobá pendientes.</p>
      </div>
      <div class="rv-actions">
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedDefaults">
          Cargar demo
        </button>
      </div>
    </header>

    <ol class="rv-steps" aria-label="Recorrido de configuración">
      <li :class="{ on: tab === 'sites' }" @click="tab = 'sites'"><span>1</span> Sedes</li>
      <li :class="{ on: tab === 'types' }" @click="tab = 'types'"><span>2</span> Tipos</li>
      <li :class="{ on: tab === 'resources' }" @click="tab = 'resources'"><span>3</span> Recursos</li>
      <li :class="{ on: tab === 'policy' }" @click="tab = 'policy'"><span>4</span> Políticas</li>
      <li :class="{ on: tab === 'pending' }" @click="tab = 'pending'"><span>5</span> Pendientes</li>
    </ol>

    <nav class="rv-tabs">
      <button type="button" :class="{ on: tab === 'report' }" @click="tab = 'report'">Resumen</button>
      <button type="button" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">
        Pendientes
        <em v-if="pending.length">{{ pending.length }}</em>
      </button>
      <button type="button" :class="{ on: tab === 'sites' }" @click="tab = 'sites'">Sedes</button>
      <button type="button" :class="{ on: tab === 'types' }" @click="tab = 'types'">Tipos</button>
      <button type="button" :class="{ on: tab === 'attrs' }" @click="tab = 'attrs'">Atributos</button>
      <button type="button" :class="{ on: tab === 'resources' }" @click="tab = 'resources'">Recursos</button>
      <button type="button" :class="{ on: tab === 'policy' }" @click="tab = 'policy'">Políticas</button>
    </nav>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <section v-if="tab === 'report'" class="panel">
      <div class="stats">
        <div><strong>{{ report.activeNow || 0 }}</strong><span>Activas ahora</span></div>
        <div><strong>{{ report.pending || 0 }}</strong><span>Pendientes</span></div>
        <div><strong>{{ report.officeToday || 0 }}</strong><span>En oficina hoy</span></div>
        <div><strong>{{ report.noShows || 0 }}</strong><span>No-shows (30d)</span></div>
      </div>
      <h3 class="sub">Por tipo de motor</h3>
      <ul class="plain">
        <li v-for="(n, k) in report.byKind || {}" :key="k">{{ labelKind(k) }}: {{ n }}</li>
        <li v-if="!Object.keys(report.byKind || {}).length" class="muted">Sin datos aún.</li>
      </ul>
    </section>

    <section v-if="tab === 'pending'" class="panel">
      <p class="hint">Reservas que esperan tu aprobación.</p>
      <ul class="list">
        <li v-for="r in pending" :key="r.id" class="card">
          <div>
            <strong>{{ r.resourceNombre }}</strong>
            <p class="muted">{{ r.userName }} · {{ r.kindLabel }} · {{ fmt(r.startAt) }}</p>
          </div>
          <div class="row">
            <button type="button" class="btn-primary" @click="approve(r)">Aprobar</button>
            <button type="button" class="btn-ghost" @click="reject(r)">Rechazar</button>
          </div>
        </li>
        <li v-if="!pending.length" class="empty">No hay pendientes. Todo al día.</li>
      </ul>
    </section>

    <section v-if="tab === 'sites'" class="panel">
      <div class="panel-bar">
        <p class="hint">Primero creá las sedes donde viven los recursos.</p>
        <button type="button" class="btn-primary" @click="openSite()">+ Nueva sede</button>
      </div>
      <ul class="list">
        <li v-for="s in sites" :key="s.id" class="card">
          <div>
            <strong>{{ s.nombre }}</strong>
            <p class="muted">
              {{ s.codigo || 'sin código' }} · aforo {{ s.aforoMax ?? '—' }} ·
              {{ s.activo ? 'activa' : 'inactiva' }}
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="openSite(s)">Editar</button>
        </li>
        <li v-if="!sites.length" class="empty">Todavía no hay sedes. Creá la primera.</li>
      </ul>
    </section>

    <section v-if="tab === 'types'" class="panel">
      <div class="panel-bar">
        <p class="hint">
          Tipos configurables: sala, cochera, proyector, herramienta… El motor define cómo se reserva.
        </p>
        <button type="button" class="btn-primary" @click="openType()">+ Nuevo tipo</button>
      </div>
      <ul class="list">
        <li v-for="t in types" :key="t.id" class="card">
          <div>
            <strong>{{ t.label }}</strong>
            <p class="muted">
              {{ t.codigo }} · motor {{ labelKind(t.engineKind) }}
              <span v-if="t.system"> · sistema</span>
              <span v-if="!t.activo"> · off</span>
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="openType(t)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'attrs'" class="panel">
      <div class="panel-bar">
        <p class="hint">Atributos filtrables (HDMI, WiFi, potencia…). Se asignan a cada recurso.</p>
        <button type="button" class="btn-primary" @click="openAttr()">+ Atributo</button>
      </div>
      <ul class="list">
        <li v-for="a in attributes" :key="a.id" class="card">
          <div>
            <strong>{{ a.label }}</strong>
            <p class="muted">{{ a.key }} · {{ a.valueType }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="openAttr(a)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'resources'" class="panel">
      <div class="panel-bar">
        <p class="hint">Instancias reservables: elegí el tipo primero.</p>
        <button type="button" class="btn-primary" :disabled="!sites.length" @click="openResourceWizard()">
          + Nuevo recurso
        </button>
      </div>
      <div class="filters">
        <select v-model="filterTypeId" @change="loadResources">
          <option value="">Todos los tipos</option>
          <option v-for="t in types" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
      </div>
      <ul class="list">
        <li v-for="r in resources" :key="r.id" class="card">
          <div>
            <strong>{{ r.nombre }}</strong>
            <p class="muted">
              {{ r.typeLabel || r.kindLabel }} · {{ r.siteNombre }} ·
              {{ r.activo ? 'activo' : 'off' }}
              <span v-if="r.requiresApproval"> · requiere aprobación</span>
            </p>
            <p v-if="r.attributes?.length" class="chips">
              <span v-for="a in r.attributes" :key="a.key">{{ attrLabel(a.key) }}</span>
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="openResourceWizard(r)">Editar</button>
        </li>
        <li v-if="!resources.length" class="empty">Sin recursos. Creá uno o cargá el demo.</li>
      </ul>
    </section>

    <section v-if="tab === 'policy'" class="panel form">
      <p class="hint">
        Límites de aforo y cancelación para toda la comunidad. La habilitación de salas, cocheras y
        demás se define en Tipos y Recursos (activo / visible en catálogo / exige patente).
      </p>
      <label
        >Máx. cocheras simultáneas
        <input v-model.number="policy.maxSimultaneousParking" type="number" min="1" />
      </label>
      <label
        >Máx. puestos simultáneos
        <input v-model.number="policy.maxSimultaneousDesk" type="number" min="1" />
      </label>
      <label
        >Máx. días oficina / semana
        <input v-model.number="policy.maxOfficeDaysPerWeek" type="number" min="0" />
      </label>
      <label
        >Cancelar con anticipación (min)
        <input v-model.number="policy.cancelMinutesBefore" type="number" min="0" />
      </label>
      <button type="button" class="btn-primary" @click="savePolicy">Guardar políticas</button>
    </section>

    <!-- Modal sede -->
    <div v-if="siteForm" class="modal" @click.self="siteForm = null">
      <form class="modal-card form" @submit.prevent="saveSite">
        <h2>{{ siteForm.id ? 'Editar sede' : 'Nueva sede' }}</h2>
        <label>Nombre <input v-model="siteForm.nombre" required /></label>
        <label>Código <input v-model="siteForm.codigo" /></label>
        <label>Dirección <input v-model="siteForm.direccion" /></label>
        <label>Aforo máx. <input v-model.number="siteForm.aforoMax" type="number" /></label>
        <label class="check"
          ><input v-model="siteForm.whoIsHereEnabled" type="checkbox" /> Quién está (nominativo)</label
        >
        <label class="check"><input v-model="siteForm.activo" type="checkbox" /> Activa</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="siteForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Modal tipo -->
    <div v-if="typeForm" class="modal" @click.self="typeForm = null">
      <form class="modal-card form" @submit.prevent="saveType">
        <h2>{{ typeForm.id ? 'Editar tipo' : 'Nuevo tipo de activo' }}</h2>
        <label
          >Nombre
          <input v-model="typeForm.label" required placeholder="Ej. Proyector" />
        </label>
        <label v-if="!typeForm.id"
          >Código
          <input v-model="typeForm.codigo" required placeholder="proyector" />
        </label>
        <label
          >Motor de reserva
          <select v-model="typeForm.engineKind" :disabled="typeForm.system" required>
            <option value="sala">Sala / espacio</option>
            <option value="cochera">Cochera</option>
            <option value="puesto">Puesto</option>
            <option value="zona_cupo">Zona con cupo</option>
            <option value="activo">Activo prestable (1 unidad)</option>
            <option value="hora_libre">Hora libre</option>
            <option value="grupo">Espacio grupal</option>
            <option value="otro">Otro espacio</option>
          </select>
        </label>
        <label
          >Atributos disponibles
          <select v-model="typeForm.attributeKeys" multiple size="5">
            <option v-for="a in attributes" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>
        </label>
        <label class="check"
          ><input v-model="typeForm.showInUserCatalog" type="checkbox" /> Visible en catálogo
          usuario</label
        >
        <label class="check"
          ><input v-model="typeForm.exigePatenteDefault" type="checkbox" /> Exige patente por
          defecto</label
        >
        <label class="check"
          ><input v-model="typeForm.requiresApprovalDefault" type="checkbox" /> Requiere aprobación por
          defecto</label
        >
        <label class="check"><input v-model="typeForm.activo" type="checkbox" /> Activo</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="typeForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Modal atributo -->
    <div v-if="attrForm" class="modal" @click.self="attrForm = null">
      <form class="modal-card form" @submit.prevent="saveAttr">
        <h2>{{ attrForm.id ? 'Editar atributo' : 'Nuevo atributo' }}</h2>
        <label>Nombre <input v-model="attrForm.label" required /></label>
        <label v-if="!attrForm.id">Clave <input v-model="attrForm.key" required /></label>
        <label
          >Tipo de valor
          <select v-model="attrForm.valueType">
            <option value="flag">Sí/No (flag)</option>
            <option value="text">Texto</option>
            <option value="enum">Lista</option>
          </select>
        </label>
        <label class="check"><input v-model="attrForm.activo" type="checkbox" /> Activo</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="attrForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Wizard recurso -->
    <div v-if="resourceWizard" class="modal" @click.self="resourceWizard = null">
      <form class="modal-card form wide" @submit.prevent="saveResource">
        <h2>{{ resourceWizard.id ? 'Editar recurso' : 'Nuevo recurso' }}</h2>
        <div class="wiz-steps">
          <span :class="{ on: wizStep === 1 }">1. Tipo</span>
          <span :class="{ on: wizStep === 2 }">2. Datos</span>
          <span :class="{ on: wizStep === 3 }">3. Reglas</span>
        </div>

        <template v-if="wizStep === 1">
          <label
            >Tipo de activo
            <select v-model="resourceWizard.typeId" required @change="onTypePicked">
              <option disabled value="">Elegí un tipo…</option>
              <option v-for="t in types.filter((x) => x.activo)" :key="t.id" :value="t.id">
                {{ t.label }}
              </option>
            </select>
          </label>
          <p class="hint">
            Motor:
            {{ labelKind(selectedType?.engineKind) || '—' }}
          </p>
        </template>

        <template v-else-if="wizStep === 2">
          <label
            >Sede
            <select v-model="resourceWizard.siteId" required>
              <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </label>
          <label>Nombre <input v-model="resourceWizard.nombre" required /></label>
          <label>Código <input v-model="resourceWizard.codigo" /></label>
          <label>Piso <input v-model="resourceWizard.floor" /></label>
          <label>Zona <input v-model="resourceWizard.zone" /></label>
          <fieldset v-if="typeAttrDefs.length" class="attr-box">
            <legend>Atributos</legend>
            <label v-for="a in typeAttrDefs" :key="a.key" class="check">
              <template v-if="a.valueType === 'flag'">
                <input type="checkbox" :checked="hasAttr(a.key)" @change="toggleAttr(a.key, $event)" />
                {{ a.label }}
              </template>
              <template v-else>
                {{ a.label }}
                <input :value="attrValue(a.key)" @input="setAttrValue(a.key, $event.target.value)" />
              </template>
            </label>
          </fieldset>
        </template>

        <template v-else>
          <label v-if="['sala', 'otro', 'grupo'].includes(resourceWizard.kind)"
            >Capacidad
            <input v-model.number="resourceWizard.capacity" type="number" />
          </label>
          <label v-if="['zona_cupo', 'cochera'].includes(resourceWizard.kind)"
            >Cupo
            <input v-model.number="resourceWizard.cupo" type="number" />
          </label>
          <label class="check"
            ><input v-model="resourceWizard.requiresApproval" type="checkbox" /> Requiere
            aprobación</label
          >
          <label class="check"
            ><input v-model="resourceWizard.exigePatente" type="checkbox" /> Exige patente</label
          >
          <label class="check"><input v-model="resourceWizard.activo" type="checkbox" /> Activo</label>
        </template>

        <div class="row">
          <button type="button" class="btn-ghost" @click="resourceWizard = null">Cancelar</button>
          <button v-if="wizStep > 1" type="button" class="btn-ghost" @click="wizStep -= 1">Atrás</button>
          <button
            v-if="wizStep < 3"
            type="button"
            class="btn-primary"
            :disabled="wizStep === 1 && !resourceWizard.typeId"
            @click="wizStep += 1"
          >
            Siguiente
          </button>
          <button v-else type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'

const tab = ref('report')
const sites = ref([])
const resources = ref([])
const types = ref([])
const attributes = ref([])
const pending = ref([])
const report = ref({})
const policy = reactive({
  maxSimultaneousParking: 1,
  maxSimultaneousDesk: 1,
  maxOfficeDaysPerWeek: 5,
  cancelMinutesBefore: 30,
})
const filterTypeId = ref('')
const siteForm = ref(null)
const typeForm = ref(null)
const attrForm = ref(null)
const resourceWizard = ref(null)
const wizStep = ref(1)
const error = ref('')
const okMsg = ref('')
const busy = ref(false)

const KIND_LABELS = {
  sala: 'Sala',
  otro: 'Espacio',
  cochera: 'Cochera',
  puesto: 'Puesto',
  zona_cupo: 'Zona cupo',
  activo: 'Activo',
  hora_libre: 'Hora libre',
  grupo: 'Grupo',
}

function labelKind(k) {
  return KIND_LABELS[k] || k || '—'
}

function attrLabel(key) {
  return attributes.value.find((a) => a.key === key)?.label || key
}

const selectedType = computed(() => types.value.find((t) => t.id === resourceWizard.value?.typeId))

const typeAttrDefs = computed(() => {
  const keys = selectedType.value?.attributeKeys || []
  return attributes.value.filter((a) => keys.includes(a.key))
})

function fmt(d) {
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/spaces/meta')
  types.value = data.types || []
  attributes.value = data.attributes || []
}

async function loadSites() {
  const { data } = await api.get('/admin/spaces/sites')
  sites.value = data.items || []
}

async function loadResources() {
  const { data } = await api.get('/admin/spaces/resources', {
    params: { typeId: filterTypeId.value || undefined },
  })
  resources.value = data.items || []
}

async function loadPending() {
  const { data } = await api.get('/admin/spaces/reservations', { params: { status: 'pending' } })
  pending.value = data.items || []
}

async function loadReport() {
  const { data } = await api.get('/admin/spaces/report')
  report.value = data
}

async function loadPolicy() {
  const { data } = await api.get('/admin/spaces/policy')
  const item = data.item || {}
  policy.maxSimultaneousParking = item.maxSimultaneousParking ?? 1
  policy.maxSimultaneousDesk = item.maxSimultaneousDesk ?? 1
  policy.maxOfficeDaysPerWeek = item.maxOfficeDaysPerWeek ?? 5
  policy.cancelMinutesBefore = item.cancelMinutesBefore ?? 30
}

async function refresh() {
  error.value = ''
  try {
    await loadMeta()
    if (tab.value === 'report') await loadReport()
    if (tab.value === 'pending') await loadPending()
    if (tab.value === 'sites') await loadSites()
    if (tab.value === 'types' || tab.value === 'attrs') await loadMeta()
    if (tab.value === 'resources') {
      await loadSites()
      await loadResources()
    }
    if (tab.value === 'policy') await loadPolicy()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

watch(tab, refresh)

function openSite(s = null) {
  siteForm.value = s
    ? { ...s }
    : { nombre: '', codigo: '', direccion: '', aforoMax: null, whoIsHereEnabled: false, activo: true }
}

function openType(t = null) {
  typeForm.value = t
    ? { ...t, attributeKeys: [...(t.attributeKeys || [])] }
    : {
        codigo: '',
        label: '',
        engineKind: 'activo',
        attributeKeys: [],
        showInUserCatalog: true,
        exigePatenteDefault: false,
        requiresApprovalDefault: false,
        activo: true,
      }
}

function openAttr(a = null) {
  attrForm.value = a
    ? { ...a }
    : { key: '', label: '', valueType: 'flag', activo: true }
}

function openResourceWizard(r = null) {
  wizStep.value = r ? 2 : 1
  resourceWizard.value = r
    ? {
        ...r,
        attributes: [...(r.attributes || [])],
      }
    : {
        siteId: sites.value[0]?.id || '',
        typeId: '',
        kind: 'activo',
        nombre: '',
        codigo: '',
        floor: '',
        zone: '',
        capacity: null,
        cupo: null,
        attributes: [],
        requiresApproval: false,
        exigePatente: false,
        activo: true,
      }
}

function onTypePicked() {
  const t = selectedType.value
  if (!t || !resourceWizard.value) return
  resourceWizard.value.kind = t.engineKind
  resourceWizard.value.exigePatente = !!t.exigePatenteDefault
  resourceWizard.value.requiresApproval = !!t.requiresApprovalDefault
}

function hasAttr(key) {
  return (resourceWizard.value?.attributes || []).some((a) => a.key === key)
}

function attrValue(key) {
  return (resourceWizard.value?.attributes || []).find((a) => a.key === key)?.value || ''
}

function toggleAttr(key, ev) {
  if (!resourceWizard.value) return
  const list = [...(resourceWizard.value.attributes || [])]
  const i = list.findIndex((a) => a.key === key)
  if (ev.target.checked) {
    if (i < 0) list.push({ key, value: '' })
  } else if (i >= 0) list.splice(i, 1)
  resourceWizard.value.attributes = list
}

function setAttrValue(key, value) {
  if (!resourceWizard.value) return
  const list = [...(resourceWizard.value.attributes || [])]
  const i = list.findIndex((a) => a.key === key)
  if (!value) {
    if (i >= 0) list.splice(i, 1)
  } else if (i >= 0) list[i] = { key, value }
  else list.push({ key, value })
  resourceWizard.value.attributes = list
}

async function saveSite() {
  try {
    if (siteForm.value.id) {
      await api.patch(`/admin/spaces/sites/${siteForm.value.id}`, siteForm.value)
    } else {
      await api.post('/admin/spaces/sites', siteForm.value)
    }
    siteForm.value = null
    okMsg.value = 'Sede guardada.'
    await loadSites()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function saveType() {
  try {
    const payload = { ...typeForm.value }
    if (payload.id) {
      await api.patch(`/admin/spaces/types/${payload.id}`, payload)
    } else {
      await api.post('/admin/spaces/types', payload)
    }
    typeForm.value = null
    okMsg.value = 'Tipo guardado.'
    await loadMeta()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function saveAttr() {
  try {
    const payload = { ...attrForm.value }
    if (payload.id) {
      await api.patch(`/admin/spaces/attributes/${payload.id}`, payload)
    } else {
      await api.post('/admin/spaces/attributes', payload)
    }
    attrForm.value = null
    okMsg.value = 'Atributo guardado.'
    await loadMeta()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function saveResource() {
  try {
    const payload = { ...resourceWizard.value }
    if (payload.id) {
      await api.patch(`/admin/spaces/resources/${payload.id}`, payload)
    } else {
      await api.post('/admin/spaces/resources', payload)
    }
    resourceWizard.value = null
    okMsg.value = 'Recurso guardado.'
    await loadResources()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function savePolicy() {
  try {
    await api.put('/admin/spaces/policy', policy)
    okMsg.value = 'Políticas actualizadas.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function approve(r) {
  try {
    await api.post(`/admin/spaces/reservations/${r.id}/approve`)
    await loadPending()
    okMsg.value = 'Aprobada.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function reject(r) {
  const reason = prompt('Motivo del rechazo') || ''
  try {
    await api.post(`/admin/spaces/reservations/${r.id}/reject`, { reason })
    await loadPending()
    okMsg.value = 'Rechazada.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function seedDefaults() {
  busy.value = true
  try {
    const { data } = await api.post('/admin/spaces/seed-defaults')
    okMsg.value = `Demo OK: ${data.sites} sedes · ${data.resourcesCreated} recursos · ${data.typesUpserted || 0} tipos.`
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await loadSites()
  await refresh()
})
</script>

<style scoped>
.rv {
  max-width: none;
}
.rv-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.rv-head h1 {
  margin: 0;
  font-size: 1.5rem;
}
.rv-head p {
  margin: 0.25rem 0 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.rv-steps {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.rv-steps li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  background: var(--panel-2);
  color: var(--ink-soft);
  font-size: 0.8rem;
  cursor: pointer;
}
.rv-steps li span {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: var(--line-2);
  color: var(--ink);
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
}
.rv-steps li.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
  color: var(--brand-primary);
}
.rv-steps li.on span {
  background: var(--brand-primary);
  color: #fff;
}
.rv-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.75rem 0 1rem;
}
.rv-tabs button {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.rv-tabs button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.rv-tabs em {
  font-style: normal;
  background: var(--warn-bg);
  color: var(--warn);
  border-radius: 999px;
  padding: 0 0.4rem;
  font-size: 0.75rem;
}
.rv-tabs button.on em {
  background: var(--panel);
}
.panel-bar {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.75rem;
}
.hint,
.muted,
.sub {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}
.stats div {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem;
  display: grid;
  background: linear-gradient(160deg, var(--panel-2), var(--panel));
}
.stats strong {
  font-size: 1.4rem;
}
.stats span {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.list,
.plain {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: grid;
  gap: 0.55rem;
}
.card {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  background: var(--panel);
}
.empty {
  color: var(--ink-soft);
  padding: 1rem;
  border: 1px dashed var(--line-2);
  border-radius: 0.75rem;
  text-align: center;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.35rem 0 0;
}
.chips span {
  font-size: 0.7rem;
  background: var(--panel-2);
  color: var(--ink);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}
.row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
}
.btn-ghost {
  background: var(--panel);
  color: var(--brand-primary);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
}
.form {
  display: grid;
  gap: 0.65rem;
  max-width: 480px;
}
.form.wide {
  max-width: 520px;
}
.form label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.form input,
.form select {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.45rem 0.6rem;
}
.check {
  display: flex !important;
  align-items: center;
  gap: 0.45rem;
}
.filters {
  margin-bottom: 0.5rem;
}
.filters select {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}
.err {
  color: var(--bad);
}
.ok {
  color: var(--brand-primary);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 1rem;
}
.modal-card {
  background: var(--panel);
  border-radius: 0.85rem;
  padding: 1rem;
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
}
.modal-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.wiz-steps {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  color: var(--ink-faint);
}
.wiz-steps .on {
  color: var(--brand-primary);
  font-weight: 600;
}
.attr-box {
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  padding: 0.65rem;
  display: grid;
  gap: 0.45rem;
}
.attr-box legend {
  font-size: 0.8rem;
  color: var(--ink-soft);
  padding: 0 0.25rem;
}
</style>
