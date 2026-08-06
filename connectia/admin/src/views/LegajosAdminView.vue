<template>
  <div>
    <AdminPageHeader
      title="Fichas de empleado"
      subtitle="Acá está el legajo laboral. Miembro = puede entrar a la app. Empleado = tiene ficha de legajo (puede existir sin cuenta todavía)."
    >
      <template #actions>
        <button class="btn-primary" @click="openNew">+ Legajo</button>
      </template>
    </AdminPageHeader>
    <ScreenHelp
      purpose="Alta y edición del legajo: datos personales, domicilios, familia, obra social, banco, médica, contratos y carrera."
      can-do="Crear ficha mínima (nombre + legajo) y completar el resto después. Vincular o no a un usuario de la comunidad. Baja lógica sin borrar historia."
    />

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
        placeholder="Buscar legajo, nombre, DNI…"
        @keyup.enter="load"
      />
      <select v-model="estado" class="border rounded-lg px-3 py-2 text-sm" @change="load">
        <option value="">Todos los estados</option>
        <option value="pre_ingreso">Pre-ingreso</option>
        <option value="activo">Activo</option>
        <option value="licencia">Licencia</option>
        <option value="baja">Baja</option>
      </select>
      <select v-model="conUsuario" class="border rounded-lg px-3 py-2 text-sm" @change="load">
        <option value="">Con/sin cuenta</option>
        <option value="1">Con miembro vinculado</option>
        <option value="0">Sin cuenta (solo empleado)</option>
      </select>
      <button class="rounded-lg px-3 py-1.5 text-sm border bg-white" @click="load">Buscar</button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Legajo</th>
            <th class="p-3">Nombre</th>
            <th class="p-3">Cargo</th>
            <th class="p-3">Estado</th>
            <th class="p-3">Miembro</th>
            <th class="p-3">Ingreso</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row.id" class="border-t">
            <td class="p-3 font-mono text-xs">{{ row.numeroLegajo }}</td>
            <td class="p-3">{{ fullName(row) }}</td>
            <td class="p-3">{{ row.cargo || '—' }}</td>
            <td class="p-3">
              <span :class="row.activo ? 'text-teal-700' : 'text-slate-400'">{{ row.estadoLaboral }}</span>
            </td>
            <td class="p-3 text-xs">
              <span v-if="row.userId" class="text-teal-800">Vinculado</span>
              <span v-else class="text-amber-700">Sin cuenta</span>
            </td>
            <td class="p-3 text-xs">{{ fmtDate(row.fechaIngreso) }}</td>
            <td class="p-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-teal-700" @click="edit(row)">Editar</button>
              <button v-if="row.activo" class="text-amber-700" @click="deactivate(row)">Baja</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length && !error" class="p-4 text-sm text-slate-500">No hay legajos con ese filtro.</p>
    </div>

    <Teleport to="body">
      <div v-if="draft" class="modal-root" @keydown.esc="draft = null">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="draft = null" />
        <aside class="modal modal-wide" role="dialog" aria-modal="true">
          <header class="modal-head">
            <div>
              <h2>{{ draft.id ? 'Editar legajo' : 'Nuevo legajo' }}</h2>
              <p class="muted small">
                {{
                  draft.id
                    ? 'Revisá y actualizá la ficha del empleado.'
                    : 'Empezá por Datos básicos (mínimo). La ayuda IA es opcional.'
                }}
              </p>
            </div>
          </header>

          <form class="form-body" @submit.prevent="save">
            <nav class="tabs">
              <button
                v-for="t in visibleTabs"
                :key="t.id"
                type="button"
                class="tab"
                :class="{ on: tab === t.id }"
                @click="tab = t.id"
              >
                {{ t.label }}
              </button>
            </nav>

            <div v-show="tab === 'ia' && !draft.id" class="ai-pane">
              <h3 class="subh">Completar con IA</h3>
              <p class="muted small">
                Podés combinar: elegir un miembro de la comunidad, escribir un prompt y/o subir un PDF con los
                datos del ingreso. La IA arma el borrador; vos revisás y guardás.
              </p>

              <label>
                Miembro de la comunidad (opcional)
                <select v-model="aiUserId" class="input">
                  <option value="">— Sin vincular aún —</option>
                  <option v-for="u in usersForAi" :key="u.id" :value="u.id">
                    {{ u.usuario }} — {{ fullName(u) || 'sin nombre' }}
                    {{ u.esEmpleado ? '(ya tiene legajo)' : '' }}
                  </option>
                </select>
              </label>

              <label>
                Prompt / texto
                <textarea
                  v-model="aiPrompt"
                  class="input"
                  rows="6"
                  :placeholder="aiPlaceholder"
                  :disabled="aiBusy"
                />
              </label>

              <label>
                PDF con datos del empleado (opcional)
                <input
                  ref="pdfInput"
                  type="file"
                  accept="application/pdf,.pdf"
                  class="input"
                  :disabled="aiBusy"
                  @change="onPdfPicked"
                />
              </label>
              <p v-if="pdfName" class="muted small">Archivo: {{ pdfName }}</p>

              <div class="ai-actions">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="aiBusy || !canRunAi"
                  @click="runAiDraft"
                >
                  {{ aiBusy ? 'Armando borrador…' : 'Completar formulario' }}
                </button>
                <button type="button" class="btn-ghost" :disabled="aiBusy" @click="aiPrompt = aiPlaceholder">
                  Ejemplo
                </button>
                <button type="button" class="btn-ghost" :disabled="aiBusy || !aiUserId" @click="loadFromMemberOnly">
                  Solo cargar miembro
                </button>
                <button type="button" class="btn-ghost" @click="tab = 'ficha'">Saltar → Ficha</button>
              </div>
              <p v-if="aiNotes" class="ai-notes">{{ aiNotes }}</p>
              <p class="muted small">
                {{
                  aiConfigured
                    ? 'IA LLM disponible.'
                    : 'Sin API key: usa heurística local (email, DNI, legajo, domicilio…).'
                }}
              </p>
            </div>

            <div v-show="tab === 'ficha'" class="grid-2">
              <label>
                N° legajo *
                <input v-model="draft.numeroLegajo" class="input" required maxlength="64" />
              </label>
              <label>
                Estado laboral
                <select v-model="draft.estadoLaboral" class="input">
                  <option value="pre_ingreso">Pre-ingreso</option>
                  <option value="activo">Activo</option>
                  <option value="licencia">Licencia</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <label>
                Nombre
                <input v-model="draft.nombre" class="input" maxlength="120" />
              </label>
              <label>
                Apellido
                <input v-model="draft.apellido" class="input" maxlength="120" />
              </label>
              <label>
                Email
                <input v-model="draft.email" class="input" type="email" />
              </label>
              <label>
                Teléfono
                <input v-model="draft.telefono" class="input" />
              </label>
              <label>
                DNI
                <input v-model="draft.dni" class="input" />
              </label>
              <label>
                CUIL
                <input v-model="draft.cuil" class="input" />
              </label>
              <label>
                Género
                <select v-model="draft.genero" class="input">
                  <option value="">—</option>
                  <option v-for="o in catOpts('genero')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                </select>
              </label>
              <label>
                Estado civil
                <select v-model="draft.estadoCivil" class="input">
                  <option value="">—</option>
                  <option v-for="o in catOpts('estado_civil')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                </select>
              </label>
              <label>
                Nacionalidad
                <select v-model="draft.nacionalidad" class="input">
                  <option value="">—</option>
                  <option v-for="o in catOpts('pais')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                </select>
              </label>
              <label>
                Cargo
                <input v-model="draft.cargo" class="input" />
              </label>
              <label>
                Clasificación
                <select v-model="draft.clasificacion" class="input">
                  <option value="">—</option>
                  <option v-for="o in catOpts('clasificacion_legajo')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                </select>
              </label>
              <label>
                Fecha nacimiento
                <input v-model="draft.fechaNacimiento" class="input" type="date" />
              </label>
              <label>
                Fecha ingreso
                <input v-model="draft.fechaIngreso" class="input" type="date" />
              </label>
              <label class="span-2">
                Vincular miembro de la comunidad (opcional)
                <select v-model="draft.userId" class="input">
                  <option value="">— Sin cuenta / no es miembro —</option>
                  <option v-for="u in users" :key="u.id" :value="u.id">
                    {{ u.usuario }} — {{ fullName(u) || 'sin nombre' }}
                    {{ u.esEmpleado && u.legajoId !== draft.id ? '(ya tiene legajo)' : '' }}
                  </option>
                </select>
              </label>
              <label class="span-2">
                Notas internas (solo RRHH)
                <textarea v-model="draft.notasInternas" class="input" rows="2" maxlength="2000" />
              </label>
            </div>

            <div v-show="tab === 'domicilios'">
              <button type="button" class="btn-ghost mb" @click="addDomicilio">+ Domicilio</button>
              <div v-for="(d, i) in draft.domicilios" :key="i" class="subcard">
                <div class="grid-2">
                  <label>
                    Tipo
                    <select v-model="d.tipo" class="input">
                      <option v-for="o in catOpts('tipo_domicilio')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                      <option v-if="!catOpts('tipo_domicilio').length" value="particular">Particular</option>
                    </select>
                  </label>
                  <label>Calle <input v-model="d.calle" class="input" /></label>
                  <label>Número <input v-model="d.numero" class="input" /></label>
                  <label>Localidad <input v-model="d.localidad" class="input" /></label>
                  <label>
                    Provincia
                    <select v-model="d.provincia" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('provincia')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                    </select>
                  </label>
                  <label>CP <input v-model="d.cp" class="input" /></label>
                </div>
                <label class="check"><input v-model="d.principal" type="checkbox" /> Principal</label>
                <button type="button" class="text-amber-700 text-sm" @click="draft.domicilios.splice(i, 1)">
                  Quitar
                </button>
              </div>
            </div>

            <div v-show="tab === 'familiares'">
              <button type="button" class="btn-ghost mb" @click="addFamiliar">+ Familiar</button>
              <div v-for="(f, i) in draft.familiares" :key="i" class="subcard">
                <div class="grid-2">
                  <label>
                    Parentesco
                    <select v-model="f.parentesco" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('parentesco')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                    </select>
                  </label>
                  <label>DNI <input v-model="f.dni" class="input" /></label>
                  <label>Nombre <input v-model="f.nombre" class="input" /></label>
                  <label>Apellido <input v-model="f.apellido" class="input" /></label>
                </div>
                <button type="button" class="text-amber-700 text-sm" @click="draft.familiares.splice(i, 1)">
                  Quitar
                </button>
              </div>
            </div>

            <div v-show="tab === 'obra'" class="grid-2">
              <label>
                Obra social
                <select v-model="draft.obraSocial.nombre" class="input">
                  <option value="">—</option>
                  <option v-for="o in catOpts('obra_social')" :key="o.codigo" :value="o.label">{{ o.label }}</option>
                </select>
              </label>
              <label>N° afiliado <input v-model="draft.obraSocial.numeroAfiliado" class="input" /></label>
              <label>Plan <input v-model="draft.obraSocial.plan" class="input" /></label>
            </div>

            <div v-show="tab === 'banco'">
              <button type="button" class="btn-ghost mb" @click="addCuenta">+ Cuenta</button>
              <div v-for="(c, i) in draft.datosBancarios" :key="i" class="subcard">
                <div class="grid-2">
                  <label>
                    Banco
                    <select v-model="c.banco" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('banco')" :key="o.codigo" :value="o.label">{{ o.label }}</option>
                    </select>
                  </label>
                  <label>CBU <input v-model="c.cbu" class="input" /></label>
                  <label>Alias <input v-model="c.alias" class="input" /></label>
                  <label>Titular <input v-model="c.titular" class="input" /></label>
                </div>
                <button type="button" class="text-amber-700 text-sm" @click="draft.datosBancarios.splice(i, 1)">
                  Quitar
                </button>
              </div>
            </div>

            <div v-show="tab === 'medica'" class="grid-2">
              <label>Grupo sanguíneo <input v-model="draft.fichaMedica.grupoSanguineo" class="input" /></label>
              <label>Alergias <input v-model="draft.fichaMedica.alergias" class="input" /></label>
              <label>Contacto emergencia <input v-model="draft.fichaMedica.contactoEmergenciaNombre" class="input" /></label>
              <label>Tel. emergencia <input v-model="draft.fichaMedica.contactoEmergenciaTel" class="input" /></label>
              <label class="span-2">
                Observaciones
                <textarea v-model="draft.fichaMedica.observaciones" class="input" rows="2" />
              </label>
            </div>

            <div v-show="tab === 'contratos'">
              <button type="button" class="btn-ghost mb" @click="addContrato">+ Contrato</button>
              <div v-for="(c, i) in draft.contratos" :key="i" class="subcard">
                <div class="grid-2">
                  <label>
                    Tipo
                    <select v-model="c.tipo" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('tipo_contrato')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                    </select>
                  </label>
                  <label>Número <input v-model="c.numero" class="input" /></label>
                  <label>Inicio <input v-model="c.fechaInicio" class="input" type="date" /></label>
                  <label>Fin <input v-model="c.fechaFin" class="input" type="date" /></label>
                  <label class="span-2">
                    Modalidad
                    <select v-model="c.modalidad" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('modalidad')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                    </select>
                  </label>
                </div>
                <button type="button" class="text-amber-700 text-sm" @click="draft.contratos.splice(i, 1)">
                  Quitar
                </button>
              </div>
            </div>

            <div v-show="tab === 'carrera'">
              <h3 class="subh">Capacitaciones</h3>
              <button type="button" class="btn-ghost mb" @click="addCap">+ Capacitación</button>
              <div v-for="(c, i) in draft.carrera.capacitaciones" :key="'c' + i" class="subcard">
                <div class="grid-2">
                  <label>Nombre <input v-model="c.nombre" class="input" /></label>
                  <label>Institución <input v-model="c.institucion" class="input" /></label>
                </div>
                <button type="button" class="text-amber-700 text-sm" @click="draft.carrera.capacitaciones.splice(i, 1)">
                  Quitar
                </button>
              </div>
              <h3 class="subh">Skills</h3>
              <button type="button" class="btn-ghost mb" @click="addSkill">+ Skill</button>
              <div v-for="(s, i) in draft.carrera.skills" :key="'s' + i" class="subcard">
                <div class="grid-2">
                  <label>Nombre <input v-model="s.nombre" class="input" /></label>
                  <label>
                    Nivel
                    <select v-model="s.nivel" class="input">
                      <option value="">—</option>
                      <option v-for="o in catOpts('nivel_skill')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
                    </select>
                  </label>
                </div>
                <button type="button" class="text-amber-700 text-sm" @click="draft.carrera.skills.splice(i, 1)">
                  Quitar
                </button>
              </div>
            </div>

            <footer class="modal-foot">
              <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Guardando…' : 'Guardar' }}
              </button>
            </footer>
          </form>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const users = ref([])
const catalogsByTipo = ref({})
const q = ref('')
const estado = ref('')
const conUsuario = ref('')
const error = ref('')
const okMsg = ref('')
const draft = ref(null)
const saving = ref(false)
const tab = ref('ia')

const aiPrompt = ref('')
const aiUserId = ref('')
const aiBusy = ref(false)
const aiNotes = ref('')
const aiConfigured = ref(false)
const pdfFile = ref(null)
const pdfName = ref('')
const pdfInput = ref(null)

const aiPlaceholder =
  'Ej: Alta de María López, DNI 30111222, CUIL 27-30111222-3, legajo 4521, cargo Analista RRHH, ingreso 2026-08-01, obra social OSDE 210, domicilio Av. Corrientes 1234 CABA, CBU 0110599520000001234567 Banco Nación.'

const allTabs = [
  { id: 'ia', label: 'Ayuda IA (opcional)' },
  { id: 'ficha', label: 'Datos básicos' },
  { id: 'domicilios', label: 'Domicilios' },
  { id: 'familiares', label: 'Familiares' },
  { id: 'obra', label: 'Obra social' },
  { id: 'banco', label: 'Bancarios' },
  { id: 'medica', label: 'Médica' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'carrera', label: 'Carrera' },
]

const visibleTabs = computed(() => {
  if (draft.value?.id) return allTabs.filter((t) => t.id !== 'ia')
  return allTabs
})

const usersForAi = computed(() =>
  (users.value || []).filter((u) => !u.esEmpleado || (draft.value?.id && u.legajoId === draft.value.id)),
)

const canRunAi = computed(
  () => Boolean(aiUserId.value) || aiPrompt.value.trim().length >= 8 || Boolean(pdfFile.value),
)

function fullName(r) {
  return [r.nombre, r.apellido].filter(Boolean).join(' ') || '—'
}

function catOpts(tipo) {
  return catalogsByTipo.value[tipo] || []
}

function fmtDate(d) {
  if (!d) return '—'
  const s = String(d).slice(0, 10)
  return s
}

function toDateInput(v) {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function emptyDraft() {
  return {
    id: null,
    numeroLegajo: '',
    estadoLaboral: 'activo',
    userId: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    dni: '',
    cuil: '',
    genero: '',
    estadoCivil: '',
    nacionalidad: '',
    cargo: '',
    clasificacion: '',
    fechaNacimiento: '',
    fechaIngreso: '',
    notasInternas: '',
    domicilios: [],
    familiares: [],
    obraSocial: { nombre: '', numeroAfiliado: '', plan: '' },
    datosBancarios: [],
    fichaMedica: {
      grupoSanguineo: '',
      alergias: '',
      observaciones: '',
      contactoEmergenciaNombre: '',
      contactoEmergenciaTel: '',
    },
    contratos: [],
    carrera: { capacitaciones: [], skills: [] },
  }
}

function fromApi(row) {
  return {
    ...emptyDraft(),
    ...row,
    userId: row.userId || '',
    fechaNacimiento: toDateInput(row.fechaNacimiento),
    fechaIngreso: toDateInput(row.fechaIngreso),
    obraSocial: { ...emptyDraft().obraSocial, ...(row.obraSocial || {}) },
    fichaMedica: { ...emptyDraft().fichaMedica, ...(row.fichaMedica || {}) },
    carrera: {
      capacitaciones: [...(row.carrera?.capacitaciones || [])].map((c) => ({
        ...c,
        fecha: toDateInput(c.fecha),
      })),
      skills: [...(row.carrera?.skills || [])],
    },
    contratos: [...(row.contratos || [])].map((c) => ({
      ...c,
      fechaInicio: toDateInput(c.fechaInicio),
      fechaFin: toDateInput(c.fechaFin),
    })),
    domicilios: [...(row.domicilios || [])],
    familiares: [...(row.familiares || [])],
    datosBancarios: [...(row.datosBancarios || [])],
  }
}

function applyAiDraft(d) {
  if (!draft.value || !d) return
  const next = fromApi({ ...emptyDraft(), ...d, id: draft.value.id })
  if (d.userId) next.userId = String(d.userId)
  else if (aiUserId.value) next.userId = aiUserId.value
  draft.value = next
}

function payloadFromDraft(d) {
  const p = { ...d }
  delete p.id
  if (!p.userId) p.userId = null
  for (const k of ['fechaNacimiento', 'fechaIngreso']) {
    p[k] = p[k] || null
  }
  return p
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/legajos', {
      params: {
        q: q.value || undefined,
        estado: estado.value || undefined,
        conUsuario: conUsuario.value || undefined,
      },
    })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar legajos'
  }
}

async function loadUsers() {
  try {
    const { data } = await api.get('/admin/users', { params: { pageSize: 100, activo: 'true' } })
    users.value = data.items || []
  } catch {
    users.value = []
  }
}

async function loadCatalogs() {
  try {
    const { data } = await api.get('/hr-catalogs')
    catalogsByTipo.value = data.byTipo || {}
  } catch {
    catalogsByTipo.value = {}
  }
}

async function loadAiStatus() {
  try {
    const { data } = await api.get('/admin/legajos/ai-status')
    aiConfigured.value = Boolean(data.configured)
  } catch {
    aiConfigured.value = false
  }
}

function resetAi() {
  aiPrompt.value = ''
  aiUserId.value = ''
  aiNotes.value = ''
  pdfFile.value = null
  pdfName.value = ''
  if (pdfInput.value) pdfInput.value.value = ''
}

function onPdfPicked(ev) {
  const f = ev.target?.files?.[0] || null
  pdfFile.value = f
  pdfName.value = f ? f.name : ''
}

function openNew() {
  resetAi()
  tab.value = 'ia'
  draft.value = emptyDraft()
}

function edit(row) {
  resetAi()
  tab.value = 'ficha'
  draft.value = fromApi(row)
}

function loadFromMemberOnly() {
  const u = users.value.find((x) => x.id === aiUserId.value)
  if (!u || !draft.value) return
  draft.value.userId = u.id
  draft.value.nombre = u.nombre || draft.value.nombre
  draft.value.apellido = u.apellido || draft.value.apellido
  draft.value.email = u.email || draft.value.email
  draft.value.dni = u.dni || draft.value.dni
  draft.value.cuil = u.cuil || draft.value.cuil
  draft.value.cargo = u.cargo || draft.value.cargo
  draft.value.numeroLegajo = u.idExterno || draft.value.numeroLegajo
  draft.value.fechaNacimiento = toDateInput(u.fechaNacimiento) || draft.value.fechaNacimiento
  draft.value.fechaIngreso = toDateInput(u.fechaIngreso) || draft.value.fechaIngreso
  aiNotes.value = 'Datos del miembro cargados. Completá el resto o usá IA con prompt/PDF.'
  tab.value = 'ficha'
}

async function runAiDraft() {
  if (aiBusy.value || !canRunAi.value) return
  aiBusy.value = true
  aiNotes.value = ''
  error.value = ''
  try {
    let data
    if (pdfFile.value) {
      const fd = new FormData()
      fd.append('file', pdfFile.value)
      if (aiPrompt.value.trim()) fd.append('prompt', aiPrompt.value.trim())
      if (aiUserId.value) fd.append('userId', aiUserId.value)
      const res = await api.post('/admin/legajos/ai-draft-upload', fd)
      data = res.data
    } else {
      const res = await api.post('/admin/legajos/ai-draft', {
        prompt: aiPrompt.value.trim(),
        userId: aiUserId.value || undefined,
      })
      data = res.data
    }
    aiConfigured.value = Boolean(data.configured)
    applyAiDraft(data.draft)
    const extra = data.pdfChars ? ` · PDF leído (${data.pdfChars} caracteres)` : ''
    aiNotes.value = (data.draft?.notes || 'Borrador aplicado. Revisá las pestañas.') + extra
    tab.value = 'ficha'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo armar el borrador'
    aiNotes.value = error.value
  } finally {
    aiBusy.value = false
  }
}

function addDomicilio() {
  draft.value.domicilios.push({
    tipo: 'particular',
    calle: '',
    numero: '',
    localidad: '',
    provincia: '',
    cp: '',
    principal: false,
  })
}
function addFamiliar() {
  draft.value.familiares.push({ parentesco: '', nombre: '', apellido: '', dni: '' })
}
function addCuenta() {
  draft.value.datosBancarios.push({ banco: '', cbu: '', alias: '', titular: '', principal: true })
}
function addContrato() {
  draft.value.contratos.push({
    tipo: '',
    numero: '',
    fechaInicio: '',
    fechaFin: '',
    modalidad: '',
  })
}
function addCap() {
  draft.value.carrera.capacitaciones.push({ nombre: '', institucion: '' })
}
function addSkill() {
  draft.value.carrera.skills.push({ nombre: '', nivel: '' })
}

async function save() {
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const body = payloadFromDraft(draft.value)
    if (draft.value.id) {
      await api.patch(`/admin/legajos/${draft.value.id}`, body)
      okMsg.value = 'Legajo actualizado'
    } else {
      await api.post('/admin/legajos', body)
      okMsg.value = 'Legajo creado'
    }
    draft.value = null
    await load()
    await loadUsers()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function deactivate(row) {
  if (!confirm(`Dar de baja el legajo ${row.numeroLegajo}?`)) return
  try {
    await api.delete(`/admin/legajos/${row.id}`)
    okMsg.value = 'Legajo dado de baja'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo dar de baja'
  }
}

onMounted(async () => {
  await Promise.all([load(), loadUsers(), loadAiStatus(), loadCatalogs()])
})
</script>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
}
.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.35);
  cursor: pointer;
}
.modal {
  position: relative;
  width: min(720px, 100%);
  height: 100%;
  background: var(--panel);
  box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.modal-head {
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--line);
}
.modal-head h2 {
  font-size: 1.15rem;
  font-weight: 600;
}
.muted.small {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
.form-body {
  padding: 1rem 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tab {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.tab.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.span-2 {
  grid-column: 1 / -1;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--ink);
}
.subcard {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}
.btn-ghost {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.6;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--line);
}
.mb {
  margin-bottom: 0.5rem;
}
.subh {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0.75rem 0 0.35rem;
}
.check {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  margin: 0.5rem 0;
}
.ai-pane {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.ai-notes {
  margin: 0;
  padding: 0.65rem 0.75rem;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  border-radius: 0.5rem;
  font-size: 0.85rem;
  color: var(--brand-secondary);
}
</style>
