<template>
  <section class="hub">
    <HubQuickStrip show-more show-empty />
  </section>
</template>

<script setup>
import HubQuickStrip from '../components/HubQuickStrip.vue'
</script>

<style scoped>
.hub {
  min-height: 100%;
  padding-bottom: 28px;
  background: var(--cx-page, #f1f5f9);
}
</style>
