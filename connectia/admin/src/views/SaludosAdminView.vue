<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Saludos automáticos</h1>
        <p>
          Reglas que publican una pieza tipo <strong>celebración</strong> en el muro (cumpleaños,
          aniversarios o fecha fija). Podés generarlas con IA y revisarlas antes de activar.
        </p>
        <ScreenHelp
          purpose="Automatiza celebraciones del muro. Cada tipo define el disparo: fechas de perfil, fecha custom, N días después de un evento, calendario fijo o solo manual/API."
          can-do="ABM de tipos (origen del disparo + plantilla), crear reglas, pausar, ejecutar ahora. Fechas custom viven en user.customDates."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="refreshAll">Actualizar</button>
        <template v-if="mainTab === 'rules'">
          <button type="button" class="btn-ghost" @click="openManual">Manual</button>
          <button type="button" class="btn-primary" :disabled="!aiConfigured" @click="openAi">
            Generar con IA
          </button>
        </template>
        <button v-else type="button" class="btn-primary" @click="openTypeCreate">Nuevo tipo</button>
      </div>
    </header>

    <nav class="tabs" aria-label="Secciones">
      <button type="button" class="tab" :class="{ on: mainTab === 'rules' }" @click="mainTab = 'rules'">
        Reglas
      </button>
      <button type="button" class="tab" :class="{ on: mainTab === 'types' }" @click="switchToTypes">
        Tipos de celebración
      </button>
    </nav>

    <p v-if="!aiConfigured" class="hint">
      Para generar reglas con IA configurá <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code>.
      Mientras tanto usá <strong>Manual</strong>.
    </p>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="toast" class="toast">{{ toast }}</p>

    <template v-if="mainTab === 'types'">
      <p class="muted">
        Definí qué tipos existen (ej. cumpleaños, día de la empresa). Cada uno indica de dónde sale la fecha.
        Las reglas eligen uno de estos tipos.
      </p>
      <p v-if="typesLoading" class="muted">Cargando tipos…</p>
      <ul v-else class="list type-list">
        <li v-for="t in typeItems" :key="t.id || t.key" class="card type-card-row">
          <div class="card-media" v-if="t.imageUrl || (t.imageUrls && t.imageUrls[0])">
            <img :src="resolveMediaUrl(t.imageUrl || t.imageUrls[0])" alt="" />
          </div>
          <div class="card-main">
            <div class="card-top">
              <strong>{{ t.label }}</strong>
              <span class="badge" :data-on="t.activo ? '1' : '0'">{{ t.activo ? 'Activo' : 'Pausado' }}</span>
              <span v-if="t.isSystem" class="badge tipo">Sistema</span>
              <code class="key-pill">{{ t.key }}</code>
            </div>
            <p class="meta">
              Origen: {{ t.dateSourceLabel || t.dateSource }}
              <span v-if="t.minYears"> · mín. {{ t.minYears }} año(s)</span>
              <span v-if="t.imageUrl || (t.imageUrls && t.imageUrls.length)"> · Con media default</span>
              <span v-else-if="t.defaultTitulo"> · Con copy default</span>
            </p>
            <p v-if="t.description" class="body">{{ t.description }}</p>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-ghost sm" @click="editType(t)">Editar</button>
            <button type="button" class="btn-ghost sm" :disabled="typeBusyId === t.id" @click="toggleType(t)">
              {{ t.activo ? 'Pausar' : 'Activar' }}
            </button>
            <button
              v-if="!t.isSystem"
              type="button"
              class="btn-ghost sm danger"
              :disabled="typeBusyId === t.id"
              @click="removeType(t)"
            >
              Borrar
            </button>
          </div>
        </li>
      </ul>
      <p v-if="!typesLoading && !typeItems.length" class="muted">No hay tipos todavía.</p>
    </template>

    <template v-else>
    <section class="filters">
      <input v-model="q" class="input" type="search" placeholder="Buscar…" @keyup.enter="load" />
      <select v-model="eventFilter" class="input" @change="load">
        <option value="">Todos los tipos</option>
        <option v-for="t in eventTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
      <select v-model="activoFilter" class="input" @change="load">
        <option value="">Activas y pausadas</option>
        <option value="true">Solo activas</option>
        <option value="false">Solo pausadas</option>
      </select>
      <button type="button" class="btn-ghost" @click="load">Filtrar</button>
    </section>

    <p v-if="loading && !items.length" class="muted">Cargando…</p>
    <p v-else-if="!items.length" class="muted">
      Todavía no hay reglas. Probá <strong>Generar con IA</strong> (ej. “cumpleaños a las 9 con tono cálido”).
    </p>

    <ul v-else class="list">
      <li v-for="r in items" :key="r.id" class="card">
        <div class="card-media" :data-kind="cardMediaKind(r)">
          <template v-if="cardMediaKind(r) === 'carousel'">
            <img :src="resolveMediaUrl(cardCover(r))" alt="" />
            <span class="media-pill">Carrusel · {{ (r.imageUrls || []).length }}</span>
          </template>
          <template v-else-if="cardMediaKind(r) === 'image'">
            <img :src="resolveMediaUrl(cardCover(r))" alt="" />
          </template>
          <template v-else-if="cardMediaKind(r) === 'youtube'">
            <img
              v-if="youtubeThumb(cardCover(r))"
              :src="youtubeThumb(cardCover(r))"
              alt=""
            />
            <div v-else class="media-fallback">YouTube</div>
            <span class="media-pill">YouTube</span>
          </template>
          <template v-else-if="cardMediaKind(r) === 'video'">
            <div class="media-fallback">Video</div>
            <span class="media-pill">Video</span>
          </template>
          <div v-else class="media-fallback muted-fallback">Sin media</div>
        </div>
        <div class="card-main">
          <div class="card-top">
            <strong>{{ r.name || r.titulo }}</strong>
            <span class="badge" :data-on="r.activo ? '1' : '0'">{{ r.activo ? 'Activa' : 'Pausada' }}</span>
            <span class="badge tipo">{{ r.eventLabel }}</span>
          </div>
          <p class="title">{{ r.titulo }}</p>
          <p v-if="r.cuerpo" class="body">{{ r.cuerpo }}</p>
          <p class="meta">
            Hora(s) {{ (r.hours || []).join(', ') }}
            · {{ r.daysBefore ? `${r.daysBefore} día(s) antes` : 'El mismo día' }}
            · Pub: celebración
            <span v-if="cardMediaKind(r)"> · {{ greetingMediaLabel(cardMediaKind(r)) }}</span>
            · Media {{ mediaPickLabel(r.mediaPick) }}
            · Creadas {{ r.stats?.postsCreated || 0 }}
            <span v-if="r.lastRunAt"> · Última {{ fmt(r.lastRunAt) }}</span>
          </p>
          <p v-if="r.stats?.lastError" class="err small">{{ r.stats.lastError }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn-primary sm" :disabled="busyId === r.id" @click="runNow(r)">
            Ejecutar ahora
          </button>
          <button type="button" class="btn-ghost sm" @click="editOne(r)">Editar</button>
          <button type="button" class="btn-ghost sm" :disabled="busyId === r.id" @click="toggleActivo(r)">
            {{ r.activo ? 'Pausar' : 'Activar' }}
          </button>
          <button type="button" class="btn-ghost sm danger" :disabled="busyId === r.id" @click="removeOne(r)">
            Borrar
          </button>
        </div>
      </li>
    </ul>

    <button v-if="hasMore" type="button" class="btn-ghost more" :disabled="loading" @click="loadMore">
      Ver más
    </button>
    </template>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div>
            <h2>{{ form.id ? 'Editar saludo' : aiMode ? 'Nueva regla con IA' : 'Nueva regla' }}</h2>
            <p class="muted small">Tipo → copy → media → horario → audiencia.</p>
          </div>
          <button type="button" class="btn-ghost sm" @click="closeModal">Cerrar</button>
        </header>

        <div class="form-split">
          <nav class="form-nav" aria-label="Secciones del editor">
            <button
              v-if="aiMode && !form.id"
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'ia' }"
              @click="ruleStep = 'ia'"
            >
              <span class="nav-n">1</span>
              <span>
                <strong>Prompt IA</strong>
                <small>Generar borrador</small>
              </span>
            </button>
            <button
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'basico' }"
              @click="ruleStep = 'basico'"
            >
              <span class="nav-n">{{ aiMode && !form.id ? '2' : '1' }}</span>
              <span>
                <strong>Básico</strong>
                <small>Nombre y tipo</small>
              </span>
            </button>
            <button
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'contenido' }"
              @click="ruleStep = 'contenido'"
            >
              <span class="nav-n">{{ aiMode && !form.id ? '3' : '2' }}</span>
              <span>
                <strong>Contenido</strong>
                <small>Título y cuerpo</small>
              </span>
            </button>
            <button
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'media' }"
              @click="ruleStep = 'media'"
            >
              <span class="nav-n">{{ aiMode && !form.id ? '4' : '3' }}</span>
              <span>
                <strong>Media</strong>
                <small>Imagen / pool / perfil</small>
              </span>
            </button>
            <button
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'programacion' }"
              @click="ruleStep = 'programacion'"
            >
              <span class="nav-n">{{ aiMode && !form.id ? '5' : '4' }}</span>
              <span>
                <strong>Programación</strong>
                <small>Horas y calendario</small>
              </span>
            </button>
            <button
              type="button"
              class="nav-step"
              :class="{ on: ruleStep === 'audiencia' }"
              @click="ruleStep = 'audiencia'"
            >
              <span class="nav-n">{{ aiMode && !form.id ? '6' : '5' }}</span>
              <span>
                <strong>Audiencia</strong>
                <small>Quién entra / ve</small>
              </span>
            </button>
          </nav>

          <div class="form-detail">
            <section v-if="ruleStep === 'ia' && aiMode && !form.id" class="editor-section">
              <h3 class="editor-section-title">Prompt IA</h3>
              <div class="ai-box">
                <label class="lbl">Describí la celebración
                  <textarea
                    v-model="aiPrompt"
                    class="input"
                    rows="4"
                    placeholder="Ej. Cumpleaños del equipo a las 09:00, tono cercano, mencionar cargo y felicitar en el muro."
                  />
                </label>
                <button type="button" class="btn-primary" :disabled="aiBusy || !aiPrompt.trim()" @click="runAi">
                  {{ aiBusy ? 'Generando…' : 'Generar borrador' }}
                </button>
                <p v-if="aiNotes" class="muted small">{{ aiNotes }}</p>
              </div>
            </section>

            <section v-else-if="ruleStep === 'basico'" class="editor-section">
              <h3 class="editor-section-title">Básico</h3>
              <div class="form-grid">
                <label class="lbl">Nombre interno
                  <input v-model="form.name" class="input" maxlength="120" />
                </label>
                <label class="lbl">Tipo de evento
                  <select v-model="form.eventType" class="input" @change="onRuleEventTypeChange">
                    <option v-for="t in eventTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                  </select>
                </label>
                <aside class="source-box full" aria-label="Origen de los datos">
                  <p class="source-title">¿De dónde valida el sistema?</p>
                  <p class="source-lead">{{ eventSource.lead }}</p>
                  <ul class="source-list">
                    <li v-for="(b, i) in eventSource.bullets" :key="i">{{ b }}</li>
                  </ul>
                  <p class="source-foot">
                    Reloj: timezone del tenant (no la del navegador). Personas sin el dato de fecha cargado
                    en su perfil no entran en la corrida.
                  </p>
                </aside>
              </div>
            </section>

            <section v-else-if="ruleStep === 'contenido'" class="editor-section">
              <h3 class="editor-section-title">Contenido</h3>
              <div class="form-grid">
                <label class="lbl full">Título (publicación celebración)
                  <input v-model="form.titulo" class="input" maxlength="160" />
                </label>
                <label class="lbl full">Cuerpo
                  <textarea v-model="form.cuerpo" class="input" rows="8" />
                </label>
                <p class="muted small full">
                  Variables (perfil del usuario):
                  <code v-pre>{{nombre}}</code>
                  <code v-pre>{{apellido}}</code>
                  <code v-pre>{{cargo}}</code>
                  ·
                  <code v-pre>{{anios}}</code> = años desde la fecha de ingreso.
                </p>
              </div>
            </section>

            <section v-else-if="ruleStep === 'media'" class="editor-section">
              <h3 class="editor-section-title">Media</h3>
              <div class="media-block full">
                <p class="muted small">
                  Si no cargás media acá, al publicar se usa la plantilla default del tipo.
                </p>
                <div class="media-kinds">
                  <button
                    v-for="p in mediaPicks"
                    :key="p.id"
                    type="button"
                    class="chip"
                    :class="{ on: form.mediaPick === p.id }"
                    @click="setMediaPick(p.id)"
                  >
                    {{ p.label }}
                  </button>
                </div>
                <p v-if="form.mediaPick === 'profile'" class="muted small">
                  Origen: foto de perfil (<code>avatarUrl</code>). Si está vacía, usa el pool de respaldo.
                </p>
                <p v-else-if="form.mediaPick === 'random'" class="muted small">
                  En cada publicación elige <strong>una</strong> imagen al azar del pool.
                </p>

                <template v-if="form.mediaPick === 'fixed'">
                  <p class="media-title sub">Tipo de media fija</p>
                  <div class="media-kinds">
                    <button
                      v-for="m in mediaKinds"
                      :key="m.id"
                      type="button"
                      class="chip"
                      :class="{ on: mediaKind === m.id }"
                      @click="setMediaKind(m.id)"
                    >
                      {{ m.label }}
                    </button>
                  </div>
                </template>
                <p v-else class="media-title sub">
                  {{ form.mediaPick === 'random' ? 'Pool de imágenes' : 'Pool de respaldo (opcional)' }}
                </p>

                <div v-if="showPoolUi" class="media-panel">
                  <div
                    class="dropzone"
                    :class="{ over: dragOver, busy: uploading }"
                    @dragenter.prevent="dragOver = true"
                    @dragover.prevent="dragOver = true"
                    @dragleave.prevent="dragOver = false"
                    @drop.prevent="onDropFiles($event, true)"
                    @click="carouselInput?.click()"
                  >
                    <input
                      ref="carouselInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      hidden
                      @change="onCarouselFiles"
                    />
                    <strong>{{ uploading ? 'Subiendo…' : 'Arrastrá o elegí imágenes' }}</strong>
                    <small>jpg, png, webp, gif · hasta 12 · /uploads</small>
                  </div>
                  <p v-if="uploadError" class="err">{{ uploadError }}</p>
                  <ul v-if="form.imageUrls.length" class="carousel-list">
                    <li v-for="(u, i) in form.imageUrls" :key="u + i" class="carousel-item">
                      <img :src="resolveMediaUrl(u)" :alt="'Slide ' + (i + 1)" />
                      <div class="carousel-actions">
                        <button type="button" class="btn-ghost sm" :disabled="i === 0" @click="moveSlide(i, -1)">↑</button>
                        <button
                          type="button"
                          class="btn-ghost sm"
                          :disabled="i === form.imageUrls.length - 1"
                          @click="moveSlide(i, 1)"
                        >
                          ↓
                        </button>
                        <button type="button" class="btn-ghost sm danger" @click="removeSlide(i)">Quitar</button>
                      </div>
                    </li>
                  </ul>
                  <div class="url-row">
                    <input v-model="carouselUrlDraft" class="input" placeholder="O pegá URL de imagen y Enter" @keyup.enter="addCarouselUrl" />
                    <button type="button" class="btn-ghost sm" @click="addCarouselUrl">Agregar</button>
                  </div>
                  <div v-if="form.mediaPick === 'fixed' && form.imageUrls.length >= 2" class="preview">
                    <PostMediaCarousel :urls="form.imageUrls" :alt="form.titulo || 'Carrusel'" />
                  </div>
                  <p v-else-if="form.mediaPick === 'fixed' && form.imageUrls.length === 1" class="muted small">
                    Agregá al menos 2 imágenes para el carrusel.
                  </p>
                  <p v-else-if="form.mediaPick === 'random' && !form.imageUrls.length" class="muted small">
                    Necesitás al menos 1 imagen en el pool.
                  </p>
                </div>

                <div v-else-if="mediaKind === 'image'" class="media-panel">
                  <div
                    class="dropzone"
                    :class="{ over: dragOver, busy: uploading }"
                    @dragenter.prevent="dragOver = true"
                    @dragover.prevent="dragOver = true"
                    @dragleave.prevent="dragOver = false"
                    @drop.prevent="onDropFiles($event, false)"
                    @click="imageInput?.click()"
                  >
                    <input
                      ref="imageInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      @change="onImageFile"
                    />
                    <strong>{{ uploading ? 'Subiendo…' : 'Arrastrá o elegí una imagen' }}</strong>
                    <small>jpg, png, webp, gif · se guarda en /uploads</small>
                  </div>
                  <p v-if="uploadError" class="err">{{ uploadError }}</p>
                  <input
                    v-model="form.imageUrl"
                    class="input"
                    type="text"
                    inputmode="url"
                    placeholder="O pegá URL /uploads/… o https://…"
                  />
                  <div v-if="form.imageUrl" class="preview">
                    <PostMedia :url="form.imageUrl" :alt="form.titulo || 'Vista previa'" :autoplay-on-visible="false" />
                  </div>
                  <button v-if="form.imageUrl" type="button" class="btn-ghost sm danger" @click="clearMedia">Quitar imagen</button>
                </div>

                <div v-else-if="mediaKind === 'video' || mediaKind === 'youtube'" class="media-panel">
                  <input
                    v-model="form.imageUrl"
                    class="input"
                    type="text"
                    inputmode="url"
                    :placeholder="mediaKind === 'youtube' ? 'https://youtube.com/watch?v=… o youtu.be/…' : 'https://…/video.mp4 o /uploads/…'"
                  />
                  <div v-if="form.imageUrl" class="preview">
                    <PostMedia :url="form.imageUrl" :alt="form.titulo || 'Vista previa'" :autoplay-on-visible="false" />
                  </div>
                  <p v-else class="muted small">Pegá la URL del {{ mediaKind === 'youtube' ? 'video de YouTube' : 'archivo de video' }}.</p>
                </div>

                <div
                  v-if="form.mediaPick !== 'fixed' || mediaKind === 'image' || mediaKind === 'carousel'"
                  class="media-panel audio-panel"
                >
                  <label class="lbl">Audio opcional (URL mp3/m4a/ogg/wav)
                    <input v-model="form.audioUrl" class="input" type="url" placeholder="https://…/nota.mp3" />
                  </label>
                </div>
              </div>
            </section>

            <section v-else-if="ruleStep === 'programacion'" class="editor-section">
              <h3 class="editor-section-title">Programación</h3>
              <div class="form-grid">
                <label class="lbl">Horas locales del tenant (HH:MM, coma)
                  <input v-model="hoursText" class="input" placeholder="09:00, 14:00" />
                </label>
                <label class="lbl">Días previos
                  <input v-model.number="form.daysBefore" class="input" type="number" min="0" max="30" />
                </label>
                <p class="muted small full">
                  <strong>Horas:</strong> el scheduler solo dispara en esos horarios (timezone del tenant).
                  <strong>Días previos:</strong> 0 = el mismo día del evento; 1 = un día antes, etc.
                  <strong>Ejecutar ahora</strong> ignora la hora y prueba la regla ya.
                </p>
                <template v-if="isFixedDateType">
                  <label class="lbl">Día del calendario
                    <input v-model.number="form.fixedDay" class="input" type="number" min="1" max="31" />
                  </label>
                  <label class="lbl">Mes del calendario
                    <input v-model.number="form.fixedMonth" class="input" type="number" min="1" max="12" />
                  </label>
                  <p class="muted small full">
                    Esta fecha la definís vos en la regla (no lee un campo del usuario).
                  </p>
                </template>
              </div>
            </section>

            <section v-else-if="ruleStep === 'audiencia'" class="editor-section">
              <h3 class="editor-section-title">Audiencia</h3>
              <div class="audience-block full">
                <p class="muted small">
                  En cumpleaños/aniversarios: filtra quiénes pueden ser celebrados y quién ve la publicación.
                  En fecha fija la audiencia es solo quién ve el post.
                </p>
                <div class="audience-modes">
                  <button
                    type="button"
                    class="type-card"
                    :class="{ on: form.audience.mode === 'all' }"
                    @click="setAudienceMode('all')"
                  >
                    <strong>Toda la comunidad</strong>
                    <small>Todos los miembros activos</small>
                  </button>
                  <button
                    type="button"
                    class="type-card"
                    :class="{ on: form.audience.mode === 'restricted' }"
                    @click="setAudienceMode('restricted')"
                  >
                    <strong>Áreas y/o grupos</strong>
                    <small>+ personas puntuales opcionales</small>
                  </button>
                  <button
                    type="button"
                    class="type-card"
                    :class="{ on: form.audience.mode === 'users' }"
                    @click="setAudienceMode('users')"
                  >
                    <strong>Solo personas</strong>
                    <small>Destinatarios particulares</small>
                  </button>
                </div>

                <div v-if="form.audience.mode === 'restricted'" class="audience-picks">
                  <label class="lbl">Grupos
                    <select v-model="form.audience.groupIds" class="input" multiple size="4">
                      <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.nombre }}</option>
                    </select>
                  </label>
                  <label class="lbl">Áreas
                    <select v-model="form.audience.areaIds" class="input" multiple size="4">
                      <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
                    </select>
                  </label>
                </div>

                <div
                  v-if="form.audience.mode === 'restricted' || form.audience.mode === 'users'"
                  class="audience-users"
                >
                  <h4>
                    {{ form.audience.mode === 'users' ? 'Destinatarios puntuales' : 'También incluir personas puntuales' }}
                  </h4>
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
                        :disabled="form.audience.userIds.includes(u.id)"
                        @click="addAudienceUser(u)"
                      >
                        <strong>{{ u.label }}</strong>
                        <span>{{ u.usuario }}{{ u.email ? ' · ' + u.email : '' }}</span>
                      </button>
                    </li>
                  </ul>
                  <div v-if="selectedAudienceUsers.length" class="audience-user-chips">
                    <span v-for="u in selectedAudienceUsers" :key="u.id" class="audience-chip">
                      {{ u.label }}
                      <button type="button" class="audience-chip-x" title="Quitar" @click="removeAudienceUser(u.id)">
                        ×
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-grid" style="margin-top: 14px">
                <label class="chk">
                  <input v-model="form.notifyAudience" type="checkbox" />
                  Notificar audiencia (in-app / push / mail)
                </label>
                <label class="chk">
                  <input v-model="form.activo" type="checkbox" />
                  Regla activa
                </label>
              </div>
            </section>
          </div>
        </div>

        <p v-if="formError" class="err">{{ formError }}</p>
        <footer class="modal-foot">
          <button type="button" class="btn-ghost" @click="closeModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Guardando…' : 'Guardar regla' }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="typeModalOpen" class="modal-backdrop" @click.self="closeTypeModal">
      <div class="modal" role="dialog" aria-modal="true">
        <header class="modal-head">
          <h2>{{ typeForm.id ? 'Editar tipo' : 'Nuevo tipo de celebración' }}</h2>
          <button type="button" class="btn-ghost sm" @click="closeTypeModal">Cerrar</button>
        </header>
        <div class="form-grid">
          <label class="lbl full">Nombre
            <input v-model="typeForm.label" class="input" maxlength="80" placeholder="Ej. Día de la familia" />
          </label>
          <label v-if="!typeForm.id" class="lbl full">Key (opcional)
            <input v-model="typeForm.key" class="input" maxlength="64" placeholder="Se genera del nombre si lo dejás vacío" />
          </label>
          <p v-else class="muted small full">Key: <code>{{ typeForm.key }}</code> (no se puede cambiar)</p>
          <label class="lbl full">Origen del disparo
            <select v-model="typeForm.dateSource" class="input">
              <optgroup v-for="g in dateSourceGroups" :key="g" :label="g">
                <option v-for="d in dateSources.filter((x) => (x.group || 'Perfil') === g)" :key="d.id" :value="d.id">
                  {{ d.label }}
                </option>
              </optgroup>
            </select>
          </label>
          <label
            v-if="typeForm.dateSource === 'customDate' || (typeForm.dateSource === 'daysAfter' && typeForm.offsetField === 'customDate')"
            class="lbl full"
          >
            Key de fecha personalizada
            <input
              v-model="typeForm.customDateKey"
              class="input"
              maxlength="64"
              placeholder="ej. promocion, certificacion, fin_prueba"
            />
            <span class="muted small">Se lee de <code>user.customDates[key]</code> en el perfil.</span>
          </label>
          <template v-if="typeForm.dateSource === 'daysAfter'">
            <label class="lbl">Días después
              <input v-model.number="typeForm.offsetDays" class="input" type="number" min="0" max="3650" />
            </label>
            <label class="lbl">Desde qué fecha
              <select v-model="typeForm.offsetField" class="input">
                <option v-for="f in offsetFields" :key="f.id" :value="f.id">{{ f.label }}</option>
              </select>
            </label>
          </template>
          <label
            v-if="!['fixed', 'manual', 'daysAfter'].includes(typeForm.dateSource)"
            class="lbl"
          >
            Años mínimos
            <input v-model.number="typeForm.minYears" class="input" type="number" min="0" max="80" />
          </label>
          <p v-if="typeForm.dateSource === 'manual'" class="muted small full">
            No corre en el scheduler: solo con <strong>Ejecutar ahora</strong> o API, para la audiencia de la regla.
          </p>
          <label class="lbl full">Descripción
            <textarea v-model="typeForm.description" class="input" rows="2" maxlength="400" />
          </label>

          <div class="media-block full">
            <p class="media-title">Plantilla por defecto</p>
            <p class="muted small">
              Copy e imagen/pool que heredan las reglas de este tipo si no cargan media propia.
            </p>
            <label class="lbl full">Título default
              <input v-model="typeForm.defaultTitulo" class="input" maxlength="160" placeholder="¡Feliz cumpleaños {{nombre}}!" />
            </label>
            <label class="lbl full">Cuerpo default
              <textarea v-model="typeForm.defaultCuerpo" class="input" rows="3" />
            </label>
            <div class="media-kinds">
              <button
                v-for="p in mediaPicks"
                :key="'tp-' + p.id"
                type="button"
                class="chip"
                :class="{ on: typeForm.mediaPick === p.id }"
                @click="setTypeMediaPick(p.id)"
              >
                {{ p.label }}
              </button>
            </div>
            <div class="media-panel">
              <div
                class="dropzone"
                :class="{ over: typeDragOver, busy: typeUploading }"
                @dragenter.prevent="typeDragOver = true"
                @dragover.prevent="typeDragOver = true"
                @dragleave.prevent="typeDragOver = false"
                @drop.prevent="onTypeDropFiles"
                @click="typeImageInput?.click()"
              >
                <input
                  ref="typeImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  :multiple="typeForm.mediaPick !== 'fixed' || typeForm.mediaKind === 'carousel'"
                  hidden
                  @change="onTypeImageFiles"
                />
                <strong>{{ typeUploading ? 'Subiendo…' : 'Arrastrá o elegí imagen(es)' }}</strong>
                <small>Default del tipo · hasta 12</small>
              </div>
              <p v-if="typeUploadError" class="err">{{ typeUploadError }}</p>
              <input
                v-if="typeForm.mediaPick === 'fixed'"
                v-model="typeForm.imageUrl"
                class="input"
                type="text"
                inputmode="url"
                placeholder="O pegá URL /uploads/… o https://…"
              />
              <ul v-if="typeForm.imageUrls.length" class="carousel-list">
                <li v-for="(u, i) in typeForm.imageUrls" :key="'tu-' + u + i" class="carousel-item">
                  <img :src="resolveMediaUrl(u)" :alt="'Slide ' + (i + 1)" />
                  <div class="carousel-actions">
                    <button type="button" class="btn-ghost sm danger" @click="removeTypeSlide(i)">Quitar</button>
                  </div>
                </li>
              </ul>
              <div v-if="typeForm.imageUrl && typeForm.mediaPick === 'fixed' && !typeForm.imageUrls.length" class="preview">
                <PostMedia :url="typeForm.imageUrl" alt="Default" :autoplay-on-visible="false" />
              </div>
            </div>
          </div>

          <label class="chk">
            <input v-model="typeForm.activo" type="checkbox" />
            Tipo activo (usable en reglas)
          </label>
        </div>
        <p v-if="typeFormError" class="err">{{ typeFormError }}</p>
        <footer class="modal-foot">
          <button type="button" class="btn-ghost" @click="closeTypeModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="typeSaving" @click="saveType">
            {{ typeSaving ? 'Guardando…' : 'Guardar tipo' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import PostMedia from '../components/PostMedia.vue'
import PostMediaCarousel from '../components/PostMediaCarousel.vue'
import { resolveMediaUrl, mediaKind as detectMediaKind, youtubeId } from '../utils/media'

const items = ref([])
const loading = ref(false)
const error = ref('')
const toast = ref('')
const q = ref('')
const eventFilter = ref('')
const activoFilter = ref('')
const page = ref(1)
const hasMore = ref(false)
const busyId = ref('')
const mainTab = ref('rules')
const typeItems = ref([])
const typesLoading = ref(false)
const typeBusyId = ref('')
const typeModalOpen = ref(false)
const typeSaving = ref(false)
const typeFormError = ref('')
const dateSources = ref([
  { id: 'fechaNacimiento', label: 'Cumpleaños (fecha de nacimiento)', group: 'Perfil' },
  { id: 'fechaIngreso', label: 'Aniversario (fecha de ingreso)', group: 'Perfil' },
  { id: 'createdAt', label: 'Aniversario de alta en Connectia', group: 'Perfil' },
  { id: 'customDate', label: 'Fecha personalizada del perfil', group: 'Perfil' },
  { id: 'fixed', label: 'Día/mes fijo en la regla', group: 'Calendario' },
  { id: 'daysAfter', label: 'N días después de un evento/fecha', group: 'Evento' },
  { id: 'manual', label: 'Solo manual / API (Ejecutar ahora)', group: 'Evento' },
])
const offsetFields = ref([
  { id: 'fechaIngreso', label: 'Fecha de ingreso' },
  { id: 'fechaNacimiento', label: 'Fecha de nacimiento' },
  { id: 'createdAt', label: 'Alta en Connectia' },
  { id: 'customDate', label: 'Fecha personalizada (key)' },
])
const dateSourceGroups = computed(() => [
  ...new Set(dateSources.value.map((d) => d.group || 'Perfil')),
])
const emptyTypeForm = () => ({
  id: '',
  key: '',
  label: '',
  description: '',
  dateSource: 'fechaNacimiento',
  customDateKey: '',
  offsetDays: 30,
  offsetField: 'fechaIngreso',
  minYears: 0,
  activo: true,
  defaultTitulo: '',
  defaultCuerpo: '',
  imageUrl: '',
  imageUrls: [],
  audioUrl: '',
  mediaKind: 'image',
  mediaPick: 'fixed',
})
const typeForm = reactive(emptyTypeForm())
const typeImageInput = ref(null)
const typeUploading = ref(false)
const typeUploadError = ref('')
const typeDragOver = ref(false)
const eventTypes = ref([
  { id: 'birthday', label: 'Cumpleaños', dateSource: 'fechaNacimiento', minYears: 0 },
  { id: 'hire_anniversary', label: 'Aniversario de ingreso', dateSource: 'fechaIngreso', minYears: 1 },
  { id: 'work_anniversary', label: 'Aniversario laboral', dateSource: 'fechaIngreso', minYears: 1 },
  { id: 'fixed_date', label: 'Fecha fija', dateSource: 'fixed', minYears: 0 },
])
const aiConfigured = ref(false)
const areas = ref([])
const groups = ref([])

const modalOpen = ref(false)
const aiMode = ref(false)
const aiPrompt = ref('')
const aiBusy = ref(false)
const aiNotes = ref('')
const saving = ref(false)
const formError = ref('')
const hoursText = ref('09:00')
const ruleStep = ref('basico')

const mediaKinds = [
  { id: 'image', label: 'Imagen' },
  { id: 'carousel', label: 'Carrusel' },
  { id: 'video', label: 'Video' },
  { id: 'youtube', label: 'YouTube' },
]
const mediaPicks = ref([
  { id: 'fixed', label: 'Imagen fija' },
  { id: 'random', label: 'Al azar del pool' },
  { id: 'profile', label: 'Foto de perfil' },
])
const mediaKind = ref('image')
const uploading = ref(false)
const uploadError = ref('')
const dragOver = ref(false)
const imageInput = ref(null)
const carouselInput = ref(null)
const carouselUrlDraft = ref('')
const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserSearching = ref(false)
const audienceUserCache = ref({})
let audienceUserSearchTimer = null

const selectedAudienceUsers = computed(() =>
  (form.audience.userIds || [])
    .map((id) => audienceUserCache.value[id] || { id, label: id })
    .filter(Boolean),
)

const emptyForm = () => ({
  id: '',
  name: '',
  eventType: 'birthday',
  titulo: '¡Feliz cumpleaños {{nombre}}!',
  cuerpo: 'Hoy celebramos a {{nombre}} {{apellido}}. ¡Felicitaciones!',
  imageUrl: '',
  imageUrls: [],
  audioUrl: '',
  mediaKind: 'image',
  mediaPick: 'fixed',
  hours: ['09:00'],
  daysBefore: 0,
  fixedDay: 1,
  fixedMonth: 1,
  notifyAudience: true,
  activo: true,
  audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
})

const form = reactive(emptyForm())

const showPoolUi = computed(
  () => form.mediaPick !== 'fixed' || mediaKind.value === 'carousel',
)

const selectedType = computed(() => {
  const key = form.eventType
  return (
    eventTypes.value.find((t) => t.id === key || t.key === key) ||
    typeItems.value.find((t) => t.key === key) ||
    null
  )
})

const isFixedDateType = computed(() => selectedType.value?.dateSource === 'fixed')

const eventSource = computed(() => {
  const t = selectedType.value
  if (!t) {
    return { lead: 'Elegí un tipo de celebración.', bullets: [] }
  }
  const src = t.dateSource || 'fechaNacimiento'
  if (src === 'fixed') {
    return {
      lead: `Tipo “${t.label}”: día/mes fijo de la regla (sin homenajeado).`,
      bullets: [
        'Dato: día y mes configurados en la regla.',
        'Una sola publicación para la audiencia.',
      ],
    }
  }
  if (src === 'manual') {
    return {
      lead: `Tipo “${t.label}”: solo se dispara a mano (Ejecutar ahora / API).`,
      bullets: [
        'No usa el scheduler por hora/fecha.',
        'Crea una celebración por cada persona de la audiencia al forzar la corrida.',
      ],
    }
  }
  if (src === 'daysAfter') {
    return {
      lead: `Tipo “${t.label}”: ${t.offsetDays || 0} día(s) después de ${t.offsetField || 'fechaIngreso'}.`,
      bullets: [
        t.offsetField === 'customDate'
          ? `Fecha base: customDates.${t.customDateKey || '…'} del perfil.`
          : `Fecha base del perfil: ${t.offsetField}.`,
        'Sirve para onboarding (día 7/30), fin de prueba, etc.',
        'Solo usuarios con esa fecha cargada.',
      ],
    }
  }
  if (src === 'customDate') {
    return {
      lead: `Tipo “${t.label}”: aniversario de customDates.${t.customDateKey || '…'}.`,
      bullets: [
        'Dato: fecha personalizada en el perfil del usuario.',
        'Compara día/mes cada año (como un cumpleaños).',
        t.minYears ? `Mínimo ${t.minYears} año(s).` : 'Sin mínimo de años.',
      ],
    }
  }
  if (src === 'createdAt') {
    return {
      lead: `Tipo “${t.label}”: aniversario de alta en Connectia.`,
      bullets: ['Dato: createdAt del usuario.', 'Compara día/mes cada año.'],
    }
  }
  if (src === 'fechaIngreso') {
    return {
      lead: `Tipo “${t.label}”: aniversario de fecha de ingreso.`,
      bullets: [
        'Dato: fecha de ingreso del perfil.',
        t.minYears ? `Mínimo ${t.minYears} año(s).` : 'Sin mínimo de años.',
        '{{anios}} = años desde el ingreso.',
      ],
    }
  }
  return {
    lead: `Tipo “${t.label}”: cumpleaños (fecha de nacimiento).`,
    bullets: [
      'Dato: fecha de nacimiento del perfil.',
      'Solo usuarios con esa fecha cargada.',
    ],
  }
})

function showToast(msg) {
  toast.value = msg
  setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 4000)
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function cardCover(r) {
  if (Array.isArray(r?.imageUrls) && r.imageUrls[0]) return r.imageUrls[0]
  return r?.imageUrl || ''
}

function cardMediaKind(r) {
  if (r?.mediaKind) return r.mediaKind
  const urls = Array.isArray(r?.imageUrls) ? r.imageUrls.filter(Boolean) : []
  if (urls.length >= 2) return 'carousel'
  const cover = cardCover(r)
  if (!cover) return ''
  const kind = detectMediaKind(cover)
  return kind === 'embed' ? 'youtube' : kind === 'video' ? 'video' : 'image'
}

function youtubeThumb(url) {
  const id = youtubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
}

function greetingMediaLabel(kind) {
  return (
    {
      image: 'Imagen',
      carousel: 'Carrusel',
      video: 'Video',
      youtube: 'YouTube',
    }[kind] || ''
  )
}

function mediaPickLabel(pick) {
  return (
    {
      fixed: 'Fija',
      random: 'Al azar',
      profile: 'Perfil',
    }[pick] || 'Fija'
  )
}

function setMediaPick(id) {
  form.mediaPick = id
  uploadError.value = ''
  if (id === 'random' || id === 'profile') {
    mediaKind.value = 'carousel'
    form.mediaKind = 'carousel'
    if (form.imageUrl && !form.imageUrls.includes(form.imageUrl)) {
      form.imageUrls = [form.imageUrl, ...form.imageUrls].filter(Boolean)
    }
  } else if (mediaKind.value === 'carousel' && form.imageUrls.length < 2) {
    mediaKind.value = 'image'
    form.mediaKind = 'image'
    if (!form.imageUrl && form.imageUrls[0]) form.imageUrl = form.imageUrls[0]
  }
}

function setMediaKind(id) {
  mediaKind.value = id
  form.mediaKind = id
  form.mediaPick = 'fixed'
  uploadError.value = ''
  if (id === 'carousel') {
    if (form.imageUrl && !form.imageUrls.includes(form.imageUrl)) {
      form.imageUrls = [form.imageUrl, ...form.imageUrls].filter(Boolean)
    }
  } else if (id === 'image') {
    if (!form.imageUrl && form.imageUrls[0]) form.imageUrl = form.imageUrls[0]
    form.imageUrls = []
  } else {
    form.imageUrls = []
    form.audioUrl = ''
  }
}

function clearMedia() {
  form.imageUrl = ''
  form.imageUrls = []
  form.audioUrl = ''
  uploadError.value = ''
}

async function uploadFiles(fileList) {
  const files = [...(fileList || [])].filter(Boolean)
  if (!files.length) return []
  uploading.value = true
  uploadError.value = ''
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    const { data } = await api.post('/admin/posts/upload', fd)
    return Array.isArray(data?.urls) ? data.urls : data?.url ? [data.url] : []
  } catch (e) {
    uploadError.value = e.response?.data?.error || 'No se pudo subir'
    return []
  } finally {
    uploading.value = false
    dragOver.value = false
  }
}

async function onImageFile(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  const urls = await uploadFiles([file])
  if (urls[0]) {
    form.imageUrl = urls[0]
    form.imageUrls = []
  }
}

async function onCarouselFiles(ev) {
  const files = ev.target?.files
  ev.target.value = ''
  if (!files?.length) return
  const urls = await uploadFiles(files)
  form.imageUrls = [...form.imageUrls, ...urls].slice(0, 12)
  if (form.imageUrls[0]) form.imageUrl = form.imageUrls[0]
}

async function onDropFiles(ev, multi) {
  dragOver.value = false
  const files = [...(ev.dataTransfer?.files || [])]
  if (!files.length) return
  const urls = await uploadFiles(multi ? files : files.slice(0, 1))
  if (!urls.length) return
  if (multi) {
    form.imageUrls = [...form.imageUrls, ...urls].slice(0, 12)
    if (form.imageUrls[0]) form.imageUrl = form.imageUrls[0]
  } else {
    form.imageUrl = urls[0]
    form.imageUrls = []
  }
}

function addCarouselUrl() {
  const u = carouselUrlDraft.value.trim()
  if (!u) return
  if (!form.imageUrls.includes(u)) form.imageUrls = [...form.imageUrls, u].slice(0, 12)
  form.imageUrl = form.imageUrls[0] || ''
  carouselUrlDraft.value = ''
}

function removeSlide(i) {
  form.imageUrls = form.imageUrls.filter((_, idx) => idx !== i)
  form.imageUrl = form.imageUrls[0] || ''
}

function moveSlide(i, dir) {
  const j = i + dir
  if (j < 0 || j >= form.imageUrls.length) return
  const next = [...form.imageUrls]
  ;[next[i], next[j]] = [next[j], next[i]]
  form.imageUrls = next
  form.imageUrl = form.imageUrls[0] || ''
}

function setAudienceMode(mode) {
  const prev = form.audience || emptyForm().audience
  const nextMode = ['restricted', 'users'].includes(mode) ? mode : 'all'
  form.audience = {
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
    const { data } = await api.get('/admin/greetings/audience-candidates', { params: { q: query } })
    const list = data.items || []
    list.forEach(cacheAudienceUser)
    audienceUserResults.value = list.filter((u) => !(form.audience.userIds || []).includes(u.id))
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
  if (!(form.audience.userIds || []).includes(u.id)) {
    form.audience.userIds = [...(form.audience.userIds || []), u.id]
  }
  audienceUserResults.value = audienceUserResults.value.filter((x) => x.id !== u.id)
}

function removeAudienceUser(id) {
  form.audience.userIds = (form.audience.userIds || []).filter((x) => x !== id)
}

async function ensureAudienceUsersHydrated() {
  const ids = (form.audience.userIds || []).filter((id) => !audienceUserCache.value[id])
  if (!ids.length) return
  try {
    const { data } = await api.get('/admin/greetings/audience-candidates', {
      params: { ids: ids.join(',') },
    })
    ;(data.items || []).forEach(cacheAudienceUser)
  } catch {
    /* ignore */
  }
}

async function loadMeta() {
  try {
    const { data } = await api.get('/admin/greetings/meta')
    if (Array.isArray(data?.eventTypes) && data.eventTypes.length) {
      eventTypes.value = data.eventTypes.map((t) => ({
        id: t.id || t.key,
        key: t.key || t.id,
        label: t.label,
        dateSource: t.dateSource || 'fechaNacimiento',
        dateSourceLabel: t.dateSourceLabel || '',
        minYears: t.minYears || 0,
        description: t.description || '',
        defaultTitulo: t.defaultTitulo || '',
        defaultCuerpo: t.defaultCuerpo || '',
        imageUrl: t.imageUrl || '',
        imageUrls: t.imageUrls || [],
        audioUrl: t.audioUrl || '',
        mediaKind: t.mediaKind || '',
        mediaPick: t.mediaPick || 'fixed',
      }))
    }
    if (Array.isArray(data?.dateSources) && data.dateSources.length) dateSources.value = data.dateSources
    if (Array.isArray(data?.offsetFields) && data.offsetFields.length) offsetFields.value = data.offsetFields
    if (Array.isArray(data?.mediaPicks) && data.mediaPicks.length) mediaPicks.value = data.mediaPicks
    aiConfigured.value = Boolean(data?.aiConfigured)
  } catch {
    const { data } = await api.get('/admin/greetings/ai-status').catch(() => ({ data: {} }))
    aiConfigured.value = Boolean(data?.configured)
  }
}

async function loadTypes() {
  typesLoading.value = true
  try {
    const { data } = await api.get('/admin/greetings/event-types')
    typeItems.value = Array.isArray(data?.items) ? data.items : []
    if (Array.isArray(data?.dateSources) && data.dateSources.length) dateSources.value = data.dateSources
    if (Array.isArray(data?.offsetFields) && data.offsetFields.length) offsetFields.value = data.offsetFields
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar los tipos'
  } finally {
    typesLoading.value = false
  }
}

async function refreshAll() {
  await loadMeta()
  if (mainTab.value === 'types') await loadTypes()
  else await load()
}

function switchToTypes() {
  mainTab.value = 'types'
  loadTypes()
}

function openTypeCreate() {
  Object.assign(typeForm, emptyTypeForm())
  typeFormError.value = ''
  typeUploadError.value = ''
  typeModalOpen.value = true
}

function editType(t) {
  const urls = Array.isArray(t.imageUrls) ? [...t.imageUrls] : []
  Object.assign(typeForm, emptyTypeForm(), {
    id: t.id,
    key: t.key,
    label: t.label,
    description: t.description || '',
    dateSource: t.dateSource || 'fechaNacimiento',
    customDateKey: t.customDateKey || '',
    offsetDays: t.offsetDays || 0,
    offsetField: t.offsetField || 'fechaIngreso',
    minYears: t.minYears || 0,
    activo: t.activo !== false,
    defaultTitulo: t.defaultTitulo || '',
    defaultCuerpo: t.defaultCuerpo || '',
    imageUrl: t.imageUrl || '',
    imageUrls: urls.length ? urls : t.imageUrl ? [t.imageUrl] : [],
    audioUrl: t.audioUrl || '',
    mediaKind: t.mediaKind || 'image',
    mediaPick: t.mediaPick || 'fixed',
  })
  typeFormError.value = ''
  typeUploadError.value = ''
  typeModalOpen.value = true
}

function closeTypeModal() {
  typeModalOpen.value = false
}

function setTypeMediaPick(id) {
  typeForm.mediaPick = id
  typeUploadError.value = ''
  if (id === 'random' || id === 'profile') {
    typeForm.mediaKind = 'carousel'
    if (typeForm.imageUrl && !typeForm.imageUrls.includes(typeForm.imageUrl)) {
      typeForm.imageUrls = [typeForm.imageUrl, ...typeForm.imageUrls].filter(Boolean)
    }
  }
}

async function uploadTypeFiles(fileList) {
  const files = [...(fileList || [])].filter(Boolean).slice(0, 12)
  if (!files.length) return []
  typeUploading.value = true
  typeUploadError.value = ''
  const urls = []
  try {
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/admin/posts/upload', fd)
      if (data?.url) urls.push(data.url)
    }
  } catch (e) {
    typeUploadError.value = e.response?.data?.error || 'No se pudo subir'
  } finally {
    typeUploading.value = false
  }
  return urls
}

async function onTypeImageFiles(ev) {
  const files = ev.target?.files
  const urls = await uploadTypeFiles(files)
  ev.target.value = ''
  if (!urls.length) return
  if (typeForm.mediaPick === 'fixed') {
    typeForm.imageUrl = urls[0]
    typeForm.imageUrls = []
    typeForm.mediaKind = 'image'
  } else {
    typeForm.imageUrls = [...typeForm.imageUrls, ...urls].slice(0, 12)
    typeForm.imageUrl = typeForm.imageUrls[0] || ''
  }
}

async function onTypeDropFiles(ev) {
  typeDragOver.value = false
  const urls = await uploadTypeFiles(ev.dataTransfer?.files)
  if (!urls.length) return
  if (typeForm.mediaPick === 'fixed') {
    typeForm.imageUrl = urls[0]
    typeForm.imageUrls = []
  } else {
    typeForm.imageUrls = [...typeForm.imageUrls, ...urls].slice(0, 12)
    typeForm.imageUrl = typeForm.imageUrls[0] || ''
  }
}

function removeTypeSlide(i) {
  typeForm.imageUrls = typeForm.imageUrls.filter((_, idx) => idx !== i)
  typeForm.imageUrl = typeForm.imageUrls[0] || typeForm.imageUrl || ''
}

function onRuleEventTypeChange() {
  if (form.id) return
  const t = selectedType.value
  if (!t) return
  if (t.defaultTitulo) form.titulo = t.defaultTitulo
  if (t.defaultCuerpo) form.cuerpo = t.defaultCuerpo
  const hasRuleMedia = Boolean(form.imageUrl) || (form.imageUrls && form.imageUrls.length)
  if (!hasRuleMedia && (t.imageUrl || (t.imageUrls && t.imageUrls.length))) {
    form.imageUrl = t.imageUrl || t.imageUrls[0] || ''
    form.imageUrls = Array.isArray(t.imageUrls) ? [...t.imageUrls] : []
    form.audioUrl = t.audioUrl || ''
    form.mediaPick = t.mediaPick || 'fixed'
    form.mediaKind = t.mediaKind || 'image'
    mediaKind.value = form.mediaPick === 'random' || form.mediaPick === 'profile' ? 'carousel' : form.mediaKind || 'image'
  }
}

async function saveType() {
  typeSaving.value = true
  typeFormError.value = ''
  try {
    const payload = {
      label: typeForm.label,
      key: typeForm.key || undefined,
      description: typeForm.description,
      dateSource: typeForm.dateSource,
      customDateKey: typeForm.customDateKey,
      offsetDays: typeForm.offsetDays,
      offsetField: typeForm.offsetField,
      minYears: typeForm.minYears,
      activo: typeForm.activo,
      defaultTitulo: typeForm.defaultTitulo,
      defaultCuerpo: typeForm.defaultCuerpo,
      imageUrl: typeForm.imageUrl,
      imageUrls:
        typeForm.mediaPick !== 'fixed' || typeForm.mediaKind === 'carousel'
          ? typeForm.imageUrls
          : typeForm.imageUrl
            ? []
            : [],
      audioUrl: typeForm.audioUrl,
      mediaKind: typeForm.mediaKind,
      mediaPick: typeForm.mediaPick,
    }
    if (typeForm.id) {
      await api.patch(`/admin/greetings/event-types/${typeForm.id}`, payload)
    } else {
      await api.post('/admin/greetings/event-types', payload)
    }
    typeModalOpen.value = false
    showToast('Tipo guardado')
    await Promise.all([loadTypes(), loadMeta()])
  } catch (e) {
    typeFormError.value = e.response?.data?.error || 'No se pudo guardar el tipo'
  } finally {
    typeSaving.value = false
  }
}

async function toggleType(t) {
  typeBusyId.value = t.id
  try {
    await api.patch(`/admin/greetings/event-types/${t.id}`, { activo: !t.activo })
    await Promise.all([loadTypes(), loadMeta()])
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo actualizar el tipo'
  } finally {
    typeBusyId.value = ''
  }
}

async function removeType(t) {
  if (!confirm(`¿Borrar el tipo “${t.label}”?`)) return
  typeBusyId.value = t.id
  try {
    await api.delete(`/admin/greetings/event-types/${t.id}`)
    showToast('Tipo borrado')
    await Promise.all([loadTypes(), loadMeta()])
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo borrar el tipo'
  } finally {
    typeBusyId.value = ''
  }
}

async function loadOrg() {
  try {
    const { data } = await api.get('/admin/org/options')
    areas.value = (data?.areas || []).map((a) => ({ id: String(a.id || a._id), nombre: a.nombre }))
    groups.value = (data?.groups || []).map((g) => ({ id: String(g.id || g._id), nombre: g.nombre }))
  } catch {
    areas.value = []
    groups.value = []
  }
}

async function load({ append = false } = {}) {
  if (!append) {
    page.value = 1
    items.value = []
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/greetings', {
      params: {
        page: page.value,
        limit: 30,
        q: q.value || undefined,
        eventType: eventFilter.value || undefined,
        activo: activoFilter.value || undefined,
      },
    })
    const batch = Array.isArray(data?.items) ? data.items : []
    items.value = append ? [...items.value, ...batch] : batch
    hasMore.value = Boolean(data?.hasMore)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las reglas'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  load({ append: true })
}

function openManual() {
  Object.assign(form, emptyForm())
  hoursText.value = '09:00'
  mediaKind.value = 'image'
  carouselUrlDraft.value = ''
  uploadError.value = ''
  audienceUserQuery.value = ''
  audienceUserResults.value = []
  aiMode.value = false
  aiPrompt.value = ''
  aiNotes.value = ''
  formError.value = ''
  ruleStep.value = 'basico'
  modalOpen.value = true
}

function openAi() {
  openManual()
  aiMode.value = true
  ruleStep.value = 'ia'
}

function editOne(r) {
  const urls = Array.isArray(r.imageUrls) ? [...r.imageUrls] : []
  const pick = r.mediaPick || 'fixed'
  const kind =
    pick === 'random' || pick === 'profile'
      ? 'carousel'
      : r.mediaKind || (urls.length >= 2 ? 'carousel' : r.imageUrl ? 'image' : 'image')
  Object.assign(form, emptyForm(), {
    id: r.id,
    name: r.name,
    eventType: r.eventType,
    titulo: r.titulo,
    cuerpo: r.cuerpo,
    imageUrl: r.imageUrl || '',
    imageUrls: urls.length ? urls : r.imageUrl ? [r.imageUrl] : [],
    audioUrl: r.audioUrl || '',
    mediaKind: kind,
    mediaPick: pick,
    hours: r.hours || ['09:00'],
    daysBefore: r.daysBefore || 0,
    fixedDay: r.fixedDay || 1,
    fixedMonth: r.fixedMonth || 1,
    notifyAudience: r.notifyAudience !== false,
    activo: r.activo !== false,
    audience: {
      mode: r.audience?.mode || 'all',
      areaIds: [...(r.audience?.areaIds || [])],
      groupIds: [...(r.audience?.groupIds || [])],
      userIds: [...(r.audience?.userIds || [])],
    },
  })
  mediaKind.value = kind
  hoursText.value = (r.hours || ['09:00']).join(', ')
  aiMode.value = false
  formError.value = ''
  uploadError.value = ''
  ruleStep.value = 'basico'
  modalOpen.value = true
  if (form.audience.mode === 'restricted' || form.audience.mode === 'users') {
    ensureAudienceUsersHydrated()
  }
}

function closeModal() {
  modalOpen.value = false
}

async function runAi() {
  aiBusy.value = true
  formError.value = ''
  aiNotes.value = ''
  try {
    const { data } = await api.post('/admin/greetings/ai-draft', { prompt: aiPrompt.value })
    const d = data?.draft || {}
    form.name = d.name || form.name
    form.eventType = d.eventType || form.eventType
    form.titulo = d.titulo || form.titulo
    form.cuerpo = d.cuerpo || form.cuerpo
    form.hours = d.hours || form.hours
    form.daysBefore = d.daysBefore ?? form.daysBefore
    form.fixedDay = d.fixedDay || form.fixedDay
    form.fixedMonth = d.fixedMonth || form.fixedMonth
    form.notifyAudience = d.notifyAudience !== false
    hoursText.value = (form.hours || ['09:00']).join(', ')
    aiNotes.value = d.notes || 'Borrador listo — elegí plantilla de media (fija / al azar / foto de perfil) y guardá.'
    ruleStep.value = 'basico'
  } catch (e) {
    formError.value = e.response?.data?.error || e.message || 'No se pudo generar'
  } finally {
    aiBusy.value = false
  }
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.name,
      eventType: form.eventType,
      titulo: form.titulo,
      cuerpo: form.cuerpo,
      imageUrl: form.imageUrl,
      imageUrls:
        form.mediaPick !== 'fixed' || mediaKind.value === 'carousel' ? form.imageUrls : [],
      audioUrl: form.audioUrl,
      mediaKind: mediaKind.value,
      mediaPick: form.mediaPick,
      hours: hoursText.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      daysBefore: form.daysBefore,
      fixedDay: form.fixedDay,
      fixedMonth: form.fixedMonth,
      notifyAudience: form.notifyAudience,
      activo: form.activo,
      audience: form.audience,
    }
    if (form.id) {
      await api.patch(`/admin/greetings/${form.id}`, payload)
      showToast('Regla actualizada')
    } else {
      await api.post('/admin/greetings', payload)
      showToast('Regla creada · publicará tipo celebración')
    }
    closeModal()
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(r) {
  busyId.value = r.id
  try {
    await api.patch(`/admin/greetings/${r.id}`, { activo: !r.activo })
    showToast(r.activo ? 'Regla pausada' : 'Regla activada')
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo actualizar'
  } finally {
    busyId.value = ''
  }
}

async function runNow(r) {
  if (!confirm(`¿Ejecutar ahora «${r.name || r.titulo}»?\nCreará publicaciones celebración si hay coincidencias hoy (idempotente).`)) {
    return
  }
  busyId.value = r.id
  try {
    const { data } = await api.post(`/admin/greetings/${r.id}/run`)
    const n = data?.result?.created || 0
    showToast(n ? `Se crearon ${n} celebración(es) en el muro` : 'Sin coincidencias hoy (o ya publicadas)')
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ejecutar'
  } finally {
    busyId.value = ''
  }
}

async function removeOne(r) {
  if (!confirm(`¿Borrar la regla «${r.name || r.titulo}»?`)) return
  busyId.value = r.id
  try {
    await api.delete(`/admin/greetings/${r.id}`)
    showToast('Regla eliminada')
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo borrar'
  } finally {
    busyId.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadMeta(), loadOrg(), load()])
})
</script>

<style scoped>
.page {
  padding: 20px 22px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
.tabs {
  display: flex;
  gap: 6px;
  margin: 0 0 14px;
}
.tab {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-soft);
  cursor: pointer;
}
.tab.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.key-pill {
  font-size: 0.7rem;
  background: var(--panel-2);
  padding: 2px 6px;
  border-radius: 6px;
}
.modal-sm {
  max-width: 520px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  align-items: stretch;
}
.card-media {
  position: relative;
  width: 120px;
  min-width: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ink);
  flex-shrink: 0;
  aspect-ratio: 4 / 3;
}
.card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--line);
  font-size: 0.8rem;
  font-weight: 800;
  background: linear-gradient(145deg, var(--brand-primary), var(--brand-secondary));
}
.media-fallback.muted-fallback {
  background: var(--panel-2);
  color: var(--ink-faint);
}
.media-pill {
  position: absolute;
  left: 6px;
  bottom: 6px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 999px;
}
.card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.title {
  margin: 6px 0 0;
  font-weight: 600;
}
.body {
  margin: 4px 0 0;
  color: var(--ink-soft);
  white-space: pre-wrap;
  font-size: 0.9rem;
}
.meta {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--ink-faint);
}
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
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
  background: var(--warn-bg);
  color: #c2410c;
}
.badge.tipo {
  background: #fdf4ff;
  color: #a21caf;
}
.btn-primary,
.btn-ghost {
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
}
.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost {
  background: var(--panel-2);
  color: var(--ink);
}
.btn-ghost.danger {
  color: var(--bad);
}
.btn-primary.sm,
.btn-ghost.sm {
  padding: 6px 10px;
  font-size: 0.78rem;
}
.input {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  background: var(--panel);
}
.hint,
.muted {
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.err {
  color: var(--bad);
  margin: 0;
}
.err.small {
  font-size: 0.82rem;
}
.toast {
  margin: 0;
  color: var(--ok);
  font-weight: 600;
}
.more {
  align-self: center;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 50;
}
.modal {
  width: min(720px, 100%);
  max-height: min(90dvh, 900px);
  overflow: auto;
  background: var(--panel);
  border-radius: 16px;
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-wide {
  width: min(1280px, 98vw);
  max-height: min(94vh, 920px);
  padding: 0;
  gap: 0;
  overflow: hidden;
}
.modal-wide .modal-head {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 0;
  align-items: flex-start;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-head h2 {
  margin: 0;
  font-size: 1.15rem;
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
.form-detail {
  padding: 16px 20px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.editor-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.editor-section-title {
  margin: 0;
  font-size: 1rem;
}
.ai-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.lbl.full,
.full {
  grid-column: 1 / -1;
}
.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--ink);
}
.modal-wide > .err {
  margin: 0;
  padding: 0 20px;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.modal-wide .modal-foot {
  margin: 0;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--line);
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
  .form-grid {
    grid-template-columns: 1fr;
  }
}
.media-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.source-box {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #bae6fd;
  background: var(--panel-2);
  color: #0c4a6e;
}
.source-title {
  margin: 0 0 4px;
  font-size: 0.85rem;
  font-weight: 800;
}
.source-lead {
  margin: 0 0 8px;
  font-size: 0.82rem;
  line-height: 1.4;
}
.source-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.8rem;
  line-height: 1.45;
}
.source-list li + li {
  margin-top: 4px;
}
.source-foot {
  margin: 8px 0 0;
  font-size: 0.75rem;
  opacity: 0.85;
}
.media-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--ink);
}
.media-title.sub {
  margin-top: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.media-kinds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--line);
  color: var(--ink-soft);
  cursor: pointer;
}
.chip.on {
  background: var(--brand-primary);
  color: #fff;
}
.media-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dropzone {
  border: 1.5px dashed var(--ink-faint);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dropzone.over {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.dropzone.busy {
  opacity: 0.7;
  pointer-events: none;
}
.dropzone strong {
  font-size: 0.9rem;
}
.dropzone small {
  color: var(--ink-soft);
  font-size: 0.75rem;
}
.carousel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.carousel-item {
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px;
}
.carousel-item img {
  width: 72px;
  height: 54px;
  object-fit: cover;
  border-radius: 8px;
}
.carousel-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.url-row {
  display: flex;
  gap: 8px;
}
.url-row .input {
  flex: 1;
}
.preview {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--ink);
}
.audience-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.audience-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.type-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  background: var(--panel);
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.type-card strong {
  font-size: 0.82rem;
}
.type-card small {
  color: var(--ink-soft);
  font-size: 0.72rem;
  line-height: 1.3;
}
.type-card.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.audience-picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.audience-users h4 {
  margin: 0;
  font-size: 0.85rem;
}
.audience-user-results {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  max-height: 160px;
  overflow: auto;
}
.audience-user-results li {
  border-bottom: 1px solid var(--panel-2);
}
.audience-user-results li:last-child {
  border-bottom: 0;
}
.audience-user-add {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.audience-user-add:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
}
.audience-user-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.audience-user-add strong {
  font-size: 0.85rem;
}
.audience-user-add span {
  font-size: 0.72rem;
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
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
}
.audience-chip-x {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--ok);
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
}
@media (max-width: 720px) {
  .page-head,
  .card {
    flex-direction: column;
  }
  .card-media {
    width: 100%;
    min-width: 0;
    aspect-ratio: 16 / 9;
  }
  .form-grid,
  .audience-modes,
  .audience-picks {
    grid-template-columns: 1fr;
  }
}
</style>
