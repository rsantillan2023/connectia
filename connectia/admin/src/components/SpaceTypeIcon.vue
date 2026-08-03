<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Sala / reunión -->
    <template v-if="name === 'meeting'">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <circle cx="9" cy="13" r="1.4" />
      <circle cx="15" cy="13" r="1.4" />
      <path d="M7 17c.6-1.2 1.7-2 3-2s2.4.8 3 2M13 17c.3-.6.8-1 1.5-1.3" />
    </template>
    <!-- Cochera -->
    <template v-else-if="name === 'parking'">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 17V7h4.2a3.2 3.2 0 0 1 0 6.4H9" />
    </template>
    <!-- Puesto / desk -->
    <template v-else-if="name === 'desk'">
      <rect x="3" y="8" width="18" height="3" rx="1" />
      <path d="M6 11v7M18 11v7M9 11v3h6v-3" />
      <rect x="8" y="4" width="8" height="4" rx="1" />
    </template>
    <!-- Zona -->
    <template v-else-if="name === 'zone'">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7z" />
      <path d="M12 12v8M4 8.5l8 3.5 8-3.5" />
    </template>
    <!-- Caja / activo -->
    <template v-else-if="name === 'box'">
      <path d="M3 8.5 12 4l9 4.5v7L12 20 3 15.5v-7z" />
      <path d="M12 12v8M3 8.5l9 3.5 9-3.5" />
    </template>
    <!-- Proyector -->
    <template v-else-if="name === 'projector'">
      <rect x="3" y="9" width="14" height="8" rx="2" />
      <circle cx="10" cy="13" r="2.2" />
      <path d="M17 12h4l-2 3-2-3z" />
      <path d="M7 9V7h6v2" />
    </template>
    <!-- Herramienta -->
    <template v-else-if="name === 'tool'">
      <path d="M14.5 4.5a4 4 0 0 0-5.6 5.6L4 15l3 3 4.9-4.9a4 4 0 0 0 5.6-5.6L15 10l-1.5-1.5 2.5-2.5z" />
    </template>
    <!-- Locker -->
    <template v-else-if="name === 'locker'">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 3v18M5 10h7M12 14h7" />
      <circle cx="9" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    </template>
    <!-- Reloj -->
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </template>
    <!-- Grupo -->
    <template v-else-if="name === 'group'">
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path d="M3.5 18.5c1.5-3 3.5-4.5 5.5-4.5s4 1.5 5.5 4.5" />
      <path d="M13 14.2c1.3-.5 2.7-.4 4.2.8 1.1.9 1.9 2.2 2.3 3.5" />
    </template>
    <!-- Edificio -->
    <template v-else-if="name === 'building'">
      <path d="M4 20V7l8-4 8 4v13" />
      <path d="M9 20v-5h6v5" />
      <path d="M8 10h1.5M14.5 10H16M8 13h1.5M14.5 13H16" />
    </template>
    <!-- Calendario -->
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8 14h2M12 14h2M16 14h2" />
    </template>
    <template v-else>
      <path d="M3 8.5 12 4l9 4.5v7L12 20 3 15.5v-7z" />
      <path d="M12 12v8M3 8.5l9 3.5 9-3.5" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, default: 'box' },
  size: { type: [Number, String], default: 20 },
})
</script>
