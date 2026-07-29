<template>
  <section class="perfil">
    <header class="perfil-head">
      <h1>Mi perfil</h1>
      <p>{{ auth.tenant?.nombre || 'Tu cuenta en Connectia' }}</p>
    </header>

    <div class="perfil-card">
      <div class="perfil-avatar-wrap">
        <div class="perfil-avatar" aria-hidden="true">
          <img v-if="avatarSrc" :src="avatarSrc" alt="" />
          <span v-else>{{ initials }}</span>
        </div>
        <div class="perfil-avatar-actions">
          <label class="perfil-avatar-btn">
            {{ avatarUploading ? 'Subiendo…' : 'Cambiar foto' }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              hidden
              :disabled="avatarUploading"
              @change="onAvatarPick"
            />
          </label>
          <button
            v-if="form.avatarUrl"
            type="button"
            class="perfil-avatar-btn ghost"
            :disabled="avatarUploading"
            @click="removeAvatar"
          >
            Quitar
          </button>
        </div>
      </div>
      <p class="perfil-user">@{{ form.usuario || auth.user?.usuario }}</p>
      <p v-if="form.idExterno" class="perfil-meta">ID {{ form.idExterno }}</p>
    </div>

    <p v-if="loading" class="perfil-muted">Cargando…</p>
    <p v-if="error" class="perfil-err">{{ error }}</p>
    <p v-if="okMsg" class="perfil-ok">{{ okMsg }}</p>

    <form v-if="!loading" class="perfil-form" @submit.prevent="save">
      <h2 class="perfil-section">Datos</h2>
      <label class="field">
        <span>Nombre</span>
        <input v-model="form.nombre" type="text" required maxlength="80" autocomplete="given-name" />
      </label>
      <label class="field">
        <span>Apellido</span>
        <input v-model="form.apellido" type="text" maxlength="80" autocomplete="family-name" />
      </label>
      <label class="field">
        <span>Email</span>
        <input v-model="form.email" type="email" maxlength="160" autocomplete="email" />
      </label>
      <p v-if="form.emailVerified && !emailChanged" class="perfil-verified">Email verificado</p>
      <p v-else-if="emailChanged" class="perfil-hint">
        Al guardar te enviamos un código al email nuevo. El actual se mantiene hasta confirmarlo.
      </p>
      <label class="field">
        <span>Teléfono</span>
        <input v-model="form.telefono" type="tel" maxlength="40" autocomplete="tel" />
      </label>

      <p class="perfil-hint">El usuario de acceso (@{{ form.usuario }}) no se cambia desde acá.</p>

      <button type="submit" class="perfil-save" :disabled="saving || !dirty">
        {{ saving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </form>

    <section v-if="!loading && (form.pendingEmail || showEmailConfirm)" class="perfil-block">
      <h2 class="perfil-section">Confirmar email</h2>
      <p class="perfil-hint">
        Enviamos un código a <strong>{{ form.pendingEmail || form.email }}</strong>. Ingresalo para validar.
      </p>
      <label class="field">
        <span>Código de 6 dígitos</span>
        <input
          v-model="emailCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="000000"
        />
      </label>
      <div class="perfil-row">
        <button type="button" class="perfil-save" :disabled="emailConfirming || emailCode.trim().length !== 6" @click="confirmEmail">
          {{ emailConfirming ? 'Validando…' : 'Validar email' }}
        </button>
        <button type="button" class="perfil-avatar-btn ghost" :disabled="emailRequesting" @click="resendEmailCode">
          {{ emailRequesting ? 'Enviando…' : 'Reenviar código' }}
        </button>
      </div>
      <p v-if="devEmailCode" class="perfil-dev">DEV código: {{ devEmailCode }}</p>
    </section>

    <section v-if="!loading" class="perfil-block">
      <h2 class="perfil-section">Cambiar contraseña</h2>
      <label class="field">
        <span>Contraseña actual</span>
        <input v-model="pwd.current" type="password" autocomplete="current-password" />
      </label>
      <label class="field">
        <span>Nueva contraseña</span>
        <input v-model="pwd.next" type="password" minlength="8" autocomplete="new-password" />
      </label>
      <label class="field">
        <span>Confirmar nueva</span>
        <input v-model="pwd.confirm" type="password" minlength="8" autocomplete="new-password" />
      </label>
      <p v-if="pwdError" class="perfil-err">{{ pwdError }}</p>
      <p v-if="pwdOk" class="perfil-ok">{{ pwdOk }}</p>
      <button type="button" class="perfil-save" :disabled="pwdSaving || !pwdReady" @click="changePassword">
        {{ pwdSaving ? 'Actualizando…' : 'Actualizar contraseña' }}
      </button>
    </section>

    <section v-if="!loading && extraDefs.length" class="perfil-block">
      <h2 class="perfil-section">Datos adicionales</h2>
      <p class="perfil-hint">Campos definidos por tu organización.</p>
      <label v-for="def in extraDefs" :key="def.key" class="field">
        <span>{{ def.nombre }}{{ def.obligatorio ? ' *' : '' }}</span>
        <select v-if="def.tipo === 'list'" v-model="extraValues[def.key]">
          <option value="">—</option>
          <option v-for="opt in def.opciones" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <input
          v-else-if="def.tipo === 'date'"
          v-model="extraValues[def.key]"
          type="date"
        />
        <input
          v-else
          v-model="extraValues[def.key]"
          type="text"
          :placeholder="def.descripcion || ''"
        />
      </label>
      <p v-if="extraError" class="perfil-err">{{ extraError }}</p>
      <button type="button" class="perfil-save" :disabled="extraSaving" @click="saveExtra">
        {{ extraSaving ? 'Guardando…' : 'Guardar datos adicionales' }}
      </button>
    </section>

    <section v-if="!loading && peopleCare?.enabled" class="perfil-block">
      <h2 class="perfil-section">{{ peopleCare.label || 'Mi legajo' }}</h2>
      <template v-if="peopleCare.hasLegajo">
        <p class="perfil-hint">
          {{ peopleCare.data?.colaborador?.nombre }}
          <span v-if="peopleCare.data?.colaborador?.legajo">
            · Legajo {{ peopleCare.data.colaborador.legajo }}
          </span>
        </p>
        <router-link class="perfil-link" to="/mi-legajo">Ver expediente completo →</router-link>
      </template>
      <p v-else class="perfil-hint">
        {{ peopleCare.mensaje || 'No tenés un legajo de empleado vinculado a tu cuenta.' }}
      </p>
    </section>

    <section v-if="!loading" class="perfil-block">
      <h2 class="perfil-section">Dispositivos</h2>
      <p class="perfil-hint">Suscripciones push de este navegador / app. Podés blanquear una.</p>
      <ul v-if="devices.length" class="perfil-list">
        <li v-for="d in devices" :key="d.id" class="perfil-list-item">
          <div>
            <strong>{{ d.platform }}</strong>
            <span class="perfil-muted"> …{{ d.endpointHint }}</span>
          </div>
          <button type="button" class="perfil-avatar-btn ghost" @click="revokeDevice(d.id)">Blanquear</button>
        </li>
      </ul>
      <p v-else class="perfil-muted">No hay dispositivos registrados.</p>
    </section>

    <section v-if="!loading" class="perfil-block">
      <h2 class="perfil-section">Actividad reciente</h2>
      <ul v-if="activity.length" class="perfil-list">
        <li v-for="ev in activity" :key="ev.id" class="perfil-list-item">
          <span>{{ actionLabel(ev.action) }}</span>
          <span class="perfil-muted">{{ formatWhen(ev.createdAt) }}</span>
        </li>
      </ul>
      <p v-else class="perfil-muted">Sin eventos aún.</p>
    </section>

    <section v-if="!loading" class="perfil-block danger">
      <h2 class="perfil-section">Cuenta</h2>
      <p v-if="deletionRequestedAt" class="perfil-ok">
        Solicitud de baja enviada el {{ formatWhen(deletionRequestedAt) }}.
      </p>
      <label class="field">
        <span>Contraseña para confirmar</span>
        <input v-model="accountPwd" type="password" autocomplete="current-password" />
      </label>
      <p v-if="accountError" class="perfil-err">{{ accountError }}</p>
      <p v-if="accountOk" class="perfil-ok">{{ accountOk }}</p>
      <div class="perfil-row">
        <button type="button" class="perfil-avatar-btn ghost" :disabled="accountBusy" @click="requestDelete">
          Solicitar eliminación
        </button>
        <button type="button" class="perfil-danger" :disabled="accountBusy" @click="disableAccount">
          Desactivar cuenta
        </button>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { resolveMediaUrl } from '../utils/media'

const auth = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')
const baseline = ref('')
const avatarUploading = ref(false)
const emailCode = ref('')
const emailConfirming = ref(false)
const emailRequesting = ref(false)
const showEmailConfirm = ref(false)
const devEmailCode = ref('')
const pwdSaving = ref(false)
const pwdError = ref('')
const pwdOk = ref('')

const extraDefs = ref([])
const extraValues = reactive({})
const extraSaving = ref(false)
const extraError = ref('')
const devices = ref([])
const activity = ref([])
const peopleCare = ref(null)
const deletionRequestedAt = ref(null)
const accountPwd = ref('')
const accountBusy = ref(false)
const accountError = ref('')
const accountOk = ref('')

const form = reactive({
  usuario: '',
  idExterno: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  avatarUrl: '',
  emailVerified: false,
  pendingEmail: '',
})

const pwd = reactive({
  current: '',
  next: '',
  confirm: '',
})

const avatarSrc = computed(() => resolveMediaUrl(form.avatarUrl || ''))
const initials = computed(() => {
  const n = (form.nombre || form.usuario || '?').trim()
  const a = (form.apellido || '').trim()
  return `${n.slice(0, 1)}${a.slice(0, 1) || n.slice(1, 2) || ''}`.toUpperCase()
})
const dirty = computed(() => JSON.stringify(snapshot()) !== baseline.value)
const emailChanged = computed(() => {
  try {
    const base = JSON.parse(baseline.value || '{}')
    return form.email.trim().toLowerCase() !== String(base.email || '').toLowerCase()
  } catch {
    return false
  }
})
const pwdReady = computed(
  () =>
    Boolean(pwd.current) &&
    pwd.next.length >= 8 &&
    pwd.next === pwd.confirm,
)

function snapshot() {
  return {
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    email: form.email.trim().toLowerCase(),
    telefono: form.telefono.trim(),
  }
}

function applyUser(u) {
  form.usuario = u.usuario || ''
  form.idExterno = u.idExterno || ''
  form.nombre = u.nombre || ''
  form.apellido = u.apellido || ''
  form.email = u.email || ''
  form.telefono = u.telefono || ''
  form.avatarUrl = u.avatarUrl || ''
  form.emailVerified = Boolean(u.emailVerified)
  form.pendingEmail = u.pendingEmail || ''
  deletionRequestedAt.value = u.deletionRequestedAt || null
  baseline.value = JSON.stringify(snapshot())
  if (form.pendingEmail) showEmailConfirm.value = true
}

function applyChallenge(data) {
  if (data?.user) applyUser(data.user)
  if (data?.emailChallenge) {
    showEmailConfirm.value = true
    if (data.emailChallenge.pendingEmail) form.pendingEmail = data.emailChallenge.pendingEmail
    if (data.emailChallenge.devCode) devEmailCode.value = data.emailChallenge.devCode
    if (data.emailChallenge.sent) {
      okMsg.value = `Código enviado a ${form.pendingEmail}`
    } else if (data.emailChallenge.mailError) {
      error.value = data.emailChallenge.mailError + (data.emailChallenge.devCode ? ' (código DEV abajo)' : '')
    }
  }
}

async function load() {
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.get('/me')
    applyUser(data.user || {})
    if (data.user) auth.patchUser(data.user)
    await Promise.all([loadExtra(), loadDevices(), loadActivity(), loadPeopleCare()])
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el perfil'
    applyUser(auth.user || {})
  } finally {
    loading.value = false
  }
}

async function loadExtra() {
  try {
    const { data } = await api.get('/me/profile-fields')
    extraDefs.value = data.fields || []
    const vals = data.values || {}
    for (const k of Object.keys(extraValues)) delete extraValues[k]
    for (const def of extraDefs.value) {
      extraValues[def.key] = vals[def.key] != null ? String(vals[def.key]) : ''
    }
  } catch {
    extraDefs.value = []
  }
}

async function saveExtra() {
  extraSaving.value = true
  extraError.value = ''
  try {
    const values = {}
    for (const def of extraDefs.value) {
      values[def.key] = extraValues[def.key] === '' ? null : extraValues[def.key]
    }
    const { data } = await api.patch('/me/profile-fields', { values })
    const vals = data.values || {}
    for (const def of extraDefs.value) {
      extraValues[def.key] = vals[def.key] != null ? String(vals[def.key]) : ''
    }
    okMsg.value = 'Datos adicionales guardados'
  } catch (e) {
    extraError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    extraSaving.value = false
  }
}

async function loadDevices() {
  try {
    const { data } = await api.get('/me/devices')
    devices.value = data.items || []
  } catch {
    devices.value = []
  }
}

async function revokeDevice(index) {
  if (!confirm('¿Blanquear este dispositivo?')) return
  try {
    const { data } = await api.delete(`/me/devices/${index}`)
    devices.value = data.items || []
    okMsg.value = 'Dispositivo blanqueado'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo blanquear'
  }
}

async function loadActivity() {
  try {
    const { data } = await api.get('/me/activity', { params: { limit: 20 } })
    activity.value = data.items || []
  } catch {
    activity.value = []
  }
}

async function loadPeopleCare() {
  try {
    const { data } = await api.get('/me/peoplecare')
    peopleCare.value = data
  } catch {
    peopleCare.value = null
  }
}

function actionLabel(a) {
  const map = {
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
    logout_all: 'Cierre de todas las sesiones',
    login_failed: 'Login fallido',
    password_change: 'Cambio de contraseña',
    profile_update: 'Perfil actualizado',
    account_disable: 'Cuenta desactivada',
    account_delete_request: 'Solicitud de eliminación',
    device_revoke: 'Dispositivo blanqueado',
    'admin.user_disable': 'Desactivado por admin',
    'admin.device_revoke': 'Dispositivo blanqueado por admin',
  }
  return map[a] || a
}

function formatWhen(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}

function fmtShort(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return String(d).slice(0, 10)
  }
}

async function disableAccount() {
  accountError.value = ''
  accountOk.value = ''
  if (!accountPwd.value) {
    accountError.value = 'Ingresá tu contraseña'
    return
  }
  if (!confirm('¿Desactivar tu cuenta? No podrás ingresar hasta que un admin te reactive.')) return
  accountBusy.value = true
  try {
    await api.post('/me/account/disable', { password: accountPwd.value, confirm: true })
    accountOk.value = 'Cuenta desactivada'
    auth.logout()
  } catch (e) {
    accountError.value = e.response?.data?.error || 'No se pudo desactivar'
  } finally {
    accountBusy.value = false
  }
}

async function requestDelete() {
  accountError.value = ''
  accountOk.value = ''
  if (!accountPwd.value) {
    accountError.value = 'Ingresá tu contraseña'
    return
  }
  if (!confirm('¿Solicitar eliminación / anonimización de tu cuenta?')) return
  accountBusy.value = true
  try {
    const { data } = await api.post('/me/account/delete-request', {
      password: accountPwd.value,
      confirm: true,
    })
    deletionRequestedAt.value = data.deletionRequestedAt
    accountOk.value = data.message || 'Solicitud registrada'
    accountPwd.value = ''
  } catch (e) {
    accountError.value = e.response?.data?.error || 'No se pudo registrar la solicitud'
  } finally {
    accountBusy.value = false
  }
}

async function save() {
  if (!dirty.value || saving.value) return
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.patch('/me', {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
    })
    if (data.emailChallenge) {
      applyChallenge(data)
      if (data.user) auth.patchUser(data.user)
    } else {
      applyUser(data.user || {})
      if (data.user) auth.patchUser(data.user)
      okMsg.value = 'Perfil actualizado'
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function confirmEmail() {
  if (emailConfirming.value) return
  emailConfirming.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.post('/me/email/confirm', { code: emailCode.value.trim() })
    applyUser(data.user || {})
    if (data.user) auth.patchUser(data.user)
    emailCode.value = ''
    showEmailConfirm.value = false
    devEmailCode.value = ''
    okMsg.value = 'Email validado correctamente'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo validar el email'
  } finally {
    emailConfirming.value = false
  }
}

async function resendEmailCode() {
  if (emailRequesting.value) return
  emailRequesting.value = true
  error.value = ''
  try {
    const { data } = await api.post('/me/email/request', {
      email: form.pendingEmail || form.email.trim(),
    })
    applyChallenge(data)
    if (data.user) auth.patchUser(data.user)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo reenviar el código'
  } finally {
    emailRequesting.value = false
  }
}

async function changePassword() {
  pwdError.value = ''
  pwdOk.value = ''
  if (pwd.next !== pwd.confirm) {
    pwdError.value = 'La confirmación no coincide'
    return
  }
  if (pwd.next.length < 8) {
    pwdError.value = 'Mínimo 8 caracteres'
    return
  }
  pwdSaving.value = true
  try {
    const { data } = await api.post('/me/password', {
      currentPassword: pwd.current,
      newPassword: pwd.next,
    })
    pwd.current = ''
    pwd.next = ''
    pwd.confirm = ''
    pwdOk.value = data.message || 'Contraseña actualizada'
  } catch (e) {
    pwdError.value = e.response?.data?.error || 'No se pudo cambiar la contraseña'
  } finally {
    pwdSaving.value = false
  }
}

/** Recorta al centro 1:1 y redimensiona a 512×512 (JPEG). */
function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) reject(new Error('No se pudo procesar la imagen'))
            else resolve(blob)
          },
          'image/jpeg',
          0.9,
        )
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagen inválida'))
    }
    img.src = url
  })
}

async function onAvatarPick(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    error.value = 'La imagen es demasiado grande (máx. ~5 MB)'
    return
  }
  avatarUploading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const blob = await processAvatarFile(file)
    const fd = new FormData()
    fd.append('file', blob, 'avatar.jpg')
    const { data } = await api.post('/me/avatar', fd)
    applyUser(data.user || {})
    if (data.user) auth.patchUser(data.user)
    okMsg.value = 'Foto de perfil actualizada'
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo subir la foto'
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  if (avatarUploading.value) return
  avatarUploading.value = true
  error.value = ''
  try {
    const { data } = await api.delete('/me/avatar')
    applyUser(data.user || {})
    if (data.user) auth.patchUser(data.user)
    okMsg.value = 'Foto eliminada'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo quitar la foto'
  } finally {
    avatarUploading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.perfil {
  padding: 16px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.perfil-head h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}
.perfil-head p {
  margin: 4px 0 0;
  color: var(--cx-muted, #64748b);
  font-size: 0.9rem;
}
.perfil-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, transparent);
}
.perfil-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.perfil-avatar {
  width: 88px;
  height: 88px;
  border-radius: 999px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  font-weight: 800;
  font-size: 1.35rem;
}
.perfil-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.perfil-avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.perfil-avatar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  cursor: pointer;
}
.perfil-avatar-btn.ghost {
  background: transparent;
  color: var(--brand-primary, #0f766e);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary, #0f766e) 45%, transparent);
}
.perfil-avatar-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.perfil-user {
  margin: 4px 0 0;
  font-weight: 700;
}
.perfil-meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--cx-muted, #64748b);
}
.perfil-section {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}
.perfil-form,
.perfil-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.perfil-block {
  padding-top: 8px;
  border-top: 1px solid var(--cx-border, #e2e8f0);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}
.field input {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 12px;
  padding: 11px 12px;
  font: inherit;
  font-weight: 500;
  background: var(--cx-surface, #fff);
  color: inherit;
}
.perfil-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--cx-muted, #64748b);
  line-height: 1.4;
}
.perfil-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-primary, #0f766e);
  text-decoration: none;
}
.perfil-dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1rem;
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
}
.perfil-dl dt {
  color: var(--cx-muted, #64748b);
  font-size: 0.75rem;
}
.perfil-dl dd {
  margin: 0.1rem 0 0;
  font-weight: 600;
}
.perfil-sub {
  margin-top: 0.85rem;
}
.perfil-sub h3 {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
}
.perfil-sub ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
}
.perfil-sub p {
  margin: 0.15rem 0;
  font-size: 0.85rem;
}
.perfil-verified {
  margin: -4px 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f766e;
}
.perfil-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.perfil-save {
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 700;
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.perfil-save:disabled {
  opacity: 0.55;
}
.perfil-err {
  margin: 0;
  color: #b91c1c;
  font-size: 0.9rem;
}
.perfil-ok {
  margin: 0;
  color: #0f766e;
  font-size: 0.9rem;
  font-weight: 600;
}
.perfil-muted {
  margin: 0;
  color: var(--cx-muted, #64748b);
}
.perfil-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.perfil-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--cx-border, #e2e8f0) 45%, transparent);
  font-size: 0.875rem;
}
.perfil-block.danger {
  border: 1px solid color-mix(in srgb, #b91c1c 25%, transparent);
}
.perfil-danger {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  background: #b91c1c;
  color: #fff;
}
.perfil-danger:disabled {
  opacity: 0.55;
}
.perfil-dev {
  margin: 0;
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
  color: #a16207;
  background: color-mix(in srgb, #fde047 30%, transparent);
  padding: 8px 10px;
  border-radius: 8px;
}
</style>
