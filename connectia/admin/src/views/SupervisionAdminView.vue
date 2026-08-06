<template>
  <div class="sv">
    <AdminPageHeader
      title="Supervisión comercial"
    >
      <template #actions>
        <button
          type="button"
          class="btn-ghost btn-icon-only"
          :class="{ on: showStructure }"
          :aria-pressed="showStructure"
          :title="showStructure ? 'Volver a asignaciones' : 'Configuración'"
          :aria-label="showStructure ? 'Volver a asignaciones' : 'Configuración'"
          @click="toggleStructure"
        >
          <i :class="showStructure ? 'fas fa-arrow-left' : 'fas fa-cog'" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn-ghost btn-icon-only"
          :disabled="busy"
          title="Cargar datos demo"
          aria-label="Cargar datos demo"
          @click="runSeedDemo"
        >
          <i class="fas fa-database" aria-hidden="true"></i>
        </button>
        <label
          class="sv-mod-switch"
          :class="{ on: moduleEnabled, busy: moduleBusy }"
          :title="
            moduleEnabled
              ? 'Módulo activo en esta comunidad (menú + capability). Clic para desactivar.'
              : 'Módulo inactivo. Clic para activar menú y capability en esta comunidad.'
          "
        >
          <input
            type="checkbox"
            role="switch"
            :checked="moduleEnabled"
            :disabled="busy || moduleBusy"
            :aria-checked="moduleEnabled"
            aria-label="Activar o desactivar Supervisión comercial en esta comunidad"
            @change="onModuleToggle"
          />
          <span class="sv-mod-track" aria-hidden="true">
            <span class="sv-mod-knob" />
          </span>
          <span class="sv-mod-text">
            <span class="sv-mod-state">{{ moduleEnabled ? 'Activo' : 'Inactivo' }}</span>
            <span class="sv-mod-sub">Módulo</span>
          </span>
        </label>
        <button
          type="button"
          class="btn-ghost btn-icon-only"
          :disabled="busy"
          title="Actualizar"
          aria-label="Actualizar"
          @click="loadAll"
        >
          <i class="fas fa-sync-alt" aria-hidden="true"></i>
        </button>
      </template>
    </AdminPageHeader>

    <ScreenHelp
      purpose="Con este módulo dejás lista la supervisión en locales: quién va, a qué cuenta, qué tiene que revisar y con qué evidencia."
      :six-w="helpSixW"
      :examples="helpExamples"
      guide-kind="supervision"
      @open-graph="onGuideOpenGraph"
    />

    <p v-if="error && !createKind" class="sv-err" role="alert">{{ error }}</p>

    <Teleport to="body">
      <div
        v-if="okMsg"
        class="sv-toast"
        :class="okMsgIsError ? 'sv-toast--err' : 'sv-toast--ok'"
        role="status"
        aria-live="polite"
      >
        <i
          :class="okMsgIsError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"
          aria-hidden="true"
        />
        <span>{{ okMsg }}</span>
        <button type="button" class="sv-toast-close" aria-label="Cerrar" @click="dismissOk">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </Teleport>

    <nav v-if="showStructure" class="sv-tabs" aria-label="Secciones de configuración">
      <button
        v-for="t in visibleTabs"
        :key="t.id"
        type="button"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        <i v-if="t.icon" :class="t.icon" aria-hidden="true"></i>
        {{ t.label }}
        <span v-if="t.count != null" class="sv-pill">{{ t.count }}</span>
      </button>
    </nav>

    <!-- Cadenas -->
    <section v-if="tab === 'cadenas'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2>Cadenas</h2>
          <p>Marcas o redes comerciales bajo las que agrupan salas.</p>
        </div>
        <div class="sv-toolbar">
          <SupImportBlock kind="cadenas" @done="onImport" />
          <button type="button" class="btn-ghost" @click="openStructureGraph('all')">
            <i class="fas fa-sitemap" aria-hidden="true"></i>
            Grafo
          </button>
          <button type="button" class="btn-primary" @click="openCreate('cadena')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Cadena
          </button>
        </div>
      </header>
      <div v-if="cadenas.length" class="sv-cards">
        <article
          v-for="c in cadenas"
          :key="c.id"
          class="sv-card"
          :class="{ off: c.activo === false }"
        >
          <header class="sv-card-top">
            <h3 :title="c.nombre">{{ c.nombre }}</h3>
            <span class="sv-badge" :class="{ warn: c.activo === false }">
              {{ c.activo === false ? 'Inactiva' : 'Activa' }}
            </span>
          </header>
          <dl class="sv-card-stats">
            <div>
              <dt>Salas</dt>
              <dd>{{ salasOfCadena(c.id) }}</dd>
            </div>
            <div>
              <dt>Subcadenas</dt>
              <dd>{{ subcadenasOfCadena(c.id) }}</dd>
            </div>
            <div>
              <dt>Asignac.</dt>
              <dd>{{ asignacionesOfCadena(c.id) }}</dd>
            </div>
          </dl>
          <footer class="sv-icon-actions">
            <button
              type="button"
              class="sv-icon-btn"
              title="Ver grafo desde esta cadena"
              aria-label="Ver grafo desde esta cadena"
              @click="openStructureGraph('cadena', c.id)"
            >
              <i class="fas fa-sitemap" aria-hidden="true"></i>
            </button>
          </footer>
        </article>
      </div>
      <p v-else class="sv-empty sv-empty--block">Todavía no hay cadenas.</p>
    </section>

    <!-- Subcadenas -->
    <section v-if="tab === 'subcadenas'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2>Subcadenas</h2>
          <p>Segmentos dentro de una cadena (express, premium, etc.).</p>
        </div>
        <div class="sv-toolbar">
          <SupImportBlock kind="subcadenas" @done="onImport" />
          <button type="button" class="btn-primary" @click="openCreate('subcadena')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Subcadena
          </button>
        </div>
      </header>
      <div v-if="subcadenas.length" class="sv-cards">
        <article
          v-for="s in subcadenas"
          :key="s.id"
          class="sv-card"
          :class="{ off: s.activo === false }"
        >
          <header class="sv-card-top">
            <h3 :title="s.nombre">{{ s.nombre }}</h3>
            <span class="sv-badge" :class="{ warn: s.activo === false }">
              {{ s.activo === false ? 'Off' : 'Activa' }}
            </span>
          </header>
          <p class="sv-card-line">
            <i class="fas fa-store" aria-hidden="true"></i>
            {{ cadenaName(s.cadenaId) }}
          </p>
          <dl class="sv-card-stats">
            <div>
              <dt>Salas</dt>
              <dd>{{ salasOfSubcadena(s.id) }}</dd>
            </div>
          </dl>
          <footer class="sv-icon-actions">
            <button
              type="button"
              class="sv-icon-btn"
              title="Ver grafo desde esta subcadena"
              aria-label="Ver grafo desde esta subcadena"
              @click="openStructureGraph('subcadena', s.id)"
            >
              <i class="fas fa-sitemap" aria-hidden="true"></i>
            </button>
          </footer>
        </article>
      </div>
      <p v-else class="sv-empty sv-empty--block">Sin subcadenas.</p>
    </section>

    <!-- Clientes -->
    <section v-if="tab === 'clientes'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2>Clientes</h2>
          <p>Cuentas comerciales que se visitan / auditan en sala.</p>
        </div>
        <div class="sv-toolbar">
          <label class="sv-search">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input v-model="qClientes" type="search" placeholder="Buscar cliente…" aria-label="Buscar clientes" />
          </label>
          <SupImportBlock kind="clientes" @done="onImport" />
          <button type="button" class="btn-primary" @click="openCreate('cliente')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Cliente
          </button>
        </div>
      </header>
      <div v-if="filteredClientes.length" class="sv-cards">
        <article
          v-for="c in filteredClientes"
          :key="c.id"
          class="sv-card"
          :class="{ off: c.activo === false }"
        >
          <header class="sv-card-top">
            <h3 :title="c.nombre">{{ c.nombre }}</h3>
            <span class="sv-badge" :class="{ warn: c.activo === false }">
              {{ c.activo === false ? 'Inactivo' : 'Activo' }}
            </span>
          </header>
          <p class="sv-card-line">
            <i class="fas fa-hashtag" aria-hidden="true"></i>
            {{ c.codigo || 'Sin código' }}
          </p>
          <dl class="sv-card-stats">
            <div>
              <dt>Salas</dt>
              <dd>{{ salasOfCliente(c.id) }}</dd>
            </div>
            <div>
              <dt>Colabs.</dt>
              <dd>{{ colabsOfCliente(c.id) }}</dd>
            </div>
          </dl>
          <footer class="sv-icon-actions">
            <button
              type="button"
              class="sv-icon-btn"
              title="Ver grafo: salas donde cubre este cliente"
              aria-label="Ver grafo del cliente"
              @click="openStructureGraph('cliente', c.id)"
            >
              <i class="fas fa-sitemap" aria-hidden="true"></i>
            </button>
          </footer>
        </article>
      </div>
      <p v-else class="sv-empty sv-empty--block">Sin clientes.</p>
    </section>

    <!-- Salas -->
    <section v-if="tab === 'salas'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2>Salas / PDV</h2>
          <p>Puntos de venta o locales donde se ejecutan las visitas.</p>
        </div>
        <div class="sv-toolbar">
          <label class="sv-search">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input v-model="qSalas" type="search" placeholder="Buscar sala…" aria-label="Buscar salas" />
          </label>
          <SupImportBlock kind="salas" @done="onImport" />
          <button type="button" class="btn-primary" @click="openCreate('sala')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Sala
          </button>
        </div>
      </header>
      <div v-if="filteredSalas.length" class="sv-cards">
        <article
          v-for="s in filteredSalas"
          :key="s.id"
          class="sv-card"
          :class="{ off: s.activo === false }"
        >
          <header class="sv-card-top">
            <h3 :title="s.nombre">{{ s.nombre }}</h3>
            <span class="sv-badge" :class="{ warn: s.activo === false }">
              {{ s.activo === false ? 'Off' : 'Activa' }}
            </span>
          </header>
          <p v-if="s.codigo" class="sv-card-line">
            <i class="fas fa-barcode" aria-hidden="true"></i>
            {{ s.codigo }}
          </p>
          <p class="sv-card-line">
            <i class="fas fa-store" aria-hidden="true"></i>
            {{ cadenaName(s.cadenaId) }}
            <template v-if="s.subcadenaId"> · {{ subcadenaName(s.subcadenaId) }}</template>
          </p>
          <dl class="sv-card-stats">
            <div>
              <dt>Clientes</dt>
              <dd>{{ clientesOfSala(s.id) }}</dd>
            </div>
            <div>
              <dt>Colabs.</dt>
              <dd>{{ colabsOfSala(s.id) }}</dd>
            </div>
          </dl>
          <footer class="sv-icon-actions">
            <button
              type="button"
              class="sv-icon-btn"
              :class="{ on: hasSalaGeo(s) }"
              title="Geolocalización"
              aria-label="Configurar geolocalización"
              @click="openSalaGeoEdit(s)"
            >
              <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="sv-icon-btn"
              title="Ver grafo desde esta sala"
              aria-label="Ver grafo de la sala"
              @click="openStructureGraph('sala', s.id)"
            >
              <i class="fas fa-sitemap" aria-hidden="true"></i>
            </button>
          </footer>
        </article>
      </div>
      <p v-else class="sv-empty sv-empty--block">Sin salas.</p>
    </section>

    <!-- Asignaciones (cobertura · visita · acción solicitada) -->
    <section v-if="tab === 'asignaciones'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2 class="sv-title-row">
            Asignaciones
            <span class="sv-title-count" :title="asigTotalAll + ' asignaciones'">{{ asigTotalAll }}</span>
          </h2>
        </div>
        <div class="sv-toolbar">
          <div class="sv-create-group" role="group" aria-label="Nueva asignación">
            <button type="button" class="btn-primary" @click="openCreate('relacion')">
              <i class="fas fa-plus" aria-hidden="true"></i>
              Cobertura
            </button>
            <button type="button" class="btn-ghost" @click="openCreate('visita')">
              <i class="fas fa-plus" aria-hidden="true"></i>
              Visita
            </button>
            <button type="button" class="btn-ghost" @click="openCreate('consulta')">
              <i class="fas fa-plus" aria-hidden="true"></i>
              Acción solicitada
            </button>
          </div>
          <SupImportBlock kind="asignaciones" @done="onImport" />
        </div>
      </header>

      <div class="sv-asig-toolbar" role="toolbar" aria-label="Filtros y vista">
        <input
          v-model="asigQ"
          class="sv-input sv-asig-q"
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar asignaciones"
          @input="asigPage = 1"
        />
        <select v-model="asigEstadoFiltro" class="sv-input sv-asig-sel" @change="asigPage = 1">
          <option value="activa">Activas</option>
          <option value="pendiente">Pendientes</option>
          <option value="inactiva">Inactivas</option>
          <option value="">Todas</option>
          <option value="ok">Acciones OK</option>
          <option value="visto">Acciones vistas</option>
        </select>
        <button
          type="button"
          class="sv-adv-btn"
          :class="{ on: asigAdvOpen || asigAdvActiveCount }"
          :aria-expanded="asigAdvOpen"
          :aria-pressed="asigAdvOpen"
          title="Filtros avanzados"
          aria-label="Filtros avanzados"
          @click="asigAdvOpen = !asigAdvOpen"
        >
          <i class="fas fa-sliders-h" aria-hidden="true"></i>
          <span v-if="asigAdvActiveCount" class="sv-adv-n">{{ asigAdvActiveCount }}</span>
        </button>
        <div class="sv-view-toggle" role="group" aria-label="Vista">
          <button
            type="button"
            class="sv-view-btn"
            :class="{ on: asigViewMode === 'cards' }"
            :aria-pressed="asigViewMode === 'cards'"
            title="Vista cards"
            @click="setAsigViewMode('cards')"
          >
            <i class="fas fa-th-large" aria-hidden="true"></i>
            Cards
          </button>
          <button
            type="button"
            class="sv-view-btn"
            :class="{ on: asigViewMode === 'table' }"
            :aria-pressed="asigViewMode === 'table'"
            title="Vista grilla"
            @click="setAsigViewMode('table')"
          >
            <i class="fas fa-table" aria-hidden="true"></i>
            Grilla
          </button>
        </div>
      </div>

      <div v-if="asigAdvOpen" class="sv-adv-panel">
        <label class="sv-adv-field">
          <span><i class="fas fa-user" aria-hidden="true"></i> Persona asignada</span>
          <select v-model="asigPersonaId" class="sv-input" @change="asigPage = 1">
            <option value="">Todas</option>
            <option v-for="u in asigPersonasOptions" :key="u.id" :value="u.id">{{ u.nombre }}</option>
          </select>
        </label>
        <label class="sv-adv-field">
          <span><i class="fas fa-building" aria-hidden="true"></i> Cliente</span>
          <select v-model="asigClienteId" class="sv-input" @change="asigPage = 1">
            <option value="">Todos</option>
            <option v-for="c in asigClientesOptions" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <label class="sv-adv-field">
          <span><i class="fas fa-store" aria-hidden="true"></i> Cadena</span>
          <select v-model="asigCadenaId" class="sv-input" @change="onAsigCadenaFilterChange">
            <option value="">Todas</option>
            <option v-for="c in asigCadenasOptions" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <label class="sv-adv-field">
          <span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> Sala</span>
          <select v-model="asigSalaId" class="sv-input" @change="asigPage = 1">
            <option value="">Todas</option>
            <option v-for="s in asigSalasOptions" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </label>
        <div class="sv-adv-actions">
          <button
            type="button"
            class="btn-ghost"
            :disabled="!asigAdvActiveCount"
            @click="clearAsigAdvFilters"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div class="sv-tipo-filters" role="tablist" aria-label="Filtrar por tipo">
        <button
          v-for="f in ASIG_FILTROS"
          :key="f.id"
          type="button"
          role="tab"
          :aria-selected="asigFiltro === f.id"
          :class="{ on: asigFiltro === f.id }"
          @click="asigFiltro = f.id; asigPage = 1"
        >
          {{ f.label }}
          <span class="sv-tipo-n">{{ countAsigTipo(f.id) }}</span>
        </button>
      </div>

      <p class="sv-asig-meta">
        {{ asigTotal }} resultado{{ asigTotal === 1 ? '' : 's' }}
      </p>

      <!-- Cards -->
      <div v-if="asigViewMode === 'cards'" class="sv-rel-grid">
        <article
          v-for="row in asigPageItems"
          :key="row.key"
          class="sv-rel-card"
          :class="{ off: row.off, 'sv-rel-card--sin-asig': sinAsignados(row) }"
        >
          <span
            v-if="sinAsignados(row)"
            class="sv-sin-asig-ribbon"
            title="Sin personas asignadas"
          >sin asignados</span>
          <header class="sv-card-top">
            <span
              class="sv-tipo-badge"
              :class="'sv-tipo-badge--' + row.tipo"
              title="Tipo de asignación"
            >{{ row.tipoLabel }}</span>
            <span class="sv-badge" :class="row.estadoClass">{{ row.estado }}</span>
          </header>

          <template v-if="row.tipo === 'cobertura'">
            <h3 class="sv-asig-title" :title="row.titulo">{{ row.titulo }}</h3>
            <p v-if="row.createdAt" class="sv-asig-created" :title="'Creada ' + formatCreatedAt(row.createdAt)">
              {{ formatCreatedAt(row.createdAt) }}
            </p>
            <div class="sv-rel-meta" aria-label="Jerarquía">
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.cadena }">
                <strong title="Cadena">
                  <i class="fas fa-store" aria-hidden="true"></i>
                  <span v-if="row.cadena">{{ row.cadena }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.subcadena }">
                <strong title="Subcadena">
                  <i class="fas fa-code-branch" aria-hidden="true"></i>
                  <span v-if="row.subcadena">{{ row.subcadena }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.cliente }">
                <strong title="Cliente">
                  <i class="fas fa-building" aria-hidden="true"></i>
                  <span v-if="row.cliente">{{ row.cliente }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.sala }">
                <strong title="Sala">
                  <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                  <span v-if="row.sala">{{ row.sala }}</span>
                </strong>
              </div>
            </div>
            <div v-if="rowAsignados(row).length" class="sv-rel-team">
              <ul class="sv-colab-list" title="Equipo">
                <li
                  v-for="c in previewAsignados(row)"
                  :key="(c.userId || '') + (c.role || '')"
                >
                  <span class="sv-colab-who">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span class="sv-colab-name">{{ userName(c.userId) }}</span>
                    <span v-if="c.role" class="sv-role">{{ roleLabel(c.role) }}</span>
                  </span>
                  <button
                    type="button"
                    class="sv-colab-x"
                    title="Quitar asignado"
                    :aria-label="'Quitar a ' + userName(c.userId)"
                    @click="askRemoveAsignado(row, c)"
                  >
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </li>
              </ul>
              <button
                v-if="rowAsignados(row).length > ASIG_PREVIEW_LIMIT"
                type="button"
                class="sv-ver-mas"
                @click="openAsignadosModal(row)"
              >
                Ver más ({{ rowAsignados(row).length }})
              </button>
            </div>
          </template>

          <template v-else-if="row.tipo === 'visita'">
            <h3 class="sv-asig-title" :title="row.titulo">{{ row.titulo }}</h3>
            <p v-if="row.createdAt" class="sv-asig-created" :title="'Creada ' + formatCreatedAt(row.createdAt)">
              {{ formatCreatedAt(row.createdAt) }}
            </p>
            <div class="sv-rel-meta" aria-label="Jerarquía">
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.cadena }">
                <strong title="Cadena">
                  <i class="fas fa-store" aria-hidden="true"></i>
                  <span v-if="row.cadena">{{ row.cadena }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.subcadena }">
                <strong title="Subcadena">
                  <i class="fas fa-code-branch" aria-hidden="true"></i>
                  <span v-if="row.subcadena">{{ row.subcadena }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.cliente }">
                <strong title="Cliente">
                  <i class="fas fa-building" aria-hidden="true"></i>
                  <span v-if="row.cliente">{{ row.cliente }}</span>
                </strong>
              </div>
              <div class="sv-rel-field" :class="{ 'sv-rel-field--empty': !row.sala }">
                <strong title="Sala">
                  <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                  <span v-if="row.sala">{{ row.sala }}</span>
                </strong>
              </div>
            </div>
            <div class="sv-rel-field">
              <strong title="Agenda">
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                <span>{{ row.detalle || 'Sin agenda' }}</span>
              </strong>
            </div>
            <div class="sv-rel-field">
              <button
                v-if="row.templateId && row.templateNombre"
                type="button"
                class="sv-tpl-link"
                title="Ver plantilla de checklist"
                @click="openTemplatePreview(row.templateId)"
              >
                <i class="fas fa-clipboard-list" aria-hidden="true"></i>
                <span>{{ row.templateNombre }}</span>
              </button>
              <strong v-else class="sv-muted" title="Plantilla">
                <i class="fas fa-clipboard-list" aria-hidden="true"></i>
                <span>Sin plantilla</span>
              </strong>
            </div>
            <div v-if="rowAsignados(row).length" class="sv-rel-team">
              <ul class="sv-colab-list" title="Asignados">
                <li
                  v-for="c in previewAsignados(row)"
                  :key="c.userId"
                >
                  <span class="sv-colab-who">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span class="sv-colab-name">{{ userName(c.userId) }}</span>
                  </span>
                  <button
                    type="button"
                    class="sv-colab-x"
                    title="Quitar asignado"
                    :aria-label="'Quitar a ' + userName(c.userId)"
                    @click="askRemoveAsignado(row, c)"
                  >
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </li>
              </ul>
              <button
                v-if="rowAsignados(row).length > ASIG_PREVIEW_LIMIT"
                type="button"
                class="sv-ver-mas"
                @click="openAsignadosModal(row)"
              >
                Ver más ({{ rowAsignados(row).length }})
              </button>
            </div>
            <dl class="sv-card-stats">
              <div>
                <dd class="sv-dd-date" title="Próxima"><i class="fas fa-clock" aria-hidden="true"></i> {{ formatWhen(row.fecha) }}</dd>
              </div>
              <div>
                <dd title="Plazo"><i class="fas fa-hourglass-half" aria-hidden="true"></i> {{ row.plazoHoras || 24 }}h</dd>
              </div>
            </dl>
          </template>

          <template v-else>
            <h3 class="sv-asig-title" :title="row.titulo">{{ row.titulo }}</h3>
            <div class="sv-rel-field">
              <strong title="Contenido"><i class="fas fa-file-alt" aria-hidden="true"></i> {{ row.detalle }}</strong>
              <small>{{ row.refTypeLabel }}</small>
            </div>
            <div class="sv-rel-team">
              <ul class="sv-colab-list" title="Asignados">
                <li
                  v-for="c in previewAsignados(row)"
                  :key="c.userId"
                >
                  <span class="sv-colab-who">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span class="sv-colab-name">{{ userName(c.userId) }}</span>
                  </span>
                  <button
                    type="button"
                    class="sv-colab-x"
                    title="Quitar asignado"
                    :aria-label="'Quitar a ' + userName(c.userId)"
                    @click="askRemoveAsignado(row, c)"
                  >
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </li>
                <li v-if="!rowAsignados(row).length" class="sv-muted">
                  <i class="fas fa-user" aria-hidden="true"></i> Sin asignar
                </li>
              </ul>
              <button
                v-if="rowAsignados(row).length > ASIG_PREVIEW_LIMIT"
                type="button"
                class="sv-ver-mas"
                @click="openAsignadosModal(row)"
              >
                Ver más ({{ rowAsignados(row).length }})
              </button>
            </div>
            <div v-if="row.fecha" class="sv-rel-field">
              <strong title="Vence"><i class="fas fa-calendar-day" aria-hidden="true"></i> {{ formatWhen(row.fecha) }}</strong>
            </div>
          </template>

          <footer class="sv-icon-actions" role="group" :aria-label="'Acciones de ' + row.tipoLabel">
            <button
              v-if="hasRowGeo(row)"
              type="button"
              class="sv-icon-btn sv-icon-btn--maps"
              title="Ver geolocalización en el mapa"
              aria-label="Ver geolocalización en el mapa"
              @click="openMapPreview(row)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path fill="#EA4335" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle fill="#fff" cx="12" cy="9" r="2.5"/>
              </svg>
            </button>
            <button
              v-if="row.tipo === 'cobertura' && hasCoberturaDetalle(row)"
              type="button"
              class="sv-icon-btn"
              title="Ver qué se cubre / checklist"
              aria-label="Ver descripción de la cobertura"
              @click="openCoberturaDetalle(row)"
            >
              <i class="fas fa-clipboard-list" aria-hidden="true"></i>
            </button>
            <template v-if="row.tipo === 'cobertura'">
              <button
                type="button"
                class="sv-icon-btn"
                title="Editar cobertura"
                aria-label="Editar cobertura"
                @click="openEditCobertura(row)"
              >
                <i class="fas fa-pen" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                title="Ver / sumar asignados"
                aria-label="Ver o sumar asignados"
                @click="openAsignadosModal(row)"
              >
                <i class="fas fa-user-plus" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                :class="{ warn: !row.off }"
                :title="row.off ? 'Activar cobertura' : 'Desactivar cobertura'"
                :aria-label="row.off ? 'Activar cobertura' : 'Desactivar cobertura'"
                @click="toggleCobertura(row)"
              >
                <i :class="row.off ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" aria-hidden="true"></i>
              </button>
            </template>
            <template v-else-if="row.tipo === 'visita'">
              <button
                v-if="row.templateId"
                type="button"
                class="sv-icon-btn"
                title="Ver plantilla"
                aria-label="Ver plantilla de checklist"
                @click="openTemplatePreview(row.templateId)"
              >
                <i class="fas fa-clipboard-list" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                title="Editar visita"
                aria-label="Editar visita"
                @click="openEditVisita(row)"
              >
                <i class="fas fa-pen" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                title="Ver / sumar asignados"
                aria-label="Ver o sumar asignados"
                @click="openAsignadosModal(row)"
              >
                <i class="fas fa-user-plus" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                :class="{ ok: row.off }"
                :title="row.off ? 'Reactivar visita' : 'Pausar visita'"
                :aria-label="row.off ? 'Reactivar visita' : 'Pausar visita'"
                @click="toggleVisitaEnabled(row.raw)"
              >
                <i :class="row.off ? 'fas fa-play' : 'fas fa-pause'" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn danger"
                title="Quitar visita"
                aria-label="Quitar visita"
                @click="removeVisita(row.id)"
              >
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="sv-icon-btn"
                title="Editar acción solicitada"
                aria-label="Editar acción solicitada"
                @click="openEditConsulta(row)"
              >
                <i class="fas fa-pen" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                title="Ver / sumar asignados"
                aria-label="Ver o sumar asignados"
                @click="openAsignadosModal(row)"
              >
                <i class="fas fa-user-plus" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                :class="{ on: row.status === 'pendiente' }"
                title="Marcar pendiente"
                aria-label="Marcar pendiente"
                @click="setConsultaStatus(row.id, 'pendiente')"
              >
                <i class="fas fa-clock" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                :class="{ on: row.status === 'visto' }"
                title="Marcar visto"
                aria-label="Marcar visto"
                @click="setConsultaStatus(row.id, 'visto')"
              >
                <i class="fas fa-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn"
                :class="{ ok: row.status === 'ok' }"
                title="Marcar OK"
                aria-label="Marcar OK"
                @click="setConsultaStatus(row.id, 'ok')"
              >
                <i class="fas fa-check" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="sv-icon-btn danger"
                title="Quitar acción solicitada"
                aria-label="Quitar acción solicitada"
                @click="removeConsulta(row.id)"
              >
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </template>
          </footer>
        </article>

        <div v-if="!asigTotal" class="sv-empty sv-empty--block">
          Todavía no hay asignaciones
          {{ asigFiltro === 'todas' ? '' : ` de tipo «${ASIG_FILTROS.find((f) => f.id === asigFiltro)?.label || asigFiltro}»` }}.
          Creá una con los botones de arriba.
        </div>
      </div>

      <!-- Grilla -->
      <div v-else class="sv-asig-table-wrap">
        <table class="sv-asig-table" v-if="asigTotal">
          <thead>
            <tr>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('tipo')">
                  Tipo {{ asigSortMark('tipo') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('titulo')">
                  Título {{ asigSortMark('titulo') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('cadena')">
                  Punto {{ asigSortMark('cadena') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('detalle')">
                  Detalle {{ asigSortMark('detalle') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('persona')">
                  Asignados {{ asigSortMark('persona') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('estado')">
                  Estado {{ asigSortMark('estado') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('fecha')">
                  Agenda {{ asigSortMark('fecha') }}
                </button>
              </th>
              <th>
                <button type="button" class="sv-th-sort" @click="toggleAsigSort('createdAt')">
                  Creada {{ asigSortMark('createdAt') }}
                </button>
              </th>
              <th class="sv-asig-actions-h">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in asigPageItems" :key="row.key" :class="{ off: row.off }">
              <td>
                <span
                  class="sv-tipo-badge"
                  :class="'sv-tipo-badge--' + row.tipo"
                >{{ row.tipoLabel }}</span>
              </td>
              <td class="sv-td-title">
                <strong class="sv-asig-title-cell">{{ row.titulo }}</strong>
                <p
                  v-if="row.tipo === 'cobertura' && row.descripcion"
                  class="sv-asig-desc-cell"
                  :title="row.descripcion"
                >{{ row.descripcion }}</p>
                <p
                  v-else-if="row.tipo === 'visita' && row.raw?.descripcion"
                  class="sv-asig-desc-cell"
                  :title="row.raw.descripcion"
                >{{ row.raw.descripcion }}</p>
                <p
                  v-else-if="row.tipo === 'consulta' && row.raw?.instrucciones"
                  class="sv-asig-desc-cell"
                  :title="row.raw.instrucciones"
                >{{ row.raw.instrucciones }}</p>
              </td>
              <td class="sv-td-punto">
                <template v-if="row.tipo === 'cobertura' || row.tipo === 'visita'">
                  <div class="sv-punto-lines">
                    <span v-if="row.cadena" class="sv-punto-line" title="Cadena">
                      <i class="fas fa-store" aria-hidden="true"></i>{{ row.cadena }}
                    </span>
                    <span v-if="row.subcadena" class="sv-punto-line" title="Subcadena">
                      <i class="fas fa-code-branch" aria-hidden="true"></i>{{ row.subcadena }}
                    </span>
                    <span v-if="row.cliente" class="sv-punto-line" title="Cliente">
                      <i class="fas fa-building" aria-hidden="true"></i>{{ row.cliente }}
                    </span>
                    <span v-if="row.sala" class="sv-punto-line" title="Sala">
                      <i class="fas fa-map-marker-alt" aria-hidden="true"></i>{{ row.sala }}
                    </span>
                    <span v-if="!row.cadena && !row.subcadena && !row.cliente && !row.sala" class="sv-muted">—</span>
                  </div>
                </template>
                <template v-else>
                  <span class="sv-punto-line">
                    <i class="fas fa-tag" aria-hidden="true"></i>{{ row.refTypeLabel || '—' }}
                  </span>
                </template>
              </td>
              <td class="sv-td-detalle">
                <template v-if="row.tipo === 'cobertura'">
                  <span v-if="row.templateNombre" class="sv-detalle-chip" title="Checklist">
                    <i class="fas fa-clipboard-list" aria-hidden="true"></i>{{ row.templateNombre }}
                  </span>
                  <span v-else class="sv-muted">Sin checklist</span>
                </template>
                <template v-else-if="row.tipo === 'visita'">
                  <div class="sv-detalle-stack">
                    <span title="Agenda"><i class="fas fa-calendar-alt" aria-hidden="true"></i>{{ row.detalle }}</span>
                    <button
                      v-if="row.templateId && row.templateNombre"
                      type="button"
                      class="sv-tpl-link sv-tpl-link--table"
                      title="Ver plantilla"
                      @click="openTemplatePreview(row.templateId)"
                    >
                      <i class="fas fa-clipboard-list" aria-hidden="true"></i>{{ row.templateNombre }}
                    </button>
                    <span v-else class="sv-muted">Sin plantilla</span>
                    <span v-if="row.plazoHoras" class="sv-muted" title="Plazo">{{ row.plazoHoras }}h plazo</span>
                    <span v-if="row.raw?.prioridad" class="sv-muted" title="Prioridad">Prioridad {{ row.raw.prioridad }}</span>
                    <span v-if="row.raw?.requiereFoto" class="sv-muted"><i class="fas fa-camera" aria-hidden="true"></i> Foto</span>
                  </div>
                </template>
                <template v-else>
                  <div class="sv-detalle-stack">
                    <span>{{ row.detalle }}</span>
                    <span v-if="row.refTypeLabel" class="sv-muted">{{ row.refTypeLabel }}</span>
                  </div>
                </template>
              </td>
              <td class="sv-td-equipo">
                <ul v-if="rowAsignados(row).length" class="sv-equipo-mini">
                  <li v-for="c in previewAsignados(row)" :key="(c.userId || '') + (c.role || '')">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span>{{ userName(c.userId) }}</span>
                    <span v-if="c.role" class="sv-role">{{ roleLabel(c.role) }}</span>
                  </li>
                </ul>
                <span v-else class="sv-muted">Sin asignar</span>
                <button
                  v-if="rowAsignados(row).length > ASIG_PREVIEW_LIMIT"
                  type="button"
                  class="sv-ver-mas sv-ver-mas--table"
                  @click="openAsignadosModal(row)"
                >
                  Ver más ({{ rowAsignados(row).length }})
                </button>
              </td>
              <td>
                <span class="sv-badge" :class="row.estadoClass">{{ row.estado }}</span>
              </td>
              <td class="sv-td-agenda">
                <template v-if="row.tipo === 'visita'">
                  <span class="sv-dd-date" title="Próxima">{{ formatWhen(row.fecha) }}</span>
                </template>
                <template v-else-if="row.tipo === 'consulta'">
                  <span class="sv-dd-date" title="Vence">{{ row.fecha ? formatWhen(row.fecha) : 'Sin vencimiento' }}</span>
                </template>
                <span v-else class="sv-muted">—</span>
              </td>
              <td class="sv-td-created">
                <span v-if="row.createdAt">{{ formatCreatedAt(row.createdAt) }}</span>
                <span v-else class="sv-muted">—</span>
              </td>
              <td class="sv-asig-actions">
                <div class="sv-icon-actions sv-icon-actions--inline" role="group" :aria-label="'Acciones de ' + row.tipoLabel">
                  <button
                    v-if="hasRowGeo(row)"
                    type="button"
                    class="sv-icon-btn sv-icon-btn--maps"
                    title="Ver geolocalización"
                    aria-label="Ver geolocalización"
                    @click="openMapPreview(row)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path fill="#EA4335" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      <circle fill="#fff" cx="12" cy="9" r="2.5"/>
                    </svg>
                  </button>
                  <button
                    v-if="row.tipo === 'cobertura' && hasCoberturaDetalle(row)"
                    type="button"
                    class="sv-icon-btn"
                    title="Ver qué se cubre"
                    aria-label="Ver descripción de la cobertura"
                    @click="openCoberturaDetalle(row)"
                  >
                    <i class="fas fa-clipboard-list" aria-hidden="true"></i>
                  </button>
                  <template v-if="row.tipo === 'cobertura'">
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Editar cobertura"
                      aria-label="Editar cobertura"
                      @click="openEditCobertura(row)"
                    >
                      <i class="fas fa-pen" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Ver / sumar asignados"
                      aria-label="Ver o sumar asignados"
                      @click="openAsignadosModal(row)"
                    >
                      <i class="fas fa-user-plus" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      :class="{ warn: !row.off }"
                      :title="row.off ? 'Activar' : 'Desactivar'"
                      :aria-label="row.off ? 'Activar cobertura' : 'Desactivar cobertura'"
                      @click="toggleCobertura(row)"
                    >
                      <i :class="row.off ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" aria-hidden="true"></i>
                    </button>
                  </template>
                  <template v-else-if="row.tipo === 'visita'">
                    <button
                      v-if="row.templateId"
                      type="button"
                      class="sv-icon-btn"
                      title="Ver plantilla"
                      aria-label="Ver plantilla de checklist"
                      @click="openTemplatePreview(row.templateId)"
                    >
                      <i class="fas fa-clipboard-list" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Editar visita"
                      aria-label="Editar visita"
                      @click="openEditVisita(row)"
                    >
                      <i class="fas fa-pen" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Ver / sumar asignados"
                      aria-label="Ver o sumar asignados"
                      @click="openAsignadosModal(row)"
                    >
                      <i class="fas fa-user-plus" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      :class="{ ok: row.off }"
                      :title="row.off ? 'Reactivar' : 'Pausar'"
                      :aria-label="row.off ? 'Reactivar visita' : 'Pausar visita'"
                      @click="toggleVisitaEnabled(row.raw)"
                    >
                      <i :class="row.off ? 'fas fa-play' : 'fas fa-pause'" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn danger"
                      title="Quitar"
                      aria-label="Quitar visita"
                      @click="removeVisita(row.id)"
                    >
                      <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    </button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Editar acción solicitada"
                      aria-label="Editar acción solicitada"
                      @click="openEditConsulta(row)"
                    >
                      <i class="fas fa-pen" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Ver / sumar asignados"
                      aria-label="Ver o sumar asignados"
                      @click="openAsignadosModal(row)"
                    >
                      <i class="fas fa-user-plus" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      :class="{ on: row.status === 'pendiente' }"
                      title="Pendiente"
                      aria-label="Marcar pendiente"
                      @click="setConsultaStatus(row.id, 'pendiente')"
                    >
                      <i class="fas fa-clock" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      :class="{ on: row.status === 'visto' }"
                      title="Visto"
                      aria-label="Marcar visto"
                      @click="setConsultaStatus(row.id, 'visto')"
                    >
                      <i class="fas fa-eye" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      :class="{ ok: row.status === 'ok' }"
                      title="OK"
                      aria-label="Marcar OK"
                      @click="setConsultaStatus(row.id, 'ok')"
                    >
                      <i class="fas fa-check" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="sv-icon-btn danger"
                      title="Quitar"
                      aria-label="Quitar acción solicitada"
                      @click="removeConsulta(row.id)"
                    >
                      <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="sv-empty sv-empty--block">
          Todavía no hay asignaciones
          {{ asigFiltro === 'todas' ? '' : ` de tipo «${ASIG_FILTROS.find((f) => f.id === asigFiltro)?.label || asigFiltro}»` }}.
          Creá una con los botones de arriba.
        </div>
      </div>

      <nav v-if="asigTotal > 0" class="sv-pager" aria-label="Paginación de asignaciones">
        <button
          type="button"
          class="sv-pager-btn"
          :disabled="asigPage <= 1"
          @click="asigPage = Math.max(1, asigPage - 1)"
        >
          Anterior
        </button>
        <span class="sv-pager-info">{{ asigPage }} / {{ asigPages }}</span>
        <button
          type="button"
          class="sv-pager-btn"
          :disabled="asigPage >= asigPages"
          @click="asigPage = Math.min(asigPages, asigPage + 1)"
        >
          Siguiente
        </button>
      </nav>

    </section>

    <!-- Catálogo del checklist -->
    <section v-if="tab === 'taxonomia'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2 class="sv-title-row">
            Catálogo del checklist
            <CfgInfoTip
              title="Catálogo del checklist"
              purpose="Piezas que usan las plantillas de visita para medir siempre lo mismo."
              :items="[
                'Categoría: agrupa plantillas (ej. Exhibición, Precio).',
                'Pilar: eje de control (ej. Disponibilidad).',
                'Medición: ítem chequeable del catálogo.',
                'Estado: ciclo de vida de la plantilla (borrador, publicada…).',
              ]"
            />
          </h2>
          <p>Piezas configurables que arman las plantillas de visita.</p>
        </div>
        <div class="sv-toolbar">
          <button type="button" class="btn-ghost" @click="tab = 'templates'">
            <i class="fas fa-clipboard-list" aria-hidden="true"></i>
            Plantillas
          </button>
          <button type="button" class="btn-ghost" @click="seedGeo">Seed geo</button>
          <button type="button" class="btn-primary" @click="openCreate('categoria')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Categoría
          </button>
          <button type="button" class="btn-primary" @click="openCreate('pilar')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Pilar
          </button>
          <button type="button" class="btn-primary" @click="openCreate('medicion')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Medición
          </button>
          <button type="button" class="btn-primary" @click="openCreate('estado')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Estado
          </button>
        </div>
      </header>
      <div class="sv-tax-grid">
        <div class="sv-tax-block">
          <h4>Categorías <span>{{ categorias.length }}</span></h4>
          <ul>
            <li v-for="x in categorias" :key="x.id">
              <i class="sv-dot" :style="{ background: x.color || 'var(--brand)' }" />
              {{ x.nombre }}
            </li>
          </ul>
        </div>
        <div class="sv-tax-block">
          <h4>Pilares <span>{{ pilares.length }}</span></h4>
          <ul>
            <li v-for="x in pilares" :key="x.id">{{ x.nombre }}</li>
          </ul>
        </div>
        <div class="sv-tax-block">
          <h4>Mediciones <span>{{ mediciones.length }}</span></h4>
          <ul>
            <li v-for="x in mediciones" :key="x.id">{{ x.nombre }}</li>
          </ul>
        </div>
        <div class="sv-tax-block">
          <h4>Estados <span>{{ templateEstados.length }}</span></h4>
          <ul>
            <li v-for="x in templateEstados" :key="x.id">{{ x.nombre }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Plantillas -->
    <section v-if="tab === 'templates'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2 class="sv-title-row">
            Plantillas de checklist
            <CfgInfoTip
              title="Plantillas de checklist"
              purpose="Son configurables: armás el checklist que después usan las visitas. Cada plantilla junta mediciones del catálogo (o líneas libres)."
              :items="[
                'Creá o editá plantillas acá (configuración).',
                'En cada ítem podés pedir evidencia: foto y/o texto.',
                'Asignalás a una visita programada o a una tarea en campo.',
                'El catálogo del checklist define las piezas reutilizables.',
              ]"
            />
          </h2>
          <p>Configurá qué se pregunta en una visita. Una línea = una medición.</p>
        </div>
        <div class="sv-toolbar">
          <button type="button" class="btn-ghost" @click="tab = 'taxonomia'">
            <i class="fas fa-tags" aria-hidden="true"></i>
            Catálogo
          </button>
          <button type="button" class="btn-primary" @click="openCreate('template')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Plantilla
          </button>
        </div>
      </header>
      <div v-if="templates.length" class="sv-cards">
        <article
          v-for="t in templates"
          :key="t.id"
          class="sv-card"
          :class="{ off: t.activo === false }"
        >
          <header class="sv-card-top">
            <h3 :title="t.nombre">{{ t.nombre }}</h3>
            <span class="sv-badge" :class="{ warn: t.activo === false }">
              {{ t.activo === false ? 'Inactiva' : `${t.mediciones?.length || 0} ítems` }}
            </span>
          </header>
          <p class="sv-card-line">
            <i class="fas fa-tag" aria-hidden="true"></i>
            {{ t.categoriaId ? categoriaName(t.categoriaId) : 'Sin categoría' }}
          </p>
          <p v-if="t.descripcion" class="sv-card-preview">{{ t.descripcion }}</p>
          <p v-else-if="t.mediciones?.length" class="sv-card-preview">
            {{ (t.mediciones || []).slice(0, 3).map((m) => m.nombre).join(' · ') }}
            <template v-if="(t.mediciones || []).length > 3">…</template>
          </p>
          <p v-if="tplEvidenceSummary(t)" class="sv-card-line sv-tpl-ev-summary">
            <i class="fas fa-paperclip" aria-hidden="true"></i>
            {{ tplEvidenceSummary(t) }}
          </p>
          <footer class="sv-icon-actions" role="group" :aria-label="'Acciones de ' + t.nombre">
            <button
              type="button"
              class="sv-icon-btn"
              title="Ver checklist"
              aria-label="Ver checklist"
              @click="openTemplatePreview(t.id)"
            >
              <i class="fas fa-eye" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="sv-icon-btn"
              title="Editar plantilla"
              aria-label="Editar plantilla"
              @click="openEditTemplate(t)"
            >
              <i class="fas fa-pen" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="sv-icon-btn"
              :title="t.activo === false ? 'Activar plantilla' : 'Desactivar plantilla'"
              :aria-label="t.activo === false ? 'Activar plantilla' : 'Desactivar plantilla'"
              @click="toggleTemplateActivo(t)"
            >
              <i :class="t.activo === false ? 'fas fa-play' : 'fas fa-pause'" aria-hidden="true"></i>
            </button>
          </footer>
        </article>
      </div>
      <p v-else class="sv-empty sv-empty--block">Sin plantillas. Creá la primera con «+ Plantilla».</p>
    </section>

    <!-- Roles de cobertura -->
    <section v-if="tab === 'roles'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2 class="sv-title-row">
            Roles de cobertura
            <CfgInfoTip
              title="Roles de cobertura"
              purpose="Catálogo de roles solo para asignaciones cliente↔sala. No cambian el rol general del usuario."
              :items="[
                'Se usan al sumar una persona a una cobertura.',
                'Son propios de este módulo (podés crear los que necesites).',
                'No pisan el supervisionRole ni los permisos de app del usuario.',
              ]"
            />
          </h2>
          <p>Roles específicos de este módulo para la cobertura en un punto. Independientes del rol general del usuario.</p>
        </div>
        <div class="sv-toolbar">
          <button type="button" class="btn-primary" @click="openCreate('coberturaRol')">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Nuevo rol
          </button>
        </div>
      </header>
      <ul class="sv-role-list">
        <li v-for="r in coberturaRolesSorted" :key="r.id" class="sv-role-row" :class="{ off: !r.activo }">
          <div>
            <strong>{{ r.nombre }}</strong>
            <p class="sv-muted">
              <code class="sv-code">{{ r.codigo }}</code>
              <span v-if="r.descripcion"> · {{ r.descripcion }}</span>
            </p>
          </div>
          <button
            type="button"
            class="sv-icon-btn"
            :class="{ warn: r.activo, ok: !r.activo }"
            :title="r.activo ? 'Desactivar rol' : 'Activar rol'"
            :aria-label="r.activo ? 'Desactivar ' + r.nombre : 'Activar ' + r.nombre"
            @click="toggleCoberturaRol(r)"
          >
            <i :class="r.activo ? 'fas fa-toggle-on' : 'fas fa-toggle-off'" aria-hidden="true"></i>
          </button>
        </li>
        <li v-if="!coberturaRoles.length" class="sv-empty">
          Todavía no hay roles de cobertura. Creá uno o cargá datos demo.
        </li>
      </ul>
    </section>

    <!-- Permisos -->
    <section v-if="tab === 'permisos'" class="sv-panel">
      <header class="sv-panel-head">
        <div>
          <h2>Matriz de permisos</h2>
          <p>Qué puede hacer cada rol en las pantallas del módulo.</p>
        </div>
        <div class="sv-actions">
          <button type="button" class="btn-primary" @click="savePerms">Guardar</button>
          <button type="button" class="btn-ghost" @click="resetPerms">Reset defaults</button>
        </div>
      </header>
      <div class="sv-role-tabs">
        <button
          v-for="r in rolePermisos"
          :key="r.role"
          type="button"
          :class="{ on: permRole === r.role }"
          @click="permRole = r.role"
        >
          {{ roleLabel(r.role) }}
        </button>
      </div>
      <div v-if="currentPerm" class="sv-table-wrap">
        <table class="sv-table">
          <thead>
            <tr>
              <th>Pantalla</th>
              <th v-for="a in actions" :key="a">{{ actionLabel(a) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in screens" :key="s">
              <td>{{ screenLabel(s) }}</td>
              <td v-for="a in actions" :key="a" class="center">
                <input
                  type="checkbox"
                  :checked="currentPerm.permisos?.[s]?.[a]"
                  @change="togglePerm(s, a, $event.target.checked)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="sv-empty">No hay permisos cargados. Activá el menú o corré el seed.</p>
    </section>

    <!-- Modal de alta -->
    <Teleport to="body">
      <div
        v-if="createKind"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="createTitleId"
        @keydown.esc.prevent="closeCreate"
        @click.self="closeCreate"
      >
        <div
          class="sv-modal"
          :class="{
            'sv-modal--wide': isCreateModalWide && !isSplitCreateModal,
            'sv-modal--visita': isSplitCreateModal,
          }"
        >
          <header class="sv-modal-head">
            <h3 :id="createTitleId">{{ createTitle }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeCreate">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <form class="sv-modal-form" @submit.prevent="submitCreate">
            <div
              class="sv-modal-body"
              :class="{
                'sv-modal-body--grid': isCreateModalWide && !isSplitCreateModal,
                'sv-modal-body--visita': isSplitCreateModal,
              }"
            >
            <template v-if="createKind === 'cadena'">
              <label>Nombre <input v-model="cadenaNombre" class="sv-input" required placeholder="Ej. Farmacias Salud" /></label>
            </template>
            <template v-else-if="createKind === 'subcadena'">
              <label>
                Cadena
                <select v-model="sub.cadenaId" class="sv-input" required>
                  <option value="">Elegí…</option>
                  <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </label>
              <label>Nombre <input v-model="sub.nombre" class="sv-input" required /></label>
            </template>
            <template v-else-if="createKind === 'cliente'">
              <label>Nombre <input v-model="clienteNombre" class="sv-input" required /></label>
              <label>Código <input v-model="clienteCodigo" class="sv-input" placeholder="Opcional" /></label>
            </template>
            <template v-else-if="createKind === 'sala'">
              <label>Nombre <input v-model="sala.nombre" class="sv-input" required /></label>
              <label>
                Cadena
                <select v-model="sala.cadenaId" class="sv-input">
                  <option value="">Sin cadena</option>
                  <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </label>
              <label>Comuna / ciudad <input v-model="sala.comuna" class="sv-input" /></label>
              <div class="sv-geo-fields">
                <p class="sv-geo-hint">Geolocalización (opcional)</p>
                <label>
                  Pegá un link de Google Maps
                  <input
                    v-model="sala.mapsPaste"
                    class="sv-input"
                    placeholder="https://maps.google.com/…"
                    @change="applyMapsPasteToSala"
                  />
                </label>
                <div class="sv-geo-pair">
                  <label>Latitud <input v-model="sala.lat" class="sv-input" inputmode="decimal" placeholder="-34.6037" /></label>
                  <label>Longitud <input v-model="sala.lng" class="sv-input" inputmode="decimal" placeholder="-58.3816" /></label>
                </div>
              </div>
            </template>
            <template v-else-if="createKind === 'relacion'">
              <label class="sv-span-2">
                Título
                <input
                  v-model="rel.titulo"
                  class="sv-input"
                  required
                  maxlength="40"
                  placeholder="Ej. Flagship Palermo"
                />
                <span class="sv-char-count">{{ (rel.titulo || '').length }}/40</span>
              </label>
              <label>
                Cadena
                <select v-model="rel.cadenaId" class="sv-input" @change="onRelCadenaChange">
                  <option value="">Todas / sin cadena</option>
                  <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </label>
              <label>
                Subcadena
                <select
                  v-model="rel.subcadenaId"
                  class="sv-input"
                  :disabled="!relSubcadenasOptions.length"
                  @change="onRelSubcadenaChange"
                >
                  <option value="">Todas / sin subcadena</option>
                  <option v-for="s in relSubcadenasOptions" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                </select>
              </label>
              <label>
                Cliente
                <select v-model="rel.clienteId" class="sv-input" required @change="error = ''">
                  <option value="">Elegí…</option>
                  <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </label>
              <label>
                Sala
                <select v-model="rel.salaId" class="sv-input" required @change="onRelSalaChange(); error = ''">
                  <option value="">Elegí…</option>
                  <option v-for="s in relSalasOptions" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                </select>
              </label>
              <p v-if="!relSalasOptions.length" class="sv-field-hint sv-span-2">
                No hay salas para esa cadena / subcadena.
              </p>
              <label class="sv-span-2">
                Qué se cubre / qué hacer
                <textarea
                  v-model="rel.descripcion"
                  class="sv-input sv-textarea"
                  rows="3"
                  maxlength="4000"
                  placeholder="Explicá el objetivo de la cobertura en este punto, pasos clave o criterios…"
                />
              </label>
              <label class="sv-span-2">
                <span class="sv-label-with-action">
                  Checklist / plantilla (opcional)
                  <button
                    type="button"
                    class="sv-mini-btn"
                    :disabled="!rel.templateId"
                    title="Ver contenido de la plantilla"
                    aria-label="Ver contenido de la plantilla"
                    @click="openTemplatePreview(rel.templateId)"
                  >
                    <i class="fas fa-eye" aria-hidden="true"></i>
                    Ver
                  </button>
                </span>
                <select v-model="rel.templateId" class="sv-input">
                  <option value="">Sin plantilla</option>
                  <option v-for="t in templatesActivos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                </select>
              </label>
              <p class="sv-field-hint sv-span-2">
                Elegí una plantilla y usá «Ver» para revisar el checklist antes de guardar.
                Podés crear más de una cobertura para el mismo cliente y sala si tenés objetivos distintos (cambiá el título).
              </p>
            </template>
            <template v-else-if="createKind === 'colab'">
              <div class="sv-colab-context" aria-label="Cobertura">
                <i class="fas fa-link" aria-hidden="true"></i>
                <span>{{ clienteName(relaciones.find((r) => r.id === createTargetId)?.clienteId) }}</span>
                <span class="sv-colab-sep" aria-hidden="true">·</span>
                <span>{{ salaName(relaciones.find((r) => r.id === createTargetId)?.salaId) }}</span>
              </div>
              <label>
                Persona
                <select v-model="colab.userId" class="sv-input" required>
                  <option value="">Elegí una persona…</option>
                  <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
                </select>
              </label>
              <label>
                Rol de cobertura
                <select v-model="colab.role" class="sv-input" required>
                  <option v-for="r in coberturaRolesActivos" :key="r.codigo" :value="r.codigo">
                    {{ r.nombre }}
                  </option>
                </select>
              </label>
              <p class="sv-field-hint">
                Este rol vale solo en esta cobertura. No modifica el rol general del usuario.
                <button type="button" class="sv-linkish" @click="goCoberturaRoles">Configurar roles</button>
              </p>
            </template>
            <template v-else-if="createKind === 'coberturaRol'">
              <label>Nombre <input v-model="coberturaRolForm.nombre" class="sv-input" required placeholder="Ej. Merchandiser" /></label>
              <label>
                Código
                <input
                  v-model="coberturaRolForm.codigo"
                  class="sv-input"
                  placeholder="Opcional (se genera del nombre)"
                />
              </label>
              <label>
                Descripción
                <input v-model="coberturaRolForm.descripcion" class="sv-input" placeholder="Opcional" />
              </label>
            </template>
            <template v-else-if="createKind === 'categoria'">
              <label>Nombre <input v-model="catNombre" class="sv-input" required /></label>
              <label class="sv-color">Color <input v-model="catColor" type="color" /></label>
            </template>
            <template v-else-if="createKind === 'pilar'">
              <label>Nombre <input v-model="pilarNombre" class="sv-input" required /></label>
            </template>
            <template v-else-if="createKind === 'medicion'">
              <label>Nombre <input v-model="medNombre" class="sv-input" required /></label>
            </template>
            <template v-else-if="createKind === 'estado'">
              <label>Nombre <input v-model="estNombre" class="sv-input" required /></label>
            </template>
            <template v-else-if="createKind === 'template'">
              <label class="sv-span-2">
                Nombre
                <input v-model="tpl.nombre" class="sv-input" required placeholder="Ej. Checklist visita express" />
              </label>
              <label class="sv-span-2">
                Descripción (opcional)
                <textarea
                  v-model="tpl.descripcion"
                  class="sv-input sv-textarea"
                  rows="2"
                  maxlength="1000"
                  placeholder="Para qué se usa esta plantilla…"
                />
              </label>
              <label>
                Categoría
                <select v-model="tpl.categoriaId" class="sv-input">
                  <option value="">Sin categoría</option>
                  <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </label>
              <label>
                Estado
                <select v-model="tpl.estadoId" class="sv-input">
                  <option value="">Sin estado</option>
                  <option v-for="e in templateEstados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
                </select>
              </label>
              <div class="sv-span-2 sv-tpl-checklist">
                <div class="sv-tpl-checklist-head">
                  <h4>Checklist</h4>
                  <button type="button" class="btn-ghost sm" @click="addTplItem">
                    <i class="fas fa-plus" aria-hidden="true"></i>
                    Ítem
                  </button>
                </div>
                <p class="sv-field-hint">
                  Por cada check definí si pide evidencia: foto y/o texto.
                </p>
                <ul class="sv-tpl-items" v-if="tpl.items.length">
                  <li v-for="(item, idx) in tpl.items" :key="item.key || idx" class="sv-tpl-item">
                    <span class="sv-tpl-item-ord" aria-hidden="true">{{ idx + 1 }}</span>
                    <div class="sv-tpl-item-main">
                      <input
                        v-model="item.nombre"
                        class="sv-input"
                        required
                        maxlength="200"
                        :placeholder="'Qué hay que chequear #' + (idx + 1)"
                      />
                      <div class="sv-tpl-evidence" role="group" :aria-label="'Evidencia del ítem ' + (idx + 1)">
                        <label class="sv-tpl-ev-opt" title="Obligatorio marcar el check">
                          <input v-model="item.obligatorio" type="checkbox" />
                          <span>Obligatorio</span>
                        </label>
                        <label class="sv-tpl-ev-opt" title="Pedir foto al completar">
                          <input v-model="item.requiereFoto" type="checkbox" />
                          <i class="fas fa-camera" aria-hidden="true"></i>
                          <span>Foto</span>
                        </label>
                        <label class="sv-tpl-ev-opt" title="Pedir texto / observación">
                          <input v-model="item.requiereTexto" type="checkbox" />
                          <i class="fas fa-align-left" aria-hidden="true"></i>
                          <span>Texto</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="sv-icon-btn"
                      title="Quitar ítem"
                      :aria-label="'Quitar ítem ' + (idx + 1)"
                      :disabled="tpl.items.length <= 1"
                      @click="removeTplItem(idx)"
                    >
                      <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    </button>
                  </li>
                </ul>
                <p v-else class="sv-empty">Agregá al menos un ítem al checklist.</p>
              </div>
            </template>
            <template v-else-if="createKind === 'visita'">
              <div class="sv-visita-layout">
                <nav class="sv-visita-nav" aria-label="Temas de la visita">
                  <button
                    v-for="s in VISITA_SECTIONS"
                    :key="s.id"
                    type="button"
                    class="sv-visita-nav-btn"
                    :class="{ on: visitaSection === s.id }"
                    @click="visitaSection = s.id"
                  >
                    <i :class="s.icon" aria-hidden="true"></i>
                    <span>{{ s.label }}</span>
                  </button>
                </nav>
                <div class="sv-visita-panel">
                  <section v-show="visitaSection === 'punto'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Punto</h4>
                    <div class="sv-visita-fields">
                      <label class="sv-span-2">
                        Título
                        <input
                          v-model="visita.titulo"
                          class="sv-input"
                          required
                          maxlength="40"
                          placeholder="Ej. Control semanal Centro"
                        />
                        <span class="sv-char-count">{{ (visita.titulo || '').length }}/40</span>
                      </label>
                      <label>
                        Cadena
                        <select v-model="visita.cadenaId" class="sv-input" @change="onVisitaCadenaChange">
                          <option value="">Todas / sin cadena</option>
                          <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                        </select>
                      </label>
                      <label>
                        Subcadena
                        <select
                          v-model="visita.subcadenaId"
                          class="sv-input"
                          :disabled="!visitaSubcadenasOptions.length"
                          @change="onVisitaSubcadenaChange"
                        >
                          <option value="">Todas / sin subcadena</option>
                          <option v-for="s in visitaSubcadenasOptions" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                        </select>
                      </label>
                      <label>
                        Cliente
                        <select v-model="visita.clienteId" class="sv-input">
                          <option value="">Sin cliente</option>
                          <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                        </select>
                      </label>
                      <label>
                        Sala
                        <select v-model="visita.salaId" class="sv-input" required @change="onVisitaSalaChange">
                          <option value="">Elegí…</option>
                          <option v-for="s in visitaSalasOptions" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                        </select>
                      </label>
                      <p v-if="!visitaSalasOptions.length" class="sv-field-hint sv-span-2">
                        No hay salas para esa cadena / subcadena.
                      </p>
                    </div>
                  </section>

                  <section v-show="visitaSection === 'checklist'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Checklist y criterios</h4>
                    <div class="sv-visita-fields">
                      <label class="sv-span-2">
                        <span class="sv-label-with-action">
                          Plantilla checklist
                          <button
                            type="button"
                            class="sv-mini-btn"
                            :disabled="!visita.templateId"
                            title="Ver contenido de la plantilla"
                            aria-label="Ver contenido de la plantilla"
                            @click="openTemplatePreview(visita.templateId)"
                          >
                            <i class="fas fa-eye" aria-hidden="true"></i>
                            Ver
                          </button>
                        </span>
                        <select v-model="visita.templateId" class="sv-input">
                          <option value="">Sin plantilla</option>
                          <option v-for="t in templatesActivos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                        </select>
                      </label>
                      <label>
                        Plazo (horas)
                        <input v-model.number="visita.plazoHoras" class="sv-input" type="number" min="1" max="720" />
                      </label>
                      <label>
                        Prioridad
                        <select v-model="visita.prioridad" class="sv-input">
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </label>
                      <label class="sv-check sv-span-2">
                        <input v-model="visita.requiereFoto" type="checkbox" />
                        Requiere foto
                      </label>
                    </div>
                  </section>

                  <section v-show="visitaSection === 'agenda'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Agenda</h4>
                    <div class="sv-visita-fields">
                      <label class="sv-span-2">
                        Frecuencia
                        <select v-model="visita.frecuencia" class="sv-input">
                          <option value="diaria">Diaria</option>
                          <option value="semanal">Semanal (un día)</option>
                          <option value="semanal_custom">Semanal custom (varios días)</option>
                          <option value="mensual">Mensual (un día del mes)</option>
                          <option value="mensual_custom">Mensual custom (semanas del mes)</option>
                        </select>
                      </label>
                      <label v-if="visita.frecuencia === 'semanal'">
                        Día de la semana
                        <select v-model.number="visita.diaSemana" class="sv-input">
                          <option v-for="d in DIAS_SEMANA" :key="d.v" :value="d.v">{{ d.l }}</option>
                        </select>
                      </label>
                      <label v-else-if="visita.frecuencia === 'mensual'">
                        Día del mes (1–28)
                        <input v-model.number="visita.diaMes" class="sv-input" type="number" min="1" max="28" />
                      </label>
                      <label v-else-if="visita.frecuencia === 'mensual_custom'">
                        Día de la semana
                        <select v-model.number="visita.diaSemana" class="sv-input">
                          <option v-for="d in DIAS_SEMANA" :key="d.v" :value="d.v">{{ d.l }}</option>
                        </select>
                      </label>
                      <div
                        v-if="visita.frecuencia === 'semanal_custom'"
                        class="sv-span-2 sv-freq-checks"
                        role="group"
                        aria-label="Días de la semana"
                      >
                        <p class="sv-freq-checks-label">Días de la semana</p>
                        <div class="sv-freq-checks-row">
                          <label
                            v-for="d in DIAS_SEMANA"
                            :key="d.v"
                            class="sv-freq-check"
                          >
                            <input
                              type="checkbox"
                              :checked="visita.diasSemana.includes(d.v)"
                              @change="toggleVisitaDiaSemana(d.v, $event.target.checked)"
                            />
                            <span>{{ d.short || d.l.slice(0, 3) }}</span>
                          </label>
                        </div>
                        <p class="sv-field-hint">Podés marcar varios (ej. lun, mié y vie).</p>
                      </div>
                      <div
                        v-if="visita.frecuencia === 'mensual_custom'"
                        class="sv-span-2 sv-freq-checks"
                        role="group"
                        aria-label="Semanas del mes"
                      >
                        <p class="sv-freq-checks-label">Semanas del mes</p>
                        <div class="sv-freq-checks-row">
                          <label
                            v-for="s in SEMANAS_MES"
                            :key="s.v"
                            class="sv-freq-check"
                          >
                            <input
                              type="checkbox"
                              :checked="visita.semanasMes.includes(s.v)"
                              @change="toggleVisitaSemanaMes(s.v, $event.target.checked)"
                            />
                            <span>{{ s.l }}</span>
                          </label>
                        </div>
                        <p class="sv-field-hint">
                          Ej.: sem. 1 y 3 = primera y tercera semana del mes, ese día de la semana.
                        </p>
                      </div>
                      <label>
                        Hora
                        <input v-model="visita.horaLocal" class="sv-input" type="time" required />
                      </label>
                    </div>
                  </section>

                  <section v-show="visitaSection === 'equipo'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Asignados</h4>
                    <div class="sv-visita-assign">
                      <div class="sv-visita-assign-add">
                        <select v-model="visitaAddUserId" class="sv-input">
                          <option value="">Elegí una persona…</option>
                          <option
                            v-for="u in visitaUsuariosDisponibles"
                            :key="u.id"
                            :value="u.id"
                          >{{ u.nombre }}</option>
                        </select>
                        <button
                          type="button"
                          class="btn-primary"
                          :disabled="!visitaAddUserId"
                          @click="addVisitaAsignadoDraft"
                        >
                          <i class="fas fa-user-plus" aria-hidden="true"></i>
                          Sumar
                        </button>
                      </div>
                      <ul v-if="visita.asignadosIds.length" class="sv-colab-list sv-colab-list--modal">
                        <li v-for="uid in visita.asignadosIds" :key="uid">
                          <span class="sv-colab-who">
                            <i class="fas fa-user" aria-hidden="true"></i>
                            <span class="sv-colab-name">{{ userName(uid) }}</span>
                          </span>
                          <button
                            type="button"
                            class="sv-colab-x"
                            title="Quitar asignado"
                            :aria-label="'Quitar a ' + userName(uid)"
                            @click="removeVisitaAsignadoDraft(uid)"
                          >
                            <i class="fas fa-times" aria-hidden="true"></i>
                          </button>
                        </li>
                      </ul>
                      <p v-else class="sv-muted">Todavía no hay asignados. Podés crear la visita sin asignar.</p>
                    </div>
                  </section>
                </div>
              </div>
            </template>
            <template v-else-if="createKind === 'consulta'">
              <div class="sv-visita-layout">
                <nav class="sv-visita-nav" aria-label="Temas de la acción">
                  <button
                    v-for="s in CONSULTA_SECTIONS"
                    :key="s.id"
                    type="button"
                    class="sv-visita-nav-btn"
                    :class="{ on: consultaSection === s.id }"
                    @click="consultaSection = s.id"
                  >
                    <i :class="s.icon" aria-hidden="true"></i>
                    <span>{{ s.label }}</span>
                  </button>
                </nav>
                <div class="sv-visita-panel">
                  <section v-show="consultaSection === 'accion'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Acción</h4>
                    <div class="sv-visita-fields">
                      <label class="sv-span-2">
                        Título
                        <input
                          v-model="consulta.titulo"
                          class="sv-input"
                          required
                          maxlength="40"
                          placeholder="Ej. Leer política de visitas"
                        />
                        <span class="sv-char-count">{{ (consulta.titulo || '').length }}/40</span>
                      </label>
                      <label class="sv-span-2">
                        Instrucciones
                        <textarea
                          v-model="consulta.instrucciones"
                          class="sv-input sv-textarea"
                          rows="5"
                          maxlength="2000"
                          placeholder="Qué tiene que hacer la persona…"
                        />
                      </label>
                    </div>
                  </section>

                  <section v-show="consultaSection === 'contenido'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Contenido</h4>
                    <div class="sv-visita-fields">
                      <label>
                        Tipo de contenido
                        <select v-model="consulta.refType" class="sv-input">
                          <option value="manual">Manual / otro</option>
                          <option value="post">Publicación</option>
                          <option value="survey">Encuesta</option>
                          <option value="document">Documento</option>
                          <option value="policy">Política</option>
                        </select>
                      </label>
                      <label>
                        Nombre del contenido
                        <input
                          v-model="consulta.refLabel"
                          class="sv-input"
                          placeholder="Ej. Política de visitas en sala"
                        />
                      </label>
                      <p class="sv-field-hint sv-span-2">
                        Indicá qué publicación, encuesta, documento o política debe revisar (o dejalo en Manual).
                      </p>
                    </div>
                  </section>

                  <section v-show="consultaSection === 'plazo'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Plazo</h4>
                    <div class="sv-visita-fields">
                      <label>
                        Vence (opcional)
                        <input v-model="consulta.dueAt" class="sv-input" type="datetime-local" />
                      </label>
                      <p class="sv-field-hint sv-span-2">
                        Si no ponés vencimiento, la acción queda abierta hasta marcarla OK.
                      </p>
                    </div>
                  </section>

                  <section v-show="consultaSection === 'asignado'" class="sv-visita-section">
                    <h4 class="sv-visita-section-title">Asignado</h4>
                    <div class="sv-visita-fields">
                      <label class="sv-span-2">
                        Asignar a
                        <select v-model="consulta.asignadoId" class="sv-input" required>
                          <option value="">Elegí…</option>
                          <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
                        </select>
                      </label>
                      <p class="sv-field-hint sv-span-2">
                        Después podés sumar más personas desde la card con «Ver / sumar asignados».
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </template>
            </div>
            <p v-if="error" class="sv-modal-alert sv-modal-alert--err" role="alert">
              <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
              <span>{{ error }}</span>
            </p>
            <footer class="sv-modal-foot">
              <button type="button" class="btn-ghost" @click="closeCreate">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="busy">
                {{ busy ? 'Guardando…' : createSubmitLabel }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal grafo de estructura -->
    <Teleport to="body">
      <div
        v-if="structureGraph"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-graph-title"
        @keydown.esc.prevent="closeStructureGraph"
        @click.self="closeStructureGraph"
      >
        <div class="sv-modal sv-modal--wide">
          <header class="sv-modal-head">
            <h3 :id="'sv-graph-title'">{{ structureGraphTitle }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeStructureGraph">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body sv-graph-body">
            <p class="sv-graph-hint">
              <template v-if="structureGraph?.kind === 'guide'">
                Esquema de ejemplo para entender el modelo (no son datos de esta comunidad).
                <strong>Cadena → Subcadena → Sala</strong>; el <strong>Cliente</strong> se une a la sala por cobertura.
              </template>
              <template v-else>
                Jerarquía de locales: <strong>Cadena → Subcadena → Sala</strong>.
                El <strong>Cliente</strong> no cuelga de la cadena: se une a la sala por cobertura.
              </template>
            </p>
            <div class="sv-graph-legend" aria-hidden="true">
              <span class="sg-leg sg-leg--cadena">Cadena</span>
              <span class="sg-leg sg-leg--subcadena">Subcadena</span>
              <span class="sg-leg sg-leg--sala">Sala</span>
              <span class="sg-leg sg-leg--cliente">Cliente</span>
            </div>
            <div v-if="structureGraphRoot" class="sv-graph-scroll">
              <ul class="sv-graph-root">
                <SupStructureChartNode :node="structureGraphRoot" :is-root="true" />
              </ul>
            </div>
            <p v-else class="sv-empty">No hay nodos para mostrar desde este punto.</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar quitar asignado -->
    <Teleport to="body">
      <div
        v-if="asigConfirm"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-asig-confirm-title"
        @keydown.esc.prevent="closeAsigConfirm"
        @click.self="closeAsigConfirm"
      >
        <div class="sv-modal sv-modal--confirm">
          <header class="sv-modal-head">
            <h3 id="sv-asig-confirm-title">{{ asigConfirm.title }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeAsigConfirm">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body">
            <p class="sv-confirm-lead">{{ asigConfirm.message }}</p>
            <p v-if="asigConfirm.detail" class="sv-confirm-detail">{{ asigConfirm.detail }}</p>
          </div>
          <footer class="sv-modal-foot">
            <button type="button" class="btn-ghost" :disabled="asigConfirmBusy" @click="closeAsigConfirm">
              Cancelar
            </button>
            <button
              type="button"
              class="btn-primary"
              :class="{ 'sv-btn-danger': asigConfirm.danger !== false }"
              :disabled="asigConfirmBusy"
              @click="executeAsigConfirm"
            >
              {{ asigConfirmBusy ? (asigConfirm.busyLabel || 'Procesando…') : asigConfirm.confirmLabel }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
    <!-- Configurar geolocalización de sala -->
    <Teleport to="body">
      <div
        v-if="salaGeoEdit"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-sala-geo-title"
        @keydown.esc.prevent="closeSalaGeoEdit"
        @click.self="closeSalaGeoEdit"
      >
        <div class="sv-modal">
          <header class="sv-modal-head">
            <h3 id="sv-sala-geo-title">Geolocalización · {{ salaGeoEdit.nombre }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeSalaGeoEdit">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body">
            <form class="sv-modal-form" @submit.prevent="saveSalaGeo">
              <label>
                Pegá un link de Google Maps
                <input
                  v-model="salaGeoEdit.mapsPaste"
                  class="sv-input"
                  placeholder="https://maps.google.com/…"
                  @change="applyMapsPasteToGeoEdit"
                />
              </label>
              <div class="sv-geo-pair">
                <label>Latitud <input v-model="salaGeoEdit.lat" class="sv-input" inputmode="decimal" required /></label>
                <label>Longitud <input v-model="salaGeoEdit.lng" class="sv-input" inputmode="decimal" required /></label>
              </div>
              <p class="sv-geo-hint">También podés copiar coordenadas desde Google Maps (clic derecho → coordenadas).</p>
            </form>
          </div>
          <footer class="sv-modal-foot">
            <button type="button" class="btn-ghost" :disabled="salaGeoBusy" @click="clearSalaGeo">
              Quitar geo
            </button>
            <button type="button" class="btn-ghost" :disabled="salaGeoBusy" @click="closeSalaGeoEdit">
              Cancelar
            </button>
            <button type="button" class="btn-primary" :disabled="salaGeoBusy" @click="saveSalaGeo">
              {{ salaGeoBusy ? 'Guardando…' : 'Guardar' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
    <!-- Vista mapa Google -->
    <Teleport to="body">
      <div
        v-if="mapPreview"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-map-preview-title"
        @keydown.esc.prevent="closeMapPreview"
        @click.self="closeMapPreview"
      >
        <div class="sv-modal sv-modal--map">
          <header class="sv-modal-head">
            <h3 id="sv-map-preview-title">
              <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
              {{ mapPreview.nombre }}
            </h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeMapPreview">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body sv-map-body">
            <iframe
              class="sv-map-frame"
              :src="googleMapsEmbedUrl(mapPreview.lat, mapPreview.lng)"
              title="Mapa de la sala"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            />
            <p class="sv-map-coords">{{ mapPreview.lat }}, {{ mapPreview.lng }}</p>
          </div>
          <footer class="sv-modal-foot">
            <a
              class="btn-ghost"
              :href="googleMapsOpenUrl(mapPreview.lat, mapPreview.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en Google Maps
            </a>
            <button type="button" class="btn-primary" @click="closeMapPreview">Cerrar</button>
          </footer>
        </div>
      </div>
    </Teleport>
    <!-- Detalle de cobertura (qué se cubre / checklist) -->
    <Teleport to="body">
      <div
        v-if="coberturaDetalle"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-cob-detalle-title"
        @keydown.esc.prevent="closeCoberturaDetalle"
        @click.self="closeCoberturaDetalle"
      >
        <div class="sv-modal">
          <header class="sv-modal-head">
            <h3 id="sv-cob-detalle-title">{{ coberturaDetalle.modalTitle || 'Qué se cubre' }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeCoberturaDetalle">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body">
            <p v-if="coberturaDetalle.titulo" class="sv-asig-modal-ctx">{{ coberturaDetalle.titulo }}</p>
            <section v-if="coberturaDetalle.descripcion" class="sv-cob-detalle-block">
              <h4>Descripción</h4>
              <p class="sv-cob-detalle-text">{{ coberturaDetalle.descripcion }}</p>
            </section>
            <section v-if="coberturaDetalle.templateNombre" class="sv-cob-detalle-block">
              <h4>{{ coberturaDetalle.hideChecklistLabel ? coberturaDetalle.templateNombre : `Checklist · ${coberturaDetalle.templateNombre}` }}</h4>
              <ul v-if="coberturaDetalle.mediciones?.length" class="sv-cob-check-list">
                <li v-for="(m, i) in coberturaDetalle.mediciones" :key="m.key || i">
                  <i class="fas fa-check-square" aria-hidden="true"></i>
                  <span class="sv-cob-check-label">
                    {{ m.nombre || m.key || 'Ítem' }}
                    <span v-if="m.requiereFoto || m.requiereTexto" class="sv-ev-chips">
                      <span v-if="m.requiereFoto" class="sv-ev-chip" title="Pide foto">
                        <i class="fas fa-camera" aria-hidden="true"></i> Foto
                      </span>
                      <span v-if="m.requiereTexto" class="sv-ev-chip" title="Pide texto">
                        <i class="fas fa-align-left" aria-hidden="true"></i> Texto
                      </span>
                    </span>
                  </span>
                </li>
              </ul>
              <p v-else class="sv-muted">Plantilla sin ítems definidos.</p>
            </section>
            <p v-if="!coberturaDetalle.descripcion && !coberturaDetalle.templateNombre" class="sv-empty">
              Sin detalle cargado.
            </p>
          </div>
          <footer class="sv-modal-foot">
            <button
              v-if="coberturaDetalle.canEditTemplate"
              type="button"
              class="btn-ghost"
              @click="editTemplateFromDetalle"
            >
              <i class="fas fa-pen" aria-hidden="true"></i>
              Editar
            </button>
            <button type="button" class="btn-primary" @click="closeCoberturaDetalle">Cerrar</button>
          </footer>
        </div>
      </div>
    </Teleport>
    <!-- Modal asignados (ver más / gestionar) -->
    <Teleport to="body">
      <div
        v-if="asignadosModal"
        class="sv-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-asig-modal-title"
        @keydown.esc.prevent="closeAsignadosModal"
        @click.self="closeAsignadosModal"
      >
        <div class="sv-modal sv-modal--asignados">
          <header class="sv-modal-head">
            <h3 id="sv-asig-modal-title">Asignados · {{ asignadosModal.tipoLabel }}</h3>
            <button type="button" class="sv-modal-close" aria-label="Cerrar" @click="closeAsignadosModal">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sv-modal-body">
            <p class="sv-asig-modal-ctx">{{ asignadosModal.titulo }}</p>
            <ul class="sv-colab-list sv-colab-list--modal">
              <li
                v-for="c in rowAsignados(asignadosModal)"
                :key="(c.userId || '') + (c.role || '')"
              >
                <span class="sv-colab-who">
                  <i class="fas fa-user" aria-hidden="true"></i>
                  <span class="sv-colab-name">{{ userName(c.userId) }}</span>
                  <span v-if="c.role" class="sv-role">{{ roleLabel(c.role) }}</span>
                </span>
                <button
                  type="button"
                  class="sv-colab-x"
                  title="Quitar asignado"
                  :aria-label="'Quitar a ' + userName(c.userId)"
                  :disabled="asignadosModalBusy"
                  @click="askRemoveAsignado(asignadosModal, c)"
                >
                  <i class="fas fa-times" aria-hidden="true"></i>
                </button>
              </li>
              <li v-if="!rowAsignados(asignadosModal).length" class="sv-muted">Sin asignados</li>
            </ul>
            <div class="sv-asig-add">
              <h4>Sumar persona</h4>
              <label>
                Persona
                <select v-model="asignadosAdd.userId" class="sv-input">
                  <option value="">Elegí…</option>
                  <option
                    v-for="u in usuariosDisponiblesAsignados"
                    :key="u.id"
                    :value="u.id"
                  >{{ u.nombre }}</option>
                </select>
              </label>
              <label v-if="asignadosModal.tipo === 'cobertura'">
                Rol de cobertura
                <select v-model="asignadosAdd.role" class="sv-input">
                  <option v-for="r in coberturaRolesActivos" :key="r.codigo" :value="r.codigo">
                    {{ r.nombre }}
                  </option>
                </select>
              </label>
              <button
                type="button"
                class="btn-primary"
                :disabled="asignadosModalBusy || !asignadosAdd.userId"
                @click="addAsignadoFromModal"
              >
                {{ asignadosModalBusy ? 'Sumando…' : 'Sumar' }}
              </button>
            </div>
          </div>
          <footer class="sv-modal-foot">
            <button type="button" class="btn-ghost" @click="closeAsignadosModal">Cerrar</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'
import CfgInfoTip from '../components/CfgInfoTip.vue'
import SupStructureChartNode from '../components/SupStructureChartNode.vue'
import SupImportBlock from '../components/SupImportBlock.vue'

const helpSixW = {
  what: 'Controlar visitas de campo en locales: qué se revisó, con checklist y foto.',
  who: 'Promotor/operario (ejecuta), supervisor (pide y revisa), admin (configura el mapa).',
  when: 'Al preparar la operación y cada vez que hay que controlar un local (la visita se crea a mano; no es agenda recurrente).',
  where: 'En el local físico (sala). El resultado queda en la app de esa persona.',
  why: 'Para saber si el trabajo en el local se hizo bien, con evidencia, sin perseguir fotos por WhatsApp.',
  how: 'Configurás lugar + cuenta + gente + plantilla de checklist. Después, en la app se crean y completan las visitas (tareas).',
}

const helpExamples = [
  'AquaPura en Farmacia Centro: Lucas completa “producto + precio + foto”; Marta ve si cumplió.',
  'Todas las visitas usan el mismo checklist → se pueden comparar locales.',
  'Lucas completa; Marta revisa; Lucas no puede borrar locales ni cambiar roles.',
]

const ROLE_LABELS = {
  operario: 'Operario',
  supervisor: 'Supervisor',
  plataforma_comercial: 'Plataforma comercial',
  gestor: 'Gestor',
  admin_mod: 'Admin módulo',
}
const SCREEN_LABELS = {
  inicio: 'Inicio',
  historial_tareas: 'Historial',
  templates: 'Plantillas',
  abm_cliente: 'ABM clientes',
  abm_sala: 'ABM salas',
  abm_cadena: 'ABM cadenas',
  abm_subcadena: 'ABM subcadenas',
  abm_asignaciones: 'Asignaciones',
  roles: 'Roles',
  configuracion: 'Configuración',
  ecr: 'Panel ECR',
}
const ACTION_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  asignar: 'Asignar',
  completar: 'Completar',
  importar: 'Importar',
}

const tab = ref('asignaciones')
const showStructure = ref(false)
const OPS_TAB_IDS = new Set(['asignaciones'])
const CONFIG_TAB_IDS = new Set([
  'cadenas',
  'subcadenas',
  'clientes',
  'salas',
  'taxonomia',
  'templates',
  'roles',
  'permisos',
])
const createKind = ref('')
const createTargetId = ref('')
const editId = ref('')
const createTitleId = 'sv-create-title'
const CREATE_TITLES = {
  cadena: 'Nueva cadena',
  subcadena: 'Nueva subcadena',
  cliente: 'Nuevo cliente',
  sala: 'Nueva sala',
  relacion: 'Nueva cobertura',
  colab: 'Sumar colaborador',
  coberturaRol: 'Nuevo rol de cobertura',
  categoria: 'Nueva categoría',
  pilar: 'Nuevo pilar',
  medicion: 'Nueva medición',
  estado: 'Nuevo estado de plantilla',
  template: 'Nueva plantilla',
  visita: 'Nueva visita programada',
  consulta: 'Nueva acción solicitada',
}
const EDIT_TITLES = {
  relacion: 'Editar cobertura',
  visita: 'Editar visita programada',
  template: 'Editar plantilla',
  consulta: 'Editar acción solicitada',
}
const createTitle = computed(() => {
  if (editId.value && EDIT_TITLES[createKind.value]) return EDIT_TITLES[createKind.value]
  return CREATE_TITLES[createKind.value] || 'Nuevo'
})
const createSubmitLabel = computed(() => {
  if (createKind.value === 'colab') return 'Sumar persona'
  if (editId.value) return 'Guardar'
  return 'Crear'
})
const isCreateModalWide = computed(
  () =>
    createKind.value === 'visita' ||
    createKind.value === 'consulta' ||
    createKind.value === 'relacion' ||
    createKind.value === 'template',
)
const isSplitCreateModal = computed(
  () => createKind.value === 'visita' || createKind.value === 'consulta',
)

const VISITA_SECTIONS = [
  { id: 'punto', label: 'Punto', icon: 'fas fa-map-marker-alt' },
  { id: 'checklist', label: 'Checklist', icon: 'fas fa-clipboard-list' },
  { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-alt' },
  { id: 'equipo', label: 'Asignados', icon: 'fas fa-users' },
]
const CONSULTA_SECTIONS = [
  { id: 'accion', label: 'Acción', icon: 'fas fa-bullseye' },
  { id: 'contenido', label: 'Contenido', icon: 'fas fa-book-open' },
  { id: 'plazo', label: 'Plazo', icon: 'fas fa-hourglass-half' },
  { id: 'asignado', label: 'Asignado', icon: 'fas fa-user' },
]
const visitaSection = ref('punto')
const visitaAddUserId = ref('')
const consultaSection = ref('accion')

function openCreate(kind, targetId = '') {
  editId.value = ''
  error.value = ''
  createKind.value = kind
  createTargetId.value = targetId || ''
  if (kind === 'relacion') resetRelForm()
  if (kind === 'visita') {
    resetVisitaForm()
    visitaSection.value = 'punto'
    visitaAddUserId.value = ''
  }
  if (kind === 'colab') {
    colab.userId = ''
    colab.role = coberturaRolesActivos.value[0]?.codigo || 'operario'
  }
  if (kind === 'coberturaRol') {
    coberturaRolForm.nombre = ''
    coberturaRolForm.codigo = ''
    coberturaRolForm.descripcion = ''
  }
  if (kind === 'template') resetTplForm()
  if (kind === 'consulta') {
    resetConsultaForm()
    consultaSection.value = 'accion'
  }
}

function resetConsultaForm() {
  consulta.titulo = ''
  consulta.instrucciones = ''
  consulta.refType = 'manual'
  consulta.refLabel = ''
  consulta.asignadoId = ''
  consulta.dueAt = ''
}

function toDatetimeLocalValue(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function openEditConsulta(row) {
  if (!row?.id) return
  error.value = ''
  const raw = row.raw || {}
  consulta.titulo = String(row.titulo || raw.titulo || '').slice(0, 40)
  consulta.instrucciones = raw.instrucciones || ''
  consulta.refType = raw.refType || 'manual'
  consulta.refLabel = raw.refLabel || ''
  const asignados = row.asignadosIds?.length
    ? row.asignadosIds
    : raw.asignadosIds?.length
      ? raw.asignadosIds
      : raw.asignadoId
        ? [raw.asignadoId]
        : []
  consulta.asignadoId = asignados[0] ? String(asignados[0]) : ''
  consulta.dueAt = toDatetimeLocalValue(row.fecha || raw.dueAt)
  editId.value = String(row.id)
  createTargetId.value = ''
  createKind.value = 'consulta'
  consultaSection.value = 'accion'
}

function resetTplForm() {
  tpl.nombre = ''
  tpl.descripcion = ''
  tpl.categoriaId = ''
  tpl.estadoId = ''
  tpl.items = [
    newTplItem('Check apertura'),
    newTplItem('Check stock', { requiereFoto: true }),
    newTplItem('Foto góndola', { requiereFoto: true, requiereTexto: true }),
  ]
}

function newTplItem(nombre = '', opts = {}) {
  return {
    key: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: nombre || '',
    obligatorio: opts.obligatorio !== false,
    requiereFoto: Boolean(opts.requiereFoto),
    requiereTexto: Boolean(opts.requiereTexto),
  }
}

function addTplItem() {
  tpl.items.push(newTplItem())
}

function removeTplItem(idx) {
  if (tpl.items.length <= 1) return
  tpl.items.splice(idx, 1)
}

function tplEvidenceSummary(t) {
  const list = t?.mediciones || []
  if (!list.length) return ''
  const fotos = list.filter((m) => m.requiereFoto).length
  const textos = list.filter((m) => m.requiereTexto).length
  if (!fotos && !textos) return ''
  const parts = []
  if (fotos) parts.push(`${fotos} con foto`)
  if (textos) parts.push(`${textos} con texto`)
  return parts.join(' · ')
}

function openEditTemplate(t) {
  if (!t?.id) return
  error.value = ''
  tpl.nombre = t.nombre || ''
  tpl.descripcion = t.descripcion || ''
  tpl.categoriaId = t.categoriaId ? String(t.categoriaId) : ''
  tpl.estadoId = t.estadoId ? String(t.estadoId) : ''
  tpl.items = Array.isArray(t.mediciones) && t.mediciones.length
    ? t.mediciones.map((m) => ({
        key: m.key || newTplItem().key,
        nombre: m.nombre || '',
        obligatorio: m.obligatorio !== false,
        requiereFoto: Boolean(m.requiereFoto),
        requiereTexto: Boolean(m.requiereTexto),
      }))
    : [newTplItem()]
  editId.value = String(t.id)
  createTargetId.value = ''
  createKind.value = 'template'
}

function openEditCobertura(row) {
  if (!row?.id) return
  error.value = ''
  resetRelForm()
  const sala = salas.value.find((s) => String(s.id) === String(row.salaId))
  rel.titulo = String(row.titulo || '').slice(0, 40)
  rel.cadenaId = sala?.cadenaId ? String(sala.cadenaId) : ''
  rel.subcadenaId = sala?.subcadenaId ? String(sala.subcadenaId) : ''
  rel.clienteId = row.clienteId ? String(row.clienteId) : ''
  rel.salaId = row.salaId ? String(row.salaId) : ''
  rel.descripcion = row.descripcion || row.raw?.descripcion || ''
  rel.templateId = row.templateId || row.raw?.templateId || ''
  editId.value = String(row.id)
  createTargetId.value = ''
  createKind.value = 'relacion'
}

function openEditVisita(row) {
  if (!row?.id) return
  resetVisitaForm()
  const raw = row.raw || {}
  const sala = salas.value.find((s) => String(s.id) === String(row.salaId || raw.salaId))
  visita.titulo = String(row.titulo || raw.titulo || '').slice(0, 40)
  visita.descripcion = raw.descripcion || ''
  visita.cadenaId = sala?.cadenaId ? String(sala.cadenaId) : ''
  visita.subcadenaId = sala?.subcadenaId ? String(sala.subcadenaId) : ''
  visita.salaId = String(row.salaId || raw.salaId || '')
  visita.clienteId = String(row.clienteId || raw.clienteId || '')
  visita.templateId = String(row.templateId || raw.templateId || '')
  visita.asignadosIds = [...(row.asignadosIds?.length
    ? row.asignadosIds
    : raw.asignadosIds?.length
      ? raw.asignadosIds
      : raw.asignadoId
        ? [raw.asignadoId]
        : [])].map(String)
  visita.frecuencia = raw.frecuencia || 'semanal'
  visita.diaSemana = raw.diaSemana ?? 1
  visita.diasSemana = Array.isArray(raw.diasSemana) && raw.diasSemana.length
    ? raw.diasSemana.map(Number)
    : [raw.diaSemana ?? 1]
  visita.diaMes = raw.diaMes ?? 1
  visita.semanasMes = Array.isArray(raw.semanasMes) && raw.semanasMes.length
    ? raw.semanasMes.map(Number)
    : [1]
  visita.horaLocal = raw.horaLocal || '09:00'
  visita.plazoHoras = raw.plazoHoras || row.plazoHoras || 24
  visita.prioridad = raw.prioridad || 'media'
  visita.requiereFoto = Boolean(raw.requiereFoto)
  visitaSection.value = 'punto'
  visitaAddUserId.value = ''
  editId.value = String(row.id)
  createTargetId.value = ''
  createKind.value = 'visita'
}

function closeCreate() {
  createKind.value = ''
  createTargetId.value = ''
  editId.value = ''
  error.value = ''
}

const error = ref('')
const okMsg = ref('')
const okMsgIsError = ref(false)
let okMsgTimer = null

function flashOk(msg, { isError = false } = {}) {
  okMsg.value = msg
  okMsgIsError.value = isError
  if (okMsgTimer) clearTimeout(okMsgTimer)
  okMsgTimer = setTimeout(() => {
    if (okMsg.value === msg) dismissOk()
  }, isError ? 7000 : 4500)
}
function dismissOk() {
  okMsg.value = ''
  okMsgIsError.value = false
  if (okMsgTimer) {
    clearTimeout(okMsgTimer)
    okMsgTimer = null
  }
}
const busy = ref(false)
const moduleEnabled = ref(false)
const moduleBusy = ref(false)
const asigConfirm = ref(null) // { kind, title, message, detail, confirmLabel, payload }
const asigConfirmBusy = ref(false)
const asignadosModal = ref(null) // row abierta en modal
const asignadosModalBusy = ref(false)
const asignadosAdd = reactive({ userId: '', role: 'operario' })

const usuariosDisponiblesAsignados = computed(() => {
  const row = asignadosModal.value
  if (!row) return usuarios.value
  const taken = new Set(rowAsignados(row).map((c) => String(c.userId)))
  return usuarios.value.filter((u) => !taken.has(String(u.id)))
})

function openAsignadosModal(row) {
  asignadosModal.value = row
  asignadosAdd.userId = ''
  asignadosAdd.role = coberturaRolesActivos.value[0]?.codigo || 'operario'
}

function closeAsignadosModal() {
  if (asignadosModalBusy.value) return
  asignadosModal.value = null
}

function askRemoveAsignado(row, colab) {
  const name = userName(colab.userId)
  const list = rowAsignados(row)
  const isLast = list.length <= 1
  if (row.tipo === 'cobertura') {
    asigConfirm.value = {
      kind: 'cobertura-colab',
      title: 'Quitar asignado',
      message: `¿Quitar a ${name} de esta cobertura?`,
      detail: isLast
        ? 'Es el último asignado: se eliminará toda la cobertura.'
        : '',
      confirmLabel: isLast ? 'Quitar y eliminar cobertura' : 'Quitar asignado',
      busyLabel: 'Quitando…',
      danger: true,
      payload: { rowId: row.id, userId: colab.userId, tipo: 'cobertura' },
    }
    return
  }
  if (row.tipo === 'visita') {
    asigConfirm.value = {
      kind: 'visita-asignado',
      title: 'Quitar asignado',
      message: `¿Quitar a ${name} de esta visita?`,
      detail: isLast
        ? 'Es el último asignado: se eliminará el programa de visitas.'
        : '',
      confirmLabel: isLast ? 'Quitar y eliminar visita' : 'Quitar asignado',
      busyLabel: 'Quitando…',
      danger: true,
      payload: { id: row.id, userId: colab.userId, tipo: 'visita' },
    }
    return
  }
  asigConfirm.value = {
    kind: 'consulta-asignado',
    title: 'Quitar asignado',
    message: `¿Quitar a ${name} de esta acción solicitada?`,
    detail: isLast
      ? 'Es el último asignado: se eliminará la acción solicitada.'
      : '',
    confirmLabel: isLast ? 'Quitar y eliminar acción' : 'Quitar asignado',
    busyLabel: 'Quitando…',
    danger: true,
    payload: { id: row.id, userId: colab.userId, tipo: 'consulta' },
  }
}

async function addAsignadoFromModal() {
  const row = asignadosModal.value
  if (!row || !asignadosAdd.userId || asignadosModalBusy.value) return
  asignadosModalBusy.value = true
  error.value = ''
  try {
    if (row.tipo === 'cobertura') {
      await api.post(`/admin/supervision/cliente-salas/${row.id}/colaboradores`, {
        userId: asignadosAdd.userId,
        role: asignadosAdd.role || 'operario',
      })
    } else if (row.tipo === 'visita') {
      await api.post(`/admin/supervision/visita-recurrencias/${row.id}/asignados`, {
        userId: asignadosAdd.userId,
      })
    } else {
      await api.post(`/admin/supervision/asignaciones-consulta/${row.id}/asignados`, {
        userId: asignadosAdd.userId,
      })
    }
    okMsg.value = 'Asignado sumado'
    asignadosAdd.userId = ''
    await loadAll()
    const refreshed = asignacionesRows.value.find((r) => r.key === row.key)
    if (refreshed) asignadosModal.value = refreshed
    else closeAsignadosModal()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo sumar al asignado'
  } finally {
    asignadosModalBusy.value = false
  }
}
const auth = useAuthStore()
const cadenas = ref([])
const subcadenas = ref([])
const clientes = ref([])
const salas = ref([])
const relaciones = ref([])
const templates = ref([])
const visitasRec = ref([])
const consultas = ref([])
const usuarios = ref([])
const categorias = ref([])
const pilares = ref([])
const mediciones = ref([])
const templateEstados = ref([])
const rolePermisos = ref([])
const screens = ref([])
const actions = ref([])
const permRole = ref('operario')
const roles = ref(['operario', 'supervisor', 'plataforma_comercial', 'gestor', 'admin_mod'])
const cadenaNombre = ref('')
const clienteNombre = ref('')
const clienteCodigo = ref('')
const catNombre = ref('')
const catColor = ref('#0d9488')
const pilarNombre = ref('')
const medNombre = ref('')
const estNombre = ref('')
const qClientes = ref('')
const qSalas = ref('')
const qRoles = ref('')
const sub = reactive({ cadenaId: '', nombre: '' })
const sala = reactive({ nombre: '', cadenaId: '', comuna: '', lat: '', lng: '', mapsPaste: '' })
const salaGeoEdit = ref(null) // { id, nombre, lat, lng, mapsPaste }
const salaGeoBusy = ref(false)
const mapPreview = ref(null) // { nombre, lat, lng }
const coberturaDetalle = ref(null) // { titulo, descripcion, templateNombre, mediciones }
const rel = reactive({
  titulo: '',
  cadenaId: '',
  subcadenaId: '',
  clienteId: '',
  salaId: '',
  descripcion: '',
  templateId: '',
})

const templatesActivos = computed(() =>
  templates.value.filter((t) => t.activo !== false),
)

const relSubcadenasOptions = computed(() => {
  const cid = rel.cadenaId
  if (!cid) return subcadenas.value
  return subcadenas.value.filter((s) => String(s.cadenaId) === String(cid))
})

const relSalasOptions = computed(() => {
  return salas.value.filter((s) => {
    if (rel.cadenaId && String(s.cadenaId || '') !== String(rel.cadenaId)) return false
    if (rel.subcadenaId && String(s.subcadenaId || '') !== String(rel.subcadenaId)) return false
    return true
  })
})

function onRelCadenaChange() {
  if (
    rel.subcadenaId &&
    !relSubcadenasOptions.value.some((s) => String(s.id) === String(rel.subcadenaId))
  ) {
    rel.subcadenaId = ''
  }
  if (rel.salaId && !relSalasOptions.value.some((s) => String(s.id) === String(rel.salaId))) {
    rel.salaId = ''
  }
}

function onRelSubcadenaChange() {
  if (rel.salaId && !relSalasOptions.value.some((s) => String(s.id) === String(rel.salaId))) {
    rel.salaId = ''
  }
}

function onRelSalaChange() {
  const s = salas.value.find((x) => String(x.id) === String(rel.salaId))
  if (!s) return
  if (s.cadenaId) rel.cadenaId = String(s.cadenaId)
  else if (!rel.cadenaId) rel.cadenaId = ''
  if (s.subcadenaId) rel.subcadenaId = String(s.subcadenaId)
  else rel.subcadenaId = ''
}

function resetRelForm() {
  rel.titulo = ''
  rel.cadenaId = ''
  rel.subcadenaId = ''
  rel.clienteId = ''
  rel.salaId = ''
  rel.descripcion = ''
  rel.templateId = ''
}
const colab = reactive({ userId: '', role: 'operario' })
const coberturaRolForm = reactive({ nombre: '', codigo: '', descripcion: '' })
const coberturaRoles = ref([])
const coberturaRolesActivos = computed(() =>
  coberturaRoles.value.filter((r) => r.activo !== false),
)
const coberturaRolesSorted = computed(() =>
  [...coberturaRoles.value].sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre)),
)

function goCoberturaRoles() {
  closeCreate()
  showStructure.value = true
  tab.value = 'roles'
}
const tpl = reactive({
  nombre: '',
  descripcion: '',
  categoriaId: '',
  estadoId: '',
  items: [],
})
const visita = reactive({
  titulo: '',
  descripcion: '',
  cadenaId: '',
  subcadenaId: '',
  salaId: '',
  clienteId: '',
  templateId: '',
  asignadosIds: [],
  frecuencia: 'semanal',
  diaSemana: 1,
  diasSemana: [1],
  diaMes: 1,
  semanasMes: [1],
  horaLocal: '09:00',
  plazoHoras: 24,
  prioridad: 'media',
  requiereFoto: false,
})

const visitaSubcadenasOptions = computed(() => {
  const cid = visita.cadenaId
  if (!cid) return subcadenas.value
  return subcadenas.value.filter((s) => String(s.cadenaId) === String(cid))
})

const visitaSalasOptions = computed(() => {
  return salas.value.filter((s) => {
    if (visita.cadenaId && String(s.cadenaId || '') !== String(visita.cadenaId)) return false
    if (visita.subcadenaId && String(s.subcadenaId || '') !== String(visita.subcadenaId)) return false
    return true
  })
})

const visitaUsuariosDisponibles = computed(() => {
  const taken = new Set((visita.asignadosIds || []).map(String))
  return usuarios.value.filter((u) => !taken.has(String(u.id)))
})

function onVisitaCadenaChange() {
  if (
    visita.subcadenaId &&
    !visitaSubcadenasOptions.value.some((s) => String(s.id) === String(visita.subcadenaId))
  ) {
    visita.subcadenaId = ''
  }
  if (visita.salaId && !visitaSalasOptions.value.some((s) => String(s.id) === String(visita.salaId))) {
    visita.salaId = ''
  }
}

function onVisitaSubcadenaChange() {
  if (visita.salaId && !visitaSalasOptions.value.some((s) => String(s.id) === String(visita.salaId))) {
    visita.salaId = ''
  }
}

function onVisitaSalaChange() {
  const s = salas.value.find((x) => String(x.id) === String(visita.salaId))
  if (!s) return
  if (s.cadenaId) visita.cadenaId = String(s.cadenaId)
  if (s.subcadenaId) visita.subcadenaId = String(s.subcadenaId)
  else visita.subcadenaId = ''
}

function addVisitaAsignadoDraft() {
  const id = String(visitaAddUserId.value || '')
  if (!id) return
  if (!visita.asignadosIds.map(String).includes(id)) visita.asignadosIds.push(id)
  visitaAddUserId.value = ''
}

function removeVisitaAsignadoDraft(userId) {
  visita.asignadosIds = visita.asignadosIds.filter((id) => String(id) !== String(userId))
}

function resetVisitaForm() {
  Object.assign(visita, {
    titulo: '',
    descripcion: '',
    cadenaId: '',
    subcadenaId: '',
    salaId: '',
    clienteId: '',
    templateId: '',
    asignadosIds: [],
    frecuencia: 'semanal',
    diaSemana: 1,
    diasSemana: [1],
    diaMes: 1,
    semanasMes: [1],
    horaLocal: '09:00',
    plazoHoras: 24,
    prioridad: 'media',
    requiereFoto: false,
  })
  visitaAddUserId.value = ''
  visitaSection.value = 'punto'
}

function toggleVisitaDiaSemana(day, checked) {
  const v = Number(day)
  const set = new Set(visita.diasSemana.map(Number))
  if (checked) set.add(v)
  else set.delete(v)
  visita.diasSemana = [...set].sort((a, b) => a - b)
}

function toggleVisitaSemanaMes(week, checked) {
  const v = Number(week)
  const set = new Set(visita.semanasMes.map(Number))
  if (checked) set.add(v)
  else set.delete(v)
  visita.semanasMes = [...set].sort((a, b) => a - b)
}

const consulta = reactive({
  titulo: '',
  instrucciones: '',
  refType: 'manual',
  refLabel: '',
  asignadoId: '',
  dueAt: '',
})
const ASIG_FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'cobertura', label: 'Cobertura' },
  { id: 'visita', label: 'Visita' },
  { id: 'consulta', label: 'Acción solicitada' },
]
const asigFiltro = ref('todas')
const asigQ = ref('')
const asigEstadoFiltro = ref('activa')
const asigAdvOpen = ref(false)
const asigPersonaId = ref('')
const asigClienteId = ref('')
const asigSalaId = ref('')
const asigCadenaId = ref('')
const asigViewMode = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('cx.sup.asig.view') === 'table'
    ? 'table'
    : 'cards',
)
const asigSortBy = ref('tipo')
const asigSortDir = ref('asc')
const asigPage = ref(1)
const asigPageSize = ref(12)
const DIAS_SEMANA = [
  { v: 0, l: 'Domingo', short: 'Dom' },
  { v: 1, l: 'Lunes', short: 'Lun' },
  { v: 2, l: 'Martes', short: 'Mar' },
  { v: 3, l: 'Miércoles', short: 'Mié' },
  { v: 4, l: 'Jueves', short: 'Jue' },
  { v: 5, l: 'Viernes', short: 'Vie' },
  { v: 6, l: 'Sábado', short: 'Sáb' },
]
const SEMANAS_MES = [
  { v: 1, l: 'Sem. 1' },
  { v: 2, l: 'Sem. 2' },
  { v: 3, l: 'Sem. 3' },
  { v: 4, l: 'Sem. 4' },
]

const withRoleCount = computed(
  () => usuarios.value.filter((u) => u.supervisionRole).length,
)

const tabs = computed(() => [
  { id: 'cadenas', label: 'Cadenas', icon: 'fas fa-store', count: cadenas.value.length },
  { id: 'subcadenas', label: 'Subcadenas', icon: 'fas fa-code-branch', count: subcadenas.value.length },
  { id: 'clientes', label: 'Clientes', icon: 'fas fa-building', count: clientes.value.length },
  { id: 'salas', label: 'Salas', icon: 'fas fa-map-marker-alt', count: salas.value.length },
  { id: 'taxonomia', label: 'Catálogo del checklist', icon: 'fas fa-tags' },
  { id: 'templates', label: 'Plantillas', icon: 'fas fa-clipboard-list', count: templates.value.length },
  { id: 'roles', label: 'Roles de cobertura', icon: 'fas fa-user-tag', count: coberturaRoles.value.length },
  { id: 'permisos', label: 'Permisos', icon: 'fas fa-key' },
])

function countAsigTipo(id) {
  if (id === 'todas') {
    return relaciones.value.length + visitasRec.value.length + consultas.value.length
  }
  if (id === 'cobertura') return relaciones.value.length
  if (id === 'visita') return visitasRec.value.length
  if (id === 'consulta') return consultas.value.length
  return 0
}

function setAsigViewMode(mode) {
  asigViewMode.value = mode
  try {
    localStorage.setItem('cx.sup.asig.view', mode)
  } catch {
    /* ignore */
  }
}

function toggleAsigSort(key) {
  if (asigSortBy.value === key) {
    asigSortDir.value = asigSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    asigSortBy.value = key
    asigSortDir.value = 'asc'
  }
  asigPage.value = 1
}

function asigSortMark(key) {
  if (asigSortBy.value !== key) return '↕'
  return asigSortDir.value === 'asc' ? '↑' : '↓'
}

function consultaRefTypeLabel(t) {
  return (
    {
      post: 'Publicación',
      survey: 'Encuesta',
      document: 'Documento',
      policy: 'Política',
      manual: 'Manual',
    }[t] || t || 'Manual'
  )
}
function consultaRefLabel(q) {
  return q?.refLabel || q?.titulo || '—'
}
function consultaStatusLabel(s) {
  return (
    { pendiente: 'Pendiente', visto: 'Visto', ok: 'OK', vencido: 'Vencido' }[s] || s || 'Pendiente'
  )
}
function consultaStatusClass(s) {
  if (s === 'ok') return 'ok'
  if (s === 'vencido') return 'warn'
  if (s === 'visto') return 'info'
  return ''
}

const ASIG_PREVIEW_LIMIT = 3

function coberturaTeamLabel(r) {
  const cols = r?.colaboradores || []
  if (!cols.length) return 'Sin equipo'
  return cols.map((c) => `${userName(c.userId)} (${roleLabel(c.role)})`).join(', ')
}

function rowAsignados(row) {
  if (!row) return []
  if (row.tipo === 'cobertura') {
    return (row.colaboradores || []).map((c) => ({
      userId: String(c.userId),
      role: c.role || '',
    }))
  }
  const ids = row.asignadosIds?.length
    ? row.asignadosIds
    : row.personIds || []
  return ids.filter(Boolean).map((id) => ({ userId: String(id), role: '' }))
}

/** Cobertura o visita sin nadie asignado (para marca visual). */
function sinAsignados(row) {
  if (!row || (row.tipo !== 'cobertura' && row.tipo !== 'visita')) return false
  return rowAsignados(row).length === 0
}

function previewAsignados(row) {
  return rowAsignados(row).slice(0, ASIG_PREVIEW_LIMIT)
}

function personasLabelFromIds(ids) {
  const list = (ids || []).filter(Boolean)
  if (!list.length) return 'Sin asignar'
  return list.map((id) => userName(id)).join(', ')
}

function matchAsigEstado(row, filtro) {
  if (!filtro) return true
  if (filtro === 'activa') {
    if (row.tipo === 'cobertura' || row.tipo === 'visita') return !row.off
    // Consulta “en curso”: pendiente o vista (aún no OK / vencida)
    return row.status === 'pendiente' || row.status === 'visto'
  }
  if (filtro === 'pendiente') {
    if (row.tipo === 'consulta') return row.status === 'pendiente'
    // Cobertura/visita no tienen “pendiente”: no entran en este filtro
    return false
  }
  if (filtro === 'inactiva' || filtro === 'pausada') {
    if (row.tipo === 'cobertura' || row.tipo === 'visita') return row.off === true
    return row.status === 'vencido' || row.off === true
  }
  if (filtro === 'ok') return row.tipo === 'consulta' && row.status === 'ok'
  if (filtro === 'visto') return row.tipo === 'consulta' && row.status === 'visto'
  return true
}

const asignacionesRows = computed(() => {
  const rows = []
  for (const r of relaciones.value) {
    const sala = salaOfRel(r)
    const cliente = clienteName(r.clienteId)
    const salaN = salaName(r.salaId)
    const personIds = (r.colaboradores || []).map((c) => String(c.userId)).filter(Boolean)
    rows.push({
      key: `cob-${r.id}`,
      id: r.id,
      tipo: 'cobertura',
      tipoLabel: 'Cobertura',
      titulo: (r.titulo || '').trim() || `${cliente} · ${salaN}`,
      subtitulo: clienteCodigoOf(r.clienteId) || '',
      detalle: sala ? salaUbicacion(sala) : '—',
      persona: coberturaTeamLabel(r),
      estado: r.activo === false ? 'Inactiva' : 'Activa',
      estadoClass: r.activo === false ? 'warn' : '',
      status: r.activo === false ? 'pausada' : 'activa',
      fecha: null,
      off: r.activo === false,
      clienteId: r.clienteId || null,
      salaId: r.salaId || null,
      cadenaId: sala?.cadenaId || null,
      personIds,
      cliente,
      clienteCodigo: clienteCodigoOf(r.clienteId),
      sala: salaN,
      lat: Number.isFinite(Number(sala?.lat)) ? Number(sala.lat) : null,
      lng: Number.isFinite(Number(sala?.lng)) ? Number(sala.lng) : null,
      ubicacion: sala ? salaUbicacion(sala) : '',
      cadena: sala?.cadenaId ? cadenaName(sala.cadenaId) : '',
      subcadena: sala?.subcadenaId ? subcadenaName(sala.subcadenaId) : '',
      descripcion: r.descripcion || '',
      templateId: r.templateId || null,
      templateNombre: templateName(r.templateId),
      templateMediciones: templateMediciones(r.templateId),
      colaboradores: r.colaboradores || [],
      createdAt: r.createdAt || null,
      raw: r,
    })
  }
  for (const v of visitasRec.value) {
    const sala = salas.value.find((s) => s.id === v.salaId)
    const asignadosIds = (v.asignadosIds?.length
      ? v.asignadosIds
      : v.asignadoId
        ? [v.asignadoId]
        : []
    ).map(String)
    const personIds = asignadosIds
    rows.push({
      key: `vis-${v.id}`,
      id: v.id,
      tipo: 'visita',
      tipoLabel: 'Visita',
      titulo: v.titulo || 'Visita',
      subtitulo: '',
      detalle: labelVisitaFreq(v),
      persona: personasLabelFromIds(asignadosIds),
      estado: v.enabled === false ? 'Pausada' : 'Activa',
      estadoClass: v.enabled === false ? 'warn' : '',
      status: v.enabled === false ? 'pausada' : 'activa',
      fecha: v.nextRunAt || null,
      off: v.enabled === false,
      clienteId: v.clienteId || null,
      salaId: v.salaId || null,
      cadenaId: sala?.cadenaId || null,
      personIds,
      asignadosIds,
      cliente: v.clienteId ? clienteName(v.clienteId) : '',
      sala: salaName(v.salaId),
      lat: Number.isFinite(Number(sala?.lat)) ? Number(sala.lat) : null,
      lng: Number.isFinite(Number(sala?.lng)) ? Number(sala.lng) : null,
      ubicacion: sala ? salaUbicacion(sala) : '',
      cadena: sala?.cadenaId ? cadenaName(sala.cadenaId) : '',
      subcadena: sala?.subcadenaId ? subcadenaName(sala.subcadenaId) : '',
      plazoHoras: v.plazoHoras || 24,
      templateId: v.templateId || null,
      templateNombre: templateName(v.templateId),
      createdAt: v.createdAt || null,
      raw: v,
    })
  }
  for (const q of consultas.value) {
    const asignadosIds = (q.asignadosIds?.length
      ? q.asignadosIds
      : q.asignadoId
        ? [q.asignadoId]
        : []
    ).map(String)
    const personIds = asignadosIds
    rows.push({
      key: `con-${q.id}`,
      id: q.id,
      tipo: 'consulta',
      tipoLabel: 'Acción solicitada',
      titulo: q.titulo || 'Acción solicitada',
      subtitulo: '',
      detalle: consultaRefLabel(q),
      refTypeLabel: consultaRefTypeLabel(q.refType),
      persona: personasLabelFromIds(asignadosIds),
      estado: consultaStatusLabel(q.status),
      estadoClass: consultaStatusClass(q.status),
      status: q.status || 'pendiente',
      fecha: q.dueAt || null,
      off: q.activo === false,
      clienteId: null,
      salaId: null,
      cadenaId: null,
      personIds,
      asignadosIds,
      createdAt: q.createdAt || null,
      raw: q,
    })
  }
  return rows
})

const asigAdvActiveCount = computed(() => {
  let n = 0
  if (asigPersonaId.value) n += 1
  if (asigClienteId.value) n += 1
  if (asigSalaId.value) n += 1
  if (asigCadenaId.value) n += 1
  return n
})

const asigPersonasOptions = computed(() => {
  const ids = new Set()
  for (const row of asignacionesRows.value) {
    for (const id of row.personIds || []) ids.add(String(id))
  }
  return usuarios.value
    .filter((u) => ids.has(String(u.id)))
    .slice()
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
})

const asigClientesOptions = computed(() => {
  const ids = new Set(
    asignacionesRows.value.map((r) => r.clienteId).filter(Boolean).map(String),
  )
  return clientes.value
    .filter((c) => ids.has(String(c.id)))
    .slice()
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
})

const asigSalasOptions = computed(() => {
  const ids = new Set(asignacionesRows.value.map((r) => r.salaId).filter(Boolean).map(String))
  let list = salas.value.filter((s) => ids.has(String(s.id)))
  if (asigCadenaId.value) {
    list = list.filter((s) => String(s.cadenaId) === String(asigCadenaId.value))
  }
  return list.slice().sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
})

const asigCadenasOptions = computed(() => {
  const ids = new Set(
    asignacionesRows.value.map((r) => r.cadenaId).filter(Boolean).map(String),
  )
  return cadenas.value
    .filter((c) => ids.has(String(c.id)))
    .slice()
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
})

const asignacionesFiltradas = computed(() => {
  const tipo = asigFiltro.value
  const q = asigQ.value.trim().toLowerCase()
  const est = asigEstadoFiltro.value
  const personaId = asigPersonaId.value
  const clienteId = asigClienteId.value
  const salaId = asigSalaId.value
  const cadenaId = asigCadenaId.value
  let list = asignacionesRows.value.filter((row) => {
    if (tipo !== 'todas' && row.tipo !== tipo) return false
    if (!matchAsigEstado(row, est)) return false
    if (personaId && !(row.personIds || []).includes(String(personaId))) return false
    if (clienteId && String(row.clienteId || '') !== String(clienteId)) return false
    if (salaId && String(row.salaId || '') !== String(salaId)) return false
    if (cadenaId && String(row.cadenaId || '') !== String(cadenaId)) return false
    if (!q) return true
    const hay = [
      row.titulo,
      row.subtitulo,
      row.detalle,
      row.persona,
      row.cliente,
      row.sala,
      row.cadena,
      row.tipoLabel,
      row.estado,
      row.refTypeLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })

  const key = asigSortBy.value
  const dir = asigSortDir.value === 'desc' ? -1 : 1
  list = [...list].sort((a, b) => {
    let va = a[key]
    let vb = b[key]
    if (key === 'fecha' || key === 'createdAt') {
      const ta = va ? new Date(va).getTime() : 0
      const tb = vb ? new Date(vb).getTime() : 0
      return (ta - tb) * dir
    }
    va = String(va ?? '').toLowerCase()
    vb = String(vb ?? '').toLowerCase()
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
  return list
})

function clearAsigAdvFilters() {
  asigPersonaId.value = ''
  asigClienteId.value = ''
  asigSalaId.value = ''
  asigCadenaId.value = ''
  asigPage.value = 1
}

function onAsigCadenaFilterChange() {
  if (
    asigSalaId.value &&
    !asigSalasOptions.value.some((s) => String(s.id) === String(asigSalaId.value))
  ) {
    asigSalaId.value = ''
  }
  asigPage.value = 1
}
const asigTotal = computed(() => asignacionesFiltradas.value.length)
const asigTotalAll = computed(
  () => relaciones.value.length + visitasRec.value.length + consultas.value.length,
)
const asigPages = computed(() => Math.max(1, Math.ceil(asigTotal.value / asigPageSize.value)))
const asigPageItems = computed(() => {
  const page = Math.min(asigPage.value, asigPages.value)
  const start = (page - 1) * asigPageSize.value
  return asignacionesFiltradas.value.slice(start, start + asigPageSize.value)
})

watch(
  [asigFiltro, asigQ, asigEstadoFiltro, asigPageSize, asigPersonaId, asigClienteId, asigSalaId, asigCadenaId],
  () => {
    if (asigPage.value > asigPages.value) asigPage.value = 1
  },
)

const visibleTabs = computed(() => {
  const mode = showStructure.value ? CONFIG_TAB_IDS : OPS_TAB_IDS
  return tabs.value.filter((t) => mode.has(t.id))
})

function toggleStructure() {
  showStructure.value = !showStructure.value
  if (showStructure.value) {
    if (!CONFIG_TAB_IDS.has(tab.value)) tab.value = 'cadenas'
  } else if (!OPS_TAB_IDS.has(tab.value)) {
    tab.value = 'asignaciones'
  }
}

if (tab.value === 'visitas') tab.value = 'asignaciones'

const currentPerm = computed(() => rolePermisos.value.find((r) => r.role === permRole.value))

const filteredClientes = computed(() => {
  const q = qClientes.value.trim().toLowerCase()
  if (!q) return clientes.value
  return clientes.value.filter(
    (c) =>
      String(c.nombre || '').toLowerCase().includes(q) ||
      String(c.codigo || '').toLowerCase().includes(q),
  )
})
const filteredSalas = computed(() => {
  const q = qSalas.value.trim().toLowerCase()
  if (!q) return salas.value
  return salas.value.filter(
    (s) =>
      String(s.nombre || '').toLowerCase().includes(q) ||
      String(s.comuna || '').toLowerCase().includes(q) ||
      String(s.codigo || '').toLowerCase().includes(q) ||
      String(s.region || '').toLowerCase().includes(q) ||
      String(cadenaName(s.cadenaId) || '').toLowerCase().includes(q),
  )
})
const filteredUsuarios = computed(() => {
  const q = qRoles.value.trim().toLowerCase()
  if (!q) return usuarios.value
  return usuarios.value.filter((u) => String(u.nombre || '').toLowerCase().includes(q))
})

function roleLabel(r) {
  if (!r) return ''
  const fromCat = coberturaRoles.value.find((x) => x.codigo === r)
  if (fromCat) return fromCat.nombre
  return ROLE_LABELS[r] || r
}
function screenLabel(s) {
  return SCREEN_LABELS[s] || s
}
function actionLabel(a) {
  return ACTION_LABELS[a] || a
}
function cadenaName(id) {
  return cadenas.value.find((c) => c.id === id)?.nombre || '—'
}
function subcadenaName(id) {
  return subcadenas.value.find((s) => s.id === id)?.nombre || '—'
}
function clienteName(id) {
  return clientes.value.find((c) => c.id === id)?.nombre || `Cliente …${String(id || '').slice(-4)}`
}
function clienteCodigoOf(id) {
  return clientes.value.find((c) => c.id === id)?.codigo || ''
}
function salaName(id) {
  return salas.value.find((s) => s.id === id)?.nombre || `Sala …${String(id || '').slice(-4)}`
}
function userName(id) {
  return usuarios.value.find((u) => u.id === id)?.nombre || `…${String(id || '').slice(-6)}`
}
function categoriaName(id) {
  return categorias.value.find((c) => c.id === id)?.nombre || ''
}
function templateName(id) {
  if (!id) return ''
  return templates.value.find((t) => t.id === id)?.nombre || ''
}
function templateMediciones(id) {
  if (!id) return []
  const t = templates.value.find((x) => x.id === id)
  return Array.isArray(t?.mediciones) ? t.mediciones : []
}
function hasCoberturaDetalle(row) {
  return Boolean(
    (row?.descripcion && String(row.descripcion).trim()) ||
      row?.templateId ||
      (row?.templateMediciones && row.templateMediciones.length),
  )
}
function openCoberturaDetalle(row) {
  if (!hasCoberturaDetalle(row)) return
  coberturaDetalle.value = {
    modalTitle: 'Qué se cubre',
    titulo: `${row.cliente || 'Cliente'} · ${row.sala || 'Sala'}`,
    descripcion: row.descripcion || '',
    templateNombre: row.templateNombre || templateName(row.templateId),
    mediciones: row.templateMediciones?.length
      ? row.templateMediciones
      : templateMediciones(row.templateId),
  }
}
function openTemplatePreview(templateId) {
  if (!templateId) return
  const t = templates.value.find((x) => String(x.id) === String(templateId))
  if (!t) return
  coberturaDetalle.value = {
    modalTitle: 'Plantilla de checklist',
    titulo: t.categoriaId ? categoriaName(t.categoriaId) : '',
    descripcion: t.descripcion || '',
    templateNombre: t.nombre || 'Plantilla',
    hideChecklistLabel: true,
    mediciones: Array.isArray(t.mediciones) ? t.mediciones : [],
    templateId: String(t.id),
    canEditTemplate: true,
  }
}
function closeCoberturaDetalle() {
  coberturaDetalle.value = null
}
function editTemplateFromDetalle() {
  const id = coberturaDetalle.value?.templateId
  closeCoberturaDetalle()
  if (!id) return
  const t = templates.value.find((x) => String(x.id) === String(id))
  if (t) openEditTemplate(t)
}
function formatWhen(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
function formatCreatedAt(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}
function labelVisitaFreq(v) {
  if (!v) return ''
  const hora = v.horaLocal || '09:00'
  if (v.frecuencia === 'diaria') return `Todos los días · ${hora}`
  if (v.frecuencia === 'semanal') {
    const d = DIAS_SEMANA.find((x) => x.v === Number(v.diaSemana))?.l || '—'
    return `Cada ${d} · ${hora}`
  }
  if (v.frecuencia === 'semanal_custom') {
    const days = (Array.isArray(v.diasSemana) && v.diasSemana.length
      ? v.diasSemana
      : [v.diaSemana]
    ).map(Number)
    const names = days
      .map((n) => DIAS_SEMANA.find((x) => x.v === n)?.short || n)
      .join(', ')
    return `Semanal custom · ${names} · ${hora}`
  }
  if (v.frecuencia === 'mensual') return `Día ${v.diaMes || 1} de cada mes · ${hora}`
  if (v.frecuencia === 'mensual_custom') {
    const weeks = (Array.isArray(v.semanasMes) && v.semanasMes.length ? v.semanasMes : [1])
      .map(Number)
      .join(' y ')
    const d = DIAS_SEMANA.find((x) => x.v === Number(v.diaSemana))?.l || '—'
    return `Mensual custom · sem. ${weeks} · ${d} · ${hora}`
  }
  return v.frecuencia || ''
}
function salaOfRel(r) {
  return salas.value.find((s) => s.id === r?.salaId) || null
}
function salaUbicacion(s) {
  const parts = [s?.comuna, s?.region, s?.pais].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Sin ubicación'
}

function parseCoord(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseLatLngFromText(text) {
  const s = String(text || '').trim()
  if (!s) return null
  let m = s.match(/@(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  m = s.match(/[?&](?:q|query)=(-?\d+\.?\d*)[,+\s]+(-?\d+\.?\d*)/i)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  m = s.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  m = s.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  return null
}

function applyMapsPasteToSala() {
  const parsed = parseLatLngFromText(sala.mapsPaste)
  if (!parsed) return
  sala.lat = String(parsed.lat)
  sala.lng = String(parsed.lng)
}

function applyMapsPasteToGeoEdit() {
  if (!salaGeoEdit.value) return
  const parsed = parseLatLngFromText(salaGeoEdit.value.mapsPaste)
  if (!parsed) return
  salaGeoEdit.value.lat = String(parsed.lat)
  salaGeoEdit.value.lng = String(parsed.lng)
}

function hasSalaGeo(s) {
  return Number.isFinite(Number(s?.lat)) && Number.isFinite(Number(s?.lng))
}

function hasRowGeo(row) {
  return Number.isFinite(Number(row?.lat)) && Number.isFinite(Number(row?.lng))
}

function googleMapsEmbedUrl(lat, lng) {
  const q = encodeURIComponent(`${lat},${lng}`)
  return `https://maps.google.com/maps?q=${q}&z=16&output=embed`
}

function googleMapsOpenUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
}

function openMapPreview(row) {
  if (!hasRowGeo(row)) return
  mapPreview.value = {
    nombre: row.sala || row.titulo || 'Sala',
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

function closeMapPreview() {
  mapPreview.value = null
}

function openSalaGeoEdit(s) {
  salaGeoEdit.value = {
    id: s.id,
    nombre: s.nombre,
    lat: hasSalaGeo(s) ? String(s.lat) : '',
    lng: hasSalaGeo(s) ? String(s.lng) : '',
    mapsPaste: '',
  }
}

function closeSalaGeoEdit() {
  if (salaGeoBusy.value) return
  salaGeoEdit.value = null
}

async function saveSalaGeo() {
  const g = salaGeoEdit.value
  if (!g || salaGeoBusy.value) return
  const lat = parseCoord(g.lat)
  const lng = parseCoord(g.lng)
  if (lat == null || lng == null) {
    error.value = 'Indicá latitud y longitud válidas'
    return
  }
  salaGeoBusy.value = true
  error.value = ''
  try {
    await api.patch(`/admin/supervision/salas/${g.id}`, { lat, lng })
    okMsg.value = 'Geolocalización guardada'
    salaGeoEdit.value = null
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar la geolocalización'
  } finally {
    salaGeoBusy.value = false
  }
}

async function clearSalaGeo() {
  const g = salaGeoEdit.value
  if (!g || salaGeoBusy.value) return
  salaGeoBusy.value = true
  error.value = ''
  try {
    await api.patch(`/admin/supervision/salas/${g.id}`, { lat: null, lng: null })
    okMsg.value = 'Geolocalización quitada'
    salaGeoEdit.value = null
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo quitar la geolocalización'
  } finally {
    salaGeoBusy.value = false
  }
}

function salasOfCadena(id) {
  return salas.value.filter((s) => s.cadenaId === id).length
}
function subcadenasOfCadena(id) {
  return subcadenas.value.filter((s) => s.cadenaId === id).length
}
function asignacionesOfCadena(id) {
  const salaIds = new Set(salas.value.filter((s) => s.cadenaId === id).map((s) => s.id))
  return relaciones.value.filter((r) => salaIds.has(r.salaId)).length
}
function salasOfSubcadena(id) {
  return salas.value.filter((s) => s.subcadenaId === id).length
}
function salasOfCliente(id) {
  return relaciones.value.filter((r) => r.clienteId === id).length
}
function colabsOfCliente(id) {
  return relaciones.value
    .filter((r) => r.clienteId === id)
    .reduce((n, r) => n + (r.colaboradores?.length || 0), 0)
}
function clientesOfSala(id) {
  return relaciones.value.filter((r) => r.salaId === id).length
}
function colabsOfSala(id) {
  return relaciones.value
    .filter((r) => r.salaId === id)
    .reduce((n, r) => n + (r.colaboradores?.length || 0), 0)
}

const structureGraph = ref(null) // { kind, id }
const structureGraphTitle = computed(() => {
  const g = structureGraph.value
  if (!g) return 'Grafo'
  if (g.kind === 'guide') return 'Cómo se arma la estructura (ejemplo)'
  if (g.kind === 'all') return 'Grafo de estructura (todas las cadenas)'
  const name =
    g.kind === 'cadena'
      ? cadenaName(g.id)
      : g.kind === 'subcadena'
        ? subcadenaName(g.id)
        : g.kind === 'cliente'
          ? clienteName(g.id)
          : g.kind === 'sala'
            ? salaName(g.id)
            : ''
  return `Grafo desde ${g.kind}: ${name}`
})

/** Árbol didáctico fijo (guía visual) — no usa datos del tenant. */
const GUIDE_STRUCTURE_ROOT = {
  id: 'guide-root',
  kind: 'cadena',
  nombre: 'Cadena (ej. Hipermercados)',
  meta: 'Red de locales',
  children: [
    {
      id: 'guide-sub-n',
      kind: 'subcadena',
      nombre: 'Subcadena Norte',
      meta: 'Zona / región',
      children: [
        {
          id: 'guide-sala-1',
          kind: 'sala',
          nombre: 'Sala Centro',
          meta: 'Local físico',
          children: [
            {
              id: 'guide-cli-a1',
              kind: 'cliente',
              nombre: 'Cliente Alfa',
              meta: 'Cobertura en esta sala',
              children: [],
            },
          ],
        },
        {
          id: 'guide-sala-2',
          kind: 'sala',
          nombre: 'Sala Norte',
          meta: 'Local físico',
          children: [
            {
              id: 'guide-cli-a2',
              kind: 'cliente',
              nombre: 'Cliente Alfa',
              meta: 'Misma cuenta, otra sala',
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: 'guide-sub-s',
      kind: 'subcadena',
      nombre: 'Subcadena Sur',
      meta: 'Zona / región',
      children: [
        {
          id: 'guide-sala-3',
          kind: 'sala',
          nombre: 'Sala Sur',
          meta: 'Local físico',
          children: [
            {
              id: 'guide-cli-b',
              kind: 'cliente',
              nombre: 'Cliente Beta',
              meta: 'Cobertura en esta sala',
              children: [],
            },
          ],
        },
      ],
    },
  ],
}

function clientesNodesOfSala(salaId) {
  return relaciones.value
    .filter((r) => r.salaId === salaId && r.activo !== false)
    .map((r) => {
      const c = clientes.value.find((x) => x.id === r.clienteId)
      return {
        id: r.clienteId,
        kind: 'cliente',
        nombre: c?.nombre || clienteName(r.clienteId),
        meta: c?.codigo || `${(r.colaboradores || []).length} colab.`,
        off: c?.activo === false,
        children: [],
      }
    })
}

function salaNode(s, { withClientes = true } = {}) {
  return {
    id: s.id,
    kind: 'sala',
    nombre: s.nombre,
    meta: salaUbicacion(s),
    off: s.activo === false,
    children: withClientes ? clientesNodesOfSala(s.id) : [],
  }
}

function subcadenaNode(sub, cadenaId) {
  const salasHijas = salas.value.filter(
    (s) => s.subcadenaId === sub.id && (!cadenaId || s.cadenaId === cadenaId),
  )
  return {
    id: sub.id,
    kind: 'subcadena',
    nombre: sub.nombre,
    meta: `${salasHijas.length} sala${salasHijas.length === 1 ? '' : 's'}`,
    off: sub.activo === false,
    children: salasHijas.map((s) => salaNode(s)),
  }
}

function cadenaNode(c) {
  const subs = subcadenas.value.filter((s) => s.cadenaId === c.id)
  const salasDirectas = salas.value.filter((s) => s.cadenaId === c.id && !s.subcadenaId)
  const children = [
    ...subs.map((s) => subcadenaNode(s, c.id)),
    ...(salasDirectas.length
      ? [
          {
            id: `direct-${c.id}`,
            kind: 'grupo',
            nombre: 'Salas sin subcadena',
            meta: `${salasDirectas.length}`,
            children: salasDirectas.map((s) => salaNode(s)),
          },
        ]
      : []),
  ]
  return {
    id: c.id,
    kind: 'cadena',
    nombre: c.nombre,
    meta: `${subs.length} sub · ${salasOfCadena(c.id)} salas`,
    off: c.activo === false,
    children,
  }
}

const structureGraphRoot = computed(() => {
  const g = structureGraph.value
  if (!g) return null
  if (g.kind === 'guide') return GUIDE_STRUCTURE_ROOT
  if (g.kind === 'all') {
    const kids = cadenas.value.map((c) => cadenaNode(c))
    return {
      id: 'root-all',
      kind: 'grupo',
      nombre: 'Estructura comercial',
      meta: `${kids.length} cadena${kids.length === 1 ? '' : 's'}`,
      children: kids,
    }
  }
  if (g.kind === 'cadena') {
    const c = cadenas.value.find((x) => x.id === g.id)
    return c ? cadenaNode(c) : null
  }
  if (g.kind === 'subcadena') {
    const s = subcadenas.value.find((x) => x.id === g.id)
    return s ? subcadenaNode(s, s.cadenaId) : null
  }
  if (g.kind === 'cliente') {
    const c = clientes.value.find((x) => x.id === g.id)
    if (!c) return null
    const salasIds = new Set(
      relaciones.value.filter((r) => r.clienteId === c.id).map((r) => r.salaId),
    )
    const kids = salas.value.filter((s) => salasIds.has(s.id)).map((s) => ({
      ...salaNode(s, { withClientes: false }),
      meta: [cadenaName(s.cadenaId), s.subcadenaId ? subcadenaName(s.subcadenaId) : null]
        .filter(Boolean)
        .join(' · '),
    }))
    return {
      id: c.id,
      kind: 'cliente',
      nombre: c.nombre,
      meta: c.codigo || 'Cobertura en salas',
      off: c.activo === false,
      children: kids,
    }
  }
  if (g.kind === 'sala') {
    const s = salas.value.find((x) => x.id === g.id)
    if (!s) return null
    // Mostrar padres como contexto + clientes debajo
    const leaf = salaNode(s)
    if (s.subcadenaId) {
      const sub = subcadenas.value.find((x) => x.id === s.subcadenaId)
      if (sub) {
        const wrapped = {
          ...subcadenaNode(sub, s.cadenaId),
          children: [leaf],
        }
        if (s.cadenaId) {
          const cad = cadenas.value.find((x) => x.id === s.cadenaId)
          if (cad) {
            return {
              ...cadenaNode(cad),
              children: [wrapped],
            }
          }
        }
        return wrapped
      }
    }
    if (s.cadenaId) {
      const cad = cadenas.value.find((x) => x.id === s.cadenaId)
      if (cad) {
        return {
          id: cad.id,
          kind: 'cadena',
          nombre: cad.nombre,
          meta: 'Padre de la sala',
          off: cad.activo === false,
          children: [leaf],
        }
      }
    }
    return leaf
  }
  return null
})

function openStructureGraph(kind, id = '') {
  structureGraph.value = { kind, id }
}
function closeStructureGraph() {
  structureGraph.value = null
}
function onGuideOpenGraph() {
  openStructureGraph('guide')
}

async function loadAll() {
  error.value = ''
  busy.value = true
  try {
    const [c, cl, s, r, t, u, sc, cat, pil, med, est, rp, vr, cq, mod, cr] = await Promise.all([
      api.get('/admin/supervision/cadenas'),
      api.get('/admin/supervision/clientes'),
      api.get('/admin/supervision/salas'),
      api.get('/admin/supervision/cliente-salas'),
      api.get('/admin/supervision/templates'),
      api.get('/admin/supervision/usuarios-roles'),
      api.get('/admin/supervision/subcadenas'),
      api.get('/admin/supervision/categorias'),
      api.get('/admin/supervision/pilares'),
      api.get('/admin/supervision/mediciones'),
      api.get('/admin/supervision/templates-estados'),
      api.get('/admin/supervision/roles-permisos'),
      api.get('/admin/supervision/visita-recurrencias'),
      api.get('/admin/supervision/asignaciones-consulta'),
      api.get('/admin/supervision/module').catch(() => ({ data: { enabled: false } })),
      api.get('/admin/supervision/cobertura-roles').catch(() => ({ data: { items: [] } })),
    ])
    cadenas.value = c.data.items || []
    clientes.value = cl.data.items || []
    salas.value = s.data.items || []
    relaciones.value = r.data.items || []
    templates.value = t.data.items || []
    usuarios.value = u.data.items || []
    subcadenas.value = sc.data.items || []
    categorias.value = cat.data.items || []
    pilares.value = pil.data.items || []
    mediciones.value = med.data.items || []
    templateEstados.value = est.data.items || []
    rolePermisos.value = rp.data.items || []
    screens.value = rp.data.screens || []
    actions.value = rp.data.actions || []
    visitasRec.value = vr.data.items || []
    consultas.value = cq.data.items || []
    coberturaRoles.value = cr.data.items || []
    moduleEnabled.value = Boolean(mod.data?.enabled)
    if (u.data.roles?.length) roles.value = u.data.roles
    if (!colab.role || !coberturaRolesActivos.value.some((x) => x.codigo === colab.role)) {
      colab.role = coberturaRolesActivos.value[0]?.codigo || 'operario'
    }
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  } finally {
    busy.value = false
  }
}

async function onImport() {
  okMsg.value = 'Importación lista'
  await loadAll()
}

async function setModuleEnabled(enabled) {
  moduleBusy.value = true
  error.value = ''
  try {
    const { data } = await api.put('/admin/supervision/module', { enabled })
    moduleEnabled.value = Boolean(data.enabled)
    if (auth.tenant) {
      auth.tenant = {
        ...auth.tenant,
        capabilities: data.capabilities || auth.tenant.capabilities,
        menuVersion: data.menuVersion ?? auth.tenant.menuVersion,
      }
      localStorage.setItem('cxa_tenant', JSON.stringify(auth.tenant))
    }
    okMsg.value = enabled
      ? 'Módulo activado en esta comunidad (menú + capability)'
      : 'Módulo desactivado en esta comunidad'
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cambiar el módulo'
    moduleEnabled.value = !enabled
  } finally {
    moduleBusy.value = false
  }
}

function onModuleToggle(e) {
  const next = Boolean(e?.target?.checked)
  if (!next) {
    const ok = confirm(
      '¿Desactivar Supervisión comercial en esta comunidad?\n\n' +
        'Se oculta del menú (app y admin) y se quita la capability supervision.comercial.\n' +
        'Los datos no se borran.',
    )
    if (!ok) {
      e.target.checked = true
      return
    }
  }
  setModuleEnabled(next)
}

async function runSeedDemo() {
  const force = confirm(
    '¿Cargar datos demo de Supervisión + Equipos en ESTA comunidad?\n\n' +
      'Aceptar = recrear la casuística demo (borra y vuelve a crear los datos de ejemplo).\n' +
      'Cancelar = no hacer nada.\n\n' +
      'Incluye usuarios demo (pass Demo1234!), cadenas, clientes, salas, plantillas y 7 equipos.',
  )
  if (!force) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/supervision/seed-demo', { force: true })
    const s = data?.stats || {}
    okMsg.value = `Demo OK · ${s.cadenas || 0} cadenas · ${s.asignaciones || 0} coberturas · ${s.visitaRecurrencias || 0} visitas · ${s.consultas || 0} acciones · ${s.teamScopes || 0} equipos`
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Error al cargar demo'
  } finally {
    busy.value = false
  }
}

async function addCadena() {
  await api.post('/admin/supervision/cadenas', { nombre: cadenaNombre.value })
  cadenaNombre.value = ''
  okMsg.value = 'Cadena creada'
  closeCreate()
  await loadAll()
}
async function addSubcadena() {
  await api.post('/admin/supervision/subcadenas', { ...sub })
  sub.nombre = ''
  okMsg.value = 'Subcadena creada'
  closeCreate()
  await loadAll()
}
async function addCliente() {
  await api.post('/admin/supervision/clientes', {
    nombre: clienteNombre.value,
    codigo: clienteCodigo.value,
  })
  clienteNombre.value = ''
  clienteCodigo.value = ''
  okMsg.value = 'Cliente creado'
  closeCreate()
  await loadAll()
}
async function addSala() {
  const lat = parseCoord(sala.lat)
  const lng = parseCoord(sala.lng)
  await api.post('/admin/supervision/salas', {
    nombre: sala.nombre,
    cadenaId: sala.cadenaId || undefined,
    comuna: sala.comuna,
    lat,
    lng,
  })
  sala.nombre = ''
  sala.comuna = ''
  sala.lat = ''
  sala.lng = ''
  sala.mapsPaste = ''
  sala.cadenaId = ''
  okMsg.value = 'Sala creada'
  closeCreate()
  await loadAll()
}
async function addRelacion() {
  if (!rel.clienteId || !rel.salaId) throw new Error('Elegí cliente y sala')
  const titulo = String(rel.titulo || '').trim().slice(0, 40)
  if (!titulo) throw new Error('Indicá un título (máx. 40 caracteres)')
  const payload = {
    titulo,
    clienteId: rel.clienteId,
    salaId: rel.salaId,
    descripcion: rel.descripcion || '',
    templateId: rel.templateId || null,
  }
  if (editId.value) {
    await api.patch(`/admin/supervision/cliente-salas/${editId.value}`, payload)
    flashOk('Cobertura actualizada correctamente')
  } else {
    await api.post('/admin/supervision/cliente-salas', payload)
    flashOk(`Cobertura «${titulo}» guardada correctamente`)
  }
  resetRelForm()
  closeCreate()
  await loadAll()
}
async function addColab(id) {
  if (!colab.userId || !colab.role) throw new Error('Elegí persona y rol de cobertura')
  await api.post(`/admin/supervision/cliente-salas/${id}/colaboradores`, {
    userId: colab.userId,
    role: colab.role,
  })
  colab.userId = ''
  colab.role = coberturaRolesActivos.value[0]?.codigo || 'operario'
  okMsg.value = 'Colaborador agregado'
  closeCreate()
  await loadAll()
}

async function addCoberturaRol() {
  await api.post('/admin/supervision/cobertura-roles', {
    nombre: coberturaRolForm.nombre,
    codigo: coberturaRolForm.codigo || undefined,
    descripcion: coberturaRolForm.descripcion || undefined,
  })
  coberturaRolForm.nombre = ''
  coberturaRolForm.codigo = ''
  coberturaRolForm.descripcion = ''
  okMsg.value = 'Rol de cobertura creado'
  closeCreate()
  await loadAll()
}

async function toggleCoberturaRol(r) {
  await api.patch(`/admin/supervision/cobertura-roles/${r.id}`, { activo: !r.activo })
  okMsg.value = r.activo ? 'Rol desactivado' : 'Rol activado'
  await loadAll()
}
async function addNamed(path, nombre, extra = {}) {
  await api.post(`/admin/supervision/${path}`, { nombre, ...extra })
  catNombre.value = ''
  pilarNombre.value = ''
  medNombre.value = ''
  estNombre.value = ''
  okMsg.value = 'Ítem agregado'
  closeCreate()
  await loadAll()
}
async function addTemplate() {
  const nombre = String(tpl.nombre || '').trim()
  if (!nombre) throw new Error('Indicá un nombre para la plantilla')
  const mediciones = (tpl.items || [])
    .map((item, i) => ({
      key: item.key && !String(item.key).startsWith('tmp-') ? String(item.key) : `m${i + 1}`,
      nombre: String(item.nombre || '').trim(),
      tipo: 'check',
      obligatorio: item.obligatorio !== false,
      orden: i,
      requiereFoto: Boolean(item.requiereFoto),
      requiereTexto: Boolean(item.requiereTexto),
    }))
    .filter((m) => m.nombre)
  if (!mediciones.length) throw new Error('Agregá al menos un ítem al checklist')
  const payload = {
    nombre,
    descripcion: tpl.descripcion || '',
    mediciones,
    categoriaId: tpl.categoriaId || null,
    estadoId: tpl.estadoId || null,
  }
  if (editId.value) {
    await api.patch(`/admin/supervision/templates/${editId.value}`, payload)
    flashOk(`Plantilla «${nombre}» actualizada`)
  } else {
    await api.post('/admin/supervision/templates', payload)
    flashOk(`Plantilla «${nombre}» creada`)
  }
  resetTplForm()
  closeCreate()
  await loadAll()
}

async function toggleTemplateActivo(t) {
  if (!t?.id) return
  busy.value = true
  error.value = ''
  try {
    const next = t.activo === false
    await api.patch(`/admin/supervision/templates/${t.id}`, { activo: next })
    flashOk(next ? 'Plantilla activada' : 'Plantilla desactivada')
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'No se pudo cambiar la plantilla'
  } finally {
    busy.value = false
  }
}

async function addVisita() {
  const titulo = String(visita.titulo || '').trim().slice(0, 40)
  if (!titulo) throw new Error('Indicá un título (máx. 40 caracteres)')
  if (!visita.salaId) {
    visitaSection.value = 'punto'
    throw new Error('Elegí una sala')
  }
  if (visita.frecuencia === 'semanal_custom' && !visita.diasSemana?.length) {
    visitaSection.value = 'agenda'
    throw new Error('Elegí al menos un día de la semana')
  }
  if (visita.frecuencia === 'mensual_custom' && !visita.semanasMes?.length) {
    visitaSection.value = 'agenda'
    throw new Error('Elegí al menos una semana del mes')
  }
  const asignadosIds = [...new Set((visita.asignadosIds || []).map(String).filter(Boolean))]
  const payload = {
    titulo,
    descripcion: visita.descripcion,
    salaId: visita.salaId,
    clienteId: visita.clienteId || null,
    templateId: visita.templateId || null,
    asignadoId: asignadosIds[0] || null,
    asignadosIds,
    frecuencia: visita.frecuencia,
    diaSemana: visita.diaSemana,
    diasSemana: visita.frecuencia === 'semanal_custom' ? [...visita.diasSemana] : [],
    diaMes: visita.diaMes,
    semanasMes: visita.frecuencia === 'mensual_custom' ? [...visita.semanasMes] : [],
    horaLocal: visita.horaLocal,
    plazoHoras: visita.plazoHoras,
    prioridad: visita.prioridad,
    requiereFoto: visita.requiereFoto,
  }
  if (editId.value) {
    await api.patch(`/admin/supervision/visita-recurrencias/${editId.value}`, payload)
    okMsg.value = 'Visita actualizada'
  } else {
    await api.post('/admin/supervision/visita-recurrencias', {
      ...payload,
      clienteId: visita.clienteId || undefined,
      templateId: visita.templateId || undefined,
      asignadoId: asignadosIds[0] || undefined,
    })
    okMsg.value = 'Visita programada creada'
  }
  resetVisitaForm()
  closeCreate()
  await loadAll()
}

async function toggleVisitaEnabled(v) {
  await api.patch(`/admin/supervision/visita-recurrencias/${v.id}`, { enabled: v.enabled === false })
  okMsg.value = v.enabled === false ? 'Visita reactivada' : 'Visita pausada'
  await loadAll()
}

function toggleCobertura(row) {
  const activar = Boolean(row.off)
  if (activar) {
    return applyCoberturaActivo(row.id, true)
  }
  asigConfirm.value = {
    kind: 'cobertura-toggle',
    title: 'Desactivar cobertura',
    message: `¿Desactivar la cobertura de ${row.cliente || 'este cliente'} en ${row.sala || 'esta sala'}?`,
    detail: 'La asignación sigue existiendo, pero queda inactiva hasta que la reactives.',
    confirmLabel: 'Desactivar cobertura',
    busyLabel: 'Desactivando…',
    danger: true,
    payload: { id: row.id, activo: false },
  }
}

async function applyCoberturaActivo(id, activo) {
  await api.patch(`/admin/supervision/cliente-salas/${id}`, { activo })
  okMsg.value = activo ? 'Cobertura activada' : 'Cobertura desactivada'
  await loadAll()
}

function closeAsigConfirm() {
  if (asigConfirmBusy.value) return
  asigConfirm.value = null
}

async function refreshAsignadosModal(rowKey) {
  await loadAll()
  if (!asignadosModal.value) return
  const refreshed = asignacionesRows.value.find((r) => r.key === rowKey)
  if (refreshed) asignadosModal.value = refreshed
  else asignadosModal.value = null
}

async function executeAsigConfirm() {
  const c = asigConfirm.value
  if (!c || asigConfirmBusy.value) return
  const modalKey = asignadosModal.value?.key
  asigConfirmBusy.value = true
  error.value = ''
  try {
    if (c.kind === 'cobertura-toggle') {
      await applyCoberturaActivo(c.payload.id, c.payload.activo)
    } else if (c.kind === 'cobertura-colab') {
      const { data } = await api.delete(
        `/admin/supervision/cliente-salas/${c.payload.rowId}/colaboradores/${c.payload.userId}`,
      )
      okMsg.value = data?.deletedAssignment
        ? 'Cobertura eliminada (sin asignados)'
        : 'Asignado quitado'
      if (data?.deletedAssignment) asignadosModal.value = null
      if (modalKey) await refreshAsignadosModal(modalKey)
      else await loadAll()
    } else if (c.kind === 'visita-asignado') {
      const { data } = await api.delete(
        `/admin/supervision/visita-recurrencias/${c.payload.id}/asignados/${c.payload.userId}`,
      )
      okMsg.value = data?.deletedAssignment
        ? 'Visita eliminada (sin asignados)'
        : 'Asignado quitado'
      if (data?.deletedAssignment) asignadosModal.value = null
      if (modalKey) await refreshAsignadosModal(modalKey)
      else await loadAll()
    } else if (c.kind === 'consulta-asignado') {
      const { data } = await api.delete(
        `/admin/supervision/asignaciones-consulta/${c.payload.id}/asignados/${c.payload.userId}`,
      )
      okMsg.value = data?.deletedAssignment
        ? 'Acción solicitada eliminada (sin asignados)'
        : 'Asignado quitado'
      if (data?.deletedAssignment) asignadosModal.value = null
      if (modalKey) await refreshAsignadosModal(modalKey)
      else await loadAll()
    } else if (c.kind === 'visita') {
      await api.delete(`/admin/supervision/visita-recurrencias/${c.payload.id}`)
      okMsg.value = 'Programa quitado'
      await loadAll()
    } else if (c.kind === 'consulta') {
      await api.delete(`/admin/supervision/asignaciones-consulta/${c.payload.id}`)
      okMsg.value = 'Acción solicitada quitada'
      await loadAll()
    }
    asigConfirm.value = null
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo completar la acción'
  } finally {
    asigConfirmBusy.value = false
  }
}

async function setConsultaStatus(id, status) {
  await api.patch(`/admin/supervision/asignaciones-consulta/${id}`, { status })
  okMsg.value =
    status === 'ok'
      ? 'Acción solicitada marcada OK'
      : status === 'visto'
        ? 'Acción solicitada marcada como vista'
        : 'Acción solicitada en pendiente'
  await loadAll()
}

function removeVisita(id) {
  asigConfirm.value = {
    kind: 'visita',
    title: 'Quitar programa de visitas',
    message: '¿Quitar este programa de visitas?',
    detail: 'Se elimina la recurrencia y sus asignados. Esta acción no se puede deshacer.',
    confirmLabel: 'Quitar visita',
    busyLabel: 'Quitando…',
    danger: true,
    payload: { id },
  }
}

function removeConsulta(id) {
  asigConfirm.value = {
    kind: 'consulta',
    title: 'Quitar acción solicitada',
    message: '¿Quitar esta acción solicitada?',
    detail: 'Se elimina la acción y sus asignados. Esta acción no se puede deshacer.',
    confirmLabel: 'Quitar acción',
    busyLabel: 'Quitando…',
    danger: true,
    payload: { id },
  }
}

async function addConsulta() {
  const titulo = String(consulta.titulo || '').trim().slice(0, 40)
  if (!titulo) {
    consultaSection.value = 'accion'
    throw new Error('Indicá un título (máx. 40 caracteres)')
  }
  if (!consulta.asignadoId) {
    consultaSection.value = 'asignado'
    throw new Error('Elegí a quién asignar')
  }
  const payload = {
    titulo,
    instrucciones: consulta.instrucciones,
    refType: consulta.refType,
    refLabel: consulta.refLabel,
    asignadoId: consulta.asignadoId,
    dueAt: consulta.dueAt || null,
  }
  if (editId.value) {
    await api.patch(`/admin/supervision/asignaciones-consulta/${editId.value}`, payload)
    flashOk(`Acción solicitada «${titulo}» actualizada`)
  } else {
    await api.post('/admin/supervision/asignaciones-consulta', {
      ...payload,
      dueAt: consulta.dueAt || undefined,
    })
    flashOk(`Acción solicitada «${titulo}» creada`)
  }
  resetConsultaForm()
  closeCreate()
  await loadAll()
}

async function submitCreate() {
  busy.value = true
  error.value = ''
  try {
    if (createKind.value === 'cadena') await addCadena()
    else if (createKind.value === 'subcadena') await addSubcadena()
    else if (createKind.value === 'cliente') await addCliente()
    else if (createKind.value === 'sala') await addSala()
    else if (createKind.value === 'relacion') await addRelacion()
    else if (createKind.value === 'colab') await addColab(createTargetId.value)
    else if (createKind.value === 'coberturaRol') await addCoberturaRol()
    else if (createKind.value === 'categoria') await addNamed('categorias', catNombre.value, { color: catColor.value })
    else if (createKind.value === 'pilar') await addNamed('pilares', pilarNombre.value)
    else if (createKind.value === 'medicion') await addNamed('mediciones', medNombre.value, { tipo: 'check' })
    else if (createKind.value === 'estado') await addNamed('templates-estados', estNombre.value)
    else if (createKind.value === 'template') await addTemplate()
    else if (createKind.value === 'visita') await addVisita()
    else if (createKind.value === 'consulta') await addConsulta()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'No se pudo crear'
  } finally {
    busy.value = false
  }
}
async function setRole(userId, supervisionRole) {
  await api.patch(`/admin/supervision/usuarios-roles/${userId}`, { supervisionRole })
  okMsg.value = 'Rol actualizado'
  await loadAll()
}
async function seedGeo() {
  await api.post('/admin/supervision/ubicaciones/seed-demo')
  okMsg.value = 'Geo demo sembrada'
}
function togglePerm(screen, action, val) {
  const row = rolePermisos.value.find((r) => r.role === permRole.value)
  if (!row) return
  if (!row.permisos[screen]) row.permisos[screen] = {}
  row.permisos[screen][action] = val
}
async function savePerms() {
  const row = currentPerm.value
  if (!row) return
  await api.put(`/admin/supervision/roles-permisos/${row.role}`, { permisos: row.permisos })
  okMsg.value = 'Permisos guardados'
  await loadAll()
}
async function resetPerms() {
  await api.post(`/admin/supervision/roles-permisos/reset/${permRole.value}`)
  okMsg.value = 'Permisos reseteados'
  await loadAll()
}

watch(tab, () => {
  okMsg.value = ''
})

watch(createKind, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

onMounted(loadAll)
</script>

<style scoped>
.sv {
  max-width: 1400px;
}
.sv :deep(.admin-page-header__actions) {
  gap: 0.55rem !important;
}
.sv :deep(.admin-page-header__actions button) {
  margin: 0 !important;
}
.sv .btn-primary,
.sv .btn-ghost,
.sv-modal-root .btn-primary,
.sv-modal-root .btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s, filter 0.15s, box-shadow 0.15s;
}
.sv .btn-primary,
.sv-modal-root .btn-primary {
  background: var(--brand) !important;
  border: 1px solid var(--brand) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand) 35%, transparent);
}
.sv .btn-primary:hover:not(:disabled),
.sv-modal-root .btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
}
.sv .btn-ghost,
.sv-modal-root .btn-ghost {
  background: var(--panel) !important;
  border: 1px solid var(--line-2, var(--line)) !important;
  color: var(--ink) !important;
  box-shadow: none;
}
.sv .btn-ghost:hover:not(:disabled),
.sv-modal-root .btn-ghost:hover:not(:disabled) {
  background: var(--brand-soft) !important;
  border-color: var(--brand-line) !important;
  color: var(--brand-ink) !important;
}
.sv .btn-ghost.on {
  background: color-mix(in srgb, var(--brand-soft) 75%, var(--panel)) !important;
  border-color: var(--brand-line, var(--brand)) !important;
  color: var(--brand-ink, var(--ink)) !important;
}
.sv .btn-primary:disabled,
.sv .btn-ghost:disabled,
.sv-modal-root .btn-primary:disabled,
.sv-modal-root .btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: none;
}
.sv .btn-ghost.btn-icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
}
.sv-mod-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  padding: 0.28rem 0.65rem 0.28rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, background 0.15s;
}
.sv-mod-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.sv-mod-track {
  position: relative;
  width: 2.2rem;
  height: 1.2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink-soft) 28%, var(--panel));
  flex-shrink: 0;
  transition: background 0.15s;
}
.sv-mod-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.2rem - 4px);
  height: calc(1.2rem - 4px);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s;
}
.sv-mod-switch.on {
  border-color: color-mix(in srgb, #34d399 55%, var(--line));
  background: color-mix(in srgb, #34d399 12%, var(--panel));
}
.sv-mod-switch.on .sv-mod-track {
  background: #34d399;
}
.sv-mod-switch.on .sv-mod-knob {
  transform: translateX(1rem);
}
.sv-mod-switch.busy {
  opacity: 0.6;
  pointer-events: none;
}
.sv-mod-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 3.4rem;
}
.sv-mod-state {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
}
.sv-mod-switch.on .sv-mod-state {
  color: #059669;
}
.sv-mod-sub {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.sv :deep(.screen-help) {
  margin: 0.35rem 0 1rem;
}
.sv-err {
  color: #f87171;
  font-size: 0.875rem;
}
.sv-ok {
  color: #34d399;
  font-size: 0.875rem;
}
.sv-toast {
  position: fixed;
  top: 1.1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10050;
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  max-width: min(560px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  animation: sv-toast-in 0.22s ease-out;
}
.sv-toast i:first-child {
  margin-top: 0.12rem;
  flex-shrink: 0;
}
.sv-toast--ok {
  background: #064e3b;
  color: #a7f3d0;
  border: 1px solid #10b981;
}
.sv-toast--err {
  background: #7f1d1d;
  color: #fecaca;
  border: 1px solid #f87171;
}
.sv-toast-close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.75;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  flex-shrink: 0;
}
.sv-toast-close:hover {
  opacity: 1;
}
@keyframes sv-toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
.sv-modal-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0 1.1rem 0.85rem;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  font-size: 0.84rem;
  line-height: 1.4;
}
.sv-modal-body .sv-modal-alert {
  margin: 0.15rem 0 0;
}
.sv-modal-alert i {
  margin-top: 0.15rem;
  flex-shrink: 0;
}
.sv-modal-alert strong {
  display: block;
  margin-bottom: 0.2rem;
}
.sv-modal-alert p {
  margin: 0 0 0.55rem;
  opacity: 0.95;
}
.sv-modal-alert--err {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.45);
  color: #fecaca;
}
.sv-modal-alert--warn {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fde68a;
}
.sv-modal-alert .btn-ghost.sm {
  margin-top: 0.15rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
}
.btn-ghost.sm {
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
}
.sv-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.sv-tabs button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.42rem 0.85rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: none;
  line-height: 1.25;
}
.sv-tabs button i {
  font-size: 0.75rem;
  opacity: 0.85;
}
.sv-tabs button.on {
  background: var(--brand-soft);
  color: var(--brand-ink);
  border-color: var(--brand-line);
}
.sv-pill {
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.68rem;
  display: inline-grid;
  place-items: center;
}
.sv-panel-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.85rem 1rem;
  align-items: flex-start;
  margin-bottom: 0.9rem;
}
.sv-panel-head h2 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--ink);
}
.sv-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.sv-title-count {
  display: inline-grid;
  place-items: center;
  min-width: 1.45rem;
  height: 1.45rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.sv-panel-head p {
  margin: 0.2rem 0 0;
  color: var(--ink-soft);
  font-size: 0.85rem;
  max-width: 40rem;
}
.sv-toolbar,
.sv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  max-width: 100%;
}
.sv-toolbar .btn-primary,
.sv-toolbar .btn-ghost,
.sv-actions .btn-primary,
.sv-actions .btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.sv-create-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.sv-create-group .btn-primary,
.sv-create-group .btn-ghost {
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  min-height: 2.2rem;
}
.sv-search {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: min(220px, 100%);
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink-soft);
}
.sv-search i {
  font-size: 0.75rem;
  opacity: 0.75;
}
.sv-search input {
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.84rem;
  width: 100%;
  min-width: 0;
  padding: 0.1rem 0;
}
.sv-modal-body {
  padding: 1rem 1.15rem;
  display: grid;
  gap: 0.75rem;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.sv-modal-body label {
  display: grid;
  gap: 0.28rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.sv-form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: end;
}
.sv-form-row label {
  flex: 1 1 10rem;
}
.sv-modal-root {
  position: fixed;
  inset: 0;
  z-index: 100060;
  background: color-mix(in srgb, #000 55%, transparent);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.sv-modal {
  width: min(440px, 96vw);
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
}
.sv-modal-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  margin: 0;
}
.sv-modal--wide {
  width: min(960px, 96vw);
  max-height: min(92vh, 860px);
}
.sv-modal--visita {
  width: min(980px, 96vw);
  max-height: min(90vh, 720px);
}
.sv-modal-body--visita {
  display: block;
  padding: 0;
  overflow: hidden;
}
.sv-visita-layout {
  display: grid;
  grid-template-columns: 20% 1fr;
  min-height: min(52vh, 420px);
  height: 100%;
}
.sv-visita-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 0.55rem;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--ink) 3%, var(--panel));
  overflow: auto;
}
.sv-visita-nav-btn {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 9px;
  padding: 0.55rem 0.55rem;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.25;
  cursor: pointer;
}
.sv-visita-nav-btn i {
  margin-top: 0.12rem;
  width: 0.95em;
  text-align: center;
  opacity: 0.85;
  color: var(--brand, var(--ink-soft));
}
.sv-visita-nav-btn:hover {
  background: color-mix(in srgb, var(--brand, #0d9488) 10%, transparent);
  color: var(--ink);
}
.sv-visita-nav-btn.on {
  background: color-mix(in srgb, var(--brand, #0d9488) 16%, transparent);
  color: var(--ink);
  box-shadow: inset 2px 0 0 var(--brand, #0d9488);
}
.sv-visita-panel {
  padding: 1rem 1.1rem;
  overflow: auto;
  min-width: 0;
}
.sv-visita-section-title {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.sv-visita-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem 0.85rem;
}
.sv-visita-fields > .sv-span-2,
.sv-visita-fields > .sv-field-hint {
  grid-column: 1 / -1;
}
.sv-freq-checks {
  display: grid;
  gap: 0.35rem;
}
.sv-freq-checks-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
}
.sv-freq-checks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.sv-freq-check {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
  user-select: none;
}
.sv-freq-check:has(input:checked) {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
}
.sv-freq-check input {
  accent-color: var(--brand);
}
.sv-visita-fields > .sv-field-spacer {
  visibility: hidden;
  pointer-events: none;
}
.sv-visita-assign {
  display: grid;
  gap: 0.75rem;
}
.sv-visita-assign-add {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
@media (max-width: 720px) {
  .sv-visita-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .sv-visita-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .sv-visita-nav-btn {
    flex: 1 1 auto;
  }
  .sv-visita-fields {
    grid-template-columns: 1fr;
  }
  .sv-visita-fields > .sv-field-spacer {
    display: none;
  }
}
.sv-modal-body--grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem 0.85rem;
  align-content: start;
}
.sv-modal-body--grid > .sv-span-2,
.sv-modal-body--grid > .sv-field-hint,
.sv-modal-body--grid > .sv-geo-fields {
  grid-column: 1 / -1;
}
.sv-modal-body--grid > .sv-field-spacer {
  visibility: hidden;
  pointer-events: none;
}
.sv-modal-body--grid > .sv-check {
  align-self: end;
  padding-bottom: 0.35rem;
}
@media (max-width: 640px) {
  .sv-modal-body--grid {
    grid-template-columns: 1fr;
  }
  .sv-modal-body--grid > .sv-field-spacer {
    display: none;
  }
}
.sv-graph-body {
  display: grid;
  gap: 0.75rem;
}
.sv-graph-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.sv-graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.sg-leg {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.18rem 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--line);
}
.sg-leg--cadena {
  border-color: color-mix(in srgb, #0d9488 45%, var(--line));
  color: #0d9488;
}
.sg-leg--subcadena {
  border-color: color-mix(in srgb, #6366f1 40%, var(--line));
  color: #6366f1;
}
.sg-leg--sala {
  border-color: color-mix(in srgb, #ea580c 40%, var(--line));
  color: #ea580c;
}
.sg-leg--cliente {
  border-color: color-mix(in srgb, #0284c7 40%, var(--line));
  color: #0284c7;
}
.sv-graph-scroll {
  overflow: auto;
  padding: 0.5rem 0.25rem 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 2%, var(--panel));
  max-height: min(62vh, 560px);
}
.sv-graph-root {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
}
.sv-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1.15rem;
  border-bottom: 1px solid var(--line);
}
.sv-modal-head h3 {
  margin: 0;
  font-size: 1rem;
}
.sv-modal-close {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  border: 1px solid var(--line-2, var(--line));
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
}
.sv-modal-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
  margin: 0;
  padding: 0.85rem 1.15rem;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--ink) 3%, var(--panel));
}
.sv-modal-foot .btn-primary,
.sv-modal-foot .btn-ghost {
  min-height: 2.35rem;
  min-width: 6.5rem;
  padding: 0.55rem 1.05rem;
}
.sv-modal--confirm {
  max-width: 26rem;
}
.sv-modal--confirm .sv-modal-body {
  flex: none;
}
.sv-modal--confirm .sv-modal-foot {
  padding: 0.85rem 1.15rem;
  margin-top: 0;
}
.sv-colab-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.45rem;
  margin: 0;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand) 28%, var(--line));
  background: var(--brand-soft);
  color: var(--brand-ink, var(--ink));
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
}
.sv-colab-context i {
  opacity: 0.85;
}
.sv-colab-sep {
  opacity: 0.55;
  font-weight: 500;
}
.sv-ver-mas {
  margin-top: 0.35rem;
  width: 100%;
  border: 1px dashed color-mix(in srgb, var(--brand) 40%, var(--line));
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
}
.sv-ver-mas:hover {
  border-style: solid;
  border-color: var(--brand);
}
.sv-field-hint {
  margin: -0.25rem 0 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--ink-soft);
  line-height: 1.35;
}
.sv-modal--asignados {
  width: min(420px, 96vw);
}
.sv-asig-modal-ctx {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
}
.sv-colab-list--modal {
  max-height: min(40vh, 280px);
  overflow: auto;
}
.sv-asig-add {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.35rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
}
.sv-asig-add h4 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.sv-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ink) 6%, var(--panel));
  color: var(--ink-soft);
}
.sv-linkish {
  display: inline;
  margin-left: 0.25rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--brand);
  font: inherit;
  font-size: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.sv-role-row.off {
  opacity: 0.55;
}
.sv-role-row.off strong {
  text-decoration: line-through;
}
.sv-confirm-lead {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
}
.sv-confirm-detail {
  margin: 0.65rem 0 0;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, #f87171 12%, var(--panel));
  border: 1px solid color-mix(in srgb, #f87171 35%, var(--line));
  color: #b91c1c;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
}
.sv-btn-danger,
.sv-modal-root .sv-btn-danger {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
  color: #fff !important;
  box-shadow: 0 4px 14px color-mix(in srgb, #dc2626 35%, transparent) !important;
}
.sv-btn-danger:hover:not(:disabled),
.sv-modal-root .sv-btn-danger:hover:not(:disabled) {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
  filter: none;
}
.sv-input {
  width: 100%;
  border: 1px solid var(--line-2, var(--line));
  background: var(--panel-2, var(--canvas));
  color: var(--ink);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font: inherit;
  font-size: 0.875rem;
}
.sv-input--sm {
  max-width: 12rem;
  padding: 0.4rem 0.6rem;
}
.sv-color {
  display: flex !important;
  align-items: center;
  gap: 0.6rem;
}
.sv-color input[type='color'] {
  width: 2.5rem;
  height: 2rem;
  border: none;
  background: transparent;
  padding: 0;
}
.sv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.sv-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 0.55rem;
}
.sv-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.65rem 0.7rem;
  display: grid;
  gap: 0.4rem;
  box-shadow: var(--sh);
  min-width: 0;
  align-content: start;
}
.sv-card.off {
  opacity: 0.72;
}
.sv-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
}
.sv-icon-btn--maps {
  border-color: color-mix(in srgb, #EA4335 35%, var(--line));
  background: color-mix(in srgb, #EA4335 8%, var(--panel));
}
.sv-icon-btn--maps:hover {
  border-color: #EA4335;
  background: color-mix(in srgb, #EA4335 16%, var(--panel));
}
.sv-icon-btn--maps svg {
  display: block;
}
.sv-geo-fields {
  display: grid;
  gap: 0.55rem;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--line);
}
.sv-geo-hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.35;
}
.sv-geo-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}
.sv-modal--map {
  max-width: min(36rem, 96vw);
}
.sv-map-body {
  display: grid;
  gap: 0.45rem;
  padding-top: 0 !important;
}
.sv-map-frame {
  width: 100%;
  height: min(22rem, 55vh);
  border: 0;
  border-radius: 10px;
  background: var(--line);
}
.sv-map-coords {
  margin: 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.sv-label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.sv-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.2rem 0.5rem;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1.2;
}
.sv-mini-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: color-mix(in srgb, var(--brand, #0d9488) 45%, var(--line));
}
.sv-mini-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sv-mini-btn i {
  font-size: 0.68rem;
}
.sv-cob-detalle-block {
  margin: 0 0 0.85rem;
}
.sv-cob-detalle-block h4 {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.sv-cob-detalle-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--ink);
  white-space: pre-wrap;
}
.sv-cob-check-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.sv-cob-check-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.84rem;
  line-height: 1.35;
  color: var(--ink);
}
.sv-cob-check-list li i {
  margin-top: 0.15rem;
  color: var(--brand, var(--ink-soft));
  opacity: 0.9;
  font-size: 0.75rem;
}
.sv-cob-check-label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  min-width: 0;
}
.sv-ev-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.sv-ev-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 14%, var(--panel));
  color: var(--brand-ink, var(--brand));
  border: 1px solid color-mix(in srgb, var(--brand) 30%, var(--line));
}
.sv-tpl-checklist {
  display: grid;
  gap: 0.45rem;
}
.sv-tpl-checklist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.sv-tpl-checklist-head h4 {
  margin: 0;
  font-size: 0.9rem;
}
.sv-tpl-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.sv-tpl-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.45rem;
  align-items: start;
  padding: 0.55rem 0.6rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-2, var(--panel));
}
.sv-tpl-item-ord {
  width: 1.4rem;
  height: 1.4rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 800;
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
}
.sv-tpl-item-main {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}
.sv-tpl-evidence {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
}
.sv-tpl-ev-opt {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
  user-select: none;
}
.sv-tpl-ev-opt input {
  accent-color: var(--brand);
}
.sv-tpl-ev-summary {
  color: var(--ink-soft);
  font-size: 0.75rem;
}
.sv-card-top h3 {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sv-card-line {
  margin: 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.35;
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}
.sv-card-line i {
  margin-top: 0.15rem;
  flex-shrink: 0;
  width: 0.85rem;
  text-align: center;
  opacity: 0.75;
  font-size: 0.68rem;
}
.sv-card-stats {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3.2rem, 1fr));
  gap: 0.25rem;
  padding-top: 0.2rem;
  border-top: 1px solid var(--line);
}
.sv-card-stats > div {
  text-align: center;
  min-width: 0;
}
.sv-card-stats dt {
  margin: 0;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-faint, var(--ink-soft));
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.sv-card-stats dd {
  margin: 0.05rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
  color: var(--ink);
  line-height: 1.1;
}
.sv-card-preview {
  margin: 0;
  font-size: 0.7rem;
  color: var(--ink-soft);
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sv-row,
.sv-role-row {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  box-shadow: var(--sh);
}
.sv-row strong,
.sv-role-row strong {
  color: var(--ink);
  font-size: 0.9rem;
}
.sv-muted {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.sv-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-ink);
  white-space: nowrap;
  flex-shrink: 0;
}
.sv-badge.warn {
  background: color-mix(in srgb, #fbbf24 18%, var(--panel));
  color: #fbbf24;
}
.sv-badge.ok {
  background: color-mix(in srgb, #34d399 18%, var(--panel));
  color: #34d399;
}
.sv-badge.info {
  background: color-mix(in srgb, #60a5fa 18%, var(--panel));
  color: #60a5fa;
}
.sv-tipo-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 0.85rem;
}
.sv-tipo-filters button {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sv-tipo-filters button.on {
  border-color: var(--brand);
  color: var(--brand-ink, var(--brand));
  background: var(--brand-soft);
}
.sv-tipo-n {
  font-size: 0.68rem;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}
.sv-tipo-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  flex-shrink: 0;
}
.sv-tipo-badge--cobertura {
  background: color-mix(in srgb, #0d9488 18%, var(--panel));
  color: #0d9488;
}
.sv-tipo-badge--visita {
  background: color-mix(in srgb, #7c3aed 18%, var(--panel));
  color: #7c3aed;
}
.sv-tipo-badge--consulta {
  background: color-mix(in srgb, #ea580c 18%, var(--panel));
  color: #ea580c;
}
.sv-asig-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.sv-asig-created {
  margin: -0.15rem 0 0.15rem;
  font-size: 0.62rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ink-faint, var(--ink-soft));
  letter-spacing: 0.01em;
}
.sv-char-count {
  justify-self: end;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-faint, var(--ink-soft));
}
.sv-asig-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  align-items: center;
  margin: 0 0 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
}
.sv-asig-q {
  flex: 1 1 auto;
  min-width: 120px;
  max-width: 100%;
}
.sv-asig-sel {
  flex: 0 0 auto;
  width: auto;
  min-width: 7.5rem;
}
.sv-view-toggle {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  margin-left: auto;
}
.sv-adv-btn {
  position: relative;
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  font-size: 0.9rem;
}
.sv-adv-btn:hover,
.sv-adv-btn.on {
  border-color: var(--brand);
  color: var(--brand-ink, var(--brand));
  background: var(--brand-soft);
}
.sv-adv-n {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  min-width: 1.05rem;
  height: 1.05rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  line-height: 1;
}
.sv-adv-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.65rem 0.75rem;
  align-items: end;
  margin: -0.25rem 0 0.85rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 2.5%, var(--panel));
}
.sv-adv-field {
  display: grid;
  gap: 0.28rem;
  min-width: 0;
}
.sv-adv-field > span {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.sv-adv-field > span i {
  font-size: 0.65rem;
  color: var(--brand, var(--ink-soft));
}
.sv-adv-actions {
  display: flex;
  align-items: end;
  justify-content: flex-start;
}
.sv-view-btn {
  border: 0;
  background: var(--panel);
  color: var(--ink-soft);
  padding: 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sv-view-btn.on {
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
}
.sv-asig-meta {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.sv-asig-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: var(--sh);
}
.sv-asig-table {
  width: 100%;
  min-width: 1100px;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.sv-asig-table th,
.sv-asig-table td {
  padding: 0.7rem 0.75rem;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.sv-asig-table th {
  background: color-mix(in srgb, var(--ink) 4%, var(--panel));
  color: var(--ink-soft);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.sv-asig-table tbody tr.off {
  opacity: 0.65;
}
.sv-asig-table tbody tr:hover {
  background: color-mix(in srgb, var(--brand) 5%, transparent);
}
.sv-asig-actions-h {
  text-align: right !important;
}
.sv-td-title {
  min-width: 11rem;
  max-width: 16rem;
}
.sv-asig-title-cell {
  display: block;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.25;
}
.sv-asig-desc-cell {
  margin: 0.28rem 0 0;
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sv-td-punto {
  min-width: 10rem;
  max-width: 14rem;
}
.sv-punto-lines {
  display: grid;
  gap: 0.18rem;
}
.sv-punto-line {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  line-height: 1.25;
  color: var(--ink);
  min-width: 0;
}
.sv-punto-line i {
  width: 0.85em;
  text-align: center;
  font-size: 0.68rem;
  color: var(--brand, var(--ink-soft));
  opacity: 0.9;
  flex-shrink: 0;
}
.sv-td-detalle {
  min-width: 9rem;
  max-width: 13rem;
}
.sv-detalle-stack {
  display: grid;
  gap: 0.2rem;
  font-size: 0.78rem;
  line-height: 1.3;
}
.sv-detalle-stack > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sv-detalle-stack i {
  font-size: 0.68rem;
  color: var(--brand, var(--ink-soft));
  width: 0.85em;
  text-align: center;
}
.sv-detalle-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.2rem 0.45rem;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--brand, #0d9488) 8%, var(--panel));
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sv-detalle-chip i {
  font-size: 0.68rem;
  color: var(--brand, var(--ink-soft));
}
.sv-tpl-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand-ink, var(--brand));
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}
.sv-tpl-link span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sv-tpl-link i {
  flex-shrink: 0;
  opacity: 0.9;
}
.sv-tpl-link:hover {
  text-decoration: underline;
}
.sv-tpl-link--table {
  font-size: 0.76rem;
  width: fit-content;
}
.sv-td-equipo {
  min-width: 9rem;
  max-width: 13rem;
}
.sv-equipo-mini {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.22rem;
}
.sv-equipo-mini li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.74rem;
  line-height: 1.25;
  min-width: 0;
}
.sv-equipo-mini li > span:first-of-type {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sv-equipo-mini i {
  font-size: 0.65rem;
  color: var(--brand, var(--ink-soft));
  flex-shrink: 0;
}
.sv-ver-mas--table {
  margin-top: 0.25rem;
  font-size: 0.68rem;
}
.sv-td-agenda,
.sv-td-created {
  white-space: nowrap;
  font-size: 0.74rem;
  color: var(--ink-soft);
}
.sv-th-sort {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  font-weight: 700;
}
.sv-asig-sub {
  display: block;
  margin-top: 0.15rem;
  color: var(--ink-soft);
  font-size: 0.75rem;
}
.sv-asig-actions {
  white-space: nowrap;
}
.sv-icon-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.15rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
}
.sv-icon-actions--inline {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
  justify-content: flex-end;
}
.sv-icon-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.82rem;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.sv-icon-btn:hover {
  color: var(--brand-ink, var(--brand));
  border-color: var(--brand);
  background: var(--brand-soft);
}
.sv-icon-btn.on {
  color: #60a5fa;
  border-color: color-mix(in srgb, #60a5fa 45%, var(--line));
  background: color-mix(in srgb, #60a5fa 14%, var(--panel));
}
.sv-icon-btn.ok {
  color: #34d399;
  border-color: color-mix(in srgb, #34d399 45%, var(--line));
  background: color-mix(in srgb, #34d399 14%, var(--panel));
}
.sv-icon-btn.warn {
  color: #0d9488;
  border-color: color-mix(in srgb, #0d9488 45%, var(--line));
  background: color-mix(in srgb, #0d9488 12%, var(--panel));
}
.sv-icon-btn.danger {
  color: #f87171;
  border-color: color-mix(in srgb, #f87171 40%, var(--line));
}
.sv-icon-btn.danger:hover {
  background: color-mix(in srgb, #f87171 14%, var(--panel));
  color: #f87171;
  border-color: #f87171;
}
.sv-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.9rem;
}
.sv-pager-btn {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
  cursor: pointer;
  color: var(--ink);
}
.sv-pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sv-pager-info {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.sv-empty {
  list-style: none;
  padding: 1.25rem;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.875rem;
  background: var(--panel);
  border: 1px dashed var(--line);
  border-radius: 12px;
}
.sv-empty--block {
  grid-column: 1 / -1;
}
.sv-rel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  align-items: stretch;
}
@media (max-width: 1100px) {
  .sv-rel-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .sv-rel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .sv-rel-grid {
    grid-template-columns: 1fr;
  }
}
.sv-rel-card {
  position: relative;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.75rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  box-shadow: var(--sh);
  min-width: 0;
  height: 100%;
}
.sv-rel-card--sin-asig {
  border-color: rgba(220, 38, 38, 0.45);
}
.sv-rel-card--sin-asig > .sv-card-top {
  padding-right: 2.2rem;
}
.sv-sin-asig-ribbon {
  position: absolute;
  top: 0.85rem;
  right: -1.55rem;
  z-index: 2;
  width: 6.4rem;
  padding: 0.14rem 0;
  background: #dc2626;
  color: #fff;
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-transform: none;
  text-align: center;
  line-height: 1.15;
  white-space: nowrap;
  transform: rotate(32deg);
  box-shadow: 0 2px 6px rgba(127, 29, 29, 0.35);
  pointer-events: none;
  user-select: none;
}
.sv-rel-card > .sv-icon-actions {
  margin-top: auto;
  flex-shrink: 0;
}
.sv-rel-card.off {
  opacity: 0.72;
}
.sv-rel-kicker {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-ink, var(--ink-soft));
}
.sv-rel-field,
.sv-rel-team {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}
.sv-rel-meta {
  display: grid;
  grid-template-rows: repeat(4, 1.35rem);
  gap: 0.12rem;
  min-width: 0;
  flex-shrink: 0;
}
.sv-rel-meta .sv-rel-field {
  min-height: 1.35rem;
  overflow: hidden;
}
.sv-rel-field--empty strong i {
  opacity: 0.4;
}
.sv-rel-field--empty strong span {
  display: none;
}
.sv-rel-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint, var(--ink-soft));
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}
.sv-rel-label i,
.sv-card-stats dt i {
  font-size: 0.62rem;
  width: 0.85em;
  text-align: center;
  opacity: 0.85;
  color: var(--brand, var(--ink-soft));
}
.sv-rel-field strong {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sv-rel-field strong i,
.sv-card-stats dd i,
.sv-colab-list li i {
  font-size: 0.72rem;
  width: 0.95em;
  text-align: center;
  flex-shrink: 0;
  color: var(--brand, var(--ink-soft));
  opacity: 0.9;
}
.sv-card-stats dd {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sv-rel-field small {
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.3;
}
.sv-dd-date {
  font-size: 0.72rem !important;
  font-weight: 600 !important;
}
.sv-check {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.sv .btn-ghost.danger {
  color: #f87171 !important;
  border-color: color-mix(in srgb, #f87171 45%, var(--line)) !important;
}
.sv-colab-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
}
.sv-colab-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.7rem;
  line-height: 1.2;
  color: var(--ink);
  padding: 0.22rem 0.28rem 0.22rem 0.4rem;
  border-radius: 8px;
  background: var(--panel-2, var(--canvas));
  min-width: 0;
}
.sv-colab-who {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.3rem;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  white-space: nowrap;
}
.sv-colab-who > i {
  flex-shrink: 0;
  font-size: 0.62rem;
}
.sv-colab-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sv-colab-x {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 0.65rem;
}
.sv-colab-x:hover {
  background: color-mix(in srgb, #f87171 18%, transparent);
  color: #f87171;
}
.sv-rel-field--person {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}
.sv-rel-field--person strong {
  min-width: 0;
}
.sv-role {
  flex-shrink: 0;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--brand-ink);
}
.sv-tax-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.sv-tax-block {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.8rem;
  box-shadow: var(--sh);
}
.sv-tax-block h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--ink);
  display: flex;
  justify-content: space-between;
}
.sv-tax-block h4 span {
  color: var(--ink-faint, var(--ink-soft));
  font-weight: 600;
}
.sv-tax-block ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.sv-tax-block li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sv-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.sv-role-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.sv-role-row .sv-input {
  max-width: 14rem;
}
.sv-role-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
}
.sv-role-tabs button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.sv-role-tabs button.on {
  background: var(--brand-soft);
  color: var(--brand-ink);
  border-color: var(--brand-line);
}
.sv-table-wrap {
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
}
.sv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.sv-table th,
.sv-table td {
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-align: left;
}
.sv-table th {
  position: sticky;
  top: 0;
  background: var(--panel-2, var(--panel));
  color: var(--ink-soft);
  font-weight: 700;
  white-space: nowrap;
}
.sv-table td.center {
  text-align: center;
}
.sv-table tbody tr:hover {
  background: color-mix(in srgb, var(--brand-soft) 35%, transparent);
}
</style>
