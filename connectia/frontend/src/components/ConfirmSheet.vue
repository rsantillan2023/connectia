<template>
  <div class="csheet" @click.self="emit('cancel')">
    <div class="cpanel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <h2 :id="titleId" class="ctitle">{{ title }}</h2>
      <p v-if="message" class="cmsg">{{ message }}</p>
      <div class="cactions">
        <button type="button" class="btn-ghost" :disabled="busy" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button type="button" class="btn-primary" :disabled="busy" @click="emit('confirm')">
          {{ busy ? busyLabel : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Confirmar' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  busyLabel: { type: String, default: 'Un momento…' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])

const titleId = computed(() => `cmodal-${Math.random().toString(36).slice(2, 8)}`)
</script>

<style scoped>
.csheet {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
.cpanel {
  width: min(100%, 430px);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  padding: 20px 18px max(18px, env(safe-area-inset-bottom));
  border: 1px solid var(--cx-border);
  border-bottom: 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
}
.ctitle {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.cmsg {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted);
}
.cactions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 18px;
}
.btn-ghost,
.btn-primary {
  border-radius: 12px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
}
.btn-ghost {
  border: 1px solid var(--cx-border);
  background: transparent;
  color: var(--cx-text);
}
.btn-primary {
  border: 0;
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.btn-ghost:disabled,
.btn-primary:disabled {
  opacity: 0.55;
}
@media (min-width: 480px) {
  .csheet {
    align-items: center;
    padding: 16px;
  }
  .cpanel {
    border-radius: 18px;
    border-bottom: 1px solid var(--cx-border);
  }
}
</style>
