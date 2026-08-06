<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>Pedir datos a un grupo</h1>
        <p>
          Armá un pedido, elegí a quién le llega y qué deben completar.
          Cada persona recibe su propio ticket en la app.
        </p>
        <ScreenHelp
          purpose="Sirve para pedirle información a varias personas a la vez (por ejemplo: actualizar domicilio, confirmar datos, subir un archivo)."
          can-do="Escribís el pedido, podés pegar una imagen o video, elegís destinatarios, definís las preguntas y lo enviás."
        />
      </div>
      <div class="head-aside">
        <p class="count-label">Van a recibir el pedido</p>
        <p class="count-num">{{ previewTotal }}</p>
        <p v-if="previewSample.length" class="count-sample">
          Ej. {{ previewSample.map((s) => s.nombre).join(', ') }}
        </p>
      </div>
    </header>

    <form class="layout" @submit.prevent="send">
      <!-- Paso 1 -->
      <section class="card">
        <div class="step">
          <span class="step-n">1</span>
          <div>
            <h2>¿Qué les pedís?</h2>
            <p class="hint">El título y el mensaje que van a ver en la app.</p>
          </div>
        </div>

        <label class="field">
          <span>Plantilla (opcional)</span>
          <select v-model="form.tipoId" class="input" @change="onTipo">
            <option value="">Sin plantilla — armo el pedido desde cero</option>
            <option v-for="t in types" :key="t.id" :value="t.id">{{ t.nombre }}</option>
          </select>
          <small>
            La plantilla trae preguntas listas. Abajo podés sumar más si hace falta.
            <RouterLink to="/tipos-solicitud" class="inline-link">Gestionar plantillas</RouterLink>
          </small>
        </label>

        <div v-if="selectedTipo" class="plantilla-box">
          <div class="plantilla-head">
            <div>
              <p class="plantilla-kicker">Preguntas de esta plantilla</p>
              <p class="plantilla-name">{{ selectedTipo.nombre }}</p>
            </div>
            <span class="plantilla-count">{{ tipoCampos.length }}</span>
          </div>
          <p v-if="selectedTipo.descripcion" class="plantilla-desc">{{ selectedTipo.descripcion }}</p>
          <ul v-if="tipoCampos.length" class="plantilla-qs">
            <li v-for="(c, i) in tipoCampos" :key="i">
              <span class="pq-n">{{ i + 1 }}</span>
              <div>
                <strong>{{ c.label || c.key }}</strong>
                <span>{{ tipoLabel(c.tipo) }}{{ c.required ? ' · obligatoria' : '' }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty">Esta plantilla no tiene preguntas; podés agregarlas en el paso 3.</p>
        </div>

        <label class="field">
          <span>Título del pedido</span>
          <input
            v-model="form.titulo"
            class="input"
            required
            maxlength="120"
            placeholder="Ej. Actualizá tu domicilio"
          />
        </label>

        <label class="field">
          <span>Mensaje (opcional)</span>
          <textarea
            v-model="form.cuerpo"
            class="input"
            rows="3"
            placeholder="Ej. Necesitamos tu dirección actualizada para el próximo envío de credenciales."
          />
        </label>

        <label class="field">
          <span>Imagen o video (opcional)</span>
          <input
            v-model="form.mediaUrl"
            class="input"
            type="url"
            placeholder="Pegá un link: imagen, video .mp4, YouTube o Vimeo"
          />
          <small>Se muestra junto al título y el mensaje en la app.</small>
        </label>
        <div v-if="form.mediaUrl.trim()" class="media-preview">
          <PostMedia :url="form.mediaUrl" :alt="form.titulo || 'Vista previa'" :autoplay-on-visible="false" />
          <p v-if="mediaLabel" class="media-kind">{{ mediaLabel }}</p>
        </div>
      </section>

      <!-- Paso 2 -->
      <section class="card">
        <div class="step">
          <span class="step-n">2</span>
          <div>
            <h2>¿A quién se lo enviás?</h2>
            <p class="hint">Estas personas van a ver el pedido en Mis solicitudes.</p>
          </div>
        </div>

        <div class="modes">
          <button
            type="button"
            class="mode"
            :class="{ on: form.audience.mode === 'all' }"
            @click="setAudienceAll"
          >
            <strong>Toda la comunidad</strong>
            <span>Todos los usuarios activos</span>
          </button>
          <button
            type="button"
            class="mode"
            :class="{ on: form.audience.mode === 'restricted' }"
            @click="form.audience.mode = 'restricted'"
          >
            <strong>Solo algunas personas</strong>
            <span>Por área o grupo</span>
          </button>
        </div>

        <div v-if="form.audience.mode === 'restricted'" class="who">
          <div class="who-col">
            <p class="who-title">Áreas</p>
            <p v-if="!orgAreas.length" class="empty">No hay áreas cargadas.</p>
            <label v-for="a in orgAreas" :key="a.id" class="check">
              <input v-model="form.audience.areaIds" type="checkbox" :value="a.id" @change="preview" />
              <span>{{ a.nombre }}</span>
            </label>
          </div>
          <div class="who-col">
            <p class="who-title">Grupos</p>
            <p v-if="!orgGroups.length" class="empty">No hay grupos cargados.</p>
            <label v-for="g in orgGroups" :key="g.id" class="check">
              <input v-model="form.audience.groupIds" type="checkbox" :value="g.id" @change="preview" />
              <span>{{ g.nombre }}</span>
            </label>
          </div>
        </div>

        <div class="who-actions">
          <button
            v-if="selectedTipo?.audience?.mode === 'restricted'"
            type="button"
            class="link"
            @click="aplicarAudienciaDelTipo"
          >
            Usar destinatarios sugeridos de la plantilla
          </button>
          <button type="button" class="link" @click="preview">Actualizar cantidad</button>
        </div>
      </section>

      <!-- Paso 3 -->
      <section class="card span-full">
        <div class="step">
          <span class="step-n">3</span>
          <div>
            <h2>{{ tipoCampos.length ? 'Preguntas adicionales' : '¿Qué deben completar?' }}</h2>
            <p class="hint">
              <template v-if="tipoCampos.length">
                Opcional. Se suman a las {{ tipoCampos.length }} de la plantilla
                <strong>{{ selectedTipo?.nombre }}</strong>.
              </template>
              <template v-else>
                Armá las preguntas del formulario. Cada persona las responde en su ticket.
              </template>
            </p>
          </div>
        </div>

        <div class="questions">
          <article v-for="(c, idx) in form.camposExtra" :key="idx" class="question">
            <div class="question-head">
              <span class="q-n">Adicional {{ idx + 1 }}</span>
              <button type="button" class="link danger" @click="removeCampo(idx)">Quitar</button>
            </div>

            <label class="field">
              <span>Texto de la pregunta</span>
              <input
                v-model="c.label"
                class="input"
                required
                placeholder="Ej. Dirección completa"
                @input="syncKey(c)"
              />
            </label>

            <div class="row">
              <label class="field">
                <span>Tipo de respuesta</span>
                <select v-model="c.tipo" class="input">
                  <option value="text">Texto corto</option>
                  <option value="textarea">Texto largo</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="email">Email</option>
                  <option value="url">Link / URL</option>
                  <option value="check">Sí / No (casilla)</option>
                  <option value="select">Elegir de una lista</option>
                </select>
              </label>
              <label class="check required-toggle">
                <input v-model="c.required" type="checkbox" />
                <span>Obligatoria</span>
              </label>
            </div>

            <label v-if="c.tipo === 'select'" class="field">
              <span>Opciones de la lista</span>
              <input
                v-model="c.opcionesStr"
                class="input"
                placeholder="Separadas por coma. Ej. Casa, Departamento, Otro"
              />
            </label>
          </article>

          <button type="button" class="add-q" @click="addCampo">
            {{ tipoCampos.length ? '+ Agregar pregunta adicional' : '+ Agregar pregunta' }}
          </button>
        </div>

        <div v-if="allQuestions.length || form.mediaUrl.trim()" class="preview-box">
          <p class="preview-title">Así lo van a ver</p>
          <div class="preview-form">
            <div v-if="form.mediaUrl.trim()" class="preview-media">
              <PostMedia :url="form.mediaUrl" :alt="form.titulo || 'Vista previa'" :autoplay-on-visible="false" />
            </div>
            <p class="preview-heading">{{ form.titulo || 'Título del pedido' }}</p>
            <p v-if="form.cuerpo" class="preview-msg">{{ form.cuerpo }}</p>
            <div v-for="(q, i) in allQuestions" :key="i" class="preview-q">
              <label>
                {{ q.label || `Pregunta ${i + 1}` }}
                <em v-if="q.required">*</em>
              </label>
              <div class="preview-control" :data-tipo="q.tipo">
                <template v-if="q.tipo === 'textarea'">Respuesta larga…</template>
                <template v-else-if="q.tipo === 'select'">Elegí una opción…</template>
                <template v-else-if="q.tipo === 'check'">☐ Sí</template>
                <template v-else-if="q.tipo === 'date'">dd/mm/aaaa</template>
                <template v-else>Escribir acá…</template>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="empty-q">
          Todavía no hay preguntas. Podés enviar solo un mensaje o una imagen/video, o agregar preguntas para que respondan.
        </p>
      </section>

      <footer class="footer span-full">
        <p v-if="error" class="err">{{ error }}</p>
        <p v-if="ok" class="ok">{{ ok }}</p>
        <div class="footer-actions">
          <RouterLink to="/solicitudes" class="btn-ghost">Cancelar</RouterLink>
          <button
            type="submit"
            class="btn-primary"
            :disabled="sending || previewTotal < 1 || !form.titulo.trim()"
          >
            {{ sending ? 'Enviando…' : `Enviar a ${previewTotal} ${previewTotal === 1 ? 'persona' : 'personas'}` }}
          </button>
        </div>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import PostMedia from '../components/PostMedia.vue'
import { mediaKindLabel } from '../utils/media'

const router = useRouter()
const types = ref([])
const orgAreas = ref([])
const orgGroups = ref([])
const previewTotal = ref(0)
const previewSample = ref([])
const error = ref('')
const ok = ref('')
const sending = ref(false)

const form = ref({
  tipoId: '',
  titulo: '',
  cuerpo: '',
  mediaUrl: '',
  audience: { mode: 'restricted', areaIds: [], groupIds: [] },
  camposExtra: [],
})

const selectedTipo = computed(() => types.value.find((x) => x.id === form.value.tipoId) || null)
const tipoCampos = computed(() => selectedTipo.value?.campos || [])
const mediaLabel = computed(() => mediaKindLabel(form.value.mediaUrl))

const allQuestions = computed(() => [
  ...tipoCampos.value.map((c) => ({ ...c })),
  ...form.value.camposExtra.filter((c) => c.label?.trim()),
])

const TIPO_LABELS = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  check: 'Sí / No',
  select: 'Lista',
  email: 'Email',
  url: 'URL',
}

function tipoLabel(t) {
  return TIPO_LABELS[t] || t || 'Texto'
}

function slugKey(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return base || `pregunta_${Date.now().toString(36)}`
}

function syncKey(c) {
  c.key = slugKey(c.label)
}

function onTipo() {
  const t = selectedTipo.value
  if (!t) return
  if (!form.value.titulo.trim()) form.value.titulo = t.nombre || ''
  if (!form.value.cuerpo.trim() && t.descripcion) form.value.cuerpo = t.descripcion
}

function setAudienceAll() {
  form.value.audience.mode = 'all'
  form.value.audience.areaIds = []
  form.value.audience.groupIds = []
  preview()
}

function aplicarAudienciaDelTipo() {
  const a = selectedTipo.value?.audience
  if (!a) return
  form.value.audience = {
    mode: a.mode === 'restricted' ? 'restricted' : 'all',
    areaIds: [...(a.areaIds || [])],
    groupIds: [...(a.groupIds || [])],
  }
  preview()
}

function addCampo() {
  form.value.camposExtra.push({
    key: '',
    label: '',
    tipo: 'text',
    required: true,
    opcionesStr: '',
    orden: (form.value.camposExtra.length + 1) * 10,
  })
}

function removeCampo(idx) {
  form.value.camposExtra.splice(idx, 1)
}

async function load() {
  const [{ data: t }, { data: org }] = await Promise.all([
    api.get('/request-types', { params: { all: '1' } }),
    api.get('/admin/org/options'),
  ])
  types.value = t.items || []
  orgAreas.value = org.areas || []
  orgGroups.value = org.groups || []
}

async function preview() {
  error.value = ''
  try {
    const { data } = await api.post('/requests/broadcast/preview', { audience: form.value.audience })
    previewTotal.value = data.total || 0
    previewSample.value = data.sample || []
  } catch (e) {
    previewTotal.value = 0
    error.value = e.response?.data?.error || 'No se pudo calcular los destinatarios'
  }
}

async function send() {
  error.value = ''
  ok.value = ''
  sending.value = true
  try {
    const payload = {
      tipoId: form.value.tipoId || undefined,
      titulo: form.value.titulo,
      cuerpo: form.value.cuerpo,
      mediaUrl: form.value.mediaUrl.trim() || undefined,
      audience: form.value.audience,
      camposExtra: form.value.camposExtra
        .filter((c) => c.label?.trim())
        .map((c, i) => ({
          key: c.key || slugKey(c.label),
          label: c.label.trim(),
          tipo: c.tipo,
          required: c.required,
          orden: c.orden || (i + 1) * 10,
          opciones:
            c.tipo === 'select'
              ? String(c.opcionesStr || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
        })),
    }
    const { data } = await api.post('/requests/broadcast', payload)
    ok.value = `Listo: se envió a ${data.created} personas`
    await router.push({ path: '/solicitudes', query: { campaignId: data.campaignId } })
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo enviar'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await load()
  await preview()
})
</script>

<style scoped>
.page {
  width: 100%;
  max-width: none;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.head h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ink);
}

.head > div > p {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  color: var(--ink-soft);
  max-width: 52rem;
  line-height: 1.45;
}

.head-aside {
  min-width: 10rem;
  padding: 0.85rem 1.1rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  text-align: right;
}

.count-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary);
  font-weight: 600;
}

.count-num {
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--brand-primary);
  line-height: 1.1;
}

.count-sample {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--brand-secondary);
  max-width: 16rem;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
}

.span-full {
  grid-column: 1 / -1;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.15rem 1.25rem;
}

.step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.step-n {
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.step h2 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
}

.hint {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin-top: 0.15rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink);
}

.field small {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.inline-link {
  color: var(--brand-primary);
  text-decoration: underline;
  margin-left: 0.25rem;
}

.input {
  width: 100%;
  border: 1px solid var(--line-2);
  border-radius: 0.65rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--ink);
  background: var(--panel);
}

.input:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-primary) 45%, var(--panel));
  outline-offset: 1px;
  border-color: var(--brand-primary);
}

.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.mode {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--panel-2);
  cursor: pointer;
}

.mode strong {
  display: block;
  font-size: 0.9rem;
  color: var(--ink);
}

.mode span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.mode.on {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
}

.mode.on strong,
.mode.on span {
  color: #fff;
}

.who {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
}

.who-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  margin-bottom: 0.4rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.875rem;
  color: var(--ink);
  padding: 0.2rem 0;
  cursor: pointer;
}

.who-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin-top: 0.85rem;
}

.link {
  background: none;
  border: 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--brand-primary);
  text-decoration: underline;
  cursor: pointer;
}

.link.danger {
  color: var(--bad);
}

.empty {
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.plantilla-box {
  margin: 0 0 1rem;
  padding: 0.9rem 1rem;
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
}

.plantilla-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.plantilla-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary);
}

.plantilla-name {
  margin-top: 0.15rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}

.plantilla-count {
  flex: 0 0 auto;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.plantilla-desc {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.4;
}

.plantilla-qs {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.plantilla-qs li {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.55rem 0.65rem;
  border-radius: 0.65rem;
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
}

.pq-n {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
  color: var(--brand-primary);
  font-size: 0.72rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.plantilla-qs strong {
  display: block;
  font-size: 0.875rem;
  color: var(--ink);
}

.plantilla-qs span {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.72rem;
  color: var(--ink-soft);
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question {
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 0.9rem 1rem;
  background: var(--panel-2);
}

.question-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}

.q-n {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--brand-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.85rem;
  align-items: end;
}

.required-toggle {
  padding-bottom: 0.65rem;
  white-space: nowrap;
}

.add-q {
  align-self: flex-start;
  border: 1px dashed var(--ink-faint);
  background: var(--panel);
  color: var(--brand-primary);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.65rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
}

.add-q:hover {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}

.preview-box {
  margin-top: 1.25rem;
  padding-top: 1.15rem;
  border-top: 1px solid var(--line);
}

.preview-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  margin-bottom: 0.65rem;
}

.preview-form {
  max-width: 28rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  background: linear-gradient(180deg, var(--panel-2) 0%, var(--panel) 40%);
}

.preview-media {
  margin: -0.25rem -0.35rem 0.75rem;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--ink);
  aspect-ratio: 16 / 9;
}

.preview-media :deep(.pmedia),
.preview-media :deep(.el) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-preview {
  margin-top: 0.35rem;
  margin-bottom: 0.5rem;
  border-radius: 0.85rem;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--ink);
  aspect-ratio: 16 / 9;
  max-width: 100%;
}

.media-preview :deep(.pmedia),
.media-preview :deep(.el) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-kind {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--brand-primary);
  font-weight: 600;
}

.preview-heading {
  font-weight: 600;
  font-size: 1rem;
  color: var(--ink);
}

.preview-msg {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
  line-height: 1.4;
}

.preview-q {
  margin-top: 0.85rem;
}

.preview-q label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.3rem;
}

.preview-q em {
  color: var(--bad);
  font-style: normal;
}

.preview-control {
  border: 1px solid var(--line-2);
  border-radius: 0.55rem;
  padding: 0.5rem 0.7rem;
  font-size: 0.8rem;
  color: var(--ink-faint);
  background: var(--panel);
}

.empty-q {
  font-size: 0.85rem;
  color: var(--ink-faint);
  margin-top: 0.5rem;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0 0.5rem;
}

.footer-actions {
  display: flex;
  gap: 0.65rem;
  margin-left: auto;
}

.btn-ghost,
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.15rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--line-2);
  cursor: pointer;
}

.btn-ghost {
  background: var(--panel);
  color: var(--ink-soft);
}

.btn-primary {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.err {
  color: var(--bad);
  font-size: 0.875rem;
}

.ok {
  color: var(--brand-primary);
  font-size: 0.875rem;
}

@media (max-width: 900px) {
  .layout,
  .modes,
  .who,
  .row {
    grid-template-columns: 1fr;
  }

  .head-aside {
    text-align: left;
    width: 100%;
  }
}
</style>
