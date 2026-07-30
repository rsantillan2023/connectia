<template>
  <div class="pubs">
    <header class="pubs-hero">
      <div class="pubs-hero-top">
        <div>
          <h1>Publicaciones del muro</h1>
          <p>
            Acá armás y moderás lo que aparece en el muro de la app.
            También llegan propuestas de colaboradores, con una
            <strong>revisión previa de IA</strong> para que decidas con más claridad.
          </p>
        </div>
      </div>
      <div class="pubs-hero-help">
        <ScreenHelp
          purpose="Es el canal de noticias de la comunidad: lo que publicás acá aparece en el muro móvil. También moderás publicaciones enviadas por miembros, con sugerencias de IA."
          can-do="Actualizar listado; filtrar (las rechazadas no se ven por defecto); programar publicación por día/hora; ver riesgo IA; aprobar/rechazar UGC; desaprobar una publicada (vuelve a pendiente y sale del muro); crear a mano, con IA, o desde la web; armar newsletter."
        />
        <div class="pubs-hero-btns">
          <button
            type="button"
            class="btn-ghost pubs-nl-btn"
            title="Importar desde Excel/CSV"
            @click="importOpen = true"
          >
            Importar
          </button>
          <button
            type="button"
            class="btn-ghost pubs-nl-btn"
            :class="{ on: selectMode }"
            :title="selectMode ? 'Salir del modo selección' : 'Newsletter'"
            @click="selectMode ? toggleSelectMode() : (newsletterChooserOpen = true)"
          >
            {{ selectMode ? 'Cancelar selección' : 'Newsletter' }}
          </button>
          <button type="button" class="btn-primary pubs-new-btn" @click="newPostChooserOpen = true">
            Nueva publicación
          </button>
        </div>
      </div>
    </header>

    <!-- Import masivo -->
    <div v-if="importOpen" class="sheet" @click.self="importOpen = false">
      <div class="confirm-panel new-post-chooser" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header class="sheet-head">
          <div>
            <h2 id="import-title">Importar publicaciones</h2>
            <p>Subí un Excel/CSV con título, cuerpo, tipo y estado. Filas inválidas se reportan sin frenar el resto.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="importOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="new-post-options">
          <button type="button" class="new-post-option" @click="downloadImportTemplate">
            <strong>Descargar plantilla</strong>
            <small>Excel con columnas y un ejemplo.</small>
          </button>
          <label class="new-post-option primary" style="cursor:pointer">
            <strong>{{ importBusy ? 'Procesando…' : 'Elegir archivo' }}</strong>
            <small>CSV o XLSX · máx 5 MB</small>
            <input type="file" accept=".csv,.xlsx,.xls" hidden :disabled="importBusy" @change="onImportFile" />
          </label>
        </div>
        <p v-if="importMsg" class="hint" style="padding:0 16px 8px">{{ importMsg }}</p>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="importOpen = false">Cerrar</button>
        </footer>
      </div>
    </div>

    <!-- Newsletter: armar o historial -->
    <div v-if="newsletterChooserOpen" class="sheet" @click.self="newsletterChooserOpen = false">
      <div class="confirm-panel new-post-chooser" role="dialog" aria-modal="true" aria-labelledby="nl-chooser-title">
        <header class="sheet-head">
          <div>
            <h2 id="nl-chooser-title">Newsletter</h2>
            <p>Elegí qué querés hacer.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="newsletterChooserOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="new-post-options">
          <button type="button" class="new-post-option primary" @click="chooseArmNewsletter">
            <strong>Armar newsletter</strong>
            <small>Seleccionás publicaciones del muro y creás un borrador para revisión.</small>
          </button>
          <button type="button" class="new-post-option" @click="chooseNewsletterHistory">
            <strong>Historial de newsletters</strong>
            <small>Revisás borradores, aprobaciones y envíos anteriores.</small>
          </button>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="newsletterChooserOpen = false">Cancelar</button>
        </footer>
      </div>
    </div>

    <!-- Elegir cómo crear -->
    <div v-if="newPostChooserOpen" class="sheet" @click.self="newPostChooserOpen = false">
      <div class="confirm-panel new-post-chooser" role="dialog" aria-modal="true" aria-labelledby="new-post-title">
        <header class="sheet-head">
          <div>
            <h2 id="new-post-title">Nueva publicación</h2>
            <p>Elegí cómo querés crear el contenido.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="newPostChooserOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="new-post-options">
          <button type="button" class="new-post-option" @click="chooseNewManual">
            <strong>Crear a mano</strong>
            <small>Escribís título, mensaje y media vos.</small>
          </button>
          <button type="button" class="new-post-option" @click="chooseNewTemplate">
            <strong>Desde plantilla</strong>
            <small>Elegís una plantilla (cumple, feriado, aviso, beneficio…) y la editás.</small>
          </button>
          <button type="button" class="new-post-option" @click="chooseNewWeb">
            <strong>Desde la web</strong>
            <small>Tomás una nota o artículo online y lo adaptás al muro.</small>
          </button>
          <button type="button" class="new-post-option primary" @click="chooseNewAi">
            <strong>Con asistencia IA</strong>
            <small>Describís el objetivo y la IA arma un borrador (texto e imagen).</small>
          </button>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="newPostChooserOpen = false">Cancelar</button>
        </footer>
      </div>
    </div>

    <!-- Elegir plantilla -->
    <div v-if="templatesChooserOpen" class="sheet" @click.self="templatesChooserOpen = false">
      <div class="confirm-panel new-post-chooser" role="dialog" aria-modal="true" aria-labelledby="tpl-chooser-title">
        <header class="sheet-head">
          <div>
            <h2 id="tpl-chooser-title">Desde plantilla</h2>
            <p>Elegí una plantilla para prellenar el editor.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="templatesChooserOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="new-post-options">
          <p v-if="templatesLoading" class="muted">Cargando plantillas…</p>
          <p v-else-if="templatesError" class="err">{{ templatesError }}</p>
          <p v-else-if="!templates.length" class="muted">Todavía no hay plantillas creadas.</p>
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            type="button"
            class="new-post-option"
            @click="pickTemplate(tpl)"
          >
            <strong>{{ tpl.nombre }}</strong>
            <small>{{ tipoLabel(tpl.tipo) }}<template v-if="tpl.titulo"> · {{ tpl.titulo }}</template></small>
          </button>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="templatesChooserOpen = false">Cancelar</button>
        </footer>
      </div>
    </div>

    <div v-if="selectMode" class="nl-bar" role="region" aria-label="Selección para newsletter">
      <div class="nl-bar-main">
        <label class="nl-check-all">
          <input type="checkbox" :checked="allVisibleSelected" :indeterminate.prop="someVisibleSelected && !allVisibleSelected" @change="toggleSelectAllVisible" />
          <span>{{ selectedIds.length }} seleccionada{{ selectedIds.length === 1 ? '' : 's' }}</span>
        </label>
        <p class="nl-bar-hint">
          Se crea un borrador para <strong>revisión y aprobación</strong>. Nadie recibe el mail hasta que un admin lo apruebe y envíe.
        </p>
      </div>
      <div class="nl-bar-actions">
        <button type="button" class="btn-ghost sm" :disabled="!selectedIds.length" @click="clearSelection">Limpiar</button>
        <button type="button" class="btn-primary sm" :disabled="selectedIds.length < 1 || nlCreating" @click="createNewsletterDraft">
          {{ nlCreating ? 'Creando borrador…' : 'Crear borrador para revisión' }}
        </button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-row">
        <input
          v-model="q"
          class="search"
          type="search"
          placeholder="Buscar por título, texto o autor…"
          @keyup.enter="searchPosts"
        />
        <button type="button" class="btn-ghost sm" @click="searchPosts">Buscar</button>
        <button
          type="button"
          class="btn-ghost sm icon-refresh"
          :disabled="loading"
          title="Actualizar"
          aria-label="Actualizar listado"
          @click="refresh"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.3"/><path d="M21 3v6h-6"/></svg>
        </button>
        <button
          type="button"
          class="btn-ghost sm icon-refresh"
          title="Formato por tipo"
          aria-label="Configurar formato por tipo"
          @click="openTypeConfig"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </button>
        <div class="view-toggle" role="group" aria-label="Vista">
          <button
            type="button"
            class="view-btn"
            :class="{ on: viewMode === 'list' }"
            title="Vista cards"
            aria-label="Vista cards"
            :aria-pressed="viewMode === 'list'"
            @click.stop="setViewMode('list')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ on: viewMode === 'grid' }"
            title="Vista grilla"
            aria-label="Vista grilla"
            :aria-pressed="viewMode === 'grid'"
            @click.stop="setViewMode('grid')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ on: viewMode === 'calendar' }"
            title="Vista calendario"
            aria-label="Vista calendario"
            :aria-pressed="viewMode === 'calendar'"
            @click.stop="setViewMode('calendar')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </button>
        </div>
      </div>

      <div class="filters filters-bar">
        <div class="filters-group filters-left">
          <button
            v-for="s in statusFilters"
            :key="'st-' + String(s.value)"
            type="button"
            class="chip chip-sm"
            :class="{ on: filter === s.value }"
            @click="setStatusFilter(s.value)"
          >
            {{ s.label }}{{ s.value === 'pending_review' && pendingCount ? ` (${pendingCount})` : '' }}
          </button>
        </div>
        <div class="filters-group filters-right">
          <button
            v-for="t in tipoFilters"
            :key="'tp-' + String(t.value)"
            type="button"
            class="chip chip-sm"
            :class="{ on: tipoFilter === t.value }"
            @click="setTipoFilter(t.value)"
          >
            {{ t.label }}
          </button>
          <span class="filters-sep" aria-hidden="true"></span>
          <button
            v-for="p in pinnedFilters"
            :key="'pn-' + String(p.value)"
            type="button"
            class="chip chip-sm"
            :class="{ on: pinnedFilter === p.value }"
            @click="setPinnedFilter(p.value)"
          >
            {{ p.label }}
          </button>
          <template v-if="filter === 'pending_review' || riskFilter">
            <span class="filters-sep" aria-hidden="true"></span>
            <button
              v-for="r in riskFilters"
              :key="'rk-' + String(r.value)"
              type="button"
              class="chip chip-sm"
              :class="{ on: riskFilter === r.value }"
              @click="setRiskFilter(r.value)"
            >
              {{ r.label }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="highRiskPending" class="ai-alert">
      {{ highRiskPending }} publicación{{ highRiskPending === 1 ? '' : 'es' }} pendiente
      con <strong>riesgo alto</strong> según la IA — priorizá revisarlas.
      <button type="button" class="link-btn" @click="setHighRiskPendingFilter">
        Ver solo alto riesgo
      </button>
    </p>

    <div v-if="viewMode === 'list'" class="list">
      <article
        v-for="p in items"
        :key="p.id"
        class="row"
        :class="{
          selected: selectMode && isSelected(p.id),
          'ugc-from-member': p.origin === 'member',
          'ugc-pending': p.origin === 'member' && p.status === 'pending_review',
          'ugc-risk-high': p.origin === 'member' && p.moderationAi?.risk === 'high',
        }"
        @click="selectMode ? toggleSelect(p.id) : previewPost(p)"
      >
        <label v-if="selectMode" class="row-check" @click.stop>
          <input type="checkbox" :checked="isSelected(p.id)" @change="toggleSelect(p.id)" />
        </label>
        <div class="thumb">
          <PostMedia v-if="p.imageUrl" :url="p.imageUrl" :alt="p.titulo" :fallback-tipo="p.tipo" :autoplay-on-visible="false" />
          <div v-else class="thumb-empty">{{ tipoLabel(p.tipo) }}</div>
          <span v-if="thumbMediaLabel(p)" class="thumb-badge">{{ thumbMediaLabel(p) }}</span>
          <span
            v-if="p.origin === 'member'"
            class="ugc-person"
            title="Publicación de un miembro"
            aria-label="Publicación de un miembro"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5"/>
              <path d="M5.5 19.5c1.8-3.2 4-4.8 6.5-4.8s4.7 1.6 6.5 4.8"/>
            </svg>
          </span>
        </div>
        <div class="row-main">
          <div class="meta">
            <span class="tipo">{{ tipoLabel(p.tipo) }}</span>
            <span
              v-if="p.origin === 'member' && (analyzingId === p.id || p.moderationAi?.status === 'pending')"
              class="risk-tag pending"
            >
              Analizando…
            </span>
            <span
              v-else-if="p.origin === 'member' && p.moderationAi?.status === 'ready'"
              class="risk-tag"
              :data-risk="p.moderationAi.risk"
            >
              Riesgo {{ riskLabel(p.moderationAi.risk) }}
            </span>
            <span v-if="p.pinned">Fijada</span>
            <span>{{ audienceLabel(p) }}</span>
            <span>{{ layoutLabel(p.layout) }}</span>
            <span v-if="p.authorName">{{ p.authorName }}</span>
            <span v-if="p.status === 'scheduled' && p.scheduledAt">Programada {{ formatDate(p.scheduledAt) }}</span>
            <span v-else-if="p.publishedAt">{{ formatDate(p.publishedAt) }}</span>
          </div>
          <h2>{{ p.titulo }}</h2>
          <p class="excerpt">{{ p.cuerpo }}</p>
          <div
            v-if="p.origin === 'member' && analyzingId === p.id && p.moderationAi?.status !== 'ready'"
            class="mod-ai mod-ai-loading"
          >
            <p class="mod-ai-title">Analizando con IA…</p>
          </div>
          <div
            v-else-if="p.origin === 'member' && p.moderationAi?.status === 'ready'"
            class="mod-ai"
            :data-risk="p.moderationAi.risk"
          >
            <p class="mod-ai-title">
              Sugerencia IA:
              <strong>{{ actionLabel(p.moderationAi.suggestedAction) }}</strong>
              <span class="mod-ai-score">score {{ p.moderationAi.score }}</span>
            </p>
            <p v-if="p.moderationAi.summary" class="mod-ai-summary">{{ p.moderationAi.summary }}</p>
            <ul v-if="(p.moderationAi.reasons || []).length" class="mod-ai-reasons">
              <li v-for="(r, i) in p.moderationAi.reasons" :key="i">{{ r }}</li>
            </ul>
            <p v-if="(p.moderationAi.policyFlags || []).length" class="mod-ai-flags">
              Políticas:
              <span v-for="(f, i) in p.moderationAi.policyFlags" :key="f" class="policy-flag">{{ f }}<template v-if="i < p.moderationAi.policyFlags.length - 1"> · </template></span>
            </p>
            <p v-if="p.moderationAi.error" class="mod-ai-err">{{ p.moderationAi.error }}</p>
          </div>
          <p v-if="p.status === 'rejected' && p.rejectionReason" class="reject-note">Rechazo: {{ p.rejectionReason }}</p>
          <button
            type="button"
            class="status-badge inline row-status status-badge-btn"
            :data-status="p.status"
            title="Cambiar estado"
            @click.stop="openStatusChange(p)"
          >
            {{ statusLabel(p.status) }}
          </button>
        </div>
        <div class="row-actions" @click.stop>
          <button type="button" class="icon-btn" title="Ver como en la app" aria-label="Vista previa" @click="previewPost(p)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button
            v-if="p.origin === 'member'"
            type="button"
            class="icon-btn"
            title="Re-analizar con IA"
            aria-label="Re-analizar"
            :disabled="analyzingId === p.id"
            @click="reanalyze(p)"
          >
            <svg v-if="analyzingId === p.id" class="spin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.3"/><path d="M21 3v6h-6"/></svg>
          </button>
          <button
            v-if="p.status === 'pending_review'"
            type="button"
            class="icon-btn ok"
            title="Aprobar y publicar"
            aria-label="Aprobar"
            @click="approve(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
          </button>
          <button
            v-if="p.status === 'pending_review'"
            type="button"
            class="icon-btn danger"
            title="Rechazar"
            aria-label="Rechazar"
            @click="askReject(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <button
            v-if="p.status === 'published'"
            type="button"
            class="icon-btn danger"
            title="Desaprobar: pasa a pendiente y sale del muro"
            aria-label="Desaprobar"
            :disabled="unapprovingId === p.id"
            @click="unapprove(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
          </button>
          <button
            v-if="p.status !== 'published' && p.status !== 'pending_review'"
            type="button"
            class="icon-btn"
            title="Publicar ahora"
            aria-label="Publicar"
            @click="publish(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button
            v-if="p.status !== 'draft'"
            type="button"
            class="icon-btn"
            title="Pasar a borrador"
            aria-label="Pasar a borrador"
            @click="toDraft(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          </button>
          <button type="button" class="icon-btn" title="Editar" aria-label="Editar" @click="edit(p)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button
            v-if="p.status !== 'archived'"
            type="button"
            class="icon-btn danger"
            title="Borrar (archivar)"
            aria-label="Borrar"
            @click="askArchive(p)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </article>
      <p v-if="!items.length && !error" class="empty">No hay publicaciones en este filtro.</p>
    </div>

    <div v-else-if="viewMode === 'grid'" class="grid-wrap">
      <div class="grid" :class="{ 'with-check': selectMode }" role="table" aria-label="Publicaciones">
        <div class="grid-head" role="row">
          <div v-if="selectMode" class="g-check" role="columnheader">
            <input type="checkbox" :checked="allVisibleSelected" :indeterminate.prop="someVisibleSelected && !allVisibleSelected" @change="toggleSelectAllVisible" />
          </div>
          <button
            v-for="col in gridColumns"
            :key="col.key"
            type="button"
            class="g-th sortable"
            :class="`g-${col.cell}`"
            role="columnheader"
            @click="toggleSort(col.key)"
          >
            <span class="col-title-text">{{ col.label }}</span>
            <span class="sort-ind" :class="{ active: sortBy === col.key }">
              {{ sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </button>
          <div class="g-th g-acciones" role="columnheader">Acciones</div>
        </div>
        <div
          v-for="p in items"
          :key="p.id"
          class="grid-row"
          role="row"
          :class="{
            selected: selectMode && isSelected(p.id),
            'ugc-from-member': p.origin === 'member',
            'ugc-pending': p.origin === 'member' && p.status === 'pending_review',
            'ugc-risk-high': p.origin === 'member' && p.moderationAi?.risk === 'high',
          }"
          @click="selectMode ? toggleSelect(p.id) : previewPost(p)"
        >
          <div v-if="selectMode" class="g-check" role="cell" @click.stop>
            <input type="checkbox" :checked="isSelected(p.id)" @change="toggleSelect(p.id)" />
          </div>
          <div class="g-td g-titulo" role="cell">
            <div class="title-cell-inner">
              <span
                v-if="p.origin === 'member'"
                class="ugc-person ugc-person-inline"
                title="Publicación de un miembro"
                aria-label="Publicación de un miembro"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5"/>
                  <path d="M5.5 19.5c1.8-3.2 4-4.8 6.5-4.8s4.7 1.6 6.5 4.8"/>
                </svg>
              </span>
              <strong class="grid-title">{{ p.titulo || 'Sin título' }}</strong>
              <span v-if="p.pinned" class="pin-tag">Fijada</span>
              <span
                v-if="p.origin === 'member' && (analyzingId === p.id || p.moderationAi?.status === 'pending')"
                class="risk-tag pending"
              >
                Analizando…
              </span>
              <span
                v-else-if="p.origin === 'member' && p.moderationAi?.status === 'ready'"
                class="risk-tag"
                :data-risk="p.moderationAi.risk"
                :title="p.moderationAi.summary || ''"
              >
                Riesgo {{ riskLabel(p.moderationAi.risk) }} · {{ actionLabel(p.moderationAi.suggestedAction) }}
              </span>
            </div>
            <div
              v-if="p.origin === 'member' && (analyzingId === p.id || p.moderationAi?.status === 'ready')"
              class="grid-mod-ai"
              @click.stop
            >
              <p v-if="analyzingId === p.id && p.moderationAi?.status !== 'ready'" class="mod-ai-summary">Analizando con IA…</p>
              <template v-else-if="p.moderationAi?.status === 'ready'">
                <p class="mod-ai-summary">
                  <strong>{{ actionLabel(p.moderationAi.suggestedAction) }}</strong>
                  <span v-if="p.moderationAi.summary"> — {{ p.moderationAi.summary }}</span>
                </p>
              </template>
            </div>
          </div>
          <div class="g-td g-tipo" role="cell" @click.stop>
            <button
              type="button"
              class="meta-badge meta-badge-btn"
              :data-tipo="p.tipo"
              title="Cambiar tipo"
              @click="openTipoChange(p)"
            >
              {{ tipoLabel(p.tipo) }}
            </button>
          </div>
          <div class="g-td g-estado" role="cell" @click.stop>
            <button
              type="button"
              class="status-badge inline status-badge-btn"
              :data-status="p.status"
              title="Cambiar estado"
              @click="openStatusChange(p)"
            >
              {{ statusLabel(p.status) }}
            </button>
          </div>
          <div class="g-td g-formato" role="cell" @click.stop>
            <button
              type="button"
              class="meta-badge meta-badge-btn"
              :data-layout="p.layout || 'vertical'"
              title="Cambiar formato"
              @click="openLayoutChange(p)"
            >
              {{ layoutLabel(p.layout) }}
            </button>
          </div>
          <div class="g-td g-prioridad num" role="cell" @click.stop>
            <input
              v-if="priorityEditId === p.id"
              :ref="(el) => focusPriorityInput(el)"
              class="priority-inline-input"
              type="number"
              min="0"
              max="100"
              inputmode="numeric"
              :value="priorityEditValue"
              :disabled="prioritySavingId === p.id"
              @input="onPriorityEditInput"
              @keydown.enter.prevent="commitPriorityEdit(p)"
              @keydown.escape.prevent="cancelPriorityEdit"
              @blur="commitPriorityEdit(p)"
            />
            <button
              v-else
              type="button"
              class="priority-inline-btn"
              title="Cambiar prioridad"
              :disabled="prioritySavingId === p.id"
              @click="startPriorityEdit(p)"
            >
              {{ prioritySavingId === p.id ? '…' : (p.priority ?? 0) }}
            </button>
          </div>
          <div class="g-td g-fecha" role="cell">{{ p.publishedAt ? formatDate(p.publishedAt) : '—' }}</div>
          <div class="g-td g-fecha" role="cell">
            {{ p.scheduledAt ? formatDate(p.scheduledAt) : '—' }}
          </div>
          <div class="g-td g-fecha" role="cell">{{ formatDate(p.updatedAt) }}</div>
          <div class="g-td g-acciones" role="cell" @click.stop>
            <div class="grid-actions">
              <button type="button" class="icon-btn" title="Ver como en la app" aria-label="Vista previa" @click="previewPost(p)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button
                v-if="p.origin === 'member'"
                type="button"
                class="icon-btn"
                title="Re-analizar con IA"
                aria-label="Re-analizar"
                :disabled="analyzingId === p.id"
                @click="reanalyze(p)"
              >
                <svg v-if="analyzingId === p.id" class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.3"/><path d="M21 3v6h-6"/></svg>
              </button>
              <button
                v-if="p.status === 'pending_review'"
                type="button"
                class="icon-btn ok"
                title="Aprobar y publicar"
                aria-label="Aprobar"
                @click="approve(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
              </button>
              <button
                v-if="p.status === 'pending_review'"
                type="button"
                class="icon-btn danger"
                title="Rechazar"
                aria-label="Rechazar"
                @click="askReject(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
              <button
                v-if="p.status === 'published'"
                type="button"
                class="icon-btn danger"
                title="Desaprobar: pasa a pendiente y sale del muro"
                aria-label="Desaprobar"
                :disabled="unapprovingId === p.id"
                @click="unapprove(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
              </button>
              <button
                v-if="p.status !== 'published' && p.status !== 'pending_review'"
                type="button"
                class="icon-btn"
                title="Publicar ahora"
                aria-label="Publicar"
                @click="publish(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
              <button
                v-if="p.status !== 'draft'"
                type="button"
                class="icon-btn"
                title="Pasar a borrador"
                aria-label="Pasar a borrador"
                @click="toDraft(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              </button>
              <button type="button" class="icon-btn" title="Clonar publicación" aria-label="Clonar publicación" @click="clonePost(p)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
              </button>
              <button type="button" class="icon-btn" title="Editar" aria-label="Editar" @click="edit(p)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button
                v-if="p.status !== 'archived'"
                type="button"
                class="icon-btn danger"
                title="Borrar (archivar)"
                aria-label="Borrar"
                @click="askArchive(p)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="!items.length && !error" class="empty">No hay publicaciones en este filtro.</p>
    </div>

    <div v-else-if="viewMode === 'calendar'" class="cal-wrap">
      <div class="cal-toolbar">
        <button type="button" class="btn-ghost sm" @click="shiftCalendarMonth(-1)" aria-label="Mes anterior">←</button>
        <h2 class="cal-month">{{ calendarMonthLabel }}</h2>
        <button type="button" class="btn-ghost sm" @click="shiftCalendarMonth(1)" aria-label="Mes siguiente">→</button>
        <button type="button" class="btn-ghost sm cal-today" @click="goCalendarToday">Hoy</button>
        <span v-if="!loading" class="cal-count">
          {{ calendarMonthPostCount }} publicación{{ calendarMonthPostCount === 1 ? '' : 'es' }} este mes
        </span>
      </div>
      <div class="cal-weekdays">
        <span v-for="d in calendarWeekdays" :key="d">{{ d }}</span>
      </div>
      <div class="cal-grid">
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="cal-day"
          :class="{ muted: !cell.inMonth, today: cell.isToday }"
        >
          <div class="cal-day-num">{{ cell.day }}</div>
          <div class="cal-day-posts">
            <button
              v-for="p in cell.posts.slice(0, 3)"
              :key="p.id"
              type="button"
              class="cal-chip"
              :class="{ selected: selectMode && isSelected(p.id) }"
              :title="p.titulo"
              @click.stop="selectMode ? toggleSelect(p.id) : previewPost(p)"
            >
              <span class="cal-chip-img">
                <img v-if="calendarThumb(p)" :src="calendarThumb(p)" alt="" loading="lazy" />
                <span v-else class="cal-chip-fallback">{{ tipoLabel(p.tipo).slice(0, 1) }}</span>
              </span>
              <span class="cal-chip-title">{{ shortTitle(p.titulo) }}</span>
            </button>
            <button
              v-if="cell.posts.length > 3"
              type="button"
              class="cal-more"
              @click.stop="openCalendarDay(cell)"
            >
              +{{ cell.posts.length - 3 }}
            </button>
          </div>
        </div>
      </div>
      <p v-if="!items.length && !error" class="empty">No hay publicaciones en este filtro.</p>
      <p v-else-if="!calendarMonthHasPosts" class="cal-empty-hint">
        No hay publicaciones con fecha en {{ calendarMonthLabel }}.
      </p>
    </div>

    <nav v-if="viewMode !== 'calendar' && total > 0" class="pager" aria-label="Paginación">
      <p class="pager-meta">
        {{ rangeFrom }}–{{ rangeTo }} de {{ total }}
      </p>
      <div class="pager-actions">
        <button type="button" class="btn-ghost sm" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">
          Anterior
        </button>
        <span class="pager-pages">Página {{ page }} / {{ totalPages }}</span>
        <button type="button" class="btn-ghost sm" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">
          Siguiente
        </button>
        <label class="pager-size">
          <span>Por página</span>
          <select v-model.number="pageSize" class="input sm" @change="changePageSize">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>
    </nav>

    <div v-if="calendarDayOpen" class="sheet confirm-sheet" @click.self="calendarDayOpen = null">
      <div class="confirm-panel cal-day-panel" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <div>
            <h2>{{ calendarDayOpen.label }}</h2>
            <p>{{ calendarDayOpen.posts.length }} publicación{{ calendarDayOpen.posts.length === 1 ? '' : 'es' }}</p>
          </div>
          <button type="button" class="icon-btn" aria-label="Cerrar" @click="calendarDayOpen = null">×</button>
        </header>
        <div class="confirm-body cal-day-list">
          <button
            v-for="p in calendarDayOpen.posts"
            :key="p.id"
            type="button"
            class="cal-day-item"
            @click="calendarDayOpen = null; selectMode ? toggleSelect(p.id) : previewPost(p)"
          >
            <span class="cal-chip-img lg">
              <img v-if="calendarThumb(p)" :src="calendarThumb(p)" alt="" loading="lazy" />
              <span v-else class="cal-chip-fallback">{{ tipoLabel(p.tipo).slice(0, 1) }}</span>
            </span>
            <span class="cal-day-item-text">
              <strong>{{ p.titulo }}</strong>
              <span class="muted">{{ tipoLabel(p.tipo) }} · {{ statusLabel(p.status) }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal formato por tipo -->
    <div v-if="typeConfigOpen" class="sheet" @click.self="typeConfigOpen = false">
      <form class="sheet-panel type-config-panel" @submit.prevent="saveTypeConfig">
        <header class="sheet-head">
          <div>
            <h2>Formato por tipo de publicación</h2>
            <p>Definí el layout por defecto y qué elementos se muestran para cada tipo. Cada publicación puede sobrescribirlo.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="typeConfigOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="type-config-body">
          <div class="type-config-split">
            <div class="type-config-main">
              <div class="filters">
                <button
                  v-for="t in tipos"
                  :key="t.id"
                  type="button"
                  class="chip"
                  :class="{ on: configTipo === t.id }"
                  @click="configTipo = t.id"
                >
                  {{ t.label }}
                </button>
              </div>
              <div v-if="typeConfigDraft?.byTipo?.[configTipo]" class="type-config-fields">
                <div class="field">
                  <span class="label-text">Layout por defecto</span>
                  <div class="layout-grid">
                    <button
                      v-for="l in layouts"
                      :key="l.id"
                      type="button"
                      class="layout-card"
                      :class="{ on: typeConfigDraft.byTipo[configTipo].defaultLayout === l.id }"
                      @click="typeConfigDraft.byTipo[configTipo].defaultLayout = l.id"
                    >
                      <strong>{{ l.label }}</strong>
                      <small>{{ l.hint }}</small>
                    </button>
                  </div>
                </div>
                <div class="field">
                  <span class="label-text">Elementos visibles</span>
                  <div class="display-grid">
                    <label v-for="sk in showKeys" :key="sk.key" class="check-inline">
                      <input v-model="typeConfigDraft.byTipo[configTipo].show[sk.key]" type="checkbox" />
                      {{ sk.label }}
                    </label>
                  </div>
                </div>
              </div>
              <p v-if="typeConfigError" class="err">{{ typeConfigError }}</p>
            </div>
            <aside class="type-config-preview" aria-label="Vista previa del formato">
              <MobileFeedPreview
                :post="typeConfigPreviewModel"
                :truncate="true"
                :label="`Preview · ${tipoLabel(configTipo)} · ${layoutLabel(typeConfigPreviewModel.layout)}`"
                note="Se actualiza al cambiar layout o elementos visibles."
              />
            </aside>
          </div>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="typeConfigOpen = false">Cancelar</button>
          <button class="btn-primary" :disabled="typeConfigSaving">
            {{ typeConfigSaving ? 'Guardando…' : 'Guardar configuración' }}
          </button>
        </footer>
      </form>
    </div>

    <!-- Modal editar / crear -->
    <div v-if="draft" class="sheet" @click.self="closeModal">
      <form class="sheet-panel editor-panel" @submit.prevent="submitPrimary">
        <header class="sheet-head editor-head">
          <div class="editor-head-left">
            <h2>{{ draft.id ? 'Editar publicación' : draftFromAi ? 'Publicación generada con IA' : 'Nueva publicación' }}</h2>
          </div>
          <p class="editor-head-title" :title="draft.titulo || ''">
            {{ draft.titulo?.trim() || 'Sin título' }}
          </p>
          <div class="editor-head-right">
            <button
              type="button"
              class="status-badge inline status-badge-btn"
              :data-status="draft.publishWhen === 'scheduled' ? 'scheduled' : draft.status"
              title="Ir a cuándo / estado"
              @click="editorSection = 'publicacion'"
            >
              {{
                draft.publishWhen === 'scheduled'
                  ? 'Programada'
                  : statusLabel(draft.status)
              }}
            </button>
            <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeModal">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
        </header>

        <div class="editor-split">
          <nav class="editor-nav" aria-label="Temas de la publicación">
            <button
              v-for="sec in editorSections"
              :key="sec.id"
              type="button"
              class="editor-nav-item"
              :class="{ on: editorSection === sec.id }"
              @click="editorSection = sec.id"
            >
              <strong>{{ sec.label }}</strong>
              <small>{{ sec.hint }}</small>
            </button>
          </nav>

          <div class="editor-detail">
            <!-- Contenido -->
            <section v-show="editorSection === 'contenido'" class="editor-section editor-section-contenido">
              <h3 class="editor-section-title">Contenido</h3>
              <div class="field">
                <label for="titulo">Título</label>
                <p class="hint">La primera línea de la tarjeta. Corto y claro.</p>
                <input id="titulo" v-model="draft.titulo" class="input" required maxlength="120" placeholder="Ej. Feriado del viernes 15" />
              </div>
              <div class="field field-cuerpo">
                <label for="cuerpo">Mensaje</label>
                <p class="hint">Texto completo del comunicado.</p>
                <textarea id="cuerpo" v-model="draft.cuerpo" class="input input-cuerpo" placeholder="Qué pasa, para quién es y qué tienen que hacer…" />
              </div>
            </section>

            <!-- Tipo -->
            <section v-show="editorSection === 'tipo'" class="editor-section">
              <h3 class="editor-section-title">Tipo de contenido</h3>
              <p class="hint">Elegí el tipo. Abajo ves qué cambia al seleccionarlo.</p>
              <div class="type-grid" style="margin-top: 10px">
                <button
                  v-for="t in tipos"
                  :key="t.id"
                  type="button"
                  class="type-card"
                  :class="{ on: draft.tipo === t.id }"
                  @click="setTipo(t.id)"
                >
                  <strong>{{ t.label }}</strong>
                  <small>{{ t.hint }}</small>
                </button>
              </div>

              <div v-if="tipoConsequence" class="tipo-consequence">
                <div class="tipo-consequence-head">
                  <strong>{{ tipoConsequence.title }}</strong>
                  <span class="tipo-consequence-badge">{{ tipoConsequence.badge }}</span>
                </div>
                <p class="tipo-consequence-lead">{{ tipoConsequence.lead }}</p>
                <div class="tipo-consequence-cols">
                  <div>
                    <strong class="tipo-consequence-label change">Qué cambia al elegir esto</strong>
                    <ul>
                      <li v-for="(item, i) in tipoConsequence.changes" :key="'c' + i">{{ item }}</li>
                    </ul>
                  </div>
                  <div>
                    <strong class="tipo-consequence-label keep">Qué no se pierde</strong>
                    <ul>
                      <li v-for="(item, i) in tipoConsequence.keeps" :key="'k' + i">{{ item }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <!-- Media -->
            <section v-show="editorSection === 'media'" class="editor-section">
              <h3 class="editor-section-title">Media</h3>
              <div class="media-split">
                <div class="media-split-col">
                  <h4 class="media-split-heading">Visual</h4>
                  <p class="hint">Imagen, video, YouTube o carrusel de varias fotos.</p>
                  <div class="media-type-grid media-type-row" role="radiogroup" aria-label="Tipo de media">
                    <button
                      v-for="m in mediaTypes"
                      :key="m.id"
                      type="button"
                      class="type-card type-card-compact"
                      :class="{ on: mediaType === m.id }"
                      @click="setMediaType(m.id)"
                    >
                      <strong>{{ m.label }}</strong>
                      <small>{{ m.hint }}</small>
                    </button>
                  </div>

                  <div v-if="mediaType === 'carousel'" class="carousel-editor">
                    <div
                      class="dropzone"
                      :class="{ over: carouselDragOver, busy: carouselUploading }"
                      @dragenter.prevent="carouselDragOver = true"
                      @dragover.prevent="carouselDragOver = true"
                      @dragleave.prevent="carouselDragOver = false"
                      @drop.prevent="onCarouselDrop"
                      @click="carouselFileInput?.click()"
                    >
                      <input
                        ref="carouselFileInput"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        hidden
                        @change="onCarouselFilesSelected"
                      />
                      <strong>{{ carouselUploading ? 'Subiendo…' : 'Arrastrá o elegí varias imágenes' }}</strong>
                      <small>jpg, png, webp, gif · hasta 12 · se guardan en /uploads</small>
                    </div>
                    <p v-if="carouselUploadError" class="err">{{ carouselUploadError }}</p>
                    <ul v-if="draft.imageUrls?.length" class="carousel-list">
                      <li v-for="(u, i) in draft.imageUrls" :key="u + i" class="carousel-item">
                        <img :src="resolveMediaUrl(u)" :alt="`Slide ${i + 1}`" />
                        <div class="carousel-item-meta">
                          <code>{{ u }}</code>
                          <div class="carousel-item-actions">
                            <button type="button" class="link-btn" :disabled="i === 0" @click="moveCarouselItem(i, -1)">↑</button>
                            <button
                              type="button"
                              class="link-btn"
                              :disabled="i === draft.imageUrls.length - 1"
                              @click="moveCarouselItem(i, 1)"
                            >
                              ↓
                            </button>
                            <button type="button" class="link-btn danger" @click="removeCarouselItem(i)">Quitar</button>
                          </div>
                        </div>
                      </li>
                    </ul>
                    <div class="carousel-add-url">
                      <input
                        v-model="carouselUrlDraft"
                        class="input"
                        type="text"
                        inputmode="url"
                        placeholder="O pegá una URL /uploads/… o https://…"
                        @keydown.enter.prevent="addCarouselUrl"
                      />
                      <button type="button" class="btn-ghost sm" @click="addCarouselUrl">Agregar URL</button>
                    </div>
                    <div v-if="draft.imageUrls?.length >= 2" class="media-admin-preview">
                      <PostMediaCarousel :urls="draft.imageUrls" :alt="draft.titulo || 'Carrusel'" />
                    </div>
                    <p v-else-if="draft.imageUrls?.length === 1" class="hint warn-hint">
                      Agregá al menos 2 imágenes para activar el carrusel.
                    </p>
                  </div>

                  <template v-else-if="mediaType === 'image'">
                    <div
                      class="dropzone"
                      :class="{ over: imageDragOver, busy: imageUploading }"
                      @dragenter.prevent="imageDragOver = true"
                      @dragover.prevent="imageDragOver = true"
                      @dragleave.prevent="imageDragOver = false"
                      @drop.prevent="onImageDrop"
                      @click="imageFileInput?.click()"
                    >
                      <input
                        ref="imageFileInput"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        hidden
                        @change="onImageFileSelected"
                      />
                      <strong>{{ imageUploading ? 'Subiendo…' : 'Arrastrá o elegí una imagen' }}</strong>
                      <small>jpg, png, webp, gif · se guarda en /uploads</small>
                    </div>
                    <p v-if="imageUploadError" class="err">{{ imageUploadError }}</p>
                    <div class="carousel-add-url">
                      <label class="sr-only" for="imageUrl">URL de imagen</label>
                      <input
                        id="imageUrl"
                        v-model="draft.imageUrl"
                        class="input"
                        type="text"
                        inputmode="url"
                        placeholder="O pegá una URL /uploads/… o https://…"
                      />
                    </div>
                    <p v-if="draft.imageUrl" class="hint">
                      Detectado: <strong>{{ detectedMediaLabel || '—' }}</strong>
                    </p>
                    <div v-if="draft.imageUrl" class="media-admin-preview">
                      <PostMedia :url="draft.imageUrl" :alt="draft.titulo || 'Vista previa'" :autoplay-on-visible="false" />
                    </div>
                    <button
                      v-if="draft.imageUrl"
                      type="button"
                      class="link-btn danger"
                      @click="clearImageMedia"
                    >
                      Quitar imagen
                    </button>
                  </template>

                  <template v-else>
                    <div class="url-with-search">
                      <label class="sr-only" for="imageUrlVideo">URL de media</label>
                      <input
                        id="imageUrlVideo"
                        v-model="draft.imageUrl"
                        class="input"
                        type="text"
                        inputmode="url"
                        :placeholder="mediaPlaceholder"
                      />
                      <button
                        type="button"
                        class="btn-ghost sm"
                        title="Buscar video en YouTube"
                        @click="openMediaPicker('youtube')"
                      >
                        Buscar en YouTube
                      </button>
                    </div>
                    <p class="hint">
                      Pegá la URL
                      <template v-if="mediaType === 'youtube'"> del video de YouTube</template>
                      <template v-else> del archivo de video</template>
                      o buscá uno en YouTube.
                    </p>
                    <p v-if="draft.imageUrl" class="hint">
                      Detectado: <strong>{{ detectedMediaLabel || '—' }}</strong>
                    </p>
                    <div v-if="draft.imageUrl" class="media-admin-preview media-admin-preview-video">
                      <p class="media-preview-label">Vista previa — reproducí acá antes de publicar</p>
                      <PostMedia
                        :url="draft.imageUrl"
                        :alt="draft.titulo || 'Vista previa'"
                        :autoplay-on-visible="false"
                      />
                    </div>
                  </template>
                </div>

                <div class="media-split-col media-split-audio">
                  <h4 class="media-split-heading">Audio</h4>
                  <p class="hint">
                    Opcional. Solo tiene sentido con <strong>imagen o carrusel</strong> (no video).
                    Pegá un link a mp3, m4a, ogg o wav, o buscá uno en la red.
                  </p>
                  <div class="field">
                    <label for="audioUrl">URL de audio</label>
                    <div class="url-with-search">
                      <input
                        id="audioUrl"
                        v-model="draft.audioUrl"
                        class="input"
                        type="url"
                        placeholder="https://…/nota.mp3"
                      />
                      <button
                        type="button"
                        class="btn-ghost sm"
                        title="Buscar audio en la red"
                        @click="openMediaPicker('audio')"
                      >
                        Buscar en la red
                      </button>
                    </div>
                  </div>
                  <div v-if="draft.audioUrl" class="audio-admin-preview">
                    <p class="media-preview-label">Escuchar acá</p>
                    <audio
                      :key="draft.audioUrl"
                      class="audio-player"
                      controls
                      preload="metadata"
                      :src="resolveMediaUrl(draft.audioUrl)"
                    >
                      Tu navegador no reproduce este audio.
                    </audio>
                  </div>
                  <p v-if="draft.audioUrl && isVideo(draft.imageUrl)" class="hint warn-hint">
                    Hay un video o YouTube como media: el audio asociado se ignora en la app.
                  </p>
                  <p v-else-if="draft.audioUrl" class="hint">
                    El miembro podrá reproducirlo sobre la foto en el muro.
                  </p>
                </div>
              </div>
            </section>

            <!-- Formato -->
            <section v-show="editorSection === 'formato'" class="editor-section">
              <h3 class="editor-section-title">Formato de la tarjeta</h3>
              <p class="hint">Elegí cómo se acomoda en el feed. Abajo ves el preview al instante.</p>
              <div class="layout-grid" style="margin-top: 10px">
                <button
                  v-for="l in layouts"
                  :key="l.id"
                  type="button"
                  class="layout-card"
                  :class="{ on: draft.layout === l.id }"
                  @click="draft.layout = l.id"
                >
                  <strong>{{ l.label }}</strong>
                  <small>{{ l.hint }}</small>
                </button>
              </div>
              <div class="formato-preview">
                <MobileFeedPreview
                  :post="previewModel"
                  :truncate="true"
                  :label="`Preview · ${layoutLabel(draft.layout)}`"
                  note="Así se vería la tarjeta con este formato en el muro."
                />
              </div>
            </section>

            <!-- Publicación -->
            <section v-show="editorSection === 'publicacion'" class="editor-section">
              <h3 class="editor-section-title">Publicación</h3>
              <div class="pub-split">
                <div class="pub-split-col">
                  <h4 class="media-split-heading">¿Cuándo sale al muro?</h4>
                  <p class="hint">Elegí acá o abajo del editor (siempre visible). No hace falta tocar un estado especial.</p>
                  <div class="audience-modes schedule-modes" role="radiogroup" aria-label="Cuándo publicar">
                    <button
                      type="button"
                      class="type-card"
                      :class="{ on: draft.publishWhen !== 'scheduled' }"
                      role="radio"
                      :aria-checked="draft.publishWhen !== 'scheduled'"
                      @click="setPublishWhen('now')"
                    >
                      <strong>Publicar ahora</strong>
                      <small>Sale al muro al confirmar</small>
                    </button>
                    <button
                      type="button"
                      class="type-card"
                      :class="{ on: draft.publishWhen === 'scheduled' }"
                      role="radio"
                      :aria-checked="draft.publishWhen === 'scheduled'"
                      @click="setPublishWhen('scheduled')"
                    >
                      <strong>Programar día y hora</strong>
                      <small>Se publica sola después</small>
                    </button>
                  </div>
                  <div v-if="draft.publishWhen === 'scheduled'" class="schedule-box">
                    <p class="hint">
                      Elegí el día y/o la hora (horario local). Si solo ponés el día, usamos 09:00.
                      Si solo ponés la hora, usamos hoy (o mañana si esa hora ya pasó).
                    </p>
                    <div class="schedule-presets">
                      <button type="button" class="chip" @click="applySchedulePreset('1h')">En 1 hora</button>
                      <button type="button" class="chip" @click="applySchedulePreset('tomorrow9')">Mañana 09:00</button>
                      <button type="button" class="chip" @click="applySchedulePreset('tomorrow18')">Mañana 18:00</button>
                      <button type="button" class="chip" @click="applySchedulePreset('monday9')">Próx. lunes 09:00</button>
                    </div>
                    <div class="schedule-fields">
                      <label class="field">
                        <span>Día</span>
                        <input v-model="scheduleDate" class="input" type="date" :min="minScheduleDate" />
                      </label>
                      <label class="field">
                        <span>Hora</span>
                        <input v-model="scheduleTime" class="input" type="time" />
                      </label>
                    </div>
                    <p v-if="scheduleSummary" class="schedule-summary">
                      Se publicará el <strong>{{ scheduleSummary }}</strong>
                    </p>
                    <p v-else class="err small">Definí al menos el día o la hora para programar.</p>
                    <div v-if="scheduleConflictsLoading" class="schedule-conflicts muted">
                      Buscando otras programadas…
                    </div>
                    <div
                      v-else-if="scheduleConflicts.count > 0"
                      class="schedule-conflicts"
                      :class="{ danger: scheduleConflicts.nearCount > 0 }"
                    >
                      <p class="schedule-conflicts-title">
                        <template v-if="scheduleConflicts.nearCount">
                          Cuidado: hay {{ scheduleConflicts.nearCount }}
                          publicación{{ scheduleConflicts.nearCount === 1 ? '' : 'es' }}
                          en ±2 h (posible colapso en el muro).
                        </template>
                        <template v-else>
                          Ese día ya hay {{ scheduleConflicts.count }}
                          publicación{{ scheduleConflicts.count === 1 ? '' : 'es' }} programada{{ scheduleConflicts.count === 1 ? '' : 's' }}.
                        </template>
                      </p>
                      <ul class="schedule-conflicts-list">
                        <li v-for="c in scheduleConflicts.items" :key="c.id">
                          <span class="sev" :data-sev="c.severity">{{ c.severity === 'near' ? 'Cerca' : 'Mismo día' }}</span>
                          <strong>{{ c.titulo }}</strong>
                          <span class="when">{{ formatDate(c.scheduledAt) }}</span>
                          <span v-if="c.deltaMinutes != null" class="delta">
                            {{ formatDeltaMinutes(c.deltaMinutes) }}
                          </span>
                        </li>
                      </ul>
                    </div>
                    <p v-else-if="scheduleSummary && scheduleConflicts.checked" class="schedule-conflicts ok">
                      No hay otras programadas ese día.
                    </p>
                  </div>

                  <h4 class="media-split-heading" style="margin-top: 16px">Estado</h4>
                  <p class="hint">Borrador, moderación o archivo. La programación se elige arriba, no acá.</p>
                  <div class="status-change-grid editor-status-grid" role="radiogroup" aria-label="Estado de la publicación">
                    <button
                      v-for="opt in editorStatusOptions"
                      :key="opt.id"
                      type="button"
                      class="status-option"
                      :class="{ on: editorStatusSelected === opt.id }"
                      :data-status="opt.id"
                      role="radio"
                      :aria-checked="editorStatusSelected === opt.id"
                      @click="setDraftStatus(opt.id)"
                    >
                      <span class="status-badge inline" :data-status="opt.id">{{ opt.label }}</span>
                      <small>{{ opt.hint }}</small>
                    </button>
                  </div>
                  <div v-if="draft.status === 'rejected'" class="field" style="margin-top: 10px">
                    <label for="editorRejectReason">Motivo del rechazo</label>
                    <textarea
                      id="editorRejectReason"
                      v-model="draft.rejectionReason"
                      class="input"
                      rows="2"
                      maxlength="500"
                      placeholder="Visible para el autor si es UGC…"
                    />
                  </div>
                  <h4 class="media-split-heading" style="margin-top: 16px">Visibilidad en el muro</h4>
                  <div class="field">
                    <label for="priority">Importancia (0–100)</label>
                    <p class="hint">Más alto = aparece antes (si no está fijada).</p>
                    <input id="priority" v-model.number="draft.priority" type="number" min="0" max="100" class="input" />
                  </div>
                  <label class="check">
                    <input v-model="draft.pinned" type="checkbox" />
                    <span>
                      <strong>Fijar arriba del muro</strong>
                      <small>Queda primero; podés limitar la duración abajo.</small>
                    </span>
                  </label>
                  <div v-if="draft.pinned" class="field">
                    <label>Duración de la fijación</label>
                    <div class="chip-row">
                      <button
                        v-for="pr in pinPresets"
                        :key="pr.id"
                        type="button"
                        class="chip"
                        :class="{ on: draft.pinnedPreset === pr.id }"
                        @click="applyPinPreset(pr.id)"
                      >
                        {{ pr.label }}
                      </button>
                    </div>
                    <label class="hint" style="display:block;margin-top:8px">O fecha/hora exacta de desfije</label>
                    <input v-model="draft.pinnedUntilLocal" type="datetime-local" class="input" />
                  </div>
                  <div class="field">
                    <label for="expiresAt">Vencimiento (opcional)</label>
                    <p class="hint">Al llegar esa fecha/hora sale del muro (archivada).</p>
                    <input id="expiresAt" v-model="draft.expiresAtLocal" type="datetime-local" class="input" />
                  </div>
                  <div class="field">
                    <label for="section">Sección editorial</label>
                    <p class="hint">Ej. deporte, internacional, moda, cultura…</p>
                    <input
                      id="section"
                      v-model="draft.section"
                      class="input"
                      list="section-suggestions"
                      maxlength="80"
                      placeholder="Sin sección"
                    />
                    <datalist id="section-suggestions">
                      <option v-for="s in sectionSuggestions" :key="s" :value="s" />
                    </datalist>
                  </div>
                  <label class="check">
                    <input v-model="draft.commentsEnabled" type="checkbox" />
                    <span>
                      <strong>Permitir comentarios</strong>
                      <small>Si lo desactivás, en la app no se puede comentar esta publicación.</small>
                    </span>
                  </label>
                  <label class="check">
                    <input v-model="draft.isKnowledge" type="checkbox" />
                    <span>
                      <strong>Biblioteca de conocimiento</strong>
                      <small>Aparece en /conocimiento y en deep links ?knowledge=1.</small>
                    </span>
                  </label>
                </div>
                <div class="pub-split-col">
                  <h4 class="media-split-heading">Avisos al publicar</h4>
                  <label class="check">
                    <input v-model="draft.notifyAudience" type="checkbox" />
                    <span>
                      <strong>Notificar a la audiencia</strong>
                      <small>
                        Al publicar (ahora o en la fecha programada), envía push + email + aviso in-app
                        a quienes ven esta pieza. Desactivado por defecto.
                      </small>
                    </span>
                  </label>
                  <label
                    v-if="draft.id && draft.status === 'published' && draft.publishedAt"
                    class="check"
                  >
                    <input v-model="draft.renotifyAudience" type="checkbox" />
                    <span>
                      <strong>Reenviar notificación ahora</strong>
                      <small>Solo si ya está publicada y querés avisar de nuevo al guardar.</small>
                    </span>
                  </label>
                  <p v-else class="hint">
                    El reenvío aparece cuando la pieza ya está publicada.
                  </p>
                </div>
              </div>
            </section>

            <!-- Encuesta embebida -->
            <section v-show="editorSection === 'encuesta'" class="editor-section">
              <h3 class="editor-section-title">Encuesta embebida</h3>
              <p class="hint">
                Opcional. El muro muestra un botón para responder esa encuesta desde la publicación.
              </p>
              <div class="encuesta-split">
                <div class="encuesta-pick">
                  <label for="linkedSurveyId">Elegir encuesta</label>
                  <select
                    id="linkedSurveyId"
                    class="input"
                    :value="draft.linkedSurveyId || ''"
                    @change="onLinkedSurveyChange($event.target.value)"
                  >
                    <option value="">Sin encuesta</option>
                    <option v-for="s in surveyOptions" :key="s.id" :value="s.id">
                      {{ s.titulo }}{{ s.status ? ` · ${surveyStatusLabel(s.status)}` : '' }}
                    </option>
                  </select>
                  <p v-if="!surveyOptions.length" class="hint">
                    No hay encuestas. Creálas en Encuestas.
                  </p>
                </div>
                <div class="encuesta-detail">
                  <div v-if="linkedSurveyLoading" class="hint">Cargando detalle…</div>
                  <div v-else-if="linkedSurveyError" class="err">{{ linkedSurveyError }}</div>
                  <div v-else-if="linkedSurveyDetail" class="encuesta-card">
                    <div class="encuesta-card-head">
                      <strong>{{ linkedSurveyDetail.titulo }}</strong>
                      <span class="status-badge inline" :data-status="linkedSurveyDetail.status">
                        {{ surveyStatusLabel(linkedSurveyDetail.status) }}
                      </span>
                    </div>
                    <p v-if="linkedSurveyDetail.descripcion" class="encuesta-desc">
                      {{ linkedSurveyDetail.descripcion }}
                    </p>
                    <ul class="encuesta-meta">
                      <li>{{ linkedSurveyDetail.questionCount || linkedSurveyDetail.questions?.length || 0 }} pregunta(s)</li>
                      <li>{{ linkedSurveyDetail.anonymous ? 'Anónima' : 'Con identificación' }}</li>
                      <li v-if="linkedSurveyDetail.audience?.mode === 'restricted'">Audiencia restringida</li>
                      <li v-else>Toda la comunidad</li>
                      <li v-if="linkedSurveyDetail.startsAt">Desde {{ formatDate(linkedSurveyDetail.startsAt) }}</li>
                      <li v-if="linkedSurveyDetail.endsAt">Hasta {{ formatDate(linkedSurveyDetail.endsAt) }}</li>
                    </ul>
                    <div v-if="linkedSurveyDetail.questions?.length" class="encuesta-questions">
                      <strong class="encuesta-q-title">Preguntas</strong>
                      <ol>
                        <li v-for="q in linkedSurveyDetail.questions" :key="q.id">
                          <span>{{ q.texto }}</span>
                          <small>
                            {{ surveyQuestionTypeLabel(q.tipo) }}
                            <template v-if="q.required !== false"> · obligatoria</template>
                          </small>
                        </li>
                      </ol>
                    </div>
                  </div>
                  <div v-else class="encuesta-empty">
                    <p class="hint">Elegí una encuesta a la izquierda para ver su detalle acá.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Audiencia -->
            <section v-show="editorSection === 'audiencia'" class="editor-section">
              <h3 class="editor-section-title">Audiencia</h3>
              <p class="hint">
                Quién ve esta publicación: toda la comunidad, áreas/grupos, solo personas, o nadie.
                En áreas podés sumar destinatarios puntuales de otras áreas.
              </p>
              <div class="audience-modes audience-modes-4" style="margin-top: 10px">
                <button
                  type="button"
                  class="type-card"
                  :class="{ on: draft.audience.mode === 'all' }"
                  @click="setAudienceMode('all')"
                >
                  <strong>Toda la comunidad</strong>
                  <small>Todos los miembros del tenant</small>
                </button>
                <button
                  type="button"
                  class="type-card"
                  :class="{ on: draft.audience.mode === 'restricted' }"
                  @click="setAudienceMode('restricted')"
                >
                  <strong>Áreas y/o grupos</strong>
                  <small>Más personas puntuales si hace falta</small>
                </button>
                <button
                  type="button"
                  class="type-card"
                  :class="{ on: draft.audience.mode === 'users' }"
                  @click="setAudienceMode('users')"
                >
                  <strong>Solo personas</strong>
                  <small>Destinatarios puntuales</small>
                </button>
                <button
                  type="button"
                  class="type-card"
                  :class="{ on: draft.audience.mode === 'none' }"
                  @click="setAudienceMode('none')"
                >
                  <strong>Nadie</strong>
                  <small>No aparece en el muro de miembros</small>
                </button>
              </div>

              <div v-if="draft.audience.mode === 'none'" class="audience-note">
                <p class="hint">
                  La publicación puede guardarse y previsualizarse en admin, pero ningún miembro la verá en el muro.
                </p>
              </div>

              <div v-if="draft.audience.mode === 'restricted'" class="audience-picks">
                <div>
                  <p class="hint">Áreas</p>
                  <label v-for="a in orgAreas" :key="a.id" class="check-inline">
                    <input v-model="draft.audience.areaIds" type="checkbox" :value="a.id" />
                    {{ a.nombre }}
                  </label>
                  <p v-if="!orgAreas.length" class="hint">No hay áreas. Creálas en Organización.</p>
                </div>
                <div>
                  <p class="hint">Grupos</p>
                  <label v-for="g in orgGroups" :key="g.id" class="check-inline">
                    <input v-model="draft.audience.groupIds" type="checkbox" :value="g.id" />
                    {{ g.nombre }}
                  </label>
                  <p v-if="!orgGroups.length" class="hint">No hay grupos. Creálos en Organización.</p>
                </div>
              </div>

              <div
                v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'"
                class="audience-users"
              >
                <h4 class="media-split-heading">
                  {{ draft.audience.mode === 'users' ? 'Destinatarios puntuales' : 'También incluir personas puntuales' }}
                </h4>
                <p class="hint">
                  {{
                    draft.audience.mode === 'users'
                      ? 'Solo estas personas verán la publicación.'
                      : 'Sumá gente de otras áreas (o individuales) además de las áreas/grupos marcados.'
                  }}
                </p>
                <div class="audience-user-search">
                  <input
                    v-model="audienceUserQuery"
                    class="input"
                    type="search"
                    placeholder="Buscar por nombre, usuario o email…"
                    @input="onAudienceUserQuery"
                  />
                </div>
                <p v-if="audienceUserSearching" class="hint">Buscando…</p>
                <ul v-else-if="audienceUserResults.length" class="audience-user-results">
                  <li v-for="u in audienceUserResults" :key="u.id">
                    <button
                      type="button"
                      class="audience-user-add"
                      :disabled="draft.audience.userIds.includes(u.id)"
                      @click="addAudienceUser(u)"
                    >
                      <strong>{{ u.label }}</strong>
                      <small>{{ u.usuario }}{{ u.email ? ` · ${u.email}` : '' }}</small>
                    </button>
                  </li>
                </ul>
                <p v-else-if="audienceUserQuery.trim().length >= 2" class="hint">Sin resultados.</p>

                <div v-if="selectedAudienceUsers.length" class="audience-user-chips">
                  <span v-for="u in selectedAudienceUsers" :key="u.id" class="audience-chip">
                    {{ u.label }}
                    <button type="button" class="audience-chip-x" :title="`Quitar ${u.label}`" @click="removeAudienceUser(u.id)">
                      ×
                    </button>
                  </span>
                </div>
                <p v-else class="hint">Todavía no agregaste personas puntuales.</p>
              </div>
            </section>

            <!-- Elementos -->
            <section v-show="editorSection === 'elementos'" class="editor-section">
              <h3 class="editor-section-title">Elementos visibles</h3>
              <p class="hint">Marcá o desmarcá y mirá a la derecha cómo queda la tarjeta en el muro.</p>
              <div class="elementos-split">
                <div class="elementos-checks">
                  <div class="display-checks">
                    <label v-for="sk in showKeys" :key="sk.key" class="check">
                      <input
                        type="checkbox"
                        :checked="effectiveShow(sk.key)"
                        @change="onShowToggle(sk.key, $event.target.checked)"
                      />
                      <span>
                        <strong>{{ sk.label }}</strong>
                      </span>
                    </label>
                  </div>
                </div>
                <div class="elementos-preview">
                  <MobileFeedPreview
                    :post="previewModel"
                    :truncate="true"
                    label="Preview · elementos"
                    note="Se actualiza al marcar o desmarcar."
                  />
                </div>
              </div>
            </section>

            <!-- Asistente IA -->
            <section v-show="editorSection === 'asistente'" class="editor-section">
              <h3 class="editor-section-title">Asistente IA</h3>

              <div class="ai-explain">
                <div class="ai-explain-card keep">
                  <strong>Se mantiene</strong>
                  <ul>
                    <li>Estado, audiencia, notificación, fijado e importancia</li>
                    <li>Encuesta vinculada y elementos visibles</li>
                    <li>Audio (salvo que la IA proponga otro)</li>
                    <li>La imagen/carrusel actual, si no pedís regenerarlos</li>
                    <li>Nada se publica solo: vos confirmás con los botones de abajo</li>
                  </ul>
                </div>
                <div class="ai-explain-card change">
                  <strong>Puede cambiar</strong>
                  <ul>
                    <li>Título y mensaje (los reescribe según tu pedido)</li>
                    <li>Tipo y formato de tarjeta, si lo pedís</li>
                    <li>Imagen o carrusel, solo si marcás regenerar</li>
                  </ul>
                </div>
              </div>
              <p class="hint ai-explain-note">
                Pedí el cambio en lenguaje natural. La IA usa el borrador actual y el historial de esta sesión.
                Cada ajuste reemplaza título/cuerpo por la nueva versión; no es un “deshacer” automático.
              </p>

              <section class="ai-box">
                <div class="ai-box-head">
                  <strong>Mejorar borrador</strong>
                  <span v-if="aiHistory.length" class="ai-turns">{{ Math.floor(aiHistory.length / 2) }} ajuste(s) en contexto</span>
                </div>
                <div class="provider-row" role="group" aria-label="Proveedor IA">
                  <button
                    v-for="p in providerOptions"
                    :key="'ref-' + p.id"
                    type="button"
                    class="provider-chip"
                    :class="{ on: aiProvider === p.id, disabled: p.id !== 'auto' && !aiProviders[p.id] }"
                    :disabled="p.id !== 'auto' && !aiProviders[p.id]"
                    @click="aiProvider = p.id"
                  >
                    {{ p.label }}
                  </button>
                </div>
                <textarea
                  v-model="aiRefinePrompt"
                  rows="3"
                  class="input"
                  placeholder="Ej. Más corto y urgente · Cambiá a tipo evento · Dejá la misma idea pero más formal…"
                  :disabled="aiLoading"
                />
                <div class="ai-box-actions">
                  <label class="ai-check">
                    <input v-model="aiWantImage" type="checkbox" :disabled="aiWantCarousel" />
                    Regenerar imagen (reemplaza la actual)
                  </label>
                  <label class="ai-check">
                    <input v-model="aiWantCarousel" type="checkbox" @change="onAiCarouselToggle" />
                    Regenerar carrusel — 3 fotos (reemplaza el actual)
                  </label>
                  <button type="button" class="btn-primary" :disabled="aiLoading || !aiRefinePrompt.trim()" @click="runAiRefine">
                    {{ aiLoading ? 'Generando…' : 'Mejorar con IA' }}
                  </button>
                </div>
                <p v-if="aiLastProvider" class="ai-notes">Usó: {{ aiLastProvider }}{{ aiLastModel ? ` · ${aiLastModel}` : '' }}</p>
                <p v-if="aiNotes" class="ai-notes">{{ aiNotes }}</p>
                <p v-if="aiError" class="err">{{ aiError }}</p>
              </section>
            </section>

            <p v-if="formError" class="err">{{ formError }}</p>
          </div>
        </div>

        <div class="publish-when-bar" aria-label="Cuándo publicar">
          <div class="publish-when-top">
            <strong class="publish-when-title">¿Cuándo sale al muro?</strong>
            <div class="publish-when-toggle" role="radiogroup" aria-label="Momento de publicación">
              <button
                type="button"
                class="publish-when-btn"
                :class="{ on: draft.publishWhen !== 'scheduled' }"
                role="radio"
                :aria-checked="draft.publishWhen !== 'scheduled'"
                @click="setPublishWhen('now')"
              >
                Ahora
              </button>
              <button
                type="button"
                class="publish-when-btn"
                :class="{ on: draft.publishWhen === 'scheduled' }"
                role="radio"
                :aria-checked="draft.publishWhen === 'scheduled'"
                @click="setPublishWhen('scheduled')"
              >
                Programar
              </button>
            </div>
          </div>
          <div v-if="draft.publishWhen === 'scheduled'" class="publish-when-schedule">
            <div class="schedule-presets">
              <button type="button" class="chip" @click="applySchedulePreset('1h')">En 1 hora</button>
              <button type="button" class="chip" @click="applySchedulePreset('tomorrow9')">Mañana 09:00</button>
              <button type="button" class="chip" @click="applySchedulePreset('tomorrow18')">Mañana 18:00</button>
              <button type="button" class="chip" @click="applySchedulePreset('monday9')">Próx. lunes 09:00</button>
            </div>
            <div class="schedule-fields schedule-fields-inline">
              <label class="field">
                <span>Día</span>
                <input v-model="scheduleDate" class="input" type="date" :min="minScheduleDate" />
              </label>
              <label class="field">
                <span>Hora</span>
                <input v-model="scheduleTime" class="input" type="time" />
              </label>
            </div>
            <p v-if="scheduleSummary" class="schedule-summary">
              Se publicará el <strong>{{ scheduleSummary }}</strong>
            </p>
            <p v-else class="err small">Definí día y/o hora para programar.</p>
            <div v-if="scheduleConflictsLoading" class="schedule-conflicts muted">
              Buscando otras programadas…
            </div>
            <div
              v-else-if="scheduleConflicts.count > 0"
              class="schedule-conflicts"
              :class="{ danger: scheduleConflicts.nearCount > 0 }"
            >
              <p class="schedule-conflicts-title">
                <template v-if="scheduleConflicts.nearCount">
                  Cuidado: {{ scheduleConflicts.nearCount }} cerca (±2 h). Revisá para evitar colapso.
                </template>
                <template v-else>
                  Ese día ya hay {{ scheduleConflicts.count }} programada{{ scheduleConflicts.count === 1 ? '' : 's' }}.
                </template>
              </p>
              <ul class="schedule-conflicts-list">
                <li v-for="c in scheduleConflicts.items" :key="c.id">
                  <span class="sev" :data-sev="c.severity">{{ c.severity === 'near' ? 'Cerca' : 'Día' }}</span>
                  <strong>{{ c.titulo }}</strong>
                  <span class="when">{{ formatDate(c.scheduledAt) }}</span>
                </li>
              </ul>
            </div>
            <p v-else-if="scheduleSummary && scheduleConflicts.checked" class="schedule-conflicts ok">
              Sin otras programadas ese día.
            </p>
          </div>
        </div>

        <footer class="sheet-foot editor-foot">
          <button type="button" class="btn-ghost" @click="closeModal">Cancelar</button>
          <button type="button" class="btn-ghost" :disabled="saving" @click="save">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-ghost" :disabled="saving" @click="saveAsDraft">Guardar borrador</button>
          <button type="button" class="btn-ghost" @click="openDraftPreview">Previsualizar</button>
          <button class="btn-primary" :disabled="saving">
            {{
              saving
                ? draft.publishWhen === 'scheduled'
                  ? 'Programando…'
                  : 'Publicando…'
                : draft.publishWhen === 'scheduled'
                  ? 'Programar publicación'
                  : 'Publicar en el muro'
            }}
          </button>
        </footer>
      </form>
    </div>

    <!-- Previsualizar borrador como lo ve un miembro -->
    <div v-if="draft && draftPreviewOpen" class="sheet draft-preview-sheet" @click.self="draftPreviewOpen = false">
      <div class="viewer-panel">
        <header class="sheet-head">
          <div>
            <h2>Previsualizar</h2>
            <p>Así lo ve un miembro en el muro de la app.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="draftPreviewOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="viewer-body">
          <MobileFeedPreview
            :post="previewModel"
            :truncate="false"
            label="Vista miembro"
            :note="
              draft.publishWhen === 'scheduled'
                ? `Programada${scheduleSummary ? ` · ${scheduleSummary}` : ''} (los miembros todavía no la ven).`
                : draft.status === 'published'
                  ? 'Estado actual: publicada (visible en el muro).'
                  : draft.status === 'draft'
                    ? 'Estado actual: borrador (los miembros todavía no la ven).'
                    : 'Estado actual: fuera del muro.'
            "
          />
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="draftPreviewOpen = false">Cerrar</button>
        </footer>
      </div>
    </div>

    <!-- Modal prompt IA (nueva) — sin cambios de flujo -->
    <div v-if="aiPromptOpen" class="sheet" @click.self="aiPromptOpen = false">
      <form class="ai-prompt-panel" @submit.prevent="runAiCreate">
        <header class="sheet-head">
          <div>
            <h2>Nueva publicación con IA</h2>
            <p>
              Describí el objetivo. Elegí OpenAI o Anthropic. Si pedís un feriado, usamos el calendario de Argentina.
              La imagen se genera con tu key de OpenAI.
            </p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="aiPromptOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="ai-prompt-body">
          <span class="label-text">Proveedor</span>
          <div class="provider-row" role="group" aria-label="Proveedor IA">
            <button
              v-for="p in providerOptions"
              :key="'new-' + p.id"
              type="button"
              class="provider-chip"
              :class="{ on: aiProvider === p.id, disabled: p.id !== 'auto' && !aiProviders[p.id] }"
              :disabled="aiLoading || (p.id !== 'auto' && !aiProviders[p.id])"
              @click="aiProvider = p.id"
            >
              {{ p.label }}
            </button>
          </div>
          <label for="aiGoal" class="label-text">¿Qué querés comunicar?</label>
          <textarea
            id="aiGoal"
            v-model="aiCreatePrompt"
            rows="5"
            class="input"
            required
            placeholder="Ej. Avisar el próximo feriado con empatía: ese día lamentablemente se trabaja en nuestra comunidad…"
            :disabled="aiLoading"
          />
          <label class="ai-check">
            <input v-model="aiWantImage" type="checkbox" :disabled="aiWantCarousel" />
            Generar imagen con IA
          </label>
          <label class="ai-check">
            <input v-model="aiWantCarousel" type="checkbox" @change="onAiCarouselToggle" />
            Generar carrusel (3 imágenes)
          </label>
          <p v-if="aiWantCarousel" class="hint">
            Tarda más: genera 3 fotos distintas para el muro en formato carrusel.
          </p>
          <p v-if="!aiConfigured" class="err">
            Falta configurar <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code> en el backend.
          </p>
          <p v-if="aiError" class="err">{{ aiError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="aiPromptOpen = false">Cancelar</button>
          <button class="btn-primary" :disabled="aiLoading || !aiCreatePrompt.trim()">
            {{ aiLoading ? `Generando con ${aiProviderLabel}…` : 'Generar borrador' }}
          </button>
        </footer>
      </form>
    </div>

    <!-- Flujo aparte: noticia desde la web (no altera IA ni alta manual) -->
    <WebNewsWizard
      v-if="webNewsOpen"
      :tenant-name="auth.tenant?.nombre || 'tu comunidad'"
      @close="webNewsOpen = false"
      @draft="applyWebNewsDraft"
    />

    <MediaUrlPickerModal
      v-if="mediaPickerOpen"
      :kind="mediaPickerKind"
      :initial-query="mediaPickerInitialQuery"
      @close="mediaPickerOpen = false"
      @select="applyMediaPickerSelection"
    />

    <!-- Modal solo preview (click en card) -->
    <div v-if="viewer" class="sheet" @click.self="viewer = null">
      <div class="viewer-panel">
        <header class="sheet-head">
          <div>
            <h2>Vista previa</h2>
            <p>Misma tarjeta, tipografía y chrome que ve el miembro en el celular.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="viewer = null">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="viewer-body">
          <MobileFeedPreview :post="viewer" :truncate="false" label="Vista previa en la app" />
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" @click="viewer = null">Cerrar</button>
          <button type="button" class="btn-primary" @click="editFromViewer">Editar</button>
        </footer>
      </div>
    </div>

    <!-- Confirmación de borrado lógico (archivar) -->
    <div v-if="pendingArchive" class="sheet confirm-sheet" @click.self="pendingArchive = null">
      <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header class="sheet-head">
          <div>
            <h2 id="archive-title">¿Borrar esta publicación?</h2>
            <p>
              Se archiva de forma lógica: deja de verse en el muro, pero podés recuperarla desde el filtro
              <strong>Archivadas</strong> o pasarla a borrador.
            </p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="pendingArchive = null">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="confirm-body">
          <p class="confirm-title">«{{ pendingArchive.titulo }}»</p>
          <p v-if="archiveError" class="err">{{ archiveError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" :disabled="archiving" @click="pendingArchive = null">Cancelar</button>
          <button type="button" class="btn-danger" :disabled="archiving" @click="confirmArchive">
            {{ archiving ? 'Archivando…' : 'Sí, archivar' }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="pendingReject" class="sheet confirm-sheet" @click.self="pendingReject = null">
      <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="reject-title">
        <header class="sheet-head">
          <div>
            <h2 id="reject-title">¿Rechazar esta publicación?</h2>
            <p>El miembro verá el estado rechazado y el motivo (opcional).</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="pendingReject = null">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="confirm-body">
          <p class="confirm-title">«{{ pendingReject.titulo }}»</p>
          <label class="label-text" for="rejectReason">Motivo del rechazo (obligatorio)</label>
          <textarea
            id="rejectReason"
            v-model="rejectReason"
            class="input"
            rows="3"
            maxlength="500"
            required
            placeholder="Ej. Falta una imagen, tono agresivo, o no corresponde al muro corporativo…"
          />
          <p class="hint">El autor recibirá este motivo por email, push y en la app (Mis envíos).</p>
          <p v-if="rejectError" class="err">{{ rejectError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" :disabled="rejecting" @click="pendingReject = null">Cancelar</button>
          <button type="button" class="btn-danger" :disabled="rejecting || !rejectReason.trim()" @click="confirmReject">
            {{ rejecting ? 'Rechazando…' : 'Rechazar y notificar' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Cambiar estado desde el badge -->
    <div v-if="statusChangePost" class="sheet confirm-sheet" @click.self="closeStatusChange">
      <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="status-change-title">
        <header class="sheet-head">
          <div>
            <h2 id="status-change-title">Cambiar estado</h2>
            <p>Elegí el nuevo estado de la publicación.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeStatusChange">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="confirm-body">
          <p class="confirm-title">«{{ statusChangePost.titulo }}»</p>
          <p class="hint" style="margin-bottom: 10px">
            Actual:
            <span class="status-badge inline" :data-status="statusChangePost.status">{{ statusLabel(statusChangePost.status) }}</span>
          </p>
          <div class="status-change-grid" role="radiogroup" aria-label="Nuevo estado">
            <button
              v-for="opt in statusOptions"
              :key="opt.id"
              type="button"
              class="status-option"
              :class="{ on: statusChangeTarget === opt.id }"
              :data-status="opt.id"
              role="radio"
              :aria-checked="statusChangeTarget === opt.id"
              @click="statusChangeTarget = opt.id"
            >
              <span class="status-badge inline" :data-status="opt.id">{{ opt.label }}</span>
              <small>{{ opt.hint }}</small>
            </button>
          </div>
          <div v-if="statusChangeNeedsReason" class="status-reason">
            <label class="label-text" for="statusChangeReason">Motivo del rechazo (obligatorio)</label>
            <textarea
              id="statusChangeReason"
              v-model="statusChangeReason"
              class="input"
              rows="3"
              maxlength="500"
              required
              placeholder="Se notificará al autor si la publicación está en revisión…"
            />
          </div>
          <p v-if="statusChangeError" class="err">{{ statusChangeError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" :disabled="statusChanging" @click="closeStatusChange">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="statusChanging || !statusChangeCanApply"
            @click="confirmStatusChange"
          >
            {{ statusChanging ? 'Guardando…' : 'Aplicar estado' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Cambiar tipo (grilla) -->
    <div v-if="tipoChangePost" class="sheet confirm-sheet" @click.self="closeTipoChange">
      <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="tipo-change-title">
        <header class="sheet-head">
          <div>
            <h2 id="tipo-change-title">Cambiar tipo</h2>
            <p>Elegí el tipo de la publicación.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeTipoChange">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="confirm-body">
          <p class="confirm-title">«{{ tipoChangePost.titulo }}»</p>
          <p class="hint" style="margin-bottom: 10px">
            Actual:
            <span class="meta-badge" :data-tipo="tipoChangePost.tipo">{{ tipoLabel(tipoChangePost.tipo) }}</span>
          </p>
          <div class="status-change-grid" role="radiogroup" aria-label="Nuevo tipo">
            <button
              v-for="t in tipos"
              :key="t.id"
              type="button"
              class="status-option"
              :class="{ on: tipoChangeTarget === t.id }"
              role="radio"
              :aria-checked="tipoChangeTarget === t.id"
              @click="tipoChangeTarget = t.id"
            >
              <span class="meta-badge" :data-tipo="t.id">{{ t.label }}</span>
              <small>{{ t.hint }}</small>
            </button>
          </div>
          <p v-if="tipoChangeError" class="err">{{ tipoChangeError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" :disabled="tipoChanging" @click="closeTipoChange">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="tipoChanging || !tipoChangeTarget || tipoChangeTarget === tipoChangePost.tipo"
            @click="confirmTipoChange"
          >
            {{ tipoChanging ? 'Guardando…' : 'Aplicar tipo' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Cambiar formato / layout (grilla) -->
    <div v-if="layoutChangePost" class="sheet confirm-sheet" @click.self="closeLayoutChange">
      <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="layout-change-title">
        <header class="sheet-head">
          <div>
            <h2 id="layout-change-title">Cambiar formato</h2>
            <p>Elegí cómo se muestra la tarjeta en el muro.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" aria-label="Cerrar" @click="closeLayoutChange">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="confirm-body">
          <p class="confirm-title">«{{ layoutChangePost.titulo }}»</p>
          <p class="hint" style="margin-bottom: 10px">
            Actual:
            <span class="meta-badge" :data-layout="layoutChangePost.layout || 'vertical'">{{ layoutLabel(layoutChangePost.layout) }}</span>
          </p>
          <div class="status-change-grid" role="radiogroup" aria-label="Nuevo formato">
            <button
              v-for="l in layouts"
              :key="l.id"
              type="button"
              class="status-option"
              :class="{ on: layoutChangeTarget === l.id }"
              role="radio"
              :aria-checked="layoutChangeTarget === l.id"
              @click="layoutChangeTarget = l.id"
            >
              <span class="meta-badge" :data-layout="l.id">{{ l.label }}</span>
              <small>{{ l.hint }}</small>
            </button>
          </div>
          <p v-if="layoutChangeError" class="err">{{ layoutChangeError }}</p>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn-ghost" :disabled="layoutChanging" @click="closeLayoutChange">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="layoutChanging || !layoutChangeTarget || layoutChangeTarget === (layoutChangePost.layout || 'vertical')"
            @click="confirmLayoutChange"
          >
            {{ layoutChanging ? 'Guardando…' : 'Aplicar formato' }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="nlOpen && nlDraft" class="sheet confirm-sheet" @click.self="closeNewsletter">
      <div class="confirm-panel nl-sheet" role="dialog" aria-modal="true" aria-labelledby="nl-title">
        <header class="sheet-head">
          <div>
            <p class="nl-kicker">Borrador en revisión</p>
            <h2 id="nl-title">Moderar antes de enviar</h2>
          </div>
          <button type="button" class="icon-btn" aria-label="Cerrar" @click="closeNewsletter">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div class="confirm-body nl-body">
          <p class="nl-mod-banner">
            Estado: <strong>{{ nlStatusLabel(nlDraft.status) }}</strong>.
            El envío solo es posible después de <strong>aprobar</strong>. Todo queda en el historial de auditoría.
          </p>

          <section class="nl-section">
            <h3>Publicaciones incluidas</h3>
            <ul class="nl-posts">
              <li v-for="p in nlDraft.posts" :key="p.postId">
                <span class="nl-tipo">{{ tipoLabel(p.tipo) }}</span>
                <strong>{{ p.titulo }}</strong>
              </li>
            </ul>
          </section>

          <section class="nl-section">
            <div class="field">
              <span class="label-text">Asunto del email</span>
              <input
                v-model="nlSubject"
                class="input"
                type="text"
                maxlength="200"
                :disabled="!nlCanEdit"
                placeholder="Novedades de la comunidad…"
              />
            </div>
          </section>

          <section class="nl-stats">
            <button type="button" class="nl-stat clickable" title="Ver destinatarios con email" @click="openNlRecipients('email')">
              <strong>{{ nlEmailableCount }}</strong>
              <span>con email</span>
              <em class="nl-stat-cta">Ver mails →</em>
            </button>
            <button type="button" class="nl-stat clickable" title="Ver audiencia completa" @click="openNlRecipients('all')">
              <strong>{{ nlAudienceCount }}</strong>
              <span>en audiencia</span>
              <em class="nl-stat-cta">Ver listado →</em>
            </button>
            <div class="nl-stat">
              <strong>{{ nlDraft.totals?.variants || 0 }}</strong>
              <span>versiones</span>
            </div>
          </section>
          <p v-if="nlExcludedCount" class="nl-excluded-hint">
            {{ nlExcludedCount }} persona{{ nlExcludedCount === 1 ? '' : 's' }} desmarcada{{ nlExcludedCount === 1 ? '' : 's' }} — no recibirán el envío.
          </p>

          <section v-if="nlDraft.id" class="nl-section nl-dest-section">
            <div class="nl-dest-head">
              <h3>Destinatarios</h3>
              <button type="button" class="btn-primary sm" :disabled="nlBusy" @click="openNlRecipients('email')">
                Ver mails y audiencia
              </button>
            </div>
            <p class="nl-dest-hint">
              Tocá el botón o los números de arriba para ver cada mail, área y grupos.
              Podés desmarcar gente o agregar un email externo.
            </p>
            <form v-if="nlCanEdit" class="nl-add-email" @submit.prevent="addNlExternalEmail">
              <input
                v-model="nlAddEmail"
                class="input"
                type="email"
                required
                placeholder="Agregar email (cualquiera)…"
              />
              <input
                v-model="nlAddNombre"
                class="input"
                type="text"
                maxlength="120"
                placeholder="Nombre (opcional)"
              />
              <button type="submit" class="btn-primary sm" :disabled="nlBusy || !nlAddEmail.trim()">
                {{ nlBusy && nlAction === 'add-email' ? 'Agregando…' : 'Agregar' }}
              </button>
            </form>
            <ul v-if="nlRecipientsPreview.length" class="nl-rec-preview">
              <li v-for="r in nlRecipientsPreview" :key="(r.userId || r.email) + r.fingerprint">
                <strong>{{ r.nombre || 'Sin nombre' }}</strong>
                <span>{{ r.email || 'Sin email' }}</span>
                <span v-if="r.isExternal" class="nl-ext-tag">Externo</span>
              </li>
              <li
                v-if="nlEmailableCount > nlRecipientsPreview.length"
                class="nl-rec-more"
                role="button"
                tabindex="0"
                @click="openNlRecipients('email')"
                @keydown.enter="openNlRecipients('email')"
              >
                +{{ nlEmailableCount - nlRecipientsPreview.length }} más — abrí el listado completo
              </li>
            </ul>
          </section>

          <section class="nl-section">
            <h3>Resúmenes por versión (editables)</h3>
            <div v-for="(v, i) in nlVariants" :key="v.fingerprint" class="nl-variant">
              <p class="nl-sample-meta">
                Versión {{ i + 1 }} · {{ v.emailableCount }} email · {{ v.postIds?.length || 0 }} pubs
                <span v-if="v.summaryAi"> · IA</span>
              </p>
              <textarea
                v-model="v.summary"
                class="input"
                rows="3"
                maxlength="2000"
                :disabled="!nlCanEdit"
              />
            </div>
          </section>

          <p v-if="nlError" class="err">{{ nlError }}</p>
          <p v-if="nlResultMsg" class="nl-ok">{{ nlResultMsg }}</p>
          <p v-if="nlLoading" class="nl-loading">{{ nlLoadingLabel }}</p>
        </div>

        <footer class="sheet-foot nl-foot">
          <RouterLink v-if="nlDraft.id" class="btn-ghost" :to="`/newsletters?id=${nlDraft.id}`">Ver en historial</RouterLink>
          <div class="nl-foot-right">
            <button type="button" class="btn-ghost" :disabled="nlBusy" @click="closeNewsletter">Cerrar</button>
            <button
              v-if="nlCanEdit && nlDraft.id"
              type="button"
              class="btn-ghost"
              :disabled="nlBusy"
              @click="saveNlDraft"
            >
              Guardar
            </button>
            <button
              v-if="nlDraft.status === 'pending_review' && nlDraft.id"
              type="button"
              class="btn-ghost"
              style="color:#b91c1c"
              :disabled="nlBusy"
              @click="rejectNlDraft"
            >
              Rechazar
            </button>
            <button
              v-if="nlDraft.status === 'pending_review' && nlDraft.id"
              type="button"
              class="btn-primary"
              :disabled="nlBusy"
              @click="approveNlDraft"
            >
              {{ nlBusy && nlAction === 'approve' ? 'Aprobando…' : 'Aprobar' }}
            </button>
            <button
              v-if="nlDraft.status === 'approved' && nlDraft.id"
              type="button"
              class="btn-primary"
              :disabled="nlBusy || !nlMailConfigured || !nlEmailableCount"
              @click="sendNlDraft"
            >
              {{ nlBusy && nlAction === 'send' ? 'Enviando…' : `Enviar a ${nlEmailableCount}` }}
            </button>
          </div>
        </footer>
      </div>
    </div>

    <div
      v-if="nlRecipientsOpen"
      class="sheet confirm-sheet nl-recipients-overlay"
      @click.self="nlRecipientsOpen = false"
    >
      <div class="confirm-panel nl-recipients-panel" role="dialog" aria-modal="true" aria-labelledby="nl-rec-title">
        <header class="sheet-head">
          <div>
            <p class="nl-kicker">Destinatarios</p>
            <h2 id="nl-rec-title">{{ nlRecipientsMode === 'email' ? 'Con email' : 'Audiencia completa' }}</h2>
            <p>
              {{ nlRecipientsFiltered.length }} persona{{ nlRecipientsFiltered.length === 1 ? '' : 's' }}
              · desmarcá a quien no deba recibir el boletín
            </p>
          </div>
          <button type="button" class="icon-btn" aria-label="Cerrar" @click="nlRecipientsOpen = false">×</button>
        </header>
        <div class="confirm-body nl-recipients-body">
          <div class="nl-rec-toolbar">
            <input
              v-model="nlRecipientsQ"
              class="input"
              type="search"
              placeholder="Buscar nombre, email, área o grupo…"
            />
            <button
              v-if="nlCanEdit"
              type="button"
              class="btn-ghost sm"
              :disabled="nlBusy"
              @click="setAllNlRecipientsIncluded(true)"
            >
              Marcar todos
            </button>
            <button
              v-if="nlCanEdit"
              type="button"
              class="btn-ghost sm"
              :disabled="nlBusy"
              @click="setAllNlRecipientsIncluded(false)"
            >
              Desmarcar todos
            </button>
          </div>
          <form v-if="nlCanEdit" class="nl-add-email" @submit.prevent="addNlExternalEmail">
            <input
              v-model="nlAddEmail"
              class="input"
              type="email"
              required
              placeholder="Agregar email (cualquiera)…"
            />
            <input
              v-model="nlAddNombre"
              class="input"
              type="text"
              maxlength="120"
              placeholder="Nombre (opcional)"
            />
            <button type="submit" class="btn-primary sm" :disabled="nlBusy || !nlAddEmail.trim()">
              {{ nlBusy && nlAction === 'add-email' ? 'Agregando…' : 'Agregar' }}
            </button>
          </form>
          <div class="nl-rec-list">
            <label
              v-for="r in nlRecipientsFiltered"
              :key="(r.userId || r.email) + '-' + r.fingerprint"
              class="nl-rec-row"
              :class="{ off: r.included === false, noemail: !r.canEmail, external: r.isExternal }"
            >
              <input
                type="checkbox"
                :checked="r.included !== false"
                :disabled="!nlCanEdit || nlBusy || (nlRecipientsMode === 'email' && !r.canEmail)"
                @change="toggleNlRecipient(r, $event.target.checked)"
              />
              <span class="nl-rec-main">
                <strong>
                  {{ r.nombre || 'Sin nombre' }}
                  <span v-if="r.isExternal" class="nl-ext-tag">Externo</span>
                </strong>
                <span class="nl-rec-email">{{ r.email || 'Sin email' }}</span>
                <span class="nl-rec-meta">
                  <template v-if="r.isExternal">Destinatario manual · recibe todas las pubs</template>
                  <template v-else-if="r.areaNombre">Área: {{ r.areaNombre }}</template>
                  <template v-else>Sin área</template>
                  <template v-if="!r.isExternal && (r.groupNombres || []).length">
                    · Grupos: {{ r.groupNombres.join(', ') }}
                  </template>
                  <template v-if="!r.canEmail"> · no recibe mail</template>
                </span>
              </span>
              <button
                v-if="nlCanEdit && r.isExternal"
                type="button"
                class="link-btn danger"
                :disabled="nlBusy"
                title="Quitar destinatario externo"
                @click.prevent="removeNlExternalEmail(r)"
              >
                Quitar
              </button>
            </label>
            <p v-if="!nlRecipientsFiltered.length" class="empty">Nadie en este filtro.</p>
          </div>
          <p v-if="nlRecipientsError" class="err">{{ nlRecipientsError }}</p>
        </div>
        <footer class="sheet-foot">
          <span class="nl-rec-foot-stats">
            Incluidos con email: <strong>{{ nlEmailableCount }}</strong>
            / audiencia {{ nlAudienceCount }}
          </span>
          <button type="button" class="btn-primary" @click="nlRecipientsOpen = false">Listo</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import MobileFeedPreview from '../components/MobileFeedPreview.vue'
import PostMedia from '../components/PostMedia.vue'
import PostMediaCarousel from '../components/PostMediaCarousel.vue'
import ScreenHelp from '../components/ScreenHelp.vue'
import WebNewsWizard from '../components/WebNewsWizard.vue'
import MediaUrlPickerModal from '../components/MediaUrlPickerModal.vue'
import { mediaKind, mediaKindLabel, resolveMediaUrl, isPostCarousel } from '../utils/media'
import {
  POST_SHOW_KEYS,
  DEFAULT_SHOW,
  emptyDisplayOverrides,
  setShowOverride,
} from '../utils/postsConfig'

const auth = useAuthStore()

const statusFilters = [
  { value: '', label: 'Activas' },
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'published', label: 'En el muro' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'archived', label: 'Archivadas' },
]

const riskFilters = [
  { value: '', label: 'Cualquier riesgo IA' },
  { value: 'high', label: 'Alto' },
  { value: 'medium', label: 'Medio' },
  { value: 'low', label: 'Bajo' },
]

const tipoFilters = [
  { value: '', label: 'Todo tipo' },
  { value: 'noticia', label: 'Noticia' },
  { value: 'aviso', label: 'Aviso' },
  { value: 'beneficio', label: 'Beneficio' },
  { value: 'evento', label: 'Evento' },
  { value: 'celebracion', label: 'Celebración' },
  { value: 'general', label: 'General' },
]

const pinnedFilters = [
  { value: '', label: 'Fijado: cualquiera' },
  { value: 'true', label: 'Solo fijadas' },
  { value: 'false', label: 'Sin fijar' },
]

const gridColumns = [
  { key: 'titulo', label: 'Título', cell: 'titulo' },
  { key: 'tipo', label: 'Tipo', cell: 'tipo' },
  { key: 'status', label: 'Estado', cell: 'estado' },
  { key: 'layout', label: 'Formato', cell: 'formato' },
  { key: 'priority', label: 'Prioridad', cell: 'prioridad' },
  { key: 'publishedAt', label: 'Publicada', cell: 'fecha' },
  { key: 'scheduledAt', label: 'Programada', cell: 'fecha' },
  { key: 'updatedAt', label: 'Actualizada', cell: 'fecha' },
]

const tipos = [
  { id: 'noticia', label: 'Noticia', hint: 'Feed estilo Instagram' },
  { id: 'aviso', label: 'Aviso', hint: 'Urgente o importante' },
  { id: 'beneficio', label: 'Beneficio', hint: 'Convenio o perk' },
  { id: 'evento', label: 'Evento', hint: 'Fecha o convocatoria' },
  { id: 'celebracion', label: 'Celebración', hint: 'Cumpleaños / aniversarios (§5)' },
  { id: 'general', label: 'General', hint: 'Feed estilo Instagram' },
]

const mediaTypes = [
  { id: 'image', label: 'Imagen', hint: 'jpg, png, webp…' },
  { id: 'video', label: 'Video', hint: 'mp4, webm, mov…' },
  { id: 'youtube', label: 'YouTube', hint: 'Link del video' },
  { id: 'carousel', label: 'Carrusel', hint: 'Varias fotos' },
]

const mediaType = ref('image')
/** Evita que el watch de URL pise una selección manual (p. ej. Imagen → Video). */
let mediaTypeSyncPaused = false
const carouselFileInput = ref(null)
const carouselDragOver = ref(false)
const carouselUploading = ref(false)
const carouselUploadError = ref('')
const carouselUrlDraft = ref('')
const imageFileInput = ref(null)
const imageDragOver = ref(false)
const imageUploading = ref(false)
const imageUploadError = ref('')
const mediaPickerOpen = ref(false)
const mediaPickerKind = ref('youtube')

const mediaPickerInitialQuery = computed(() => {
  const t = String(draft.value?.titulo || '').trim()
  return t.length >= 2 ? t.slice(0, 80) : ''
})

function openMediaPicker(kind) {
  mediaPickerKind.value = kind === 'audio' ? 'audio' : 'youtube'
  mediaPickerOpen.value = true
}

function applyMediaPickerSelection(payload) {
  if (!draft.value || !payload?.url) return
  if (payload.kind === 'audio') {
    draft.value.audioUrl = payload.url
  } else {
    draft.value.imageUrl = payload.url
    draft.value.imageUrls = []
    mediaType.value = 'youtube'
  }
  mediaPickerOpen.value = false
}

const mediaPlaceholder = computed(() => {
  if (mediaType.value === 'video') return 'https://…/video.mp4 o /uploads/…'
  if (mediaType.value === 'youtube') return 'https://www.youtube.com/watch?v=… o https://youtu.be/…'
  return 'https://…/foto.jpg o /uploads/…'
})

const detectedMediaLabel = computed(() => mediaKindLabel(draft.value?.imageUrl || ''))

function thumbMediaLabel(p) {
  if (isPostCarousel(p)) return 'Carrusel'
  return mediaKindLabel(p?.imageUrl) || ''
}

function syncCarouselPrimary() {
  if (!draft.value) return
  const urls = Array.isArray(draft.value.imageUrls) ? draft.value.imageUrls.filter(Boolean) : []
  draft.value.imageUrls = urls
  if (mediaType.value === 'carousel') {
    draft.value.imageUrl = urls[0] || ''
  }
}

function setMediaType(id) {
  mediaType.value = id
  if (!draft.value) return
  mediaTypeSyncPaused = true
  try {
    if (id === 'carousel') {
      const urls = Array.isArray(draft.value.imageUrls) ? [...draft.value.imageUrls] : []
      if (!urls.length && draft.value.imageUrl && mediaKind(draft.value.imageUrl) === 'image') {
        urls.push(draft.value.imageUrl)
      }
      draft.value.imageUrls = urls
      syncCarouselPrimary()
    } else if (draft.value.imageUrls?.length) {
      draft.value.imageUrls = []
    }
  } finally {
    queueMicrotask(() => {
      mediaTypeSyncPaused = false
    })
  }
}

function syncMediaTypeFromUrl(url, imageUrls) {
  if (Array.isArray(imageUrls) && imageUrls.filter(Boolean).length >= 2) {
    mediaType.value = 'carousel'
    return
  }
  const k = mediaKind(url)
  if (!k) return
  if (k === 'embed') mediaType.value = 'youtube'
  else if (k === 'video') mediaType.value = 'video'
  else mediaType.value = 'image'
}

async function uploadCarouselFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f && /^image\//i.test(f.type))
  if (!files.length) {
    carouselUploadError.value = 'Elegí archivos de imagen'
    return
  }
  carouselUploadError.value = ''
  carouselUploading.value = true
  try {
    const fd = new FormData()
    for (const f of files.slice(0, 12)) fd.append('files', f)
    const { data } = await api.post('/admin/posts/upload', fd)
    const urls = Array.isArray(data.urls) ? data.urls : []
    if (!draft.value.imageUrls) draft.value.imageUrls = []
    draft.value.imageUrls = [...draft.value.imageUrls, ...urls]
    syncCarouselPrimary()
  } catch (e) {
    carouselUploadError.value = e.response?.data?.error || e.message || 'No se pudieron subir'
  } finally {
    carouselUploading.value = false
    carouselDragOver.value = false
  }
}

async function uploadSingleImage(fileList) {
  const file = Array.from(fileList || []).find((f) => f && /^image\//i.test(f.type))
  if (!file) {
    imageUploadError.value = 'Elegí un archivo de imagen (jpg, png, webp o gif)'
    return
  }
  imageUploadError.value = ''
  imageUploading.value = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/posts/upload', fd)
    const url = data.url || (Array.isArray(data.urls) ? data.urls[0] : '')
    if (!url) throw new Error('No se recibió URL de la imagen')
    draft.value.imageUrl = url
    draft.value.imageUrls = []
  } catch (e) {
    imageUploadError.value = e.response?.data?.error || e.message || 'No se pudo subir la imagen'
  } finally {
    imageUploading.value = false
    imageDragOver.value = false
  }
}

function onImageDrop(e) {
  imageDragOver.value = false
  uploadSingleImage(e.dataTransfer?.files)
}

function onImageFileSelected(e) {
  const input = e.target
  uploadSingleImage(input?.files)
  if (input) input.value = ''
}

function clearImageMedia() {
  if (!draft.value) return
  draft.value.imageUrl = ''
  draft.value.imageUrls = []
  imageUploadError.value = ''
}

function onCarouselDrop(e) {
  carouselDragOver.value = false
  uploadCarouselFiles(e.dataTransfer?.files)
}

function onCarouselFilesSelected(e) {
  const input = e.target
  uploadCarouselFiles(input?.files)
  if (input) input.value = ''
}

function removeCarouselItem(i) {
  if (!draft.value?.imageUrls) return
  draft.value.imageUrls.splice(i, 1)
  syncCarouselPrimary()
}

function moveCarouselItem(i, dir) {
  const urls = draft.value?.imageUrls
  if (!urls) return
  const j = i + dir
  if (j < 0 || j >= urls.length) return
  const tmp = urls[i]
  urls[i] = urls[j]
  urls[j] = tmp
  syncCarouselPrimary()
}

function addCarouselUrl() {
  const u = carouselUrlDraft.value.trim()
  if (!u || !draft.value) return
  if (!draft.value.imageUrls) draft.value.imageUrls = []
  if (!draft.value.imageUrls.includes(u)) draft.value.imageUrls.push(u)
  carouselUrlDraft.value = ''
  syncCarouselPrimary()
}

const layouts = [
  { id: 'vertical', label: 'Vertical', hint: 'Imagen arriba (feed)' },
  { id: 'horizontal', label: 'Horizontal', hint: 'Media al costado' },
  { id: 'banner', label: 'Banner', hint: 'Franja ancha' },
]

const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(Number(localStorage.getItem('cx.pubs.pageSize')) || 20)
const orgAreas = ref([])
const orgGroups = ref([])
const postsConfig = ref({ byTipo: {} })
const showKeys = POST_SHOW_KEYS
const typeConfigOpen = ref(false)
const typeConfigDraft = ref(null)
const typeConfigSaving = ref(false)
const typeConfigError = ref('')
const configTipo = ref('noticia')
const filter = ref('')
const tipoFilter = ref('')
const pinnedFilter = ref('')
const q = ref('')
const viewMode = ref(localStorage.getItem('cx.pubs.view') || 'list')

function setViewMode(mode) {
  if (!['list', 'grid', 'calendar'].includes(mode)) return
  if (viewMode.value === mode) return
  viewMode.value = mode
}
const sortBy = ref('updatedAt')
const sortDir = ref('desc')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const rangeFrom = computed(() => (total.value ? (page.value - 1) * pageSize.value + 1 : 0))
const rangeTo = computed(() => Math.min(total.value, page.value * pageSize.value))

const nowCal = new Date()
const calendarCursor = ref({ year: nowCal.getFullYear(), month: nowCal.getMonth() })
const calendarDayOpen = ref(null)
const calendarWeekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function postCalendarDate(p) {
  const raw = p?.scheduledAt || p?.publishedAt || p?.createdAt || p?.updatedAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const postsByDay = computed(() => {
  const map = new Map()
  for (const p of items.value) {
    const d = postCalendarDate(p)
    if (!d) continue
    const key = dateKey(d)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  }
  return map
})

const calendarMonthLabel = computed(() => {
  const d = new Date(calendarCursor.value.year, calendarCursor.value.month, 1)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
})

const calendarCells = computed(() => {
  const { year, month } = calendarCursor.value
  const first = new Date(year, month, 1)
  // Monday-first: JS getDay() Sun=0 → Mon=0
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const today = new Date()
  const todayKey = dateKey(today)
  const cells = []

  for (let i = 0; i < startPad; i++) {
    const day = prevDays - startPad + i + 1
    const d = new Date(year, month - 1, day)
    cells.push({
      day,
      inMonth: false,
      isToday: false,
      key: dateKey(d),
      posts: postsByDay.value.get(dateKey(d)) || [],
      date: d,
    })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const key = dateKey(d)
    cells.push({
      day,
      inMonth: true,
      isToday: key === todayKey,
      key,
      posts: postsByDay.value.get(key) || [],
      date: d,
    })
  }
  while (cells.length % 7 !== 0) {
    const day = cells.length - (startPad + daysInMonth) + 1
    const d = new Date(year, month + 1, day)
    cells.push({
      day,
      inMonth: false,
      isToday: false,
      key: dateKey(d),
      posts: postsByDay.value.get(dateKey(d)) || [],
      date: d,
    })
  }
  return cells
})

const calendarMonthHasPosts = computed(() =>
  calendarCells.value.some((c) => c.inMonth && c.posts.length),
)

const calendarMonthPostCount = computed(() => {
  let n = 0
  for (const c of calendarCells.value) {
    if (c.inMonth) n += c.posts.length
  }
  return n
})

function shiftCalendarMonth(delta) {
  const d = new Date(calendarCursor.value.year, calendarCursor.value.month + delta, 1)
  calendarCursor.value = { year: d.getFullYear(), month: d.getMonth() }
  if (viewMode.value === 'calendar') load()
}

function goCalendarToday() {
  const t = new Date()
  calendarCursor.value = { year: t.getFullYear(), month: t.getMonth() }
  if (viewMode.value === 'calendar') load()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function todayLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const minScheduleDate = computed(() => todayLocalDate())

function composeScheduledLocal(dateStr, timeStr) {
  let date = String(dateStr || '').trim()
  let time = String(timeStr || '').trim()
  if (!date && !time) return ''
  if (!date) {
    date = todayLocalDate()
    const [hh, mm] = (time || '09:00').split(':').map(Number)
    const candidate = new Date()
    candidate.setHours(hh || 0, mm || 0, 0, 0)
    if (candidate.getTime() <= Date.now() + 30_000) {
      const t = new Date()
      t.setDate(t.getDate() + 1)
      date = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
    }
  }
  if (!time) time = '09:00'
  return `${date}T${time}`
}

function toLocalInput(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const pinPresets = [
  { id: '1h', label: '1 h' },
  { id: '8h', label: '8 h' },
  { id: '1d', label: '1 día' },
  { id: '3d', label: '3 días' },
  { id: '7d', label: '7 días' },
  { id: '', label: 'Sin límite' },
]
const sectionSuggestions = ['deporte', 'internacional', 'moda', 'cultura', 'empresa', 'beneficio', 'aviso']

function applyPinPreset(id) {
  if (!draft.value) return
  draft.value.pinned = true
  draft.value.pinnedPreset = id
  if (!id) {
    draft.value.pinnedUntilLocal = ''
    return
  }
  const ms = { '1h': 3600e3, '8h': 8 * 3600e3, '1d': 864e5, '3d': 3 * 864e5, '7d': 7 * 864e5 }[id]
  if (!ms) return
  draft.value.pinnedUntilLocal = toLocalInput(new Date(Date.now() + ms))
}

const scheduleDate = computed({
  get() {
    return draft.value?.scheduledLocal?.slice(0, 10) || ''
  },
  set(v) {
    if (!draft.value) return
    draft.value.publishWhen = 'scheduled'
    draft.value.scheduledLocal = composeScheduledLocal(
      v,
      draft.value.scheduledLocal?.slice(11, 16) || scheduleTime.value || '09:00',
    )
  },
})

const scheduleTime = computed({
  get() {
    return draft.value?.scheduledLocal?.slice(11, 16) || ''
  },
  set(v) {
    if (!draft.value) return
    draft.value.publishWhen = 'scheduled'
    draft.value.scheduledLocal = composeScheduledLocal(scheduleDate.value || todayLocalDate(), v)
  },
})

const scheduleSummary = computed(() => {
  if (!draft.value?.scheduledLocal) return ''
  const d = new Date(draft.value.scheduledLocal)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const scheduleConflicts = ref({
  checked: false,
  count: 0,
  nearCount: 0,
  items: [],
})
const scheduleConflictsLoading = ref(false)
let scheduleConflictsTimer = null
let scheduleConflictsReq = 0

function resetScheduleConflicts() {
  scheduleConflicts.value = { checked: false, count: 0, nearCount: 0, items: [] }
}

function formatDeltaMinutes(delta) {
  if (delta == null || Number.isNaN(Number(delta))) return ''
  const n = Math.round(Number(delta))
  if (n === 0) return 'misma hora'
  const abs = Math.abs(n)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const parts = []
  if (h) parts.push(`${h} h`)
  if (m) parts.push(`${m} min`)
  const label = parts.join(' ') || '0 min'
  return n < 0 ? `${label} antes` : `${label} después`
}

async function checkScheduleConflicts() {
  const local = draft.value?.scheduledLocal
  const whenScheduled = draft.value?.publishWhen === 'scheduled'
  if (!whenScheduled || !local) {
    resetScheduleConflicts()
    scheduleConflictsLoading.value = false
    return
  }
  const at = new Date(local)
  if (Number.isNaN(at.getTime())) {
    resetScheduleConflicts()
    return
  }
  const reqId = ++scheduleConflictsReq
  scheduleConflictsLoading.value = true
  try {
    const params = { at: at.toISOString(), windowMinutes: 120 }
    if (draft.value?.id) params.excludeId = draft.value.id
    const { data } = await api.get('/admin/posts/schedule-conflicts', { params })
    if (reqId !== scheduleConflictsReq) return
    scheduleConflicts.value = {
      checked: true,
      count: data.count || 0,
      nearCount: data.nearCount || 0,
      items: Array.isArray(data.items) ? data.items : [],
    }
  } catch {
    if (reqId !== scheduleConflictsReq) return
    resetScheduleConflicts()
  } finally {
    if (reqId === scheduleConflictsReq) scheduleConflictsLoading.value = false
  }
}

const editorStatusSelected = computed(() => {
  const s = draft.value?.status
  if (s === 'scheduled') return 'draft'
  return s || 'draft'
})

function setPublishWhen(when) {
  if (!draft.value) return
  if (when === 'scheduled') {
    draft.value.publishWhen = 'scheduled'
    if (!draft.value.scheduledLocal) applySchedulePreset('tomorrow9')
    return
  }
  draft.value.publishWhen = 'now'
}

function setDraftStatus(id) {
  if (!draft.value) return
  if (id === 'scheduled') {
    setPublishWhen('scheduled')
    return
  }
  draft.value.status = id
  if (id === 'published') {
    draft.value.publishWhen = 'now'
  }
}

function applySchedulePreset(kind) {
  if (!draft.value) return
  const d = new Date()
  if (kind === '1h') {
    d.setMinutes(d.getMinutes() + 60)
  } else if (kind === 'tomorrow9') {
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
  } else if (kind === 'tomorrow18') {
    d.setDate(d.getDate() + 1)
    d.setHours(18, 0, 0, 0)
  } else if (kind === 'monday9') {
    const day = d.getDay()
    const add = day === 1 ? 7 : (8 - day) % 7 || 7
    d.setDate(d.getDate() + add)
    d.setHours(9, 0, 0, 0)
  }
  draft.value.publishWhen = 'scheduled'
  draft.value.scheduledLocal = toLocalInput(d)
}

function calendarRangeDays(year, month) {
  // Incluye ~1 semana de padding (celdas del mes anterior/siguiente)
  const fromDate = new Date(year, month, 1 - 7)
  const toDate = new Date(year, month + 1, 7)
  return {
    from: `${fromDate.getFullYear()}-${pad2(fromDate.getMonth() + 1)}-${pad2(fromDate.getDate())}`,
    to: `${toDate.getFullYear()}-${pad2(toDate.getMonth() + 1)}-${pad2(toDate.getDate())}`,
  }
}

function shortTitle(t, max = 28) {
  const s = String(t || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trim()}…`
}

function calendarThumb(p) {
  const url = p?.imageUrl || (Array.isArray(p?.imageUrls) ? p.imageUrls[0] : '')
  if (!url) return ''
  const kind = mediaKind(url)
  if (kind === 'video' || kind === 'embed') return ''
  return resolveMediaUrl(url)
}

function openCalendarDay(cell) {
  if (!cell?.posts?.length) return
  calendarDayOpen.value = {
    label: cell.date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    posts: cell.posts,
  }
}

const draft = ref(null)

watch(
  () => [draft.value?.publishWhen, draft.value?.scheduledLocal, draft.value?.id],
  () => {
    if (scheduleConflictsTimer) clearTimeout(scheduleConflictsTimer)
    if (draft.value?.publishWhen !== 'scheduled' || !draft.value?.scheduledLocal) {
      resetScheduleConflicts()
      scheduleConflictsLoading.value = false
      return
    }
    scheduleConflictsTimer = setTimeout(() => {
      checkScheduleConflicts()
    }, 350)
  },
)

const draftPreviewOpen = ref(false)
const editorSection = ref('contenido')
const editorSections = [
  { id: 'contenido', label: 'Contenido', hint: 'Título y mensaje' },
  { id: 'tipo', label: 'Tipo', hint: 'Noticia, aviso…' },
  { id: 'media', label: 'Media', hint: 'Imagen, video, audio' },
  { id: 'formato', label: 'Formato', hint: 'Layout de tarjeta' },
  { id: 'publicacion', label: 'Publicación', hint: 'Cuándo, estado y avisos' },
  { id: 'encuesta', label: 'Encuesta', hint: 'Embebida en el muro' },
  { id: 'audiencia', label: 'Audiencia', hint: 'Quién la ve' },
  { id: 'elementos', label: 'Elementos', hint: 'Qué mostrar' },
  { id: 'asistente', label: 'Asistente IA', hint: 'Mejorar con IA' },
]
const viewer = ref(null)
const pendingArchive = ref(null)
const archiving = ref(false)
const archiveError = ref('')
const pendingReject = ref(null)
const rejecting = ref(false)
const rejectReason = ref('')
const rejectError = ref('')
const statusChangePost = ref(null)
const statusChangeTarget = ref('')
const statusChangeReason = ref('')
const statusChangeError = ref('')
const statusChanging = ref(false)
const statusOptions = [
  { id: 'draft', label: 'Borrador', hint: 'No visible en el muro' },
  { id: 'pending_review', label: 'Pendiente', hint: 'Cola de moderación · si estaba publicada, sale del muro' },
  { id: 'scheduled', label: 'Programada', hint: 'Se publica sola en el día y hora elegidos' },
  { id: 'published', label: 'Publicada', hint: 'Visible en el muro ahora' },
  { id: 'rejected', label: 'Rechazada', hint: 'No publicada' },
  { id: 'archived', label: 'Archivada', hint: 'Borrado lógico' },
]
/** En el editor, la programación va aparte (Ahora / Programar), no como estado. */
const editorStatusOptions = computed(() =>
  statusOptions.filter((o) => o.id !== 'scheduled'),
)
const statusChangeNeedsReason = computed(() => {
  const p = statusChangePost.value
  if (!p || statusChangeTarget.value !== 'rejected') return false
  return p.status === 'pending_review' || p.origin === 'member'
})
const statusChangeCanApply = computed(() => {
  const p = statusChangePost.value
  if (!p || !statusChangeTarget.value) return false
  if (statusChangeTarget.value === p.status) return false
  if (statusChangeNeedsReason.value && !statusChangeReason.value.trim()) return false
  return true
})
const tipoChangePost = ref(null)
const tipoChangeTarget = ref('')
const tipoChangeError = ref('')
const tipoChanging = ref(false)
const layoutChangePost = ref(null)
const layoutChangeTarget = ref('')
const layoutChangeError = ref('')
const layoutChanging = ref(false)
const priorityEditId = ref(null)
const priorityEditValue = ref(0)
const prioritySavingId = ref(null)
const analyzingId = ref(null)
const unapprovingId = ref(null)
const pendingCount = ref(0)
const highRiskPending = ref(0)
const riskFilter = ref('')
const loading = ref(false)
const error = ref('')
const formError = ref('')
const saving = ref(false)

const aiPromptOpen = ref(false)
const aiCreatePrompt = ref('')
const aiRefinePrompt = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const aiNotes = ref('')
const aiHistory = ref([])
const aiWantImage = ref(true)
const aiWantCarousel = ref(false)
const aiConfigured = ref(true)
const aiProvider = ref('auto')
const aiProviders = ref({ openai: false, anthropic: false })
const aiLastProvider = ref('')
const aiLastModel = ref('')
const draftFromAi = ref(false)
const webNewsOpen = ref(false)
const newPostChooserOpen = ref(false)
const newsletterChooserOpen = ref(false)
const importOpen = ref(false)
const importBusy = ref(false)
const importMsg = ref('')

async function downloadImportTemplate() {
  try {
    const { data } = await api.get('/admin/posts/import/template', {
      params: { format: 'xlsx' },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-publicaciones.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    importMsg.value = e?.response?.data?.error || 'No se pudo descargar la plantilla'
  }
}

async function onImportFile(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  importBusy.value = true
  importMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/posts/import/commit', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importMsg.value = `Creadas ${data.created || 0}. Fallidas ${data.failed || 0}.`
    if (data.created) {
      await load()
    }
  } catch (e) {
    importMsg.value = e?.response?.data?.error || 'No se pudo importar'
  } finally {
    importBusy.value = false
  }
}
const templatesChooserOpen = ref(false)
const templates = ref([])
const templatesLoading = ref(false)
const templatesError = ref('')
const templatesLoaded = ref(false)
const router = useRouter()
const surveyOptions = ref([])
const linkedSurveyDetail = ref(null)
const linkedSurveyLoading = ref(false)
const linkedSurveyError = ref('')
let linkedSurveyLoadToken = 0

const selectMode = ref(false)
const selectedIds = ref([])
const nlOpen = ref(false)
const nlDraft = ref(null)
const nlSubject = ref('')
const nlVariants = ref([])
const nlLoading = ref(false)
const nlLoadingLabel = ref('')
const nlCreating = ref(false)
const nlBusy = ref(false)
const nlAction = ref('')
const nlError = ref('')
const nlResultMsg = ref('')
const nlMailConfigured = ref(true)
const nlRecipientsOpen = ref(false)
const nlRecipientsMode = ref('all') // 'all' | 'email'
const nlRecipientsQ = ref('')
const nlRecipientsError = ref('')
const nlAddEmail = ref('')
const nlAddNombre = ref('')

const selectedPosts = computed(() => {
  const set = new Set(selectedIds.value)
  return items.value.filter((p) => set.has(p.id))
})
const allVisibleSelected = computed(
  () => items.value.length > 0 && items.value.every((p) => selectedIds.value.includes(p.id)),
)
const someVisibleSelected = computed(() => items.value.some((p) => selectedIds.value.includes(p.id)))
const nlCanEdit = computed(() => ['pending_review', 'approved'].includes(nlDraft.value?.status))

const nlEmailableCount = computed(() => {
  const list = nlDraft.value?.recipients
  if (Array.isArray(list) && list.length) {
    return list.filter((r) => r.canEmail && r.included !== false).length
  }
  return nlDraft.value?.totals?.emailable || 0
})
const nlAudienceCount = computed(() => {
  const list = nlDraft.value?.recipients
  if (Array.isArray(list) && list.length) return list.length
  return nlDraft.value?.totals?.recipients || 0
})
const nlExcludedCount = computed(() => {
  const list = nlDraft.value?.recipients || []
  return list.filter((r) => r.included === false).length
})
const nlRecipientsFiltered = computed(() => {
  let list = [...(nlDraft.value?.recipients || [])]
  if (nlRecipientsMode.value === 'email') list = list.filter((r) => r.canEmail)
  const q = nlRecipientsQ.value.trim().toLowerCase()
  if (q) {
    list = list.filter((r) => {
      const hay = [
        r.nombre,
        r.email,
        r.areaNombre,
        ...(r.groupNombres || []),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }
  return list.sort((a, b) => {
    const ai = a.included === false ? 1 : 0
    const bi = b.included === false ? 1 : 0
    if (ai !== bi) return ai - bi
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
  })
})

const nlRecipientsPreview = computed(() => {
  const list = (nlDraft.value?.recipients || []).filter((r) => r.canEmail && r.included !== false)
  return list.slice(0, 5)
})

async function openNlRecipients(mode) {
  if (!nlDraft.value?.id) {
    nlError.value = 'Guardá o creá el borrador antes de ver destinatarios'
    return
  }
  nlRecipientsMode.value = mode === 'email' ? 'email' : 'all'
  nlRecipientsQ.value = ''
  nlRecipientsError.value = ''
  // Si no vinieron recipients en el draft, recargar detalle
  if (!Array.isArray(nlDraft.value.recipients) || !nlDraft.value.recipients.length) {
    try {
      const { data } = await api.get(`/admin/newsletters/${nlDraft.value.id}`)
      applyNlDraft(data.newsletter, data.mailConfigured)
    } catch (e) {
      nlError.value = e.response?.data?.error || e.message || 'No se pudieron cargar destinatarios'
      return
    }
  }
  nlRecipientsOpen.value = true
}

async function persistNlRecipients(patchList) {
  if (!nlDraft.value?.id || !nlCanEdit.value) return
  nlBusy.value = true
  nlRecipientsError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${nlDraft.value.id}`, {
      recipients: patchList,
    })
    applyNlDraft(data.newsletter)
  } catch (e) {
    nlRecipientsError.value = e.response?.data?.error || e.message || 'No se pudo actualizar'
  } finally {
    nlBusy.value = false
  }
}

async function toggleNlRecipient(r, included) {
  // Optimistic UI
  r.included = included
  const patch = { fingerprint: r.fingerprint, included }
  if (r.userId) patch.userId = r.userId
  if (r.email) patch.email = r.email
  await persistNlRecipients([patch])
}

async function setAllNlRecipientsIncluded(included) {
  const base =
    nlRecipientsMode.value === 'email'
      ? (nlDraft.value?.recipients || []).filter((r) => r.canEmail)
      : nlDraft.value?.recipients || []
  const patch = base.map((r) => ({
    userId: r.userId || undefined,
    email: r.email,
    fingerprint: r.fingerprint,
    included,
  }))
  for (const r of base) r.included = included
  await persistNlRecipients(patch)
}

async function addNlExternalEmail() {
  const email = nlAddEmail.value.trim()
  if (!email || !nlDraft.value?.id) return
  nlBusy.value = true
  nlAction.value = 'add-email'
  nlRecipientsError.value = ''
  nlError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${nlDraft.value.id}`, {
      addEmails: [{ email, nombre: nlAddNombre.value.trim() || undefined }],
    })
    applyNlDraft(data.newsletter)
    nlAddEmail.value = ''
    nlAddNombre.value = ''
    nlResultMsg.value = 'Email agregado a destinatarios'
  } catch (e) {
    const msg = e.response?.data?.error || e.message || 'No se pudo agregar'
    nlRecipientsError.value = msg
    nlError.value = msg
  } finally {
    nlBusy.value = false
    nlAction.value = ''
  }
}

async function removeNlExternalEmail(r) {
  if (!r?.email || !nlDraft.value?.id) return
  nlBusy.value = true
  nlRecipientsError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${nlDraft.value.id}`, {
      removeEmails: [r.email],
    })
    applyNlDraft(data.newsletter)
  } catch (e) {
    nlRecipientsError.value = e.response?.data?.error || e.message || 'No se pudo quitar'
  } finally {
    nlBusy.value = false
  }
}

function isSelected(id) {
  return selectedIds.value.includes(id)
}
function toggleSelect(id) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value = [...selectedIds.value, id]
}
function toggleSelectAllVisible() {
  if (allVisibleSelected.value) {
    const visible = new Set(items.value.map((p) => p.id))
    selectedIds.value = selectedIds.value.filter((id) => !visible.has(id))
  } else {
    const merged = new Set([...selectedIds.value, ...items.value.map((p) => p.id)])
    selectedIds.value = [...merged]
  }
}
function clearSelection() {
  selectedIds.value = []
}
function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedIds.value = []
    closeNewsletter()
  }
}
function chooseArmNewsletter() {
  newsletterChooserOpen.value = false
  if (!selectMode.value) toggleSelectMode()
}
function chooseNewsletterHistory() {
  newsletterChooserOpen.value = false
  router.push('/newsletters')
}

function nlStatusLabel(s) {
  return {
    pending_review: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    sending: 'Enviando',
    sent: 'Enviado',
    cancelled: 'Cancelado',
  }[s] || s
}

function applyNlDraft(n, mailConfigured) {
  nlDraft.value = n
  nlSubject.value = n.subject || ''
  nlVariants.value = (n.variants || []).map((v) => ({ ...v }))
  if (mailConfigured != null) nlMailConfigured.value = mailConfigured !== false
}

async function createNewsletterDraft() {
  if (!selectedIds.value.length || nlCreating.value) return
  nlCreating.value = true
  nlError.value = ''
  nlResultMsg.value = ''
  nlLoading.value = true
  nlLoadingLabel.value = 'Armando borrador, audiencias y resúmenes IA…'
  try {
    const { data } = await api.post('/admin/newsletters', {
      postIds: selectedIds.value,
      subject: nlSubject.value || undefined,
    })
    applyNlDraft(data.newsletter, data.mailConfigured)
    nlOpen.value = true
    nlResultMsg.value = 'Borrador creado. Revisá, aprobá y recién ahí se puede enviar.'
    selectMode.value = false
  } catch (e) {
    nlError.value = e.response?.data?.error || e.message || 'No se pudo crear el borrador'
    // Mantener modal útil aunque falle: reutilizar selección local
    if (!nlDraft.value) {
      nlDraft.value = {
        id: '',
        status: 'pending_review',
        subject: nlSubject.value || '',
        posts: selectedPosts.value.map((p) => ({
          postId: p.id,
          titulo: p.titulo,
          tipo: p.tipo,
        })),
        variants: [],
        totals: { recipients: 0, emailable: 0, variants: 0 },
      }
    }
    nlOpen.value = true
  } finally {
    nlCreating.value = false
    nlLoading.value = false
    nlLoadingLabel.value = ''
  }
}

function closeNewsletter() {
  if (nlBusy.value) return
  nlOpen.value = false
  nlError.value = ''
}

async function saveNlDraft() {
  if (!nlDraft.value || !nlCanEdit.value) return
  nlBusy.value = true
  nlAction.value = 'save'
  nlError.value = ''
  try {
    const { data } = await api.patch(`/admin/newsletters/${nlDraft.value.id}`, {
      subject: nlSubject.value,
      variants: nlVariants.value.map((v) => ({
        fingerprint: v.fingerprint,
        summary: v.summary,
      })),
    })
    applyNlDraft(data.newsletter)
    nlResultMsg.value = 'Cambios guardados'
  } catch (e) {
    nlError.value = e.response?.data?.error || e.message || 'No se pudo guardar'
  } finally {
    nlBusy.value = false
    nlAction.value = ''
  }
}

async function approveNlDraft() {
  if (!nlDraft.value) return
  if (nlCanEdit.value) await saveNlDraft()
  if (nlError.value) return
  nlBusy.value = true
  nlAction.value = 'approve'
  nlError.value = ''
  try {
    const { data } = await api.post(`/admin/newsletters/${nlDraft.value.id}/approve`, {})
    applyNlDraft(data.newsletter)
    nlResultMsg.value = 'Aprobado. Ahora podés enviarlo.'
  } catch (e) {
    nlError.value = e.response?.data?.error || e.message || 'No se pudo aprobar'
  } finally {
    nlBusy.value = false
    nlAction.value = ''
  }
}

async function rejectNlDraft() {
  const reason = window.prompt('Motivo del rechazo (obligatorio):')
  if (reason == null) return
  if (!String(reason).trim()) {
    nlError.value = 'El motivo es obligatorio'
    return
  }
  nlBusy.value = true
  nlAction.value = 'reject'
  try {
    const { data } = await api.post(`/admin/newsletters/${nlDraft.value.id}/reject`, {
      reason: String(reason).trim(),
    })
    applyNlDraft(data.newsletter)
    nlResultMsg.value = 'Rechazado — no se enviará'
  } catch (e) {
    nlError.value = e.response?.data?.error || e.message || 'No se pudo rechazar'
  } finally {
    nlBusy.value = false
    nlAction.value = ''
  }
}

async function sendNlDraft() {
  if (!nlDraft.value || nlDraft.value.status !== 'approved') return
  if (!window.confirm(`¿Enviar a ${nlEmailableCount.value} personas? Queda auditado.`)) return
  nlBusy.value = true
  nlAction.value = 'send'
  nlError.value = ''
  try {
    const { data } = await api.post(`/admin/newsletters/${nlDraft.value.id}/send`)
    applyNlDraft(data.newsletter)
    nlResultMsg.value =
      `Enviado a ${data.emailed} persona${data.emailed === 1 ? '' : 's'}` +
      (data.failed ? ` · ${data.failed} con error` : '')
    clearSelection()
  } catch (e) {
    nlError.value = e.response?.data?.error || e.message || 'No se pudo enviar'
  } finally {
    nlBusy.value = false
    nlAction.value = ''
  }
}

const providerOptions = [
  { id: 'auto', label: 'Auto' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
]

const aiProviderLabel = computed(() => {
  if (aiProvider.value === 'openai') return 'OpenAI'
  if (aiProvider.value === 'anthropic') return 'Anthropic'
  return 'IA'
})

const previewModel = computed(() => {
  const tipo = draft.value?.tipo || 'noticia'
  const tipoShow = postsConfig.value?.byTipo?.[tipo]?.show || DEFAULT_SHOW
  const overrides = draft.value?.display?.show || {}
  const show = { ...tipoShow, ...overrides }
  const urls = Array.isArray(draft.value?.imageUrls) ? draft.value.imageUrls.filter(Boolean) : []
  const imageUrls = urls.length >= 2 ? urls : []
  const imageUrl = draft.value?.imageUrl || imageUrls[0] || ''
  return {
    id: draft.value?.id || 'preview',
    titulo: draft.value?.titulo || 'Título de la publicación',
    cuerpo: draft.value?.cuerpo || 'Acá se lee el mensaje completo como en la app…',
    tipo,
    imageUrl,
    imageUrls,
    audioUrl: draft.value?.audioUrl || '',
    layout: draft.value?.layout || 'vertical',
    pinned: Boolean(draft.value?.pinned),
    publishedAt: draft.value?.publishedAt || new Date().toISOString(),
    authorName: auth.user?.nombre || auth.user?.usuario || 'Comunidad',
    reactions: { like: 2, love: 1, clap: 0 },
    display: { show },
  }
})

const typeConfigPreviewModel = computed(() => {
  const tipo = configTipo.value
  const cfg = typeConfigDraft.value?.byTipo?.[tipo] || {}
  const show = { ...DEFAULT_SHOW, ...(cfg.show || {}) }
  const samples = {
    noticia: {
      titulo: 'Nueva noticia de ejemplo',
      cuerpo: 'Así se vería una noticia en el muro con este formato y estos elementos visibles.',
    },
    aviso: {
      titulo: 'Aviso importante',
      cuerpo: 'Mensaje urgente de ejemplo para revisar el layout y la visibilidad.',
    },
    beneficio: {
      titulo: 'Beneficio del mes',
      cuerpo: 'Descuento o convenio de ejemplo para el equipo.',
    },
    evento: {
      titulo: 'Evento de la semana',
      cuerpo: 'Convocatoria de ejemplo con fecha y lugar.',
    },
    general: {
      titulo: 'Publicación de ejemplo',
      cuerpo: 'Texto de muestra para previsualizar el formato.',
    },
  }
  const sample = samples[tipo] || samples.general
  return {
    id: 'type-config-preview',
    titulo: sample.titulo,
    cuerpo: sample.cuerpo,
    tipo,
    imageUrl:
      'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="var(--brand-primary)"/><stop offset="1" stop-color="var(--brand-secondary)"/>
          </linearGradient></defs>
          <rect width="800" height="500" fill="url(#g)"/>
          <text x="400" y="250" text-anchor="middle" fill="white" font-family="sans-serif" font-size="28" font-weight="700">Vista previa</text>
        </svg>`
      ),
    imageUrls: [],
    audioUrl: '',
    layout: cfg.defaultLayout || 'vertical',
    pinned: false,
    publishedAt: new Date().toISOString(),
    authorName: auth.user?.nombre || auth.user?.usuario || 'Comunidad',
    reactions: { like: 3, love: 1, clap: 2 },
    display: { show },
  }
})

const tipoConsequence = computed(() => {
  const id = draft.value?.tipo || 'noticia'
  const meta = {
    noticia: {
      title: 'Noticia',
      badge: 'Comunicado del día',
      lead: 'Pensada para el feed cotidiano: novedades, comunicados y piezas con foto o video.',
    },
    aviso: {
      title: 'Aviso',
      badge: 'Urgente / importante',
      lead: 'Para mensajes que deben verse con prioridad: cortes, cambios, recordatorios fuertes.',
    },
    beneficio: {
      title: 'Beneficio',
      badge: 'Convenio / perk',
      lead: 'Para descuentos, convenios y beneficios del equipo. Se filtra fácil en el muro.',
    },
    evento: {
      title: 'Evento',
      badge: 'Fecha / convocatoria',
      lead: 'Para encuentros, capacitaciones y convocatorias con fecha o lugar.',
    },
    general: {
      title: 'General',
      badge: 'Uso libre',
      lead: 'Tipo abierto cuando no encaja en noticia, aviso, beneficio o evento.',
    },
  }[id] || { title: 'Tipo', badge: id, lead: '' }

  const cfg = postsConfig.value?.byTipo?.[id] || {}
  const layoutId = draft.value?.layout || cfg.defaultLayout || 'vertical'
  const layoutName = layoutLabel(layoutId)
  const defaultLayoutName = layoutLabel(cfg.defaultLayout || 'vertical')
  const showCfg = cfg.show || DEFAULT_SHOW
  const visible = showKeys.filter((sk) => showCfg[sk.key] !== false).map((sk) => sk.label)
  const hidden = showKeys.filter((sk) => showCfg[sk.key] === false).map((sk) => sk.label)

  const changes = [
    `La etiqueta en la tarjeta pasa a «${meta.title}» (si el elemento Tipo está visible).`,
    `Al elegir este tipo se aplica el layout por defecto del tenant: ${defaultLayoutName}. Ahora está en ${layoutName}.`,
    `Los elementos visibles (si no los forzaste a mano) heredan de este tipo${visible.length ? `: ${visible.join(', ')}` : ''}.`,
  ]
  if (hidden.length) {
    changes.push(`Por defecto este tipo oculta: ${hidden.join(', ')}.`)
  }
  if (id === 'noticia' || id === 'general') {
    changes.push('En el muro se presenta como pieza de feed (estilo Instagram) según el layout elegido.')
  } else {
    changes.push('En el muro se presenta como pieza corporativa (aviso / beneficio / evento) según el layout.')
  }

  return {
    ...meta,
    changes,
    keeps: [
      'Título, mensaje, media y audio no se borran.',
      'Audiencia, notificación, fijado, importancia y encuesta vinculada se mantienen.',
      'Overrides de «Elementos visibles» que ya hayas marcado a mano se conservan.',
    ],
  }
})

function onAiCarouselToggle() {
  if (aiWantCarousel.value) aiWantImage.value = true
}

function effectiveShow(key) {
  const override = draft.value?.display?.show?.[key]
  if (typeof override === 'boolean') return override
  const tipo = draft.value?.tipo || 'noticia'
  const fromTipo = postsConfig.value?.byTipo?.[tipo]?.show?.[key]
  if (typeof fromTipo === 'boolean') return fromTipo
  return DEFAULT_SHOW[key] !== false
}

function onShowToggle(key, checked) {
  if (!draft.value) return
  draft.value.display = setShowOverride(draft.value.display, key, Boolean(checked))
}

function setTipo(id) {
  if (!draft.value) return
  draft.value.tipo = id
  const def = postsConfig.value?.byTipo?.[id]?.defaultLayout
  if (def) draft.value.layout = def
}

function ensurePostsConfigShape(raw) {
  const byTipo = {}
  for (const t of tipos) {
    const src = raw?.byTipo?.[t.id] || {}
    byTipo[t.id] = {
      defaultLayout: src.defaultLayout || 'vertical',
      show: { ...DEFAULT_SHOW, ...(src.show || {}) },
    }
  }
  return { byTipo }
}

async function loadPostsConfig() {
  try {
    const { data } = await api.get('/admin/posts/config')
    postsConfig.value = ensurePostsConfigShape(data.config)
  } catch {
    postsConfig.value = ensurePostsConfigShape(null)
  }
}

function openTypeConfig() {
  typeConfigError.value = ''
  configTipo.value = 'noticia'
  typeConfigDraft.value = ensurePostsConfigShape(postsConfig.value)
  typeConfigOpen.value = true
}

async function saveTypeConfig() {
  typeConfigSaving.value = true
  typeConfigError.value = ''
  try {
    const { data } = await api.put('/admin/posts/config', { config: typeConfigDraft.value })
    postsConfig.value = ensurePostsConfigShape(data.config)
    typeConfigOpen.value = false
  } catch (e) {
    typeConfigError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    typeConfigSaving.value = false
  }
}

function statusLabel(s) {
  return {
    draft: 'Borrador',
    pending_review: 'Pendiente',
    scheduled: 'Programada',
    published: 'Publicada',
    rejected: 'Rechazada',
    archived: 'Archivada',
    closed: 'Cerrada',
  }[s] || s
}
function surveyStatusLabel(s) {
  return {
    draft: 'Borrador',
    published: 'Publicada',
    closed: 'Cerrada',
  }[s] || statusLabel(s)
}
function surveyQuestionTypeLabel(t) {
  return {
    text: 'Texto corto',
    textarea: 'Texto largo',
    single: 'Opción única',
    multiple: 'Opción múltiple',
    rating: 'Puntaje',
    yesno: 'Sí / No',
    number: 'Número',
    date: 'Fecha',
    time: 'Hora',
    datetime: 'Fecha y hora',
    email: 'Email',
    phone: 'Teléfono',
    geopoint: 'Ubicación',
  }[t] || t || 'Pregunta'
}
async function loadLinkedSurveyDetail(id) {
  const surveyId = String(id || '').trim()
  const token = ++linkedSurveyLoadToken
  if (!surveyId) {
    linkedSurveyDetail.value = null
    linkedSurveyError.value = ''
    linkedSurveyLoading.value = false
    return
  }
  linkedSurveyLoading.value = true
  linkedSurveyError.value = ''
  try {
    const { data } = await api.get(`/admin/surveys/${surveyId}`)
    if (token !== linkedSurveyLoadToken) return
    linkedSurveyDetail.value = data.survey || null
    if (!linkedSurveyDetail.value) linkedSurveyError.value = 'No se encontró la encuesta'
  } catch (e) {
    if (token !== linkedSurveyLoadToken) return
    linkedSurveyDetail.value = null
    linkedSurveyError.value = e.response?.data?.error || e.message || 'No se pudo cargar la encuesta'
  } finally {
    if (token === linkedSurveyLoadToken) linkedSurveyLoading.value = false
  }
}
function onLinkedSurveyChange(value) {
  if (!draft.value) return
  draft.value.linkedSurveyId = value || ''
  loadLinkedSurveyDetail(value)
}
function clearLinkedSurveyState() {
  linkedSurveyLoadToken += 1
  linkedSurveyDetail.value = null
  linkedSurveyLoading.value = false
  linkedSurveyError.value = ''
}
function riskLabel(r) {
  return { low: 'bajo', medium: 'medio', high: 'alto' }[r] || r
}
function actionLabel(a) {
  return {
    approve: 'aprobar',
    review: 'revisar con cuidado',
    reject: 'rechazar',
  }[a] || a
}
function tipoLabel(t) {
  return tipos.find((x) => x.id === t)?.label || t
}
function layoutLabel(l) {
  return layouts.find((x) => x.id === l)?.label || 'Vertical'
}
function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}
function normalizeAudienceDraft(a) {
  const mode = ['restricted', 'users', 'none'].includes(a?.mode) ? a.mode : 'all'
  return {
    mode,
    areaIds: mode === 'restricted' ? [...(a?.areaIds || [])].map(String) : [],
    groupIds: mode === 'restricted' ? [...(a?.groupIds || [])].map(String) : [],
    userIds: mode === 'restricted' || mode === 'users' ? [...(a?.userIds || [])].map(String) : [],
  }
}
function setAudienceMode(mode) {
  if (!draft.value) return
  const prev = draft.value.audience || emptyAudience()
  draft.value.audience = normalizeAudienceDraft({
    ...prev,
    mode,
    userIds: mode === 'restricted' || mode === 'users' ? prev.userIds || [] : [],
    areaIds: mode === 'restricted' ? prev.areaIds || [] : [],
    groupIds: mode === 'restricted' ? prev.groupIds || [] : [],
  })
  if (mode === 'restricted' || mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}
function audienceLabel(p) {
  const a = p?.audience
  if (!a || a.mode === 'all') return 'Todos'
  if (a.mode === 'none') return 'Nadie'
  if (a.mode === 'users') {
    const n = (a.userIds || []).length
    return n ? `${n} persona${n === 1 ? '' : 's'}` : 'Sin personas'
  }
  const areas = (a.areaIds || [])
    .map((id) => orgAreas.value.find((x) => x.id === id)?.nombre)
    .filter(Boolean)
  const groups = (a.groupIds || [])
    .map((id) => orgGroups.value.find((x) => x.id === id)?.nombre)
    .filter(Boolean)
  const parts = [...areas, ...groups]
  const extra = (a.userIds || []).length
  if (extra) parts.push(`+${extra} persona${extra === 1 ? '' : 's'}`)
  return parts.length ? parts.join(', ') : 'Segmentada'
}

const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => {
    const cached = audienceUserCache.value[id]
    if (cached) return cached
    return { id, label: id, usuario: '', email: '' }
  })
})

function cacheAudienceUser(u) {
  if (!u?.id) return
  audienceUserCache.value = {
    ...audienceUserCache.value,
    [u.id]: {
      id: u.id,
      label: u.label || [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || u.id,
      usuario: u.usuario || '',
      email: u.email || '',
      areaId: u.areaId || null,
    },
  }
}

async function searchAudienceUsers(q) {
  const query = String(q || '').trim()
  if (query.length < 2) {
    audienceUserResults.value = []
    return
  }
  audienceUserSearching.value = true
  try {
    const { data } = await api.get('/admin/posts/audience-candidates', { params: { q: query } })
    const items = data.items || []
    items.forEach(cacheAudienceUser)
    audienceUserResults.value = items.filter((u) => !(draft.value?.audience?.userIds || []).includes(u.id))
  } catch {
    audienceUserResults.value = []
  } finally {
    audienceUserSearching.value = false
  }
}

function onAudienceUserQuery() {
  clearTimeout(audienceUserSearchTimer)
  audienceUserSearchTimer = setTimeout(() => searchAudienceUsers(audienceUserQuery.value), 250)
}

function addAudienceUser(u) {
  if (!draft.value || !u?.id) return
  cacheAudienceUser(u)
  const ids = draft.value.audience.userIds || []
  if (!ids.includes(u.id)) draft.value.audience.userIds = [...ids, u.id]
  audienceUserResults.value = audienceUserResults.value.filter((x) => x.id !== u.id)
}

function removeAudienceUser(id) {
  if (!draft.value) return
  draft.value.audience.userIds = (draft.value.audience.userIds || []).filter((x) => x !== id)
}

async function ensureAudienceUsersHydrated() {
  const ids = draft.value?.audience?.userIds || []
  const missing = ids.filter((id) => !audienceUserCache.value[id])
  if (!missing.length) return
  try {
    const { data } = await api.get('/admin/posts/audience-candidates', { params: { q: '' } })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}
function isVideo(url) {
  const k = mediaKind(url)
  return k === 'video' || k === 'embed'
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const baseParams = {
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    }
    if (filter.value) baseParams.status = filter.value
    if (tipoFilter.value) baseParams.tipo = tipoFilter.value
    if (pinnedFilter.value) baseParams.pinned = pinnedFilter.value
    if (riskFilter.value) baseParams.risk = riskFilter.value
    if (q.value.trim()) baseParams.q = q.value.trim()

    if (viewMode.value === 'calendar') {
      const { year, month } = calendarCursor.value
      const range = calendarRangeDays(year, month)
      const size = 200
      let pageNum = 1
      let all = []
      let totalCount = 0
      let pending = 0
      let highRisk = 0
      // Traer todas las páginas del rango visible (mes + padding)
      for (;;) {
        const { data } = await api.get('/admin/posts', {
          params: {
            ...baseParams,
            from: range.from,
            to: range.to,
            page: pageNum,
            size,
          },
        })
        const batch = data.items || []
        totalCount = Number(data.total) || 0
        if (pageNum === 1) {
          pending = Number(data.pendingCount) || 0
          highRisk = Number(data.highRiskPending) || 0
        }
        all = all.concat(batch)
        if (!batch.length || all.length >= totalCount || pageNum >= 25) break
        pageNum += 1
      }
      items.value = all
      total.value = totalCount
      pendingCount.value = pending
      highRiskPending.value = highRisk
    } else {
      const params = {
        ...baseParams,
        page: page.value,
        size: pageSize.value,
      }
      const { data } = await api.get('/admin/posts', { params })
      items.value = data.items || []
      total.value = Number(data.total) || 0
      const serverPage = Number(data.page) || page.value
      if (serverPage !== page.value) page.value = serverPage
      if (!items.value.length && page.value > 1 && total.value > 0) {
        page.value = Math.max(1, Math.ceil(total.value / pageSize.value))
        loading.value = false
        return load()
      }
      pendingCount.value = Number(data.pendingCount) || 0
      highRiskPending.value = Number(data.highRiskPending) || 0
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
    items.value = []
    total.value = 0
    pendingCount.value = 0
    highRiskPending.value = 0
  } finally {
    loading.value = false
  }
}

function searchPosts() {
  page.value = 1
  return load()
}

function goToPage(n) {
  const next = Math.max(1, Math.min(totalPages.value, Number(n) || 1))
  if (next === page.value) return
  page.value = next
  return load()
}

function changePageSize() {
  localStorage.setItem('cx.pubs.pageSize', String(pageSize.value))
  page.value = 1
  return load()
}

function setStatusFilter(value) {
  filter.value = value
  page.value = 1
  return load()
}
function setTipoFilter(value) {
  tipoFilter.value = value
  page.value = 1
  return load()
}
function setPinnedFilter(value) {
  pinnedFilter.value = value
  page.value = 1
  return load()
}
function setRiskFilter(value) {
  riskFilter.value = value
  page.value = 1
  return load()
}
function setHighRiskPendingFilter() {
  filter.value = 'pending_review'
  riskFilter.value = 'high'
  page.value = 1
  return load()
}

function refresh() {
  return load()
}

function toggleSort(key) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = key === 'titulo' || key === 'tipo' || key === 'status' || key === 'layout' ? 'asc' : 'desc'
  }
  page.value = 1
  load()
}

watch(viewMode, (v) => {
  localStorage.setItem('cx.pubs.view', v)
  page.value = 1
  load()
})

watch(
  () => [draft.value?.imageUrl, draft.value?.imageUrls],
  () => {
    if (!draft.value || mediaTypeSyncPaused) return
    if (mediaType.value === 'carousel') return
    // Si el admin eligió Video/YouTube a mano, no forzar "Imagen" por la URL anterior.
    if (mediaType.value === 'video' || mediaType.value === 'youtube') {
      const k = mediaKind(draft.value.imageUrl)
      if (k === 'embed') mediaType.value = 'youtube'
      else if (k === 'video') mediaType.value = 'video'
      return
    }
    syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
  },
)

function openNew() {
  formError.value = ''
  draftFromAi.value = false
  draftPreviewOpen.value = false
  editorSection.value = 'contenido'
  clearLinkedSurveyState()
  aiHistory.value = []
  aiRefinePrompt.value = ''
  aiNotes.value = ''
  aiError.value = ''
  carouselUploadError.value = ''
  carouselUrlDraft.value = ''
  draft.value = {
    titulo: '',
    cuerpo: '',
    tipo: 'noticia',
    imageUrl: '',
    imageUrls: [],
    audioUrl: '',
    layout: postsConfig.value?.byTipo?.noticia?.defaultLayout || 'vertical',
    pinned: false,
    pinnedPreset: '',
    pinnedUntilLocal: '',
    expiresAtLocal: '',
    section: '',
    priority: 0,
    status: 'published',
    scheduledLocal: '',
    publishWhen: 'now',
    notifyAudience: false,
    renotifyAudience: false,
    commentsEnabled: true,
    isKnowledge: false,
    audience: emptyAudience(),
    display: emptyDisplayOverrides(),
    linkedSurveyId: '',
  }
  mediaType.value = 'image'
}

function chooseNewManual() {
  newPostChooserOpen.value = false
  openNew()
}

function chooseNewWeb() {
  newPostChooserOpen.value = false
  webNewsOpen.value = true
}

function chooseNewAi() {
  newPostChooserOpen.value = false
  openAiNew()
}

async function loadTemplates() {
  templatesLoading.value = true
  templatesError.value = ''
  try {
    const { data } = await api.get('/admin/post-templates')
    templates.value = data.items || []
    templatesLoaded.value = true
  } catch (e) {
    templatesError.value = e.response?.data?.error || e.message || 'No se pudieron cargar las plantillas'
  } finally {
    templatesLoading.value = false
  }
}

function chooseNewTemplate() {
  newPostChooserOpen.value = false
  templatesChooserOpen.value = true
  if (!templatesLoaded.value) loadTemplates()
}

function pickTemplate(tpl) {
  templatesChooserOpen.value = false
  openFromTemplate(tpl)
}

/** Prellena el editor con una plantilla (Ola 36-c). Igual que openNew pero con campos de la plantilla. */
function openFromTemplate(tpl) {
  openNew()
  draft.value.tipo = tpl.tipo || draft.value.tipo
  draft.value.titulo = tpl.titulo || ''
  draft.value.cuerpo = tpl.cuerpo || ''
  draft.value.layout = tpl.layout || postsConfig.value?.byTipo?.[draft.value.tipo]?.defaultLayout || 'vertical'
  draft.value.section = tpl.section || ''
  draft.value.imageUrl = tpl.imageUrl || ''
  draft.value.pinned = Boolean(tpl.pinned)
  syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
}

function openAiNew() {
  aiError.value = ''
  aiCreatePrompt.value = ''
  aiWantImage.value = true
  aiWantCarousel.value = false
  aiPromptOpen.value = true
  checkAiStatus()
}

/** Resultado del flujo web-news → abre el mismo editor de borrador (status draft). */
function applyWebNewsDraft(payload) {
  const d = payload?.draft || {}
  formError.value = ''
  draftFromAi.value = false
  draftPreviewOpen.value = false
  editorSection.value = 'contenido'
  aiHistory.value = []
  aiRefinePrompt.value = ''
  aiNotes.value = d.notas || ''
  draft.value = {
    titulo: d.titulo || '',
    cuerpo: d.cuerpo || '',
    tipo: d.tipo || 'noticia',
    imageUrl: d.imageUrl || '',
    imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls.filter(Boolean) : [],
    audioUrl: d.audioUrl || '',
    layout: d.layout || 'vertical',
    pinned: false,
    priority: 0,
    status: 'draft',
    scheduledLocal: '',
    publishWhen: 'now',
    notifyAudience: false,
    renotifyAudience: false,
    commentsEnabled: true,
    isKnowledge: false,
    audience: emptyAudience(),
    display: emptyDisplayOverrides(),
    linkedSurveyId: '',
  }
  syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
}

async function checkAiStatus() {
  try {
    const { data } = await api.get('/admin/posts/ai/status')
    aiConfigured.value = Boolean(data.configured)
    aiProviders.value = {
      openai: Boolean(data.providers?.openai),
      anthropic: Boolean(data.providers?.anthropic),
    }
    if (data.preferred && ['auto', 'openai', 'anthropic'].includes(data.preferred)) {
      aiProvider.value = data.preferred
    }
  } catch {
    aiConfigured.value = false
    aiProviders.value = { openai: false, anthropic: false }
  }
}

function applyAiDraft(result, userPrompt) {
  const d = result.draft || {}
  const urls = Array.isArray(d.imageUrls) ? d.imageUrls.filter(Boolean) : []
  const prevUrls = Array.isArray(draft.value?.imageUrls) ? [...draft.value.imageUrls] : []
  let nextUrls = prevUrls
  let nextImage = d.imageUrl || draft.value?.imageUrl || ''
  if (urls.length >= 2) {
    nextUrls = urls
    nextImage = d.imageUrl || urls[0]
  } else if (d.imageUrl) {
    nextImage = d.imageUrl
    nextUrls = []
  }
  draft.value = {
    id: draft.value?.id,
    titulo: d.titulo || '',
    cuerpo: d.cuerpo || '',
    tipo: d.tipo || 'noticia',
    imageUrl: nextImage,
    imageUrls: nextUrls,
    audioUrl: draft.value?.audioUrl || '',
    layout: d.layout || 'vertical',
    pinned: Boolean(draft.value?.pinned),
    priority: Number(draft.value?.priority) || 0,
    status: draft.value?.status || 'draft',
    publishedAt: draft.value?.publishedAt,
    scheduledAt: draft.value?.scheduledAt,
    scheduledLocal: draft.value?.scheduledLocal || '',
    publishWhen: draft.value?.publishWhen || (draft.value?.status === 'scheduled' ? 'scheduled' : 'now'),
    notifyAudience: Boolean(draft.value?.notifyAudience),
    renotifyAudience: Boolean(draft.value?.renotifyAudience),
    commentsEnabled: draft.value?.commentsEnabled !== false,
    audience: normalizeAudienceDraft(draft.value?.audience),
    display: draft.value?.display || emptyDisplayOverrides(),
    linkedSurveyId: draft.value?.linkedSurveyId || '',
  }
  if (d.audioUrl) draft.value.audioUrl = d.audioUrl
  const holidayLine = result.holiday
    ? `Feriado usado: ${result.holiday.name} · ${result.holiday.label}`
    : ''
  aiNotes.value = [d.notas, holidayLine, result.imageWarning ? `Imagen: ${result.imageWarning}` : '']
    .filter(Boolean)
    .join('\n')
  aiLastProvider.value = result.provider || ''
  aiLastModel.value = result.model || ''
  draftFromAi.value = true
  syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
  aiHistory.value = [
    ...aiHistory.value,
    { role: 'user', content: userPrompt },
    { role: 'assistant', content: result.assistantMessage || JSON.stringify(d) },
  ]
}

async function runAiCreate() {
  aiError.value = ''
  aiLoading.value = true
  try {
    const prompt = aiCreatePrompt.value.trim()
    const { data } = await api.post('/admin/posts/ai/generate', {
      prompt,
      history: [],
      generateImage: aiWantImage.value || aiWantCarousel.value,
      generateCarousel: aiWantCarousel.value,
      provider: aiProvider.value,
    })
    aiHistory.value = []
    draftPreviewOpen.value = false
    editorSection.value = 'contenido'
    draft.value = {
      titulo: '',
      cuerpo: '',
      tipo: 'noticia',
      imageUrl: '',
      imageUrls: [],
      audioUrl: '',
      layout: 'vertical',
      pinned: false,
      priority: 0,
      status: 'draft',
      scheduledLocal: '',
      publishWhen: 'now',
      notifyAudience: false,
      renotifyAudience: false,
      commentsEnabled: true,
      isKnowledge: false,
      audience: emptyAudience(),
      display: emptyDisplayOverrides(),
      linkedSurveyId: '',
    }
    applyAiDraft(data, prompt)
    aiPromptOpen.value = false
    aiRefinePrompt.value = ''
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message || 'No se pudo generar con IA'
  } finally {
    aiLoading.value = false
  }
}

async function runAiRefine() {
  if (!draft.value) return
  aiError.value = ''
  aiLoading.value = true
  try {
    const prompt = aiRefinePrompt.value.trim()
    const { data } = await api.post('/admin/posts/ai/generate', {
      prompt,
      history: aiHistory.value,
      current: {
        titulo: draft.value.titulo,
        cuerpo: draft.value.cuerpo,
        tipo: draft.value.tipo,
        layout: draft.value.layout,
        imageUrl: draft.value.imageUrl,
        imageUrls: draft.value.imageUrls,
      },
      generateImage: aiWantImage.value || aiWantCarousel.value,
      generateCarousel: aiWantCarousel.value,
      provider: aiProvider.value,
    })
    applyAiDraft(data, prompt)
    aiRefinePrompt.value = ''
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message || 'No se pudo mejorar con IA'
  } finally {
    aiLoading.value = false
  }
}

function edit(p) {
  formError.value = ''
  viewer.value = null
  draftPreviewOpen.value = false
  editorSection.value = 'contenido'
  draftFromAi.value = false
  aiHistory.value = []
  aiRefinePrompt.value = ''
  aiNotes.value = ''
  aiError.value = ''
  carouselUploadError.value = ''
  carouselUrlDraft.value = ''
  draft.value = {
    ...p,
    imageUrls: Array.isArray(p.imageUrls) ? [...p.imageUrls] : [],
    layout: p.layout || 'vertical',
    linkedSurveyId: p.linkedSurveyId || '',
    notifyAudience: Boolean(p.notifyAudience),
    renotifyAudience: false,
    commentsEnabled: p.commentsEnabled !== false,
    isKnowledge: Boolean(p.isKnowledge),
    rejectionReason: p.rejectionReason || '',
    scheduledLocal: p.scheduledAt ? toLocalInput(p.scheduledAt) : '',
    publishWhen: p.status === 'scheduled' ? 'scheduled' : 'now',
    pinned: Boolean(p.pinned),
    pinnedPreset: '',
    pinnedUntilLocal: p.pinnedUntil ? toLocalInput(p.pinnedUntil) : '',
    expiresAtLocal: p.expiresAt ? toLocalInput(p.expiresAt) : '',
    section: p.section || '',
    audience: normalizeAudienceDraft(p.audience),
    display: {
      show: { ...(p.display?.show || {}) },
    },
  }
  syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
  loadLinkedSurveyDetail(draft.value.linkedSurveyId)
  ensureAudienceUsersHydrated()
}

/** Abre el editor como publicación nueva (sin id) copiando contenido. */
function clonePost(p) {
  formError.value = ''
  viewer.value = null
  draftPreviewOpen.value = false
  editorSection.value = 'contenido'
  draftFromAi.value = false
  aiHistory.value = []
  aiRefinePrompt.value = ''
  aiNotes.value = ''
  aiError.value = ''
  carouselUploadError.value = ''
  carouselUrlDraft.value = ''
  const baseTitle = (p.titulo || '').trim()
  draft.value = {
    titulo: baseTitle ? `Copia de ${baseTitle}` : 'Copia de publicación',
    cuerpo: p.cuerpo || '',
    tipo: p.tipo || 'noticia',
    imageUrl: p.imageUrl || '',
    imageUrls: Array.isArray(p.imageUrls) ? [...p.imageUrls] : [],
    audioUrl: p.audioUrl || '',
    layout: p.layout || 'vertical',
    pinned: false,
    priority: Number(p.priority) || 0,
    status: 'draft',
    scheduledLocal: '',
    publishWhen: 'now',
    notifyAudience: false,
    renotifyAudience: false,
    commentsEnabled: p.commentsEnabled !== false,
    isKnowledge: Boolean(p.isKnowledge),
    linkedSurveyId: p.linkedSurveyId || '',
    audience: normalizeAudienceDraft(p.audience),
    display: {
      show: { ...(p.display?.show || {}) },
    },
  }
  syncMediaTypeFromUrl(draft.value.imageUrl, draft.value.imageUrls)
  loadLinkedSurveyDetail(draft.value.linkedSurveyId)
  ensureAudienceUsersHydrated()
}

function editFromViewer() {
  const p = viewer.value
  viewer.value = null
  if (p) edit(p)
}

function previewPost(p) {
  viewer.value = { ...p, layout: p.layout || 'vertical' }
}

function closeModal() {
  draft.value = null
  draftPreviewOpen.value = false
  editorSection.value = 'contenido'
  clearLinkedSurveyState()
  formError.value = ''
  draftFromAi.value = false
  aiHistory.value = []
  aiRefinePrompt.value = ''
  aiNotes.value = ''
  aiError.value = ''
}

function openDraftPreview() {
  draftPreviewOpen.value = true
}

async function submitPrimary() {
  if (draft.value?.publishWhen === 'scheduled') {
    await schedulePublish()
    return
  }
  await publishNow()
}

async function publishNow() {
  draft.value.publishWhen = 'now'
  draft.value.status = 'published'
  await persist('published')
}

async function schedulePublish() {
  formError.value = ''
  if (!draft.value?.scheduledLocal) {
    formError.value = 'Elegí día y/o hora para programar la publicación'
    draft.value.publishWhen = 'scheduled'
    return
  }
  const when = new Date(draft.value.scheduledLocal)
  if (Number.isNaN(when.getTime())) {
    formError.value = 'Fecha de programación inválida'
    draft.value.publishWhen = 'scheduled'
    return
  }
  if (when.getTime() < Date.now() - 60_000) {
    formError.value = 'La fecha programada ya pasó'
    draft.value.publishWhen = 'scheduled'
    return
  }
  draft.value.publishWhen = 'scheduled'
  draft.value.status = 'scheduled'
  await persist('scheduled')
}

async function persist(statusOverride, { keepOpen = false } = {}) {
  formError.value = ''
  if (mediaType.value === 'carousel') {
    syncCarouselPrimary()
    const n = (draft.value.imageUrls || []).length
    if (n > 0 && n < 2) {
      formError.value = 'El carrusel necesita al menos 2 imágenes'
      return
    }
  }
  let status = statusOverride || draft.value.status
  // Si guardan con "Programar" activo, persistir como scheduled
  if (!statusOverride && draft.value.publishWhen === 'scheduled' && status !== 'rejected' && status !== 'archived' && status !== 'pending_review') {
    status = 'scheduled'
  }
  if (status === 'scheduled') {
    if (!draft.value.scheduledLocal) {
      formError.value = 'Elegí día y/o hora para programar la publicación'
      draft.value.publishWhen = 'scheduled'
      return
    }
    const when = new Date(draft.value.scheduledLocal)
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      formError.value = Number.isNaN(when.getTime())
        ? 'Fecha de programación inválida'
        : 'La fecha programada ya pasó'
      draft.value.publishWhen = 'scheduled'
      return
    }
  }
  saving.value = true
  try {
    const urls =
      mediaType.value === 'carousel'
        ? (draft.value.imageUrls || []).filter(Boolean)
        : []
    const payload = {
      titulo: draft.value.titulo,
      cuerpo: draft.value.cuerpo,
      tipo: draft.value.tipo,
      imageUrl: mediaType.value === 'carousel' ? urls[0] || '' : draft.value.imageUrl,
      imageUrls: urls,
      audioUrl: draft.value.audioUrl || '',
      layout: draft.value.layout || 'vertical',
      pinned: draft.value.pinned,
      pinnedUntil:
        draft.value.pinned && draft.value.pinnedUntilLocal
          ? new Date(draft.value.pinnedUntilLocal).toISOString()
          : draft.value.pinned
            ? null
            : null,
      pinnedPreset: draft.value.pinned ? draft.value.pinnedPreset || undefined : undefined,
      expiresAt: draft.value.expiresAtLocal
        ? new Date(draft.value.expiresAtLocal).toISOString()
        : null,
      section: draft.value.section || '',
      priority: Number(draft.value.priority) || 0,
      notifyAudience: Boolean(draft.value.notifyAudience),
      commentsEnabled: draft.value.commentsEnabled !== false,
      isKnowledge: Boolean(draft.value.isKnowledge),
      status,
      scheduledAt:
        status === 'scheduled' && draft.value.scheduledLocal
          ? new Date(draft.value.scheduledLocal).toISOString()
          : null,
      audience: normalizeAudienceDraft(draft.value.audience),
      display: {
        show: { ...(draft.value.display?.show || {}) },
      },
      linkedSurveyId: draft.value.linkedSurveyId || null,
    }
    if (typeof draft.value.rejectionReason === 'string') {
      payload.rejectionReason = draft.value.rejectionReason
    }
    if (draft.value.renotifyAudience) payload.renotifyAudience = true
    const { data } = draft.value.id
      ? await api.patch(`/admin/posts/${draft.value.id}`, payload)
      : await api.post('/admin/posts', payload)
    const saved = data?.post
    if (keepOpen && saved) {
      draft.value = {
        ...draft.value,
        id: saved.id,
        status: saved.status || status,
        publishedAt: saved.publishedAt || draft.value.publishedAt,
        scheduledAt: saved.scheduledAt || null,
        scheduledLocal: saved.scheduledAt
          ? toLocalInput(saved.scheduledAt)
          : draft.value.scheduledLocal || '',
        publishWhen: saved.status === 'scheduled' ? 'scheduled' : draft.value.publishWhen || 'now',
        titulo: saved.titulo ?? draft.value.titulo,
        cuerpo: saved.cuerpo ?? draft.value.cuerpo,
        imageUrl: saved.imageUrl ?? draft.value.imageUrl,
        imageUrls: Array.isArray(saved.imageUrls) ? [...saved.imageUrls] : draft.value.imageUrls,
        audioUrl: saved.audioUrl ?? draft.value.audioUrl,
        layout: saved.layout || draft.value.layout,
        pinned: Boolean(saved.pinned),
        priority: Number(saved.priority) || 0,
        notifyAudience: Boolean(saved.notifyAudience),
        renotifyAudience: false,
        commentsEnabled: saved.commentsEnabled !== false,
        audience: normalizeAudienceDraft(saved.audience || draft.value.audience),
        display: {
          show: { ...(saved.display?.show || draft.value.display?.show || {}) },
        },
        linkedSurveyId: saved.linkedSurveyId || '',
      }
      await load()
      return
    }
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function save() {
  await persist()
}
async function saveAsDraft() {
  draft.value.publishWhen = 'now'
  draft.value.status = 'draft'
  await persist('draft', { keepOpen: true })
}
async function publish(p) {
  try {
    await api.patch(`/admin/posts/${p.id}`, { status: 'published' })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo publicar'
  }
}
async function approve(p) {
  try {
    await api.patch(`/admin/posts/${p.id}/approve`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo aprobar'
  }
}
async function reanalyze(p) {
  if (!p?.id || analyzingId.value === p.id) return
  analyzingId.value = p.id
  const idx = items.value.findIndex((x) => x.id === p.id)
  if (idx >= 0) {
    items.value[idx] = {
      ...items.value[idx],
      moderationAi: {
        ...(items.value[idx].moderationAi || {}),
        status: 'pending',
        summary: '',
        reasons: [],
        policyFlags: [],
        error: '',
      },
    }
  }
  try {
    error.value = ''
    const { data } = await api.post(`/admin/posts/${p.id}/analyze`)
    const updated = data?.post
    if (updated?.id) {
      const i = items.value.findIndex((x) => x.id === updated.id)
      if (i >= 0) {
        items.value[i] = { ...items.value[i], ...updated }
      }
    } else {
      await load()
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo analizar con IA'
    await load()
  } finally {
    analyzingId.value = null
  }
}
function askReject(p) {
  rejectError.value = ''
  rejectReason.value = ''
  pendingReject.value = p
}
function openStatusChange(p) {
  statusChangeError.value = ''
  statusChangeReason.value = ''
  statusChangeTarget.value = p.status
  statusChangePost.value = p
}
function closeStatusChange() {
  if (statusChanging.value) return
  statusChangePost.value = null
  statusChangeTarget.value = ''
  statusChangeReason.value = ''
  statusChangeError.value = ''
}
async function confirmStatusChange() {
  const p = statusChangePost.value
  const next = statusChangeTarget.value
  if (!p?.id || !next || statusChanging.value) return
  if (next === p.status) {
    closeStatusChange()
    return
  }
  if (next === 'scheduled') {
    closeStatusChange()
    edit(p)
    setPublishWhen('scheduled')
    return
  }
  if (statusChangeNeedsReason.value && !statusChangeReason.value.trim()) {
    statusChangeError.value = 'Indicá el motivo del rechazo'
    return
  }
  statusChangeError.value = ''
  statusChanging.value = true
  try {
    if (next === 'rejected' && p.status === 'pending_review') {
      await api.patch(`/admin/posts/${p.id}/reject`, { reason: statusChangeReason.value.trim() })
    } else if (next === 'published' && p.status === 'pending_review') {
      await api.patch(`/admin/posts/${p.id}/approve`)
    } else if (next === 'pending_review' && p.status === 'published') {
      // Desaprobar: sale del muro y vuelve a cola de moderación
      await api.patch(`/admin/posts/${p.id}`, { status: 'pending_review' })
    } else if (next === 'rejected') {
      await api.patch(`/admin/posts/${p.id}`, {
        status: 'rejected',
        rejectionReason: statusChangeReason.value.trim() || undefined,
      })
    } else {
      await api.patch(`/admin/posts/${p.id}`, { status: next })
    }
    statusChangePost.value = null
    statusChangeTarget.value = ''
    statusChangeReason.value = ''
    await load()
  } catch (e) {
    statusChangeError.value = e.response?.data?.error || 'No se pudo cambiar el estado'
  } finally {
    statusChanging.value = false
  }
}
function openTipoChange(p) {
  tipoChangeError.value = ''
  tipoChangeTarget.value = p.tipo || 'noticia'
  tipoChangePost.value = p
}
function closeTipoChange() {
  if (tipoChanging.value) return
  tipoChangePost.value = null
  tipoChangeTarget.value = ''
  tipoChangeError.value = ''
}
async function confirmTipoChange() {
  const p = tipoChangePost.value
  const next = tipoChangeTarget.value
  if (!p?.id || !next || tipoChanging.value) return
  if (next === p.tipo) {
    closeTipoChange()
    return
  }
  tipoChangeError.value = ''
  tipoChanging.value = true
  try {
    await api.patch(`/admin/posts/${p.id}`, { tipo: next })
    tipoChangePost.value = null
    tipoChangeTarget.value = ''
    await load()
  } catch (e) {
    tipoChangeError.value = e.response?.data?.error || 'No se pudo cambiar el tipo'
  } finally {
    tipoChanging.value = false
  }
}
function openLayoutChange(p) {
  layoutChangeError.value = ''
  layoutChangeTarget.value = p.layout || 'vertical'
  layoutChangePost.value = p
}
function closeLayoutChange() {
  if (layoutChanging.value) return
  layoutChangePost.value = null
  layoutChangeTarget.value = ''
  layoutChangeError.value = ''
}
async function confirmLayoutChange() {
  const p = layoutChangePost.value
  const next = layoutChangeTarget.value
  if (!p?.id || !next || layoutChanging.value) return
  if (next === (p.layout || 'vertical')) {
    closeLayoutChange()
    return
  }
  layoutChangeError.value = ''
  layoutChanging.value = true
  try {
    await api.patch(`/admin/posts/${p.id}`, { layout: next })
    layoutChangePost.value = null
    layoutChangeTarget.value = ''
    await load()
  } catch (e) {
    layoutChangeError.value = e.response?.data?.error || 'No se pudo cambiar el formato'
  } finally {
    layoutChanging.value = false
  }
}
function startPriorityEdit(p) {
  if (prioritySavingId.value) return
  priorityEditId.value = p.id
  priorityEditValue.value = Number(p.priority) || 0
}
function focusPriorityInput(el) {
  if (!el || typeof el.focus !== 'function') return
  requestAnimationFrame(() => {
    el.focus()
    el.select?.()
  })
}
function onPriorityEditInput(e) {
  const raw = e?.target?.value
  const n = Number(raw)
  priorityEditValue.value = Number.isFinite(n) ? n : 0
}
function cancelPriorityEdit() {
  priorityEditId.value = null
}
async function commitPriorityEdit(p) {
  if (!p?.id || priorityEditId.value !== p.id || prioritySavingId.value === p.id) return
  let next = Math.round(Number(priorityEditValue.value))
  if (!Number.isFinite(next)) next = 0
  next = Math.max(0, Math.min(100, next))
  const prev = Number(p.priority) || 0
  priorityEditId.value = null
  if (next === prev) return
  prioritySavingId.value = p.id
  // Optimistic UI
  const idx = items.value.findIndex((x) => x.id === p.id)
  if (idx >= 0) items.value[idx] = { ...items.value[idx], priority: next }
  try {
    await api.patch(`/admin/posts/${p.id}`, { priority: next })
  } catch (e) {
    if (idx >= 0) items.value[idx] = { ...items.value[idx], priority: prev }
    error.value = e.response?.data?.error || 'No se pudo cambiar la prioridad'
  } finally {
    prioritySavingId.value = null
  }
}
async function confirmReject() {
  const p = pendingReject.value
  if (!p?.id || rejecting.value) return
  const reason = rejectReason.value.trim()
  if (!reason) {
    rejectError.value = 'Indicá el motivo del rechazo (se enviará al autor)'
    return
  }
  rejectError.value = ''
  rejecting.value = true
  try {
    await api.patch(`/admin/posts/${p.id}/reject`, { reason })
    pendingReject.value = null
    await load()
  } catch (e) {
    rejectError.value = e.response?.data?.error || 'No se pudo rechazar'
  } finally {
    rejecting.value = false
  }
}
async function unapprove(p) {
  if (!p?.id || p.status !== 'published' || unapprovingId.value === p.id) return
  unapprovingId.value = p.id
  try {
    error.value = ''
    await api.patch(`/admin/posts/${p.id}`, { status: 'pending_review' })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo desaprobar'
  } finally {
    unapprovingId.value = null
  }
}
async function toDraft(p) {
  try {
    await api.patch(`/admin/posts/${p.id}`, { status: 'draft' })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo pasar a borrador'
  }
}
function askArchive(p) {
  archiveError.value = ''
  pendingArchive.value = p
}
async function confirmArchive() {
  const p = pendingArchive.value
  if (!p?.id || archiving.value) return
  archiveError.value = ''
  archiving.value = true
  try {
    // DELETE en backend = borrado lógico → status archived
    await api.delete(`/admin/posts/${p.id}`)
    pendingArchive.value = null
    await load()
  } catch (e) {
    archiveError.value = e.response?.data?.error || 'No se pudo archivar'
  } finally {
    archiving.value = false
  }
}

onMounted(async () => {
  await loadPostsConfig()
  try {
    const { data } = await api.get('/admin/org/options')
    orgAreas.value = data.areas || []
    orgGroups.value = data.groups || []
  } catch {
    orgAreas.value = []
    orgGroups.value = []
  }
  try {
    const { data } = await api.get('/admin/surveys')
    surveyOptions.value = (data.items || []).map((s) => ({
      id: s.id,
      titulo: s.titulo,
      status: s.status || '',
      questionCount: s.questionCount || 0,
    }))
  } catch {
    surveyOptions.value = []
  }
  await load()
})
</script>

<style scoped>
.pubs { width: 100%; max-width: none; color: var(--cx-text); }
.pubs-hero {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}
.pubs-hero-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.pubs-hero-top > div:first-child {
  flex: 1 1 280px;
  min-width: 0;
}
.pubs-hero h1 { margin: 0; font-size: 1.55rem; font-weight: 700; }
.pubs-hero p { margin: 6px 0 0; max-width: none; font-size: 14px; color: var(--cx-muted); line-height: 1.45; }
.pubs-hero-help {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.pubs-hero-help :deep(.screen-help) {
  margin: 0;
  flex: 1 1 auto;
  min-width: min(100%, 280px);
}
.pubs-new-btn,
.pubs-nl-btn {
  flex: 0 0 auto;
  align-self: center;
}
.pubs-hero-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}
.new-post-chooser { width: min(480px, 100%) !important; }
.new-post-options {
  display: grid;
  gap: 10px;
  padding: 8px 20px 4px;
}
.new-post-option {
  text-align: left;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
}
.new-post-option:hover {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.new-post-option.primary {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
}
.new-post-option strong {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}
.new-post-option small {
  display: block;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--cx-muted);
}
.new-post-options > p.muted {
  color: var(--cx-muted);
  font-size: 13px;
  margin: 4px 0;
}
.btn-primary { border: 0; background: var(--brand-primary); color: #fff; border-radius: 12px; padding: 11px 16px; font-weight: 700; font-size: 14px; }
.btn-ghost { border: 1px solid var(--cx-border); background: transparent; color: var(--cx-text); border-radius: 12px; padding: 11px 16px; font-weight: 600; font-size: 14px; }
.btn-ghost.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}
.nl-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 10%, transparent), transparent 55%),
    var(--cx-surface);
}
.nl-bar-main { display: grid; gap: 4px; min-width: min(100%, 320px); }
.nl-check-all {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 700; font-size: 14px; color: var(--cx-text); cursor: pointer;
}
.nl-bar-hint { margin: 0; font-size: 13px; color: var(--cx-muted); max-width: 62ch; line-height: 1.4; }
.nl-bar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-primary.sm { padding: 9px 12px; font-size: 13px; }
.row.selected, .grid-row.selected {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 7%, var(--cx-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 35%, transparent);
}
.row-check { display: grid; place-items: center; align-self: center; }
.row-check input, .check-col input, .g-check input { width: 16px; height: 16px; accent-color: var(--brand-primary); cursor: pointer; }
.check-col { width: 36px; text-align: center; }
.list .row:has(.row-check) {
  grid-template-columns: 28px 96px minmax(0, 1fr) auto;
}
@media (max-width: 700px) {
  .list .row:has(.row-check) { grid-template-columns: 28px 72px minmax(0, 1fr); }
}
.nl-sheet { width: min(640px, 100%) !important; max-height: 92vh; overflow: auto; }
.nl-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-primary);
}
.nl-body { display: grid; gap: 16px; }
.nl-section h3, .nl-sample h3 {
  margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--cx-muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.nl-posts { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.nl-posts li {
  display: grid; gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.nl-posts strong { font-size: 14px; color: var(--cx-text); }
.nl-tipo {
  font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.04em;
}
.nl-aud { font-size: 12px; color: var(--cx-muted); }
.nl-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.nl-stat {
  text-align: center;
  padding: 14px 10px;
  border-radius: 14px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
}
.nl-stat.clickable {
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.nl-stat.clickable:hover {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.nl-stat-cta {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  color: var(--brand-primary);
}
.nl-dest-section {
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--cx-surface));
}
.nl-dest-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.nl-dest-head h3 { margin: 0; }
.nl-dest-hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--cx-muted);
  line-height: 1.4;
}
.nl-rec-preview {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.nl-rec-preview li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--cx-surface);
  border: 1px solid var(--cx-border);
  font-size: 13px;
}
.nl-rec-preview li strong { font-size: 13px; }
.nl-rec-preview li span { color: var(--cx-muted); word-break: break-all; }
.nl-rec-more {
  justify-content: center;
  color: var(--brand-primary) !important;
  font-weight: 600;
  cursor: pointer;
}
.nl-stat strong { display: block; font-size: 1.45rem; color: var(--brand-primary); line-height: 1.1; }
.nl-stat span { font-size: 12px; color: var(--cx-muted); }
.nl-excluded-hint {
  margin: -6px 0 0;
  font-size: 12px;
  color: var(--warn);
  font-weight: 600;
}
.nl-recipients-overlay { z-index: 120 !important; }
.nl-recipients-panel {
  width: min(640px, 100%) !important;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px;
  border: 1px solid var(--cx-border);
}
.nl-recipients-body { display: grid; gap: 10px; max-height: calc(92vh - 160px); }
.nl-rec-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.nl-rec-toolbar .input { flex: 1; min-width: 180px; }
.nl-rec-list {
  overflow-y: auto; max-height: min(420px, 50vh);
  display: grid; gap: 6px; padding-right: 2px;
}
.nl-rec-row {
  display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 10px; align-items: start;
  padding: 10px 12px; border: 1px solid var(--cx-border); border-radius: 12px;
  background: var(--cx-surface); cursor: pointer;
}
.nl-rec-row.off { opacity: 0.55; background: color-mix(in srgb, var(--cx-page) 80%, var(--cx-surface)); }
.nl-rec-row.noemail { border-style: dashed; }
.nl-rec-row.external { border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border)); }
.nl-rec-row input { margin-top: 3px; accent-color: var(--brand-primary); }
.nl-rec-main { display: grid; gap: 2px; min-width: 0; }
.nl-rec-main strong { font-size: 14px; display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.nl-ext-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  border-radius: 6px; padding: 2px 6px;
}
.nl-add-email {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  gap: 8px; align-items: center;
}
@media (max-width: 640px) {
  .nl-add-email { grid-template-columns: 1fr; }
}
.nl-rec-email { font-size: 13px; color: var(--cx-text); word-break: break-all; }
.nl-rec-meta { font-size: 12px; color: var(--cx-muted); }
.nl-rec-foot-stats { font-size: 13px; color: var(--cx-muted); margin-right: auto; }
.nl-explain { margin: 0; font-size: 13px; line-height: 1.5; color: var(--cx-muted); }
.nl-mod-banner {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fffbeb;
  color: var(--warn);
  font-size: 13px;
  line-height: 1.45;
}
.nl-variant {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.nl-sample blockquote {
  margin: 0;
  padding: 14px 16px;
  border-left: 3px solid var(--brand-primary);
  border-radius: 0 12px 12px 0;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
  font-size: 14px;
  line-height: 1.55;
  color: var(--cx-text);
}
.nl-sample-meta { margin: 0 0 8px; font-size: 12px; color: var(--cx-muted); }
.nl-ok {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, #059669 12%, transparent);
  color: var(--ok);
  font-size: 13px;
  font-weight: 600;
}
.nl-loading { margin: 0; font-size: 13px; color: var(--brand-primary); font-weight: 600; }
.nl-foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; }
.nl-foot-right { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.ai-explain {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 8px 0 12px;
}
.ai-explain-card {
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--cx-surface);
}
.ai-explain-card strong {
  display: block;
  font-size: 13px;
  margin-bottom: 8px;
}
.ai-explain-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 4px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--cx-muted);
}
.ai-explain-card.keep {
  border-color: color-mix(in srgb, #059669 40%, var(--cx-border));
  background: color-mix(in srgb, #059669 8%, var(--cx-surface));
}
.ai-explain-card.keep strong { color: var(--ok); }
.ai-explain-card.change {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.ai-explain-card.change strong { color: var(--brand-primary); }
.ai-explain-note { margin: 0 0 14px; max-width: none; }
@media (max-width: 720px) {
  .ai-explain { grid-template-columns: 1fr; }
}
.ai-box {
  border: 1px solid color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 16px;
  display: grid;
  gap: 8px;
}
.ai-box-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.ai-box-head strong { font-size: 14px; }
.ai-turns { font-size: 11px; font-weight: 600; color: var(--cx-muted); }
.ai-box-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.ai-check { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--cx-muted); }
.ai-notes { margin: 0; font-size: 12px; color: var(--brand-primary); white-space: pre-wrap; }
.provider-row { display: flex; flex-wrap: wrap; gap: 8px; }
.provider-chip {
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
}
.provider-chip.on {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.provider-chip.disabled,
.provider-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ai-prompt-panel {
  width: min(640px, 100%);
  max-height: 92vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px;
  border: 1px solid var(--cx-border);
}
.ai-prompt-body { padding: 16px 20px; display: grid; gap: 10px; }
.btn-ghost.sm { padding: 9px 12px; font-size: 13px; }
.icon-refresh {
  display: inline-grid;
  place-items: center;
  width: 40px;
  padding-left: 0;
  padding-right: 0;
}
.icon-refresh:disabled { opacity: 0.55; }
.toolbar { display: grid; gap: 10px; margin-bottom: 14px; }
.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  position: relative;
  z-index: 3;
}
.search {
  flex: 1 1 200px;
  min-width: min(100%, 200px);
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid var(--cx-border);
  border-radius: 10px;
  overflow: hidden;
  margin-left: auto;
  flex: 0 0 auto;
  position: relative;
  z-index: 4;
  background: var(--cx-surface);
}
.view-btn {
  width: 40px;
  height: 40px;
  border: 0;
  background: var(--cx-surface);
  color: var(--cx-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: 0 0 auto;
  pointer-events: auto;
}
.view-btn:hover {
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
  color: var(--brand-primary);
}
.view-btn.on { background: var(--brand-primary); color: #fff; }
.view-btn.on:hover { background: var(--brand-primary); color: #fff; }
@media (max-width: 720px) {
  .view-toggle {
    order: -1;
    width: 100%;
    margin-left: 0;
  }
  .view-btn {
    flex: 1 1 0;
    width: auto;
    min-height: 44px;
  }
}
.cal-wrap {
  border: 1px solid var(--cx-border);
  border-radius: 16px;
  background: var(--cx-surface);
  padding: 14px;
}
.cal-toolbar {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px;
}
.cal-month {
  margin: 0; flex: 1; text-align: center; font-size: 1.05rem; font-weight: 700; text-transform: capitalize;
}
.cal-today { margin-left: auto; }
.cal-count {
  font-size: 12px;
  color: var(--cx-muted);
  font-weight: 600;
}
.cal-weekdays {
  display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px;
}
.cal-weekdays span {
  text-align: center; font-size: 11px; font-weight: 700; color: var(--cx-muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.cal-grid {
  display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px;
}
.cal-day {
  min-height: 118px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 6px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: flex; flex-direction: column; gap: 4px;
}
.cal-day.muted { opacity: 0.45; }
.cal-day.today {
  border-color: var(--brand-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 40%, transparent);
}
.cal-day-num {
  font-size: 11px; font-weight: 700; color: var(--cx-muted); line-height: 1;
}
.cal-day.today .cal-day-num { color: var(--brand-primary); }
.cal-day-posts { display: grid; gap: 4px; flex: 1; align-content: start; }
.cal-chip {
  display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 5px; align-items: center;
  width: 100%; border: 0; padding: 2px; border-radius: 8px; cursor: pointer; text-align: left;
  background: var(--cx-surface); color: var(--cx-text);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--cx-border) 80%, transparent);
}
.cal-chip:hover { box-shadow: 0 0 0 1px var(--brand-primary); }
.cal-chip.selected {
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
  box-shadow: 0 0 0 1px var(--brand-primary);
}
.cal-chip-img {
  width: 28px; height: 28px; border-radius: 6px; overflow: hidden;
  background: var(--cx-page); display: grid; place-items: center; flex-shrink: 0;
}
.cal-chip-img.lg { width: 48px; height: 48px; border-radius: 10px; }
.cal-chip-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cal-chip-fallback {
  font-size: 11px; font-weight: 800; color: var(--brand-primary);
}
.cal-chip-title {
  font-size: 11px; font-weight: 600; line-height: 1.25;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.cal-more {
  border: 0; background: transparent; color: var(--brand-primary); font-size: 11px; font-weight: 700;
  padding: 2px 4px; text-align: left; cursor: pointer;
}
.cal-empty-hint { margin: 12px 0 0; text-align: center; color: var(--cx-muted); font-size: 13px; }
.cal-day-panel { width: min(420px, 100%); }
.cal-day-list { display: grid; gap: 8px; padding-bottom: 12px; }
.cal-day-item {
  display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 10px; align-items: center;
  width: 100%; border: 1px solid var(--cx-border); border-radius: 12px; padding: 8px;
  background: var(--cx-surface); color: var(--cx-text); text-align: left; cursor: pointer;
}
.cal-day-item:hover { border-color: var(--brand-primary); }
.cal-day-item-text { display: grid; gap: 2px; }
.cal-day-item-text strong { font-size: 13px; line-height: 1.3; }
.cal-day-item-text .muted { font-size: 12px; color: var(--cx-muted); }
@media (max-width: 900px) {
  .cal-day { min-height: 96px; }
  .cal-chip-title { -webkit-line-clamp: 1; font-size: 10px; }
}
@media (max-width: 640px) {
  .cal-weekdays span:nth-child(n) { font-size: 10px; }
  .cal-chip { grid-template-columns: 22px minmax(0, 1fr); }
  .cal-chip-img { width: 22px; height: 22px; }
}
.filters { display: flex; flex-wrap: wrap; gap: 8px; }
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  position: relative;
  z-index: 1;
}
.filters-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.filters-left {
  justify-content: flex-start;
  flex: 1 1 auto;
  max-width: 100%;
}
.filters-right {
  justify-content: flex-end;
  flex: 1 1 auto;
  max-width: 100%;
}
.filters-sep {
  width: 1px;
  height: 18px;
  flex: 0 0 auto;
  background: var(--cx-border);
  margin: 0 4px;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip { border: 1px solid var(--cx-border); background: var(--cx-surface); color: var(--cx-text); border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.chip.on { border-color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel)); color: var(--brand-primary); }
.chip-sm {
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;
}
.chip.on { background: var(--brand-primary); border-color: var(--brand-primary); color: #fff; }
@media (max-width: 900px) {
  .filters-left,
  .filters-right {
    justify-content: flex-start;
    width: 100%;
  }
}
.list { display: grid; gap: 10px; }
.grid-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--cx-border);
  border-radius: 16px;
  background: var(--cx-surface);
}
.grid {
  --grid-cols: minmax(180px, 1.8fr) 96px 118px 104px 80px 118px 118px 118px 208px;
  --grid-cols-check: 40px var(--grid-cols);
  width: 100%;
  min-width: 1040px;
  font-size: 13px;
}
.grid.with-check {
  min-width: 1080px;
}
.grid-head,
.grid-row {
  display: grid;
  grid-template-columns: var(--grid-cols);
  align-items: center;
  column-gap: 0;
  min-width: 0;
}
.grid.with-check .grid-head,
.grid.with-check .grid-row {
  grid-template-columns: var(--grid-cols-check);
}
.grid-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  border-bottom: 1px solid var(--cx-border);
}
.grid-row {
  border-bottom: 1px solid var(--cx-border);
  cursor: pointer;
}
.grid-row:last-child { border-bottom: 0; }
.grid-row:hover { background: color-mix(in srgb, var(--brand-primary) 6%, transparent); }
.grid-row.selected {
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.g-th,
.g-td,
.g-check {
  min-width: 0;
  padding: 10px 12px;
  box-sizing: border-box;
}
.g-th {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--cx-text);
  font: inherit;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  text-align: left;
  padding: 10px 12px;
}
.g-th.g-acciones {
  display: flex;
  justify-content: flex-end;
  cursor: default;
}
.g-check {
  display: grid;
  place-items: center;
  padding-left: 10px;
  padding-right: 6px;
}
.g-td {
  color: var(--cx-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.g-td.g-titulo {
  white-space: normal;
  overflow: visible;
}
.g-td.g-estado {
  overflow: visible;
  white-space: normal;
}
.g-td.g-prioridad {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.g-th.g-prioridad {
  justify-content: flex-end;
}
.priority-inline-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  margin: 0;
  border-radius: 6px;
  min-width: 2.2em;
  text-align: right;
}
.priority-inline-btn:hover {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}
.priority-inline-btn:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 1px;
}
.priority-inline-input {
  width: 4.2rem;
  max-width: 100%;
  margin-left: auto;
  display: block;
  text-align: right;
  font: inherit;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--cx-border, var(--line-2));
  background: var(--cx-surface);
  color: inherit;
}
.priority-inline-input:focus {
  outline: 2px solid var(--brand-primary);
  outline-offset: 0;
  border-color: transparent;
}
.g-td.g-acciones {
  overflow: visible;
  white-space: normal;
  display: flex;
  justify-content: flex-end;
}
.grid .col-title-text { font-weight: 700; }
.grid .sortable { cursor: pointer; user-select: none; }
.grid .sortable:hover { color: var(--brand-primary); }
.sort-ind { margin-left: 4px; opacity: 0.35; font-size: 10px; }
.sort-ind.active { opacity: 1; color: var(--brand-primary); }
.title-cell-inner {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.grid-title {
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--cx-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pin-tag {
  display: inline-block; margin-top: 0; font-size: 10px; font-weight: 700;
  text-transform: uppercase; color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  border-radius: 6px; padding: 2px 6px;
}
.num { font-variant-numeric: tabular-nums; }
.grid-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 2px;
  justify-content: flex-end;
  align-items: center;
}
.grid-actions .icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
}
.link-btn {
  border: 0; background: transparent; color: var(--brand-primary); font-size: 12px; font-weight: 600;
  padding: 2px 6px; cursor: pointer;
}
.link-btn.danger { color: var(--bad); }
.row {
  position: relative;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .row { grid-template-columns: 72px minmax(0, 1fr); }
  .thumb { width: 72px; height: 72px; }
  .row-actions { grid-column: 1 / -1; justify-content: flex-end; max-width: none; }
}
.thumb {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--cx-page);
  align-self: start;
}
.thumb :deep(.pmedia) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.thumb :deep(.el),
.thumb :deep(.fallback) {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: cover;
}
.thumb-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}
.thumb-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
  padding: 2px 6px;
}
.row-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--cx-muted); align-items: center; }
.tipo { color: var(--brand-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
.status-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 3px 9px;
  line-height: 1.2;
}
.status-badge.inline {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 4px;
}
.status-badge-btn {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.status-badge-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 25%, transparent);
}
.status-badge-btn:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
.meta-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 3px 9px;
  line-height: 1.2;
  background: color-mix(in srgb, var(--ink-soft) 14%, transparent);
  color: var(--ink-soft);
}
.meta-badge[data-tipo='noticia'] { background: color-mix(in srgb, var(--brand-primary) 16%, transparent); color: var(--brand-primary); }
.meta-badge[data-tipo='aviso'] { background: color-mix(in srgb, #ea580c 16%, transparent); color: #c2410c; }
.meta-badge[data-tipo='beneficio'] { background: color-mix(in srgb, #7c3aed 14%, transparent); color: #6d28d9; }
.meta-badge[data-tipo='evento'] { background: color-mix(in srgb, #2563eb 14%, transparent); color: #1d4ed8; }
.meta-badge[data-tipo='celebracion'] { background: color-mix(in srgb, #db2777 14%, transparent); color: #be185d; }
.meta-badge[data-tipo='general'] { background: color-mix(in srgb, var(--ink-soft) 14%, transparent); color: var(--ink-soft); }
.meta-badge[data-layout='vertical'] { background: color-mix(in srgb, var(--brand-primary) 14%, transparent); color: var(--brand-primary); }
.meta-badge[data-layout='horizontal'] { background: color-mix(in srgb, #0369a1 14%, transparent); color: #0369a1; }
.meta-badge[data-layout='banner'] { background: color-mix(in srgb, var(--warn) 14%, transparent); color: var(--warn); }
.meta-badge-btn {
  border: 0;
  cursor: pointer;
  font: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.meta-badge-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 25%, transparent);
}
.meta-badge-btn:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
.status-change-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 8px 0 4px;
}
.status-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cx-border, #e5e7eb);
  background: var(--cx-surface);
  cursor: pointer;
  color: inherit;
}
.status-option small {
  font-size: 11px;
  color: var(--cx-muted);
  line-height: 1.3;
}
.status-option.on {
  border-color: color-mix(in srgb, var(--brand-primary) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-primary) 35%, transparent);
}
.status-reason {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row-status {
  margin-top: 8px;
}
.status-badge[data-status='published'] {
  background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
  color: var(--brand-primary);
}
.status-badge[data-status='scheduled'] {
  background: color-mix(in srgb, #0369a1 16%, transparent);
  color: #0369a1;
}
.status-badge[data-status='draft'] {
  background: color-mix(in srgb, #ca8a04 18%, transparent);
  color: #a16207;
}
.status-badge[data-status='pending_review'] {
  background: color-mix(in srgb, #d97706 18%, transparent);
  color: var(--warn);
}
.status-badge[data-status='rejected'] {
  background: color-mix(in srgb, var(--bad) 14%, transparent);
  color: var(--bad);
}
.status-badge[data-status='archived'] {
  background: color-mix(in srgb, var(--ink-soft) 18%, transparent);
  color: var(--ink-soft);
}
.schedule-box {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--cx-surface));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.schedule-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.schedule-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.schedule-fields-inline {
  max-width: 420px;
}
.schedule-summary {
  margin: 0;
  font-size: 14px;
  color: var(--brand-primary);
}
.schedule-conflicts {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #ca8a04 35%, var(--cx-border));
  background: color-mix(in srgb, #facc15 12%, var(--cx-surface));
  font-size: 13px;
}
.schedule-conflicts.danger {
  border-color: color-mix(in srgb, var(--bad) 40%, var(--cx-border));
  background: color-mix(in srgb, #f87171 14%, var(--cx-surface));
}
.schedule-conflicts.ok {
  border-color: color-mix(in srgb, var(--brand-primary) 30%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
  color: var(--brand-primary);
  padding: 8px 10px;
}
.schedule-conflicts.muted {
  border-style: dashed;
  color: var(--cx-muted, var(--ink-soft));
  background: transparent;
}
.schedule-conflicts-title {
  margin: 0 0 8px;
  font-weight: 700;
  color: var(--cx-text, var(--ink));
}
.schedule-conflicts-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.schedule-conflicts-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}
.schedule-conflicts-list .sev {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, #ca8a04 18%, transparent);
  color: #a16207;
}
.schedule-conflicts-list .sev[data-sev='near'] {
  background: color-mix(in srgb, var(--bad) 16%, transparent);
  color: var(--bad);
}
.schedule-conflicts-list .when,
.schedule-conflicts-list .delta {
  color: var(--cx-muted, var(--ink-soft));
  font-size: 12px;
}
.schedule-modes {
  margin-top: 8px;
}
.publish-when-bar {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--brand-primary) 5%, var(--cx-surface));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.publish-when-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}
.publish-when-title {
  font-size: 13px;
  color: var(--cx-text, var(--ink));
}
.publish-when-toggle {
  display: inline-flex;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  border-radius: 999px;
  overflow: hidden;
  background: var(--cx-surface);
}
.publish-when-btn {
  border: 0;
  background: transparent;
  color: var(--cx-muted, var(--ink-soft));
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  cursor: pointer;
}
.publish-when-btn.on {
  background: var(--brand-primary);
  color: #fff;
}
.publish-when-schedule {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.err.small {
  font-size: 13px;
  margin: 0;
}
@media (max-width: 900px) {
  .schedule-fields {
    grid-template-columns: 1fr;
  }
}
.ugc-from-member.row,
.ugc-from-member.grid-row {
  background: color-mix(in srgb, #7dd3fc 28%, var(--cx-surface));
  border-color: color-mix(in srgb, #38bdf8 35%, transparent);
}
.ugc-from-member.row:hover,
.ugc-from-member.grid-row:hover {
  background: color-mix(in srgb, #7dd3fc 38%, var(--cx-surface));
}
.ugc-from-member.row.selected,
.ugc-from-member.grid-row.selected {
  background: color-mix(in srgb, #38bdf8 32%, var(--cx-surface));
  box-shadow: inset 3px 0 0 #0284c7;
}
/* Miembro sin aprobar → amarillo */
.ugc-from-member.ugc-pending.row,
.ugc-from-member.ugc-pending.grid-row {
  background: color-mix(in srgb, #fde047 42%, var(--cx-surface));
  border-color: color-mix(in srgb, #eab308 45%, transparent);
}
.ugc-from-member.ugc-pending.row:hover,
.ugc-from-member.ugc-pending.grid-row:hover {
  background: color-mix(in srgb, #fde047 55%, var(--cx-surface));
}
.ugc-from-member.ugc-pending.row.selected,
.ugc-from-member.ugc-pending.grid-row.selected {
  background: color-mix(in srgb, #facc15 48%, var(--cx-surface));
  box-shadow: inset 3px 0 0 #ca8a04;
}
.ugc-from-member.ugc-pending .ugc-person {
  background: #ca8a04;
  box-shadow: 0 1px 4px color-mix(in srgb, #ca8a04 40%, transparent);
}
/* Riesgo alto IA → card roja (prioridad sobre pendiente amarillo) */
.ugc-from-member.ugc-risk-high.row,
.ugc-from-member.ugc-risk-high.grid-row {
  background: color-mix(in srgb, #fca5a5 48%, var(--cx-surface));
  border-color: color-mix(in srgb, var(--bad) 50%, transparent);
}
.ugc-from-member.ugc-risk-high.row:hover,
.ugc-from-member.ugc-risk-high.grid-row:hover {
  background: color-mix(in srgb, #f87171 42%, var(--cx-surface));
}
.ugc-from-member.ugc-risk-high.row.selected,
.ugc-from-member.ugc-risk-high.grid-row.selected {
  background: color-mix(in srgb, #f87171 50%, var(--cx-surface));
  box-shadow: inset 3px 0 0 var(--bad);
}
.ugc-from-member.ugc-risk-high .ugc-person {
  background: var(--bad);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--bad) 40%, transparent);
}
.ugc-person {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #0284c7;
  color: #fff;
  box-shadow: 0 1px 4px color-mix(in srgb, #0284c7 40%, transparent);
}
.ugc-person-inline {
  position: static;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.risk-tag {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.risk-tag[data-risk='low'] {
  background: color-mix(in srgb, #16a34a 16%, transparent);
  color: #15803d;
}
.risk-tag[data-risk='medium'] {
  background: color-mix(in srgb, #d97706 18%, transparent);
  color: var(--warn);
}
.risk-tag[data-risk='high'] {
  background: color-mix(in srgb, var(--bad) 16%, transparent);
  color: var(--bad);
}
.risk-tag.pending {
  background: color-mix(in srgb, var(--ink-soft) 16%, transparent);
  color: var(--ink-soft);
  text-transform: none;
}
.ai-alert {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bad) 10%, transparent);
  color: var(--bad);
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.mod-ai {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-muted) 6%, transparent);
}
.mod-ai-loading {
  color: var(--cx-muted);
}
.grid-mod-ai {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-muted) 6%, transparent);
  font-size: 12px;
  line-height: 1.35;
  color: var(--cx-text);
}
.grid-mod-ai .mod-ai-summary {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mod-ai[data-risk='high'] {
  border-color: color-mix(in srgb, var(--bad) 40%, transparent);
  background: color-mix(in srgb, var(--bad) 8%, transparent);
}
.mod-ai[data-risk='medium'] {
  border-color: color-mix(in srgb, #d97706 40%, transparent);
  background: color-mix(in srgb, #d97706 8%, transparent);
}
.mod-ai[data-risk='low'] {
  border-color: color-mix(in srgb, #16a34a 35%, transparent);
  background: color-mix(in srgb, #16a34a 7%, transparent);
}
.mod-ai-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}
.mod-ai-score {
  margin-left: 6px;
  font-weight: 500;
  opacity: 0.75;
}
.mod-ai-summary {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
}
.mod-ai-reasons {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--cx-muted);
}
.mod-ai-flags {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--cx-muted);
}
.policy-flag {
  font-weight: 700;
  font-family: ui-monospace, monospace;
}
.mod-ai-err {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--warn);
}
.reject-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--bad);
}
.icon-btn.ok {
  color: var(--brand-primary);
}
.row h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.excerpt {
  margin: 0;
  font-size: 13px;
  color: var(--cx-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
  justify-content: flex-end;
  max-width: 180px;
}
.icon-btn {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--cx-border);
  background: var(--cx-input); color: var(--cx-text); display: grid; place-items: center;
}
.icon-btn:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.icon-btn.danger:hover { border-color: var(--bad); color: var(--bad); }
.icon-btn:disabled { opacity: 0.55; cursor: wait; }
.icon-btn .spin { animation: cx-spin 0.8s linear infinite; }
@keyframes cx-spin { to { transform: rotate(360deg); } }
.empty { text-align: center; color: var(--cx-muted); padding: 28px; font-size: 14px; }
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: var(--cx-surface);
}
.pager-meta {
  margin: 0;
  font-size: 13px;
  color: var(--cx-muted);
}
.pager-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pager-pages {
  font-size: 13px;
  font-weight: 600;
  color: var(--cx-text);
  min-width: 7.5rem;
  text-align: center;
}
.pager-size {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: 4px;
  font-size: 12px;
  color: var(--cx-muted);
}
.pager-size select {
  width: auto;
  min-width: 4.5rem;
}
.err { color: var(--bad); background: var(--bad-bg); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 0 0 12px; }

.sheet {
  position: fixed; inset: 0; z-index: 70; background: rgba(15, 23, 42, 0.5);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.sheet-panel, .viewer-panel {
  width: min(1120px, 100%);
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px;
  border: 1px solid var(--cx-border);
}
.editor-panel {
  width: min(1600px, calc(100vw - 24px));
  height: calc(100vh - 24px);
  max-height: calc(100vh - 24px);
}
.viewer-panel { width: min(480px, 100%); }
.sheet-head {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 18px 20px 12px; border-bottom: 1px solid var(--cx-border);
  flex-shrink: 0;
}
.sheet-head h2 { margin: 0; font-size: 1.25rem; }
.sheet-head p { margin: 4px 0 0; font-size: 13px; color: var(--cx-muted); max-width: 60ch; }
.editor-head {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(0, 2fr) minmax(140px, 1fr);
  align-items: center;
  gap: 12px 16px;
  padding: 14px 20px;
}
.editor-head-left h2 {
  margin: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}
.editor-head-title {
  margin: 0 !important;
  max-width: none !important;
  text-align: center;
  font-size: 15px !important;
  font-weight: 700;
  color: var(--cx-text) !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.editor-head-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
@media (max-width: 720px) {
  .editor-head {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'left right'
      'title title';
  }
  .editor-head-left { grid-area: left; }
  .editor-head-right { grid-area: right; }
  .editor-head-title {
    grid-area: title;
    text-align: left;
  }
}

.editor-split {
  display: grid;
  grid-template-columns: 20% 80%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.editor-nav {
  border-right: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
  padding: 10px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.editor-nav-item {
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cx-text);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
}
.editor-nav-item:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.editor-nav-item.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--cx-surface));
}
.editor-nav-item strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
}
.editor-nav-item small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--cx-muted);
  line-height: 1.3;
}
.editor-detail {
  padding: 16px 24px 20px;
  overflow-y: auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.editor-section {
  width: 100%;
  max-width: none;
}
.editor-section-contenido {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.editor-section-contenido .field-cuerpo {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}
.editor-section-contenido .input-cuerpo {
  flex: 1;
  min-height: 220px;
  height: 100%;
  resize: none;
}
.editor-section-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
}
.editor-section .type-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.editor-section .layout-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.editor-section .media-type-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.editor-section .audience-modes {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.editor-section .field-row {
  grid-template-columns: 1fr 1fr;
}
.editor-section .display-row {
  grid-template-columns: minmax(0, 1fr) minmax(160px, 220px);
}
.display-checks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.display-checks .check {
  margin-bottom: 0;
  align-items: center;
}
.editor-section .ai-box {
  max-width: none;
}
.editor-section .media-admin-preview {
  max-height: 320px;
}
.media-admin-preview-video {
  max-height: none;
  aspect-ratio: 16 / 9;
  max-height: 420px;
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--ink);
}
.media-admin-preview-video :deep(.pmedia) {
  min-height: 0;
  height: 100%;
}
.media-preview-label {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--line);
  background: var(--ink);
}
.audio-admin-preview {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.audio-admin-preview .media-preview-label {
  padding: 0;
  color: var(--cx-text);
  background: transparent;
}
.audio-player {
  width: 100%;
  height: 40px;
}
.media-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
  margin-top: 8px;
}
.media-split-col {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
}
.media-split-heading {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
.media-split-col .media-type-grid {
  margin-top: 0;
}
.media-type-row {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 6px !important;
}
.type-card-compact {
  padding: 7px 8px !important;
  border-radius: 10px !important;
  min-width: 0;
}
.type-card-compact strong {
  font-size: 12px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.type-card-compact small {
  font-size: 10px !important;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 640px) {
  .media-type-row {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
.media-split-col .input {
  margin-top: 0;
}
.formato-preview {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: flex;
  justify-content: center;
}
.elementos-split {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  margin-top: 12px;
  align-items: start;
}
.elementos-checks {
  min-width: 0;
}
.elementos-preview {
  padding: 16px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: flex;
  justify-content: center;
  position: sticky;
  top: 0;
}
@media (max-width: 900px) {
  .elementos-split { grid-template-columns: 1fr; }
  .elementos-preview { position: static; }
}
.tipo-consequence {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: grid;
  gap: 10px;
}
.tipo-consequence-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.tipo-consequence-head strong { font-size: 15px; }
.tipo-consequence-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  color: var(--brand-primary);
}
.tipo-consequence-lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted);
}
.tipo-consequence-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.tipo-consequence-label {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
}
.tipo-consequence-label.change { color: var(--brand-primary); }
.tipo-consequence-label.keep { color: var(--ok); }
.tipo-consequence-cols ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 4px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--cx-muted);
}
@media (max-width: 720px) {
  .tipo-consequence-cols { grid-template-columns: 1fr; }
}
.pub-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 8px;
  align-items: start;
}
.pub-split-col {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
}
.encuesta-split {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.4fr);
  gap: 16px;
  margin-top: 12px;
  align-items: start;
}
.encuesta-pick {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
}
.encuesta-detail {
  min-width: 0;
  min-height: 160px;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: var(--cx-surface);
}
.encuesta-empty {
  display: grid;
  place-items: center;
  min-height: 140px;
}
.encuesta-card { display: grid; gap: 10px; }
.encuesta-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.encuesta-card-head strong { font-size: 15px; }
.encuesta-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted);
}
.encuesta-meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}
.encuesta-meta li {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--cx-surface));
  color: var(--brand-primary);
}
.encuesta-questions { display: grid; gap: 8px; }
.encuesta-q-title { font-size: 13px; }
.encuesta-questions ol {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 8px;
}
.encuesta-questions li {
  font-size: 13px;
  line-height: 1.35;
}
.encuesta-questions small {
  display: block;
  margin-top: 2px;
  color: var(--cx-muted);
  font-size: 11.5px;
}
@media (max-width: 900px) {
  .pub-split,
  .encuesta-split,
  .media-split { grid-template-columns: 1fr; }
}
.editor-foot {
  flex-shrink: 0;
  justify-content: flex-end;
  background: var(--cx-surface);
}
.draft-preview-sheet { z-index: 85; }

@media (max-width: 860px) {
  .editor-split {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .editor-nav {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--cx-border);
    padding: 8px;
    gap: 6px;
  }
  .editor-nav-item {
    flex: 0 0 auto;
    min-width: 8.5rem;
  }
  .editor-nav-item small { display: none; }
}

.sheet-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
@media (max-width: 960px) {
  .sheet-grid { grid-template-columns: 1fr; }
  .phone-wrap { border-left: 0; border-top: 1px solid var(--cx-border); }
}
.sheet-form {
  padding: 16px 20px;
  overflow-y: auto;
  max-height: calc(92vh - 140px);
}
.phone-wrap {
  border-left: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 75%, var(--cx-surface));
  padding: 16px;
  overflow-y: auto;
  max-height: calc(92vh - 140px);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.viewer-body { padding: 16px; display: flex; justify-content: center; overflow-y: auto; }

.field { display: grid; gap: 4px; margin-bottom: 14px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
label, .label-text { font-size: 14px; font-weight: 700; }
.hint { margin: 0; font-size: 12.5px; line-height: 1.4; color: var(--cx-muted); }
.input {
  width: 100%; border: 1px solid var(--cx-border); background: var(--cx-input);
  color: var(--cx-text); border-radius: 12px; padding: 11px 12px; font-size: 14px;
}
textarea.input { resize: vertical; min-height: 110px; }
.type-grid, .layout-grid, .media-type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.media-type-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 720px) {
  .media-type-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.layout-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.media-admin-preview {
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--cx-border);
  aspect-ratio: 16 / 9;
  max-height: 220px;
  background: #000;
}
.carousel-editor {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}
.dropzone {
  border: 1.5px dashed var(--cx-border);
  border-radius: 14px;
  padding: 18px 14px;
  text-align: center;
  cursor: pointer;
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--cx-surface));
  display: grid;
  gap: 4px;
}
.dropzone.over {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
}
.dropzone.busy { opacity: 0.65; pointer-events: none; }
.dropzone strong { font-size: 13px; }
.dropzone small { font-size: 11px; color: var(--cx-muted); }
.carousel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.carousel-item {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 8px;
  background: var(--cx-input);
}
.carousel-item img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--ink);
}
.carousel-item-meta { min-width: 0; display: grid; gap: 6px; }
.carousel-item-meta code {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cx-muted);
}
.carousel-item-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.carousel-add-url {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.url-with-search {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
@media (max-width: 640px) {
  .url-with-search {
    grid-template-columns: 1fr;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.type-card, .layout-card {
  text-align: left; border: 1px solid var(--cx-border); background: var(--cx-input);
  border-radius: 12px; padding: 10px 12px; color: var(--cx-text);
}
.type-card.on, .layout-card.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--cx-surface));
}
.type-card strong, .layout-card strong { display: block; font-size: 13px; }
.type-card small, .layout-card small { display: block; margin-top: 2px; font-size: 11px; color: var(--cx-muted); }
.check {
  display: flex; gap: 10px; align-items: flex-start; padding: 12px;
  border: 1px solid var(--cx-border); border-radius: 12px; margin-bottom: 8px;
}
.audience-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.audience-modes-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 1100px) {
  .audience-modes-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.audience-picks { display: grid; gap: 12px; margin-top: 10px; padding: 10px; border: 1px solid var(--cx-border); border-radius: 12px; }
.audience-note {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
}
.audience-users {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: grid;
  gap: 10px;
}
.audience-user-search { display: grid; }
.audience-user-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.audience-user-add {
  width: 100%;
  text-align: left;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 10px;
  padding: 8px 10px;
  color: var(--cx-text);
  cursor: pointer;
}
.audience-user-add:hover:not(:disabled) {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.audience-user-add:disabled { opacity: 0.5; cursor: default; }
.audience-user-add strong { display: block; font-size: 13px; }
.audience-user-add small { display: block; margin-top: 2px; font-size: 11px; color: var(--cx-muted); }
.audience-user-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.audience-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--cx-surface));
  color: var(--brand-primary);
}
.audience-chip-x {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.check-inline { display: flex; gap: 8px; align-items: center; font-size: 13px; margin-top: 4px; }
.display-grid { display: grid; gap: 8px; margin-top: 8px; }
.display-row {
  display: grid; grid-template-columns: 1fr minmax(140px, 180px); gap: 8px; align-items: center;
  font-size: 13px;
}
.input.sm { padding: 8px 10px; font-size: 13px; }
.type-config-panel {
  width: min(1100px, 100%);
  max-height: min(92vh, 900px);
}
.type-config-body {
  padding: 16px 20px;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.type-config-split {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(280px, 4fr);
  gap: 18px;
  align-items: start;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.type-config-main {
  min-width: 0;
  overflow-y: auto;
  max-height: calc(92vh - 160px);
  padding-right: 4px;
}
.type-config-fields { margin-top: 12px; }
.type-config-preview {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  max-height: calc(92vh - 160px);
  position: sticky;
  top: 0;
}
@media (max-width: 900px) {
  .type-config-split {
    grid-template-columns: 1fr;
    overflow: auto;
    max-height: calc(92vh - 160px);
  }
  .type-config-main,
  .type-config-preview {
    max-height: none;
    position: static;
  }
}
.check strong { display: block; font-size: 14px; }
.check small { display: block; margin-top: 2px; font-size: 12px; color: var(--cx-muted); }
.sheet-foot {
  display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px;
  padding: 12px 20px 16px; border-top: 1px solid var(--cx-border);
  flex-shrink: 0;
}
.confirm-sheet { z-index: 80; }
.confirm-panel {
  width: min(440px, 100%);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px;
  border: 1px solid var(--cx-border);
  display: flex;
  flex-direction: column;
}
.confirm-body { padding: 8px 20px 4px; }
.confirm-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}
.btn-danger {
  border: 0;
  background: var(--bad);
  color: #fff;
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 700;
  font-size: 14px;
}
.btn-danger:disabled { opacity: 0.65; cursor: not-allowed; }
</style>
