<template>
  <div class="min-h-dvh p-6 max-w-2xl mx-auto">
    <RouterLink to="/login" class="text-sm text-teal-800">← Volver</RouterLink>
    <h1 class="font-display text-3xl text-brand mt-4">{{ doc?.titulo || 'Documento' }}</h1>
    <p class="text-xs text-slate-500 mt-1">Versión {{ doc?.version }}</p>
    <p class="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{{ doc?.cuerpo }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const doc = ref(null)

onMounted(async () => {
  const tipo = route.params.tipo === 'privacy' ? 'privacy' : 'terms'
  const { data } = await api.get(`/auth/legal/${tipo}`, { params: { empCodigo: 'DEMO' } })
  doc.value = data
})
</script>
