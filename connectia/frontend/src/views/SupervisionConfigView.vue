<template>
  <section class="supc">
    <header class="supc-head">
      <button type="button" class="supc-back" @click="$router.back()">←</button>
      <h1>Configuración</h1>
    </header>
    <p v-if="msg" class="supc-ok">{{ msg }}</p>
    <p v-if="error" class="supc-err">{{ error }}</p>

    <label class="supc-field">
      Idioma / Language
      <select v-model="locale" class="supc-input" @change="saveLocale">
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>

    <div class="supc-card">
      <strong>PWA / instalar app</strong>
      <p>
        Connectyx ya incluye Service Worker (Vite PWA). En el navegador usá «Agregar a pantalla de
        inicio» / Install para trabajar offline con la cola de supervisión.
      </p>
      <p v-if="deferredPrompt" class="supc-install-row">
        <button type="button" class="supc-btn" @click="install">Instalar Connectyx</button>
      </p>
      <p class="supc-muted">Cola offline: {{ queueLen }} pendientes</p>
      <button type="button" class="supc-btn ghost" :disabled="busy" @click="flush">
        Sincronizar ahora
      </button>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import { flushSupervisionQueue, peekSupervisionQueue } from '../composables/useSupervisionOffline'

const locale = ref('es')
const msg = ref('')
const error = ref('')
const busy = ref(false)
const queueLen = ref(0)
const deferredPrompt = ref(null)

function onBip(e) {
  e.preventDefault()
  deferredPrompt.value = e
}

async function saveLocale() {
  error.value = ''
  try {
    await api.patch('/supervision/config', { locale: locale.value })
    localStorage.setItem('cx_sup_locale', locale.value)
    msg.value = 'Preferencia guardada'
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar'
  }
}

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
}

async function flush() {
  busy.value = true
  try {
    const r = await flushSupervisionQueue(api)
    queueLen.value = r.left
    msg.value = `Sync: ${r.sent} enviados, ${r.left} pendientes`
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  window.addEventListener('beforeinstallprompt', onBip)
  queueLen.value = peekSupervisionQueue().length
  try {
    const { data } = await api.get('/supervision/config')
    locale.value = data.locale || 'es'
  } catch {
    /* ignore */
  }
})

onUnmounted(() => window.removeEventListener('beforeinstallprompt', onBip))
</script>

<style scoped>
.supc { padding: 1rem 1rem 5rem; max-width: 32rem; }
.supc-head { display: flex; align-items: center; gap: 0.5rem; }
.supc-head h1 { margin: 0; font-size: 1.2rem; }
.supc-back { border: 0; background: transparent; font-size: 1.2rem; }
.supc-field { display: flex; flex-direction: column; gap: 0.35rem; margin: 1rem 0; font-size: 0.9rem; }
.supc-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.55rem 0.75rem; }
.supc-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.9rem;
  background: #fff;
}
.supc-card p { color: #475569; margin: 0.5rem 0; }
.supc-muted { font-size: 0.8rem; color: #94a3b8; }
.supc-btn {
  border: 0;
  background: #0d9488;
  color: #fff;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  margin-top: 0.35rem;
}
.supc-btn.ghost { background: #f1f5f9; color: #0f172a; }
.supc-ok { color: #0f766e; font-size: 0.85rem; }
.supc-err { color: #b91c1c; font-size: 0.85rem; }
</style>
