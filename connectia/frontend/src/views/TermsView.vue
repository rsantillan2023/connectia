<template>
  <div class="min-h-dvh flex items-center justify-center p-4">
    <div class="w-full max-w-lg rounded-2xl bg-white border border-teal-900/5 p-6 shadow-sm">
      <h1 class="font-display text-2xl text-brand">{{ doc?.titulo || 'Términos' }}</h1>
      <p class="text-xs text-slate-500 mt-1">Versión {{ doc?.version }}</p>
      <p class="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{{ doc?.cuerpo }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      <div class="mt-6 flex gap-3">
        <button class="flex-1 rounded-xl bg-brand text-white font-semibold py-3" :disabled="loading" @click="accept">
          {{ loading ? 'Guardando…' : 'Acepto' }}
        </button>
        <button class="rounded-xl border border-slate-200 px-4 py-3 text-sm" @click="decline">Salir</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const doc = ref(null)
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  const { data } = await api.get('/auth/legal/terms', {
    params: { empCodigo: auth.tenant?.empCodigo },
  })
  doc.value = data
})

async function accept() {
  loading.value = true
  error.value = ''
  try {
    await auth.acceptTerms(doc.value.version)
    router.replace(route.query.redirect || '/muro')
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo aceptar'
  } finally {
    loading.value = false
  }
}

async function decline() {
  await auth.logout('all')
  router.push({ name: 'login' })
}
</script>
