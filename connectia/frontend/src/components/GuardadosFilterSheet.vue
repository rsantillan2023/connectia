<template>
  <div class="sheet" @click.self="emit('close')">
    <form class="panel" role="dialog" aria-modal="true" aria-labelledby="posts-filter-title" @submit.prevent="apply">
      <header class="head">
        <h2 id="posts-filter-title">{{ title }}</h2>
        <button type="button" class="icon" aria-label="Cerrar" @click="emit('close')">
          <AppIcon name="close" :size="20" />
        </button>
      </header>

      <p class="hint">{{ hint }}</p>

      <label class="field">
        <span>Texto</span>
        <input
          v-model="draft.q"
          type="search"
          maxlength="120"
          placeholder="Título o contenido…"
          autocomplete="off"
        />
      </label>

      <fieldset class="options">
        <legend>Tipo</legend>
        <div class="chip-row" role="radiogroup" aria-label="Tipo de publicación">
          <button
            v-for="t in tipos"
            :key="t.id || 'all'"
            type="button"
            class="chip"
            :class="{ on: draft.tipo === t.id }"
            role="radio"
            :aria-checked="draft.tipo === t.id"
            @click="draft.tipo = t.id"
          >
            {{ t.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="options">
        <legend>Origen</legend>
        <div class="chip-row" role="radiogroup" aria-label="Origen de la publicación">
          <button
            v-for="o in origins"
            :key="o.id || 'all'"
            type="button"
            class="chip"
            :class="{ on: draft.origin === o.id }"
            role="radio"
            :aria-checked="draft.origin === o.id"
            @click="draft.origin = o.id"
          >
            {{ o.label }}
          </button>
        </div>
      </fieldset>

      <label class="field">
        <span>Sección</span>
        <input
          v-model="draft.section"
          type="search"
          maxlength="80"
          placeholder="Ej. deporte, cultura…"
          autocomplete="off"
          list="posts-section-suggestions"
        />
        <datalist id="posts-section-suggestions">
          <option v-for="s in sectionSuggestions" :key="s" :value="s" />
        </datalist>
      </label>
      <div class="chip-row" role="group" aria-label="Secciones sugeridas">
        <button
          type="button"
          class="chip"
          :class="{ on: !draft.section }"
          @click="draft.section = ''"
        >
          Todas
        </button>
        <button
          v-for="s in sectionSuggestions"
          :key="s"
          type="button"
          class="chip"
          :class="{ on: sectionChipOn(s) }"
          @click="pickSection(s)"
        >
          {{ s }}
        </button>
      </div>

      <div class="actions">
        <button type="button" class="btn-ghost" @click="clear">Limpiar</button>
        <button type="submit" class="btn-primary">Aplicar</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: { type: String, default: 'Filtrar publicaciones' },
  hint: {
    type: String,
    default: 'Buscá por texto o filtrá por tipo, origen y sección de la publicación.',
  },
  q: { type: String, default: '' },
  tipo: { type: String, default: '' },
  origin: { type: String, default: '' },
  section: { type: String, default: '' },
})

const emit = defineEmits(['close', 'apply'])

const tipos = [
  { id: '', label: 'Todos' },
  { id: 'noticia', label: 'Noticia' },
  { id: 'aviso', label: 'Aviso' },
  { id: 'beneficio', label: 'Beneficio' },
  { id: 'evento', label: 'Evento' },
  { id: 'celebracion', label: 'Celebración' },
  { id: 'general', label: 'General' },
]

const origins = [
  { id: '', label: 'Todos' },
  { id: 'admin', label: 'Empresa' },
  { id: 'member', label: 'Comunidad' },
]

const sectionSuggestions = ['deporte', 'internacional', 'moda', 'cultura', 'empresa', 'beneficio', 'aviso']

const draft = reactive({
  q: props.q,
  tipo: props.tipo,
  origin: props.origin,
  section: props.section,
})

watch(
  () => [props.q, props.tipo, props.origin, props.section],
  ([q, tipo, origin, section]) => {
    draft.q = q || ''
    draft.tipo = tipo || ''
    draft.origin = origin || ''
    draft.section = section || ''
  },
)

function sectionChipOn(s) {
  return String(draft.section || '').trim().toLowerCase() === String(s).toLowerCase()
}

function pickSection(s) {
  draft.section = sectionChipOn(s) ? '' : s
}

function apply() {
  emit('apply', {
    q: String(draft.q || '').trim(),
    tipo: draft.tipo || '',
    origin: draft.origin || '',
    section: String(draft.section || '').trim(),
  })
  emit('close')
}

function clear() {
  draft.q = ''
  draft.tipo = ''
  draft.origin = ''
  draft.section = ''
  emit('apply', { q: '', tipo: '', origin: '', section: '' })
  emit('close')
}
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 92;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.panel {
  width: min(100%, 430px);
  max-height: min(92vh, 640px);
  overflow-y: auto;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  padding: 16px 16px max(16px, env(safe-area-inset-bottom));
  border: 1px solid var(--cx-border);
  border-bottom: 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
  display: grid;
  gap: 14px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.icon {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  padding: 6px;
  border-radius: 10px;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--cx-muted);
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
}
.field input {
  width: 100%;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 11px 12px;
  font: inherit;
  font-weight: 500;
  color: var(--cx-text);
  background: var(--cx-bg, #fff);
  box-sizing: border-box;
}
.options {
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 8px;
}
.options legend {
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
  padding: 0;
  margin-bottom: 2px;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--cx-border);
  background: var(--cx-bg, #fff);
  color: var(--cx-text);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.chip.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.btn-ghost,
.btn-primary {
  flex: 1;
  border: 0;
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.btn-ghost {
  background: var(--cx-input, #f1f5f9);
  color: var(--cx-muted);
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
}
@media (min-width: 480px) {
  .sheet {
    align-items: center;
    padding: 16px;
  }
  .panel {
    border-radius: 16px;
    border-bottom: 1px solid var(--cx-border);
  }
}
</style>
