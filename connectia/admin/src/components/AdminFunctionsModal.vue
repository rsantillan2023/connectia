<script setup>
/**
 * Modal “Mapa del sitio” — todas las funciones del admin.
 * Alto según contenido (máx. ~94vh); respeta tema oscuro/claro.
 * Checks opcional: fijar ítem también en sidebar / menú superior (requiere admin.menu + id).
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  sections: { type: Array, default: () => [] },
  /** Si true, muestra checks para chrome (sidebar / superior). */
  canEditChrome: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'toggle-chrome'])

function close() {
  emit('update:modelValue', false)
}

function onToggle(item, field, event) {
  event?.stopPropagation?.()
  if (!item?.id) return
  emit('toggle-chrome', {
    id: item.id,
    key: item.key,
    field,
    value: Boolean(event?.target?.checked),
  })
}
</script>

<template>
  <div
    v-if="modelValue"
    class="admin-fn-modal fixed inset-0 z-[100002] flex items-center justify-center p-3 sm:p-4"
    @click.self="close"
  >
    <div class="admin-fn-modal__card flex max-h-[min(94vh,100%)] w-[min(96vw,100%)] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl shadow-2xl">
      <div class="admin-fn-modal__head flex max-w-full min-w-0 flex-shrink-0 items-center justify-between gap-4 px-6 py-4">
        <div class="min-w-0 flex-1">
          <h2 class="text-2xl font-bold text-white">Mapa del sitio</h2>
        </div>
        <button
          type="button"
          class="admin-fn-modal__close flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors"
          title="Cerrar"
          aria-label="Cerrar mapa del sitio"
          @click="close"
        >
          <i class="fas fa-times text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <div class="admin-fn-modal__body min-h-0 min-w-0 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
        <div
          class="mx-auto grid w-full gap-3"
          :class="
            sections.length > 1
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 max-w-md'
          "
        >
          <div
            v-for="section in sections"
            :key="section.title"
            class="admin-fn-modal__section flex h-full w-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-sm"
          >
            <div class="admin-fn-modal__section-h flex flex-shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-semibold leading-tight text-white">
              <i v-if="section.headerIcon" :class="[section.headerIcon, 'text-sm']" aria-hidden="true"></i>
              <span class="min-w-0 flex-1 truncate">{{ section.title }}</span>
            </div>
            <div class="admin-fn-modal__section-b min-h-0 flex-1 space-y-0.5 p-2">
              <div
                v-if="canEditChrome && section.items.some((i) => i.id)"
                class="admin-fn-modal__row admin-fn-modal__row--legend"
              >
                <span class="min-w-0 flex-1" aria-hidden="true"></span>
                <div class="admin-fn-modal__pins-legend">
                  <span title="Side: también en el menú lateral (sidebar)">Side</span>
                  <span title="Sup: también en el menú superior (header)">Sup</span>
                </div>
              </div>
              <div
                v-for="item in section.items"
                :key="(item.id || '') + (item.route || '') + item.label"
                class="admin-fn-modal__row"
              >
                <RouterLink
                  :to="item.route"
                  class="admin-fn-modal__link group block min-w-0 flex-1 rounded no-underline outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/35"
                  @click="close"
                >
                  <span
                    class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium leading-snug transition-colors"
                  >
                    <i :class="[item.icon || 'fas fa-angle-right', 'text-xs']" aria-hidden="true"></i>
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </span>
                </RouterLink>
                <div v-if="canEditChrome && item.id" class="admin-fn-modal__pins" @click.stop>
                  <label
                    class="admin-fn-modal__pin"
                    title="Side: también en el menú lateral (sidebar)"
                  >
                    <input
                      type="checkbox"
                      :checked="Boolean(item.showInAdminSidebar)"
                      aria-label="También en el menú lateral (sidebar)"
                      @change="onToggle(item, 'showInAdminSidebar', $event)"
                    />
                  </label>
                  <label
                    class="admin-fn-modal__pin"
                    title="Sup: también en el menú superior (header)"
                  >
                    <input
                      type="checkbox"
                      :checked="Boolean(item.showInAdminHeader)"
                      aria-label="También en el menú superior (header)"
                      @change="onToggle(item, 'showInAdminHeader', $event)"
                    />
                  </label>
                </div>
                <div v-else-if="canEditChrome" class="admin-fn-modal__pins" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-fn-modal {
  background: color-mix(in srgb, #000 55%, transparent);
}
.admin-fn-modal__card {
  background: var(--panel-2, var(--cx-page, #111019));
  color: var(--ink, var(--cx-text));
  border: 1px solid var(--line, var(--cx-border));
}
.admin-fn-modal__head,
.admin-fn-modal__section-h {
  background: var(--brand, var(--brand-primary));
}
.admin-fn-modal__close {
  background: color-mix(in srgb, #fff 22%, transparent);
}
.admin-fn-modal__close:hover {
  background: #fff;
  color: var(--brand, var(--brand-primary));
}
.admin-fn-modal__section {
  border-color: var(--line, var(--cx-border));
  background: var(--panel, var(--cx-surface, #1e1a2b));
  align-self: stretch;
}
.admin-fn-modal__section-b {
  background: var(--panel, var(--cx-surface, #1e1a2b));
}
.admin-fn-modal__row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.admin-fn-modal__link span {
  color: var(--ink-soft, var(--cx-muted));
}
.admin-fn-modal__link i {
  width: 1.1rem;
  flex-shrink: 0;
  text-align: center;
  color: var(--brand-ink, var(--brand-primary));
  opacity: 0.9;
}
.admin-fn-modal__link:hover span {
  background: var(--panel-2, var(--cx-surface-2, #17141f));
  color: var(--ink, var(--cx-text));
}
.admin-fn-modal__link:hover i {
  opacity: 1;
}
.admin-fn-modal__pins {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  width: 3.25rem;
  justify-content: flex-end;
}
.admin-fn-modal__pins-legend {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  width: 3.25rem;
  justify-content: flex-end;
}
.admin-fn-modal__pins-legend span {
  width: 1.5rem;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint, var(--cx-muted));
  cursor: help;
}
.admin-fn-modal__row--legend {
  min-height: 1.1rem;
  margin-bottom: 2px;
}
.admin-fn-modal__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  padding: 2px 0;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.admin-fn-modal__pin:hover {
  background: color-mix(in srgb, var(--brand, var(--brand-primary)) 18%, transparent);
}
.admin-fn-modal__pin input {
  margin: 0;
  accent-color: var(--brand, var(--brand-primary));
  cursor: pointer;
}
</style>
