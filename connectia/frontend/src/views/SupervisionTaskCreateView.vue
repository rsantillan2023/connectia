<template>
  <section class="sup">
    <header class="sup-head">
      <button type="button" class="link" @click="$router.back()">←</button>
      <h1>Nueva tarea</h1>
    </header>
    <p v-if="error" class="sup-err">{{ error }}</p>
    <form class="form" @submit.prevent="save">
      <label>Título<input v-model="form.titulo" required maxlength="200" /></label>
      <label>Descripción<textarea v-model="form.descripcion" rows="3" /></label>
      <label>
        Sala
        <select v-model="form.salaId" required>
          <option value="">Elegí sala</option>
          <option v-for="s in salas" :key="s.id" :value="s.id">{{ s.nombre }}</option>
        </select>
      </label>
      <label>
        Plantilla (opcional)
        <select v-model="form.templateId">
          <option value="">Sin plantilla</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.nombre }}</option>
        </select>
      </label>
      <label>
        Asignar a
        <select v-model="form.asignadoId">
          <option value="">Sin asignar</option>
          <option v-for="o in operarios" :key="o.id" :value="o.id">{{ o.nombre }}</option>
        </select>
      </label>
      <label>Fecha límite<input v-model="form.fechaLimite" type="date" required /></label>
      <label>
        Prioridad
        <select v-model="form.prioridad">
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </label>
      <label class="check"><input v-model="form.requiereFoto" type="checkbox" /> Requiere foto</label>
      <button class="primary" type="submit" :disabled="busy">Crear</button>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const salas = ref([])
const templates = ref([])
const operarios = ref([])
const error = ref('')
const busy = ref(false)
const form = reactive({
  titulo: '',
  descripcion: '',
  salaId: '',
  templateId: '',
  asignadoId: '',
  fechaLimite: '',
  prioridad: 'media',
  requiereFoto: false,
})

async function loadOperarios() {
  if (!form.salaId) {
    operarios.value = []
    return
  }
  const { data } = await api.get('/supervision/operarios', { params: { salaId: form.salaId } })
  operarios.value = data.items || []
}

watch(() => form.salaId, loadOperarios)

onMounted(async () => {
  try {
    const [s, t] = await Promise.all([api.get('/supervision/salas'), api.get('/supervision/templates')])
    salas.value = s.data.items || []
    templates.value = t.data.items || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar catálogos'
  }
})

async function save() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/supervision/tareas', {
      ...form,
      templateId: form.templateId || undefined,
      asignadoId: form.asignadoId || undefined,
    })
    router.replace(`/supervision/tareas/${data.item.id}`)
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo crear'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.sup { padding: 1rem 1rem 5rem; }
.sup-head { display: flex; align-items: center; gap: 0.5rem; }
.sup-head h1 { margin: 0; font-size: 1.2rem; }
.link { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.form { display: grid; gap: 0.75rem; margin-top: 1rem; }
label { display: grid; gap: 0.3rem; font-size: 0.85rem; color: #475569; }
input, select, textarea { padding: 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; }
.check { display: flex; align-items: center; gap: 0.5rem; }
.primary { background: var(--brand-primary, #0f766e); color: #fff; border: 0; border-radius: 10px; padding: 0.75rem; font-weight: 600; }
.sup-err { color: #b91c1c; }
</style>
