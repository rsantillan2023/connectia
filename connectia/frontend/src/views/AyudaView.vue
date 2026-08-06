<template>
  <section class="help">
    <header class="help-head">
      <h1>Ayuda</h1>
      <p>FAQs y tutoriales para usar Connectyx en tu comunidad.</p>
    </header>

    <div class="help-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'faqs'"
        :class="{ on: tab === 'faqs' }"
        @click="tab = 'faqs'"
      >
        FAQs
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'tutorials'"
        :class="{ on: tab === 'tutorials' }"
        @click="tab = 'tutorials'"
      >
        Tutoriales
      </button>
    </div>

    <div class="help-toolbar">
      <input
        v-model="q"
        type="search"
        class="help-search"
        :placeholder="tab === 'faqs' ? 'Buscar preguntas…' : 'Buscar tutoriales…'"
        @keyup.enter="load"
      />
      <button type="button" class="help-search-btn" @click="load">Buscar</button>
    </div>

    <div v-if="categories.length" class="help-cats">
      <button type="button" :class="{ on: !category }" @click="setCategory('')">Todas</button>
      <button
        v-for="c in categories"
        :key="c"
        type="button"
        :class="{ on: category === c }"
        @click="setCategory(c)"
      >
        {{ c }}
      </button>
    </div>

    <p v-if="error" class="help-err" role="alert">{{ error }}</p>
    <p v-if="loading" class="help-muted">Cargando…</p>

    <ul v-if="!loading && tab === 'faqs'" class="help-list">
      <li v-for="f in faqs" :key="f.id">
        <button type="button" class="help-card" @click="$router.push(`/ayuda/faq/${f.id}`)">
          <span class="help-card-cat">{{ f.category }}</span>
          <strong>{{ f.pregunta }}</strong>
          <p>{{ excerpt(f.respuesta) }}</p>
        </button>
      </li>
    </ul>

    <ul v-if="!loading && tab === 'tutorials'" class="help-list">
      <li v-for="t in tutorials" :key="t.id">
        <button type="button" class="help-card" @click="$router.push(`/ayuda/tutorial/${t.id}`)">
          <span class="help-card-cat">{{ t.category }}</span>
          <strong>{{ t.titulo }}</strong>
          <p>
            {{ t.descripcion || `${t.stepCount || 0} pasos` }}
            <span v-if="t.moduloRelacionado"> · {{ t.moduloRelacionado }}</span>
          </p>
        </button>
      </li>
    </ul>

    <p
      v-if="!loading && ((tab === 'faqs' && !faqs.length) || (tab === 'tutorials' && !tutorials.length))"
      class="help-muted center"
    >
      No hay {{ tab === 'faqs' ? 'FAQs' : 'tutoriales' }} para mostrar.
    </p>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'tutorials' ? 'tutorials' : 'faqs')
const q = ref(String(route.query.q || ''))
const category = ref(String(route.query.category || ''))
const faqs = ref([])
const tutorials = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')

function excerpt(s, n = 120) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`
}

function setCategory(c) {
  category.value = c
  load()
}

async function load() {
  loading.value = true
  error.value = ''
  const params = {}
  if (q.value.trim()) params.q = q.value.trim()
  if (category.value) params.category = category.value
  try {
    if (tab.value === 'faqs') {
      const { data } = await api.get('/help/faqs', { params })
      faqs.value = data.items || []
      categories.value = data.categories || []
    } else {
      const { data } = await api.get('/help/tutorials', { params })
      tutorials.value = data.items || []
      categories.value = data.categories || []
    }
    router.replace({
      query: {
        ...(tab.value === 'tutorials' ? { tab: 'tutorials' } : {}),
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
        ...(category.value ? { category: category.value } : {}),
      },
    })
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la ayuda'
  } finally {
    loading.value = false
  }
}

watch(tab, () => {
  category.value = ''
  load()
})

onMounted(load)
</script>

<style scoped>
.help {
  padding: 16px 16px 88px;
  max-width: 720px;
  margin: 0 auto;
}
.help-head h1 {
  font-size: 1.45rem;
  font-weight: 700;
  margin: 0 0 4px;
}
.help-head p {
  margin: 0;
  color: var(--muted, #64748b);
  font-size: 0.92rem;
}
.help-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0 12px;
}
.help-tabs button {
  border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff);
  border-radius: 12px;
  padding: 10px;
  font-weight: 600;
}
.help-tabs button.on {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-color: transparent;
}
.help-toolbar {
  display: flex;
  gap: 8px;
}
.help-search {
  flex: 1;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface, #fff);
}
.help-search-btn {
  border: none;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 12px;
  padding: 0 14px;
  font-weight: 600;
}
.help-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}
.help-cats button {
  border: 1px solid var(--border, #e2e8f0);
  background: transparent;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.82rem;
}
.help-cats button.on {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  border-color: var(--brand-primary, #0f766e);
  color: var(--brand-primary, #0f766e);
}
.help-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.help-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff);
  border-radius: 14px;
  padding: 14px;
}
.help-card-cat {
  display: inline-block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary, #0f766e);
  margin-bottom: 4px;
}
.help-card strong {
  display: block;
  font-size: 1rem;
}
.help-card p {
  margin: 6px 0 0;
  color: var(--muted, #64748b);
  font-size: 0.88rem;
}
.help-err {
  color: #b91c1c;
}
.help-muted {
  color: var(--muted, #64748b);
}
.center {
  text-align: center;
  margin-top: 24px;
}
</style>
