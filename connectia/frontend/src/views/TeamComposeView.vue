<template>
  <section class="tc">
    <header class="tc-head">
      <button type="button" class="link" @click="$router.back()">←</button>
      <h1>Crear para mi equipo</h1>
    </header>
    <p class="hint">La audiencia queda fija en los miembros del equipo (no podés publicar a toda la empresa).</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="ok" class="ok">{{ ok }}</p>

    <label>
      Equipo
      <select v-model="scopeId" class="inp">
        <option value="">Elegí equipo</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">
          {{ t.nombre }} · {{ t.memberCount }} miembros
        </option>
      </select>
    </label>

    <div class="types">
      <button
        v-for="t in types"
        :key="t.id"
        type="button"
        class="type"
        :class="{ on: type === t.id }"
        @click="type = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <form v-if="type === 'post'" class="form" @submit.prevent="sendPost">
      <input v-model="form.titulo" class="inp" placeholder="Título" required />
      <textarea v-model="form.cuerpo" class="inp" rows="4" placeholder="Mensaje" />
      <label class="chk"><input v-model="form.notify" type="checkbox" /> Notificar al equipo</label>
      <button class="primary" type="submit" :disabled="busy">Publicar en muro</button>
    </form>

    <form v-else-if="type === 'event'" class="form" @submit.prevent="sendEvent">
      <input v-model="form.titulo" class="inp" placeholder="Título del evento" required />
      <textarea v-model="form.descripcion" class="inp" rows="3" placeholder="Descripción" />
      <label>Inicio<input v-model="form.inicio" type="datetime-local" class="inp" required /></label>
      <label>Fin<input v-model="form.fin" type="datetime-local" class="inp" required /></label>
      <input v-model="form.lugar" class="inp" placeholder="Lugar (opcional)" />
      <button class="primary" type="submit" :disabled="busy">Crear evento</button>
    </form>

    <form v-else-if="type === 'notif'" class="form" @submit.prevent="sendNotif">
      <input v-model="form.titulo" class="inp" placeholder="Título del aviso" required />
      <textarea v-model="form.cuerpo" class="inp" rows="3" placeholder="Mensaje" required />
      <button class="primary" type="submit" :disabled="busy">Enviar aviso</button>
    </form>

    <form v-else-if="type === 'encuestas'" class="form" @submit.prevent="sendSurvey">
      <input v-model="form.titulo" class="inp" placeholder="Título de la encuesta" required />
      <textarea v-model="form.descripcion" class="inp" rows="2" placeholder="Descripción (opcional)" />
      <input v-model="form.pregunta" class="inp" placeholder="Pregunta principal" />
      <button class="primary" type="submit" :disabled="busy">Publicar encuesta al equipo</button>
    </form>

    <form v-else-if="type === 'docs'" class="form" @submit.prevent="sendDoc">
      <input v-model="form.titulo" class="inp" placeholder="Título del documento" required />
      <input v-model="form.fileUrl" class="inp" placeholder="URL del archivo (https://…)" required />
      <textarea v-model="form.descripcion" class="inp" rows="2" placeholder="Descripción" />
      <label class="chk"><input v-model="form.requiresSignature" type="checkbox" /> Requiere acuse</label>
      <button class="primary" type="submit" :disabled="busy">Publicar documento al equipo</button>
    </form>

    <form v-else-if="type === 'beneficios'" class="form" @submit.prevent="sendBeneficio">
      <input v-model="form.titulo" class="inp" placeholder="Título del beneficio" required />
      <textarea v-model="form.cuerpo" class="inp" rows="4" placeholder="Detalle del beneficio" />
      <label class="chk"><input v-model="form.notify" type="checkbox" /> Notificar al equipo</label>
      <button class="primary" type="submit" :disabled="busy">Publicar beneficio</button>
    </form>

    <form v-else-if="type === 'reconocimientos'" class="form" @submit.prevent="sendReconocimiento">
      <input v-model="form.paraNombre" class="inp" placeholder="Para (nombre, opcional)" />
      <textarea v-model="form.mensaje" class="inp" rows="4" placeholder="Mensaje de reconocimiento" required />
      <label class="chk"><input v-model="form.notify" type="checkbox" /> Notificar al equipo</label>
      <button class="primary" type="submit" :disabled="busy">Enviar reconocimiento</button>
    </form>

    <form v-else-if="type === 'chat'" class="form" @submit.prevent="sendChat">
      <p class="hint">Abre o crea un canal grupal con los miembros actuales del equipo.</p>
      <button class="primary" type="submit" :disabled="busy">Abrir chat de equipo</button>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const teams = ref([])
const scopeId = ref('')
const type = ref('post')
const busy = ref(false)
const error = ref('')
const ok = ref('')
const types = [
  { id: 'post', label: 'Muro' },
  { id: 'event', label: 'Evento' },
  { id: 'notif', label: 'Aviso' },
  { id: 'encuestas', label: 'Encuesta' },
  { id: 'docs', label: 'Docs' },
  { id: 'beneficios', label: 'Beneficio' },
  { id: 'reconocimientos', label: 'Reconocimiento' },
  { id: 'chat', label: 'Chat' },
]
const form = reactive({
  titulo: '',
  cuerpo: '',
  descripcion: '',
  inicio: '',
  fin: '',
  lugar: '',
  notify: true,
  pregunta: '',
  fileUrl: '',
  requiresSignature: false,
  paraNombre: '',
  mensaje: '',
})

function needScope() {
  if (!scopeId.value) {
    error.value = 'Elegí un equipo'
    return false
  }
  return true
}

async function sendPost() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/post', {
      scopeId: scopeId.value,
      titulo: form.titulo,
      cuerpo: form.cuerpo,
      notifyAudience: form.notify,
    })
    ok.value = `Publicado · ${data.correlationId}`
    form.titulo = ''
    form.cuerpo = ''
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendEvent() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/event', {
      scopeId: scopeId.value,
      titulo: form.titulo,
      descripcion: form.descripcion,
      inicio: form.inicio,
      fin: form.fin,
      lugar: form.lugar,
    })
    ok.value = `Evento creado · ${data.correlationId}`
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendNotif() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/notif', {
      scopeId: scopeId.value,
      title: form.titulo,
      body: form.cuerpo,
    })
    ok.value = `Aviso enviado a ${data.audienceSize} · ${data.correlationId}`
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendSurvey() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/survey', {
      scopeId: scopeId.value,
      titulo: form.titulo,
      descripcion: form.descripcion,
      pregunta: form.pregunta,
    })
    ok.value = `Encuesta publicada · ${data.correlationId}`
    form.titulo = ''
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendDoc() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/doc', {
      scopeId: scopeId.value,
      titulo: form.titulo,
      descripcion: form.descripcion,
      fileUrl: form.fileUrl,
      requiresSignature: form.requiresSignature,
    })
    ok.value = `Documento publicado · ${data.correlationId}`
    form.titulo = ''
    form.fileUrl = ''
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendBeneficio() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/beneficio', {
      scopeId: scopeId.value,
      titulo: form.titulo,
      cuerpo: form.cuerpo,
      notifyAudience: form.notify,
    })
    ok.value = `Beneficio publicado · ${data.correlationId}`
    form.titulo = ''
    form.cuerpo = ''
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendReconocimiento() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/reconocimiento', {
      scopeId: scopeId.value,
      paraNombre: form.paraNombre,
      mensaje: form.mensaje,
      notifyAudience: form.notify,
    })
    ok.value = `Reconocimiento enviado · ${data.correlationId}`
    form.paraNombre = ''
    form.mensaje = ''
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function sendChat() {
  if (!needScope()) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/team/compose/chat', { scopeId: scopeId.value })
    ok.value = 'Canal listo'
    if (data.href) router.push(data.href)
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  const { data } = await api.get('/team/scopes')
  teams.value = data.items || []
  if (teams.value.length) scopeId.value = teams.value[0].id
})
</script>

<style scoped>
.tc { padding: 1rem 1rem 5rem; max-width: 32rem; }
.tc-head { display: flex; align-items: center; gap: 0.5rem; }
.tc-head h1 { margin: 0; font-size: 1.15rem; }
.link { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.hint { color: #64748b; font-size: 0.85rem; }
.err { color: #b91c1c; }
.ok { color: var(--brand-primary, #0f766e); font-size: 0.85rem; }
.inp { width: 100%; padding: 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; box-sizing: border-box; }
label { display: grid; gap: 0.3rem; font-size: 0.9rem; margin: 0.75rem 0; }
.types { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.75rem 0; }
.type { border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.8rem; }
.type.on { background: var(--brand-primary, #0f766e); color: #fff; border-color: var(--brand-primary, #0f766e); }
.form { display: grid; gap: 0.55rem; }
.chk { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
.primary { border: 0; background: var(--brand-primary, #0f766e); color: #fff; border-radius: 10px; padding: 0.7rem; }
.pre { background: #f8fafc; padding: 0.75rem; border-radius: 8px; font-size: 0.75rem; overflow: auto; }
</style>
