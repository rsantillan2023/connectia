<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Flujos de Aprobación</h1>
        <p>
          Diseñá flujos de aprobación en pasos. Quién aprueba no es el nombre del paso ni el área sola:
          se elige por permiso en <strong>Usuarios</strong>, por <strong>área de Organización</strong>,
          por rol, o personas concretas.
        </p>
        <ScreenHelp
          purpose="Motor transversal (§41): conecta solicitudes y documentos sin reemplazar esos módulos."
          can-do="Crear un flujo de trabajo a mano o con IA, editar pasos, activar/pausar y ver instancias. El humano siempre confirma el borrador."
        />
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="btn-ghost"
          :disabled="loading || instLoading"
          @click="tab === 'inst' ? loadInstances() : load()"
        >
          Actualizar
        </button>
        <button type="button" class="btn-primary" @click="openCreateChooser">Crear flujo de trabajo</button>
      </div>
    </header>

    <details v-if="examples.length" class="use-cases" aria-label="Casos de uso de ejemplo">
      <summary class="use-cases-summary">
        <span>
          <strong>Casos de uso de ejemplo</strong>
          <small>Vacaciones, acceso a sistemas, publicar documento</small>
        </span>
        <span class="use-cases-chevron" aria-hidden="true">▾</span>
      </summary>
      <div class="use-cases-body">
        <p>
          Tocá uno para armar el borrador y entender el flujo. Después lo revisás y guardás.
          <span v-if="!aiConfigured"> Funciona sin API de IA.</span>
        </p>
        <div class="examples page-examples">
          <button
            v-for="ex in examples"
            :key="ex.id"
            type="button"
            class="ex-card"
            :disabled="aiBusy"
            @click="openAiWithExample(ex)"
          >
            <span class="ex-emoji" aria-hidden="true">{{ ex.emoji }}</span>
            <span class="ex-text">
              <strong>{{ ex.title }}</strong>
              <small>{{ ex.subtitle }}</small>
              <small v-if="ex.rolesLine" class="ex-roles">{{ ex.rolesLine }}</small>
            </span>
          </button>
        </div>
      </div>
    </details>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <section class="filters">
      <span class="tab-with-info">
        <button type="button" class="btn-ghost" :class="{ on: tab === 'defs' }" @click="switchTab('defs')">
          Flujos
        </button>
        <button
          type="button"
          class="info-i"
          title="¿Qué son los flujos?"
          aria-label="Explicar qué son los flujos"
          :aria-expanded="tabHelp === 'defs'"
          @click.stop="toggleTabHelp('defs')"
        >
          i
        </button>
      </span>
      <span class="tab-with-info">
        <button type="button" class="btn-ghost" :class="{ on: tab === 'inst' }" @click="switchTab('inst')">
          Instancias
        </button>
        <button
          type="button"
          class="info-i"
          title="¿Qué son las instancias?"
          aria-label="Explicar qué son las instancias"
          :aria-expanded="tabHelp === 'inst'"
          @click.stop="toggleTabHelp('inst')"
        >
          i
        </button>
      </span>

      <span class="filters-sep" aria-hidden="true"></span>

      <template v-if="tab === 'defs'">
        <input
          v-model="q"
          class="input grow"
          type="search"
          placeholder="Buscar por nombre, tipo…"
          @input="onSearchDefs"
        />
        <select v-model="activoFilter" class="input" @change="load">
          <option value="">Estado: todos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo pausados</option>
        </select>
        <select v-model="moduleFilter" class="input">
          <option value="">Módulo: todos</option>
          <option v-for="m in meta.modules" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </template>
      <template v-else>
        <input
          v-model="instQ"
          class="input grow"
          type="search"
          placeholder="Buscar trámite, flujo, solicitante…"
        />
        <select v-model="instStatus" class="input" @change="loadInstances">
          <option value="">Estado: todos</option>
          <option value="en_curso">En curso</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select v-model="instModule" class="input">
          <option value="">Módulo: todos</option>
          <option v-for="m in meta.modules" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </template>

      <div class="view-toggle" role="group" aria-label="Vista">
        <button
          type="button"
          class="view-btn"
          :class="{ on: viewMode === 'cards' }"
          title="Vista cards"
          aria-label="Vista cards"
          :aria-pressed="viewMode === 'cards'"
          @click="setViewMode('cards')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 5h16v6H4zM4 13h16v6H4z" />
          </svg>
        </button>
        <button
          type="button"
          class="view-btn"
          :class="{ on: viewMode === 'table' }"
          title="Vista grilla"
          aria-label="Vista grilla"
          :aria-pressed="viewMode === 'table'"
          @click="setViewMode('table')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16" />
          </svg>
        </button>
      </div>
    </section>

    <p v-if="tabHelp === 'defs'" class="tab-help" role="status">
      <strong>Flujos.</strong>
      Son las plantillas de aprobación que configurás (pasos, quién aprueba, módulo/tipo que las dispara).
      Acá las creás, editás, activás o pausás.
    </p>
    <p v-else-if="tabHelp === 'inst'" class="tab-help" role="status">
      <strong>Instancias.</strong>
      Son los trámites en curso o cerrados. Abrí el detalle para ver pasos e historial. Si el trámite
      está pendiente, desde acá podés aprobar o rechazar (gestores de flujos / admin).
    </p>

    <template v-if="tab === 'defs'">
      <p v-if="loading && !items.length" class="muted">Cargando…</p>
      <p v-else-if="!displayedDefs.length" class="muted empty-hint">
        <template v-if="items.length">Ningún flujo coincide con los filtros.</template>
        <template v-else>
          Todavía no hay flujos. Tocá <strong>Crear flujo de trabajo</strong> o un caso de uso de ejemplo.
        </template>
      </p>

      <ul v-else-if="viewMode === 'cards'" class="list">
        <li v-for="w in displayedDefs" :key="w.id" class="card">
          <div class="card-main">
            <div class="card-top">
              <strong>{{ w.name }}</strong>
              <span class="badge" :data-on="w.activo ? '1' : '0'">{{ w.activo ? 'Activo' : 'Pausado' }}</span>
              <span class="badge tipo">{{ moduleLabel(w.trigger?.module) }}</span>
            </div>
            <p v-if="w.description" class="body">{{ w.description }}</p>
            <ol class="steps-preview">
              <li v-for="s in w.steps" :key="s.orden">
                <span class="n">{{ s.orden }}</span>
                <div class="step-line">
                  <span class="step-name">{{ s.nombre }}</span>
                  <span class="step-who">{{ whoApprovesShort(s) }}</span>
                  <em v-if="s.condition">· {{ s.condition }}</em>
                  <span class="step-holders">{{ holdersLine(s) }}</span>
                </div>
              </li>
            </ol>
            <p class="meta">
              {{ w.steps?.length || 0 }} paso(s)
              <span v-if="w.trigger?.tipoKey"> · tipo {{ w.trigger.tipoKey }}</span>
            </p>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-primary sm" @click="editOne(w)">Editar</button>
            <button type="button" class="btn-ghost sm" :disabled="busyId === w.id" @click="toggleActivo(w)">
              {{ w.activo ? 'Pausar' : 'Activar' }}
            </button>
            <button type="button" class="btn-ghost sm danger" :disabled="busyId === w.id" @click="removeOne(w)">
              Borrar
            </button>
          </div>
        </li>
      </ul>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('name')">
                  Nombre{{ sortMark(sortDefs, 'name') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('module')">
                  Módulo{{ sortMark(sortDefs, 'module') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('tipoKey')">
                  Tipo{{ sortMark(sortDefs, 'tipoKey') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('steps')">
                  Pasos{{ sortMark(sortDefs, 'steps') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('activo')">
                  Estado{{ sortMark(sortDefs, 'activo') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortDefs('updatedAt')">
                  Actualizado{{ sortMark(sortDefs, 'updatedAt') }}
                </button>
              </th>
              <th class="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in displayedDefs" :key="w.id">
              <td>
                <strong class="cell-title">{{ w.name }}</strong>
                <span v-if="w.description" class="cell-sub">{{ w.description }}</span>
              </td>
              <td>{{ moduleLabel(w.trigger?.module) }}</td>
              <td>{{ w.trigger?.tipoKey || '—' }}</td>
              <td>{{ w.steps?.length || 0 }}</td>
              <td>
                <span class="badge" :data-on="w.activo ? '1' : '0'">{{ w.activo ? 'Activo' : 'Pausado' }}</span>
              </td>
              <td>{{ formatDate(w.updatedAt) }}</td>
              <td class="td-actions">
                <button type="button" class="btn-primary sm" @click="editOne(w)">Editar</button>
                <button type="button" class="btn-ghost sm" :disabled="busyId === w.id" @click="toggleActivo(w)">
                  {{ w.activo ? 'Pausar' : 'Activar' }}
                </button>
                <button type="button" class="btn-ghost sm danger" :disabled="busyId === w.id" @click="removeOne(w)">
                  Borrar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="table-foot">{{ displayedDefs.length }} flujo{{ displayedDefs.length === 1 ? '' : 's' }}</p>
      </div>
    </template>

    <template v-else>
      <p v-if="instLoading && !instances.length" class="muted">Cargando instancias…</p>
      <p v-else-if="!displayedInsts.length" class="muted">
        <template v-if="instances.length">Ninguna instancia coincide con los filtros.</template>
        <template v-else>No hay trámites todavía.</template>
      </p>

      <ul v-else-if="viewMode === 'cards'" class="list">
        <li v-for="a in displayedInsts" :key="a.id" class="card">
          <button type="button" class="card-main card-main-btn" @click="openInstDetail(a)">
            <div class="card-top">
              <strong>{{ a.origen?.titulo || a.definitionName }}</strong>
              <span class="badge status" :data-st="a.status">{{ statusLabel(a.status) }}</span>
            </div>
            <p class="meta">
              {{ a.definitionName }} · {{ a.origen?.moduleLabel }}
              <span v-if="a.origen?.codigo"> · {{ a.origen.codigo }}</span>
              <span v-if="a.currentStep">
                · paso: {{ a.currentStep.nombre }}
                <span class="step-who-inline" :title="whoApprovesTech(a.currentStep)">
                  ({{ whoApprovesShort(a.currentStep) }})
                </span>
              </span>
              · {{ a.solicitanteName }}
            </p>
            <p v-if="a.origenDetalle?.tipoNombre" class="meta soft">
              {{ a.origenDetalle.tipoNombre }}
              <span v-if="a.origenDetalle.area"> · {{ a.origenDetalle.area }}</span>
            </p>
            <p v-if="a.origenDetalle?.cuerpo" class="inst-snippet">{{ snippetText(a.origenDetalle.cuerpo) }}</p>
            <dl v-if="previewCampos(a).length" class="inst-facts">
              <div v-for="c in previewCampos(a)" :key="c.key" class="inst-fact">
                <dt>{{ c.label }}</dt>
                <dd>{{ c.value }}</dd>
              </div>
            </dl>
            <p class="meta dates-row">
              <span v-if="a.origenDetalle?.createdAt">Creado {{ formatDate(a.origenDetalle.createdAt) }}</span>
              <span> · Act. {{ formatDate(a.updatedAt || a.createdAt) }}</span>
            </p>
            <p v-if="a.canDecide" class="meta action-hint">Podés decidir este paso desde acá.</p>
          </button>
          <div class="card-actions">
            <button type="button" class="btn-primary sm" @click="openInstDetail(a)">Ver detalle</button>
            <template v-if="a.canDecide">
              <button type="button" class="btn-ghost sm" :disabled="instBusyId === a.id" @click="quickDecide(a, 'rechazar')">
                Rechazar
              </button>
              <button type="button" class="btn-primary sm" :disabled="instBusyId === a.id" @click="quickDecide(a, 'aprobar')">
                Aprobar
              </button>
            </template>
          </div>
        </li>
      </ul>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('titulo')">
                  Trámite{{ sortMark(sortInst, 'titulo') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('flujo')">
                  Flujo{{ sortMark(sortInst, 'flujo') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('module')">
                  Módulo{{ sortMark(sortInst, 'module') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('status')">
                  Estado{{ sortMark(sortInst, 'status') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('paso')">
                  Paso actual{{ sortMark(sortInst, 'paso') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('solicitante')">
                  Solicitante{{ sortMark(sortInst, 'solicitante') }}
                </button>
              </th>
              <th>
                <button type="button" class="th-sort" @click="toggleSortInst('updatedAt')">
                  Actualizado{{ sortMark(sortInst, 'updatedAt') }}
                </button>
              </th>
              <th class="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in displayedInsts" :key="a.id">
              <td>
                <button type="button" class="cell-link" @click="openInstDetail(a)">
                  <strong class="cell-title">{{ a.origen?.titulo || a.definitionName }}</strong>
                  <span v-if="a.origen?.codigo" class="cell-sub">{{ a.origen.codigo }}</span>
                  <span v-if="a.origenDetalle?.cuerpo" class="cell-sub">{{ snippetText(a.origenDetalle.cuerpo, 80) }}</span>
                  <span v-for="c in previewCampos(a).slice(0, 2)" :key="c.key" class="cell-sub">
                    {{ c.label }}: {{ c.value }}
                  </span>
                </button>
              </td>
              <td>{{ a.definitionName || '—' }}</td>
              <td>{{ a.origen?.moduleLabel || moduleLabel(a.origen?.module) }}</td>
              <td>
                <span class="badge status" :data-st="a.status">{{ statusLabel(a.status) }}</span>
              </td>
              <td>{{ a.currentStep?.nombre || '—' }}</td>
              <td>{{ a.solicitanteName || '—' }}</td>
              <td>
                <span>{{ formatDate(a.updatedAt || a.createdAt) }}</span>
                <span v-if="a.origenDetalle?.createdAt" class="cell-sub">Creado {{ formatDate(a.origenDetalle.createdAt) }}</span>
              </td>
              <td class="td-actions">
                <button type="button" class="btn-ghost sm" @click="openInstDetail(a)">Detalle</button>
                <template v-if="a.canDecide">
                  <button type="button" class="btn-ghost sm danger" :disabled="instBusyId === a.id" @click="quickDecide(a, 'rechazar')">
                    Rechazar
                  </button>
                  <button type="button" class="btn-primary sm" :disabled="instBusyId === a.id" @click="quickDecide(a, 'aprobar')">
                    Aprobar
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="table-foot">{{ displayedInsts.length }} instancia{{ displayedInsts.length === 1 ? '' : 's' }}</p>
      </div>
    </template>

    <!-- Detalle instancia -->
    <div v-if="instDetail" class="modal-backdrop" @click.self="closeInstDetail">
      <div class="modal inst-modal" role="dialog" aria-modal="true" aria-labelledby="inst-detail-title">
        <header class="modal-head">
          <div>
            <h2 id="inst-detail-title">{{ instDetail.origen?.titulo || instDetail.definitionName }}</h2>
            <p class="sub">
              {{ instDetail.definitionName }}
              <span v-if="instDetail.origen?.codigo"> · {{ instDetail.origen.codigo }}</span>
              · {{ statusLabel(instDetail.status) }}
            </p>
          </div>
          <button type="button" class="btn-ghost sm" @click="closeInstDetail">Cerrar</button>
        </header>

        <div class="inst-detail-body">
          <section class="inst-block">
            <h3>Resumen</h3>
            <dl class="inst-dl">
              <div><dt>Solicitante</dt><dd>{{ instDetail.solicitanteName || '—' }}</dd></div>
              <div><dt>Módulo</dt><dd>{{ instDetail.origen?.moduleLabel || '—' }}</dd></div>
              <div><dt>Tipo</dt><dd>{{ instDetail.origenDetalle?.tipoNombre || instDetail.origen?.tipoKey || '—' }}</dd></div>
              <div><dt>Área</dt><dd>{{ instDetail.origenDetalle?.area || '—' }}</dd></div>
              <div><dt>Creado</dt><dd>{{ formatDate(instDetail.origenDetalle?.createdAt || instDetail.createdAt) }}</dd></div>
              <div><dt>Actualizado</dt><dd>{{ formatDate(instDetail.updatedAt || instDetail.createdAt) }}</dd></div>
            </dl>
          </section>

          <section v-if="instDetail.origenDetalle" class="inst-block">
            <h3>Datos del pedido</h3>
            <p v-if="instDetail.origenDetalle.cuerpo" class="inst-origin-body">{{ instDetail.origenDetalle.cuerpo }}</p>
            <dl v-if="instDetail.origenDetalle.campos?.length" class="inst-facts sheet">
              <div v-for="c in instDetail.origenDetalle.campos" :key="c.key" class="inst-fact">
                <dt>{{ c.label }}</dt>
                <dd>{{ c.value }}</dd>
              </div>
            </dl>
            <p v-else-if="!instDetail.origenDetalle.cuerpo" class="meta soft">Sin campos adicionales.</p>
          </section>

          <section class="inst-block">
            <h3>Pasos</h3>
            <ol class="inst-steps">
              <li
                v-for="(s, i) in instDetail.steps || []"
                :key="i"
                :class="{
                  done: i < instDetail.stepIndex || instDetail.status === 'aprobado',
                  current: i === instDetail.stepIndex && ['en_curso', 'pendiente'].includes(instDetail.status),
                  rejected: instDetail.status === 'rechazado' && i === instDetail.stepIndex,
                }"
              >
                <span class="n">{{ i + 1 }}</span>
                <div>
                  <strong>{{ s.nombre }}</strong>
                  <p class="step-who-line" :title="whoApprovesTech(s)">{{ whoApprovesShort(s) }}</p>
                  <p v-if="s.condition" class="cond">{{ s.condition }}</p>
                  <p v-if="i === instDetail.stepIndex && ['en_curso', 'pendiente'].includes(instDetail.status)" class="now">
                    ← Acá está el trámite ahora
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section v-if="instDetail.history?.length" class="inst-block">
            <h3>Historial</h3>
            <ul class="inst-hist">
              <li v-for="(h, i) in instDetail.history" :key="i">
                <strong>{{ decisionLabel(h.decision) }}</strong>
                · {{ h.actorName || '—' }}
                <span v-if="h.pasoNombre"> · {{ h.pasoNombre }}</span>
                <time>{{ formatDate(h.at) }}</time>
                <p v-if="h.comentario">{{ h.comentario }}</p>
              </li>
            </ul>
          </section>

          <section v-if="instDetail.canDecide" class="inst-block decide-block">
            <h3>Decidir este paso</h3>
            <p class="pane-lead">
              Paso actual:
              <strong>{{ instDetail.currentStep?.nombre || '—' }}</strong>
            </p>
            <label class="lbl full">Comentario (opcional)
              <textarea v-model="instComment" class="input" rows="2" maxlength="500" placeholder="Motivo o nota para el historial…" />
            </label>
          </section>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn-ghost" @click="closeInstDetail">Cerrar</button>
          <template v-if="instDetail.canDecide">
            <button
              type="button"
              class="btn-ghost danger"
              :disabled="instBusyId === instDetail.id"
              @click="decideFromDetail('rechazar')"
            >
              Rechazar
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="instBusyId === instDetail.id"
              @click="decideFromDetail('aprobar')"
            >
              {{ instBusyId === instDetail.id ? 'Guardando…' : 'Aprobar' }}
            </button>
          </template>
        </footer>
      </div>
    </div>

    <!-- Modal elegir cómo crear -->
    <div v-if="chooserOpen" class="modal-backdrop" @click.self="closeChooser">
      <div class="modal chooser-modal" role="dialog" aria-modal="true" aria-labelledby="chooser-title">
        <header class="modal-head">
          <div>
            <h2 id="chooser-title">Crear flujo de trabajo</h2>
            <p class="sub">Elegí cómo querés empezar. En ambos casos revisás y guardás vos.</p>
          </div>
          <button type="button" class="btn-ghost sm" @click="closeChooser">Cerrar</button>
        </header>

        <div class="chooser-grid">
          <button type="button" class="chooser-card" @click="chooseManual">
            <span class="chooser-badge">Manual</span>
            <strong>Armarlo paso a paso</strong>
            <p>
              Definís vos el nombre, el módulo que lo dispara (solicitudes o documentos) y cada paso de
              aprobación: quién aprueba, SLA y condiciones.
            </p>
            <span class="chooser-cta">Continuar manual →</span>
          </button>

          <button type="button" class="chooser-card chooser-ai" @click="chooseAi">
            <span class="chooser-badge ai">Con IA</span>
            <strong>Describir el caso de uso</strong>
            <p>
              Contás el trámite en lenguaje natural (o usás un ejemplo: vacaciones, acceso, documento).
              La IA arma un borrador de pasos; vos lo editás antes de publicar.
              <span v-if="!aiConfigured"> Los 3 ejemplos funcionan sin API de IA.</span>
            </p>
            <span class="chooser-cta">Continuar con IA →</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal diseñador -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div>
            <h2>
              {{
                form.id
                  ? 'Editar flujo de trabajo'
                  : aiMode
                    ? 'Nuevo flujo · con IA'
                    : 'Nuevo flujo · manual'
              }}
            </h2>
            <p class="sub">Pasos lineales · revisá antes de guardar</p>
          </div>
          <button type="button" class="btn-ghost sm" @click="closeModal">Cerrar</button>
        </header>

        <div class="wizard">
          <nav class="wizard-nav" aria-label="Pasos del diseñador">
            <button
              v-if="aiMode && !form.id"
              type="button"
              class="wiz-item"
              :class="{ active: pane === 'ia' }"
              @click="pane = 'ia'"
            >
              1. Caso de uso
            </button>
            <button type="button" class="wiz-item" :class="{ active: pane === 'info' }" @click="pane = 'info'">
              {{ aiMode && !form.id ? '2' : '1' }}. Info
            </button>
            <button type="button" class="wiz-item" :class="{ active: pane === 'pasos' }" @click="pane = 'pasos'">
              {{ aiMode && !form.id ? '3' : '2' }}. Pasos
            </button>
          </nav>

          <div class="wizard-pane">
            <!-- IA -->
            <section v-if="pane === 'ia' && aiMode && !form.id" class="pane">
              <h3 class="pane-title">Describí el caso de uso</h3>
              <p class="pane-lead">
                Elegí un ejemplo o escribí el tuyo. La IA arma un borrador; vos lo revisás y publicás.
              </p>

              <div class="examples">
                <button
                  v-for="ex in examples"
                  :key="ex.id"
                  type="button"
                  class="ex-card"
                  :class="{ selected: selectedExample === ex.id }"
                  @click="applyExample(ex)"
                >
                  <span class="ex-emoji" aria-hidden="true">{{ ex.emoji }}</span>
                  <span class="ex-text">
                    <strong>{{ ex.title }}</strong>
                    <small>{{ ex.subtitle }}</small>
                    <small v-if="ex.rolesLine" class="ex-roles">{{ ex.rolesLine }}</small>
                  </span>
                </button>
              </div>

              <label class="lbl">Prompt
                <textarea
                  v-model="aiPrompt"
                  class="input"
                  rows="5"
                  placeholder="Ej. Pedido de vacaciones: líder aprueba; si son más de 10 días, también RRHH…"
                />
              </label>
              <button
                type="button"
                class="btn-primary"
                :disabled="aiBusy || aiPrompt.trim().length < 8"
                @click="runAi"
              >
                {{ aiBusy ? 'Generando borrador…' : 'Completar formulario con IA' }}
              </button>
              <p v-if="aiNotes" class="muted small">{{ aiNotes }}</p>
            </section>

            <!-- Info -->
            <section v-if="pane === 'info'" class="pane">
              <h3 class="pane-title">Datos del flujo</h3>
              <div class="form-grid">
                <label class="lbl full">Nombre
                  <input v-model="form.name" class="input" maxlength="120" />
                </label>
                <label class="lbl full">Descripción
                  <textarea v-model="form.description" class="input" rows="3" />
                </label>

                <div class="lbl full field-help-block">
                  <div class="field-label-row">
                    <span>Módulo origen</span>
                    <button
                      type="button"
                      class="info-i"
                      title="¿Qué es el módulo origen?"
                      aria-label="Explicar módulo origen"
                      :aria-expanded="moduleHelpOpen"
                      @click="moduleHelpOpen = !moduleHelpOpen"
                    >
                      i
                    </button>
                  </div>
                  <select v-model="form.trigger.module" class="input">
                    <option v-for="m in meta.modules" :key="m.id" :value="m.id">{{ m.label }}</option>
                  </select>
                  <p v-if="selectedModuleMeta?.hint" class="field-hint">
                    {{ selectedModuleMeta.hint }}
                  </p>
                  <div v-if="moduleHelpOpen" class="field-help" role="status">
                    <p>
                      <strong>Módulo origen</strong> indica de qué parte de Connectia nace el trámite cuando
                      alguien crea algo que debe aprobarse. El flujo solo se dispara solo si ese módulo está
                      cableado al motor.
                    </p>
                    <ul>
                      <li v-for="m in meta.modules" :key="'help-' + m.id">
                        <strong>{{ m.label }}.</strong>
                        {{ m.hint || '' }}
                        <em v-if="m.wired === false"> (sin disparo automático hoy)</em>
                      </li>
                    </ul>
                    <p v-if="meta.modulesNote" class="field-help-note">{{ meta.modulesNote }}</p>
                  </div>
                </div>

                <div class="lbl full field-help-block">
                  <div class="field-label-row">
                    <span>Tipo (opcional)</span>
                  </div>

                  <select
                    v-if="tipoOptionsMode === 'select'"
                    v-model="form.trigger.tipoKey"
                    class="input"
                  >
                    <option value="">Cualquier tipo</option>
                    <option
                      v-for="opt in tipoOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                    <option
                      v-if="orphanTipoKey"
                      :value="orphanTipoKey"
                    >
                      {{ orphanTipoKey }} (no está en el catálogo)
                    </option>
                  </select>
                  <input
                    v-else
                    v-model="form.trigger.tipoKey"
                    class="input"
                    :placeholder="tipoPlaceholder"
                    maxlength="80"
                  />

                  <span class="field-hint">
                    <template v-if="form.trigger.module === 'solicitudes'">
                      Son las <strong>Plantillas</strong> de solicitud (Admin → Plantillas).
                      Vacío = el flujo aplica a cualquier plantilla.
                      <RouterLink v-if="selectedModuleMeta?.tipoUi" class="inline-link" :to="selectedModuleMeta.tipoUi">
                        Configurar plantillas
                      </RouterLink>
                    </template>
                    <template v-else-if="form.trigger.module === 'documentos'">
                      Es la <strong>categoría/carpeta</strong> del documento. Vacío = cualquier categoría.
                      Se listan las ya usadas en Documentos.
                    </template>
                    <template v-else>
                      Clave libre opcional. Genérico no dispara solo desde otro módulo.
                    </template>
                  </span>
                  <p
                    v-if="form.trigger.module === 'solicitudes' && !meta.requestTypes.length"
                    class="field-hint warn"
                  >
                    No hay plantillas activas. Creá alguna en
                    <RouterLink class="inline-link" to="/tipos-solicitud">Plantillas</RouterLink>.
                  </p>
                </div>

                <label class="chk full">
                  <input v-model="form.activo" type="checkbox" />
                  Flujo activo (dispara instancias nuevas)
                </label>
              </div>
              <button type="button" class="btn-ghost" @click="pane = 'pasos'">Siguiente: pasos →</button>
            </section>

            <!-- Pasos -->
            <section v-if="pane === 'pasos'" class="pane">
              <div class="pane-head-row">
                <h3 class="pane-title">Pasos de aprobación</h3>
                <button type="button" class="btn-ghost sm" @click="addStep">+ Paso</button>
              </div>
              <p class="pane-lead">
                El nombre del paso (ej. «Líder», «TI») es solo la etiqueta. Quién puede dar el OK se elige abajo:
                permiso en Usuarios, área de Organización, rol o personas. El área del organigrama no da permisos sola.
              </p>

              <ul class="step-editor">
                <li v-for="(s, idx) in form.steps" :key="idx" class="step-card">
                  <div class="step-head">
                    <span class="n">{{ idx + 1 }}</span>
                    <input v-model="s.nombre" class="input" placeholder="Nombre del paso" />
                    <button
                      type="button"
                      class="btn-ghost sm danger"
                      :disabled="form.steps.length <= 1"
                      @click="removeStep(idx)"
                    >
                      Quitar
                    </button>
                  </div>
                  <div class="step-grid">
                    <label class="lbl">Quién aprueba
                      <select v-model="s.approverType" class="input">
                        <option v-for="t in meta.approverTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                      </select>
                    </label>
                    <label v-if="s.approverType === 'capability'" class="lbl">Equipo que aprueba
                      <select v-model="s.approverValue" class="input">
                        <option v-for="c in meta.capabilities" :key="c.id" :value="c.id">{{ approverOptionLabel(c) }}</option>
                      </select>
                    </label>
                    <label v-else-if="s.approverType === 'role'" class="lbl">Rol
                      <select v-model="s.approverValue" class="input">
                        <option value="admin">Administrador</option>
                        <option value="member">Miembro</option>
                      </select>
                    </label>
                    <label v-else-if="s.approverType === 'area'" class="lbl">Área de Organización
                      <select v-model="s.approverValue" class="input">
                        <option disabled value="">Elegí un área…</option>
                        <option v-for="a in meta.areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
                      </select>
                    </label>
                    <div v-else-if="s.approverType === 'users'" class="lbl full">
                      <span>Personas que pueden aprobar</span>
                      <div class="people-pick">
                        <label v-for="p in meta.people" :key="p.id" class="people-opt">
                          <input
                            type="checkbox"
                            :value="p.id"
                            :checked="(s.userIds || []).includes(p.id)"
                            @change="toggleStepUser(s, p.id, $event.target.checked)"
                          />
                          <span>
                            {{ p.nombre }}
                            <small v-if="p.areaNombre"> · {{ p.areaNombre }}</small>
                          </span>
                        </label>
                        <p v-if="!meta.people.length" class="muted small">No hay usuarios activos. Creá personas en Usuarios.</p>
                      </div>
                    </div>
                    <label class="lbl">SLA (horas)
                      <input v-model.number="s.slaHoras" class="input" type="number" min="1" max="720" />
                    </label>
                    <label class="lbl full">Condición (opcional — se evalúa sola)
                      <input
                        v-model="s.condition"
                        class="input"
                        placeholder="Ej. Solo si supera 10 días · Solo si el sistema es crítico · Solo si es política"
                      />
                    </label>
                  </div>
                  <div class="step-plain" aria-live="polite">
                    <p class="step-plain-title">Qué significa esta regla</p>
                    <ul>
                      <li v-for="(line, li) in stepPlainLines(s, idx)" :key="li">{{ line }}</li>
                    </ul>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <p v-if="formError" class="err">{{ formError }}</p>
        <footer class="modal-foot">
          <button type="button" class="btn-ghost" @click="closeModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Publicar flujo' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const instances = ref([])
const loading = ref(false)
const instLoading = ref(false)
const error = ref('')
const toast = ref('')
const q = ref('')
const activoFilter = ref('')
const moduleFilter = ref('')
const instQ = ref('')
const instStatus = ref('')
const instModule = ref('')
const tab = ref('defs')
const tabHelp = ref('')
const viewMode = ref(localStorage.getItem('cx.wf.view') === 'table' ? 'table' : 'cards')
const busyId = ref('')
const instBusyId = ref('')
const instDetail = ref(null)
const instComment = ref('')
const modalOpen = ref(false)
const chooserOpen = ref(false)
const aiMode = ref(false)
const pane = ref('ia')
const aiConfigured = ref(false)
const aiPrompt = ref('')
const aiBusy = ref(false)
const aiNotes = ref('')
const selectedExample = ref('')
const examples = ref([])
const formError = ref('')
const saving = ref(false)
let searchTimer = null

const sortDefs = reactive({ key: 'updatedAt', dir: 'desc' })
const sortInst = reactive({ key: 'updatedAt', dir: 'desc' })

const meta = reactive({
  modules: [
    {
      id: 'solicitudes',
      label: 'Solicitudes / consultas',
      hint: 'Se dispara al crear una solicitud. El tipo opcional debe coincidir con la plantilla.',
      wired: true,
    },
    {
      id: 'documentos',
      label: 'Documentos',
      hint: 'Se dispara al crear un documento en borrador / con aprobación.',
      wired: true,
    },
    {
      id: 'generico',
      label: 'Genérico',
      hint: 'Sin enganche automático a otro módulo.',
      wired: false,
    },
  ],
  modulesNote:
    'Hoy solo solicitudes y documentos inician instancias solas. Encuestas, publicaciones u otros pueden sumarse después.',
  requestTypes: [],
  docCategories: [],
  areas: [],
  people: [],
  approverNote: '',
  approverTypes: [
    { id: 'capability', label: 'Por equipo / función (permiso en Usuarios)' },
    { id: 'role', label: 'Por rol' },
    { id: 'area', label: 'Por área de Organización' },
    { id: 'users', label: 'Personas' },
  ],
  capabilities: [],
})

const moduleHelpOpen = ref(false)

const selectedModuleMeta = computed(() =>
  meta.modules.find((m) => m.id === form.trigger.module) || null,
)

const tipoPlaceholder = computed(() => {
  if (form.trigger.module === 'documentos') return 'categoría (opcional)…'
  if (form.trigger.module === 'generico') return 'clave opcional…'
  return 'ej. rrhh, sistemas…'
})

const tipoOptions = computed(() => {
  if (form.trigger.module === 'solicitudes') {
    return meta.requestTypes.map((t) => ({
      value: t.key,
      label: t.area ? `${t.nombre} (${t.key}) · ${t.area}` : `${t.nombre} (${t.key})`,
    }))
  }
  if (form.trigger.module === 'documentos') {
    return meta.docCategories.map((c) => ({ value: c, label: c }))
  }
  return []
})

const tipoOptionsMode = computed(() => {
  if (form.trigger.module === 'solicitudes') return 'select'
  if (form.trigger.module === 'documentos' && meta.docCategories.length) return 'select'
  return 'text'
})

const orphanTipoKey = computed(() => {
  const k = String(form.trigger.tipoKey || '').trim()
  if (!k || tipoOptionsMode.value !== 'select') return ''
  return tipoOptions.value.some((o) => o.value === k) ? '' : k
})

const emptyForm = () => ({
  id: '',
  name: '',
  description: '',
  trigger: { module: 'solicitudes', tipoKey: '', label: '' },
  steps: [
    {
      orden: 1,
      nombre: 'Aprobación',
      approverType: 'capability',
      approverValue: 'admin.solicitudes',
      slaHoras: 48,
      condition: '',
      userIds: [],
    },
  ],
  activo: true,
  aiNotes: '',
})

const form = reactive(emptyForm())

function setViewMode(mode) {
  viewMode.value = mode
  localStorage.setItem('cx.wf.view', mode)
}

function switchTab(next) {
  if (next === 'inst') loadInstances()
  else tab.value = 'defs'
}

function onSearchDefs() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(), 280)
}

function moduleLabel(m) {
  return meta.modules.find((x) => x.id === m)?.label || m || '—'
}

function toggleStepUser(step, userId, checked) {
  const id = String(userId)
  const list = Array.isArray(step.userIds) ? [...step.userIds.map(String)] : []
  if (checked) {
    if (!list.includes(id)) list.push(id)
  } else {
    const i = list.indexOf(id)
    if (i >= 0) list.splice(i, 1)
  }
  step.userIds = list
}

function capabilityLabel(id) {
  return meta.capabilities.find((c) => c.id === id)?.label || id || ''
}

/**
 * Quién aprueba, en lenguaje de negocio (cards y ayudas).
 * No hablar de “permiso/capability”: el usuario entiende el rol de la persona.
 */
const WHO_BY_CAP = {
  'admin.solicitudes': 'Líder o gestor de pedidos',
  'admin.usuarios': 'RRHH / People',
  'admin.documentos': 'Legal / Documentos',
  'admin.comunidad': 'Seguridad / Compliance',
  'admin.hub': 'TI / Accesos',
  'admin.publicaciones': 'Quien gestiona el muro',
  'admin.encuestas': 'Quien gestiona encuestas',
  'admin.notificaciones': 'Quien envía avisos',
  'admin.organizacion': 'Quien gestiona áreas y grupos',
  'admin.workflows': 'Quien administra flujos',
  'admin.tipos-solicitud': 'Quien arma plantillas de pedido',
}

function whoApprovesPlain(s) {
  if (s?.approverType === 'capability') {
    const id = s.approverValue || ''
    if (WHO_BY_CAP[id]) {
      const w = WHO_BY_CAP[id]
      return w.toLowerCase().startsWith('quien') ? w.replace(/^Quien/, 'quien') : w
    }
    const label = capabilityLabel(id)
    return label ? `quien gestiona «${label}»` : 'un gestor de la comunidad'
  }
  if (s?.approverType === 'role') {
    const role = String(s?.approverValue || '').trim()
    if (role === 'admin') return 'un administrador de la comunidad'
    return role ? `alguien con el rol «${role}»` : 'alguien con un rol (falta definirlo)'
  }
  if (s?.approverType === 'area') {
    const area = String(s?.approverValue || '').trim()
    return area ? `alguien del área «${area}»` : 'alguien de un área (falta definirla)'
  }
  if (s?.approverType === 'users') {
    const count = Array.isArray(s?.userIds) ? s.userIds.length : 0
    if (!count) return 'personas concretas (todavía no las elegiste)'
    if (count === 1) return 'la persona que elegiste'
    return `una de las ${count} personas que elegiste`
  }
  return 'un administrador'
}

/** Texto compacto para cards. */
function whoApprovesShort(s) {
  if (s?.approverType === 'capability') {
    const id = String(s.approverValue || '').trim()
    if (WHO_BY_CAP[id]) return `Aprueba: ${WHO_BY_CAP[id]}`
    const label = capabilityLabel(id)
    return label ? `Aprueba: ${label}` : 'Aprueba: un gestor'
  }
  if (s?.approverType === 'role') {
    const role = String(s?.approverValue || '').trim()
    if (role === 'admin') return 'Aprueba: un administrador'
    return role ? `Aprueba: rol «${role}»` : 'Aprueba: rol sin definir'
  }
  if (s?.approverType === 'area') {
    const area = meta.areas.find((a) => a.id === String(s?.approverValue || ''))
    return area ? `Aprueba: cualquiera del área ${area.nombre}` : 'Aprueba: un área (falta elegir)'
  }
  if (s?.approverType === 'users') {
    const count = Array.isArray(s?.userIds) ? s.userIds.length : 0
    if (!count) return 'Aprueba: personas (falta elegir)'
    return count === 1 ? 'Aprueba: la persona elegida' : `Aprueba: una de ${count} personas`
  }
  return 'Aprueba: un gestor'
}

/** Quién tiene hoy ese permiso / de qué área es (no confundir con el nombre del paso). */
function holdersLine(s) {
  if (s?.approverType === 'capability') {
    const cap = meta.capabilities.find((c) => c.id === s.approverValue)
    const holders = cap?.holders || []
    if (!holders.length) {
      return 'Hoy nadie lo tiene → asignalo en Usuarios (permisos de pantallas)'
    }
    const names = holders.slice(0, 3).map((h) => (h.areaNombre ? `${h.nombre} (${h.areaNombre})` : h.nombre))
    const more = holders.length > 3 ? ` +${holders.length - 3}` : ''
    return `Hoy pueden: ${names.join(', ')}${more}`
  }
  if (s?.approverType === 'area') {
    const area = meta.areas.find((a) => a.id === String(s?.approverValue || ''))
    return area
      ? `Cualquier persona del área «${area.nombre}» (Organización)`
      : 'Elegí un área de Organización'
  }
  if (s?.approverType === 'role') {
    return 'Cualquier usuario con ese rol'
  }
  if (s?.approverType === 'users') {
    const ids = (s.userIds || []).map(String)
    if (!ids.length) return 'Falta elegir personas'
    const names = ids
      .map((id) => meta.people.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 3)
      .map((p) => (p.areaNombre ? `${p.nombre} (${p.areaNombre})` : p.nombre))
    const more = ids.length > 3 ? ` +${ids.length - 3}` : ''
    return names.length ? `Elegidas: ${names.join(', ')}${more}` : `${ids.length} persona(s) elegida(s)`
  }
  return ''
}

/** Tooltip amigable. */
function whoApprovesTech(s) {
  return holdersLine(s) || whoApprovesShort(s)
}

/** Opción del combo “quién aprueba” en lenguaje de negocio. */
function approverOptionLabel(c) {
  return c.label || WHO_BY_CAP[c.id] || c.id
}

/** Traduce la condición a “cuándo hace falta este paso”. */
function whenAppliesPlain(s) {
  const raw = String(s?.condition || '').trim()
  const name = String(s?.nombre || '').toLowerCase()
  const blob = `${raw} ${name}`.toLowerCase()

  if (!raw && !/\(\s*si\b/.test(name) && !/\bsi\b/.test(name)) {
    return {
      optional: false,
      text: 'Este paso se pide siempre.',
    }
  }

  // Patrones frecuentes (casos de uso)
  if (/pol[ií]tic/.test(blob)) {
    return {
      optional: true,
      text: 'Solo hace falta si el documento es una política. Si es otro tipo de archivo, este paso no aplica.',
    }
  }
  if (/10\s*d[ií]as|>\s*10|m[aá]s de 10|supera 10/.test(blob)) {
    return {
      optional: true,
      text: 'Solo hace falta si el pedido es de más de 10 días. Si son 10 o menos, este paso no aplica.',
    }
  }
  if (/cr[ií]tic/.test(blob)) {
    return {
      optional: true,
      text: 'Solo hace falta si el sistema es crítico. Si no lo es, este paso no aplica.',
    }
  }

  let cleaned = raw
    .replace(/^solo\s+si\s+/i, '')
    .replace(/^si\s+/i, '')
    .replace(/\.$/, '')
    .trim()
  if (!cleaned) {
    const fromName = name.match(/\(([^)]+)\)/)
    cleaned = fromName?.[1]?.replace(/^si\s+/i, '').trim() || ''
  }
  if (!cleaned) {
    return { optional: true, text: 'Este paso es condicional (mira el nombre del paso).' }
  }

  return {
    optional: true,
    text: `Solo hace falta cuando: ${cleaned}. Si no se cumple, este paso no aplica.`,
  }
}

function deadlinePlain(hours) {
  const h = Number(hours) || 0
  if (h <= 0) return ''
  if (h < 24) return `Tiene unas ${h} hora${h === 1 ? '' : 's'} para decidir.`
  if (h % 24 === 0) {
    const d = h / 24
    return `Tiene unos ${d} día${d === 1 ? '' : 's'} para decidir.`
  }
  return `Tiene unas ${h} horas para decidir.`
}

/** Resumen claro de la regla del paso. */
function stepPlainLines(s, idx) {
  const n = idx + 1
  const total = form.steps.length
  const who = whoApprovesPlain(s)
  const when = whenAppliesPlain(s)
  const lines = []

  if (when.optional) {
    lines.push(`Quién: ${who}.`)
    lines.push(when.text)
  } else {
    lines.push(`Quién da el OK: ${who}.`)
    lines.push(when.text)
  }

  const deadline = deadlinePlain(s?.slaHoras)
  if (deadline) lines.push(deadline)

  const holders = holdersLine(s)
  if (holders) lines.push(holders)

  if (total > 1) {
    if (n === 1) lines.push('Va primero.')
    else if (n === total) lines.push('Va al final: si aprueba, el trámite queda cerrado.')
    else lines.push(`Es el paso ${n} de ${total}.`)
  }

  // Nota honesta del MVP cuando hay condición
  if (when.optional) {
    lines.push(
      'El sistema evalúa la condición solo: si no aplica, salta este paso (ej. más de 10 días, crítico, política).',
    )
  }

  return lines
}

function statusLabel(s) {
  return (
    {
      pendiente: 'Pendiente',
      en_curso: 'En curso',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      cancelado: 'Cancelado',
    }[s] || s
  )
}

function decisionLabel(d) {
  return (
    {
      inicio: 'Iniciado',
      aprobar: 'Aprobado',
      rechazar: 'Rechazado',
      omitido: 'Omitido (no aplicaba)',
      aprobado: 'Cerrado automáticamente',
      sistema: 'Sistema',
    }[d] || d || '—'
  )
}

async function openInstDetail(a) {
  instComment.value = ''
  try {
    const { data } = await api.get(`/approvals/${a.id}`)
    instDetail.value = data?.approval || a
  } catch {
    instDetail.value = a
  }
}

function closeInstDetail() {
  instDetail.value = null
  instComment.value = ''
}

async function decideInstanceApi(a, decision, comentario = '') {
  const label = decision === 'aprobar' ? 'aprobar' : 'rechazar'
  if (!confirm(`¿${label === 'aprobar' ? 'Aprobar' : 'Rechazar'} «${a.origen?.titulo || a.definitionName}»?`)) {
    return null
  }
  instBusyId.value = a.id
  try {
    const { data } = await api.post(`/approvals/${a.id}/decide`, {
      decision,
      comentario,
    })
    showToast(decision === 'aprobar' ? 'Paso aprobado' : 'Trámite rechazado')
    await loadInstances()
    return data?.approval || null
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo decidir'
    return null
  } finally {
    instBusyId.value = ''
  }
}

async function quickDecide(a, decision) {
  await decideInstanceApi(a, decision, '')
}

async function decideFromDetail(decision) {
  if (!instDetail.value) return
  const updated = await decideInstanceApi(instDetail.value, decision, instComment.value)
  if (updated) {
    if (updated.canDecide) {
      instDetail.value = updated
      instComment.value = ''
    } else {
      closeInstDetail()
    }
  }
}

function formatDate(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function snippetText(text, max = 110) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function previewCampos(a) {
  const rows = a?.origenDetalle?.campos || []
  const prefer = ['motivo', 'desde', 'hasta', 'detalle', 'sistema', 'prioridad', 'planta', 'tema', 'category']
  const scored = [...rows].sort((x, y) => {
    const as = prefer.indexOf(String(x.key || '').toLowerCase())
    const bs = prefer.indexOf(String(y.key || '').toLowerCase())
    return (as < 0 ? 99 : as) - (bs < 0 ? 99 : bs)
  })
  return scored.slice(0, 4)
}

function sortMark(sort, key) {
  if (sort.key !== key) return ''
  return sort.dir === 'asc' ? ' ↑' : ' ↓'
}

function toggleSortDefs(key) {
  if (sortDefs.key === key) sortDefs.dir = sortDefs.dir === 'asc' ? 'desc' : 'asc'
  else {
    sortDefs.key = key
    sortDefs.dir = key === 'name' || key === 'tipoKey' || key === 'module' ? 'asc' : 'desc'
  }
}

function toggleSortInst(key) {
  if (sortInst.key === key) sortInst.dir = sortInst.dir === 'asc' ? 'desc' : 'asc'
  else {
    sortInst.key = key
    sortInst.dir = key === 'updatedAt' ? 'desc' : 'asc'
  }
}

function cmp(a, b, dir) {
  if (a < b) return dir === 'asc' ? -1 : 1
  if (a > b) return dir === 'asc' ? 1 : -1
  return 0
}

const displayedDefs = computed(() => {
  let rows = [...items.value]
  if (moduleFilter.value) {
    rows = rows.filter((w) => (w.trigger?.module || '') === moduleFilter.value)
  }
  const qq = q.value.trim().toLowerCase()
  if (qq) {
    rows = rows.filter((w) => {
      const hay = [w.name, w.description, w.trigger?.tipoKey, w.trigger?.label]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(qq)
    })
  }
  const { key, dir } = sortDefs
  rows.sort((a, b) => {
    let va
    let vb
    switch (key) {
      case 'name':
        va = (a.name || '').toLowerCase()
        vb = (b.name || '').toLowerCase()
        break
      case 'module':
        va = a.trigger?.module || ''
        vb = b.trigger?.module || ''
        break
      case 'tipoKey':
        va = (a.trigger?.tipoKey || '').toLowerCase()
        vb = (b.trigger?.tipoKey || '').toLowerCase()
        break
      case 'steps':
        va = a.steps?.length || 0
        vb = b.steps?.length || 0
        break
      case 'activo':
        va = a.activo !== false ? 1 : 0
        vb = b.activo !== false ? 1 : 0
        break
      case 'updatedAt':
      default:
        va = new Date(a.updatedAt || 0).getTime()
        vb = new Date(b.updatedAt || 0).getTime()
    }
    return cmp(va, vb, dir)
  })
  return rows
})

const displayedInsts = computed(() => {
  let rows = [...instances.value]
  if (instModule.value) {
    rows = rows.filter((a) => (a.origen?.module || '') === instModule.value)
  }
  const qq = instQ.value.trim().toLowerCase()
  if (qq) {
    rows = rows.filter((a) => {
      const hay = [
        a.origen?.titulo,
        a.origen?.codigo,
        a.definitionName,
        a.solicitanteName,
        a.currentStep?.nombre,
        a.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(qq)
    })
  }
  const { key, dir } = sortInst
  rows.sort((a, b) => {
    let va
    let vb
    switch (key) {
      case 'titulo':
        va = (a.origen?.titulo || a.definitionName || '').toLowerCase()
        vb = (b.origen?.titulo || b.definitionName || '').toLowerCase()
        break
      case 'flujo':
        va = (a.definitionName || '').toLowerCase()
        vb = (b.definitionName || '').toLowerCase()
        break
      case 'module':
        va = a.origen?.module || ''
        vb = b.origen?.module || ''
        break
      case 'status':
        va = a.status || ''
        vb = b.status || ''
        break
      case 'paso':
        va = (a.currentStep?.nombre || '').toLowerCase()
        vb = (b.currentStep?.nombre || '').toLowerCase()
        break
      case 'solicitante':
        va = (a.solicitanteName || '').toLowerCase()
        vb = (b.solicitanteName || '').toLowerCase()
        break
      case 'updatedAt':
      default:
        va = new Date(a.updatedAt || a.createdAt || 0).getTime()
        vb = new Date(b.updatedAt || b.createdAt || 0).getTime()
    }
    return cmp(va, vb, dir)
  })
  return rows
})

function showToast(msg) {
  toast.value = msg
  setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 3200)
}

function toggleTabHelp(which) {
  tabHelp.value = tabHelp.value === which ? '' : which
}

function resetForm() {
  Object.assign(form, emptyForm())
  formError.value = ''
  aiNotes.value = ''
  aiPrompt.value = ''
  selectedExample.value = ''
}

function openCreateChooser() {
  chooserOpen.value = true
  loadMeta()
}

function closeChooser() {
  chooserOpen.value = false
}

function chooseManual() {
  chooserOpen.value = false
  openManual()
}

function chooseAi() {
  chooserOpen.value = false
  openAi()
}

function openAi() {
  resetForm()
  aiMode.value = true
  pane.value = 'ia'
  modalOpen.value = true
}

/** Abre el diseñador con un caso canónico ya elegido y genera el borrador. */
async function openAiWithExample(ex) {
  chooserOpen.value = false
  openAi()
  applyExample(ex)
  await runAi()
}

function openManual() {
  resetForm()
  aiMode.value = false
  pane.value = 'info'
  modalOpen.value = true
}

function editOne(w) {
  resetForm()
  aiMode.value = false
  pane.value = 'info'
  form.id = w.id
  form.name = w.name
  form.description = w.description || ''
  form.trigger = { ...w.trigger }
  form.steps = (w.steps || []).map((s) => ({
    ...s,
    userIds: (s.userIds || []).map(String),
  }))
  form.activo = w.activo !== false
  form.aiNotes = w.aiNotes || ''
  modalOpen.value = true
  loadMeta()
}

function closeModal() {
  modalOpen.value = false
}

function addStep() {
  form.steps.push({
    orden: form.steps.length + 1,
    nombre: `Paso ${form.steps.length + 1}`,
    approverType: 'capability',
    approverValue: 'admin.solicitudes',
    slaHoras: 48,
    condition: '',
    userIds: [],
  })
}

function removeStep(idx) {
  if (form.steps.length <= 1) return
  form.steps.splice(idx, 1)
}

function applyExample(ex) {
  selectedExample.value = ex.id
  aiPrompt.value = ex.prompt
}

function applyDraft(d) {
  form.name = d.name || ''
  form.description = d.description || ''
  form.trigger = {
    module: d.trigger?.module || 'solicitudes',
    tipoKey: d.trigger?.tipoKey || '',
    label: d.trigger?.label || '',
  }
  form.steps = (d.steps || []).map((s, i) => ({
    orden: i + 1,
    nombre: s.nombre,
    approverType: s.approverType || 'capability',
    approverValue: s.approverValue || 'admin.solicitudes',
    slaHoras: s.slaHoras || 48,
    condition: s.condition || '',
    userIds: [],
  }))
  form.aiNotes = d.notes || ''
  aiNotes.value = d.notes || ''
  pane.value = 'info'
}

async function runAi() {
  aiBusy.value = true
  formError.value = ''
  try {
    const { data } = await api.post('/admin/workflows/ai-draft', { prompt: aiPrompt.value })
    applyDraft(data?.draft || {})
    showToast(data?.draft?.source === 'example' ? 'Borrador desde ejemplo listo' : 'Borrador IA listo — revisalo')
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo generar el borrador'
  } finally {
    aiBusy.value = false
  }
}

async function loadMeta() {
  try {
    const { data } = await api.get('/admin/workflows/meta')
    if (data?.modules) meta.modules = data.modules
    if (data?.modulesNote) meta.modulesNote = data.modulesNote
    if (Array.isArray(data?.requestTypes)) meta.requestTypes = data.requestTypes
    if (Array.isArray(data?.docCategories)) meta.docCategories = data.docCategories
    if (data?.approverTypes) meta.approverTypes = data.approverTypes
    if (data?.capabilities) meta.capabilities = data.capabilities
    if (Array.isArray(data?.areas)) meta.areas = data.areas
    if (Array.isArray(data?.people)) meta.people = data.people
    if (data?.approverNote) meta.approverNote = data.approverNote
  } catch {
    /* ignore */
  }
}

async function loadAi() {
  try {
    const [st, ex] = await Promise.all([
      api.get('/admin/workflows/ai-status'),
      api.get('/admin/workflows/ai-examples'),
    ])
    aiConfigured.value = Boolean(st.data?.configured)
    examples.value = ex.data?.examples || []
  } catch {
    aiConfigured.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (activoFilter.value) params.activo = activoFilter.value
    const { data } = await api.get('/admin/workflows', { params })
    items.value = data?.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

async function loadInstances() {
  tab.value = 'inst'
  instLoading.value = true
  try {
    const params = { limit: 50 }
    if (instStatus.value) params.status = instStatus.value
    const { data } = await api.get('/admin/workflows/instances', { params })
    instances.value = data?.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar instancias'
  } finally {
    instLoading.value = false
  }
}

async function save() {
  formError.value = ''
  if (!form.name.trim() || !form.steps.length) {
    formError.value = 'Completá nombre y al menos un paso'
    pane.value = !form.name.trim() ? 'info' : 'pasos'
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description,
      trigger: form.trigger,
      steps: form.steps.map((s, i) => ({ ...s, orden: i + 1 })),
      activo: form.activo,
      aiNotes: form.aiNotes,
    }
    if (form.id) await api.patch(`/admin/workflows/${form.id}`, payload)
    else await api.post('/admin/workflows', payload)
    showToast(form.id ? 'Flujo actualizado' : 'Flujo publicado')
    closeModal()
    tab.value = 'defs'
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(w) {
  busyId.value = w.id
  try {
    await api.patch(`/admin/workflows/${w.id}`, { activo: !w.activo })
    showToast(w.activo ? 'Pausado' : 'Activado')
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo actualizar'
  } finally {
    busyId.value = ''
  }
}

async function removeOne(w) {
  if (!confirm(`¿Borrar el flujo «${w.name}»?`)) return
  busyId.value = w.id
  try {
    await api.delete(`/admin/workflows/${w.id}`)
    showToast('Eliminado')
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo borrar'
  } finally {
    busyId.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadMeta(), loadAi(), load()])
})
</script>

<style scoped>
.page {
  padding: 20px 22px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background:
    radial-gradient(1200px 400px at 10% -10%, var(--ok-bg) 0%, transparent 55%),
    radial-gradient(900px 320px at 100% 0%, var(--panel-2) 0%, transparent 50%),
    var(--panel-2);
  min-height: 100%;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.page-head h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--ink);
}
.page-head p {
  margin: 6px 0 0;
  color: var(--ink-soft);
  max-width: 52rem;
  line-height: 1.45;
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.use-cases {
  border-radius: 16px;
  border: 1px solid var(--ok-bg);
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, var(--panel)) 0%, var(--panel) 55%, var(--panel-2) 100%);
  overflow: hidden;
}
.use-cases-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  user-select: none;
}
.use-cases-summary::-webkit-details-marker {
  display: none;
}
.use-cases-summary > span:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.use-cases-summary strong {
  font-size: 0.98rem;
  font-weight: 750;
  color: var(--brand-secondary);
}
.use-cases-summary small {
  color: var(--ink-soft);
  font-size: 0.85rem;
  line-height: 1.35;
}
.use-cases-chevron {
  font-size: 12px;
  color: var(--brand-primary);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}
.use-cases[open] .use-cases-chevron {
  transform: rotate(180deg);
}
.use-cases[open] .use-cases-summary {
  border-bottom: 1px solid #a7f3d0;
}
.use-cases-body {
  padding: 12px 16px 16px;
}
.use-cases-body > p {
  margin: 0 0 12px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.4;
}
.page-examples {
  margin-bottom: 0;
}
.ex-card:disabled {
  opacity: 0.65;
  cursor: wait;
}
.err {
  color: var(--bad);
  margin: 0;
}
.toast {
  margin: 0;
  padding: 10px 14px;
  background: var(--ok-bg);
  color: var(--ok);
  border-radius: 10px;
  border: 1px solid #a7f3d0;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.filters .grow {
  flex: 1 1 180px;
  min-width: 160px;
}
.filters-sep {
  width: 1px;
  height: 24px;
  background: var(--line-2);
  margin: 0 2px;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel);
  margin-left: auto;
}
.view-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 34px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
.view-btn + .view-btn {
  border-left: 1px solid var(--line);
}
.view-btn.on {
  background: var(--ok-bg);
  color: var(--brand-primary);
}
.table-wrap {
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--panel-2);
  vertical-align: top;
}
.data-table thead th {
  background: var(--panel-2);
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 650;
  color: var(--ink-soft);
  white-space: nowrap;
}
.data-table tbody tr:hover {
  background: var(--panel-2);
}
.th-sort {
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 650;
  color: inherit;
  cursor: pointer;
  padding: 0;
}
.th-sort:hover {
  color: var(--brand-primary);
}
.th-actions {
  white-space: nowrap;
}
.cell-title {
  display: block;
  color: var(--ink);
}
.cell-sub {
  display: block;
  margin-top: 2px;
  color: var(--ink-faint);
  font-size: 0.82rem;
  line-height: 1.35;
  max-width: 28rem;
}
.td-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  white-space: nowrap;
}
.table-foot {
  margin: 0;
  padding: 8px 12px;
  font-size: 0.82rem;
  color: var(--ink-faint);
  border-top: 1px solid var(--panel-2);
}
.tab-with-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.info-i {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1.5px solid var(--ink-faint);
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
}
.info-i:hover,
.info-i[aria-expanded='true'] {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.tab-help {
  margin: -4px 0 0;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #a5f3fc;
  background: #ecfeff;
  color: #155e75;
  font-size: 0.9rem;
  line-height: 1.45;
  max-width: 52rem;
}
.tab-help strong {
  color: #0e7490;
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 9px 12px;
  font: inherit;
  background: var(--panel);
}
.btn-primary,
.btn-ghost {
  border-radius: 10px;
  padding: 9px 14px;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost {
  background: var(--panel);
  border-color: var(--line-2);
  color: var(--ink);
}
.btn-ghost.on {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.btn-ghost.sm,
.btn-primary.sm {
  padding: 6px 10px;
  font-size: 0.88rem;
}
.btn-ghost.danger {
  color: var(--bad);
  border-color: #fecaca;
}
.muted {
  color: var(--ink-soft);
}
.empty-hint {
  padding: 28px;
  text-align: center;
  background: var(--panel);
  border-radius: 16px;
  border: 1px dashed var(--line-2);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: space-between;
  min-width: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.card-top strong {
  font-size: 1.05rem;
}
.body {
  margin: 8px 0;
  color: var(--ink-soft);
  line-height: 1.4;
}
.meta {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--ink-faint);
}
.badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
}
.badge[data-on='1'] {
  background: var(--ok-bg);
  color: var(--ok);
}
.badge[data-on='0'] {
  background: var(--bad-bg);
  color: var(--bad);
}
.badge.tipo {
  background: #e0f2fe;
  color: #075985;
}
.badge.status[data-st='aprobado'] {
  background: var(--ok-bg);
  color: var(--ok);
}
.badge.status[data-st='rechazado'] {
  background: var(--bad-bg);
  color: var(--bad);
}
.badge.status[data-st='en_curso'],
.badge.status[data-st='pendiente'] {
  background: var(--warn-bg);
  color: var(--warn);
}
.steps-preview {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.steps-preview li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--ink);
}
.step-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}
.step-name {
  font-weight: 600;
  color: var(--ink);
}
.step-who,
.step-who-line,
.step-who-inline {
  color: var(--brand-primary);
  font-size: 0.8rem;
  font-weight: 600;
}
.step-who-line {
  margin: 2px 0 0;
}
.step-holders {
  flex-basis: 100%;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
}
.steps-preview em {
  color: var(--ink-faint);
  font-style: normal;
  font-size: 0.82rem;
}
.n {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}
.card-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 4px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
  padding: 16px;
}
.modal {
  background: var(--panel);
  border-radius: 18px;
  width: min(1180px, 100%);
  max-height: min(92vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}
.modal.modal-wide {
  width: min(1280px, 98vw);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.modal-head h2 {
  margin: 0;
  font-size: 1.2rem;
}
.modal-head .sub {
  margin: 4px 0 0;
  color: var(--ink-faint);
  font-size: 0.88rem;
}
.chooser-modal {
  width: min(720px, 100%);
  max-height: none;
}
.chooser-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 18px 20px 22px;
}
.chooser-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 18px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s;
}
.chooser-card:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--panel));
  background: var(--panel);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px var(--sh);
}
.chooser-card.chooser-ai:hover {
  border-color: #67e8f9;
}
.chooser-badge {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: var(--line);
  color: var(--ink);
}
.chooser-badge.ai {
  background: #cffafe;
  color: #0e7490;
}
.chooser-card strong {
  font-size: 1.05rem;
  color: var(--ink);
}
.chooser-card p {
  margin: 0;
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink-soft);
}
.chooser-cta {
  margin-top: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-primary);
}
.card-main-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.action-hint {
  color: var(--brand-primary) !important;
  font-weight: 650;
}
.meta.soft {
  color: var(--ink-faint) !important;
}
.dates-row {
  font-size: 0.8rem !important;
}
.inst-snippet {
  margin: 8px 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.inst-facts {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  display: grid;
  gap: 6px;
}
.inst-facts.sheet {
  background: var(--panel);
}
.inst-fact {
  display: grid;
  grid-template-columns: minmax(72px, 34%) 1fr;
  gap: 8px;
  font-size: 0.82rem;
}
.inst-fact dt {
  margin: 0;
  color: var(--ink-faint);
  font-weight: 650;
}
.inst-fact dd {
  margin: 0;
  color: var(--ink);
  font-weight: 650;
  word-break: break-word;
}
.inst-origin-body {
  margin: 0 0 10px;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--ink);
  white-space: pre-wrap;
}
.cell-link {
  display: block;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.cell-link:hover .cell-title {
  color: var(--brand-primary);
  text-decoration: underline;
}
.inst-modal {
  width: min(720px, 98vw);
  max-height: min(92vh, 880px);
}
.inst-detail-body {
  padding: 16px 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.inst-block h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--ink);
}
.inst-dl {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
}
.inst-dl div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.inst-dl dt {
  font-size: 0.75rem;
  color: var(--ink-faint);
  font-weight: 650;
}
.inst-dl dd {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink);
}
.inst-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.inst-steps li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
}
.inst-steps li.done {
  opacity: 0.65;
}
.inst-steps li.current {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--panel));
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.inst-steps li.rejected {
  border-color: #fecaca;
  background: var(--bad-bg);
}
.inst-steps .n {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--line);
  font-weight: 750;
  font-size: 0.82rem;
  flex-shrink: 0;
}
.inst-steps li.current .n {
  background: var(--brand-primary);
  color: #fff;
}
.inst-steps .cond,
.inst-steps .now {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.inst-steps .now {
  color: var(--brand-primary);
  font-weight: 650;
}
.inst-hist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.inst-hist li {
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  font-size: 0.88rem;
}
.inst-hist time {
  display: block;
  margin-top: 2px;
  color: var(--ink-faint);
  font-size: 0.78rem;
}
.inst-hist p {
  margin: 4px 0 0;
  color: var(--ink-soft);
}
.decide-block {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #a7f3d0;
  background: var(--ok-bg);
}
.btn-ghost.danger,
.btn-ghost.sm.danger {
  color: var(--bad);
}
.wizard {
  display: grid;
  grid-template-columns: 180px 1fr;
  min-height: 360px;
  overflow: hidden;
}
.wizard-nav {
  background: var(--panel-2);
  border-right: 1px solid var(--line);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wiz-item {
  text-align: left;
  border: 0;
  background: transparent;
  padding: 10px 12px;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
}
.wiz-item.active {
  background: var(--panel);
  color: var(--brand-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
}
.wizard-pane {
  overflow: auto;
  padding: 18px 20px 8px;
}
.pane-title {
  margin: 0 0 6px;
  font-size: 1.05rem;
}
.pane-lead {
  margin: 0 0 14px;
  color: var(--ink-soft);
  line-height: 1.4;
}
.pane-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.examples {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.ex-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}
.ex-card:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--panel));
  transform: translateY(-1px);
}
.ex-card.selected {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.ex-emoji {
  font-size: 1.4rem;
  line-height: 1;
}
.ex-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ex-text strong {
  font-size: 0.92rem;
  color: var(--ink);
}
.ex-text small {
  color: var(--ink-soft);
  font-size: 0.78rem;
  line-height: 1.3;
}
.ex-text .ex-roles {
  color: var(--brand-primary);
  font-weight: 600;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 12px;
}
.lbl.full,
.field-help-block.full {
  grid-column: 1 / -1;
}
.field-help-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 12px;
}
.field-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-hint {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-soft);
  line-height: 1.4;
}
.field-hint code {
  font-size: 0.85em;
}
.field-help {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #a5f3fc;
  background: #ecfeff;
  color: #155e75;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.45;
}
.field-help p {
  margin: 0 0 8px;
}
.field-help ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 6px;
}
.field-help-note {
  margin: 10px 0 0 !important;
  padding-top: 8px;
  border-top: 1px solid #a5f3fc;
}
.field-hint.warn {
  color: #9a3412;
}
.inline-link {
  color: var(--brand-primary);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--ink);
  margin: 8px 0 14px;
}
.step-editor {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  background: var(--panel-2);
}
.step-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.step-head .input {
  flex: 1;
}
.step-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 100px;
  gap: 8px 10px;
}
.people-pick {
  margin-top: 6px;
  max-height: 180px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  padding: 8px;
  display: grid;
  gap: 6px;
}
.people-opt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
}
.people-opt small {
  color: var(--ink-faint);
  font-weight: 400;
}
.step-plain {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--ok-bg);
  background: var(--ok-bg);
  color: var(--brand-secondary);
}
.step-plain-title {
  margin: 0 0 6px;
  font-size: 0.82rem;
  font-weight: 750;
  color: var(--brand-primary);
}
.step-plain ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 3px;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.4;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}
.small {
  font-size: 0.85rem;
}
@media (max-width: 780px) {
  .page-head {
    flex-direction: column;
  }
  .list {
    grid-template-columns: 1fr;
  }
  .card {
    flex-direction: column;
  }
  .card-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .wizard {
    grid-template-columns: 1fr;
  }
  .wizard-nav {
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .examples {
    grid-template-columns: 1fr;
  }
  .chooser-grid {
    grid-template-columns: 1fr;
  }
  .form-grid,
  .step-grid {
    grid-template-columns: 1fr;
  }
}
</style>
