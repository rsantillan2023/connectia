<template>
  <section class="ph">
    <div class="ph-card">
      <h1>{{ title }}</h1>
      <p>Esta función llega en una ola siguiente. Mientras tanto usá el menú inferior o la hamburguesa para volver al muro.</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Módulo' },
})
</script>

<style scoped>
.ph {
  padding: 24px 16px;
}
.ph-card {
  border: 1px dashed var(--cx-border);
  border-radius: 18px;
  padding: 28px 20px;
  background: var(--cx-surface);
  text-align: center;
}
.ph-card h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--cx-text);
}
.ph-card p {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted);
}
</style>
