<template>
  <!-- Contenedor de página admin al estilo contenido Hiryx MainLayout -->
  <div class="admin-page">
    <AdminPageHeader v-if="title" :title="title" :subtitle="subtitle">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </AdminPageHeader>
    <div v-if="$slots.help" class="admin-page__help">
      <slot name="help" />
    </div>
    <div class="admin-page__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import AdminPageHeader from './AdminPageHeader.vue'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.admin-page {
  width: 100%;
  min-width: 0;
}
.admin-page__help {
  margin: -0.75rem 0 1rem;
}
.admin-page__body {
  min-width: 0;
}
</style>
