<template>
  <section class="detail">
    <button type="button" class="back" @click="$router.push({ path: '/ayuda', query: { tab: 'faqs' } })">
      ← Ayuda
    </button>
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err" role="alert">{{ error }}</p>
    <article v-else-if="faq">
      <span class="cat">{{ faq.category }}</span>
      <h1>{{ faq.pregunta }}</h1>
      <div class="body">{{ faq.respuesta }}</div>
      <p v-if="faq.keywords?.length" class="tags">
        <span v-for="k in faq.keywords" :key="k">{{ k }}</span>
      </p>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const faq = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/help/faqs/${route.params.id}`)
    faq.value = data.faq
  } catch (e) {
    error.value = e.response?.data?.error || 'FAQ no encontrada'
    faq.value = null
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
  margin: 6px 0 14px;
}
.body {
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: 1rem;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 18px;
}
.tags span {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, transparent);
  color: var(--brand-primary, #0f766e);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
}
.err {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}
</style>
