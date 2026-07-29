<template>
  <div class="sheet" @click.self="emit('close')">
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="webnews-title">
      <header class="head">
        <div class="head-text">
          <div class="title-row">
            <h2 id="webnews-title">Noticia desde la web</h2>
            <button
              type="button"
              class="info-i"
              title="Cómo funciona la búsqueda"
              aria-label="Información sobre la búsqueda web"
              @click="infoOpen = true"
            >
              i
            </button>
          </div>
          <p>
            Buscá en la red, elegí hasta 3 artículos: leemos el contenido completo, tomamos la imagen
            y la IA arma una nota lista para tu muro. Después publicás o dejás borrador.
          </p>
        </div>
        <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <div class="steps" aria-label="Pasos">
        <span :class="{ on: step === 1, done: step > 1 }">1 · Buscar</span>
        <span :class="{ on: step === 2, done: step > 2 }">2 · Elegir</span>
        <span :class="{ on: step === 3 }">3 · Armar</span>
      </div>

      <!-- Paso 1: búsqueda -->
      <div v-if="step === 1" class="body">
        <label class="label" for="webq">¿Qué querés encontrar?</label>
        <p class="hint">Escribí como en Google. Ej. <em>calistenia beneficios</em>, <em>feriado marzo Argentina</em>.</p>
        <div class="search-row">
          <input
            id="webq"
            v-model="query"
            class="input"
            type="search"
            placeholder="Tema o palabras clave…"
            :disabled="loading"
            @keyup.enter="runSearch"
          />
          <button type="button" class="btn-primary" :disabled="loading || query.trim().length < 2" @click="runSearch">
            {{ loading ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <p v-if="!aiOk" class="err">
          Para armar la noticia hace falta IA (`OPENAI_API_KEY` o `ANTHROPIC_API_KEY`). La búsqueda igual puede funcionar.
        </p>
      </div>

      <!-- Paso 2: resultados tipo Google -->
      <div v-else-if="step === 2" class="body">
        <div class="results-head">
          <p>
            Resultados para <strong>«{{ lastQuery }}»</strong>
            <span class="muted"> · {{ providerLabel }}</span>
          </p>
          <p class="pick-hint">
            Elegidas <strong>{{ selected.length }}</strong> / 3
          </p>
        </div>

        <div v-if="!results.length" class="empty">No hubo resultados. Probá otras palabras.</div>

        <ul class="results">
          <li v-for="item in results" :key="item.id" class="result" :class="{ on: isSelected(item) }">
            <label class="result-check">
              <input
                type="checkbox"
                :checked="isSelected(item)"
                :disabled="!isSelected(item) && selected.length >= 3"
                @change="toggle(item, $event.target.checked)"
              />
              <span class="sr">Seleccionar</span>
            </label>
            <div class="result-main" @click="toggle(item, !isSelected(item))">
              <div class="result-top" :class="{ 'has-thumb': Boolean(item.imageUrl) }">
                <img
                  v-if="item.imageUrl"
                  class="result-thumb"
                  :src="item.imageUrl"
                  alt=""
                  loading="lazy"
                  @error="$event.target.style.display = 'none'"
                />
                <div class="result-text">
                  <p class="result-url">{{ item.source || hostOf(item.url) }}</p>
                  <a class="result-title" :href="item.url" target="_blank" rel="noopener noreferrer" @click.stop>
                    {{ item.title }}
                  </a>
                  <p class="result-snip">{{ item.snippet || 'Sin descripción' }}</p>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <label class="label" for="webnotes">Indicaciones opcionales para la IA</label>
        <p class="hint">Ej. “Enfocá en beneficios para el equipo”, “tono motivador”, “incluí tips prácticos”.</p>
        <textarea id="webnotes" v-model="notes" class="input" rows="2" placeholder="Cómo querés que se cuente en el muro…" />

        <label class="check">
          <input v-model="wantImage" type="checkbox" />
          Si las fuentes no traen imagen, generar una con IA
        </label>

        <p v-if="error" class="err">{{ error }}</p>
      </div>

      <!-- Paso 3: generando -->
      <div v-else class="body center">
        <p class="loading-title">Leyendo artículos y armando la nota…</p>
        <p class="muted">
          Bajamos el contenido de las fuentes, tomamos la imagen y redactamos una publicación completa
          con el tono de {{ tenantName }}. Puede tardar unos segundos.
        </p>
        <p v-if="error" class="err">{{ error }}</p>
      </div>

      <footer class="foot">
        <button v-if="step === 1" type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
        <button v-else-if="step === 2" type="button" class="btn-ghost" :disabled="loading" @click="step = 1">
          Volver a buscar
        </button>
        <button
          v-if="step === 2"
          type="button"
          class="btn-primary"
          :disabled="loading || !selected.length || !aiOk"
          @click="runCompose"
        >
          Armar noticia con IA ({{ selected.length }})
        </button>
        <button v-if="step === 3 && error" type="button" class="btn-ghost" @click="step = 2">Volver</button>
      </footer>

      <!-- Modal info búsqueda -->
      <div v-if="infoOpen" class="info-sheet" @click.self="infoOpen = false">
        <div class="info-panel" role="dialog" aria-modal="true" aria-labelledby="webnews-info-title">
          <header class="info-head">
            <h3 id="webnews-info-title">Búsqueda web — configuración</h3>
            <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="infoOpen = false">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </header>
          <div class="info-body">
            <p>
              <strong>No tenés que hacer nada</strong> para que funcione: sin keys usa
              <strong>DuckDuckGo</strong> y listo.
            </p>

            <h4>Si querés mejores resultados (estilo Google)</h4>
            <ol>
              <li>
                Creá una key en
                <a href="https://serper.dev" target="_blank" rel="noopener noreferrer">serper.dev</a>
                (hay plan gratis).
              </li>
              <li>
                En <code>connectia/backend/.env</code> agregá:
                <pre>SERPER_API_KEY=tu_key_aca</pre>
              </li>
              <li>Reiniciá la API.</li>
            </ol>
            <p>
              Con eso la búsqueda pasa a <strong>Serper (Google)</strong> y suele traer mejores títulos,
              snippets e imágenes.
            </p>

            <h4>Alternativa</h4>
            <p>
              <code>BRAVE_SEARCH_API_KEY</code> de
              <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer">Brave Search API</a>
              — mismo lugar en el <code>.env</code>.
            </p>

            <h4>Qué cuenta</h4>
            <p>
              Solo <strong>SERPER</strong> o <strong>BRAVE</strong>. Si no hay ninguna, DuckDuckGo.
            </p>

            <p class="prio">
              <strong>Prioridad:</strong> Serper → Brave → DuckDuckGo.
            </p>
          </div>
          <footer class="info-foot">
            <button type="button" class="btn-primary" @click="infoOpen = false">Entendido</button>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const props = defineProps({
  tenantName: { type: String, default: 'tu comunidad' },
})

const emit = defineEmits(['close', 'draft'])

const step = ref(1)
const query = ref('')
const lastQuery = ref('')
const notes = ref('')
const wantImage = ref(true)
const loading = ref(false)
const error = ref('')
const results = ref([])
const selected = ref([])
const provider = ref('')
const aiOk = ref(true)
const infoOpen = ref(false)

const providerLabel = computed(() => {
  const map = { serper: 'Google (Serper)', brave: 'Brave', duckduckgo: 'DuckDuckGo' }
  return map[provider.value] || provider.value || 'web'
})

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isSelected(item) {
  return selected.value.some((s) => s.url === item.url)
}

function toggle(item, on) {
  error.value = ''
  if (on) {
    if (selected.value.length >= 3) {
      error.value = 'Podés elegir como máximo 3 resultados'
      return
    }
    if (!isSelected(item)) selected.value = [...selected.value, item]
  } else {
    selected.value = selected.value.filter((s) => s.url !== item.url)
  }
}

async function checkStatus() {
  try {
    const { data } = await api.get('/admin/posts/web-news/status')
    aiOk.value = Boolean(data.aiConfigured)
  } catch {
    aiOk.value = false
  }
}

async function runSearch() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/admin/posts/web-news/search', {
      query: query.value.trim(),
      limit: 8,
    })
    results.value = data.items || []
    provider.value = data.provider || ''
    lastQuery.value = data.query || query.value.trim()
    selected.value = []
    step.value = 2
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo buscar'
  } finally {
    loading.value = false
  }
}

async function runCompose() {
  if (!selected.value.length) return
  error.value = ''
  loading.value = true
  step.value = 3
  try {
    const { data } = await api.post('/admin/posts/web-news/compose', {
      query: lastQuery.value,
      sources: selected.value.map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        source: s.source,
        imageUrl: s.imageUrl || '',
      })),
      notes: notes.value.trim(),
      generateImage: wantImage.value,
    })
    emit('draft', data)
    emit('close')
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo armar la noticia'
  } finally {
    loading.value = false
  }
}

onMounted(checkStatus)
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.panel {
  position: relative;
  width: min(820px, 100%);
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px;
  border: 1px solid var(--cx-border);
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 10px;
  border-bottom: 1px solid var(--cx-border);
}
.head-text {
  min-width: 0;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-i {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1.5px solid var(--cx-muted);
  background: transparent;
  color: var(--cx-muted);
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
}
.info-i:hover {
  border-color: #0f766e;
  color: #0f766e;
  background: color-mix(in srgb, #0f766e 10%, transparent);
}
.head h2 {
  margin: 0;
  font-size: 1.25rem;
}
.head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  line-height: 1.45;
  max-width: 62ch;
}
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  display: grid;
  place-items: center;
  color: var(--cx-text);
}
.steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 20px;
  border-bottom: 1px solid var(--cx-border);
  font-size: 12px;
  font-weight: 700;
  color: var(--cx-muted);
}
.steps span.on {
  color: #0f766e;
}
.steps span.done {
  color: var(--cx-text);
  opacity: 0.7;
}
.body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.body.center {
  text-align: center;
  padding: 48px 20px;
}
.loading-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}
.hint {
  margin: 0 0 10px;
  font-size: 12.5px;
  color: var(--cx-muted);
  line-height: 1.4;
}
.search-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.input {
  flex: 1;
  min-width: 200px;
  width: 100%;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
}
textarea.input {
  resize: vertical;
}
.btn-primary {
  border: 0;
  background: #0f766e;
  color: #fff;
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 700;
  font-size: 14px;
}
.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
}
.btn-ghost {
  border: 1px solid var(--cx-border);
  background: transparent;
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 600;
  font-size: 14px;
}
.err {
  margin-top: 12px;
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
}
.muted {
  color: var(--cx-muted);
  font-size: 13px;
}
.results-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
}
.pick-hint {
  margin: 0;
  font-weight: 700;
  color: #0f766e;
}
.results {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: grid;
  gap: 10px;
}
.result {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  padding: 12px;
  background: var(--cx-surface);
}
.result.on {
  border-color: #0f766e;
  background: color-mix(in srgb, #0f766e 8%, var(--cx-surface));
}
.result-check {
  padding-top: 4px;
}
.result-main {
  cursor: pointer;
  min-width: 0;
}
.result-top {
  display: block;
}
.result-top.has-thumb {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  align-items: start;
}
.result-thumb {
  width: 88px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--cx-input);
  border: 1px solid var(--cx-border);
}
.result-text {
  min-width: 0;
}
.result-url {
  margin: 0;
  font-size: 12px;
  color: #0f766e;
}
.result-title {
  display: block;
  margin: 2px 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: #1a0dab;
  text-decoration: none;
  line-height: 1.3;
}
.result-title:hover {
  text-decoration: underline;
}
.result-snip {
  margin: 0;
  font-size: 13px;
  color: var(--cx-muted);
  line-height: 1.4;
}
.empty {
  text-align: center;
  padding: 28px;
  color: var(--cx-muted);
}
.check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 10px 0 0;
  font-size: 13px;
}
.foot {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--cx-border);
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
:root[data-theme='dark'] .result-title {
  color: #8ab4f8;
}

.info-sheet {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 20px;
}
.info-panel {
  width: min(520px, 100%);
  max-height: 85%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 16px;
  border: 1px solid var(--cx-border);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
}
.info-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--cx-border);
}
.info-head h3 {
  margin: 0;
  font-size: 1.05rem;
}
.info-body {
  padding: 14px 16px;
  overflow-y: auto;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--cx-muted);
}
.info-body p {
  margin: 0 0 12px;
}
.info-body h4 {
  margin: 14px 0 6px;
  font-size: 13px;
  color: var(--cx-text);
}
.info-body strong {
  color: var(--cx-text);
}
.info-body ol {
  margin: 0 0 12px;
  padding-left: 1.25rem;
}
.info-body li {
  margin-bottom: 6px;
}
.info-body a {
  color: #0f766e;
  font-weight: 600;
}
.info-body code,
.info-body pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: var(--cx-input);
  border-radius: 6px;
}
.info-body code {
  padding: 1px 5px;
}
.info-body pre {
  margin: 8px 0 0;
  padding: 10px 12px;
  overflow-x: auto;
  border: 1px solid var(--cx-border);
}
.info-body .prio {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, #0f766e 10%, var(--cx-surface));
  color: var(--cx-text);
}
.info-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 14px;
  border-top: 1px solid var(--cx-border);
}
</style>
