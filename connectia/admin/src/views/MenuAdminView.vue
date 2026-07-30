<template>
  <div class="menu-page">
    <header class="menu-hero">
      <div>
        <h1>Menú de la app</h1>
        <p>Qué ven los miembros en la app y qué aparece en este panel.</p>
        <ScreenHelp
          purpose="Controla la navegación visible: menú lateral del celular y accesos del admin. Lo oculto no se borra, solo deja de mostrarse."
          can-do="Elegí el canal a la izquierda, mirá la vista previa al centro y editá cada botón a la derecha."
        />
      </div>
      <button type="button" class="btn-primary" @click="openNew">Agregar función</button>
    </header>

    <p v-if="error" class="menu-error">{{ error }}</p>
    <p v-if="okMsg" class="menu-ok">{{ okMsg }}</p>

    <div class="menu-workspace">
      <!-- 20% — Canal -->
      <aside class="menu-col menu-col-channel" aria-label="Canal">
        <p class="col-label">Canal</p>
        <div class="channel-list" role="tablist" aria-orientation="vertical">
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'u'"
            :class="{ on: filter === 'u' }"
            @click="setFilter('u')"
          >
            <span class="channel-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M10 18h4" />
              </svg>
            </span>
            <span class="channel-copy">
              <strong>App móvil</strong>
              <small>Menú de miembros</small>
            </span>
            <span class="channel-count">{{ countU }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'a'"
            :class="{ on: filter === 'a' }"
            @click="setFilter('a')"
          >
            <span class="channel-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M8 20h8" />
                <path d="M7 8h4v6H7z" />
              </svg>
            </span>
            <span class="channel-copy">
              <strong>Panel admin</strong>
              <small>Menú lateral</small>
            </span>
            <span class="channel-count">{{ countA }}</span>
          </button>
        </div>
      </aside>

      <!-- 30% — Preview vertical -->
      <section class="menu-col menu-col-preview" aria-label="Vista previa">
        <p class="col-label">
          Así se ve {{ filter === 'u' ? 'en la app' : 'en el admin' }}
        </p>

        <!-- Preview drawer app móvil -->
        <div v-if="filter === 'u'" class="preview-frame preview-app">
          <div class="preview-drawer">
            <div class="preview-drawer-head">
              <div>
                <p class="preview-brand">Connectyx</p>
                <p class="preview-tenant">Miembro</p>
              </div>
              <span class="preview-close" aria-hidden="true">×</span>
            </div>
            <nav class="preview-drawer-nav">
              <template v-for="entry in previewTree" :key="entry.id">
                <div v-if="entry.type === 'link'" class="preview-drawer-link">
                  <span class="preview-drawer-ico">{{ iconGlyph(entry.icon) }}</span>
                  <span>{{ entry.label }}</span>
                </div>
                <div v-else class="preview-group">
                  <button
                    type="button"
                    class="preview-group-btn"
                    :aria-expanded="openPreviewGroups[entry.id]"
                    @click="togglePreviewGroup(entry.id)"
                  >
                    <span class="preview-group-left">
                      <span class="preview-drawer-ico">{{ iconGlyph(entry.icon || 'home') }}</span>
                      <span>{{ entry.label }}</span>
                    </span>
                    <span class="preview-chevron" :class="{ open: openPreviewGroups[entry.id] }" aria-hidden="true">›</span>
                  </button>
                  <div v-show="openPreviewGroups[entry.id]" class="preview-group-items">
                    <div
                      v-for="item in entry.items"
                      :key="item.id || item.key || item.route"
                      class="preview-drawer-link preview-drawer-link--child"
                    >
                      <span class="preview-drawer-ico">{{ iconGlyph(item.icon) }}</span>
                      <span>{{ item.label }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <div v-if="!previewTree.length" class="preview-empty">Ninguna función visible</div>
            </nav>
            <div class="preview-drawer-foot">Cerrar sesión</div>
          </div>
        </div>

        <!-- Preview sidebar admin -->
        <div v-else class="preview-frame preview-admin">
          <aside class="preview-sidebar">
            <div class="preview-sidebar-head">
              <p class="preview-sidebar-title">Connectyx Admin</p>
              <p class="preview-sidebar-sub">Comunidad</p>
            </div>
            <nav class="preview-sidebar-nav">
              <template v-for="entry in previewTree" :key="entry.id">
                <div v-if="entry.type === 'link'" class="preview-sidebar-link">
                  <span class="preview-sidebar-ico">{{ iconGlyph(entry.icon) }}</span>
                  {{ entry.label }}
                </div>
                <div v-else class="preview-admin-group">
                  <button
                    type="button"
                    class="preview-admin-group-btn"
                    :aria-expanded="openPreviewGroups[entry.id]"
                    @click="togglePreviewGroup(entry.id)"
                  >
                    <span>{{ entry.label }}</span>
                    <span class="preview-chevron preview-chevron--admin" :class="{ open: openPreviewGroups[entry.id] }" aria-hidden="true">›</span>
                  </button>
                  <div v-show="openPreviewGroups[entry.id]" class="preview-admin-group-items">
                    <div
                      v-for="item in entry.items"
                      :key="item.id || item.key || item.route"
                      class="preview-sidebar-link preview-sidebar-link--child"
                    >
                      <span class="preview-sidebar-ico">{{ iconGlyph(item.icon) }}</span>
                      {{ item.label }}
                    </div>
                  </div>
                </div>
              </template>
              <div v-if="!previewTree.length" class="preview-empty">Ningún ítem visible</div>
            </nav>
            <div class="preview-sidebar-foot">Salir</div>
          </aside>
        </div>
      </section>

      <!-- 50% — Botones y acciones -->
      <section class="menu-col menu-col-actions" aria-label="Botones del menú">
        <div class="actions-head">
          <p class="col-label">Botones y acciones</p>
          <span class="actions-meta">{{ sorted.length }} función{{ sorted.length === 1 ? '' : 'es' }}</span>
        </div>

        <div class="menu-list">
          <article
            v-for="(item, idx) in sorted"
            :key="item.id"
            class="menu-card"
            :class="{ off: !item.activo }"
          >
            <div class="menu-card-main">
              <div class="menu-ico" aria-hidden="true">{{ iconGlyph(item.icon) }}</div>
              <div class="menu-copy">
                <h2>{{ item.label }}</h2>
                <p>{{ destinationLabel(item.route) }}</p>
                <p v-if="audienceHint(item)" class="menu-audience">{{ audienceHint(item) }}</p>
              </div>
            </div>

            <div class="menu-card-actions">
              <div class="order-btns">
                <button type="button" class="icon-btn" title="Subir" aria-label="Subir" :disabled="idx === 0" @click="move(item, -1)">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 14l6-6 6 6"/></svg>
                </button>
                <button type="button" class="icon-btn" title="Bajar" aria-label="Bajar" :disabled="idx === sorted.length - 1" @click="move(item, 1)">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 10l6 6 6-6"/></svg>
                </button>
              </div>
              <button
                type="button"
                class="icon-btn"
                :class="{ on: item.activo }"
                :title="item.activo ? 'Visible — clic para ocultar' : 'Oculta — clic para mostrar'"
                :aria-label="item.activo ? 'Ocultar' : 'Mostrar'"
                @click="toggleActivo(item, !item.activo)"
              >
                <svg v-if="item.activo" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 004.2 4.2"/><path d="M9.9 5.1A11 11 0 0122 12s-1.5 2.6-4.2 4.5"/><path d="M6.1 6.1C3.9 7.8 2 12 2 12s4 7 10 7c1.1 0 2.1-.2 3.1-.5"/>
                </svg>
              </button>
              <button type="button" class="icon-btn" title="Editar" aria-label="Editar" @click="edit(item)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
                </svg>
              </button>
              <button type="button" class="icon-btn danger" title="Quitar" aria-label="Quitar" @click="remove(item)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
                </svg>
              </button>
            </div>
          </article>

          <p v-if="!sorted.length && !error" class="menu-empty">
            Todavía no hay funciones en este menú. Agregá la primera.
          </p>
        </div>
      </section>
    </div>

    <!-- Editor amigable -->
    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="sheet-panel" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar función' : 'Nueva función' }}</h2>
        <p class="sheet-sub">
          Elegí un nombre claro: es lo que van a tocar las personas en la app.
        </p>

        <label class="field">
          <span>Nombre en el menú</span>
          <input v-model="draft.label" required placeholder="Ej. Muro, Mis solicitudes…" @input="onLabelInput" />
        </label>

        <label class="field">
          <span>Dónde abre</span>
          <select v-model="preset" @change="applyPreset">
            <option v-for="p in presetsForChannel" :key="p.key" :value="p.key">{{ p.label }}</option>
            <option value="__custom">Otra pantalla (avanzado)</option>
          </select>
        </label>

        <label v-if="preset === '__custom'" class="field">
          <span>Ruta personalizada</span>
          <input v-model="draft.route" required placeholder="/mi-pantalla" />
        </label>

        <label class="field">
          <span>Ícono</span>
          <div class="icon-grid">
            <button
              v-for="ic in icons"
              :key="ic.id"
              type="button"
              class="icon-pick"
              :class="{ on: draft.icon === ic.id }"
              @click="draft.icon = ic.id"
            >
              <span>{{ ic.glyph }}</span>
              <small>{{ ic.name }}</small>
            </button>
          </div>
        </label>

        <label class="field">
          <span>Quién la ve</span>
          <select v-model="whoSees">
            <option value="all">Todas las personas de la comunidad</option>
            <option value="admin">Solo quienes administran</option>
            <option value="member">Solo miembros (sin rol admin)</option>
          </select>
        </label>

        <label class="toggle block">
          <input v-model="draft.activo" type="checkbox" />
          <span>Mostrar en el menú</span>
        </label>

        <label v-if="draft.channel !== 'a'" class="toggle block">
          <input v-model="draft.showInTabbar" type="checkbox" />
          <span>Mostrar en la botonera inferior (app)</span>
        </label>

        <label v-if="draft.showInTabbar" class="field">
          <span>Orden en botonera</span>
          <input v-model.number="draft.tabOrder" type="number" min="1" max="999" />
        </label>

        <label v-if="draft.channel !== 'u'" class="toggle block">
          <input v-model="draft.showInAdminSidebar" type="checkbox" />
          <span>También en el sidebar (admin)</span>
        </label>

        <label v-if="draft.channel !== 'u'" class="toggle block">
          <input v-model="draft.showInAdminHeader" type="checkbox" />
          <span>También en el menú superior (admin)</span>
        </label>

        <label class="field">
          <span>Al tocar</span>
          <select v-model="draft.actionType">
            <option value="navigate">Abrir pantalla</option>
            <option value="compose_post">Crear publicación (UGC)</option>
          </select>
        </label>

        <label v-if="draft.actionType === 'compose_post'" class="field">
          <span>Tipo de publicación sugerido</span>
          <select v-model="composeTipo">
            <option value="">General / sin forzar</option>
            <option value="noticia">Noticia</option>
            <option value="aviso">Aviso</option>
            <option value="beneficio">Beneficio</option>
            <option value="evento">Evento</option>
            <option value="general">General</option>
          </select>
        </label>

        <details class="advanced">
          <summary>Opciones técnicas</summary>
          <label class="field">
            <span>Identificador interno</span>
            <input v-model="draft.key" :disabled="Boolean(draft.id)" required />
          </label>
          <label class="field">
            <span>Canal</span>
            <select v-model="draft.channel">
              <option value="u">Solo app de miembros</option>
              <option value="a">Solo panel admin</option>
              <option value="both">Ambos</option>
            </select>
          </label>
        </details>

        <p v-if="formError" class="menu-error">{{ formError }}</p>

        <div class="sheet-actions">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button class="btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

/** Misma agrupación que AppShell (drawer U) */
const MURO_GROUP = {
  id: 'muro',
  label: 'Muro',
  match: (item) => {
    const r = String(item.route || '')
    const k = String(item.key || '').toLowerCase()
    return (
      r === '/muro' ||
      r === '/muro/mias' ||
      r === '/guardados' ||
      k === 'muro' ||
      k.includes('mis-publicaciones') ||
      k.includes('guardados')
    )
  },
  order: ['/muro', '/muro/mias', '/guardados'],
}

const MURO_LABELS = {
  '/muro': 'Publicaciones',
  '/muro/mias': 'Mis publicaciones',
  '/guardados': 'Mis guardados',
}

/** Misma agrupación que AdminShell (sidebar A) */
const ADMIN_MENU_GROUPS = [
  {
    id: 'solicitudes',
    label: 'Procesos',
    match: (item) => {
      const r = String(item.route || '')
      const k = String(item.key || '')
      return (
        r.includes('solicitud') ||
        r === '/workflows' ||
        r === '/reservas' ||
        r === '/asistencia' ||
        r === '/pedidos' ||
        r === '/relevamientos' ||
        [
          'admin.requests',
          'admin.reqsend',
          'admin.reqtypes',
          'admin.reqstates',
          'admin.workflows',
          'admin.reservas',
          'admin.asistencia',
          'admin.pedidos',
          'admin.relevamientos',
          'solicitudes',
          'enviar',
          'tipos',
          'estados',
          'workflows',
          'reservas',
          'asistencia',
          'pedidos',
          'relevamientos',
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
        ['/licencias', '/tipos-licencia', '/ausentismos'].includes(r) ||
        [
          'admin.licencias',
          'admin.tipos-licencia',
          'admin.ausentismos',
          'licencias',
          'tipos-licencia',
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
        r === '/documentos' ||
        ['admin.users', 'admin.org', 'admin.docs', 'usuarios', 'org', 'documentos'].includes(k)
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
        ['/publicaciones', '/saludos', '/eventos', '/beneficios', '/directorio'].includes(r) ||
        [
          'admin.pubs',
          'admin.saludos',
          'admin.eventos',
          'admin.beneficios',
          'admin.directorio',
          'pubs',
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
        ['/ayuda', '/modo-tv', '/live', '/encuestas'].includes(r) ||
        [
          'admin.ayuda',
          'admin.tv',
          'admin.live',
          'admin.surveys',
          'ayuda',
          'modo-tv',
          'tv',
          'live',
          'encuestas',
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

function adminGroupForItem(item) {
  return ADMIN_MENU_GROUPS.find((g) => g.match(item)) || null
}

function normalizeMuroItem(item) {
  const label = MURO_LABELS[String(item.route || '')]
  return label && item.label !== label ? { ...item, label } : item
}

/** Igual que AppShell: asegura hijos del grupo Muro en la preview */
function ensureMuroPreviewItems(items) {
  const next = items.map(normalizeMuroItem)
  const has = (route) => next.some((i) => i.route === route)
  const muroIdx = next.findIndex((i) => i.route === '/muro' || String(i.key || '').includes('muro'))
  if (muroIdx < 0) return next
  const insertAt = muroIdx + 1
  if (!has('/muro/mias')) {
    next.splice(insertAt, 0, {
      id: '__preview.mis-publicaciones',
      key: 'mis-publicaciones',
      label: 'Mis publicaciones',
      route: '/muro/mias',
      icon: 'inbox',
      activo: true,
      _synthetic: true,
    })
  }
  if (!has('/guardados')) {
    const miasIdx = next.findIndex((i) => i.route === '/muro/mias')
    const at = miasIdx >= 0 ? miasIdx + 1 : insertAt
    next.splice(at, 0, {
      id: '__preview.guardados',
      key: 'guardados',
      label: 'Mis guardados',
      route: '/guardados',
      icon: 'bookmark',
      activo: true,
      _synthetic: true,
    })
  }
  return next
}

function buildAppPreviewTree(items) {
  const used = new Set()
  const tree = []
  const muroChildren = items
    .filter((item) => MURO_GROUP.match(item))
    .map(normalizeMuroItem)
    .sort((a, b) => {
      const ai = MURO_GROUP.order.indexOf(a.route)
      const bi = MURO_GROUP.order.indexOf(b.route)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })

  for (const c of muroChildren) used.add(c.id || c.key || c.route)

  if (muroChildren.length) {
    tree.push({
      type: 'group',
      id: MURO_GROUP.id,
      label: MURO_GROUP.label,
      icon: 'home',
      items: muroChildren,
    })
  }

  for (const item of items) {
    const id = item.id || item.key || item.route
    if (used.has(id)) continue
    tree.push({
      type: 'link',
      id,
      key: item.key,
      label: item.label,
      route: item.route,
      icon: item.icon,
    })
  }
  return tree
}

function buildAdminPreviewTree(items) {
  const used = new Set()
  const tree = []

  for (const item of items) {
    if (adminGroupForItem(item)) continue
    tree.push({
      type: 'link',
      id: item.id || item.key || item.route,
      label: item.label,
      route: item.route,
      icon: item.icon,
    })
    used.add(item.id || item.key || item.route)
  }

  for (const group of ADMIN_MENU_GROUPS) {
    const children = items.filter((item) => {
      const id = item.id || item.key || item.route
      if (used.has(id)) return false
      return group.match(item)
    })
    if (!children.length) continue
    for (const c of children) used.add(c.id || c.key || c.route)
    tree.push({
      type: 'group',
      id: group.id,
      label: group.label,
      items: children,
    })
  }

  for (const item of items) {
    const id = item.id || item.key || item.route
    if (used.has(id)) continue
    tree.push({
      type: 'link',
      id,
      label: item.label,
      route: item.route,
      icon: item.icon,
    })
  }
  return tree
}

const PRESETS_U = [
  { label: 'Publicaciones', route: '/muro', key: 'muro', icon: 'home' },
  { label: 'Mis publicaciones', route: '/muro/mias', key: 'mis-publicaciones', icon: 'inbox' },
  { label: 'Conocimiento', route: '/conocimiento', key: 'conocimiento', icon: 'file' },
  { label: 'Mis guardados', route: '/guardados', key: 'guardados', icon: 'bookmark' },
  { label: 'Publicar aviso', route: '/muro', key: 'compose-aviso', icon: 'megaphone' },
  { label: 'Mis solicitudes', route: '/solicitudes', key: 'solicitudes', icon: 'inbox' },
  { label: 'Encuestas', route: '/encuestas', key: 'encuestas', icon: 'clipboard' },
  { label: 'Agenda', route: '/agenda', key: 'agenda', icon: 'calendar' },
  { label: 'Mis documentos', route: '/docs', key: 'docs', icon: 'file' },
  { label: 'Mi legajo', route: '/mi-legajo', key: 'mi-legajo', icon: 'file' },
  { label: 'Bienvenida', route: '/bienvenida', key: 'bienvenida', icon: 'sparkles' },
  { label: 'Enlaces', route: '/accesos', key: 'hub', icon: 'grid' },
  { label: 'Chat', route: '/chat', key: 'chat', icon: 'chat' },
]

const PRESETS_A = [
  { label: 'Dashboard', route: '/', key: 'admin.home', icon: 'home' },
  { label: 'Usuarios', route: '/usuarios', key: 'admin.users', icon: 'grid' },
  { label: 'Listado de legajos', route: '/legajos', key: 'admin.legajos', icon: 'file' },
  { label: 'Catálogos RRHH', route: '/catalogos-rrhh', key: 'admin.hrcatalog', icon: 'tag' },
  { label: 'Onboarding y egreso', route: '/onboarding', key: 'admin.onboarding', icon: 'sparkles' },
  { label: 'Datos útiles', route: '/directorio', key: 'admin.directorio', icon: 'grid' },
  { label: 'Eventos', route: '/eventos', key: 'admin.eventos', icon: 'calendar' },
  { label: 'Organización', route: '/organizacion', key: 'admin.org', icon: 'building' },
  { label: 'Comunidad', route: '/comunidad', key: 'admin.tenants', icon: 'building' },
  { label: 'Menú de la app', route: '/menu', key: 'admin.menu', icon: 'menu' },
  { label: 'Base de conocimientos', route: '/asistente-kb', key: 'admin.kb', icon: 'sparkles' },
  { label: 'Bandeja', route: '/solicitudes', key: 'admin.requests', icon: 'inbox' },
  { label: 'Feriados', route: '/feriados', key: 'admin.feriados', icon: 'calendar' },
  { label: 'Licencias', route: '/licencias', key: 'admin.licencias', icon: 'clipboard' },
  { label: 'Tipos de licencia', route: '/tipos-licencia', key: 'admin.tipos-licencia', icon: 'tag' },
  { label: 'Ausentismos', route: '/ausentismos', key: 'admin.ausentismos', icon: 'list' },
  { label: 'Publicaciones', route: '/publicaciones', key: 'admin.pubs', icon: 'megaphone' },
  { label: 'Stories', route: '/stories', key: 'admin.stories', icon: 'sparkles' },
  { label: 'Emociones', route: '/emociones', key: 'admin.engagement', icon: 'heart' },
  { label: 'Encuestas', route: '/encuestas', key: 'admin.surveys', icon: 'clipboard' },
  { label: 'Relevamientos de campo', route: '/relevamientos', key: 'admin.relevamientos', icon: 'map' },
  { label: 'Documentos', route: '/documentos', key: 'admin.docs', icon: 'file' },
  { label: 'Enlaces', route: '/accesos', key: 'admin.hub', icon: 'grid' },
]

const icons = [
  { id: 'home', name: 'Inicio', glyph: '⌂' },
  { id: 'bookmark', name: 'Guardados', glyph: '▤' },
  { id: 'inbox', name: 'Bandeja', glyph: '▤' },
  { id: 'clipboard', name: 'Lista', glyph: '☰' },
  { id: 'file', name: 'Docs', glyph: '▥' },
  { id: 'grid', name: 'Enlaces', glyph: '▦' },
  { id: 'chat', name: 'Chat', glyph: '◯' },
  { id: 'megaphone', name: 'Aviso', glyph: '◉' },
  { id: 'heart', name: 'Emoción', glyph: '♥' },
  { id: 'menu', name: 'Menú', glyph: '≡' },
  { id: 'building', name: 'Sede', glyph: '▢' },
  { id: 'calendar', name: 'Agenda', glyph: '▦' },
  { id: 'circle', name: 'Otro', glyph: '•' },
]

const allItems = ref([])
const filter = ref('u')
const draft = ref(null)
const preset = ref('muro')
const whoSees = ref('all')
const error = ref('')
const formError = ref('')
const okMsg = ref('')
const saving = ref(false)
const labelTouchedKey = ref(false)
const openPreviewGroups = reactive({ muro: true })

const composeTipo = computed({
  get() {
    return String(draft.value?.actionParams?.tipo || '')
  },
  set(v) {
    if (!draft.value) return
    draft.value.actionParams = { ...(draft.value.actionParams || {}), tipo: v || undefined }
  },
})

const presetsForChannel = computed(() => (filter.value === 'a' ? PRESETS_A : PRESETS_U))

const sorted = computed(() =>
  [...allItems.value]
    .filter((i) => {
      if (filter.value === 'u') return i.channel === 'u' || i.channel === 'both'
      return i.channel === 'a' || i.channel === 'both'
    })
    .sort((a, b) => a.order - b.order),
)

const visibleSorted = computed(() => sorted.value.filter((i) => i.activo))

/** Árbol de preview con las mismas agrupaciones que la app / el admin real */
const previewTree = computed(() => {
  const base = visibleSorted.value
  if (filter.value === 'u') {
    return buildAppPreviewTree(ensureMuroPreviewItems(base))
  }
  return buildAdminPreviewTree(base)
})

function togglePreviewGroup(id) {
  openPreviewGroups[id] = !openPreviewGroups[id]
}

function syncPreviewGroups() {
  for (const entry of previewTree.value) {
    if (entry.type !== 'group') continue
    if (openPreviewGroups[entry.id] === undefined) openPreviewGroups[entry.id] = true
  }
}

watch(previewTree, syncPreviewGroups, { immediate: true })
watch(filter, () => {
  syncPreviewGroups()
})

const countU = computed(
  () => allItems.value.filter((i) => i.channel === 'u' || i.channel === 'both').length,
)
const countA = computed(
  () => allItems.value.filter((i) => i.channel === 'a' || i.channel === 'both').length,
)

function iconGlyph(id) {
  return icons.find((i) => i.id === id)?.glyph || '•'
}

function destinationLabel(route) {
  const all = [...PRESETS_U, ...PRESETS_A]
  return all.find((p) => p.route === route)?.label || `Pantalla ${route}`
}

function audienceHint(item) {
  const roles = item.audience?.roles || []
  if (!roles.length) return ''
  if (roles.includes('admin') && !roles.includes('member')) return 'Solo administradores'
  if (roles.includes('member') && !roles.includes('admin')) return 'Solo miembros'
  return ''
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 40) || 'funcion'
}

function setFilter(c) {
  filter.value = c
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/menu')
    allItems.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el menú'
  }
}

function openNew() {
  const list = presetsForChannel.value
  const first = list[0]
  draft.value = {
    key: first.key,
    label: first.label,
    route: first.route,
    icon: first.icon,
    order: (sorted.value.at(-1)?.order || 0) + 10,
    channel: filter.value,
    activo: true,
    showInTabbar: false,
    tabOrder: 100,
    showInAdminSidebar: false,
    showInAdminHeader: false,
    actionType: 'navigate',
    actionParams: {},
    audience: { roles: [], capabilities: [] },
  }
  preset.value = first.key
  whoSees.value = 'all'
  labelTouchedKey.value = false
  formError.value = ''
}

function edit(item) {
  draft.value = {
    ...item,
    showInTabbar: Boolean(item.showInTabbar),
    tabOrder: Number(item.tabOrder) || 100,
    showInAdminSidebar: Boolean(item.showInAdminSidebar),
    showInAdminHeader: Boolean(item.showInAdminHeader),
    actionType: item.actionType === 'compose_post' ? 'compose_post' : 'navigate',
    actionParams: item.actionParams && typeof item.actionParams === 'object' ? { ...item.actionParams } : {},
    audience: { roles: [...(item.audience?.roles || [])], capabilities: [...(item.audience?.capabilities || [])] },
  }
  const known = presetsForChannel.value.find((p) => p.key === item.key || p.route === item.route)
  preset.value = known ? known.key : '__custom'
  const roles = item.audience?.roles || []
  if (roles.includes('admin') && !roles.includes('member')) whoSees.value = 'admin'
  else if (roles.includes('member') && !roles.includes('admin')) whoSees.value = 'member'
  else whoSees.value = 'all'
  labelTouchedKey.value = true
  formError.value = ''
}

function onLabelInput() {
  if (!draft.value?.id && !labelTouchedKey.value) {
    draft.value.key = slugify(draft.value.label)
  }
}

function applyPreset() {
  if (preset.value === '__custom') return
  const p = presetsForChannel.value.find((x) => x.key === preset.value)
  if (!p || !draft.value) return
  draft.value.route = p.route
  draft.value.icon = p.icon
  if (!draft.value.id) {
    draft.value.key = p.key
    if (!draft.value.label || PRESETS_U.concat(PRESETS_A).some((x) => x.label === draft.value.label)) {
      draft.value.label = p.label
    }
  }
  if (String(p.key || '').startsWith('compose-')) {
    draft.value.actionType = 'compose_post'
    const tipo = String(p.key).replace(/^compose-/, '')
    draft.value.actionParams = { tipo: tipo || 'aviso' }
  } else if (draft.value.actionType === 'compose_post' && !String(draft.value.key || '').startsWith('compose-')) {
    /* keep */
  } else {
    draft.value.actionType = 'navigate'
    draft.value.actionParams = {}
  }
}

function rolesFromWho() {
  if (whoSees.value === 'admin') return ['admin']
  if (whoSees.value === 'member') return ['member']
  return []
}

async function save() {
  formError.value = ''
  saving.value = true
  try {
    const payload = {
      key: draft.value.key,
      label: draft.value.label,
      route: draft.value.route,
      icon: draft.value.icon || 'circle',
      order: draft.value.order,
      channel: draft.value.channel || filter.value,
      activo: draft.value.activo !== false,
      showInTabbar: Boolean(draft.value.showInTabbar),
      tabOrder: Number(draft.value.tabOrder) || 100,
      showInAdminSidebar: Boolean(draft.value.showInAdminSidebar),
      showInAdminHeader: Boolean(draft.value.showInAdminHeader),
      actionType: draft.value.actionType === 'compose_post' ? 'compose_post' : 'navigate',
      actionParams:
        draft.value.actionType === 'compose_post'
          ? { tipo: composeTipo.value || undefined }
          : {},
      audience: { roles: rolesFromWho(), capabilities: [] },
    }
    if (draft.value.id) {
      await api.patch(`/admin/menu/${draft.value.id}`, payload)
    } else {
      await api.post('/admin/menu', payload)
    }
    draft.value = null
    okMsg.value = 'Menú actualizado. Las personas lo van a ver al refrescar la app.'
    setTimeout(() => {
      okMsg.value = ''
    }, 3500)
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(item, activo) {
  try {
    await api.patch(`/admin/menu/${item.id}`, { activo })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cambiar la visibilidad'
  }
}

async function move(item, dir) {
  const list = sorted.value
  const idx = list.findIndex((x) => x.id === item.id)
  const swap = list[idx + dir]
  if (!swap) return
  try {
    await Promise.all([
      api.patch(`/admin/menu/${item.id}`, { order: swap.order }),
      api.patch(`/admin/menu/${swap.id}`, { order: item.order }),
    ])
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo reordenar'
  }
}

async function remove(item) {
  if (!confirm(`¿Quitar «${item.label}» del menú?`)) return
  try {
    await api.delete(`/admin/menu/${item.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo quitar'
  }
}

onMounted(load)
</script>

<style scoped>
.menu-page {
  width: 100%;
  max-width: none;
  color: var(--cx-text);
}

.menu-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.menu-hero h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}
.menu-hero p {
  margin: 6px 0 0;
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted);
}

.btn-primary {
  border: 0;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 700;
  font-size: 14px;
}
.btn-ghost {
  border: 1px solid var(--cx-border);
  background: transparent;
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 600;
  font-size: 14px;
}

/* ——— Layout 20 / 30 / 50 ——— */
.menu-workspace {
  display: grid;
  grid-template-columns: minmax(160px, 0.2fr) minmax(220px, 0.3fr) minmax(0, 0.5fr);
  gap: 16px;
  align-items: stretch;
  min-height: calc(100vh - 180px);
}

.menu-col {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.col-label {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cx-muted);
}

/* Canal 20% */
.channel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.channel-list button {
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
  color: var(--cx-text);
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.channel-list button.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--cx-surface));
  color: var(--brand-primary);
}

.channel-ico {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-page) 60%, transparent);
}

.channel-list button.on .channel-ico {
  background: color-mix(in srgb, var(--brand-primary) 18%, transparent);
}

.channel-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.channel-copy strong {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.channel-copy small {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
  color: var(--cx-muted);
}

.channel-list button.on .channel-copy small {
  color: var(--brand-primary);
  opacity: 0.85;
}

.channel-count {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.65;
  margin-top: auto;
}

/* Preview 30% */
.menu-col-preview {
  overflow: hidden;
}

.preview-frame {
  flex: 1;
  min-height: 0;
  display: flex;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--cx-border);
}

.preview-app {
  background:
    linear-gradient(160deg, var(--line) 0%, var(--line-2) 100%);
  padding: 12px;
  justify-content: flex-start;
}

.preview-drawer {
  width: 100%;
  max-width: 280px;
  height: 100%;
  min-height: 420px;
  background: var(--cx-surface);
  color: var(--cx-text);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 4px 0 24px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.preview-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 14px;
  border-bottom: 1px solid var(--cx-border);
}

.preview-brand {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.preview-tenant {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
}

.preview-close {
  font-size: 20px;
  line-height: 1;
  color: var(--cx-muted);
  padding: 0 4px;
}

.preview-drawer-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-drawer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
  color: var(--cx-text);
}

.preview-drawer-link--child {
  padding: 9px 12px;
  font-size: 12px;
}

.preview-drawer-ico {
  width: 22px;
  text-align: center;
  font-size: 15px;
  flex-shrink: 0;
}

.preview-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-group-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--cx-text);
  font: inherit;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.preview-group-btn:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, transparent);
}

.preview-group-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.preview-chevron {
  color: var(--cx-muted);
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.15s ease;
}

.preview-chevron.open {
  transform: rotate(90deg);
}

.preview-chevron--admin {
  color: var(--ink-faint);
}

.preview-group-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 10px;
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, var(--brand-primary) 22%, transparent);
}

.preview-drawer-foot {
  padding: 12px 14px;
  border-top: 1px solid var(--cx-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--bad);
}

.preview-admin {
  background: var(--ink);
}

.preview-sidebar {
  width: 100%;
  display: flex;
  flex-direction: column;
  color: var(--panel-2);
  min-height: 420px;
}

.preview-sidebar-head {
  padding: 16px 14px 8px;
}

.preview-sidebar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.preview-sidebar-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--ink-faint);
}

.preview-sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--line-2);
}

.preview-sidebar-link--child {
  padding: 7px 10px;
  font-size: 12px;
  color: var(--ink-faint);
}

.preview-sidebar-ico {
  width: 18px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
  opacity: 0.85;
}

.preview-admin-group {
  padding-top: 6px;
}

.preview-admin-group:first-child {
  padding-top: 0;
}

.preview-admin-group-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-faint);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-align: left;
}

.preview-admin-group-btn:hover {
  background: var(--ink);
  color: var(--line);
}

.preview-admin-group-items {
  margin-left: 10px;
  padding-left: 8px;
  border-left: 1px solid var(--ink);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.preview-sidebar-foot {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--ink-faint);
  border-top: 1px solid var(--ink);
}

.preview-empty {
  text-align: center;
  font-size: 13px;
  color: var(--cx-muted);
  padding: 24px 12px;
}

.preview-admin .preview-empty {
  color: var(--ink-faint);
}

/* Acciones 50% */
.menu-col-actions {
  overflow: hidden;
}

.actions-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.actions-head .col-label {
  margin-bottom: 12px;
}

.actions-meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 2px;
}

.menu-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  border-radius: 14px;
  padding: 12px 14px;
}

.menu-card.off {
  opacity: 0.55;
}

.menu-card-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.menu-ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  color: var(--brand-primary);
  font-size: 17px;
  flex-shrink: 0;
}

.menu-copy h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.menu-copy p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
}

.menu-audience {
  color: var(--brand-primary) !important;
  font-weight: 600;
}

.menu-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-btns {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  display: grid;
  place-items: center;
  padding: 0;
}

.icon-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.icon-btn.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  color: var(--brand-primary);
}

.icon-btn.danger:hover {
  border-color: var(--bad);
  color: var(--bad);
}

.icon-btn:disabled {
  opacity: 0.35;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cx-muted);
}

.toggle.block {
  margin: 4px 0 8px;
}

.menu-empty {
  text-align: center;
  color: var(--cx-muted);
  padding: 28px;
  font-size: 14px;
}

.menu-error {
  color: var(--bad);
  background: var(--bad-bg);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  margin: 0 0 12px;
}

.menu-ok {
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  margin: 0 0 12px;
}

.sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.sheet-panel {
  width: min(100%, 460px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 18px;
  padding: 20px;
  display: grid;
  gap: 12px;
}

.sheet-panel h2 {
  margin: 0;
  font-size: 1.2rem;
}

.sheet-sub {
  margin: -4px 0 4px;
  font-size: 13px;
  color: var(--cx-muted);
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cx-muted);
}

.field input,
.field select {
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  font-weight: 500;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.icon-pick {
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  border-radius: 12px;
  padding: 8px 4px;
  display: grid;
  gap: 2px;
  place-items: center;
  color: var(--cx-text);
}

.icon-pick.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  color: var(--brand-primary);
}

.icon-pick span {
  font-size: 16px;
}

.icon-pick small {
  font-size: 9px;
  font-weight: 600;
}

.advanced {
  border-top: 1px solid var(--cx-border);
  padding-top: 10px;
  font-size: 13px;
  color: var(--cx-muted);
}

.advanced summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 10px;
}

.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

@media (max-width: 1100px) {
  .menu-workspace {
    grid-template-columns: minmax(140px, 0.22fr) minmax(200px, 0.28fr) minmax(0, 0.5fr);
  }
}

@media (max-width: 900px) {
  .menu-workspace {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .channel-list {
    flex-direction: row;
  }

  .channel-list button {
    flex: 1;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }

  .channel-count {
    margin-top: 0;
    margin-left: auto;
  }

  .preview-frame {
    min-height: 360px;
  }

  .preview-drawer,
  .preview-sidebar {
    min-height: 360px;
  }
}
</style>
