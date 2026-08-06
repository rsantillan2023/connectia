<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Encuestas</h1>
        <p>Definí audiencia, publicá y seguí participación + resultados</p>
        <ScreenHelp
          purpose="Gestión completa de encuestas: a quién llegan, cuántos respondieron y qué contestaron."
          can-do="Publicar, despublicar, activar o desactivar. Clonar. Configurar categorías y tipos de pregunta. Ver participación y resultados. Generar informe IA. Cargar seed base demo de la membresía."
        />
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="btn-ghost enc-cfg-btn"
          :class="{ on: configOpen }"
          :aria-expanded="configOpen"
          aria-controls="enc-config-tabs"
          title="Configuración"
          aria-label="Configuración"
          @click="toggleConfig"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
        <button
          type="button"
          class="btn-ghost seed-icon-btn"
          :disabled="seedBusy"
          title="Cargar seed base de encuestas (idempotente)"
          aria-label="Cargar seed base"
          @click="seedConfirmOpen = true"
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
            <path d="M12 3v12" />
            <path d="m8 11 4 4 4-4" />
            <path d="M5 19h14" />
          </svg>
        </button>
        <button type="button" class="btn-ghost" :disabled="!aiConfigured" @click="openAiNew">
          Nueva encuesta con IA
        </button>
        <button type="button" class="btn-primary" @click="openNew">Nueva encuesta</button>
      </div>
    </header>
    <p v-if="!aiConfigured" class="hint">Para generar con IA configurá las API keys en el backend.</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="seedMsg" class="ok-msg">{{ seedMsg }}</p>
    <p v-if="configMsg" class="ok-msg">{{ configMsg }}</p>

    <nav
      v-if="configOpen"
      id="enc-config-tabs"
      class="enc-config-tabs"
      aria-label="Configuración de encuestas"
    >
      <button type="button" :class="{ on: configPanel === 'categories' }" @click="openConfigCategories">
        Categorías
      </button>
      <button type="button" :class="{ on: configPanel === 'types' }" @click="openConfigTypes">
        Tipos de pregunta
      </button>
    </nav>

    <section v-if="configOpen && configPanel === 'categories'" class="enc-config-panel">
      <div class="enc-config-head">
        <div>
          <h2>Categorías de encuestas</h2>
          <p class="hint">
            Aparecen al crear o editar una encuesta. Usá las flechas para reordenar.
            «General» es fija. Para sumar una, usá la card «Nueva categoría».
          </p>
        </div>
        <div class="enc-config-actions">
          <button type="button" class="btn-ghost" :disabled="configBusy" @click="resetConfigCategories">
            Restaurar base
          </button>
          <button type="button" class="btn-primary" :disabled="configBusy" @click="saveConfigCategories">
            {{ configBusy ? 'Guardando…' : 'Guardar categorías' }}
          </button>
        </div>
      </div>

      <div class="enc-config-stat">
        <span>{{ categoryDraft.length }} categoría{{ categoryDraft.length === 1 ? '' : 's' }}</span>
        <span v-if="configMsg && configPanel === 'categories'" class="ok-msg">{{ configMsg }}</span>
      </div>

      <div class="enc-cat-grid" role="list" aria-label="Categorías">
        <article
          v-for="(c, idx) in categoryDraft"
          :key="c._key || c.id || idx"
          class="enc-cat-card"
          :class="[`tone-${categoryVisual(c).tone}`, { locked: c.id === 'general' }]"
          role="listitem"
        >
          <header class="enc-cat-card-head">
            <div class="enc-cat-icon" aria-hidden="true">
              <i :class="['fas', categoryVisual(c).icon]" />
            </div>
            <div class="enc-cat-main">
              <div class="enc-cat-top">
                <span class="enc-cat-order">{{ idx + 1 }}</span>
                <span v-if="c.id === 'general'" class="enc-pill enc-pill-lock">Fija</span>
                <div class="enc-cat-tools">
                  <button
                    type="button"
                    class="enc-icon-btn"
                    :disabled="idx === 0"
                    title="Subir"
                    aria-label="Subir categoría"
                    @click="moveConfigCategory(idx, -1)"
                  >
                    <i class="fas fa-chevron-up" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="enc-icon-btn"
                    :disabled="idx >= categoryDraft.length - 1"
                    title="Bajar"
                    aria-label="Bajar categoría"
                    @click="moveConfigCategory(idx, 1)"
                  >
                    <i class="fas fa-chevron-down" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="enc-icon-btn danger"
                    :disabled="c.id === 'general' || categoryDraft.length <= 1"
                    :title="c.id === 'general' ? '«General» no se puede eliminar' : 'Eliminar'"
                    aria-label="Eliminar categoría"
                    @click="removeConfigCategory(idx)"
                  >
                    <i class="fas fa-trash-alt" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <input
                v-model="c.label"
                class="input enc-cat-name"
                maxlength="80"
                placeholder="Nombre"
                :aria-label="'Nombre de categoría ' + (idx + 1)"
                :disabled="c.id === 'general'"
                @blur="normalizeCategoryDraftId(c)"
              />
              <span class="enc-cat-id">{{ c.id || 'nuevo' }}</span>
            </div>
          </header>
        </article>

        <form class="enc-cat-card enc-cat-card-new" @submit.prevent="submitNewCategory" role="listitem">
          <div class="enc-cat-icon enc-cat-icon-new" aria-hidden="true">
            <i class="fas fa-plus" />
          </div>
          <div class="enc-cat-main">
            <strong class="enc-cat-new-title">Nueva</strong>
            <input
              v-model="newCategoryLabel"
              class="input enc-cat-name"
              maxlength="80"
              placeholder="Nombre"
              aria-label="Nombre de nueva categoría"
              autocomplete="off"
            />
            <button type="submit" class="btn-primary enc-cat-add-btn" :disabled="!String(newCategoryLabel || '').trim()">
              Agregar
            </button>
          </div>
        </form>
      </div>
    </section>

    <section v-if="configOpen && configPanel === 'types'" class="enc-config-panel">
      <div class="enc-config-head">
        <div>
          <h2>Tipos de pregunta</h2>
          <p class="hint">
            Elegí qué tipologías puede usar esta membresía al armar encuestas. Tocá una card para
            activarla o desactivarla.
          </p>
        </div>
        <div class="enc-config-actions">
          <button type="button" class="btn-ghost" @click="enableAllQuestionTypes">Habilitar todos</button>
          <button type="button" class="btn-primary" :disabled="configBusy" @click="saveConfigQuestionTypes">
            {{ configBusy ? 'Guardando…' : 'Guardar tipos' }}
          </button>
        </div>
      </div>

      <div class="enc-config-stat">
        <span>
          {{ questionTypesEnabledCount }} de {{ questionTypeDraft.length }} habilitado{{
            questionTypesEnabledCount === 1 ? '' : 's'
          }}
        </span>
        <span v-if="configMsg && configPanel === 'types'" class="ok-msg">{{ configMsg }}</span>
      </div>

      <div
        v-for="block in questionTypeGroups"
        :key="block.group"
        class="enc-type-group"
      >
        <h3 class="enc-type-group-title">{{ block.group }}</h3>
        <div class="enc-type-grid" role="list" :aria-label="'Tipos: ' + block.group">
          <button
            v-for="t in block.items"
            :key="t.id"
            type="button"
            class="enc-type-tile"
            :class="{ on: t.enabled }"
            role="listitem"
            :aria-pressed="t.enabled"
            @click="t.enabled = !t.enabled"
          >
            <span class="enc-type-tile-top">
              <span class="enc-type-tile-ico" aria-hidden="true">
                <QuestionTypeIcon :tipo="t.id" :size="20" />
              </span>
              <span class="enc-type-tile-body">
                <span class="enc-type-tile-name">{{ t.label }}</span>
                <span class="enc-type-tile-short">{{ t.short || t.description }}</span>
              </span>
              <span class="enc-type-tile-state" aria-hidden="true">
                <i :class="t.enabled ? 'fas fa-check' : 'fas fa-minus'" />
              </span>
            </span>
            <span class="enc-type-example-wrap">
              <span class="enc-type-example-lbl">Así lo ve el miembro</span>
              <QuestionTypeExample :tipo="t.id" />
            </span>
            <span v-if="t.highlights?.length" class="enc-type-tags">
              <span
                v-for="(h, hi) in t.highlights"
                :key="hi"
                class="enc-type-tag"
                :class="`kind-${h.kind || 'info'}`"
              >{{ h.label }}</span>
            </span>
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
    <div
      v-if="seedConfirmOpen"
      class="hub-dlg-scrim hub-dlg-scrim--confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Cargar seed de encuestas"
      @click.self="seedConfirmOpen = false"
      @keydown.escape.prevent="seedConfirmOpen = false"
    >
      <div class="panel">
        <h2>Cargar seed base de encuestas</h2>
        <p class="hint">
          Crea o actualiza encuestas demo para esta membresía: todos los tipos de pregunta,
          categorías, estados (borrador / publicada / cerrada), audiencias, flujo una a una,
          progreso, anónimas, media en carrusel y algunas respuestas de ejemplo.
        </p>
        <p class="hint">Es idempotente (clave externa). No borra encuestas hechas a mano.</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="seedBusy" @click="seedConfirmOpen = false">
            Cancelar
          </button>
          <button type="button" class="btn-primary" :disabled="seedBusy" @click="runSeedDefaults">
            {{ seedBusy ? 'Cargando…' : 'Sí, cargar seed' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div
      v-if="aiPromptOpen"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Nueva encuesta con IA"
      @click.self="aiPromptOpen = false"
      @keydown.escape.prevent="aiPromptOpen = false"
    >
      <form class="panel editor" @submit.prevent="runAiCreate">
        <h2>Nueva encuesta con IA</h2>
        <p class="hint">
          Describí el objetivo, público, tono y qué querés medir. La IA arma el formulario completo
          (título, descripción y preguntas tipadas). Después lo revisás y publicás.
        </p>
        <div class="audience-modes" style="max-width: 360px">
          <button type="button" class="mode" :class="{ on: createAiProvider === 'auto' }" @click="createAiProvider = 'auto'">Auto</button>
          <button type="button" class="mode" :class="{ on: createAiProvider === 'openai' }" @click="createAiProvider = 'openai'">OpenAI</button>
          <button type="button" class="mode" :class="{ on: createAiProvider === 'anthropic' }" @click="createAiProvider = 'anthropic'">Anthropic</button>
        </div>
        <label>Brief / prompt detallado
          <textarea
            v-model="aiCreatePrompt"
            rows="7"
            class="input"
            required
            placeholder="Ej. Encuesta de clima laboral Q3 para planta y oficinas. Quiero medir satisfacción con liderazgo, carga de trabajo, comunicación interna y beneficios. Incluí valoración 1–5, sí/no y una pregunta abierta al final. Tono cercano, 8–10 preguntas."
            :disabled="aiCreateLoading"
          />
        </label>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="aiCreateLoading" @click="aiPromptOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="aiCreateLoading || !aiCreatePrompt.trim()">
            {{ aiCreateLoading ? 'Armando cuestionario…' : 'Generar formulario' }}
          </button>
        </div>
        <p v-if="aiCreateError" class="err">{{ aiCreateError }}</p>
      </form>
    </div>
    </Teleport>

    <div v-if="!configOpen" class="list-toolbar">
      <p class="list-count">
        <template v-if="listFiltersActive">
          {{ filteredItems.length }} de {{ items.length }}
        </template>
        <template v-else>
          {{ items.length }} encuesta{{ items.length === 1 ? '' : 's' }}
        </template>
      </p>
      <div class="list-toolbar-actions">
        <button
          type="button"
          class="filter-toggle-btn"
          :class="{ on: listFiltersOpen, active: listFiltersActive }"
          :aria-expanded="listFiltersOpen"
          aria-controls="survey-list-filters"
          :title="listFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'"
          :aria-label="listFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'"
          @click="listFiltersOpen = !listFiltersOpen"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
          </svg>
          <span v-if="listFiltersActiveCount" class="filter-toggle-badge">{{ listFiltersActiveCount }}</span>
        </button>
        <div class="view-toggle" role="group" aria-label="Vista del listado">
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ on: listView === 'cards' }"
            title="Vista cards"
            aria-label="Vista cards"
            @click="listView = 'cards'"
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
            :class="{ on: listView === 'grid' }"
            title="Vista grilla"
            aria-label="Vista grilla"
            @click="listView = 'grid'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div
      v-show="!configOpen && listFiltersOpen"
      id="survey-list-filters"
      class="list-filters"
    >
      <label class="list-filters-search">
        <span class="sr-only">Buscar</span>
        <input
          v-model="listFilterQ"
          type="search"
          class="input"
          placeholder="Buscar por título o descripción…"
          autocomplete="off"
        />
      </label>
      <select v-model="listFilterStatus" class="input" aria-label="Filtrar por estado">
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="published">Publicada</option>
        <option value="closed">Desactivada</option>
      </select>
      <select v-model="listFilterCategoria" class="input" aria-label="Filtrar por categoría">
        <option value="">Todas las categorías</option>
        <option v-for="c in surveyCategories" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <select v-model="listFilterAudience" class="input" aria-label="Filtrar por audiencia">
        <option value="">Todas las audiencias</option>
        <option value="all">Toda la comunidad</option>
        <option value="restricted">Áreas y/o grupos</option>
        <option value="users">Solo personas</option>
      </select>
      <button
        type="button"
        class="btn-ghost"
        :disabled="!listFiltersActive"
        @click="clearListFilters"
      >
        Limpiar
      </button>
    </div>

    <!-- Cards: como se ven en la app (sin preguntas) -->
    <div v-if="!configOpen && listView === 'cards' && filteredItems.length" class="survey-board">
      <article
        v-for="s in filteredItems"
        :key="s.id"
        class="survey-card"
        :data-st="s.status"
      >
        <button
          type="button"
          class="survey-card-cover"
          :title="`Vista previa · ${s.titulo}`"
          @click="openPreview(s)"
        >
          <img v-if="s.imageUrl" :src="s.imageUrl" alt="" />
          <span v-else class="survey-card-cover-fallback" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </span>
          <span v-if="s.videoUrl && !s.imageUrl" class="survey-card-video-tag">Video</span>
          <span class="survey-card-status" :data-st="s.status">{{ statusLabel(s.status) }}</span>
        </button>

        <div class="survey-card-body">
          <div class="survey-card-badges">
            <span class="survey-badge survey-badge--cat">{{ categoryLabel(s) }}</span>
            <span class="survey-badge survey-badge--aud">{{ audienceModeLabel(s.audience) }}</span>
            <span v-if="s.anonymous" class="survey-badge">Anónima</span>
            <span v-if="s.questionFlow === 'one_by_one'" class="survey-badge">Una a una</span>
            <span v-if="s.purpose && s.purpose !== 'general'" class="survey-badge">
              {{ s.purpose === 'onboarding' ? 'Onboarding' : s.purpose === 'offboarding' ? 'Offboarding' : purposeLabel(s.purpose) }}
            </span>
          </div>
          <h3 class="survey-card-title">{{ s.titulo }}</h3>
          <p v-if="surveyExcerpt(s)" class="survey-card-desc">{{ surveyExcerpt(s) }}</p>
          <p class="survey-card-meta">
            <span>{{ s.questionCount || 0 }} pregunta{{ (s.questionCount || 0) === 1 ? '' : 's' }}</span>
            <span v-if="audienceDetailLabel(s.audience)"> · {{ audienceDetailLabel(s.audience) }}</span>
          </p>
          <div class="part survey-card-part" :title="partTitle(s)">
            <div class="part-bar">
              <span :style="{ width: partWidth(s) }" />
            </div>
            <small>
              {{ s.participation?.answered ?? s.responseCount ?? 0 }}
              / {{ s.participation?.invited ?? '—' }}
              <template v-if="s.participation?.rate != null"> · {{ s.participation.rate }}%</template>
            </small>
          </div>

          <div class="survey-card-foot">
            <select
              class="pill-select"
              :data-st="s.status"
              :value="s.status"
              :disabled="statusBusyId === s.id"
              :aria-label="`Estado de ${s.titulo}`"
              @change="onListStatusChange(s, $event)"
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              <option value="closed">Desactivada</option>
            </select>
            <div class="icon-actions">
              <button type="button" class="icon-action" title="Vista previa" aria-label="Vista previa" @click="openPreview(s)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button type="button" class="icon-action" title="Estadísticas" aria-label="Estadísticas" @click="openStats(s)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V8"/></svg>
              </button>
              <button type="button" class="icon-action" title="Resultados" aria-label="Resultados" @click="showResults(s)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/></svg>
              </button>
              <button
                type="button"
                class="icon-action"
                title="Informe IA"
                aria-label="Informe IA"
                :disabled="!!statusBusyId || !!reportBusyId"
                @click="openReportModal(s)"
              >
                <svg v-if="reportBusyId === s.id" class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.8 4.8L19 9.5l-4 3.2L16.2 18 12 15.2 7.8 18 9 12.7 5 9.5l5.2-1.7L12 3z"/></svg>
              </button>
              <button type="button" class="icon-action" title="Editar" aria-label="Editar" @click="edit(s)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
              <button
                type="button"
                class="icon-action"
                title="Clonar"
                aria-label="Clonar encuesta"
                :disabled="cloneBusyId === s.id || !!statusBusyId"
                @click="cloneSurvey(s)"
              >
                <svg v-if="cloneBusyId === s.id" class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              <button type="button" class="icon-action" title="Preguntas" aria-label="Editar preguntas" @click="editQuestions(s)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
              </button>
              <button
                v-if="s.status === 'draft'"
                type="button"
                class="icon-action ok"
                title="Publicar"
                aria-label="Publicar"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'published')"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
              <template v-else-if="s.status === 'published'">
                <button
                  type="button"
                  class="icon-action"
                  title="Despublicar"
                  aria-label="Despublicar"
                  :disabled="statusBusyId === s.id"
                  @click="setStatus(s, 'draft')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                </button>
                <button
                  type="button"
                  class="icon-action danger"
                  title="Desactivar"
                  aria-label="Desactivar"
                  :disabled="statusBusyId === s.id"
                  @click="setStatus(s, 'closed')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
                </button>
              </template>
              <button
                v-else
                type="button"
                class="icon-action ok"
                title="Activar"
                aria-label="Activar"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'published')"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Grilla / tabla -->
    <div v-else-if="!configOpen && filteredItems.length" class="survey-table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Encuesta</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Audiencia</th>
            <th>Participación</th>
            <th class="th-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filteredItems" :key="s.id">
            <td>
              <div class="title-cell">
                <button
                  type="button"
                  class="thumb-btn"
                  :class="{ 'thumb-btn--empty': !s.imageUrl }"
                  title="Vista previa"
                  @click="openPreview(s)"
                >
                  <img v-if="s.imageUrl" :src="s.imageUrl" alt="" class="thumb" />
                  <span v-else class="thumb thumb--fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                  </span>
                </button>
                <div class="title-cell-text">
                  <strong>{{ s.titulo }}</strong>
                  <p class="sub">
                    {{ s.questionCount || 0 }} pregunta(s)
                    <template v-if="surveyExcerpt(s, 64)"> · {{ surveyExcerpt(s, 64) }}</template>
                  </p>
                </div>
              </div>
            </td>
            <td>
              <span class="survey-badge survey-badge--cat">{{ categoryLabel(s) }}</span>
            </td>
            <td>
              <select
                class="pill-select"
                :data-st="s.status"
                :value="s.status"
                :disabled="statusBusyId === s.id"
                :aria-label="`Estado de ${s.titulo}`"
                @change="onListStatusChange(s, $event)"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
                <option value="closed">Desactivada</option>
              </select>
            </td>
            <td>
              <div class="aud-cell">
                <strong>{{ audienceModeLabel(s.audience) }}</strong>
                <span v-if="audienceDetailLabel(s.audience)" class="sub">{{ audienceDetailLabel(s.audience) }}</span>
              </div>
            </td>
            <td>
              <div class="part">
                <div class="part-bar" :title="partTitle(s)">
                  <span :style="{ width: partWidth(s) }" />
                </div>
                <small>
                  {{ s.participation?.answered ?? s.responseCount ?? 0 }}
                  / {{ s.participation?.invited ?? '—' }}
                  <template v-if="s.participation?.rate != null"> · {{ s.participation.rate }}%</template>
                </small>
              </div>
            </td>
            <td class="actions">
              <div class="icon-actions">
                <button type="button" class="icon-action" title="Vista previa" aria-label="Vista previa" @click="openPreview(s)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button type="button" class="icon-action" title="Estadísticas" aria-label="Estadísticas" @click="openStats(s)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V8"/></svg>
                </button>
                <button type="button" class="icon-action" title="Resultados" aria-label="Resultados" @click="showResults(s)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/></svg>
                </button>
                <button
                  type="button"
                  class="icon-action"
                  title="Informe IA"
                  aria-label="Informe IA"
                  :disabled="!!statusBusyId || !!reportBusyId"
                  @click="openReportModal(s)"
                >
                  <svg v-if="reportBusyId === s.id" class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.8 4.8L19 9.5l-4 3.2L16.2 18 12 15.2 7.8 18 9 12.7 5 9.5l5.2-1.7L12 3z"/></svg>
                </button>
                <button type="button" class="icon-action" title="Editar" aria-label="Editar" @click="edit(s)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </button>
                <button
                  type="button"
                  class="icon-action"
                  title="Clonar"
                  aria-label="Clonar encuesta"
                  :disabled="cloneBusyId === s.id || !!statusBusyId"
                  @click="cloneSurvey(s)"
                >
                  <svg v-if="cloneBusyId === s.id" class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                </button>
                <button type="button" class="icon-action" title="Preguntas" aria-label="Editar preguntas" @click="editQuestions(s)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
                </button>
                <button
                  v-if="s.status === 'draft'"
                  type="button"
                  class="icon-action ok"
                  title="Publicar"
                  aria-label="Publicar"
                  :disabled="statusBusyId === s.id"
                  @click="setStatus(s, 'published')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
                <template v-else-if="s.status === 'published'">
                  <button
                    type="button"
                    class="icon-action"
                    title="Despublicar"
                    aria-label="Despublicar"
                    :disabled="statusBusyId === s.id"
                    @click="setStatus(s, 'draft')"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  </button>
                  <button
                    type="button"
                    class="icon-action danger"
                    title="Desactivar"
                    aria-label="Desactivar"
                    :disabled="statusBusyId === s.id"
                    @click="setStatus(s, 'closed')"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="icon-action ok"
                  title="Activar"
                  aria-label="Activar"
                  :disabled="statusBusyId === s.id"
                  @click="setStatus(s, 'published')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="!configOpen && !items.length" class="muted">Sin encuestas aún.</p>
    <p v-else-if="!configOpen" class="muted">Ninguna encuesta coincide con los filtros.</p>

    <!-- Informe IA descargable -->
    <Teleport to="body">
    <div
      v-if="reportSurvey"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Informe IA con gráficos"
      @click.self="closeReportModal"
      @keydown.escape.prevent="closeReportModal"
    >
      <div class="panel">
        <h2>Informe IA con gráficos</h2>
        <p class="hint">
          {{ reportSurvey.titulo }} — la IA analiza los resultados y genera un documento con
          resumen, hallazgos y gráficos de participación y respuestas.
        </p>
        <label>Enfoque opcional
          <textarea v-model="reportFocus" rows="2" class="input" placeholder="Ej. Enfocá clima y liderazgo…" />
        </label>
        <div class="audience-modes" style="max-width: 360px">
          <button type="button" class="mode" :class="{ on: reportProvider === 'auto' }" @click="reportProvider = 'auto'">Auto</button>
          <button type="button" class="mode" :class="{ on: reportProvider === 'openai' }" @click="reportProvider = 'openai'">OpenAI</button>
          <button type="button" class="mode" :class="{ on: reportProvider === 'anthropic' }" @click="reportProvider = 'anthropic'">Anthropic</button>
        </div>
        <div class="footer" style="justify-content: flex-start; flex-wrap: wrap">
          <button type="button" class="btn-primary" :disabled="!!reportBusyId" @click="generateReport('pdf')">
            {{ reportBusyId === reportSurvey.id && reportFormat === 'pdf' ? 'Generando PDF…' : 'Descargar PDF' }}
          </button>
          <button type="button" class="btn-ghost" :disabled="!!reportBusyId" @click="generateReport('docx')">
            {{ reportBusyId === reportSurvey.id && reportFormat === 'docx' ? 'Generando DOCX…' : 'Descargar DOCX' }}
          </button>
          <button type="button" class="btn-ghost" :disabled="!!reportBusyId" @click="closeReportModal">Cancelar</button>
        </div>
        <p v-if="reportError" class="err">{{ reportError }}</p>
      </div>
    </div>
    </Teleport>

    <!-- Editor -->
    <Teleport to="body">
    <div
      v-if="draft"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      :aria-label="draft.id ? 'Editar encuesta' : 'Nueva encuesta'"
      @click.self="closeDraft"
      @keydown.escape.prevent="onDraftEscape"
    >
      <form class="panel editor survey-editor" @submit.prevent="save">
        <header class="editor-head">
          <h2>{{ draft.id ? 'Editar encuesta' : 'Nueva encuesta' }}</h2>
          <label class="editor-head-status">
            <span>Estado</span>
            <select v-model="draft.status" class="input pill-select" :data-st="draft.status">
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              <option value="closed">Desactivada</option>
            </select>
          </label>
          <div class="editor-head-actions">
            <span v-if="autosaveMsg" class="survey-autosave">{{ autosaveMsg }}</span>
            <button type="button" class="btn-ghost" :disabled="saving" @click="previewDraft">Vista previa</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
            <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closeDraft">×</button>
          </div>
        </header>
        <div class="survey-editor-layout">
          <nav class="survey-editor-nav" aria-label="Apartados de la encuesta">
            <button
              v-for="sec in draftSections"
              :key="sec.id"
              type="button"
              class="survey-nav-item"
              :class="{ on: draftSection === sec.id }"
              :disabled="saving"
              @click="goDraftSection(sec.id)"
            >
              {{ sec.label }}
              <span v-if="sec.id === 'preguntas' && draft.questions.length" class="survey-nav-count">
                {{ draft.questions.length }}
              </span>
              <span v-else-if="sec.id === 'media' && draftMediaCount" class="survey-nav-count">
                {{ draftMediaCount }}
              </span>
            </button>
          </nav>

          <div class="survey-editor-body">
            <section v-if="draftSection === 'general'" class="survey-sec">
              <h3 class="survey-sec-title">General</h3>

              <details class="ai-help-box">
                <summary class="ai-help-summary">
                  <strong>Ayuda IA</strong>
                  <span class="hint">Completá título, descripción y contexto con IA</span>
                </summary>
                <div class="ai-help-body">
                  <div class="ai-provider-row" role="group" aria-label="Proveedor de IA">
                    <button type="button" class="ai-provider-btn" :class="{ on: generalAiProvider === 'auto' }" :disabled="generalAiBusy" @click="generalAiProvider = 'auto'">Auto</button>
                    <button type="button" class="ai-provider-btn" :class="{ on: generalAiProvider === 'openai' }" :disabled="generalAiBusy" @click="generalAiProvider = 'openai'">OpenAI</button>
                    <button type="button" class="ai-provider-btn" :class="{ on: generalAiProvider === 'anthropic' }" :disabled="generalAiBusy" @click="generalAiProvider = 'anthropic'">Anthropic</button>
                  </div>
                  <p class="hint">
                    Describí el objetivo o el contexto. La IA completa título, descripción y el contexto para generar preguntas.
                  </p>
                  <label>Brief / contexto
                    <textarea
                      v-model="generalAiPrompt"
                      rows="3"
                      class="input"
                      :disabled="generalAiBusy || !aiConfigured"
                      placeholder="Ej. Encuesta de clima Q3 para planta y oficinas. Quiero medir liderazgo, carga de trabajo y beneficios. Tono cercano, sin temas salariales…"
                    />
                  </label>
                  <div class="ai-help-actions">
                    <button
                      type="button"
                      class="btn-primary"
                      :disabled="generalAiBusy || !aiConfigured || !generalAiPrompt.trim()"
                      @click="runGeneralAi"
                    >
                      {{ generalAiBusy ? 'Generando…' : 'Completar con IA' }}
                    </button>
                  </div>
                  <p v-if="!aiConfigured" class="hint">Configurá las API keys de IA en el backend para usar esta ayuda.</p>
                  <p v-if="generalAiError" class="err">{{ generalAiError }}</p>
                </div>
              </details>

              <label>Título<input v-model="draft.titulo" required class="input" /></label>
              <div class="cat-field">
                <span class="cat-field-label">Categoría</span>
                <div class="cat-picker" role="radiogroup" aria-label="Categoría de la encuesta">
                  <button
                    v-for="c in surveyCategories"
                    :key="c.id"
                    type="button"
                    role="radio"
                    class="cat-picker-btn"
                    :class="{ on: draft.categoria === c.id }"
                    :aria-checked="draft.categoria === c.id"
                    @click="draft.categoria = c.id"
                  >
                    {{ c.label }}
                  </button>
                </div>
                <p class="hint">Obligatoria. Se muestra en el listado de encuestas.</p>
              </div>
              <label>Descripción
                <textarea v-model="draft.descripcion" rows="3" class="input" placeholder="Texto visible para el miembro en la app" />
              </label>
              <label>Contexto para generación de preguntas
                <textarea
                  v-model="draft.aiContext"
                  rows="4"
                  class="input"
                  placeholder="Briefing interno para la IA: temas a medir, tono, qué evitar, tipologías deseadas… (no se muestra en la app)"
                />
              </label>
              <p class="hint">Este contexto se usa al crear preguntas con IA. El miembro no lo ve.</p>
            </section>

            <section v-else-if="draftSection === 'media'" class="survey-sec">
              <h3 class="survey-sec-title">Media</h3>
              <p class="hint">Imágenes y video de portada. Se muestran en la app (lista, detalle y muro).</p>
              <div class="media-block">
                <div class="media-block-head">
                  <strong>Archivos</strong>
                  <label class="btn-ghost file-btn">
                    {{ mediaUploading ? 'Subiendo…' : 'Subir archivos' }}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      multiple
                      hidden
                      :disabled="mediaUploading"
                      @change="onMediaFiles"
                    />
                  </label>
                </div>
                <p class="hint">Podés subir varias imágenes y un video (mp4/webm/mov). Máx. 12 archivos.</p>
                <div v-if="draftMediaImages.length || draft.videoUrl" class="media-grid">
                  <div v-for="(url, i) in draftMediaImages" :key="`img-${i}-${url}`" class="media-tile">
                    <img :src="url" alt="" />
                    <button type="button" class="media-tile-x" aria-label="Quitar imagen" @click="removeDraftImage(i)">×</button>
                  </div>
                  <div v-if="draft.videoUrl" class="media-tile media-tile--video">
                    <video :src="draft.videoUrl" controls preload="metadata" />
                    <button type="button" class="media-tile-x" aria-label="Quitar video" @click="draft.videoUrl = ''">×</button>
                  </div>
                </div>
                <p v-else class="hint">Todavía no hay media. Usá «Subir archivos» para agregar imágenes o un video.</p>
              </div>
            </section>

            <section v-else-if="draftSection === 'publicacion'" class="survey-sec">
              <h3 class="survey-sec-title">Características</h3>
              <p class="hint">Propósito, ventana de disponibilidad y anonimato. El estado se cambia arriba, junto al título.</p>
              <label>Uso / propósito
                <select v-model="draft.purpose" class="input">
                  <option value="general">General</option>
                  <option value="onboarding">Onboarding / bienvenida</option>
                  <option value="offboarding">Offboarding / egreso</option>
                </select>
              </label>
              <p class="hint">Las de onboarding/egreso se vinculan a hitos desde Admin → Onboarding (mismo motor, sin otro constructor).</p>
              <div class="q-row">
                <label>Disponible desde
                  <input v-model="draft.startsAtLocal" type="datetime-local" class="input" />
                </label>
                <label>Disponible hasta
                  <input v-model="draft.endsAtLocal" type="datetime-local" class="input" />
                </label>
              </div>
              <p class="hint">Agenda de ejecución: fuera de esta ventana la encuesta no acepta respuestas.</p>
              <label class="check">
                <input v-model="draft.anonymous" type="checkbox" />
                Cuestionario anónimo (no se verá quién respondió en Resultados)
              </label>

              <div class="char-block">
                <strong>Ejecución de preguntas</strong>
                <p class="hint">Cómo responde el miembro en la app.</p>
                <div class="audience-modes">
                  <button
                    type="button"
                    class="mode"
                    :class="{ on: draft.questionFlow !== 'one_by_one' }"
                    @click="draft.questionFlow = 'all'"
                  >
                    Todas juntas
                  </button>
                  <button
                    type="button"
                    class="mode"
                    :class="{ on: draft.questionFlow === 'one_by_one' }"
                    @click="draft.questionFlow = 'one_by_one'"
                  >
                    Una a una
                  </button>
                </div>
                <p class="hint">
                  {{
                    draft.questionFlow === 'one_by_one'
                      ? 'Se muestra una pregunta por pantalla, con anterior / siguiente.'
                      : 'Se muestran todas las preguntas en un mismo scroll.'
                  }}
                </p>
              </div>

              <label class="check">
                <input v-model="draft.showProgress" type="checkbox" />
                Mostrar progreso en la app (contador y barra)
              </label>
              <p class="hint">
                Al publicar se congela el tamaño de la audiencia enviada (ej. 500 personas) para medir participación.
              </p>
            </section>

            <section v-else-if="draftSection === 'audiencia'" class="survey-sec">
              <h3 class="survey-sec-title">Audiencia</h3>
              <p class="hint">Quién puede ver y responder esta encuesta en la app.</p>
              <div class="audience-modes audience-modes--3">
                <button
                  type="button"
                  class="mode"
                  :class="{ on: draft.audience.mode === 'all' }"
                  @click="setAudienceMode('all')"
                >
                  Toda la comunidad
                </button>
                <button
                  type="button"
                  class="mode"
                  :class="{ on: draft.audience.mode === 'restricted' }"
                  @click="setAudienceMode('restricted')"
                >
                  Áreas y/o grupos
                </button>
                <button
                  type="button"
                  class="mode"
                  :class="{ on: draft.audience.mode === 'users' }"
                  @click="setAudienceMode('users')"
                >
                  Solo personas
                </button>
              </div>

              <div v-if="draft.audience.mode === 'restricted'" class="audience-picks">
                <div>
                  <p class="pick-title">Áreas</p>
                  <label v-for="a in areas" :key="a.id" class="check">
                    <input v-model="draft.audience.areaIds" type="checkbox" :value="a.id" />
                    {{ a.nombre }}
                  </label>
                  <p v-if="!areas.length" class="hint">No hay áreas. Creálas en Organización.</p>
                </div>
                <div>
                  <p class="pick-title">Grupos</p>
                  <label v-for="g in groups" :key="g.id" class="check">
                    <input v-model="draft.audience.groupIds" type="checkbox" :value="g.id" />
                    {{ g.nombre }}
                  </label>
                  <p v-if="!groups.length" class="hint">No hay grupos. Creálos en Organización.</p>
                </div>
              </div>

              <div
                v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'"
                class="audience-users"
              >
                <div class="audience-users-head">
                  <p class="pick-title">
                    {{ draft.audience.mode === 'users' ? 'Destinatarios' : 'También personas puntuales' }}
                  </p>
                  <input
                    v-model="audienceUserQuery"
                    class="input"
                    type="search"
                    placeholder="Buscar nombre, usuario o email…"
                    @input="onAudienceUserQuery"
                  />
                </div>
                <p class="hint">
                  {{
                    draft.audience.mode === 'users'
                      ? 'Solo estas personas reciben la encuesta.'
                      : 'Opcional: sumá personas concretas además de áreas/grupos.'
                  }}
                </p>

                <div class="audience-import">
                  <div class="audience-import-actions">
                    <button type="button" class="btn-ghost" :disabled="audienceImportBusy" @click="downloadAudienceTemplate">
                      Descargar plantilla Excel
                    </button>
                    <label class="btn-ghost file-btn">
                      {{ audienceImportBusy ? 'Procesando…' : 'Subir Excel / CSV' }}
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        hidden
                        :disabled="audienceImportBusy"
                        @change="onAudienceImportFile"
                      />
                    </label>
                  </div>
                  <p class="hint">
                    Columnas: legajo, dni, cuil, email, usuario, nombre, apellido (alcanza con una clave por fila).
                  </p>
                  <p v-if="audienceImportError" class="err">{{ audienceImportError }}</p>
                  <div v-if="audienceImportSummary" class="audience-import-summary">
                    <p>
                      <strong>{{ audienceImportSummary.matched }}</strong> encontradas ·
                      <strong>{{ audienceImportSummary.unmatched }}</strong> sin match
                      (de {{ audienceImportSummary.rows }} filas)
                    </p>
                    <details v-if="audienceImportUnmatched.length" class="audience-import-miss">
                      <summary>Ver no encontradas ({{ audienceImportUnmatched.length }})</summary>
                      <ul>
                        <li v-for="(m, i) in audienceImportUnmatched.slice(0, 40)" :key="i">
                          Fila {{ m.row || '—' }}:
                          {{ [m.legajo, m.dni, m.usuario, m.email, m.nombre, m.apellido].filter(Boolean).join(' · ') || '—' }}
                          — {{ m.reason }}
                        </li>
                      </ul>
                    </details>
                  </div>
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
            </section>

            <section v-else class="survey-sec survey-sec--preguntas">
              <div class="qs-toolbar">
                <div>
                  <h3 class="survey-sec-title">Configuración de preguntas</h3>
                  <p class="hint">Creá preguntas y editá cada una desde su pestaña.</p>
                </div>
                <div class="qs-toolbar-actions">
                  <button
                    type="button"
                    class="btn-ghost"
                    :disabled="!aiConfigured || aiQuestionsBusy"
                    @click="openAiQuestions"
                  >
                    Crear preguntas con IA
                  </button>
                  <button type="button" class="btn-primary" @click="openCreateQuestion">
                    Crear pregunta
                  </button>
                </div>
              </div>

              <template v-if="draft.questions.length">
                <div class="q-tabs" role="tablist" aria-label="Preguntas">
                  <button
                    v-for="(q, i) in draft.questions"
                    :key="q.id"
                    type="button"
                    role="tab"
                    class="q-tab"
                    :class="{ on: activeQuestionId === q.id }"
                    :aria-selected="activeQuestionId === q.id"
                    :title="q.texto || `Pregunta ${i + 1}`"
                    @click="activeQuestionId = q.id"
                  >
                    {{ i + 1 }}
                  </button>
                </div>

                <div v-if="activeQuestion" class="q-pane" role="tabpanel">
                  <header class="q-pane-head">
                    <strong>Pregunta {{ activeQuestionIndex + 1 }}</strong>
                    <button
                      type="button"
                      class="btn-ghost danger"
                      @click="removeQuestion(activeQuestion.id)"
                    >
                      Eliminar
                    </button>
                  </header>
                  <label>Texto
                    <input v-model="activeQuestion.texto" class="input" placeholder="Texto de la pregunta" />
                  </label>
                  <QuestionTypePicker v-model="activeQuestion.tipo" :types="pickerTypesFor(activeQuestion.tipo)" />
                  <label>Grupo / sección
                    <input v-model="activeQuestion.grupo" class="input" placeholder="Ej. Liderazgo" />
                  </label>
                  <div
                    v-if="activeQuestion.tipo === 'single' || activeQuestion.tipo === 'multiple'"
                    class="opciones-field"
                  >
                    <div class="opciones-head">
                      <span>Opciones</span>
                      <button
                        type="button"
                        class="btn-ghost opciones-sep-btn"
                        title="Inserta el separador entre opciones"
                        @click="insertOptionSeparator(activeQuestion, $event)"
                      >
                        Usá este botón para separar opciones
                      </button>
                    </div>
                    <input
                      v-model="activeQuestion.opcionesText"
                      class="input"
                      placeholder="Ej. Opción A  ·  Opción B  ·  Opción C"
                    />
                    <p class="hint">Escribí una opción y tocá el botón para marcar la separación; no hace falta buscar el carácter |.</p>
                  </div>
                  <p v-if="typeHint(activeQuestion.tipo)" class="hint">{{ typeHint(activeQuestion.tipo) }}</p>
                  <div class="q-image-block">
                    <div class="q-image-block-head">
                      <strong>Imagen de la pregunta</strong>
                      <label class="btn-ghost file-btn">
                        {{ questionImageUploading ? 'Subiendo…' : activeQuestion.imageUrl ? 'Cambiar imagen' : 'Subir imagen' }}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          hidden
                          :disabled="questionImageUploading"
                          @change="onQuestionImageFile($event, activeQuestion)"
                        />
                      </label>
                    </div>
                    <p class="hint">Opcional. La pregunta puede referirse a esta imagen (ej. “¿Qué ves en la foto?”).</p>
                    <div v-if="activeQuestion.imageUrl" class="q-image-preview">
                      <img :src="activeQuestion.imageUrl" alt="Imagen de la pregunta" />
                      <button type="button" class="btn-ghost danger" @click="activeQuestion.imageUrl = ''">Quitar</button>
                    </div>
                  </div>
                  <label class="check">
                    <input v-model="activeQuestion.required" type="checkbox" />
                    Obligatoria
                  </label>
                </div>
              </template>
              <p v-else class="hint q-empty">
                Todavía no hay preguntas. Usá «Crear pregunta» para agregar la primera.
              </p>
            </section>
          </div>
        </div>
        <p v-if="formError" class="err editor-err">{{ formError }}</p>
      </form>
    </div>
    </Teleport>

    <!-- Modal crear pregunta -->
    <Teleport to="body">
    <div
      v-if="questionModalOpen"
      class="hub-dlg-scrim hub-dlg-scrim--confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Crear pregunta"
      @click.self="closeCreateQuestion"
      @keydown.escape.prevent="closeCreateQuestion"
    >
      <form class="panel question-create-panel" @submit.prevent="confirmCreateQuestion">
        <div class="panel-head-row">
          <h2>Crear pregunta</h2>
          <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closeCreateQuestion">×</button>
        </div>
        <div class="q-create-layout">
          <div class="q-create-form">
            <label>Texto
              <input v-model="questionDraft.texto" class="input" required placeholder="Texto de la pregunta" />
            </label>
            <QuestionTypePicker v-model="questionDraft.tipo" :types="pickerTypesFor(questionDraft.tipo)" />
            <label>Grupo / sección
              <input v-model="questionDraft.grupo" class="input" placeholder="Ej. Liderazgo" />
            </label>
            <div
              v-if="questionDraft.tipo === 'single' || questionDraft.tipo === 'multiple'"
              class="opciones-field"
            >
              <div class="opciones-head">
                <span>Opciones</span>
                <button
                  type="button"
                  class="btn-ghost opciones-sep-btn"
                  title="Inserta el separador entre opciones"
                  @click="insertOptionSeparator(questionDraft, $event)"
                >
                  Usá este botón para separar opciones
                </button>
              </div>
              <input
                v-model="questionDraft.opcionesText"
                class="input"
                placeholder="Ej. Opción A  ·  Opción B  ·  Opción C"
              />
              <p class="hint">Escribí una opción y tocá el botón para marcar la separación; no hace falta buscar el carácter |.</p>
            </div>
            <p v-if="typeHint(questionDraft.tipo)" class="hint">{{ typeHint(questionDraft.tipo) }}</p>
            <div class="q-image-block">
              <div class="q-image-block-head">
                <strong>Imagen de la pregunta</strong>
                <label class="btn-ghost file-btn">
                  {{ questionImageUploading ? 'Subiendo…' : questionDraft.imageUrl ? 'Cambiar imagen' : 'Subir imagen' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    :disabled="questionImageUploading"
                    @change="onQuestionImageFile($event, questionDraft)"
                  />
                </label>
              </div>
              <p class="hint">Opcional. La pregunta puede referirse a esta imagen.</p>
              <div v-if="questionDraft.imageUrl" class="q-image-preview">
                <img :src="questionDraft.imageUrl" alt="Imagen de la pregunta" />
                <button type="button" class="btn-ghost danger" @click="questionDraft.imageUrl = ''">Quitar</button>
              </div>
            </div>
            <label class="check">
              <input v-model="questionDraft.required" type="checkbox" />
              Obligatoria
            </label>
            <p v-if="questionModalError" class="err">{{ questionModalError }}</p>
          </div>

          <aside class="q-create-example" aria-live="polite">
            <p class="q-ex-kicker">Vista previa · {{ typeLabel(questionDraft.tipo) }}</p>
            <p class="q-ex-prompt">
              {{ questionDraft.texto?.trim() || 'Texto de la pregunta…' }}
              <em v-if="questionDraft.required !== false" class="q-ex-req">*</em>
            </p>
            <p class="q-ex-meta">
              {{ questionDraft.required !== false ? 'Obligatoria' : 'Opcional' }}
              <template v-if="questionDraft.grupo?.trim()"> · {{ questionDraft.grupo.trim() }}</template>
            </p>

            <figure v-if="questionDraft.imageUrl" class="q-ex-image">
              <img :src="questionDraft.imageUrl" alt="Imagen de la pregunta" />
            </figure>

            <div class="q-ex-widget" :data-tipo="questionDraft.tipo">
              <template v-if="questionDraft.tipo === 'text'">
                <input class="input" disabled placeholder="Escribí tu respuesta…" />
              </template>
              <template v-else-if="questionDraft.tipo === 'textarea'">
                <textarea class="input" rows="3" disabled placeholder="Contanos con más detalle…" />
              </template>
              <template v-else-if="questionDraft.tipo === 'number'">
                <input class="input" disabled type="number" placeholder="Ej. 42" />
              </template>
              <template v-else-if="questionDraft.tipo === 'yesno'">
                <div class="q-ex-choices">
                  <span class="q-ex-chip on">Sí</span>
                  <span class="q-ex-chip">No</span>
                </div>
              </template>
              <template v-else-if="questionDraft.tipo === 'single' || questionDraft.tipo === 'multiple'">
                <div v-if="questionDraftOpciones.length" class="q-ex-choices col">
                  <label
                    v-for="(o, oi) in questionDraftOpciones"
                    :key="`${oi}-${o}`"
                    class="q-ex-opt"
                  >
                    <span
                      :class="[
                        questionDraft.tipo === 'multiple' ? 'q-ex-check' : 'q-ex-radio',
                        { on: oi === 0 },
                      ]"
                      aria-hidden="true"
                    />
                    {{ o }}
                  </label>
                </div>
                <p v-else class="q-ex-empty-opts">Agregá opciones a la izquierda para verlas acá.</p>
              </template>
              <template v-else-if="questionDraft.tipo === 'rating'">
                <div class="q-ex-stars">
                  <span v-for="n in 5" :key="n" class="q-ex-star" :class="{ on: n <= 4 }">★</span>
                </div>
              </template>
              <template v-else-if="questionDraft.tipo === 'date'">
                <input class="input" disabled type="date" />
              </template>
              <template v-else-if="questionDraft.tipo === 'time'">
                <input class="input" disabled type="time" />
              </template>
              <template v-else-if="questionDraft.tipo === 'datetime'">
                <input class="input" disabled type="datetime-local" />
              </template>
              <template v-else-if="questionDraft.tipo === 'email'">
                <input class="input" disabled type="email" placeholder="nombre@empresa.com" />
              </template>
              <template v-else-if="questionDraft.tipo === 'phone'">
                <input class="input" disabled type="tel" placeholder="+54 11 5555-1234" />
              </template>
              <template v-else-if="questionDraft.tipo === 'geopoint'">
                <div class="q-ex-geo">
                  <span class="q-ex-geo-pin" aria-hidden="true">GPS</span>
                  <div>
                    <strong>Check-in</strong>
                    <p class="hint">Se captura la ubicación GPS al responder</p>
                  </div>
                </div>
              </template>
              <template v-else>
                <input class="input" disabled placeholder="Campo de respuesta" />
              </template>
            </div>
          </aside>
        </div>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="closeCreateQuestion">Cancelar</button>
          <button type="submit" class="btn-primary">Agregar pregunta</button>
        </div>
      </form>
    </div>
    </Teleport>

    <!-- Modal crear preguntas con IA -->
    <Teleport to="body">
    <div
      v-if="aiQuestionsOpen"
      class="hub-dlg-scrim hub-dlg-scrim--confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Crear preguntas con IA"
      @click.self="closeAiQuestions"
      @keydown.escape.prevent="closeAiQuestions"
    >
      <form class="panel question-ai-panel" @submit.prevent="runAiQuestions">
        <div class="panel-head-row">
          <h2>Crear preguntas con IA</h2>
          <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closeAiQuestions">×</button>
        </div>
        <p class="hint">
          Usa el contexto de General, Características y Audiencia para armar las preguntas pedidas.
        </p>

        <div class="q-ai-layout">
          <aside class="q-ai-context">
            <p class="q-ex-kicker">Contexto que verá la IA</p>
            <p><strong>{{ draft?.titulo || 'Sin título' }}</strong></p>
            <p class="hint">{{ draft?.descripcion || 'Sin descripción' }}</p>
            <p v-if="draft?.aiContext" class="hint">{{ draft.aiContext }}</p>
            <ul class="q-ai-ctx-list">
              <li>Categoría: {{ categoryLabel(draft) }}</li>
              <li>Propósito: {{ purposeLabel(draft?.purpose) }}</li>
              <li>Anónima: {{ draft?.anonymous ? 'Sí' : 'No' }}</li>
              <li>
                Ejecución:
                {{ draft?.questionFlow === 'one_by_one' ? 'Una a una' : 'Todas juntas' }}
              </li>
              <li>Progreso: {{ draft?.showProgress !== false ? 'Visible' : 'Oculto' }}</li>
              <li>Audiencia: {{ audienceLabel(draft?.audience) }}</li>
              <li>Contexto IA: {{ draft?.aiContext ? 'Definido' : 'Sin definir' }}</li>
              <li>Preguntas actuales: {{ draft?.questions?.length || 0 }}</li>
            </ul>
          </aside>

          <div class="q-ai-form">
            <div class="audience-modes" style="max-width: 360px">
              <button type="button" class="mode" :class="{ on: aiQuestionsProvider === 'auto' }" @click="aiQuestionsProvider = 'auto'">Auto</button>
              <button type="button" class="mode" :class="{ on: aiQuestionsProvider === 'openai' }" @click="aiQuestionsProvider = 'openai'">OpenAI</button>
              <button type="button" class="mode" :class="{ on: aiQuestionsProvider === 'anthropic' }" @click="aiQuestionsProvider = 'anthropic'">Anthropic</button>
            </div>

            <div class="audience-modes" style="max-width: 360px" role="group" aria-label="Modo de generación">
              <button type="button" class="mode" :class="{ on: aiQuestionsMode === 'smart' }" @click="aiQuestionsMode = 'smart'">Inteligente</button>
              <button type="button" class="mode" :class="{ on: aiQuestionsMode === 'manual' }" @click="aiQuestionsMode = 'manual'">Manual</button>
            </div>

            <template v-if="aiQuestionsMode === 'smart'">
              <label>Cantidad de preguntas
                <input v-model.number="aiQuestionsSmartTotal" class="input" type="number" min="3" max="40" />
              </label>
              <p class="hint">
                Modo inteligente: arma una secuencia intercalada de tipologías distintas
                (rating, sí/no, opción única/múltiple, abiertas, etc.) según categoría, propósito y contexto.
              </p>
              <div v-if="aiSmartMixPreview.length" class="q-ai-mix">
                <span class="q-ai-mix-lbl">Mezcla prevista</span>
                <span v-for="m in aiSmartMixPreview" :key="m.tipo" class="q-ai-mix-chip">
                  {{ m.count }}× {{ m.label }}
                </span>
              </div>
              <p class="hint">Total: {{ aiQuestionsSubmitTotal }} pregunta(s) · {{ aiSmartMixPreview.length }} tipologías</p>
            </template>

            <template v-else>
              <div class="q-ai-specs-head">
                <strong>Tipologías y cantidades</strong>
                <div class="q-ai-specs-actions">
                  <button type="button" class="btn-ghost" @click="suggestSmartAiSpecs">Sugerir mezcla</button>
                  <button type="button" class="btn-ghost" @click="addAiQuestionSpec">+ Tipología</button>
                </div>
              </div>
              <div v-for="(spec, i) in aiQuestionSpecs" :key="i" class="q-ai-spec-row">
                <label>Tipo
                  <select v-model="spec.tipo" class="input">
                    <option v-for="t in enabledQuestionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                  </select>
                </label>
                <label>Cantidad
                  <input v-model.number="spec.count" class="input" type="number" min="1" max="20" />
                </label>
                <label class="q-ai-spec-chars">Características
                  <input
                    v-model="spec.caracteristicas"
                    class="input"
                    placeholder="Ej. foco en liderazgo, tono cercano…"
                  />
                </label>
                <button
                  type="button"
                  class="btn-ghost danger"
                  :disabled="aiQuestionSpecs.length <= 1"
                  @click="aiQuestionSpecs.splice(i, 1)"
                >
                  Quitar
                </button>
              </div>
              <p class="hint">Total: {{ aiQuestionsTotal }} pregunta(s)</p>
            </template>

            <label>Indicaciones adicionales (opcional)
              <textarea
                v-model="aiQuestionsNotes"
                rows="3"
                class="input"
                placeholder="Ej. Evitá temas salariales; incluí una pregunta abierta al final…"
              />
            </label>

            <label class="check">
              <input v-model="aiQuestionsReplace" type="checkbox" />
              Reemplazar las preguntas actuales (si no, se agregan al final)
            </label>
          </div>
        </div>

        <p v-if="aiQuestionsError" class="err">{{ aiQuestionsError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="aiQuestionsBusy" @click="closeAiQuestions">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="aiQuestionsBusy || !aiQuestionsSubmitTotal">
            {{ aiQuestionsBusy ? 'Generando…' : `Generar ${aiQuestionsSubmitTotal || ''} pregunta(s)` }}
          </button>
        </div>
      </form>
    </div>
    </Teleport>

    <!-- Vista previa como en la app -->
    <Teleport to="body">
    <div
      v-if="preview"
      class="hub-dlg-scrim hub-dlg-scrim--preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-preview-title"
      @click.self="closePreview"
      @keydown.escape.prevent="closePreview"
    >
      <div class="preview-modal">
        <header class="preview-modal__head">
          <div>
            <h2 id="survey-preview-title">Vista previa</h2>
            <p>Así lo ve el miembro en el celular</p>
          </div>
          <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closePreview">×</button>
        </header>
        <div class="preview-modal__body">
          <p v-if="previewLoading" class="hint">Cargando…</p>
          <p v-else-if="previewError" class="err">{{ previewError }}</p>
          <MobileSurveyPreview
            v-else
            :survey="preview"
            :type-meta="questionTypeMeta"
            compact
            label=""
            note=""
          />
        </div>
        <footer class="preview-modal__foot">
          <button type="button" class="btn-ghost" @click="closePreview">Cerrar</button>
          <button
            v-if="previewSourceId && !draft"
            type="button"
            class="btn-primary"
            @click="editFromPreview"
          >
            Editar
          </button>
        </footer>
      </div>
    </div>
    </Teleport>

    <!-- Estadísticas de participación (no resultados de contenido) -->
    <Teleport to="body">
    <div
      v-if="stats"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Estadísticas de participación"
      @click.self="stats = null"
      @keydown.escape.prevent="stats = null"
    >
      <div class="panel editor">
        <header class="res-head">
          <div>
            <h2>Estadísticas de participación</h2>
            <p>{{ stats.survey.titulo }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="stats = null">Cerrar</button>
        </header>
        <p class="hint">{{ stats.note }}</p>
        <section class="cards">
          <article class="card accent">
            <h3>Universo enviado</h3>
            <p class="big">{{ stats.participation.invited }}</p>
            <p class="hint">{{ stats.participation.fromSnapshot ? 'Congelado al publicar' : 'Conteo live' }}</p>
          </article>
          <article class="card" v-for="(w, key) in stats.stats.windows" :key="key">
            <h3>{{ w.label }}</h3>
            <p class="big">{{ w.answered }}</p>
            <p class="hint">
              {{ w.rate != null ? `${w.rate}% del universo` : '—' }}
              <span v-if="w.pending != null"> · {{ w.pending }} pendientes</span>
            </p>
          </article>
        </section>
        <h3>Evolución (30 días)</h3>
        <div class="series">
          <div v-for="d in stats.stats.series" :key="d.date" class="series-col" :title="`${d.date}: +${d.newAnswers} (acum ${d.cumulative})`">
            <div class="series-bar" :style="{ height: `${Math.max(4, (d.cumulative / Math.max(1, stats.participation.invited)) * 100)}%` }" />
          </div>
        </div>
        <p class="hint">Cada barra = participación acumulada ese día vs el universo enviado.</p>
        <div class="footer" style="justify-content: flex-start">
          <button type="button" class="btn-ghost" :disabled="statsRefreshing" @click="refreshSnapshot(stats.survey.id)">
            {{ statsRefreshing ? 'Actualizando…' : 'Recalcular universo enviado' }}
          </button>
          <button type="button" class="btn-primary" @click="showResults({ id: stats.survey.id }); stats = null">
            Ver resultados
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Resultados: contenido de respuestas (agregados / grupos / individuales) -->
    <Teleport to="body">
    <div
      v-if="results"
      class="hub-dlg-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Resultados del cuestionario"
      @click.self="closeResults"
      @keydown.escape.prevent="closeResults"
    >
      <div class="panel editor survey-results">
        <header class="editor-head">
          <div class="editor-head-title">
            <h2>Resultados</h2>
            <p>
              {{ results.survey.titulo }}
              · {{ results.segment?.answered ?? results.participation.answered }} respuestas
              <span v-if="results.survey.anonymous"> · Anónima</span>
            </p>
          </div>
          <div class="editor-head-actions">
            <button type="button" class="btn-ghost icon-x" aria-label="Cerrar" @click="closeResults">×</button>
          </div>
        </header>

        <div class="survey-editor-layout">
          <nav class="survey-editor-nav" aria-label="Apartados de resultados">
            <button
              v-for="sec in resultsSections"
              :key="sec.id"
              type="button"
              class="survey-nav-item"
              :class="{ on: resultsTab === sec.id }"
              @click="resultsTab = sec.id"
            >
              {{ sec.label }}
              <span v-if="sec.id === 'individuos'" class="survey-nav-count">
                {{ (results.individuals || []).length }}
              </span>
            </button>
          </nav>

          <div class="survey-editor-body survey-results-body">
            <section class="results-filters">
              <div class="filters">
                <label>Segmento · área
                  <select v-model="filterAreaId" class="input" @change="reloadResults">
                    <option value="">Todas</option>
                    <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
                  </select>
                </label>
                <label>Segmento · grupo
                  <select v-model="filterGroupId" class="input" @change="reloadResults">
                    <option value="">Todos</option>
                    <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                  </select>
                </label>
                <label>Solo sección de preguntas
                  <select v-model="filterGrupo" class="input" @change="reloadResults">
                    <option value="">Todas las secciones</option>
                    <option v-for="g in results.grupos || []" :key="g" :value="g">{{ g }}</option>
                  </select>
                </label>
              </div>
              <p class="hint">
                Segmento: {{ results.segment?.label }}
                · invitados {{ results.segment?.invited ?? '—' }}
                · tasa {{ results.segment?.rate ?? '—' }}%
              </p>
            </section>

            <section v-if="resultsTab === 'individuos'" class="res-block res-block--fill">
              <h3 class="survey-sec-title">Respuestas por persona</h3>
              <p v-if="results.survey.anonymous" class="hint">
                Encuesta anónima: se listan las respuestas sin revelar identidad.
              </p>
              <p v-else class="hint">
                Seleccioná una persona a la izquierda para ver todas sus respuestas.
              </p>

              <div v-if="(results.individuals || []).length" class="people-layout">
                <aside class="people-list">
                  <input
                    v-model="personSearch"
                    type="search"
                    class="input"
                    placeholder="Buscar por nombre, email o usuario…"
                  />
                  <button
                    v-for="row in filteredIndividuals"
                    :key="row.id"
                    type="button"
                    class="people-item"
                    :class="{ on: selectedPersonId === row.id }"
                    @click="selectedPersonId = row.id"
                  >
                    <strong>{{ row.respondent?.name || 'Sin nombre' }}</strong>
                    <span v-if="!results.survey.anonymous && row.respondent?.email" class="people-meta">
                      {{ row.respondent.email }}
                    </span>
                    <span v-else-if="!results.survey.anonymous && row.respondent?.usuario" class="people-meta">
                      @{{ row.respondent.usuario }}
                    </span>
                    <span class="people-meta">{{ formatDate(row.submittedAt) }}</span>
                  </button>
                  <p v-if="!filteredIndividuals.length" class="hint">Ninguna persona coincide con la búsqueda.</p>
                </aside>

                <div v-if="selectedPerson" class="people-detail">
                  <header class="people-detail-head">
                    <div>
                      <h4>{{ selectedPerson.respondent?.name || 'Sin nombre' }}</h4>
                      <p v-if="!results.survey.anonymous" class="hint">
                        <template v-if="selectedPerson.respondent?.email">{{ selectedPerson.respondent.email }} · </template>
                        <template v-if="selectedPerson.respondent?.usuario">@{{ selectedPerson.respondent.usuario }} · </template>
                        {{ formatDate(selectedPerson.submittedAt) }}
                      </p>
                      <p v-else class="hint">{{ formatDate(selectedPerson.submittedAt) }}</p>
                    </div>
                    <span class="pill soft">{{ (selectedPerson.answersDetailed || selectedPerson.answers || []).length }} respuestas</span>
                  </header>

                  <div
                    v-for="(group, gName) in answersByGrupo(selectedPerson)"
                    :key="gName"
                    class="group-card"
                  >
                    <div class="res-q-top">
                      <strong>{{ gName }}</strong>
                      <span class="pill soft">{{ group.length }}</span>
                    </div>
                    <div v-for="a in group" :key="a.questionId" class="person-ans">
                      <span class="person-q">{{ a.texto || questionText(a.questionId) }}</span>
                      <b class="person-v">{{ formatAnswer(a.value) }}</b>
                    </div>
                  </div>
                </div>
                <p v-else class="hint">Elegí una persona de la lista.</p>
              </div>
              <p v-else class="hint">Todavía no hay respuestas en este segmento.</p>
            </section>

            <section v-else-if="resultsTab === 'grupos'" class="res-block">
              <h3 class="survey-sec-title">Resultados por grupo del cuestionario</h3>
              <div v-for="g in results.byGroup || []" :key="g.grupo" class="group-card">
                <div class="res-q-top">
                  <strong>{{ g.grupo }}</strong>
                  <span class="pill soft">
                    {{ g.questionCount }} pregunta(s)
                    <template v-if="g.groupAverage != null"> · prom. {{ g.groupAverage.toFixed(2) }}</template>
                  </span>
                </div>
                <div v-for="q in g.questions" :key="q.questionId" class="res-q nested">
                  <div class="res-q-top">
                    <span>{{ q.texto }}</span>
                    <span class="pill soft">{{ typeLabel(q.tipo) }} · n={{ q.count }}</span>
                  </div>
                  <p v-if="q.tipo === 'rating' || q.tipo === 'number'">Promedio: <b>{{ q.average?.toFixed?.(2) ?? '—' }}</b></p>
                  <p v-else-if="q.tipo === 'yesno'">Sí <b>{{ q.yes }}</b> · No <b>{{ q.no }}</b></p>
                  <ul v-else-if="q.options" class="tally">
                    <li v-for="(n, k) in q.options" :key="k">
                      <span>{{ k }}</span>
                      <div class="mini-bar"><i :style="{ width: optionPct(q, n) }" /></div>
                      <b>{{ n }}</b>
                    </li>
                  </ul>
                  <ul v-else class="samples">
                    <li v-for="(s, i) in (q.samples || []).slice(0, 5)" :key="i">{{ s }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section v-else-if="resultsTab === 'preguntas'" class="res-block">
              <h3 class="survey-sec-title">Por pregunta</h3>
              <div v-for="q in results.byQuestion" :key="q.questionId" class="res-q">
                <div class="res-q-top">
                  <strong>{{ q.texto }}</strong>
                  <span class="pill soft">{{ q.grupo || 'General' }} · {{ typeLabel(q.tipo) }} · n={{ q.count }}</span>
                </div>
                <p v-if="q.tipo === 'rating' || q.tipo === 'number'">
                  Promedio: <b>{{ q.average?.toFixed?.(2) ?? '—' }}</b>
                  <span v-if="q.min != null"> · min {{ q.min }} · max {{ q.max }}</span>
                </p>
                <p v-else-if="q.tipo === 'yesno'">Sí <b>{{ q.yes }}</b> · No <b>{{ q.no }}</b></p>
                <ul v-else-if="q.options" class="tally">
                  <li v-for="(n, k) in q.options" :key="k">
                    <span>{{ k }}</span>
                    <div class="mini-bar"><i :style="{ width: optionPct(q, n) }" /></div>
                    <b>{{ n }}</b>
                  </li>
                </ul>
                <ul v-else class="samples">
                  <li v-for="(s, i) in q.samples || []" :key="i">{{ s }}</li>
                </ul>
              </div>
            </section>

            <section v-else-if="resultsTab === 'export'" class="res-block">
              <h3 class="survey-sec-title">Descargar cuestionarios respondidos</h3>
              <div class="export-qs">
                <label class="check"><input v-model="exportAllQuestions" type="checkbox" /> Todas las preguntas</label>
                <template v-if="!exportAllQuestions">
                  <label v-for="q in results.survey.questions || []" :key="q.id" class="check">
                    <input v-model="exportQuestionIds" type="checkbox" :value="q.id" />
                    [{{ q.grupo || 'General' }}] {{ q.texto }}
                  </label>
                </template>
              </div>
              <label v-if="!results.survey.anonymous" class="check">
                <input v-model="exportIncludeRespondents" type="checkbox" /> Incluir datos del respondente
              </label>
              <div class="footer" style="justify-content: flex-start">
                <button type="button" class="btn-primary" @click="downloadExport('csv')">Descargar CSV</button>
                <button type="button" class="btn-ghost" @click="downloadExport('json')">Descargar JSON</button>
              </div>
              <p v-if="exportError" class="err">{{ exportError }}</p>
            </section>

            <section v-else class="res-block">
              <h3 class="survey-sec-title">Análisis IA</h3>
              <p v-if="!results.aiAvailable" class="err">IA no configurada en el servidor.</p>
              <template v-else>
                <label>Enfoque opcional
                  <textarea v-model="aiFocus" rows="2" class="input" placeholder="Ej. Compará liderazgo vs beneficios…" />
                </label>
                <div class="audience-modes" style="max-width: 360px">
                  <button type="button" class="mode" :class="{ on: aiProvider === 'auto' }" @click="aiProvider = 'auto'">Auto</button>
                  <button type="button" class="mode" :class="{ on: aiProvider === 'openai' }" @click="aiProvider = 'openai'">OpenAI</button>
                  <button type="button" class="mode" :class="{ on: aiProvider === 'anthropic' }" @click="aiProvider = 'anthropic'">Anthropic</button>
                </div>
                <button type="button" class="btn-primary" :disabled="aiLoading" @click="runAiAnalysis">
                  {{ aiLoading ? 'Analizando…' : 'Analizar encuesta con IA' }}
                </button>
                <p v-if="aiError" class="err">{{ aiError }}</p>
                <div v-if="aiAnalysis" class="ai-box">
                  <div class="ai-box-head">
                    <p class="hint">{{ aiMeta }}</p>
                    <div class="ai-downloads">
                      <button type="button" class="btn-ghost" :disabled="aiExporting" @click="downloadAi('pdf')">
                        {{ aiExporting === 'pdf' ? 'Generando…' : 'Descargar PDF' }}
                      </button>
                      <button type="button" class="btn-ghost" :disabled="aiExporting" @click="downloadAi('docx')">
                        {{ aiExporting === 'docx' ? 'Generando…' : 'Descargar DOCX' }}
                      </button>
                    </div>
                  </div>
                  <p v-if="aiExportError" class="err">{{ aiExportError }}</p>
                  <h4>Resumen</h4>
                  <p>{{ aiAnalysis.resumenEjecutivo }}</p>
                  <h4>Cuantitativo</h4>
                  <ul><li v-for="(h, i) in aiAnalysis.cuantitativo?.hallazgos || []" :key="'c'+i">{{ h }}</li></ul>
                  <ul v-if="(aiAnalysis.cuantitativo?.metricasClave || []).length" class="metrics">
                    <li v-for="(m, i) in aiAnalysis.cuantitativo.metricasClave" :key="'m'+i">
                      <b>{{ typeof m === 'string' ? m : m.etiqueta }}</b>
                      <template v-if="typeof m !== 'string'">: {{ m.valor }} <span class="hint">{{ m.lectura }}</span></template>
                    </li>
                  </ul>
                  <h4>Cualitativo</h4>
                  <p v-if="aiAnalysis.cualitativo?.tonoGeneral"><b>Tono:</b> {{ aiAnalysis.cualitativo.tonoGeneral }}</p>
                  <ul>
                    <li v-for="(t, i) in aiAnalysis.cualitativo?.temas || []" :key="'t'+i">
                      <b>{{ t.tema }}</b> ({{ t.frecuenciaAprox }}): {{ t.evidencia }}
                    </li>
                  </ul>
                  <template v-if="(aiAnalysis.riesgosOAlertas || []).length">
                    <h4>Riesgos / alertas</h4>
                    <ul><li v-for="(r, i) in aiAnalysis.riesgosOAlertas" :key="'risk'+i">{{ r }}</li></ul>
                  </template>
                  <h4>Recomendaciones</h4>
                  <ul><li v-for="(r, i) in aiAnalysis.recomendaciones || []" :key="'rec'+i">{{ r }}</li></ul>
                  <p v-if="aiAnalysis.confianza || aiAnalysis.limitaciones" class="hint">
                    <template v-if="aiAnalysis.confianza">Confianza: {{ aiAnalysis.confianza }}. </template>
                    <template v-if="aiAnalysis.limitaciones">{{ aiAnalysis.limitaciones }}</template>
                  </p>
                </div>
              </template>
            </section>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import MobileSurveyPreview from '../components/MobileSurveyPreview.vue'
import QuestionTypePicker from '../components/QuestionTypePicker.vue'
import QuestionTypeIcon from '../components/QuestionTypeIcon.vue'
import QuestionTypeExample from '../components/QuestionTypeExample.vue'
import { downloadAiReport } from '../utils/surveyAnalysisExport'
import {
  DEFAULT_SURVEY_CATEGORIES,
  enrichQuestionTypeMeta,
  surveyCategoryVisual,
} from '../utils/surveyQuestionTypeDocs'

const questionTypeMeta = ref([
  enrichQuestionTypeMeta({ id: 'text', label: 'Texto corto', enabled: true }),
  enrichQuestionTypeMeta({ id: 'textarea', label: 'Texto largo', enabled: true }),
  enrichQuestionTypeMeta({ id: 'number', label: 'Número', enabled: true }),
  enrichQuestionTypeMeta({ id: 'yesno', label: 'Sí / No', enabled: true }),
  enrichQuestionTypeMeta({ id: 'single', label: 'Opción única', enabled: true }),
  enrichQuestionTypeMeta({ id: 'multiple', label: 'Opción múltiple', enabled: true }),
  enrichQuestionTypeMeta({ id: 'rating', label: 'Valoración 1–5', enabled: true }),
  enrichQuestionTypeMeta({ id: 'date', label: 'Fecha', enabled: true }),
  enrichQuestionTypeMeta({ id: 'time', label: 'Hora', enabled: true }),
  enrichQuestionTypeMeta({ id: 'datetime', label: 'Fecha y hora', enabled: true }),
  enrichQuestionTypeMeta({ id: 'email', label: 'Email', enabled: true }),
  enrichQuestionTypeMeta({ id: 'phone', label: 'Teléfono', enabled: true }),
  enrichQuestionTypeMeta({ id: 'geopoint', label: 'Check-in (ubicación GPS)', enabled: true }),
])

function defaultQuestionTipo() {
  const enabled = (questionTypeMeta.value || []).filter((t) => t.enabled !== false)
  if (enabled.some((t) => t.id === 'text')) return 'text'
  return enabled[0]?.id || 'text'
}

function emptyQuestion() {
  return {
    id: '',
    texto: '',
    tipo: defaultQuestionTipo(),
    required: true,
    grupo: 'General',
    opcionesText: '',
    imageUrl: '',
  }
}

const items = ref([])
const listView = ref(localStorage.getItem('surveysAdminListView') === 'grid' ? 'grid' : 'cards')
const seedBusy = ref(false)
const seedMsg = ref('')
const seedConfirmOpen = ref(false)
const configOpen = ref(false)
const configPanel = ref('categories')
const configBusy = ref(false)
const configMsg = ref('')
const categoryDraft = ref([])
const newCategoryLabel = ref('')
const questionTypeDraft = ref([])
const questionTypeMetaAll = ref([])
const listFiltersOpen = ref(false)
const listFilterQ = ref('')
const listFilterStatus = ref('')
const listFilterCategoria = ref('')
const listFilterAudience = ref('')
const draft = ref(null)
const draftSection = ref('general')
const draftSections = [
  { id: 'general', label: 'General' },
  { id: 'media', label: 'Media' },
  { id: 'publicacion', label: 'Características' },
  { id: 'audiencia', label: 'Audiencia' },
  { id: 'preguntas', label: 'Preguntas' },
]
const resultsSections = [
  { id: 'individuos', label: 'Por persona' },
  { id: 'grupos', label: 'Por grupo' },
  { id: 'preguntas', label: 'Por pregunta' },
  { id: 'export', label: 'Descargar' },
  { id: 'ia', label: 'Análisis IA' },
]
const activeQuestionId = ref('')
const questionModalOpen = ref(false)
const questionDraft = ref(emptyQuestion())
const questionModalError = ref('')
const aiQuestionsOpen = ref(false)
const aiQuestionsBusy = ref(false)
const aiQuestionsError = ref('')
const aiQuestionsProvider = ref('auto')
const aiQuestionsNotes = ref('')
const aiQuestionsReplace = ref(false)
const aiQuestionSpecs = ref([])
const aiQuestionsMode = ref('smart')
const aiQuestionsSmartTotal = ref(8)
const autosaveMsg = ref('')
let autosaveMsgTimer = null
const mediaUploading = ref(false)
const questionImageUploading = ref(false)
const preview = ref(null)
const previewLoading = ref(false)
const previewError = ref('')
const previewSourceId = ref('')
const results = ref(null)
const stats = ref(null)
const statsRefreshing = ref(false)
const resultsTab = ref('individuos')
const filterAreaId = ref('')
const filterGroupId = ref('')
const filterGrupo = ref('')
const resultsSurveyId = ref('')
const personSearch = ref('')
const selectedPersonId = ref('')
const error = ref('')
const formError = ref('')
const saving = ref(false)
const areas = ref([])
const groups = ref([])
const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null
const audienceImportBusy = ref(false)
const audienceImportError = ref('')
const audienceImportSummary = ref(null)
const audienceImportUnmatched = ref([])
const aiConfigured = ref(false)
const aiPromptOpen = ref(false)
const aiCreatePrompt = ref('')
const aiCreateLoading = ref(false)
const aiCreateError = ref('')
const createAiProvider = ref('auto')
const generalAiPrompt = ref('')
const generalAiBusy = ref(false)
const generalAiError = ref('')
const generalAiProvider = ref('auto')
const exportAllQuestions = ref(true)
const exportQuestionIds = ref([])
const exportIncludeRespondents = ref(false)
const exportError = ref('')
const aiFocus = ref('')
const aiProvider = ref('auto')
const aiLoading = ref(false)
const aiError = ref('')
const aiAnalysis = ref(null)
const aiMeta = ref('')
const aiExporting = ref('')
const aiExportError = ref('')
const statusBusyId = ref('')
const cloneBusyId = ref('')
const reportSurvey = ref(null)
const reportFocus = ref('')
const reportProvider = ref('auto')
const reportBusyId = ref('')
const reportFormat = ref('')
const reportError = ref('')
const surveyCategories = ref([
  { id: 'clima', label: 'Clima laboral' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'liderazgo', label: 'Liderazgo' },
  { id: 'comunicacion', label: 'Comunicación' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'capacitacion', label: 'Capacitación' },
  { id: 'nps', label: 'NPS / recomendación' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'general', label: 'General' },
  { id: 'otros', label: 'Otros' },
])

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function normalizeAudience(a) {
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
  draft.value.audience = normalizeAudience({
    ...prev,
    mode,
    userIds: mode === 'restricted' || mode === 'users' ? prev.userIds || [] : [],
    areaIds: mode === 'restricted' ? prev.areaIds || [] : [],
    groupIds: mode === 'restricted' ? prev.groupIds || [] : [],
  })
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  if (mode === 'restricted' || mode === 'users') ensureAudienceUsersHydrated()
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
    const { data } = await api.get('/admin/surveys/audience-candidates', { params: { q: query } })
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
    const { data } = await api.get('/admin/surveys/audience-candidates', {
      params: { ids: missing.join(',') },
    })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

async function downloadAudienceTemplate() {
  audienceImportError.value = ''
  try {
    const { data } = await api.get('/admin/surveys/audience-import/template', {
      params: { format: 'xlsx' },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-audiencia-encuesta.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    audienceImportError.value = e.response?.data?.error || 'No se pudo descargar la plantilla'
  }
}

async function onAudienceImportFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  audienceImportBusy.value = true
  audienceImportError.value = ''
  audienceImportSummary.value = null
  audienceImportUnmatched.value = []
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/surveys/audience-import', fd)
    const matched = data.matched || []
    matched.forEach(cacheAudienceUser)
    const prev = new Set(draft.value.audience.userIds || [])
    for (const u of matched) prev.add(u.id)
    draft.value.audience.userIds = [...prev]
    if (draft.value.audience.mode === 'all') {
      setAudienceMode('users')
      draft.value.audience.userIds = [...prev]
    }
    audienceImportSummary.value = data.summary || {
      rows: matched.length,
      matched: matched.length,
      unmatched: (data.unmatched || []).length,
    }
    audienceImportUnmatched.value = data.unmatched || []
    if (!matched.length) {
      audienceImportError.value = 'No se encontró ninguna persona del archivo en la comunidad.'
    }
  } catch (err) {
    audienceImportError.value = err.response?.data?.error || 'No se pudo procesar el archivo'
  } finally {
    audienceImportBusy.value = false
    e.target.value = ''
  }
}

function resetDraftUi(questions = []) {
  draftSection.value = 'general'
  activeQuestionId.value = questions[0]?.id || ''
  questionModalOpen.value = false
  questionDraft.value = emptyQuestion()
  questionModalError.value = ''
  autosaveMsg.value = ''
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  audienceImportError.value = ''
  audienceImportSummary.value = null
  audienceImportUnmatched.value = []
  if (autosaveMsgTimer) {
    clearTimeout(autosaveMsgTimer)
    autosaveMsgTimer = null
  }
}

const activeQuestion = computed(() => {
  const list = draft.value?.questions || []
  return list.find((q) => q.id === activeQuestionId.value) || null
})

const activeQuestionIndex = computed(() => {
  const list = draft.value?.questions || []
  return list.findIndex((q) => q.id === activeQuestionId.value)
})

/** Lista editable de imágenes (siempre completa en el draft del admin). */
const draftMediaImages = computed({
  get() {
    const d = draft.value
    if (!d) return []
    if (Array.isArray(d.imageUrls) && d.imageUrls.length) return d.imageUrls
    if (d.imageUrl) return [d.imageUrl]
    return []
  },
  set(urls) {
    if (!draft.value) return
    const list = Array.isArray(urls) ? urls.filter(Boolean) : []
    draft.value.imageUrls = list
    draft.value.imageUrl = list[0] || ''
  },
})

function removeDraftImage(index) {
  const next = [...draftMediaImages.value]
  next.splice(index, 1)
  draftMediaImages.value = next
}

const draftMediaCount = computed(() => {
  return draftMediaImages.value.length + (draft.value?.videoUrl ? 1 : 0)
})

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => {
    const cached = audienceUserCache.value[id]
    if (cached) return cached
    return { id, label: id, usuario: '', email: '' }
  })
})

const aiQuestionsTotal = computed(() =>
  (aiQuestionSpecs.value || []).reduce((n, s) => n + Math.max(0, Math.round(Number(s.count) || 0)), 0),
)
const aiQuestionsSubmitTotal = computed(() => {
  if (aiQuestionsMode.value === 'smart') {
    return Math.max(3, Math.min(40, Math.round(Number(aiQuestionsSmartTotal.value) || 8)))
  }
  return aiQuestionsTotal.value
})

/** Prioridad de tipologías según categoría/propósito (espejo liviano del backend). */
function smartTypeBoostForDraft() {
  const d = draft.value || {}
  const cat = String(d.categoria || '').toLowerCase()
  const purpose = String(d.purpose || '').toLowerCase()
  const blob = `${d.titulo || ''} ${d.descripcion || ''} ${d.aiContext || ''} ${cat} ${purpose}`.toLowerCase()
  if (purpose === 'onboarding' || cat === 'onboarding') {
    return ['yesno', 'single', 'rating', 'textarea', 'email', 'text']
  }
  if (purpose === 'offboarding' || cat === 'offboarding') {
    return ['single', 'rating', 'textarea', 'yesno', 'multiple']
  }
  if (cat === 'nps' || /\bnps\b|recomendar/.test(blob)) {
    return ['rating', 'textarea', 'single', 'yesno', 'text']
  }
  if (cat === 'clima' || /clima|liderazgo|bienestar/.test(blob)) {
    return ['rating', 'yesno', 'single', 'multiple', 'textarea', 'text']
  }
  if (cat === 'capacitacion' || /formación|capacitacion|curso|entrenamiento/.test(blob)) {
    return ['multiple', 'single', 'rating', 'number', 'textarea', 'yesno']
  }
  if (cat === 'beneficios' || /beneficio|prepaga|descuento/.test(blob)) {
    return ['single', 'multiple', 'rating', 'yesno', 'textarea']
  }
  if (cat === 'comunicacion' || /comunicaci[oó]n|mensaje|canal/.test(blob)) {
    return ['single', 'rating', 'multiple', 'yesno', 'textarea']
  }
  if (/agenda|fecha|reunión|reunion|turno|visita/.test(blob)) {
    return ['date', 'datetime', 'time', 'single', 'yesno', 'text']
  }
  return ['rating', 'yesno', 'single', 'multiple', 'textarea', 'text', 'number']
}

/** Vista previa local de la mezcla inteligente (espejo del plan backend). */
const aiSmartMixPreview = computed(() => {
  if (aiQuestionsMode.value !== 'smart') return []
  const enabled = new Set((enabledQuestionTypes.value || []).map((t) => t.id))
  const ordered = []
  const seen = new Set()
  for (const t of [...smartTypeBoostForDraft(), 'rating', 'yesno', 'single', 'multiple', 'textarea', 'text', 'number', 'date']) {
    if (!enabled.has(t) || seen.has(t)) continue
    seen.add(t)
    ordered.push(t)
  }
  const types = ordered.length ? ordered : [defaultQuestionTipo()]
  const total = aiQuestionsSubmitTotal.value
  const distinct = Math.min(types.length, Math.max(3, Math.min(8, Math.ceil(total * 0.65))))
  const picked = types.slice(0, distinct)
  const base = Math.floor(total / picked.length)
  let rest = total - base * picked.length
  return picked.map((tipo) => {
    const count = base + (rest > 0 ? 1 : 0)
    if (rest > 0) rest -= 1
    const label = enabledQuestionTypes.value.find((t) => t.id === tipo)?.label || tipo
    return { tipo, count: Math.max(1, count), label }
  })
})

watch(
  () => draft.value?.questions?.map((q) => q.id),
  (ids) => {
    const list = ids || []
    if (!list.length) {
      activeQuestionId.value = ''
      return
    }
    if (!list.includes(activeQuestionId.value)) {
      activeQuestionId.value = list[0]
    }
  },
)

watch(listView, (v) => {
  localStorage.setItem('surveysAdminListView', v === 'grid' ? 'grid' : 'cards')
})

const enabledQuestionTypes = computed(() =>
  (questionTypeMeta.value || []).filter((t) => t.enabled !== false),
)

function pickerTypesFor(currentTipo) {
  const list = enabledQuestionTypes.value.length ? enabledQuestionTypes.value : questionTypeMeta.value
  if (currentTipo && !list.some((t) => t.id === currentTipo)) {
    const extra = (questionTypeMetaAll.value || questionTypeMeta.value || []).find((t) => t.id === currentTipo)
    if (extra) return [...list, extra]
  }
  return list
}

function toggleConfig() {
  if (configOpen.value) {
    configOpen.value = false
    return
  }
  openConfigCategories()
}

function openConfigCategories() {
  configOpen.value = true
  configPanel.value = 'categories'
  configMsg.value = ''
  newCategoryLabel.value = ''
  categoryDraft.value = (surveyCategories.value || []).map((c, i) => ({
    ...c,
    _key: `cat-${c.id || i}-${i}`,
  }))
  if (!categoryDraft.value.length) {
    categoryDraft.value = [{ id: 'general', label: 'General', _key: 'cat-general-0' }]
  }
}

function categoryVisual(c) {
  return surveyCategoryVisual(c?.id || c?.label || '')
}

function openConfigTypes() {
  configOpen.value = true
  configPanel.value = 'types'
  configMsg.value = ''
  const all = questionTypeMetaAll.value.length
    ? questionTypeMetaAll.value
    : questionTypeMeta.value
  const enabled = new Set((questionTypeMeta.value || []).map((t) => t.id))
  questionTypeDraft.value = (all || []).map((t) => {
    const enriched = enrichQuestionTypeMeta(t)
    return {
      ...enriched,
      enabled: t.enabled != null ? Boolean(t.enabled) : enabled.has(t.id),
    }
  })
}

const questionTypesEnabledCount = computed(
  () => (questionTypeDraft.value || []).filter((t) => t.enabled).length,
)

const questionTypeGroups = computed(() => {
  const order = ['Texto', 'Elección', 'Escala', 'Datos', 'Fecha y hora', 'Contacto', 'Ubicación', 'Otros']
  const map = new Map()
  for (const t of questionTypeDraft.value || []) {
    const g = t.group || 'Otros'
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(t)
  }
  const known = order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g) }))
  const rest = [...map.keys()]
    .filter((g) => !order.includes(g))
    .map((g) => ({ group: g, items: map.get(g) }))
  return [...known, ...rest]
})

function slugCategoryId(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return base || 'categoria'
}

function normalizeCategoryDraftId(c) {
  if (!c || c.id === 'general') return
  if (!String(c.id || '').trim()) c.id = slugCategoryId(c.label)
}

function addConfigCategory() {
  submitNewCategory()
}

function submitNewCategory() {
  const label = String(newCategoryLabel.value || '').trim()
  if (!label) return
  const id = slugCategoryId(label)
  if (categoryDraft.value.some((c) => c.id === id || String(c.label || '').toLowerCase() === label.toLowerCase())) {
    error.value = 'Esa categoría ya existe'
    return
  }
  const n = categoryDraft.value.length + 1
  categoryDraft.value.push({
    id,
    label,
    _key: `cat-new-${Date.now()}-${n}`,
  })
  newCategoryLabel.value = ''
  error.value = ''
}

function moveConfigCategory(idx, dir) {
  const j = idx + dir
  if (j < 0 || j >= categoryDraft.value.length) return
  const arr = [...categoryDraft.value]
  const tmp = arr[idx]
  arr[idx] = arr[j]
  arr[j] = tmp
  categoryDraft.value = arr
}

function resetConfigCategories() {
  categoryDraft.value = DEFAULT_SURVEY_CATEGORIES.map((c, i) => ({
    ...c,
    _key: `cat-reset-${c.id}-${i}`,
  }))
  newCategoryLabel.value = ''
  configMsg.value = 'Catálogo base cargado · guardá para aplicar'
}

function removeConfigCategory(idx) {
  const row = categoryDraft.value[idx]
  if (!row || row.id === 'general' || categoryDraft.value.length <= 1) return
  categoryDraft.value.splice(idx, 1)
}

async function saveConfigCategories() {
  configBusy.value = true
  configMsg.value = ''
  error.value = ''
  try {
    const categories = categoryDraft.value
      .map((c) => ({
        id: String(c.id || slugCategoryId(c.label)).trim(),
        label: String(c.label || '').trim(),
      }))
      .filter((c) => c.label)
    const { data } = await api.put('/admin/surveys/categories', { categories })
    surveyCategories.value = data.items || categories
    categoryDraft.value = (surveyCategories.value || []).map((c, i) => ({
      ...c,
      _key: `cat-${c.id || i}-${i}`,
    }))
    configMsg.value = 'Categorías guardadas'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    configBusy.value = false
  }
}

function enableAllQuestionTypes() {
  questionTypeDraft.value.forEach((t) => {
    t.enabled = true
  })
}

async function saveConfigQuestionTypes() {
  const enabled = questionTypeDraft.value.filter((t) => t.enabled).map((t) => t.id)
  if (!enabled.length) {
    error.value = 'Dejá al menos un tipo de pregunta habilitado'
    return
  }
  configBusy.value = true
  configMsg.value = ''
  error.value = ''
  try {
    const { data } = await api.put('/admin/surveys/question-types', { enabledQuestionTypes: enabled })
    const items = (data.items || questionTypeDraft.value).map(enrichQuestionTypeMeta)
    questionTypeMetaAll.value = items
    questionTypeMeta.value = items.filter((t) => t.enabled !== false)
    questionTypeDraft.value = items.map((t) => ({ ...t }))
    configMsg.value = 'Tipos de pregunta guardados'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    configBusy.value = false
  }
}

const listFiltersActiveCount = computed(() => {
  let n = 0
  if (String(listFilterQ.value || '').trim()) n += 1
  if (listFilterStatus.value) n += 1
  if (listFilterCategoria.value) n += 1
  if (listFilterAudience.value) n += 1
  return n
})
const listFiltersActive = computed(() => listFiltersActiveCount.value > 0)

const filteredItems = computed(() => {
  const q = String(listFilterQ.value || '').trim().toLowerCase()
  const st = listFilterStatus.value
  const cat = listFilterCategoria.value
  const aud = listFilterAudience.value
  return (items.value || []).filter((s) => {
    if (st && s.status !== st) return false
    if (cat && String(s.categoria || '') !== cat) return false
    if (aud && String(s.audience?.mode || 'all') !== aud) return false
    if (q) {
      const hay = `${s.titulo || ''} ${s.descripcion || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

function clearListFilters() {
  listFilterQ.value = ''
  listFilterStatus.value = ''
  listFilterCategoria.value = ''
  listFilterAudience.value = ''
}

function closeDraft() {
  if (questionModalOpen.value) {
    closeCreateQuestion()
    return
  }
  draft.value = null
}

function onDraftEscape() {
  if (questionModalOpen.value) {
    closeCreateQuestion()
    return
  }
  draft.value = null
}

function openCreateQuestion() {
  questionDraft.value = emptyQuestion()
  questionModalError.value = ''
  questionModalOpen.value = true
  draftSection.value = 'preguntas'
}

function closeCreateQuestion() {
  questionModalOpen.value = false
  questionDraft.value = emptyQuestion()
  questionModalError.value = ''
}

function purposeLabel(p) {
  return (
    {
      general: 'General',
      onboarding: 'Onboarding / bienvenida',
      offboarding: 'Offboarding / egreso',
    }[p] || p || 'General'
  )
}

function categoryLabel(s) {
  if (!s) return 'Sin categoría'
  if (s.categoriaLabel) return s.categoriaLabel
  const id = String(s.categoria || '').trim()
  if (!id) return 'Sin categoría'
  return surveyCategories.value.find((c) => c.id === id)?.label || id
}

function audienceModeLabel(a) {
  const mode = a?.mode || 'all'
  if (mode === 'users') return 'Solo personas'
  if (mode === 'restricted') return 'Áreas y/o grupos'
  if (mode === 'none') return 'Sin audiencia'
  return 'Toda la comunidad'
}

/** Detalle numérico de la audiencia (sin repetir el tipo de modo). */
function audienceDetailLabel(a) {
  if (!a || a.mode === 'all' || a.mode === 'none') return ''
  if (a.mode === 'users') {
    const n = (a.userIds || []).length
    return n ? `${n} persona${n === 1 ? '' : 's'}` : 'Sin personas'
  }
  if (a.mode !== 'restricted') return ''
  const nA = a.areaIds?.length || 0
  const nG = a.groupIds?.length || 0
  const nU = a.userIds?.length || 0
  if (!nA && !nG && !nU) return 'Sin selección'
  const parts = []
  if (nA) parts.push(`${nA} área(s)`)
  if (nG) parts.push(`${nG} grupo(s)`)
  if (nU) parts.push(`+${nU} persona${nU === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function addAiQuestionSpec() {
  aiQuestionSpecs.value.push({ tipo: defaultQuestionTipo(), count: 1, caracteristicas: '' })
}

/** Mezcla local diversa (espejo liviano del plan smart del backend). */
function suggestSmartAiSpecs() {
  const preview = aiSmartMixPreview.value.length
    ? aiSmartMixPreview.value
    : (() => {
        const enabled = (enabledQuestionTypes.value || []).map((t) => t.id)
        const pool = smartTypeBoostForDraft().filter((t) => enabled.includes(t))
        const types = pool.length ? pool : [defaultQuestionTipo()]
        const total = Math.max(3, Math.min(40, Math.round(Number(aiQuestionsSmartTotal.value) || 8)))
        const distinct = Math.min(types.length, Math.max(3, Math.min(8, Math.ceil(total * 0.65))))
        const picked = types.slice(0, distinct)
        const base = Math.floor(total / picked.length)
        let rest = total - base * picked.length
        return picked.map((tipo) => {
          const count = base + (rest > 0 ? 1 : 0)
          if (rest > 0) rest -= 1
          return { tipo, count: Math.max(1, count) }
        })
      })()
  const focus = [draft.value?.categoria, draft.value?.purpose, draft.value?.titulo].filter(Boolean).join(' · ')
  aiQuestionSpecs.value = preview.map((m) => ({
    tipo: m.tipo,
    count: Math.max(1, m.count),
    caracteristicas: focus ? `Mezcla · ${focus}` : 'Mezcla equilibrada de tipologías',
  }))
}

function openAiQuestions() {
  if (!draft.value) return
  aiQuestionsError.value = ''
  aiQuestionsNotes.value = ''
  aiQuestionsReplace.value = false
  aiQuestionsProvider.value = 'auto'
  aiQuestionsMode.value = 'smart'
  if (!aiQuestionsSmartTotal.value) aiQuestionsSmartTotal.value = 8
  if (!aiQuestionSpecs.value.length) suggestSmartAiSpecs()
  aiQuestionsOpen.value = true
  draftSection.value = 'preguntas'
}

function closeAiQuestions() {
  aiQuestionsOpen.value = false
  aiQuestionsError.value = ''
  aiQuestionsBusy.value = false
}

function buildAiQuestionsContext() {
  const d = draft.value
  if (!d) return {}
  return {
    titulo: d.titulo || '',
    descripcion: d.descripcion || '',
    aiContext: d.aiContext || '',
    categoria: d.categoria || '',
    categoriaLabel: categoryLabel(d),
    purpose: d.purpose || 'general',
    anonymous: Boolean(d.anonymous),
    questionFlow: d.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
    showProgress: d.showProgress !== false,
    audienceLabel: audienceLabel(d.audience),
    startsAt: fromLocalInput(d.startsAtLocal),
    endsAt: fromLocalInput(d.endsAtLocal),
    existingQuestions: (d.questions || []).map((q) => ({
      texto: q.texto,
      tipo: q.tipo,
      grupo: q.grupo,
    })),
  }
}

async function runGeneralAi() {
  if (!draft.value) return
  generalAiBusy.value = true
  generalAiError.value = ''
  try {
    const { data } = await api.post('/admin/surveys/generate-general', {
      prompt: generalAiPrompt.value.trim(),
      provider: generalAiProvider.value,
      current: {
        titulo: draft.value.titulo || '',
        descripcion: draft.value.descripcion || '',
        aiContext: draft.value.aiContext || '',
        purpose: draft.value.purpose || 'general',
      },
    })
    const g = data.general || {}
    if (g.titulo) draft.value.titulo = g.titulo
    if (g.descripcion != null) draft.value.descripcion = g.descripcion
    if (g.aiContext != null) draft.value.aiContext = g.aiContext
    formError.value = data.notas
      ? `General IA (${data.provider || 'IA'}${data.model ? ` · ${data.model}` : ''}). ${data.notas}`
      : `Título, descripción y contexto completados con IA.`
    persistDraft({ close: false, quiet: true })
  } catch (e) {
    generalAiError.value = e.response?.data?.error || e.message
  } finally {
    generalAiBusy.value = false
  }
}

async function runAiQuestions() {
  if (!draft.value) return
  aiQuestionsBusy.value = true
  aiQuestionsError.value = ''
  try {
    const payload = {
      context: buildAiQuestionsContext(),
      notes: aiQuestionsNotes.value,
      provider: aiQuestionsProvider.value,
      mode: aiQuestionsMode.value === 'manual' ? 'manual' : 'smart',
    }
    if (payload.mode === 'smart') {
      payload.total = aiQuestionsSubmitTotal.value
    } else {
      const typeSpecs = (aiQuestionSpecs.value || [])
        .map((s) => ({
          tipo: s.tipo,
          count: Math.round(Number(s.count) || 0),
          caracteristicas: String(s.caracteristicas || '').trim(),
        }))
        .filter((s) => s.count > 0)
      if (!typeSpecs.length) {
        aiQuestionsError.value = 'Indicá al menos una tipología con cantidad.'
        return
      }
      payload.typeSpecs = typeSpecs
    }
    const { data } = await api.post('/admin/surveys/generate-questions', payload)
    const incoming = (data.questions || []).map((q) => ({
      id: q.id || qid(),
      texto: q.texto || '',
      tipo: q.tipo || 'text',
      required: q.required !== false,
      grupo: q.grupo || 'General',
      opcionesText: (q.opciones || []).join(' | '),
      imageUrl: q.imageUrl || '',
    }))
    if (!incoming.length) {
      aiQuestionsError.value = 'La IA no devolvió preguntas.'
      return
    }
    if (aiQuestionsReplace.value) draft.value.questions = incoming
    else draft.value.questions.push(...incoming)
    activeQuestionId.value = incoming[0].id
    const mix = [...new Set(incoming.map((q) => q.tipo))].length
    if (data.notas) {
      formError.value = `Preguntas IA (${data.provider || 'IA'}${data.model ? ` · ${data.model}` : ''} · ${mix} tipologías). ${data.notas}`
    } else {
      formError.value = `Se generaron ${incoming.length} pregunta(s) con IA (${mix} tipologías).`
    }
    closeAiQuestions()
    persistDraft({ close: false, quiet: true })
  } catch (e) {
    aiQuestionsError.value = e.response?.data?.error || e.message
  } finally {
    aiQuestionsBusy.value = false
  }
}

function insertOptionSeparator(q, evt) {
  if (!q) return
  const value = String(q.opcionesText || '')
  const wrap = evt?.currentTarget?.closest?.('.opciones-field')
  const input = wrap?.querySelector?.('input')
  const start = input && typeof input.selectionStart === 'number' ? input.selectionStart : value.length
  const end = input && typeof input.selectionEnd === 'number' ? input.selectionEnd : value.length
  const before = value.slice(0, start)
  const after = value.slice(end)
  if (!before.trim()) {
    input?.focus()
    return
  }
  let piece = ' | '
  if (/\|\s*$/.test(before)) piece = before.endsWith(' ') ? '' : ' '
  else if (/\s$/.test(before)) piece = '| '
  if (!piece) {
    input?.focus()
    return
  }
  q.opcionesText = before + piece + after
  const pos = start + piece.length
  nextTick(() => {
    if (!input) return
    input.focus()
    input.setSelectionRange(pos, pos)
  })
}

function confirmCreateQuestion() {
  questionModalError.value = ''
  const texto = String(questionDraft.value.texto || '').trim()
  if (!texto) {
    questionModalError.value = 'Escribí el texto de la pregunta.'
    return
  }
  if (
    (questionDraft.value.tipo === 'single' || questionDraft.value.tipo === 'multiple') &&
    !String(questionDraft.value.opcionesText || '').split('|').map((x) => x.trim()).filter(Boolean).length
  ) {
    questionModalError.value = 'Indicá al menos una opción. Usá el botón para separarlas.'
    return
  }
  const q = {
    id: qid(),
    texto,
    tipo: questionDraft.value.tipo || 'text',
    required: questionDraft.value.required !== false,
    grupo: String(questionDraft.value.grupo || 'General').trim() || 'General',
    opcionesText: questionDraft.value.opcionesText || '',
    imageUrl: questionDraft.value.imageUrl || '',
  }
  draft.value.questions.push(q)
  activeQuestionId.value = q.id
  closeCreateQuestion()
  persistDraft({ close: false, quiet: true })
}

function removeQuestion(id) {
  const list = draft.value?.questions || []
  const idx = list.findIndex((q) => q.id === id)
  if (idx < 0) return
  list.splice(idx, 1)
  activeQuestionId.value = list[Math.min(idx, list.length - 1)]?.id || ''
  persistDraft({ close: false, quiet: true })
}

function statusLabel(s) {
  return { draft: 'Borrador', published: 'Publicada', closed: 'Desactivada' }[s] || s
}

function surveyExcerpt(s, max = 110) {
  const t = String(s?.descripcion || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, Math.max(1, max - 1))}…` : t
}

function audienceLabel(a) {
  const mode = audienceModeLabel(a)
  const detail = audienceDetailLabel(a)
  return detail ? `${mode} · ${detail}` : mode
}

function partWidth(s) {
  const r = s.participation?.rate
  if (r == null) return '0%'
  return `${Math.min(100, r)}%`
}

function partTitle(s) {
  const p = s.participation
  if (!p) return ''
  return `${p.answered} de ${p.invited} · ${p.pending} pendientes`
}

function typeHint(tipo) {
  const hints = {
    date: 'El encuestado elige una fecha (día/mes/año).',
    time: 'El encuestado elige una hora.',
    datetime: 'Fecha y hora juntas.',
    number: 'Solo números (enteros o decimales).',
    email: 'Valida formato de correo.',
    phone: 'Teléfono con dígitos y símbolos básicos.',
    textarea: 'Respuesta larga en varias líneas.',
    single: 'Una sola opción. Usá el botón para separar cada opción.',
    multiple: 'Puede marcar varias. Usá el botón para separar cada opción.',
    text: 'Respuesta breve en una línea.',
    yesno: 'Dos botones: Sí o No.',
    rating: 'Escala de 1 a 5 estrellas.',
    geopoint: 'Captura la ubicación GPS al responder.',
  }
  return hints[tipo] || ''
}

function typeExample(tipo) {
  const examples = {
    text: {
      prompt: '¿Cuál es tu puesto o rol?',
      desc: 'Campo de una línea para respuestas cortas.',
    },
    textarea: {
      prompt: '¿Qué mejorarías en la comunicación interna?',
      desc: 'Área de texto para comentarios más largos.',
    },
    number: {
      prompt: '¿Cuántos años llevás en la empresa?',
      desc: 'Solo acepta un número (entero o decimal).',
    },
    yesno: {
      prompt: '¿Recomendarías trabajar acá?',
      desc: 'El miembro elige Sí o No.',
    },
    single: {
      prompt: '¿Cómo calificarías el clima laboral?',
      desc: 'Una sola opción. En opciones: Excelente, botón separar, Bueno, botón separar, Regular.',
    },
    multiple: {
      prompt: '¿En qué temas querés más formación?',
      desc: 'Puede marcar varias. En opciones usá el botón para separar cada tema.',
    },
    rating: {
      prompt: 'Valorá tu satisfacción general',
      desc: 'Escala visual de 1 a 5.',
    },
    date: {
      prompt: '¿En qué fecha ingresaste?',
      desc: 'Selector de día / mes / año.',
    },
    time: {
      prompt: '¿A qué hora solés empezar tu jornada?',
      desc: 'Selector de hora.',
    },
    datetime: {
      prompt: '¿Cuándo preferís la próxima reunión?',
      desc: 'Fecha y hora en un solo campo.',
    },
    email: {
      prompt: '¿Cuál es tu email de contacto?',
      desc: 'Valida que tenga formato de correo.',
    },
    phone: {
      prompt: '¿Cuál es tu teléfono?',
      desc: 'Permite dígitos y símbolos básicos (+ - espacios).',
    },
    geopoint: {
      prompt: 'Confirmá tu ubicación al responder',
      desc: 'Toma el GPS del dispositivo al enviar la respuesta.',
    },
  }
  return examples[tipo] || {
    prompt: 'Pregunta de ejemplo',
    desc: typeHint(tipo) || 'Así se verá el campo en la app.',
  }
}

const questionDraftOpciones = computed(() =>
  String(questionDraft.value?.opcionesText || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean),
)

function typeLabel(tipo) {
  return (
    questionTypeMeta.value.find((t) => t.id === tipo)?.label ||
    questionTypeMetaAll.value.find((t) => t.id === tipo)?.label ||
    tipo
  )
}

function optionPct(q, n) {
  const total = Object.values(q.options || {}).reduce((a, b) => a + Number(b || 0), 0) || 1
  return `${Math.round((Number(n) / total) * 100)}%`
}

function questionText(qid) {
  const q = (results.value?.survey?.questions || []).find((x) => x.id === qid)
  return q?.texto || qid
}

function formatAnswer(v) {
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  return String(v ?? '')
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR')
  } catch {
    return ''
  }
}

const filteredIndividuals = computed(() => {
  const list = results.value?.individuals || []
  const q = personSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((row) => {
    const r = row.respondent || {}
    return [r.name, r.email, r.usuario].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
})

const selectedPerson = computed(() => {
  const list = results.value?.individuals || []
  return list.find((r) => r.id === selectedPersonId.value) || null
})

watch(
  () => results.value?.individuals,
  (list) => {
    const rows = list || []
    if (!rows.length) {
      selectedPersonId.value = ''
      return
    }
    if (!rows.some((r) => r.id === selectedPersonId.value)) {
      selectedPersonId.value = rows[0].id
    }
  },
  { immediate: true },
)

watch(filteredIndividuals, (list) => {
  if (!list.length) return
  if (!list.some((r) => r.id === selectedPersonId.value)) {
    selectedPersonId.value = list[0].id
  }
})

function answersByGrupo(person) {
  const rows = person?.answersDetailed?.length
    ? person.answersDetailed
    : (person?.answers || []).map((a) => ({
        ...a,
        texto: questionText(a.questionId),
        grupo: 'General',
      }))
  const map = {}
  for (const a of rows) {
    const g = a.grupo || 'General'
    if (!map[g]) map[g] = []
    map[g].push(a)
  }
  return map
}

function closeResults() {
  results.value = null
  resultsSurveyId.value = ''
  filterAreaId.value = ''
  filterGroupId.value = ''
  filterGrupo.value = ''
  personSearch.value = ''
  selectedPersonId.value = ''
  aiAnalysis.value = null
  aiError.value = ''
  resultsTab.value = 'individuos'
}

function qid() {
  return `q_${Math.random().toString(36).slice(2, 9)}`
}

async function loadOrg() {
  try {
    const { data } = await api.get('/admin/org/options')
    areas.value = (data.areas || []).map((x) => ({
      id: String(x.id || x._id),
      nombre: x.nombre,
    }))
    groups.value = (data.groups || []).map((x) => ({
      id: String(x.id || x._id),
      nombre: x.nombre,
    }))
  } catch {
    areas.value = []
    groups.value = []
  }
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/surveys')
    items.value = data.items || []
    aiConfigured.value = Boolean(data.aiConfigured)
    if (Array.isArray(data.questionTypeMetaAll) && data.questionTypeMetaAll.length) {
      questionTypeMetaAll.value = data.questionTypeMetaAll.map(enrichQuestionTypeMeta)
    }
    if (Array.isArray(data.questionTypeMeta) && data.questionTypeMeta.length) {
      questionTypeMeta.value = data.questionTypeMeta.map(enrichQuestionTypeMeta)
    } else if (questionTypeMetaAll.value.length) {
      questionTypeMeta.value = questionTypeMetaAll.value.filter((t) => t.enabled !== false)
    }
    if (Array.isArray(data.categories) && data.categories.length) {
      surveyCategories.value = data.categories
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function runSeedDefaults() {
  seedBusy.value = true
  seedMsg.value = ''
  error.value = ''
  try {
    const { data } = await api.post('/admin/surveys/seed-defaults')
    seedMsg.value = data.message || `Seed: ${data.total} encuestas`
    seedConfirmOpen.value = false
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    seedBusy.value = false
  }
}

function toLocalInput(d) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    if (!Number.isFinite(dt.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  } catch {
    return ''
  }
}

function fromLocalInput(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function openNew() {
  const questions = []
  draft.value = {
    titulo: '',
    descripcion: '',
    aiContext: '',
    imageUrl: '',
    imageUrls: [],
    videoUrl: '',
    status: 'draft',
    categoria: '',
    purpose: 'general',
    anonymous: false,
    questionFlow: 'all',
    showProgress: true,
    startsAtLocal: '',
    endsAtLocal: '',
    audience: emptyAudience(),
    questions,
  }
  generalAiPrompt.value = ''
  generalAiError.value = ''
  generalAiProvider.value = 'auto'
  resetDraftUi(questions)
}

function openAiNew() {
  aiCreateError.value = ''
  aiCreatePrompt.value = ''
  createAiProvider.value = 'auto'
  aiPromptOpen.value = true
}

async function runAiCreate() {
  aiCreateLoading.value = true
  aiCreateError.value = ''
  try {
    const { data } = await api.post('/admin/surveys/generate', {
      prompt: aiCreatePrompt.value.trim(),
      provider: createAiProvider.value,
    })
    const d = data.draft || {}
    const questions = (d.questions || []).map((q) => ({
      id: q.id || qid(),
      texto: q.texto || '',
      tipo: q.tipo || 'text',
      required: q.required !== false,
      grupo: q.grupo || 'General',
      opcionesText: (q.opciones || []).join(' | '),
      imageUrl: q.imageUrl || '',
    }))
    draft.value = {
      titulo: d.titulo || '',
      descripcion: d.descripcion || '',
      aiContext: d.aiContext || '',
      imageUrl: '',
      imageUrls: [],
      videoUrl: '',
      status: 'draft',
      categoria: d.categoria || '',
      purpose: 'general',
      anonymous: Boolean(d.anonymous),
      questionFlow: 'all',
      showProgress: true,
      startsAtLocal: '',
      endsAtLocal: '',
      audience: emptyAudience(),
      questions,
    }
    resetDraftUi(questions)
    if (questions.length) draftSection.value = 'preguntas'
    formError.value = d.notas
      ? `Generado con ${data.provider || 'IA'}${data.model ? ` · ${data.model}` : ''}. Notas: ${d.notas}`
      : `Generado con ${data.provider || 'IA'}${data.model ? ` · ${data.model}` : ''}. Revisá y guardá.`
    aiPromptOpen.value = false
  } catch (e) {
    aiCreateError.value = e.response?.data?.error || e.message
  } finally {
    aiCreateLoading.value = false
  }
}

async function edit(s, section = 'general') {
  formError.value = ''
  try {
    const { data } = await api.get(`/admin/surveys/${s.id}`)
    const survey = data.survey
    const questions = (survey.questions || []).map((q) => ({
      ...q,
      grupo: q.grupo || 'General',
      opcionesText: (q.opciones || []).join(' | '),
      imageUrl: q.imageUrl || '',
    }))
    const imgs =
      Array.isArray(survey.imageUrls) && survey.imageUrls.length
        ? [...survey.imageUrls]
        : survey.imageUrl
          ? [survey.imageUrl]
          : []
    draft.value = {
      id: survey.id,
      titulo: survey.titulo,
      descripcion: survey.descripcion,
      aiContext: survey.aiContext || '',
      imageUrl: imgs[0] || '',
      imageUrls: imgs,
      videoUrl: survey.videoUrl || '',
      status: survey.status,
      categoria: survey.categoria || '',
      purpose: survey.purpose || 'general',
      anonymous: Boolean(survey.anonymous),
      questionFlow: survey.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
      showProgress: survey.showProgress !== false,
      startsAtLocal: toLocalInput(survey.startsAt),
      endsAtLocal: toLocalInput(survey.endsAt),
      audience: normalizeAudience(survey.audience),
      questions,
    }
    generalAiPrompt.value = ''
    generalAiError.value = ''
    resetDraftUi(questions)
    const allowed = draftSections.map((x) => x.id)
    draftSection.value = allowed.includes(section) ? section : 'general'
    await ensureAudienceUsersHydrated()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function editQuestions(s) {
  return edit(s, 'preguntas')
}

async function onMediaFiles(e) {
  const files = [...(e.target.files || [])]
  if (!files.length || !draft.value) return
  mediaUploading.value = true
  formError.value = ''
  try {
    const fd = new FormData()
    for (const file of files.slice(0, 12)) fd.append('files', file)
    const { data } = await api.post('/admin/surveys/upload', fd)
    const items = Array.isArray(data.items) && data.items.length
      ? data.items
      : (data.urls || []).map((url, i) => ({
          url,
          kind: data.kinds?.[i] || (files[i]?.type?.startsWith('video/') ? 'video' : 'image'),
        }))
    const nextImages = [...draftMediaImages.value]
    for (const item of items) {
      if (!item?.url) continue
      if (item.kind === 'video') draft.value.videoUrl = item.url
      else nextImages.push(item.url)
    }
    draftMediaImages.value = nextImages
  } catch (err) {
    formError.value = err.response?.data?.error || 'No se pudo subir el archivo'
  } finally {
    mediaUploading.value = false
    e.target.value = ''
  }
}

async function onQuestionImageFile(e, target) {
  const file = e.target?.files?.[0]
  if (!file || !target) return
  questionImageUploading.value = true
  formError.value = ''
  questionModalError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/surveys/upload', fd)
    const url = data.url || data.items?.[0]?.url || data.urls?.[0] || ''
    const kind = data.kind || data.items?.[0]?.kind || 'image'
    if (!url || kind === 'video') {
      throw new Error('Solo se permite una imagen para la pregunta')
    }
    target.imageUrl = url
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'No se pudo subir la imagen'
    if (questionModalOpen.value) questionModalError.value = msg
    else formError.value = msg
  } finally {
    questionImageUploading.value = false
    e.target.value = ''
  }
}

function closePreview() {
  preview.value = null
  previewError.value = ''
  previewLoading.value = false
  previewSourceId.value = ''
}

function draftAsPreviewSurvey() {
  const d = draft.value
  if (!d) return null
  const imgs = draftMediaImages.value
  return {
    titulo: d.titulo || 'Sin título',
    descripcion: d.descripcion || '',
    imageUrl: imgs[0] || '',
    imageUrls: imgs.length >= 2 ? imgs : [],
    videoUrl: d.videoUrl || '',
    anonymous: Boolean(d.anonymous),
    questionFlow: d.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
    showProgress: d.showProgress !== false,
    endsAt: fromLocalInput(d.endsAtLocal),
    questions: packQuestions(),
  }
}

function previewDraft() {
  if (!draft.value) return
  if (!String(draft.value.titulo || '').trim()) {
    formError.value = 'Poné un título para poder previsualizar'
    return
  }
  previewError.value = ''
  previewSourceId.value = draft.value.id || ''
  preview.value = draftAsPreviewSurvey()
}

async function openPreview(s) {
  if (!s?.id) return
  previewLoading.value = true
  previewError.value = ''
  previewSourceId.value = s.id
  preview.value = {
    titulo: s.titulo,
    descripcion: s.descripcion || '',
    imageUrl: s.imageUrl || '',
    imageUrls: s.imageUrls || [],
    videoUrl: s.videoUrl || '',
    anonymous: Boolean(s.anonymous),
    questionFlow: s.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
    showProgress: s.showProgress !== false,
    endsAt: s.endsAt,
    questions: [],
  }
  try {
    const { data } = await api.get(`/admin/surveys/${s.id}`)
    const survey = data.survey
    if (Array.isArray(data.questionTypeMetaAll) && data.questionTypeMetaAll.length) {
      questionTypeMetaAll.value = data.questionTypeMetaAll.map(enrichQuestionTypeMeta)
    }
    if (Array.isArray(data.questionTypeMeta) && data.questionTypeMeta.length) {
      questionTypeMeta.value = data.questionTypeMeta.map(enrichQuestionTypeMeta)
    }
    if (Array.isArray(data.categories) && data.categories.length) {
      surveyCategories.value = data.categories
    }
    preview.value = {
      titulo: survey.titulo,
      descripcion: survey.descripcion || '',
      imageUrl: survey.imageUrl || '',
      imageUrls: survey.imageUrls || [],
      videoUrl: survey.videoUrl || '',
      anonymous: Boolean(survey.anonymous),
      questionFlow: survey.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
      showProgress: survey.showProgress !== false,
      endsAt: survey.endsAt,
      questions: survey.questions || [],
    }
  } catch (e) {
    previewError.value = e.response?.data?.error || e.message
  } finally {
    previewLoading.value = false
  }
}

async function editFromPreview() {
  const id = previewSourceId.value
  closePreview()
  if (!id) return
  const row = items.value.find((x) => x.id === id)
  if (row) await edit(row)
  else await edit({ id })
}

function packQuestions() {
  return (draft.value.questions || []).map((q) => ({
    id: q.id,
    texto: q.texto,
    tipo: q.tipo,
    required: q.required,
    grupo: q.grupo || 'General',
    imageUrl: q.imageUrl || '',
    opciones: String(q.opcionesText || '')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean),
  }))
}

function buildSaveBody() {
  const d = draft.value
  const imgs = Array.isArray(d.imageUrls) && d.imageUrls.length
    ? d.imageUrls
    : d.imageUrl
      ? [d.imageUrl]
      : []
  return {
    titulo: d.titulo,
    descripcion: d.descripcion,
    aiContext: d.aiContext || '',
    imageUrl: imgs[0] || '',
    imageUrls: imgs,
    videoUrl: d.videoUrl || '',
    status: d.status,
    categoria: d.categoria || '',
    purpose: d.purpose || 'general',
    anonymous: Boolean(d.anonymous),
    questionFlow: d.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
    showProgress: d.showProgress !== false,
    startsAt: fromLocalInput(d.startsAtLocal),
    endsAt: fromLocalInput(d.endsAtLocal),
    audience: normalizeAudience(d.audience),
    questions: packQuestions(),
  }
}

function draftValidationError(d) {
  if (!String(d?.titulo || '').trim()) {
    return { section: 'general', message: 'Título requerido' }
  }
  if (!String(d?.categoria || '').trim()) {
    return { section: 'general', message: 'Elegí una categoría' }
  }
  return null
}

function flashAutosave(msg) {
  autosaveMsg.value = msg
  if (autosaveMsgTimer) clearTimeout(autosaveMsgTimer)
  autosaveMsgTimer = setTimeout(() => {
    autosaveMsg.value = ''
    autosaveMsgTimer = null
  }, 2200)
}

/**
 * Persiste el borrador. Si close=true, cierra el modal (botón Guardar).
 * Si quiet=true, no salta de sección ni bloquea al fallar validación (cambio de apartado).
 */
async function persistDraft({ close = false, quiet = false } = {}) {
  const d = draft.value
  if (!d) return false
  const err = draftValidationError(d)
  if (err) {
    if (!quiet) {
      draftSection.value = err.section
      formError.value = err.message
    } else if (d.id) {
      flashAutosave(`Sin guardar: ${err.message}`)
    }
    return false
  }

  saving.value = true
  if (!quiet) formError.value = ''
  try {
    const body = buildSaveBody()
    if (draft.value.id) {
      await api.patch(`/admin/surveys/${draft.value.id}`, body)
    } else {
      const { data } = await api.post('/admin/surveys', body)
      const survey = data?.survey
      if (survey?.id) draft.value.id = survey.id
    }
    await load()
    if (close) {
      closeCreateQuestion()
      draft.value = null
    } else {
      flashAutosave('Guardado')
    }
    return true
  } catch (e) {
    const msg = e.response?.data?.error || e.message
    if (quiet) flashAutosave(`No se pudo guardar: ${msg}`)
    else formError.value = msg
    return false
  } finally {
    saving.value = false
  }
}

async function goDraftSection(next) {
  if (!draft.value || !next || draftSection.value === next || saving.value) return
  await persistDraft({ close: false, quiet: true })
  if (draft.value) {
    draftSection.value = next
    if (next === 'audiencia') ensureAudienceUsersHydrated()
  }
}

async function save() {
  await persistDraft({ close: true, quiet: false })
}

async function cloneSurvey(survey) {
  if (!survey?.id || cloneBusyId.value) return
  cloneBusyId.value = survey.id
  error.value = ''
  seedMsg.value = ''
  try {
    const { data } = await api.post(`/admin/surveys/${survey.id}/duplicate`)
    seedMsg.value = data.message || 'Copia creada en borrador'
    await load()
    if (data.survey?.id) await edit(data.survey)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo clonar'
  } finally {
    cloneBusyId.value = ''
  }
}

async function setStatus(survey, status) {
  if (!survey?.id) return
  statusBusyId.value = survey.id
  error.value = ''
  try {
    await api.patch(`/admin/surveys/${survey.id}`, { status })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    statusBusyId.value = ''
  }
}

async function onListStatusChange(survey, event) {
  const next = event?.target?.value
  if (!survey?.id || !next || next === survey.status) return
  const prev = survey.status
  await setStatus(survey, next)
  if (error.value && event?.target) event.target.value = prev
}

function openReportModal(s) {
  reportSurvey.value = s
  reportFocus.value = ''
  reportProvider.value = 'auto'
  reportError.value = ''
  reportFormat.value = ''
}

function closeReportModal() {
  if (reportBusyId.value) return
  reportSurvey.value = null
  reportError.value = ''
}

async function generateReport(format) {
  const s = reportSurvey.value
  if (!s?.id) return
  reportBusyId.value = s.id
  reportFormat.value = format
  reportError.value = ''
  try {
    const [{ data: resultsData }, { data: aiData }] = await Promise.all([
      api.get(`/admin/surveys/${s.id}/results`),
      api.post(`/admin/surveys/${s.id}/analyze`, {
        provider: reportProvider.value,
        focus: reportFocus.value,
      }),
    ])
    const meta = {
      surveyTitle: resultsData.survey?.titulo || s.titulo,
      metaLine: `Usó ${aiData.provider}${aiData.model ? ` · ${aiData.model}` : ''} · basado en ${aiData.basedOn?.answered ?? '—'} respuestas`,
      segmentLabel: resultsData.segment?.label || '',
      participation: {
        answered: resultsData.segment?.answered ?? resultsData.participation?.answered,
        invited: resultsData.segment?.invited ?? resultsData.participation?.invited,
        rate: resultsData.segment?.rate ?? resultsData.participation?.rate,
      },
    }
    await downloadAiReport({
      analysis: aiData.analysis,
      results: resultsData,
      meta,
      format,
    })
  } catch (e) {
    reportError.value = e.response?.data?.error || e.message || 'No se pudo generar el informe'
  } finally {
    reportBusyId.value = ''
    reportFormat.value = ''
  }
}

async function openStats(s) {
  try {
    const { data } = await api.get(`/admin/surveys/${s.id}/stats`)
    stats.value = data
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function refreshSnapshot(id) {
  statsRefreshing.value = true
  try {
    await api.patch(`/admin/surveys/${id}`, { refreshAudienceSnapshot: true })
    const { data } = await api.get(`/admin/surveys/${id}/stats`)
    stats.value = data
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    statsRefreshing.value = false
  }
}

async function fetchResults(id) {
  const params = {}
  if (filterAreaId.value) params.areaId = filterAreaId.value
  if (filterGroupId.value) params.groupId = filterGroupId.value
  if (filterGrupo.value) params.grupo = filterGrupo.value
  const { data } = await api.get(`/admin/surveys/${id}/results`, { params })
  results.value = data
  resultsSurveyId.value = id
}

async function showResults(s) {
  try {
    filterAreaId.value = ''
    filterGroupId.value = ''
    filterGrupo.value = ''
    resultsTab.value = 'individuos'
    personSearch.value = ''
    selectedPersonId.value = ''
    exportAllQuestions.value = true
    exportIncludeRespondents.value = false
    exportError.value = ''
    aiAnalysis.value = null
    aiError.value = ''
    aiFocus.value = ''
    await fetchResults(s.id)
    exportQuestionIds.value = (results.value.survey?.questions || []).map((q) => q.id)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function reloadResults() {
  if (!resultsSurveyId.value) return
  try {
    await fetchResults(resultsSurveyId.value)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function downloadExport(format) {
  exportError.value = ''
  try {
    const id = results.value.survey.id
    const params = { format }
    if (!exportAllQuestions.value && exportQuestionIds.value.length) {
      params.questionIds = exportQuestionIds.value.join(',')
    }
    if (exportIncludeRespondents.value) params.includeRespondents = '1'
    const { data } = await api.get(`/admin/surveys/${id}/export`, {
      params,
      responseType: format === 'json' ? 'json' : 'blob',
    })
    const blob =
      format === 'json'
        ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        : new Blob([data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `encuesta-${id}.${format === 'json' ? 'json' : 'csv'}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e.response?.data?.error || e.message || 'No se pudo descargar'
  }
}

async function runAiAnalysis() {
  aiLoading.value = true
  aiError.value = ''
  aiExportError.value = ''
  aiAnalysis.value = null
  try {
    const id = results.value.survey.id
    const body = { provider: aiProvider.value, focus: aiFocus.value }
    if (!exportAllQuestions.value && exportQuestionIds.value.length) {
      body.questionIds = exportQuestionIds.value
    }
    const { data } = await api.post(`/admin/surveys/${id}/analyze`, body)
    aiAnalysis.value = data.analysis
    aiMeta.value = `Usó ${data.provider}${data.model ? ` · ${data.model}` : ''} · basado en ${data.basedOn?.answered ?? '—'} respuestas`
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message
  } finally {
    aiLoading.value = false
  }
}

async function downloadAi(format) {
  if (!aiAnalysis.value || !results.value) return
  aiExporting.value = format
  aiExportError.value = ''
  try {
    const meta = {
      surveyTitle: results.value?.survey?.titulo || 'Encuesta',
      metaLine: aiMeta.value,
      segmentLabel: results.value?.segment?.label || '',
      participation: {
        answered: results.value?.segment?.answered ?? results.value?.participation?.answered,
        invited: results.value?.segment?.invited ?? results.value?.participation?.invited,
        rate: results.value?.segment?.rate ?? results.value?.participation?.rate,
      },
    }
    await downloadAiReport({
      analysis: aiAnalysis.value,
      results: results.value,
      meta,
      format,
    })
  } catch (e) {
    aiExportError.value = e?.message || 'No se pudo generar el archivo'
  } finally {
    aiExporting.value = ''
  }
}

onMounted(async () => {
  await Promise.all([load(), loadOrg()])
})
</script>

<style scoped>
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.page-head h1 { margin: 0; font-size: 1.5rem; }
.page-head p { margin: 4px 0 0; color: var(--ink-soft); }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center; }
.enc-cfg-btn {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  flex-shrink: 0;
}
.enc-cfg-btn.on {
  color: var(--primary, var(--brand-primary));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel));
}
.enc-config-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 14px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.enc-config-tabs button {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.enc-config-tabs button.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, transparent);
  color: var(--primary, var(--brand-primary));
}
.enc-config-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.enc-config-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.enc-config-head h2 {
  margin: 0 0 4px;
  font-size: 1.1rem;
}
.enc-config-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.enc-config-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.enc-cat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.enc-cat-card {
  --cat-accent: var(--primary, var(--brand-primary));
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--cat-accent) 9%, var(--panel)) 0%,
      var(--panel-2, #f8fafc) 55%
    );
  transition: border-color 0.12s ease;
}
.enc-cat-card:hover {
  border-color: color-mix(in srgb, var(--cat-accent) 35%, var(--line));
}
.enc-cat-card.tone-sky { --cat-accent: #0284c7; }
.enc-cat-card.tone-rose { --cat-accent: #e11d48; }
.enc-cat-card.tone-indigo { --cat-accent: #4f46e5; }
.enc-cat-card.tone-teal { --cat-accent: #0d9488; }
.enc-cat-card.tone-amber { --cat-accent: #d97706; }
.enc-cat-card.tone-violet { --cat-accent: #7c3aed; }
.enc-cat-card.tone-green { --cat-accent: #059669; }
.enc-cat-card.tone-cyan { --cat-accent: #0891b2; }
.enc-cat-card.tone-slate { --cat-accent: #64748b; }
.enc-cat-card.tone-brand { --cat-accent: var(--primary, var(--brand-primary)); }
.enc-cat-card.locked {
  border-color: color-mix(in srgb, var(--cat-accent) 28%, var(--line));
}
.enc-cat-card-head {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
.enc-cat-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 0.82rem;
  color: var(--cat-accent);
  background: color-mix(in srgb, var(--cat-accent) 14%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--cat-accent) 22%, var(--line));
  flex-shrink: 0;
  margin-top: 2px;
}
.enc-cat-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.enc-cat-top {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
}
.enc-cat-top .enc-cat-tools {
  margin-left: auto;
}
.enc-cat-card .enc-icon-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 0.58rem;
}
.enc-cat-name {
  margin: 0;
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 4px 8px;
  font-size: 0.8rem;
  line-height: 1.2;
}
.enc-cat-order {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--cat-accent);
  background: color-mix(in srgb, var(--cat-accent) 12%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--cat-accent) 20%, var(--line));
  flex-shrink: 0;
}
.enc-cat-id {
  margin: 0;
  font-size: 0.62rem;
  color: var(--ink-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
.enc-cat-card-new {
  --cat-accent: var(--primary, var(--brand-primary));
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  border-style: dashed;
  border-width: 1.5px;
  border-color: color-mix(in srgb, var(--cat-accent) 45%, var(--line));
  background: color-mix(in srgb, var(--cat-accent) 6%, var(--panel));
}
.enc-cat-icon-new {
  width: 32px;
  height: 32px;
}
.enc-cat-new-title {
  font-size: 0.78rem;
  line-height: 1.2;
  padding-top: 2px;
}
.enc-cat-add-btn {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 0.75rem;
}
.enc-cat-card .enc-pill {
  font-size: 0.58rem;
  padding: 1px 5px;
}
.enc-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
}
.enc-pill-lock {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 30%, var(--line));
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
}
.enc-cat-tools {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  flex-shrink: 0;
}
.enc-icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 0.7rem;
}
.enc-icon-btn:hover:not(:disabled) {
  color: var(--primary, var(--brand-primary));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
}
.enc-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.enc-icon-btn.danger:hover:not(:disabled) {
  color: #b91c1c;
  border-color: color-mix(in srgb, #b91c1c 40%, var(--line));
}
.enc-type-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.enc-type-group-title {
  margin: 4px 0 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.enc-type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.enc-type-tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  padding: 10px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2, #f8fafc);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease, opacity 0.12s ease;
}
.enc-type-tile:hover {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, var(--line));
}
.enc-type-tile.on {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
}
.enc-type-tile:not(.on) {
  opacity: 0.72;
}
.enc-type-tile:not(.on):hover {
  opacity: 0.92;
}
.enc-type-tile-top {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 22px;
  gap: 8px;
  align-items: start;
}
.enc-type-tile-ico {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink-soft);
}
.enc-type-tile.on .enc-type-tile-ico {
  color: var(--primary, var(--brand-primary));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, var(--line));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, var(--panel));
}
.enc-type-tile-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.enc-type-tile-name {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ink);
}
.enc-type-tile-short {
  font-size: 0.72rem;
  line-height: 1.25;
  color: var(--ink-soft);
}
.enc-type-example-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--line) 85%, transparent);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
}
.enc-type-example-lbl {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.enc-type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.enc-type-tag {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  white-space: nowrap;
}
.enc-type-tag.kind-need {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 40%, var(--line));
  background: color-mix(in srgb, #3b82f6 12%, var(--panel));
}
.enc-type-tag.kind-fixed {
  color: #0f766e;
  border-color: color-mix(in srgb, #14b8a6 40%, var(--line));
  background: color-mix(in srgb, #14b8a6 12%, var(--panel));
}
.enc-type-tag.kind-warn {
  color: #b45309;
  border-color: color-mix(in srgb, #f59e0b 40%, var(--line));
  background: color-mix(in srgb, #f59e0b 14%, var(--panel));
}
.enc-type-tag.kind-info {
  color: #475569;
  border-color: color-mix(in srgb, #94a3b8 45%, var(--line));
  background: color-mix(in srgb, #94a3b8 14%, var(--panel));
}
.enc-type-tile-state {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  margin-top: 2px;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--line) 50%, transparent);
}
.enc-type-tile.on .enc-type-tile-state {
  color: #fff;
  background: var(--primary, var(--brand-primary));
}
@media (max-width: 1280px) {
  .enc-cat-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (max-width: 1100px) {
  .enc-cat-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .enc-type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .enc-cat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .enc-type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .enc-type-grid {
    grid-template-columns: 1fr;
  }
  .enc-cat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 420px) {
  .enc-cat-grid {
    grid-template-columns: 1fr;
  }
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
.seed-spin { animation: survey-seed-spin 0.8s linear infinite; }
@keyframes survey-seed-spin {
  to { transform: rotate(360deg); }
}
.ok-msg { color: var(--ok, #047857); font-size: 0.9rem; margin: 0 0 8px; }
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
}
.list-toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.list-count {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.filter-toggle-btn {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
}
.filter-toggle-btn:hover,
.filter-toggle-btn.on {
  color: var(--primary, var(--brand-primary));
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
}
.filter-toggle-btn.active {
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel));
}
.filter-toggle-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--primary, var(--brand-primary));
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
.list-filters {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) repeat(3, minmax(120px, 1fr)) auto;
  gap: 8px;
  align-items: center;
  margin: 0 0 14px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2, #f8fafc);
}
.list-filters .input {
  margin-top: 0;
}
.list-filters-search {
  min-width: 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 900px) {
  .list-filters {
    grid-template-columns: 1fr 1fr;
  }
  .list-filters-search {
    grid-column: 1 / -1;
  }
}
.view-toggle {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel);
}
.view-toggle-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
.view-toggle-btn + .view-toggle-btn {
  border-left: 1px solid var(--line);
}
.view-toggle-btn.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 14%, transparent);
  color: var(--primary, var(--brand-primary));
}
.view-toggle-btn:hover:not(.on) {
  background: var(--panel-2, #f8fafc);
  color: var(--ink);
}
.survey-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}
.survey-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.survey-card:hover {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, var(--line));
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.survey-card-cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 0;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--primary, var(--brand-primary)) 18%, #f8fafc),
    color-mix(in srgb, var(--primary, var(--brand-primary)) 6%, #e2e8f0)
  );
  cursor: pointer;
  overflow: hidden;
}
.survey-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.survey-card-cover-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--primary, var(--brand-primary));
  opacity: 0.85;
}
.survey-card-video-tag {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
}
.survey-card-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}
.survey-card-status[data-st='published'] {
  color: #047857;
  background: color-mix(in srgb, #10b981 18%, #fff);
}
.survey-card-status[data-st='draft'] {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 18%, #fff);
}
.survey-card-status[data-st='closed'] {
  color: #64748b;
  background: color-mix(in srgb, #94a3b8 18%, #fff);
}
.survey-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 14px;
  min-width: 0;
  flex: 1;
}
.survey-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 0;
}
.survey-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, transparent);
  color: var(--primary, var(--brand-primary));
}
.survey-badge--cat {
  background: color-mix(in srgb, var(--ink) 10%, transparent);
  color: var(--ink);
}
.survey-badge--aud {
  background: color-mix(in srgb, #0ea5e9 14%, transparent);
  color: #0369a1;
}
.aud-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
}
.aud-cell strong {
  font-weight: 650;
}
.cat-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cat-field-label {
  font-size: 0.85rem;
  font-weight: 600;
}
.cat-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cat-picker-btn {
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.cat-picker-btn:hover {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  color: var(--primary, var(--brand-primary));
}
.cat-picker-btn.on {
  border-color: transparent;
  background: var(--primary, var(--brand-primary));
  color: #fff;
}
.survey-card-title {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.3;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.survey-card-desc {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.survey-card-meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.survey-card-part {
  margin-top: 2px;
}
.survey-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
  flex-wrap: wrap;
}
.survey-table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
}
.survey-table-wrap .table {
  margin: 0;
  border-radius: 0;
}
.th-actions {
  text-align: right;
}
.title-cell-text {
  min-width: 0;
}
.thumb--fallback {
  display: grid;
  place-items: center;
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, var(--panel-2, #f8fafc));
}
.icon-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}
.icon-action {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.icon-action:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, transparent);
}
.icon-action.ok:hover:not(:disabled) {
  color: #047857;
  border-color: color-mix(in srgb, #10b981 45%, var(--line));
  background: color-mix(in srgb, #10b981 12%, transparent);
}
.icon-action.danger:hover:not(:disabled) {
  color: #b91c1c;
  border-color: color-mix(in srgb, #ef4444 45%, var(--line));
  background: color-mix(in srgb, #ef4444 10%, transparent);
}
.icon-action:disabled {
  opacity: 0.45;
  cursor: wait;
}
.spin {
  animation: survey-spin 0.8s linear infinite;
}
@keyframes survey-spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 640px) {
  .survey-board {
    grid-template-columns: 1fr;
  }
}
.table { width: 100%; border-collapse: collapse; background: var(--panel); border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid var(--line); font-size: 0.9rem; vertical-align: middle; }
.sub { margin: 4px 0 0; font-size: 0.75rem; color: var(--ink-soft); font-weight: 400; }
.title-cell { display: flex; align-items: center; gap: 10px; }
.thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--panel-2);
  display: block;
}
.thumb-btn {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  line-height: 0;
}
.thumb-btn:hover .thumb {
  outline: 2px solid color-mix(in srgb, var(--brand-primary) 45%, transparent);
  outline-offset: 1px;
}
.row { display: flex; gap: 8px; align-items: center; }
.row > .input { flex: 1; min-width: 0; }
.row > .file-btn { flex-shrink: 0; }
.preview {
  margin-top: 0.4rem;
  max-height: 120px;
  border-radius: 0.5rem;
  object-fit: cover;
  display: block;
}
.file-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
}
.media-block {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.media-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 10px;
}
.media-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--panel-2, #f8fafc);
}
.media-tile img,
.media-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-tile--video {
  grid-column: span 2;
  aspect-ratio: 16 / 9;
}
.media-tile-x {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.preview-panel {
  max-width: 420px;
  width: min(100%, 420px);
}
.preview-body {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}
.hub-dlg-scrim--preview {
  align-items: center;
  padding: 20px 12px;
}
.preview-modal {
  width: min(400px, calc(100vw - 24px));
  max-height: min(78vh, 640px);
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.preview-modal__head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}
.preview-modal__head h2 {
  margin: 0;
  font-size: 1.05rem;
}
.preview-modal__head p {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.preview-modal__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  justify-content: center;
  /* Fondo neutro del modal; el teléfono usa branding de la comunidad */
  background: color-mix(in srgb, var(--panel-2, #f8fafc) 88%, #0f172a);
}
.preview-modal__foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.actions {
  display: flex;
  justify-content: flex-end;
  max-width: none;
  white-space: nowrap;
}
.pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  background: var(--line); color: var(--ink); text-transform: capitalize;
}
.pill[data-st='published'] { background: var(--ok-bg); color: var(--ok); }
.pill[data-st='draft'] { background: var(--warn-bg); color: var(--warn); }
.pill[data-st='closed'] { background: var(--line); color: var(--ink-soft); }
.pill.soft { background: var(--panel-2); color: var(--ink-soft); font-weight: 600; text-transform: none; }
.pill-select {
  appearance: none;
  -webkit-appearance: none;
  display: inline-block;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 28px 5px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M3 4.5L6 8l3-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  text-transform: capitalize;
  color: var(--ink);
  background-color: var(--line);
}
.pill-select[data-st='published'] {
  background-color: var(--ok-bg);
  color: var(--ok);
}
.pill-select[data-st='draft'] {
  background-color: var(--warn-bg);
  color: var(--warn);
}
.pill-select[data-st='closed'] {
  background-color: var(--line);
  color: var(--ink-soft);
}
.pill-select:disabled {
  opacity: 0.65;
  cursor: wait;
}
.pill-select:focus {
  outline: 2px solid color-mix(in srgb, var(--primary, var(--brand-primary)) 45%, transparent);
  outline-offset: 1px;
}
.editor-head-status .pill-select {
  font-size: 0.85rem;
  padding: 6px 30px 6px 12px;
  margin-top: 0;
}
.part { display: grid; gap: 4px; min-width: 140px; }
.part small { color: var(--ink-soft); font-size: 0.75rem; }
.part-bar {
  height: 8px; border-radius: 999px; background: var(--line); overflow: hidden;
}
.part-bar > span, .part-bar > i, .mini-bar > i {
  display: block; height: 100%; background: var(--primary, var(--brand-primary)); border-radius: 999px;
}
.part-bar.lg { height: 10px; margin-top: 8px; }
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
.hub-dlg-scrim > .panel {
  width: min(560px, calc(100vw - 48px));
  max-height: min(82vh, 720px);
  min-height: 0;
  height: fit-content;
  align-self: flex-start;
  overflow: auto;
  background: var(--panel);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent),
    0 18px 48px rgba(0, 0, 0, 0.28);
}
.hub-dlg-scrim > .panel.wide { width: min(720px, calc(100vw - 48px)); }
.hub-dlg-scrim > .panel.editor {
  width: min(720px, calc(100vw - 48px));
  max-height: min(82vh, 760px);
}
.hub-dlg-scrim > .panel.survey-editor {
  width: min(1100px, calc(100vw - 48px));
  height: min(82vh, 720px);
  max-height: min(82vh, 720px);
  padding: 0;
  overflow: hidden;
  gap: 0;
}
.hub-dlg-scrim > .panel.survey-results {
  width: min(1180px, calc(100vw - 32px));
  height: min(88vh, 820px);
  max-height: min(88vh, 820px);
  padding: 0;
  overflow: hidden;
  gap: 0;
}
.hub-dlg-scrim--confirm {
  z-index: 1300;
  align-items: center;
  padding: 24px 16px;
}
.hub-dlg-scrim > .panel.question-create-panel {
  width: min(860px, calc(100vw - 48px));
  max-height: min(86vh, 720px);
  height: fit-content;
  overflow: auto;
  gap: 12px;
}
.q-create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(240px, 0.9fr);
  gap: 16px;
  align-items: start;
}
.q-create-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.q-create-example {
  min-width: 0;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2, #f8fafc);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.q-ex-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.q-ex-prompt {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}
.q-ex-req {
  color: #dc2626;
  font-style: normal;
  margin-left: 2px;
}
.q-ex-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.q-ex-image {
  margin: 4px 0 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #e2e8f0;
}
.q-ex-image img {
  display: block;
  width: 100%;
  max-height: 140px;
  object-fit: cover;
}
.q-ex-empty-opts {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-style: italic;
}
.q-ex-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.35;
}
.q-ex-widget {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.q-ex-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.q-ex-choices.col {
  flex-direction: column;
}
.q-ex-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.q-ex-chip.on {
  background: var(--primary, var(--brand-primary));
  border-color: transparent;
  color: #fff;
}
.q-ex-opt {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 0.88rem;
  color: var(--ink);
}
.q-ex-radio,
.q-ex-check {
  width: 16px;
  height: 16px;
  border: 2px solid var(--line-2);
  flex-shrink: 0;
  background: var(--panel);
}
.q-ex-radio {
  border-radius: 50%;
}
.q-ex-check {
  border-radius: 4px;
}
.q-ex-radio.on,
.q-ex-check.on {
  border-color: var(--primary, var(--brand-primary));
  background: var(--primary, var(--brand-primary));
  box-shadow: inset 0 0 0 3px var(--panel);
}
.q-ex-stars {
  display: flex;
  gap: 4px;
  font-size: 1.45rem;
  line-height: 1;
}
.q-ex-star {
  color: var(--line-2);
}
.q-ex-star.on {
  color: #f59e0b;
}
.q-ex-geo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
}
.q-ex-geo-pin {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--primary, var(--brand-primary));
  flex-shrink: 0;
}
.q-ex-geo strong {
  display: block;
  font-size: 0.9rem;
}
.q-ex-geo .hint {
  margin-top: 2px;
}
@media (max-width: 720px) {
  .q-create-layout {
    grid-template-columns: 1fr;
  }
}
.panel-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-head-row h2 {
  margin: 0;
  font-size: 1.1rem;
}
.survey-editor-layout {
  display: grid;
  grid-template-columns: minmax(140px, 20%) minmax(0, 80%);
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.survey-editor-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  border-right: 1px solid var(--line);
  padding: 12px 10px;
  overflow: auto;
  background: color-mix(in srgb, var(--panel-2, #f8fafc) 70%, var(--panel));
}
.survey-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.survey-nav-item:hover {
  background: var(--panel);
  color: var(--ink);
}
.survey-nav-item.on {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 14%, var(--panel));
  color: var(--primary, var(--brand-primary));
  box-shadow: inset 3px 0 0 var(--primary, var(--brand-primary));
}
.survey-nav-count {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--line);
  color: var(--ink-soft);
}
.survey-nav-item.on .survey-nav-count {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 22%, transparent);
  color: var(--primary, var(--brand-primary));
}
.survey-editor-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px;
}
.survey-results-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.results-filters {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 2px;
}
.results-filters .filters {
  margin-bottom: 0;
}
.res-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.res-block--fill {
  flex: 1;
  min-height: 0;
}
.res-block--fill .people-layout {
  flex: 1;
  min-height: 0;
  height: min(52vh, 480px);
  align-items: stretch;
}
.res-block--fill .people-list,
.res-block--fill .people-detail {
  max-height: none;
  height: 100%;
  overflow: auto;
}
.survey-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 720px;
}
.ai-help-box {
  border: 1px solid color-mix(in srgb, var(--primary, var(--brand-primary)) 28%, var(--line));
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
  overflow: hidden;
}
.ai-help-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.ai-help-summary::-webkit-details-marker {
  display: none;
}
.ai-help-summary::before {
  content: '▸';
  color: var(--ink-soft);
  font-size: 0.8rem;
  line-height: 1;
}
.ai-help-box[open] > .ai-help-summary::before {
  content: '▾';
}
.ai-help-summary strong {
  font-size: 0.92rem;
}
.ai-help-summary .hint {
  margin: 0;
  flex: 1;
  min-width: 140px;
}
.ai-help-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
}
.ai-provider-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
}
.ai-provider-btn {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 4px 8px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  line-height: 1.2;
}
.ai-provider-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  color: var(--primary, var(--brand-primary));
}
.ai-provider-btn.on {
  background: var(--primary, var(--brand-primary));
  color: #fff;
  border-color: transparent;
}
.ai-provider-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ai-help-actions {
  display: flex;
  justify-content: flex-end;
}
.char-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2, #f8fafc);
}
.char-block strong {
  font-size: 0.95rem;
}
.survey-sec--preguntas {
  max-width: none;
  height: 100%;
  min-height: 0;
}
.survey-sec-title {
  margin: 0;
  font-size: 1.05rem;
}
.qs-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.qs-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.hub-dlg-scrim > .panel.question-ai-panel {
  width: min(920px, calc(100vw - 48px));
  max-height: min(88vh, 780px);
  height: fit-content;
  overflow: auto;
  gap: 12px;
}
.q-ai-layout {
  display: grid;
  grid-template-columns: minmax(200px, 0.85fr) minmax(0, 1.35fr);
  gap: 16px;
  align-items: start;
}
.q-ai-context {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2, #f8fafc);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.q-ai-context p {
  margin: 0;
}
.q-ai-ctx-list {
  margin: 4px 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 4px;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.q-ai-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.q-ai-mix {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel) 88%, var(--accent, #3b82f6) 6%);
}
.q-ai-mix-lbl {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  margin-right: 2px;
}
.q-ai-mix-chip {
  font-size: 0.78rem;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--text);
}
.q-ai-specs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.q-ai-specs-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.q-ai-spec-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.9fr) 88px minmax(0, 1.4fr) auto;
  gap: 8px;
  align-items: end;
}
.q-ai-spec-row label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  min-width: 0;
}
.q-ai-spec-chars {
  min-width: 0;
}
@media (max-width: 760px) {
  .q-ai-layout {
    grid-template-columns: 1fr;
  }
  .q-ai-spec-row {
    grid-template-columns: 1fr 1fr;
  }
  .q-ai-spec-chars {
    grid-column: 1 / -1;
  }
}
.q-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 2px;
}
.q-tab {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink-soft);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.q-tab:hover {
  border-color: var(--primary, var(--brand-primary));
  color: var(--ink);
}
.q-tab.on {
  background: var(--primary, var(--brand-primary));
  border-color: transparent;
  color: #fff;
}
.q-pane {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.q-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.q-empty {
  padding: 24px 8px;
  text-align: center;
}
.opciones-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.opciones-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  font-weight: 600;
}
.opciones-sep-btn {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, transparent);
  color: var(--primary, var(--brand-primary));
}
.opciones-sep-btn:hover {
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 18%, transparent);
}
.q-image-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--line-2);
  border-radius: 12px;
  background: var(--panel-2, #f8fafc);
}
.q-image-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.q-image-preview {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.q-image-preview img {
  width: min(100%, 280px);
  max-height: 180px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
}
.editor-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--line);
}
.editor-head-title {
  min-width: 0;
  flex: 1;
}
.editor-head-title h2 {
  margin: 0;
  font-size: 1.15rem;
}
.editor-head-title p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.editor-head h2 {
  margin: 0;
  font-size: 1.15rem;
  min-width: 0;
  flex: 1;
}
.editor-head-status {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
  flex-shrink: 0;
}
.editor-head-status > span {
  flex-shrink: 0;
}
.editor-head-status .input {
  width: auto;
  min-width: 140px;
  margin-top: 0;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 6px 10px;
}
.editor-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.survey-autosave {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
  margin-right: 4px;
}
.editor-err {
  flex-shrink: 0;
  margin: 0;
  padding: 8px 20px 12px;
}
.icon-x {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1.35rem;
  line-height: 1;
  flex-shrink: 0;
}
.editor-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.editor-foot {
  flex-shrink: 0;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--line);
  background: var(--panel);
  display: grid;
  gap: 8px;
}
@media (min-width: 900px) {
  .panel.editor .audience-picks { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .survey-editor-layout {
    grid-template-columns: 1fr;
  }
  .survey-editor-nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .survey-nav-item {
    width: auto;
    flex: 1 1 auto;
  }
  .survey-nav-item.on {
    box-shadow: inset 0 -3px 0 var(--primary, var(--brand-primary));
  }
}
.input { width: 100%; box-sizing: border-box; border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.block { border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.audience-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.audience-modes--3 { grid-template-columns: 1fr 1fr 1fr; }
.mode { border: 1px solid var(--line-2); border-radius: 10px; padding: 10px; background: var(--panel); cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.mode.on { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.audience-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pick-title { margin: 0 0 6px; font-size: 0.78rem; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.audience-users {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2, #f8fafc);
}
.audience-users-head {
  display: grid;
  gap: 6px;
}
.audience-users-head .input { margin-top: 0; }
.audience-import {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: 1px dashed var(--line-2);
  background: var(--panel);
}
.audience-import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.audience-import-summary {
  font-size: 0.85rem;
  color: var(--ink);
}
.audience-import-summary p { margin: 0; }
.audience-import-miss {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.audience-import-miss ul {
  margin: 6px 0 0;
  padding-left: 18px;
  max-height: 140px;
  overflow: auto;
}
.audience-user-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  max-height: 180px;
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
  border-color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, var(--panel));
}
.audience-user-add:disabled { opacity: 0.5; cursor: default; }
.audience-user-add strong { display: block; font-size: 0.85rem; }
.audience-user-add small { display: block; margin-top: 2px; font-size: 0.72rem; color: var(--ink-soft); }
.audience-user-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.audience-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 12%, var(--panel));
  color: var(--primary, var(--brand-primary));
}
.audience-chip-x {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
@media (max-width: 720px) {
  .audience-modes--3 { grid-template-columns: 1fr; }
}
.qs { border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 10px; }
.qs-head { display: flex; justify-content: space-between; align-items: center; }
.q { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 10px; }
.q-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
.series { display: flex; align-items: flex-end; gap: 2px; height: 120px; padding: 8px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel-2); }
.series-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.series-bar { width: 100%; background: var(--primary, var(--brand-primary)); border-radius: 3px 3px 0 0; min-height: 2px; }
.group-card { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
.res-q.nested { padding: 8px 0 8px 8px; border-left: 3px solid color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, var(--line)); }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.hint { margin: 0; font-size: 0.78rem; font-weight: 400; color: var(--ink-soft); }
.footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0;
  position: relative;
  z-index: 1;
}
.footer .btn-primary,
.footer .btn-ghost {
  flex: 0 0 auto;
  position: relative;
}
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.btn-ghost.danger { color: var(--bad); }
.err { color: var(--bad); }
.muted { color: var(--ink-soft); }
.res-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.res-head h2 { margin: 0; }
.res-head p { margin: 4px 0 0; color: var(--ink-soft); }
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 720px) { .cards { grid-template-columns: repeat(4, 1fr); } }
.card { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: var(--panel-2); }
.card.accent { background: color-mix(in srgb, var(--primary, var(--brand-primary)) 10%, var(--panel)); border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 25%, var(--line)); }
.card h3 { margin: 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
.big { margin: 6px 0 4px; font-size: 1.35rem; font-weight: 800; }
.res-block h3 { margin: 8px 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.tabs button {
  border: 1px solid var(--line-2); background: var(--panel); border-radius: 999px; padding: 6px 12px;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.tabs button.on { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.hl { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
.ind { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
.ind-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.ind-ans { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 0.85rem; }
.ind-ans li { display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; }
.people-layout {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: 12px;
  min-height: 320px;
  align-items: start;
}
@media (max-width: 800px) {
  .people-layout { grid-template-columns: 1fr; }
}
.people-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 55vh;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
  background: var(--panel-2);
}
.people-item {
  text-align: left;
  border: 1px solid transparent;
  background: var(--panel);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  display: grid;
  gap: 2px;
}
.people-item.on {
  border-color: var(--primary, var(--brand-primary));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, transparent);
}
.people-item strong { font-size: 0.88rem; color: var(--ink); }
.people-meta { font-size: 0.72rem; color: var(--ink-soft); }
.people-detail {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  max-height: 55vh;
  overflow: auto;
  background: var(--panel);
}
.people-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.people-detail-head h4 { margin: 0; font-size: 1.05rem; }
.person-ans {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--panel-2);
  font-size: 0.88rem;
}
.person-q { color: var(--ink-soft); }
.person-v { color: var(--ink); word-break: break-word; }
.export-qs { display: grid; gap: 6px; margin: 8px 0; max-height: 220px; overflow: auto; border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
.ai-box { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: var(--panel-2); display: grid; gap: 6px; }
.ai-box-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.ai-downloads { display: flex; flex-wrap: wrap; gap: 6px; }
.ai-box h4 { margin: 8px 0 2px; font-size: 0.9rem; }
.metrics { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.res-q { padding: 12px 0; border-bottom: 1px solid var(--line); }
.res-q-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
.tally { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.tally li { display: grid; grid-template-columns: minmax(80px, 1.2fr) 2fr auto; gap: 8px; align-items: center; font-size: 0.88rem; }
.mini-bar { height: 8px; background: var(--line); border-radius: 999px; overflow: hidden; }
.samples { margin: 0; padding-left: 18px; color: var(--ink); }
</style>
