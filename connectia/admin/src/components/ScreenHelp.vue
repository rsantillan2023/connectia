<template>
  <details class="screen-help" :class="{ wide: wide, 'in-header': inHeader }">
    <summary>
      <span class="screen-help-label">Para qué sirve este módulo</span>
      <button
        v-if="guideKind"
        type="button"
        class="screen-help-guide"
        @click.stop.prevent="guideOpen = true"
      >
        <i class="fas fa-project-diagram" aria-hidden="true"></i>
        Guía visual
      </button>
      <span class="screen-help-chevron" aria-hidden="true">▾</span>
    </summary>
    <div class="screen-help-body" :class="{ 'has-sixw': hasSixW }">
      <!-- Modo 6W: objetivo de negocio para quien no conoce el módulo -->
      <template v-if="hasSixW">
        <p v-if="purpose" class="screen-help-lead">
          {{ purpose }}
        </p>
        <dl class="screen-help-sixw">
          <div v-if="sixW.what">
            <dt>Qué</dt>
            <dd>{{ sixW.what }}</dd>
          </div>
          <div v-if="sixW.who">
            <dt>Quién</dt>
            <dd>{{ sixW.who }}</dd>
          </div>
          <div v-if="sixW.when">
            <dt>Cuándo</dt>
            <dd>{{ sixW.when }}</dd>
          </div>
          <div v-if="sixW.where">
            <dt>Dónde</dt>
            <dd>{{ sixW.where }}</dd>
          </div>
          <div v-if="sixW.why">
            <dt>Por qué</dt>
            <dd>{{ sixW.why }}</dd>
          </div>
          <div v-if="sixW.how">
            <dt>Cómo</dt>
            <dd>{{ sixW.how }}</dd>
          </div>
        </dl>
        <div v-if="exampleList.length" class="screen-help-examples">
          <strong>Ejemplos de lo que se logra</strong>
          <ul>
            <li v-for="(ex, i) in exampleList" :key="i">{{ ex }}</li>
          </ul>
        </div>
      </template>

      <!-- Modo clásico (otras pantallas) -->
      <template v-else>
        <p v-if="purpose">
          <strong>Para qué sirve este módulo.</strong>
          {{ purpose }}
        </p>
        <p v-if="canDo">
          <strong>Qué podés hacer acá.</strong>
          {{ canDo }}
        </p>
        <div v-if="exampleList.length" class="screen-help-examples">
          <strong>Ejemplos para probar.</strong>
          <ul>
            <li v-for="(ex, i) in exampleList" :key="i">{{ ex }}</li>
          </ul>
        </div>
      </template>
      <slot />
    </div>
  </details>

  <ModuleConceptModal
    v-if="guideKind"
    v-model:open="guideOpen"
    :kind="guideKind"
    @open-graph="emit('open-graph')"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import ModuleConceptModal from './ModuleConceptModal.vue'

const props = defineProps({
  /** Frase corta de objetivo de negocio (lead). */
  purpose: { type: String, default: '' },
  canDo: { type: String, default: '' },
  /** Lista de ejemplos (string[] o un string con saltos de línea / •). */
  examples: { type: [Array, String], default: () => [] },
  /**
   * Respuestas a las 6W (qué, quién, cuándo, dónde, por qué, cómo).
   * Si se pasa, el cuerpo se muestra en modo objetivo de negocio.
   */
  sixW: {
    type: Object,
    default: null,
  },
  /** Si se pasa ('supervision' | 'equipos'), muestra el botón Guía visual en el summary. */
  guideKind: { type: String, default: '' },
  /** Ancho completo del contenedor (default true). */
  wide: { type: Boolean, default: true },
  /** Variante compacta en header (mantiene ancho chico). */
  inHeader: { type: Boolean, default: false },
})

const emit = defineEmits(['open-graph'])
const guideOpen = ref(false)

const hasSixW = computed(() => {
  const s = props.sixW
  if (!s || typeof s !== 'object') return false
  return Boolean(s.what || s.who || s.when || s.where || s.why || s.how)
})

const exampleList = computed(() => {
  if (Array.isArray(props.examples)) {
    return props.examples.map((x) => String(x || '').trim()).filter(Boolean)
  }
  const raw = String(props.examples || '').trim()
  if (!raw) return []
  return raw
    .split(/\n|•|;/)
    .map((x) => x.trim())
    .filter(Boolean)
})
</script>

<style scoped>
.screen-help {
  margin: 10px 0 0;
  border: 1px solid var(--cx-border, var(--line));
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-surface, var(--panel)) 88%, var(--cx-page, var(--panel-2)));
  max-width: 62ch;
  width: 100%;
}

.screen-help.wide:not(.in-header) {
  max-width: none;
}

.screen-help summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cx-muted, var(--ink-soft));
  user-select: none;
}

.screen-help summary::-webkit-details-marker {
  display: none;
}

.screen-help-label {
  flex: 1 1 auto;
  min-width: 0;
}

.screen-help-guide {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
  border: 1px solid var(--cx-border, var(--line));
  border-radius: 8px;
  background: var(--cx-surface, var(--panel));
  color: var(--brand-ink, var(--cx-text, var(--ink)));
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
}
.screen-help-guide:hover {
  border-color: var(--brand-line, var(--brand));
}
.screen-help-guide i {
  font-size: 11px;
  color: var(--brand-ink, var(--brand));
}

.screen-help-chevron {
  font-size: 11px;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.screen-help[open] .screen-help-chevron {
  transform: rotate(180deg);
}

.screen-help[open] summary {
  color: var(--cx-text, var(--ink));
  border-bottom: 1px solid var(--cx-border, var(--line));
}

.screen-help-body {
  padding: 10px 12px 12px;
  display: grid;
  gap: 8px;
}

.screen-help.wide:not(.in-header) .screen-help-body:not(.has-sixw) {
  gap: 12px 1.25rem;
}

@media (min-width: 900px) {
  .screen-help.wide:not(.in-header) .screen-help-body:not(.has-sixw) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
  }
}

.screen-help-body.has-sixw {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 1fr;
}

.screen-help-lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-text, var(--ink));
  font-weight: 600;
}

.screen-help-sixw {
  margin: 0;
  display: grid;
  gap: 0.55rem;
  grid-template-columns: 1fr;
}

@media (min-width: 720px) {
  .screen-help-sixw {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1100px) {
  .screen-help-sixw {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.screen-help-sixw > div {
  margin: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--cx-border, var(--line));
  background: var(--cx-surface, var(--panel));
}

.screen-help-sixw dt {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand-ink, var(--cx-text, var(--ink)));
}

.screen-help-sixw dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--cx-muted, var(--ink-soft));
}

.screen-help-body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted, var(--ink-soft));
}

.screen-help-body strong {
  color: var(--cx-text, var(--ink));
  font-weight: 700;
}

.screen-help-examples {
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted, var(--ink-soft));
}

.screen-help-examples strong {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--cx-text, var(--ink));
}

.screen-help-examples ul {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: grid;
  gap: 0.28rem;
}

.screen-help-examples li {
  padding-left: 0.1rem;
}

.screen-help.in-header {
  margin: 0;
  max-width: min(22rem, 48vw);
  position: relative;
  z-index: 2;
}

.screen-help.in-header[open] {
  max-width: min(28rem, 72vw);
}

.screen-help.in-header .screen-help-body {
  position: absolute;
  right: 0;
  top: calc(100% + 0.35rem);
  width: min(36rem, 86vw);
  display: grid;
  grid-template-columns: 1fr;
  background: var(--panel, #fff);
  border: 1px solid var(--cx-border, var(--line));
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  z-index: 30;
}
</style>
