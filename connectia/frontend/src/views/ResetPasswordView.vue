<template>
  <div class="min-h-dvh flex items-center justify-center p-4" style="background: var(--cx-page)">
    <form
      class="w-full max-w-md rounded-2xl border shadow-lg p-6 space-y-4"
      style="background: var(--cx-surface); border-color: var(--cx-border); color: var(--cx-text)"
      @submit.prevent="onSubmit"
    >
      <h1 class="font-display text-2xl">Nueva contraseña</h1>
      <p class="text-sm cx-muted">Elegí una contraseña nueva. Si llegaste desde el mail, el token ya está cargado.</p>
      <label class="block">
        <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Token</span>
        <textarea v-model="token" rows="3" class="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono cx-input" required />
      </label>
      <label class="block">
        <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Nueva contraseña</span>
        <input v-model="password" type="password" minlength="8" class="mt-1 w-full rounded-xl border px-3 py-2.5 cx-input" required />
      </label>
      <p v-if="error" class="text-sm" style="color: var(--cx-danger)">{{ error }}</p>
      <p v-if="ok" class="text-sm" style="color: var(--cx-ok)">Listo. Ya podés ingresar con la nueva contraseña.</p>
      <button type="submit" class="w-full rounded-xl bg-brand text-white font-semibold py-3 disabled:opacity-60" :disabled="loading">
        {{ loading ? 'Guardando…' : 'Cambiar contraseña' }}
      </button>
      <RouterLink class="block text-center text-sm text-brand" to="/login">Volver al login</RouterLink>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const token = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const ok = ref(false)

onMounted(() => {
  if (typeof route.query.token === 'string') token.value = route.query.token
})

async function onSubmit() {
  loading.value = true
  error.value = ''
  ok.value = false
  try {
    await api.post('/auth/reset-password', { token: token.value.trim(), password: password.value })
    ok.value = true
    setTimeout(() => router.push('/login'), 1200)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cambiar la contraseña'
  } finally {
    loading.value = false
  }
}
</script>
