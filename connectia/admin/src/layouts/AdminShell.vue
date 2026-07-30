<template>
  <!-- Shell estilo Hiryx MainLayout: chatbot izq · header fijo · sidebar der hover · contenido -->
  <div class="admin-shell flex h-screen" style="background: var(--canvas, #111019)">
    <button
      v-if="isChatbotCollapsed"
      type="button"
      class="admin-fab fixed z-40 flex items-center gap-3 rounded-full border px-3 py-2 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      :class="isMobile ? 'bottom-6 right-6' : 'bottom-6 right-24'"
      title="¿Necesitás ayuda? Abrí el asistente ampliado"
      aria-label="Abrir asistente ampliado"
      @click="openChatbotMaximized"
    >
      <div class="admin-fab__avatar h-12 w-12 flex-shrink-0 overflow-hidden rounded-full ring-2">
        <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
      </div>
      <span class="admin-fab__label whitespace-nowrap pr-1 text-sm font-medium">¿Necesitás ayuda?</span>
    </button>

    <div
      class="admin-chat-rail fixed bottom-0 left-0 z-30 overflow-hidden transition-all duration-300"
      :class="[
        isMobile ? 'top-16' : 'top-20',
        isChatbotCollapsed
          ? 'w-14 border-r shadow-none'
          : 'w-96 border-r shadow-lg',
      ]"
    >
      <AdminShellChatbot v-model:collapsed="isChatbotCollapsed" />
    </div>

    <div
      class="admin-right-rail fixed bottom-0 right-0 z-40 flex justify-end transition-all duration-300 ease-out"
      :class="[isMobile ? 'top-16 w-20' : sidebarHovered ? 'top-20 w-20' : 'top-20 w-10']"
      @mouseenter="!isMobile && onSidebarEnter()"
      @mouseleave="!isMobile && onSidebarLeave()"
    >
      <aside
        class="sidebar flex h-full flex-shrink-0 flex-col overflow-x-hidden overflow-y-hidden border-l border-gray-200 bg-white text-gray-800 shadow-lg transition-all duration-300 ease-out"
        :class="isMobile || sidebarHovered ? 'w-20' : 'w-10'"
      >
        <div
          v-if="!isMobile && !sidebarHovered"
          class="flex h-full w-full items-start justify-center pt-4"
          title="Menú"
        >
          <i class="fas fa-bars text-lg text-gray-600 transition-colors hover:text-purple-600"></i>
        </div>

        <nav v-show="isMobile || sidebarHovered" class="flex flex-1 flex-col justify-end">
          <div class="px-3 py-1">
            <RouterLink
              to="/"
              class="flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
              title="Dashboard"
            >
              <i class="fas fa-home mb-0.5 text-lg"></i>
              <span class="text-center text-[8px] leading-tight">Inicio</span>
            </RouterLink>
          </div>
          <div class="px-3 py-1">
            <button
              type="button"
              class="flex w-full flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
              title="Mapa del sitio"
              @click="showAdminFunctions = true"
            >
              <i class="fas fa-sitemap mb-0.5 text-lg"></i>
              <span class="text-center text-[8px] leading-tight">Mapa</span>
            </button>
          </div>
          <div v-for="pin in sidebarPins" :key="'sb-' + (pin.id || pin.key || pin.route)" class="px-3 py-1">
            <RouterLink
              :to="pin.route"
              class="flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
              :title="pin.label"
            >
              <i :class="[resolveMenuFaIcon(pin), 'mb-0.5 text-lg']"></i>
              <span class="text-center text-[8px] leading-tight">{{ pin.label }}</span>
            </RouterLink>
          </div>
          <div class="mb-4 space-y-1 px-3 py-2">
            <button
              type="button"
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold text-white shadow-md transition-colors hover:bg-purple-700"
              :title="displayName"
              @click="showUserPanel = true"
            >
              {{ userInitials }}
            </button>
            <button
              type="button"
              class="flex w-full flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
              title="Cerrar sesión"
              @click="showUserPanel = true"
            >
              <i class="fas fa-sign-out-alt mb-0.5 text-lg"></i>
              <span class="text-center text-[8px] leading-tight">Salir</span>
            </button>
          </div>
        </nav>
      </aside>
    </div>

    <div
      class="flex min-w-0 flex-1 flex-col transition-all duration-300 md:mr-4 md:pl-2"
      :class="isChatbotCollapsed ? 'md:ml-14' : 'md:ml-96'"
    >
      <header
        class="admin-top-header fixed left-0 top-0 z-30 flex w-full items-center"
        :class="isMobile ? 'h-16 px-2' : 'h-20 px-6'"
      >
        <div v-if="isMobile" class="flex w-full items-center justify-between gap-2">
          <RouterLink to="/" class="flex min-w-0 items-center gap-2">
            <img :src="headerLogo" alt="Connectyx" class="h-8 max-w-[200px] object-contain object-left" />
          </RouterLink>
          <button
            type="button"
            class="header-button flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white"
            @click="showAdminFunctions = true"
          >
            <i class="fas fa-sitemap text-white"></i>
            <span>Mapa</span>
          </button>
          <ThemeToggle />
        </div>

        <div v-else class="flex h-full w-full items-center px-2">
          <RouterLink to="/" class="flex w-[260px] flex-shrink-0 items-center justify-start">
            <img :src="headerLogo" alt="Connectyx" class="h-10 max-w-[240px] object-contain object-left" />
          </RouterLink>

          <div class="flex min-w-0 flex-1 justify-center px-4">
            <div
              class="header-identity flex max-w-full min-w-0 items-center justify-center gap-2.5 text-sm"
              :title="headerIdentityTitle"
            >
              <template v-if="auth.tenant?.nombre || showTenantLogo">
                <img
                  v-if="showTenantLogo"
                  :src="tenantLogoUrl"
                  :alt="auth.tenant?.nombre || 'Cliente'"
                  class="header-tenant__logo h-7 w-auto max-w-[100px] flex-shrink-0 object-contain"
                  @error="tenantLogoBroken = true"
                />
                <span
                  v-if="auth.tenant?.nombre"
                  class="header-tenant__name max-w-[10rem] truncate font-medium"
                  style="color: var(--ink)"
                >
                  {{ auth.tenant.nombre }}
                </span>
                <span class="header-identity__sep flex-shrink-0" aria-hidden="true">·</span>
              </template>
              <span class="header-admin-badge flex-shrink-0 text-sm">
                {{ auth.isPlatformAdmin ? 'Plataforma' : 'Administrador' }}
              </span>
              <template v-if="displayName">
                <span class="header-identity__sep flex-shrink-0" aria-hidden="true">·</span>
                <span class="header-admin-nombre max-w-[12rem] truncate" style="color: var(--ink-soft)">
                  {{ displayName }}
                </span>
              </template>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button
              type="button"
              class="header-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white"
              @click="showAdminFunctions = true"
            >
              <i class="fas fa-sitemap text-xs text-white"></i>
              <span>Mapa del sitio</span>
            </button>
            <RouterLink
              v-for="pin in headerPins"
              :key="'hd-' + (pin.id || pin.key || pin.route)"
              :to="pin.route"
              class="header-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <i :class="[resolveMenuFaIcon(pin), 'text-xs text-white']"></i>
              <span>{{ pin.label }}</span>
            </RouterLink>
            <ThemeToggle />
            <div class="relative flex-shrink-0" data-ai-dropdown>
              <button
                type="button"
                data-ai-dropdown-button
                class="flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-medium shadow-md transition-colors hover:opacity-90"
                style="background-color: #e2d3f8; color: #4c1d95"
                title="Asistentes IA"
                @click.stop="toggleAIAssistantsDropdown"
              >
                <i class="fas fa-magic text-sm" style="color: #4c1d95"></i>
                <span>Asistentes IA</span>
                <i class="fas fa-chevron-down text-[10px]" style="color: #4c1d95"></i>
              </button>
              <div
                v-if="showAIAssistantsDropdown"
                class="absolute right-0 z-[99999] mt-2 w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                data-ai-dropdown
                @click.stop
              >
                <button
                  v-for="option in aiAssistantOptions"
                  :key="option.label"
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-sky-50"
                  @click="handleAIAssistantSelect(option)"
                >
                  <i :class="[option.icon || 'fas fa-magic', 'text-sky-500']" aria-hidden="true"></i>
                  <span class="min-w-0 truncate">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main
        ref="mainEl"
        class="admin-main min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        :class="isMobile ? 'mt-16' : 'mt-20'"
        tabindex="-1"
      >
        <RouterView />
      </main>
    </div>

    <AdminFunctionsModal
      v-model="showAdminFunctions"
      :sections="adminFnSections"
      :can-edit-chrome="canEditMenuChrome"
      @toggle-chrome="onToggleChrome"
    />

    <div
      v-if="showUserPanel"
      class="fixed inset-0 z-[100003] flex items-end justify-end bg-black/40 p-4 sm:items-center sm:justify-center"
      @click.self="showUserPanel = false"
    >
      <div
        class="w-full max-w-sm rounded-xl p-5 shadow-2xl"
        style="background: var(--panel); color: var(--ink); border: 1px solid var(--line)"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        @click.stop
      >
        <div class="mb-4 flex items-center gap-3">
          <div
            v-if="showTenantLogo"
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-purple-200"
          >
            <img :src="tenantLogoUrl" alt="" class="h-full w-full object-contain p-1" @error="tenantLogoBroken = true" />
          </div>
          <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold text-white">
            {{ userInitials }}
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold" style="color: var(--ink)">{{ displayName }}</p>
            <p class="truncate text-xs" style="color: var(--ink-soft)">{{ auth.user?.email || auth.user?.usuario || '' }}</p>
            <p v-if="auth.tenant?.nombre" class="truncate text-xs" style="color: var(--brand-ink)">{{ auth.tenant.nombre }}</p>
          </div>
        </div>
        <p id="logout-confirm-title" class="mb-4 text-sm" style="color: var(--ink-soft)">
          ¿Cerrar sesión en Connectyx Admin?
        </p>
        <button
          type="button"
          class="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style="background-color: var(--brand)"
          :disabled="loggingOut"
          @click.stop="doLogout"
        >
          {{ loggingOut ? 'Saliendo…' : 'Salir' }}
        </button>
        <button
          type="button"
          class="mt-2 w-full rounded-lg px-4 py-2 text-sm"
          style="border: 1px solid var(--line-2); color: var(--ink-soft); background: var(--panel-2)"
          :disabled="loggingOut"
          @click.stop="showUserPanel = false"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { capabilityForRoute } from '../utils/adminCapabilities'
import { PRODUCT_ICON, PRODUCT_LOGO_LIGHT, PRODUCT_LOGO_SVG } from '../constants/brand'
import { useThemeStore } from '../stores/theme'
import { resolveMenuFaIcon, withAdminChromeDefaults, GROUP_HEADER_FA } from '../utils/menuChrome'
import { resolveMediaUrl } from '../utils/media'
import AdminFunctionsModal from '../components/AdminFunctionsModal.vue'
import AdminShellChatbot from '../components/AdminShellChatbot.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const route = useRoute()
const router = useRouter()
const headerLogo = computed(() => (theme.resolved === 'dark' ? PRODUCT_LOGO_SVG : PRODUCT_LOGO_LIGHT))

/** Logo de la comunidad/cliente (además del nombre en el centro del header). */
const tenantLogoUrl = computed(() => {
  const b = auth.tenant?.branding || {}
  const raw = b.logoUrl || b.splash?.logoUrl || ''
  return resolveMediaUrl(raw)
})
const tenantLogoBroken = ref(false)
watch(tenantLogoUrl, () => {
  tenantLogoBroken.value = false
})
const showTenantLogo = computed(() => Boolean(tenantLogoUrl.value) && !tenantLogoBroken.value)
const apiMenu = ref([])
const openGroups = reactive({})
const mainEl = ref(null)

const isChatbotCollapsed = ref(true)

/** Paridad Hiryx: FAB / atajo abre rail + modal maximizado. */
function openChatbotMaximized() {
  isChatbotCollapsed.value = false
  window.dispatchEvent(new CustomEvent('expand-chatbot'))
}
const showAdminFunctions = ref(false)
const showUserPanel = ref(false)
const loggingOut = ref(false)
const sidebarHovered = ref(false)
const isMobile = ref(false)
const showAIAssistantsDropdown = ref(false)
let sidebarHoverTimeout = null

/** Dropdown header — asistentes / pantallas IA disponibles en Connectyx Admin. */
const aiAssistantOptionsBase = [
  {
    label: 'Asistente Admin',
    description: 'Chat del panel',
    icon: 'fas fa-comments',
    action: 'openChat',
  },
  {
    label: 'Base de conocimientos',
    route: '/asistente-kb',
    icon: 'fas fa-book',
  },
  {
    label: 'Asistente de comunicaciones',
    route: '/comunicaciones',
    icon: 'fas fa-envelope',
  },
  {
    label: 'Notificaciones (copy IA)',
    route: '/notificaciones',
    icon: 'fas fa-bell',
  },
  {
    label: 'Live streaming',
    route: '/live',
    icon: 'fas fa-broadcast-tower',
  },
  {
    label: 'Modo TV',
    route: '/modo-tv',
    icon: 'fas fa-tv',
  },
  {
    label: 'Centro de ayuda',
    route: '/ayuda',
    icon: 'fas fa-question-circle',
  },
]

const aiAssistantOptions = computed(() =>
  aiAssistantOptionsBase.filter((o) => {
    if (o.action === 'openChat') return true
    if (!o.route) return false
    return canQuick(o.route)
  }),
)

function toggleAIAssistantsDropdown() {
  showAIAssistantsDropdown.value = !showAIAssistantsDropdown.value
}

function handleAIAssistantSelect(option) {
  showAIAssistantsDropdown.value = false
  if (option?.action === 'openChat') {
    openChatbotMaximized()
    return
  }
  if (option?.route) router.push(option.route).catch(() => {})
}

function onDocClickAiDropdown(e) {
  if (!showAIAssistantsDropdown.value) return
  const t = e.target
  if (t?.closest?.('[data-ai-dropdown]')) return
  showAIAssistantsDropdown.value = false
}

function checkMobile() {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

function onSidebarEnter() {
  if (sidebarHoverTimeout) {
    clearTimeout(sidebarHoverTimeout)
    sidebarHoverTimeout = null
  }
  sidebarHovered.value = true
}

function onSidebarLeave() {
  sidebarHoverTimeout = setTimeout(() => {
    sidebarHovered.value = false
    sidebarHoverTimeout = null
  }, 150)
}

const displayName = computed(() => {
  const u = auth.user
  if (!u) return ''
  return u.nombreCompleto || u.name || u.nombre || u.usuario || u.email || 'Usuario'
})

const headerIdentityTitle = computed(() => {
  const parts = [
    auth.tenant?.nombre,
    auth.isPlatformAdmin ? 'Plataforma' : 'Administrador',
    displayName.value,
  ].filter(Boolean)
  return parts.join(' · ')
})

const userInitials = computed(() => {
  const n = String(displayName.value || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

function canQuick(path) {
  if (auth.isPlatformAdmin) return path === '/' || path === '/suscriptores'
  const cap = capabilityForRoute(path)
  if (!cap) return true
  return auth.can(cap)
}

const canEditMenuChrome = computed(() => auth.can('admin.menu') || auth.isFullAdmin)

const sidebarPins = computed(() =>
  flatMenu.value.filter(
    (i) => i.showInAdminSidebar && i.route && i.route !== '/' && canQuick(i.route),
  ),
)

const headerPins = computed(() =>
  flatMenu.value.filter(
    (i) => i.showInAdminHeader && i.route && i.route !== '/' && canQuick(i.route),
  ),
)

const adminFnSections = computed(() => {
  const sections = []
  const loose = []
  for (const entry of menuTree.value) {
    if (entry.type === 'link') {
      loose.push({
        id: entry.id,
        key: entry.key,
        label: entry.label,
        route: entry.route,
        icon: resolveMenuFaIcon(entry),
        showInAdminSidebar: Boolean(entry.showInAdminSidebar),
        showInAdminHeader: Boolean(entry.showInAdminHeader),
      })
    } else {
      sections.push({
        title: entry.label,
        headerIcon: GROUP_HEADER_FA[entry.id] || 'fas fa-folder-open',
        items: (entry.items || []).map((i) => ({
          id: i.id,
          key: i.key,
          label: i.label,
          route: i.route,
          icon: resolveMenuFaIcon(i),
          showInAdminSidebar: Boolean(i.showInAdminSidebar),
          showInAdminHeader: Boolean(i.showInAdminHeader),
        })),
      })
    }
  }
  if (loose.length) {
    sections.unshift({ title: 'Inicio', headerIcon: GROUP_HEADER_FA.inicio, items: loose })
  }
  return sections
})

async function reloadApiMenu() {
  if (auth.isPlatformAdmin) return
  try {
    const { data } = await api.get('/menu', { params: { channel: 'a' } })
    apiMenu.value = (data.items || []).map(withAdminChromeDefaults)
  } catch {
    /* keep previous */
  }
}

async function onToggleChrome({ id, field, value }) {
  if (!id || (field !== 'showInAdminSidebar' && field !== 'showInAdminHeader')) return
  // Optimistic update en apiMenu
  const idx = apiMenu.value.findIndex((i) => String(i.id) === String(id))
  if (idx >= 0) {
    apiMenu.value[idx] = { ...apiMenu.value[idx], [field]: Boolean(value) }
  }
  try {
    await api.patch(`/admin/menu/${id}`, { [field]: Boolean(value) })
  } catch {
    await reloadApiMenu()
  }
}

async function doLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  showUserPanel.value = false
  try {
    // Limpia tokens en localStorage de forma síncrona; el POST al API no debe bloquear.
    await Promise.race([
      auth.logout().catch(() => {}),
      new Promise((r) => setTimeout(r, 400)),
    ])
  } finally {
    // Hard navigation: evita quedar atrapado dentro de AdminShell / guards.
    window.location.assign('/login')
  }
}

async function scrollContentToTop() {
  await nextTick()
  if (mainEl.value) mainEl.value.scrollTop = 0
  window.scrollTo(0, 0)
  mainEl.value?.focus?.({ preventScroll: true })
}

const platformMenu = [
  { key: 'home', label: 'Dashboard', route: '/' },
  { key: 'subs', label: 'Suscriptores', route: '/suscriptores' },
]

const fallbackMenu = [
  { key: 'home', label: 'Dashboard', route: '/' },
  { key: 'usuarios', label: 'Usuarios', route: '/usuarios' },
  { key: 'legajos', label: 'Listado de legajos', route: '/legajos' },
  { key: 'catalogos-rrhh', label: 'Catálogos RRHH', route: '/catalogos-rrhh' },
  { key: 'onboarding', label: 'Onboarding y egreso', route: '/onboarding' },
  { key: 'org', label: 'Organización', route: '/organizacion' },
  { key: 'roles', label: 'Roles y permisos', route: '/roles' },
  { key: 'parametros', label: 'Parámetros', route: '/parametros' },
  { key: 'solicitudes', label: 'Bandeja', route: '/solicitudes' },
  { key: 'enviar', label: 'Pedir datos a un grupo', route: '/enviar-solicitud' },
  { key: 'tipos', label: 'Plantillas', route: '/tipos-solicitud' },
  { key: 'estados', label: 'Estados', route: '/estados-solicitud' },
  { key: 'licencias', label: 'Licencias', route: '/licencias' },
  { key: 'tipos-licencia', label: 'Tipos de licencia', route: '/tipos-licencia' },
  { key: 'feriados', label: 'Feriados', route: '/feriados' },
  { key: 'ausentismos', label: 'Ausentismos', route: '/ausentismos' },
  { key: 'pubs', label: 'Publicaciones', route: '/publicaciones' },
  { key: 'stories', label: 'Stories', route: '/stories' },
  { key: 'postcats', label: 'Categorías de pubs', route: '/categorias-publicaciones' },
  { key: 'newsletters', label: 'Newsletters', route: '/newsletters' },
  { key: 'comunicaciones', label: 'Comunicaciones', route: '/comunicaciones' },
  { key: 'engagement', label: 'Emociones', route: '/emociones' },
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas' },
  { key: 'notificaciones', label: 'Notificaciones', route: '/notificaciones' },
  { key: 'saludos', label: 'Saludos automáticos', route: '/saludos' },
  { key: 'workflows', label: 'Flujos de Aprobación', route: '/workflows' },
  { key: 'moderacion-comentarios', label: 'Moderación de comentarios', route: '/moderacion-comentarios' },
  { key: 'documentos', label: 'Documentos', route: '/documentos' },
  { key: 'directorio', label: 'Datos útiles', route: '/directorio' },
  { key: 'eventos', label: 'Eventos', route: '/eventos' },
  { key: 'beneficios', label: 'Beneficios y billetera', route: '/beneficios' },
  { key: 'reservas', label: 'Reserva de espacios', route: '/reservas' },
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda' },
  { key: 'politicas', label: 'Políticas y cumplimiento', route: '/politicas' },
  { key: 'accesos', label: 'Enlaces', route: '/accesos' },
  { key: 'chatmod', label: 'Moderación de chat', route: '/chat-moderacion' },
  { key: 'comunidad', label: 'Comunidad', route: '/comunidad' },
  { key: 'menu', label: 'Menú dinámico', route: '/menu' },
  { key: 'kb', label: 'Base de conocimientos', route: '/asistente-kb' },
]

/** Grupos del menú admin: label + matching por route/key */
const MENU_GROUPS = [
  {
    id: 'solicitudes',
    label: 'Procesos',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        r.includes('solicitud') ||
        r === '/workflows' ||
        r === '/relevamientos' ||
        [
          'admin.requests',
          'admin.reqsend',
          'admin.reqtypes',
          'admin.reqstates',
          'admin.workflows',
          'admin.relevamientos',
          'solicitudes',
          'enviar',
          'tipos',
          'estados',
          'workflows',
          'relevamientos',
        ].includes(k)
      )
    },
  },
  {
    id: 'herramientas',
    label: 'Herramientas',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/reservas', '/pedidos', '/encuestas'].includes(r) ||
        [
          'admin.reservas',
          'admin.pedidos',
          'admin.surveys',
          'reservas',
          'pedidos',
          'encuestas',
        ].includes(k)
      )
    },
  },
  {
    id: 'licencias',
    label: 'Licencias y ausentismos',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/licencias', '/tipos-licencia', '/ausentismos', '/asistencia'].includes(r) ||
        [
          'admin.licencias',
          'admin.tipos-licencia',
          'admin.ausentismos',
          'admin.asistencia',
          'licencias',
          'tipos-licencia',
          'ausentismos',
          'asistencia',
        ].includes(k)
      )
    },
  },
  {
    id: 'personas',
    label: 'Personas',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        r === '/usuarios' ||
        r === '/organizacion' ||
        r === '/roles' ||
        r === '/documentos' ||
        [
          'admin.users',
          'admin.org',
          'admin.roles',
          'admin.docs',
          'usuarios',
          'org',
          'roles',
          'documentos',
        ].includes(k)
      )
    },
  },
  {
    id: 'empleados',
    label: 'Empleados',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/catalogos-rrhh', '/onboarding', '/talento', '/cultura', '/politicas'].includes(r) ||
        [
          'admin.hrcatalog',
          'admin.onboarding',
          'admin.talento',
          'admin.cultura',
          'admin.politicas',
          'hrcatalog',
          'onboarding',
          'talento',
          'cultura',
          'politicas',
        ].includes(k)
      )
    },
  },
  {
    id: 'negocio',
    label: 'Configuración de Negocio',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/legajos', '/feriados', '/categorias-publicaciones'].includes(r) ||
        [
          'admin.legajos',
          'legajos',
          'admin.feriados',
          'feriados',
          'admin.postcats',
          'postcats',
          'categorias-publicaciones',
        ].includes(k)
      )
    },
  },
  {
    id: 'contenido',
    label: 'Contenido',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/publicaciones', '/stories', '/saludos', '/eventos', '/beneficios', '/directorio'].includes(r) ||
        [
          'admin.pubs',
          'admin.stories',
          'admin.saludos',
          'admin.eventos',
          'admin.beneficios',
          'admin.directorio',
          'pubs',
          'stories',
          'saludos',
          'eventos',
          'beneficios',
          'directorio',
        ].includes(k)
      )
    },
  },
  {
    id: 'comunicaciones',
    label: 'Comunicaciones',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/comunicaciones', '/notificaciones', '/newsletters'].includes(r) ||
        [
          'admin.comunicaciones',
          'admin.notifications',
          'admin.newsletters',
          'comunicaciones',
          'notificaciones',
          'newsletters',
        ].includes(k)
      )
    },
  },
  {
    id: 'analisis',
    label: 'Análisis y Moderación',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/emociones', '/moderacion-comentarios', '/chat-moderacion'].includes(r) ||
        [
          'admin.engagement',
          'admin.comentarios',
          'admin.chatmod',
          'engagement',
          'moderacion-comentarios',
          'chatmod',
        ].includes(k)
      )
    },
  },
  {
    id: 'recursos',
    label: 'Recursos',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/ayuda', '/modo-tv', '/live'].includes(r) ||
        [
          'admin.ayuda',
          'admin.tv',
          'admin.live',
          'ayuda',
          'modo-tv',
          'tv',
          'live',
        ].includes(k)
      )
    },
  },
  {
    id: 'config',
    label: 'Configuración general',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        ['/comunidad', '/menu', '/parametros', '/asistente-kb', '/accesos'].includes(r) ||
        [
          'admin.tenants',
          'admin.menu',
          'admin.params',
          'admin.kb',
          'admin.ia',
          'admin.hub',
          'comunidad',
          'menu',
          'parametros',
          'asistente-kb',
          'kb',
          'accesos',
          'hub',
        ].includes(k)
      )
    },
  },
]

function allowedMenuItem(item) {
  if (item.route === '/' || item.key === 'home' || item.key === 'admin.home') return true
  const cap = capabilityForRoute(item.route)
  if (!cap) return auth.isFullAdmin
  return auth.can(cap)
}

/** Si el menú en DB aún no tiene Beneficios, lo insertamos tras Datos útiles / Documentos. */
function withBeneficiosLink(items) {
  if (!auth.can('admin.beneficios')) return items
  if (
    items.some(
      (i) => i.route === '/beneficios' || i.key === 'admin.beneficios' || i.key === 'beneficios',
    )
  ) {
    return items.map((i) =>
      i.route === '/beneficios' || i.key === 'admin.beneficios' || i.key === 'beneficios'
        ? { ...i, label: 'Beneficios y billetera' }
        : i,
    )
  }
  const entry = {
    key: 'admin.beneficios',
    label: 'Beneficios y billetera',
    route: '/beneficios',
    icon: 'gift',
  }
  const dirIdx = items.findIndex(
    (i) => i.route === '/directorio' || i.key === 'admin.directorio' || i.key === 'directorio',
  )
  const docsIdx = items.findIndex(
    (i) => i.route === '/documentos' || i.key === 'admin.docs' || i.key === 'documentos',
  )
  const at = dirIdx >= 0 ? dirIdx + 1 : docsIdx >= 0 ? docsIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Reserva de espacios / coworking (ola 21). */
function withReservasLink(items) {
  if (!auth.can('admin.reservas')) return items
  if (
    items.some(
      (i) => i.route === '/reservas' || i.key === 'admin.reservas' || i.key === 'reservas',
    )
  ) {
    return items.map((i) =>
      i.route === '/reservas' || i.key === 'admin.reservas' || i.key === 'reservas'
        ? { ...i, label: 'Reserva de espacios' }
        : i,
    )
  }
  const entry = {
    key: 'admin.reservas',
    label: 'Reserva de espacios',
    route: '/reservas',
    icon: 'building',
  }
  const benIdx = items.findIndex(
    (i) => i.route === '/beneficios' || i.key === 'admin.beneficios' || i.key === 'beneficios',
  )
  const dirIdx = items.findIndex(
    (i) => i.route === '/directorio' || i.key === 'admin.directorio' || i.key === 'directorio',
  )
  const at = benIdx >= 0 ? benIdx + 1 : dirIdx >= 0 ? dirIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Eventos / calendario (ola 15) en Contenido. */
function withEventosLink(items) {
  if (!auth.can('admin.eventos')) return items
  if (
    items.some(
      (i) => i.route === '/eventos' || i.key === 'admin.eventos' || i.key === 'eventos',
    )
  ) {
    return items.map((i) =>
      i.route === '/eventos' || i.key === 'admin.eventos' || i.key === 'eventos'
        ? { ...i, label: 'Eventos' }
        : i,
    )
  }
  const entry = {
    key: 'admin.eventos',
    label: 'Eventos',
    route: '/eventos',
    icon: 'calendar',
  }
  const saludosIdx = items.findIndex(
    (i) => i.route === '/saludos' || i.key === 'admin.saludos' || i.key === 'saludos',
  )
  const notifIdx = items.findIndex(
    (i) => i.route === '/notificaciones' || i.key === 'admin.notifications' || i.key === 'notificaciones',
  )
  const pubsIdx = items.findIndex(
    (i) => i.route === '/publicaciones' || i.key === 'admin.pubs' || i.key === 'pubs',
  )
  const at =
    saludosIdx >= 0 ? saludosIdx + 1 : notifIdx >= 0 ? notifIdx + 1 : pubsIdx >= 0 ? pubsIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Si el menú en DB aún no tiene Datos útiles, lo insertamos en Recursos (tras Documentos). */
function withDirectorioLink(items) {
  if (!auth.can('admin.directorio')) return items
  if (items.some((i) => i.route === '/directorio' || i.key === 'admin.directorio' || i.key === 'directorio')) {
    return items.map((i) =>
      i.route === '/directorio' || i.key === 'admin.directorio' || i.key === 'directorio'
        ? { ...i, label: 'Datos útiles' }
        : i,
    )
  }
  const entry = { key: 'admin.directorio', label: 'Datos útiles', route: '/directorio', icon: 'grid' }
  const docsIdx = items.findIndex(
    (i) => i.route === '/documentos' || i.key === 'admin.docs' || i.key === 'documentos',
  )
  if (docsIdx >= 0) {
    const next = [...items]
    next.splice(docsIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Si el menú en DB aún no tiene Listado de legajos, lo insertamos tras Usuarios. */
function withLegajosLink(items) {
  if (!auth.can('admin.legajos')) return items
  const existingIdx = items.findIndex(
    (i) => i.route === '/legajos' || i.key === 'admin.legajos' || i.key === 'legajos',
  )
  if (existingIdx >= 0) {
    const cur = items[existingIdx]
    if (cur.label === 'Listado de legajos') return items
    const next = [...items]
    next[existingIdx] = { ...cur, label: 'Listado de legajos' }
    return next
  }
  const entry = { key: 'admin.legajos', label: 'Listado de legajos', route: '/legajos', icon: 'file' }
  const usersIdx = items.findIndex(
    (i) => i.route === '/usuarios' || i.key === 'admin.users' || i.key === 'usuarios',
  )
  if (usersIdx >= 0) {
    const next = [...items]
    next.splice(usersIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Catálogos RRHH (§14.10) tras Legajos. */
function withCatalogosRrhhLink(items) {
  if (!auth.can('admin.legajos')) return items
  if (
    items.some(
      (i) =>
        i.route === '/catalogos-rrhh' || i.key === 'admin.hrcatalog' || i.key === 'hrcatalog',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.hrcatalog',
    label: 'Catálogos RRHH',
    route: '/catalogos-rrhh',
    icon: 'tag',
  }
  const legIdx = items.findIndex(
    (i) => i.route === '/legajos' || i.key === 'admin.legajos' || i.key === 'legajos',
  )
  if (legIdx >= 0) {
    const next = [...items]
    next.splice(legIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Onboarding / egreso (§16) tras Catálogos o Legajos. */
function withOnboardingLink(items) {
  if (!auth.can('admin.onboarding')) return items
  if (
    items.some(
      (i) => i.route === '/onboarding' || i.key === 'admin.onboarding' || i.key === 'onboarding',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.onboarding',
    label: 'Onboarding y egreso',
    route: '/onboarding',
    icon: 'sparkles',
  }
  const catIdx = items.findIndex(
    (i) => i.route === '/catalogos-rrhh' || i.key === 'admin.hrcatalog',
  )
  const legIdx = items.findIndex(
    (i) => i.route === '/legajos' || i.key === 'admin.legajos' || i.key === 'legajos',
  )
  const at = catIdx >= 0 ? catIdx + 1 : legIdx >= 0 ? legIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Roles y permisos (§27.10) tras Organización o Usuarios. */
function withRolesLink(items) {
  if (!auth.can('admin.roles')) return items
  if (items.some((i) => i.route === '/roles' || i.key === 'admin.roles' || i.key === 'roles')) {
    return items
  }
  const entry = { key: 'admin.roles', label: 'Roles y permisos', route: '/roles', icon: 'shield' }
  const orgIdx = items.findIndex(
    (i) => i.route === '/organizacion' || i.key === 'admin.org' || i.key === 'org',
  )
  const usersIdx = items.findIndex(
    (i) => i.route === '/usuarios' || i.key === 'admin.users' || i.key === 'usuarios',
  )
  const at = orgIdx >= 0 ? orgIdx + 1 : usersIdx >= 0 ? usersIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Parámetros tipados (§27.03) junto a Comunidad. */
function withParametrosLink(items) {
  if (!auth.can('admin.parametros')) return items
  if (items.some((i) => i.route === '/parametros' || i.key === 'admin.params' || i.key === 'parametros')) {
    return items
  }
  const entry = { key: 'admin.params', label: 'Parámetros', route: '/parametros', icon: 'sliders' }
  const comIdx = items.findIndex(
    (i) => i.route === '/comunidad' || i.key === 'admin.tenants' || i.key === 'comunidad',
  )
  if (comIdx >= 0) {
    const next = [...items]
    next.splice(comIdx, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Stories (Ola 3) tras Publicaciones. */
function withStoriesLink(items) {
  if (!auth.can('admin.publicaciones')) return items
  if (items.some((i) => i.route === '/stories' || i.key === 'admin.stories' || i.key === 'stories')) {
    return items
  }
  const entry = {
    key: 'admin.stories',
    label: 'Stories',
    route: '/stories',
    icon: 'sparkles',
  }
  const pubsIdx = items.findIndex(
    (i) => i.route === '/publicaciones' || i.key === 'admin.pubs' || i.key === 'pubs',
  )
  if (pubsIdx >= 0) {
    const next = [...items]
    next.splice(pubsIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Categorías de publicaciones (§27.02) tras Publicaciones. */
function withCategoriasPubsLink(items) {
  if (!auth.can('admin.publicaciones')) return items
  if (
    items.some(
      (i) =>
        i.route === '/categorias-publicaciones' ||
        i.key === 'admin.postcats' ||
        i.key === 'postcats',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.postcats',
    label: 'Categorías de pubs',
    route: '/categorias-publicaciones',
    icon: 'tag',
  }
  const pubsIdx = items.findIndex(
    (i) => i.route === '/publicaciones' || i.key === 'admin.pubs' || i.key === 'pubs',
  )
  if (pubsIdx >= 0) {
    const next = [...items]
    next.splice(pubsIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Si el menú en DB aún no tiene Ayuda / Políticas, los insertamos tras Documentos. */
function withAyudaPoliticasLinks(items) {
  let next = [...items]
  const docsIdx = next.findIndex(
    (i) => i.route === '/documentos' || i.key === 'admin.docs' || i.key === 'documentos',
  )
  const insertAt = docsIdx >= 0 ? docsIdx + 1 : next.length

  if (auth.can('admin.ayuda') && !next.some((i) => i.route === '/ayuda' || i.key === 'admin.ayuda' || i.key === 'ayuda')) {
    next.splice(insertAt, 0, { key: 'admin.ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help' })
  }
  const ayudaIdx = next.findIndex((i) => i.route === '/ayuda' || i.key === 'admin.ayuda')
  const polAt = ayudaIdx >= 0 ? ayudaIdx + 1 : insertAt + 1
  if (
    auth.can('admin.politicas') &&
    !next.some((i) => i.route === '/politicas' || i.key === 'admin.politicas' || i.key === 'politicas')
  ) {
    next.splice(polAt, 0, {
      key: 'admin.politicas',
      label: 'Políticas y cumplimiento',
      route: '/politicas',
      icon: 'shield',
    })
  }
  return next
}

/** Si el menú en DB aún no tiene Emociones, lo insertamos tras Publicaciones. */
function withEngagementLink(items) {
  if (!auth.can('admin.publicaciones')) return items
  if (items.some((i) => i.route === '/emociones' || i.key === 'admin.engagement')) return items
  const entry = { key: 'admin.engagement', label: 'Emociones', route: '/emociones', icon: 'heart' }
  const pubsIdx = items.findIndex((i) => i.route === '/publicaciones' || i.key === 'admin.pubs' || i.key === 'pubs')
  if (pubsIdx >= 0) {
    const next = [...items]
    next.splice(pubsIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Newsletters (moderación/auditoría) tras Emociones o Publicaciones. */
function withNewslettersLink(items) {
  if (!auth.can('admin.publicaciones')) return items
  if (items.some((i) => i.route === '/newsletters' || i.key === 'admin.newsletters' || i.key === 'newsletters')) {
    return items
  }
  const entry = { key: 'admin.newsletters', label: 'Newsletters', route: '/newsletters', icon: 'mail' }
  const emoIdx = items.findIndex((i) => i.route === '/emociones' || i.key === 'admin.engagement')
  const pubsIdx = items.findIndex((i) => i.route === '/publicaciones' || i.key === 'admin.pubs' || i.key === 'pubs')
  const at = emoIdx >= 0 ? emoIdx + 1 : pubsIdx >= 0 ? pubsIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Centro de comunicaciones (Ola 28). */
function withComunicacionesLink(items) {
  if (!auth.can('admin.comunicaciones') && !auth.isFullAdmin) return items
  if (
    items.some(
      (i) =>
        i.route === '/comunicaciones' ||
        i.key === 'admin.comunicaciones' ||
        i.key === 'comunicaciones',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.comunicaciones',
    label: 'Comunicaciones',
    route: '/comunicaciones',
    icon: 'mail',
  }
  const nlIdx = items.findIndex((i) => i.route === '/newsletters' || i.key === 'admin.newsletters')
  if (nlIdx >= 0) {
    const next = [...items]
    next.splice(nlIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

function groupForItem(item) {
  return MENU_GROUPS.find((g) => g.match(item)) || null
}

const LABEL_BY_ROUTE = {
  '/moderacion-comentarios': 'Moderación de comentarios',
  '/chat-moderacion': 'Moderación de chat',
  '/workflows': 'Flujos de Aprobación',
  '/directorio': 'Datos útiles',
  '/asistente-kb': 'Base de conocimientos',
  '/asistencia': 'Asistencia y turnos',
  '/pedidos': 'Alarmas',
}

function withCanonicalLabels(items) {
  return items.map((item) => {
    const label = LABEL_BY_ROUTE[item.route]
    return label && item.label !== label ? { ...item, label } : item
  })
}

/** Licencias / ausentismos (ola 17): grupo propio en el menú. */
function withLicenciasLinks(items) {
  const next = [...items]
  const has = (route) => next.some((i) => i.route === route)

  const desired = []
  if (auth.can('admin.licencias')) {
    if (!has('/feriados')) {
      desired.push({ key: 'admin.feriados', label: 'Feriados', route: '/feriados', order: 19.55 })
    }
    if (!has('/licencias')) {
      desired.push({ key: 'admin.licencias', label: 'Licencias', route: '/licencias', order: 19.6 })
    }
    if (!has('/tipos-licencia')) {
      desired.push({
        key: 'admin.tipos-licencia',
        label: 'Tipos de licencia',
        route: '/tipos-licencia',
        order: 19.7,
      })
    }
  }
  if (auth.can('admin.ausentismos') && !has('/ausentismos')) {
    desired.push({ key: 'admin.ausentismos', label: 'Ausentismos', route: '/ausentismos', order: 19.8 })
  }

  if (!desired.length) return next

  const estadosIdx = next.findIndex(
    (i) =>
      i.route === '/estados-solicitud' ||
      i.route === '/tipos-solicitud' ||
      i.route === '/solicitudes' ||
      String(i.key || '').includes('req'),
  )
  let at = estadosIdx >= 0 ? estadosIdx + 1 : next.length
  for (const item of desired) {
    next.splice(at, 0, item)
    at += 1
  }
  return next
}

/** Base de conocimientos (asistente) en Configuración general. */
function withKbLink(items) {
  if (!auth.can('admin.ia')) return items
  if (
    items.some(
      (i) =>
        i.route === '/asistente-kb' ||
        i.key === 'admin.kb' ||
        i.key === 'admin.ia' ||
        i.key === 'kb' ||
        i.key === 'asistente-kb',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.kb',
    label: 'Base de conocimientos',
    route: '/asistente-kb',
    icon: 'sparkles',
  }
  const menuIdx = items.findIndex(
    (i) => i.route === '/menu' || i.key === 'admin.menu' || i.key === 'menu',
  )
  const comunidadIdx = items.findIndex(
    (i) => i.route === '/comunidad' || i.key === 'admin.tenants' || i.key === 'comunidad',
  )
  const at = menuIdx >= 0 ? menuIdx + 1 : comunidadIdx >= 0 ? comunidadIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

const flatMenu = computed(() => {
  if (auth.isPlatformAdmin) return platformMenu
  const source = apiMenu.value.length ? apiMenu.value : fallbackMenu
  const enriched = withCanonicalLabels(
    withKbLink(
      withChatModLink(
        withModeracionLink(
          withWorkflowsLink(
            withSaludosLink(
              withNotificacionesLink(
                withComunicacionesLink(
                withNewslettersLink(
                  withEngagementLink(
                    withCategoriasPubsLink(
                      withStoriesLink(
                      withAyudaPoliticasLinks(
                        withReservasLink(
                          withBeneficiosLink(
                            withEventosLink(
                              withDirectorioLink(
                                withParametrosLink(
                                  withRolesLink(
                                    withLicenciasLinks(
                                      withOnboardingLink(
                                        withCatalogosRrhhLink(
                                          withLegajosLink(source.filter(allowedMenuItem)),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    ),
                  ),
                ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
  return enriched.map(withAdminChromeDefaults)
})

/** Workflows / aprobaciones dentro del grupo Solicitudes. */
function withWorkflowsLink(items) {
  if (!auth.can('admin.workflows')) return items
  if (
    items.some(
      (i) => i.route === '/workflows' || i.key === 'admin.workflows' || i.key === 'workflows',
    )
  ) {
    return items
  }
  const entry = { key: 'admin.workflows', label: 'Flujos de Aprobación', route: '/workflows', icon: 'flow' }
  const estadosIdx = items.findIndex(
    (i) =>
      i.route === '/estados-solicitud' ||
      i.route === '/tipos-solicitud' ||
      i.route === '/solicitudes' ||
      String(i.key || '').includes('req'),
  )
  if (estadosIdx >= 0) {
    const next = [...items]
    next.splice(estadosIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Notificaciones push/campañas tras Encuestas o Contenido. */
function withNotificacionesLink(items) {
  if (!auth.can('admin.notificaciones')) return items
  if (items.some((i) => i.route === '/notificaciones' || i.key === 'admin.notifications' || i.key === 'notificaciones')) {
    return items
  }
  const entry = { key: 'admin.notifications', label: 'Notificaciones', route: '/notificaciones', icon: 'bell' }
  const encIdx = items.findIndex((i) => i.route === '/encuestas' || i.key === 'admin.surveys' || i.key === 'encuestas')
  const at = encIdx >= 0 ? encIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Saludos / celebraciones tras Notificaciones. */
function withSaludosLink(items) {
  if (!auth.can('admin.saludos')) return items
  if (items.some((i) => i.route === '/saludos' || i.key === 'admin.saludos' || i.key === 'saludos')) {
    return items
  }
  const entry = { key: 'admin.saludos', label: 'Saludos automáticos', route: '/saludos', icon: 'heart' }
  const notifIdx = items.findIndex(
    (i) => i.route === '/notificaciones' || i.key === 'admin.notifications' || i.key === 'notificaciones',
  )
  const at = notifIdx >= 0 ? notifIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Moderación de comentarios tras Saludos (o Notificaciones). */
function withModeracionLink(items) {
  if (!auth.can('admin.comentarios')) return items
  if (
    items.some(
      (i) =>
        i.route === '/moderacion-comentarios' ||
        i.key === 'admin.comentarios' ||
        i.key === 'moderacion-comentarios',
    )
  ) {
    return items
  }
  const entry = {
    key: 'admin.comentarios',
    label: 'Moderación de comentarios',
    route: '/moderacion-comentarios',
    icon: 'shield',
  }
  const saludosIdx = items.findIndex(
    (i) => i.route === '/saludos' || i.key === 'admin.saludos' || i.key === 'saludos',
  )
  const notifIdx = items.findIndex(
    (i) => i.route === '/notificaciones' || i.key === 'admin.notifications' || i.key === 'notificaciones',
  )
  const at = saludosIdx >= 0 ? saludosIdx + 1 : notifIdx >= 0 ? notifIdx + 1 : -1
  if (at >= 0) {
    const next = [...items]
    next.splice(at, 0, entry)
    return next
  }
  return [...items, entry]
}

/** Chat moderación tras Enlaces / Recursos. */
function withChatModLink(items) {
  if (!auth.can('admin.chat')) return items
  if (items.some((i) => i.route === '/chat-moderacion' || i.key === 'admin.chatmod' || i.key === 'chatmod')) {
    return items
  }
  const entry = { key: 'admin.chatmod', label: 'Moderación de chat', route: '/chat-moderacion', icon: 'chat' }
  const hubIdx = items.findIndex((i) => i.route === '/accesos' || i.key === 'admin.hub' || i.key === 'accesos')
  if (hubIdx >= 0) {
    const next = [...items]
    next.splice(hubIdx + 1, 0, entry)
    return next
  }
  return [...items, entry]
}

const menuTree = computed(() => {
  const items = flatMenu.value
  const used = new Set()
  const tree = []

  // Enlaces sueltos primero (Dashboard, etc.)
  for (const item of items) {
    if (groupForItem(item)) continue
    tree.push({
      type: 'link',
      id: item.id,
      key: item.key,
      label: item.label,
      route: item.route,
      icon: item.icon,
      showInAdminSidebar: Boolean(item.showInAdminSidebar),
      showInAdminHeader: Boolean(item.showInAdminHeader),
    })
    used.add(item.key || item.route)
  }

  for (const group of MENU_GROUPS) {
    const children = items.filter((item) => {
      const id = item.key || item.route
      if (used.has(id)) return false
      return group.match(item)
    })
    if (!children.length) continue
    for (const c of children) used.add(c.key || c.route)
    const sorted =
      group.id === 'licencias'
        ? [...children].sort((a, b) => {
            const rank = (item) => {
              const r = String(item.route || '')
              if (r === '/licencias') return 1
              if (r === '/tipos-licencia') return 2
              if (r === '/ausentismos') return 3
              if (r === '/asistencia') return 4
              return 50
            }
            return rank(a) - rank(b)
          })
        : children
    tree.push({
      type: 'group',
      id: group.id,
      label: group.label,
      items: sorted,
    })
  }

  // Ítems que no matchearon ningún grupo (por si el API trae rutas nuevas)
  for (const item of items) {
    const id = item.key || item.route
    if (used.has(id)) continue
    tree.push({
      type: 'link',
      id: item.id,
      key: item.key,
      label: item.label,
      route: item.route,
      icon: item.icon,
      showInAdminSidebar: Boolean(item.showInAdminSidebar),
      showInAdminHeader: Boolean(item.showInAdminHeader),
    })
  }

  return tree
})

function toggleGroup(id) {
  openGroups[id] = !openGroups[id]
}

function syncOpenGroups() {
  const path = route.path
  for (const entry of menuTree.value) {
    if (entry.type !== 'group') continue
    const active = entry.items.some((i) => path === i.route || path.startsWith(`${i.route}/`))
    // Solo abre el grupo de la ruta actual; el resto arranca colapsado
    if (active) openGroups[entry.id] = true
    else if (openGroups[entry.id] === undefined) openGroups[entry.id] = false
  }
}


watch(menuTree, syncOpenGroups, { immediate: true })
watch(
  () => route.path,
  () => {
    syncOpenGroups()
    scrollContentToTop()
  },
)

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('click', onDocClickAiDropdown)
  scrollContentToTop()
  if (auth.isPlatformAdmin) return
  try {
    const { data } = await api.get('/menu', { params: { channel: 'a' } })
    apiMenu.value = (data.items || []).map(withAdminChromeDefaults)
  } catch {
    apiMenu.value = []
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', onDocClickAiDropdown)
  if (sidebarHoverTimeout) clearTimeout(sidebarHoverTimeout)
})
</script>

<style scoped>
.admin-main {
  outline: none;
  background: var(--canvas, #111019) !important;
  color: var(--ink, #ece9f4);
}
.admin-top-header {
  background: var(--panel) !important;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  box-shadow: var(--sh);
}
.admin-shell .sidebar {
  background: var(--panel) !important;
  color: var(--ink) !important;
  border-color: var(--line) !important;
}
.admin-shell .admin-chat-rail {
  background: var(--panel-2) !important;
  border-color: var(--line) !important;
}
.admin-fab {
  background: var(--panel) !important;
  border-color: var(--line) !important;
  color: var(--ink);
}
.admin-fab__label {
  color: var(--ink-soft);
}
.admin-fab__avatar {
  ring-color: var(--brand-line);
  box-shadow: 0 0 0 2px var(--brand-line);
}
.header-button {
  background-color: var(--brand) !important;
}
.header-button:hover {
  background-color: #5b4be0 !important;
}
.header-admin-badge {
  display: inline;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--brand-ink);
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: default;
  user-select: none;
  pointer-events: none;
}
.header-identity {
  line-height: 1.2;
}
.header-identity__sep {
  color: var(--ink-faint);
  opacity: 0.7;
  user-select: none;
}
.admin-shell .sidebar a,
.admin-shell .sidebar button {
  color: var(--ink-soft);
}
.admin-shell .sidebar a:hover,
.admin-shell .sidebar button:hover {
  background: var(--panel-2);
  color: var(--ink);
}
[data-theme='dark'] [data-ai-dropdown] .absolute {
  background: var(--panel);
  border-color: var(--line);
}
[data-theme='dark'] [data-ai-dropdown] button.text-left {
  color: var(--ink-soft);
}
[data-theme='dark'] [data-ai-dropdown] button.text-left:hover {
  background: var(--panel-2);
  color: var(--ink);
}
</style>
