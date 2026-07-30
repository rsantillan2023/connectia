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
      <div class="admin-fn-modal__head flex max-w-full min-w-0 flex-shrink-0 items-center justify-between gap-4 px-6 py-3">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-bold text-white">Mapa del sitio</h2>
          <p v-if="canEditChrome" class="mt-0.5 text-xs text-white/80">
            Todo vive acá. Marcá Sidebar o Superior para fijar accesos rápidos.
          </p>
        </div>
        <button
          type="button"
          class="admin-fn-modal__close flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors"
          title="Cerrar"
          aria-label="Cerrar mapa del sitio"
          @click="close"
        >
          <i class="fas fa-times text-lg" aria-hidden="true"></i>
        </button>
      </div>

      <div class="admin-fn-modal__body min-h-0 min-w-0 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
        <div
          class="mx-auto grid w-full gap-4"
          :class="
            sections.length > 1
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              : 'grid-cols-1 max-w-md'
          "
        >
          <div
            v-for="section in sections"
            :key="section.title"
            class="admin-fn-modal__section w-full overflow-hidden rounded-lg border shadow-sm"
          >
            <div class="admin-fn-modal__section-h flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white">
              <i v-if="section.headerIcon" :class="section.headerIcon" aria-hidden="true"></i>
              {{ section.title }}
            </div>
            <div class="admin-fn-modal__section-b space-y-0.5 p-3">
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
                    class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold leading-snug transition-colors"
                  >
                    <i :class="item.icon || 'fas fa-angle-right'" aria-hidden="true"></i>
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </span>
                </RouterLink>
                <div v-if="canEditChrome && item.id" class="admin-fn-modal__pins" @click.stop>
                  <label class="admin-fn-modal__pin" title="También en sidebar">
                    <input
                      type="checkbox"
                      :checked="Boolean(item.showInAdminSidebar)"
                      @change="onToggle(item, 'showInAdminSidebar', $event)"
                    />
                    <span>Side</span>
                  </label>
                  <label class="admin-fn-modal__pin" title="También en menú superior">
                    <input
                      type="checkbox"
                      :checked="Boolean(item.showInAdminHeader)"
                      @change="onToggle(item, 'showInAdminHeader', $event)"
                    />
                    <span>Sup</span>
                  </label>
                </div>
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
  background: color-mix(in srgb, #000 50%, transparent);
}
.admin-fn-modal__card {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line);
}
.admin-fn-modal__head,
.admin-fn-modal__section-h {
  background: var(--brand);
}
.admin-fn-modal__close {
  background: rgba(255, 255, 255, 0.25);
}
.admin-fn-modal__close:hover {
  background: #fff;
  color: var(--brand);
}
.admin-fn-modal__section {
  border-color: var(--line);
}
.admin-fn-modal__section-b {
  background: var(--panel-2);
}
.admin-fn-modal__row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.admin-fn-modal__link span {
  color: var(--ink-soft);
}
.admin-fn-modal__link i {
  width: 1.1rem;
  text-align: center;
  color: var(--brand-ink);
  opacity: 0.9;
}
.admin-fn-modal__link:hover span {
  background: var(--panel);
  color: var(--ink);
}
.admin-fn-modal__link:hover i {
  opacity: 1;
}
.admin-fn-modal__pins {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
}
.admin-fn-modal__pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  cursor: pointer;
  user-select: none;
}
.admin-fn-modal__pin:hover {
  background: var(--panel);
  color: var(--ink-soft);
}
.admin-fn-modal__pin input {
  margin: 0;
  accent-color: var(--brand);
  cursor: pointer;
}
</style>
