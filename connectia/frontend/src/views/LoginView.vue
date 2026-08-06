<template>
  <div class="min-h-dvh flex items-center justify-center p-4" :style="bgStyle">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <img
          v-if="displayLogoUrl"
          :src="displayLogoUrl"
          :alt="splashTitle"
          class="login-logo mx-auto"
        />
        <img
          v-else
          :src="PRODUCT_LOGO_LIGHT"
          :alt="PRODUCT_NAME"
          class="login-logo mx-auto"
        />
        <p class="mt-2 text-sm cx-muted">{{ splashSubtitle }}</p>
      </div>

      <!-- Paso 2FA -->
      <form
        v-if="step === '2fa'"
        class="rounded-2xl shadow-lg border p-6 space-y-4 cx-surface"
        style="background: color-mix(in srgb, var(--cx-surface) 92%, transparent); border-color: var(--cx-border)"
        @submit.prevent="onVerify2fa"
      >
        <h2 class="text-lg font-semibold">Verificación en dos pasos</h2>
        <p class="text-sm cx-muted">
          Enviamos un código por {{ challengeMethod === 'sms' ? 'SMS' : 'email' }} a
          <strong>{{ challengeDestination }}</strong>.
        </p>
        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Código</span>
          <input
            v-model="otpCode"
            class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] cx-input tracking-widest text-center text-lg"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            placeholder="000000"
          />
        </label>
        <p v-if="error" class="text-sm" style="color: var(--cx-danger)">{{ error }}</p>
        <button type="submit" class="w-full rounded-xl bg-brand text-white font-semibold py-3 hover:opacity-90 transition disabled:opacity-60" :disabled="loading">
          {{ loading ? 'Verificando…' : 'Confirmar' }}
        </button>
        <button type="button" class="w-full text-sm text-brand" :disabled="loading" @click="onResend2fa">
          Reenviar código
        </button>
        <button type="button" class="w-full text-xs cx-muted" @click="cancel2fa">Volver al login</button>
      </form>

      <!-- Selector multi-empresa -->
      <div
        v-else-if="step === 'tenants'"
        class="rounded-2xl shadow-lg border p-6 space-y-4 cx-surface"
        style="background: color-mix(in srgb, var(--cx-surface) 92%, transparent); border-color: var(--cx-border)"
      >
        <h2 class="text-lg font-semibold">Elegí tu comunidad</h2>
        <p class="text-sm cx-muted">Encontramos varias empresas asociadas a tu usuario.</p>
        <button
          v-for="t in tenantChoices"
          :key="t.empCodigo"
          type="button"
          class="w-full text-left rounded-xl border px-4 py-3 hover:opacity-90 transition"
          style="border-color: var(--cx-border); background: var(--cx-surface-2)"
          @click="selectTenant(t)"
        >
          <span class="font-semibold" :style="{ color: t.primary || 'var(--brand-primary)' }">{{ t.nombre }}</span>
          <span class="block text-xs cx-muted">{{ t.empCodigo }}</span>
        </button>
        <button type="button" class="w-full text-xs cx-muted" @click="step = 'login'">Volver</button>
      </div>

      <!-- Login principal -->
      <template v-else>
        <div
          class="flex rounded-xl p-1 mb-4 border"
          style="background: color-mix(in srgb, var(--cx-surface) 70%, transparent); border-color: var(--cx-border)"
        >
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold"
            :class="mode === 'password' ? 'bg-brand text-white' : 'cx-muted'"
            @click="mode = 'password'"
          >
            Usuario
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold"
            :class="mode === 'id' ? 'bg-brand text-white' : 'cx-muted'"
            @click="mode = 'id'"
          >
            ID / legajo
          </button>
        </div>

        <form
          class="rounded-2xl shadow-lg border p-6 space-y-4 cx-surface"
          style="background: color-mix(in srgb, var(--cx-surface) 92%, transparent); border-color: var(--cx-border)"
          @submit.prevent="onSubmit"
        >
          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Empresa</span>
            <div class="mt-1 flex gap-2">
              <input
                v-model="empCodigo"
                class="flex-1 rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] cx-input"
                placeholder="DEMO"
                autocomplete="organization"
              />
              <button
                type="button"
                class="rounded-xl border px-3 text-xs font-semibold cx-input whitespace-nowrap"
                title="Buscar comunidades por usuario/email"
                @click="onFindTenants"
              >
                Buscar
              </button>
            </div>
          </label>
          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wide cx-muted">{{ mode === 'id' ? 'ID / legajo' : 'Usuario' }}</span>
            <input
              v-model="usuario"
              class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] cx-input"
              :placeholder="mode === 'id' ? '1001' : 'demo'"
              autocomplete="username"
            />
          </label>
          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Contraseña</span>
            <input
              v-model="password"
              type="password"
              class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] cx-input"
              autocomplete="current-password"
            />
          </label>

          <label class="flex items-center gap-2 text-sm" style="color: var(--cx-muted)">
            <input v-model="rememberMe" type="checkbox" class="rounded" />
            Recordarme en este dispositivo
          </label>

          <p v-if="tenantHint" class="text-xs rounded-lg px-3 py-2" style="color: var(--cx-ok); background: color-mix(in srgb, var(--brand-primary) 12%, transparent)">{{ tenantHint }}</p>
          <p v-if="error" class="text-sm" style="color: var(--cx-danger)">{{ error }}</p>

          <button type="submit" class="w-full rounded-xl bg-brand text-white font-semibold py-3 hover:opacity-90 transition disabled:opacity-60" :disabled="loading">
            {{ loading ? 'Ingresando…' : 'Ingresar' }}
          </button>

          <div v-if="ssoProviders.length" class="space-y-2 pt-1">
            <p class="text-xs text-center cx-muted">O continuá con</p>
            <button
              v-for="p in ssoProviders"
              :key="p.id"
              type="button"
              class="w-full rounded-xl border py-2.5 text-sm font-semibold cx-input"
              @click="startSso(p.id)"
            >
              {{ p.label }}
            </button>
          </div>
          <p v-else-if="ssoHint" class="text-xs text-center cx-muted">{{ ssoHint }}</p>

          <button type="button" class="w-full text-sm text-brand" @click="showForgot = !showForgot">¿Olvidaste la contraseña?</button>
          <div v-if="showForgot" class="rounded-xl p-3 space-y-2" style="background: var(--cx-surface-2)">
            <p class="text-xs cx-muted">
              Te enviamos un link al email de la cuenta si está cargado.
              También podés abrir
              <RouterLink class="underline" to="/reset-password">/reset-password</RouterLink>.
            </p>
            <button type="button" class="w-full rounded-lg border py-2 text-sm font-medium cx-input" :disabled="forgotLoading" @click="onForgot">
              {{ forgotLoading ? 'Enviando…' : 'Recuperar' }}
            </button>
            <p v-if="forgotMsg" class="text-xs" style="color: var(--cx-ok)">{{ forgotMsg }}</p>
          </div>
        </form>
      </template>

      <div class="mt-4 flex justify-center">
        <ThemeToggle />
      </div>

      <p class="mt-4 text-center text-xs cx-muted">
        App miembro → <strong>DEMO</strong> / demo / Demo1234!<br />
        (PLATFORM / sooft es solo para Admin en :5174)
      </p>
      <p class="mt-2 text-center text-xs">
        <RouterLink class="text-brand underline" to="/legal/privacy">Privacidad</RouterLink>
        ·
        <RouterLink class="text-brand underline" to="/legal/terms">Términos</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { useSplashStore } from '../stores/splash'
import ThemeToggle from '../components/ThemeToggle.vue'
import { resolveMediaUrl } from '../utils/media'
import { PRODUCT_LOGO_LIGHT, PRODUCT_NAME, PRODUCT_PRIMARY, PRODUCT_SECONDARY } from '../constants/brand'

function applyProductBrandColors() {
  document.documentElement.style.setProperty('--brand-primary', PRODUCT_PRIMARY)
  document.documentElement.style.setProperty('--brand-secondary', PRODUCT_SECONDARY)
}

const auth = useAuthStore()
const theme = useThemeStore()
const splash = useSplashStore()
const router = useRouter()
const route = useRoute()

const step = ref('login')
const mode = ref('password')
const empFromQuery = String(route.query.emp || route.query.empresa || '').trim().toUpperCase()
const empCodigo = ref(empFromQuery || 'DEMO')
const usuario = ref(empFromQuery ? '' : 'demo')
const password = ref(empFromQuery ? '' : 'Demo1234!')
const rememberMe = ref(true)
const loading = ref(false)
const error = ref('')
const tenantHint = ref('')
const showForgot = ref(false)
const forgotLoading = ref(false)
const forgotMsg = ref('')
const splashTitle = ref('Connectyx')
const splashSubtitle = ref('Tu comunidad: información y trámites, fácil.')
const logoUrl = ref('')
const loginBgUrl = ref('')
const preLoginBranding = ref(null)
const preLoginNombre = ref('')
const ssoProviders = ref([])
const ssoHint = ref('')
const tenantChoices = ref([])
const challengeToken = ref('')
const challengeMethod = ref('email')
const challengeDestination = ref('')
const otpCode = ref('')
let preSplashDone = false

const bgStyle = computed(() => {
  if (!loginBgUrl.value) return {}
  const bg = resolveMediaUrl(loginBgUrl.value)
  return {
    backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.55)), url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})

const displayLogoUrl = computed(() => resolveMediaUrl(logoUrl.value))

watch(mode, (m) => {
  usuario.value = m === 'id' ? '1001' : 'demo'
})

async function playPreLoginSplash(branding, nombre) {
  if (preSplashDone) return
  preSplashDone = true
  await splash.play('pre', { branding: branding || {}, tenantNombre: nombre || '' })
}

async function afterSession(data) {
  await splash.play('post', { force: true })
  if (data.user?.needsTerms) {
    await router.replace({ name: 'terms', query: { redirect: route.query.redirect || '/muro' } })
  } else {
    await router.replace(String(route.query.redirect || '/muro'))
  }
}

function enter2fa(data) {
  challengeToken.value = data.challengeToken
  challengeMethod.value = data.method || 'email'
  challengeDestination.value = data.destination || ''
  otpCode.value = ''
  step.value = '2fa'
  if (data.devFallback) {
    error.value = 'Modo local: el código quedó en el log del backend / mail DEV.'
  }
}

function cancel2fa() {
  step.value = 'login'
  challengeToken.value = ''
  otpCode.value = ''
  error.value = ''
}

watch(
  empCodigo,
  async (v) => {
    if (!v || v.length < 2) {
      applyProductBrandColors()
      tenantHint.value = ''
      splashTitle.value = 'Connectyx'
      splashSubtitle.value = 'Tu comunidad: información y trámites, fácil.'
      logoUrl.value = ''
      loginBgUrl.value = ''
      preLoginBranding.value = null
      ssoProviders.value = []
      ssoHint.value = ''
      return
    }
    try {
      const data = await auth.preLogin(v.trim())
      if (data.found) {
        tenantHint.value = `${data.nombre} · métodos: ${(data.loginMethods || []).join(', ')}`
        const b = data.branding || {}
        const title = b.splash?.title || b.splashTitle || data.nombre || 'Connectyx'
        const subtitle =
          b.splash?.subtitle || b.splashSubtitle || 'Tu comunidad: información y trámites, fácil.'
        splashTitle.value = title
        splashSubtitle.value = subtitle
        logoUrl.value = b.logoUrl || b.splash?.logoUrl || ''
        loginBgUrl.value = b.loginBgUrl || ''
        preLoginBranding.value = b
        preLoginNombre.value = data.nombre || ''
        ssoProviders.value = data.ssoProviders || []
        const enabledNotConfigured = (data.availableSso || []).filter((p) => p.enabled && !p.configured)
        ssoHint.value = enabledNotConfigured.length
          ? `SSO habilitado pero sin env: ${enabledNotConfigured.map((p) => p.label).join(', ')}`
          : ''
        document.documentElement.style.setProperty(
          '--brand-primary',
          b.primary || PRODUCT_PRIMARY,
        )
        document.documentElement.style.setProperty(
          '--brand-secondary',
          b.secondary || PRODUCT_SECONDARY,
        )
        theme.initFromTenant({ themeMode: data.themeMode || 'system' })
        await playPreLoginSplash(b, data.nombre)
      } else {
        tenantHint.value = 'Empresa no encontrada (podés intentar igual)'
        logoUrl.value = ''
        ssoProviders.value = []
        ssoHint.value = ''
        applyProductBrandColors()
        await playPreLoginSplash({}, 'Connectyx')
      }
    } catch {
      tenantHint.value = ''
      logoUrl.value = ''
      ssoProviders.value = []
      applyProductBrandColors()
      await playPreLoginSplash({}, 'Connectyx')
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (route.query.ssoError) {
    error.value = String(route.query.ssoError)
  }
  if (route.query.requires2fa === '1' && route.query.challengeToken) {
    enter2fa({
      challengeToken: String(route.query.challengeToken),
      method: String(route.query.method || 'email'),
      destination: String(route.query.destination || ''),
    })
    return
  }
  if (route.query.sso === '1' && route.query.accessToken && route.query.refreshToken) {
    loading.value = true
    try {
      auth.remember = true
      // Rotar tokens del callback y obtener user+tenant
      const { data } = await api.post(
        '/auth/refresh',
        { refreshToken: String(route.query.refreshToken) },
        { __skipRefresh: true },
      )
      auth.applySession(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          tenant: data.tenant,
        },
        true,
      )
      await afterSession({ user: data.user })
    } catch (e) {
      error.value = e.response?.data?.error || 'No se pudo completar el SSO'
    } finally {
      loading.value = false
    }
    return
  }
  if (route.query.token) {
    loading.value = true
    try {
      const data = await auth.tokenLogin(String(route.query.token), rememberMe.value)
      if (data.requires2fa) enter2fa(data)
      else await afterSession(data)
    } catch (e) {
      error.value = e.response?.data?.error || 'Token de acceso inválido'
    } finally {
      loading.value = false
    }
  }
})

function startSso(provider) {
  const emp = empCodigo.value.trim()
  if (!emp) {
    error.value = 'Indicá la empresa antes de usar SSO'
    return
  }
  const returnTo = String(route.query.redirect || '/muro')
  const base = api.defaults.baseURL || '/api'
  window.location.href = `${base}/auth/sso/${provider}/start?empCodigo=${encodeURIComponent(emp)}&app=u&returnTo=${encodeURIComponent(returnTo)}`
}

async function onFindTenants() {
  error.value = ''
  const id = usuario.value.trim() || ''
  if (!id) {
    error.value = 'Ingresá usuario, ID o email para buscar comunidades'
    return
  }
  loading.value = true
  try {
    const data = await auth.resolveTenants(id)
    if (!data.count) {
      error.value = 'No encontramos comunidades para ese identificador'
      return
    }
    if (data.count === 1) {
      empCodigo.value = data.tenants[0].empCodigo
      return
    }
    tenantChoices.value = data.tenants
    step.value = 'tenants'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo buscar'
  } finally {
    loading.value = false
  }
}

function selectTenant(t) {
  empCodigo.value = t.empCodigo
  step.value = 'login'
}

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const data = await auth.login({
      empCodigo: empCodigo.value.trim(),
      usuario: usuario.value.trim(),
      password: password.value,
      mode: mode.value,
      rememberMe: rememberMe.value,
    })
    if (data.requires2fa) {
      enter2fa(data)
      return
    }
    await afterSession(data)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ingresar'
  } finally {
    loading.value = false
  }
}

async function onVerify2fa() {
  loading.value = true
  error.value = ''
  try {
    const data = await auth.verify2fa({
      challengeToken: challengeToken.value,
      code: otpCode.value.trim(),
      rememberMe: rememberMe.value,
    })
    await afterSession(data)
  } catch (e) {
    error.value = e.response?.data?.error || 'Código incorrecto'
  } finally {
    loading.value = false
  }
}

async function onResend2fa() {
  error.value = ''
  try {
    const data = await auth.resend2fa(challengeToken.value)
    challengeToken.value = data.challengeToken
    challengeDestination.value = data.destination || challengeDestination.value
    error.value = data.devFallback
      ? 'Código reenviado (ver log del backend en local).'
      : 'Código reenviado.'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo reenviar'
  }
}

async function onForgot() {
  forgotLoading.value = true
  forgotMsg.value = ''
  try {
    const { data } = await api.post('/auth/forgot-password', {
      empCodigo: empCodigo.value.trim(),
      usuario: usuario.value.trim(),
    })
    forgotMsg.value = data.message
  } catch {
    forgotMsg.value = 'No se pudo procesar el pedido'
  } finally {
    forgotLoading.value = false
  }
}
</script>

<style scoped>
.login-logo {
  display: block;
  max-width: min(240px, 70vw);
  max-height: 72px;
  width: auto;
  height: auto;
  object-fit: contain;
}
</style>
