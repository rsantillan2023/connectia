<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head-title">
        <h1>Documentos</h1>
        <ScreenHelp
          purpose="ABM de documentos corporativos visibles en Mis documentos de la app."
          can-do="Crear/editar con tipo y repositorio; al subir archivo en nuevo doc la IA completa el formulario en borrador; audiencia; configurar almacenamiento externo; import ZIP; demo multicarpeta; sync SAP; firma y reporte."
        />
      </div>
      <p class="page-head-sum">
        Biblioteca por carpetas y subcarpetas. Los miembros las ven igual en Mis documentos.
      </p>
      <div class="head-actions">
        <span class="head-actions-spacer" aria-hidden="true" />
        <button
          type="button"
          class="btn-ghost seed-icon-btn"
          :disabled="seedBusy"
          title="Cargar demo multicarpeta (idempotente)"
          aria-label="Cargar demo"
          @click="runSeedDemo"
        >
          <svg
            v-if="seedBusy"
            class="seed-spin"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" opacity=".25" />
            <path d="M21 12a9 9 0 00-9-9" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v3" />
            <path d="M12 18v3" />
            <path d="M3 12h3" />
            <path d="M18 12h3" />
            <path d="M5.6 5.6l2.1 2.1" />
            <path d="M16.3 16.3l2.1 2.1" />
            <path d="M5.6 18.4l2.1-2.1" />
            <path d="M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button type="button" class="btn-primary" @click="openNew">Nuevo documento</button>
        <div ref="headMoreRef" class="head-more">
          <button
            type="button"
            class="btn-ghost"
            :aria-expanded="headMoreOpen ? 'true' : 'false'"
            aria-haspopup="menu"
            @click="headMoreOpen = !headMoreOpen"
          >
            + opciones
          </button>
          <div
            v-if="headMoreOpen"
            class="head-more-menu"
            role="menu"
            aria-label="Más opciones de documentos"
          >
            <button type="button" class="head-more-item" role="menuitem" @click="runHeadMore(openDropPanel)">
              {{ dropConfigButtonLabel }}
            </button>
            <button type="button" class="head-more-item" role="menuitem" @click="runHeadMore(openZipPersonalPanel)">
              Importar ZIP con patrón
            </button>
            <button type="button" class="head-more-item" role="menuitem" @click="runHeadMore(openZipLibraryPanel)">
              Importar ZIP biblioteca
            </button>
            <button type="button" class="head-more-item" role="menuitem" @click="runHeadMore(loadReport)">
              Reporte descargas
            </button>
            <button
              v-if="sapConfigured"
              type="button"
              class="head-more-item"
              role="menuitem"
              :disabled="sapSyncing"
              @click="runHeadMore(syncSap)"
            >
              {{ sapSyncing ? 'Sincronizando SAP…' : 'Sync SAP' }}
            </button>
          </div>
        </div>
      </div>
    </header>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="seedMsg" class="ok-msg">{{ seedMsg }}</p>

    <nav class="docs-crumb" aria-label="Ubicación">
      <button type="button" class="crumb-link" :class="{ current: !currentPath && !searchQ.trim() }" @click="goRoot">
        Documentos
      </button>
      <template v-for="(seg, i) in pathSegments" :key="seg.path">
        <span class="crumb-sep" aria-hidden="true">/</span>
        <button
          type="button"
          class="crumb-link"
          :class="{ current: i === pathSegments.length - 1 && !searchQ.trim() }"
          @click="openFolder(seg.path)"
        >
          {{ seg.label }}
        </button>
      </template>
      <template v-if="searchQ.trim()">
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span class="crumb-current">Búsqueda</span>
      </template>
    </nav>

    <div class="docs-toolbar">
      <input
        v-model="searchQ"
        type="search"
        class="docs-search"
        :placeholder="currentPath ? 'Buscar en esta carpeta…' : 'Buscar en todas las carpetas…'"
      />
      <div class="docs-filters">
        <select v-model="statusFilter" class="docs-filter" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="published">Publicado</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivado</option>
        </select>
        <select v-model="typeFilter" class="docs-filter" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option v-for="t in fileTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <div v-if="showFilesView" class="view-toggle" role="group" aria-label="Vista de archivos">
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ on: filesView === 'cards' }"
            title="Vista cards"
            aria-label="Vista cards"
            @click="filesView = 'cards'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ on: filesView === 'grid' }"
            title="Vista grilla"
            aria-label="Vista grilla"
            @click="filesView = 'grid'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <p class="docs-count">{{ browserSubtitle }}</p>

    <!-- Carpetas -->
    <div v-if="showFoldersView" class="folder-grid">
      <button
        v-if="showParentFolder"
        type="button"
        class="folder-card folder-card--up"
        title="Subir a la carpeta anterior"
        @click="goParent"
      >
        <span class="folder-visual folder-visual--up" aria-hidden="true">
          <span class="folder-up-glyph">..</span>
        </span>
        <span class="folder-meta">
          <strong>{{ parentFolderLabel }}</strong>
          <small>Carpeta anterior</small>
        </span>
      </button>
      <button
        v-for="f in displayFolders"
        :key="f.path"
        type="button"
        class="folder-card"
        @click="openFolder(f.path)"
      >
        <span class="folder-visual" aria-hidden="true">
          <span class="folder-tab" />
          <span class="folder-body-shape" />
          <span v-if="f.subCount" class="folder-badge">{{ f.subCount }}</span>
        </span>
        <span class="folder-meta">
          <strong>{{ f.label }}</strong>
          <small>
            {{ f.fileCount }} {{ f.fileCount === 1 ? 'archivo' : 'archivos' }}
            <template v-if="f.subCount">
              · {{ f.subCount }} {{ f.subCount === 1 ? 'subcarpeta' : 'subcarpetas' }}
            </template>
          </small>
        </span>
      </button>
      <button
        v-if="showAddInFolder"
        type="button"
        class="folder-card folder-card--add"
        :title="`Nuevo archivo en ${folderLabel(currentPath)}`"
        @click="openNew"
      >
        <span class="folder-visual folder-visual--add" aria-hidden="true">
          <span class="folder-add-glyph">+</span>
        </span>
        <span class="folder-meta">
          <strong>Nuevo archivo</strong>
          <small>En {{ folderLabel(currentPath) }}</small>
        </span>
      </button>
      <button
        v-if="showAddFolder"
        type="button"
        class="folder-card folder-card--add folder-card--add-folder"
        :title="currentPath ? `Nueva carpeta en ${folderLabel(currentPath)}` : 'Nueva carpeta en la raíz'"
        @click="openNewFolder"
      >
        <span class="folder-visual folder-visual--add-folder" aria-hidden="true">
          <span class="folder-tab" />
          <span class="folder-body-shape" />
          <span class="folder-add-plus">+</span>
        </span>
        <span class="folder-meta">
          <strong>Nueva carpeta</strong>
          <small>{{ currentPath ? `En ${folderLabel(currentPath)}` : 'En la raíz' }}</small>
        </span>
      </button>
      <p v-if="!displayFolders.length && !items.length && !showParentFolder" class="docs-empty">
        Todavía no hay documentos. Creá una carpeta o el primer archivo con “Nuevo documento”.
      </p>
      <p v-else-if="!displayFolders.length && !showParentFolder" class="docs-empty">
        {{ statusFilter || typeFilter ? 'Ninguna carpeta tiene documentos con estos filtros.' : 'No hay carpetas acá.' }}
      </p>
    </div>

    <!-- Barra masiva: debajo de carpetas, arriba de la grilla de archivos -->
    <div
      v-if="showFilesView && selectableFiles.length"
      class="docs-bulk-bar"
      :class="{ 'docs-bulk-bar--active': selectedIds.length }"
      role="region"
      aria-label="Acciones sobre archivos"
    >
      <div class="docs-bulk-left">
        <label class="docs-bulk-check">
          <input
            type="checkbox"
            :checked="allSelectableSelected"
            :indeterminate.prop="someSelectableSelected && !allSelectableSelected"
            @change="toggleSelectAllSelectable"
          />
          <span class="docs-bulk-check-text">
            <template v-if="selectedIds.length">
              <strong>{{ selectedIds.length }}</strong>
              seleccionado{{ selectedIds.length === 1 ? '' : 's' }}
            </template>
            <template v-else>
              Seleccionar todos
              <small>({{ selectableFiles.length }})</small>
            </template>
          </span>
        </label>
      </div>

      <div v-if="selectedIds.length" class="docs-bulk-actions">
        <div class="docs-bulk-group" role="group" aria-label="Cambiar estado">
          <span class="docs-bulk-group-label">Estado</span>
          <div class="docs-bulk-status-pills">
            <button
              type="button"
              class="docs-bulk-pill"
              data-status="draft"
              :disabled="bulkBusy"
              @click="onBulkStatusChange('draft')"
            >Borrador</button>
            <button
              type="button"
              class="docs-bulk-pill"
              data-status="published"
              :disabled="bulkBusy"
              @click="onBulkStatusChange('published')"
            >Publicar</button>
            <button
              type="button"
              class="docs-bulk-pill"
              data-status="archived"
              :disabled="bulkBusy"
              @click="onBulkStatusChange('archived')"
            >Archivar</button>
          </div>
        </div>

        <span class="docs-bulk-sep" aria-hidden="true" />

        <button
          type="button"
          class="docs-bulk-btn"
          :disabled="bulkBusy"
          title="Descargar ZIP"
          @click="bulkDownload"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          {{ bulkBusyAction === 'download' ? 'Descargando…' : 'Descargar' }}
        </button>
        <button
          type="button"
          class="docs-bulk-btn"
          :disabled="bulkBusy"
          title="Mover a otra carpeta"
          @click="openBulkMove"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 7h7l2 2h9v10a2 2 0 01-2 2H3z" />
            <path d="M3 7V5a2 2 0 012-2h4l2 2" />
          </svg>
          Mover
        </button>
        <button
          type="button"
          class="docs-bulk-btn"
          :disabled="bulkBusy"
          title="Copiar seleccionados"
          @click="askBulkCopy"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copiar
        </button>
        <button
          type="button"
          class="docs-bulk-btn docs-bulk-btn--danger"
          :disabled="bulkBusy"
          title="Borrar seleccionados"
          @click="askBulkDelete"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
          Borrar
        </button>

        <button
          type="button"
          class="docs-bulk-clear"
          :disabled="bulkBusy"
          title="Quitar selección"
          aria-label="Limpiar selección"
          @click="clearSelection"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Archivos: cards -->
    <div
      v-if="showFilesView && filesView === 'cards'"
      class="file-board"
      data-view="cards"
    >
      <article
        v-for="d in visibleFiles"
        :key="d.id"
        class="file-card"
        :class="{ selected: isSelected(d.id) }"
        @click="edit(d)"
      >
        <label class="file-select" @click.stop>
          <input
            type="checkbox"
            :checked="isSelected(d.id)"
            :aria-label="`Seleccionar ${d.titulo}`"
            @change="toggleSelect(d.id)"
          />
        </label>
        <div class="file-visual" :data-type="d.fileType" aria-hidden="true">
          <span class="file-glyph">{{ typeGlyph(d.fileType) }}</span>
          <span class="status-dot" :data-status="d.status" :title="statusLabel(d.status)" />
        </div>
        <div class="file-meta">
          <strong>{{ d.titulo }}</strong>
          <small>
            <span class="status-pill" :data-status="d.status">{{ statusLabel(d.status) }}</span>
            · {{ d.fileTypeLabel || d.fileType || 'Archivo' }}
          </small>
          <small class="file-meta-row">
            <span :title="docDateFull(d)">{{ docDateLabel(d) }}</span>
            · <span>{{ docOwnerLabel(d) }}</span>
          </small>
          <small class="file-meta-row" :title="audienceLabel(d)">
            Audiencia: {{ audienceLabel(d) }}
          </small>
          <small class="file-meta-extra">
            {{ d.downloadCount || 0 }} descargas
            <template v-if="d.requiresSignature"> · {{ d.signatureCount || 0 }} firma(s)</template>
            <template v-if="d.repositoryLabel || d.repository"> · {{ d.repositoryLabel || d.repository }}</template>
            <template v-if="d.repository === 'sap' || d.source === 'sap'"> · SAP</template>
            <template v-if="d.source === 'drop'"> · Bandeja</template>
          </small>
          <small v-if="searchQ.trim()" class="file-path-line">
            <button type="button" class="path-link" @click.stop="openFolder(d.category)">
              {{ folderPathLabel(d.category) }}
            </button>
          </small>
        </div>
        <div class="file-card-actions" @click.stop>
          <select
            class="status-action"
            :value="d.status"
            :disabled="statusBusyId === d.id"
            title="Cambiar estado"
            aria-label="Cambiar estado"
            @change="setDocStatus(d, $event.target.value)"
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
          <button
            type="button"
            class="icon-action"
            title="Vista previa"
            aria-label="Vista previa"
            :disabled="!d.fileUrl"
            @click="openPreview(d)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button type="button" class="icon-action" title="Editar" aria-label="Editar" @click="edit(d)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button type="button" class="icon-action" title="Copiar" aria-label="Copiar" @click="duplicate(d)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <button type="button" class="icon-action danger" title="Borrar" aria-label="Borrar" @click="remove(d)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </article>
    </div>

    <!-- Archivos: grilla (tabla) -->
    <div v-if="showFilesView && filesView === 'grid'" class="files-table-wrap">
      <table class="files-table">
        <thead>
          <tr>
            <th class="th-check">
              <input
                type="checkbox"
                :checked="allSelectableSelected"
                :indeterminate.prop="someSelectableSelected && !allSelectableSelected"
                :disabled="!selectableFiles.length"
                aria-label="Seleccionar todos"
                @change="toggleSelectAllSelectable"
                @click.stop
              />
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'titulo' ? '1' : '0'" @click="toggleSort('titulo')">
                Título {{ sortMark('titulo') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'fileType' ? '1' : '0'" @click="toggleSort('fileType')">
                Tipo de archivo {{ sortMark('fileType') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'status' ? '1' : '0'" @click="toggleSort('status')">
                Estado {{ sortMark('status') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'date' ? '1' : '0'" @click="toggleSort('date')">
                Fecha {{ sortMark('date') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'owner' ? '1' : '0'" @click="toggleSort('owner')">
                Dueño {{ sortMark('owner') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'audience' ? '1' : '0'" @click="toggleSort('audience')">
                Audiencia {{ sortMark('audience') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'category' ? '1' : '0'" @click="toggleSort('category')">
                Carpeta {{ sortMark('category') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'repository' ? '1' : '0'" @click="toggleSort('repository')">
                Repositorio {{ sortMark('repository') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'signature' ? '1' : '0'" @click="toggleSort('signature')">
                Firma {{ sortMark('signature') }}
              </button>
            </th>
            <th>
              <button type="button" class="th-sort" :data-on="sortKey === 'downloads' ? '1' : '0'" @click="toggleSort('downloads')">
                Descargas {{ sortMark('downloads') }}
              </button>
            </th>
            <th class="th-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in pagedFiles" :key="d.id" :class="{ selected: isSelected(d.id) }" @click="edit(d)">
            <td class="td-check" @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(d.id)"
                :aria-label="`Seleccionar ${d.titulo}`"
                @change="toggleSelect(d.id)"
              />
            </td>
            <td>
              <div class="td-title">
                <span class="file-visual sm" :data-type="d.fileType" aria-hidden="true">{{ typeGlyph(d.fileType) }}</span>
                <span class="td-title-text" :title="d.titulo">{{ d.titulo }}</span>
              </div>
            </td>
            <td>
              <span class="type-pill" :data-type="d.fileType">{{ d.fileTypeLabel || d.fileType || '—' }}</span>
            </td>
            <td><span class="status-pill" :data-status="d.status">{{ statusLabel(d.status) }}</span></td>
            <td :title="docDateFull(d)">{{ docDateLabel(d) }}</td>
            <td :title="docOwnerLabel(d)">{{ docOwnerLabel(d) }}</td>
            <td>
              <span class="audience-chip-cell" :title="audienceLabel(d)">{{ audienceLabel(d) }}</span>
            </td>
            <td>
              <button type="button" class="path-link" @click.stop="openFolder(d.category)">
                {{ folderPathLabel(d.category) }}
              </button>
            </td>
            <td>{{ d.repositoryLabel || d.repository || '—' }}</td>
            <td>{{ d.requiresSignature ? `${d.signatureCount || 0} firma(s)` : 'No' }}</td>
            <td>{{ d.downloadCount || 0 }}</td>
            <td class="td-actions" @click.stop>
              <select
                class="status-action"
                :value="d.status"
                :disabled="statusBusyId === d.id"
                title="Cambiar estado"
                aria-label="Cambiar estado"
                @change="setDocStatus(d, $event.target.value)"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
              <button
                type="button"
                class="icon-action"
                title="Vista previa"
                aria-label="Vista previa"
                :disabled="!d.fileUrl"
                @click="openPreview(d)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button type="button" class="icon-action" title="Editar" aria-label="Editar" @click="edit(d)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
              <button type="button" class="icon-action" title="Copiar" aria-label="Copiar" @click="duplicate(d)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              <button type="button" class="icon-action danger" title="Borrar" aria-label="Borrar" @click="remove(d)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="sortedFiles.length" class="files-pager">
        <span class="pager-info">
          {{ pagerFrom }}–{{ pagerTo }} de {{ sortedFiles.length }}
        </span>
        <label class="pager-size">
          Por página
          <select v-model.number="pageSize" class="docs-filter pager-select">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </label>
        <div class="pager-btns">
          <button type="button" class="btn-ghost sm" :disabled="page <= 1" @click="page -= 1">Anterior</button>
          <span class="pager-page">{{ page }} / {{ totalPages }}</span>
          <button type="button" class="btn-ghost sm" :disabled="page >= totalPages" @click="page += 1">Siguiente</button>
        </div>
      </div>
    </div>

    <p v-if="showFilesView && !visibleFiles.length" class="docs-empty">
      {{ searchQ.trim() ? 'No hay resultados.' : 'Esta carpeta no tiene archivos acá (puede tener solo subcarpetas).' }}
    </p>

    <Teleport to="body">
    <div
      v-if="reportOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Reporte de descargas"
      @click.self="closeReport"
      @keydown.escape.prevent="closeReport"
    >
      <div class="panel panel-wide panel-report">
        <div class="panel-head">
          <div>
            <h2>Reporte de descargas</h2>
            <p class="hint">
              Total: {{ report?.totalDownloads ?? 0 }} descargas
              <template v-if="report?.dateFiltered"> en el período</template>
              · {{ reportFiltered.length }} documento{{ reportFiltered.length === 1 ? '' : 's' }}
              <template v-if="reportFiltersActive"> (filtrado)</template>
            </p>
          </div>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeReport">×</button>
        </div>

        <div class="report-toolbar">
          <input
            v-model="reportSearch"
            type="search"
            class="input report-search"
            placeholder="Buscar por título o carpeta…"
          />
          <label class="report-date">
            Desde
            <input v-model="reportFrom" type="date" class="docs-filter" @change="reloadReportDates" />
          </label>
          <label class="report-date">
            Hasta
            <input v-model="reportTo" type="date" class="docs-filter" @change="reloadReportDates" />
          </label>
          <select v-model="reportStatusFilter" class="docs-filter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
            <option value="archived">Archivado</option>
          </select>
          <select v-model="reportTypeFilter" class="docs-filter" aria-label="Filtrar por tipo">
            <option value="">Todos los tipos</option>
            <option v-for="t in reportTypeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
          <select v-model="reportRepoFilter" class="docs-filter" aria-label="Filtrar por repositorio">
            <option value="">Todos los repos</option>
            <option v-for="r in reportRepoOptions" :key="r" :value="r">{{ r }}</option>
          </select>
          <select v-model="reportCategoryFilter" class="docs-filter" aria-label="Filtrar por carpeta">
            <option value="">Todas las carpetas</option>
            <option v-for="c in reportCategoryOptions" :key="c" :value="c">{{ folderPathLabel(c) }}</option>
          </select>
          <button
            v-if="reportFiltersActive"
            type="button"
            class="btn-ghost sm"
            @click="clearReportFilters"
          >
            Limpiar
          </button>
        </div>

        <p v-if="reportLoading" class="hint">Cargando reporte…</p>
        <p v-else-if="!report?.ranking?.length" class="hint">
          {{ report?.dateFiltered ? 'No hay descargas en ese período.' : 'No hay descargas registradas.' }}
        </p>
        <p v-else-if="!reportFiltered.length" class="hint">No hay resultados con esos filtros.</p>
        <div v-else class="report-table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'titulo' ? '1' : '0'" @click="toggleReportSort('titulo')">
                    Documento {{ reportSortMark('titulo') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'category' ? '1' : '0'" @click="toggleReportSort('category')">
                    Carpeta {{ reportSortMark('category') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'fileType' ? '1' : '0'" @click="toggleReportSort('fileType')">
                    Tipo {{ reportSortMark('fileType') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'repository' ? '1' : '0'" @click="toggleReportSort('repository')">
                    Repo {{ reportSortMark('repository') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'downloads' ? '1' : '0'" @click="toggleReportSort('downloads')">
                    Descargas {{ reportSortMark('downloads') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'lastDownload' ? '1' : '0'" @click="toggleReportSort('lastDownload')">
                    Última desc. {{ reportSortMark('lastDownload') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'signatures' ? '1' : '0'" @click="toggleReportSort('signatures')">
                    Firmas {{ reportSortMark('signatures') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" :data-on="reportSortKey === 'status' ? '1' : '0'" @click="toggleReportSort('status')">
                    Estado {{ reportSortMark('status') }}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in reportPaged" :key="r.id">
                <td :title="r.titulo">{{ r.titulo }}</td>
                <td>{{ folderPathLabel(r.category) }}</td>
                <td>{{ r.fileType || '—' }}</td>
                <td>{{ r.repository || '—' }}</td>
                <td class="num">{{ r.downloadCount || 0 }}</td>
                <td :title="reportLastDownloadFull(r)">{{ reportLastDownloadLabel(r) }}</td>
                <td class="num">{{ r.signatureCount || 0 }}</td>
                <td><span class="status-pill" :data-status="r.status">{{ statusLabel(r.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="reportFiltered.length" class="files-pager report-pager">
          <span class="pager-info">
            {{ reportPagerFrom }}–{{ reportPagerTo }} de {{ reportFiltered.length }}
          </span>
          <label class="pager-size">
            Por página
            <select v-model.number="reportPageSize" class="docs-filter pager-select">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </label>
          <div class="pager-btns">
            <button type="button" class="btn-ghost sm" :disabled="reportPage <= 1" @click="reportPage -= 1">Anterior</button>
            <span class="pager-page">{{ reportPage }} / {{ reportTotalPages }}</span>
            <button
              type="button"
              class="btn-ghost sm"
              :disabled="reportPage >= reportTotalPages"
              @click="reportPage += 1"
            >Siguiente</button>
          </div>
        </div>

        <div class="footer">
          <p class="hint footer-hint">
            El Excel incluye solo lo filtrado ({{ reportFiltered.length }} fila{{ reportFiltered.length === 1 ? '' : 's' }}), no solo la página actual.
          </p>
          <button type="button" class="btn-ghost" @click="closeReport">Cerrar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!reportFiltered.length || reportExporting"
            :title="reportFiltered.length ? `Exporta ${reportFiltered.length} filas filtradas` : 'Sin filas para exportar'"
            @click="exportReportExcel"
          >
            {{
              reportExporting
                ? 'Exportando…'
                : `Exportar Excel (${reportFiltered.length})`
            }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="dropOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar almacenamiento externo"
      @click.self="dropOpen = false"
      @keydown.escape.prevent="dropOpen = false"
    >
      <form class="panel panel-wide panel-drop" @submit.prevent="saveDropConfig">
        <div class="panel-head">
          <h2>{{ dropConfigButtonLabel }}</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="dropOpen = false">×</button>
        </div>
        <p class="hint drop-lead">
          Un tercero deja archivos en Drive, S3 o un índice URL. Connectia lee el listado, aplica un patrón de
          nombre (DNI, CUIL, legajo…) y publica el documento <b>solo</b> para el usuario coincidente.
        </p>

        <div class="drop-form-grid">
          <label>Origen
            <select v-model="dropConfig.source" class="input">
              <option v-for="s in dropMeta.sources" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label class="check drop-check-inline">
            <input v-model="dropConfig.enabled" type="checkbox" />
            Habilitar almacenamiento externo
          </label>
          <label class="check drop-check-inline">
            <input v-model="dropConfig.requiresSignature" type="checkbox" />
            Requiere firma al publicar
          </label>
          <p class="hint span-all">{{ currentDropSourceHint }}</p>

          <template v-if="dropConfig.source === 'url' || dropConfig.source === 's3'">
            <label class="span-2">URL del manifiesto / índice JSON
              <input v-model="dropConfig.listUrl" class="input" placeholder="https://…/files.json" />
            </label>
            <label>Plantilla de URL del archivo (opcional)
              <input
                v-model="dropConfig.fileUrlTemplate"
                class="input"
                placeholder="https://cdn.ejemplo.com/docs/{name}"
              />
            </label>
          </template>

          <template v-if="dropConfig.source === 's3'">
            <label>Bucket
              <input v-model="dropConfig.s3.bucket" class="input" placeholder="mi-bucket" />
            </label>
            <label>Prefix
              <input v-model="dropConfig.s3.prefix" class="input" placeholder="recibos/" />
            </label>
            <label>Region
              <input v-model="dropConfig.s3.region" class="input" placeholder="us-east-1" />
            </label>
            <label class="span-2">Public base URL
              <input v-model="dropConfig.s3.publicBaseUrl" class="input" placeholder="https://cdn…" />
            </label>
            <label>Endpoint (MinIO / custom)
              <input v-model="dropConfig.s3.endpoint" class="input" placeholder="https://s3.…" />
            </label>
            <p class="hint span-all">Credenciales: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (o S3_*) en el servidor.</p>
          </template>

          <template v-if="dropConfig.source === 'gdrive'">
            <label class="span-all">listUrl (Apps Script / proxy) — opcional
              <input v-model="dropConfig.gdrive.listUrl" class="input" placeholder="https://…" />
            </label>
            <label class="span-2">Folder ID
              <input v-model="dropConfig.gdrive.folderId" class="input" />
            </label>
            <label>API key {{ dropConfig.gdrive.apiKeySet ? '(cargada)' : '' }}
              <input
                v-model="dropConfig.gdrive.apiKey"
                class="input"
                type="password"
                autocomplete="off"
                placeholder="Dejá vacío para no cambiar"
              />
            </label>
          </template>

          <label class="span-2">Patrón de nombre
            <input v-model="dropConfig.namePattern" class="input" required placeholder="{dni}_recibo_{periodo}.pdf" />
          </label>
          <label class="check drop-check-inline">
            <input v-model="dropConfig.stripNonDigits" type="checkbox" />
            Normalizar DNI/CUIL
          </label>
          <p class="hint span-all">{{ dropMeta.patternHelp }}</p>

          <label>Token que identifica al usuario
            <input v-model="dropConfig.matchToken" class="input" placeholder="dni" />
          </label>
          <label>Campo del usuario
            <select v-model="dropConfig.matchField" class="input">
              <option v-for="f in dropMeta.matchFields" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>
          </label>
          <label>Categoría
            <input v-model="dropConfig.category" class="input" />
          </label>
          <label class="span-2">Título del documento
            <input v-model="dropConfig.tituloTemplate" class="input" placeholder="Recibo {periodo}" />
          </label>

          <div class="drop-test span-all">
            <label class="drop-test-field">Probar un nombre de archivo
              <input v-model="dropTestName" class="input" placeholder="30111222_recibo_202603.pdf" />
            </label>
            <button type="button" class="btn-ghost drop-test-btn" :disabled="dropTesting" @click="runDropTest">
              {{ dropTesting ? 'Probando…' : 'Probar patrón' }}
            </button>
          </div>
          <pre v-if="dropTestResult" class="drop-pre span-all">{{ dropTestResult }}</pre>

          <div v-if="dropSyncResult" class="drop-sync-result span-all">
            <h3>Último sync</h3>
            <pre class="drop-pre">{{ dropSyncResult }}</pre>
          </div>
          <p v-if="dropConfig.lastSyncSummary" class="hint span-all">
            Último sync guardado: {{ formatDropSummary(dropConfig.lastSyncSummary) }}
          </p>
          <p v-if="dropError" class="err span-all">{{ dropError }}</p>
        </div>

        <div class="footer">
          <button type="button" class="btn-ghost" @click="dropOpen = false">Cerrar</button>
          <button type="button" class="btn-ghost" :disabled="dropSyncing" @click="runDropSync(true)">
            Simular
          </button>
          <button type="button" class="btn-ghost" :disabled="dropSyncing" @click="runDropSync(false)">
            {{ dropSyncing ? 'Sincronizando…' : 'Sincronizar ahora' }}
          </button>
          <button type="submit" class="btn-primary" :disabled="dropSaving">Guardar config</button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="zipImportBlocking"
      class="zip-busy-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="assertive"
      aria-label="Importando ZIP"
    >
      <div class="zip-busy-card">
        <svg class="zip-busy-spin" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" opacity=".22" />
          <path d="M21 12a9 9 0 00-9-9" />
        </svg>
        <strong>Importando ZIP…</strong>
        <p>No cierres esta ventana. Puede tardar unos minutos si hay muchos archivos o IA.</p>
      </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="zipPersonalOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="zipPersonalDone ? 'Resultado del import ZIP' : 'Importar ZIP con patrón'"
      @click.self="!zipPersonalBusy && closeZipPersonalPanel()"
      @keydown.escape.prevent="!zipPersonalBusy && closeZipPersonalPanel()"
    >
      <div v-if="zipPersonalDone" class="panel panel-wide">
        <div class="panel-head">
          <h2>Import finalizado</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeZipPersonalPanel">×</button>
        </div>
        <p class="ok-msg" v-if="(zipPersonalSummary?.upserted || 0) > 0">
          Se guardaron {{ zipPersonalSummary.upserted }} documento(s) personal(es).
        </p>
        <p class="err" v-else-if="zipPersonalError">{{ zipPersonalError }}</p>
        <p class="hint" v-else>Revisá el resumen: puede que no haya habido matches.</p>

        <ul class="zip-report-stats">
          <li><span>Listados</span><b>{{ zipPersonalSummary?.listed ?? 0 }}</b></li>
          <li><span>Matched</span><b>{{ zipPersonalSummary?.matched ?? 0 }}</b></li>
          <li><span>Sin match</span><b>{{ zipPersonalSummary?.unmatched ?? 0 }}</b></li>
          <li><span>Guardados</span><b>{{ zipPersonalSummary?.upserted ?? 0 }}</b></li>
          <li><span>Omitidos</span><b>{{ zipPersonalSummary?.zipSkipped?.length ?? 0 }}</b></li>
        </ul>

        <div v-if="zipPersonalSummary?.zipSkipped?.length" class="zip-report-block">
          <h3>Omitidos</h3>
          <ul class="zip-report-list">
            <li v-for="(row, i) in zipPersonalSummary.zipSkipped" :key="'ps-' + i">
              <strong>{{ row.name }}</strong>
              <span class="hint">{{ row.reason }}</span>
            </li>
          </ul>
        </div>

        <details v-if="zipPersonalResult" class="zip-report-raw">
          <summary>Detalle técnico (JSON)</summary>
          <pre class="drop-pre">{{ zipPersonalResult }}</pre>
        </details>

        <div class="footer">
          <button type="button" class="btn-ghost" @click="resetZipPersonalForAnother">Importar otro ZIP</button>
          <button type="button" class="btn-primary" @click="closeZipPersonalPanel">Listo</button>
        </div>
      </div>

      <form v-else class="panel panel-wide" @submit.prevent="runZipPersonal(false)">
        <div class="panel-head">
          <h2>Importar ZIP con patrón</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" :disabled="zipPersonalBusy" @click="closeZipPersonalPanel">×</button>
        </div>
        <p class="hint">
          Subí un ZIP con archivos nombrados según un patrón (DNI, CUIL, legajo…). Connectia asigna cada
          archivo <b>solo</b> al usuario coincidente, completa título/descripción con IA y lo guarda en el servidor.
        </p>

        <label>Archivo ZIP
          <input
            ref="zipPersonalFileInput"
            type="file"
            class="input"
            accept=".zip,application/zip"
            @change="onZipPersonalFile"
          />
        </label>
        <p v-if="zipPersonalFileName" class="hint">Seleccionado: {{ zipPersonalFileName }}</p>

        <label>Patrón de nombre
          <input v-model="zipPersonalConfig.namePattern" class="input" required placeholder="{dni}_recibo_{periodo}.pdf" />
        </label>
        <p class="hint">{{ zipMeta.patternHelp || dropMeta.patternHelp }}</p>

        <div class="aud-lists">
          <label>Token del patrón que identifica al usuario
            <input v-model="zipPersonalConfig.matchToken" class="input" placeholder="dni" />
          </label>
          <label>Campo del usuario
            <select v-model="zipPersonalConfig.matchField" class="input">
              <option
                v-for="f in (zipMeta.matchFields.length ? zipMeta.matchFields : dropMeta.matchFields)"
                :key="f.id"
                :value="f.id"
              >{{ f.label }}</option>
            </select>
          </label>
        </div>
        <label class="check">
          <input v-model="zipPersonalConfig.stripNonDigits" type="checkbox" />
          Normalizar quitando puntos/guiones (recomendado para DNI/CUIL)
        </label>

        <div class="aud-lists">
          <label>Título del documento
            <input v-model="zipPersonalConfig.tituloTemplate" class="input" placeholder="Recibo {periodo}" />
          </label>
          <label>Categoría
            <input v-model="zipPersonalConfig.category" class="input" />
          </label>
        </div>
        <label class="check">
          <input v-model="zipPersonalConfig.requiresSignature" type="checkbox" />
          Requiere firma al publicar
        </label>
        <label class="check">
          <input v-model="zipPersonalConfig.publishOnMatch" type="checkbox" />
          Publicar al importar (si hay match 1:1)
        </label>
        <label class="check">
          <input v-model="zipPersonalUseAi" type="checkbox" />
          Completar cada archivo con IA / heurística
        </label>

        <div v-if="zipPersonalResult" class="drop-sync-result">
          <h3>Simulación (no guarda)</h3>
          <pre class="drop-pre">{{ zipPersonalResult }}</pre>
        </div>
        <p v-if="zipPersonalError" class="err">{{ zipPersonalError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="zipPersonalBusy" @click="closeZipPersonalPanel">Cerrar</button>
          <button type="button" class="btn-ghost" :disabled="zipPersonalBusy || !zipPersonalFile" @click="runZipPersonal(true)">
            Simular
          </button>
          <button type="submit" class="btn-primary" :disabled="zipPersonalBusy || !zipPersonalFile">
            {{ zipPersonalBusy ? 'Importando…' : 'Importar' }}
          </button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="zipLibraryOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="zipLibraryDone ? 'Resultado del import ZIP' : 'Importar ZIP biblioteca'"
      @click.self="!zipLibraryBusy && closeZipLibraryPanel()"
      @keydown.escape.prevent="!zipLibraryBusy && closeZipLibraryPanel()"
    >
      <!-- Modal de resultado: cierra el flujo de import y evita reimportar el mismo ZIP -->
      <div v-if="zipLibraryDone" class="panel panel-wide">
        <div class="panel-head">
          <h2>Import finalizado</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeZipLibraryPanel">×</button>
        </div>
        <p class="ok-msg" v-if="(zipLibrarySummary?.upserted || 0) > 0">
          Se guardaron {{ zipLibrarySummary.upserted }} documento(s)
          <template v-if="zipLibrarySummary.aiLlm"> · {{ zipLibrarySummary.aiLlm }} enriquecido(s) con IA</template>.
        </p>
        <p class="err" v-else-if="zipLibraryError">{{ zipLibraryError }}</p>
        <p class="hint" v-else>No se importó ningún archivo válido.</p>

        <ul class="zip-report-stats">
          <li><span>Válidos en ZIP</span><b>{{ zipLibrarySummary?.listed ?? 0 }}</b></li>
          <li><span>Mapeados</span><b>{{ zipLibrarySummary?.mapped ?? 0 }}</b></li>
          <li><span>Guardados</span><b>{{ zipLibrarySummary?.upserted ?? 0 }}</b></li>
          <li><span>Errores al guardar</span><b>{{ zipLibrarySummary?.upsertErrors ?? 0 }}</b></li>
          <li><span>Omitidos</span><b>{{ zipLibrarySummary?.zipSkipped?.length ?? 0 }}</b></li>
        </ul>

        <div v-if="zipLibrarySummary?.samples?.mapped?.length" class="zip-report-block">
          <h3>Importados</h3>
          <ul class="zip-report-list">
            <li v-for="(row, i) in zipLibrarySummary.samples.mapped" :key="'m-' + i">
              <strong>{{ row.titulo || row.path }}</strong>
              <span class="hint">{{ row.path }} · {{ row.category || 'sin categoría' }}{{ row.requiresSignature ? ' · requiere firma' : '' }}</span>
            </li>
          </ul>
        </div>

        <div v-if="zipLibrarySummary?.zipSkipped?.length" class="zip-report-block">
          <h3>Omitidos</h3>
          <ul class="zip-report-list">
            <li v-for="(row, i) in zipLibrarySummary.zipSkipped" :key="'s-' + i">
              <strong>{{ row.name }}</strong>
              <span class="hint">{{ row.reason }}</span>
            </li>
          </ul>
        </div>

        <div v-if="zipLibrarySummary?.samples?.errors?.length" class="zip-report-block">
          <h3>Errores</h3>
          <ul class="zip-report-list">
            <li v-for="(row, i) in zipLibrarySummary.samples.errors" :key="'e-' + i">
              <strong>{{ row.path }}</strong>
              <span class="err">{{ row.error }}</span>
            </li>
          </ul>
        </div>

        <details v-if="zipLibraryResult" class="zip-report-raw">
          <summary>Detalle técnico (JSON)</summary>
          <pre class="drop-pre">{{ zipLibraryResult }}</pre>
        </details>

        <div class="footer">
          <button type="button" class="btn-ghost" @click="resetZipLibraryForAnother">Importar otro ZIP</button>
          <button type="button" class="btn-primary" @click="closeZipLibraryPanel">Listo</button>
        </div>
      </div>

      <form v-else class="panel panel-wide" @submit.prevent="runZipLibrary(false)">
        <div class="panel-head">
          <h2>Importar ZIP biblioteca</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" :disabled="zipLibraryBusy" @click="closeZipLibraryPanel">×</button>
        </div>
        <p class="hint">
          Las carpetas del ZIP se mapean a categorías con <code>/</code>.
          Cada archivo se completa con <b>IA</b> (título, descripción, firma sugerida) y queda en la biblioteca.
        </p>

        <label>Archivo ZIP
          <input
            ref="zipLibraryFileInput"
            type="file"
            class="input"
            accept=".zip,application/zip"
            @change="onZipLibraryFile"
          />
        </label>
        <p v-if="zipLibraryFileName" class="hint">Seleccionado: {{ zipLibraryFileName }}</p>

        <label>Carpeta base (opcional)
          <input
            v-model="zipLibraryBasePath"
            class="input"
            placeholder="RRHH"
          />
        </label>
        <p class="hint">Se antepone a las rutas del ZIP. Vacío = raíz de Documentos.</p>

        <label>Estado
          <select v-model="zipLibraryStatus" class="input">
            <option value="draft">Borrador (recomendado con IA)</option>
            <option value="published">Publicado</option>
          </select>
        </label>
        <label>Audiencia
          <select v-model="zipLibraryAudienceMode" class="input">
            <option value="all">Toda la comunidad</option>
            <option value="none">Nadie (oculto)</option>
          </select>
        </label>
        <label class="check">
          <input v-model="zipLibraryUseAi" type="checkbox" />
          Completar cada archivo con IA / heurística
        </label>
        <label class="check">
          <input v-model="zipLibraryRequiresSignature" type="checkbox" />
          Forzar firma en todos (si no, la IA sugiere por archivo)
        </label>

        <div v-if="zipLibraryResult" class="drop-sync-result">
          <h3>Simulación (no guarda)</h3>
          <pre class="drop-pre">{{ zipLibraryResult }}</pre>
        </div>
        <p v-if="zipLibraryError" class="err">{{ zipLibraryError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="zipLibraryBusy" @click="closeZipLibraryPanel">Cerrar</button>
          <button type="button" class="btn-ghost" :disabled="zipLibraryBusy || !zipLibraryFile" @click="runZipLibrary(true)">
            Simular
          </button>
          <button type="submit" class="btn-primary" :disabled="zipLibraryBusy || !zipLibraryFile">
            {{ zipLibraryBusy ? 'Importando…' : 'Importar' }}
          </button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="draft"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="draft.id ? 'Editar documento' : 'Nuevo documento'"
      @click.self="draft = null"
      @keydown.escape.prevent="draft = null"
    >
      <form class="panel panel-wide panel-doc" @submit.prevent="save">
        <div class="panel-head">
          <h2>{{ draft.id ? 'Editar' : 'Nuevo' }} documento</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="draft = null">×</button>
        </div>

        <template v-if="!draft.id">
          <div class="doc-upload-row">
            <div class="upload-box upload-box-inline">
              <label class="file-label">
                {{ uploading || aiDrafting ? 'Procesando…' : 'Subir archivo (IA completa el borrador)' }}
                <input
                  type="file"
                  class="file-input"
                  :disabled="uploading || aiDrafting"
                  @change="onFileSelected"
                />
              </label>
            </div>
            <p v-if="uploading || aiDrafting || draft.fileName" class="hint doc-upload-meta">
              <template v-if="uploading">Subiendo…</template>
              <template v-else-if="aiDrafting">Completando con IA…</template>
              <template v-else>
                {{ draft.fileName }} ({{ formatSize(draft.fileSize) }})
                <template v-if="aiDraftNote"> · {{ aiDraftNote }}</template>
              </template>
            </p>
          </div>
        </template>

        <div class="doc-form-grid">
          <label class="span-2">Título<input v-model="draft.titulo" class="input" required /></label>
          <label>Carpeta
            <input
              v-model="draft.category"
              class="input"
              list="doc-folder-hints"
              placeholder="RRHH/Recibos"
            />
          </label>
          <datalist id="doc-folder-hints">
            <option v-for="h in folderHints" :key="h" :value="h" />
          </datalist>

          <label class="span-3">Descripción<textarea v-model="draft.descripcion" rows="2" class="input" /></label>

          <label>Tipo
            <select v-model="draft.fileType" class="input">
              <option v-for="t in fileTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </label>
          <label>Repositorio
            <select v-model="draft.repository" class="input" @change="onRepoChange">
              <option
                v-for="r in repositories.filter((x) => !x.syncOnly || draft.repository === 'sap')"
                :key="r.id"
                :value="r.id"
              >
                {{ r.label }}
              </option>
            </select>
          </label>
          <label>Estado
            <select v-model="draft.status" class="input">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </label>

          <div v-if="draft.id && draft.repository === 'server'" class="span-3 upload-box upload-box-inline">
            <label class="file-label">
              Reemplazar archivo
              <input type="file" class="file-input" @change="onFileSelected" />
            </label>
            <p v-if="draft.fileName" class="hint">{{ draft.fileName }} ({{ formatSize(draft.fileSize) }})</p>
          </div>

          <label v-if="draft.repository !== 'server' || draft.fileUrl" :class="needsStorageKey ? 'span-2' : 'span-3'">
            {{ draft.repository === 'server' ? 'URL / ruta' : 'URL del archivo' }}
            <input
              v-model="draft.fileUrl"
              class="input"
              :required="draft.repository !== 'server'"
              :placeholder="urlPlaceholder"
            />
          </label>
          <label v-if="needsStorageKey">
            Storage key
            <input v-model="draft.storageKey" class="input" placeholder="carpeta/archivo.pdf" />
          </label>

          <label class="check span-3 check-inline">
            <input v-model="draft.requiresSignature" type="checkbox" />
            Requiere firma antes de descargar
            <span v-if="currentRepo?.description" class="hint check-side-hint">· {{ currentRepo.description }}</span>
          </label>
        </div>

        <fieldset class="audience audience-compact">
          <legend>Audiencia</legend>
          <div class="audience-modes">
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'all' }"
              @click="setAudienceMode('all')"
            >
              <strong>Toda la comunidad</strong>
            </button>
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'restricted' }"
              @click="setAudienceMode('restricted')"
            >
              <strong>Áreas y/o grupos</strong>
            </button>
            <button
              type="button"
              class="aud-mode"
              :class="{ on: draft.audience.mode === 'users' }"
              @click="setAudienceMode('users')"
            >
              <strong>Solo personas</strong>
            </button>
          </div>

          <div v-if="draft.audience.mode === 'restricted'" class="aud-lists">
            <div>
              <p class="aud-title">Áreas</p>
              <div class="aud-checks">
                <label v-for="a in orgAreas" :key="a.id" class="check">
                  <input type="checkbox" :value="a.id" v-model="draft.audience.areaIds" />
                  {{ a.nombre }}
                </label>
              </div>
              <p v-if="!orgAreas.length" class="hint">No hay áreas.</p>
            </div>
            <div>
              <p class="aud-title">Grupos</p>
              <div class="aud-checks">
                <label v-for="g in orgGroups" :key="g.id" class="check">
                  <input type="checkbox" :value="g.id" v-model="draft.audience.groupIds" />
                  {{ g.nombre }}
                </label>
              </div>
              <p v-if="!orgGroups.length" class="hint">No hay grupos.</p>
            </div>
          </div>

          <div
            v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'"
            class="audience-users"
          >
            <div class="audience-users-head">
              <p class="aud-title">
                {{ draft.audience.mode === 'users' ? 'Destinatarios' : 'Personas puntuales' }}
              </p>
              <input
                v-model="audienceUserQuery"
                class="input"
                type="search"
                placeholder="Buscar nombre, usuario o email…"
                @input="onAudienceUserQuery"
              />
            </div>
            <p v-if="audienceUserSearching" class="hint">Buscando…</p>
            <ul v-else-if="audienceUserResults.length" class="audience-user-results audience-user-results-wide">
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
                <button
                  type="button"
                  class="audience-chip-x"
                  :title="`Quitar ${u.label}`"
                  @click="removeAudienceUser(u.id)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
        </fieldset>

        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving || uploading || aiDrafting">Guardar</button>
        </div>
        <p v-if="formError" class="err">{{ formError }}</p>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="newFolderOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Nueva carpeta"
      @click.self="closeNewFolder"
      @keydown.escape.prevent="closeNewFolder"
    >
      <form class="panel" @submit.prevent="createFolder">
        <div class="panel-head">
          <h2>Nueva carpeta</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="closeNewFolder">×</button>
        </div>
        <p class="hint">
          Se crea
          <template v-if="currentPath"> dentro de <b>{{ folderPathLabel(currentPath) }}</b></template>
          <template v-else> en la raíz de Documentos</template>.
        </p>
        <label>Nombre
          <input
            ref="newFolderInput"
            v-model="newFolderName"
            class="input"
            required
            maxlength="80"
            placeholder="Ej. Recibos"
            autocomplete="off"
          />
        </label>
        <p v-if="newFolderError" class="err">{{ newFolderError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="closeNewFolder">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="newFolderBusy || !newFolderName.trim()">
            {{ newFolderBusy ? 'Creando…' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="bulkMoveOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Mover a carpeta"
      @click.self="!bulkBusy && closeBulkMove()"
      @keydown.escape.prevent="!bulkBusy && closeBulkMove()"
    >
      <form class="panel" @submit.prevent="runBulkMove">
        <div class="panel-head">
          <h2>Mover a carpeta</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" :disabled="bulkBusy" @click="closeBulkMove">×</button>
        </div>
        <p class="hint">
          Vas a mover <b>{{ selectedIds.length }}</b> archivo{{ selectedIds.length === 1 ? '' : 's' }}
          <template v-if="currentPath"> desde <b>{{ folderPathLabel(currentPath) }}</b></template>.
        </p>
        <label>Carpeta destino
          <input
            ref="bulkMoveInput"
            v-model="bulkMovePath"
            class="input"
            list="bulk-move-folder-hints"
            required
            maxlength="200"
            placeholder="Ej. RRHH/Recibos"
            autocomplete="off"
          />
        </label>
        <datalist id="bulk-move-folder-hints">
          <option v-for="h in folderHints" :key="'bm-' + h" :value="h" />
        </datalist>
        <p class="hint">Usá <code>/</code> para subcarpetas. Podés elegir una existente o escribir una nueva.</p>
        <p v-if="bulkMoveError" class="err">{{ bulkMoveError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="bulkBusy" @click="closeBulkMove">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="bulkBusy || !bulkMovePath.trim()">
            {{ bulkBusyAction === 'move' ? 'Moviendo…' : `Mover ${selectedIds.length}` }}
          </button>
        </div>
      </form>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="bulkConfirm"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="bulkConfirm.title"
      @click.self="bulkConfirm = null"
      @keydown.escape.prevent="bulkConfirm = null"
    >
      <div class="panel">
        <div class="panel-head">
          <h2>{{ bulkConfirm.title }}</h2>
          <button type="button" class="btn-icon" aria-label="Cerrar" @click="bulkConfirm = null">×</button>
        </div>
        <p>{{ bulkConfirm.message }}</p>
        <p v-if="bulkConfirm.detail" class="hint">{{ bulkConfirm.detail }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="bulkBusy" @click="bulkConfirm = null">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :class="{ danger: bulkConfirm.action === 'delete' }"
            :disabled="bulkBusy"
            @click="runBulkConfirm"
          >
            {{ bulkBusy ? 'Procesando…' : bulkConfirm.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="previewDoc"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="`Vista previa: ${previewDoc.titulo}`"
      @click.self="closePreview"
      @keydown.escape.prevent="closePreview"
    >
      <div class="panel panel-wide panel-preview">
        <div class="panel-head">
          <div class="preview-head-text">
            <h2>{{ previewDoc.titulo }}</h2>
            <p class="hint">
              {{ previewDoc.fileName || previewDoc.fileTypeLabel || previewDoc.fileType || 'Archivo' }}
              <template v-if="previewDoc.fileSize"> · {{ formatSize(previewDoc.fileSize) }}</template>
            </p>
          </div>
          <div class="preview-head-actions">
            <a
              v-if="previewUrl"
              class="btn-ghost sm"
              :href="previewUrl"
              target="_blank"
              rel="noopener noreferrer"
            >Abrir</a>
            <a
              v-if="previewUrl"
              class="btn-primary sm"
              :href="previewUrl"
              :download="previewDownloadName"
              rel="noopener noreferrer"
            >Descargar</a>
            <button type="button" class="btn-icon" aria-label="Cerrar" @click="closePreview">×</button>
          </div>
        </div>
        <div class="preview-stage" :data-kind="previewKind">
          <img
            v-if="previewKind === 'image'"
            :src="previewUrl"
            :alt="previewDoc.titulo"
            class="preview-image"
          />
          <iframe
            v-else-if="previewKind === 'pdf'"
            :src="previewUrl"
            class="preview-frame"
            title="Vista previa PDF"
          />
          <iframe
            v-else-if="previewKind === 'office' && officeEmbedUrl"
            :src="officeEmbedUrl"
            class="preview-frame"
            title="Vista previa Office"
          />
          <pre v-else-if="previewKind === 'text' || previewKind === 'csv'" class="preview-text">{{ previewTextBody }}</pre>
          <div v-else class="preview-fallback">
            <p class="hint">{{ previewFallbackMessage }}</p>
            <a
              v-if="previewUrl"
              class="btn-primary"
              :href="previewUrl"
              target="_blank"
              rel="noopener noreferrer"
            >Abrir en nueva pestaña</a>
          </div>
          <p v-if="previewLoading" class="preview-loading">Cargando vista previa…</p>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import { resolveMediaUrl } from '../utils/media'
import { buildStoreZip } from '../utils/storeZip'
import {
  detectDocPreviewKind,
  isPublicHttpUrl,
  officeEmbedUrlFor,
} from '../utils/docPreview'

const items = ref([])
const draft = ref(null)
const error = ref('')
const formError = ref('')
const saving = ref(false)
const uploading = ref(false)
const aiDrafting = ref(false)
const aiDraftNote = ref('')
const previewDoc = ref(null)
const previewTextBody = ref('')
const previewLoading = ref(false)
const sapConfigured = ref(false)
const sapSyncing = ref(false)
const seedBusy = ref(false)
const seedMsg = ref('')
const headMoreOpen = ref(false)
const headMoreRef = ref(null)
const report = ref(null)
const reportOpen = ref(false)
const reportLoading = ref(false)
const reportExporting = ref(false)
const reportSearch = ref('')
const reportFrom = ref('')
const reportTo = ref('')
const reportStatusFilter = ref('')
const reportTypeFilter = ref('')
const reportRepoFilter = ref('')
const reportCategoryFilter = ref('')
const reportSortKey = ref('downloads')
const reportSortDir = ref('desc')
const reportPage = ref(1)
const reportPageSize = ref(25)
let reportDateReloadTimer = null
const fileTypes = ref([])
const repositories = ref([])
const orgAreas = ref([])
const orgGroups = ref([])

const currentPath = ref('')
const searchQ = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const newFolderOpen = ref(false)
const newFolderName = ref('')
const newFolderError = ref('')
const newFolderBusy = ref(false)
const newFolderInput = ref(null)
const filesView = ref(localStorage.getItem('docsAdminFilesView') === 'grid' ? 'grid' : 'cards')
const sortKey = ref('titulo')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(Number(localStorage.getItem('docsAdminPageSize')) || 10)
const selectedIds = ref([])
const bulkBusy = ref(false)
const bulkBusyAction = ref('')
const bulkStatusValue = ref('')
const bulkConfirm = ref(null)
const bulkMoveOpen = ref(false)
const bulkMovePath = ref('')
const bulkMoveError = ref('')
const bulkMoveInput = ref(null)

watch(filesView, (v) => {
  try {
    localStorage.setItem('docsAdminFilesView', v)
  } catch {
    /* ignore */
  }
  page.value = 1
})

watch(pageSize, (v) => {
  try {
    localStorage.setItem('docsAdminPageSize', String(v))
  } catch {
    /* ignore */
  }
  page.value = 1
})

watch([currentPath, searchQ, statusFilter, typeFilter], () => {
  page.value = 1
  selectedIds.value = []
  bulkStatusValue.value = ''
})

const dropOpen = ref(false)
const dropConfig = ref(emptyDropConfig())
const dropMeta = ref({ sources: [], matchFields: [], patternHelp: '' })
const dropSaving = ref(false)
const dropSyncing = ref(false)
const dropTesting = ref(false)
const dropError = ref('')
const dropTestName = ref('')
const dropTestResult = ref('')
const dropSyncResult = ref('')

const zipMeta = ref({ matchFields: [], patternHelp: '' })
const zipPersonalOpen = ref(false)
const zipPersonalBusy = ref(false)
const zipPersonalDone = ref(false)
const zipPersonalError = ref('')
const zipPersonalResult = ref('')
const zipPersonalSummary = ref(null)
const zipPersonalFile = ref(null)
const zipPersonalFileName = ref('')
const zipPersonalFileInput = ref(null)
const zipPersonalConfig = ref(emptyZipPersonalConfig())
const zipPersonalUseAi = ref(true)

const zipLibraryOpen = ref(false)
const zipLibraryBusy = ref(false)
const zipLibraryDone = ref(false)
const zipLibraryError = ref('')
const zipLibraryResult = ref('')
const zipLibrarySummary = ref(null)
const zipLibraryFile = ref(null)
const zipLibraryFileName = ref('')
const zipLibraryFileInput = ref(null)
const zipLibraryBasePath = ref('')
const zipLibraryStatus = ref('draft')
const zipLibraryAudienceMode = ref('all')
const zipLibraryRequiresSignature = ref(false)
const zipLibraryUseAi = ref(true)

const zipImportBlocking = computed(() => zipLibraryBusy.value || zipPersonalBusy.value)

const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null

const currentRepo = computed(() => repositories.value.find((r) => r.id === draft.value?.repository))
const needsStorageKey = computed(() => Boolean(currentRepo.value?.needsStorageKey))
const urlPlaceholder = computed(() => {
  const id = draft.value?.repository
  if (id === 's3') return 'https://bucket.s3…/archivo.pdf o dejá storage key'
  if (id === 'sharepoint' || id === 'onedrive') return 'https://….sharepoint.com/…'
  if (id === 'gdrive') return 'https://drive.google.com/…'
  if (id === 'azure_blob') return 'https://….blob.core.windows.net/…'
  return 'https://…'
})

function normalizeFolderPath(raw) {
  return String(raw || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

function isFolderMarker(d) {
  return d?.source === 'folder-marker' || d?.fileUrl === 'connectia://folder'
}

function folderLabel(name) {
  const n = String(name || '').trim()
  if (!n) return 'General'
  const parts = n.split('/').map((s) => s.trim()).filter(Boolean)
  const last = parts[parts.length - 1] || n
  return last.charAt(0).toUpperCase() + last.slice(1)
}

function folderPathLabel(name) {
  const n = String(name || '').trim()
  if (!n) return 'General'
  return n
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => folderLabel(seg))
    .join(' / ')
}

function typeGlyph(ft) {
  const t = String(ft || '').toLowerCase()
  if (t === 'pdf') return 'PDF'
  if (t === 'image') return 'IMG'
  if (t === 'word') return 'DOC'
  if (t === 'excel') return 'XLS'
  if (t === 'powerpoint') return 'PPT'
  if (t === 'text') return 'TXT'
  return 'FILE'
}

function statusLabel(s) {
  if (s === 'published') return 'Publicado'
  if (s === 'draft') return 'Borrador'
  if (s === 'archived') return 'Archivado'
  return s || '—'
}

function docDateValue(d) {
  return d?.publishedAt || d?.updatedAt || d?.createdAt || null
}

function formatDocDate(raw) {
  if (!raw) return 'Sin fecha'
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return 'Sin fecha'
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const hh = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function docDateLabel(d) {
  return formatDocDate(docDateValue(d))
}

function docDateFull(d) {
  return formatDocDate(docDateValue(d))
}

function docOwnerLabel(d) {
  const name = String(d?.authorName || '').trim()
  return name || 'Sin dueño'
}

const pathSegments = computed(() => {
  const parts = currentPath.value ? currentPath.value.split('/') : []
  const out = []
  let acc = ''
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p
    out.push({ label: folderLabel(p), path: acc })
  }
  return out
})

const folderHints = computed(() => {
  const set = new Set()
  for (const d of items.value) {
    const cat = normalizeFolderPath(d.category || 'general') || 'general'
    set.add(cat)
    const parts = cat.split('/')
    let acc = ''
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p
      set.add(acc)
    }
  }
  if (currentPath.value) set.add(currentPath.value)
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
})

const filteredPool = computed(() => {
  const status = statusFilter.value
  const type = typeFilter.value
  let list = items.value
  if (status) list = list.filter((d) => d.status === status)
  if (type) list = list.filter((d) => d.fileType === type)
  return list
})

const visibleFolders = computed(() => {
  const prefix = currentPath.value
  const map = new Map()
  for (const d of filteredPool.value) {
    const cat = normalizeFolderPath(d.category || 'general') || 'general'
    let rest = cat
    if (prefix) {
      if (cat === prefix) continue
      if (!cat.startsWith(`${prefix}/`)) continue
      rest = cat.slice(prefix.length + 1)
    }
    const next = rest.split('/')[0]
    if (!next) continue
    const path = prefix ? `${prefix}/${next}` : next
    const entry = map.get(path) || { path, label: folderLabel(next), fileCount: 0, subCount: 0, _subs: new Set() }
    const marker = isFolderMarker(d)
    if (!marker) {
      entry.fileCount += 1
    }
    if (cat !== path) {
      const deeper = rest.split('/')[1]
      if (deeper) entry._subs.add(deeper)
    }
    map.set(path, entry)
  }
  return [...map.values()]
    .map((f) => ({
      path: f.path,
      label: f.label,
      fileCount: f.fileCount,
      subCount: f._subs.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
})

const visibleFiles = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  let list = filteredPool.value.filter((d) => !isFolderMarker(d))
  if (q) {
    list = list.filter((d) => {
      const hay = [d.titulo, d.descripcion, d.fileName, d.category, d.fileType, d.repository]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
    if (currentPath.value) {
      const prefix = currentPath.value
      list = list.filter((d) => {
        const cat = normalizeFolderPath(d.category || 'general') || 'general'
        return cat === prefix || cat.startsWith(`${prefix}/`)
      })
    }
    return list
  }
  if (!currentPath.value) return []
  const path = currentPath.value
  return list.filter((d) => {
    const cat = normalizeFolderPath(d.category || 'general') || 'general'
    return cat === path
  })
})

function sortValue(d, key) {
  if (key === 'titulo') return String(d.titulo || '').toLowerCase()
  if (key === 'fileType') return String(d.fileTypeLabel || d.fileType || '').toLowerCase()
  if (key === 'status') return String(d.status || '')
  if (key === 'date') {
    const t = new Date(docDateValue(d) || 0).getTime()
    return Number.isFinite(t) ? t : 0
  }
  if (key === 'owner') return String(d.authorName || '').toLowerCase()
  if (key === 'audience') return audienceLabel(d).toLowerCase()
  if (key === 'category') return String(d.category || '').toLowerCase()
  if (key === 'repository') return String(d.repositoryLabel || d.repository || '').toLowerCase()
  if (key === 'signature') return d.requiresSignature ? (Number(d.signatureCount) || 0) + 1 : 0
  if (key === 'downloads') return Number(d.downloadCount) || 0
  return ''
}

const sortedFiles = computed(() => {
  const list = [...visibleFiles.value]
  const key = sortKey.value
  const dir = sortDir.value === 'desc' ? -1 : 1
  list.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * dir
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedFiles.value.length / pageSize.value)))

const pagedFiles = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedFiles.value.slice(start, start + pageSize.value)
})

const pagerFrom = computed(() => {
  if (!sortedFiles.value.length) return 0
  return (page.value - 1) * pageSize.value + 1
})

const pagerTo = computed(() => Math.min(page.value * pageSize.value, sortedFiles.value.length))

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'date' || key === 'downloads' ? 'desc' : 'asc'
  }
  page.value = 1
}

function sortMark(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

watch(totalPages, (n) => {
  if (page.value > n) page.value = n
})

/** Solo la búsqueda cambia a lista plana; estado/tipo siguen en carpetas. */
const showParentFolder = computed(() => Boolean(currentPath.value || searchQ.value.trim()))
const showAddInFolder = computed(() => Boolean(currentPath.value && !searchQ.value.trim()))
const showAddFolder = computed(() => Boolean(!searchQ.value.trim()))
const displayFolders = computed(() => (searchQ.value.trim() ? [] : visibleFolders.value))
const showFoldersView = computed(() => showParentFolder.value || showAddInFolder.value || showAddFolder.value || !searchQ.value.trim())
const showFilesView = computed(() => Boolean(searchQ.value.trim() || currentPath.value))

const parentFolderLabel = computed(() => {
  if (searchQ.value.trim() && !currentPath.value) return 'Documentos'
  const segs = pathSegments.value
  if (segs.length <= 1) return 'Documentos'
  return segs[segs.length - 2].label
})

const browserSubtitle = computed(() => {
  const pool = filteredPool.value.length
  const filtered = Boolean(statusFilter.value || typeFilter.value)
  if (searchQ.value.trim()) {
    const n = visibleFiles.value.length
    return `${n} resultado${n === 1 ? '' : 's'}`
  }
  if (!currentPath.value) {
    const n = visibleFolders.value.length
    const base = `${n} carpeta${n === 1 ? '' : 's'} · ${pool} documento${pool === 1 ? '' : 's'}`
    return filtered ? `${base} (filtrado)` : `${base} en total`
  }
  const files = visibleFiles.value.length
  const subs = visibleFolders.value.length
  const parts = []
  if (subs) parts.push(`${subs} subcarpeta${subs === 1 ? '' : 's'}`)
  parts.push(`${files} archivo${files === 1 ? '' : 's'} acá`)
  if (filtered) parts.push('filtrado')
  return parts.join(' · ')
})

function openFolder(path) {
  currentPath.value = normalizeFolderPath(path)
  searchQ.value = ''
}

function goParent() {
  searchQ.value = ''
  if (!currentPath.value) return
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.join('/')
}

function goRoot() {
  currentPath.value = ''
  searchQ.value = ''
}

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => {
    const cached = audienceUserCache.value[id]
    if (cached) return cached
    return { id, label: id, usuario: '', email: '' }
  })
})

const currentDropSourceHint = computed(() => {
  const id = dropConfig.value?.source
  return dropMeta.value.sources?.find((s) => s.id === id)?.hint || ''
})

const dropConfigButtonLabel = computed(() => 'Configurar almacenamiento externo')

function emptyDropConfig() {
  return {
    enabled: false,
    source: 'url',
    namePattern: '{dni}_recibo_{periodo}.pdf',
    matchToken: 'dni',
    matchField: 'dni',
    stripNonDigits: true,
    tituloTemplate: 'Documento {periodo}',
    category: 'personal',
    requiresSignature: false,
    publishOnMatch: true,
    listUrl: '',
    fileUrlTemplate: '',
    s3: { bucket: '', prefix: '', region: 'us-east-1', endpoint: '', publicBaseUrl: '' },
    gdrive: { folderId: '', apiKey: '', listUrl: '', apiKeySet: false },
    lastSyncAt: null,
    lastSyncSummary: null,
  }
}

function applyDropConfig(cfg) {
  const base = emptyDropConfig()
  const c = cfg || {}
  dropConfig.value = {
    ...base,
    ...c,
    s3: { ...base.s3, ...(c.s3 || {}) },
    gdrive: { ...base.gdrive, ...(c.gdrive || {}) },
  }
  if (c.meta) {
    dropMeta.value = {
      sources: c.meta.sources || [],
      matchFields: c.meta.matchFields || [],
      patternHelp: c.meta.patternHelp || '',
    }
  }
}

async function load() {
  try {
    const { data } = await api.get('/admin/documents')
    items.value = data.items || []
    sapConfigured.value = Boolean(data.sapConfigured)
    fileTypes.value = data.meta?.fileTypes || []
    repositories.value = data.meta?.repositories || []
    orgAreas.value = data.org?.areas || []
    orgGroups.value = data.org?.groups || []
    if (data.docsDrop) applyDropConfig(data.docsDrop)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function openDropPanel() {
  dropOpen.value = true
  dropError.value = ''
  dropTestResult.value = ''
  dropSyncResult.value = ''
  try {
    const { data } = await api.get('/admin/documents/drop-config')
    applyDropConfig(data.config)
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
  }
}

async function saveDropConfig() {
  dropSaving.value = true
  dropError.value = ''
  try {
    const { data } = await api.put('/admin/documents/drop-config', { config: dropConfig.value })
    applyDropConfig(data.config)
    return true
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    return false
  } finally {
    dropSaving.value = false
  }
}

async function runDropTest() {
  dropTesting.value = true
  dropError.value = ''
  dropTestResult.value = ''
  try {
    const { data } = await api.post('/admin/documents/drop-test', {
      fileName: dropTestName.value,
      config: dropConfig.value,
    })
    dropTestResult.value = JSON.stringify(data, null, 2)
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    if (e.response?.data) dropTestResult.value = JSON.stringify(e.response.data, null, 2)
  } finally {
    dropTesting.value = false
  }
}

async function runDropSync(dryRun) {
  dropSyncing.value = true
  dropError.value = ''
  dropSyncResult.value = ''
  try {
    const saved = await saveDropConfig()
    if (!saved) return
    const { data } = await api.post('/admin/documents/drop-sync', { dryRun: Boolean(dryRun) })
    dropSyncResult.value = JSON.stringify(data.summary || data, null, 2)
    if (!dryRun) await load()
  } catch (e) {
    dropError.value = e.response?.data?.error || e.message
    if (e.response?.data) dropSyncResult.value = JSON.stringify(e.response.data, null, 2)
  } finally {
    dropSyncing.value = false
  }
}

function formatDropSummary(s) {
  if (!s) return '—'
  return `listados ${s.listed ?? 0} · matched ${s.matched ?? 0} · sin match ${s.unmatched ?? 0} · patrón ${s.patternMiss ?? 0} · upsert ${s.upserted ?? 0}`
}

function emptyZipPersonalConfig() {
  return {
    namePattern: '{dni}_recibo_{periodo}.pdf',
    matchToken: 'dni',
    matchField: 'dni',
    stripNonDigits: true,
    tituloTemplate: 'Documento {periodo}',
    category: 'personal',
    requiresSignature: false,
    publishOnMatch: true,
  }
}

async function openZipPersonalPanel() {
  zipPersonalOpen.value = true
  zipPersonalDone.value = false
  zipPersonalError.value = ''
  zipPersonalResult.value = ''
  zipPersonalSummary.value = null
  clearZipPersonalFileSelection()
  zipPersonalUseAi.value = true
  zipPersonalConfig.value = {
    ...emptyZipPersonalConfig(),
    namePattern: dropConfig.value.namePattern || '{dni}_recibo_{periodo}.pdf',
    matchToken: dropConfig.value.matchToken || 'dni',
    matchField: dropConfig.value.matchField || 'dni',
    stripNonDigits: dropConfig.value.stripNonDigits !== false,
    tituloTemplate: dropConfig.value.tituloTemplate || 'Documento {periodo}',
    category: dropConfig.value.category || 'personal',
    requiresSignature: Boolean(dropConfig.value.requiresSignature),
    publishOnMatch: dropConfig.value.publishOnMatch !== false,
  }
  try {
    const { data } = await api.get('/admin/documents/zip-import/meta')
    zipMeta.value = {
      matchFields: data.matchFields || [],
      patternHelp: data.patternHelp || '',
    }
    if (data.defaults) {
      zipPersonalConfig.value = { ...zipPersonalConfig.value, ...data.defaults }
    }
  } catch {
    /* dropMeta ya puede alcanzar */
  }
}

function clearZipPersonalFileSelection() {
  zipPersonalFile.value = null
  zipPersonalFileName.value = ''
  if (zipPersonalFileInput.value) zipPersonalFileInput.value.value = ''
}

function closeZipPersonalPanel() {
  if (zipPersonalBusy.value) return
  zipPersonalOpen.value = false
  zipPersonalDone.value = false
  zipPersonalBusy.value = false
  zipPersonalError.value = ''
  zipPersonalResult.value = ''
  zipPersonalSummary.value = null
  clearZipPersonalFileSelection()
}

function resetZipPersonalForAnother() {
  zipPersonalDone.value = false
  zipPersonalError.value = ''
  zipPersonalResult.value = ''
  zipPersonalSummary.value = null
  clearZipPersonalFileSelection()
}

function onZipPersonalFile(ev) {
  const f = ev.target?.files?.[0] || null
  zipPersonalFile.value = f
  zipPersonalFileName.value = f?.name || ''
  zipPersonalError.value = ''
  zipPersonalResult.value = ''
  zipPersonalSummary.value = null
}

async function runZipPersonal(dryRun) {
  if (zipPersonalDone.value) return
  if (!zipPersonalFile.value) {
    zipPersonalError.value = 'Elegí un archivo .zip'
    return
  }
  zipPersonalBusy.value = true
  zipPersonalError.value = ''
  zipPersonalResult.value = ''
  zipPersonalSummary.value = null
  try {
    const fd = new FormData()
    fd.append('file', zipPersonalFile.value)
    fd.append('dryRun', dryRun ? 'true' : 'false')
    fd.append('useAi', zipPersonalUseAi.value ? 'true' : 'false')
    fd.append('config', JSON.stringify(zipPersonalConfig.value))
    const { data } = await api.post('/admin/documents/zip-import/personal', fd)
    const summary = data.summary || data
    zipPersonalSummary.value = summary
    zipPersonalResult.value = JSON.stringify(summary, null, 2)
    if (dryRun) return
    clearZipPersonalFileSelection()
    zipPersonalDone.value = true
    await load()
  } catch (e) {
    zipPersonalError.value = e.response?.data?.error || e.message
    if (e.response?.data) {
      zipPersonalSummary.value = e.response.data.summary || e.response.data
      zipPersonalResult.value = JSON.stringify(e.response.data, null, 2)
    }
  } finally {
    zipPersonalBusy.value = false
  }
}

function clearZipLibraryFileSelection() {
  zipLibraryFile.value = null
  zipLibraryFileName.value = ''
  if (zipLibraryFileInput.value) zipLibraryFileInput.value.value = ''
}

function openZipLibraryPanel() {
  zipLibraryOpen.value = true
  zipLibraryDone.value = false
  zipLibraryError.value = ''
  zipLibraryResult.value = ''
  zipLibrarySummary.value = null
  clearZipLibraryFileSelection()
  zipLibraryBasePath.value = currentPath.value || ''
  zipLibraryStatus.value = 'draft'
  zipLibraryAudienceMode.value = 'all'
  zipLibraryRequiresSignature.value = false
  zipLibraryUseAi.value = true
}

function closeZipLibraryPanel() {
  if (zipLibraryBusy.value) return
  zipLibraryOpen.value = false
  zipLibraryDone.value = false
  zipLibraryBusy.value = false
  zipLibraryError.value = ''
  zipLibraryResult.value = ''
  zipLibrarySummary.value = null
  clearZipLibraryFileSelection()
}

function resetZipLibraryForAnother() {
  zipLibraryDone.value = false
  zipLibraryError.value = ''
  zipLibraryResult.value = ''
  zipLibrarySummary.value = null
  clearZipLibraryFileSelection()
}

function onZipLibraryFile(ev) {
  const f = ev.target?.files?.[0] || null
  zipLibraryFile.value = f
  zipLibraryFileName.value = f?.name || ''
  zipLibraryError.value = ''
  zipLibraryResult.value = ''
  zipLibrarySummary.value = null
}

async function runZipLibrary(dryRun) {
  if (zipLibraryDone.value) return
  if (!zipLibraryFile.value) {
    zipLibraryError.value = 'Elegí un archivo .zip'
    return
  }
  zipLibraryBusy.value = true
  zipLibraryError.value = ''
  zipLibraryResult.value = ''
  zipLibrarySummary.value = null
  try {
    const fd = new FormData()
    fd.append('file', zipLibraryFile.value)
    fd.append('dryRun', dryRun ? 'true' : 'false')
    fd.append('basePath', zipLibraryBasePath.value || '')
    fd.append('status', zipLibraryStatus.value)
    fd.append('audienceMode', zipLibraryAudienceMode.value)
    fd.append('requiresSignature', zipLibraryRequiresSignature.value ? 'true' : 'false')
    fd.append('useAi', zipLibraryUseAi.value ? 'true' : 'false')
    const { data } = await api.post('/admin/documents/zip-import/library', fd, {
      timeout: 300000,
    })
    const summary = data.summary || data
    zipLibrarySummary.value = summary
    zipLibraryResult.value = JSON.stringify(summary, null, 2)
    if (dryRun) {
      zipLibraryError.value = ''
      return
    }
    // Import real: limpiar archivo y pasar al modal de resultado (sin botón Importar)
    clearZipLibraryFileSelection()
    zipLibraryDone.value = true
    const n = Number(summary.upserted) || 0
    if (n > 0) {
      const folder = zipLibraryBasePath.value || ''
      if (folder) currentPath.value = folder
      statusFilter.value = zipLibraryStatus.value || ''
      await load()
      zipLibraryError.value = ''
      seedMsg.value = `ZIP biblioteca: ${n} documento(s) importado(s)${
        summary.aiLlm ? ` · ${summary.aiLlm} enriquecido(s) con IA` : ''
      }.`
    } else {
      zipLibraryError.value =
        summary.upsertErrors > 0
          ? `No se pudo guardar (${summary.upsertErrors} error(es)). Revisá el resultado.`
          : 'No se importó ningún archivo. Revisá el ZIP y el resultado.'
    }
  } catch (e) {
    zipLibraryError.value = e.response?.data?.error || e.message
    if (e.response?.data) {
      zipLibrarySummary.value = e.response.data.summary || e.response.data
      zipLibraryResult.value = JSON.stringify(e.response.data, null, 2)
    }
  } finally {
    zipLibraryBusy.value = false
  }
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
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  if (mode === 'restricted' || mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}

function audienceLabel(d) {
  const a = d?.audience
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
    const { data } = await api.get('/admin/documents/audience-candidates', { params: { q: query } })
    const list = data.items || []
    list.forEach(cacheAudienceUser)
    audienceUserResults.value = list.filter((u) => !(draft.value?.audience?.userIds || []).includes(u.id))
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
    const { data } = await api.get('/admin/documents/audience-candidates', {
      params: { ids: missing.join(',') },
    })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

function openNew() {
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  aiDraftNote.value = ''
  draft.value = {
    titulo: '',
    descripcion: '',
    category: currentPath.value || 'general',
    fileUrl: '',
    fileType: 'pdf',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    repository: 'server',
    storageKey: '',
    status: 'draft',
    requiresSignature: false,
    audience: emptyAudience(),
  }
}

function openNewFolder() {
  newFolderOpen.value = true
  newFolderName.value = ''
  newFolderError.value = ''
  nextTick(() => newFolderInput.value?.focus?.())
}

function closeNewFolder() {
  newFolderOpen.value = false
  newFolderName.value = ''
  newFolderError.value = ''
  newFolderBusy.value = false
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    newFolderError.value = 'Escribí un nombre'
    return
  }
  newFolderBusy.value = true
  newFolderError.value = ''
  try {
    const { data } = await api.post('/admin/documents/folders', {
      name,
      parentPath: currentPath.value || '',
    })
    const path = data.path || data.folder?.path
    await load()
    closeNewFolder()
    if (path) openFolder(path)
    seedMsg.value = data.created === false ? `La carpeta «${name}» ya existía.` : `Carpeta «${name}» creada.`
  } catch (e) {
    newFolderError.value = e.response?.data?.error || e.message || 'No se pudo crear'
  } finally {
    newFolderBusy.value = false
  }
}

function edit(d) {
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  draft.value = {
    id: d.id,
    titulo: d.titulo,
    descripcion: d.descripcion || '',
    category: d.category || 'general',
    fileUrl: d.fileUrl,
    fileType: d.fileType || 'other',
    fileName: d.fileName || '',
    fileSize: d.fileSize || 0,
    mimeType: d.mimeType || '',
    repository: d.repository || 'url',
    storageKey: d.storageKey || '',
    status: d.status,
    requiresSignature: Boolean(d.requiresSignature),
    audience: normalizeAudienceDraft(d.audience || emptyAudience()),
  }
  if (draft.value.audience.mode === 'restricted' || draft.value.audience.mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}

async function duplicate(d) {
  if (!d?.id) return
  error.value = ''
  try {
    const { data } = await api.post(`/admin/documents/${d.id}/duplicate`)
    await load()
    if (data.document) edit(data.document)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo copiar'
  }
}

const statusBusyId = ref('')

const selectableFiles = computed(() => sortedFiles.value)
const selectedDocs = computed(() => {
  const set = new Set(selectedIds.value)
  return selectableFiles.value.filter((d) => set.has(d.id))
})
const allSelectableSelected = computed(
  () => selectableFiles.value.length > 0 && selectableFiles.value.every((d) => selectedIds.value.includes(d.id)),
)
const someSelectableSelected = computed(() =>
  selectableFiles.value.some((d) => selectedIds.value.includes(d.id)),
)

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedIds.value = [...set]
}

function clearSelection() {
  selectedIds.value = []
  bulkStatusValue.value = ''
}

function toggleSelectAllSelectable() {
  if (allSelectableSelected.value) {
    clearSelection()
    return
  }
  selectedIds.value = selectableFiles.value.map((d) => d.id)
}

async function onBulkStatusChange(next) {
  const status = String(next || '').trim()
  bulkStatusValue.value = ''
  if (!['draft', 'published', 'archived'].includes(status) || !selectedIds.value.length) return
  bulkBusy.value = true
  bulkBusyAction.value = 'status'
  error.value = ''
  let ok = 0
  let fail = 0
  try {
    const results = await Promise.allSettled(
      selectedIds.value.map((id) => api.patch(`/admin/documents/${id}`, { status })),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1
      else fail += 1
    }
    await load()
    seedMsg.value = fail
      ? `Estado actualizado en ${ok}; falló en ${fail}.`
      : `Estado «${statusLabel(status)}» aplicado a ${ok} documento(s).`
    clearSelection()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cambiar el estado'
  } finally {
    bulkBusy.value = false
    bulkBusyAction.value = ''
  }
}

function askBulkCopy() {
  const n = selectedIds.value.length
  if (!n) return
  bulkConfirm.value = {
    action: 'copy',
    title: 'Copiar documentos',
    message: `¿Crear una copia de ${n} documento${n === 1 ? '' : 's'} seleccionado${n === 1 ? '' : 's'}?`,
    detail: 'Las copias se crean como borrador, sin descargas ni firmas.',
    confirmLabel: n === 1 ? 'Copiar' : `Copiar ${n}`,
  }
}

function askBulkDelete() {
  const n = selectedIds.value.length
  if (!n) return
  bulkConfirm.value = {
    action: 'delete',
    title: 'Borrar documentos',
    message: `¿Borrar definitivamente ${n} documento${n === 1 ? '' : 's'}?`,
    detail: 'Esta acción no se puede deshacer.',
    confirmLabel: n === 1 ? 'Borrar' : `Borrar ${n}`,
  }
}

function openBulkMove() {
  if (!selectedIds.value.length) return
  bulkMoveOpen.value = true
  bulkMoveError.value = ''
  bulkMovePath.value = currentPath.value || ''
  nextTick(() => {
    bulkMoveInput.value?.focus?.()
    bulkMoveInput.value?.select?.()
  })
}

function closeBulkMove() {
  if (bulkBusy.value && bulkBusyAction.value === 'move') return
  bulkMoveOpen.value = false
  bulkMovePath.value = ''
  bulkMoveError.value = ''
}

async function runBulkMove() {
  const dest = normalizeFolderPath(bulkMovePath.value)
  if (!dest) {
    bulkMoveError.value = 'Indicá una carpeta destino'
    return
  }
  if (!selectedIds.value.length) return
  if (dest === normalizeFolderPath(currentPath.value)) {
    bulkMoveError.value = 'Elegí una carpeta distinta a la actual'
    return
  }
  bulkBusy.value = true
  bulkBusyAction.value = 'move'
  bulkMoveError.value = ''
  error.value = ''
  let ok = 0
  let fail = 0
  try {
    const results = await Promise.allSettled(
      selectedIds.value.map((id) => api.patch(`/admin/documents/${id}`, { category: dest })),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1
      else fail += 1
    }
    await load()
    bulkMoveOpen.value = false
    bulkMovePath.value = ''
    bulkMoveError.value = ''
    seedMsg.value = fail
      ? `Se movieron ${ok} a «${folderPathLabel(dest)}»; falló en ${fail}.`
      : `Se movieron ${ok} documento(s) a «${folderPathLabel(dest)}».`
    clearSelection()
    openFolder(dest)
  } catch (e) {
    bulkMoveError.value = e.response?.data?.error || e.message || 'No se pudo mover'
  } finally {
    bulkBusy.value = false
    bulkBusyAction.value = ''
  }
}

async function runBulkConfirm() {
  const action = bulkConfirm.value?.action
  if (!action) return
  if (action === 'copy') await bulkCopy()
  else if (action === 'delete') await bulkDelete()
}

async function bulkCopy() {
  if (!selectedIds.value.length) return
  bulkBusy.value = true
  bulkBusyAction.value = 'copy'
  error.value = ''
  let ok = 0
  let fail = 0
  try {
    const results = await Promise.allSettled(
      selectedIds.value.map((id) => api.post(`/admin/documents/${id}/duplicate`)),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1
      else fail += 1
    }
    await load()
    bulkConfirm.value = null
    seedMsg.value = fail
      ? `Se copiaron ${ok}; falló en ${fail}.`
      : `Se crearon ${ok} copia(s) en borrador.`
    clearSelection()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo copiar'
  } finally {
    bulkBusy.value = false
    bulkBusyAction.value = ''
  }
}

async function bulkDelete() {
  if (!selectedIds.value.length) return
  bulkBusy.value = true
  bulkBusyAction.value = 'delete'
  error.value = ''
  let ok = 0
  let fail = 0
  try {
    const results = await Promise.allSettled(
      selectedIds.value.map((id) => api.delete(`/admin/documents/${id}`)),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1
      else fail += 1
    }
    await load()
    bulkConfirm.value = null
    seedMsg.value = fail
      ? `Se borraron ${ok}; falló en ${fail}.`
      : `Se borraron ${ok} documento(s).`
    clearSelection()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo borrar'
  } finally {
    bulkBusy.value = false
    bulkBusyAction.value = ''
  }
}

function downloadFileName(d, usedNames) {
  const base =
    String(d.fileName || '').trim() ||
    `${String(d.titulo || 'documento').trim().replace(/[\\/:*?"<>|]+/g, '_')}${
      String(d.fileUrl || '')
        .split('?')[0]
        .match(/(\.[a-z0-9]{1,8})$/i)?.[1] || ''
    }` ||
    'documento'
  let name = base
  let i = 2
  while (usedNames.has(name.toLowerCase())) {
    const m = base.match(/^(.*?)(\.[^.]+)?$/)
    name = `${m?.[1] || base} (${i})${m?.[2] || ''}`
    i += 1
  }
  usedNames.add(name.toLowerCase())
  return name
}

async function bulkDownload() {
  const docs = selectedDocs.value.filter((d) => d.fileUrl && d.fileUrl !== 'connectia://folder')
  if (!docs.length) {
    error.value = 'Los seleccionados no tienen archivo descargable'
    return
  }
  bulkBusy.value = true
  bulkBusyAction.value = 'download'
  error.value = ''
  try {
    const usedNames = new Set()
    const entries = []
    let fail = 0
    for (const d of docs) {
      try {
        const url = resolveMediaUrl(d.fileUrl)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = await res.arrayBuffer()
        entries.push({ name: downloadFileName(d, usedNames), data: buf })
      } catch {
        fail += 1
      }
    }
    if (!entries.length) throw new Error('No se pudo descargar ningún archivo')
    const zip = buildStoreZip(entries)
    const a = document.createElement('a')
    const href = URL.createObjectURL(zip)
    a.href = href
    const folder = (currentPath.value || 'documentos').replace(/[\\/:*?"<>|]+/g, '_')
    a.download = `${folder}-${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(href), 2000)
    seedMsg.value = fail
      ? `ZIP con ${entries.length} archivo(s); ${fail} no se pudieron incluir.`
      : `Descarga lista: ${entries.length} archivo(s) en ZIP.`
  } catch (e) {
    error.value = e.message || 'No se pudo armar la descarga'
  } finally {
    bulkBusy.value = false
    bulkBusyAction.value = ''
  }
}

async function setDocStatus(d, next) {
  const status = String(next || '').trim()
  if (!d?.id || !['draft', 'published', 'archived'].includes(status) || d.status === status) return
  statusBusyId.value = d.id
  error.value = ''
  try {
    const { data } = await api.patch(`/admin/documents/${d.id}`, { status })
    const updated = data.document
    const idx = items.value.findIndex((x) => x.id === d.id)
    if (idx >= 0 && updated) {
      items.value[idx] = { ...items.value[idx], ...updated }
    } else {
      await load()
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cambiar el estado'
    await load()
  } finally {
    statusBusyId.value = ''
  }
}

function onRepoChange() {
  if (!draft.value) return
  if (draft.value.repository === 'server' && !draft.value.fileUrl) {
    // wait for upload
  }
}

function formatSize(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

const previewUrl = computed(() => {
  const u = previewDoc.value?.fileUrl
  return u ? resolveMediaUrl(u) : ''
})

const previewDownloadName = computed(() => {
  const d = previewDoc.value
  if (!d) return 'documento'
  const name = String(d.fileName || '').trim()
  if (name) return name
  const titulo = String(d.titulo || 'documento').trim().replace(/[\\/:*?"<>|]+/g, '_')
  const ext =
    String(d.fileName || d.fileUrl || '')
      .split('?')[0]
      .match(/(\.[a-z0-9]{1,8})$/i)?.[1] || ''
  return `${titulo}${ext || ''}` || 'documento'
})

const previewKind = computed(() => detectDocPreviewKind(previewDoc.value))

const officeEmbedUrl = computed(() => {
  if (previewKind.value !== 'office') return ''
  return officeEmbedUrlFor(previewUrl.value)
})

const previewFallbackMessage = computed(() => {
  const d = previewDoc.value
  const label = d?.fileTypeLabel || d?.fileType || 'archivo'
  if (previewKind.value === 'office' && previewUrl.value && !isPublicHttpUrl(previewUrl.value)) {
    return `Word/Excel/PowerPoint se pueden embeber solo con URL pública (https). En local abrí el ${label} en una pestaña.`
  }
  if (previewKind.value === 'office') {
    return `No se pudo embeber este ${label}. Abrilo en una pestaña nueva.`
  }
  return `Este tipo (${label}) no tiene vista previa embebida. Abrilo en una pestaña nueva.`
})

async function loadTextPreview(url) {
  previewLoading.value = true
  previewTextBody.value = ''
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    let text = await res.text()
    if (text.length > 200000) text = `${text.slice(0, 200000)}\n\n… (truncado)`
    previewTextBody.value = text || '(archivo vacío)'
  } catch (e) {
    previewTextBody.value = `No se pudo leer el archivo para vista previa.\n${e?.message || e}\n\nUsá “Abrir” en el encabezado.`
  } finally {
    previewLoading.value = false
  }
}

async function openPreview(d) {
  if (!d?.fileUrl) {
    error.value = 'Este documento no tiene archivo/URL para previsualizar'
    return
  }
  previewDoc.value = d
  previewTextBody.value = ''
  const kind = detectDocPreviewKind(d)
  const url = resolveMediaUrl(d.fileUrl)
  if ((kind === 'text' || kind === 'csv') && url) {
    await loadTextPreview(url)
  }
}

function closePreview() {
  previewDoc.value = null
  previewTextBody.value = ''
  previewLoading.value = false
}

async function onFileSelected(e) {
  const file = e.target?.files?.[0]
  if (!file || !draft.value) return
  uploading.value = true
  formError.value = ''
  aiDraftNote.value = ''
  const isNew = !draft.value.id
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/documents/upload', fd)
    draft.value.fileUrl = data.fileUrl || data.url
    draft.value.fileName = data.fileName || file.name
    draft.value.fileSize = data.fileSize || file.size
    draft.value.mimeType = data.mimeType || file.type
    draft.value.fileType = data.fileType || draft.value.fileType
    draft.value.storageKey = data.storageKey || ''
    draft.value.repository = 'server'
  } catch (err) {
    formError.value = err.response?.data?.error || err.message || 'No se pudo subir'
    uploading.value = false
    if (e.target) e.target.value = ''
    return
  } finally {
    uploading.value = false
  }

  if (isNew) {
    await applyAiDraftFromUpload()
  }
  if (e.target) e.target.value = ''
}

async function applyAiDraftFromUpload() {
  if (!draft.value?.fileName) return
  aiDrafting.value = true
  formError.value = ''
  try {
    const { data } = await api.post('/admin/documents/ai-draft', {
      fileName: draft.value.fileName,
      fileUrl: draft.value.fileUrl,
      mimeType: draft.value.mimeType,
      fileType: draft.value.fileType,
      categoryHint: draft.value.category || currentPath.value || '',
      existingCategories: folderHints.value,
    })
    const d = data.draft || {}
    if (d.titulo) draft.value.titulo = d.titulo
    if (d.descripcion) draft.value.descripcion = d.descripcion
    if (d.category) draft.value.category = d.category
    if (d.fileType) draft.value.fileType = d.fileType
    if (d.requiresSignature != null) draft.value.requiresSignature = Boolean(d.requiresSignature)
    draft.value.status = 'draft'
    aiDraftNote.value =
      d.source === 'ai'
        ? 'Completado con IA — revisá y guardá'
        : data.configured
          ? 'Sugerido (heurística) — revisá y guardá'
          : 'Sugerido por el nombre del archivo — revisá y guardá'
  } catch (err) {
    // La subida ya quedó; el admin puede completar a mano
    aiDraftNote.value = 'No se pudo sugerir metadatos; completá el formulario a mano'
    if (!formError.value) {
      formError.value = err.response?.data?.error || ''
    }
  } finally {
    aiDrafting.value = false
  }
}

async function save() {
  if (!draft.value) return
  if (draft.value.repository === 'server' && !draft.value.fileUrl) {
    formError.value = 'Subí un archivo al servidor'
    return
  }
  const audience = normalizeAudienceDraft(draft.value.audience)
  if (audience.mode === 'users' && !audience.userIds.length) {
    formError.value = 'Elegí al menos un destinatario puntual'
    return
  }
  if (
    audience.mode === 'restricted' &&
    !audience.areaIds.length &&
    !audience.groupIds.length &&
    !audience.userIds.length
  ) {
    formError.value = 'Elegí al menos un área, grupo o persona'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      ...draft.value,
      category: normalizeFolderPath(draft.value.category) || 'general',
      audience,
    }
    if (draft.value.id) await api.patch(`/admin/documents/${draft.value.id}`, body)
    else await api.post('/admin/documents', body)
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function remove(d) {
  if (!confirm(`¿Borrar “${d.titulo}”?`)) return
  try {
    await api.delete(`/admin/documents/${d.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function syncSap() {
  sapSyncing.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/documents/sap-sync')
    alert(data.message || `Sincronizados: ${data.upserted}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    sapSyncing.value = false
  }
}

async function runSeedDemo() {
  seedBusy.value = true
  seedMsg.value = ''
  error.value = ''
  try {
    const { data } = await api.post('/admin/documents/seed-demo')
    seedMsg.value = data.message || `Seed: ${data.total} documentos`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    seedBusy.value = false
  }
}

async function fetchReport() {
  reportLoading.value = true
  error.value = ''
  try {
    const params = {}
    if (reportFrom.value) params.from = reportFrom.value
    if (reportTo.value) params.to = reportTo.value
    const { data } = await api.get('/admin/documents/report', { params })
    report.value = data
  } catch (e) {
    error.value = e.response?.data?.error || e.message
    throw e
  } finally {
    reportLoading.value = false
  }
}

async function loadReport() {
  reportOpen.value = true
  reportSearch.value = ''
  reportFrom.value = ''
  reportTo.value = ''
  reportStatusFilter.value = ''
  reportTypeFilter.value = ''
  reportRepoFilter.value = ''
  reportCategoryFilter.value = ''
  reportSortKey.value = 'downloads'
  reportSortDir.value = 'desc'
  reportPage.value = 1
  try {
    await fetchReport()
  } catch {
    reportOpen.value = false
  }
}

function reloadReportDates() {
  if (reportFrom.value && reportTo.value && reportFrom.value > reportTo.value) {
    error.value = 'La fecha “Desde” no puede ser posterior a “Hasta”'
    return
  }
  clearTimeout(reportDateReloadTimer)
  reportDateReloadTimer = setTimeout(async () => {
    try {
      await fetchReport()
      reportPage.value = 1
    } catch {
      /* error ya seteado */
    }
  }, 200)
}

function closeReport() {
  reportOpen.value = false
}

const reportRows = computed(() => report.value?.ranking || [])

const reportTypeOptions = computed(() =>
  [...new Set(reportRows.value.map((r) => r.fileType).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'es'),
  ),
)
const reportRepoOptions = computed(() =>
  [...new Set(reportRows.value.map((r) => r.repository).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'es'),
  ),
)
const reportCategoryOptions = computed(() =>
  [...new Set(reportRows.value.map((r) => r.category || 'general').filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'es'),
  ),
)

const reportFiltersActive = computed(
  () =>
    Boolean(
      reportSearch.value.trim() ||
        reportFrom.value ||
        reportTo.value ||
        reportStatusFilter.value ||
        reportTypeFilter.value ||
        reportRepoFilter.value ||
        reportCategoryFilter.value,
    ),
)

function clearReportFilters() {
  reportSearch.value = ''
  reportStatusFilter.value = ''
  reportTypeFilter.value = ''
  reportRepoFilter.value = ''
  reportCategoryFilter.value = ''
  reportPage.value = 1
  const hadDates = Boolean(reportFrom.value || reportTo.value)
  reportFrom.value = ''
  reportTo.value = ''
  if (hadDates) reloadReportDates()
}

function reportLastDownloadLabel(r) {
  if (!r?.lastDownloadAt) return '—'
  try {
    return new Date(r.lastDownloadAt).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function reportLastDownloadFull(r) {
  if (!r?.lastDownloadAt) return ''
  try {
    return new Date(r.lastDownloadAt).toLocaleString('es-AR')
  } catch {
    return ''
  }
}

function reportSortValue(r, key) {
  if (key === 'titulo') return String(r.titulo || '').toLowerCase()
  if (key === 'category') return String(r.category || '').toLowerCase()
  if (key === 'fileType') return String(r.fileType || '').toLowerCase()
  if (key === 'repository') return String(r.repository || '').toLowerCase()
  if (key === 'downloads') return Number(r.downloadCount) || 0
  if (key === 'signatures') return Number(r.signatureCount) || 0
  if (key === 'status') return String(r.status || '').toLowerCase()
  if (key === 'lastDownload') {
    const t = r.lastDownloadAt ? new Date(r.lastDownloadAt).getTime() : 0
    return Number.isFinite(t) ? t : 0
  }
  return ''
}

const reportFiltered = computed(() => {
  let list = [...reportRows.value]
  const q = reportSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter((r) => {
      const hay = `${r.titulo || ''} ${r.category || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (reportStatusFilter.value) {
    list = list.filter((r) => r.status === reportStatusFilter.value)
  }
  if (reportTypeFilter.value) {
    list = list.filter((r) => r.fileType === reportTypeFilter.value)
  }
  if (reportRepoFilter.value) {
    list = list.filter((r) => r.repository === reportRepoFilter.value)
  }
  if (reportCategoryFilter.value) {
    list = list.filter((r) => (r.category || 'general') === reportCategoryFilter.value)
  }
  const key = reportSortKey.value
  const dir = reportSortDir.value === 'desc' ? -1 : 1
  list.sort((a, b) => {
    const va = reportSortValue(a, key)
    const vb = reportSortValue(b, key)
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * dir
  })
  return list
})

const reportTotalPages = computed(() =>
  Math.max(1, Math.ceil(reportFiltered.value.length / reportPageSize.value)),
)

const reportPaged = computed(() => {
  const start = (reportPage.value - 1) * reportPageSize.value
  return reportFiltered.value.slice(start, start + reportPageSize.value)
})

const reportPagerFrom = computed(() => {
  if (!reportFiltered.value.length) return 0
  return (reportPage.value - 1) * reportPageSize.value + 1
})

const reportPagerTo = computed(() =>
  Math.min(reportPage.value * reportPageSize.value, reportFiltered.value.length),
)

function toggleReportSort(key) {
  if (reportSortKey.value === key) {
    reportSortDir.value = reportSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    reportSortKey.value = key
    reportSortDir.value =
      key === 'downloads' || key === 'signatures' || key === 'lastDownload' ? 'desc' : 'asc'
  }
  reportPage.value = 1
}

function reportSortMark(key) {
  if (reportSortKey.value !== key) return ''
  return reportSortDir.value === 'asc' ? '↑' : '↓'
}

watch([reportSearch, reportStatusFilter, reportTypeFilter, reportRepoFilter, reportCategoryFilter, reportPageSize], () => {
  reportPage.value = 1
})

watch(reportFiltered, () => {
  if (reportPage.value > reportTotalPages.value) reportPage.value = reportTotalPages.value
})

async function exportReportExcel() {
  // Solo el conjunto filtrado (búsqueda + filtros + fechas), no la página ni el ranking completo sin filtro.
  const filtered = reportFiltered.value
  if (!filtered.length) return
  reportExporting.value = true
  try {
    const rows = filtered.map((r) => ({
      Documento: r.titulo || '',
      Carpeta: r.category || 'general',
      Tipo: r.fileType || '',
      Repositorio: r.repository || '',
      Descargas: Number(r.downloadCount) || 0,
      'Última descarga': r.lastDownloadAt
        ? new Date(r.lastDownloadAt).toLocaleString('es-AR')
        : '',
      Firmas: Number(r.signatureCount) || 0,
      Estado: statusLabel(r.status),
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Descargas')
    const stamp = new Date().toISOString().slice(0, 10)
    const range =
      reportFrom.value || reportTo.value
        ? `_${reportFrom.value || 'inicio'}_${reportTo.value || 'hoy'}`
        : ''
    XLSX.writeFile(book, `reporte-descargas-filtrado${range}_${stamp}.xlsx`)
  } catch (e) {
    error.value = e?.message || 'No se pudo exportar Excel'
  } finally {
    reportExporting.value = false
  }
}

function runHeadMore(fn) {
  headMoreOpen.value = false
  if (typeof fn === 'function') fn()
}

function onHeadMorePointerDown(ev) {
  if (!headMoreOpen.value) return
  const el = headMoreRef.value
  if (el && !el.contains(ev.target)) headMoreOpen.value = false
}

onMounted(() => {
  load()
  document.addEventListener('pointerdown', onHeadMorePointerDown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onHeadMorePointerDown, true)
})
</script>

<style scoped>
.page-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 16px;
  width: 100%;
}
.page-head-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.page-head h1 {
  margin: 0;
  font-size: 1.5rem;
  text-align: left;
  flex: 0 1 auto;
}
.page-head-sum {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.92rem;
  text-align: left;
  width: 100%;
}
.page-head-title :deep(.screen-help) {
  margin: 0 0 0 auto;
  max-width: min(42ch, 100%);
  flex: 0 0 auto;
  text-align: left;
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}
.head-actions-spacer {
  flex: 1 1 auto;
  min-width: 8px;
}
.head-more {
  position: relative;
}
.head-more-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}
.head-more-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 9px 12px;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}
.head-more-item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--panel));
  color: var(--brand-primary, #0f766e);
}
.head-more-item:disabled {
  opacity: 0.55;
  cursor: wait;
}
.seed-icon-btn {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  flex-shrink: 0;
}
.seed-icon-btn:disabled { opacity: 0.55; cursor: wait; }
.seed-spin { animation: seed-spin 0.8s linear infinite; }
@keyframes seed-spin {
  to { transform: rotate(360deg); }
}

.docs-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 4px 0 12px;
  font-size: 0.88rem;
}
.crumb-link {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  cursor: pointer;
}
.crumb-link.current { color: var(--ink); cursor: default; pointer-events: none; }
.crumb-sep { color: var(--ink-faint, #94a3b8); }
.crumb-current { color: var(--ink); font-weight: 600; }

.docs-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.docs-search {
  flex: 1 1 auto;
  min-width: 160px;
  box-sizing: border-box;
  border: 1px solid var(--line-2, var(--line));
  border-radius: 10px;
  padding: 9px 12px;
  font: inherit;
  background: var(--panel);
  color: var(--ink);
}
.docs-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.docs-filter {
  border: 1px solid var(--line-2, var(--line));
  border-radius: 10px;
  padding: 9px 12px;
  font: inherit;
  background: var(--panel);
  color: var(--ink);
  max-width: 180px;
}
@media (max-width: 720px) {
  .docs-toolbar {
    flex-wrap: wrap;
  }
  .docs-filters {
    flex-wrap: wrap;
    width: 100%;
  }
  .docs-filter { max-width: none; flex: 1 1 140px; }
}
.docs-count {
  margin: 0 0 14px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.docs-bulk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  margin: 0 0 12px;
  padding: 8px 10px 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 4%, transparent);
}
.docs-bulk-bar--active {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 42%, var(--line));
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--panel)) 0%,
      var(--panel) 100%);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--brand-primary, #0f766e) 10%, transparent);
}
.docs-bulk-left {
  display: flex;
  align-items: center;
  min-width: 0;
}
.docs-bulk-check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.docs-bulk-check input {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--brand-primary, #0f766e);
}
.docs-bulk-check-text {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
}
.docs-bulk-check-text strong {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  font-size: 0.78rem;
  line-height: 1;
}
.docs-bulk-check-text small {
  font-weight: 500;
  color: var(--ink-soft);
  font-size: 0.78rem;
}
.docs-bulk-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.docs-bulk-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.docs-bulk-group-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.docs-bulk-status-pills {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  gap: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink-soft) 10%, var(--panel));
  border: 1px solid var(--line-2);
}
.docs-bulk-pill {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  line-height: 1;
}
.docs-bulk-pill:hover:not(:disabled) {
  color: var(--ink);
  background: var(--panel);
}
.docs-bulk-pill:disabled { opacity: 0.55; cursor: wait; }
.docs-bulk-pill[data-status='published']:hover:not(:disabled) {
  color: var(--ok, #047857);
}
.docs-bulk-pill[data-status='draft']:hover:not(:disabled) {
  color: #b45309;
}
.docs-bulk-pill[data-status='archived']:hover:not(:disabled) {
  color: #475569;
}
.docs-bulk-sep {
  width: 1px;
  height: 22px;
  background: var(--line-2);
  margin: 0 4px;
}
.docs-bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 9px;
  cursor: pointer;
  line-height: 1;
}
.docs-bulk-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 45%, var(--line));
  color: var(--brand-primary, #0f766e);
}
.docs-bulk-btn:disabled { opacity: 0.55; cursor: wait; }
.docs-bulk-btn--danger {
  color: var(--bad, #b91c1c);
}
.docs-bulk-btn--danger:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--bad, #b91c1c) 45%, var(--line));
  background: color-mix(in srgb, var(--bad, #b91c1c) 8%, var(--panel));
  color: var(--bad, #b91c1c);
}
.docs-bulk-clear {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-left: 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
.docs-bulk-clear:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ink-soft) 12%, var(--panel));
  color: var(--ink);
}
.docs-bulk-clear:disabled { opacity: 0.55; cursor: wait; }
.docs-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--ink-soft);
  margin: 28px 0;
  font-size: 0.9rem;
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 12px;
}
.folder-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
  border-radius: 18px;
  padding: 16px 14px 14px;
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--brand-primary, #0f766e) 6%, var(--panel)) 0%,
      var(--panel) 48%);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.folder-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 40%, var(--line));
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.09);
}
.folder-card:active { transform: translateY(-1px); }
.folder-card--up {
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--ink-soft) 8%, var(--panel)) 0%,
      var(--panel) 48%);
  border-style: dashed;
}
.folder-card--up:hover {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, var(--line));
}
.folder-card--add {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, var(--line));
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--panel)) 0%,
      var(--panel) 48%);
}
.folder-card--add:hover {
  border-color: var(--brand-primary, #0f766e);
  border-style: solid;
}
.folder-card--add-folder {
  border-color: color-mix(in srgb, var(--ink-soft) 40%, var(--line));
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--ink-soft) 8%, var(--panel)) 0%,
      var(--panel) 48%);
}
.folder-card--add-folder:hover {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, var(--line));
  border-style: solid;
}
.folder-visual--up {
  display: grid;
  place-items: center;
  width: 56px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ink-soft) 12%, var(--panel));
  border: 1px dashed color-mix(in srgb, var(--ink-soft) 35%, var(--line));
}
.folder-up-glyph {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
}
.folder-visual--add {
  display: grid;
  place-items: center;
  width: 56px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, var(--panel));
  border: 1px dashed color-mix(in srgb, var(--brand-primary, #0f766e) 45%, var(--line));
  color: var(--brand-primary, #0f766e);
}
.folder-add-glyph {
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1;
}
.folder-visual--add-folder {
  position: relative;
}
.folder-visual--add-folder .folder-tab,
.folder-visual--add-folder .folder-body-shape {
  opacity: 0.9;
}
.folder-add-plus {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  background: var(--brand-primary, #0f766e);
}
.folder-visual {
  position: relative;
  width: 56px;
  height: 44px;
}
.folder-tab {
  position: absolute;
  left: 0;
  top: 0;
  width: 22px;
  height: 12px;
  border-radius: 6px 8px 0 0;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #fbbf24);
}
.folder-body-shape {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 8px;
  border-radius: 8px 12px 10px 10px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--brand-primary, #0f766e) 72%, #f59e0b),
    color-mix(in srgb, var(--brand-primary, #0f766e) 88%, #d97706)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.folder-badge {
  position: absolute;
  right: -4px;
  top: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--brand-primary, #0f766e);
  font-size: 0.68rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.folder-meta { min-width: 0; display: grid; gap: 3px; }
.folder-meta strong {
  font-size: 0.95rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-meta small { color: var(--ink-soft); font-size: 0.75rem; }

.view-toggle {
  display: inline-flex;
  border: 1px solid var(--line-2, var(--line));
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel);
}
.view-toggle-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  padding: 0;
}
.view-toggle-btn + .view-toggle-btn {
  border-left: 1px solid var(--line-2, var(--line));
}
.view-toggle-btn.on {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, var(--panel));
  color: var(--brand-primary, #0f766e);
}
.view-toggle-btn:hover:not(.on) {
  background: var(--panel-2, #f8fafc);
}

.file-board {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
.file-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
  border-radius: 18px;
  padding: 16px 14px 12px;
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--ink-soft) 5%, var(--panel)) 0%,
      var(--panel) 48%);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  min-width: 0;
  position: relative;
}
.file-card.selected {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, var(--line));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-primary, #0f766e) 22%, transparent);
}
.file-select {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  border: 1px solid var(--line-2);
  cursor: pointer;
}
.file-select input { margin: 0; cursor: pointer; }
.file-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 40%, var(--line));
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.09);
}
.file-visual {
  position: relative;
  width: 56px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, var(--panel));
  color: var(--brand-primary, #0f766e);
  flex-shrink: 0;
}
.file-visual.sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 0.55rem;
}
.file-visual[data-type='pdf'] { background: #fef2f2; color: #b91c1c; }
.file-visual[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.file-visual[data-type='word'] { background: #dbeafe; color: #1e40af; }
.file-visual[data-type='excel'] { background: #d1fae5; color: #047857; }
.file-visual[data-type='powerpoint'] { background: #ffedd5; color: #c2410c; }
.file-visual[data-type='text'] { background: #f1f5f9; color: #475569; }
.file-glyph { line-height: 1; }
.status-dot {
  position: absolute;
  right: -3px;
  top: -3px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--panel);
  background: #94a3b8;
}
.status-dot[data-status='published'] { background: var(--ok, #047857); }
.status-dot[data-status='draft'] { background: #d97706; }
.status-dot[data-status='archived'] { background: #64748b; }
.file-meta { min-width: 0; display: grid; gap: 3px; flex: 1; }
.file-meta strong {
  font-size: 0.95rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-meta small {
  color: var(--ink-soft);
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-meta-row { display: block; }
.file-meta-extra { display: block; }
.file-path-line { display: block; }
.file-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
  flex-shrink: 0;
  align-items: center;
}

.files-table-wrap {
  margin-bottom: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  overflow: auto;
}
.files-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
}
.files-table th,
.files-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 0.85rem;
  vertical-align: middle;
  white-space: nowrap;
}
.files-table td:nth-child(2),
.files-table td:nth-child(7) {
  white-space: normal;
  max-width: 220px;
}
.th-check,
.td-check {
  width: 36px;
  text-align: center;
  padding-left: 10px;
  padding-right: 4px;
}
.th-check input,
.td-check input {
  margin: 0;
  cursor: pointer;
}
.files-table tbody tr.selected {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--panel));
}
.audience-chip-cell {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.files-table th {
  background: var(--panel-2, #f8fafc);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-soft);
  position: sticky;
  top: 0;
  z-index: 1;
}
.files-table tbody tr { cursor: pointer; }
.files-table tbody tr:hover {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 6%, var(--panel));
}
.th-sort {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.th-sort[data-on='1'] { color: var(--brand-primary, #0f766e); }
.th-actions { width: 88px; }
.td-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.td-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--ink);
}
.td-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
.files-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
}
.pager-info { font-size: 0.8rem; color: var(--ink-soft); }
.pager-size {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.pager-select {
  max-width: 80px;
  padding: 6px 8px;
}
.pager-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.pager-page {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
  min-width: 4.5rem;
  text-align: center;
}
.btn-ghost.sm,
.btn-primary.sm {
  padding: 5px 10px;
  font-size: 0.78rem;
  border-radius: 8px;
}

.icon-action {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line-2, var(--line));
  border-radius: 9px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
}
.icon-action:hover {
  border-color: var(--brand-primary, #0f766e);
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, var(--panel));
}
.icon-action.danger:hover {
  border-color: var(--bad, #b91c1c);
  color: var(--bad, #b91c1c);
  background: color-mix(in srgb, var(--bad, #b91c1c) 8%, var(--panel));
}
.status-action {
  max-width: 118px;
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--line-2, var(--line));
  border-radius: 9px;
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0 6px;
  cursor: pointer;
}
.status-action:hover:not(:disabled) {
  border-color: var(--brand-primary, #0f766e);
}
.status-action:disabled {
  opacity: 0.55;
  cursor: wait;
}
.path-link {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  cursor: pointer;
}
.status-pill {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--line);
  color: var(--ink-soft);
}
.status-pill[data-status='published'] {
  background: color-mix(in srgb, var(--ok, #047857) 14%, var(--panel));
  color: var(--ok, #047857);
}
.status-pill[data-status='draft'] {
  background: #fef3c7;
  color: #92400e;
}
.status-pill[data-status='archived'] {
  background: #f1f5f9;
  color: #475569;
}

/* Velo semitransparente: NO usar clase .sheet (style.css la pinta opaca con --panel) */
.hub-dlg-scrim {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 72px 16px 40px;
  overflow: auto;
  background: rgba(15, 23, 42, 0.42);
}
.zip-busy-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(2px);
  cursor: wait;
  pointer-events: all;
}
.zip-busy-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(360px, calc(100vw - 48px));
  padding: 28px 24px;
  border-radius: 16px;
  background: var(--panel);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  text-align: center;
}
.zip-busy-card strong {
  font-size: 1.05rem;
  color: var(--ink);
}
.zip-busy-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.zip-busy-spin {
  color: var(--brand-primary, #0f766e);
  animation: seed-spin 0.8s linear infinite;
}
.hub-dlg-scrim > .panel {
  width: min(620px, calc(100vw - 48px));
  max-height: min(82vh, 720px);
  min-height: 0;
  height: fit-content;
  align-self: flex-start;
  overflow: auto;
  background: var(--panel);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent),
    0 18px 48px rgba(0, 0, 0, 0.28);
}
.hub-dlg-scrim > .panel-wide {
  width: min(760px, calc(100vw - 48px));
  max-height: min(86vh, 780px);
}
.hub-dlg-scrim > .panel-doc {
  width: min(1040px, calc(100vw - 32px));
  max-height: min(92vh, 900px);
  gap: 8px;
  padding: 12px 16px 14px;
}
.hub-dlg-scrim > .panel-drop {
  width: min(1100px, calc(100vw - 32px));
  max-height: min(92vh, 880px);
  gap: 8px;
  padding: 12px 16px 14px;
}
.hub-dlg-scrim > .panel-preview {
  width: min(1100px, calc(100vw - 32px));
  max-height: min(92vh, 920px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
}
.preview-head-text {
  min-width: 0;
}
.preview-head-text h2 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.preview-stage {
  position: relative;
  flex: 1;
  min-height: min(68vh, 640px);
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0f172a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-image {
  max-width: 100%;
  max-height: min(68vh, 640px);
  object-fit: contain;
  display: block;
}
.preview-frame {
  width: 100%;
  height: min(68vh, 640px);
  border: 0;
  background: #fff;
}
.preview-text {
  margin: 0;
  width: 100%;
  height: min(68vh, 640px);
  overflow: auto;
  padding: 16px 18px;
  box-sizing: border-box;
  background: #0b1220;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.preview-loading {
  position: absolute;
  margin: 0;
  color: #cbd5e1;
  font-size: 0.9rem;
}
.preview-fallback {
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 24px;
  text-align: center;
  max-width: 520px;
}
.preview-fallback .hint { color: #cbd5e1; }
.preview-fallback .btn-primary {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.preview-head-actions .btn-ghost,
.preview-head-actions .btn-primary {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.icon-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.doc-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  align-items: start;
}
.doc-form-grid .span-2 { grid-column: span 2; }
.doc-form-grid .span-3 { grid-column: 1 / -1; }
.drop-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  align-items: end;
}
.drop-form-grid .span-2 { grid-column: span 2; }
.drop-form-grid .span-all { grid-column: 1 / -1; }
.drop-form-grid > .hint,
.drop-form-grid > .err {
  margin: 0;
  align-self: center;
}
.drop-lead {
  margin: 0;
}
.drop-check-inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding-bottom: 4px;
  min-height: 38px;
}
.drop-test {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 12px;
  align-items: end;
  margin: 0;
}
.drop-test-field { margin: 0; }
.drop-test-btn { white-space: nowrap; height: 38px; }
.doc-upload-row {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 1fr;
  gap: 10px 14px;
  align-items: center;
}
.upload-box-inline {
  padding: 8px 10px;
}
.doc-upload-meta { margin: 0; }
.check-inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.check-side-hint {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audience-compact {
  gap: 8px;
  padding: 8px 10px;
}
.audience-compact .aud-mode {
  padding: 8px 10px;
}
.audience-compact .aud-mode small { display: none; }
.aud-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  max-height: 88px;
  overflow: auto;
}
.audience-users-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
}
.audience-users-head .aud-title { margin: 0; }
.audience-user-results-wide {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  max-height: 120px;
}
@media (max-width: 900px) {
  .hub-dlg-scrim > .panel-doc,
  .hub-dlg-scrim > .panel-drop {
    width: min(720px, calc(100vw - 24px));
  }
  .doc-form-grid,
  .drop-form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .doc-form-grid .span-2 { grid-column: span 2; }
  .drop-form-grid .span-2 { grid-column: span 2; }
  .doc-upload-row {
    grid-template-columns: 1fr;
  }
  .audience-user-results-wide {
    grid-template-columns: 1fr;
  }
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.panel-head h2 { margin: 0; font-size: 1.1rem; }
.btn-icon {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink-soft);
  padding: 0 4px;
}
.drop-sync-result { display: grid; gap: 8px; margin-top: 4px; }
.drop-pre {
  margin: 0; padding: 10px; border-radius: 10px; background: var(--ink); color: var(--line);
  font-size: 0.75rem; overflow: auto; max-height: 220px;
}
.zip-report-stats {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;
}
.zip-report-stats li {
  display: flex; flex-direction: column; gap: 2px;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--panel);
}
.zip-report-stats span { font-size: 0.75rem; color: var(--ink-soft); font-weight: 600; }
.zip-report-stats b { font-size: 1.15rem; }
.zip-report-block { display: grid; gap: 6px; margin-top: 4px; }
.zip-report-block h3 { margin: 0; font-size: 0.9rem; }
.zip-report-list {
  list-style: none; margin: 0; padding: 0; display: grid; gap: 8px;
}
.zip-report-list li { display: grid; gap: 2px; }
.zip-report-raw { margin-top: 4px; }
.zip-report-raw summary { cursor: pointer; font-size: 0.85rem; color: var(--ink-soft); }
.input { width: 100%; box-sizing: border-box; border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.footer { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; align-items: center; }
.footer-hint {
  flex: 1 1 auto;
  margin: 0;
  text-align: left;
}
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.btn-primary.danger { background: var(--bad, #b91c1c); }
.btn-ghost.danger { color: var(--bad); }
.err { color: var(--bad); }
.ok-msg { color: var(--ok, #047857); font-size: 0.9rem; margin: 0 0 8px; }
.hint { color: var(--ink-soft); font-size: 0.85rem; margin: 0; }
.pill.soft { display: inline-block; margin-left: 2px; font-size: 0.7rem; padding: 2px 6px; border-radius: 999px; background: var(--line); }
.type-pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.03em; padding: 3px 8px; border-radius: 6px; background: var(--ok-bg); color: var(--brand-primary);
}
.type-pill[data-type='pdf'] { background: var(--bad-bg); color: var(--bad); }
.type-pill[data-type='image'] { background: #eff6ff; color: #1d4ed8; }
.type-pill[data-type='word'] { background: #eff6ff; color: #1e40af; }
.type-pill[data-type='excel'] { background: var(--ok-bg); color: var(--ok); }
.type-pill[data-type='powerpoint'] { background: var(--warn-bg); color: #c2410c; }
.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.report-date {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.report-date .docs-filter {
  font-weight: 500;
  color: var(--ink);
}
.report-pager {
  margin-top: 0;
  border-top: 0;
  padding-top: 0;
}
.report-table-wrap {
  overflow: auto;
  max-height: min(52vh, 480px);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.report-table th,
.report-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.report-table th {
  position: sticky;
  top: 0;
  background: var(--panel-2, var(--panel));
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  z-index: 1;
  white-space: nowrap;
}
.report-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.report-table tbody tr:hover td {
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--panel));
}
.hub-dlg-scrim > .panel-report {
  width: min(1180px, calc(100vw - 24px));
  max-height: min(94vh, 900px);
  gap: 10px;
}
.upload-box {
  border: 1px dashed var(--ink-faint); border-radius: 12px; padding: 12px; background: var(--panel-2);
}
.file-label { font-size: 0.85rem; }
.file-input { margin-top: 8px; width: 100%; }
.audience {
  border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin: 0;
  display: grid; gap: 10px;
}
.audience legend { padding: 0 6px; font-size: 0.8rem; font-weight: 700; color: var(--ink-soft); }
.audience-modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.aud-mode {
  text-align: left; border: 1px solid var(--line); border-radius: 10px; padding: 10px;
  background: var(--panel); cursor: pointer; display: grid; gap: 2px;
}
.aud-mode strong { font-size: 0.82rem; color: var(--ink); }
.aud-mode small { font-size: 0.72rem; color: var(--ink-soft); }
.aud-mode.on { border-color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel)); }
.aud-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.aud-title { margin: 0 0 4px; font-size: 0.75rem; text-transform: uppercase; color: var(--ink-faint); }
.audience-users {
  display: grid; gap: 8px; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel-2);
}
.audience-user-results { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 180px; overflow-y: auto; }
.audience-user-add {
  width: 100%; text-align: left; border: 1px solid var(--line); background: var(--panel); border-radius: 10px;
  padding: 8px 10px; cursor: pointer;
}
.audience-user-add:hover:not(:disabled) { border-color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel)); }
.audience-user-add:disabled { opacity: 0.5; cursor: default; }
.audience-user-add strong { display: block; font-size: 13px; }
.audience-user-add small { display: block; margin-top: 2px; font-size: 11px; color: var(--ink-soft); }
.audience-user-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.audience-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px 5px 10px;
  border-radius: 999px; font-size: 12px; font-weight: 600;
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel)); color: var(--brand-primary);
}
.audience-chip-x {
  border: 0; background: transparent; color: inherit; font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px;
}
@media (max-width: 720px) {
  .aud-lists, .audience-modes { grid-template-columns: 1fr; }
  .doc-form-grid,
  .drop-form-grid {
    grid-template-columns: 1fr;
  }
  .doc-form-grid .span-2,
  .doc-form-grid .span-3,
  .drop-form-grid .span-2,
  .drop-form-grid .span-all { grid-column: 1; }
  .drop-test {
    grid-template-columns: 1fr;
  }
  .audience-users-head {
    grid-template-columns: 1fr;
  }
  .folder-grid,
  .file-board { grid-template-columns: 1fr 1fr; }
  .docs-bulk-bar {
    align-items: stretch;
  }
  .docs-bulk-actions {
    width: 100%;
    margin-left: 0;
  }
  .docs-bulk-group {
    width: 100%;
    flex-wrap: wrap;
  }
  .docs-bulk-status-pills {
    flex: 1;
  }
  .docs-bulk-sep { display: none; }
  .docs-bulk-btn { flex: 1 1 auto; justify-content: center; }
}
@media (max-width: 480px) {
  .folder-grid,
  .file-board { grid-template-columns: 1fr; }
}
</style>
