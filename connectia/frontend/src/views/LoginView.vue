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
        <p v-else class="font-display text-4xl text-brand tracking-tight">{{ splashTitle }}</p>
        <p class="mt-2 text-sm cx-muted">{{ splashSubtitle }}</p>
      </div>

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
          <input v-model="empCodigo" class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-600/30 cx-input" placeholder="DEMO" autocomplete="organization" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide cx-muted">{{ mode === 'id' ? 'ID / legajo' : 'Usuario' }}</span>
          <input v-model="usuario" class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-600/30 cx-input" :placeholder="mode === 'id' ? '1001' : 'demo'" autocomplete="username" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold uppercase tracking-wide cx-muted">Contraseña</span>
          <input v-model="password" type="password" class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-600/30 cx-input" autocomplete="current-password" />
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { useSplashStore } from '../stores/splash'
import ThemeToggle from '../components/ThemeToggle.vue'
import { resolveMediaUrl } from '../utils/media'

const auth = useAuthStore()
const theme = useThemeStore()
const splash = useSplashStore()
const router = useRouter()
const route = useRoute()

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
const splashTitle = ref('Connectia')
const splashSubtitle = ref('Tu comunidad: información y trámites, fácil.')
const logoUrl = ref('')
const loginBgUrl = ref('')
const preLoginBranding = ref(null)
const preLoginNombre = ref('')
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

watch(
  empCodigo,
  async (v) => {
    if (!v || v.length < 2) return
    try {
      const data = await auth.preLogin(v.trim())
      if (data.found) {
        tenantHint.value = `${data.nombre} · métodos: ${(data.loginMethods || []).join(', ')}`
        const b = data.branding || {}
        const title = b.splash?.title || b.splashTitle || data.nombre || 'Connectia'
        const subtitle =
          b.splash?.subtitle || b.splashSubtitle || 'Tu comunidad: información y trámites, fácil.'
        splashTitle.value = title
        splashSubtitle.value = subtitle
        logoUrl.value = b.logoUrl || b.splash?.logoUrl || ''
        loginBgUrl.value = b.loginBgUrl || ''
        preLoginBranding.value = b
        preLoginNombre.value = data.nombre || ''
        if (b.primary) {
          document.documentElement.style.setProperty('--brand-primary', b.primary)
        }
        if (b.secondary) {
          document.documentElement.style.setProperty('--brand-secondary', b.secondary)
        }
        theme.initFromTenant({ themeMode: data.themeMode || 'system' })
        await playPreLoginSplash(b, data.nombre)
      } else {
        tenantHint.value = 'Empresa no encontrada (podés intentar igual)'
        logoUrl.value = ''
        await playPreLoginSplash({}, 'Connectia')
      }
    } catch {
      tenantHint.value = ''
      logoUrl.value = ''
      await playPreLoginSplash({}, 'Connectia')
    }
  },
  { immediate: true },
)

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
    await splash.play('post', { force: true })
    if (data.user?.needsTerms) {
      await router.replace({ name: 'terms', query: { redirect: route.query.redirect || '/muro' } })
    } else {
      await router.replace(route.query.redirect || '/muro')
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ingresar'
  } finally {
    loading.value = false
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
