<template>
  <button
    v-if="theme.canToggle"
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:border-teal-500/50 transition"
    :title="theme.resolved === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    @click="theme.toggle()"
  >
    Modo {{ theme.resolved === 'dark' ? 'claro' : 'oscuro' }}
  </button>
</template>

<script setup>
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>
