<template>
  <div class="legajo-page">
    <header class="legajo-head">
      <div>
        <h1>{{ peopleCare?.label || 'Mi legajo' }}</h1>
        <p class="legajo-sub">
          Tu ficha de empleado en la empresa.
          <span class="legajo-vs">Tu cuenta de la app se edita en <router-link to="/perfil">Mi perfil</router-link>.</span>
        </p>
      </div>
      <button
        v-if="peopleCare?.hasLegajo && peopleCare?.canSelfEdit"
        type="button"
        class="btn"
        @click="toggleEdit"
      >
        {{ editing ? 'Cancelar' : 'Actualizar mis datos' }}
      </button>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <template v-else-if="peopleCare?.hasLegajo && peopleCare.data?.colaborador">
      <form v-if="editing" class="card" @submit.prevent="save">
        <h3>Datos que vos podés actualizar</h3>
        <p class="muted">
          Teléfono, domicilio, emergencia y skills. DNI, CUIL, cargo, banco y contratos los carga solo RRHH.
        </p>
        <details open class="edit-block">
          <summary>Contacto y datos personales</summary>
          <div class="grid-form">
          <label>
            Teléfono
            <input v-model="form.telefono" class="input" />
          </label>
          <label>
            Género
            <select v-model="form.genero" class="input">
              <option value="">—</option>
              <option v-for="o in opts('genero')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
            </select>
          </label>
          <label>
            Estado civil
            <select v-model="form.estadoCivil" class="input">
              <option value="">—</option>
              <option v-for="o in opts('estado_civil')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
            </select>
          </label>
          <label>
            Nacionalidad
            <select v-model="form.nacionalidad" class="input">
              <option value="">—</option>
              <option v-for="o in opts('pais')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
            </select>
          </label>
        </div>
        </details>

        <details class="edit-block">
          <summary>Domicilio principal</summary>
        <div class="grid-form">
          <label>
            Tipo
            <select v-model="form.domicilio.tipo" class="input">
              <option v-for="o in opts('tipo_domicilio')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
              <option v-if="!opts('tipo_domicilio').length" value="particular">Particular</option>
            </select>
          </label>
          <label>Calle <input v-model="form.domicilio.calle" class="input" /></label>
          <label>Número <input v-model="form.domicilio.numero" class="input" /></label>
          <label>Localidad <input v-model="form.domicilio.localidad" class="input" /></label>
          <label>
            Provincia
            <select v-model="form.domicilio.provincia" class="input">
              <option value="">—</option>
              <option v-for="o in opts('provincia')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
            </select>
          </label>
          <label>CP <input v-model="form.domicilio.cp" class="input" /></label>
        </div>
        </details>

        <details class="edit-block">
          <summary>Contacto de emergencia</summary>
        <div class="grid-form">
          <label>Nombre <input v-model="form.fichaMedica.contactoEmergenciaNombre" class="input" /></label>
          <label>Teléfono <input v-model="form.fichaMedica.contactoEmergenciaTel" class="input" /></label>
          <label>Grupo sanguíneo <input v-model="form.fichaMedica.grupoSanguineo" class="input" /></label>
          <label>Alergias <input v-model="form.fichaMedica.alergias" class="input" /></label>
        </div>
        </details>

        <details class="edit-block">
          <summary>Skills</summary>
        <div v-for="(s, i) in form.skills" :key="i" class="skill-row">
          <input v-model="s.nombre" class="input" placeholder="Skill" />
          <select v-model="s.nivel" class="input">
            <option value="">Nivel</option>
            <option v-for="o in opts('nivel_skill')" :key="o.codigo" :value="o.codigo">{{ o.label }}</option>
          </select>
          <button type="button" class="btn ghost" @click="form.skills.splice(i, 1)">Quitar</button>
        </div>
        <button type="button" class="btn ghost" @click="form.skills.push({ nombre: '', nivel: '' })">+ Skill</button>
        </details>

        <div class="actions">
          <button type="button" class="btn ghost" @click="toggleEdit">Cancelar</button>
          <button type="submit" class="btn" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </form>

      <template v-else>
        <section class="card">
          <h2 class="name">{{ peopleCare.data.colaborador.nombre }}</h2>
          <p class="meta">
            <span v-if="peopleCare.data.colaborador.legajo">
              Legajo {{ peopleCare.data.colaborador.legajo }}
            </span>
            <span v-if="peopleCare.data.colaborador.cargo">
              · {{ peopleCare.data.colaborador.cargo }}
            </span>
          </p>
          <dl class="grid">
            <div v-if="peopleCare.data.colaborador.estadoLaboral">
              <dt>Estado</dt>
              <dd>{{ peopleCare.data.colaborador.estadoLaboral }}</dd>
            </div>
            <div v-if="peopleCare.data.colaborador.fechaIngreso">
              <dt>Ingreso</dt>
              <dd>{{ fmtShort(peopleCare.data.colaborador.fechaIngreso) }}</dd>
            </div>
            <div v-if="peopleCare.data.colaborador.telefono">
              <dt>Teléfono</dt>
              <dd>{{ peopleCare.data.colaborador.telefono }}</dd>
            </div>
            <div v-if="peopleCare.data.colaborador.email">
              <dt>Email</dt>
              <dd>{{ peopleCare.data.colaborador.email }}</dd>
            </div>
            <div v-if="peopleCare.data.colaborador.dni">
              <dt>DNI</dt>
              <dd>{{ peopleCare.data.colaborador.dni }}</dd>
            </div>
            <div v-if="peopleCare.data.colaborador.genero">
              <dt>Género</dt>
              <dd>{{ labelOf('genero', peopleCare.data.colaborador.genero) }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="peopleCare.data.domicilios?.length" class="card">
          <h3>Domicilios</h3>
          <ul>
            <li v-for="d in peopleCare.data.domicilios" :key="d.id">
              {{ d.calle }} {{ d.numero }}{{ d.localidad ? `, ${d.localidad}` : '' }}
              <span v-if="d.principal"> (principal)</span>
            </li>
          </ul>
        </section>

        <section
          v-if="peopleCare.data.fichaMedica?.contactoEmergenciaNombre || peopleCare.data.fichaMedica?.grupoSanguineo"
          class="card"
        >
          <h3>Emergencia / médica</h3>
          <p v-if="peopleCare.data.fichaMedica.grupoSanguineo">
            Grupo: {{ peopleCare.data.fichaMedica.grupoSanguineo }}
          </p>
          <p v-if="peopleCare.data.fichaMedica.alergias">
            Alergias: {{ peopleCare.data.fichaMedica.alergias }}
          </p>
          <p v-if="peopleCare.data.fichaMedica.contactoEmergenciaNombre">
            Contacto: {{ peopleCare.data.fichaMedica.contactoEmergenciaNombre }}
            <span v-if="peopleCare.data.fichaMedica.contactoEmergenciaTel">
              · {{ peopleCare.data.fichaMedica.contactoEmergenciaTel }}
            </span>
          </p>
        </section>

        <section v-if="peopleCare.data.obraSocial?.nombre" class="card">
          <h3>Obra social</h3>
          <p>
            {{ peopleCare.data.obraSocial.nombre }}
            <span v-if="peopleCare.data.obraSocial.plan"> · {{ peopleCare.data.obraSocial.plan }}</span>
          </p>
        </section>

        <section v-if="peopleCare.data.datosBancarios?.length" class="card">
          <h3>Datos bancarios</h3>
          <ul>
            <li v-for="c in peopleCare.data.datosBancarios" :key="c.id">
              {{ c.banco || 'Cuenta' }} · CBU {{ c.cbu }}
            </li>
          </ul>
        </section>

        <section v-if="peopleCare.data.carrera?.skills?.length || peopleCare.data.carrera?.capacitaciones?.length" class="card">
          <h3>Carrera</h3>
          <p v-if="peopleCare.data.carrera.skills?.length">
            Skills:
            {{ peopleCare.data.carrera.skills.map((s) => s.nombre).filter(Boolean).join(', ') }}
          </p>
        </section>

        <section v-if="peopleCare.data.licencias" class="card">
          <h3>Vacaciones / licencias</h3>
          <p v-if="peopleCare.data.licencias.disponibles != null">
            <strong>{{ peopleCare.data.licencias.disponibles }}</strong> días disponibles
          </p>
          <router-link class="link" to="/licencias">Ver y solicitar</router-link>
        </section>
      </template>
    </template>

    <section v-else class="card empty">
      <h2>Todavía no tenés ficha de empleado</h2>
      <p>
        Podés usar la app como miembro de la comunidad. La ficha de legajo (datos laborales, banco, obra social)
        la crea RRHH cuando corresponda.
      </p>
      <p class="muted">Mientras tanto, tu foto, nombre y contraseña están en Mi perfil.</p>
      <router-link class="link" to="/perfil">Ir a Mi perfil</router-link>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')
const peopleCare = ref(null)
const editing = ref(false)
const catalogs = ref({})
const form = reactive({
  telefono: '',
  genero: '',
  estadoCivil: '',
  nacionalidad: '',
  domicilio: { tipo: 'particular', calle: '', numero: '', localidad: '', provincia: '', cp: '', principal: true },
  fichaMedica: {
    grupoSanguineo: '',
    alergias: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTel: '',
  },
  skills: [],
})

function opts(tipo) {
  return catalogs.value[tipo] || []
}

function labelOf(tipo, codigo) {
  const hit = opts(tipo).find((o) => o.codigo === codigo)
  return hit?.label || codigo
}

function fmtShort(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return String(d).slice(0, 10)
  }
}

function fillForm() {
  const c = peopleCare.value?.data?.colaborador || {}
  const d0 = peopleCare.value?.data?.domicilios?.[0] || {}
  const med = peopleCare.value?.data?.fichaMedica || {}
  form.telefono = c.telefono || ''
  form.genero = c.genero || ''
  form.estadoCivil = c.estadoCivil || ''
  form.nacionalidad = c.nacionalidad || ''
  form.domicilio = {
    tipo: d0.tipo || 'particular',
    calle: d0.calle || '',
    numero: d0.numero || '',
    localidad: d0.localidad || '',
    provincia: d0.provincia || '',
    cp: d0.cp || '',
    principal: true,
    activo: true,
  }
  form.fichaMedica = {
    grupoSanguineo: med.grupoSanguineo || '',
    alergias: med.alergias || '',
    contactoEmergenciaNombre: med.contactoEmergenciaNombre || '',
    contactoEmergenciaTel: med.contactoEmergenciaTel || '',
  }
  form.skills = (peopleCare.value?.data?.carrera?.skills || []).map((s) => ({
    nombre: s.nombre || '',
    nivel: s.nivel || '',
  }))
}

function toggleEdit() {
  editing.value = !editing.value
  okMsg.value = ''
  error.value = ''
  if (editing.value) fillForm()
}

async function save() {
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const others = (peopleCare.value?.data?.domicilios || []).slice(1)
    const { data } = await api.patch('/me/peoplecare', {
      telefono: form.telefono,
      genero: form.genero,
      estadoCivil: form.estadoCivil,
      nacionalidad: form.nacionalidad,
      domicilios: [form.domicilio, ...others.map((d) => ({ ...d, principal: false }))],
      fichaMedica: form.fichaMedica,
      carrera: { skills: form.skills.filter((s) => s.nombre.trim()) },
    })
    peopleCare.value = data
    editing.value = false
    okMsg.value = 'Datos actualizados'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [pc, cat] = await Promise.all([
      api.get('/me/peoplecare'),
      api.get('/hr-catalogs').catch(() => ({ data: { byTipo: {} } })),
    ])
    peopleCare.value = pc.data
    catalogs.value = cat.data?.byTipo || {}
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el legajo'
    peopleCare.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.legajo-page {
  padding: 16px 16px 32px;
  max-width: 640px;
  margin: 0 auto;
}
.legajo-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}
.legajo-head h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}
.legajo-sub {
  margin: 4px 0 0;
  color: var(--cx-muted, #64748b);
  font-size: 0.9rem;
}
.legajo-vs {
  display: block;
  margin-top: 4px;
}
.edit-block {
  margin: 12px 0;
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 10px;
  padding: 8px 12px 12px;
}
.edit-block summary {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0;
}
.card {
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.card h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
}
.subh {
  margin-top: 1rem !important;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
  margin: 0;
}
.grid dt {
  font-size: 0.72rem;
  color: var(--cx-muted, #64748b);
}
.grid dd {
  margin: 2px 0 0;
  font-weight: 650;
  font-size: 0.9rem;
}
.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}
.grid-form label {
  display: grid;
  gap: 0.2rem;
  font-size: 0.8rem;
}
.input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  font: inherit;
}
.skill-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
.btn {
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  background: #0f172a;
  color: #fff;
  font-weight: 650;
  cursor: pointer;
}
.btn.ghost {
  background: #fff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}
.muted {
  color: var(--cx-muted, #64748b);
  font-size: 0.85rem;
}
.err {
  color: #b91c1c;
}
.ok {
  color: #166534;
  font-size: 0.9rem;
}
.link {
  display: inline-block;
  margin-top: 12px;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  text-decoration: none;
}
.name {
  margin: 0;
  font-size: 1.1rem;
}
.meta {
  margin: 0.25rem 0 0.75rem;
  color: #64748b;
  font-size: 0.88rem;
}
</style>
