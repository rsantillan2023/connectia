<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <template v-if="tipo === 'text'">
      <path d="M4 7h16M4 12h10M4 17h14" />
    </template>
    <template v-else-if="tipo === 'textarea'">
      <path d="M4 5h16M4 10h16M4 15h12M4 20h8" />
    </template>
    <template v-else-if="tipo === 'number'">
      <path d="M8 7v10M16 7v10M6 10h4M14 14h4" />
    </template>
    <template v-else-if="tipo === 'yesno'">
      <path d="M5 12l4 4L19 6" />
    </template>
    <template v-else-if="tipo === 'single'">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="tipo === 'multiple'">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12l3 3 5-6" />
    </template>
    <template v-else-if="tipo === 'rating'">
      <path d="M12 3l2.4 6.5H21l-5.2 4 2 6.5L12 16.5 6.2 20l2-6.5L3 9.5h6.6z" />
    </template>
    <template v-else-if="tipo === 'date'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </template>
    <template v-else-if="tipo === 'time'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="tipo === 'datetime'">
      <rect x="2" y="4" width="12" height="12" rx="2" />
      <path d="M6 2v3M10 2v3M2 9h12" />
      <circle cx="17" cy="17" r="5" />
      <path d="M17 15v2l1.5 1" />
    </template>
    <template v-else-if="tipo === 'email'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </template>
    <template v-else-if="tipo === 'phone'">
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0122 16.9z" />
    </template>
    <template v-else-if="tipo === 'geopoint'">
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 015 1c0 2-2.5 2-2.5 4M12 17h.01" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  tipo: { type: String, default: '' },
  size: { type: [Number, String], default: 28 },
})
</script>
