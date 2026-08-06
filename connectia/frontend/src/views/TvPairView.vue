<template>
  <section class="pair">
    <header class="pair-head">
      <h1>Emparejar TV</h1>
      <p>
        Vinculá una pantalla de sede a tu comunidad. El nombre y la ubicación se guardan en el
        dispositivo para reconocerlo después (y desvincularlo si hace falta).
      </p>
    </header>

    <details class="pair-howto">
      <summary id="pair-howto-title">Cómo se usa</summary>
      <div class="pair-howto-body">
        <ol class="pair-steps">
          <li>
            <strong>Abrí la TV</strong>
            <span>En el navegador de la pantalla abrí el enlace de abajo (modo kiosk).</span>
          </li>
          <li>
            <strong>Mirás el código</strong>
            <span>La TV muestra un código de 6 dígitos y, si puede, un QR.</span>
          </li>
          <li>
            <strong>Confirmás acá</strong>
            <span>Escribí el código, elegí el canal, el nombre y dónde está la pantalla, y tocá Vincular.</span>
          </li>
          <li>
            <strong>Listo</strong>
            <span>La TV queda asociada a esta comunidad y muestra el canal elegido.</span>
          </li>
        </ol>

        <div class="pair-link" role="group" aria-label="URL del modo TV">
          <p class="pair-link-label">Enlace para la TV</p>
          <div class="pair-link-row">
            <input
              class="pair-link-input"
              type="text"
              readonly
              :value="tvUrl"
              aria-label="URL completa del modo TV"
              @focus="$event.target.select()"
            />
            <button
              type="button"
              class="pair-link-btn"
              :aria-label="copied ? 'URL copiada' : 'Copiar URL'"
              :title="copied ? 'Copiado' : 'Copiar'"
              @click="copyTvUrl"
            >
              <AppIcon :name="copied ? 'check' : 'clipboard'" :size="16" />
            </button>
            <button
              v-if="canShare"
              type="button"
              class="pair-link-btn"
              aria-label="Compartir URL"
              title="Compartir"
              @click="shareTvUrl"
            >
              <AppIcon name="share" :size="16" />
            </button>
          </div>
        </div>

        <p class="pair-tip">
          Tenés que estar logueado. Si el código se venció, pedile a la TV que genere uno nuevo.
        </p>
      </div>
    </details>

    <p v-if="disabled" class="warn" role="alert">
      Modo TV no está activo en esta comunidad. Pedile a un administrador que lo habilite.
    </p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <div v-if="ok" class="ok-box" role="status">
      <strong>Pantalla vinculada</strong>
      <p>
        {{ okLabel }}
        Quedó guardada como dispositivo de esta comunidad.
      </p>
    </div>

    <form v-if="!disabled && !ok" class="card" @submit.prevent="confirm">
      <label>
        Código de la TV
        <input
          ref="codeInput"
          v-model="code"
          class="input-code"
          inputmode="numeric"
          maxlength="6"
          pattern="[0-9]*"
          placeholder="000000"
          required
          autocomplete="one-time-code"
          aria-describedby="pair-code-hint"
        />
      </label>
      <p id="pair-code-hint" class="hint">Los 6 números que ves en la pantalla grande.</p>

      <label>
        Nombre de la pantalla
        <input
          v-model="name"
          class="input-text"
          maxlength="120"
          placeholder="Ej. Recepción · piso 1"
          required
          aria-describedby="pair-name-hint"
        />
      </label>
      <p id="pair-name-hint" class="hint">Cómo la vas a reconocer en la lista de abajo.</p>

      <label>
        Ubicación
        <input
          v-model="locationLabel"
          class="input-text"
          maxlength="200"
          placeholder="Ej. Sede central · hall"
          required
          aria-describedby="pair-loc-hint"
        />
      </label>
      <p id="pair-loc-hint" class="hint">Dónde está físicamente (sede, piso, sector).</p>

      <label>
        Canal
        <select
          v-model="playlistId"
          class="input-text"
          required
          :disabled="channelsLoading || !channels.length"
          aria-describedby="pair-channel-hint"
        >
          <option disabled value="">
            {{ channelsLoading ? 'Cargando canales…' : 'Elegí un canal…' }}
          </option>
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <p id="pair-channel-hint" class="hint">
        Qué contenido va a mostrar esta pantalla. Solo ves los canales disponibles para vos.
      </p>
      <p v-if="!channelsLoading && !channels.length" class="warn" role="alert">
        No hay canales disponibles para vos. Pedile a un administrador que active un canal o te
        incluya en su audiencia.
      </p>

      <button
        type="submit"
        class="btn"
        :disabled="loading || !canSubmit"
      >
        {{ loading ? 'Vinculando…' : 'Vincular esta TV' }}
      </button>
    </form>

    <button v-if="ok" type="button" class="btn btn-ghost" @click="resetForm">
      Emparejar otra TV
    </button>

    <section v-if="!disabled" class="devices" aria-labelledby="pair-devices-title">
      <h2 id="pair-devices-title">Pantallas vinculadas</h2>
      <p class="devices-lead">
        Acá se guardan el nombre y la ubicación que cargaste al vincular. Podés desvincular una
        pantalla para que deje de mostrar contenido de esta comunidad.
      </p>
      <p v-if="devicesLoading" class="muted">Cargando pantallas…</p>
      <ul v-else-if="devices.length" class="device-list">
        <li v-for="d in devices" :key="d.id" class="device-row">
          <div class="device-meta">
            <strong>{{ d.name || 'Pantalla TV' }}</strong>
            <span>{{ d.locationLabel || 'Sin ubicación' }}</span>
            <span v-if="d.lastHeartbeatAt" class="device-hb">
              Última señal {{ formatHb(d.lastHeartbeatAt) }}
            </span>
          </div>
          <button
            type="button"
            class="btn-unlink"
            :disabled="unlinkingId === d.id"
            @click="unlink(d)"
          >
            {{ unlinkingId === d.id ? 'Desvinculando…' : 'Desvincular' }}
          </button>
        </li>
      </ul>
      <p v-else class="empty-devices">Todavía no hay pantallas vinculadas.</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import api from '../services/api'

const route = useRoute()
const code = ref(String(route.query.code || '').replace(/\D/g, '').slice(0, 6))
const name = ref('')
const locationLabel = ref('')
const playlistId = ref('')
const channels = ref([])
const channelsLoading = ref(false)
const loading = ref(false)
const error = ref('')
const ok = ref(null)
const disabled = ref(false)
const codeInput = ref(null)
const copied = ref(false)
const devices = ref([])
const devicesLoading = ref(false)
const unlinkingId = ref('')
let copiedTimer = 0

const tvUrl = computed(() => {
  if (typeof window === 'undefined') return '/tv'
  return new URL('/tv', window.location.origin).toString()
})

const canShare = computed(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')

const canSubmit = computed(() => {
  return (
    code.value.replace(/\D/g, '').length === 6 &&
    name.value.trim().length > 0 &&
    locationLabel.value.trim().length > 0 &&
    Boolean(playlistId.value) &&
    channels.value.length > 0
  )
})

const okLabel = computed(() => {
  const d = ok.value?.device
  const tenant = ok.value?.tenantName
  const channelName = ok.value?.playlist?.name
  const parts = []
  if (d?.name) parts.push(d.name)
  if (d?.locationLabel) parts.push(d.locationLabel)
  const where = parts.length ? parts.join(' · ') : 'esta pantalla'
  const channelBit = channelName ? ` con el canal «${channelName}»` : ''
  if (tenant) return `${where} quedó asociada a ${tenant}${channelBit}.`
  return `${where} quedó asociada a tu comunidad${channelBit}.`
})

onMounted(async () => {
  if (route.query.code) {
    code.value = String(route.query.code).replace(/\D/g, '').slice(0, 6)
  }
  await Promise.all([loadDevices(), loadChannels()])
  // Con QR precargamos el código, pero pedimos nombre/ubicación antes de vincular.
  if (!code.value) codeInput.value?.focus?.()
})

onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

function flashCopied() {
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function copyTvUrl() {
  try {
    await navigator.clipboard.writeText(tvUrl.value)
    flashCopied()
  } catch {
    flashCopied()
  }
}

async function shareTvUrl() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Connectia TV',
        text: 'Abrí este enlace en la pantalla para emparejar el modo kiosk.',
        url: tvUrl.value,
      })
      return
    }
  } catch {
    /* cancelado o no disponible */
  }
  await copyTvUrl()
}

function resetForm() {
  ok.value = null
  error.value = ''
  code.value = ''
  name.value = ''
  locationLabel.value = ''
  if (channels.value.length !== 1) playlistId.value = ''
  disabled.value = false
  loadChannels()
  setTimeout(() => codeInput.value?.focus?.(), 50)
}

function formatHb(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

async function loadChannels() {
  channelsLoading.value = true
  try {
    const { data } = await api.get('/tv/playlists')
    channels.value = Array.isArray(data?.items) ? data.items : []
    if (channels.value.length === 1) {
      playlistId.value = channels.value[0].id
    } else if (playlistId.value && !channels.value.some((c) => c.id === playlistId.value)) {
      playlistId.value = ''
    }
  } catch (e) {
    const status = e?.response?.status
    if (status === 403) disabled.value = true
    channels.value = []
    playlistId.value = ''
  } finally {
    channelsLoading.value = false
  }
}

async function loadDevices() {
  devicesLoading.value = true
  try {
    const { data } = await api.get('/tv/devices')
    devices.value = data.items || []
  } catch (e) {
    const status = e?.response?.status
    if (status === 403) disabled.value = true
    devices.value = []
  } finally {
    devicesLoading.value = false
  }
}

async function unlink(d) {
  if (!d?.id) return
  const label = [d.name, d.locationLabel].filter(Boolean).join(' · ') || 'esta pantalla'
  if (!window.confirm(`¿Desvincular ${label}? La TV va a pedir un código nuevo.`)) return
  unlinkingId.value = d.id
  error.value = ''
  try {
    await api.post(`/tv/devices/${d.id}/unlink`)
    devices.value = devices.value.filter((x) => x.id !== d.id)
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo desvincular'
  } finally {
    unlinkingId.value = ''
  }
}

async function confirm() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  ok.value = null
  try {
    const { data } = await api.post('/tv/pairing/confirm', {
      code: code.value,
      name: name.value.trim(),
      locationLabel: locationLabel.value.trim(),
      playlistId: playlistId.value,
    })
    ok.value = data
    code.value = ''
    await loadDevices()
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
.pair {
  padding: 1rem 1.1rem 2rem;
  max-width: 28rem;
  margin: 0 auto;
}
.pair-head h1 {
  margin: 0 0 0.4rem;
  font-size: 1.45rem;
  font-family: var(--font-display, inherit);
  color: var(--cx-text);
}
.pair-head p {
  margin: 0 0 1.1rem;
  color: var(--cx-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}
.pair-howto {
  margin-bottom: 1.1rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 22%, var(--cx-border, #e2e8f0));
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 7%, var(--cx-surface, #fff));
}
.pair-howto > summary {
  list-style: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-primary, #0f766e);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  user-select: none;
}
.pair-howto > summary::-webkit-details-marker {
  display: none;
}
.pair-howto > summary::after {
  content: '';
  width: 0.45rem;
  height: 0.45rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.15s ease;
  flex-shrink: 0;
  margin-top: -0.15rem;
}
.pair-howto[open] > summary {
  margin-bottom: 0.75rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 16%, transparent);
}
.pair-howto[open] > summary::after {
  transform: rotate(-135deg);
  margin-top: 0.15rem;
}
.pair-howto-body {
  display: grid;
  gap: 0.9rem;
}
.pair-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
  counter-reset: pair-step;
}
.pair-steps li {
  display: grid;
  grid-template-columns: 1.4rem 1fr;
  column-gap: 0.55rem;
  align-items: start;
  counter-increment: pair-step;
}
.pair-steps li::before {
  content: counter(pair-step);
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, transparent);
  grid-row: 1 / span 2;
  margin-top: 0.05rem;
}
.pair-steps strong {
  font-size: 0.86rem;
  color: var(--cx-text);
  line-height: 1.3;
}
.pair-steps span {
  font-size: 0.78rem;
  color: var(--cx-muted);
  line-height: 1.35;
}
.pair-link {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}
.pair-link-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cx-muted);
}
.pair-link-row {
  display: flex;
  align-items: stretch;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 22%, var(--cx-border, #e2e8f0));
  border-radius: 10px;
  background: var(--cx-surface, #fff);
  overflow: hidden;
}
.pair-link-input {
  flex: 1;
  min-width: 0;
  border: 0;
  border-radius: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
  color: var(--cx-text);
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.pair-link-input:focus {
  outline: none;
}
.pair-link-btn {
  flex: 0 0 2.4rem;
  display: grid;
  place-items: center;
  border: 0;
  border-left: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 16%, var(--cx-border, #e2e8f0));
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, transparent);
  color: var(--brand-primary, #0f766e);
  cursor: pointer;
  padding: 0;
}
.pair-link-btn:hover {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, transparent);
}
.pair-tip {
  margin: 0;
  font-size: 0.75rem;
  color: var(--cx-muted);
  line-height: 1.4;
}
.card {
  display: grid;
  gap: 0.45rem;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  padding: 1rem;
}
label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--cx-text);
  margin-top: 0.35rem;
}
label:first-child {
  margin-top: 0;
}
.card input {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: var(--cx-input, #fff);
  color: var(--cx-text);
}
.input-code {
  font-size: 1.25rem;
  letter-spacing: 0.18em;
  font-weight: 700;
}
.input-text {
  font-size: 0.95rem;
  letter-spacing: 0;
  font-weight: 500;
}
.hint {
  margin: 0 0 0.15rem;
  font-size: 0.78rem;
  color: var(--cx-muted);
  line-height: 1.35;
}
.btn {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  margin-top: 0.55rem;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost {
  width: 100%;
  margin-top: 0.85rem;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--brand-primary, #0f766e);
}
.err {
  color: var(--cx-danger, #b91c1c);
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
}
.warn {
  color: #b45309;
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
}
.ok-box {
  margin: 0 0 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-ok, #047857) 12%, transparent);
  color: var(--cx-text);
}
.ok-box strong {
  display: block;
  color: var(--cx-ok, #047857);
  margin-bottom: 0.25rem;
}
.ok-box p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--cx-muted);
  line-height: 1.4;
}
.muted {
  opacity: 0.75;
  font-size: 0.92rem;
  margin: 0 0 0.75rem;
}
.devices {
  margin-top: 1.35rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--cx-border, #e2e8f0);
}
.devices h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: var(--cx-text);
}
.devices-lead {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  color: var(--cx-muted);
  line-height: 1.4;
}
.device-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
}
.device-meta {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}
.device-meta strong {
  font-size: 0.92rem;
  color: var(--cx-text);
}
.device-meta span {
  font-size: 0.78rem;
  color: var(--cx-muted);
  line-height: 1.3;
}
.device-hb {
  opacity: 0.85;
}
.btn-unlink {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  background: color-mix(in srgb, var(--cx-danger, #b91c1c) 12%, transparent);
  color: var(--cx-danger, #b91c1c);
}
.btn-unlink:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.empty-devices {
  margin: 0;
  font-size: 0.86rem;
  color: var(--cx-muted);
}
</style>
