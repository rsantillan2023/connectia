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
    <template v-if="name === 'home'">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </template>
    <template v-else-if="name === 'inbox'">
      <path d="M4 6h16v12H4z" />
      <path d="M4 13h4l2 2h4l2-2h4" />
    </template>
    <template v-else-if="name === 'check'">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-5" />
    </template>
    <template v-else-if="name === 'clipboard'">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4h6v2H9z" />
      <path d="M9 11h6M9 15h4" />
    </template>
    <template v-else-if="name === 'file'">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </template>
    <template v-else-if="name === 'help'">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3z" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5 21 21" />
    </template>
    <template v-else-if="name === 'thumb'">
      <path d="M7 11v10" />
      <path
        d="M11 21h6.5a2 2 0 0 0 1.95-1.54l1.35-6A2 2 0 0 0 18.85 11H14l.7-3.2A2.2 2.2 0 0 0 12.55 5L9 11H7"
        :fill="filled ? 'currentColor' : 'none'"
      />
      <path d="M4 11h3v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" :fill="filled ? 'currentColor' : 'none'" />
    </template>
    <template v-else-if="name === 'heart'">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        :fill="filled ? 'currentColor' : 'none'"
      />
    </template>
    <template v-else-if="name === 'clap'">
      <!-- Dos manos aplaudiendo + destellos -->
      <path d="M8.2 13.2V9.4a1.2 1.2 0 0 1 2.4 0v3.2" />
      <path d="M10.6 12.6V8.6a1.2 1.2 0 0 1 2.4 0v4.4" />
      <path d="M13 13V9.8a1.2 1.2 0 0 1 2.4 0V15c0 2.6-1.7 4.2-4.4 4.2S6.6 17.6 6.6 15v-1.4a1.2 1.2 0 0 1 2.4 0" />
      <path d="M17.5 5.5 18 7l1.5.5L18 8l-.5 1.5L17 8l-1.5-.5L17 7z" />
      <path d="M4.8 6.2l.35 1.05L6.2 7.6 5.15 8l-.35 1.05L4.45 8 3.4 7.6l1.05-.35z" />
    </template>
    <template v-else-if="name === 'bookmark'">
      <path
        d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z"
        :fill="filled ? 'currentColor' : 'none'"
      />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'eye-off'">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4 10 7-0.4 1.1-1.2 2.4-2.3 3.5" />
      <path d="M6.1 6.1C4.2 7.5 2.8 9.4 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
    </template>
    <template v-else-if="name === 'back'">
      <path d="M15 6 9 12l6 6" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.8-3.2 4-4.8 6.5-4.8s4.7 1.6 6.5 4.8" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M6 16h12l-1.2-1.2A2 2 0 0 1 16 13.4V10a4 4 0 1 0-8 0v3.4a2 2 0 0 1-.8 1.4L6 16z" />
      <path d="M10 16a2 2 0 0 0 4 0" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 17v4" />
      <path
        d="M9 3h6l-.8 5.2A3.5 3.5 0 0 1 16 11.5V13H8v-1.5a3.5 3.5 0 0 1 1.8-3.3L9 3z"
        :fill="filled ? 'currentColor' : 'none'"
      />
    </template>
    <template v-else-if="name === 'share'">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" />
    </template>
    <template v-else-if="name === 'image'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15l-5-5-4 4-2-2-5 5" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" :fill="filled ? 'currentColor' : 'none'" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.6 5.6 7.5 7.5M16.5 16.5l1.9 1.9M5.6 18.4 7.5 16.5M16.5 7.5l1.9-1.9" />
      <path d="m12 8 1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2z" />
    </template>
    <template v-else-if="name === 'gift'">
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M12 10v10M4 14h16" />
      <path d="M12 10c-2.2 0-4-1.3-4-3s2.2-2.5 4-.8c1.8-1.7 4-.7 4 .8s-1.8 3-4 3z" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8 14h2M12 14h2M16 14h2M8 17h2M12 17h2" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="3" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, default: 'dot' },
  size: { type: [Number, String], default: 22 },
  filled: { type: Boolean, default: false },
})
</script>
