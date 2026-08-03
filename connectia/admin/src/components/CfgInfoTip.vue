<template>
  <button
    type="button"
    class="cfg-i"
    :aria-label="`Ayuda: ${title}`"
    :title="`Ayuda: ${title}`"
    @click.stop="open = true"
  >
    i
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      class="cfg-i-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="open = false"
      @keydown.esc="open = false"
    >
      <div class="cfg-i-panel" :class="{ rich: isRich }">
        <header class="cfg-i-head">
          <h3 :id="titleId">{{ title }}</h3>
          <button type="button" class="cfg-i-x" aria-label="Cerrar" @click="open = false">×</button>
        </header>

        <section v-if="purpose" class="cfg-i-purpose">
          <p class="cfg-i-kicker">Para qué sirve</p>
          <p>{{ purpose }}</p>
        </section>

        <p v-if="body" class="cfg-i-body">{{ body }}</p>

        <ul v-if="items?.length" class="cfg-i-list">
          <li v-for="(item, i) in items" :key="i">{{ item }}</li>
        </ul>

        <section v-if="examples?.length" class="cfg-i-examples">
          <p class="cfg-i-kicker">Ejemplos</p>
          <article v-for="(ex, i) in examples" :key="i" class="cfg-i-ex">
            <p v-if="ex.label" class="cfg-i-ex-label">{{ ex.label }}</p>
            <pre v-if="ex.code" class="cfg-i-code"><code>{{ ex.code }}</code></pre>
            <p v-if="ex.result" class="cfg-i-ex-result">
              <span class="cfg-i-arrow" aria-hidden="true">→</span>
              {{ ex.result }}
            </p>
          </article>
        </section>

        <p v-if="note" class="cfg-i-note">{{ note }}</p>

        <footer class="cfg-i-foot">
          <button type="button" class="cfg-i-ok" @click="open = false">Entendido</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  /** Texto general (compatibilidad). */
  body: { type: String, default: '' },
  /** Lista simple (compatibilidad). */
  items: { type: Array, default: () => [] },
  /** Bloque destacado “Para qué sirve”. */
  purpose: { type: String, default: '' },
  /**
   * Ejemplos estructurados:
   * { label?: string, code?: string, result?: string }
   */
  examples: { type: Array, default: () => [] },
  /** Nota al pie. */
  note: { type: String, default: '' },
})

const open = ref(false)
const titleId = computed(() => `cfg-i-${props.title.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}`)
const isRich = computed(() => Boolean(props.purpose || props.examples?.length || props.note))
</script>

<style scoped>
.cfg-i {
  display: inline-grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin: 0;
  padding: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ink-soft, #94a3b8) 55%, transparent);
  background: color-mix(in srgb, var(--panel, #111) 88%, transparent);
  color: var(--ink-soft, #94a3b8);
  font-size: 0.62rem;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  cursor: pointer;
  vertical-align: middle;
  flex: 0 0 auto;
}
.cfg-i:hover {
  border-color: var(--brand, #6b5bf0);
  color: var(--brand, #6b5bf0);
}
.cfg-i-modal {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.55);
}
.cfg-i-panel {
  width: min(28rem, 100%);
  max-height: min(82vh, 640px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid var(--line, #334155);
  background: var(--panel, #0f172a);
  color: var(--ink, #f8fafc);
  padding: 1rem 1.1rem 0.9rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  display: grid;
  gap: 0.75rem;
}
.cfg-i-panel.rich {
  width: min(34rem, 100%);
}
.cfg-i-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.cfg-i-panel h3 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  line-height: 1.25;
}
.cfg-i-x {
  border: 0;
  background: transparent;
  color: var(--ink-soft, #94a3b8);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.cfg-i-x:hover { color: var(--ink, #f8fafc); }
.cfg-i-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand, #6b5bf0);
}
.cfg-i-purpose {
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand, #6b5bf0) 12%, var(--panel, #0f172a));
  border: 1px solid color-mix(in srgb, var(--brand, #6b5bf0) 28%, transparent);
}
.cfg-i-purpose p:last-child {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink, #f8fafc);
}
.cfg-i-body,
.cfg-i-list {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--ink-soft, #cbd5e1);
}
.cfg-i-list {
  padding-left: 1.15rem;
  display: grid;
  gap: 0.35rem;
}
.cfg-i-list li { margin: 0; }
.cfg-i-examples {
  display: grid;
  gap: 0.65rem;
}
.cfg-i-ex {
  display: grid;
  gap: 0.35rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: var(--panel-2, #1e293b);
  border: 1px solid var(--line, #334155);
}
.cfg-i-ex-label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--ink, #f8fafc);
}
.cfg-i-code {
  margin: 0;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid color-mix(in srgb, var(--line, #334155) 80%, transparent);
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #a5f3fc;
}
.cfg-i-ex-result {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--ink-soft, #cbd5e1);
  word-break: break-all;
}
.cfg-i-arrow {
  color: var(--brand, #6b5bf0);
  font-weight: 800;
  margin-right: 4px;
}
.cfg-i-note {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--ink-soft, #94a3b8);
}
.cfg-i-foot {
  display: flex;
  justify-content: flex-end;
}
.cfg-i-ok {
  border: 0;
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--brand, #6b5bf0);
  color: #fff;
}
</style>
