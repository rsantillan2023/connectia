<template>
  <div class="sheet" @click.self="emit('close')">
    <div class="panel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="head">
        <div class="head-text">
          <h2 :id="titleId">{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class="body">
        <label class="label" :for="inputId">{{ searchLabel }}</label>
        <div class="search-row">
          <input
            :id="inputId"
            ref="queryInput"
            v-model="query"
            class="input"
            type="search"
            :placeholder="placeholder"
            :disabled="loading"
            @keyup.enter="runSearch"
          />
          <button
            type="button"
            class="btn-primary"
            :disabled="loading || query.trim().length < 2"
            @click="runSearch"
          >
            {{ loading ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
        <p class="hint">{{ hint }}</p>
        <p v-if="error" class="err">{{ error }}</p>

        <div v-if="searched && !loading" class="results-wrap">
          <p v-if="provider" class="muted results-meta">
            Resultados para <strong>«{{ lastQuery }}»</strong>
            <span v-if="provider"> · {{ provider }}</span>
          </p>
          <div v-if="!results.length" class="empty">No hubo resultados útiles. Probá otras palabras.</div>
          <ul v-else class="results">
            <li v-for="item in results" :key="item.id" class="result">
              <button type="button" class="result-btn" @click="pick(item)">
                <img
                  v-if="item.imageUrl"
                  class="thumb"
                  :src="item.imageUrl"
                  alt=""
                  loading="lazy"
                  @error="$event.target.style.display = 'none'"
                />
                <div class="result-text" :class="{ 'no-thumb': !item.imageUrl }">
                  <span class="result-source">{{ item.source || hostOf(item.url) }}</span>
                  <strong class="result-title">{{ item.title }}</strong>
                  <span v-if="item.channel || item.duration" class="result-meta">
                    <template v-if="item.channel">{{ item.channel }}</template>
                    <template v-if="item.channel && item.duration"> · </template>
                    <template v-if="item.duration">{{ item.duration }}</template>
                  </span>
                  <span v-if="item.directFile" class="badge">Archivo directo</span>
                  <span v-else-if="kind === 'audio' && !item.directFile" class="badge soft">
                    Página · verificá que reproduzca
                  </span>
                  <span class="result-snip">{{ item.snippet || item.url }}</span>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <footer class="foot">
        <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
        <p class="foot-hint">También podés pegar la URL a mano en el campo del editor.</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import api from '../services/api'

const props = defineProps({
  /** 'youtube' | 'audio' */
  kind: { type: String, default: 'youtube' },
  /** Prefill opcional (p. ej. título del borrador) */
  initialQuery: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])

const query = ref(props.initialQuery || '')
const lastQuery = ref('')
const results = ref([])
const provider = ref('')
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const queryInput = ref(null)

const titleId = computed(() => `media-pick-${props.kind}-title`)
const inputId = computed(() => `media-pick-${props.kind}-q`)

const title = computed(() =>
  props.kind === 'audio' ? 'Buscar audio en la red' : 'Buscar video en YouTube',
)
const subtitle = computed(() =>
  props.kind === 'audio'
    ? 'Buscá un archivo de audio o un enlace reproducible y lo cargamos en la publicación.'
    : 'Buscá en YouTube, elegí un video y lo dejamos listo en la URL de media.',
)
const searchLabel = computed(() =>
  props.kind === 'audio' ? '¿Qué audio buscás?' : '¿Qué video de YouTube buscás?',
)
const placeholder = computed(() =>
  props.kind === 'audio' ? 'Ej. música suave oficina, podcast bienestar…' : 'Ej. onboarding equipo, tip seguridad…',
)
const hint = computed(() =>
  props.kind === 'audio'
    ? 'Priorizamos enlaces .mp3/.m4a/.wav y sitios de audio. Preferí “archivo directo” para que suene en el muro.'
    : 'Los resultados son de YouTube. Un clic completa la URL del video en el editor.',
)

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'web'
  }
}

async function runSearch() {
  error.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    error.value = 'Escribí al menos 2 caracteres'
    return
  }
  loading.value = true
  searched.value = true
  results.value = []
  provider.value = ''
  try {
    const { data } = await api.post('/admin/posts/media-search/search', {
      kind: props.kind === 'audio' ? 'audio' : 'youtube',
      query: q,
      limit: 8,
    })
    results.value = Array.isArray(data.items) ? data.items : []
    provider.value = data.provider || ''
    lastQuery.value = data.query || q
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo buscar'
    results.value = []
  } finally {
    loading.value = false
  }
}

function pick(item) {
  if (!item?.url) return
  emit('select', {
    kind: props.kind === 'audio' ? 'audio' : 'youtube',
    url: item.url,
    title: item.title || '',
    item,
  })
}

onMounted(() => {
  nextTick(() => queryInput.value?.focus?.())
})
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid;
  place-items: center;
  padding: 16px;
}
.panel {
  width: min(640px, 100%);
  max-height: min(88vh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 16px;
  border: 1px solid var(--cx-border);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}
.head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 18px 10px;
  border-bottom: 1px solid var(--cx-border);
}
.head-text h2 {
  margin: 0;
  font-size: 1.15rem;
}
.head-text p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  line-height: 1.4;
}
.icon-btn {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
}
.icon-btn:hover {
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
  color: var(--cx-text);
}
.body {
  padding: 14px 18px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.input {
  width: 100%;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
}
.hint,
.muted {
  font-size: 12px;
  color: var(--cx-muted);
  margin: 8px 0 0;
  line-height: 1.4;
}
.err {
  margin: 10px 0 0;
  color: var(--bad);
  font-size: 13px;
}
.results-wrap {
  margin-top: 14px;
}
.results-meta {
  margin-bottom: 8px;
}
.results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.result-btn {
  width: 100%;
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  text-align: left;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 12px;
  padding: 10px;
  color: inherit;
  cursor: pointer;
}
.result-btn:hover {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.thumb {
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--cx-page);
}
.result-text {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.result-text.no-thumb {
  grid-column: 1 / -1;
}
.result-btn:has(.result-text.no-thumb) {
  grid-template-columns: 1fr;
}
.result-source {
  font-size: 11px;
  color: var(--cx-muted);
}
.result-title {
  font-size: 14px;
  line-height: 1.3;
}
.result-meta,
.result-snip {
  font-size: 12px;
  color: var(--cx-muted);
  line-height: 1.35;
}
.result-snip {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.badge {
  display: inline-block;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 16%, var(--cx-surface));
  color: var(--brand-primary);
}
.badge.soft {
  background: color-mix(in srgb, var(--cx-muted) 14%, var(--cx-surface));
  color: var(--cx-muted);
}
.empty {
  padding: 18px;
  text-align: center;
  color: var(--cx-muted);
  border: 1px dashed var(--cx-border);
  border-radius: 12px;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid var(--cx-border);
}
.foot-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--cx-muted);
  max-width: 28rem;
}
.btn-primary,
.btn-ghost {
  border-radius: 10px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  border: 0;
  background: var(--brand-primary);
  color: #fff;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: default;
}
.btn-ghost {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
}
@media (max-width: 560px) {
  .search-row {
    grid-template-columns: 1fr;
  }
  .result-btn {
    grid-template-columns: 72px 1fr;
  }
  .thumb {
    width: 72px;
    height: 54px;
  }
}
</style>
