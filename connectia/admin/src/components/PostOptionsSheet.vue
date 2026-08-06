<template>
  <div class="sheet" @click.self="emit('close')">
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="post-opts-title">
      <p id="post-opts-title" class="sr">Opciones de la publicación</p>
      <button type="button" class="opt danger" @click="emit('not-interested')">
        No me interesa
      </button>
      <p class="hint">Deja de ver esta publicación en tu muro (solo para vos).</p>
      <button type="button" class="opt cancel" @click="emit('close')">Cancelar</button>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['close', 'not-interested'])
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 88;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.panel {
  width: min(100%, 430px);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 16px 16px 0 0;
  padding: 10px 10px max(12px, env(safe-area-inset-bottom));
  border: 1px solid var(--cx-border);
  border-bottom: 0;
}
.opt {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 14px 12px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  border-radius: 12px;
  color: var(--cx-text);
  cursor: pointer;
}
.opt.danger {
  color: var(--bad);
}
.opt.cancel {
  margin-top: 6px;
  background: var(--cx-input);
  color: var(--cx-muted);
  font-weight: 700;
}
.hint {
  margin: 0 12px 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--cx-muted);
  text-align: center;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
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
