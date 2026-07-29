<template>
  <div>
    <h1 class="text-2xl font-semibold">{{ title }}</h1>
    <p class="mt-2 text-slate-500 text-sm">Función en preparación.</p>
    <ScreenHelp
      purpose="Esta pantalla es un placeholder: la función todavía no está implementada en el admin."
      can-do="Por ahora solo indica el módulo previsto. Cuando esté listo, acá vas a gestionar esa capacidad."
    />
  </div>
</template>

<script setup>
import ScreenHelp from '../components/ScreenHelp.vue'
defineProps({ title: String })
</script>
