<template>
  <div class="u-root">
    <div class="u-phone">
      <!-- Top bar: logo · Hola Nombre · Connectyx · lupa · avisos (hamburguesa solo en footer) -->
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
          <div class="u-topbar-greet">
            <p class="u-hello">Hola, {{ greetName }}</p>
          </div>
        </div>

        <div class="u-topbar-end">
          <span class="u-product-mark" :title="PRODUCT_NAME" :aria-label="PRODUCT_NAME">
            <img
              class="u-product-logo u-product-logo--topbar"
              :src="PRODUCT_LOGO_SVG"
              :alt="PRODUCT_NAME"
            />
          </span>
          <button
            type="button"
            class="u-tile-btn"
            :aria-label="showSearch ? 'Cerrar búsqueda' : 'Buscar'"
            :aria-pressed="showSearch"
            @click="toggleSearch"
          >
            <AppIcon name="search" :size="20" />
          </button>
          <button
            type="button"
            class="u-tile-btn u-notif-btn"
            aria-label="Avisos"
            title="Avisos"
            @click="router.push('/avisos')"
          >
            <AppIcon name="bell" :size="20" />
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
      <div v-if="showPointsHero" class="u-points-wrap">
        <PointsHero @open="goPointsEarn" />
      </div>

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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'
import AppIcon from '../components/AppIcon.vue'
import InstallAppBanner from '../components/InstallAppBanner.vue'
import PendingSurveysBanner from '../components/PendingSurveysBanner.vue'
import PointsHero from '../components/PointsHero.vue'
import PostComposerSheet from '../components/PostComposerSheet.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import { useUgcComposer } from '../composables/useUgcComposer'
import { useNotifBadge } from '../composables/useNotifBadge'
import { useChatBadge } from '../composables/useChatBadge'
import { iconFor } from '../utils/navIcons'
import { resolveMediaUrl } from '../utils/media'
import { PRODUCT_LOGO_LIGHT, PRODUCT_LOGO_SVG, PRODUCT_NAME } from '../constants/brand'

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

/** Grupo colapsable del drawer: feed + publicaciones propias + guardados */
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
      r === '/conocimiento' ||
      r === '/guardados' ||
      k === 'muro' ||
      k.includes('mis-publicaciones') ||
      k.includes('conocimiento') ||
      k.includes('guardados')
    )
  },
  order: ['/muro', '/muro/mias', '/conocimiento', '/guardados'],
}

const MURO_LABELS = {
  '/muro': 'Publicaciones',
  '/muro/mias': 'Mis publicaciones',
  '/conocimiento': 'Conocimiento',
  '/guardados': 'Mis guardados',
}

/** Grupo colapsable: vacaciones/permisos + ausencias (ola 17) */
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
      k === 'licencias' ||
      k === 'ausencias' ||
      k.includes('ausentismo')
    )
  },
  order: ['/licencias', '/ausencias'],
  labels: {
    '/licencias': 'Vacaciones',
    '/ausencias': 'Ausencias',
  },
}

/** Grupo colapsable: mis solicitudes + aprobaciones */
const PROCESOS_GROUP = {
  id: 'procesos',
  label: 'Procesos',
  icon: 'inbox',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/solicitudes' ||
      r === '/aprobaciones' ||
      k === 'solicitudes' ||
      k === 'aprobaciones' ||
      k.includes('solicitud') ||
      k.includes('aprobacion')
    )
  },
  order: ['/solicitudes', '/aprobaciones'],
  labels: {
    '/solicitudes': 'Mis solicitudes',
    '/aprobaciones': 'Aprobaciones',
  },
}

/** Grupo colapsable: beneficios, directorio, docs, asistente, chat, encuestas */
const HERRAMIENTAS_GROUP = {
  id: 'herramientas',
  label: 'Herramientas',
  icon: 'grid',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/beneficios' ||
      r === '/directorio' ||
      r === '/docs' ||
      r === '/asistente' ||
      r === '/chat' ||
      r === '/encuestas' ||
      k === 'beneficios' ||
      k === 'directorio' ||
      k === 'docs' ||
      k === 'asistente' ||
      k === 'chat' ||
      k === 'encuestas' ||
      k.includes('beneficio') ||
      k.includes('directorio') ||
      k.includes('encuesta')
    )
  },
  order: ['/beneficios', '/directorio', '/docs', '/asistente', '/chat', '/encuestas'],
  labels: {
    '/beneficios': 'Beneficios',
    '/directorio': 'Directorio',
    '/docs': 'Mis documentos',
    '/asistente': 'Asistente',
    '/chat': 'Chat',
    '/encuestas': 'Encuestas',
  },
}

/** Grupo colapsable: bienvenida, políticas, mi legajo */
const RRHH_GROUP = {
  id: 'rrhh',
  label: 'RRHH',
  icon: 'user',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/bienvenida' ||
      r === '/politicas' ||
      r === '/mi-legajo' ||
      k === 'bienvenida' ||
      k === 'politicas' ||
      k === 'mi-legajo' ||
      k.includes('legajo') ||
      k.includes('politica') ||
      k.includes('onboarding')
    )
  },
  order: ['/bienvenida', '/politicas', '/mi-legajo'],
  labels: {
    '/bienvenida': 'Bienvenida',
    '/politicas': 'Políticas',
    '/mi-legajo': 'Mi legajo',
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

const menu = ref([...DEFAULT_MENU])
const openGroups = reactive({
  muro: false,
  procesos: false,
  licencias: false,
  herramientas: false,
  rrhh: false,
  notificaciones: false,
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

/** Garantiza Vacaciones + Ausencias (ola 17) en tenants con menú viejo. */
function ensureLicenciasMenuItems(items) {
  const next = items.map(normalizeLicenciasItem)
  const has = (route) => next.some((i) => i.route === route)
  const solIdx = next.findIndex(
    (i) => i.route === '/solicitudes' || String(i.key).includes('solicitud'),
  )
  const at = solIdx >= 0 ? solIdx + 1 : next.length
  if (!has('/licencias')) {
    next.splice(at, 0, {
      key: 'licencias',
      label: 'Vacaciones',
      route: '/licencias',
      icon: 'clipboard',
    })
  }
  const licIdx = next.findIndex((i) => i.route === '/licencias')
  const ausAt = licIdx >= 0 ? licIdx + 1 : at + 1
  if (!has('/ausencias')) {
    next.splice(ausAt, 0, {
      key: 'ausencias',
      label: 'Ausencias',
      route: '/ausencias',
      icon: 'list',
    })
  }
  return next
}

/** Garantiza Beneficios (ola 20) en el drawer U. */
function ensureBeneficiosMenuItems(items) {
  const next = [...items]
  if (
    next.some(
      (i) =>
        i.route === '/beneficios' ||
        String(i.key || '').includes('beneficio') ||
        String(i.label || '')
          .toLowerCase()
          .includes('beneficio'),
    )
  ) {
    return next
  }
  const dirIdx = next.findIndex(
    (i) => i.route === '/directorio' || String(i.key).includes('directorio'),
  )
  const hubIdx = next.findIndex(
    (i) => i.route === '/accesos' || String(i.key).includes('hub') || String(i.key).includes('acceso'),
  )
  const item = { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift' }
  const at = dirIdx >= 0 ? dirIdx + 1 : hubIdx >= 0 ? hubIdx : next.length
  next.splice(at, 0, item)
  return next
}

/** Garantiza Espacios + Oficina (ola 21) en el drawer U. */
function ensureEspaciosMenuItems(items) {
  const next = [...items]
  const hasEspacios = next.some(
    (i) =>
      i.route === '/espacios' ||
      String(i.key || '').includes('espacio') ||
      String(i.label || '')
        .toLowerCase()
        .includes('espacio'),
  )
  const hasOficina = next.some(
    (i) =>
      i.route === '/oficina' ||
      String(i.key || '') === 'oficina' ||
      String(i.label || '')
        .toLowerCase()
        .includes('oficina'),
  )
  const benIdx = next.findIndex(
    (i) => i.route === '/beneficios' || String(i.key || '').includes('beneficio'),
  )
  const hubIdx = next.findIndex(
    (i) => i.route === '/accesos' || String(i.key).includes('hub') || String(i.key).includes('acceso'),
  )
  let at = benIdx >= 0 ? benIdx : hubIdx >= 0 ? hubIdx : next.length
  if (!hasEspacios) {
    next.splice(at, 0, { key: 'espacios', label: 'Espacios', route: '/espacios', icon: 'building' })
    at += 1
  }
  if (!hasOficina) {
    next.splice(at, 0, { key: 'oficina', label: 'Oficina', route: '/oficina', icon: 'grid' })
  }
  return next
}

/** Garantiza Mi asistencia (ola 18) en el drawer U. */
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
  const licIdx = next.findIndex(
    (i) => i.route === '/licencias' || String(i.key || '').includes('licencia'),
  )
  const at = licIdx >= 0 ? licIdx + 1 : next.length
  next.splice(at, 0, {
    key: 'asistencia',
    label: 'Mi asistencia',
    route: '/mi-asistencia',
    icon: 'pin',
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
  HERRAMIENTAS_GROUP,
  RRHH_GROUP,
  NOTIFICACIONES_GROUP,
]

function normalizeGroupItem(group, item) {
  if (group.id === 'muro') return normalizeMuroItem(item)
  if (group.id === 'licencias') return normalizeLicenciasItem(item)
  if (group.id === 'procesos') return normalizeProcesosItem(item)
  if (group.id === 'herramientas') return normalizeHerramientasItem(item)
  if (group.id === 'rrhh') return normalizeRrhhItem(item)
  if (group.id === 'notificaciones') return normalizeNotificacionesItem(item)
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

const greetName = computed(() => {
  const u = auth.user || {}
  const full = String(u.nombre || '').trim()
  if (full) return full.split(/\s+/)[0]
  const user = String(u.usuario || '').trim()
  if (user) return user
  return 'vos'
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
  const p = route.path || ''
  // Solo en el feed del muro (no en detalle /muro/:id ni /muro/mias)
  return p === '/muro' || p === '/muro/'
})

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

const showPointsHero = computed(() => {
  if (route.path.startsWith('/home-alt')) return false
  if (route.path.startsWith('/beneficios')) return false
  if (route.path.startsWith('/chat')) return false
  if (immersiveMain.value) return false
  const caps = auth.tenant?.capabilities || []
  return caps.includes('beneficios.billetera') || caps.includes('beneficios')
})

function goPointsEarn() {
  router.push({ path: '/beneficios', query: { tab: 'earn' } })
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
  if (route.name !== 'muro') router.push({ name: 'muro', query: { q: searchQ.value } })
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
      ensureAsistenciaMenuItems(
        ensureEspaciosMenuItems(
          ensureBeneficiosMenuItems(
            ensureOnboardingMenuItems(
              ensureLicenciasMenuItems(ensureHelpMenuItems(ensureMuroMenuItems(next))),
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
    menu.value = next
  } catch {
    menu.value = ensureAgendaMenuItems(
      ensureAsistenciaMenuItems(
        ensureEspaciosMenuItems(
          ensureBeneficiosMenuItems(
            ensureOnboardingMenuItems(
              ensureLicenciasMenuItems(ensureHelpMenuItems(ensureMuroMenuItems([...DEFAULT_MENU]))),
            ),
          ),
        ),
      ),
    )
  }
  refreshBadge()
  refreshChatBadge()
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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
  flex: 1;
}

.u-avatar-logo {
  width: 40px;
  height: 40px;
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
  font-size: 1rem;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  font-family: var(--font-display);
}

.u-topbar-greet {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.u-hello {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.u-topbar-end {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.u-product-mark {
  display: inline-flex;
  align-items: center;
  margin-right: 2px;
  max-width: 112px;
}
.u-product-logo {
  display: block;
  width: auto;
  height: auto;
  object-fit: contain;
}
.u-product-logo--topbar {
  max-height: 18px;
  max-width: 112px;
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
    display: none;
  }
  .u-hello {
    font-size: 1.12rem;
  }
}

.u-points-wrap {
  padding: 8px 12px 0;
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
  background: #fff;
  border-top: 1px solid color-mix(in srgb, var(--cx-border) 80%, transparent);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.04);
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
  color: #64748b;
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
  border: 2px solid #fff;
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
