<template>
  <section class="detail">
    <button
      type="button"
      class="back"
      @click="$router.push({ path: '/ayuda', query: { tab: 'tutorials' } })"
    >
      ← Tutoriales
    </button>
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err" role="alert">{{ error }}</p>
    <article v-else-if="tutorial">
      <span class="cat">{{ tutorial.category }}</span>
      <h1>{{ tutorial.titulo }}</h1>
      <p v-if="tutorial.descripcion" class="lead">{{ tutorial.descripcion }}</p>
      <ol class="steps">
        <li v-for="(s, i) in tutorial.steps || []" :key="i">
          <strong>{{ s.titulo || `Paso ${i + 1}` }}</strong>
          <p>{{ s.cuerpo }}</p>
          <img v-if="s.mediaUrl && s.mediaType === 'image'" :src="s.mediaUrl" alt="" class="media" />
          <video v-else-if="s.mediaUrl && s.mediaType === 'video'" :src="s.mediaUrl" controls class="media" />
        </li>
      </ol>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const tutorial = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/help/tutorials/${route.params.id}`)
    tutorial.value = data.tutorial
  } catch (e) {
    error.value = e.response?.data?.error || 'Tutorial no encontrado'
    tutorial.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.detail {
  padding: 16px 16px 88px;
  max-width: 720px;
  margin: 0 auto;
}
.back {
  border: none;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  padding: 0;
  margin-bottom: 12px;
}
.cat {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--brand-primary, #0f766e);
}
h1 {
  font-size: 1.35rem;
  margin: 6px 0 10px;
}
.lead {
  color: #64748b;
  margin: 0 0 16px;
}
.steps {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 14px;
}
.steps li strong {
  display: block;
  margin-bottom: 4px;
}
.steps p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}
.media {
  display: block;
  width: 100%;
  margin-top: 8px;
  border-radius: 12px;
}
.err {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}
</style>
