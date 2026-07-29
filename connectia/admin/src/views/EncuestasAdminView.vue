<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Encuestas</h1>
        <p>Definí audiencia, publicá y seguí participación + resultados</p>
        <ScreenHelp
          purpose="Gestión completa de encuestas: a quién llegan, cuántos respondieron y qué contestaron."
          can-do="Publicar, despublicar, activar o desactivar. Ver participación y resultados. Generar informe IA descargable (PDF/DOCX) con gráficos."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="!aiConfigured" @click="openAiNew">
          Nueva encuesta con IA
        </button>
        <button type="button" class="btn-primary" @click="openNew">Nueva encuesta</button>
      </div>
    </header>
    <p v-if="!aiConfigured" class="hint">Para generar con IA configurá las API keys en el backend.</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="aiPromptOpen" class="sheet" @click.self="aiPromptOpen = false">
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

    <table class="table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Estado</th>
          <th>Audiencia</th>
          <th>Participación</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in items" :key="s.id">
          <td>
            <strong>{{ s.titulo }}</strong>
            <p class="sub">{{ s.questionCount }} pregunta(s)</p>
          </td>
          <td><span class="pill" :data-st="s.status">{{ statusLabel(s.status) }}</span></td>
          <td>{{ audienceLabel(s.audience) }}</td>
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
            <button type="button" class="btn-ghost" @click="openStats(s)">Estadísticas</button>
            <button type="button" class="btn-ghost" @click="showResults(s)">Resultados</button>
            <button
              type="button"
              class="btn-ghost"
              :disabled="!!statusBusyId || !!reportBusyId"
              @click="openReportModal(s)"
            >
              {{ reportBusyId === s.id ? 'Informe…' : 'Informe IA' }}
            </button>
            <button type="button" class="btn-ghost" @click="edit(s)">Editar</button>
            <template v-if="s.status === 'draft'">
              <button
                type="button"
                class="btn-primary"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'published')"
              >
                Publicar
              </button>
            </template>
            <template v-else-if="s.status === 'published'">
              <button
                type="button"
                class="btn-ghost"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'draft')"
              >
                Despublicar
              </button>
              <button
                type="button"
                class="btn-ghost danger"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'closed')"
              >
                Desactivar
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="btn-primary"
                :disabled="statusBusyId === s.id"
                @click="setStatus(s, 'published')"
              >
                Activar
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length" class="muted">Sin encuestas aún.</p>

    <!-- Informe IA descargable -->
    <div v-if="reportSurvey" class="sheet" @click.self="closeReportModal">
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

    <!-- Editor -->
    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel editor" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar encuesta' : 'Nueva encuesta' }}</h2>
        <label>Título<input v-model="draft.titulo" required class="input" /></label>
        <label>Descripción<textarea v-model="draft.descripcion" rows="2" class="input" /></label>
        <label>Estado
          <select v-model="draft.status" class="input">
            <option value="draft">Borrador (no visible)</option>
            <option value="published">Publicada / activa</option>
            <option value="closed">Desactivada (cerrada)</option>
          </select>
        </label>
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
        <p class="hint">
          Al publicar se congela el tamaño de la audiencia enviada (ej. 500 personas) para medir participación.
        </p>

        <section class="block">
          <strong>Audiencia</strong>
          <p class="hint">Quién puede ver y responder esta encuesta en la app.</p>
          <div class="audience-modes">
            <button
              type="button"
              class="mode"
              :class="{ on: draft.audience.mode === 'all' }"
              @click="draft.audience.mode = 'all'"
            >
              Toda la comunidad
            </button>
            <button
              type="button"
              class="mode"
              :class="{ on: draft.audience.mode === 'restricted' }"
              @click="draft.audience.mode = 'restricted'"
            >
              Áreas y/o grupos
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
        </section>

        <div class="qs">
          <div class="qs-head">
            <strong>Preguntas</strong>
            <button type="button" class="btn-ghost" @click="addQ">+ Pregunta</button>
          </div>
          <div v-for="(q, i) in draft.questions" :key="q.id" class="q">
            <input v-model="q.texto" class="input" placeholder="Texto de la pregunta" required />
            <div class="q-row">
              <select v-model="q.tipo" class="input">
                <option v-for="t in questionTypeMeta" :key="t.id" :value="t.id">{{ t.label }}</option>
              </select>
              <input v-model="q.grupo" class="input" placeholder="Grupo / sección (ej. Liderazgo)" />
            </div>
            <input
              v-if="q.tipo === 'single' || q.tipo === 'multiple'"
              v-model="q.opcionesText"
              class="input"
              placeholder="Opciones separadas por |"
            />
            <p v-if="typeHint(q.tipo)" class="hint">{{ typeHint(q.tipo) }}</p>
            <label class="check"><input v-model="q.required" type="checkbox" /> Obligatoria</label>
            <button type="button" class="btn-ghost danger" @click="draft.questions.splice(i, 1)">Quitar</button>
          </div>
        </div>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        </div>
        <p v-if="formError" class="err">{{ formError }}</p>
      </form>
    </div>

    <!-- Estadísticas de participación (no resultados de contenido) -->
    <div v-if="stats" class="sheet" @click.self="stats = null">
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

    <!-- Resultados: contenido de respuestas (agregados / grupos / individuales) -->
    <div v-if="results" class="sheet" @click.self="closeResults">
      <div class="panel editor">
        <header class="res-head">
          <div>
            <h2>Resultados del cuestionario</h2>
            <p>
              {{ results.survey.titulo }}
              · {{ results.segment?.answered ?? results.participation.answered }} respuestas
              <span v-if="results.survey.anonymous"> · Anónima</span>
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="closeResults">Cerrar</button>
        </header>

        <section class="filters">
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
        </section>
        <p class="hint">Segmento actual: {{ results.segment?.label }} · invitados en segmento {{ results.segment?.invited ?? '—' }} · tasa {{ results.segment?.rate ?? '—' }}%</p>

        <div class="tabs" role="tablist">
          <button type="button" :class="{ on: resultsTab === 'individuos' }" @click="resultsTab = 'individuos'">
            Por persona ({{ (results.individuals || []).length }})
          </button>
          <button type="button" :class="{ on: resultsTab === 'grupos' }" @click="resultsTab = 'grupos'">Por grupo de preguntas</button>
          <button type="button" :class="{ on: resultsTab === 'preguntas' }" @click="resultsTab = 'preguntas'">Por pregunta</button>
          <button type="button" :class="{ on: resultsTab === 'export' }" @click="resultsTab = 'export'">Descargar</button>
          <button type="button" :class="{ on: resultsTab === 'ia' }" @click="resultsTab = 'ia'">Análisis IA</button>
        </div>

        <section v-if="resultsTab === 'individuos'" class="res-block">
          <h3>Respuestas por persona</h3>
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
          <h3>Resultados por grupo del cuestionario</h3>
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
          <h3>Por pregunta</h3>
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
          <h3>Descargar cuestionarios respondidos</h3>
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
          <h3>Análisis IA (cualitativo + cuantitativo)</h3>
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
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import { downloadAiReport } from '../utils/surveyAnalysisExport'

const items = ref([])
const draft = ref(null)
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
const aiConfigured = ref(false)
const aiPromptOpen = ref(false)
const aiCreatePrompt = ref('')
const aiCreateLoading = ref(false)
const aiCreateError = ref('')
const createAiProvider = ref('auto')
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
const reportSurvey = ref(null)
const reportFocus = ref('')
const reportProvider = ref('auto')
const reportBusyId = ref('')
const reportFormat = ref('')
const reportError = ref('')
const questionTypeMeta = ref([
  { id: 'text', label: 'Texto corto' },
  { id: 'textarea', label: 'Texto largo' },
  { id: 'number', label: 'Número' },
  { id: 'yesno', label: 'Sí / No' },
  { id: 'single', label: 'Opción única' },
  { id: 'multiple', label: 'Opción múltiple' },
  { id: 'rating', label: 'Valoración 1–5' },
  { id: 'date', label: 'Fecha' },
  { id: 'time', label: 'Hora' },
  { id: 'datetime', label: 'Fecha y hora' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Teléfono' },
  { id: 'geopoint', label: 'Check-in (ubicación GPS)' },
])

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [] }
}

function normalizeAudience(a) {
  return {
    mode: a?.mode === 'restricted' ? 'restricted' : 'all',
    areaIds: [...(a?.areaIds || [])].map(String),
    groupIds: [...(a?.groupIds || [])].map(String),
  }
}

function statusLabel(s) {
  return { draft: 'Borrador', published: 'Publicada / activa', closed: 'Desactivada' }[s] || s
}

function audienceLabel(a) {
  if (!a || a.mode !== 'restricted') return 'Toda la comunidad'
  const nA = a.areaIds?.length || 0
  const nG = a.groupIds?.length || 0
  if (!nA && !nG) return 'Restringida (sin selección)'
  const parts = []
  if (nA) parts.push(`${nA} área(s)`)
  if (nG) parts.push(`${nG} grupo(s)`)
  return parts.join(' · ')
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
    single: 'Una sola opción. Separá las opciones con |',
    multiple: 'Puede marcar varias. Separá las opciones con |',
  }
  return hints[tipo] || ''
}

function typeLabel(tipo) {
  return questionTypeMeta.value.find((t) => t.id === tipo)?.label || tipo
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
    if (Array.isArray(data.questionTypeMeta) && data.questionTypeMeta.length) {
      questionTypeMeta.value = data.questionTypeMeta
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
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
  draft.value = {
    titulo: '',
    descripcion: '',
    status: 'draft',
    purpose: 'general',
    anonymous: false,
    startsAtLocal: '',
    endsAtLocal: '',
    audience: emptyAudience(),
    questions: [{ id: qid(), texto: '', tipo: 'text', required: true, grupo: 'General', opcionesText: '' }],
  }
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
    draft.value = {
      titulo: d.titulo || '',
      descripcion: d.descripcion || '',
      status: 'draft',
      purpose: 'general',
      anonymous: Boolean(d.anonymous),
      startsAtLocal: '',
      endsAtLocal: '',
      audience: emptyAudience(),
      questions: (d.questions || []).map((q) => ({
        id: q.id || qid(),
        texto: q.texto || '',
        tipo: q.tipo || 'text',
        required: q.required !== false,
        grupo: q.grupo || 'General',
        opcionesText: (q.opciones || []).join(' | '),
      })),
    }
    if (!draft.value.questions.length) {
      draft.value.questions = [{ id: qid(), texto: '', tipo: 'text', required: true, grupo: 'General', opcionesText: '' }]
    }
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

async function edit(s) {
  formError.value = ''
  try {
    const { data } = await api.get(`/admin/surveys/${s.id}`)
    const survey = data.survey
    draft.value = {
      id: survey.id,
      titulo: survey.titulo,
      descripcion: survey.descripcion,
      status: survey.status,
      purpose: survey.purpose || 'general',
      anonymous: Boolean(survey.anonymous),
      startsAtLocal: toLocalInput(survey.startsAt),
      endsAtLocal: toLocalInput(survey.endsAt),
      audience: normalizeAudience(survey.audience),
      questions: (survey.questions || []).map((q) => ({
        ...q,
        grupo: q.grupo || 'General',
        opcionesText: (q.opciones || []).join(' | '),
      })),
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function addQ() {
  draft.value.questions.push({
    id: qid(),
    texto: '',
    tipo: 'text',
    required: true,
    grupo: 'General',
    opcionesText: '',
  })
}

function packQuestions() {
  return (draft.value.questions || []).map((q) => ({
    id: q.id,
    texto: q.texto,
    tipo: q.tipo,
    required: q.required,
    grupo: q.grupo || 'General',
    opciones: String(q.opcionesText || '')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean),
  }))
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const body = {
      titulo: draft.value.titulo,
      descripcion: draft.value.descripcion,
      status: draft.value.status,
      purpose: draft.value.purpose || 'general',
      anonymous: Boolean(draft.value.anonymous),
      startsAt: fromLocalInput(draft.value.startsAtLocal),
      endsAt: fromLocalInput(draft.value.endsAtLocal),
      audience: normalizeAudience(draft.value.audience),
      questions: packQuestions(),
    }
    if (draft.value.id) await api.patch(`/admin/surveys/${draft.value.id}`, body)
    else await api.post('/admin/surveys', body)
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
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
.page-head p { margin: 4px 0 0; color: #64748b; }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
.sub { margin: 4px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 400; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; max-width: 420px; justify-content: flex-end; }
.pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  background: #e2e8f0; color: #334155; text-transform: capitalize;
}
.pill[data-st='published'] { background: #d1fae5; color: #065f46; }
.pill[data-st='draft'] { background: #fef3c7; color: #92400e; }
.pill[data-st='closed'] { background: #e2e8f0; color: #475569; }
.pill.soft { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: none; }
.part { display: grid; gap: 4px; min-width: 140px; }
.part small { color: #64748b; font-size: 0.75rem; }
.part-bar {
  height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden;
}
.part-bar > span, .part-bar > i, .mini-bar > i {
  display: block; height: 100%; background: var(--primary, #0F766E); border-radius: 999px;
}
.part-bar.lg { height: 10px; margin-top: 8px; }
.sheet { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 40; padding: 12px; }
.panel { width: min(640px, 100%); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.panel.wide { width: min(820px, 100%); }
.panel.editor {
  width: min(1100px, 100%);
  height: min(92vh, 980px);
  max-height: 92vh;
  padding: 24px 28px;
}
@media (min-width: 900px) {
  .panel.editor .audience-picks { grid-template-columns: 1fr 1fr; }
  .panel.editor .qs { flex: 1; min-height: 0; }
}
.input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.block { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.audience-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mode { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.mode.on { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.audience-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pick-title { margin: 0 0 6px; font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
.qs { border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; flex-direction: column; gap: 10px; }
.qs-head { display: flex; justify-content: space-between; align-items: center; }
.q { display: grid; gap: 6px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; }
.q-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
.series { display: flex; align-items: flex-end; gap: 2px; height: 120px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
.series-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.series-bar { width: 100%; background: var(--primary, #0F766E); border-radius: 3px 3px 0 0; min-height: 2px; }
.group-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
.res-q.nested { padding: 8px 0 8px 8px; border-left: 3px solid color-mix(in srgb, var(--primary, #0F766E) 35%, #e2e8f0); }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.hint { margin: 0; font-size: 0.78rem; font-weight: 400; color: #64748b; }
.footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; }
.btn-primary { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.btn-ghost.danger { color: #b91c1c; }
.err { color: #b91c1c; }
.muted { color: #64748b; }
.res-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.res-head h2 { margin: 0; }
.res-head p { margin: 4px 0 0; color: #64748b; }
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 720px) { .cards { grid-template-columns: repeat(4, 1fr); } }
.card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }
.card.accent { background: color-mix(in srgb, var(--primary, #0F766E) 10%, #fff); border-color: color-mix(in srgb, var(--primary, #0F766E) 25%, #e2e8f0); }
.card h3 { margin: 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
.big { margin: 6px 0 4px; font-size: 1.35rem; font-weight: 800; }
.res-block h3 { margin: 8px 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.tabs button {
  border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; padding: 6px 12px;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.tabs button.on { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.hl { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
.ind { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
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
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px;
  background: #f8fafc;
}
.people-item {
  text-align: left;
  border: 1px solid transparent;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  display: grid;
  gap: 2px;
}
.people-item.on {
  border-color: var(--primary, #0F766E);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary, #0F766E) 35%, transparent);
}
.people-item strong { font-size: 0.88rem; color: #0f172a; }
.people-meta { font-size: 0.72rem; color: #64748b; }
.people-detail {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  max-height: 55vh;
  overflow: auto;
  background: #fff;
}
.people-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}
.people-detail-head h4 { margin: 0; font-size: 1.05rem; }
.person-ans {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.88rem;
}
.person-q { color: #475569; }
.person-v { color: #0f172a; word-break: break-word; }
.export-qs { display: grid; gap: 6px; margin: 8px 0; max-height: 220px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
.ai-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; display: grid; gap: 6px; }
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
.res-q { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
.res-q-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
.tally { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.tally li { display: grid; grid-template-columns: minmax(80px, 1.2fr) 2fr auto; gap: 8px; align-items: center; font-size: 0.88rem; }
.mini-bar { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.samples { margin: 0; padding-left: 18px; color: #334155; }
</style>
