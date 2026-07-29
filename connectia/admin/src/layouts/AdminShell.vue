<template>
  <div class="admin-shell">
    <aside class="admin-aside">
      <p class="font-semibold text-lg">{{ auth.isPlatformAdmin ? 'Connectia · Plataforma' : 'Connectia Admin' }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ auth.tenant?.nombre }}</p>
      <p v-if="auth.isPlatformAdmin" class="mt-2 text-[10px] uppercase tracking-wide text-amber-400">Admin general</p>
      <p v-else-if="!auth.isFullAdmin" class="mt-2 text-[10px] uppercase tracking-wide text-teal-400">Gestión (permisos)</p>
      <nav class="mt-6 space-y-1 flex-1">
        <template v-for="entry in menuTree" :key="entry.id">
          <RouterLink
            v-if="entry.type === 'link'"
            :to="entry.route"
            class="block rounded px-3 py-2 text-sm hover:bg-slate-800"
            :active-class="entry.route === '/' ? '' : '!bg-teal-700'"
            exact-active-class="!bg-teal-700"
          >
            {{ entry.label }}
          </RouterLink>
          <div v-else class="pt-2 first:pt-0">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              @click="toggleGroup(entry.id)"
            >
              <span>{{ entry.label }}</span>
              <span class="text-slate-500 transition-transform" :class="openGroups[entry.id] ? 'rotate-90' : ''">›</span>
            </button>
            <div v-show="openGroups[entry.id]" class="mt-0.5 space-y-0.5 border-l border-slate-700 ml-3 pl-2">
              <RouterLink
                v-for="item in entry.items"
                :key="item.key"
                :to="item.route"
                class="block rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                active-class="!bg-teal-700 !text-white"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </div>
        </template>
      </nav>
      <button class="text-left text-sm text-slate-400 hover:text-white" @click="auth.logout(); $router.push('/login')">
        Salir
      </button>
    </aside>
    <main ref="mainEl" class="admin-main" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { capabilityForRoute } from '../utils/adminCapabilities'

const auth = useAuthStore()
const route = useRoute()
const apiMenu = ref([])
const openGroups = reactive({})
const mainEl = ref(null)

async function scrollContentToTop() {
  await nextTick()
  if (mainEl.value) mainEl.value.scrollTop = 0
  window.scrollTo(0, 0)
  // Enfoca el área de contenido para que el título quede arriba / accesible
  mainEl.value?.focus?.({ preventScroll: true })
}

const platformMenu = [
  { key: 'home', label: 'Dashboard', route: '/' },
  { key: 'subs', label: 'Suscriptores', route: '/suscriptores' },
]

const fallbackMenu = [
  { key: 'home', label: 'Dashboard', route: '/' },
  { key: 'usuarios', label: 'Usuarios', route: '/usuarios' },
  { key: 'legajos', label: 'Legajos RRHH', route: '/legajos' },
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
  { key: 'postcats', label: 'Categorías de pubs', route: '/categorias-publicaciones' },
  { key: 'newsletters', label: 'Newsletters', route: '/newsletters' },
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
    label: 'Solicitudes',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        r.includes('solicitud') ||
        r === '/workflows' ||
        [
          'admin.requests',
          'admin.reqsend',
          'admin.reqtypes',
          'admin.reqstates',
          'admin.workflows',
          'solicitudes',
          'enviar',
          'tipos',
          'estados',
          'workflows',
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
        ['/licencias', '/tipos-licencia', '/feriados', '/ausentismos'].includes(r) ||
        [
          'admin.licencias',
          'admin.tipos-licencia',
          'admin.feriados',
          'admin.ausentismos',
          'licencias',
          'tipos-licencia',
          'feriados',
          'ausentismos',
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
        ['admin.users', 'admin.org', 'admin.roles', 'usuarios', 'org', 'roles'].includes(k)
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
        ['/legajos', '/catalogos-rrhh', '/onboarding'].includes(r) ||
        ['admin.legajos', 'admin.hrcatalog', 'admin.onboarding', 'legajos', 'hrcatalog', 'onboarding'].includes(k)
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
        ['/publicaciones', '/categorias-publicaciones', '/encuestas', '/notificaciones', '/saludos', '/eventos'].includes(r) ||
        [
          'admin.pubs',
          'admin.postcats',
          'admin.surveys',
          'admin.notifications',
          'admin.saludos',
          'admin.eventos',
          'pubs',
          'postcats',
          'encuestas',
          'notificaciones',
          'saludos',
          'eventos',
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
        ['/emociones', '/newsletters', '/moderacion-comentarios', '/chat-moderacion'].includes(r) ||
        [
          'admin.engagement',
          'admin.newsletters',
          'admin.comentarios',
          'admin.chatmod',
          'engagement',
          'newsletters',
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
        ['/documentos', '/directorio', '/beneficios', '/accesos', '/ayuda', '/politicas'].includes(r) ||
        [
          'admin.docs',
          'admin.directorio',
          'admin.beneficios',
          'admin.hub',
          'admin.ayuda',
          'admin.politicas',
          'documentos',
          'directorio',
          'beneficios',
          'accesos',
          'hub',
          'ayuda',
          'politicas',
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
        ['/comunidad', '/menu', '/parametros', '/asistente-kb'].includes(r) ||
        [
          'admin.tenants',
          'admin.menu',
          'admin.params',
          'admin.kb',
          'admin.ia',
          'comunidad',
          'menu',
          'parametros',
          'asistente-kb',
          'kb',
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

/** Si el menú en DB aún no tiene Legajos RRHH, lo insertamos tras Usuarios. */
function withLegajosLink(items) {
  if (!auth.can('admin.legajos')) return items
  if (items.some((i) => i.route === '/legajos' || i.key === 'admin.legajos' || i.key === 'legajos')) {
    return items
  }
  const entry = { key: 'admin.legajos', label: 'Legajos RRHH', route: '/legajos', icon: 'file' }
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

function groupForItem(item) {
  return MENU_GROUPS.find((g) => g.match(item)) || null
}

const LABEL_BY_ROUTE = {
  '/moderacion-comentarios': 'Moderación de comentarios',
  '/chat-moderacion': 'Moderación de chat',
  '/workflows': 'Flujos de Aprobación',
  '/directorio': 'Datos útiles',
  '/asistente-kb': 'Base de conocimientos',
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
  return withCanonicalLabels(
    withKbLink(
      withChatModLink(
        withModeracionLink(
          withWorkflowsLink(
            withSaludosLink(
              withNotificacionesLink(
                withNewslettersLink(
                  withEngagementLink(
                    withCategoriasPubsLink(
                      withAyudaPoliticasLinks(
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
  )
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
      id: item.key || item.route,
      label: item.label,
      route: item.route,
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
              if (r === '/feriados') return 1
              if (r === '/licencias') return 2
              if (r === '/tipos-licencia') return 3
              if (r === '/ausentismos') return 4
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
      id,
      label: item.label,
      route: item.route,
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
watch(() => route.path, () => {
  syncOpenGroups()
  scrollContentToTop()
})

onMounted(async () => {
  scrollContentToTop()
  if (auth.isPlatformAdmin) return
  try {
    const { data } = await api.get('/menu', { params: { channel: 'a' } })
    apiMenu.value = data.items || []
  } catch {
    apiMenu.value = []
  }
})
</script>

<style scoped>
.admin-shell {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f8fafc;
}
.admin-aside {
  width: 14rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: #0f172a;
  color: #f1f5f9;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.admin-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 2rem;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  outline: none;
}
</style>
