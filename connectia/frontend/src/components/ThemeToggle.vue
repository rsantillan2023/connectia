<template>
  <button
    v-if="theme.canToggle"
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--cx-text)] hover:border-teal-600/40 transition"
    :title="theme.resolved === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    @click="theme.toggle()"
  >
    Modo {{ theme.resolved === 'dark' ? 'claro' : 'oscuro' }}
  </button>
  <span
    v-else
    class="inline-flex items-center rounded-lg border border-[var(--cx-border)] px-2.5 py-1.5 text-xs text-[var(--cx-muted)]"
    :title="`Tema forzado por la comunidad (${theme.policy})`"
  >
    Tema {{ theme.label.toLowerCase() }}
  </span>
</template>

<script setup>
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>
