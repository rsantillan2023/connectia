<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Notificaciones</h1>
        <p>
          Escribí qué querés comunicar; la IA arma el borrador y vos revisás antes de enviar.
        </p>
        <ScreenHelp
          purpose="Campañas in-app y push. El camino recomendado es describir el aviso en un prompt; la IA completa título, texto, enlace y audiencia. Después enviás o programás."
          can-do="Crear con IA, editar a mano, programar, cancelar, ver detalle y lecturas (quién leyó), clonar, exportar, resumen IA. CSV solo si necesitás carga masiva."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">Actualizar</button>
        <button type="button" class="btn-ghost" :disabled="!items.length" @click="exportCsv">Exportar</button>
        <button type="button" class="btn-ghost" @click="openCreate">Manual</button>
        <button type="button" class="btn-primary" :disabled="!aiConfigured" @click="openAiCreate">
          Crear con IA
        </button>
      </div>
    </header>

    <p v-if="!aiConfigured" class="hint">
      Para crear con IA configurá <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code> en el backend.
      Mientras tanto podés usar <strong>Manual</strong>.
    </p>

    <details class="advanced">
      <summary>Avanzado · CSV (opcional)</summary>
      <p class="muted small">
        Solo para cargas masivas o integración. El flujo normal es prompt → revisar → enviar.
      </p>
      <div class="head-actions">
        <button type="button" class="btn-ghost sm" @click="downloadTemplate">Plantilla CSV</button>
        <label class="btn-ghost sm file-btn">
          Importar CSV
          <input type="file" accept=".csv,text/csv" hidden @change="onImportFile" />
        </label>
      </div>
    </details>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <section class="filters">
      <input v-model="q" class="input" type="search" placeholder="Buscar…" @keyup.enter="load" />
      <select v-model="statusFilter" class="input" @change="load">
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="scheduled">Programada</option>
        <option value="sending">Enviando</option>
        <option value="sent">Enviada</option>
        <option value="cancelled">Cancelada</option>
        <option value="failed">Fallida</option>
      </select>
      <button type="button" class="btn-ghost" @click="load">Filtrar</button>
    </section>

    <p v-if="loading && !items.length" class="muted">Cargando…</p>
    <p v-else-if="!items.length" class="muted">
      Todavía no hay campañas. Probá <strong>Crear con IA</strong> describiendo el aviso en una frase.
    </p>

    <ul v-else class="list">
      <li v-for="c in items" :key="c.id" class="card">
        <div class="card-main">
          <div class="card-top">
            <strong>{{ c.name || c.title }}</strong>
            <span class="badge" :data-status="c.status">{{ statusLabel(c.status) }}</span>
          </div>
          <p class="title">{{ c.title }}</p>
          <p v-if="c.body" class="body">{{ c.body }}</p>
          <p class="meta">
            {{ audienceLabel(c) }}
            · {{ c.segment === 'inactive' ? `Inactivos ${c.inactiveDays}d` : 'Audiencia' }}
            · {{ c.sendType === 'scheduled' && c.scheduledAt ? `Programada ${fmt(c.scheduledAt)}` : 'Inmediato' }}
            · {{ fmt(c.sentAt || c.createdAt) }}
          </p>
          <p v-if="c.status === 'sent'" class="stats">
            Destinatarios {{ c.stats.targeted }} · In-app {{ c.stats.inApp }} · Push {{ c.stats.pushSent }}
            <span v-if="c.stats.pushFailed"> (fallos {{ c.stats.pushFailed }})</span>
          </p>
          <p v-if="c.errorMessage" class="err small">{{ c.errorMessage }}</p>
        </div>
        <div class="card-actions">
          <button
            v-if="canViewDetail(c)"
            type="button"
            class="btn-ghost sm"
            @click="viewOne(c)"
          >
            Ver detalle
          </button>
          <button type="button" class="btn-ghost sm" @click="cloneOne(c)">Clonar</button>
          <button
            v-if="['draft', 'scheduled', 'failed'].includes(c.status)"
            type="button"
            class="btn-primary sm"
            :disabled="busyId === c.id"
            @click="sendOne(c)"
          >
            Enviar
          </button>
          <button
            v-if="['draft', 'scheduled'].includes(c.status)"
            type="button"
            class="btn-ghost sm"
            @click="editOne(c)"
          >
            Editar
          </button>
          <button
            v-if="['draft', 'scheduled'].includes(c.status)"
            type="button"
            class="btn-ghost sm danger"
            :disabled="busyId === c.id"
            @click="cancelOne(c)"
          >
            Cancelar
          </button>
        </div>
      </li>
    </ul>

    <button v-if="hasMore" type="button" class="btn-ghost more" :disabled="loading" @click="loadMore">
      Ver más
    </button>

    <!-- Editor ampliado 20/80 -->
    <Teleport to="body">
      <div v-if="editorOpen" class="modal-root" @keydown.esc="editorOpen = false">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="editorOpen = false" />
        <aside class="modal modal-wide" role="dialog" aria-modal="true">
          <header class="modal-head">
            <div>
              <h2>{{ draft.id ? 'Editar campaña' : createMode === 'ai' ? 'Crear con IA' : 'Nueva notificación' }}</h2>
              <p class="muted small">
                {{
                  createMode === 'ai' && !draft.id
                    ? 'Prompt → mensaje → redirección → audiencia → envío.'
                    : 'Revisá mensaje, a dónde lleva, audiencia y envío antes de confirmar.'
                }}
              </p>
            </div>
          </header>

          <form class="form-split" @submit.prevent="askConfirmEditorSubmit">
            <nav class="form-nav" aria-label="Pasos del editor">
              <button
                v-if="createMode === 'ai' && !draft.id"
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'ia' }"
                @click="editorStep = 'ia'"
              >
                <span class="nav-n">{{ stepNum('ia') }}</span>
                <span>
                  <strong>Prompt IA</strong>
                  <small>Describí el aviso</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'mensaje' }"
                @click="editorStep = 'mensaje'"
              >
                <span class="nav-n">{{ stepNum('mensaje') }}</span>
                <span>
                  <strong>Mensaje</strong>
                  <small>Título y cuerpo</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'enlace' }"
                @click="goToLinkStep"
              >
                <span class="nav-n">{{ stepNum('enlace') }}</span>
                <span>
                  <strong>Redirección</strong>
                  <small>A dónde lleva el aviso</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'audiencia' }"
                @click="editorStep = 'audiencia'"
              >
                <span class="nav-n">{{ stepNum('audiencia') }}</span>
                <span>
                  <strong>Audiencia</strong>
                  <small>Quién lo recibe</small>
                </span>
              </button>
              <button
                type="button"
                class="nav-step"
                :class="{ on: editorStep === 'envio' }"
                @click="editorStep = 'envio'"
              >
                <span class="nav-n">{{ stepNum('envio') }}</span>
                <span>
                  <strong>Envío</strong>
                  <small>Ahora o programado</small>
                </span>
              </button>

              <div class="nav-preview">
                <p class="muted small">Destinatarios</p>
                <p class="nav-preview-num">{{ preview.total }}</p>
                <p class="muted small">con push: {{ preview.withPush }}</p>
                <button type="button" class="btn-ghost sm" :disabled="previewBusy" @click="refreshPreview">
                  {{ previewBusy ? '…' : 'Recalcular' }}
                </button>
              </div>
            </nav>

            <div class="form-main">
              <!-- PROMPT IA (solo crear con IA) -->
              <section v-show="editorStep === 'ia'" class="pane">
                <h3 class="pane-title">Crear con IA</h3>
                <p class="muted small">
                  Contá qué querés comunicar, a quién y el tono. La IA completa el formulario; después revisás
                  mensaje, audiencia y envío en los pasos de la izquierda.
                </p>
                <section class="ai-brief ai-brief-full">
                  <label class="field">
                    <span>Prompt</span>
                    <textarea
                      v-model="aiPrompt"
                      class="input ai-prompt"
                      rows="10"
                      :placeholder="aiPlaceholder"
                      :disabled="aiBusy"
                    />
                  </label>
                  <div class="row">
                    <button
                      type="button"
                      class="btn-primary"
                      :disabled="!aiConfigured || aiBusy || aiPrompt.trim().length < 8"
                      @click="runAiDraft"
                    >
                      {{ aiBusy ? 'Armando borrador…' : 'Completar formulario con IA' }}
                    </button>
                    <button type="button" class="btn-ghost" :disabled="aiBusy" @click="restoreAiExample">
                      Restaurar ejemplo
                    </button>
                  </div>
                  <p v-if="aiNotes" class="ai-notes">{{ aiNotes }}</p>
                </section>
              </section>

              <!-- MENSAJE -->
              <section v-show="editorStep === 'mensaje'" class="pane">
                <h3 class="pane-title">Mensaje</h3>
                <p v-if="createMode === 'ai' && !draft.id" class="muted small">
                  Revisá o editá lo que armó la IA. Podés volver al paso Prompt para regenerar.
                </p>
                <div v-if="createMode === 'manual' && !draft.id && aiConfigured" class="row" style="margin-bottom: 4px">
                  <button type="button" class="btn-ghost sm" @click="switchToAiMode">
                    Preferís empezar con un prompt de IA…
                  </button>
                </div>
                <div v-if="draft.title && aiConfigured" class="row">
                  <button type="button" class="btn-ghost sm" :disabled="aiBusy" @click="improveCopy">
                    {{ aiBusy ? 'Pulviendo…' : 'Pulir texto con IA' }}
                  </button>
                  <span v-if="aiNotes && editorStep === 'mensaje'" class="muted small">{{ aiNotes }}</span>
                </div>

                <label class="field">
                  <span>Nombre interno</span>
                  <input v-model="draft.name" class="input" maxlength="120" placeholder="Opcional · solo para el listado admin" />
                </label>
                <label class="field">
                  <span>Título *</span>
                  <input v-model="draft.title" class="input" required maxlength="120" />
                </label>
                <label class="field">
                  <span>Cuerpo</span>
                  <textarea v-model="draft.body" class="input" rows="5" maxlength="500" />
                </label>
                <p class="muted small">
                  El destino al tocar el aviso se configura en el paso
                  <button type="button" class="linkish" @click="goToLinkStep">Redirección</button>.
                  Ahora: <code>{{ draft.href || '/' }}</code>
                </p>
              </section>

              <!-- REDIRECCIÓN / ENLACE -->
              <section v-show="editorStep === 'enlace'" class="pane">
                <h3 class="pane-title">¿A dónde lleva el aviso?</h3>
                <p class="muted small">
                  Elegí una opción simple. El usuario toca la notificación y abre ese destino en la app.
                </p>

                <div class="link-kinds">
                  <button
                    v-for="k in LINK_KINDS"
                    :key="k.id"
                    type="button"
                    class="type-card"
                    :class="{ on: linkTarget.kind === k.id }"
                    @click="setLinkKind(k.id)"
                  >
                    <strong>{{ k.label }}</strong>
                    <small>{{ k.hint }}</small>
                  </button>
                </div>

                <div v-if="linkTarget.kind === 'screen'" class="link-config">
                  <label class="field">
                    <span>Pantalla de la app</span>
                    <select v-model="linkTarget.screen" class="input" @change="applyLinkTargetToHref">
                      <option v-for="s in SCREEN_OPTIONS" :key="s.value" :value="s.value">
                        {{ s.label }} — {{ s.hint }}
                      </option>
                    </select>
                  </label>
                </div>

                <div v-else-if="linkTarget.kind === 'post'" class="link-config">
                  <label class="field">
                    <span>Publicación</span>
                    <input
                      v-model="linkPickQuery"
                      class="input"
                      type="search"
                      placeholder="Buscar por título…"
                    />
                    <select
                      v-model="linkTarget.postId"
                      class="input"
                      :disabled="linkOptions.loading"
                      @change="applyLinkTargetToHref"
                    >
                      <option value="">Elegí una publicación publicada…</option>
                      <option v-for="p in filteredLinkPosts" :key="p.id" :value="p.id">
                        {{ p.titulo }}{{ p.tipo ? ` · ${p.tipo}` : '' }}
                      </option>
                    </select>
                    <small v-if="linkOptions.loading" class="muted">Cargando publicaciones…</small>
                    <small v-else-if="!linkOptions.posts.length" class="muted">
                      No hay publicaciones publicadas (o no tenés permiso para listarlas).
                    </small>
                  </label>
                </div>

                <div v-else-if="linkTarget.kind === 'survey'" class="link-config">
                  <label class="field">
                    <span>Encuesta</span>
                    <input
                      v-model="linkPickQuery"
                      class="input"
                      type="search"
                      placeholder="Buscar encuesta…"
                    />
                    <select
                      v-model="linkTarget.surveyId"
                      class="input"
                      :disabled="linkOptions.loading"
                      @change="applyLinkTargetToHref"
                    >
                      <option value="">Elegí una encuesta publicada…</option>
                      <option v-for="s in filteredLinkSurveys" :key="s.id" :value="s.id">
                        {{ s.titulo }}
                      </option>
                    </select>
                    <small v-if="linkOptions.loading" class="muted">Cargando encuestas…</small>
                    <small v-else-if="!linkOptions.surveys.length" class="muted">
                      No hay encuestas publicadas (o no tenés permiso para listarlas).
                    </small>
                  </label>
                </div>

                <div v-else-if="linkTarget.kind === 'doc'" class="link-config">
                  <label class="field">
                    <span>Documento</span>
                    <input
                      v-model="linkPickQuery"
                      class="input"
                      type="search"
                      placeholder="Buscar documento…"
                    />
                    <select
                      v-model="linkTarget.docId"
                      class="input"
                      :disabled="linkOptions.loading"
                      @change="applyLinkTargetToHref"
                    >
                      <option value="">Elegí un documento publicado…</option>
                      <option v-for="d in filteredLinkDocs" :key="d.id" :value="d.id">
                        {{ d.titulo }}{{ d.category ? ` · ${d.category}` : '' }}
                      </option>
                    </select>
                    <small v-if="linkOptions.loading" class="muted">Cargando documentos…</small>
                    <small v-else-if="!linkOptions.docs.length" class="muted">
                      No hay documentos publicados (o no tenés permiso para listarlos).
                    </small>
                    <small v-else class="muted">Al abrir, la app va a Documentos y destaca ese archivo.</small>
                  </label>
                </div>

                <div v-else-if="linkTarget.kind === 'external'" class="link-config">
                  <label class="field">
                    <span>URL externa</span>
                    <input
                      v-model="linkTarget.externalUrl"
                      class="input"
                      type="url"
                      maxlength="300"
                      placeholder="https://…"
                      @input="applyLinkTargetToHref"
                    />
                    <small class="muted">Se abre en el navegador del dispositivo.</small>
                  </label>
                </div>

                <div v-else class="link-config">
                  <label class="field">
                    <span>Ruta o URL personalizada</span>
                    <input
                      v-model="linkTarget.customPath"
                      class="input"
                      maxlength="300"
                      placeholder="/muro o https://…"
                      @input="applyLinkTargetToHref"
                    />
                    <small class="muted">Para casos avanzados. Preferí las opciones de arriba cuando puedas.</small>
                  </label>
                </div>

                <div class="link-preview">
                  <p class="muted small">Destino final</p>
                  <code class="link-preview-code">{{ draft.href || '/' }}</code>
                  <p class="muted small">{{ linkKindSummary }}</p>
                </div>
                <p v-if="linkOptions.error" class="err small">{{ linkOptions.error }}</p>
              </section>

              <!-- AUDIENCIA -->
              <section v-show="editorStep === 'audiencia'" class="pane">
                <h3 class="pane-title">¿A quién le llega?</h3>
                <p class="muted small">
                  Igual que en Publicaciones: toda la comunidad, áreas/grupos (con particulares opcionales) o solo personas.
                </p>

                <div class="audience-modes">
                  <button type="button" class="type-card" :class="{ on: draft.audience.mode === 'all' }" @click="setAudienceMode('all')">
                    <strong>Toda la comunidad</strong>
                    <small>Todos los miembros activos</small>
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
                    <small>Destinatarios particulares</small>
                  </button>
                </div>

                <div v-if="draft.audience.mode === 'restricted'" class="audience-picks">
                  <div>
                    <p class="muted small">Áreas</p>
                    <label v-for="a in areas" :key="a.id" class="check">
                      <input v-model="draft.audience.areaIds" type="checkbox" :value="String(a.id)" />
                      {{ a.nombre }}
                    </label>
                    <p v-if="!areas.length" class="muted small">No hay áreas. Creálas en Organización.</p>
                  </div>
                  <div>
                    <p class="muted small">Grupos</p>
                    <label v-for="g in groups" :key="g.id" class="check">
                      <input v-model="draft.audience.groupIds" type="checkbox" :value="String(g.id)" />
                      {{ g.nombre }}
                    </label>
                    <p v-if="!groups.length" class="muted small">No hay grupos. Creálos en Organización.</p>
                  </div>
                </div>

                <div
                  v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'"
                  class="audience-users"
                >
                  <h4>
                    {{ draft.audience.mode === 'users' ? 'Destinatarios puntuales' : 'También incluir personas puntuales' }}
                  </h4>
                  <p class="muted small">
                    {{
                      draft.audience.mode === 'users'
                        ? 'Solo estas personas reciben el aviso.'
                        : 'Sumá gente de otras áreas además de las áreas/grupos marcados.'
                    }}
                  </p>
                  <input
                    v-model="audienceUserQuery"
                    class="input"
                    type="search"
                    placeholder="Buscar por nombre, usuario o email…"
                    @input="onAudienceUserQuery"
                  />
                  <p v-if="audienceUserSearching" class="muted small">Buscando…</p>
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
                  <p v-else-if="audienceUserQuery.trim().length >= 2" class="muted small">Sin resultados.</p>

                  <div v-if="selectedAudienceUsers.length" class="audience-user-chips">
                    <span v-for="u in selectedAudienceUsers" :key="u.id" class="audience-chip">
                      {{ u.label }}
                      <button type="button" class="audience-chip-x" :title="`Quitar ${u.label}`" @click="removeAudienceUser(u.id)">
                        ×
                      </button>
                    </span>
                  </div>
                  <p v-else class="muted small">Todavía no agregaste personas puntuales.</p>
                </div>

                <fieldset class="field segment-box">
                  <legend>Filtro extra</legend>
                  <div class="modes">
                    <button
                      type="button"
                      class="chip"
                      :class="{ on: draft.segment === 'audience' }"
                      @click="draft.segment = 'audience'"
                    >
                      Toda la audiencia elegida
                    </button>
                    <button
                      type="button"
                      class="chip"
                      :class="{ on: draft.segment === 'inactive' }"
                      @click="draft.segment = 'inactive'"
                    >
                      Solo inactivos
                    </button>
                  </div>
                  <label v-if="draft.segment === 'inactive'" class="field">
                    <span>Días sin login</span>
                    <input v-model.number="draft.inactiveDays" class="input" type="number" min="1" max="365" />
                  </label>
                </fieldset>
              </section>

              <!-- ENVÍO -->
              <section v-show="editorStep === 'envio'" class="pane">
                <h3 class="pane-title">¿Cuándo y por qué canal?</h3>

                <div class="audience-modes schedule-modes">
                  <button
                    type="button"
                    class="type-card"
                    :class="{ on: draft.sendType === 'now' }"
                    @click="setSendNow"
                  >
                    <strong>Enviar ahora</strong>
                    <small>Se despacha al confirmar</small>
                  </button>
                  <button
                    type="button"
                    class="type-card"
                    :class="{ on: draft.sendType === 'scheduled' }"
                    @click="setSendScheduled"
                  >
                    <strong>Programar día y hora</strong>
                    <small>Se envía automáticamente después</small>
                  </button>
                </div>

                <div v-if="draft.sendType === 'scheduled'" class="schedule-box">
                  <p class="muted small">
                    Elegí el día y/o la hora (horario local del navegador). Si solo ponés el día, usamos 09:00.
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
                    Se enviará el <strong>{{ scheduleSummary }}</strong>
                  </p>
                  <p v-else class="err small">Definí al menos el día o la hora para programar.</p>
                </div>

                <div class="modes" style="margin-top: 4px">
                  <label class="check">
                    <input v-model="draft.channels.inApp" type="checkbox" />
                    In-app (bandeja Avisos)
                  </label>
                  <label class="check">
                    <input v-model="draft.channels.push" type="checkbox" />
                    Push (dispositivo)
                  </label>
                </div>
                <p class="preview-inline">
                  Van a recibir ~<strong>{{ preview.total }}</strong> personas
                  <span class="muted">({{ preview.withPush }} con push registrado)</span>
                </p>
              </section>

              <p v-if="formError" class="err">{{ formError }}</p>

              <footer class="modal-foot">
                <button
                  v-if="canGoBack"
                  type="button"
                  class="btn-ghost"
                  @click="goPrevStep"
                >
                  Atrás
                </button>
                <button
                  v-if="canGoNext"
                  type="button"
                  class="btn-ghost"
                  @click="goNextStep"
                >
                  Siguiente
                </button>
                <div class="foot-spacer" />
                <button type="button" class="btn-ghost" :disabled="saving" @click="editorOpen = false">Cerrar</button>
                <button type="button" class="btn-ghost" :disabled="saving" @click="saveDraft">Guardar borrador</button>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="saving || editorStep === 'ia'"
                  @click="askConfirmEditorSubmit"
                >
                  {{ draft.sendType === 'scheduled' ? 'Programar' : 'Enviar ahora' }}
                </button>
              </footer>
            </div>
          </form>
        </aside>
      </div>
    </Teleport>

    <!-- Detalle de campaña (layout 20/80) -->
    <Teleport to="body">
      <div v-if="detail" class="detail-root" @keydown.esc="closeDetail">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="closeDetail" />
        <div class="detail-shell" role="dialog" aria-modal="true" aria-labelledby="notif-detail-title">
          <header class="detail-shell-head">
            <div class="detail-shell-title">
              <h2 id="notif-detail-title">{{ detail.name || detail.title }}</h2>
              <span class="badge" :data-status="detail.status">{{ statusLabel(detail.status) }}</span>
              <span v-if="detail.sentAt" class="muted small">Enviada {{ fmt(detail.sentAt) }}</span>
            </div>
            <div class="detail-shell-actions">
              <button type="button" class="btn-ghost sm" :disabled="detailRefreshing" @click="refreshDetail">
                {{ detailRefreshing ? 'Actualizando…' : 'Actualizar' }}
              </button>
              <button type="button" class="btn-ghost sm" @click="cloneFromDetail">Clonar</button>
              <button type="button" class="btn-ghost sm" @click="closeDetail">Cerrar</button>
            </div>
          </header>

          <div class="detail-split">
            <nav class="detail-nav" aria-label="Secciones del detalle">
              <button
                type="button"
                class="detail-nav-step"
                :class="{ on: detailTab === 'resumen' }"
                @click="detailTab = 'resumen'"
              >
                <span class="detail-nav-n">1</span>
                <span>
                  <strong>Resumen</strong>
                  <small>Mensaje, audiencia, KPIs</small>
                </span>
              </button>
              <button
                type="button"
                class="detail-nav-step"
                :class="{ on: detailTab === 'lecturas' }"
                :disabled="!hasInAppReads && !readSummaryLoading"
                @click="openReadsTab"
              >
                <span class="detail-nav-n">2</span>
                <span>
                  <strong>Lecturas</strong>
                  <small>Quién leyó / no leyó</small>
                </span>
              </button>
              <button
                type="button"
                class="detail-nav-step"
                :class="{ on: detailTab === 'areas' }"
                :disabled="!readSummary?.byArea?.length"
                @click="detailTab = 'areas'"
              >
                <span class="detail-nav-n">3</span>
                <span>
                  <strong>Por área</strong>
                  <small>Adopción por sector</small>
                </span>
              </button>
              <button
                type="button"
                class="detail-nav-step"
                :class="{ on: detailTab === 'ia' }"
                :disabled="!hasInAppReads"
                @click="openInsightTab"
              >
                <span class="detail-nav-n">4</span>
                <span>
                  <strong>Ayuda IA</strong>
                  <small>Insights y próximos pasos</small>
                </span>
              </button>

              <div class="detail-nav-kpis">
                <p class="muted small">Lectura</p>
                <p class="detail-nav-kpi-num">
                  {{ readSummary ? `${readSummary.readRate}%` : readSummaryLoading ? '…' : '—' }}
                </p>
                <p class="muted small">
                  <template v-if="readSummary">
                    {{ readSummary.readCount }}/{{ readSummary.inAppTotal }} leídas
                  </template>
                  <template v-else>Sin datos aún</template>
                </p>
              </div>
            </nav>

            <div class="detail-main">
              <!-- RESUMEN: grilla horizontal -->
              <div v-if="detailTab === 'resumen'" class="detail-pane detail-pane-resumen">
                <section class="detail-card">
                  <h3>Mensaje</h3>
                  <p class="confirm-subject">{{ detail.title }}</p>
                  <p v-if="detail.body" class="detail-text">{{ detail.body }}</p>
                  <div class="detail-href">
                    <span class="muted small">Redirección</span>
                    <code>{{ detail.href || '/' }}</code>
                    <span class="muted small">{{ describeHref(detail.href) }}</span>
                  </div>
                  <p v-if="detail.errorMessage" class="err">{{ detail.errorMessage }}</p>
                </section>

                <section class="detail-card">
                  <h3>Audiencia y envío</h3>
                  <ul class="detail-list compact">
                    <li>{{ audienceLabel(detail) }}</li>
                    <li>
                      {{
                        detail.segment === 'inactive'
                          ? `Solo inactivos (${detail.inactiveDays || 30} días)`
                          : 'Segmento: audiencia elegida'
                      }}
                    </li>
                    <li v-if="detailAudienceParts(detail).length">
                      {{ detailAudienceParts(detail).join(' · ') }}
                    </li>
                    <li>
                      Canales:
                      {{
                        [detail.channels?.inApp !== false && 'in-app', detail.channels?.push !== false && 'push']
                          .filter(Boolean)
                          .join(' + ') || 'ninguno'
                      }}
                    </li>
                    <li>
                      {{
                        detail.sendType === 'scheduled' && detail.scheduledAt
                          ? `Programada: ${fmt(detail.scheduledAt)}`
                          : 'Envío inmediato'
                      }}
                    </li>
                    <li>Creada: {{ fmt(detail.createdAt) }}</li>
                    <li v-if="detail.cancelledAt">Cancelada: {{ fmt(detail.cancelledAt) }}</li>
                  </ul>
                </section>

                <section class="detail-card detail-card-span">
                  <div class="detail-card-head">
                    <h3>Resultado</h3>
                    <button
                      v-if="hasInAppReads"
                      type="button"
                      class="btn-ghost sm"
                      @click="openReadsTab"
                    >
                      Ver lecturas →
                    </button>
                  </div>
                  <ul class="detail-stats">
                    <li>
                      <strong>{{ readSummary?.targeted ?? detail.stats?.targeted ?? '…' }}</strong>
                      <span>Destinatarios</span>
                    </li>
                    <li>
                      <strong>{{ readSummary?.inAppTotal ?? detail.stats?.inApp ?? '…' }}</strong>
                      <span>In-app</span>
                    </li>
                    <li><strong>{{ readSummary?.pushSent ?? detail.stats?.pushSent ?? 0 }}</strong><span>Push ok</span></li>
                    <li><strong>{{ readSummary?.pushFailed ?? detail.stats?.pushFailed ?? 0 }}</strong><span>Push fallos</span></li>
                    <li><strong>{{ readSummary?.readCount ?? '…' }}</strong><span>Leídas</span></li>
                    <li>
                      <strong>{{ readSummary ? `${readSummary.readRate}%` : '…' }}</strong>
                      <span>Tasa lectura</span>
                    </li>
                  </ul>
                  <p v-if="readSummaryLoading" class="muted small">Cargando lecturas…</p>
                  <p v-else-if="readSummary && !readSummary.inAppTotal" class="muted small">
                    Esta campaña no generó avisos in-app (solo push o sin destinatarios).
                  </p>
                </section>
              </div>

              <!-- LECTURAS -->
              <div v-else-if="detailTab === 'lecturas'" class="detail-pane detail-pane-reads">
                <div class="reads-toolbar">
                  <input
                    v-model="readsQ"
                    class="input"
                    type="search"
                    placeholder="Buscar persona…"
                    @keyup.enter="loadReads({ reset: true })"
                  />
                  <select v-model="readsStatus" class="input reads-status" @change="loadReads({ reset: true })">
                    <option value="all">Todas</option>
                    <option value="read">Leídas</option>
                    <option value="unread">No leídas</option>
                  </select>
                  <button type="button" class="btn-ghost sm" :disabled="readsLoading" @click="loadReads({ reset: true })">
                    Filtrar
                  </button>
                  <button type="button" class="btn-ghost sm" :disabled="!readsTotal" @click="exportReadsCsv">
                    Exportar CSV
                  </button>
                  <span class="muted small reads-count">
                    {{ readsTotal }} personas
                    <template v-if="readSummary">
                      · {{ readSummary.readCount }} leídas · {{ readSummary.unreadCount }} sin leer
                    </template>
                  </span>
                </div>
                <p v-if="readsError" class="err">{{ readsError }}</p>
                <p v-if="readsLoading && !readsItems.length" class="muted">Cargando…</p>
                <p v-else-if="!readsItems.length" class="muted">No hay destinatarios in-app para este filtro.</p>
                <div v-else class="reads-table-wrap">
                  <table class="reads-table">
                    <thead>
                      <tr>
                        <th>Persona</th>
                        <th>Área</th>
                        <th>Estado</th>
                        <th>Leída</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in readsItems" :key="r.id">
                        <td>
                          <strong>{{ displayReadName(r) }}</strong>
                          <div class="muted small">{{ r.usuario || r.email }}</div>
                        </td>
                        <td>{{ r.areaNombre || '—' }}</td>
                        <td>
                          <span class="badge" :data-status="r.status === 'read' ? 'sent' : 'draft'">
                            {{ r.status === 'read' ? 'Leída' : 'No leída' }}
                          </span>
                        </td>
                        <td>{{ r.readAt ? fmt(r.readAt) : '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="readsHasMore" class="reads-more">
                  <button type="button" class="btn-ghost sm" :disabled="readsLoading" @click="loadMoreReads">
                    Ver más
                  </button>
                </div>
              </div>

              <!-- POR ÁREA -->
              <div v-else-if="detailTab === 'areas'" class="detail-pane detail-pane-areas">
                <section class="detail-card detail-card-full">
                  <h3>Adopción por área</h3>
                  <p class="muted small">Lecturas in-app sobre el total de avisos enviados a cada área.</p>
                  <ul v-if="readSummary?.byArea?.length" class="detail-area-grid">
                    <li v-for="a in readSummary.byArea" :key="a.areaId || a.nombre">
                      <span class="area-name">{{ a.nombre }}</span>
                      <div class="area-bar" aria-hidden="true">
                        <i :style="{ width: `${a.total ? Math.round((a.read / a.total) * 100) : 0}%` }" />
                      </div>
                      <strong>{{ a.read }}/{{ a.total }}</strong>
                      <em>{{ a.total ? Math.round((a.read / a.total) * 100) : 0 }}%</em>
                    </li>
                  </ul>
                  <p v-else class="muted">Todavía no hay desglose por área.</p>
                </section>
              </div>

              <!-- IA -->
              <div v-else class="detail-pane detail-pane-ia">
                <section class="detail-card">
                  <h3>Ayuda con IA</h3>
                  <p class="muted small">
                    Interpreta tasa de lectura, áreas frías y sugiere próximos pasos. No inventa números.
                  </p>
                  <ul v-if="readSummary" class="detail-list compact">
                    <li>Tasa: {{ readSummary.readRate }}%</li>
                    <li>Leídas: {{ readSummary.readCount }} / {{ readSummary.inAppTotal }}</li>
                    <li>Push ok: {{ readSummary.pushSent }} · fallos: {{ readSummary.pushFailed }}</li>
                  </ul>
                  <button
                    type="button"
                    class="btn-primary sm"
                    :disabled="!aiConfigured || insightBusy || !hasInAppReads"
                    @click="runInsight"
                  >
                    {{ insightBusy ? 'Analizando…' : insight ? 'Regenerar resumen' : 'Generar resumen IA' }}
                  </button>
                  <p v-if="!aiConfigured" class="hint" style="margin-top: 8px">
                    Configurá <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code>.
                  </p>
                  <p v-if="insightError" class="err">{{ insightError }}</p>
                </section>
                <section class="detail-card">
                  <div class="detail-card-head">
                    <h3>Análisis</h3>
                    <button
                      v-if="insight"
                      type="button"
                      class="btn-ghost sm"
                      @click="downloadInsightReport"
                    >
                      Descargar informe
                    </button>
                  </div>
                  <div v-if="insight" class="insight-box">
                    <p class="insight-lead">{{ insight.resumenEjecutivo }}</p>
                    <p v-if="insight.lecturaDeAdopcion"><strong>Adopción:</strong> {{ insight.lecturaDeAdopcion }}</p>
                    <div v-if="insight.segmentosFrios?.length">
                      <strong>Segmentos fríos</strong>
                      <ul>
                        <li v-for="(s, i) in insight.segmentosFrios" :key="i">{{ s }}</li>
                      </ul>
                    </div>
                    <div v-if="insight.recomendaciones?.length">
                      <strong>Recomendaciones</strong>
                      <ul>
                        <li v-for="(s, i) in insight.recomendaciones" :key="i">{{ s }}</li>
                      </ul>
                    </div>
                    <p class="muted small">
                      Confianza: {{ insight.confianza || '—' }}
                      <span v-if="insight.limitaciones"> · {{ insight.limitaciones }}</span>
                    </p>
                  </div>
                  <p v-else class="muted">Generá el resumen para ver el análisis acá.</p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmación enviar / cancelar / programar -->
    <Teleport to="body">
      <div v-if="confirmDialog" class="confirm-root" @keydown.esc="closeConfirm">
        <button type="button" class="backdrop" aria-label="Cerrar" @click="closeConfirm" />
        <div class="confirm-panel" role="dialog" aria-modal="true" :aria-labelledby="confirmTitleId">
          <header class="confirm-head">
            <h2 :id="confirmTitleId">{{ confirmDialog.title }}</h2>
          </header>
          <div class="confirm-body">
            <p class="confirm-lead">{{ confirmDialog.lead }}</p>
            <p v-if="confirmDialog.subject" class="confirm-subject">«{{ confirmDialog.subject }}»</p>
            <ul v-if="confirmDialog.bullets?.length" class="confirm-bullets">
              <li v-for="(b, i) in confirmDialog.bullets" :key="i">{{ b }}</li>
            </ul>
            <p v-if="confirmError" class="err">{{ confirmError }}</p>
          </div>
          <footer class="confirm-foot">
            <button type="button" class="btn-ghost" :disabled="confirmBusy" @click="closeConfirm">
              Cerrar
            </button>
            <button
              type="button"
              :class="confirmDialog.danger ? 'btn-danger' : 'btn-primary'"
              :disabled="confirmBusy"
              @click="runConfirm"
            >
              {{ confirmBusy ? 'Procesando…' : confirmDialog.okLabel }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const toast = ref('')
const items = ref([])
const page = ref(1)
const hasMore = ref(false)
const q = ref('')
const statusFilter = ref('')
const busyId = ref('')
const detail = ref(null)
const detailTab = ref('resumen')
const detailRefreshing = ref(false)
const readSummary = ref(null)
const readSummaryLoading = ref(false)
const readsItems = ref([])
const readsPage = ref(1)
const readsTotal = ref(0)
const readsHasMore = ref(false)
const readsLoading = ref(false)
const readsError = ref('')
const readsStatus = ref('all')
const readsQ = ref('')
const insight = ref(null)
const insightBusy = ref(false)
const insightError = ref('')
const confirmDialog = ref(null)
const confirmBusy = ref(false)
const confirmError = ref('')
const confirmTitleId = 'notif-confirm-title'
const editorOpen = ref(false)
const editorStep = ref('mensaje') // ia | mensaje | enlace | audiencia | envio
const areas = ref([])
const groups = ref([])
const aiConfigured = ref(false)
const aiBusy = ref(false)
const aiNotes = ref('')
const aiPrompt = ref('')
const createMode = ref('manual')
const previewBusy = ref(false)
const preview = reactive({ total: 0, withPush: 0 })

const LINK_KINDS = [
  { id: 'screen', label: 'Pantalla de la app', hint: 'Muro, avisos, docs, perfil…' },
  { id: 'post', label: 'Una publicación', hint: 'Abrir un post concreto del muro' },
  { id: 'survey', label: 'Una encuesta', hint: 'Llevar a responder esa encuesta' },
  { id: 'doc', label: 'Un documento', hint: 'Abrir un archivo de Documentos' },
  { id: 'external', label: 'Sitio web', hint: 'URL https:// fuera de la app' },
  { id: 'custom', label: 'Avanzado', hint: 'Ruta libre si sabés cuál es' },
]

const SCREEN_OPTIONS = [
  { value: '/muro', label: 'Muro', hint: 'Feed de publicaciones' },
  { value: '/avisos', label: 'Avisos', hint: 'Bandeja de notificaciones' },
  { value: '/encuestas', label: 'Encuestas', hint: 'Listado de encuestas' },
  { value: '/docs', label: 'Documentos', hint: 'Biblioteca de archivos' },
  { value: '/accesos', label: 'Accesos', hint: 'Hub de enlaces útiles' },
  { value: '/solicitudes', label: 'Solicitudes', hint: 'Trámites y pedidos' },
  { value: '/perfil', label: 'Mi perfil', hint: 'Datos del colaborador' },
  { value: '/guardados', label: 'Guardados', hint: 'Posts guardados' },
]

const linkTarget = reactive({
  kind: 'screen',
  screen: '/muro',
  postId: '',
  surveyId: '',
  docId: '',
  externalUrl: '',
  customPath: '',
})
const linkPickQuery = ref('')
const linkOptions = reactive({
  posts: [],
  surveys: [],
  docs: [],
  loading: false,
  loaded: false,
  error: '',
})

const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null

const AI_PROMPT_EXAMPLE =
  'Recordá a quienes no entran hace 3 semanas que hay novedades en el muro. Tono amable, enlace al muro, in-app + push.'

const aiPlaceholder = AI_PROMPT_EXAMPLE

const emptyDraft = () => ({
  id: null,
  name: '',
  title: '',
  body: '',
  href: '/muro',
  audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
  segment: 'audience',
  inactiveDays: 30,
  sendType: 'now',
  scheduledLocal: '',
  channels: { inApp: true, push: true },
})

const draft = reactive(emptyDraft())

const selectedAudienceUsers = computed(() =>
  (draft.audience.userIds || []).map((id) => {
    const cached = audienceUserCache.value[id]
    if (cached) return cached
    return { id, label: id, usuario: '', email: '' }
  }),
)

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

const scheduleDate = computed({
  get() {
    return draft.scheduledLocal?.slice(0, 10) || ''
  },
  set(v) {
    draft.sendType = 'scheduled'
    draft.scheduledLocal = composeScheduledLocal(v, draft.scheduledLocal?.slice(11, 16) || scheduleTime.value || '09:00')
  },
})

const scheduleTime = computed({
  get() {
    return draft.scheduledLocal?.slice(11, 16) || ''
  },
  set(v) {
    draft.sendType = 'scheduled'
    draft.scheduledLocal = composeScheduledLocal(scheduleDate.value || todayLocalDate(), v)
  },
})

const scheduleSummary = computed(() => {
  if (!draft.scheduledLocal) return ''
  const d = new Date(draft.scheduledLocal)
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

function setSendNow() {
  draft.sendType = 'now'
}

function setSendScheduled() {
  draft.sendType = 'scheduled'
  if (!draft.scheduledLocal) applySchedulePreset('tomorrow9')
}

function applySchedulePreset(kind) {
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
  draft.sendType = 'scheduled'
  draft.scheduledLocal = toLocalInput(d)
}

function editorSteps() {
  if (createMode.value === 'ai' && !draft.id) return ['ia', 'mensaje', 'enlace', 'audiencia', 'envio']
  return ['mensaje', 'enlace', 'audiencia', 'envio']
}

function stepNum(key) {
  const i = editorSteps().indexOf(key)
  return i >= 0 ? String(i + 1) : ''
}

const canGoBack = computed(() => editorSteps().indexOf(editorStep.value) > 0)
const canGoNext = computed(() => {
  const steps = editorSteps()
  return steps.indexOf(editorStep.value) < steps.length - 1
})

const filteredLinkPosts = computed(() => {
  const q = linkPickQuery.value.trim().toLowerCase()
  if (!q) return linkOptions.posts
  return linkOptions.posts.filter((p) => String(p.titulo || '').toLowerCase().includes(q))
})
const filteredLinkSurveys = computed(() => {
  const q = linkPickQuery.value.trim().toLowerCase()
  if (!q) return linkOptions.surveys
  return linkOptions.surveys.filter((s) => String(s.titulo || '').toLowerCase().includes(q))
})
const filteredLinkDocs = computed(() => {
  const q = linkPickQuery.value.trim().toLowerCase()
  if (!q) return linkOptions.docs
  return linkOptions.docs.filter(
    (d) =>
      String(d.titulo || '').toLowerCase().includes(q) ||
      String(d.category || '').toLowerCase().includes(q),
  )
})

const linkKindSummary = computed(() => {
  const kind = linkTarget.kind
  if (kind === 'screen') {
    const s = SCREEN_OPTIONS.find((x) => x.value === linkTarget.screen)
    return s ? `Abre la pantalla «${s.label}».` : 'Abre una pantalla de la app.'
  }
  if (kind === 'post') {
    const p = linkOptions.posts.find((x) => x.id === linkTarget.postId)
    return p ? `Abre la publicación «${p.titulo}».` : 'Elegí una publicación publicada.'
  }
  if (kind === 'survey') {
    const s = linkOptions.surveys.find((x) => x.id === linkTarget.surveyId)
    return s ? `Abre la encuesta «${s.titulo}».` : 'Elegí una encuesta publicada.'
  }
  if (kind === 'doc') {
    const d = linkOptions.docs.find((x) => x.id === linkTarget.docId)
    return d ? `Abre el documento «${d.titulo}».` : 'Elegí un documento publicado.'
  }
  if (kind === 'external') return 'Abre un sitio web externo.'
  return 'Ruta personalizada.'
})

function goPrevStep() {
  const steps = editorSteps()
  const i = steps.indexOf(editorStep.value)
  if (i > 0) {
    editorStep.value = steps[i - 1]
    if (editorStep.value === 'enlace') ensureLinkOptions()
  }
}

function goNextStep() {
  const steps = editorSteps()
  const i = steps.indexOf(editorStep.value)
  if (i < steps.length - 1) {
    editorStep.value = steps[i + 1]
    if (editorStep.value === 'enlace') ensureLinkOptions()
  }
}

function goToLinkStep() {
  editorStep.value = 'enlace'
  ensureLinkOptions()
}

function buildHrefFromLinkTarget() {
  switch (linkTarget.kind) {
    case 'screen':
      return linkTarget.screen || '/muro'
    case 'post':
      return linkTarget.postId ? `/muro/${linkTarget.postId}` : '/muro'
    case 'survey':
      return linkTarget.surveyId ? `/encuestas/${linkTarget.surveyId}` : '/encuestas'
    case 'doc':
      return linkTarget.docId ? `/docs?doc=${encodeURIComponent(linkTarget.docId)}` : '/docs'
    case 'external': {
      const u = String(linkTarget.externalUrl || '').trim()
      if (!u) return '/'
      return /^https?:\/\//i.test(u) ? u : `https://${u}`
    }
    case 'custom': {
      const p = String(linkTarget.customPath || '').trim() || '/'
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) return p
      return `/${p}`
    }
    default:
      return '/muro'
  }
}

function applyLinkTargetToHref() {
  draft.href = buildHrefFromLinkTarget()
}

function setLinkKind(kind) {
  linkTarget.kind = kind
  linkPickQuery.value = ''
  if (kind === 'screen' && !linkTarget.screen) linkTarget.screen = '/muro'
  applyLinkTargetToHref()
  if (['post', 'survey', 'doc'].includes(kind)) ensureLinkOptions()
}

function resetLinkTarget(defaults = {}) {
  linkTarget.kind = defaults.kind || 'screen'
  linkTarget.screen = defaults.screen || '/muro'
  linkTarget.postId = defaults.postId || ''
  linkTarget.surveyId = defaults.surveyId || ''
  linkTarget.docId = defaults.docId || ''
  linkTarget.externalUrl = defaults.externalUrl || ''
  linkTarget.customPath = defaults.customPath || ''
  linkPickQuery.value = ''
}

function syncLinkTargetFromHref(rawHref) {
  const h = String(rawHref || '/').trim() || '/'
  resetLinkTarget()
  if (/^https?:\/\//i.test(h)) {
    linkTarget.kind = 'external'
    linkTarget.externalUrl = h
    return
  }
  const postM = h.match(/^\/muro\/([^/?#]+)/i)
  if (postM) {
    linkTarget.kind = 'post'
    linkTarget.postId = decodeURIComponent(postM[1])
    return
  }
  const surveyM = h.match(/^\/encuestas\/([^/?#]+)/i)
  if (surveyM) {
    linkTarget.kind = 'survey'
    linkTarget.surveyId = decodeURIComponent(surveyM[1])
    return
  }
  if (h === '/docs' || h.startsWith('/docs?') || h.startsWith('/docs/')) {
    try {
      const u = new URL(h, 'https://connectia.local')
      const docId = u.searchParams.get('doc')
      if (docId) {
        linkTarget.kind = 'doc'
        linkTarget.docId = docId
        return
      }
    } catch {
      /* ignore */
    }
    linkTarget.kind = 'screen'
    linkTarget.screen = '/docs'
    return
  }
  const screen = SCREEN_OPTIONS.find((s) => s.value === h || s.value === h.replace(/\/$/, ''))
  if (screen) {
    linkTarget.kind = 'screen'
    linkTarget.screen = screen.value
    return
  }
  linkTarget.kind = 'custom'
  linkTarget.customPath = h
}

async function ensureLinkOptions({ force = false } = {}) {
  if (linkOptions.loaded && !force) return
  linkOptions.loading = true
  linkOptions.error = ''
  try {
    const [postsRes, surveysRes, docsRes] = await Promise.allSettled([
      api.get('/admin/posts', { params: { status: 'published', size: 80, sortBy: 'publishedAt' } }),
      api.get('/admin/surveys'),
      api.get('/admin/documents'),
    ])
    if (postsRes.status === 'fulfilled') {
      linkOptions.posts = (postsRes.value.data?.items || [])
        .map((p) => ({
          id: String(p.id || p._id),
          titulo: p.titulo || 'Sin título',
          tipo: p.tipo || '',
        }))
        .filter((p) => p.id)
    } else {
      linkOptions.posts = []
    }
    if (surveysRes.status === 'fulfilled') {
      linkOptions.surveys = (surveysRes.value.data?.items || [])
        .filter((s) => s.status === 'published')
        .map((s) => ({
          id: String(s.id || s._id),
          titulo: s.titulo || 'Sin título',
        }))
        .filter((s) => s.id)
    } else {
      linkOptions.surveys = []
    }
    if (docsRes.status === 'fulfilled') {
      linkOptions.docs = (docsRes.value.data?.items || [])
        .filter((d) => !d.status || d.status === 'published')
        .map((d) => ({
          id: String(d.id || d._id),
          titulo: d.titulo || 'Sin título',
          category: d.category || '',
        }))
        .filter((d) => d.id)
    } else {
      linkOptions.docs = []
    }
    const denied = [postsRes, surveysRes, docsRes].filter(
      (r) => r.status === 'rejected' && r.reason?.response?.status === 403,
    )
    if (denied.length === 3) {
      linkOptions.error = 'No tenés permisos para listar publicaciones, encuestas o documentos.'
    }
    linkOptions.loaded = true
  } catch (e) {
    linkOptions.error = e.response?.data?.error || 'No se pudieron cargar los destinos'
  } finally {
    linkOptions.loading = false
  }
}

function switchToAiMode() {
  createMode.value = 'ai'
  if (!aiPrompt.value.trim()) aiPrompt.value = AI_PROMPT_EXAMPLE
  editorStep.value = 'ia'
}

function resetEditorBase() {
  Object.assign(draft, emptyDraft())
  syncLinkTargetFromHref(draft.href)
  aiNotes.value = ''
  formError.value = ''
  editorStep.value = createMode.value === 'ai' ? 'ia' : 'mensaje'
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  editorOpen.value = true
}

function setAudienceMode(mode) {
  const prev = draft.audience || emptyDraft().audience
  const nextMode = ['restricted', 'users'].includes(mode) ? mode : 'all'
  draft.audience = {
    mode: nextMode,
    areaIds: nextMode === 'restricted' ? [...(prev.areaIds || [])].map(String) : [],
    groupIds: nextMode === 'restricted' ? [...(prev.groupIds || [])].map(String) : [],
    userIds: nextMode === 'restricted' || nextMode === 'users' ? [...(prev.userIds || [])].map(String) : [],
  }
  if (nextMode === 'restricted' || nextMode === 'users') ensureAudienceUsersHydrated()
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
    },
  }
}

async function searchAudienceUsers(qText) {
  const query = String(qText || '').trim()
  if (query.length < 2) {
    audienceUserResults.value = []
    return
  }
  audienceUserSearching.value = true
  try {
    const { data } = await api.get('/admin/notifications/audience-candidates', { params: { q: query } })
    const list = data.items || []
    list.forEach(cacheAudienceUser)
    audienceUserResults.value = list.filter((u) => !(draft.audience.userIds || []).includes(u.id))
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
  if (!u?.id) return
  cacheAudienceUser(u)
  if (!(draft.audience.userIds || []).includes(u.id)) {
    draft.audience.userIds = [...(draft.audience.userIds || []), u.id]
  }
  audienceUserResults.value = audienceUserResults.value.filter((x) => x.id !== u.id)
}

function removeAudienceUser(id) {
  draft.audience.userIds = (draft.audience.userIds || []).filter((x) => x !== id)
}

async function ensureAudienceUsersHydrated() {
  const ids = (draft.audience.userIds || []).filter((id) => !audienceUserCache.value[id])
  if (!ids.length) return
  try {
    const { data } = await api.get('/admin/notifications/audience-candidates', {
      params: { ids: ids.join(',') },
    })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

function statusLabel(s) {
  return (
    {
      draft: 'Borrador',
      scheduled: 'Programada',
      sending: 'Enviando',
      sent: 'Enviada',
      cancelled: 'Cancelada',
      failed: 'Fallida',
    }[s] || s
  )
}

function describeHref(raw) {
  const h = String(raw || '/').trim() || '/'
  if (/^https?:\/\//i.test(h)) return 'Sitio web externo'
  if (/^\/muro\/[^/?#]+/i.test(h)) return 'Publicación del muro'
  if (/^\/encuestas\/[^/?#]+/i.test(h)) return 'Encuesta específica'
  if (/^\/docs\/?\?/i.test(h) && /[?&]doc=/.test(h)) return 'Documento específico'
  const screen = SCREEN_OPTIONS.find((s) => s.value === h)
  if (screen) return `Pantalla: ${screen.label}`
  return 'Destino personalizado'
}

function audienceLabel(c) {
  const a = c?.audience
  if (!a || a.mode === 'all') return 'Toda la comunidad'
  if (a.mode === 'users') {
    const n = (a.userIds || []).length
    return n ? `${n} persona${n === 1 ? '' : 's'}` : 'Sin personas'
  }
  const nAreas = (a.areaIds || []).length
  const nGroups = (a.groupIds || []).length
  const extra = (a.userIds || []).length
  const parts = []
  if (nAreas) parts.push(`${nAreas} área${nAreas === 1 ? '' : 's'}`)
  if (nGroups) parts.push(`${nGroups} grupo${nGroups === 1 ? '' : 's'}`)
  if (extra) parts.push(`+${extra} persona${extra === 1 ? '' : 's'}`)
  return parts.length ? parts.join(', ') : 'Segmentada'
}

function detailAudienceParts(c) {
  const a = c?.audience
  if (!a || a.mode === 'all') return []
  const parts = []
  for (const id of a.areaIds || []) {
    const area = areas.value.find((x) => String(x.id) === String(id))
    parts.push(area?.nombre || area?.name || area?.key || `Área ${id}`)
  }
  for (const id of a.groupIds || []) {
    const group = groups.value.find((x) => String(x.id) === String(id))
    parts.push(group?.nombre || group?.name || group?.key || `Grupo ${id}`)
  }
  const nUsers = (a.userIds || []).length
  if (a.mode === 'users' || nUsers) {
    parts.push(`${nUsers} persona${nUsers === 1 ? '' : 's'} específica${nUsers === 1 ? '' : 's'}`)
  }
  return parts
}

function canViewDetail(c) {
  return ['sent', 'failed', 'cancelled', 'sending'].includes(c?.status)
}

const hasInAppReads = computed(() => Number(readSummary.value?.inAppTotal || detail.value?.stats?.inApp || 0) > 0)

function displayReadName(r) {
  const full = [r?.nombre, r?.apellido].filter(Boolean).join(' ').trim()
  return full || r?.usuario || r?.email || '—'
}

function resetDetailState() {
  detailTab.value = 'resumen'
  readSummary.value = null
  readSummaryLoading.value = false
  readsItems.value = []
  readsPage.value = 1
  readsTotal.value = 0
  readsHasMore.value = false
  readsLoading.value = false
  readsError.value = ''
  readsStatus.value = 'all'
  readsQ.value = ''
  insight.value = null
  insightBusy.value = false
  insightError.value = ''
  detailRefreshing.value = false
}

function closeDetail() {
  detail.value = null
  resetDetailState()
}

async function viewOne(c) {
  resetDetailState()
  detail.value = c
  await loadReadSummary()
}

async function loadReadSummary() {
  if (!detail.value?.id) return
  readSummaryLoading.value = true
  try {
    const { data } = await api.get(`/admin/notifications/${detail.value.id}/reads/summary`)
    readSummary.value = data?.summary || null
    applySummaryToCampaign(detail.value.id, data?.summary)
  } catch {
    readSummary.value = null
  } finally {
    readSummaryLoading.value = false
  }
}

function applySummaryToCampaign(campaignId, summary) {
  if (!campaignId || !summary) return
  const nextStats = {
    targeted: summary.targeted ?? summary.inAppTotal ?? 0,
    inApp: summary.inAppTotal ?? 0,
    pushSent: summary.pushSent ?? 0,
    pushFailed: summary.pushFailed ?? 0,
  }
  if (detail.value?.id === campaignId) {
    detail.value = {
      ...detail.value,
      stats: { ...(detail.value.stats || {}), ...nextStats },
    }
  }
  const idx = items.value.findIndex((x) => x.id === campaignId)
  if (idx >= 0) {
    items.value[idx] = {
      ...items.value[idx],
      stats: { ...(items.value[idx].stats || {}), ...nextStats },
    }
  }
}

function openReadsTab() {
  detailTab.value = 'lecturas'
  if (!readsItems.value.length) loadReads({ reset: true })
}

function openInsightTab() {
  detailTab.value = 'ia'
  if (!readSummary.value) loadReadSummary()
}

async function loadReads({ reset = false } = {}) {
  if (!detail.value?.id) return
  if (reset) {
    readsPage.value = 1
    readsItems.value = []
  }
  readsLoading.value = true
  readsError.value = ''
  try {
    const { data } = await api.get(`/admin/notifications/${detail.value.id}/reads`, {
      params: {
        page: readsPage.value,
        limit: 40,
        status: readsStatus.value || 'all',
        q: readsQ.value || undefined,
      },
    })
    const batch = Array.isArray(data?.items) ? data.items : []
    readsItems.value = reset ? batch : [...readsItems.value, ...batch]
    readsTotal.value = Number(data?.total) || 0
    readsHasMore.value = Boolean(data?.hasMore)
    if (data?.summary) {
      readSummary.value = data.summary
      applySummaryToCampaign(detail.value.id, data.summary)
    }
  } catch (e) {
    readsError.value = e.response?.data?.error || 'No se pudieron cargar las lecturas'
  } finally {
    readsLoading.value = false
  }
}

async function refreshDetail() {
  if (!detail.value?.id || detailRefreshing.value) return
  detailRefreshing.value = true
  insightError.value = ''
  readsError.value = ''
  try {
    const { data } = await api.get(`/admin/notifications/${detail.value.id}`)
    if (data?.campaign) {
      detail.value = { ...detail.value, ...data.campaign }
      const idx = items.value.findIndex((x) => x.id === detail.value.id)
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...data.campaign }
    }
    await loadReadSummary()
    if (detailTab.value === 'lecturas') {
      await loadReads({ reset: true })
    }
  } catch (e) {
    readsError.value = e.response?.data?.error || 'No se pudo actualizar el detalle'
  } finally {
    detailRefreshing.value = false
  }
}

function loadMoreReads() {
  if (!readsHasMore.value || readsLoading.value) return
  readsPage.value += 1
  loadReads()
}

async function exportReadsCsv() {
  if (!detail.value?.id) return
  try {
    const { data } = await api.get(`/admin/notifications/${detail.value.id}/reads/export`, {
      params: { status: readsStatus.value || 'all' },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `lecturas-${detail.value.name || detail.value.title || 'campana'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    readsError.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

async function runInsight() {
  if (!detail.value?.id) return
  insightBusy.value = true
  insightError.value = ''
  try {
    const { data } = await api.post(`/admin/notifications/${detail.value.id}/ai-insight`)
    insight.value = data?.analysis || null
    if (data?.summary) {
      readSummary.value = data.summary
      applySummaryToCampaign(detail.value.id, data.summary)
    }
  } catch (e) {
    insightError.value = e.response?.data?.error || e.message || 'No se pudo generar el resumen'
  } finally {
    insightBusy.value = false
  }
}

function buildInsightReportText() {
  const c = detail.value
  const s = readSummary.value
  const a = insight.value
  if (!c || !a) return ''
  const lines = [
    'Informe IA · Notificación Connectia',
    '================================',
    '',
    `Campaña: ${c.name || c.title || ''}`,
    `Título: ${c.title || ''}`,
    `Estado: ${statusLabel(c.status)}`,
    c.sentAt ? `Enviada: ${fmt(c.sentAt)}` : null,
    `Enlace: ${c.href || '/'}`,
    '',
    'Métricas',
    '--------',
    `Destinatarios in-app: ${s?.inAppTotal ?? c.stats?.inApp ?? 0}`,
    `Leídas: ${s?.readCount ?? 0}`,
    `No leídas: ${s?.unreadCount ?? 0}`,
    `Tasa de lectura: ${s?.readRate ?? 0}%`,
    `Push ok: ${s?.pushSent ?? c.stats?.pushSent ?? 0}`,
    `Push fallos: ${s?.pushFailed ?? c.stats?.pushFailed ?? 0}`,
    '',
  ]
  if (s?.byArea?.length) {
    lines.push('Por área', '-------')
    for (const area of s.byArea) {
      const pct = area.total ? Math.round((area.read / area.total) * 100) : 0
      lines.push(`- ${area.nombre}: ${area.read}/${area.total} (${pct}%)`)
    }
    lines.push('')
  }
  lines.push(
    'Análisis IA',
    '-----------',
    '',
    'Resumen ejecutivo',
    a.resumenEjecutivo || '—',
    '',
  )
  if (a.lecturaDeAdopcion) {
    lines.push('Adopción', a.lecturaDeAdopcion, '')
  }
  if (a.segmentosFrios?.length) {
    lines.push('Segmentos fríos')
    for (const item of a.segmentosFrios) lines.push(`- ${item}`)
    lines.push('')
  }
  if (a.recomendaciones?.length) {
    lines.push('Recomendaciones')
    for (const item of a.recomendaciones) lines.push(`- ${item}`)
    lines.push('')
  }
  lines.push(
    `Confianza: ${a.confianza || '—'}`,
    a.limitaciones ? `Limitaciones: ${a.limitaciones}` : null,
    '',
    `Generado: ${new Date().toLocaleString('es-AR')}`,
  )
  return lines.filter((x) => x != null).join('\n')
}

function downloadInsightReport() {
  if (!insight.value || !detail.value) return
  const text = buildInsightReportText()
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = String(detail.value.name || detail.value.title || 'campana')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40)
  a.href = url
  a.download = `informe-ia-${safe}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function cloneFromDetail() {
  const c = detail.value
  if (!c) return
  closeDetail()
  cloneOne(c)
}

function cloneOne(c) {
  createMode.value = 'manual'
  aiPrompt.value = ''
  const baseTitle = (c.title || '').trim()
  const baseName = (c.name || '').trim()
  Object.assign(draft, {
    id: null,
    name: baseName ? `Copia de ${baseName}` : '',
    title: baseTitle ? `Copia de ${baseTitle}` : 'Copia de notificación',
    body: c.body || '',
    href: c.href || '/',
    audience: {
      mode: ['restricted', 'users'].includes(c.audience?.mode) ? c.audience.mode : 'all',
      areaIds: [...(c.audience?.areaIds || [])].map(String),
      groupIds: [...(c.audience?.groupIds || [])].map(String),
      userIds: [...(c.audience?.userIds || [])].map(String),
    },
    segment: c.segment || 'audience',
    inactiveDays: c.inactiveDays || 30,
    sendType: 'now',
    scheduledLocal: '',
    channels: {
      inApp: c.channels?.inApp !== false,
      push: c.channels?.push !== false,
    },
  })
  aiNotes.value = ''
  formError.value = ''
  syncLinkTargetFromHref(draft.href)
  editorStep.value = 'mensaje'
  editorOpen.value = true
  ensureAudienceUsersHydrated()
  refreshPreview()
  showToast('Copia lista para revisar y enviar')
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 4000)
}

async function loadOrg() {
  try {
    const [a, g] = await Promise.all([api.get('/admin/org/areas'), api.get('/admin/org/groups')])
    areas.value = Array.isArray(a.data?.items) ? a.data.items : Array.isArray(a.data) ? a.data : []
    groups.value = Array.isArray(g.data?.items) ? g.data.items : Array.isArray(g.data) ? g.data : []
  } catch {
    areas.value = []
    groups.value = []
  }
}

async function load({ reset = true } = {}) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/notifications', {
      params: {
        page: page.value,
        limit: 30,
        q: q.value || undefined,
        status: statusFilter.value || undefined,
      },
    })
    const batch = Array.isArray(data?.items) ? data.items : []
    items.value = reset ? batch : [...items.value, ...batch]
    hasMore.value = Boolean(data?.hasMore)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  load({ reset: false })
}

function openCreate() {
  createMode.value = 'manual'
  aiPrompt.value = ''
  resetEditorBase()
  refreshPreview()
}

function restoreAiExample() {
  aiPrompt.value = AI_PROMPT_EXAMPLE
}

function openAiCreate() {
  createMode.value = 'ai'
  aiPrompt.value = AI_PROMPT_EXAMPLE
  resetEditorBase()
  refreshPreview()
}

function applyAiDraft(d) {
  if (!d) return
  draft.name = d.name || ''
  draft.title = d.title || ''
  draft.body = d.body || ''
  draft.href = d.href || '/muro'
  syncLinkTargetFromHref(draft.href)
  draft.segment = d.segment === 'inactive' ? 'inactive' : 'audience'
  draft.inactiveDays = d.inactiveDays || 30
  draft.sendType = d.sendType === 'scheduled' ? 'scheduled' : 'now'
  draft.channels.inApp = d.channels?.inApp !== false
  draft.channels.push = d.channels?.push !== false

  const areaIds = []
  const groupIds = []
  for (const key of d.areaKeys || []) {
    const a = areas.value.find((x) => x.key === key)
    if (a) areaIds.push(String(a.id))
  }
  for (const key of d.groupKeys || []) {
    const g = groups.value.find((x) => x.key === key)
    if (g) groupIds.push(String(g.id))
  }
  if (d.audienceMode === 'restricted' && (areaIds.length || groupIds.length)) {
    draft.audience.mode = 'restricted'
    draft.audience.areaIds = areaIds
    draft.audience.groupIds = groupIds
    draft.audience.userIds = []
  } else {
    draft.audience.mode = 'all'
    draft.audience.areaIds = []
    draft.audience.groupIds = []
    draft.audience.userIds = []
  }
  editorStep.value = 'mensaje'

  if (draft.sendType === 'scheduled') {
    const hint = d.scheduleHint || ''
    const parsed = Date.parse(hint)
    if (!Number.isNaN(parsed)) {
      draft.scheduledLocal = toLocalInput(new Date(parsed).toISOString())
    } else {
      // mañana 10:00 local por defecto si sugiere programar
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      draft.scheduledLocal = toLocalInput(tomorrow.toISOString())
    }
  } else {
    draft.scheduledLocal = ''
  }

  aiNotes.value = d.notes || 'Borrador generado — revisá y enviá cuando esté bien.'
}

async function runAiDraft() {
  formError.value = ''
  aiBusy.value = true
  try {
    const { data } = await api.post('/admin/notifications/ai-draft', { prompt: aiPrompt.value })
    applyAiDraft(data?.draft)
    editorStep.value = 'mensaje'
    await refreshPreview()
    showToast('Formulario completado — revisá mensaje, redirección, audiencia y envío')
  } catch (e) {
    formError.value = e.response?.data?.error || e.message || 'No se pudo generar el borrador'
  } finally {
    aiBusy.value = false
  }
}

function editOne(c) {
  createMode.value = 'manual'
  aiPrompt.value = ''
  Object.assign(draft, {
    id: c.id,
    name: c.name || '',
    title: c.title,
    body: c.body || '',
    href: c.href || '/',
    audience: {
      mode: ['restricted', 'users'].includes(c.audience?.mode) ? c.audience.mode : 'all',
      areaIds: [...(c.audience?.areaIds || [])].map(String),
      groupIds: [...(c.audience?.groupIds || [])].map(String),
      userIds: [...(c.audience?.userIds || [])].map(String),
    },
    segment: c.segment || 'audience',
    inactiveDays: c.inactiveDays || 30,
    sendType: c.sendType || 'now',
    scheduledLocal: c.scheduledAt ? toLocalInput(c.scheduledAt) : '',
    channels: {
      inApp: c.channels?.inApp !== false,
      push: c.channels?.push !== false,
    },
  })
  aiNotes.value = ''
  formError.value = ''
  syncLinkTargetFromHref(draft.href)
  editorStep.value = 'mensaje'
  editorOpen.value = true
  ensureAudienceUsersHydrated()
  refreshPreview()
}

function toLocalInput(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function payloadFromDraft({ asDraft = false } = {}) {
  const mode = draft.audience.mode || 'all'
  return {
    name: draft.name,
    title: draft.title,
    body: draft.body,
    href: draft.href,
    audience: {
      mode,
      areaIds: mode === 'restricted' ? draft.audience.areaIds : [],
      groupIds: mode === 'restricted' ? draft.audience.groupIds : [],
      userIds: mode === 'restricted' || mode === 'users' ? draft.audience.userIds : [],
    },
    segment: draft.segment,
    inactiveDays: draft.inactiveDays,
    sendType: draft.sendType,
    scheduledAt: draft.sendType === 'scheduled' && draft.scheduledLocal ? new Date(draft.scheduledLocal).toISOString() : null,
    channels: { ...draft.channels },
    draft: asDraft,
    send: !asDraft && draft.sendType === 'now',
  }
}

async function refreshPreview() {
  previewBusy.value = true
  try {
    const { data } = await api.post('/admin/notifications/preview', payloadFromDraft({ asDraft: true }))
    preview.total = data?.total || 0
    preview.withPush = data?.withPush || 0
  } catch {
    preview.total = 0
    preview.withPush = 0
  } finally {
    previewBusy.value = false
  }
}

async function saveDraft() {
  try {
    applyLinkTargetToHref()
    await persist({ asDraft: true })
  } catch {
    /* formError ya seteado */
  }
}

function closeConfirm() {
  if (confirmBusy.value) return
  confirmDialog.value = null
  confirmError.value = ''
}

function askConfirmEditorSubmit() {
  if (editorStep.value === 'ia') return
  applyLinkTargetToHref()
  if (!draft.title?.trim()) {
    formError.value = 'El título es obligatorio'
    editorStep.value = 'mensaje'
    return
  }
  if (linkTarget.kind === 'post' && !linkTarget.postId) {
    formError.value = 'Elegí la publicación a la que debe llevar el aviso'
    editorStep.value = 'enlace'
    ensureLinkOptions()
    return
  }
  if (linkTarget.kind === 'survey' && !linkTarget.surveyId) {
    formError.value = 'Elegí la encuesta a la que debe llevar el aviso'
    editorStep.value = 'enlace'
    ensureLinkOptions()
    return
  }
  if (linkTarget.kind === 'doc' && !linkTarget.docId) {
    formError.value = 'Elegí el documento al que debe llevar el aviso'
    editorStep.value = 'enlace'
    ensureLinkOptions()
    return
  }
  if (linkTarget.kind === 'external' && !String(linkTarget.externalUrl || '').trim()) {
    formError.value = 'Completá la URL del sitio web'
    editorStep.value = 'enlace'
    return
  }
  const scheduled = draft.sendType === 'scheduled'
  if (scheduled) {
    if (!draft.scheduledLocal) {
      formError.value = 'Elegí día y/o hora para programar el envío'
      editorStep.value = 'envio'
      return
    }
    const when = new Date(draft.scheduledLocal)
    if (Number.isNaN(when.getTime())) {
      formError.value = 'Fecha u hora inválida'
      editorStep.value = 'envio'
      return
    }
    if (when.getTime() < Date.now() - 30_000) {
      formError.value = 'La fecha programada ya pasó'
      editorStep.value = 'envio'
      return
    }
  }
  confirmError.value = ''
  confirmDialog.value = {
    kind: scheduled ? 'schedule-editor' : 'send-editor',
    title: scheduled ? '¿Programar esta notificación?' : '¿Enviar esta notificación ahora?',
    lead: scheduled
      ? 'Quedará programada y el servidor la enviará automáticamente en ese día y hora.'
      : 'Se enviará de inmediato a la audiencia elegida (in-app y/o push según los canales).',
    subject: draft.title,
    bullets: [
      `Destinatarios estimados: ${preview.total}`,
      draft.segment === 'inactive' ? `Solo inactivos (${draft.inactiveDays} días)` : 'Segmento: audiencia elegida',
      `Redirección: ${draft.href || '/'}`,
      scheduled && scheduleSummary.value ? `Programada: ${scheduleSummary.value}` : null,
      `Canales: ${[draft.channels.inApp && 'in-app', draft.channels.push && 'push'].filter(Boolean).join(' + ') || 'ninguno'}`,
    ].filter(Boolean),
    okLabel: scheduled ? 'Sí, programar' : 'Sí, enviar ahora',
    danger: false,
  }
}

function sendOne(c) {
  confirmError.value = ''
  confirmDialog.value = {
    kind: 'send-list',
    campaign: c,
    title: '¿Enviar esta notificación ahora?',
    lead: 'La campaña se despacha de inmediato a los destinatarios definidos.',
    subject: c.title,
    bullets: [
      c.segment === 'inactive' ? `Inactivos ${c.inactiveDays || 30}d` : audienceLabel(c),
      c.sendType === 'scheduled' && c.scheduledAt ? `Estaba programada: ${fmt(c.scheduledAt)}` : null,
    ].filter(Boolean),
    okLabel: 'Sí, enviar',
    danger: false,
  }
}

function cancelOne(c) {
  confirmError.value = ''
  confirmDialog.value = {
    kind: 'cancel-list',
    campaign: c,
    title: '¿Cancelar esta campaña?',
    lead: 'No se enviará. Los borradores y programadas canceladas quedan fuera del flujo de envío.',
    subject: c.title,
    bullets: [statusLabel(c.status), audienceLabel(c)],
    okLabel: 'Sí, cancelar',
    danger: true,
  }
}

async function runConfirm() {
  if (!confirmDialog.value) return
  confirmBusy.value = true
  confirmError.value = ''
  const kind = confirmDialog.value.kind
  const campaign = confirmDialog.value.campaign
  try {
    if (kind === 'send-editor' || kind === 'schedule-editor') {
      await persist({ asDraft: false })
      confirmDialog.value = null
      return
    }
    if (kind === 'send-list' && campaign?.id) {
      busyId.value = campaign.id
      await api.post(`/admin/notifications/${campaign.id}/send`)
      showToast('Enviada')
      confirmDialog.value = null
      await load()
      return
    }
    if (kind === 'cancel-list' && campaign?.id) {
      busyId.value = campaign.id
      await api.post(`/admin/notifications/${campaign.id}/cancel`)
      showToast('Cancelada')
      confirmDialog.value = null
      await load()
    }
  } catch (e) {
    confirmError.value = e.response?.data?.error || 'No se pudo completar la acción'
  } finally {
    confirmBusy.value = false
    busyId.value = ''
  }
}

async function persist({ asDraft }) {
  formError.value = ''
  applyLinkTargetToHref()
  saving.value = true
  try {
    const body = payloadFromDraft({ asDraft })
    if (draft.id) {
      await api.patch(`/admin/notifications/${draft.id}`, body)
      if (!asDraft && draft.sendType === 'now') {
        await api.post(`/admin/notifications/${draft.id}/send`)
      }
    } else {
      await api.post('/admin/notifications', body)
    }
    editorOpen.value = false
    showToast(asDraft ? 'Borrador guardado' : draft.sendType === 'scheduled' ? 'Programada' : 'Enviada')
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
    throw e
  } finally {
    saving.value = false
  }
}

async function improveCopy() {
  aiBusy.value = true
  aiNotes.value = ''
  try {
    const { data } = await api.post('/admin/notifications/ai-copy', {
      title: draft.title,
      body: draft.body,
      href: draft.href,
    })
    if (data?.title) draft.title = data.title
    if (data?.body) draft.body = data.body
    aiNotes.value = data?.notes || 'Copy sugerido — revisá antes de enviar'
  } catch (e) {
    formError.value = e.response?.data?.error || 'IA no disponible'
  } finally {
    aiBusy.value = false
  }
}

async function downloadTemplate() {
  try {
    const { data } = await api.get('/admin/notifications/template.csv', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-notificaciones.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo descargar la plantilla'
  }
}

async function exportCsv() {
  try {
    const { data } = await api.get('/admin/notifications/export', {
      params: { status: statusFilter.value || undefined },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'notificaciones-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

function parseCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line)
    const row = {}
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? ''
    })
    return {
      nombre: row.nombre,
      titulo: row.titulo || row.title,
      cuerpo: row.cuerpo || row.body,
      href: row.href || row.url || '/',
      audiencia: row.audiencia || row.audience || 'all',
      areaIds: row.areaids || row.area_ids || '',
      groupIds: row.groupids || row.group_ids || '',
      userIds: row.userids || row.user_ids || '',
      segment: row.segmento === 'inactive' || row.segment === 'inactive' ? 'inactive' : 'audience',
      inactiveDays: Number(row.inactivedays || row.inactive_days || 30),
      envio: row.envio || row.sendtype || 'now',
      fechaProgramada: row.fechaprogramada || row.scheduledat || '',
      inApp: row.inapp !== '0' && row.inapp !== 'false',
      push: row.push !== '0' && row.push !== 'false',
    }
  })
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else inQ = !inQ
    } else if ((ch === ',' || ch === ';') && !inQ) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

async function onImportFile(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const rows = parseCsv(text)
    if (!rows.length) {
      error.value = 'CSV vacío o sin filas válidas'
      return
    }
    const sendImported = confirm(
      `Se importarán ${rows.length} filas como borradores/programadas.\n¿Enviar ahora las marcadas como «now»?`,
    )
    const { data } = await api.post('/admin/notifications/import', { rows, sendImported })
    showToast(`Importadas ${data.created || 0}` + (data.failed ? ` · errores ${data.failed}` : ''))
    if (data.errors?.length) {
      error.value = data.errors
        .slice(0, 3)
        .map((e) => `Fila ${e.row}: ${e.error}`)
        .join(' · ')
    }
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Importación fallida'
  }
}

watch(
  () => [
    draft.audience.mode,
    draft.segment,
    draft.inactiveDays,
    draft.audience.areaIds,
    draft.audience.groupIds,
    draft.audience.userIds,
  ],
  () => {
    if (editorOpen.value) refreshPreview()
  },
)

onMounted(async () => {
  await Promise.all([load(), loadOrg()])
  try {
    const { data } = await api.get('/admin/notifications/ai-status')
    aiConfigured.value = Boolean(data?.configured)
  } catch {
    aiConfigured.value = false
  }
})
</script>

<style scoped>
.page {
  padding: 24px 28px 48px;
  max-width: none;
}
.page-head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}
.page-head h1 {
  margin: 0 0 4px;
  font-size: 1.6rem;
}
.page-head p {
  margin: 0;
  color: var(--ink-soft);
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 8px 12px;
  background: var(--panel);
  font-size: 14px;
  min-width: 0;
}
.btn-primary,
.btn-ghost {
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
  border: none;
}
.btn-ghost {
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--ink);
}
.btn-ghost.danger {
  color: var(--bad);
}
.btn-primary.sm,
.btn-ghost.sm {
  padding: 6px 10px;
  font-size: 13px;
}
.file-btn {
  display: inline-flex;
  align-items: center;
}
.err {
  color: var(--bad);
  margin: 8px 0;
}
.err.small {
  font-size: 13px;
}
.toast {
  background: var(--ok-bg);
  color: var(--ok);
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 12px;
}
.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ink-soft);
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
}
.hint code {
  font-size: 12px;
  background: var(--line);
  padding: 1px 5px;
  border-radius: 4px;
}
.advanced {
  margin-bottom: 14px;
  border: 1px dashed var(--line-2);
  border-radius: 12px;
  padding: 8px 12px;
  background: #fafafa;
}
.advanced summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.advanced .head-actions {
  margin-top: 8px;
}
.ai-brief {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-brief-full {
  padding: 16px;
  min-height: 320px;
}
.ai-prompt {
  min-height: 180px;
  font-size: 14px;
  line-height: 1.45;
}
.ai-prompt {
  color: var(--ink);
  font-size: 14px;
  line-height: 1.45;
}
.ai-notes {
  margin: 0;
  font-size: 13px;
  color: var(--brand-primary);
  background: var(--panel);
  border-radius: 8px;
  padding: 8px 10px;
}
.muted {
  color: var(--ink-soft);
}
.muted.small,
.small {
  font-size: 12px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--panel);
}
.card-top {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--line);
  color: var(--ink);
}
.badge[data-status='sent'] {
  background: var(--ok-bg);
  color: var(--ok);
}
.badge[data-status='scheduled'] {
  background: #e0e7ff;
  color: #3730a3;
}
.badge[data-status='failed'],
.badge[data-status='cancelled'] {
  background: var(--bad-bg);
  color: var(--bad);
}
.badge[data-status='draft'] {
  background: var(--panel-2);
  color: var(--ink-soft);
}
.title {
  margin: 4px 0 0;
  font-weight: 600;
}
.body {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: 14px;
}
.meta,
.stats {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ink-soft);
}
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.more {
  margin-top: 12px;
}
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 16px;
}
.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
}
.modal {
  position: relative;
  width: min(560px, 100%);
  max-height: min(92vh, 900px);
  overflow: auto;
  background: var(--panel);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.modal-wide {
  width: min(1080px, 96vw);
  max-height: min(94vh, 920px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-wide .modal-head {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 0;
  align-items: flex-start;
}
.modal-head h2 {
  margin: 0;
  font-size: 1.2rem;
}
.form-split {
  display: grid;
  grid-template-columns: 20% 80%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.form-nav {
  border-right: 1px solid var(--line);
  background: var(--panel-2);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.nav-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 10px 8px;
  cursor: pointer;
  color: var(--ink);
}
.nav-step:hover {
  background: var(--panel);
  border-color: var(--line);
}
.nav-step.on {
  background: var(--panel);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary)22;
}
.nav-n {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--line);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.nav-step.on .nav-n {
  background: var(--brand-primary);
  color: #fff;
}
.nav-step strong {
  display: block;
  font-size: 13px;
}
.nav-step small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-soft);
}
.nav-preview {
  margin-top: auto;
  padding: 12px 8px;
  border-top: 1px solid var(--line);
}
.nav-preview-num {
  margin: 2px 0 4px;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--brand-primary);
}
.form-main {
  padding: 16px 20px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pane-title {
  margin: 0;
  font-size: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 0;
  margin: 0;
  padding: 0;
}
.field span,
.field legend {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.chip.on {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.audience-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.link-kinds {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.link-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}
.link-preview {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line);
}
.link-preview-code {
  display: block;
  margin: 4px 0 6px;
  font-size: 13px;
  word-break: break-all;
  color: var(--brand-primary);
  font-weight: 700;
}
.linkish {
  border: 0;
  background: transparent;
  color: var(--brand-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.type-card {
  text-align: left;
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  color: var(--ink);
}
.type-card.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  box-shadow: 0 0 0 1px var(--brand-primary)44;
}
.type-card strong {
  display: block;
  font-size: 13px;
}
.type-card small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--ink-soft);
}
.audience-picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.audience-users {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel-2);
  display: grid;
  gap: 10px;
}
.audience-users h4 {
  margin: 0;
  font-size: 14px;
}
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
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}
.audience-user-add:hover:not(:disabled) {
  border-color: var(--brand-primary);
}
.audience-user-add:disabled {
  opacity: 0.5;
  cursor: default;
}
.audience-user-add strong {
  display: block;
  font-size: 13px;
}
.audience-user-add small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-soft);
}
.audience-user-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.audience-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--ok-bg);
  color: var(--ok);
  border-radius: 999px;
  padding: 4px 8px 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
.audience-chip-x {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: var(--ok);
}
.segment-box {
  margin-top: 4px;
  padding: 12px;
  border: 1px solid var(--line) !important;
  border-radius: 12px;
}
.check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  margin: 4px 0;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.preview-inline {
  margin: 8px 0 0;
  font-size: 14px;
}
.schedule-modes {
  grid-template-columns: 1fr 1fr;
}
.schedule-box {
  padding: 14px;
  border: 1px solid #c7d2fe;
  border-radius: 14px;
  background: #eef2ff;
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
.schedule-summary {
  margin: 0;
  font-size: 14px;
  color: #312e81;
}
@media (max-width: 900px) {
  .schedule-fields {
    grid-template-columns: 1fr;
  }
}
.modal-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.foot-spacer {
  flex: 1;
}
@media (max-width: 900px) {
  .form-split {
    grid-template-columns: 1fr;
  }
  .form-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .nav-preview {
    display: none;
  }
  .audience-modes,
  .link-kinds,
  .audience-picks {
    grid-template-columns: 1fr;
  }
  .card {
    flex-direction: column;
  }
}
.confirm-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 16px;
}
.confirm-panel {
  position: relative;
  width: min(440px, 100%);
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.detail-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 16px;
}
.detail-shell {
  position: relative;
  width: min(1120px, 96vw);
  height: min(88vh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.detail-shell-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.detail-shell-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  min-width: 0;
}
.detail-shell-title h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.25;
}
.detail-shell-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.detail-split {
  display: grid;
  grid-template-columns: 22% 78%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.detail-nav {
  border-right: 1px solid var(--line);
  background: var(--panel-2);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}
.detail-nav-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 10px 8px;
  cursor: pointer;
  color: var(--ink);
}
.detail-nav-step:hover:not(:disabled) {
  background: var(--panel);
  border-color: var(--line);
}
.detail-nav-step.on {
  background: var(--panel);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary)22;
}
.detail-nav-step:disabled {
  opacity: 0.4;
  cursor: default;
}
.detail-nav-n {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--line);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.detail-nav-step.on .detail-nav-n {
  background: var(--brand-primary);
  color: #fff;
}
.detail-nav-step strong {
  display: block;
  font-size: 13px;
}
.detail-nav-step small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-soft);
}
.detail-nav-kpis {
  margin-top: auto;
  padding: 12px 8px 4px;
  border-top: 1px solid var(--line);
}
.detail-nav-kpi-num {
  margin: 2px 0 4px;
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--brand-primary);
  line-height: 1;
}
.detail-main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.detail-pane {
  flex: 1;
  min-height: 0;
  padding: 14px 16px;
  overflow: hidden;
}
.detail-pane-resumen {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px;
}
.detail-pane-ia {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 12px;
}
.detail-pane-areas,
.detail-pane-reads {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--panel);
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-card-span {
  grid-column: 1 / -1;
  overflow: visible;
}
.detail-card-full {
  flex: 1;
}
.detail-card h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.detail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.detail-href {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}
.detail-href code {
  font-size: 12px;
  color: var(--brand-primary);
  word-break: break-all;
}
.detail-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink);
  white-space: pre-wrap;
}
.detail-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--ink-soft);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-list.compact {
  gap: 3px;
}
.detail-stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.detail-stats li {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-stats strong {
  font-size: 1.15rem;
  color: var(--ink);
}
.detail-stats span {
  font-size: 12px;
  color: var(--ink-soft);
}
.reads-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.reads-toolbar .input {
  min-width: 160px;
  flex: 1;
}
.reads-toolbar .reads-status {
  flex: 0 0 140px;
  min-width: 120px;
}
.reads-count {
  margin-left: auto;
}
.reads-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.reads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.reads-table th,
.reads-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.reads-table th {
  position: sticky;
  top: 0;
  background: var(--panel-2);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  z-index: 1;
}
.reads-more {
  flex-shrink: 0;
}
.detail-area-grid {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  min-height: 0;
  flex: 1;
}
.detail-area-grid li {
  display: grid;
  grid-template-columns: minmax(100px, 160px) 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  font-size: 13px;
}
.area-name {
  font-weight: 600;
  color: var(--ink);
}
.area-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}
.area-bar i {
  display: block;
  height: 100%;
  background: var(--brand-primary);
  border-radius: inherit;
}
.detail-area-grid em {
  font-style: normal;
  color: var(--brand-primary);
  font-weight: 700;
  min-width: 2.5rem;
  text-align: right;
}
.insight-box {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--brand-secondary);
  overflow: auto;
  min-height: 0;
  flex: 1;
}
.insight-lead {
  margin: 0;
  font-weight: 600;
  line-height: 1.45;
}
.insight-box ul {
  margin: 4px 0 0;
  padding-left: 18px;
}
@media (max-width: 900px) {
  .detail-shell {
    width: min(100%, 96vw);
    height: min(94vh, 900px);
  }
  .detail-split {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .detail-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .detail-nav-kpis {
    display: none;
  }
  .detail-pane-resumen,
  .detail-pane-ia {
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .detail-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .detail-area-grid li {
    grid-template-columns: 1fr auto auto;
  }
  .area-bar {
    display: none;
  }
}
.confirm-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 10px;
  border-bottom: 1px solid var(--line);
}
.confirm-head h2 {
  margin: 0;
  font-size: 1.1rem;
}
.confirm-body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.confirm-lead {
  margin: 0;
  font-size: 14px;
  color: var(--ink-soft);
}
.confirm-subject {
  margin: 0;
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
}
.confirm-bullets {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--ink-soft);
}
.confirm-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--line);
  background: var(--panel-2);
}
.btn-danger {
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--bad);
  color: #fff;
  border: none;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
