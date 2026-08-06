<template>
  <div class="rv">
    <header class="rv-head">
      <div>
        <h1>Reservas</h1>
      </div>
      <div class="rv-actions">
        <button
          type="button"
          class="btn-icon"
          :disabled="busy"
          title="Cargar demo"
          aria-label="Cargar demo"
          @click="seedConfirmOpen = true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m8 11 4 4 4-4" />
            <path d="M5 19h14" />
          </svg>
        </button>
        <button type="button" class="btn-ghost" :disabled="!aiConfigured" @click="openAiNew">
          Nuevo activo con IA
        </button>
        <button type="button" class="btn-primary" @click="openResourceWizard()">+ Nuevo activo</button>
      </div>
    </header>
    <p v-if="!aiConfigured" class="hint">
      Para generar con IA configurá OPENAI_API_KEY o ANTHROPIC_API_KEY en el backend.
    </p>

    <nav class="rv-tabs" aria-label="Secciones de reservas">
      <button type="button" :class="{ on: tab === 'resources' }" @click="tab = 'resources'">
        Activos disponibles para reserva
        <em>{{ tabCounts.resources }}</em>
      </button>
      <button type="button" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">
        Gestión de Reservas <em>{{ tabCounts.pending }}</em>
      </button>

      <button
        type="button"
        class="rv-cfg-btn"
        :class="{ on: configOpen || isConfigTab }"
        :aria-expanded="configOpen"
        aria-controls="rv-config-tabs"
        title="Configuración"
        @click="toggleConfig"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          />
        </svg>
        <span class="rv-cfg-btn__label">Configuración</span>
      </button>
    </nav>

    <nav
      v-if="configOpen"
      id="rv-config-tabs"
      class="rv-tabs rv-tabs--config"
      aria-label="Configuración de reservas"
    >
      <button type="button" :class="{ on: tab === 'sites' }" @click="tab = 'sites'">
        Sucursales <em>{{ tabCounts.sites }}</em>
      </button>
      <button type="button" :class="{ on: tab === 'types' }" @click="tab = 'types'">
        Tipos de activos <em>{{ tabCounts.types }}</em>
      </button>
      <button type="button" :class="{ on: tab === 'attrs' }" @click="tab = 'attrs'">
        Atributos <em>{{ tabCounts.attrs }}</em>
      </button>
      <button type="button" :class="{ on: tab === 'policy' }" @click="tab = 'policy'">Políticas</button>
    </nav>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <div v-if="seedConfirmOpen" class="modal" @click.self="seedConfirmOpen = false">
      <div class="modal-card form">
        <h2>Cargar datos demo</h2>
        <p class="hint">
          Va a crear o actualizar sucursales, tipos de activos, atributos y activos de ejemplo para
          esta comunidad. Sirve para probar el módulo rápido.
        </p>
        <p class="hint">
          No borra reservas existentes; puede sumar o refrescar el catálogo demo. ¿Continuamos?
        </p>
        <div class="row">
          <button type="button" class="btn-ghost" :disabled="busy" @click="seedConfirmOpen = false">
            Cancelar
          </button>
          <button type="button" class="btn-primary" :disabled="busy" @click="confirmSeedDefaults">
            {{ busy ? 'Cargando…' : 'Sí, cargar demo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmar deshabilitar activo -->
    <div
      v-if="disableConfirm"
      class="modal modal-stack"
      @click.self="!togglingId && (disableConfirm = null)"
    >
      <div class="modal-card form wide">
        <h2>Deshabilitar «{{ disableConfirm.nombre }}»</h2>
        <p class="hint">
          El activo dejará de aparecer en el catálogo y no se podrán crear reservas nuevas.
        </p>
        <p v-if="disableConfirm.loadingCount" class="hint">Buscando reservas activas…</p>
        <p v-else-if="disableConfirm.activeCount > 0" class="hint">
          Hay <strong>{{ disableConfirm.activeCount }}</strong> reserva(s) activa(s) o pendiente(s)
          sobre este activo.
        </p>
        <p v-else class="hint">No hay reservas activas pendientes sobre este activo.</p>

        <fieldset class="disable-options">
          <legend>¿Qué hacemos con las reservas existentes?</legend>
          <label class="check check-block">
            <input v-model="disableConfirm.mode" type="radio" value="keep" />
            <span>
              <span class="check-title">Solo inhabilitar hacia adelante</span>
              <span class="check-hint"
                >Las reservas ya hechas siguen vigentes. El miembro puede usarlas o cancelarlas.</span
              >
            </span>
          </label>
          <label class="check check-block">
            <input v-model="disableConfirm.mode" type="radio" value="cancel" />
            <span>
              <span class="check-title">Cancelar reservas existentes</span>
              <span class="check-hint"
                >Se cancelan las reservas activas/pendientes de este activo y luego se
                deshabilita.</span
              >
            </span>
          </label>
        </fieldset>

        <div class="row">
          <button
            type="button"
            class="btn-ghost"
            :disabled="!!togglingId"
            @click="disableConfirm = null"
          >
            Volver
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!!togglingId || disableConfirm.loadingCount"
            @click="confirmDisableResource"
          >
            {{ togglingId ? 'Aplicando…' : 'Confirmar deshabilitación' }}
          </button>
        </div>
      </div>
    </div>

    <!-- IA: nuevo activo -->
    <div v-if="aiPromptOpen" class="modal" @click.self="aiPromptOpen = false">
      <form class="modal-card form wide" @submit.prevent="runAiDraft">
        <h2>Nuevo activo con IA</h2>
        <p class="hint">
          Describí el activo (lo que se reserva), incluí si es unitario, unidades numeradas, cupo compartido o aforo.
          La IA puede proponer también sucursal, tipo, atributos, ocupación y límites de política.
        </p>
        <div class="ai-examples" role="group" aria-label="Ejemplos por ocupación">
          <button
            v-for="ex in aiOccupancyExamples"
            :key="ex.id"
            type="button"
            class="quick-chip"
            :disabled="aiLoading"
            :title="ex.prompt"
            @click="aiPrompt = ex.prompt"
          >
            {{ ex.label }}
          </button>
        </div>
        <label
          >Brief
          <textarea
            v-model="aiPrompt"
            rows="6"
            required
            :disabled="aiLoading"
          />
        </label>
        <p class="hint">Editá el ejemplo o reescribilo; el texto queda para no perder el contexto.</p>
        <div class="row">
          <button type="button" class="btn-ghost" :disabled="aiLoading" @click="aiPromptOpen = false">
            Cancelar
          </button>
          <button type="submit" class="btn-primary" :disabled="aiLoading || !aiPrompt.trim()">
            {{ aiLoading ? 'Armando activo…' : 'Generar borrador' }}
          </button>
        </div>
        <p v-if="aiError" class="err">{{ aiError }}</p>
      </form>
    </div>

    <section v-if="tab === 'pending'" class="panel">
      <details class="report-collapse">
        <summary>Resumen</summary>
        <div class="report-collapse__body">
          <div class="stats">
            <div><strong>{{ report.activeNow || 0 }}</strong><span>Activas ahora</span></div>
            <div><strong>{{ report.pending || 0 }}</strong><span>Pendientes</span></div>
            <div><strong>{{ report.officeToday || 0 }}</strong><span>En oficina hoy</span></div>
            <div><strong>{{ report.noShows || 0 }}</strong><span>No-shows (30d)</span></div>
          </div>
          <h3 class="sub">Reservas por tipo</h3>
          <ul class="plain">
            <li v-for="(n, k) in report.byKind || {}" :key="k">{{ labelKind(k) }}: {{ n }}</li>
            <li v-if="!Object.keys(report.byKind || {}).length" class="muted">Sin datos aún.</li>
          </ul>
        </div>
      </details>

      <p class="hint">Reservas pendientes de aprobación.</p>
      <ul class="list">
        <li v-for="r in pending" :key="r.id" class="card">
          <div>
            <strong>{{ r.resourceNombre }}</strong>
            <p class="muted">{{ r.userName }} · {{ r.kindLabel }} · {{ fmt(r.startAt) }}</p>
          </div>
          <div class="row">
            <button type="button" class="btn-primary" @click="approve(r)">Aprobar</button>
            <button type="button" class="btn-ghost" @click="reject(r)">Rechazar</button>
          </div>
        </li>
        <li v-if="!pending.length" class="empty">No hay pendientes. Todo al día.</li>
      </ul>
    </section>

    <section v-if="tab === 'sites'" class="panel">
      <div class="panel-bar">
        <p class="hint">Sucursales donde viven los activos. También se pueden crear al dar de alta un activo.</p>
        <button type="button" class="btn-primary" @click="openSite()">+ Nueva sucursal</button>
      </div>
      <ul class="list">
        <li v-for="s in sites" :key="s.id" class="card">
          <div>
            <strong>{{ s.nombre }}</strong>
            <p class="muted">
              {{ s.codigo || 'sin código' }} · aforo {{ s.aforoMax ?? '—' }} ·
              {{ s.activo ? 'activa' : 'inactiva' }}
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="openSite(s)">Editar</button>
        </li>
        <li v-if="!sites.length" class="empty">Todavía no hay sucursales. Creá la primera.</li>
      </ul>
    </section>

    <section v-if="tab === 'types'" class="panel">
      <div class="panel-bar">
        <p class="hint">
          Tipos de activos configurables: sala, cochera, proyector, herramienta… El motor define cómo se
          reserva.
        </p>
        <button type="button" class="btn-primary" @click="openType()">+ Nuevo tipo de activo</button>
      </div>
      <ul class="list">
        <li v-for="t in types" :key="t.id" class="card">
          <div class="type-row">
            <span class="type-icon" :title="t.icon || 'box'">
              <SpaceTypeIcon :name="t.icon || 'box'" :size="22" />
            </span>
            <div>
              <strong>{{ t.label }}</strong>
              <p class="muted">
                {{ t.codigo }} · motor {{ labelKind(t.engineKind) }}
                <span v-if="t.system"> · sistema</span>
                <span v-if="!t.activo"> · off</span>
              </p>
            </div>
          </div>
          <button type="button" class="btn-ghost" @click="openType(t)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'attrs'" class="panel">
      <div class="panel-bar">
        <p class="hint">Atributos filtrables (HDMI, WiFi, potencia…). Se asignan a cada activo.</p>
        <button type="button" class="btn-primary" @click="openAttr()">+ Atributo</button>
      </div>
      <ul class="list">
        <li v-for="a in attributes" :key="a.id" class="card">
          <div>
            <strong>{{ a.label }}</strong>
            <p class="muted">{{ a.key }} · {{ a.valueType }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="openAttr(a)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'resources'" class="panel">
      <details class="filters-collapse">
        <summary>
          Filtros
          <em v-if="filtersActiveSummary" class="filters-collapse__badge">{{ filtersActiveSummary }}</em>
        </summary>
        <div class="filters-collapse__body">
          <div class="filters-combos">
            <select v-model="filterTypeId" aria-label="Filtrar por tipo de activo">
              <option value="">Todos los tipos</option>
              <option v-for="t in typesForFilter" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
            <select v-model="filterSiteId" aria-label="Filtrar por sucursal">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sites" :key="s.id" :value="String(s.id)">{{ s.nombre }}</option>
            </select>
            <select v-model="filterActivo" aria-label="Filtrar por estado">
              <option value="1">Habilitados</option>
              <option value="0">Deshabilitados</option>
              <option value="">Todos los estados</option>
            </select>
            <select v-model="filterOccupancy" aria-label="Filtrar por ocupación">
              <option value="">Todas las ocupaciones</option>
              <option v-for="o in occupancyOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </div>
          <div class="filters-quick" role="group" aria-label="Filtros rápidos por tipo">
            <button
              type="button"
              class="quick-chip"
              :class="{ on: !filterTypeId }"
              @click="filterTypeId = ''"
            >
              Todos
            </button>
            <button
              v-for="t in typesForFilter"
              :key="'q-' + t.id"
              type="button"
              class="quick-chip"
              :class="{ on: String(filterTypeId) === String(t.id) }"
              :title="t.label"
              @click="filterTypeId = String(filterTypeId) === String(t.id) ? '' : t.id"
            >
              <SpaceTypeIcon :name="t.icon || defaultIconForEngine(t.engineKind)" :size="14" />
              <span>{{ t.label }}</span>
              <em v-if="typeCounts[t.id]" class="quick-chip__n">{{ typeCounts[t.id] }}</em>
            </button>
          </div>
          <div class="filters-quick" role="group" aria-label="Filtros por clase de ocupación">
            <button
              type="button"
              class="quick-chip"
              :class="{ on: !filterOccupancy }"
              @click="filterOccupancy = ''"
            >
              Toda ocupación
            </button>
            <button
              v-for="o in occupancyOptions"
              :key="'occ-' + o.id"
              type="button"
              class="quick-chip"
              :class="{ on: filterOccupancy === o.id }"
              @click="filterOccupancy = filterOccupancy === o.id ? '' : o.id"
            >
              {{ o.label }}
            </button>
          </div>
        </div>
      </details>
      <ul class="asset-grid">
        <li v-for="r in filteredResources" :key="r.id" class="asset-tile" :class="{ off: !r.activo }">
          <div class="asset-tile__media" :class="{ empty: !r.imageUrl }">
            <img
              v-if="r.imageUrl"
              :src="mediaUrl(r.imageUrl)"
              alt=""
              @error="onAssetThumbError"
            />
            <div v-else class="asset-tile__ph" aria-hidden="true">
              <SpaceTypeIcon :name="typeIconFor(r)" :size="36" />
            </div>
            <span class="asset-tile__type" :title="r.typeLabel || r.kindLabel || 'Tipo'">
              <SpaceTypeIcon :name="typeIconFor(r)" :size="16" />
            </span>
            <span class="asset-tile__status" :class="r.activo ? 'on' : 'off'">
              {{ r.activo ? 'Habilitado' : 'Deshabilitado' }}
            </span>
          </div>

          <div class="asset-tile__body">
            <div class="asset-tile__head">
              <strong class="asset-tile__name">{{ r.nombre }}</strong>
              <code v-if="r.codigo" class="asset-tile__code">{{ r.codigo }}</code>
            </div>
            <p class="asset-tile__type-label">{{ r.typeLabel || r.kindLabel || labelKind(r.kind) }}</p>
            <p v-if="r.descripcion" class="asset-tile__desc">{{ r.descripcion }}</p>

            <div class="asset-tile__meta">
              <span v-if="r.siteNombre" class="meta-chip" title="Sucursal">{{ r.siteNombre }}</span>
              <span v-if="r.floor" class="meta-chip" title="Piso">Piso {{ r.floor }}</span>
              <span v-if="r.zone" class="meta-chip" title="Zona">{{ r.zone }}</span>
              <span v-if="r.occupancyShort" class="meta-chip" :title="r.occupancyLabel || 'Ocupación'">
                {{ r.occupancyShort }}
              </span>
              <span v-else-if="r.capacity" class="meta-chip" title="Capacidad">{{ r.capacity }} pers.</span>
              <span v-else-if="r.effectiveCupo > 1" class="meta-chip" title="Cupo">Cupo {{ r.effectiveCupo }}</span>
              <span v-if="r.horario?.open && r.horario?.close" class="meta-chip" title="Horario">
                {{ r.horario.open }}–{{ r.horario.close }}
              </span>
            </div>

            <div v-if="assetFlags(r).length" class="asset-tile__flags">
              <span v-for="f in assetFlags(r)" :key="f" class="flag-chip">{{ f }}</span>
            </div>

            <div v-if="r.attributes?.length" class="attr-icons" aria-label="Atributos">
              <span
                v-for="a in r.attributes"
                :key="a.key"
                class="attr-ico"
                :class="{ texty: attrIconMeta(a.key).compact }"
                :title="attrTooltip(a)"
              >
                {{ attrIconMeta(a.key).glyph }}
              </span>
            </div>
            <p v-else class="muted attr-empty">Sin atributos configurados</p>
          </div>

          <div class="asset-tile__foot">
            <button
              type="button"
              class="btn-icon asset-tile__action"
              :class="{ warn: r.activo, okish: !r.activo }"
              :disabled="togglingId === r.id"
              :title="r.activo ? 'Deshabilitar activo' : 'Habilitar activo'"
              :aria-label="r.activo ? 'Deshabilitar activo' : 'Habilitar activo'"
              @click="toggleResourceActivo(r)"
            >
              <svg
                v-if="r.activo"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m5 5 14 14" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <path d="M12 2v10" />
                <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
              </svg>
            </button>
            <button
              type="button"
              class="btn-icon asset-tile__action"
              title="Editar activo"
              aria-label="Editar activo"
              @click="openResourceWizard(r)"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </div>
        </li>
        <li v-if="!filteredResources.length" class="empty asset-grid__empty">
          Sin activos con esos filtros. Probá otro tipo, sucursal o estado.
        </li>
      </ul>
    </section>

    <section v-if="tab === 'policy'" class="panel form">
      <p class="hint">
        Límites de aforo y cancelación para toda la comunidad. La habilitación de salas, cocheras y
        demás se define en Tipos de activos y Activos (habilitado / visible en catálogo / pedir dato al reservar).
      </p>
      <label
        >Máx. cocheras simultáneas
        <input v-model.number="policy.maxSimultaneousParking" type="number" min="1" />
      </label>
      <label
        >Máx. puestos simultáneos
        <input v-model.number="policy.maxSimultaneousDesk" type="number" min="1" />
      </label>
      <label
        >Máx. días oficina / semana
        <input v-model.number="policy.maxOfficeDaysPerWeek" type="number" min="0" />
      </label>
      <label
        >Cancelar con anticipación (min)
        <input v-model.number="policy.cancelMinutesBefore" type="number" min="0" />
      </label>
      <label
        >Gracia de check-in tras el inicio (min)
        <input v-model.number="policy.checkInGraceMinutes" type="number" min="0" />
      </label>
      <p class="hint">
        El check-in en la app de usuario se habilita 10 minutos antes del inicio y permanece abierto
        hasta esa gracia (si es 0, hasta el fin de la reserva).
      </p>
      <button type="button" class="btn-primary" @click="savePolicy">Guardar políticas</button>
    </section>

    <!-- Modal sucursal -->
    <div v-if="siteForm" class="modal modal-stack" @click.self="siteForm = null">
      <form class="modal-card form" @submit.prevent="saveSite">
        <h2>{{ siteForm.id ? 'Editar sucursal' : 'Nueva sucursal' }}</h2>
        <label>Nombre <input v-model="siteForm.nombre" required /></label>
        <label>Código <input v-model="siteForm.codigo" /></label>
        <label>Dirección <input v-model="siteForm.direccion" /></label>
        <label>Aforo máx. <input v-model.number="siteForm.aforoMax" type="number" /></label>
        <label class="check check-block">
          <input v-model="siteForm.whoIsHereEnabled" type="checkbox" />
          <span>
            <span class="check-title">Mostrar nombres en «Quién está hoy»</span>
            <span class="check-hint"
              >Si está activo, los miembros ven quién hizo check-in en esta sucursal. Si no, solo
              ven el total de personas, sin nombres.</span
            >
          </span>
        </label>
        <label class="check"><input v-model="siteForm.activo" type="checkbox" /> Sucursal activa</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="siteForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Modal tipo de activo -->
    <div v-if="typeForm" class="modal modal-stack" @click.self="typeForm = null">
      <form class="modal-card form" @submit.prevent="saveType">
        <h2>{{ typeForm.id ? 'Editar tipo de activo' : 'Nuevo tipo de activo' }}</h2>
        <label
          >Nombre
          <input v-model="typeForm.label" required placeholder="Ej. Proyector" />
        </label>
        <label v-if="!typeForm.id"
          >Código
          <input v-model="typeForm.codigo" required placeholder="proyector" />
        </label>
        <div class="icon-field">
          <span class="icon-field__label">Icono</span>
          <div class="icon-picker" role="listbox" aria-label="Icono del tipo de activo">
            <button
              v-for="ic in spaceTypeIcons"
              :key="ic.id"
              type="button"
              role="option"
              class="icon-pick"
              :class="{ on: typeForm.icon === ic.id }"
              :title="ic.label"
              :aria-selected="typeForm.icon === ic.id"
              @click="typeForm.icon = ic.id"
            >
              <SpaceTypeIcon :name="ic.id" :size="20" />
            </button>
          </div>
        </div>
        <label
          >Motor de reserva
          <select v-model="typeForm.engineKind" :disabled="typeForm.system" required @change="onTypeEngineChange">
            <option value="sala">Sala / espacio</option>
            <option value="cochera">Cochera</option>
            <option value="puesto">Puesto</option>
            <option value="zona_cupo">Zona con cupo</option>
            <option value="activo">Activo prestable (1 unidad)</option>
            <option value="hora_libre">Hora libre</option>
            <option value="grupo">Espacio grupal</option>
            <option value="otro">Otro espacio</option>
          </select>
        </label>
        <label
          >Atributos disponibles
          <select v-model="typeForm.attributeKeys" multiple size="5">
            <option v-for="a in attributes" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>
        </label>
        <label class="check"
          ><input v-model="typeForm.showInUserCatalog" type="checkbox" /> Visible en catálogo
          usuario</label
        >
        <label class="check"
          ><input v-model="typeForm.exigePatenteDefault" type="checkbox" /> Al reservar, pedir un dato
          (p. ej. patente)</label
        >
        <p class="hint" style="margin-top: -0.35rem">
          Hoy ese dato es la patente del vehículo (cocheras). El tipo lo propone por defecto a los activos
          nuevos.
        </p>
        <label class="check"
          ><input v-model="typeForm.requiresApprovalDefault" type="checkbox" /> Requiere aprobación por
          defecto</label
        >
        <label class="check"><input v-model="typeForm.activo" type="checkbox" /> Activo</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="typeForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Modal atributo -->
    <div v-if="attrForm" class="modal modal-stack" @click.self="attrForm = null">
      <form class="modal-card form" @submit.prevent="saveAttr">
        <h2>{{ attrForm.id ? 'Editar atributo' : 'Nuevo atributo' }}</h2>
        <label>Nombre <input v-model="attrForm.label" required /></label>
        <label v-if="!attrForm.id">Clave <input v-model="attrForm.key" required /></label>
        <label
          >Tipo de valor
          <select v-model="attrForm.valueType">
            <option value="flag">Sí/No (flag)</option>
            <option value="text">Texto</option>
            <option value="enum">Lista</option>
          </select>
        </label>
        <label class="check"><input v-model="attrForm.activo" type="checkbox" /> Activo</label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="attrForm = null">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Editor activo (modal ancho: nav fija + panel) -->
    <div
      v-if="resourceWizard"
      class="modal asset-modal"
      @click.self="closeResourceWizardIfIdle"
    >
      <form class="asset-editor form" @submit.prevent="saveResource">
        <header class="asset-editor__head">
          <div>
            <h2>{{ resourceWizard.id ? 'Editar activo' : 'Nuevo activo' }}</h2>
            <p v-if="composeMeta.notas" class="hint">{{ composeMeta.notas }}</p>
          </div>
          <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closeResourceWizardIfIdle">
            ×
          </button>
        </header>

        <div class="asset-editor__body">
          <aside class="asset-nav" aria-label="Apartados del activo">
            <button
              v-for="s in assetSections"
              :key="s.id"
              type="button"
              class="asset-nav__item"
              :class="{ on: wizSection === s.id, ok: sectionStatus[s.id] === 'ok', miss: sectionStatus[s.id] === 'miss' }"
              @click="wizSection = s.id"
            >
              <span class="asset-nav__label">{{ s.label }}</span>
              <em v-if="sectionStatus[s.id] === 'ok'" class="asset-nav__mark" aria-hidden="true">✓</em>
              <em v-else-if="sectionStatus[s.id] === 'miss'" class="asset-nav__mark miss" aria-hidden="true">!</em>
            </button>
          </aside>

          <div class="asset-panel">
            <template v-if="wizSection === 'datos'">
              <h3 class="asset-panel__title">Datos del activo</h3>
              <label>Nombre <input v-model="resourceWizard.nombre" required placeholder="Ej. Sala Norte A" /></label>
              <label>Código <input v-model="resourceWizard.codigo" placeholder="sala_norte_a" /></label>
              <label
                >Descripción
                <textarea v-model="resourceWizard.descripcion" rows="2" />
              </label>
              <div class="photo-field">
                <span class="icon-field__label">Foto del activo</span>
                <label
                  class="photo-drop"
                  :class="{
                    has: !!resourceWizard.imageUrl,
                    busy: uploadingPhoto,
                  }"
                >
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    :disabled="uploadingPhoto"
                    @change="onResourcePhotoFile"
                  />
                  <template v-if="uploadingPhoto">
                    <span class="photo-drop__busy">Subiendo imagen…</span>
                  </template>
                  <template v-else-if="resourceWizard.imageUrl">
                    <img
                      class="photo-drop__img"
                      :src="mediaUrl(resourceWizard.imageUrl)"
                      alt="Vista previa de la foto"
                    />
                    <span class="photo-drop__overlay">
                      <strong>Cambiar foto</strong>
                      <em>Tocá para elegir otra imagen</em>
                    </span>
                  </template>
                  <template v-else>
                    <span class="photo-drop__ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="8.5" cy="10" r="1.5" />
                        <path d="m21 15-4.5-4.5L9 18" />
                      </svg>
                    </span>
                    <strong class="photo-drop__title">Elegir foto</strong>
                    <span class="photo-drop__hint"
                      >Tocá acá para buscar una imagen en tu dispositivo (JPG, PNG, WebP)</span
                    >
                  </template>
                </label>
                <div v-if="resourceWizard.imageUrl && !uploadingPhoto" class="photo-actions">
                  <button type="button" class="btn-ghost" @click="resourceWizard.imageUrl = ''">
                    Quitar foto
                  </button>
                </div>
                <details class="photo-url">
                  <summary>O pegar una URL de imagen</summary>
                  <input
                    v-model="resourceWizard.imageUrl"
                    type="url"
                    placeholder="https://…"
                    :disabled="uploadingPhoto"
                  />
                </details>
                <p class="hint">Se muestra en el catálogo de la app y en las cards de admin.</p>
              </div>
              <div class="q-row">
                <label>Piso <input v-model="resourceWizard.floor" /></label>
                <label>Zona <input v-model="resourceWizard.zone" /></label>
              </div>
            </template>

            <template v-else-if="wizSection === 'sucursal'">
              <h3 class="asset-panel__title">Sucursal</h3>
              <section class="compose-block">
                <p class="hint" style="margin-top: 0">Elegí la sucursal tocando una tarjeta.</p>
                <div class="site-pick" role="listbox" aria-label="Sucursales">
                  <button
                    v-for="s in sites"
                    :key="s.id"
                    type="button"
                    role="option"
                    class="site-pick__btn"
                    :class="{ on: String(resourceWizard.siteId) === String(s.id) }"
                    :aria-selected="String(resourceWizard.siteId) === String(s.id)"
                    :title="s.nombre"
                    @click="pickWizardSite(s)"
                  >
                    <span class="site-pick__ico" aria-hidden="true">⌂</span>
                    <span class="site-pick__label">{{ s.nombre }}</span>
                    <span v-if="s.codigo" class="site-pick__code">{{ s.codigo }}</span>
                    <span v-if="s.direccion" class="site-pick__addr">{{ s.direccion }}</span>
                    <em
                      v-if="String(resourceWizard.siteId) === String(s.id)"
                      class="site-pick__check"
                      aria-hidden="true"
                      >✓</em
                    >
                  </button>
                </div>
                <div class="row" style="justify-content: flex-start">
                  <button type="button" class="btn-ghost" @click="openSiteFromWizard">
                    + Nueva sucursal
                  </button>
                </div>
                <p v-if="!sites.length" class="hint">
                  Todavía no hay sucursales. Creá una con el botón de arriba.
                </p>
                <p v-else-if="selectedSite" class="site-pick__chosen">
                  Elegida: <strong>{{ selectedSite.nombre }}</strong>
                  <template v-if="selectedSite.codigo"> · {{ selectedSite.codigo }}</template>
                </p>
                <p v-else class="hint">Todavía no elegiste una sucursal.</p>
              </section>
            </template>

            <template v-else-if="wizSection === 'tipo'">
              <h3 class="asset-panel__title">Tipo de activo</h3>
              <section class="compose-block">
                <p class="hint" style="margin-top: 0">Elegí el tipo tocando una tarjeta.</p>
                <div class="type-pick" role="listbox" aria-label="Tipos de activo">
                  <button
                    v-for="t in typesForWizard"
                    :key="t.id"
                    type="button"
                    role="option"
                    class="type-pick__btn"
                    :class="{ on: String(resourceWizard.typeId) === String(t.id) }"
                    :aria-selected="String(resourceWizard.typeId) === String(t.id)"
                    :title="t.label"
                    @click="pickWizardType(t)"
                  >
                    <span class="type-pick__ico" aria-hidden="true">
                      <SpaceTypeIcon :name="t.icon || defaultIconForEngine(t.engineKind)" :size="26" />
                    </span>
                    <span class="type-pick__label">{{ t.label }}</span>
                    <span class="type-pick__motor">{{ labelKind(t.engineKind) }}</span>
                    <em v-if="String(resourceWizard.typeId) === String(t.id)" class="type-pick__check" aria-hidden="true"
                      >✓</em
                    >
                  </button>
                </div>
                <p v-if="!typesForWizard.length" class="hint">No hay tipos activos. Creá uno nuevo.</p>
                <div class="row" style="justify-content: flex-start">
                  <button type="button" class="btn-ghost" @click="openTypeFromWizard">
                    + Nuevo tipo de activo
                  </button>
                </div>
                <p v-if="selectedType" class="type-pick__chosen">
                  Elegido: <strong>{{ selectedType.label }}</strong>
                  · motor {{ labelKind(effectiveEngineKind) }}
                </p>
                <p v-else class="hint">Todavía no elegiste un tipo.</p>
              </section>
            </template>

            <template v-else>
              <h3 class="asset-panel__title">Atributos y reglas</h3>
              <fieldset v-if="typeAttrDefs.length" class="attr-box">
                <legend>Atributos del activo</legend>
                <label v-for="a in typeAttrDefs" :key="a.key" class="check">
                  <template v-if="a.valueType === 'flag'">
                    <input type="checkbox" :checked="hasAttr(a.key)" @change="toggleAttr(a.key, $event)" />
                    {{ a.label }}
                  </template>
                  <template v-else>
                    {{ a.label }}
                    <input :value="attrValue(a.key)" @input="setAttrValue(a.key, $event.target.value)" />
                  </template>
                </label>
              </fieldset>
              <p v-else class="hint">Elegí un tipo de activo para ver atributos sugeridos, o creá uno nuevo.</p>
              <div class="row" style="justify-content: flex-start">
                <button type="button" class="btn-ghost" @click="openAttrFromWizard">+ Nuevo atributo</button>
              </div>

              <label v-if="['sala', 'otro', 'grupo'].includes(effectiveEngineKind)"
                >Capacidad (personas)
                <input v-model.number="resourceWizard.capacity" type="number" min="1" />
              </label>

              <fieldset class="attr-box">
                <legend>Cómo se reserva (ocupación)</legend>
                <p class="hint" style="margin-top: 0">Elegí la clase tocando una tarjeta.</p>
                <div class="occ-pick" role="listbox" aria-label="Clase de ocupación">
                  <button
                    v-for="o in occupancyPickOptions"
                    :key="o.id"
                    type="button"
                    role="option"
                    class="occ-pick__btn"
                    :class="{ on: (resourceWizard.occupancyClass || 'unitario') === o.id }"
                    :aria-selected="(resourceWizard.occupancyClass || 'unitario') === o.id"
                    :title="o.hint"
                    @click="pickOccupancyClass(o.id)"
                  >
                    <span class="occ-pick__glyph" aria-hidden="true">{{ o.glyph }}</span>
                    <span class="occ-pick__label">{{ o.label }}</span>
                    <span class="occ-pick__blurb">{{ o.blurb }}</span>
                    <em
                      v-if="(resourceWizard.occupancyClass || 'unitario') === o.id"
                      class="occ-pick__check"
                      aria-hidden="true"
                      >✓</em
                    >
                  </button>
                </div>
                <p class="occ-pick__chosen">
                  Elegida: <strong>{{ occupancyChosenLabel }}</strong>
                </p>
                <p class="hint">{{ occupancyHint }}</p>
                <template v-if="resourceWizard.occupancyClass !== 'unitario'">
                  <label
                    >Cantidad
                    <input v-model.number="resourceWizard.unitCount" type="number" min="2" max="5000" />
                  </label>
                  <label
                    >Etiqueta de unidad
                    <input
                      v-model="resourceWizard.unitLabel"
                      type="text"
                      maxlength="40"
                      :placeholder="
                        resourceWizard.occupancyClass === 'unidades_numeradas'
                          ? 'Cajón / Butaca'
                          : resourceWizard.occupancyClass === 'aforo'
                            ? 'Lugar'
                            : 'Cupo'
                      "
                    />
                  </label>
                </template>
                <template v-if="resourceWizard.occupancyClass === 'unidades_numeradas'">
                  <label
                    >Prefijo de código
                    <input v-model="resourceWizard.unitPrefix" type="text" maxlength="12" placeholder="L-" />
                  </label>
                  <label
                    >Dígitos (padding)
                    <input v-model.number="resourceWizard.unitPad" type="number" min="1" max="6" />
                  </label>
                  <p class="hint">
                    Ejemplo: {{ resourceWizard.unitPrefix || '' }}{{
                      String(1).padStart(Number(resourceWizard.unitPad) || 3, '0')
                    }}
                    …
                    {{ resourceWizard.unitPrefix || '' }}{{
                      String(Number(resourceWizard.unitCount) || 1).padStart(
                        Number(resourceWizard.unitPad) || 3,
                        '0',
                      )
                    }}
                  </p>
                </template>
              </fieldset>

              <label class="check"
                ><input v-model="resourceWizard.requiresApproval" type="checkbox" /> Requiere
                aprobación</label
              >
              <label class="check"
                ><input v-model="resourceWizard.exigePatente" type="checkbox" /> Al reservar, pedir un
                dato (p. ej. patente)</label
              >
              <p class="hint" style="margin-top: -0.25rem">
                Si está activo, en la app aparece el campo de patente y no se puede confirmar sin
                cargarlo.
              </p>
              <label class="check"
                ><input v-model="resourceWizard.activo" type="checkbox" /> Habilitado</label
              >

              <section v-if="composeMeta.policyPatch" class="compose-block">
                <strong>Políticas sugeridas (globales)</strong>
                <p class="hint">Se aplican al tenant al guardar el activo.</p>
                <label v-if="composeMeta.policyPatch.maxSimultaneousParking != null"
                  >Máx. cocheras simultáneas
                  <input
                    v-model.number="composeMeta.policyPatch.maxSimultaneousParking"
                    type="number"
                    min="1"
                  />
                </label>
                <label v-if="composeMeta.policyPatch.maxSimultaneousDesk != null"
                  >Máx. puestos simultáneos
                  <input
                    v-model.number="composeMeta.policyPatch.maxSimultaneousDesk"
                    type="number"
                    min="1"
                  />
                </label>
                <label v-if="composeMeta.policyPatch.maxOfficeDaysPerWeek != null"
                  >Máx. días oficina / semana
                  <input
                    v-model.number="composeMeta.policyPatch.maxOfficeDaysPerWeek"
                    type="number"
                    min="0"
                  />
                </label>
                <label v-if="composeMeta.policyPatch.cancelMinutesBefore != null"
                  >Cancelar con anticipación (min)
                  <input
                    v-model.number="composeMeta.policyPatch.cancelMinutesBefore"
                    type="number"
                    min="0"
                  />
                </label>
                <label class="check"
                  ><input v-model="composeMeta.applyPolicy" type="checkbox" /> Aplicar estas políticas al
                  guardar</label
                >
              </section>
            </template>
          </div>
        </div>

        <footer class="asset-editor__foot">
          <p v-if="wizError" class="err">{{ wizError }}</p>
          <p v-else-if="!canSaveResource" class="hint foot-hint">
            Completá nombre, sucursal y tipo de activo para poder guardar.
          </p>
          <span v-else class="foot-spacer" />
          <div class="row foot-actions">
            <button type="button" class="btn-ghost" @click="resourceWizard = null">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="!canSaveResource || savingResource">
              {{ savingResource ? 'Guardando…' : 'Guardar activo' }}
            </button>
          </div>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import SpaceTypeIcon from '../components/SpaceTypeIcon.vue'
import { SPACE_TYPE_ICONS, defaultIconForEngine } from '../utils/spaceTypeIcons'
import { attrIconMeta as attrIconMetaFn, attrTooltip as attrTooltipFn } from '../utils/spaceAttrIcons'
import { resolveMediaUrl } from '../utils/media'

const spaceTypeIcons = SPACE_TYPE_ICONS

function mediaUrl(url) {
  return resolveMediaUrl(url)
}

function attrIconMeta(key) {
  return attrIconMetaFn(key)
}

function attrTooltip(attr) {
  return attrTooltipFn(attr, attrLabel)
}

function onAssetThumbError(e) {
  const wrap = e.target?.closest?.('.asset-tile__media')
  if (wrap) {
    wrap.classList.add('empty')
    e.target.remove()
    if (!wrap.querySelector('.asset-tile__ph')) {
      const ph = document.createElement('div')
      ph.className = 'asset-tile__ph'
      ph.setAttribute('aria-hidden', 'true')
      ph.textContent = 'Sin foto'
      wrap.prepend(ph)
    }
  } else {
    e.target.style.display = 'none'
  }
}

const tab = ref('resources')
const configOpen = ref(false)
const CONFIG_TABS = new Set(['sites', 'types', 'attrs', 'policy'])
const isConfigTab = computed(() => CONFIG_TABS.has(tab.value))

function toggleConfig() {
  if (configOpen.value) {
    configOpen.value = false
    if (isConfigTab.value) tab.value = 'resources'
    return
  }
  configOpen.value = true
  if (!isConfigTab.value) tab.value = 'sites'
}

watch(tab, (t) => {
  if (CONFIG_TABS.has(t)) configOpen.value = true
})

const sites = ref([])
const resources = ref([])
const types = ref([])
const attributes = ref([])
const pending = ref([])
const report = ref({})
const policy = reactive({
  maxSimultaneousParking: 1,
  maxSimultaneousDesk: 1,
  maxOfficeDaysPerWeek: 5,
  cancelMinutesBefore: 30,
  checkInGraceMinutes: 15,
})
const filterTypeId = ref('')
const filterSiteId = ref('')
/** '1' habilitados (default) | '0' deshabilitados | '' todos */
const filterActivo = ref('1')
const filterOccupancy = ref('')
const occupancyOptions = ref([
  { id: 'unitario', label: 'Unitario', needsUnits: false, numbered: false },
  { id: 'unidades_numeradas', label: 'Unidades numeradas', needsUnits: true, numbered: true },
  { id: 'pool', label: 'Cupo compartido', needsUnits: true, numbered: false },
  { id: 'aforo', label: 'Aforo / multi-reserva', needsUnits: true, numbered: false },
])
const OCCUPANCY_UI = {
  unitario: {
    glyph: '1',
    blurb: 'Una reserva a la vez',
    hint: 'Una reserva a la vez sobre el activo entero.',
  },
  unidades_numeradas: {
    glyph: '#',
    blurb: 'Padre + N° (cajón / butaca)',
    hint: 'Un activo padre con N unidades. Al reservar se elige un número libre.',
  },
  pool: {
    glyph: '≡',
    blurb: 'Cupo sin número fijo',
    hint: 'Cupo sin número: importa que quede lugar, no cuál unidad.',
  },
  aforo: {
    glyph: '∞',
    blurb: 'Varias personas a la vez',
    hint: 'El mismo activo admite varias reservas concurrentes hasta el aforo.',
  },
}
const occupancyPickOptions = computed(() =>
  (occupancyOptions.value || []).map((o) => ({
    ...o,
    ...(OCCUPANCY_UI[o.id] || OCCUPANCY_UI.unitario),
  })),
)
const occupancyHint = computed(() => {
  const id = resourceWizard.value?.occupancyClass || 'unitario'
  return OCCUPANCY_UI[id]?.hint || OCCUPANCY_UI.unitario.hint
})
const occupancyChosenLabel = computed(() => {
  const id = resourceWizard.value?.occupancyClass || 'unitario'
  return occupancyOptions.value.find((o) => o.id === id)?.label || 'Unitario'
})

function pickOccupancyClass(id) {
  if (!resourceWizard.value || !id) return
  const prev = resourceWizard.value.occupancyClass
  resourceWizard.value.occupancyClass = id
  if (id === 'unitario') {
    resourceWizard.value.unitCount = 1
    return
  }
  if (prev === 'unitario' || !resourceWizard.value.unitCount || resourceWizard.value.unitCount < 2) {
    resourceWizard.value.unitCount = id === 'aforo' ? 20 : id === 'unidades_numeradas' ? 24 : 12
  }
  if (!resourceWizard.value.unitLabel) {
    resourceWizard.value.unitLabel =
      id === 'unidades_numeradas' ? 'Cajón' : id === 'aforo' ? 'Lugar' : 'Cupo'
  }
  if (id === 'unidades_numeradas') {
    if (!resourceWizard.value.unitPrefix) resourceWizard.value.unitPrefix = 'L-'
    if (!resourceWizard.value.unitPad) resourceWizard.value.unitPad = 3
  }
}
const siteForm = ref(null)
const typeForm = ref(null)
const attrForm = ref(null)
const resourceWizard = ref(null)
const wizSection = ref('datos')
const wizError = ref('')
const savingResource = ref(false)
const togglingId = ref(null)
const disableConfirm = ref(null)
const uploadingPhoto = ref(false)
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const seedConfirmOpen = ref(false)
const aiConfigured = ref(false)
const aiPromptOpen = ref(false)
const AI_PROMPT_EXAMPLE =
  'Cajonera planta 2 con 48 cajones numerados (L-001…). Un solo activo padre; al reservar se elige el número libre. Accesible.'
const aiOccupancyExamples = [
  {
    id: 'unitario',
    label: 'Unitario',
    prompt:
      'Proyector Epson 4K portátil con HDMI. Ocupación unitaria: una reserva a la vez. Retiro en recepción.',
  },
  {
    id: 'numeradas',
    label: 'Numeradas',
    prompt:
      'Cajonera planta 2 con 48 cajones numerados (L-001…). Un solo activo; al reservar elegís el cajón libre. Accesible.',
  },
  {
    id: 'pool',
    label: 'Cupo / pool',
    prompt:
      'Hot desk open space con cupo compartido de 12 puestos sin número fijo (pool / FIFO). WiFi y accesible.',
  },
  {
    id: 'aforo',
    label: 'Aforo',
    prompt:
      'Cafetería / comedor con aforo 40 multi-reserva. Varias personas en el mismo horario hasta el tope.',
  },
]
const aiPrompt = ref(AI_PROMPT_EXAMPLE)
const aiLoading = ref(false)
const aiError = ref('')
const composeMeta = reactive({
  policyPatch: null,
  applyPolicy: true,
  notas: '',
})
/** Prefills al abrir modal desde el wizard (p. ej. borrador IA). */
const pendingSiteDraft = ref(null)
const pendingTypeDraft = ref(null)

const KIND_LABELS = {
  sala: 'Sala',
  otro: 'Espacio',
  cochera: 'Cochera',
  puesto: 'Puesto',
  zona_cupo: 'Zona cupo',
  activo: 'Activo',
  hora_libre: 'Hora libre',
  grupo: 'Grupo',
}

const tabCounts = computed(() => ({
  resources: resources.value.length,
  sites: sites.value.length,
  types: types.value.length,
  attrs: attributes.value.length,
  pending: pending.value.length,
}))

function labelKind(k) {
  return KIND_LABELS[k] || k || '—'
}

function typeIconFor(resource) {
  const fromType = types.value.find((t) => String(t.id) === String(resource?.typeId))
  if (fromType?.icon) return fromType.icon
  if (resource?.typeIcon) return resource.typeIcon
  return defaultIconForEngine(resource?.kind || resource?.engineKind)
}

function assetFlags(r) {
  const flags = []
  if (r.requiresApproval) flags.push('Requiere aprobación')
  if (r.exigePatente) flags.push('Pide dato (patente)')
  if (r.accessible) flags.push('Accesible')
  if (r.diaCompleto) flags.push('Día completo')
  if (r.bufferMin > 0) flags.push(`Buffer ${r.bufferMin} min`)
  return flags
}

function onTypeEngineChange() {
  if (!typeForm.value || typeForm.value.id) return
  typeForm.value.icon = defaultIconForEngine(typeForm.value.engineKind)
}

function attrLabel(key) {
  return attributes.value.find((a) => a.key === key)?.label || key
}

function resetComposeMeta() {
  composeMeta.policyPatch = null
  composeMeta.applyPolicy = true
  composeMeta.notas = ''
  pendingSiteDraft.value = null
  pendingTypeDraft.value = null
}

const assetSections = [
  { id: 'datos', label: 'Datos' },
  { id: 'sucursal', label: 'Sucursal' },
  { id: 'tipo', label: 'Tipo de activo' },
  { id: 'reglas', label: 'Atributos y reglas' },
]

const datosOk = computed(() => Boolean(String(resourceWizard.value?.nombre || '').trim()))
const sucursalOk = computed(() => Boolean(resourceWizard.value?.siteId))
const tipoOk = computed(() => Boolean(resourceWizard.value?.typeId))
const canSaveResource = computed(() => datosOk.value && sucursalOk.value && tipoOk.value)
const sectionStatus = computed(() => ({
  datos: datosOk.value ? 'ok' : 'miss',
  sucursal: sucursalOk.value ? 'ok' : 'miss',
  tipo: tipoOk.value ? 'ok' : 'miss',
  reglas: 'ok',
}))

const selectedType = computed(() =>
  types.value.find((t) => String(t.id) === String(resourceWizard.value?.typeId || '')),
)

const selectedSite = computed(() =>
  sites.value.find((s) => String(s.id) === String(resourceWizard.value?.siteId || '')),
)

const typesForWizard = computed(() =>
  (types.value || []).filter((t) => t.activo !== false),
)

const effectiveEngineKind = computed(() => {
  return selectedType.value?.engineKind || resourceWizard.value?.kind || 'activo'
})

const typeAttrDefs = computed(() => {
  const keys = new Set(selectedType.value?.attributeKeys || [])
  for (const a of resourceWizard.value?.attributes || []) {
    if (a?.key) keys.add(a.key)
  }
  if (!keys.size) {
    return (attributes.value || []).filter((a) => a.activo !== false).slice(0, 12)
  }
  return (attributes.value || []).filter((a) => keys.has(a.key))
})

function closeResourceWizardIfIdle() {
  if (siteForm.value || typeForm.value || attrForm.value) return
  resourceWizard.value = null
}

function fmt(d) {
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/spaces/meta')
  types.value = data.types || []
  attributes.value = data.attributes || []
  if (Array.isArray(data.occupancy) && data.occupancy.length) {
    occupancyOptions.value = data.occupancy
  }
}

async function loadAiStatus() {
  try {
    const { data } = await api.get('/admin/spaces/ai-status')
    aiConfigured.value = !!data.configured
  } catch {
    aiConfigured.value = false
  }
}

async function loadSites() {
  const { data } = await api.get('/admin/spaces/sites')
  sites.value = (data.items || []).map((s) => ({
    ...s,
    id: String(s.id || s._id || ''),
  }))
}

async function loadResources() {
  const { data } = await api.get('/admin/spaces/resources')
  resources.value = (data.items || []).map((r) => ({
    ...r,
    id: String(r.id || r._id || ''),
    siteId: normalizeRefId(r.siteId),
    typeId: r.typeId != null && r.typeId !== '' ? normalizeRefId(r.typeId) : null,
  }))
}

function normalizeRefId(ref) {
  if (ref == null || ref === '') return ''
  if (typeof ref === 'object') return String(ref.id || ref._id || '')
  return String(ref)
}

function resourceMatchesSite(r, siteFilter) {
  const want = String(siteFilter || '').trim()
  if (!want) return true
  const got = normalizeRefId(r.siteId)
  if (got && got === want) return true
  const site = sites.value.find((s) => String(s.id) === want)
  if (site?.nombre && r.siteNombre && String(r.siteNombre) === String(site.nombre)) return true
  return false
}

const typesForFilter = computed(() => {
  const used = new Set(resources.value.map((r) => String(r.typeId || '')).filter(Boolean))
  const list = (types.value || []).filter((t) => t.activo !== false || used.has(String(t.id)))
  return [...list].sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100) || a.label.localeCompare(b.label, 'es'))
})

const typeCounts = computed(() => {
  const counts = {}
  for (const r of resources.value) {
    if (filterActivo.value === '1' && r.activo === false) continue
    if (filterActivo.value === '0' && r.activo !== false) continue
    if (!resourceMatchesSite(r, filterSiteId.value)) continue
    const id = String(r.typeId || '')
    if (!id) continue
    counts[id] = (counts[id] || 0) + 1
  }
  return counts
})

const filteredResources = computed(() => {
  return resources.value.filter((r) => {
    if (filterTypeId.value && String(r.typeId || '') !== String(filterTypeId.value)) return false
    if (!resourceMatchesSite(r, filterSiteId.value)) return false
    if (filterActivo.value === '1' && r.activo === false) return false
    if (filterActivo.value === '0' && r.activo !== false) return false
    if (filterOccupancy.value && String(r.occupancyClass || 'unitario') !== filterOccupancy.value) {
      return false
    }
    return true
  })
})

const filtersActiveSummary = computed(() => {
  const bits = []
  if (filterTypeId.value) {
    const t = typesForFilter.value.find((x) => String(x.id) === String(filterTypeId.value))
    bits.push(t?.label || 'Tipo')
  }
  if (filterSiteId.value) {
    const s = sites.value.find((x) => String(x.id) === String(filterSiteId.value))
    bits.push(s?.nombre || 'Sucursal')
  }
  if (filterActivo.value === '1') bits.push('Habilitados')
  else if (filterActivo.value === '0') bits.push('Deshabilitados')
  if (filterOccupancy.value) {
    const o = occupancyOptions.value.find((x) => x.id === filterOccupancy.value)
    bits.push(o?.label || 'Ocupación')
  }
  return bits.join(' · ')
})

async function loadPending() {
  const { data } = await api.get('/admin/spaces/reservations', { params: { status: 'pending' } })
  pending.value = data.items || []
}

async function loadReport() {
  const { data } = await api.get('/admin/spaces/report')
  report.value = data
}

async function loadPolicy() {
  const { data } = await api.get('/admin/spaces/policy')
  const item = data.item || {}
  policy.maxSimultaneousParking = item.maxSimultaneousParking ?? 1
  policy.maxSimultaneousDesk = item.maxSimultaneousDesk ?? 1
  policy.maxOfficeDaysPerWeek = item.maxOfficeDaysPerWeek ?? 5
  policy.cancelMinutesBefore = item.cancelMinutesBefore ?? 30
  policy.checkInGraceMinutes = item.checkInGraceMinutes ?? 15
}

async function refresh() {
  error.value = ''
  try {
    await Promise.all([loadMeta(), loadSites(), loadResources(), loadPending()])
    if (tab.value === 'pending') await loadReport()
    if (tab.value === 'policy') await loadPolicy()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

watch(tab, refresh)

function openSite(s = null) {
  siteForm.value = s
    ? { ...s }
    : { nombre: '', codigo: '', direccion: '', aforoMax: null, whoIsHereEnabled: false, activo: true }
}

function openSiteFromWizard() {
  const draft = pendingSiteDraft.value
  pendingSiteDraft.value = null
  openSite(
    draft
      ? {
          nombre: draft.nombre || '',
          codigo: draft.codigo || '',
          direccion: draft.direccion || '',
          aforoMax: draft.aforoMax ?? null,
          whoIsHereEnabled: !!draft.whoIsHereEnabled,
          activo: draft.activo !== false,
        }
      : null,
  )
}

function openType(t = null) {
  typeForm.value = t
    ? { ...t, icon: t.icon || defaultIconForEngine(t.engineKind), attributeKeys: [...(t.attributeKeys || [])] }
    : {
        codigo: '',
        label: '',
        icon: defaultIconForEngine('activo'),
        engineKind: 'activo',
        attributeKeys: [],
        showInUserCatalog: true,
        exigePatenteDefault: false,
        requiresApprovalDefault: false,
        activo: true,
      }
}

function openTypeFromWizard() {
  const draft = pendingTypeDraft.value
  pendingTypeDraft.value = null
  if (!draft) {
    openType()
    return
  }
  const engineKind = draft.engineKind || 'activo'
  openType({
    codigo: draft.codigo || '',
    label: draft.label || '',
    icon: draft.icon || defaultIconForEngine(engineKind),
    engineKind,
    attributeKeys: [...(draft.attributeKeys || [])],
    showInUserCatalog: draft.showInUserCatalog !== false,
    exigePatenteDefault: !!draft.exigePatenteDefault,
    requiresApprovalDefault: !!draft.requiresApprovalDefault,
    diaCompletoDefault: !!draft.diaCompletoDefault,
    showInOffice: !!draft.showInOffice,
    activo: draft.activo !== false,
  })
}

function openAttr(a = null) {
  attrForm.value = a
    ? { ...a }
    : { key: '', label: '', valueType: 'flag', activo: true }
}

function openAttrFromWizard() {
  openAttr()
}

function openResourceWizard(r = null) {
  wizSection.value = 'datos'
  wizError.value = ''
  resetComposeMeta()
  resourceWizard.value = r
    ? {
        ...r,
        descripcion: r.descripcion || '',
        imageUrl: r.imageUrl || '',
        attributes: [...(r.attributes || [])],
      }
    : {
        siteId: sites.value[0]?.id || '',
        typeId: '',
        kind: 'activo',
        nombre: '',
        codigo: '',
        descripcion: '',
        imageUrl: '',
        floor: '',
        zone: '',
        capacity: null,
        cupo: null,
        occupancyClass: 'unitario',
        unitCount: 1,
        unitLabel: '',
        unitPrefix: '',
        unitPad: 3,
        attributes: [],
        requiresApproval: false,
        exigePatente: false,
        activo: true,
      }
  if (!r && !sites.value.length) wizSection.value = 'sucursal'
}

function openAiNew() {
  aiError.value = ''
  aiPrompt.value = AI_PROMPT_EXAMPLE
  aiPromptOpen.value = true
}

async function runAiDraft() {
  aiLoading.value = true
  aiError.value = ''
  try {
    await Promise.all([loadSites(), loadMeta()])
    const { data } = await api.post('/admin/spaces/ai-draft', { prompt: aiPrompt.value.trim() })
    const d = data.draft || {}
    const resource = d.resource || {}
    resetComposeMeta()
    composeMeta.notas = d.notas || ''
    composeMeta.policyPatch = d.policyPatch ? { ...d.policyPatch } : null
    composeMeta.applyPolicy = Boolean(d.policyPatch)

    // Atributos nuevos del borrador: crearlos en el catálogo (modal único), no embebidos.
    for (const a of Array.isArray(d.attributes) ? d.attributes : []) {
      const key = String(a.key || '').trim()
      if (!key || attributes.value.some((x) => x.key === key)) continue
      try {
        await api.post('/admin/spaces/attributes', {
          key,
          label: a.label || key,
          valueType: a.valueType || 'flag',
          activo: true,
        })
      } catch {
        /* ya existe u otro error: se refleja al recargar meta */
      }
    }
    await loadMeta()

    if (d.site && !resource.siteId && !d.siteMatch?.id) {
      pendingSiteDraft.value = { ...d.site }
      composeMeta.notas = [composeMeta.notas, 'Falta sucursal: usá «+ Nueva sucursal» (borrador listo).']
        .filter(Boolean)
        .join(' ')
    }
    if (d.type && !resource.typeId && !d.typeMatch?.id) {
      pendingTypeDraft.value = { ...d.type }
      composeMeta.notas = [composeMeta.notas, 'Falta tipo: usá «+ Nuevo tipo de activo» (borrador listo).']
        .filter(Boolean)
        .join(' ')
    }

    resourceWizard.value = {
      siteId: resource.siteId || d.siteMatch?.id || sites.value[0]?.id || '',
      typeId: resource.typeId || d.typeMatch?.id || '',
      kind: resource.kind || d.type?.engineKind || 'activo',
      nombre: resource.nombre || '',
      codigo: resource.codigo || '',
      descripcion: resource.descripcion || '',
      imageUrl: resource.imageUrl || '',
      floor: resource.floor || '',
      zone: resource.zone || '',
      zoneType: resource.zoneType || '',
      capacity: resource.capacity ?? null,
      cupo: resource.cupo ?? null,
      occupancyClass: resource.occupancyClass || 'unitario',
      unitCount: resource.unitCount ?? resource.effectiveCupo ?? 1,
      unitLabel: resource.unitLabel || '',
      unitPrefix: resource.unitPrefix || '',
      unitPad: resource.unitPad || 3,
      attributes: Array.isArray(resource.attributes) ? [...resource.attributes] : [],
      requiresApproval: !!resource.requiresApproval,
      exigePatente: !!resource.exigePatente,
      diaCompleto: !!resource.diaCompleto,
      accessible: !!resource.accessible,
      bufferMin: Number(resource.bufferMin) || 0,
      activo: resource.activo !== false,
      horario: resource.horario || { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
    }
    if (resourceWizard.value.typeId) onTypePicked()
    // Si hay ocupación no trivial, abrir reglas para revisarla
    const occ = resourceWizard.value.occupancyClass || 'unitario'
    wizSection.value = !resourceWizard.value.siteId
      ? 'sucursal'
      : !resourceWizard.value.typeId
        ? 'tipo'
        : occ !== 'unitario'
          ? 'reglas'
          : 'datos'
    aiPromptOpen.value = false
    tab.value = 'resources'
    okMsg.value =
      d.source === 'llm'
        ? `Borrador IA listo · ocupación ${resourceWizard.value.occupancyClass || 'unitario'} — revisá y guardá.`
        : `Borrador listo · ocupación ${resourceWizard.value.occupancyClass || 'unitario'} — revisá y guardá.`
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message
  } finally {
    aiLoading.value = false
  }
}

function onTypePicked() {
  const t = selectedType.value
  if (!t || !resourceWizard.value) return
  resourceWizard.value.kind = t.engineKind
  resourceWizard.value.exigePatente = !!t.exigePatenteDefault
  resourceWizard.value.requiresApproval = !!t.requiresApprovalDefault
}

function pickWizardType(t) {
  if (!resourceWizard.value || !t) return
  resourceWizard.value.typeId = t.id
  onTypePicked()
}

function pickWizardSite(s) {
  if (!resourceWizard.value || !s) return
  resourceWizard.value.siteId = s.id
}

async function onResourcePhotoFile(e) {
  const file = e.target.files?.[0]
  if (!file || !resourceWizard.value) return
  uploadingPhoto.value = true
  wizError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/posts/upload', fd)
    resourceWizard.value.imageUrl = data.url || data.urls?.[0] || ''
  } catch (err) {
    wizError.value = err.response?.data?.error || 'No se pudo subir la foto'
  } finally {
    uploadingPhoto.value = false
    e.target.value = ''
  }
}

function hasAttr(key) {
  return (resourceWizard.value?.attributes || []).some((a) => a.key === key)
}

function attrValue(key) {
  return (resourceWizard.value?.attributes || []).find((a) => a.key === key)?.value || ''
}

function toggleAttr(key, ev) {
  if (!resourceWizard.value) return
  const list = [...(resourceWizard.value.attributes || [])]
  const i = list.findIndex((a) => a.key === key)
  if (ev.target.checked) {
    if (i < 0) list.push({ key, value: '' })
  } else if (i >= 0) list.splice(i, 1)
  resourceWizard.value.attributes = list
}

function setAttrValue(key, value) {
  if (!resourceWizard.value) return
  const list = [...(resourceWizard.value.attributes || [])]
  const i = list.findIndex((a) => a.key === key)
  if (!value) {
    if (i >= 0) list.splice(i, 1)
  } else if (i >= 0) list[i] = { key, value }
  else list.push({ key, value })
  resourceWizard.value.attributes = list
}

async function saveSite() {
  try {
    let item = null
    if (siteForm.value.id) {
      const { data } = await api.patch(`/admin/spaces/sites/${siteForm.value.id}`, siteForm.value)
      item = data.item
    } else {
      const { data } = await api.post('/admin/spaces/sites', siteForm.value)
      item = data.item
    }
    siteForm.value = null
    okMsg.value = 'Sucursal guardada.'
    await loadSites()
    if (resourceWizard.value && item?.id) {
      resourceWizard.value.siteId = item.id
      wizSection.value = 'sucursal'
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function saveType() {
  try {
    const payload = { ...typeForm.value }
    let item = null
    if (payload.id) {
      const { data } = await api.patch(`/admin/spaces/types/${payload.id}`, payload)
      item = data.item
    } else {
      const { data } = await api.post('/admin/spaces/types', payload)
      item = data.item
    }
    typeForm.value = null
    okMsg.value = 'Tipo de activo guardado.'
    await loadMeta()
    if (resourceWizard.value && item?.id) {
      resourceWizard.value.typeId = item.id
      onTypePicked()
      wizSection.value = 'tipo'
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function saveAttr() {
  try {
    const payload = { ...attrForm.value }
    let item = null
    if (payload.id) {
      const { data } = await api.patch(`/admin/spaces/attributes/${payload.id}`, payload)
      item = data.item
    } else {
      const { data } = await api.post('/admin/spaces/attributes', payload)
      item = data.item
    }
    attrForm.value = null
    okMsg.value = 'Atributo guardado.'
    await loadMeta()
    if (resourceWizard.value && item?.key) {
      toggleAttr(item.key, { target: { checked: true } })
      if (selectedType.value?.id && !(selectedType.value.attributeKeys || []).includes(item.key)) {
        try {
          await api.patch(`/admin/spaces/types/${selectedType.value.id}`, {
            attributeKeys: [...(selectedType.value.attributeKeys || []), item.key],
          })
          await loadMeta()
        } catch {
          /* el atributo igual queda marcado en el activo */
        }
      }
      wizSection.value = 'reglas'
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function toggleResourceActivo(r) {
  if (!r?.id || togglingId.value) return
  const next = !r.activo
  if (next) {
    await applyResourceActivo(r, true)
    return
  }
  disableConfirm.value = {
    id: r.id,
    nombre: r.nombre,
    mode: 'keep',
    activeCount: 0,
    loadingCount: true,
  }
  try {
    const { data } = await api.get('/admin/spaces/reservations', {
      params: { resourceId: r.id, activeOnly: '1' },
    })
    if (disableConfirm.value?.id === r.id) {
      disableConfirm.value.activeCount = data.count ?? data.items?.length ?? 0
      disableConfirm.value.loadingCount = false
      if (disableConfirm.value.activeCount > 0) {
        disableConfirm.value.mode = 'keep'
      }
    }
  } catch {
    if (disableConfirm.value?.id === r.id) {
      disableConfirm.value.loadingCount = false
    }
  }
}

async function confirmDisableResource() {
  const conf = disableConfirm.value
  if (!conf?.id || togglingId.value) return
  const resource = resources.value.find((x) => x.id === conf.id) || {
    id: conf.id,
    nombre: conf.nombre,
  }
  await applyResourceActivo(resource, false, {
    cancelReservations: conf.mode === 'cancel',
  })
  disableConfirm.value = null
}

async function applyResourceActivo(r, next, { cancelReservations = false } = {}) {
  if (!r?.id || togglingId.value) return
  togglingId.value = r.id
  error.value = ''
  try {
    const { data } = await api.patch(`/admin/spaces/resources/${r.id}`, {
      activo: next,
      cancelReservations: !next && cancelReservations,
      cancelReason: !next && cancelReservations ? 'Activo deshabilitado por administración' : undefined,
    })
    const updated = data.item
    const cancelledCount = Number(data.cancelledCount) || 0
    const idx = resources.value.findIndex((x) => x.id === r.id)
    if (idx >= 0) {
      const merged = { ...resources.value[idx], ...(updated || { activo: next }) }
      merged.siteId = normalizeRefId(merged.siteId)
      merged.typeId =
        merged.typeId != null && merged.typeId !== '' ? normalizeRefId(merged.typeId) : null
      resources.value[idx] = merged
    } else {
      r.activo = next
    }
    if (next) {
      okMsg.value = `«${r.nombre}» habilitado: vuelve al catálogo.`
    } else if (cancelReservations) {
      okMsg.value =
        cancelledCount > 0
          ? `«${r.nombre}» deshabilitado y ${cancelledCount} reserva(s) cancelada(s).`
          : `«${r.nombre}» deshabilitado (no había reservas activas para cancelar).`
    } else {
      okMsg.value = `«${r.nombre}» deshabilitado: sin reservas nuevas (las existentes siguen).`
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    togglingId.value = null
  }
}

async function saveResource() {
  savingResource.value = true
  wizError.value = ''
  try {
    const w = resourceWizard.value
    if (w.id) {
      await api.patch(`/admin/spaces/resources/${w.id}`, { ...w })
      okMsg.value = 'Activo actualizado.'
    } else {
      await api.post('/admin/spaces/resources', {
        ...w,
        kind: effectiveEngineKind.value,
        siteId: w.siteId,
        typeId: w.typeId,
      })
      if (composeMeta.applyPolicy && composeMeta.policyPatch) {
        await api.put('/admin/spaces/policy', {
          ...policy,
          ...composeMeta.policyPatch,
        })
      }
      okMsg.value = 'Activo creado.'
    }
    resourceWizard.value = null
    const shouldReloadPolicy = Boolean(composeMeta.applyPolicy && composeMeta.policyPatch)
    resetComposeMeta()
    await Promise.all([loadMeta(), loadSites(), loadResources()])
    if (shouldReloadPolicy) await loadPolicy()
  } catch (e) {
    wizError.value = e.response?.data?.error || e.message
  } finally {
    savingResource.value = false
  }
}

async function savePolicy() {
  try {
    await api.put('/admin/spaces/policy', policy)
    okMsg.value = 'Políticas actualizadas.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function approve(r) {
  try {
    await api.post(`/admin/spaces/reservations/${r.id}/approve`)
    await loadPending()
    okMsg.value = 'Aprobada.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function reject(r) {
  const reason = prompt('Motivo del rechazo') || ''
  try {
    await api.post(`/admin/spaces/reservations/${r.id}/reject`, { reason })
    await loadPending()
    okMsg.value = 'Rechazada.'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function confirmSeedDefaults() {
  await seedDefaults()
}

async function seedDefaults() {
  busy.value = true
  try {
    const { data } = await api.post('/admin/spaces/seed-defaults')
    okMsg.value = `Demo OK: ${data.sites} sucursales · ${data.resourcesCreated} activos · ${data.typesUpserted || 0} tipos de activos.`
    seedConfirmOpen.value = false
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSites(), loadAiStatus()])
  await refresh()
})
</script>

<style scoped>
.rv {
  max-width: none;
}
.rv-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.rv-head h1 {
  margin: 0;
  font-size: 1.5rem;
}
.rv-head p {
  margin: 0.25rem 0 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.rv-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 1rem 0 0.35rem;
  align-items: center;
}
.rv-tabs--config {
  margin: 0 0 1rem;
  padding: 0.45rem;
  border-radius: 0.75rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
}
.rv-tabs button {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.rv-tabs button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.rv-tabs em {
  font-style: normal;
  background: var(--warn-bg);
  color: var(--warn);
  border-radius: 999px;
  padding: 0 0.4rem;
  font-size: 0.75rem;
}
.rv-tabs button.on em {
  background: var(--panel);
}
.rv-cfg-btn {
  margin-left: auto;
  border: 1px solid var(--line) !important;
  background: var(--panel) !important;
  color: var(--ink-soft) !important;
  border-radius: 999px !important;
}
.rv-cfg-btn.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel)) !important;
  color: var(--brand-primary) !important;
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line)) !important;
}
.rv-cfg-btn__label {
  font-size: 0.82rem;
}
@media (max-width: 640px) {
  .rv-cfg-btn__label {
    display: none;
  }
  .rv-cfg-btn {
    margin-left: 0;
  }
}
.panel-bar {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.75rem;
}
.hint,
.muted,
.sub {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}
.report-collapse {
  margin-bottom: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel-2);
  overflow: hidden;
}
.report-collapse > summary {
  cursor: pointer;
  list-style: none;
  padding: 0.7rem 0.9rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  user-select: none;
}
.report-collapse > summary::-webkit-details-marker {
  display: none;
}
.report-collapse > summary::before {
  content: '▸';
  color: var(--ink-soft);
  font-size: 0.8rem;
}
.report-collapse[open] > summary::before {
  content: '▾';
}
.report-collapse__body {
  padding: 0 0.9rem 0.9rem;
  display: grid;
  gap: 0.55rem;
}
.stats div {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem;
  display: grid;
  background: linear-gradient(160deg, var(--panel-2), var(--panel));
}
.stats strong {
  font-size: 1.4rem;
}
.stats span {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.list,
.plain {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: grid;
  gap: 0.55rem;
}
.card {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  background: var(--panel);
}
.type-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}
.type-icon {
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel-2));
  color: var(--brand-primary);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.type-pick {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.55rem;
  margin: 0.35rem 0 0.75rem;
}
.type-pick__btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  padding: 0.75rem 0.5rem 0.65rem;
  border-radius: 0.85rem;
  border: 1.5px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  min-height: 5.5rem;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.type-pick__btn:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
}
.type-pick__btn.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-primary) 28%, transparent);
  color: var(--brand-primary);
  font-weight: 650;
}
.type-pick__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--panel-2));
  color: inherit;
}
.type-pick__btn.on .type-pick__ico {
  background: color-mix(in srgb, var(--brand-primary) 18%, var(--panel));
}
.type-pick__label {
  font-size: 0.82rem;
  line-height: 1.2;
  font-weight: 650;
}
.type-pick__motor {
  font-size: 0.68rem;
  opacity: 0.72;
  line-height: 1.15;
}
.type-pick__check {
  position: absolute;
  top: 0.35rem;
  right: 0.4rem;
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 800;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-primary);
  color: #fff;
}
.type-pick__chosen {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.site-pick {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.55rem;
  margin: 0.35rem 0 0.75rem;
}
.site-pick__btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  padding: 0.75rem 0.65rem 0.65rem;
  border-radius: 0.85rem;
  border: 1.5px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  min-height: 5.25rem;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.site-pick__btn:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
}
.site-pick__btn.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-primary) 28%, transparent);
  color: var(--brand-primary);
  font-weight: 650;
}
.site-pick__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.45rem;
  font-size: 1rem;
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--panel-2));
  color: inherit;
  margin-bottom: 0.15rem;
}
.site-pick__btn.on .site-pick__ico {
  background: color-mix(in srgb, var(--brand-primary) 18%, var(--panel));
}
.site-pick__label {
  font-size: 0.84rem;
  line-height: 1.2;
  font-weight: 650;
  padding-right: 1rem;
}
.site-pick__code {
  font-size: 0.7rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  opacity: 0.75;
}
.site-pick__addr {
  font-size: 0.68rem;
  opacity: 0.7;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
}
.site-pick__check {
  position: absolute;
  top: 0.35rem;
  right: 0.4rem;
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 800;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-primary);
  color: #fff;
}
.site-pick__chosen {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.occ-pick {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.55rem;
  margin: 0.35rem 0 0.65rem;
}
.occ-pick__btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  text-align: left;
  padding: 0.7rem 0.65rem 0.65rem;
  border-radius: 0.85rem;
  border: 1.5px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  min-height: 5.25rem;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.occ-pick__btn:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
}
.occ-pick__btn.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-primary) 28%, transparent);
  color: var(--brand-primary);
  font-weight: 650;
}
.occ-pick__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.45rem;
  font-size: 0.95rem;
  font-weight: 800;
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--panel-2));
  color: inherit;
}
.occ-pick__btn.on .occ-pick__glyph {
  background: color-mix(in srgb, var(--brand-primary) 18%, var(--panel));
}
.occ-pick__label {
  font-size: 0.82rem;
  line-height: 1.2;
  font-weight: 650;
  padding-right: 1rem;
}
.occ-pick__blurb {
  font-size: 0.68rem;
  opacity: 0.75;
  line-height: 1.25;
  font-weight: 500;
}
.occ-pick__check {
  position: absolute;
  top: 0.35rem;
  right: 0.4rem;
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 800;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-primary);
  color: #fff;
}
.occ-pick__chosen {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.photo-field {
  display: grid;
  gap: 0.45rem;
}
.photo-drop {
  position: relative;
  display: grid;
  place-items: center;
  gap: 0.35rem;
  min-height: 9.5rem;
  padding: 1rem 0.85rem;
  border-radius: 0.9rem;
  border: 1.5px dashed color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--panel-2));
  color: var(--ink-soft);
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}
.photo-drop:hover {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--panel));
  color: var(--brand-primary);
}
.photo-drop.has {
  border-style: solid;
  padding: 0;
  min-height: 10rem;
  background: var(--panel-2);
}
.photo-drop.busy {
  opacity: 0.75;
  cursor: wait;
  pointer-events: none;
}
.photo-drop__ico {
  display: inline-flex;
  color: var(--brand-primary);
  opacity: 0.9;
}
.photo-drop__title {
  font-size: 0.95rem;
  color: var(--ink);
}
.photo-drop:hover .photo-drop__title {
  color: var(--brand-primary);
}
.photo-drop__hint {
  font-size: 0.75rem;
  max-width: 16rem;
  line-height: 1.35;
  opacity: 0.85;
}
.photo-drop__busy {
  font-size: 0.9rem;
  font-weight: 650;
  color: var(--brand-primary);
}
.photo-drop__img {
  width: 100%;
  height: 10rem;
  object-fit: cover;
  display: block;
}
.photo-drop__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.15rem;
  background: color-mix(in srgb, #0f172a 55%, transparent);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.photo-drop__overlay strong {
  font-size: 0.95rem;
}
.photo-drop__overlay em {
  font-style: normal;
  font-size: 0.75rem;
  opacity: 0.9;
}
.photo-drop.has:hover .photo-drop__overlay {
  opacity: 1;
}
.photo-actions {
  display: flex;
  justify-content: flex-start;
}
.photo-url {
  border-radius: 0.65rem;
  border: 1px solid var(--line);
  background: var(--panel);
  padding: 0.35rem 0.65rem 0.55rem;
}
.photo-url summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--ink-soft);
  padding: 0.25rem 0;
  user-select: none;
}
.photo-url[open] summary {
  margin-bottom: 0.35rem;
  color: var(--ink);
}
.photo-url input[type='url'] {
  width: 100%;
}
.photo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.photo-row input[type='url'] {
  flex: 1 1 12rem;
  min-width: 0;
}
.file-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.photo-preview {
  width: 100%;
  max-width: 16rem;
  border-radius: 0.65rem;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--panel-2);
}
.photo-preview img {
  width: 100%;
  height: 9rem;
  object-fit: cover;
  display: block;
}
.icon-field {
  display: grid;
  gap: 0.35rem;
}
.icon-field__label {
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.icon-pick {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background: var(--panel);
  color: var(--ink);
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}
.icon-pick.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
  color: var(--brand-primary);
}
.empty {
  color: var(--ink-soft);
  padding: 1rem;
  border: 1px dashed var(--line-2);
  border-radius: 0.75rem;
  text-align: center;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.35rem 0 0;
}
.chips span {
  font-size: 0.7rem;
  background: var(--panel-2);
  color: var(--ink);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}
.row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
}
.btn-ghost {
  background: var(--panel);
  color: var(--brand-primary);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
}
.btn-icon {
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: inline-grid;
  place-items: center;
  background: var(--panel);
  color: var(--ink-soft);
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  cursor: pointer;
}
.btn-icon:hover:not(:disabled) {
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
}
.btn-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.form {
  display: grid;
  gap: 0.65rem;
  max-width: 480px;
}
.form.wide {
  max-width: 520px;
}
.form label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.form input,
.form select {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.45rem 0.6rem;
}
.check {
  display: flex !important;
  align-items: center;
  gap: 0.45rem;
}
.check-block {
  align-items: flex-start !important;
}
.check-block input {
  margin-top: 0.2rem;
}
.check-title {
  display: block;
  font-size: 0.9rem;
  color: var(--ink);
  font-weight: 600;
}
.check-hint {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--ink-soft);
  line-height: 1.35;
  font-weight: 400;
}
.disable-options {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.75rem 0.85rem;
  display: grid;
  gap: 0.65rem;
  margin: 0;
}
.disable-options legend {
  padding: 0 0.25rem;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--ink);
}
.filters-collapse {
  margin-bottom: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel-2);
  overflow: hidden;
}
.filters-collapse > summary {
  cursor: pointer;
  list-style: none;
  padding: 0.7rem 0.9rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  user-select: none;
}
.filters-collapse > summary::-webkit-details-marker {
  display: none;
}
.filters-collapse > summary::before {
  content: '▸';
  color: var(--ink-soft);
  font-size: 0.8rem;
}
.filters-collapse[open] > summary::before {
  content: '▾';
}
.filters-collapse__badge {
  font-style: normal;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--line));
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  margin-left: auto;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filters-collapse__body {
  padding: 0 0.9rem 0.9rem;
  display: grid;
  gap: 0.55rem;
}
.filters-combos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.filters-combos select {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: var(--panel);
  color: var(--ink);
}
.filters-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  min-width: 0;
}
.ai-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 0.75rem;
}
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.32rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
  line-height: 1.2;
  max-width: 100%;
}
.quick-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 9rem;
}
.quick-chip__n {
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 1.1rem;
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
}
.quick-chip:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  color: var(--brand-primary);
}
.quick-chip.on {
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--line));
  color: var(--brand-primary);
  font-weight: 650;
}
.quick-chip.on .quick-chip__n {
  background: color-mix(in srgb, var(--brand-primary) 18%, var(--panel));
  color: var(--brand-primary);
}
.asset-grid {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.9rem;
}
.asset-grid__empty {
  grid-column: 1 / -1;
  border: 1px dashed var(--line);
  border-radius: 0.85rem;
  padding: 1.25rem;
  text-align: center;
  color: var(--ink-soft);
  background: var(--panel-2);
}
.asset-tile {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 1rem;
  overflow: hidden;
  background: var(--panel);
  min-width: 0;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.asset-tile:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}
.asset-tile.off {
  opacity: 0.72;
}
.asset-tile__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--panel-2);
  overflow: hidden;
}
.asset-tile__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.asset-tile__ph {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: color-mix(in srgb, var(--brand-primary) 55%, var(--ink-soft));
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--brand-primary) 12%, var(--panel-2)),
      var(--panel-2)
    );
}
.asset-tile__type {
  position: absolute;
  left: 0.65rem;
  bottom: 0.65rem;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: var(--brand-primary);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 25%, var(--line));
  display: grid;
  place-items: center;
  backdrop-filter: blur(4px);
}
.asset-tile__status {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0.22rem 0.5rem;
  border-radius: 999px;
  border: 1px solid transparent;
}
.asset-tile__status.on {
  background: color-mix(in srgb, #16a34a 16%, var(--panel));
  color: #15803d;
  border-color: color-mix(in srgb, #16a34a 35%, transparent);
}
.asset-tile__status.off {
  background: color-mix(in srgb, #94a3b8 18%, var(--panel));
  color: #475569;
  border-color: color-mix(in srgb, #94a3b8 40%, transparent);
}
.asset-tile__body {
  display: grid;
  gap: 0.45rem;
  padding: 0.85rem 0.9rem 0.55rem;
  flex: 1;
  min-width: 0;
}
.asset-tile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
.asset-tile__name {
  font-size: 0.98rem;
  font-weight: 750;
  line-height: 1.25;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.asset-tile__code {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 0.15rem 0.4rem;
  border-radius: 0.35rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  max-width: 6.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-tile__type-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-primary);
}
.asset-tile__desc {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.asset-tile__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.meta-chip {
  font-size: 0.72rem;
  line-height: 1.2;
  padding: 0.22rem 0.45rem;
  border-radius: 0.4rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-tile__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.flag-chip {
  font-size: 0.68rem;
  font-weight: 650;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 10%, var(--panel));
  color: var(--brand-primary);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--line));
}
.asset-tile__body .attr-icons {
  margin-top: 0.15rem;
}
.asset-tile__foot {
  padding: 0.55rem 0.9rem 0.9rem;
  margin-top: auto;
  display: flex;
  gap: 0.45rem;
}
.asset-tile__action {
  flex: 1;
  height: 2.4rem;
  width: auto;
}
.asset-tile__action.warn:hover:not(:disabled) {
  color: #b45309;
  border-color: color-mix(in srgb, #b45309 40%, var(--line));
}
.asset-tile__action.okish:hover:not(:disabled) {
  color: #15803d;
  border-color: color-mix(in srgb, #15803d 40%, var(--line));
}
.attr-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.attr-ico {
  min-width: 1.55rem;
  height: 1.55rem;
  padding: 0 0.3rem;
  border-radius: 0.4rem;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink);
  display: inline-grid;
  place-items: center;
  font-size: 0.78rem;
  line-height: 1;
  cursor: default;
}
.attr-ico.texty {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.attr-empty {
  margin: 0;
  font-size: 0.78rem;
}
.err {
  color: var(--bad);
}
.ok {
  color: var(--brand-primary);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 1rem;
}
.modal-stack {
  z-index: 70;
}
.modal-card {
  background: var(--panel);
  border-radius: 0.85rem;
  padding: 1rem;
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
}
.modal-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.asset-modal {
  align-items: stretch;
  justify-items: stretch;
  padding: 0.75rem 1rem;
}
.asset-editor {
  width: min(1380px, calc(100vw - 1.5rem));
  max-width: 100%;
  height: min(900px, 94vh);
  max-height: 94vh;
  margin: 0 auto;
  background: var(--panel);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
}
.asset-editor__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--line);
}
.asset-editor__head h2 {
  margin: 0;
  font-size: 1.15rem;
}
.icon-x {
  font-size: 1.35rem;
  line-height: 1;
  padding: 0.15rem 0.55rem;
}
.asset-editor__body {
  flex: 1;
  min-height: 0;
  display: grid;
  /* Nav con ancho fijo: evita solape del layout % 20/80 en pantallas intermedias */
  grid-template-columns: 13.5rem minmax(0, 1fr);
}
.asset-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-right: 1px solid var(--line);
  background: var(--panel-2);
  overflow: auto;
  min-width: 0;
}
.asset-nav__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-nav__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 0.55rem;
  padding: 0.65rem 0.7rem;
  color: var(--ink-soft);
  font-size: 0.88rem;
  cursor: pointer;
  min-width: 0;
}
.asset-nav__item:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.asset-nav__item.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--panel));
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--line));
  font-weight: 600;
}
.asset-nav__mark {
  font-style: normal;
  font-size: 0.75rem;
  color: #16a34a;
}
.asset-nav__mark.miss {
  color: #d97706;
}
.asset-panel {
  min-width: 0;
  overflow: auto;
  padding: 1.1rem 1.5rem 1.35rem;
  display: grid;
  gap: 0.75rem;
  align-content: start;
}
.asset-panel__title {
  margin: 0 0 0.15rem;
  font-size: 1rem;
}
.asset-editor__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.85rem 1.1rem;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.foot-hint {
  margin: 0;
  flex: 1 1 12rem;
}
.foot-spacer {
  flex: 1;
}
.foot-actions {
  margin-left: auto;
}
@media (max-width: 900px) {
  .asset-editor__body {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .asset-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid var(--line);
  }
  .asset-nav__item {
    flex: 1 1 auto;
  }
  .asset-nav__label {
    white-space: normal;
  }
}
.attr-box {
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  padding: 0.65rem;
  display: grid;
  gap: 0.45rem;
}
.attr-box legend {
  font-size: 0.8rem;
  color: var(--ink-soft);
  padding: 0 0.25rem;
}
.compose-block {
  display: grid;
  gap: 0.5rem;
  margin: 0.5rem 0 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  background: var(--panel-2);
}
.compose-block > strong {
  font-size: 0.85rem;
}
.audience-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.audience-modes .mode {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.audience-modes .mode.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--panel));
  color: var(--brand-primary);
  font-weight: 600;
}
.q-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.rv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
}
</style>
