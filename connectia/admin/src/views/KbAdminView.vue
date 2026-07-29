<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Base de conocimientos</h1>
        <p>
          Artículos (FAQ, guías, políticas) que usa el <strong>Asistente</strong> de la app para
          orientar a los miembros. Publicá contenido claro; el bot cita estas fuentes.
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">Actualizar</button>
        <button type="button" class="btn-primary" @click="openCreate">Nuevo artículo</button>
      </div>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="!items.length && !loading" class="empty">Todavía no hay artículos. Creá el primero.</p>

    <div class="list">
      <article v-for="a in items" :key="a.id" class="card">
        <div class="card-top">
          <h2>{{ a.titulo }}</h2>
          <span class="badge">{{ a.categoria }} · {{ a.status }}</span>
        </div>
        <p class="excerpt">{{ excerpt(a.cuerpo) }}</p>
        <div class="card-actions">
          <button type="button" class="btn-ghost" @click="openEdit(a)">Editar</button>
          <button type="button" class="btn-danger" @click="remove(a)">Eliminar</button>
        </div>
      </article>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal = false">
      <form class="modal" @submit.prevent="save">
        <h3>{{ form.id ? 'Editar' : 'Nuevo' }} artículo</h3>
        <label>
          Título
          <input v-model="form.titulo" required maxlength="200" />
        </label>
        <label>
          Categoría
          <select v-model="form.categoria">
            <option value="faq">FAQ</option>
            <option value="guia">Guía</option>
            <option value="politica">Política</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Estado
          <select v-model="form.status">
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
        <label>
          Tags (coma)
          <input v-model="tagsStr" placeholder="solicitudes, documentos" />
        </label>
        <label>
          Cuerpo
          <textarea v-model="form.cuerpo" rows="8" required />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" @click="modal = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const modal = ref(false)
const tagsStr = ref('')
const form = reactive({
  id: '',
  titulo: '',
  cuerpo: '',
  categoria: 'faq',
  status: 'published',
})

function excerpt(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim()
  return s.length > 160 ? `${s.slice(0, 159)}…` : s
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/kb')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al cargar'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = ''
  form.titulo = ''
  form.cuerpo = ''
  form.categoria = 'faq'
  form.status = 'published'
  tagsStr.value = ''
  modal.value = true
}

function openEdit(a) {
  form.id = a.id
  form.titulo = a.titulo
  form.cuerpo = a.cuerpo
  form.categoria = a.categoria
  form.status = a.status
  tagsStr.value = (a.tags || []).join(', ')
  modal.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  const payload = {
    titulo: form.titulo,
    cuerpo: form.cuerpo,
    categoria: form.categoria,
    status: form.status,
    tags: tagsStr.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }
  try {
    if (form.id) await api.patch(`/admin/kb/${form.id}`, payload)
    else await api.post('/admin/kb', payload)
    modal.value = false
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function remove(a) {
  if (!confirm(`¿Eliminar “${a.titulo}”?`)) return
  try {
    await api.delete(`/admin/kb/${a.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo eliminar'
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: 1.25rem 1.5rem 2rem;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.page-head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
}
.page-head p {
  margin: 0;
  max-width: 40rem;
  color: #64748b;
  font-size: 0.92rem;
}
.head-actions {
  display: flex;
  gap: 0.5rem;
}
.btn-primary,
.btn-ghost,
.btn-danger {
  border: 0;
  border-radius: 0.55rem;
  padding: 0.45rem 0.9rem;
  font-weight: 650;
  cursor: pointer;
  font-size: 0.88rem;
}
.btn-primary {
  background: #0f766e;
  color: #fff;
}
.btn-ghost {
  background: #f1f5f9;
  color: #334155;
}
.btn-danger {
  background: #fef2f2;
  color: #b91c1c;
}
.err {
  color: #b91c1c;
}
.empty {
  color: #64748b;
}
.list {
  display: grid;
  gap: 0.75rem;
}
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
}
.card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}
.card-top h2 {
  margin: 0;
  font-size: 1.05rem;
}
.badge {
  font-size: 0.72rem;
  background: #ecfdf5;
  color: #0f766e;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.excerpt {
  margin: 0.5rem 0 0.75rem;
  color: #475569;
  font-size: 0.9rem;
}
.card-actions {
  display: flex;
  gap: 0.4rem;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 1rem;
}
.modal {
  width: min(560px, 100%);
  background: #fff;
  border-radius: 0.85rem;
  padding: 1.25rem;
  display: grid;
  gap: 0.75rem;
}
.modal h3 {
  margin: 0;
}
.modal label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}
.modal input,
.modal select,
.modal textarea {
  font: inherit;
  font-weight: 400;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem 0.65rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
