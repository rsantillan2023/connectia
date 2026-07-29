<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Datos útiles</h1>
        <p class="text-sm text-slate-500 mt-1">
          Contactos, internos, sedes y datos útiles que la gente usa todos los días.
        </p>
        <ScreenHelp
          purpose="ABM del directorio corporativo visible en la app (llamar, WhatsApp, email, mapa, favoritos)."
          can-do="Crear personas, sedes, servicios y emergencias; pedir a la IA que busque en la web y cargue fichas; segmentar y desactivar."
        />
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          type="button"
          class="rounded-lg border border-teal-700 text-teal-800 px-4 py-2 text-sm font-medium bg-white"
          @click="showAi = !showAi"
        >
          {{ showAi ? 'Ocultar IA' : 'Buscar con IA' }}
        </button>
        <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
          + Contacto
        </button>
      </div>
    </div>

    <section v-if="showAi" class="ai-panel mt-4">
      <h2 class="ai-title">IA — buscar en la red y cargar al directorio</h2>
      <p class="ai-hint">
        Pedile sedes, teléfonos de atención, urgencias o recepción. La IA busca en la web y, si está
        habilitado, crea las fichas sola (podés editarlas después).
      </p>
      <p v-if="!aiConfigured" class="ai-warn">
        Sin API de IA/buscador configurada en el servidor (OPENAI/ANTHROPIC y/o SERPER/BRAVE). Igual
        podés intentar: usa heurísticas limitadas.
      </p>
      <label class="ai-label">
        Qué buscamos
        <textarea
          v-model="aiPrompt"
          class="input"
          rows="3"
          placeholder="Ej: sucursales y teléfonos de atención al público de Acme SA en CABA; también recepción y mesa de ayuda"
        />
      </label>
      <div class="ai-row">
        <label class="ai-label grow">
          Empresa (opcional)
          <input v-model="aiCompany" class="input" placeholder="Nombre de la empresa" />
        </label>
        <label class="ai-label grow">
          Sitio web (opcional)
          <input v-model="aiWebsite" class="input" placeholder="https://…" />
        </label>
      </div>
      <label class="check">
        <input v-model="aiAutoCreate" type="checkbox" />
        Crear automáticamente en el directorio (recomendado)
      </label>
      <div class="ai-actions">
        <button type="button" class="btn-primary" :disabled="aiBusy || !aiPrompt.trim()" @click="runAiImport">
          {{ aiBusy ? 'Buscando y cargando…' : 'Buscar y cargar' }}
        </button>
        <button type="button" class="btn-ghost" :disabled="aiBusy" @click="seedDefaults">
          Restaurar contactos base
        </button>
      </div>
      <p v-if="aiNotes" class="ai-notes">{{ aiNotes }}</p>
      <ul v-if="aiSources.length" class="ai-sources">
        <li v-for="(s, i) in aiSources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener">{{ s.title || s.url }}</a>
        </li>
      </ul>
      <div v-if="aiDrafts.length && !aiAutoCreate" class="ai-drafts">
        <p class="ai-hint">Borradores (creá a mano o volvé a correr con auto-crear):</p>
        <button
          v-for="(d, i) in aiDrafts"
          :key="i"
          type="button"
          class="draft-chip"
          @click="openFromAiDraft(d)"
        >
          {{ d.nombre }} · {{ d.tipo }}
        </button>
      </div>
    </section>

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
        placeholder="Buscar nombre, interno, teléfono…"
        @keyup.enter="load"
      />
      <select v-model="tipo" class="border rounded-lg px-3 py-2 text-sm" @change="load">
        <option value="">Todos los tipos</option>
        <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
      <select v-model="activo" class="border rounded-lg px-3 py-2 text-sm" @change="load">
        <option value="true">Activos</option>
        <option value="">Todos</option>
        <option value="false">Inactivos</option>
      </select>
      <button class="rounded-lg px-3 py-1.5 text-sm border bg-white" @click="load">Buscar</button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3 w-12"></th>
            <th class="p-3">Nombre</th>
            <th class="p-3">Tipo</th>
            <th class="p-3">Contacto</th>
            <th class="p-3">Ubicación</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row.id" class="border-t">
            <td class="p-3">
              <div class="thumb" :style="{ background: row.color || '#0f766e' }">
                <img v-if="row.imageUrl" :src="row.imageUrl" alt="" @error="($e) => ($e.target.style.display = 'none')" />
                <span v-else>{{ (row.nombre || '?').slice(0, 1) }}</span>
              </div>
            </td>
            <td class="p-3">
              <div class="font-medium">{{ row.nombre }}</div>
              <div class="text-xs text-slate-500">{{ row.categoria }}</div>
            </td>
            <td class="p-3 text-xs">{{ row.tipoLabel }}</td>
            <td class="p-3 text-xs">
              <div v-if="row.interno">Int. {{ row.interno }}</div>
              <div>{{ row.telefono || '—' }}</div>
              <div class="text-slate-500">{{ row.email || '' }}</div>
            </td>
            <td class="p-3 text-xs">
              {{ row.ciudad || row.direccion || (row.hasLocation ? 'Con mapa' : '—') }}
            </td>
            <td class="p-3">
              <span :class="row.activo ? 'text-teal-700' : 'text-slate-400'">
                {{ row.activo ? 'Activo' : 'Inactivo' }}
              </span>
              <span v-if="row.destacado" class="ml-1 text-amber-600 text-xs">★</span>
            </td>
            <td class="p-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-teal-700" @click="edit(row)">Editar</button>
              <button v-if="row.activo" class="text-amber-700" @click="deactivate(row)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length && !error" class="p-4 text-sm text-slate-500">
        Todavía no hay contactos. Usá “Buscar con IA” o “Restaurar contactos base”.
      </p>
    </div>

    <Teleport to="body">
      <div v-if="draft" class="modal-root" @keydown.esc="draft = null">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="draft = null" />
        <aside class="modal" role="dialog" aria-modal="true">
          <header class="modal-head">
            <h2>{{ draft.id ? 'Editar contacto' : 'Nuevo contacto' }}</h2>
            <p class="muted">Cuantos más datos útiles, más acciones en la app (llamar, WA, mapa…).</p>
          </header>
          <form class="form" @submit.prevent="save">
            <div class="grid-2">
              <label>Nombre * <input v-model="draft.nombre" class="input" required maxlength="160" /></label>
              <label>
                Tipo
                <select v-model="draft.tipo" class="input">
                  <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
              </label>
              <label>Categoría <input v-model="draft.categoria" class="input" list="dir-cats" /></label>
              <datalist id="dir-cats">
                <option v-for="c in categories" :key="c" :value="c" />
              </datalist>
              <label>Orden <input v-model.number="draft.orden" class="input" type="number" /></label>
            </div>
            <label>Descripción <textarea v-model="draft.descripcion" class="input" rows="2" /></label>
            <label>
              Logo / imagen (URL)
              <input v-model="draft.imageUrl" class="input" placeholder="https://…" />
            </label>
            <div v-if="draft.imageUrl" class="img-preview">
              <img :src="draft.imageUrl" alt="Vista previa" @error="previewBroken = true" @load="previewBroken = false" />
              <span v-if="previewBroken" class="hint">No se pudo cargar la imagen</span>
            </div>
            <div class="grid-2">
              <label>Teléfono <input v-model="draft.telefono" class="input" /></label>
              <label>Interno <input v-model="draft.interno" class="input" /></label>
              <label>WhatsApp <input v-model="draft.whatsapp" class="input" placeholder="Si vacío, usa teléfono" /></label>
              <label>Email <input v-model="draft.email" class="input" type="email" /></label>
            </div>
            <div class="grid-2">
              <label class="span-2">Dirección <input v-model="draft.direccion" class="input" /></label>
              <label>Ciudad <input v-model="draft.ciudad" class="input" /></label>
              <label>Horario <input v-model="draft.horario" class="input" placeholder="Lun–Vie 9 a 18" /></label>
              <label>Latitud <input v-model="draft.lat" class="input" placeholder="-34.60" /></label>
              <label>Longitud <input v-model="draft.lng" class="input" placeholder="-58.38" /></label>
            </div>
            <label class="check"><input v-model="draft.destacado" type="checkbox" /> Destacado</label>
            <label class="check"><input v-model="draft.activo" type="checkbox" /> Activo</label>
            <p class="hint">
              Tip: para sedes pegá lat/lng desde Google Maps (clic derecho → coordenadas). La app abre “Cómo llegar”.
            </p>
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
import { onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const tipos = ref([])
const categories = ref([])
const q = ref('')
const tipo = ref('')
const activo = ref('true')
const error = ref('')
const okMsg = ref('')
const draft = ref(null)
const saving = ref(false)
const previewBroken = ref(false)

const showAi = ref(true)
const aiConfigured = ref(false)
const aiPrompt = ref('')
const aiCompany = ref('')
const aiWebsite = ref('')
const aiAutoCreate = ref(true)
const aiBusy = ref(false)
const aiNotes = ref('')
const aiSources = ref([])
const aiDrafts = ref([])

function emptyDraft() {
  return {
    id: null,
    nombre: '',
    tipo: 'servicio',
    categoria: 'General',
    descripcion: '',
    telefono: '',
    interno: '',
    whatsapp: '',
    email: '',
    direccion: '',
    ciudad: '',
    lat: '',
    lng: '',
    horario: '',
    orden: 100,
    destacado: false,
    activo: true,
    imageUrl: '',
  }
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/directory', {
      params: {
        q: q.value || undefined,
        tipo: tipo.value || undefined,
        activo: activo.value || undefined,
      },
    })
    items.value = data.items || []
    tipos.value = data.tipos || []
    categories.value = data.categories || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el directorio'
  }
}

async function loadAiStatus() {
  try {
    const { data } = await api.get('/admin/directory/ai-status')
    aiConfigured.value = Boolean(data.configured)
  } catch {
    aiConfigured.value = false
  }
}

function openNew() {
  previewBroken.value = false
  draft.value = emptyDraft()
}

function openFromAiDraft(d) {
  previewBroken.value = false
  draft.value = {
    ...emptyDraft(),
    ...d,
    lat: d.lat ?? '',
    lng: d.lng ?? '',
    activo: true,
  }
  showAi.value = false
}

function edit(row) {
  previewBroken.value = false
  draft.value = {
    ...emptyDraft(),
    ...row,
    lat: row.lat ?? '',
    lng: row.lng ?? '',
  }
}

function payload() {
  const d = draft.value
  return {
    ...d,
    lat: d.lat === '' || d.lat == null ? null : Number(d.lat),
    lng: d.lng === '' || d.lng == null ? null : Number(d.lng),
  }
}

async function save() {
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const body = payload()
    if (draft.value.id) await api.patch(`/admin/directory/${draft.value.id}`, body)
    else await api.post('/admin/directory', body)
    draft.value = null
    okMsg.value = 'Contacto guardado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function deactivate(row) {
  if (!confirm(`Desactivar “${row.nombre}”?`)) return
  try {
    await api.delete(`/admin/directory/${row.id}`)
    okMsg.value = 'Desactivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo desactivar'
  }
}

async function runAiImport() {
  if (aiBusy.value || !aiPrompt.value.trim()) return
  aiBusy.value = true
  error.value = ''
  okMsg.value = ''
  aiNotes.value = ''
  aiSources.value = []
  aiDrafts.value = []
  try {
    const { data } = await api.post('/admin/directory/ai-import', {
      prompt: aiPrompt.value.trim(),
      companyName: aiCompany.value.trim() || undefined,
      websiteUrl: aiWebsite.value.trim() || undefined,
      autoCreate: aiAutoCreate.value,
    })
    aiNotes.value =
      data.notes ||
      (data.createdCount
        ? `Se crearon ${data.createdCount} contacto(s) desde la web.`
        : `Se armaron ${(data.drafts || []).length} borrador(es).`)
    aiSources.value = data.sources || []
    aiDrafts.value = data.drafts || []
    if (data.createdCount) {
      okMsg.value = `IA: ${data.createdCount} contacto(s) cargados al directorio`
      await load()
    } else if (!aiAutoCreate.value && aiDrafts.value.length) {
      okMsg.value = `${aiDrafts.value.length} borrador(es) listos — tocá uno para editar/guardar`
    } else {
      okMsg.value = 'La búsqueda no encontró datos nuevos para crear (revisá el prompt o fuentes)'
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo completar la búsqueda IA'
  } finally {
    aiBusy.value = false
  }
}

async function seedDefaults() {
  if (aiBusy.value) return
  aiBusy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/directory/seed-defaults')
    okMsg.value = `Contactos base: ${data.created} nuevos` +
      (data.updatedImages ? `, ${data.updatedImages} con imagen` : '') +
      ` (total activos ${data.total})`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron restaurar contactos base'
  } finally {
    aiBusy.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadAiStatus()])
})
</script>

<style scoped>
.ai-panel {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.ai-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #115e59;
}
.ai-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
}
.ai-warn {
  margin: 0;
  font-size: 0.8rem;
  color: #b45309;
}
.ai-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.ai-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
.grow {
  flex: 1 1 180px;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.ai-notes {
  margin: 0;
  font-size: 0.85rem;
  color: #0f766e;
}
.ai-sources {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.8rem;
}
.ai-sources a {
  color: #0f766e;
}
.ai-drafts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.draft-chip {
  border: 1px solid #5eead4;
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  cursor: pointer;
}
.thumb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-preview {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
.img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
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
  width: min(560px, 100%);
  height: 100%;
  background: #fff;
  overflow: auto;
  box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
}
.modal-head {
  padding: 1.2rem 1.4rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}
.modal-head h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}
.muted {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}
.form {
  padding: 1rem 1.4rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.span-2 {
  grid-column: 1 / -1;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.input {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
}
.check {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}
.btn-ghost {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}
.btn-primary {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.6;
}
@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
