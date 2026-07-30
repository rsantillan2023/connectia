<template>
  <section class="pair">
    <header>
      <h1>Emparejar TV</h1>
      <p>Ingresá el código de 6 dígitos que muestra la pantalla.</p>
    </header>

    <p v-if="disabled" class="warn">Modo TV no está activo en esta comunidad.</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="fromQr && !ok && !error" class="muted">Código leído del QR…</p>
    <p v-if="ok" class="ok">Listo. Pantalla vinculada a {{ ok.tenantName }}. La TV arranca sola.</p>

    <form v-if="!disabled" class="card" @submit.prevent="confirm">
      <label>
        Código de la TV
        <input
          ref="codeInput"
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          pattern="[0-9]*"
          placeholder="000000"
          required
          autocomplete="one-time-code"
        />
      </label>
      <button type="submit" class="btn" :disabled="loading || code.replace(/\D/g, '').length !== 6">
        {{ loading ? 'Vinculando…' : 'Vincular esta TV' }}
      </button>
      <details class="more">
        <summary>Nombre y ubicación (opcional)</summary>
        <label>
          Nombre
          <input v-model="name" maxlength="120" placeholder="Recepción · piso 1" />
        </label>
        <label>
          Ubicación
          <input v-model="locationLabel" maxlength="200" placeholder="Sede central" />
        </label>
      </details>
    </form>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const code = ref(String(route.query.code || '').replace(/\D/g, '').slice(0, 6))
const name = ref('')
const locationLabel = ref('')
const loading = ref(false)
const error = ref('')
const ok = ref(null)
const disabled = ref(false)
const codeInput = ref(null)
const fromQr = ref(Boolean(route.query.code))

onMounted(async () => {
  if (route.query.code) {
    code.value = String(route.query.code).replace(/\D/g, '').slice(0, 6)
    fromQr.value = true
  }
  // Si vino por QR con código completo, vincular en un toque (estilo Netflix).
  if (code.value.length === 6) {
    await confirm()
  } else {
    codeInput.value?.focus?.()
  }
})

async function confirm() {
  loading.value = true
  error.value = ''
  ok.value = null
  try {
    const { data } = await api.post('/tv/pairing/confirm', {
      code: code.value,
      name: name.value || undefined,
      locationLabel: locationLabel.value || undefined,
    })
    ok.value = data
    code.value = ''
  } catch (e) {
    const status = e?.response?.status
    if (status === 403) disabled.value = true
    error.value = e?.response?.data?.error || 'No se pudo emparejar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.pair { padding: 1rem 1.1rem 2rem; max-width: 28rem; margin: 0 auto; }
header h1 { margin: 0 0 0.35rem; font-size: 1.45rem; }
header p { margin: 0 0 1rem; opacity: 0.75; }
.card {
  display: grid;
  gap: 0.85rem;
  background: color-mix(in srgb, canvas 92%, canvasText 8%);
  border-radius: 14px;
  padding: 1rem;
}
label { display: grid; gap: 0.35rem; font-size: 0.9rem; }
input {
  border: 1px solid color-mix(in srgb, canvasText 18%, transparent);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 1.05rem;
  letter-spacing: 0.08em;
}
.btn {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: #0f766e;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.err { color: #b91c1c; }
.ok { color: #047857; }
.warn { color: #b45309; }
.muted { opacity: 0.65; font-size: 0.92rem; }
.more { margin-top: 0.25rem; font-size: 0.9rem; opacity: 0.85; }
.more summary { cursor: pointer; margin-bottom: 0.5rem; }
.more label { margin-top: 0.5rem; }
</style>
