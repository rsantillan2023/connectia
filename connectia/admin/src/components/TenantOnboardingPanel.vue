<template>
  <div class="space-y-4">
    <!-- Pack para el cliente: lo primero -->
    <div class="rounded-xl border-2 border-teal-200 bg-teal-50/40 p-4 space-y-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p class="font-semibold text-teal-950">Para enviar al suscriptor</p>
          <p class="text-xs text-teal-900/70 mt-0.5">Mensaje listo con links y accesos.</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
          @click="copy(messageText, 'Mensaje copiado — pegalo en el mail o chat')"
        >
          Copiar mensaje
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div
          v-for="item in credentialRows.slice(0, 3)"
          :key="item.label"
          class="rounded-lg border bg-white px-3 py-2 flex items-start justify-between gap-2"
        >
          <div class="min-w-0">
            <p class="text-[11px] text-slate-500">{{ item.label }}</p>
            <p class="font-mono text-xs break-all">{{ item.value }}</p>
          </div>
          <button type="button" class="text-xs text-teal-700 shrink-0" @click="copy(item.value, `${item.label} copiado`)">
            Copiar
          </button>
        </div>
      </div>

      <textarea
        class="w-full border rounded-lg px-3 py-2 text-xs font-mono bg-white min-h-[120px]"
        readonly
        :value="messageText"
      />
    </div>

    <!-- Marca detectada -->
    <div class="rounded-xl border p-4 flex gap-4 items-start">
      <img
        v-if="logoSrc"
        :src="logoSrc"
        :alt="`Logo ${brand}`"
        class="h-16 w-16 object-contain rounded-lg border bg-white p-1 shrink-0"
      />
      <div
        v-else
        class="h-16 w-16 rounded-lg border flex items-center justify-center text-xs shrink-0"
        :style="{ background: primary + '18', color: primary }"
      >
        Sin logo
      </div>
      <div class="min-w-0 space-y-1">
        <p class="font-semibold text-slate-900">{{ brand }}</p>
        <p v-if="onboarding.industry" class="text-sm text-slate-600">{{ onboarding.industry }}</p>
        <p v-if="onboarding.description" class="text-sm text-slate-500">{{ onboarding.description }}</p>
        <div class="flex items-center gap-2 pt-1">
          <span class="inline-block h-4 w-4 rounded border" :style="{ background: primary }" :title="primary" />
          <span class="inline-block h-4 w-4 rounded border" :style="{ background: secondary }" :title="secondary" />
          <span class="text-xs font-mono text-slate-500">{{ primary }} · {{ secondary }}</span>
        </div>
      </div>
    </div>

    <details v-if="!compact" class="rounded-lg border px-3 py-2" open>
      <summary class="cursor-pointer text-sm text-slate-600 select-none">Qué se cargó en la comunidad</summary>
      <div class="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div v-if="onboarding.websiteUrl" class="rounded-lg border p-3">
          <p class="text-xs text-slate-500">Sitio web</p>
          <a :href="onboarding.websiteUrl" target="_blank" rel="noopener" class="text-teal-700 break-all">
            {{ onboarding.websiteUrl }}
          </a>
        </div>
        <div v-if="credentials.appUrl" class="rounded-lg border p-3">
          <p class="text-xs text-slate-500">App colaboradores</p>
          <p class="font-mono text-xs break-all">{{ credentials.appUrl }}</p>
        </div>
        <div v-if="(onboarding.areas || []).length" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Áreas</p>
          <p>{{ onboarding.areas.join(' · ') }}</p>
        </div>
        <div v-if="(onboarding.groups || []).length" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Grupos</p>
          <p>{{ onboarding.groups.join(' · ') }}</p>
        </div>
        <div v-if="onboarding.welcomeTitle" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Bienvenida</p>
          <p class="font-medium">{{ onboarding.welcomeTitle }}</p>
        </div>
        <div v-if="(credentials.sampleUsers || []).length" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Usuarios de prueba (misma contraseña)</p>
          <p>{{ credentials.sampleUsers.join(', ') }}</p>
        </div>
      </div>
    </details>

    <details v-else class="rounded-lg border px-3 py-2">
      <summary class="cursor-pointer text-sm text-slate-600 select-none">Ver qué se cargó</summary>
      <div class="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div v-if="onboarding.websiteUrl" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500">Sitio web</p>
          <a :href="onboarding.websiteUrl" target="_blank" rel="noopener" class="text-teal-700 break-all">
            {{ onboarding.websiteUrl }}
          </a>
        </div>
        <div v-if="(onboarding.areas || []).length" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Áreas</p>
          <p>{{ onboarding.areas.join(' · ') }}</p>
        </div>
        <div v-if="(credentials.sampleUsers || []).length" class="rounded-lg border p-3 sm:col-span-2">
          <p class="text-xs text-slate-500 mb-1">Usuarios de prueba</p>
          <p>{{ credentials.sampleUsers.join(', ') }}</p>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveMediaUrl } from '../utils/media.js'

const props = defineProps({
  tenant: { type: Object, default: null },
  onboarding: { type: Object, default: () => ({}) },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['copied'])

const brand = computed(
  () => props.tenant?.nombre || props.onboarding?.credentials?.empCodigo || 'Comunidad',
)
const logoSrc = computed(() =>
  resolveMediaUrl(props.onboarding?.logoUrl || props.tenant?.branding?.logoUrl || ''),
)
const primary = computed(() => props.onboarding?.primary || props.tenant?.branding?.primary || 'var(--brand-primary)')
const secondary = computed(
  () => props.onboarding?.secondary || props.tenant?.branding?.secondary || 'var(--brand-secondary)',
)
const credentials = computed(() => props.onboarding?.credentials || {})

const credentialRows = computed(() => {
  const c = credentials.value
  return [
    { label: 'Empresa', value: c.empCodigo },
    { label: 'Usuario', value: c.adminUsuario },
    { label: 'Contraseña', value: c.password },
    { label: 'Panel admin', value: c.adminUrl },
    { label: 'App', value: c.appUrl },
  ].filter((r) => r.value)
})

const messageText = computed(() => {
  if (props.onboarding?.accessMessage) return props.onboarding.accessMessage
  const c = credentials.value
  return [
    'Hola,',
    '',
    `Tu comunidad Connectia de ${brand.value} ya está lista.`,
    '',
    `Panel admin: ${c.adminUrl || 'http://localhost:5174'}`,
    `App: ${c.appUrl || 'http://localhost:5173'}`,
    `Empresa: ${c.empCodigo || ''}`,
    `Usuario: ${c.adminUsuario || ''}`,
    `Contraseña: ${c.password || 'Demo1234!'}`,
  ].join('\n')
})

async function copy(text, label = 'Copiado al portapapeles') {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    emit('copied', label)
  } catch {
    emit('copied', 'No se pudo copiar')
  }
}
</script>
