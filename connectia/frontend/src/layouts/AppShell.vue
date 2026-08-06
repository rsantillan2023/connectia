<template>
  <div class="u-root">
    <div class="u-phone">
      <!-- Top bar: logo comunidad · Connectyx centrado · lupa · avisos -->
      <header class="u-topbar">
        <div class="u-topbar-start">
          <button
            type="button"
            class="u-avatar-logo"
            aria-label="Mi perfil"
            title="Mi perfil"
            @click="goPerfil"
          >
            <img
              v-if="brandLogoUrl"
              :src="brandLogoUrl"
              :alt="auth.tenant?.nombre || 'Comunidad'"
              class="u-avatar-logo-img"
            />
            <span v-else class="u-avatar-logo-fallback" aria-hidden="true">
              {{ tenantInitial }}
            </span>
          </button>
        </div>

        <span class="u-product-mark" :title="PRODUCT_NAME" :aria-label="PRODUCT_NAME">
          <img
            class="u-product-logo u-product-logo--topbar"
            :src="PRODUCT_LOGO_ON_BRAND"
            :alt="PRODUCT_NAME"
          />
        </span>

        <div class="u-topbar-end">
          <button
            v-if="showMuroHubBtn"
            type="button"
            class="u-tile-btn u-hub-btn"
            :class="{ on: muroHubOpen }"
            :aria-label="muroHubOpen ? 'Ocultar enlaces' : 'Abrir enlaces'"
            :title="muroHubOpen ? 'Ocultar enlaces' : 'Abrir enlaces'"
            :aria-pressed="muroHubOpen"
            @click="toggleMuroHub"
          >
            <AppIcon name="grid" :size="24" />
          </button>
          <button
            type="button"
            class="u-tile-btn u-notif-btn"
            aria-label="Avisos"
            title="Avisos"
            @click="router.push('/avisos')"
          >
            <AppIcon name="bell" :size="26" />
            <span v-if="hasUnread" class="u-notif-badge">{{ badgeLabel }}</span>
          </button>
        </div>
      </header>

      <div v-if="showSearch" class="u-search">
        <input
          ref="searchInput"
          v-model="searchQ"
          type="search"
          placeholder="Buscar en el muro…"
          class="u-search-input"
          @keyup.enter="goSearch"
        />
      </div>

      <InstallAppBanner />
      <PendingSurveysBanner />

      <!-- Contenido: un solo scroll vertical (en chat detalle el hilo maneja el scroll) -->
      <main ref="mainEl" class="u-main" :class="{ 'u-main--immersive': immersiveMain }">
        <RouterView :search-query="searchQ" />
      </main>

      <!-- Footer: botonera dinámica (menú) o default Home · Chat · Asistente · Menú -->
      <nav
        v-if="!hideTabbar"
        class="u-tabbar"
        :style="{ gridTemplateColumns: `repeat(${tabbarItems.length}, 1fr)` }"
        aria-label="Navegación principal"
      >
        <template v-for="tab in tabbarItems" :key="tab.key">
          <button
            v-if="tab.isMenu"
            type="button"
            class="u-tab"
            @click="drawerOpen = true"
          >
            <span class="u-tab-ico" aria-hidden="true">
              <AppIcon name="menu" :size="22" />
            </span>
            <span class="u-tab-label">{{ tab.label }}</span>
          </button>
          <button
            v-else-if="tab.actionType === 'compose_post'"
            type="button"
            class="u-tab"
            :class="{ 'u-tab--primary': tab.primary }"
            @click="onComposeTab(tab)"
          >
            <span class="u-tab-ico" :class="{ 'u-tab-ico--primary': tab.primary }" aria-hidden="true">
              <AppIcon :name="tab.icon || 'plus'" :size="22" />
            </span>
            <span class="u-tab-label">{{ tab.label }}</span>
          </button>
          <RouterLink
            v-else
            :to="tab.route"
            class="u-tab"
            :class="{ 'is-active': isActive(tab.route), 'u-tab--primary': tab.primary }"
            @click="onTabClick(tab.route, $event)"
          >
            <span class="u-tab-ico" :class="{ 'u-tab-ico--primary': tab.primary }" aria-hidden="true">
              <AppIcon :name="tab.icon || 'home'" :size="22" />
              <span v-if="tab.route === '/chat' && hasChatUnread" class="u-tab-badge">{{ chatBadgeLabel }}</span>
            </span>
            <span class="u-tab-label">{{ tab.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- Crear: flotante solo en el muro -->
      <button
        v-if="showCrearFab"
        type="button"
        class="crear-fab"
        :class="{ 'is-disabled': !ugcEnabled }"
        aria-label="Crear publicación"
        title="Crear"
        :disabled="!ugcEnabled"
        @click="openComposer"
      >
        <AppIcon name="plus" :size="26" />
      </button>

      <p v-if="composerToast" class="u-composer-toast">{{ composerToast }}</p>

      <PostComposerSheet
        v-if="composerOpen"
        :require-approval="ugcRequireApproval"
        :initial-tipo="composerInitialTipo"
        @close="closeComposer"
        @created="onComposerCreated"
      />
    </div>

    <!-- Drawer hamburguesa -->
    <Teleport to="body">
      <div v-if="drawerOpen" class="u-drawer-root" @keydown.esc="drawerOpen = false">
        <button type="button" class="u-drawer-backdrop" aria-label="Cerrar menú" @click="drawerOpen = false" />
        <aside class="u-drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <div class="u-drawer-head">
            <button type="button" class="u-drawer-brand u-drawer-brand-btn" @click="goPerfil">
              <img
                class="u-product-logo u-product-logo--drawer"
                :src="PRODUCT_LOGO_LIGHT"
                :alt="PRODUCT_NAME"
              />
              <div class="u-drawer-brand-row">
                <img
                  v-if="brandLogoUrl"
                  :src="brandLogoUrl"
                  :alt="auth.tenant?.nombre || 'Comunidad'"
                  class="u-brand-logo u-brand-logo--drawer"
                />
                <p class="u-tenant">{{ auth.user?.nombre || auth.user?.usuario }}</p>
              </div>
              <span class="u-drawer-perfil-hint">Ver mi perfil</span>
            </button>
            <button type="button" class="u-icon-btn" aria-label="Cerrar" @click="drawerOpen = false">
              <AppIcon name="close" :size="20" />
            </button>
          </div>

          <nav class="u-drawer-nav">
            <template v-for="entry in menuTree" :key="entry.id">
              <RouterLink
                v-if="entry.type === 'link'"
                :to="entry.route"
                class="u-drawer-link"
                @click="onMenuItemClick(entry, $event)"
              >
                <AppIcon :name="iconFor(entry.key, entry.icon)" :size="20" />
                <span>{{ entry.label }}</span>
              </RouterLink>
              <div v-else class="u-drawer-group">
                <button
                  type="button"
                  class="u-drawer-group-btn"
                  :aria-expanded="openGroups[entry.id]"
                  @click="toggleGroup(entry.id)"
                >
                  <span class="u-drawer-group-left">
                    <AppIcon :name="entry.icon || 'home'" :size="20" />
                    <span>{{ entry.label }}</span>
                  </span>
                  <span class="u-drawer-chevron" :class="{ open: openGroups[entry.id] }" aria-hidden="true">›</span>
                </button>
                <div v-show="openGroups[entry.id]" class="u-drawer-group-items">
                  <RouterLink
                    v-for="item in entry.items"
                    :key="item.key"
                    :to="item.route"
                    class="u-drawer-link u-drawer-link--child"
                    @click="onMenuItemClick(item, $event)"
                  >
                    <AppIcon :name="iconFor(item.key, item.icon)" :size="18" />
                    <span>{{ item.label }}</span>
                  </RouterLink>
                </div>
              </div>
            </template>
          </nav>

          <div class="u-drawer-foot">
            <ThemeToggle />
            <button type="button" class="u-logout" :disabled="loggingOut" @click="askLogout">
              {{ loggingOut ? 'Saliendo…' : 'Cerrar sesión' }}
            </button>
          </div>
        </aside>
      </div>
    </Teleport>

    <ConfirmSheet
      v-if="logoutConfirmOpen"
      title="¿Cerrar sesión?"
      message="Vas a salir de la app. Podés volver a entrar cuando quieras."
      confirm-label="Sí, cerrar sesión"
      cancel-label="Cancelar"
      busy-label="Saliendo…"
      :busy="loggingOut"
      @confirm="confirmLogout"
      @cancel="logoutConfirmOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'
import AppIcon from '../components/AppIcon.vue'
import InstallAppBanner from '../components/InstallAppBanner.vue'
import PendingSurveysBanner from '../components/PendingSurveysBanner.vue'
import PostComposerSheet from '../components/PostComposerSheet.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import { useUgcComposer } from '../composables/useUgcComposer'
import { useNotifBadge } from '../composables/useNotifBadge'
import { useChatBadge } from '../composables/useChatBadge'
import { useMuroHubStrip } from '../composables/useMuroHubStrip'
import { iconFor } from '../utils/navIcons'
import { filterMenuByActiveModules } from '../utils/menuModuleCaps'
import { resolveMediaUrl } from '../utils/media'
import { isMuroFeedPath } from '../utils/muroFeed'
import { PRODUCT_LOGO_LIGHT, PRODUCT_LOGO_ON_BRAND, PRODUCT_NAME } from '../constants/brand'

const DEFAULT_MENU = [
  { key: 'muro', label: 'Publicaciones', route: '/muro', icon: 'home' },
  { key: 'mis-publicaciones', label: 'Mis publicaciones', route: '/muro/mias', icon: 'inbox' },
  { key: 'conocimiento', label: 'Conocimiento', route: '/conocimiento', icon: 'file' },
  { key: 'guardados', label: 'Mis guardados', route: '/guardados', icon: 'bookmark' },
  { key: 'solicitudes', label: 'Mis solicitudes', route: '/solicitudes', icon: 'inbox' },
  { key: 'aprobaciones', label: 'Aprobaciones', route: '/aprobaciones', icon: 'check' },
  { key: 'licencias', label: 'Vacaciones', route: '/licencias', icon: 'clipboard' },
  { key: 'ausencias', label: 'Ausencias', route: '/ausencias', icon: 'list' },
  { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift' },
  { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid' },
  { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file' },
  { key: 'asistente', label: 'Asistente', route: '/asistente', icon: 'sparkles' },
  { key: 'chat', label: 'Chat', route: '/chat', icon: 'chat' },
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard' },
  { key: 'bienvenida', label: 'Bienvenida', route: '/bienvenida', icon: 'sparkles' },
  { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield' },
  { key: 'mi-legajo', label: 'Mi legajo', route: '/mi-legajo', icon: 'file' },
  { key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell' },
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help' },
  { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid' },
  { key: 'perfil', label: 'Mi perfil', route: '/perfil', icon: 'user' },
]

/** Grupo colapsable del drawer: feed + publicaciones propias + guardados + conocimiento */
const MURO_GROUP = {
  id: 'muro',
  label: 'Muro',
  icon: 'home',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/muro' ||
      r === '/muro/mias' ||
      r === '/guardados' ||
      r === '/conocimiento' ||
      k === 'muro' ||
      k === 'conocimiento' ||
      k.includes('mis-publicaciones') ||
      k.includes('guardados') ||
      k.includes('conocimiento')
    )
  },
  order: ['/muro', '/muro/mias', '/guardados', '/conocimiento'],
}

const MURO_LABELS = {
  '/muro': 'Publicaciones',
  '/muro/mias': 'Mis publicaciones',
  '/guardados': 'Mis guardados',
  '/conocimiento': 'Conocimiento',
}

/** Grupo colapsable: vacaciones/permisos + ausencias + fichaje (ola 17/18) */
const LICENCIAS_GROUP = {
  id: 'licencias',
  label: 'Licencias y ausencias',
  icon: 'clipboard',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/licencias' ||
      r === '/ausencias' ||
      r === '/mi-asistencia' ||
      k === 'licencias' ||
      k === 'ausencias' ||
      k === 'asistencia' ||
      k.includes('ausentismo') ||
      k.includes('asistencia') ||
      k.includes('fichaje')
    )
  },
  order: ['/licencias', '/ausencias', '/mi-asistencia'],
  labels: {
    '/licencias': 'Vacaciones',
    '/ausencias': 'Ausencias',
    '/mi-asistencia': 'Mi asistencia',
  },
}

/** Grupo colapsable: mis solicitudes + aprobaciones + reportar incidente + pedidos + servicios + reserva + oficina */
const PROCESOS_GROUP = {
  id: 'procesos',
  label: 'Trámites',
  icon: 'inbox',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    const label = String(item.label || '').toLowerCase()
    if (k.startsWith('admin.')) return false
    return (
      r === '/solicitudes' ||
      r === '/aprobaciones' ||
      r === '/alarma' ||
      r === '/pedidos' ||
      r === '/servicios' ||
      r === '/espacios' ||
      r === '/oficina' ||
      k === 'solicitudes' ||
      k === 'aprobaciones' ||
      k === 'alarma' ||
      k === 'pedidos' ||
      k === 'servicios' ||
      k === 'espacios' ||
      k === 'oficina' ||
      k.includes('solicitud') ||
      k.includes('aprobacion') ||
      k.includes('alarma') ||
      k.includes('espacio') ||
      k.includes('oficina') ||
      label === 'reportes' ||
      label.includes('reportar incidente') ||
      label.includes('reserva de activos')
    )
  },
  order: [
    '/solicitudes',
    '/aprobaciones',
    '/alarma',
    '/pedidos',
    '/servicios',
    '/espacios',
    '/oficina',
  ],
  labels: {
    '/solicitudes': 'Mis solicitudes',
    '/aprobaciones': 'Aprobaciones',
    '/alarma': 'Reportar Incidente',
    '/pedidos': 'Pedidos',
    '/servicios': 'Servicios',
    '/espacios': 'Reserva de Activos',
    '/oficina': 'Oficina',
  },
}

/** Grupo colapsable: catálogo de beneficios + cómo sumar puntos */
const BENEFICIOS_GROUP = {
  id: 'beneficios',
  label: 'Beneficios',
  icon: 'gift',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    const label = String(item.label || '').toLowerCase()
    return (
      r === '/beneficios' ||
      r.startsWith('/beneficios?') ||
      k === 'beneficios' ||
      k === 'beneficios.earn' ||
      k.includes('beneficio') ||
      /c[oó]mo sumar/.test(label)
    )
  },
  order: ['/beneficios', '/beneficios?tab=earn'],
  labels: {
    '/beneficios': 'Beneficios',
    '/beneficios?tab=earn': 'Cómo sumar puntos',
  },
}

/** Grupo colapsable: directorio, docs, asistente, emparejar TV, en vivo, enlaces (chat y encuestas van sueltos) */
const HERRAMIENTAS_GROUP = {
  id: 'herramientas',
  label: 'Herramientas',
  icon: 'grid',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    const label = String(item.label || '').toLowerCase()
    if (k.startsWith('admin.')) return false
    return (
      r === '/directorio' ||
      r === '/docs' ||
      r === '/asistente' ||
      r === '/tv/emparejar' ||
      r === '/en-vivo' ||
      r === '/accesos' ||
      k === 'directorio' ||
      k === 'docs' ||
      k === 'asistente' ||
      k === 'tv-emparejar' ||
      k === 'en-vivo' ||
      k === 'hub' ||
      k.includes('directorio') ||
      k.includes('emparejar') ||
      k.includes('en-vivo') ||
      label.includes('emparejar tv') ||
      label === 'en vivo' ||
      label === 'enlaces'
    )
  },
  order: ['/directorio', '/docs', '/asistente', '/tv/emparejar', '/en-vivo', '/accesos'],
  labels: {
    '/directorio': 'Directorio',
    '/docs': 'Mis documentos',
    '/asistente': 'Asistente',
    '/tv/emparejar': 'Emparejar TV',
    '/en-vivo': 'En vivo',
    '/accesos': 'Enlaces',
  },
}

/** Grupo colapsable: bienvenida, políticas, mi legajo, organigrama, mi desarrollo, cultura */
const RRHH_GROUP = {
  id: 'rrhh',
  label: 'RRHH',
  icon: 'user',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    if (k.startsWith('admin.')) return false
    return (
      r === '/bienvenida' ||
      r === '/politicas' ||
      r === '/mi-legajo' ||
      r === '/organigrama' ||
      r === '/mi-desarrollo' ||
      r === '/cultura' ||
      k === 'bienvenida' ||
      k === 'politicas' ||
      k === 'mi-legajo' ||
      k === 'organigrama' ||
      k === 'mi-desarrollo' ||
      k === 'cultura' ||
      k.includes('legajo') ||
      k.includes('politica') ||
      k.includes('onboarding') ||
      k.includes('organigrama') ||
      k.includes('desarrollo') ||
      k.includes('cultura')
    )
  },
  order: ['/bienvenida', '/politicas', '/mi-legajo', '/organigrama', '/mi-desarrollo', '/cultura'],
  labels: {
    '/bienvenida': 'Bienvenida',
    '/politicas': 'Políticas',
    '/mi-legajo': 'Mi legajo',
    '/organigrama': 'Organigrama',
    '/mi-desarrollo': 'Mi desarrollo',
    '/cultura': 'Cultura',
  },
}

/** Grupo colapsable: avisos + ayuda */
const NOTIFICACIONES_GROUP = {
  id: 'notificaciones',
  label: 'Notificaciones',
  icon: 'bell',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/avisos' ||
      r === '/ayuda' ||
      k === 'avisos' ||
      k === 'ayuda' ||
      k.includes('aviso') ||
      k.includes('notif')
    )
  },
  order: ['/avisos', '/ayuda'],
  labels: {
    '/avisos': 'Avisos',
    '/ayuda': 'Ayuda',
  },
}

/** Grupo colapsable: supervisión + mi equipo + mis tareas + agenda */
const MI_ACTIVIDAD_GROUP = {
  id: 'mi-actividad',
  label: 'Mi Actividad',
  icon: 'list',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    if (k.startsWith('admin.')) return false
    if (r === '/supervision/ecr' || k === 'supervision.ecr') return false
    return (
      r === '/supervision' ||
      r === '/supervision/mis-tareas' ||
      r === '/mi-equipo' ||
      r === '/agenda' ||
      k === 'supervision' ||
      k === 'supervision.mis-tareas' ||
      k === 'mi-equipo' ||
      k === 'agenda' ||
      k.includes('agenda')
    )
  },
  order: ['/supervision', '/mi-equipo', '/supervision/mis-tareas', '/agenda'],
  labels: {
    '/supervision': 'Supervisión',
    '/mi-equipo': 'Mi equipo',
    '/supervision/mis-tareas': 'Mis tareas',
    '/agenda': 'Agenda',
  },
}

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const route = useRoute()

const {
  open: composerOpen,
  toast: composerToast,
  ugcEnabled,
  ugcRequireApproval,
  openComposer,
  closeComposer,
  onCreated: onComposerCreated,
} = useUgcComposer()

const composerInitialTipo = ref('')

const DEFAULT_TABBAR = [
  { key: 'tab-muro', label: 'Home', route: '/muro', icon: 'home', actionType: 'navigate' },
  { key: 'tab-chat', label: 'Chat', route: '/chat', icon: 'chat', actionType: 'navigate', primary: true },
  { key: 'tab-asistente', label: 'Asistente', route: '/asistente', icon: 'sparkles', actionType: 'navigate' },
]

const tabbarItems = computed(() => {
  const configured = (menu.value || [])
    .filter((i) => i.showInTabbar)
    .sort((a, b) => (Number(a.tabOrder) || 100) - (Number(b.tabOrder) || 100))
    .slice(0, 4)
    .map((i) => ({
      key: i.key || i.route,
      label: i.label,
      route: i.route || '/muro',
      icon: iconFor(i.key, i.icon),
      actionType: i.actionType === 'compose_post' ? 'compose_post' : 'navigate',
      actionParams: i.actionParams || {},
      primary: i.route === '/chat' || i.key === 'chat',
    }))
  const tabs = configured.length ? configured : DEFAULT_TABBAR.map((t) => ({ ...t }))
  const hasMenu = tabs.some((t) => t.isMenu || t.key === 'tab-menu' || t.label === 'Menú')
  if (!hasMenu) {
    tabs.push({ key: 'tab-menu', label: 'Menú', isMenu: true, icon: 'menu' })
  }
  return tabs.slice(0, 5)
})

function onComposeTab(tab) {
  const tipo = String(tab?.actionParams?.tipo || '').trim()
  composerInitialTipo.value = tipo
  if (!ugcEnabled.value) {
    router.push('/muro')
    return
  }
  openComposer()
}

function onMenuItemClick(item, ev) {
  if (item?.actionType === 'compose_post') {
    ev?.preventDefault?.()
    drawerOpen.value = false
    onComposeTab(item)
    return
  }
  drawerOpen.value = false
}

const { hasUnread, badgeLabel, refreshBadge } = useNotifBadge()
const {
  hasUnread: hasChatUnread,
  badgeLabel: chatBadgeLabel,
  refreshBadge: refreshChatBadge,
} = useChatBadge()
const {
  expanded: muroHubOpen,
  hasLinks: muroHubHasLinks,
  toggle: toggleMuroHub,
  bindRouteCollapse,
} = useMuroHubStrip()
bindRouteCollapse(route)

const menu = ref([...DEFAULT_MENU])
const openGroups = reactive({
  muro: false,
  procesos: false,
  licencias: false,
  beneficios: false,
  herramientas: false,
  rrhh: false,
  notificaciones: false,
  'mi-actividad': false,
})
const drawerOpen = ref(false)
const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)
const showSearch = ref(false)
const searchQ = ref('')
const searchInput = ref(null)
const mainEl = ref(null)

function normalizeMuroItem(item) {
  const route = String(item.route || '')
  const label = MURO_LABELS[route]
  if (!label) return item
  return { ...item, label }
}

function ensureMuroMenuItems(items) {
  const next = items.map(normalizeMuroItem)
  const has = (route) => next.some((i) => i.route === route)
  const muroIdx = next.findIndex((i) => i.route === '/muro' || String(i.key).includes('muro'))
  const insertAt = muroIdx >= 0 ? muroIdx + 1 : 0

  if (!has('/muro/mias')) {
    next.splice(insertAt, 0, {
      key: 'mis-publicaciones',
      label: 'Mis publicaciones',
      route: '/muro/mias',
      icon: 'inbox',
    })
  }
  if (!has('/conocimiento')) {
    const miasIdx = next.findIndex((i) => i.route === '/muro/mias')
    const at = miasIdx >= 0 ? miasIdx + 1 : insertAt
    next.splice(at, 0, {
      key: 'conocimiento',
      label: 'Conocimiento',
      route: '/conocimiento',
      icon: 'file',
    })
  }
  if (!has('/guardados')) {
    const concIdx = next.findIndex((i) => i.route === '/conocimiento')
    const miasIdx = next.findIndex((i) => i.route === '/muro/mias')
    const at = concIdx >= 0 ? concIdx + 1 : miasIdx >= 0 ? miasIdx + 1 : insertAt
    next.splice(at, 0, {
      key: 'guardados',
      label: 'Mis guardados',
      route: '/guardados',
      icon: 'bookmark',
    })
  }
  return next
}

/** Garantiza Ayuda + Políticas aunque el menú en DB aún no se haya recargado. */
function ensureHelpMenuItems(items) {
  const next = [...items]
  const has = (route) => next.some((i) => i.route === route)
  const docsIdx = next.findIndex((i) => i.route === '/docs' || String(i.key).includes('docs'))
  const at = docsIdx >= 0 ? docsIdx + 1 : next.length
  if (!has('/ayuda')) {
    next.splice(at, 0, { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help' })
  }
  const ayudaIdx = next.findIndex((i) => i.route === '/ayuda')
  const polAt = ayudaIdx >= 0 ? ayudaIdx + 1 : at + 1
  if (!has('/politicas')) {
    next.splice(polAt, 0, { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield' })
  }
  return next
}

function normalizeLicenciasItem(item) {
  const route = String(item.route || '')
  const label = LICENCIAS_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeProcesosItem(item) {
  const route = String(item.route || '')
  const label = PROCESOS_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeHerramientasItem(item) {
  const route = String(item.route || '')
  const label = HERRAMIENTAS_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeBeneficiosItem(item) {
  const route = String(item.route || '')
  const label = BENEFICIOS_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeRrhhItem(item) {
  const route = String(item.route || '')
  const label = RRHH_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeNotificacionesItem(item) {
  const route = String(item.route || '')
  const label = NOTIFICACIONES_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function normalizeMiActividadItem(item) {
  const route = String(item.route || '')
  const label = MI_ACTIVIDAD_GROUP.labels[route]
  if (!label) return item
  return { ...item, label }
}

function sessionCapsSet() {
  return new Set([...(auth.user?.capabilities || []), ...(auth.tenant?.capabilities || [])])
}

function tenantHasModule(capId) {
  return sessionCapsSet().has(capId)
}

/** Garantiza Vacaciones + Ausencias (ola 17) en tenants con menú viejo. */
function ensureLicenciasMenuItems(items) {
  const next = items.map(normalizeLicenciasItem)
  const has = (route) => next.some((i) => i.route === route)
  const solIdx = next.findIndex(
    (i) => i.route === '/solicitudes' || String(i.key).includes('solicitud'),
  )
  const at = solIdx >= 0 ? solIdx + 1 : next.length
  if (tenantHasModule('licencias') && !has('/licencias')) {
    next.splice(at, 0, {
      key: 'licencias',
      label: 'Vacaciones',
      route: '/licencias',
      icon: 'clipboard',
    })
  }
  const licIdx = next.findIndex((i) => i.route === '/licencias')
  const ausAt = licIdx >= 0 ? licIdx + 1 : at + 1
  if (tenantHasModule('ausentismos') && !has('/ausencias')) {
    next.splice(ausAt, 0, {
      key: 'ausencias',
      label: 'Ausencias',
      route: '/ausencias',
      icon: 'list',
    })
  }
  return next
}

/** Garantiza Beneficios (ola 20) + Cómo sumar puntos en el drawer U. */
function ensureBeneficiosMenuItems(items) {
  const next = [...items]
  if (!tenantHasModule('beneficios')) return next
  const hasBen = next.some(
    (i) =>
      i.route === '/beneficios' ||
      String(i.key || '') === 'beneficios' ||
      String(i.label || '')
        .toLowerCase()
        .includes('beneficio'),
  )
  if (!hasBen) {
    const dirIdx = next.findIndex(
      (i) => i.route === '/directorio' || String(i.key).includes('directorio'),
    )
    const hubIdx = next.findIndex(
      (i) => i.route === '/accesos' || String(i.key).includes('hub') || String(i.key).includes('acceso'),
    )
    const item = { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift' }
    const at = dirIdx >= 0 ? dirIdx + 1 : hubIdx >= 0 ? hubIdx : next.length
    next.splice(at, 0, item)
  }
  if (!tenantHasModule('beneficios.billetera')) {
    return next.filter(
      (i) =>
        i.route !== '/beneficios?tab=earn' &&
        String(i.key || '') !== 'beneficios.earn' &&
        !/c[oó]mo sumar/i.test(String(i.label || '')),
    )
  }
  const hasEarn = next.some(
    (i) =>
      i.route === '/beneficios?tab=earn' ||
      String(i.key || '') === 'beneficios.earn' ||
      /c[oó]mo sumar/i.test(String(i.label || '')),
  )
  if (!hasEarn) {
    const benIdx = next.findIndex(
      (i) => i.route === '/beneficios' || String(i.key || '') === 'beneficios',
    )
    const earn = {
      key: 'beneficios.earn',
      label: 'Cómo sumar puntos',
      route: '/beneficios?tab=earn',
      icon: 'sparkles',
    }
    if (benIdx >= 0) next.splice(benIdx + 1, 0, earn)
    else next.push(earn)
  }
  return next
}

/** Garantiza Reserva de Activos (/espacios) en el drawer U. Oficina queda oculta (mismo motor vía /espacios). */
function ensureEspaciosMenuItems(items) {
  const next = [...items].filter((i) => {
    const route = String(i.route || '')
    const key = String(i.key || '').toLowerCase()
    const label = String(i.label || '').toLowerCase()
    if (route === '/oficina' || route.startsWith('/oficina/')) return false
    if (key === 'oficina') return false
    // Evitar ocultar ítems genéricos que solo digan "oficina" en otro sentido
    if (label === 'oficina') return false
    return true
  })
  const hasEspacios = next.some(
    (i) =>
      i.route === '/espacios' ||
      String(i.key || '') === 'espacios' ||
      String(i.key || '').includes('espacio') ||
      /espacio|reserva de activos/i.test(String(i.label || '')),
  )
  const benIdx = next.findIndex(
    (i) => i.route === '/beneficios' || String(i.key || '').includes('beneficio'),
  )
  const hubIdx = next.findIndex(
    (i) => i.route === '/accesos' || String(i.key).includes('hub') || String(i.key).includes('acceso'),
  )
  let at = benIdx >= 0 ? benIdx + 1 : hubIdx >= 0 ? hubIdx : next.length
  if (tenantHasModule('espacios') && !hasEspacios) {
    next.splice(at, 0, {
      key: 'espacios',
      label: 'Reserva de Activos',
      route: '/espacios',
      icon: 'calendar',
    })
  } else if (hasEspacios) {
    const idx = next.findIndex((i) => i.route === '/espacios' || String(i.key || '') === 'espacios')
    if (idx >= 0) next[idx] = { ...next[idx], label: 'Reserva de Activos', icon: next[idx].icon || 'calendar' }
  }
  return next
}

/** Garantiza Mi asistencia (ola 18) en el drawer U, junto a licencias/ausencias. */
function ensureAsistenciaMenuItems(items) {
  const next = [...items]
  const has = next.some(
    (i) =>
      i.route === '/mi-asistencia' ||
      String(i.key || '') === 'asistencia' ||
      String(i.label || '')
        .toLowerCase()
        .includes('asistencia') ||
      String(i.label || '')
        .toLowerCase()
        .includes('fichaje'),
  )
  if (has) return next
  const ausIdx = next.findIndex(
    (i) => i.route === '/ausencias' || String(i.key || '').includes('ausencia'),
  )
  const licIdx = next.findIndex(
    (i) => i.route === '/licencias' || String(i.key || '').includes('licencia'),
  )
  const at = ausIdx >= 0 ? ausIdx + 1 : licIdx >= 0 ? licIdx + 1 : next.length
  next.splice(at, 0, {
    key: 'asistencia',
    label: 'Mi asistencia',
    route: '/mi-asistencia',
    icon: 'pin',
  })
  return next
}

/** Garantiza Organigrama (ola 22) dentro del bloque RRHH del drawer U. */
function ensureOrganigramaMenuItems(items) {
  const next = [...items]
  const has = next.some(
    (i) =>
      i.route === '/organigrama' ||
      String(i.key || '') === 'organigrama' ||
      String(i.label || '')
        .toLowerCase()
        .includes('organigrama'),
  )
  if (has) return next
  const legIdx = next.findIndex(
    (i) => i.route === '/mi-legajo' || String(i.key || '').includes('legajo'),
  )
  const polIdx = next.findIndex(
    (i) => i.route === '/politicas' || String(i.key || '').includes('politica'),
  )
  const at = legIdx >= 0 ? legIdx + 1 : polIdx >= 0 ? polIdx + 1 : next.length
  next.splice(at, 0, {
    key: 'organigrama',
    label: 'Organigrama',
    route: '/organigrama',
    icon: 'user',
  })
  return next
}

/** Garantiza Agenda (ola 15) en el drawer U. */
function ensureAgendaMenuItems(items) {
  const next = [...items]
  if (
    next.some(
      (i) =>
        i.route === '/agenda' ||
        String(i.key || '').includes('agenda') ||
        String(i.label || '')
          .toLowerCase()
          .includes('agenda'),
    )
  ) {
    return next
  }
  const encIdx = next.findIndex(
    (i) => i.route === '/encuestas' || String(i.key).includes('encuesta'),
  )
  const dirIdx = next.findIndex(
    (i) => i.route === '/directorio' || String(i.key).includes('directorio'),
  )
  const item = { key: 'agenda', label: 'Agenda', route: '/agenda', icon: 'calendar' }
  const at = encIdx >= 0 ? encIdx + 1 : dirIdx >= 0 ? dirIdx : next.length
  next.splice(at, 0, item)
  return next
}

/** Garantiza Mi legajo + Bienvenida (ola 19). */
function ensureOnboardingMenuItems(items) {
  const next = [...items]
  const has = (route) => next.some((i) => i.route === route)
  const dirIdx = next.findIndex(
    (i) => i.route === '/directorio' || String(i.key).includes('directorio'),
  )
  const docsIdx = next.findIndex((i) => i.route === '/docs' || String(i.key).includes('docs'))
  let at = dirIdx >= 0 ? dirIdx + 1 : docsIdx >= 0 ? docsIdx + 1 : next.length
  if (!has('/mi-legajo')) {
    next.splice(at, 0, {
      key: 'mi-legajo',
      label: 'Mi legajo',
      route: '/mi-legajo',
      icon: 'file',
    })
    at += 1
  }
  const legIdx = next.findIndex((i) => i.route === '/mi-legajo')
  const bienAt = legIdx >= 0 ? legIdx + 1 : at
  if (!has('/bienvenida')) {
    next.splice(bienAt, 0, {
      key: 'bienvenida',
      label: 'Bienvenida',
      route: '/bienvenida',
      icon: 'sparkles',
    })
  }
  return next
}

const DRAWER_GROUPS = [
  MURO_GROUP,
  PROCESOS_GROUP,
  LICENCIAS_GROUP,
  BENEFICIOS_GROUP,
  HERRAMIENTAS_GROUP,
  RRHH_GROUP,
  NOTIFICACIONES_GROUP,
  MI_ACTIVIDAD_GROUP,
]

function normalizeGroupItem(group, item) {
  if (group.id === 'muro') return normalizeMuroItem(item)
  if (group.id === 'licencias') return normalizeLicenciasItem(item)
  if (group.id === 'procesos') return normalizeProcesosItem(item)
  if (group.id === 'beneficios') return normalizeBeneficiosItem(item)
  if (group.id === 'herramientas') return normalizeHerramientasItem(item)
  if (group.id === 'rrhh') return normalizeRrhhItem(item)
  if (group.id === 'notificaciones') return normalizeNotificacionesItem(item)
  if (group.id === 'mi-actividad') return normalizeMiActividadItem(item)
  return item
}

const menuTree = computed(() => {
  const items = menu.value
  const used = new Set()
  const tree = []
  const groupedById = new Map()

  for (const group of DRAWER_GROUPS) {
    const children = items
      .filter((item) => group.match(item))
      .map((item) => normalizeGroupItem(group, item))
      .sort((a, b) => {
        const ai = group.order.indexOf(a.route)
        const bi = group.order.indexOf(b.route)
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
      })
    for (const c of children) used.add(c.key || c.route)
    if (children.length) groupedById.set(group.id, children)
  }

  // Insertar grupos en el lugar del primer ítem del grupo (orden del menú).
  for (const item of items) {
    const id = item.key || item.route
    if (used.has(id)) {
      const group = DRAWER_GROUPS.find((g) => g.match(item))
      if (!group || !groupedById.has(group.id)) continue
      const children = groupedById.get(group.id)
      groupedById.delete(group.id)
      tree.push({
        type: 'group',
        id: group.id,
        label: group.label,
        icon: group.icon,
        items: children,
      })
      continue
    }
    tree.push({
      type: 'link',
      id,
      key: item.key,
      label: item.label,
      route: item.route,
      icon: item.icon,
    })
  }

  // Por si quedara algún grupo sin anclar (ítems solo en grupo).
  for (const group of DRAWER_GROUPS) {
    if (!groupedById.has(group.id)) continue
    tree.push({
      type: 'group',
      id: group.id,
      label: group.label,
      icon: group.icon,
      items: groupedById.get(group.id),
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
    // Grupos colapsados por defecto; solo abre el de la ruta actual.
    openGroups[entry.id] = active
  }
}

watch(menuTree, syncOpenGroups, { immediate: true })
watch(() => route.path, () => {
  syncOpenGroups()
  scrollMainToTop()
})

async function scrollMainToTop() {
  await nextTick()
  if (mainEl.value) mainEl.value.scrollTop = 0
  window.scrollTo(0, 0)
}

const brandLogoUrl = computed(() => {
  const b = auth.tenant?.branding || {}
  const raw = b.logoUrl || b.splash?.logoUrl || ''
  return resolveMediaUrl(raw)
})

const tenantInitial = computed(() => {
  const n = String(auth.tenant?.nombre || 'C').trim()
  return (n[0] || 'C').toUpperCase()
})

const hideTabbar = computed(() => Boolean(route.meta?.hideTabbar))
/** Solo pantallas con scroll interno propio (chat / asistente). hideTabbar ≠ immersive. */
const immersiveMain = computed(() => {
  const p = route.path || ''
  return (
    p === '/asistente' ||
    p.startsWith('/asistente/') ||
    route.name === 'chat-detail' ||
    /^\/chat\/[^/]+$/.test(p)
  )
})

const showCrearFab = computed(() => {
  if (hideTabbar.value) return false
  // Feed muro clásico o portal (no detalle /muro/:id ni /muro/mias)
  return isMuroFeedPath(route.path || '')
})

/** Ícono de enlaces junto a la campana (solo feed muro, si hay links). */
const showMuroHubBtn = computed(() => showCrearFab.value && muroHubHasLinks.value)

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

/** Desde un detalle, tocar Home vuelve al muro. */
function onTabClick(path, event) {
  if (!isActive(path) || route.path === path) return
  event.preventDefault()
  router.push(path)
}

function goPerfil() {
  drawerOpen.value = false
  router.push('/perfil')
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => searchInput.value?.focus())
  } else {
    searchQ.value = ''
  }
}

function goSearch() {
  if (route.name === 'muro' || route.name === 'muro-portal') return
  router.push({ name: 'muro', query: { q: searchQ.value } })
}

watch(
  () => route.query.q,
  (q) => {
    if (typeof q === 'string') {
      searchQ.value = q
      showSearch.value = Boolean(q)
    }
  },
)

onMounted(async () => {
  theme.initFromTenant(auth.tenant)
  document.body.classList.add('u-app-lock')
  if (!auth.isAuthenticated) return
  try {
    const { data } = await api.get('/menu', { params: { channel: 'u' } })
    if (data?.branding) {
      auth.patchTenant({ branding: data.branding })
      theme.initFromTenant(auth.tenant)
    }
    const items = Array.isArray(data?.items) ? data.items : []
    let next = items.length > 0 ? items : [...DEFAULT_MENU]
    next = ensureAgendaMenuItems(
      ensureOrganigramaMenuItems(
        ensureAsistenciaMenuItems(
          ensureEspaciosMenuItems(
            ensureBeneficiosMenuItems(
              ensureOnboardingMenuItems(
                ensureLicenciasMenuItems(ensureHelpMenuItems(ensureMuroMenuItems(next))),
              ),
            ),
          ),
        ),
      ),
    )
    if (!next.some((i) => String(i.key).includes('perfil') || i.route === '/perfil')) {
      next.push({ key: 'perfil', label: 'Mi perfil', route: '/perfil', icon: 'user' })
    }
    if (
      !next.some(
        (i) =>
          i.route === '/directorio' ||
          String(i.key).includes('directorio') ||
          String(i.label || '')
            .toLowerCase()
            .includes('directorio'),
      )
    ) {
      const docsIdx = next.findIndex((i) => i.route === '/docs' || String(i.key).includes('docs'))
      const item = { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid' }
      if (docsIdx >= 0) next.splice(docsIdx + 1, 0, item)
      else next.push(item)
    }
    if (
      !next.some(
        (i) =>
          i.route === '/mi-legajo' ||
          String(i.key).includes('mi-legajo') ||
          String(i.key).includes('legajo') ||
          String(i.label || '')
            .toLowerCase()
            .includes('legajo'),
      )
    ) {
      const docsIdx = next.findIndex((i) => i.route === '/docs' || String(i.key).includes('docs'))
      const dirIdx = next.findIndex((i) => i.route === '/directorio')
      const item = { key: 'mi-legajo', label: 'Mi legajo', route: '/mi-legajo', icon: 'file' }
      const at = dirIdx >= 0 ? dirIdx + 1 : docsIdx >= 0 ? docsIdx + 1 : next.length
      next.splice(at, 0, item)
    }
    if (!next.some((i) => String(i.key).includes('avisos') || i.route === '/avisos')) {
      next.push({ key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell' })
    }
    if (!next.some((i) => String(i.key).includes('aprobaciones') || i.route === '/aprobaciones')) {
      const solIdx = next.findIndex(
        (i) => i.route === '/solicitudes' || String(i.key).includes('solicitud'),
      )
      const item = {
        key: 'aprobaciones',
        label: 'Aprobaciones',
        route: '/aprobaciones',
        icon: 'check',
      }
      if (solIdx >= 0) next.splice(solIdx + 1, 0, item)
      else next.push(item)
    }
    menu.value = filterMenuByActiveModules(next, [
      ...(auth.user?.capabilities || []),
      ...(auth.tenant?.capabilities || []),
    ])
  } catch {
    menu.value = filterMenuByActiveModules(
      ensureAgendaMenuItems(
        ensureOrganigramaMenuItems(
          ensureAsistenciaMenuItems(
            ensureEspaciosMenuItems(
              ensureBeneficiosMenuItems(
                ensureOnboardingMenuItems(
                  ensureLicenciasMenuItems(ensureHelpMenuItems(ensureMuroMenuItems([...DEFAULT_MENU]))),
                ),
              ),
            ),
          ),
        ),
      ),
      [...(auth.user?.capabilities || []), ...(auth.tenant?.capabilities || [])],
    )
  }
  refreshBadge()
  refreshChatBadge()
})

const NOTIF_BADGE_MS = 60_000
let notifBadgeTimer = null
function onNotifVisibility() {
  if (document.visibilityState === 'visible') refreshBadge()
}
onMounted(() => {
  document.addEventListener('visibilitychange', onNotifVisibility)
  if (!notifBadgeTimer) {
    notifBadgeTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshBadge()
    }, NOTIF_BADGE_MS)
  }
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onNotifVisibility)
  if (notifBadgeTimer) {
    clearInterval(notifBadgeTimer)
    notifBadgeTimer = null
  }
})

watch(
  () => route.path,
  (path, prev) => {
    if (path.startsWith('/chat') || (prev && String(prev).startsWith('/chat'))) {
      refreshChatBadge()
    }
  },
)

function askLogout() {
  if (loggingOut.value) return
  drawerOpen.value = false
  logoutConfirmOpen.value = true
}

async function confirmLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout('current')
  } finally {
    logoutConfirmOpen.value = false
    document.body.classList.remove('u-app-lock')
    await router.replace({ name: 'login' })
    loggingOut.value = false
  }
}
</script>

<style scoped>
.u-root {
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  justify-content: center;
  background: var(--cx-page);
  overflow: hidden;
}

.u-phone {
  width: 100%;
  max-width: 430px;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--cx-page);
  position: relative;
  box-shadow: none;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .u-root {
    background:
      radial-gradient(900px 500px at 20% 0%, var(--cx-page-glow-a), transparent 55%),
      var(--cx-page);
    padding: 24px 0;
    align-items: stretch;
  }
  .u-phone {
    height: calc(100dvh - 48px);
    max-height: calc(100dvh - 48px);
    border-radius: 28px;
    border: 1px solid var(--cx-border);
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  }
}

.u-topbar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 14px;
  padding-top: max(18px, calc(env(safe-area-inset-top) + 10px));
  background: var(--brand-primary, #0f766e);
  border-bottom: 0;
  z-index: 20;
  color: #fff;
}

.u-topbar-start {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  justify-self: start;
}

.u-avatar-logo {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, #fff 55%, transparent);
  background: #fff;
  padding: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}
.u-avatar-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}
.u-avatar-logo-fallback {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  font-family: var(--font-display);
}

.u-topbar-end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  justify-self: end;
  min-width: 0;
}

.u-product-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 200px;
  justify-self: center;
  grid-column: 2;
}
.u-product-logo {
  display: block;
  width: auto;
  height: auto;
  object-fit: contain;
}
.u-product-logo--topbar {
  max-height: 42px;
  max-width: 190px;
  /* SVG: SOOFT blanco + CONNECTYX violeta sobre topbar de marca */
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}
.u-product-logo--drawer {
  max-height: 28px;
  max-width: min(200px, 70%);
  margin-bottom: 8px;
}

.u-brand-logo {
  display: block;
  max-height: 36px;
  max-width: min(140px, 40vw);
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: right center;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12));
}

.u-brand-logo--drawer {
  max-height: 28px;
  max-width: 120px;
  filter: none;
}

.u-brand {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1;
  color: #fff;
  flex-shrink: 0;
}

.u-tenant {
  margin: 0;
  font-size: 12px;
  color: color-mix(in srgb, #fff 78%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.u-tile-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 0;
  background: color-mix(in srgb, #fff 22%, transparent);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}
.u-tile-btn:active {
  background: color-mix(in srgb, #fff 34%, transparent);
}

.u-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 0;
  background: color-mix(in srgb, #fff 18%, transparent);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.u-icon-btn:active {
  background: color-mix(in srgb, #fff 28%, transparent);
}

.u-drawer .u-icon-btn {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 12px;
}

.u-drawer-brand {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.u-drawer-brand-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.u-drawer-perfil-hint {
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
  font-weight: 600;
}
.u-drawer-brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.u-drawer .u-brand {
  color: var(--brand-primary, #0f766e);
}
.u-drawer .u-tenant {
  color: var(--cx-muted);
}

.u-notif-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 0;
  background: transparent;
  color: #fff;
}
.u-hub-btn {
  width: 44px;
  height: 44px;
  border-radius: 0;
  background: transparent;
  color: #fff;
  opacity: 0.92;
}
.u-hub-btn.on {
  opacity: 1;
  background: color-mix(in srgb, #fff 16%, transparent);
  border-radius: 10px;
}
.u-hub-btn:active,
.u-notif-btn:active {
  background: transparent;
  opacity: 0.85;
}
.u-hub-btn.on:active {
  background: color-mix(in srgb, #fff 22%, transparent);
}

.u-notif-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #c62828;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
}

@media (max-width: 360px) {
  .u-product-mark {
    max-width: 110px;
  }
}

.u-search {
  flex-shrink: 0;
  padding: 0 14px 12px;
  background: var(--brand-primary, #0f766e);
  border-bottom: 0;
}

.u-search-input {
  width: 100%;
  border: 0;
  background: color-mix(in srgb, #fff 92%, transparent);
  color: #0f172a;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.u-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  padding-bottom: 8px;
}

.u-main--immersive {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 0;
}

.u-main--immersive > * {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.u-tabbar {
  flex-shrink: 0;
  display: grid;
  align-items: end;
  gap: 0;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 0 4px env(safe-area-inset-bottom);
  background: var(--cx-surface);
  border-top: 1px solid color-mix(in srgb, var(--cx-border) 80%, transparent);
  box-shadow: 0 -8px 24px color-mix(in srgb, var(--cx-text) 6%, transparent);
  z-index: 20;
  overflow: visible;
}

.u-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 52px;
  width: 100%;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
  text-decoration: none;
  border-radius: 14px;
  padding: 0;
  box-sizing: border-box;
  cursor: pointer;
}

.u-tab-ico {
  position: relative;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: inherit;
}

.u-tab-ico--primary {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: #fff;
  background: var(--brand-primary, #0f766e);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
  margin-top: -10px;
}

.u-tab--primary .u-tab-label {
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
}

.u-tab--primary.is-active .u-tab-ico--primary {
  filter: brightness(1.05);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--brand-primary, #0f766e) 45%, transparent);
}

.u-tab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  border: 2px solid var(--cx-surface);
  box-sizing: border-box;
  pointer-events: none;
}

.u-tab-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1;
}

.u-tab.is-active {
  color: var(--brand-primary, #0f766e);
  background: transparent;
}

.u-tab.is-disabled,
.u-tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.u-tab:active:not(:disabled) {
  filter: brightness(0.97);
}

.crear-fab {
  position: absolute;
  right: 16px;
  bottom: calc(72px + env(safe-area-inset-bottom));
  z-index: 40;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 999px;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--brand-primary, #0f766e) 40%, transparent),
    0 2px 8px rgba(15, 23, 42, 0.18);
  transition: transform 0.12s ease, filter 0.12s ease;
}
.crear-fab:active:not(:disabled) {
  transform: scale(0.96);
  filter: brightness(0.95);
}
.crear-fab.is-disabled,
.crear-fab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.u-composer-toast {
  position: absolute;
  left: 50%;
  bottom: calc(64px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 90;
  max-width: calc(100% - 24px);
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: var(--cx-surface);
  color: var(--brand-primary);
  border: 1px solid var(--cx-border);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.u-drawer-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
}

.u-drawer-backdrop {
  flex: 1;
  border: 0;
  background: rgba(15, 23, 42, 0.45);
}

.u-drawer {
  width: min(86vw, 320px);
  height: 100%;
  background: var(--cx-surface);
  color: var(--cx-text);
  display: flex;
  flex-direction: column;
  box-shadow: 8px 0 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(-12px);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.u-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 16px;
  padding-top: max(18px, env(safe-area-inset-top));
  border-bottom: 1px solid var(--cx-border);
}

.u-drawer-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.u-drawer-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.u-drawer-group-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--cx-text);
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}
.u-drawer-group-btn:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, transparent);
}
.u-drawer-group-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.u-drawer-chevron {
  color: var(--cx-muted, #64748b);
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.15s ease;
}
.u-drawer-chevron.open {
  transform: rotate(90deg);
}
.u-drawer-group-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 12px;
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, var(--brand-primary) 22%, transparent);
}

.u-drawer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--cx-text);
  font-weight: 600;
  font-size: 14px;
}

.u-drawer-link--child {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
}

.u-drawer-link:hover,
.u-drawer-link.router-link-active {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}

.u-drawer-foot {
  padding: 14px 16px max(16px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--cx-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.u-logout {
  border: 1px solid var(--cx-border);
  background: transparent;
  color: var(--cx-danger);
  border-radius: 14px;
  padding: 12px;
  font-weight: 600;
  font-size: 14px;
}
</style>
