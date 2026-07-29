<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--cx-page); color: var(--cx-text)">
    <div class="w-full max-w-sm space-y-3">
    <form
      class="rounded-xl shadow p-6 space-y-3 border"
      style="background: var(--cx-surface); border-color: var(--cx-border)"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-xl font-semibold">Admin Connectia</h1>
      <p class="text-xs" style="color: var(--cx-muted)">Tenant (cliente) o PLATFORM (vendedor).</p>
      <input
        v-model="empCodigo"
        class="w-full border rounded-lg px-3 py-2"
        style="background: var(--cx-input); border-color: var(--cx-border); color: var(--cx-text)"
        placeholder="Empresa (DEMO o PLATFORM)"
      />
      <input
        v-model="usuario"
        class="w-full border rounded-lg px-3 py-2"
        style="background: var(--cx-input); border-color: var(--cx-border); color: var(--cx-text)"
        placeholder="Usuario"
      />
      <input
        v-model="password"
        type="password"
        class="w-full border rounded-lg px-3 py-2"
        style="background: var(--cx-input); border-color: var(--cx-border); color: var(--cx-text)"
        placeholder="Contraseña"
      />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <button class="w-full bg-teal-700 text-white rounded-lg py-2.5 font-medium">Ingresar</button>
      <div class="text-xs space-y-1 pt-1" style="color: var(--cx-muted)">
        <p><strong>Plataforma:</strong> PLATFORM / sooft / Demo1234!</p>
        <p><strong>Tenant:</strong> DEMO / demo / Demo1234!</p>
      </div>
      <div class="flex gap-2 pt-1">
        <button type="button" class="flex-1 text-xs border rounded-lg py-2" style="border-color: var(--cx-border)" @click="fillPlatform">Usar PLATFORM</button>
        <button type="button" class="flex-1 text-xs border rounded-lg py-2" style="border-color: var(--cx-border)" @click="fillDemo">Usar DEMO</button>
      </div>
    </form>
    <div class="flex justify-center pt-1">
      <ThemeToggle />
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'

const auth = useAuthStore()
const router = useRouter()
const empCodigo = ref('PLATFORM')
const usuario = ref('sooft')
const password = ref('Demo1234!')
const error = ref('')

function fillPlatform() {
  empCodigo.value = 'PLATFORM'
  usuario.value = 'sooft'
  password.value = 'Demo1234!'
}

function fillDemo() {
  empCodigo.value = 'DEMO'
  usuario.value = 'demo'
  password.value = 'Demo1234!'
}

async function onSubmit() {
  error.value = ''
  try {
    await auth.login({
      empCodigo: empCodigo.value.trim(),
      usuario: usuario.value.trim(),
      password: password.value,
    })
    await router.replace(auth.isPlatformAdmin ? '/suscriptores' : '/')
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error de login'
  }
}
</script>
