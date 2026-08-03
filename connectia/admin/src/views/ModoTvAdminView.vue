<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Modo TV</h1>
        <p class="page-sub">Configurá el contenido y las pantallas TV de la empresa.</p>
      </div>
    </header>

    <nav class="tabs" aria-label="Secciones Modo TV">
      <button type="button" class="tab" :class="{ on: tab === 'estado' }" @click="tab = 'estado'">
        Estado
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'pantalla' }" @click="tab = 'pantalla'">
        Cómo usarlo
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'canales' }" @click="tab = 'canales'">
        Canales disponibles
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'config' }" @click="tab = 'config'">
        Configuración
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'devices' }" @click="tab = 'devices'">
        Dispositivos conectados
      </button>
    </nav>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <!-- ESTADO -->
    <section v-if="tab === 'estado'" class="estado">
      <header class="tab-intro">
        <p>
          Encendé o apagá el módulo Modo TV para toda la comunidad. Activar habilita Emparejar TV y el feed;
          desactivar desvincula todas las pantallas.
        </p>
      </header>

      <article class="card status-card">
        <div class="status-row">
          <div>
            <p class="status-label">Estado del módulo</p>
            <p class="status-value" :class="tvMode ? 'is-on' : 'is-off'">
              {{ tvMode ? 'Activo' : 'Inactivo' }}
            </p>
            <p class="hint">
              {{
                tvMode
                  ? 'Las pantallas emparejadas muestran el canal y Emparejar TV aparece en la app.'
                  : 'Apagado: se desvinculan todas las TVs, dejan de mostrar contenido y no se pueden emparejar nuevas hasta reactivar.'
              }}
            </p>
          </div>
          <div class="status-actions">
            <button
              v-if="!tvMode"
              type="button"
              class="btn-primary"
              :disabled="toggling"
              @click="activate"
            >
              {{ toggling ? 'Activando…' : 'Activar módulo' }}
            </button>
            <button
              v-else
              type="button"
              class="btn-ghost danger"
              :disabled="toggling"
              @click="deactivate"
            >
              {{ toggling ? 'Desactivando…' : 'Desactivar módulo' }}
            </button>
          </div>
        </div>
      </article>

      <div class="stats">
        <article class="stat">
          <strong>{{ statusInfo?.devicesActive ?? '—' }}</strong>
          <span>TVs activas</span>
        </article>
        <article class="stat">
          <strong>{{ statusInfo?.devicesTotal ?? '—' }}</strong>
          <span>TVs totales</span>
        </article>
        <article class="stat">
          <strong>{{ statusInfo?.playlists ?? '—' }}</strong>
          <span>Canales</span>
        </article>
      </div>
    </section>

    <!-- CÓMO USARLO -->
    <section v-else-if="tab === 'pantalla'" class="howto" aria-label="Cómo usarlo">
      <header class="howto__hero">
        <p>
          En tres pasos vinculás un monitor o Smart TV a la comunidad. Esta pantalla de admin
          (<code>{{ adminPath }}</code>) sirve para configurar; el contenido se ve en la
          <strong>app miembro</strong>.
        </p>
      </header>

      <p v-if="!tvMode" class="howto__alert" role="status">
        El módulo está inactivo. Activalo en la pestaña <strong>Estado</strong> antes de emparejar.
      </p>

      <article class="howto__link">
        <div class="howto__link-head">
          <h3>Enlace para la TV</h3>
          <p>Abrilo en el navegador del monitor o PC que hará de pantalla.</p>
        </div>
        <div class="howto__link-row">
          <input
            id="tv-open-url"
            class="howto__input"
            type="text"
            readonly
            :value="tvOpenUrl"
            aria-label="Enlace para la TV"
            @focus="$event.target.select()"
          />
          <button type="button" class="btn-primary" @click="copyTvUrl">
            {{ copiedUrl ? 'Copiado' : 'Copiar' }}
          </button>
          <a class="btn-ghost" :href="tvOpenUrl" target="_blank" rel="noopener noreferrer">Abrir acá</a>
        </div>
      </article>

      <ol class="howto__steps">
        <li class="howto__step">
          <span class="howto__num" aria-hidden="true">1</span>
          <div>
            <h3>Abrí el enlace en la TV</h3>
            <p>
              Copiá el enlace de arriba y abrilo en el navegador de la pantalla (PC, stick o Smart TV).
              Pantalla completa ayuda a que se vea mejor.
            </p>
          </div>
        </li>
        <li class="howto__step">
          <span class="howto__num" aria-hidden="true">2</span>
          <div>
            <h3>Anotá el código</h3>
            <p>
              La TV muestra un <strong>código de 6 dígitos</strong> y un QR. Ese código sirve para
              vincularla a la comunidad.
            </p>
          </div>
        </li>
        <li class="howto__step">
          <span class="howto__num" aria-hidden="true">3</span>
          <div>
            <h3>Emparejá desde la app</h3>
            <p>
              En la app miembro andá a <strong>Emparejar TV</strong>
              <template v-if="tvPairPath">
                <code class="howto__path">{{ tvPairPath }}</code>
              </template>
              e ingresá el código (o escaneá el QR). Completá nombre y ubicación de la pantalla.
            </p>
          </div>
        </li>
      </ol>

      <aside class="howto__note">
        <strong class="howto__note-title">Después de emparejar</strong>
        <p class="howto__note-line">
          La TV empieza a mostrar el canal. Revisá los canales en <strong>Canales disponibles</strong>, gestioná pantallas en <strong>Dispositivos</strong> y el detalle en <strong>Configuración</strong>.
        </p>
      </aside>
    </section>

    <!-- CANALES DISPONIBLES -->
    <section v-else-if="tab === 'canales'" class="canales">
      <header class="tab-intro tab-intro--row">
        <p>
          Acá se crean y listan los canales. Previsualizá cada uno, abrí su configuración o sus
          diapositivas extras, y revisá sus datos.
        </p>
        <div class="canales-toolbar">
          <div class="seg" role="group" aria-label="Formato de vista">
            <button
              type="button"
              class="seg__btn"
              :class="{ on: canalesView === 'cards' }"
              @click="canalesView = 'cards'"
            >
              Cards
            </button>
            <button
              type="button"
              class="seg__btn"
              :class="{ on: canalesView === 'grid' }"
              @click="canalesView = 'grid'"
            >
              Grilla
            </button>
          </div>
          <button type="button" class="btn-primary" @click="openNewPlaylist">Nuevo canal</button>
        </div>
      </header>

      <template v-if="playlists.length">
        <div v-show="canalesView === 'cards'" class="canal-grid">
          <article
            v-for="p in playlists"
            :key="p.id"
            class="canal-card"
            :class="{ on: p.id === activePlaylistId }"
          >
            <div class="canal-card__head">
              <div>
                <h2>{{ p.name }}</h2>
                <p class="canal-card__meta">
                  <span class="pill" :class="p.activo === false ? 'off' : 'on'">
                    {{ p.activo === false ? 'Inactivo' : 'Activo' }}
                  </span>
                </p>
              </div>
              <button
                type="button"
                class="btn-ghost btn-compact"
                :disabled="previewLoading"
                @click="openPreviewForPlaylist(p)"
              >
                Ver ahora
              </button>
            </div>

            <dl class="canal-card__facts">
              <div>
                <dt>Diapos</dt>
                <dd>{{ channelContentModeLabel(p) }}</dd>
              </div>
              <div>
                <dt>Publicaciones</dt>
                <dd>{{ channelPubsCount(p) }}</dd>
              </div>
              <div>
                <dt>Bienvenida</dt>
                <dd>{{ channelWelcomeLabel(p) }}</dd>
              </div>
              <div>
                <dt>Diapositivas extras</dt>
                <dd>
                  <button type="button" class="linkish" @click="goToSlotsChannel(p)">
                    {{ p.items?.length || 0 }} · abrir
                  </button>
                </dd>
              </div>
              <div>
                <dt>TVs usando este canal</dt>
                <dd>{{ devicesForChannel(p.id).length }}</dd>
              </div>
              <div class="span-2">
                <dt>Texto de respaldo</dt>
                <dd>{{ p.fallbackText || '—' }}</dd>
              </div>
              <div class="span-2" v-if="p.channel?.welcomeText">
                <dt>Texto de bienvenida</dt>
                <dd>{{ p.channel.welcomeText }}</dd>
              </div>
              <div>
                <dt>Slide por defecto</dt>
                <dd>{{ p.channel?.defaultSlideDurationSec || 12 }}s</dd>
              </div>
              <div>
                <dt>Audiencia</dt>
                <dd>{{ audienceLabel(p.audience) }}</dd>
              </div>
            </dl>

            <ul v-if="devicesForChannel(p.id).length" class="canal-card__devices">
              <li v-for="d in devicesForChannel(p.id)" :key="d.id">
                {{ d.name }}<template v-if="d.locationLabel"> · {{ d.locationLabel }}</template>
              </li>
            </ul>

            <div class="canal-card__actions">
              <button
                type="button"
                class="ico-btn"
                title="Editar canal"
                aria-label="Editar canal"
                @click="editCanalMeta(p)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18-11.5a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75L21 5.75z"/>
                </svg>
              </button>
              <button type="button" class="btn-primary btn-compact" @click="goToConfigChannel(p)">
                Ir a configuración
              </button>
              <button type="button" class="btn-ghost btn-compact" @click="goToSlotsChannel(p)">
                Diapositivas extras
              </button>
              <button
                type="button"
                class="ico-btn"
                :class="{ danger: p.activo !== false }"
                :disabled="togglingCanalId === p.id"
                :title="p.activo === false ? 'Activar canal' : 'Desactivar canal'"
                :aria-label="p.activo === false ? 'Activar canal' : 'Desactivar canal'"
                @click="askToggleCanal(p)"
              >
                <svg v-if="p.activo === false" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2L6.8 12l1.4-1.4 2.8 2.8 5.8-5.8L18.2 9l-7.2 7.2z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm4.95 3.05a1 1 0 0 1 1.41 0 9 9 0 1 1-12.72 0 1 1 0 1 1 1.41 1.41 7 7 0 1 0 9.9 0 1 1 0 0 1 0-1.41z"/>
                </svg>
              </button>
            </div>
          </article>
        </div>

        <div v-show="canalesView === 'grid'" class="canal-table-wrap">
          <table class="table canal-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th>Estado</th>
                <th>Diapos</th>
                <th>Publicaciones</th>
                <th>Bienvenida</th>
                <th>Diapositivas extras</th>
                <th>TVs</th>
                <th>Slide</th>
                <th>Audiencia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in playlists"
                :key="p.id"
                :class="{ on: p.id === activePlaylistId }"
              >
                <td>
                  <strong>{{ p.name }}</strong>
                </td>
                <td>
                  <span class="pill" :class="p.activo === false ? 'off' : 'on'">
                    {{ p.activo === false ? 'Inactivo' : 'Activo' }}
                  </span>
                </td>
                <td>{{ channelContentModeLabel(p) }}</td>
                <td>{{ channelPubsCount(p) }}</td>
                <td>{{ channelWelcomeLabel(p) }}</td>
                <td>
                  <button type="button" class="linkish" @click="goToSlotsChannel(p)">
                    {{ p.items?.length || 0 }}
                  </button>
                </td>
                <td>{{ devicesForChannel(p.id).length }}</td>
                <td>{{ p.channel?.defaultSlideDurationSec || 12 }}s</td>
                <td>{{ audienceLabel(p.audience) }}</td>
                <td>
                  <div class="actions">
                    <button
                      type="button"
                      class="btn-ghost btn-compact"
                      :disabled="previewLoading"
                      @click="openPreviewForPlaylist(p)"
                    >
                      Ver ahora
                    </button>
                    <button
                      type="button"
                      class="ico-btn"
                      title="Editar canal"
                      aria-label="Editar canal"
                      @click="editCanalMeta(p)"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18-11.5a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75L21 5.75z"/>
                      </svg>
                    </button>
                    <button type="button" class="btn-primary btn-compact" @click="goToConfigChannel(p)">
                      Configuración
                    </button>
                    <button type="button" class="btn-ghost btn-compact" @click="goToSlotsChannel(p)">
                      Diapositivas extras
                    </button>
                    <button
                      type="button"
                      class="ico-btn"
                      :class="{ danger: p.activo !== false }"
                      :disabled="togglingCanalId === p.id"
                      :title="p.activo === false ? 'Activar canal' : 'Desactivar canal'"
                      :aria-label="p.activo === false ? 'Activar canal' : 'Desactivar canal'"
                      @click="askToggleCanal(p)"
                    >
                      <svg v-if="p.activo === false" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2L6.8 12l1.4-1.4 2.8 2.8 5.8-5.8L18.2 9l-7.2 7.2z"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm4.95 3.05a1 1 0 0 1 1.41 0 9 9 0 1 1-12.72 0 1 1 0 1 1 1.41 1.41 7 7 0 1 0 9.9 0 1 1 0 0 1 0-1.41z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p v-else class="empty">
        Todavía no hay canales. Tocá <strong>Nuevo canal</strong> para crear el primero.
      </p>
    </section>

    <!-- CONFIGURACIÓN (pubs + presentación) -->
    <section v-else-if="tab === 'config'" class="config">
      <header class="tab-intro">
        <p>
          Qué se muestra en la TV y cómo se ve: bienvenida, logo, diapositivas, fotos, videos, publicaciones y diapositivas extras.
        </p>
      </header>

      <div class="canal-bar">
        <label class="canal-bar__select">
          Canal a editar
          <select v-model="activePlaylistId" @change="loadCanalForm">
            <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <p v-if="activeCanalName" class="canal-bar__current" aria-live="polite">
          <span class="canal-bar__current-name">{{ activeCanalName }}</span>
        </p>
        <button type="button" class="btn-ghost" @click="tab = 'canales'">Ver canales</button>
        <button
          type="button"
          class="btn-ghost"
          :disabled="!activePlaylistId || previewLoading"
          @click="openPreview"
        >
          {{ previewLoading ? 'Generando…' : 'Preview de este canal' }}
        </button>
        <div class="canal-bar__actions">
          <button type="button" class="btn-primary" :disabled="!activePlaylistId || savingCanal" @click="saveCanal">
            {{ savingCanal ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>

      <p v-if="!playlists.length" class="empty">
        Todavía no hay canales. Creá el primero en
        <button type="button" class="linkish" @click="tab = 'canales'">Canales disponibles</button>.
      </p>

      <div
        v-else-if="canalForm"
        class="config-layout"
        :class="{ 'config-layout--nav-collapsed': !configNavOpen }"
      >
        <aside class="config-nav-wrap">
          <button
            type="button"
            class="config-nav__toggle"
            :aria-expanded="configNavOpen"
            :aria-controls="'tv-config-nav'"
            :title="configNavOpen ? 'Ocultar secciones' : 'Mostrar secciones'"
            @click="configNavOpen = !configNavOpen"
          >
            <span class="config-nav__chev" aria-hidden="true">{{ configNavOpen ? '‹' : '›' }}</span>
            <span v-if="configNavOpen" class="config-nav__toggle-text">Secciones</span>
            <span v-else class="config-nav__toggle-current">{{ configSectionLabel }}</span>
          </button>
          <nav
            v-show="configNavOpen"
            id="tv-config-nav"
            class="config-nav"
            aria-label="Secciones de configuración"
          >
            <button
              v-for="s in configSections"
              :key="s.id"
              type="button"
              class="config-nav__item"
              :class="{ on: configSection === s.id }"
              :disabled="savingCanal"
              @click="selectConfigSection(s.id)"
            >
              {{ s.label }}
            </button>
          </nav>
        </aside>

        <div class="config-panel">
          <!-- Bienvenida -->
          <div v-show="configSection === 'welcome'" class="config-panel__body">
            <div class="cfg-toolbar">
              <label class="check">
                <input v-model="canalForm.welcomeEnabled" type="checkbox" />
                Mostrar diapositiva de bienvenida
                <CfgInfoTip
                  title="Mostrar diapositiva de bienvenida"
                  body="Si está activo, la TV muestra una pantalla de marca/texto de bienvenida dentro del loop."
                />
              </label>
            </div>
            <div v-if="canalForm.welcomeEnabled" class="welcome-cols">
              <div class="welcome-cols__main">
                <label class="cfg-field">
                  <span class="cfg-field__label">
                    Texto de bienvenida
                    <CfgInfoTip
                      title="Texto de bienvenida"
                      body="Mensaje que se lee en esa pantalla (además del nombre de la comunidad)."
                    />
                  </span>
                  <input v-model="canalForm.welcomeText" class="welcome-text-input" maxlength="200" />
                </label>
                <label class="cfg-field cfg-field--inline">
                  <span class="cfg-field__label">
                    Duración de la bienvenida
                    <CfgInfoTip
                      title="Duración de la bienvenida"
                      body="Cuántos segundos dura cada vez que aparece la pantalla de bienvenida."
                    />
                  </span>
                  <span class="cfg-inline-control">
                    <input v-model.number="canalForm.welcomeDurationSec" type="number" min="5" max="60" />
                    <em>seg</em>
                  </span>
                </label>
                <label class="cfg-field cfg-field--inline">
                  <span class="cfg-field__label">
                    Aparición de pantalla de bienvenida cada
                    <CfgInfoTip
                      title="Aparición de pantalla de bienvenida"
                      body="Cada cuántos contenidos del loop vuelve a insertarse la bienvenida. Ejemplo: si configurás 5, se muestra al inicio y otra vez después de 5 pubs/diapositivas extras."
                    />
                  </span>
                  <span class="cfg-inline-control">
                    <input v-model.number="canalForm.welcomeEveryN" type="number" min="1" max="20" />
                    <em>diapositivas</em>
                  </span>
                </label>
              </div>
              <div class="welcome-cols__logo">
                <div class="cfg-toolbar">
                  <label class="check" :class="{ muted: !canalForm.showLogo }">
                    <input
                      v-model="canalForm.presentation.welcomeShowLogo"
                      type="checkbox"
                      :disabled="!canalForm.showLogo"
                    />
                    Incluir logo
                    <CfgInfoTip
                      title="Incluir logo"
                      body="Si está activo, la bienvenida muestra el logo de la comunidad centrado. Requiere que “Mostrar logo” esté activo en la sección Logo."
                    />
                  </label>
                </div>
                <p v-if="!canalForm.showLogo" class="hint">
                  El logo global está apagado en <strong>Logo</strong>; la bienvenida no puede mostrarlo.
                </p>
                <template v-if="canalForm.showLogo && canalForm.presentation.welcomeShowLogo">
                  <p class="cfg-label">
                    Tamaño del logo
                    <CfgInfoTip
                      title="Tamaño del logo"
                      body="Tamaño del logo en la pantalla de bienvenida: chico, mediano o grande."
                    />
                  </p>
                  <div class="seg" role="group" aria-label="Tamaño del logo en bienvenida">
                    <button
                      type="button"
                      class="seg__btn"
                      :class="{ on: canalForm.presentation.welcomeLogoScale === 'sm' }"
                      @click="canalForm.presentation.welcomeLogoScale = 'sm'"
                    >
                      Chico
                    </button>
                    <button
                      type="button"
                      class="seg__btn"
                      :class="{ on: canalForm.presentation.welcomeLogoScale === 'md' }"
                      @click="canalForm.presentation.welcomeLogoScale = 'md'"
                    >
                      Mediano
                    </button>
                    <button
                      type="button"
                      class="seg__btn"
                      :class="{ on: canalForm.presentation.welcomeLogoScale === 'lg' }"
                      @click="canalForm.presentation.welcomeLogoScale = 'lg'"
                    >
                      Grande
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Diapositivas -->
          <div v-show="configSection === 'slides'" class="config-panel__body">
            <div class="welcome-cols">
              <div class="welcome-cols__main">
                <label class="cfg-field cfg-field--inline">
                  <span class="cfg-field__label">
                    Duración de cada diapositiva
                    <CfgInfoTip
                      title="Duración de cada diapositiva"
                      body="Duración por defecto de cada imagen, texto o pantalla fija (si ese ítem no define otra). No corta los videos si está activo “Videos esperan a terminar”."
                    />
                  </span>
                  <span class="cfg-inline-control">
                    <input v-model.number="canalForm.defaultSlideDurationSec" type="number" min="5" max="120" />
                    <em>seg</em>
                  </span>
                </label>
                <p class="cfg-label">
                  Transición
                  <CfgInfoTip
                    title="Transición"
                    body="Fade hace un fundido suave entre diapositivas. Corte cambia de golpe."
                  />
                </p>
                <div class="seg">
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.transition === 'fade' }" @click="canalForm.presentation.transition = 'fade'">Fade</button>
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.transition === 'cut' }" @click="canalForm.presentation.transition = 'cut'">Corte</button>
                </div>
                <hr class="cfg-sep" />
                <p class="cfg-label">Se muestra:</p>
                <div class="cfg-check-stack">
                  <label class="check">
                    <input v-model="canalForm.presentation.showSlideDots" type="checkbox" />
                    Puntitos de diapositivas
                    <CfgInfoTip title="Puntitos de diapositivas" body="Muestra los puntitos indicadores de la diapositiva actual en la TV." />
                  </label>
                  <label class="check">
                    <input v-model="canalForm.presentation.showPostTipo" type="checkbox" />
                    Tipo de publicación
                    <CfgInfoTip title="Tipo de publicación" body="Muestra la etiqueta (Noticia, Aviso, etc.) sobre el título de la publicación." />
                  </label>
                  <div class="cfg-check-block">
                    <label class="check">
                      <input v-model="canalForm.presentation.showCta" type="checkbox" />
                      CTA
                      <CfgInfoTip
                        title="CTA"
                        body="Muestra un llamado a la acción bajo el texto de la publicación. Si configurás un mensaje, se usa en todas las pubs; si lo dejás vacío, se usan textos por tipo (evento, beneficio, aviso)."
                      />
                    </label>
                    <label v-if="canalForm.presentation.showCta" class="cfg-field cfg-field--nested">
                      <span class="cfg-field__label">
                        Mensaje de acción sugerido
                        <CfgInfoTip
                          title="Mensaje de acción sugerido"
                          body="Texto que se muestra como CTA en la TV. Ejemplo: “Más info en la app”. Si está vacío, se usan mensajes distintos según el tipo de publicación."
                        />
                      </span>
                      <input
                        v-model="canalForm.presentation.ctaMessage"
                        type="text"
                        maxlength="80"
                        placeholder="Más info en la app"
                      />
                    </label>
                  </div>
                  <label v-if="canalForm.welcomeEnabled" class="check">
                    <input v-model="canalForm.presentation.showLocationOnWelcome" type="checkbox" />
                    Ubicación
                    <CfgInfoTip title="Ubicación" body="En la bienvenida muestra el nombre/ubicación de la pantalla emparejada." />
                  </label>
                  <div class="cfg-check-inline">
                    <label class="check">
                      <input v-model="canalForm.presentation.showClock" type="checkbox" />
                      Reloj
                      <CfgInfoTip title="Reloj" body="Muestra la hora actual en una esquina de la TV." />
                    </label>
                    <label v-if="canalForm.presentation.showClock" class="cfg-inline-select">
                      <span class="sr-only">Ubicación del reloj</span>
                      <select v-model="canalForm.presentation.clockPosition" aria-label="Ubicación del reloj">
                        <option value="tr">Arriba a la derecha</option>
                        <option value="br">Abajo a la derecha</option>
                        <option value="tl">Arriba a la izquierda</option>
                        <option value="bl">Abajo a la izquierda</option>
                      </select>
                    </label>
                  </div>
                  <label class="check">
                    <input v-model="canalForm.presentation.idleShowLogo" type="checkbox" />
                    Logo si no hay contenido
                    <CfgInfoTip
                      title="Logo si no hay contenido"
                      body="Cuando el canal no tiene pubs ni diapos para mostrar, la TV muestra una pantalla de espera con el texto de respaldo (ej. “Contenido no disponible”). Si este check está activo, también aparece el logo de la comunidad en esa pantalla."
                    />
                  </label>
                </div>
              </div>
              <div class="welcome-cols__logo">
                <p class="cfg-label">
                  Tamaño de títulos
                  <CfgInfoTip
                    title="Tamaño de títulos"
                    body="Tamaño tipográfico de los títulos en diapositivas de publicación y texto."
                  />
                </p>
                <div class="seg">
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.titleScale === 'sm' }" @click="canalForm.presentation.titleScale = 'sm'">Chica</button>
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.titleScale === 'md' }" @click="canalForm.presentation.titleScale = 'md'">Media</button>
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.titleScale === 'lg' }" @click="canalForm.presentation.titleScale = 'lg'">Grande</button>
                </div>
                <label class="cfg-field color-field">
                  <span class="cfg-field__label">
                    Color de resaltado
                    <CfgInfoTip
                      title="Color de resaltado"
                      body="Es el color “de marca” que se usa para pintar cosas chiquitas que llaman la atención: por ejemplo la palabra Noticia o Aviso arriba del título, y algunos detalles de la bienvenida. El fondo de la TV y el texto grande no cambian: solo ese color de detalle."
                    />
                  </span>
                  <input v-model="canalForm.presentation.accentColor" type="color" />
                </label>
              </div>
            </div>
          </div>

          <!-- Muro -->
          <div v-show="configSection === 'wall'" class="config-panel__body">
            <div class="cfg-toolbar wrap">
              <label class="check">
                <input v-model="canalForm.wallEnabled" type="checkbox" />
                Incluir publicaciones del muro
                <CfgInfoTip
                  title="Incluir publicaciones del muro"
                  body="Si está apagado, el canal no muestra pubs del muro (solo bienvenida y diapositivas extras, si hay). Solo entran pubs con audiencia “todos”, como el muro público."
                />
              </label>
              <label class="check">
                <input
                  v-model="canalForm.wallIncludeMemberPosts"
                  type="checkbox"
                  @change="refreshPosts"
                />
                Incluir publicaciones de usuarios
                <CfgInfoTip
                  title="Incluir publicaciones de usuarios"
                  body="Vale para Automático y Diapositivas seleccionadas por ud.: incluye pubs hechas por miembros (UGC), no solo las institucionales. En modo selección, también aparecen en el selector para agregar."
                />
              </label>
            </div>
            <p class="cfg-label">
              Cómo armar el contenido
              <CfgInfoTip
                title="Cómo armar el contenido"
                body="Automático: pubs del muro según filtros. Diapositivas seleccionadas por ud.: solo las que elijas, en ese orden. Solo diapos extras: próximamente (aún no disponible)."
              />
            </p>
            <div class="mode-pick mode-pick--mute-off mode-pick--3" role="radiogroup" aria-label="Modo de contenido">
              <button
                type="button"
                class="mode-pick__btn"
                role="radio"
                :aria-checked="wallContentChoice === 'auto'"
                :class="{ on: wallContentChoice === 'auto' }"
                @click="setWallContentChoice('auto')"
              >
                <span class="mode-pick__check" aria-hidden="true">
                  {{ wallContentChoice === 'auto' ? '✓' : '' }}
                </span>
                <span class="mode-pick__text">
                  <strong>Automático</strong>
                </span>
              </button>
              <button
                type="button"
                class="mode-pick__btn"
                role="radio"
                :aria-checked="wallContentChoice === 'list'"
                :class="{ on: wallContentChoice === 'list' }"
                @click="setWallContentChoice('list')"
              >
                <span class="mode-pick__check" aria-hidden="true">
                  {{ wallContentChoice === 'list' ? '✓' : '' }}
                </span>
                <span class="mode-pick__text">
                  <strong>Diapositivas seleccionadas por ud.</strong>
                </span>
              </button>
              <button
                type="button"
                class="mode-pick__btn"
                role="radio"
                :aria-checked="wallContentChoice === 'extras'"
                :class="{ on: wallContentChoice === 'extras' }"
                @click="setWallContentChoice('extras')"
              >
                <span class="mode-pick__check" aria-hidden="true">
                  {{ wallContentChoice === 'extras' ? '✓' : '' }}
                </span>
                <span class="mode-pick__text">
                  <strong>Solo diapos extras</strong>
                </span>
              </button>
            </div>

            <template v-if="wallContentChoice === 'extras'">
              <div class="wall-soon" role="status" aria-live="polite">
                <div class="wall-soon__icons" aria-hidden="true">
                  <span class="wall-soon__ico wall-soon__ico--tv">
                    <svg viewBox="0 0 24 24" width="28" height="28" focusable="false">
                      <rect x="2" y="4" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                      <path d="M8 21h8M12 18v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="wall-soon__ico wall-soon__ico--spark">
                    <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
                      <path
                        d="M12 3l1.6 4.8L18.5 9.5l-4.9 1.7L12 16l-1.6-4.8L5.5 9.5l4.9-1.7L12 3z"
                        fill="currentColor"
                        opacity="0.9"
                      />
                    </svg>
                  </span>
                  <span class="wall-soon__ico wall-soon__ico--clock">
                    <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
                      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                      <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </span>
                </div>
                <p class="wall-soon__title">Próximamente</p>
                <p class="wall-soon__text">
                  El modo <strong>Solo diapos extras</strong> todavía no está disponible.
                </p>
                <p class="wall-soon__sub">Elegí Automático o Diapositivas seleccionadas por ud. para configurar el canal.</p>
              </div>
            </template>

            <template v-else-if="canalForm.contentMode === 'auto'">
              <div class="auto-cfg-scope" aria-label="Alcance del muro">
                <p class="cfg-label">Alcance del muro</p>
                <div class="auto-cfg-scope__grid" role="group" aria-label="Alcance del muro">
                  <label class="scope-field">
                    <span class="scope-field__label">
                      Cuántos días atrás busca publicaciones
                      <CfgInfoTip
                        title="Cuántos días atrás busca publicaciones"
                        body="Hasta cuántos días hacia atrás se buscan publicaciones (modo automático)."
                      />
                    </span>
                    <span class="scope-field__control">
                      <input v-model.number="canalForm.wallDays" type="number" min="1" max="90" />
                      <em>días</em>
                    </span>
                  </label>
                  <label class="scope-field">
                    <span class="scope-field__label">
                      Cantidad máxima de publicaciones
                      <CfgInfoTip
                        title="Cantidad máxima de publicaciones"
                        body="Tope de publicaciones del muro que entran al loop (modo automático)."
                      />
                    </span>
                    <span class="scope-field__control">
                      <input v-model.number="canalForm.wallMax" type="number" min="0" max="40" />
                      <em>pubs</em>
                    </span>
                  </label>
                  <label class="scope-field scope-field--toggle">
                    <span class="scope-field__label">
                      Solo con media
                      <CfgInfoTip
                        title="Solo con media"
                        body="Excluye pubs que no tengan imagen o video."
                      />
                    </span>
                    <span class="scope-field__control scope-field__control--check">
                      <input v-model="canalForm.wallMediaOnly" type="checkbox" />
                      <span class="scope-field__hint">Solo imagen o video</span>
                    </span>
                  </label>
                  <label class="scope-field scope-field--toggle">
                    <span class="scope-field__label">
                      Excluir biblioteca de conocimiento
                      <CfgInfoTip
                        title="Excluir publicaciones de la biblioteca de conocimiento"
                        body="No incluye publicaciones de la biblioteca de conocimiento."
                      />
                    </span>
                    <span class="scope-field__control scope-field__control--check">
                      <input v-model="canalForm.wallExcludeKnowledge" type="checkbox" />
                      <span class="scope-field__hint">No incluir esas pubs</span>
                    </span>
                  </label>
                </div>
                <p class="cfg-label">
                  Tipos
                  <CfgInfoTip
                    title="Tipos"
                    body="Filtra por tipo (Noticia, Aviso, Evento, etc.). Marcá los que querés incluir en el loop."
                  />
                </p>
                <div class="chip-grid" role="group" aria-label="Tipos">
                  <label
                    v-for="t in wallTypeOptions"
                    :key="t.id"
                    class="chip"
                    :class="{ on: (canalForm.wallTypes || []).includes(t.id) }"
                  >
                    <input v-model="canalForm.wallTypes" type="checkbox" :value="t.id" />
                    {{ t.label }}
                  </label>
                </div>
                <template v-if="categoryOptions.length">
                  <p class="cfg-label">
                    Categorías
                    <CfgInfoTip
                      title="Categorías"
                      body="Si dejás vacío, entran todas. Si marcás alguna, solo esas categorías."
                    />
                  </p>
                  <div class="chip-grid" role="group" aria-label="Categorías">
                    <label
                      v-for="c in categoryOptions"
                      :key="c.id"
                      class="chip"
                      :class="{ on: (canalForm.wallCategoryIds || []).includes(c.id) }"
                    >
                      <input v-model="canalForm.wallCategoryIds" type="checkbox" :value="c.id" />
                      {{ c.nombre }}
                    </label>
                  </div>
                </template>
              </div>

              <p class="cfg-label">
                Resultado automático
                <CfgInfoTip
                  title="Resultado automático"
                  body="Vista del loop que arma el modo Automático con la config actual (pubs + diapos extras, sin bienvenida). Se actualiza solo al cambiar filtros, días, máximo, extras, etc. El orden no se puede editar acá."
                />
              </p>
              <p class="hint wall-carousel__hint">
                <template v-if="autoCarouselLoading">Armando carrusel…</template>
                <template v-else>
                  {{ autoCarouselItems.length }}
                  {{ autoCarouselItems.length === 1 ? 'diapositiva' : 'diapositivas' }}
                  · se recalcula solo al cambiar la config
                </template>
              </p>
              <p v-if="autoCarouselError" class="error-inline">{{ autoCarouselError }}</p>
              <div
                v-if="autoCarouselItems.length"
                class="wall-carousel wall-carousel--readonly"
                aria-label="Carrusel del modo automático"
              >
                <button
                  type="button"
                  class="wall-carousel__nav"
                  aria-label="Anterior"
                  :disabled="!wallCarouselCanPrev"
                  @click="scrollWallCarousel(-1)"
                >
                  ‹
                </button>
                <div
                  ref="wallCarouselEl"
                  class="wall-carousel__track"
                  @scroll="onWallCarouselScroll"
                >
                  <article
                    v-for="(slide, i) in autoCarouselItems"
                    :key="`${slide.id || i}-${i}`"
                    class="wall-card wall-card--readonly"
                    :class="{ 'is-extra': isAutoExtraSlide(slide) }"
                  >
                    <div class="wall-card__top">
                      <span class="wall-card__num" :aria-label="`Diapo ${i + 1}`">{{ i + 1 }}</span>
                      <span
                        class="wall-card__type"
                        :class="isAutoExtraSlide(slide) ? 'wall-card__type--extra' : 'wall-card__type--pub'"
                        :title="isAutoExtraSlide(slide) ? 'Diapositiva extra' : 'Publicación del muro'"
                      >
                        <svg
                          v-if="isAutoExtraSlide(slide)"
                          class="wall-card__type-ico"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
                          <path d="M8 22h8M12 18v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          <path d="M8 10h8M8 13h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        <svg
                          v-else
                          class="wall-card__type-ico"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M4 5h11a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          />
                          <path d="M17 7h3v12a2 2 0 0 1-2 2H6" fill="none" stroke="currentColor" stroke-width="2" />
                          <path d="M8 9h6M8 12h6M8 15h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        <span>{{ isAutoExtraSlide(slide) ? 'Extra' : 'Pub' }}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      class="wall-card__media"
                      title="Previsualizar"
                      aria-label="Previsualizar diapositiva"
                      @click="openAutoSlidePreview(slide, i)"
                    >
                      <img
                        v-if="autoSlideThumb(slide)"
                        :src="autoSlideThumb(slide)"
                        alt=""
                        draggable="false"
                        @error="onWallCardImgError"
                      />
                      <span v-else class="wall-card__ph" aria-hidden="true">{{ isAutoExtraSlide(slide) ? 'Extra' : 'Pub' }}</span>
                      <span
                        v-if="autoSlideMediaOverlay(slide)"
                        class="wall-card__extra-type"
                        :class="{ 'wall-card__extra-type--quote': autoSlideMediaOverlayIsQuote(slide) }"
                        aria-hidden="true"
                      >
                        {{ autoSlideMediaOverlay(slide) }}
                      </span>
                      <span class="wall-card__preview-ico" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                          <path
                            d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                          />
                          <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                        </svg>
                      </span>
                    </button>
                    <div class="wall-card__foot">
                      <p class="wall-card__title">{{ autoSlideTitle(slide) }}</p>
                      <button
                        v-if="canExcludeAutoSlide(slide)"
                        type="button"
                        class="wall-card__exclude"
                        title="Excluir publicación"
                        aria-label="Excluir publicación del loop automático"
                        @click.stop="excludeAutoSlide(slide)"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
                          <path d="M6.5 6.5l11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                      </button>
                    </div>
                  </article>
                </div>
                <button
                  type="button"
                  class="wall-carousel__nav"
                  aria-label="Siguiente"
                  :disabled="!wallCarouselCanNext"
                  @click="scrollWallCarousel(1)"
                >
                  ›
                </button>
              </div>
              <p v-else-if="!autoCarouselLoading" class="empty">
                Ninguna diapositiva con esta configuración. Probá ampliar días, máximo o tipos, o incluí diapos extras.
              </p>

              <div class="auto-cfg-cols" aria-label="Exclusiones y diapos extras">
                <div class="auto-cfg-cols__col">
                  <p class="cfg-label">
                    Excluir publicaciones
                    <CfgInfoTip
                      title="Excluir publicaciones"
                      body="Pubs concretas que no deben entrar al loop automático del muro, aunque cumplan días/tipos/categorías. No borra la pub del muro de la app."
                    />
                  </p>
                  <div class="list-picker">
                    <select v-model="excludePickId" aria-label="Excluir publicación">
                      <option value="">Elegí una pub para excluir…</option>
                      <option v-for="post in postOptionsForExclude" :key="post.id" :value="post.id">
                        {{ post.titulo }} ({{ post.tipo }})
                      </option>
                    </select>
                    <button
                      type="button"
                      class="btn-ghost btn-compact"
                      :disabled="!excludePickId"
                      @click="addWallExclude"
                    >
                      Excluir
                    </button>
                  </div>
                  <div v-if="canalForm.wallExcludePostIds.length" class="exclude-chips" role="list">
                    <span
                      v-for="id in canalForm.wallExcludePostIds"
                      :key="id"
                      class="exclude-chip"
                      role="listitem"
                    >
                      <span class="exclude-chip__label">{{ postTitle(id) }}</span>
                      <button
                        type="button"
                        class="exclude-chip__x"
                        :aria-label="`Dejar de excluir ${postTitle(id)}`"
                        @click="removeWallExclude(id)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                  <p v-else class="hint">Ninguna publicación excluida.</p>
                </div>

                <div class="auto-cfg-cols__col">
                  <p class="cfg-label">
                    Incluir diapos extras
                    <CfgInfoTip
                      title="Incluir diapos extras"
                      body="Si está activo, las diapos extras del canal entran en el loop automático junto con las pubs del muro. Si está apagado, solo se muestran las pubs (la bienvenida sigue según su propia config)."
                    />
                  </p>
                  <div class="cfg-toolbar wrap">
                    <label class="check">
                      <input v-model="canalForm.wallIncludeExtras" type="checkbox" />
                      Incluir diapos extras en el loop
                    </label>
                  </div>
                  <template v-if="canalForm.wallIncludeExtras">
                    <p class="cfg-label">
                      Cómo ubicarlas
                      <CfgInfoTip
                        title="Cómo ubicar las diapos extras"
                        body="Al final / al inicio: bloque completo. Intercaladas: mete una extra cada N pubs (más predecible en TV). Mezcladas: reparte pubs y extras en un orden mezclado pero estable (no cambia en cada refresh)."
                      />
                    </p>
                    <div class="mode-pick mode-pick--stack" role="radiogroup" aria-label="Ubicación de diapos extras">
                      <button
                        v-for="opt in extrasPlacementOptions"
                        :key="opt.id"
                        type="button"
                        class="mode-pick__btn"
                        role="radio"
                        :aria-checked="canalForm.extrasPlacement === opt.id"
                        :class="{ on: canalForm.extrasPlacement === opt.id }"
                        @click="canalForm.extrasPlacement = opt.id"
                      >
                        <span class="mode-pick__check" aria-hidden="true">
                          {{ canalForm.extrasPlacement === opt.id ? '✓' : '' }}
                        </span>
                        <span class="mode-pick__text">
                          <strong>{{ opt.label }}</strong>
                          <small v-if="opt.hint">{{ opt.hint }}</small>
                        </span>
                      </button>
                    </div>
                    <label v-if="canalForm.extrasPlacement === 'interleave'" class="cfg-field cfg-field--inline">
                      <span class="cfg-field__label">
                        Una diapo extra cada
                        <CfgInfoTip
                          title="Intercalar cada N"
                          body="Ejemplo: si ponés 3, el loop va pub-pub-pub-extra-pub-pub-pub-extra… Las extras que sobren van al final."
                        />
                      </span>
                      <span class="cfg-inline-control">
                        <input v-model.number="canalForm.extrasEveryN" type="number" min="1" max="20" />
                        <em>publicaciones</em>
                      </span>
                    </label>
                  </template>
                </div>
              </div>
            </template>

            <template v-else>
              <p class="cfg-label">
                Lista de publicaciones
                <CfgInfoTip
                  title="Lista de publicaciones"
                  body="Elegís pubs una por una. El orden del carrusel es el orden en la TV. Arrastrá para reordenar, usá + entre diapos para insertar y × para quitar (con confirmación)."
                />
              </p>
              <p class="hint wall-carousel__hint">
                {{ canalForm.wallIncludeEntries.length }}
                {{ canalForm.wallIncludeEntries.length === 1 ? 'diapositiva' : 'diapositivas' }}
                · arrastrá para reordenar
              </p>
              <div class="wall-carousel" aria-label="Carrusel de diapositivas seleccionadas">
                <button
                  type="button"
                  class="wall-carousel__nav"
                  aria-label="Anterior"
                  :disabled="!wallCarouselCanPrev"
                  @click="scrollWallCarousel(-1)"
                >
                  ‹
                </button>
                <div
                  ref="wallCarouselEl"
                  class="wall-carousel__track"
                  @scroll="onWallCarouselScroll"
                >
                  <button
                    type="button"
                    class="wall-insert"
                    title="Agregar al inicio"
                    aria-label="Agregar al inicio"
                    :disabled="!canInsertListEntry"
                    @click="openListInsert(0)"
                  >
                    +
                  </button>
                  <template v-for="(entry, i) in canalForm.wallIncludeEntries" :key="`${entry.kind}-${entry.id}-${i}`">
                    <article
                      class="wall-card"
                      :class="{
                        dragging: listDragFrom === i,
                        'drag-over': listDragOver === i && listDragFrom !== i,
                        'is-extra': entry.kind === 'extra',
                        focus: wallCarouselFocusIndex === i,
                      }"
                      :tabindex="wallCarouselFocusIndex === i ? 0 : -1"
                      draggable="true"
                      @dragstart="onListDragStart(i, $event)"
                      @dragover.prevent="onListDragOver(i, $event)"
                      @dragleave="onListDragLeave(i)"
                      @drop.prevent="onListDrop(i)"
                      @dragend="onListDragEnd"
                    >
                      <div class="wall-card__top">
                        <span class="wall-card__num" :aria-label="`Diapo ${i + 1}`">{{ i + 1 }}</span>
                        <span
                          class="wall-card__type"
                          :class="entry.kind === 'extra' ? 'wall-card__type--extra' : 'wall-card__type--pub'"
                          :title="entry.kind === 'extra' ? 'Diapositiva extra' : 'Publicación del muro'"
                        >
                          <svg
                            v-if="entry.kind === 'extra'"
                            class="wall-card__type-ico"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
                            <path d="M8 22h8M12 18v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <path d="M8 10h8M8 13h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          </svg>
                          <svg
                            v-else
                            class="wall-card__type-ico"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="M4 5h11a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            />
                            <path d="M17 7h3v12a2 2 0 0 1-2 2H6" fill="none" stroke="currentColor" stroke-width="2" />
                            <path d="M8 9h6M8 12h6M8 15h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          </svg>
                          <span>{{ entry.kind === 'extra' ? 'Extra' : 'Pub' }}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        class="wall-card__media"
                        title="Previsualizar"
                        aria-label="Previsualizar diapositiva"
                        draggable="false"
                        @click.stop="openListRealPreview(entry, i)"
                      >
                        <img
                          v-if="listEntryThumb(entry)"
                          :src="listEntryThumb(entry)"
                          alt=""
                          draggable="false"
                          @error="onWallCardImgError"
                        />
                        <span v-else class="wall-card__ph" aria-hidden="true">{{ entry.kind === 'extra' ? 'Extra' : 'Pub' }}</span>
                        <span
                          v-if="listEntryMediaOverlay(entry)"
                          class="wall-card__extra-type"
                          :class="{ 'wall-card__extra-type--quote': listEntryMediaOverlayIsQuote(entry) }"
                          aria-hidden="true"
                        >
                          {{ listEntryMediaOverlay(entry) }}
                        </span>
                        <span class="wall-card__preview-ico" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                            <path
                              d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.8"
                            />
                            <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                          </svg>
                        </span>
                      </button>
                      <div class="wall-card__foot">
                        <p class="wall-card__title">{{ listEntryTitle(entry) }}</p>
                        <button
                          type="button"
                          class="wall-card__x"
                          title="Quitar de la lista"
                          aria-label="Quitar de la lista"
                          @click.stop="askRemoveFromList(i)"
                        >
                          ×
                        </button>
                      </div>
                      <span class="wall-card__drag" title="Arrastrar" aria-hidden="true">⋮⋮</span>
                    </article>
                    <button
                      type="button"
                      class="wall-insert"
                      title="Insertar acá"
                      :aria-label="`Insertar después de la ${i + 1}`"
                      :disabled="!canInsertListEntry"
                      @click="openListInsert(i + 1)"
                    >
                      +
                    </button>
                  </template>
                </div>
                <button
                  type="button"
                  class="wall-carousel__nav"
                  aria-label="Siguiente"
                  :disabled="!wallCarouselCanNext"
                  @click="scrollWallCarousel(1)"
                >
                  ›
                </button>
              </div>
              <p v-if="!canalForm.wallIncludeEntries.length" class="empty">
                Lista vacía: tocá <strong>+</strong> para agregar una publicación o una diapo extra.
              </p>
              <p v-else-if="!canInsertListEntry" class="hint">
                No hay más publicaciones ni diapos extras disponibles para agregar.
              </p>
            </template>
          </div>

          <!-- Audiencia -->
          <div v-show="configSection === 'audience'" class="config-panel__body">
            <p class="cfg-label">
              Audiencia del canal
              <CfgInfoTip
                title="Audiencia del canal"
                body="Define quién puede elegir este canal al emparejar una TV desde la app. No cambia qué pubs muestra el muro en pantalla."
              />
            </p>
            <TvAudienceFields v-model="audienceDraft" />
          </div>

          <!-- Logo / layout -->
          <div v-show="configSection === 'logo'" class="config-panel__body">
            <div class="cfg-toolbar">
              <label class="check">
                <input v-model="canalForm.showLogo" type="checkbox" />
                Mostrar logo en posición elegida
                <CfgInfoTip
                  title="Mostrar logo en posición elegida"
                  body="Interruptor maestro del logo: si está apagado, no aparece en esquinas, diapos de texto ni en la bienvenida (aunque “Incluir logo” esté activo ahí)."
                />
              </label>
            </div>
            <template v-if="canalForm.showLogo">
              <p class="cfg-label">
                Posición del logo
                <CfgInfoTip
                  title="Posición del logo"
                  body="Elegí en qué esquina o en el centro de la TV aparece el logo. “No mostrar” lo deja apagado aunque el check de arriba esté activo."
                />
              </p>
              <div class="quad">
                <button type="button" class="quad__cell" :class="{ on: canalForm.presentation.logoPosition === 'tl' }" @click="canalForm.presentation.logoPosition = 'tl'">Arriba izquierda</button>
                <button type="button" class="quad__cell" :class="{ on: canalForm.presentation.logoPosition === 'tr' }" @click="canalForm.presentation.logoPosition = 'tr'">Arriba derecha</button>
                <button type="button" class="quad__cell mid" :class="{ on: canalForm.presentation.logoPosition === 'center' }" @click="canalForm.presentation.logoPosition = 'center'">Centro de la pantalla</button>
                <button type="button" class="quad__cell" :class="{ on: canalForm.presentation.logoPosition === 'bl' }" @click="canalForm.presentation.logoPosition = 'bl'">Abajo izquierda</button>
                <button type="button" class="quad__cell" :class="{ on: canalForm.presentation.logoPosition === 'br' }" @click="canalForm.presentation.logoPosition = 'br'">Abajo derecha</button>
                <button type="button" class="quad__hide" :class="{ on: canalForm.presentation.logoPosition === 'hidden' }" @click="canalForm.presentation.logoPosition = 'hidden'">No mostrar</button>
              </div>
              <template v-if="canalForm.presentation.logoPosition !== 'hidden'">
                <p class="cfg-label">
                  Tamaño del logo
                  <CfgInfoTip
                    title="Tamaño del logo"
                    body="Tamaño del logo en la posición elegida durante las diapositivas: chico, mediano o grande. El de la bienvenida se configura aparte en Bienvenida."
                  />
                </p>
                <div class="seg" role="group" aria-label="Tamaño del logo">
                  <button
                    type="button"
                    class="seg__btn"
                    :class="{ on: canalForm.presentation.logoScale === 'sm' }"
                    @click="canalForm.presentation.logoScale = 'sm'"
                  >
                    Chico
                  </button>
                  <button
                    type="button"
                    class="seg__btn"
                    :class="{ on: canalForm.presentation.logoScale === 'md' }"
                    @click="canalForm.presentation.logoScale = 'md'"
                  >
                    Mediano
                  </button>
                  <button
                    type="button"
                    class="seg__btn"
                    :class="{ on: canalForm.presentation.logoScale === 'lg' }"
                    @click="canalForm.presentation.logoScale = 'lg'"
                  >
                    Grande
                  </button>
                </div>
              </template>
            </template>
          </div>

          <!-- Fotos -->
          <div v-show="configSection === 'small'" class="config-panel__body">
            <p class="cfg-label">
              Layout publicación
              <CfgInfoTip
                title="Layout publicación"
                body="Cómo se reparte la foto/video y el texto en una pub del muro: media a la izquierda/derecha, arriba/abajo, solo media o solo texto."
              />
            </p>
            <div class="layout-pick">
              <button v-for="opt in layoutOptions" :key="opt.id" type="button" class="layout-pick__btn" :class="{ on: canalForm.presentation.postLayout === opt.id }" @click="canalForm.presentation.postLayout = opt.id">
                <span class="layout-pick__icon" :class="`i-${opt.id}`" aria-hidden="true"></span>
                {{ opt.label }}
              </button>
            </div>
            <p class="cfg-label">
              Encaje de fotos y videos
              <CfgInfoTip
                title="Encaje de fotos y videos"
                body="Define cómo se ve la foto o el video dentro de su panel en la TV (no afecta al logo):"
                :items="[
                  'Contain: se ve entera, aunque queden bordes vacíos.',
                  'Cover: llena todo el panel; puede recortar bordes.',
                  'Letterbox: se ve entera con bandas (como en el cine).',
                  'Blur: llena el panel y completa el fondo con un desenfoque.',
                ]"
              />
            </p>
            <div class="fit-pick">
              <button v-for="opt in mediaFitOptions" :key="opt.id" type="button" class="fit-pick__btn" :class="{ on: canalForm.presentation.mediaFit === opt.id }" @click="canalForm.presentation.mediaFit = opt.id">
                <span class="fit-pick__demo" :class="`fit-${opt.id}`" aria-hidden="true"><i></i></span>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Tratamiento de fotos chicas -->
          <div v-show="configSection === 'small-treatment'" class="config-panel__body">
            <p class="cfg-section-lead">
              Solo si la foto es chica (ancho y alto bajo el mínimo) se usa este modo en lugar del Encaje.
            </p>
            <div class="num-row num-row--with-title">
              <span class="num-row__title">Una foto se considera chica cuando ancho y alto son menores a:</span>
              <label class="num-chip">
                <span>
                  Ancho mín.
                  <CfgInfoTip
                    title="Ancho mín."
                    body="Parte del criterio de “foto chica”: el ancho natural debe ser menor a este valor (px), y también el alto respecto de su mínimo."
                  />
                </span>
                <input v-model.number="canalForm.presentation.smallImageMinWidth" type="number" min="120" max="2000" />
                <em>px</em>
              </label>
              <label class="num-chip">
                <span>
                  Alto mín.
                  <CfgInfoTip
                    title="Alto mín."
                    body="Parte del criterio de “foto chica”: el alto natural debe ser menor a este valor (px), y también el ancho respecto de su mínimo."
                  />
                </span>
                <input v-model.number="canalForm.presentation.smallImageMinHeight" type="number" min="120" max="2000" />
                <em>px</em>
              </label>
            </div>
            <p class="cfg-label">
              Modo para fotos chicas
              <CfgInfoTip
                title="Modo para fotos chicas"
                body="Reemplaza el Encaje solo en fotos chicas. Si Encaje es Contain y acá dejás Blur, las fotos chicas se verán con fondo desenfocado."
              />
            </p>
            <div class="fit-pick">
              <button v-for="opt in smallImageOptions" :key="opt.id" type="button" class="fit-pick__btn" :class="{ on: canalForm.presentation.smallImageMode === opt.id }" @click="canalForm.presentation.smallImageMode = opt.id">
                <span class="fit-pick__demo" :class="`fit-${opt.id === 'text-priority' ? 'text' : opt.id}`" aria-hidden="true"><i></i></span>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Videos y sonido -->
          <div v-show="configSection === 'audio'" class="config-panel__body">
            <div class="welcome-cols">
              <div class="welcome-cols__main">
                <p class="cfg-label">Videos</p>
                <div class="cfg-toolbar">
                  <label class="check">
                    <input v-model="canalForm.waitForVideoEnd" type="checkbox" />
                    Videos esperan a terminar
                    <CfgInfoTip
                      title="Videos esperan a terminar"
                      body="Los videos (archivo o YouTube) no se cortan al cumplir los segundos del slide: se muestran hasta que terminan. Las imágenes siguen usando la duración del slide."
                    />
                  </label>
                </div>
              </div>
              <div class="welcome-cols__logo">
                <p class="cfg-label">
                  Política de audio
                  <CfgInfoTip
                    title="Política de audio"
                    body="Respeta cada dispositivo usa el mute de esa TV. Siempre en silencio / con sonido fuerza el canal para todas las pantallas. En Dispositivos también podés fijar mute por pantalla."
                  />
                </p>
                <div class="seg seg--col" role="group">
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.mutePolicy === 'device' }" @click="canalForm.presentation.mutePolicy = 'device'">Respeta cada dispositivo</button>
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.mutePolicy === 'force-mute' }" @click="canalForm.presentation.mutePolicy = 'force-mute'">Siempre en silencio</button>
                  <button type="button" class="seg__btn" :class="{ on: canalForm.presentation.mutePolicy === 'force-sound' }" @click="canalForm.presentation.mutePolicy = 'force-sound'">Siempre con sonido</button>
                </div>
                <label class="check">
                  <input v-model="canalForm.presentation.allowUnmuteFromTv" type="checkbox" />
                  Permitir cambiar sonido desde el menú ⋮ de la TV
                  <CfgInfoTip
                    title="Permitir cambiar sonido desde la TV"
                    body="Si está activo, desde el menú ⋮ de la pantalla se puede silenciar o activar sonido localmente."
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Diapositivas extras -->
          <div v-show="configSection === 'slots'" class="config-panel__body config-panel__body--slots">
            <button
              v-if="slotsFromCanales"
              type="button"
              class="btn-ghost btn-compact slots-back"
              @click="backToCanales"
            >
              ← Volver a Canales disponibles
            </button>
            <p class="cfg-section-lead">
              Diapositivas extras que se crean específicas para este canal (pueden ser texto, imagen, video o una publicación concreta).
            </p>
            <article
              v-for="p in slotsPlaylists"
              :key="p.id"
              class="card"
              :class="{ 'card--focus': p.id === slotsFocusId }"
              :data-slot-canal="p.id"
            >
              <div class="card-head card-head--slots">
                <h2 class="slots-list-title">Listado de diapo extras</h2>
                <div class="actions">
                  <button type="button" class="btn-primary btn-compact" @click="addSlotToPlaylist(p)">
                    Nueva diapo extra
                  </button>
                </div>
              </div>
              <ul v-if="p.items?.length" class="slot-list">
                <li v-for="(it, i) in p.items" :key="it.id || i">
                  <span class="badge">{{ it.type }}</span>
                  <strong>{{ slotPreviewLabel(it) }}</strong>
                  <em>{{ it.durationSec || 15 }}s</em>
                  <button
                    type="button"
                    class="ico-btn"
                    title="Ver ahora"
                    aria-label="Ver ahora"
                    @click="openSlotPreview(it)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="currentColor" d="M12 5c-5.5 0-9.7 4.2-10.8 6.5a1.2 1.2 0 0 0 0 1C2.3 14.8 6.5 19 12 19s9.7-4.2 10.8-6.5a1.2 1.2 0 0 0 0-1C21.7 9.2 17.5 5 12 5zm0 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm0-2.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="ico-btn"
                    title="Editar"
                    aria-label="Editar"
                    @click="editSlot(p, i)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18-11.5a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75L21 5.75z"/>
                    </svg>
                  </button>
                </li>
              </ul>
              <p v-else class="empty">Sin diapositivas extras. Tocá <strong>Nueva diapo extra</strong> para crear la primera.</p>
            </article>
            <p v-if="!playlists.length" class="empty">
              Todavía no hay canales. Creá el primero en
              <button type="button" class="linkish" @click="tab = 'canales'">Canales disponibles</button>.
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- DISPOSITIVOS -->
    <section v-else-if="tab === 'devices'">
      <header class="tab-intro">
        <p>
          Lista de pantallas ya vinculadas: asignales un canal, activá o silenciá el sonido, y
          desvinculá las que ya no uses. El heartbeat indica si la TV sigue conectada.
        </p>
      </header>
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ubicación</th>
            <th>Canal</th>
            <th>Sonido</th>
            <th>Estado</th>
            <th>Heartbeat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in devices" :key="d.id">
            <td>{{ d.name }}</td>
            <td>{{ d.locationLabel || '—' }}</td>
            <td>
              <select :value="d.playlistId || ''" @change="assignPlaylist(d, $event.target.value)">
                <option value="">Sin canal</option>
                <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </td>
            <td>
              <button
                type="button"
                class="btn-ghost"
                :title="d.mute ? 'Activar sonido' : 'Silenciar'"
                @click="toggleMute(d)"
              >
                {{ d.mute ? 'Mute' : 'Con sonido' }}
              </button>
            </td>
            <td>{{ d.status }}</td>
            <td>{{ formatDate(d.lastHeartbeatAt) }}</td>
            <td class="actions">
              <button
                v-if="d.status === 'active'"
                type="button"
                class="btn-ghost danger"
                @click="revoke(d)"
              >
                Desvincular
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!devices.length" class="empty">
        Todavía no hay dispositivos. Abrí la pestaña <strong>Cómo usarlo</strong>, emparejá con el código y vuelven a aparecer acá.
      </p>
    </section>

    <div
      v-if="previewOpen"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-preview-title"
      @click.self="closeChannelPreview"
    >
      <div class="tv-modal-box tv-modal-box--tv-preview">
        <div class="card-head">
          <h2 id="tv-preview-title">
            Ver ahora{{ previewChannelName ? `: ${previewChannelName}` : '' }}
          </h2>
          <button type="button" class="btn-ghost" @click="closeChannelPreview">Cerrar</button>
        </div>
        <p class="hint">
          Lo mismo que vería una TV con este canal (layout, logo, bienvenida, pubs y diapositivas extras).
        </p>
        <p v-if="previewError" class="err">{{ previewError }}</p>
        <p v-if="previewLoading" class="empty">Generando vista previa…</p>
        <TvChannelPreview
          v-else-if="previewManifest && !previewError"
          :manifest="previewManifest"
          :autoplay="true"
        />
        <p v-else-if="!previewError" class="empty">No hay contenido para mostrar en este canal.</p>
        <details v-if="previewItems.length" class="preview-playlist" :open="previewShowPlaylist">
          <summary @click.prevent="previewShowPlaylist = !previewShowPlaylist">
            Playlist del loop ({{ previewItems.length }})
          </summary>
          <ol class="preview-list">
            <li v-for="(it, i) in previewItems" :key="it.id || i">
              <span class="badge">{{ it.type }}</span>
              <strong>{{ it.title || it.body || it.text || '—' }}</strong>
              <em>{{ it.waitForEnd ? 'hasta fin video' : `${it.durationSec}s` }}</em>
            </li>
          </ol>
        </details>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="previewLoading" @click="loadPreview">
            Actualizar
          </button>
          <button type="button" class="btn-primary" @click="closeChannelPreview">Listo</button>
        </div>
      </div>
    </div>

    <div
      v-if="uiPreviewOpen"
      class="tv-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-ui-preview-title"
      @click.self="uiPreviewOpen = false"
    >
      <div class="tv-modal-box tv-modal-box--preview">
        <div class="card-head">
          <h2 id="tv-ui-preview-title">{{ uiPreviewTitle }}</h2>
          <button type="button" class="btn-ghost" @click="uiPreviewOpen = false">Cerrar</button>
        </div>

        <template v-if="canalForm">
          <div v-if="uiPreviewKind === 'welcome'" class="tv-mini tv-mini--modal">
            <div class="tv-mini__screen">
              <p class="tv-mini__brand">Marca</p>
              <p class="tv-mini__text">{{ canalForm.welcomeText || 'Texto de bienvenida' }}</p>
              <p class="tv-mini__meta">
                {{ canalForm.welcomeEnabled ? 'Activa' : 'Desactivada' }} ·
                {{ canalForm.welcomeDurationSec || 10 }}s · cada {{ canalForm.welcomeEveryN || 5 }}
              </p>
            </div>
          </div>

          <div v-else-if="uiPreviewKind === 'logo'" class="layout-preview layout-preview--modal">
            <div
              class="layout-preview__tv"
              :class="[
                `layout-${canalForm.presentation.postLayout}`,
                `logo-${canalForm.presentation.logoPosition}`,
                `fit-${canalForm.presentation.mediaFit}`,
                { 'no-logo': !canalForm.showLogo || canalForm.presentation.logoPosition === 'hidden' },
              ]"
            >
              <span class="layout-preview__logo">L</span>
              <div class="layout-preview__media">Foto</div>
              <div class="layout-preview__copy">Texto</div>
            </div>
            <p class="hint">
              Layout: {{ canalForm.presentation.postLayout }} · Encaje: {{ canalForm.presentation.mediaFit }} ·
              Logo: {{ canalForm.showLogo ? canalForm.presentation.logoPosition : 'off' }}
            </p>
          </div>

          <div v-else-if="uiPreviewKind === 'small'" class="layout-preview layout-preview--modal">
            <div class="small-preview" :class="`mode-${canalForm.presentation.smallImageMode}`">
              <div class="small-preview__frame">
                <span class="small-preview__img">img</span>
              </div>
            </div>
            <p class="hint">
              Modo: {{ canalForm.presentation.smallImageMode }} · mín.
              {{ canalForm.presentation.smallImageMinWidth }}×{{ canalForm.presentation.smallImageMinHeight }}px
            </p>
          </div>

          <div v-else-if="uiPreviewKind === 'audio'" class="audio-preview audio-preview--modal">
            <span
              class="audio-preview__icon"
              :class="{
                sound: canalForm.presentation.mutePolicy === 'force-sound',
                mute: canalForm.presentation.mutePolicy === 'force-mute',
                device: canalForm.presentation.mutePolicy === 'device',
              }"
            ></span>
            <div>
              <strong>{{ audioPolicyLabel }}</strong>
              <p class="hint">
                Menú TV:
                {{ canalForm.presentation.allowUnmuteFromTv ? 'puede cambiar sonido' : 'no puede cambiar sonido' }}
              </p>
            </div>
          </div>

          <div
            v-else-if="uiPreviewKind === 'extras' || uiPreviewKind === 'slides'"
            class="type-preview type-preview--modal"
            :class="`scale-${canalForm.presentation.titleScale}`"
            :style="{ '--prev-accent': canalForm.presentation.accentColor }"
          >
            <p v-if="canalForm.presentation.showPostTipo" class="type-preview__tipo">Noticia</p>
            <p class="type-preview__title">Título de ejemplo</p>
            <p class="type-preview__body">Así se verá el cuerpo del texto en la TV.</p>
            <p v-if="canalForm.presentation.showCta" class="type-preview__cta">
              {{ (canalForm.presentation.ctaMessage || '').trim() || 'Más info en la app' }}
            </p>
            <div v-if="canalForm.presentation.showSlideDots" class="type-preview__dots"><i class="on"></i><i></i><i></i></div>
            <p class="hint">
              Transición {{ canalForm.presentation.transition }}
              <template v-if="canalForm.presentation.showClock"> · reloj</template>
              <template v-if="canalForm.presentation.showLocationOnWelcome"> · ubicación</template>
              <template v-if="canalForm.presentation.idleShowLogo"> · logo sin contenido</template>
            </p>
          </div>
        </template>

        <div v-if="uiPreviewKind === 'slot' && slotPreviewItem" class="slot-preview">
          <div class="tv-mini__screen slot-preview__screen">
            <span class="badge">{{ slotPreviewItem.type }}</span>
            <template v-if="slotPreviewItem.type === 'image' && slotPreviewMediaSrc(slotPreviewItem.url)">
              <img :src="slotPreviewMediaSrc(slotPreviewItem.url)" alt="" class="slot-preview__media" />
            </template>
            <template v-else-if="slotPreviewItem.type === 'video' && slotPreviewMediaSrc(slotPreviewItem.url)">
              <video
                :key="slotPreviewItem.url"
                :src="slotPreviewMediaSrc(slotPreviewItem.url)"
                class="slot-preview__media"
                muted
                playsinline
                controls
              />
            </template>
            <template v-else-if="slotPreviewItem.type === 'youtube' && slotPreviewYoutubeEmbed(slotPreviewItem.url)">
              <iframe
                class="slot-preview__media slot-preview__iframe"
                :src="slotPreviewYoutubeEmbed(slotPreviewItem.url)"
                title="Preview YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              />
            </template>
            <template v-else-if="slotPreviewItem.type === 'youtube'">
              <p class="slot-preview__yt">YouTube</p>
              <p class="tv-mini__meta">{{ slotPreviewItem.url }}</p>
            </template>
            <template v-else-if="slotPreviewItem.type === 'post'">
              <iframe
                v-if="slotPreviewPostMedia(slotPreviewItem.postId).kind === 'youtube' && slotPreviewPostMedia(slotPreviewItem.postId).embed"
                class="slot-preview__media slot-preview__iframe"
                :src="slotPreviewPostMedia(slotPreviewItem.postId).embed"
                title="Preview publicación YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              />
              <video
                v-else-if="slotPreviewPostMedia(slotPreviewItem.postId).kind === 'video' && slotPreviewPostMedia(slotPreviewItem.postId).src"
                :src="slotPreviewPostMedia(slotPreviewItem.postId).src"
                class="slot-preview__media"
                muted
                playsinline
                controls
              />
              <img
                v-else-if="slotPreviewPostMedia(slotPreviewItem.postId).src"
                :src="slotPreviewPostMedia(slotPreviewItem.postId).src"
                alt=""
                class="slot-preview__media"
                @error="onSlotPreviewMediaError"
              />
              <p class="tv-mini__text">{{ slotPreviewLabel(slotPreviewItem) }}</p>
              <p v-if="slotPreviewPost(slotPreviewItem.postId)?.tipo" class="tv-mini__meta">
                {{ slotPreviewPost(slotPreviewItem.postId).tipo }}
              </p>
            </template>
            <template v-else>
              <div
                class="slot-preview__text"
                :class="[
                  `align-${slotPreviewItem.textAlign || 'center'}`,
                  `valign-${slotPreviewItem.textValign || 'center'}`,
                  `scale-${slotPreviewItem.textScale || 'md'}`,
                ]"
              >
                <p v-if="slotPreviewItem.showTextLogo" class="slot-preview__logo-hint">Logo</p>
                <p v-if="slotPreviewItem.showBrand !== false" class="slot-preview__brand">Marca</p>
                <p class="tv-mini__text">{{ slotPreviewItem.text || 'Texto en pantalla' }}</p>
              </div>
            </template>
            <p class="tv-mini__meta">{{ slotPreviewItem.durationSec || 15 }}s</p>
          </div>
        </div>

        <div class="footer">
          <button type="button" class="btn-primary" @click="uiPreviewOpen = false">Listo</button>
        </div>
      </div>
    </div>

    <div
      v-if="canalToggleOpen && canalToggleTarget"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-canal-toggle-title"
      @click.self="closeCanalToggle"
    >
      <div class="tv-modal-box">
        <h2 id="tv-canal-toggle-title">
          {{ canalToggleNextActivo ? 'Activar canal' : 'Desactivar canal' }}
        </h2>
        <p class="hint">
          <template v-if="canalToggleNextActivo">
            ¿Activar «{{ canalToggleTarget.name }}»? Las TVs asignadas a este canal podrán volver a
            mostrar su contenido.
          </template>
          <template v-else>
            ¿Desactivar «{{ canalToggleTarget.name }}»? Las TVs con este canal dejarán de mostrar su
            contenido hasta que lo actives de nuevo.
          </template>
        </p>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" :disabled="!!togglingCanalId" @click="closeCanalToggle">
            Cancelar
          </button>
          <button
            type="button"
            class="btn-primary btn-compact"
            :disabled="!!togglingCanalId"
            @click="confirmToggleCanal"
          >
            {{
              togglingCanalId
                ? 'Guardando…'
                : canalToggleNextActivo
                  ? 'Activar'
                  : 'Desactivar'
            }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="slotDeleteOpen"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-slot-delete-title"
      @click.self="closeSlotDelete"
    >
      <div class="tv-modal-box">
        <h2 id="tv-slot-delete-title">Eliminar diapo extra</h2>
        <p class="hint">
          ¿Eliminar esta diapo extra
          <template v-if="slotDeleteLabel"> «{{ slotDeleteLabel }}»</template>?
          Esta acción no se puede deshacer.
        </p>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" :disabled="savingSlot" @click="closeSlotDelete">
            Cancelar
          </button>
          <button
            type="button"
            class="btn-primary btn-compact"
            :disabled="savingSlot"
            @click="confirmRemoveSlot"
          >
            {{ savingSlot ? 'Eliminando…' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="listRealPreviewOpen"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-list-real-preview-title"
      @click.self="closeListRealPreview"
    >
      <div class="tv-modal-box tv-modal-box--tv-preview">
        <div class="card-head">
          <h2 id="tv-list-real-preview-title">
            Previsualización
            <template v-if="listRealPreviewIndex != null"> · diapo {{ listRealPreviewIndex + 1 }}</template>
          </h2>
          <button type="button" class="btn-ghost" @click="closeListRealPreview">Cerrar</button>
        </div>
        <p class="hint">
          Así se verá en la TV con el layout, tipografía y logo del canal.
        </p>
        <TvChannelPreview
          v-if="listRealPreviewManifest"
          :manifest="listRealPreviewManifest"
          :autoplay="true"
        />
        <p v-else class="empty">No se pudo armar la vista previa de esta diapo.</p>
        <div class="footer">
          <button type="button" class="btn-primary" @click="closeListRealPreview">Listo</button>
        </div>
      </div>
    </div>

    <div
      v-if="listRemoveOpen"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-list-remove-title"
      @click.self="closeListRemove"
    >
      <div class="tv-modal-box">
        <h2 id="tv-list-remove-title">Quitar de la lista</h2>
        <p class="hint">
          ¿Sacar
          <template v-if="listRemoveLabel"> «{{ listRemoveLabel }}»</template>
          de las diapositivas seleccionadas?
          <template v-if="listRemoveEntry?.kind === 'extra'">
            La diapo extra sigue existiendo en Diapositivas extras; solo deja de estar en este orden.
          </template>
          <template v-else>
            La publicación no se borra del muro; solo deja de entrar en este canal.
          </template>
        </p>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" @click="closeListRemove">Cancelar</button>
          <button type="button" class="btn-primary btn-compact" @click="confirmRemoveFromList">Quitar</button>
        </div>
      </div>
    </div>

    <div
      v-if="listInsertOpen"
      class="tv-modal tv-modal--top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-list-insert-title"
      @click.self="closeListInsert"
    >
      <form class="tv-modal-box tv-modal-box--list-insert" @submit.prevent="confirmListInsert">
        <h2 id="tv-list-insert-title">Agregar a la selección</h2>
        <p class="hint">
          Elegí <strong>una</strong> opción (publicación <em>o</em> diapo extra). Se insertará
          <template v-if="listInsertAt === 0">al inicio</template>
          <template v-else-if="listInsertAt >= (canalForm?.wallIncludeEntries?.length || 0)">al final</template>
          <template v-else>entre la {{ listInsertAt }} y la {{ listInsertAt + 1 }}</template>.
        </p>
        <div class="list-insert-layout" :class="{ ready: Boolean(listInsertPreview) }">
          <div class="list-insert-form">
            <label class="cfg-field">
              <span class="cfg-field__label">Publicación del muro</span>
              <select
                v-model="listPickId"
                aria-label="Elegir publicación"
                :disabled="!postOptionsAvailable.length"
                @change="onListPickPost"
              >
                <option value="">Elegí una pub…</option>
                <option v-for="post in postOptionsAvailable" :key="post.id" :value="post.id">
                  {{ post.titulo }} ({{ post.tipo }})
                </option>
              </select>
            </label>
            <p class="hint list-insert-or">— o —</p>
            <label class="cfg-field">
              <span class="cfg-field__label">Diapo extra del canal</span>
              <select
                v-model="listPickExtraId"
                aria-label="Elegir diapo extra"
                :disabled="!extraOptionsAvailable.length"
                @change="onListPickExtra"
              >
                <option value="">Elegí una diapo extra…</option>
                <option v-for="ex in extraOptionsAvailable" :key="ex.id" :value="ex.id">
                  {{ extraOptionLabel(ex) }}
                </option>
              </select>
            </label>
            <p v-if="!canInsertListEntry" class="err">No hay publicaciones ni diapos extras disponibles para agregar.</p>
          </div>
          <aside v-if="listInsertPreview" class="list-insert-preview" aria-live="polite">
            <p class="cfg-label">Vista previa</p>
            <div class="slot-preview slot-preview--live">
              <div class="tv-mini__screen slot-preview__screen">
                <span class="badge">{{ listInsertPreview.badge }}</span>
                <template v-if="listInsertPreview.kind === 'image' && listInsertPreview.src">
                  <img :src="listInsertPreview.src" alt="" class="slot-preview__media" @error="onSlotPreviewMediaError" />
                  <p class="tv-mini__text">{{ listInsertPreview.title }}</p>
                </template>
                <template v-else-if="listInsertPreview.kind === 'video' && listInsertPreview.src">
                  <video
                    :key="listInsertPreview.src"
                    :src="listInsertPreview.src"
                    class="slot-preview__media"
                    muted
                    playsinline
                    controls
                    autoplay
                    loop
                  />
                  <p class="tv-mini__text">{{ listInsertPreview.title }}</p>
                </template>
                <template v-else-if="listInsertPreview.kind === 'youtube' && listInsertPreview.embed">
                  <iframe
                    class="slot-preview__media slot-preview__iframe"
                    :src="listInsertPreview.embed"
                    title="Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                  />
                  <p class="tv-mini__text">{{ listInsertPreview.title }}</p>
                </template>
                <template v-else-if="listInsertPreview.kind === 'text'">
                  <div
                    class="slot-preview__text"
                    :class="[
                      `align-${listInsertPreview.textAlign || 'center'}`,
                      `valign-${listInsertPreview.textValign || 'center'}`,
                      `scale-${listInsertPreview.textScale || 'md'}`,
                    ]"
                  >
                    <p v-if="listInsertPreview.showTextLogo" class="slot-preview__logo-hint">Logo</p>
                    <p v-if="listInsertPreview.showBrand !== false" class="slot-preview__brand">Marca</p>
                    <p class="tv-mini__text">{{ listInsertPreview.title }}</p>
                  </div>
                </template>
                <template v-else>
                  <p class="tv-mini__text">{{ listInsertPreview.title }}</p>
                  <p v-if="listInsertPreview.meta" class="tv-mini__meta">{{ listInsertPreview.meta }}</p>
                </template>
                <p v-if="listInsertPreview.durationSec" class="tv-mini__meta">{{ listInsertPreview.durationSec }}s</p>
              </div>
            </div>
          </aside>
          <p v-else class="hint list-insert-preview-empty">Elegí una publicación o diapo extra para ver la vista previa.</p>
        </div>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" @click="closeListInsert">Cancelar</button>
          <button
            type="submit"
            class="btn-primary btn-compact"
            :disabled="!listPickId && !listPickExtraId"
          >
            Agregar
          </button>
        </div>
      </form>
    </div>

    <div v-if="canalMetaOpen" class="tv-modal" @click.self="canalMetaOpen = false">
      <form class="tv-modal-box" @submit.prevent="saveCanalMeta">
        <h2>Editar canal</h2>
        <p class="hint">Nombre y texto de respaldo. La audiencia y el resto se editan en Configuración.</p>
        <label>Nombre <input v-model="canalMetaForm.name" required maxlength="120" /></label>
        <label class="cfg-field">
          <span class="cfg-field__label">
            Texto de respaldo
            <CfgInfoTip
              title="Texto de respaldo"
              body="Mensaje que muestra la TV cuando este canal no tiene nada para reproducir (sin pubs, sin diapositivas extras, o todo vacío). Sirve para que la pantalla no quede en negro: por ejemplo “Próximamente novedades” o “Consultá la app”."
            />
          </span>
          <input v-model="canalMetaForm.fallbackText" maxlength="300" />
        </label>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" @click="canalMetaOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary btn-compact" :disabled="savingCanalMeta">
            {{ savingCanalMeta ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="slotEditorOpen" class="tv-modal" @click.self="slotEditorOpen = false">
      <form
        class="tv-modal-box tv-modal-box--slots"
        :class="{ 'tv-modal-box--slot-live': slotDraftReady }"
        @submit.prevent="saveSlotEditor"
      >
        <h2>{{ slotEditorIndex == null ? 'Nueva diapo extra' : 'Editar diapo extra' }}</h2>
        <p class="hint">Solo esta diapositiva del canal. El resto no se modifica.</p>
        <div class="slot-editor-layout" :class="{ ready: slotDraftReady }">
          <div class="slot-editor-form">
            <div class="slot-card">
              <div class="slot-card__top">
                <select v-model="slotDraft.type" aria-label="Tipo de contenido">
                  <option value="text">Texto</option>
                  <option value="image">Imagen</option>
                  <option value="video">Video</option>
                  <option value="youtube">YouTube</option>
                  <option value="post">Publicación</option>
                </select>
                <label class="slot-dur">
                  Seg
                  <input v-model.number="slotDraft.durationSec" type="number" min="5" max="3600" />
                </label>
              </div>
              <select v-if="slotDraft.type === 'post'" v-model="slotDraft.postId">
                <option value="">Elegí una pub…</option>
                <option v-for="post in postOptions" :key="post.id" :value="post.id">
                  {{ post.titulo }}
                </option>
              </select>
              <template v-else-if="slotDraft.type === 'image' || slotDraft.type === 'video'">
                <label class="cfg-field">
                  <span class="cfg-field__label">
                    {{ slotDraft.type === 'image' ? 'URL de la imagen' : 'URL del video' }}
                    <CfgInfoTip
                      :title="slotDraft.type === 'image' ? 'URL de la imagen' : 'URL del video'"
                      body="La TV necesita un enlace https al archivo. Podés pegar una URL o subir un archivo: al subirlo se genera la URL automáticamente."
                    />
                  </span>
                  <input v-model="slotDraft.url" type="text" placeholder="https://… o /uploads/…" required />
                </label>
                <div class="slot-upload-row">
                  <input
                    ref="slotFileInput"
                    type="file"
                    class="sr-only"
                    :accept="slotDraft.type === 'image' ? 'image/*' : 'video/*'"
                    @change="onSlotFileSelected"
                  />
                  <button type="button" class="btn-ghost btn-compact" :disabled="uploadingSlotFile" @click="slotFileInput?.click()">
                    {{ uploadingSlotFile ? 'Subiendo…' : 'Subir archivo' }}
                  </button>
                  <span v-if="slotDraft.url" class="hint">URL lista</span>
                </div>
              </template>
              <label v-else-if="slotDraft.type === 'youtube'" class="cfg-field">
                <span class="cfg-field__label">
                  URL de YouTube
                  <CfgInfoTip
                    title="URL de YouTube"
                    body="Pegá el enlace del video de YouTube (watch, youtu.be o shorts)."
                  />
                </span>
                <input v-model="slotDraft.url" type="text" placeholder="https://www.youtube.com/watch?v=…" required />
              </label>
              <template v-else>
                <label class="cfg-field">
                  <span class="cfg-field__label">
                    Texto en pantalla
                    <CfgInfoTip
                      title="Texto en pantalla"
                      body="Este texto es propio de la diapo. No hereda el mensaje de Bienvenida: tipografía, ubicación y logo se configuran acá abajo."
                    />
                  </span>
                  <textarea v-model="slotDraft.text" rows="3" placeholder="Mensaje para la TV…" required />
                </label>
                <div class="slot-text-style">
                  <p class="cfg-label">Presentación del texto</p>
                  <div class="cfg-row">
                    <label class="cfg-field">
                      <span class="cfg-field__label">Ubicación horizontal</span>
                      <select v-model="slotDraft.textAlign">
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                      </select>
                    </label>
                    <label class="cfg-field">
                      <span class="cfg-field__label">Ubicación vertical</span>
                      <select v-model="slotDraft.textValign">
                        <option value="top">Arriba</option>
                        <option value="center">Centro</option>
                        <option value="bottom">Abajo</option>
                      </select>
                    </label>
                    <label class="cfg-field">
                      <span class="cfg-field__label">Tamaño de letra</span>
                      <select v-model="slotDraft.textScale">
                        <option value="sm">Chico</option>
                        <option value="md">Mediano</option>
                        <option value="lg">Grande</option>
                      </select>
                    </label>
                  </div>
                  <label class="check">
                    <input v-model="slotDraft.showBrand" type="checkbox" />
                    Mostrar nombre de la marca
                  </label>
                  <label class="check">
                    <input v-model="slotDraft.showTextLogo" type="checkbox" />
                    Mostrar logo en esta diapo
                    <CfgInfoTip
                      title="Logo en diapo de texto"
                      body="Si está activo, el logo aparece junto al texto (aunque en Configuración el logo esté en una esquina). Si está apagado, igual puede verse el logo de esquina según la config general del canal."
                    />
                  </label>
                </div>
              </template>
            </div>
            <p v-if="slotEditorError" class="err">{{ slotEditorError }}</p>
          </div>
          <aside v-if="slotDraftReady" class="slot-editor-preview" aria-live="polite">
            <p class="cfg-label">Vista previa</p>
            <div class="slot-preview slot-preview--live">
              <div class="tv-mini__screen slot-preview__screen">
                <span class="badge">{{ slotDraft.type }}</span>
                <template v-if="slotDraft.type === 'image' && slotDraftMediaSrc">
                  <img :src="slotDraftMediaSrc" alt="" class="slot-preview__media" @error="onSlotPreviewMediaError" />
                </template>
                <template v-else-if="slotDraft.type === 'video' && slotDraftMediaSrc">
                  <video
                    :key="slotDraftMediaSrc"
                    :src="slotDraftMediaSrc"
                    class="slot-preview__media"
                    muted
                    playsinline
                    controls
                    autoplay
                    loop
                  />
                </template>
                <template v-else-if="slotDraft.type === 'youtube' && slotDraftYoutubeEmbed">
                  <iframe
                    class="slot-preview__media slot-preview__iframe"
                    :src="slotDraftYoutubeEmbed"
                    title="Preview YouTube"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                  />
                </template>
                <template v-else-if="slotDraft.type === 'youtube'">
                  <p class="slot-preview__yt">YouTube</p>
                  <p class="tv-mini__meta">{{ slotDraft.url }}</p>
                </template>
                <template v-else-if="slotDraft.type === 'post'">
                  <iframe
                    v-if="slotDraftPostMedia.kind === 'youtube' && slotDraftPostMedia.embed"
                    class="slot-preview__media slot-preview__iframe"
                    :src="slotDraftPostMedia.embed"
                    title="Preview publicación YouTube"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                  />
                  <video
                    v-else-if="slotDraftPostMedia.kind === 'video' && slotDraftPostMedia.src"
                    :key="slotDraftPostMedia.src"
                    :src="slotDraftPostMedia.src"
                    class="slot-preview__media"
                    muted
                    playsinline
                    controls
                  />
                  <img
                    v-else-if="slotDraftPostMedia.src"
                    :src="slotDraftPostMedia.src"
                    alt=""
                    class="slot-preview__media"
                    @error="onSlotPreviewMediaError"
                  />
                  <p class="tv-mini__text">{{ slotPreviewLabel(slotDraft) }}</p>
                  <p v-if="slotDraftPost?.tipo" class="tv-mini__meta">{{ slotDraftPost.tipo }}</p>
                </template>
                <template v-else>
                  <div
                    class="slot-preview__text"
                    :class="[
                      `align-${slotDraft.textAlign || 'center'}`,
                      `valign-${slotDraft.textValign || 'center'}`,
                      `scale-${slotDraft.textScale || 'md'}`,
                    ]"
                  >
                    <p v-if="slotDraft.showTextLogo" class="slot-preview__logo-hint">Logo</p>
                    <p v-if="slotDraft.showBrand !== false" class="slot-preview__brand">Marca</p>
                    <p class="tv-mini__text">{{ slotDraft.text || 'Texto en pantalla' }}</p>
                  </div>
                </template>
                <p class="tv-mini__meta">{{ slotDraft.durationSec || 15 }}s</p>
              </div>
            </div>
          </aside>
        </div>
        <div class="footer">
          <button
            v-if="slotEditorIndex != null"
            type="button"
            class="btn-ghost btn-compact danger"
            :disabled="savingSlot || uploadingSlotFile"
            @click="askRemoveSlot"
          >
            Eliminar
          </button>
          <button type="button" class="btn-ghost btn-compact" @click="slotEditorOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary btn-compact" :disabled="savingSlot || uploadingSlotFile">
            {{ savingSlot ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="editorOpen" class="tv-modal" @click.self="editorOpen = false">
      <form class="tv-modal-box tv-modal-box--slots" @submit.prevent="savePlaylist">
        <h2>Nuevo canal</h2>
        <p class="hint">Creá el canal y, si querés, sus primeras diapositivas extras.</p>
        <label>Nombre <input v-model="form.name" required maxlength="120" /></label>
        <label class="cfg-field">
          <span class="cfg-field__label">
            Texto de respaldo
            <CfgInfoTip
              title="Texto de respaldo"
              body="Mensaje que muestra la TV cuando este canal no tiene nada para reproducir (sin pubs, sin diapositivas extras, o todo vacío). Sirve para que la pantalla no quede en negro: por ejemplo “Próximamente novedades” o “Consultá la app”."
            />
          </span>
          <input v-model="form.fallbackText" maxlength="300" />
        </label>
        <div class="tv-modal-aud">
          <p class="cfg-label">Audiencia al emparejar</p>
          <p class="hint">Quién puede elegir este canal al emparejar una TV desde la app.</p>
          <TvAudienceFields v-model="form.audience" />
        </div>
        <p class="cfg-label">Diapositivas extras ({{ form.items.length }})</p>
        <div v-for="(it, i) in form.items" :key="i" class="slot-card">
          <div class="slot-card__top">
            <span class="slot-card__n">{{ i + 1 }}</span>
            <select v-model="it.type" aria-label="Tipo de contenido">
              <option value="text">Texto</option>
              <option value="image">Imagen</option>
              <option value="video">Video</option>
              <option value="youtube">YouTube</option>
              <option value="post">Publicación</option>
            </select>
            <label class="slot-dur">
              Seg
              <input v-model.number="it.durationSec" type="number" min="5" max="3600" />
            </label>
            <button type="button" class="btn-ghost btn-compact" @click="openSlotPreview(it)">Ver ahora</button>
            <button type="button" class="btn-ghost btn-compact" @click="form.items.splice(i, 1)">Quitar</button>
          </div>
          <select v-if="it.type === 'post'" v-model="it.postId">
            <option value="">Elegí una pub…</option>
            <option v-for="post in postOptions" :key="post.id" :value="post.id">
              {{ post.titulo }}
            </option>
          </select>
          <input v-else-if="it.type !== 'text'" v-model="it.url" placeholder="URL https…" />
          <input v-else v-model="it.text" placeholder="Texto en pantalla" />
        </div>
        <div class="slot-actions">
          <button type="button" class="btn-primary btn-compact" @click="pushEmptySlot">
            + Nueva diapo extra
          </button>
          <button type="button" class="btn-ghost btn-compact" @click="refreshPosts">Actualizar pubs</button>
        </div>
        <div class="footer">
          <button type="button" class="btn-ghost btn-compact" @click="editorOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary btn-compact">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import TvChannelPreview from '../components/TvChannelPreview.vue'
import TvAudienceFields from '../components/TvAudienceFields.vue'
import CfgInfoTip from '../components/CfgInfoTip.vue'
import { postImageUrls, resolveMediaUrl, youtubeEmbedUrl, youtubeId } from '../utils/media'

const tab = ref('estado')
const canalesView = ref('grid')
const togglingCanalId = ref('')
const canalToggleOpen = ref(false)
const canalToggleTarget = ref(null)
const canalToggleNextActivo = ref(true)
const slotsFocusId = ref('')
const slotsFromCanales = ref(false)
const configSection = ref('welcome')
const configNavOpen = ref(true)
const configSections = [
  { id: 'welcome', label: 'Bienvenida' },
  { id: 'logo', label: 'Logo' },
  { id: 'slides', label: 'Diapositivas' },
  { id: 'small', label: 'Fotos' },
  { id: 'small-treatment', label: 'Tratamiento de fotos chicas' },
  { id: 'audio', label: 'Videos y sonido' },
  { id: 'wall', label: 'Publicaciones a visualizar' },
  { id: 'slots', label: 'Diapositivas extras' },
  { id: 'audience', label: 'Audiencia' },
]
const configSectionLabel = computed(
  () => configSections.find((s) => s.id === configSection.value)?.label || 'Secciones',
)
/** UI-only: “Solo diapos extras” aún no está disponible (no activa extrasOnly). */
const wallContentUi = ref('')
const wallContentChoice = computed(() => {
  if (wallContentUi.value === 'extras') return 'extras'
  return canalForm.value?.contentMode === 'list' ? 'list' : 'auto'
})
function setWallContentChoice(mode) {
  if (!canalForm.value) return
  if (mode === 'extras') {
    wallContentUi.value = 'extras'
    canalForm.value.extrasOnly = false
    return
  }
  wallContentUi.value = ''
  canalForm.value.extrasOnly = false
  canalForm.value.contentMode = mode === 'list' ? 'list' : 'auto'
}
const layoutOptions = [
  { id: 'media-left', label: 'Media izq.' },
  { id: 'media-right', label: 'Media der.' },
  { id: 'media-top', label: 'Media arriba' },
  { id: 'media-bottom', label: 'Media abajo' },
  { id: 'split', label: '50 / 50' },
  { id: 'media-only', label: 'Solo media' },
  { id: 'text-only', label: 'Solo texto' },
]
const mediaFitOptions = [
  { id: 'contain', label: 'Contain' },
  { id: 'cover', label: 'Cover' },
  { id: 'letterbox', label: 'Letterbox' },
  { id: 'blur-fill', label: 'Blur' },
]
const smallImageOptions = [
  { id: 'contain', label: 'Contain' },
  { id: 'blur-fill', label: 'Blur' },
  { id: 'letterbox', label: 'Letterbox' },
  { id: 'cover', label: 'Cover' },
  { id: 'text-priority', label: 'Solo texto' },
]
const devices = ref([])
const playlists = ref([])
const postOptions = ref([])
const categoryOptions = ref([])
const listPickId = ref('')
const listPickExtraId = ref('')
const excludePickId = ref('')
const listInsertOpen = ref(false)
const listInsertAt = ref(0)
const listRemoveOpen = ref(false)
const listRemoveIndex = ref(null)
const listDragFrom = ref(null)
const listDragOver = ref(null)
const wallCarouselEl = ref(null)
const wallCarouselCanPrev = ref(false)
const wallCarouselCanNext = ref(false)
const wallCarouselFocusIndex = ref(null)
let wallCarouselFocusTimer = null
const autoCarouselItems = ref([])
const autoCarouselLoading = ref(false)
const autoCarouselError = ref('')
let autoCarouselTimer = null
let autoCarouselSeq = 0
const listRealPreviewOpen = ref(false)
const listRealPreviewIndex = ref(null)
const listRealPreviewManifest = ref(null)
const error = ref('')
const msg = ref('')
const editorOpen = ref(false)
const slotEditorOpen = ref(false)
const slotDeleteOpen = ref(false)
const savingSlot = ref(false)
const uploadingSlotFile = ref(false)
const slotEditorError = ref('')
const slotFileInput = ref(null)
const slotEditorPlaylist = ref(null)
const slotEditorIndex = ref(null)
const slotDeleteLabel = computed(() => {
  if (!slotDeleteOpen.value) return ''
  return slotPreviewLabel(slotDraft)
})
const slotDraft = reactive({
  id: '',
  type: 'text',
  text: '',
  url: '',
  postId: '',
  durationSec: 15,
  textAlign: 'center',
  textValign: 'center',
  textScale: 'md',
  showBrand: true,
  showTextLogo: false,
})
const slotDraftReady = computed(() => !validateSlotDraft())
const slotDraftMediaSrc = computed(() => resolveMediaUrl(slotDraft.url))
const slotDraftYoutubeEmbed = computed(() => {
  if (slotDraft.type !== 'youtube') return ''
  return youtubeEmbedUrl(slotDraft.url, { autoplay: 0, mute: 1, controls: 1 }) || ''
})
const slotDraftPost = computed(() => {
  if (slotDraft.type !== 'post' || !slotDraft.postId) return null
  return postOptions.value.find((p) => p.id === slotDraft.postId) || null
})
const slotDraftPostMedia = computed(() => slotPostMedia(slotDraftPost.value))
const canalMetaOpen = ref(false)
const savingCanalMeta = ref(false)
const canalMetaEditing = ref(null)
const canalMetaForm = reactive({
  name: '',
  fallbackText: '',
})
const editing = ref(null)
function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [], clientIds: [] }
}
function normalizeAudienceDraft(a) {
  const mode = ['restricted', 'users', 'none'].includes(a?.mode) ? a.mode : 'all'
  return {
    mode,
    areaIds: mode === 'restricted' ? [...(a?.areaIds || [])].map(String) : [],
    groupIds: mode === 'restricted' ? [...(a?.groupIds || [])].map(String) : [],
    userIds: mode === 'restricted' || mode === 'users' ? [...(a?.userIds || [])].map(String) : [],
    clientIds: [],
  }
}
function audienceLabel(a) {
  const mode = a?.mode || 'all'
  if (mode === 'all') return 'Todos'
  if (mode === 'none') return 'Nadie'
  if (mode === 'users') {
    const n = Array.isArray(a?.userIds) ? a.userIds.length : 0
    return n ? `${n} persona${n === 1 ? '' : 's'}` : 'Personas'
  }
  const areas = Array.isArray(a?.areaIds) ? a.areaIds.length : 0
  const groups = Array.isArray(a?.groupIds) ? a.groupIds.length : 0
  const users = Array.isArray(a?.userIds) ? a.userIds.length : 0
  const bits = []
  if (areas) bits.push(`${areas} área${areas === 1 ? '' : 's'}`)
  if (groups) bits.push(`${groups} grupo${groups === 1 ? '' : 's'}`)
  if (users) bits.push(`+${users}`)
  return bits.length ? bits.join(' · ') : 'Áreas/grupos'
}

const form = reactive({
  name: '',
  fallbackText: 'Contenido no disponible',
  items: [],
  audience: emptyAudience(),
})
const audienceDraft = ref(emptyAudience())
const copiedUrl = ref(false)
const activePlaylistId = ref('')
const canalForm = ref(null)
const savingCanal = ref(false)
const activeCanalName = computed(() => {
  const id = activePlaylistId.value
  if (!id) return ''
  return playlists.value.find((p) => p.id === id)?.name || ''
})
const previewItems = ref([])
const previewManifest = ref(null)
const previewChannelName = ref('')
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewShowPlaylist = ref(false)
const uiPreviewOpen = ref(false)
const uiPreviewKind = ref('welcome')
const slotPreviewItem = ref(null)
const statusInfo = ref(null)
const toggling = ref(false)
const tvMode = computed(() => Boolean(statusInfo.value?.tvMode))
const audioPolicyLabel = computed(() => {
  const p = canalForm.value?.presentation?.mutePolicy
  if (p === 'force-mute') return 'Siempre en silencio'
  if (p === 'force-sound') return 'Siempre con sonido'
  return 'Según cada dispositivo'
})
const uiPreviewTitle = computed(() => {
  const map = {
    welcome: 'Ver ahora · bienvenida',
    logo: 'Ver ahora · logo',
    small: 'Ver ahora · fotos',
    audio: 'Ver ahora · videos y sonido',
    slides: 'Ver ahora · diapositivas',
    extras: 'Ver ahora · diapositivas',
    slot: 'Ver ahora · pantalla fija',
  }
  return map[uiPreviewKind.value] || 'Ver ahora'
})

const extrasPlacementOptions = [
  { id: 'end', label: 'Al final', hint: 'Primero las pubs, después las extras' },
  { id: 'start', label: 'Al inicio', hint: 'Primero las extras, después las pubs' },
  { id: 'interleave', label: 'Intercaladas', hint: 'Una extra cada N publicaciones' },
  { id: 'shuffle', label: 'Mezcladas', hint: 'Orden mezclado estable del ciclo' },
]
const wallTypeOptions = [
  { id: 'noticia', label: 'Noticia' },
  { id: 'aviso', label: 'Aviso' },
  { id: 'beneficio', label: 'Beneficio' },
  { id: 'evento', label: 'Evento' },
  { id: 'general', label: 'General' },
  { id: 'celebracion', label: 'Celebración' },
]

const activePlaylist = computed(() =>
  playlists.value.find((x) => x.id === activePlaylistId.value) || null,
)
const activeExtraItems = computed(() =>
  Array.isArray(activePlaylist.value?.items) ? activePlaylist.value.items : [],
)
const postOptionsAvailable = computed(() => {
  const taken = new Set(
    (canalForm.value?.wallIncludeEntries || [])
      .filter((e) => e.kind === 'post')
      .map((e) => e.id),
  )
  return postOptions.value.filter((p) => !taken.has(p.id))
})
const extraOptionsAvailable = computed(() => {
  const taken = new Set(
    (canalForm.value?.wallIncludeEntries || [])
      .filter((e) => e.kind === 'extra')
      .map((e) => e.id),
  )
  return activeExtraItems.value
    .map((it) => ({
      ...it,
      id: String(it.id || it._id || ''),
    }))
    .filter((it) => it.id && !taken.has(it.id))
})
const canInsertListEntry = computed(
  () => postOptionsAvailable.value.length > 0 || extraOptionsAvailable.value.length > 0,
)
const postOptionsForExclude = computed(() => {
  const excluded = new Set(canalForm.value?.wallExcludePostIds || [])
  return postOptions.value.filter((p) => !excluded.has(p.id))
})
const listRemoveEntry = computed(() => {
  if (listRemoveIndex.value == null || !canalForm.value) return null
  return canalForm.value.wallIncludeEntries?.[listRemoveIndex.value] || null
})

const slotsPlaylists = computed(() => {
  const id = activePlaylistId.value || slotsFocusId.value
  const active = playlists.value.find((p) => p.id === id)
  if (active) return [active]
  return playlists.value
})

const adminPath = '/modo-tv'
const tvPairPath = '/tv/emparejar'

function memberAppBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && /localhost:5174/i.test(window.location.origin)) {
    return 'http://localhost:5173'
  }
  return String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

const tvOpenUrl = computed(() => `${memberAppBaseUrl()}/tv`)
const tvPairUrl = computed(() => `${memberAppBaseUrl()}${tvPairPath}`)

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function copyTvUrl() {
  const ok = await copyText(tvOpenUrl.value)
  if (!ok) {
    error.value = 'No se pudo copiar el enlace'
    return
  }
  copiedUrl.value = true
  setTimeout(() => {
    copiedUrl.value = false
  }, 2000)
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

function presentationDefaults(c) {
  const p = c?.presentation || {}
  return {
    logoPosition: p.logoPosition || 'tr',
    logoScale: ['sm', 'md', 'lg'].includes(p.logoScale) ? p.logoScale : 'md',
    postLayout: p.postLayout || 'media-left',
    mediaFit: p.mediaFit || 'contain',
    smallImageMode: p.smallImageMode || 'contain',
    smallImageMinWidth: p.smallImageMinWidth || 480,
    smallImageMinHeight: p.smallImageMinHeight || 320,
    mutePolicy: p.mutePolicy || 'device',
    allowUnmuteFromTv: Boolean(p.allowUnmuteFromTv),
    showSlideDots: p.showSlideDots !== false,
    transition: p.transition || 'fade',
    showPostTipo: p.showPostTipo !== false,
    showCta: p.showCta !== false,
    ctaMessage: String(p.ctaMessage || '').slice(0, 80),
    showLocationOnWelcome: p.showLocationOnWelcome !== false,
    titleScale: p.titleScale || 'md',
    accentColor: p.accentColor || '#5eead4',
    showClock: Boolean(p.showClock),
    clockPosition: ['tl', 'tr', 'bl', 'br'].includes(p.clockPosition) ? p.clockPosition : 'tl',
    idleShowLogo: p.idleShowLogo !== false,
    welcomeShowLogo: p.welcomeShowLogo !== false,
    welcomeLogoScale: ['sm', 'md', 'lg'].includes(p.welcomeLogoScale) ? p.welcomeLogoScale : 'md',
  }
}

function channelDefaults(p) {
  const c = p?.channel || {}
  const slide = c.defaultSlideDurationSec || c.wallPostDurationSec || 12
  const wallIncludeEntries = normalizeWallIncludeEntriesLocal(c)
  return {
    welcomeEnabled: c.welcomeEnabled !== false,
    welcomeText: c.welcomeText || '',
    welcomeDurationSec: c.welcomeDurationSec || 10,
    welcomeEveryN: c.welcomeEveryN || 5,
    showLogo: c.showLogo !== false,
    defaultSlideDurationSec: slide,
    waitForVideoEnd: c.waitForVideoEnd !== false,
    extrasOnly: Boolean(c.extrasOnly),
    contentMode: c.contentMode === 'list' ? 'list' : 'auto',
    wallEnabled: c.wallEnabled !== false,
    wallDays: c.wallDays || 14,
    wallMax: c.wallMax ?? 12,
    wallTypes: Array.isArray(c.wallTypes) && c.wallTypes.length ? [...c.wallTypes] : wallTypeOptions.map((t) => t.id),
    wallCategoryIds: Array.isArray(c.wallCategoryIds) ? [...c.wallCategoryIds] : [],
    wallIncludeMemberPosts: Boolean(c.wallIncludeMemberPosts),
    wallMediaOnly: Boolean(c.wallMediaOnly),
    wallExcludeKnowledge: c.wallExcludeKnowledge !== false,
    wallExcludePostIds: Array.isArray(c.wallExcludePostIds) ? [...c.wallExcludePostIds] : [],
    wallIncludeEntries,
    wallIncludePostIds: wallIncludeEntries.filter((e) => e.kind === 'post').map((e) => e.id),
    wallIncludeExtras: c.wallIncludeExtras !== false,
    extrasPlacement: ['end', 'start', 'interleave', 'shuffle'].includes(c.extrasPlacement)
      ? c.extrasPlacement
      : 'end',
    extrasEveryN: Math.min(20, Math.max(1, Number(c.extrasEveryN) || 3)),
    wallPostDurationSec: c.wallPostDurationSec || slide,
    presentation: presentationDefaults(c),
  }
}

function normalizeWallIncludeEntriesLocal(c = {}) {
  if (Array.isArray(c.wallIncludeEntries) && c.wallIncludeEntries.length) {
    const out = []
    const seen = new Set()
    for (const it of c.wallIncludeEntries) {
      const kind = it?.kind === 'extra' ? 'extra' : it?.kind === 'post' ? 'post' : ''
      const id = String(it?.id || '').trim()
      if (!kind || !id) continue
      const key = `${kind}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ kind, id })
    }
    return out
  }
  const ids = Array.isArray(c.wallIncludePostIds) ? c.wallIncludePostIds : []
  return ids.map((id) => ({ kind: 'post', id: String(id) })).filter((e) => e.id)
}

function loadCanalForm() {
  const p = playlists.value.find((x) => x.id === activePlaylistId.value)
  canalForm.value = p ? channelDefaults(p) : null
  // Modo “solo extras” aún no disponible: no persistir/activar el flag
  if (canalForm.value) canalForm.value.extrasOnly = false
  wallContentUi.value = ''
  audienceDraft.value = normalizeAudienceDraft(p?.audience)
  previewItems.value = []
  previewManifest.value = null
  previewError.value = ''
  listPickId.value = ''
  listPickExtraId.value = ''
  excludePickId.value = ''
  refreshPosts()
}

function addWallExclude() {
  if (!excludePickId.value || !canalForm.value) return
  const id = excludePickId.value
  if (!canalForm.value.wallExcludePostIds.includes(id)) {
    canalForm.value.wallExcludePostIds.push(id)
  }
  excludePickId.value = ''
}

function removeWallExclude(id) {
  const arr = canalForm.value?.wallExcludePostIds
  if (!arr) return
  const i = arr.indexOf(id)
  if (i >= 0) arr.splice(i, 1)
}

function canExcludeAutoSlide(slide) {
  return Boolean(slide?.postId && !isAutoExtraSlide(slide))
}

function excludeAutoSlide(slide) {
  if (!canalForm.value || !canExcludeAutoSlide(slide)) return
  const id = String(slide.postId)
  if (!Array.isArray(canalForm.value.wallExcludePostIds)) {
    canalForm.value.wallExcludePostIds = []
  }
  if (!canalForm.value.wallExcludePostIds.includes(id)) {
    canalForm.value.wallExcludePostIds.push(id)
  }
}

function postTitle(id) {
  return postOptions.value.find((p) => p.id === id)?.titulo || `Pub ${String(id).slice(-6)}`
}

const listRemoveLabel = computed(() => {
  const entry = listRemoveEntry.value
  return entry ? listEntryTitle(entry) : ''
})

function postById(id) {
  return postOptions.value.find((p) => p.id === id) || null
}

function extraById(id) {
  return activeExtraItems.value.find((it) => String(it.id || it._id) === String(id)) || null
}

function postThumb(id) {
  const p = postById(id)
  if (!p) return ''
  return resolveMediaUrl(p.imageUrl || p.mediaUrl || '') || ''
}

function listEntryTitle(entry) {
  if (!entry) return '—'
  if (entry.kind === 'extra') {
    const ex = extraById(entry.id)
    if (!ex) return `Diapo extra ${String(entry.id).slice(-6)}`
    return slotPreviewLabel(ex)
  }
  return postTitle(entry.id)
}

function listEntryThumb(entry) {
  if (!entry) return ''
  if (entry.kind === 'post') return postThumb(entry.id)
  const ex = extraById(entry.id)
  if (!ex) return ''
  if (ex.type === 'post') return postThumb(ex.postId)
  if (ex.type === 'image' || ex.type === 'video') return resolveMediaUrl(ex.url || '') || ''
  return ''
}

function extraOptionLabel(ex) {
  if (!ex) return '—'
  const base = slotPreviewLabel(ex)
  return `${ex.type || 'extra'}: ${base}`
}

function onListPickPost() {
  if (listPickId.value) listPickExtraId.value = ''
}

function onListPickExtra() {
  if (listPickExtraId.value) listPickId.value = ''
}

function buildSlideFromListEntry(entry) {
  if (!entry) return null
  const dur = Number(canalForm.value?.defaultSlideDurationSec) || 12
  if (entry.kind === 'post') {
    const post = postById(entry.id)
    if (!post) return null
    const media = slotPostMedia(post)
    return {
      id: `list-prev-${entry.id}`,
      type: 'post',
      title: post.titulo || 'Publicación',
      body: post.excerpt || '',
      text: post.excerpt || '',
      postTipo: post.tipo || '',
      url: media.src || post.mediaUrl || post.imageUrl || '',
      mediaUrl: media.src || post.mediaUrl || post.imageUrl || '',
      mediaKind: media.kind || '',
      durationSec: dur,
      waitForEnd: Boolean(canalForm.value?.waitForVideoEnd && (media.kind === 'video' || media.kind === 'youtube')),
      postId: post.id,
    }
  }
  const ex = extraById(entry.id)
  if (!ex) return null
  if (ex.type === 'post') {
    const post = postById(ex.postId)
    if (!post) return null
    const media = slotPostMedia(post)
    return {
      id: `list-prev-ex-${entry.id}`,
      type: 'post',
      title: post.titulo || 'Publicación',
      body: post.excerpt || '',
      text: post.excerpt || '',
      postTipo: post.tipo || '',
      url: media.src || '',
      mediaUrl: media.src || '',
      mediaKind: media.kind || '',
      durationSec: Number(ex.durationSec) || dur,
      waitForEnd: Boolean(canalForm.value?.waitForVideoEnd && (media.kind === 'video' || media.kind === 'youtube')),
      postId: post.id,
    }
  }
  if (ex.type === 'text') {
    return {
      id: `list-prev-ex-${entry.id}`,
      type: 'text',
      title: '',
      body: String(ex.text || '').trim(),
      text: String(ex.text || '').trim(),
      url: '',
      mediaUrl: '',
      mediaKind: '',
      durationSec: Number(ex.durationSec) || dur,
      waitForEnd: false,
      textAlign: ['left', 'center', 'right'].includes(ex.textAlign) ? ex.textAlign : 'center',
      textValign: ['top', 'center', 'bottom'].includes(ex.textValign) ? ex.textValign : 'center',
      textScale: ['sm', 'md', 'lg'].includes(ex.textScale) ? ex.textScale : 'md',
      showBrand: ex.showBrand !== false,
      showTextLogo: Boolean(ex.showTextLogo),
    }
  }
  const url = String(ex.url || '').trim()
  return {
    id: `list-prev-ex-${entry.id}`,
    type: ex.type,
    title: String(ex.text || '').trim(),
    body: '',
    text: String(ex.text || '').trim(),
    url,
    mediaUrl: url,
    mediaKind: ex.type === 'youtube' ? 'youtube' : ex.type,
    durationSec: Number(ex.durationSec) || dur,
    waitForEnd: Boolean(canalForm.value?.waitForVideoEnd && (ex.type === 'video' || ex.type === 'youtube')),
  }
}

function openListRealPreview(entry, index = null) {
  const slide = buildSlideFromListEntry(entry)
  if (!slide) return
  const ch = canalForm.value || {}
  const base = previewManifest.value || {}
  listRealPreviewIndex.value = index
  listRealPreviewManifest.value = {
    brandName: base.brandName || 'Connectyx',
    logoUrl: base.logoUrl || '',
    fallbackText: base.fallbackText || activePlaylist.value?.fallbackText || 'Contenido no disponible',
    presentation: {
      ...(base.presentation || {}),
      ...(ch.presentation || {}),
    },
    channel: {
      ...(base.channel || {}),
      showLogo: ch.showLogo !== false,
      waitForVideoEnd: ch.waitForVideoEnd !== false,
      presentation: ch.presentation || {},
    },
    waitForVideoEnd: ch.waitForVideoEnd !== false,
    defaultSlideDurationSec: ch.defaultSlideDurationSec || 12,
    mute: true,
    orientation: 'landscape',
    items: [slide],
  }
  listRealPreviewOpen.value = true
}

function closeListRealPreview() {
  listRealPreviewOpen.value = false
  listRealPreviewIndex.value = null
  listRealPreviewManifest.value = null
}

function isAutoExtraSlide(slide) {
  if (!slide) return false
  if (slide.type === 'welcome') return false
  const id = String(slide.id || '')
  if (id.startsWith('wall-')) return false
  if (slide.type === 'post' && id.startsWith('wall-')) return false
  return true
}

function extraTypeLabel(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'text') return 'Texto'
  if (t === 'image') return 'Imagen'
  if (t === 'video') return 'Video'
  if (t === 'youtube') return 'YouTube'
  if (t === 'post') return 'Pub'
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Extra'
}

function clipPreviewText(raw, max = 10) {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function autoSlideExtraTypeLabel(slide) {
  if (!slide) return 'Extra'
  if (slide.mediaKind === 'youtube' || slide.type === 'youtube') return 'YouTube'
  if (slide.type === 'post') return 'Pub'
  if (slide.type === 'text') {
    return clipPreviewText(slide.body || slide.text || slide.title, 10) || 'Texto'
  }
  if (slide.type === 'image') return 'Imagen'
  if (slide.type === 'video') return 'Video'
  if (slide.mediaKind === 'video') return 'Video'
  if (slide.mediaKind === 'image') return 'Imagen'
  return extraTypeLabel(slide.type || slide.mediaKind)
}

function listEntryExtraTypeLabel(entry) {
  if (!entry || entry.kind !== 'extra') return 'Extra'
  const ex = extraById(entry.id)
  if (ex?.type === 'text') return clipPreviewText(ex.text, 10) || 'Texto'
  return extraTypeLabel(ex?.type || 'extra')
}

function isAutoPubVideo(slide) {
  if (!slide || isAutoExtraSlide(slide)) return false
  const k = String(slide.mediaKind || slide.type || '').toLowerCase()
  return k === 'video' || k === 'youtube'
}

function isListEntryVideo(entry) {
  if (!entry || entry.kind !== 'post') return false
  const kind = slotPostMedia(postById(entry.id)).kind
  return kind === 'video' || kind === 'youtube'
}

function isAutoPubTextOnly(slide) {
  if (!slide || isAutoExtraSlide(slide) || isAutoPubVideo(slide)) return false
  const k = String(slide.mediaKind || '').toLowerCase()
  if (k === 'image' || k === 'video' || k === 'youtube') return false
  return !autoSlideThumb(slide)
}

function isListEntryTextOnly(entry) {
  if (!entry || entry.kind !== 'post' || isListEntryVideo(entry)) return false
  const kind = slotPostMedia(postById(entry.id)).kind
  return !kind || kind === 'text'
}

function autoSlideMediaOverlay(slide) {
  if (!slide) return ''
  if (isAutoExtraSlide(slide)) return autoSlideExtraTypeLabel(slide)
  if (isAutoPubVideo(slide)) return 'Video'
  if (isAutoPubTextOnly(slide)) return 'PUB sin Media'
  return ''
}

function autoSlideMediaOverlayIsQuote(slide) {
  if (!slide) return false
  return isAutoExtraSlide(slide) && slide.type === 'text'
}

function listEntryMediaOverlay(entry) {
  if (!entry) return ''
  if (entry.kind === 'extra') return listEntryExtraTypeLabel(entry)
  if (isListEntryVideo(entry)) return 'Video'
  if (isListEntryTextOnly(entry)) return 'PUB sin Media'
  return ''
}

function listEntryMediaOverlayIsQuote(entry) {
  if (!entry) return false
  return entry.kind === 'extra' && extraById(entry.id)?.type === 'text'
}

function autoSlideTitle(slide) {
  if (!slide) return '—'
  const t = String(slide.title || '').trim()
  if (t) return t
  const b = String(slide.body || slide.text || '').trim()
  return b || 'Sin título'
}

function autoSlideThumb(slide) {
  if (!slide) return ''
  if (slide.postId) {
    const t = postThumb(slide.postId)
    if (t) return t
  }
  const raw = String(slide.mediaUrl || slide.url || '').trim()
  if (!raw) return ''
  if (slide.mediaKind === 'youtube' || slide.type === 'youtube') {
    const id = youtubeId(raw)
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
  }
  return resolveMediaUrl(raw) || ''
}

function openAutoSlidePreview(slide, index = null) {
  if (!slide) return
  const ch = canalForm.value || {}
  const base = previewManifest.value || {}
  listRealPreviewIndex.value = index
  listRealPreviewManifest.value = {
    brandName: base.brandName || 'Connectyx',
    logoUrl: base.logoUrl || '',
    fallbackText: base.fallbackText || activePlaylist.value?.fallbackText || 'Contenido no disponible',
    presentation: {
      ...(base.presentation || {}),
      ...(ch.presentation || {}),
    },
    channel: {
      ...(base.channel || {}),
      showLogo: ch.showLogo !== false,
      waitForVideoEnd: ch.waitForVideoEnd !== false,
      presentation: ch.presentation || {},
    },
    waitForVideoEnd: ch.waitForVideoEnd !== false,
    defaultSlideDurationSec: ch.defaultSlideDurationSec || 12,
    mute: true,
    orientation: 'landscape',
    items: [slide],
  }
  listRealPreviewOpen.value = true
}

function canalPreviewChannelPayload() {
  if (!canalForm.value) return null
  const c = canalForm.value
  const wallIncludeEntries = normalizeWallIncludeEntriesLocal(c)
  // Plain object: no mutar canalForm (evita loops reactivos al pedir preview).
  return {
    welcomeEnabled: c.welcomeEnabled,
    welcomeText: c.welcomeText,
    welcomeDurationSec: c.welcomeDurationSec,
    welcomeEveryN: c.welcomeEveryN,
    showLogo: c.showLogo,
    defaultSlideDurationSec: c.defaultSlideDurationSec,
    waitForVideoEnd: c.waitForVideoEnd,
    extrasOnly: false,
    contentMode: c.contentMode,
    wallEnabled: c.wallEnabled,
    wallDays: c.wallDays,
    wallMax: c.wallMax,
    wallTypes: [...(c.wallTypes || [])],
    wallCategoryIds: [...(c.wallCategoryIds || [])],
    wallIncludeMemberPosts: c.wallIncludeMemberPosts,
    wallMediaOnly: c.wallMediaOnly,
    wallExcludeKnowledge: c.wallExcludeKnowledge,
    wallExcludePostIds: [...(c.wallExcludePostIds || [])],
    wallIncludeEntries,
    wallIncludePostIds: wallIncludeEntries.filter((e) => e.kind === 'post').map((e) => e.id),
    wallIncludeExtras: c.wallIncludeExtras,
    extrasPlacement: c.extrasPlacement,
    extrasEveryN: c.extrasEveryN,
    wallPostDurationSec: c.defaultSlideDurationSec,
    presentation: c.presentation ? { ...c.presentation } : undefined,
  }
}

function scheduleAutoCarouselRefresh() {
  if (autoCarouselTimer) window.clearTimeout(autoCarouselTimer)
  autoCarouselTimer = window.setTimeout(() => {
    autoCarouselTimer = null
    refreshAutoCarousel()
  }, 320)
}

async function refreshAutoCarousel() {
  if (!activePlaylistId.value || !canalForm.value) {
    autoCarouselItems.value = []
    return
  }
  if (configSection.value !== 'wall') return
  if (!canalForm.value.extrasOnly && canalForm.value.contentMode !== 'auto') return
  const seq = ++autoCarouselSeq
  autoCarouselLoading.value = true
  autoCarouselError.value = ''
  try {
    const channel = canalPreviewChannelPayload()
    const { data } = await api.post(`/admin/tv/playlists/${activePlaylistId.value}/preview`, {
      channel: {
        ...channel,
        contentMode: canalForm.value.extrasOnly ? channel.contentMode : 'auto',
        extrasOnly: Boolean(canalForm.value.extrasOnly),
      },
    })
    if (seq !== autoCarouselSeq) return
    const items = Array.isArray(data?.manifest?.items) ? data.manifest.items : []
    autoCarouselItems.value = items.filter(
      (s) => s && s.type !== 'welcome' && !String(s.id || '').startsWith('welcome') && String(s.id || '') !== 'safe',
    )
    await nextTick()
    updateWallCarouselNav()
  } catch (e) {
    if (seq !== autoCarouselSeq) return
    autoCarouselItems.value = []
    autoCarouselError.value = e?.response?.data?.error || 'No se pudo armar el carrusel automático'
  } finally {
    if (seq === autoCarouselSeq) autoCarouselLoading.value = false
  }
}

function buildAutoCarouselConfigKey() {
  const c = canalForm.value
  if (!c) return ''
  // Carrusel de resultado: modo automático, o “solo extras”
  if (!c.extrasOnly && c.contentMode !== 'auto') return ''
  const p = activePlaylist.value
  const extrasStamp = (p?.items || [])
    .map((it) => `${it.id || ''}:${it.type || ''}:${it.durationSec || ''}:${it.text || ''}:${it.url || ''}:${it.postId || ''}`)
    .join('|')
  return JSON.stringify({
    pid: activePlaylistId.value,
    version: p?.version || 0,
    extrasStamp,
    wallEnabled: c.wallEnabled,
    wallIncludeMemberPosts: c.wallIncludeMemberPosts,
    wallDays: c.wallDays,
    wallMax: c.wallMax,
    wallMediaOnly: c.wallMediaOnly,
    wallExcludeKnowledge: c.wallExcludeKnowledge,
    wallTypes: [...(c.wallTypes || [])].sort(),
    wallCategoryIds: [...(c.wallCategoryIds || [])].sort(),
    wallExcludePostIds: [...(c.wallExcludePostIds || [])].sort(),
    wallIncludeExtras: c.wallIncludeExtras,
    extrasPlacement: c.extrasPlacement,
    extrasEveryN: c.extrasEveryN,
    extrasOnly: c.extrasOnly,
    defaultSlideDurationSec: c.defaultSlideDurationSec,
    waitForVideoEnd: c.waitForVideoEnd,
  })
}

let autoCarouselWatchedKey = ''

const listInsertPreview = computed(() => {
  if (listPickId.value) {
    const post = postById(listPickId.value)
    if (!post) return null
    const media = slotPostMedia(post)
    return {
      badge: post.tipo || 'pub',
      kind: media.kind || 'text',
      src: media.src || '',
      embed: media.embed || '',
      title: post.titulo || 'Publicación',
      meta: post.tipo || '',
      durationSec: canalForm.value?.defaultSlideDurationSec || 12,
      textAlign: 'center',
      textValign: 'center',
      textScale: 'md',
      showBrand: true,
      showTextLogo: false,
    }
  }
  if (listPickExtraId.value) {
    const ex = extraById(listPickExtraId.value) || extraOptionsAvailable.value.find((x) => x.id === listPickExtraId.value)
    if (!ex) return null
    if (ex.type === 'post') {
      const post = postById(ex.postId)
      const media = slotPostMedia(post)
      return {
        badge: `extra · ${post?.tipo || 'post'}`,
        kind: media.kind || 'text',
        src: media.src || '',
        embed: media.embed || '',
        title: post?.titulo || slotPreviewLabel(ex),
        meta: post?.tipo || '',
        durationSec: ex.durationSec || 15,
        textAlign: 'center',
        textValign: 'center',
        textScale: 'md',
        showBrand: true,
        showTextLogo: false,
      }
    }
    if (ex.type === 'image' || ex.type === 'video') {
      return {
        badge: `extra · ${ex.type}`,
        kind: ex.type,
        src: resolveMediaUrl(ex.url || '') || '',
        embed: '',
        title: slotPreviewLabel(ex),
        meta: '',
        durationSec: ex.durationSec || 15,
      }
    }
    if (ex.type === 'youtube') {
      return {
        badge: 'extra · youtube',
        kind: 'youtube',
        src: '',
        embed: youtubeEmbedUrl(ex.url, { autoplay: 0, mute: 1, controls: 1 }) || '',
        title: slotPreviewLabel(ex),
        meta: '',
        durationSec: ex.durationSec || 15,
      }
    }
    return {
      badge: 'extra · text',
      kind: 'text',
      src: '',
      embed: '',
      title: String(ex.text || '').trim() || 'Texto en pantalla',
      meta: '',
      durationSec: ex.durationSec || 15,
      textAlign: ['left', 'center', 'right'].includes(ex.textAlign) ? ex.textAlign : 'center',
      textValign: ['top', 'center', 'bottom'].includes(ex.textValign) ? ex.textValign : 'center',
      textScale: ['sm', 'md', 'lg'].includes(ex.textScale) ? ex.textScale : 'md',
      showBrand: ex.showBrand !== false,
      showTextLogo: Boolean(ex.showTextLogo),
    }
  }
  return null
})

function onWallCardImgError(e) {
  if (e?.target) e.target.style.display = 'none'
}

function updateWallCarouselNav() {
  const el = wallCarouselEl.value
  if (!el) {
    wallCarouselCanPrev.value = false
    wallCarouselCanNext.value = false
    return
  }
  const max = Math.max(0, el.scrollWidth - el.clientWidth - 2)
  wallCarouselCanPrev.value = el.scrollLeft > 2
  wallCarouselCanNext.value = el.scrollLeft < max
}

function onWallCarouselScroll() {
  updateWallCarouselNav()
}

function scrollWallCarousel(dir) {
  const el = wallCarouselEl.value
  if (!el) return
  const card = el.querySelector('.wall-card')
  const step = card ? card.getBoundingClientRect().width + 28 : el.clientWidth * 0.7
  el.scrollBy({ left: dir * step, behavior: 'smooth' })
  window.setTimeout(updateWallCarouselNav, 280)
}

function openListInsert(at = 0) {
  if (!canalForm.value) return
  listInsertAt.value = Math.max(0, Math.min(Number(at) || 0, canalForm.value.wallIncludeEntries.length))
  listPickId.value = ''
  listPickExtraId.value = ''
  listInsertOpen.value = true
}

function closeListInsert() {
  listInsertOpen.value = false
  listPickId.value = ''
  listPickExtraId.value = ''
}

function focusWallCarouselCard(index) {
  const el = wallCarouselEl.value
  if (!el || index == null || index < 0) return
  const cards = el.querySelectorAll('.wall-card')
  const card = cards?.[index]
  if (!card) return
  const trackRect = el.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const delta =
    cardRect.left - trackRect.left - (trackRect.width - cardRect.width) / 2
  el.scrollBy({ left: delta, behavior: 'smooth' })
  wallCarouselFocusIndex.value = index
  try {
    card.focus({ preventScroll: true })
  } catch {
    /* ignore */
  }
  if (wallCarouselFocusTimer) window.clearTimeout(wallCarouselFocusTimer)
  wallCarouselFocusTimer = window.setTimeout(() => {
    if (wallCarouselFocusIndex.value === index) wallCarouselFocusIndex.value = null
    wallCarouselFocusTimer = null
  }, 2200)
  window.setTimeout(updateWallCarouselNav, 280)
}

function confirmListInsert() {
  if (!canalForm.value) return
  let entry = null
  if (listPickId.value) entry = { kind: 'post', id: String(listPickId.value) }
  else if (listPickExtraId.value) entry = { kind: 'extra', id: String(listPickExtraId.value) }
  if (!entry) return
  const arr = canalForm.value.wallIncludeEntries
  if (arr.some((e) => e.kind === entry.kind && e.id === entry.id)) {
    const existing = arr.findIndex((e) => e.kind === entry.kind && e.id === entry.id)
    closeListInsert()
    nextTick(() => {
      requestAnimationFrame(() => focusWallCarouselCard(existing))
    })
    return
  }
  const at = Math.max(0, Math.min(listInsertAt.value, arr.length))
  arr.splice(at, 0, entry)
  syncWallIncludePostIdsFromEntries()
  closeListInsert()
  nextTick(() => {
    // Esperar a que el modal cierre y el carrusel pinte la nueva diapo
    requestAnimationFrame(() => {
      requestAnimationFrame(() => focusWallCarouselCard(at))
    })
  })
}

function syncWallIncludePostIdsFromEntries() {
  if (!canalForm.value) return
  canalForm.value.wallIncludePostIds = (canalForm.value.wallIncludeEntries || [])
    .filter((e) => e.kind === 'post')
    .map((e) => e.id)
}

function askRemoveFromList(i) {
  if (!canalForm.value?.wallIncludeEntries?.[i]) return
  listRemoveIndex.value = i
  listRemoveOpen.value = true
}

function closeListRemove() {
  listRemoveOpen.value = false
  listRemoveIndex.value = null
}

function confirmRemoveFromList() {
  const i = listRemoveIndex.value
  const arr = canalForm.value?.wallIncludeEntries
  if (arr && i != null && i >= 0 && i < arr.length) arr.splice(i, 1)
  syncWallIncludePostIdsFromEntries()
  closeListRemove()
  nextTick(updateWallCarouselNav)
}

function onListDragStart(i, e) {
  listDragFrom.value = i
  listDragOver.value = i
  try {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  } catch {
    /* ignore */
  }
}

function onListDragOver(i, e) {
  if (listDragFrom.value == null) return
  e.dataTransfer.dropEffect = 'move'
  listDragOver.value = i
}

function onListDragLeave(i) {
  if (listDragOver.value === i) listDragOver.value = null
}

function onListDrop(i) {
  const from = listDragFrom.value
  const arr = canalForm.value?.wallIncludeEntries
  if (from == null || !arr || from === i || from < 0 || from >= arr.length) {
    onListDragEnd()
    return
  }
  const [item] = arr.splice(from, 1)
  const to = Math.max(0, Math.min(i, arr.length))
  arr.splice(to, 0, item)
  syncWallIncludePostIdsFromEntries()
  onListDragEnd()
}

function onListDragEnd() {
  listDragFrom.value = null
  listDragOver.value = null
}

function slotPreviewMediaSrc(url) {
  return resolveMediaUrl(url)
}

function slotPreviewYoutubeEmbed(url) {
  return youtubeEmbedUrl(url, { autoplay: 0, mute: 1, controls: 1 }) || ''
}

function slotPreviewPost(postId) {
  if (!postId) return null
  return postOptions.value.find((p) => p.id === postId) || null
}

function slotPostMedia(post) {
  if (!post) return { kind: '', src: '', embed: '' }
  const raw =
    post.mediaUrl ||
    post.imageUrl ||
    postImageUrls(post)[0] ||
    (Array.isArray(post.imageUrls) ? post.imageUrls[0] : '') ||
    ''
  const kind = post.mediaKind || (youtubeId(raw) ? 'youtube' : /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(raw) ? 'video' : raw ? 'image' : '')
  if (kind === 'youtube') {
    const id = youtubeId(raw)
    return {
      kind: 'youtube',
      src: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '',
      embed: youtubeEmbedUrl(raw, { autoplay: 0, mute: 1, controls: 1 }) || '',
    }
  }
  if (kind === 'video') return { kind: 'video', src: resolveMediaUrl(raw), embed: '' }
  if (kind === 'image' || raw) return { kind: 'image', src: resolveMediaUrl(raw), embed: '' }
  return { kind: '', src: '', embed: '' }
}

function slotPreviewPostMedia(postId) {
  return slotPostMedia(slotPreviewPost(postId))
}

function onSlotPreviewMediaError(e) {
  if (e?.target) e.target.style.display = 'none'
}

watch(
  () => [configSection.value, canalForm.value?.contentMode, canalForm.value?.wallIncludeEntries?.length],
  async () => {
    if (configSection.value !== 'wall' || canalForm.value?.contentMode !== 'list') return
    await nextTick()
    updateWallCarouselNav()
  },
)

watch(
  () => [
    configSection.value,
    canalForm.value?.contentMode,
    canalForm.value?.extrasOnly,
    buildAutoCarouselConfigKey(),
  ],
  ([section, mode, extrasOnly, key]) => {
    const showAutoCarousel = Boolean(extrasOnly) || mode === 'auto'
    if (section !== 'wall' || !showAutoCarousel || !key) {
      autoCarouselWatchedKey = ''
      return
    }
    if (key === autoCarouselWatchedKey) return
    autoCarouselWatchedKey = key
    scheduleAutoCarouselRefresh()
  },
)

async function loadStatus() {
  try {
    const { data } = await api.get('/admin/tv/status')
    statusInfo.value = data
  } catch {
    statusInfo.value = { tvMode: false, devicesActive: 0, devicesTotal: 0, playlists: 0 }
  }
}

async function load() {
  error.value = ''
  try {
    const [d, p, cats] = await Promise.all([
      api.get('/admin/tv/devices'),
      api.get('/admin/tv/playlists'),
      api.get('/admin/tv/categories').catch(() => ({ data: { items: [] } })),
      loadStatus(),
    ])
    devices.value = d.data.items || []
    playlists.value = p.data.items || []
    categoryOptions.value = cats.data.items || []
    if (!activePlaylistId.value && playlists.value[0]) {
      activePlaylistId.value = playlists.value[0].id
    }
    if (activePlaylistId.value && !playlists.value.some((x) => x.id === activePlaylistId.value)) {
      activePlaylistId.value = playlists.value[0]?.id || ''
    }
    loadCanalForm()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function refreshPosts() {
  try {
    const includeMember = canalForm.value?.wallIncludeMemberPosts ? '1' : '0'
    const { data } = await api.get('/admin/tv/posts', { params: { includeMember } })
    postOptions.value = data.items || []
  } catch {
    postOptions.value = []
  }
}

async function activate() {
  toggling.value = true
  error.value = ''
  try {
    await api.post('/admin/tv/activate')
    msg.value = 'Módulo TV activado'
    await loadStatus()
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo activar'
  } finally {
    toggling.value = false
  }
}

async function deactivate() {
  if (
    !confirm(
      '¿Desactivar Modo TV? Se desvinculan todas las pantallas: dejan de mostrar contenido y hay que volver a emparejarlas al reactivar.',
    )
  ) {
    return
  }
  toggling.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/tv/deactivate')
    const n = Number(data?.devicesRevoked) || 0
    msg.value =
      n > 0
        ? `Módulo TV desactivado. Se desvincularon ${n} pantalla${n === 1 ? '' : 's'}.`
        : 'Módulo TV desactivado. No había pantallas vinculadas.'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo desactivar'
  } finally {
    toggling.value = false
  }
}

async function revoke(d) {
  if (!confirm(`¿Desvincular ${d.name}? La TV va a pedir un código nuevo.`)) return
  await api.post(`/admin/tv/devices/${d.id}/revoke`)
  await load()
}

async function assignPlaylist(d, playlistId) {
  await api.patch(`/admin/tv/devices/${d.id}`, { playlistId: playlistId || null })
  await load()
}

async function toggleMute(d) {
  await api.patch(`/admin/tv/devices/${d.id}`, { mute: !d.mute })
  await load()
}

async function saveCanal() {
  if (!activePlaylistId.value || !canalForm.value) return false
  if (savingCanal.value) return false
  savingCanal.value = true
  error.value = ''
  try {
    syncWallIncludePostIdsFromEntries()
    const ch = {
      ...canalForm.value,
      extrasOnly: false,
      wallPostDurationSec: canalForm.value.defaultSlideDurationSec,
      wallIncludeEntries: normalizeWallIncludeEntriesLocal(canalForm.value),
      wallIncludePostIds: (canalForm.value.wallIncludeEntries || [])
        .filter((e) => e.kind === 'post')
        .map((e) => e.id),
    }
    await api.patch(`/admin/tv/playlists/${activePlaylistId.value}`, {
      channel: ch,
      audience: normalizeAudienceDraft(audienceDraft.value),
    })
    msg.value = 'Configuración guardada'
    await load()
    if (previewOpen.value) await loadPreview()
    return true
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar el canal'
    return false
  } finally {
    savingCanal.value = false
  }
}

/** Al cambiar de sección, guarda primero (igual que Guardar). Si falla, no cambia. */
async function selectConfigSection(id) {
  if (!id || configSection.value === id) return
  if (activePlaylistId.value && canalForm.value) {
    const ok = await saveCanal()
    if (!ok) return
  }
  configSection.value = id
}

function openUiPreview(kind) {
  uiPreviewKind.value = kind
  slotPreviewItem.value = null
  uiPreviewOpen.value = true
}

function openSlotPreview(it) {
  const type = it?.type || 'text'
  const textStyle =
    type === 'text'
      ? {
          textAlign: ['left', 'center', 'right'].includes(it?.textAlign) ? it.textAlign : 'center',
          textValign: ['top', 'center', 'bottom'].includes(it?.textValign) ? it.textValign : 'center',
          textScale: ['sm', 'md', 'lg'].includes(it?.textScale) ? it.textScale : 'md',
          showBrand: it?.showBrand !== false,
          showTextLogo: Boolean(it?.showTextLogo),
        }
      : {}
  slotPreviewItem.value = {
    type,
    text: it?.text || '',
    url: it?.url || '',
    postId: it?.postId || '',
    durationSec: it?.durationSec || 15,
    ...textStyle,
  }
  uiPreviewKind.value = 'slot'
  uiPreviewOpen.value = true
}

function closeChannelPreview() {
  previewOpen.value = false
  previewShowPlaylist.value = false
}

async function openPreview() {
  const p = playlists.value.find((x) => x.id === activePlaylistId.value)
  previewChannelName.value = p?.name || ''
  previewOpen.value = true
  await loadPreview()
}

async function openPreviewForPlaylist(p) {
  if (!p?.id) return
  activePlaylistId.value = p.id
  previewChannelName.value = p.name || ''
  loadCanalForm()
  previewOpen.value = true
  await loadPreview()
}

function devicesForChannel(playlistId) {
  if (!playlistId) return []
  return devices.value.filter(
    (d) => d.playlistId === playlistId && d.status !== 'revoked',
  )
}

function channelPubsCount(p) {
  const ch = p?.channel || {}
  if (ch.wallEnabled === false) return 0
  if (ch.contentMode === 'list') {
    const entries = Array.isArray(ch.wallIncludeEntries) ? ch.wallIncludeEntries : null
    if (entries) return entries.length
    return Array.isArray(ch.wallIncludePostIds) ? ch.wallIncludePostIds.length : 0
  }
  return Number(ch.wallMax) || 0
}

/** Cómo arma el contenido: Automático | Seleccionadas | Solo extras */
function channelContentModeLabel(p) {
  const ch = p?.channel || {}
  if (ch.extrasOnly) return 'Solo extras'
  if (ch.contentMode === 'list') return 'Seleccionadas'
  return 'Automático'
}

function channelWelcomeLabel(p) {
  const ch = p?.channel || {}
  if (ch.welcomeEnabled === false) return 'Off'
  return `On · ${ch.welcomeDurationSec || 10}s · cada ${ch.welcomeEveryN || 5}`
}

function goToConfigChannel(p) {
  if (!p?.id) return
  activePlaylistId.value = p.id
  loadCanalForm()
  tab.value = 'config'
  msg.value = `Canal seleccionado: ${p.name}`
  error.value = ''
}

function askToggleCanal(p) {
  if (!p?.id || togglingCanalId.value === p.id) return
  canalToggleTarget.value = p
  canalToggleNextActivo.value = p.activo === false
  canalToggleOpen.value = true
}

function closeCanalToggle() {
  if (togglingCanalId.value) return
  canalToggleOpen.value = false
  canalToggleTarget.value = null
}

async function confirmToggleCanal() {
  const p = canalToggleTarget.value
  if (!p?.id || togglingCanalId.value === p.id) return
  const next = canalToggleNextActivo.value
  togglingCanalId.value = p.id
  error.value = ''
  try {
    await api.patch(`/admin/tv/playlists/${p.id}`, { activo: next })
    msg.value = next ? `Canal «${p.name}» activado` : `Canal «${p.name}» desactivado`
    canalToggleOpen.value = false
    canalToggleTarget.value = null
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cambiar el estado del canal'
  } finally {
    togglingCanalId.value = ''
  }
}

function backToCanales() {
  slotsFromCanales.value = false
  slotsFocusId.value = ''
  tab.value = 'canales'
  msg.value = ''
}

async function goToSlotsChannel(p) {
  if (!p?.id) return
  activePlaylistId.value = p.id
  slotsFocusId.value = p.id
  slotsFromCanales.value = true
  loadCanalForm()
  tab.value = 'config'
  configSection.value = 'slots'
  msg.value = ''
  error.value = ''
  await nextTick()
  const el = document.querySelector(`[data-slot-canal="${p.id}"]`)
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

function previewFailMessage(e) {
  const data = e?.response?.data
  return (
    data?.error ||
    data?.message ||
    (e?.code === 'ERR_NETWORK' ? 'Sin conexión con el API (¿está corriendo el backend?)' : '') ||
    e?.message ||
    'No se pudo generar la vista previa'
  )
}

async function loadPreview() {
  if (!activePlaylistId.value) {
    previewError.value = 'Elegí un canal primero'
    previewManifest.value = null
    return
  }
  previewLoading.value = true
  previewError.value = ''
  error.value = ''
  try {
    const p = playlists.value.find((x) => x.id === activePlaylistId.value)
    if (!previewChannelName.value) previewChannelName.value = p?.name || ''
    const payload = {}
    const channel = canalPreviewChannelPayload()
    if (channel) payload.channel = channel
    // Si el editor de diapositivas extras está abierto para este canal, usar el borrador
    if (editorOpen.value && editing.value?.id === activePlaylistId.value) {
      payload.items = form.items
      if (form.fallbackText != null) payload.fallbackText = form.fallbackText
    } else if (slotEditorOpen.value && slotEditorPlaylist.value?.id === activePlaylistId.value) {
      const base = [...(slotEditorPlaylist.value.items || [])]
      const draft = serializeSlot(slotDraft)
      if (slotEditorIndex.value == null) base.push(draft)
      else base[slotEditorIndex.value] = { ...base[slotEditorIndex.value], ...draft }
      payload.items = base
    }
    const { data } = await api.post(`/admin/tv/playlists/${activePlaylistId.value}/preview`, payload)
    const manifest = data?.manifest || null
    previewManifest.value = manifest
      ? {
          ...manifest,
          fallbackText: manifest.fallbackText || p?.fallbackText || form.fallbackText || 'Contenido no disponible',
        }
      : null
    previewItems.value = Array.isArray(manifest?.items) ? manifest.items : []
  } catch (e) {
    previewError.value = previewFailMessage(e)
    previewItems.value = []
    previewManifest.value = null
  } finally {
    previewLoading.value = false
  }
}

function emptySlot(overrides = {}) {
  return {
    id: '',
    type: 'text',
    text: '',
    url: '',
    postId: '',
    durationSec: 15,
    textAlign: 'center',
    textValign: 'center',
    textScale: 'md',
    showBrand: true,
    showTextLogo: false,
    ...overrides,
  }
}

function serializeSlot(it, order = 0) {
  const base = {
    id: it?.id || undefined,
    type: it.type,
    url: it.url || '',
    text: it.text || '',
    postId: it.type === 'post' ? it.postId || null : null,
    durationSec: it.durationSec || 15,
    order,
  }
  if (it.type !== 'text') return base
  return {
    ...base,
    textAlign: ['left', 'center', 'right'].includes(it.textAlign) ? it.textAlign : 'center',
    textValign: ['top', 'center', 'bottom'].includes(it.textValign) ? it.textValign : 'center',
    textScale: ['sm', 'md', 'lg'].includes(it.textScale) ? it.textScale : 'md',
    showBrand: it.showBrand !== false,
    showTextLogo: Boolean(it.showTextLogo),
  }
}

function assignSlotDraft(it = {}) {
  slotDraft.id = it.id || ''
  slotDraft.type = it.type || 'text'
  slotDraft.text = it.text || ''
  slotDraft.url = it.url || ''
  slotDraft.postId = it.postId || ''
  slotDraft.durationSec = it.durationSec || 15
  slotDraft.textAlign = ['left', 'center', 'right'].includes(it.textAlign) ? it.textAlign : 'center'
  slotDraft.textValign = ['top', 'center', 'bottom'].includes(it.textValign) ? it.textValign : 'center'
  slotDraft.textScale = ['sm', 'md', 'lg'].includes(it.textScale) ? it.textScale : 'md'
  slotDraft.showBrand = it.showBrand !== false
  slotDraft.showTextLogo = Boolean(it.showTextLogo)
}

function pushEmptySlot() {
  form.items.push(emptySlot())
}

function slotPreviewLabel(it) {
  if (!it) return '—'
  if (it.type === 'post') return postTitle(it.postId) || 'Publicación'
  if (it.type === 'text') return (it.text || '').trim() || 'Texto vacío'
  return (it.url || '').trim() || it.type
}

function openNewPlaylist() {
  tab.value = 'canales'
  editing.value = null
  form.name = 'Canal sede'
  form.fallbackText = 'Contenido no disponible'
  form.items = [emptySlot({ text: 'Seguí las novedades en esta pantalla', durationSec: 8 })]
  form.audience = emptyAudience()
  editorOpen.value = true
  refreshPosts()
}

function editCanalMeta(p) {
  if (!p?.id) return
  canalMetaEditing.value = p
  canalMetaForm.name = p.name || ''
  canalMetaForm.fallbackText = p.fallbackText || ''
  canalMetaOpen.value = true
  error.value = ''
  msg.value = ''
}

async function saveCanalMeta() {
  if (!canalMetaEditing.value?.id) return
  savingCanalMeta.value = true
  error.value = ''
  try {
    await api.patch(`/admin/tv/playlists/${canalMetaEditing.value.id}`, {
      name: canalMetaForm.name,
      fallbackText: canalMetaForm.fallbackText,
    })
    canalMetaOpen.value = false
    msg.value = 'Canal actualizado'
    await load()
    if (activePlaylistId.value === canalMetaEditing.value.id) loadCanalForm()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar el canal'
  } finally {
    savingCanalMeta.value = false
  }
}

function editSlot(p, index) {
  if (!p?.id || index == null || index < 0) return
  const it = p.items?.[index]
  if (!it) return
  slotEditorPlaylist.value = p
  slotEditorIndex.value = index
  assignSlotDraft(it)
  slotEditorError.value = ''
  slotEditorOpen.value = true
  error.value = ''
  msg.value = ''
  refreshPosts()
}

function addSlotToPlaylist(p) {
  if (!p?.id) return
  slotEditorPlaylist.value = p
  slotEditorIndex.value = null
  assignSlotDraft(emptySlot())
  slotEditorError.value = ''
  slotEditorOpen.value = true
  error.value = ''
  msg.value = ''
  refreshPosts()
}

function validateSlotDraft() {
  const t = slotDraft.type
  if (t === 'text' && !String(slotDraft.text || '').trim()) {
    return 'Escribí el texto de la diapo.'
  }
  if (t === 'post' && !slotDraft.postId) {
    return 'Elegí una publicación.'
  }
  if ((t === 'image' || t === 'video' || t === 'youtube') && !String(slotDraft.url || '').trim()) {
    return t === 'youtube'
      ? 'Pegá la URL de YouTube.'
      : 'La imagen/video necesita una URL (pegala o subí un archivo).'
  }
  return ''
}

async function onSlotFileSelected(e) {
  const file = e?.target?.files?.[0]
  if (!file) return
  uploadingSlotFile.value = true
  slotEditorError.value = ''
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/tv/upload', fd)
    const url = data?.url || data?.urls?.[0] || ''
    if (!url) throw new Error('Sin URL de media')
    slotDraft.url = url
    if (data?.kind === 'video' || String(file.type || '').startsWith('video/')) slotDraft.type = 'video'
    else if (data?.kind === 'image' || String(file.type || '').startsWith('image/')) slotDraft.type = 'image'
  } catch (err) {
    slotEditorError.value = err?.response?.data?.error || err?.message || 'No se pudo subir el archivo'
  } finally {
    uploadingSlotFile.value = false
    if (e?.target) e.target.value = ''
  }
}

function buildPlaylistItemsFromSlotEditor({ remove = false } = {}) {
  const base = [...(slotEditorPlaylist.value?.items || [])]
  if (remove) {
    if (slotEditorIndex.value == null) return base
    base.splice(slotEditorIndex.value, 1)
  } else if (slotEditorIndex.value == null) {
    base.push({ ...serializeSlot(slotDraft, base.length) })
  } else {
    const prev = base[slotEditorIndex.value] || {}
    base[slotEditorIndex.value] = {
      ...prev,
      ...serializeSlot(slotDraft, slotEditorIndex.value),
      id: prev.id || slotDraft.id || undefined,
    }
  }
  return base.map((it, order) => serializeSlot(it, order))
}

async function saveSlotEditor() {
  if (!slotEditorPlaylist.value?.id) return
  const invalid = validateSlotDraft()
  if (invalid) {
    slotEditorError.value = invalid
    return
  }
  savingSlot.value = true
  slotEditorError.value = ''
  error.value = ''
  try {
    await api.patch(`/admin/tv/playlists/${slotEditorPlaylist.value.id}`, {
      items: buildPlaylistItemsFromSlotEditor(),
    })
    slotEditorOpen.value = false
    msg.value = slotEditorIndex.value == null ? 'Diapo extra creada' : 'Diapo extra actualizada'
    await load()
  } catch (e) {
    slotEditorError.value = e?.response?.data?.error || 'No se pudo guardar la diapo extra'
  } finally {
    savingSlot.value = false
  }
}

function askRemoveSlot() {
  if (slotEditorIndex.value == null) return
  slotDeleteOpen.value = true
}

function closeSlotDelete() {
  if (savingSlot.value) return
  slotDeleteOpen.value = false
}

async function confirmRemoveSlot() {
  if (!slotEditorPlaylist.value?.id || slotEditorIndex.value == null) return
  savingSlot.value = true
  error.value = ''
  try {
    await api.patch(`/admin/tv/playlists/${slotEditorPlaylist.value.id}`, {
      items: buildPlaylistItemsFromSlotEditor({ remove: true }),
    })
    slotDeleteOpen.value = false
    slotEditorOpen.value = false
    msg.value = 'Diapo extra eliminada'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo eliminar la diapo extra'
  } finally {
    savingSlot.value = false
  }
}

async function savePlaylist() {
  const payload = {
    name: form.name,
    fallbackText: form.fallbackText,
    audience: normalizeAudienceDraft(form.audience),
    items: form.items.map((it, order) => serializeSlot(it, order)),
  }
  const { data } = await api.post('/admin/tv/playlists', payload)
  const newId = data?.playlist?.id
  if (newId) activePlaylistId.value = newId
  tab.value = 'config'
  configSection.value = 'slots'
  editorOpen.value = false
  await load()
}

watch(activePlaylistId, () => loadCanalForm())

onMounted(async () => {
  await load()
  await refreshPosts()
})
</script>

<style scoped>
.page { padding: 1.25rem; }
.page-head { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; margin-bottom: 0.75rem; align-items: start; }
.page-sub {
  margin: 0.2rem 0 0;
  white-space: nowrap;
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.3;
}
.tabs {
  display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.1rem;
  padding: 0.25rem; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line);
}
.tab {
  border: 0; background: transparent; color: var(--ink-soft); font-weight: 700; font-size: 0.88rem;
  padding: 0.5rem 0.85rem; border-radius: 9px; cursor: pointer;
}
.tab.on { background: var(--panel); color: var(--ink); box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 12%, transparent); }
.status-card { margin-bottom: 0.85rem; }
.status-row { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; }
.status-label { margin: 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-faint); }
.status-value { margin: 0.2rem 0 0.35rem; font-size: 1.6rem; font-weight: 800; }
.status-value.is-on { color: var(--ok, #047857); }
.status-value.is-off { color: var(--bad, #b91c1c); }
.status-actions { display: flex; gap: 0.5rem; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65rem; margin-bottom: 0.85rem; }
@media (max-width: 700px) {
  .stats { grid-template-columns: 1fr; }
}
.stat {
  background: var(--panel-2); border: 1px solid var(--line); border-radius: 12px; padding: 0.85rem 1rem;
  display: grid; gap: 0.2rem;
}
.stat strong { font-size: 1.4rem; }
.stat span { font-size: 0.82rem; color: var(--ink-soft); }
.tab-intro--row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: flex-start;
  justify-content: space-between;
}
.tab-intro--row > p { flex: 1 1 16rem; }
.tab-intro--row > .btn-primary { flex: 0 0 auto; }
.tab-intro {
  margin: 0 0 0.85rem;
  padding: 0.7rem 0.95rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
}
.tab-intro p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink-soft);
}
.tab-intro code {
  font-size: 0.85em;
}
.tab-lead { margin: 0 0 0.85rem; }
.warn-inline {
  margin: 0; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.88rem; line-height: 1.4;
  background: color-mix(in srgb, #b45309 12%, transparent); color: #92400e;
}
.btn-ghost, .btn-primary {
  border: 0; border-radius: 10px; padding: 0.45rem 0.9rem; cursor: pointer; font-weight: 600;
  text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
  white-space: nowrap;
}
.btn-ghost { background: var(--panel-2); color: var(--ink); border: 1px solid var(--line); }
.btn-ghost.on { background: var(--line); }
.btn-ghost.danger { color: var(--bad); }
.btn-primary { background: var(--brand, #6b5bf0); color: #fff; }

.howto { display: grid; gap: 0.9rem; width: 100%; max-width: none; box-sizing: border-box; }
.howto__hero {
  padding: 0.7rem 0.95rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background:
    radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--brand, #6b5bf0) 14%, transparent), transparent 55%),
    var(--panel-2);
}
.howto__hero p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink-soft);
  max-width: none;
}
.howto__hero code,
.howto__path {
  font-size: 0.84em;
  padding: 0.12em 0.4em;
  border-radius: 5px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink);
  word-break: break-all;
}
.howto__alert {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  font-size: 0.88rem;
  line-height: 1.4;
  border: 1px solid color-mix(in srgb, #b45309 35%, var(--line));
  background: color-mix(in srgb, #b45309 12%, var(--panel-2));
  color: #92400e;
}
:root:not([data-theme='light']) .howto__alert { color: #fbbf24; }
.howto__link {
  padding: 0.95rem 1.05rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--panel);
  display: grid;
  gap: 0.65rem;
}
.howto__link-head h3 {
  margin: 0 0 0.2rem;
  font-size: 0.95rem;
}
.howto__link-head p {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.howto__link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: stretch;
}
.howto__input {
  flex: 1 1 14rem;
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: var(--panel-2);
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
}
.howto__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}
@media (max-width: 900px) {
  .howto__steps { grid-template-columns: 1fr; }
}
.howto__step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
}
.howto__num {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.82rem;
  font-weight: 800;
  background: var(--brand, #6b5bf0);
  color: #fff;
  flex-shrink: 0;
}
.howto__step h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
}
.howto__step p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--ink-soft);
}
.howto__note {
  padding: 0.8rem 0.95rem;
  border-radius: 12px;
  border: 1px dashed var(--line-2);
  background: transparent;
}
.howto__note-title {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.82rem;
}
.howto__note p,
.howto__note-line {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--ink-soft);
  white-space: nowrap;
}
.howto__note-line strong {
  display: inline;
  font-weight: 700;
  color: var(--ink);
}
@media (max-width: 600px) {
  .howto__link-row .btn-ghost,
  .howto__link-row .btn-primary { flex: 1 1 auto; }
}
.canal-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.canal-bar__select {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  min-width: 12rem;
}
.canal-bar__current {
  flex: 1 1 14rem;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 0.45rem 0.65rem;
  text-align: center;
  min-width: 0;
}
.canal-bar__current-label {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--muted, #94a3b8);
}
.canal-bar__current-label::before {
  content: '— ';
  letter-spacing: 0;
}
.canal-bar__current-label::after {
  content: ':';
}
.canal-bar__current-name {
  font-size: clamp(1.35rem, 2.6vw, 1.85rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
  line-height: 1.15;
  word-break: break-word;
}
.canal-bar__actions {
  display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-left: auto;
}
.canal-bar label { display: grid; gap: 0.25rem; font-size: 0.85rem; }
.canal-bar select, .canal-bar input, .config-panel__body .cfg-field input, .config-panel__body .cfg-field select, .config-panel__body > select, .list-picker select,
.card input, .card select {
  padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid var(--line-2);
  background: var(--panel); color: var(--ink);
}
.config-layout {
  display: grid;
  grid-template-columns: minmax(9rem, 20%) minmax(0, 80%);
  gap: 0.85rem;
  align-items: start;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel-2);
  padding: 0.65rem;
  min-height: 18rem;
  transition: grid-template-columns 0.18s ease;
}
.config-layout--nav-collapsed {
  grid-template-columns: auto minmax(0, 1fr);
}
.config-nav-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  border-right: 1px solid var(--line);
  padding-right: 0.45rem;
}
.config-layout--nav-collapsed .config-nav-wrap {
  border-right: 1px solid var(--line);
  padding-right: 0.25rem;
  max-width: 2.75rem;
}
.config-nav__toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--panel);
  color: var(--ink);
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  text-align: left;
}
.config-nav__toggle:hover {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 45%, var(--line));
  color: var(--brand, #6b5bf0);
}
.config-nav__chev {
  flex: 0 0 auto;
  width: 1.1rem;
  text-align: center;
  font-size: 1.05rem;
  line-height: 1;
}
.config-nav__toggle-text {
  min-width: 0;
}
.config-nav__toggle-current {
  display: none;
}
.config-layout--nav-collapsed .config-nav__toggle {
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-height: 5.5rem;
  padding: 0.45rem 0.2rem;
}
.config-layout--nav-collapsed .config-nav__toggle-current {
  display: block;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  max-height: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.config-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.15rem 0.1rem 0.25rem;
  min-width: 0;
}
.config-nav__item {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  text-align: left;
  font-weight: 700;
  font-size: 0.86rem;
  line-height: 1.3;
  padding: 0.55rem 0.65rem;
  border-radius: 9px;
  cursor: pointer;
}
.config-nav__item:hover { background: color-mix(in srgb, var(--panel) 70%, transparent); color: var(--ink); }
.config-nav__item:disabled { opacity: 0.55; cursor: wait; }
.config-nav__item.on {
  background: var(--panel);
  color: var(--ink);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 10%, transparent);
}
.config-panel {
  min-width: 0;
  padding: 0.25rem 0.45rem 0.45rem;
}
.config-panel__body {
  display: grid;
  gap: 0.55rem;
}
.config-panel__body--slots {
  gap: 0.75rem;
}
.config-panel__body--slots .card {
  margin: 0;
}
.cfg-section-lead {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.35;
}
.welcome-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.85fr);
  gap: 0.85rem 1.25rem;
  align-items: start;
}
.welcome-cols__main,
.welcome-cols__logo {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}
@media (max-width: 720px) {
  .welcome-cols { grid-template-columns: 1fr; }
}
.wall-soon {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  width: 100%;
  margin: 0.35rem 0 0.5rem;
  padding: 1.6rem 1.25rem 1.5rem;
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--brand, #6b5bf0) 35%, var(--line));
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--brand, #6b5bf0) 12%, transparent), transparent 55%),
    var(--panel);
  text-align: center;
}
.wall-soon__icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  margin-bottom: 0.35rem;
}
.wall-soon__ico {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel-2, var(--panel));
  color: var(--brand, #6b5bf0);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand, #6b5bf0) 12%, transparent);
}
.wall-soon__ico--spark {
  width: 2.35rem;
  height: 2.35rem;
  color: #0d9488;
  transform: translateY(-0.35rem);
}
.wall-soon__ico--clock {
  color: var(--ink-soft);
}
.wall-soon__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.wall-soon__text {
  margin: 0;
  max-width: 28rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}
.wall-soon__text strong {
  font-weight: 800;
  color: var(--brand, #6b5bf0);
}
.wall-soon__sub {
  margin: 0.15rem 0 0;
  max-width: 26rem;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
.auto-cfg-scope {
  display: grid;
  gap: 0.55rem;
  width: 100%;
  margin: 0 0 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--line, #e2e8f0);
}
.auto-cfg-scope > .cfg-label:first-child {
  margin-top: 0;
}
.auto-cfg-scope__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
}
.scope-field {
  display: grid !important;
  grid-template-rows: auto 1fr;
  gap: 0.4rem;
  min-width: 0;
  margin: 0;
  padding: 0.65rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  align-content: start;
  cursor: pointer;
}
.scope-field__label {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.3rem;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--ink);
}
.scope-field__control {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.scope-field__control input[type='number'] {
  width: 4.25rem !important;
  min-width: 0 !important;
  padding: 0.35rem 0.45rem !important;
  border-radius: 8px !important;
  border: 1px solid var(--line-2);
  background: var(--panel-2);
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 800;
  text-align: center;
}
.scope-field__control em {
  font-style: normal;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.scope-field__control--check {
  gap: 0.45rem;
  min-height: 2rem;
}
.scope-field__control--check input[type='checkbox'] {
  width: 1.05rem !important;
  height: 1.05rem;
  min-width: 0 !important;
  margin: 0;
  accent-color: var(--brand, #6b5bf0);
  flex: 0 0 auto;
}
.scope-field__hint {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.25;
}
.scope-field--toggle:has(input:checked) {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 40%, var(--line));
  background: color-mix(in srgb, var(--brand, #6b5bf0) 7%, var(--panel));
}
@media (max-width: 1100px) {
  .auto-cfg-scope__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .auto-cfg-scope__grid {
    grid-template-columns: 1fr;
  }
}
.auto-cfg-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem 1.25rem;
  align-items: start;
  width: 100%;
  max-width: 100%;
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line, #e2e8f0);
  overflow: hidden;
}
.auto-cfg-cols__col {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  max-width: 100%;
  align-content: start;
  overflow: hidden;
}
.auto-cfg-cols__col + .auto-cfg-cols__col {
  padding-left: 1.15rem;
  border-left: 1px solid var(--line, #e2e8f0);
}
.auto-cfg-cols__col > .cfg-label:first-child {
  margin-top: 0;
}
/* El select nativo crece con el texto de las options: forzar ancho de columna */
.auto-cfg-cols .list-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.auto-cfg-cols .list-picker select {
  flex: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.auto-cfg-cols .exclude-chips {
  max-width: 100%;
}
.auto-cfg-cols .exclude-chip {
  max-width: 100%;
}
.auto-cfg-cols .exclude-chip__label {
  max-width: min(100%, 12rem);
}
.auto-cfg-cols .mode-pick,
.auto-cfg-cols .mode-pick__btn {
  max-width: 100%;
  min-width: 0;
}
@media (max-width: 640px) {
  .auto-cfg-cols { grid-template-columns: 1fr; overflow: visible; }
  .auto-cfg-cols__col { overflow: visible; }
  .auto-cfg-cols__col + .auto-cfg-cols__col {
    padding-left: 0;
    border-left: 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--line, #e2e8f0);
  }
}
.cfg-card-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
  justify-content: space-between;
}
.cfg-card-head > .hint,
.cfg-card-head > .cfg-label {
  margin: 0;
  flex: 1 1 12rem;
}
.cfg-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  align-items: center;
}
.cfg-toolbar.wrap { gap: 0.45rem 0.85rem; }
.cfg-sep {
  margin: 0.35rem 0 0;
  border: 0;
  border-top: 1px solid var(--line, #e2e8f0);
}
.cfg-check-stack {
  display: grid;
  gap: 0.45rem;
  justify-items: start;
}
.cfg-check-block {
  display: grid;
  gap: 0.35rem;
  justify-items: start;
  width: 100%;
  max-width: 28rem;
}
.cfg-check-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
}
.cfg-inline-select select {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 0.45rem;
  padding: 0.3rem 0.5rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface, #fff);
  max-width: 14rem;
}
.cfg-field--nested {
  width: 100%;
  margin-left: 1.55rem;
}
.cfg-field--nested input[type='text'] {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 0.45rem;
  padding: 0.4rem 0.55rem;
  font: inherit;
  font-weight: 500;
  color: var(--ink);
  background: var(--surface, #fff);
}
.cfg-label {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.cfg-field { display: grid; gap: 0.2rem; font-size: 0.85rem; font-weight: 600; color: var(--ink-soft); }
.cfg-field--inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem 0.45rem;
}
.cfg-field--inline .cfg-field__label {
  flex: 0 1 auto;
}
.cfg-field--inline .cfg-inline-control {
  flex: 0 0 auto;
}
.cfg-field__label,
.cfg-label,
.num-chip > span,
.check,
.mode-pick__text strong {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.cfg-inline-control {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.cfg-inline-control input[type='number'] {
  width: 4rem;
  padding: 0.4rem 0.45rem;
  border-radius: 8px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  font-weight: 700;
  text-align: center;
}
.cfg-inline-control em {
  font-style: normal;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.cfg-field input, .cfg-field select, .cfg-field textarea { font-weight: 500; }
.cfg-field textarea { resize: vertical; min-height: 4.5rem; }
.welcome-text-input { font-size: calc(1em + 2pt); }
.num-row { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.num-row--with-title {
  align-items: center;
  gap: 0.55rem 0.75rem;
}
.num-row__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.num-chip {
  display: inline-flex !important;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.num-chip input[type='number'] {
  width: 3.4rem !important;
  min-width: 0 !important;
  padding: 0.2rem 0.3rem !important;
  border-radius: 6px !important;
  text-align: center;
  font-weight: 700;
  color: var(--ink);
}
.num-chip em { font-style: normal; opacity: 0.55; font-size: 0.72rem; }
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
}
.seg--col { display: grid; width: 100%; }
.seg__btn {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}
.seg__btn.on {
  background: var(--brand, #6b5bf0);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
.mode-pick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 0.35rem 0 0.75rem;
}
.mode-pick--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  width: 100%;
}
.mode-pick--3 .mode-pick__btn {
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.55rem;
  min-width: 0;
}
.mode-pick--3 .mode-pick__text strong {
  font-size: 0.82rem;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 520px) {
  .mode-pick--3 { grid-template-columns: 1fr; }
}
.mode-pick__btn {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  width: 100%;
  margin: 0;
  padding: 0.75rem 0.8rem;
  border-radius: 12px;
  border: 1.5px solid var(--line-2, var(--line));
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.mode-pick__btn:hover {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 55%, var(--line));
}
.mode-pick__btn.on {
  border-color: var(--brand, #6b5bf0);
  background: color-mix(in srgb, var(--brand, #6b5bf0) 14%, var(--panel));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #6b5bf0) 35%, transparent);
}
/* Opción no elegida: atenuada pero legible */
.mode-pick--mute-off .mode-pick__btn:not(.on) {
  opacity: 0.72;
  border-color: color-mix(in srgb, var(--line) 75%, transparent);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  color: var(--ink-soft, #64748b);
  box-shadow: none;
}
.mode-pick--mute-off .mode-pick__btn:not(.on) .mode-pick__check {
  border-color: color-mix(in srgb, var(--ink-soft, #94a3b8) 65%, transparent);
  background: transparent;
}
.mode-pick--mute-off .mode-pick__btn:not(.on):hover,
.mode-pick--mute-off .mode-pick__btn:not(.on):focus-visible {
  opacity: 0.92;
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 40%, var(--line));
  color: var(--ink);
  background: var(--panel);
}
.mode-pick__check {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  border: 1.5px solid var(--line-2, var(--line));
  display: inline-grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  background: transparent;
  margin-top: 0.1rem;
}
.mode-pick__btn.on .mode-pick__check {
  border-color: var(--brand, #6b5bf0);
  background: var(--brand, #6b5bf0);
}
.mode-pick__text {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}
.mode-pick__text strong {
  font-size: 0.95rem;
  font-weight: 800;
}
.mode-pick__text small {
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--muted, #94a3b8);
  font-weight: 500;
}
.mode-pick--stack {
  grid-template-columns: 1fr;
}
@media (max-width: 720px) {
  .mode-pick:not(.mode-pick--3) { grid-template-columns: 1fr; }
}
.chip-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chip {
  display: inline-flex !important;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
  cursor: pointer;
}
.chip input { width: auto !important; margin: 0; accent-color: var(--brand, #6b5bf0); }
.chip.on { border-color: var(--brand, #6b5bf0); color: var(--ink); background: color-mix(in srgb, var(--brand, #6b5bf0) 12%, var(--panel)); }
.cfg-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 14rem);
  gap: 0.75rem;
  align-items: start;
}
.tv-mini, .layout-preview, .type-preview, .slot-preview {
  display: grid;
  gap: 0.45rem;
}
.tv-mini--modal .tv-mini__screen,
.layout-preview--modal .layout-preview__tv,
.type-preview--modal {
  min-height: 12rem;
}
.audio-preview--modal { margin-top: 0.25rem; }
.small-preview {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #0b1220;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.small-preview__frame {
  width: 38%;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  background: #334155;
  display: grid;
  place-items: center;
  color: #e2e8f0;
  font-size: 0.75rem;
  font-weight: 800;
}
.small-preview.mode-blur-fill { background: #475569; }
.small-preview.mode-blur-fill .small-preview__frame { box-shadow: 0 0 24px rgba(0,0,0,0.35); }
.small-preview.mode-letterbox { background: #111827; }
.small-preview.mode-cover .small-preview__frame { width: 70%; }
.small-preview.mode-text-priority .small-preview__frame { display: none; }
.small-preview.mode-text-priority::after {
  content: 'Solo texto';
  color: #e2e8f0;
  font-weight: 800;
}
.slot-preview__screen.tv-mini__screen,
.slot-preview__screen {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: min(18rem, 42vh);
  min-height: 0;
  padding: 0.45rem;
  box-sizing: border-box;
  overflow: hidden;
  place-content: unset;
  gap: 0.3rem;
}
.slot-preview__screen > .badge {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  z-index: 2;
}
.slot-preview__media {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  min-height: 0;
  border-radius: 6px;
  object-fit: contain;
  background: #020617;
}
.slot-preview__iframe {
  border: 0;
  width: 100%;
  height: 100%;
  max-height: 100%;
  aspect-ratio: unset;
}
.slot-preview__yt {
  margin: 0;
  font-weight: 800;
  font-size: 1rem;
}
.slot-text-style {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.35rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
}
.slot-text-style .cfg-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
.slot-preview__text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding: 0.35rem 0.2rem 1.1rem;
  box-sizing: border-box;
}
.slot-preview__text.align-left { align-items: flex-start; text-align: left; }
.slot-preview__text.align-center { align-items: center; text-align: center; }
.slot-preview__text.align-right { align-items: flex-end; text-align: right; }
.slot-preview__text.valign-top { justify-content: flex-start; }
.slot-preview__text.valign-center { justify-content: center; }
.slot-preview__text.valign-bottom { justify-content: flex-end; }
.slot-preview__brand {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.7;
}
.slot-preview__logo-hint {
  margin: 0 0 0.35rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}
.slot-preview__text.scale-sm .tv-mini__text { font-size: 0.85rem; }
.slot-preview__text.scale-md .tv-mini__text { font-size: 1rem; }
.slot-preview__text.scale-lg .tv-mini__text { font-size: 1.2rem; }
.slot-preview__text .tv-mini__text {
  text-align: inherit;
}
.slot-preview .tv-mini__text,
.slot-preview .tv-mini__meta {
  margin: 0;
  text-align: left;
  z-index: 2;
  flex: 0 0 auto;
}
.slot-preview__screen > .tv-mini__meta:last-child {
  position: absolute;
  left: 0.45rem;
  bottom: 0.35rem;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}
.tv-mini__screen {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: linear-gradient(160deg, #0f172a, #111827);
  color: #f8fafc;
  display: grid;
  place-content: center;
  text-align: center;
  padding: 0.6rem;
  gap: 0.25rem;
}
.tv-mini__brand { margin: 0; font-size: 0.68rem; opacity: 0.65; font-weight: 700; }
.tv-mini__text { margin: 0; font-size: 0.85rem; font-weight: 800; line-height: 1.25; }
.tv-mini__meta { margin: 0; font-size: 0.68rem; opacity: 0.55; }
.tv-mini__cap { font-size: 0.7rem; color: var(--ink-faint); font-weight: 700; }
.quad {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem;
  max-width: 22rem;
}
.quad.off { opacity: 0.45; }
.quad__cell, .quad__hide {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  padding: 0.55rem 0.45rem;
  cursor: pointer;
}
.quad__cell.mid { grid-column: 1 / -1; }
.quad__hide { grid-column: 1 / -1; }
.quad__cell.on, .quad__hide.on { background: var(--brand, #6b5bf0); color: #fff; border-color: transparent; }
.layout-preview__tv {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #0b1220;
  display: grid;
  overflow: hidden;
  color: #e2e8f0;
  font-size: 0.65rem;
  font-weight: 800;
}
.layout-preview__tv.layout-media-left,
.layout-preview__tv.layout-split { grid-template-columns: 1.1fr 1fr; }
.layout-preview__tv.layout-media-right { grid-template-columns: 1fr 1.1fr; }
.layout-preview__tv.layout-media-right .layout-preview__copy { order: 0; }
.layout-preview__tv.layout-media-right .layout-preview__media { order: 1; }
.layout-preview__tv.layout-media-top { grid-template-rows: 1.1fr 1fr; }
.layout-preview__tv.layout-media-bottom { grid-template-rows: 1fr 1.1fr; }
.layout-preview__tv.layout-media-bottom .layout-preview__copy { order: 0; }
.layout-preview__tv.layout-media-bottom .layout-preview__media { order: 1; }
.layout-preview__tv.layout-media-only { grid-template-columns: 1fr; }
.layout-preview__tv.layout-media-only .layout-preview__copy { display: none; }
.layout-preview__tv.layout-text-only { grid-template-columns: 1fr; }
.layout-preview__tv.layout-text-only .layout-preview__media { display: none; }
.layout-preview__media { background: #334155; display: grid; place-items: center; }
.layout-preview__copy { background: #111827; display: grid; place-items: center; padding: 0.35rem; }
.layout-preview__logo {
  position: absolute; z-index: 2; width: 1rem; height: 1rem; border-radius: 3px;
  background: #5eead4; color: #042f2e; display: grid; place-items: center; font-size: 0.55rem;
}
.layout-preview__tv.no-logo .layout-preview__logo { display: none; }
.layout-preview__tv.logo-tl .layout-preview__logo { top: 0.3rem; left: 0.3rem; }
.layout-preview__tv.logo-tr .layout-preview__logo { top: 0.3rem; right: 0.3rem; }
.layout-preview__tv.logo-bl .layout-preview__logo { bottom: 0.3rem; left: 0.3rem; }
.layout-preview__tv.logo-br .layout-preview__logo { bottom: 0.3rem; right: 0.3rem; }
.layout-preview__tv.logo-center .layout-preview__logo { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.layout-pick, .fit-pick {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
  gap: 0.35rem;
}
.layout-pick__btn, .fit-pick__btn {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 10px;
  padding: 0.4rem;
  display: grid;
  gap: 0.3rem;
  justify-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}
.layout-pick__btn.on, .fit-pick__btn.on {
  border-color: var(--brand, #6b5bf0);
  color: var(--ink);
  background: color-mix(in srgb, var(--brand, #6b5bf0) 10%, var(--panel));
}
.layout-pick__icon, .fit-pick__demo {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 6px;
  background: #0b1220;
  position: relative;
  overflow: hidden;
}
.layout-pick__icon::before, .layout-pick__icon::after {
  content: '';
  position: absolute;
  background: #334155;
}
.layout-pick__icon.i-media-left::before { inset: 0 48% 0 0; }
.layout-pick__icon.i-media-left::after { inset: 0 0 0 52%; background: #1e293b; }
.layout-pick__icon.i-media-right::before { inset: 0 0 0 52%; }
.layout-pick__icon.i-media-right::after { inset: 0 52% 0 0; background: #1e293b; }
.layout-pick__icon.i-media-top::before { inset: 0 0 48% 0; }
.layout-pick__icon.i-media-top::after { inset: 52% 0 0 0; background: #1e293b; }
.layout-pick__icon.i-media-bottom::before { inset: 52% 0 0 0; }
.layout-pick__icon.i-media-bottom::after { inset: 0 0 52% 0; background: #1e293b; }
.layout-pick__icon.i-split::before { inset: 0 50% 0 0; }
.layout-pick__icon.i-split::after { inset: 0 0 0 50%; background: #1e293b; }
.layout-pick__icon.i-media-only::before { inset: 0; }
.layout-pick__icon.i-text-only::after { inset: 0; background: #1e293b; }
.fit-pick__demo i {
  position: absolute;
  background: #64748b;
  border-radius: 2px;
}
.fit-pick__demo.fit-contain i { inset: 18% 10%; }
.fit-pick__demo.fit-cover i { inset: -8% -20%; }
.fit-pick__demo.fit-letterbox i { inset: 22% 8%; box-shadow: inset 0 0 0 999px #0b1220; }
.fit-pick__demo.fit-blur-fill { background: #475569; }
.fit-pick__demo.fit-blur-fill i { inset: 15% 18%; background: #94a3b8; }
.fit-pick__demo.fit-text { background: #111827; }
.fit-pick__demo.fit-text i { display: none; }
.fit-pick__demo.fit-text::after {
  content: 'Aa';
  position: absolute; inset: 0; display: grid; place-items: center;
  color: #e2e8f0; font-size: 0.85rem; font-weight: 800;
}
.audio-preview {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.7rem; border-radius: 10px; border: 1px solid var(--line); background: var(--panel);
  font-size: 0.85rem; font-weight: 700;
}
.audio-preview__icon {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  flex: 0 0 auto;
  background: var(--ink-soft);
  opacity: 0.85;
  position: relative;
}
.audio-preview__icon.sound {
  background: var(--ok, #16a34a);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok, #16a34a) 25%, transparent);
}
.audio-preview__icon.mute {
  background: var(--ink-faint, #94a3b8);
}
.audio-preview__icon.mute::after {
  content: '';
  position: absolute;
  inset: 45% -10%;
  height: 2px;
  background: var(--panel);
  transform: rotate(-40deg);
}
.audio-preview__icon.device {
  background: color-mix(in srgb, var(--brand, #6b5bf0) 70%, #94a3b8);
}
.color-field { max-width: 10rem; }
.color-field input[type='color'] {
  width: 100%; height: 2rem; padding: 0.15rem !important; cursor: pointer;
}
.type-preview {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0b1220;
  color: #f8fafc;
  padding: 0.75rem;
  display: grid;
  gap: 0.35rem;
  align-content: start;
}
.type-preview.scale-sm { --t: 0.95rem; --b: 0.75rem; }
.type-preview.scale-md { --t: 1.15rem; --b: 0.85rem; }
.type-preview.scale-lg { --t: 1.4rem; --b: 0.95rem; }
.type-preview__tipo {
  margin: 0; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--prev-accent, #5eead4);
}
.type-preview__title { margin: 0; font-size: var(--t); font-weight: 800; line-height: 1.15; }
.type-preview__body { margin: 0; font-size: var(--b); opacity: 0.8; line-height: 1.35; }
.type-preview__cta { margin: 0.15rem 0 0; font-size: 0.75rem; font-weight: 700; opacity: 0.7; }
.type-preview__dots { display: flex; gap: 0.25rem; margin-top: 0.35rem; }
.type-preview__dots i { width: 0.35rem; height: 0.35rem; border-radius: 999px; background: rgba(248,250,252,0.35); }
.type-preview__dots i.on { background: #fff; }
@media (max-width: 900px) {
  .cfg-split { grid-template-columns: 1fr; }
}
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; }
.canales-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  flex: 0 0 auto;
}
.slots-intro {
  display: grid;
  gap: 0.45rem;
  flex: 1 1 16rem;
  min-width: 0;
}
.slots-intro > p { margin: 0; }
.slots-back { justify-self: start; }
.canal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18.5rem, 1fr));
  gap: 0.85rem;
}
.canal-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-2);
}
.canal-table { margin: 0; }
.canal-table th {
  white-space: nowrap;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  background: var(--panel);
}
.canal-table td {
  vertical-align: middle;
  font-size: 0.86rem;
}
.canal-table tr.on td {
  background: color-mix(in srgb, var(--brand, #6b5bf0) 8%, transparent);
}
.canal-table__ver {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.canal-table .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
}
.canal-table .pill.on {
  background: color-mix(in srgb, var(--ok, #16a34a) 16%, transparent);
  color: var(--ok, #15803d);
}
.canal-table .pill.off {
  background: color-mix(in srgb, var(--bad, #dc2626) 14%, transparent);
  color: var(--bad, #b91c1c);
}
.canal-table .actions { justify-content: flex-end; }
.canal-card {
  display: grid;
  gap: 0.7rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  align-content: start;
}
.canal-card.on {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 55%, var(--line));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #6b5bf0) 25%, transparent);
}
.canal-card:has(.pill.off) { opacity: 0.78; }
.canal-table tr:has(.pill.off) td { opacity: 0.78; }
.canal-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.55rem;
  align-items: flex-start;
}
.canal-card__head h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.25;
}
.canal-card__meta {
  margin: 0.25rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.canal-card .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
}
.canal-card .pill.on {
  background: color-mix(in srgb, var(--ok, #16a34a) 16%, transparent);
  color: var(--ok, #15803d);
}
.canal-card .pill.off {
  background: color-mix(in srgb, var(--bad, #dc2626) 14%, transparent);
  color: var(--bad, #b91c1c);
}
.canal-card__facts {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 0.65rem;
}
.canal-card__facts > div { min-width: 0; }
.canal-card__facts .span-2 { grid-column: 1 / -1; }
.canal-card__facts dt {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint, #94a3b8);
}
.canal-card__facts dd {
  margin: 0.1rem 0 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.canal-card__devices {
  margin: 0;
  padding: 0.45rem 0.55rem;
  list-style: none;
  display: grid;
  gap: 0.2rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.canal-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.linkish {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--brand, #6b5bf0);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}
.linkish:hover { opacity: 0.85; }
.empty .linkish { font-size: inherit; }
.card--focus {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 55%, var(--line));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #6b5bf0) 22%, transparent);
}
.card { background: var(--panel-2); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; display: grid; gap: 0.55rem; }
.card h2 { margin: 0; font-size: 1.05rem; }
.card-head { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
.card-head--slots { width: 100%; }
.slots-list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--ink);
}
.card-head--slots .actions { margin-left: auto; }
.card small { opacity: 0.55; font-weight: 500; }
.card label { display: grid; gap: 0.25rem; font-size: 0.9rem; }
.check { display: flex !important; align-items: center; gap: 0.45rem; grid-template-columns: none; }
.tipos { border: 1px solid var(--line); border-radius: 10px; padding: 0.55rem 0.7rem; display: grid; gap: 0.25rem; }
.tipos legend { padding: 0 0.25rem; font-size: 0.8rem; font-weight: 700; }
.hint { margin: 0; font-size: 0.8rem; color: var(--ink-soft); line-height: 1.4; }
.list-picker { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: end; }
.list-picker select { flex: 1 1 14rem; min-width: 0; }
.list-insert-or {
  margin: 0.15rem 0;
  text-align: center;
  font-weight: 700;
  opacity: 0.75;
}
.tv-modal-box--list-insert {
  width: min(42rem, 96vw);
  max-width: 96vw;
}
.list-insert-layout {
  display: grid;
  gap: 0.75rem;
  margin: 0.35rem 0 0.15rem;
}
.list-insert-layout.ready {
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
  align-items: start;
}
.list-insert-form {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}
.list-insert-preview {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}
.list-insert-preview-empty {
  margin: 0.15rem 0 0;
}
.wall-card.is-extra {
  border-color: color-mix(in srgb, #0d9488 45%, var(--line));
  background: color-mix(in srgb, #0d9488 6%, var(--panel-2));
}
.wall-card:not(.is-extra) {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 28%, var(--line));
}
@media (max-width: 720px) {
  .list-insert-layout.ready { grid-template-columns: 1fr; }
}
.exclude-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.35rem 0 0.15rem;
}
.exclude-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.2rem 0.25rem 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  font-size: 0.78rem;
  font-weight: 600;
}
.exclude-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 14rem;
}
.exclude-chip__x {
  width: 1.35rem;
  height: 1.35rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.exclude-chip__x:hover {
  background: color-mix(in srgb, var(--bad, #dc2626) 16%, transparent);
  color: var(--bad, #b91c1c);
}
.check.muted { opacity: 0.65; }
.wall-carousel__hint { margin: 0 0 0.35rem; }
.error-inline {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  color: var(--bad, #b91c1c);
  line-height: 1.35;
}
.wall-carousel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.35rem;
  align-items: center;
  margin: 0.15rem 0 0.55rem;
}
.wall-carousel--readonly .wall-card {
  flex: 0 0 calc((100% - 0.7rem) / 3);
  cursor: default;
}
.wall-card--readonly {
  cursor: default;
}
.wall-carousel--readonly .wall-card__foot {
  justify-content: space-between;
}
.wall-card__exclude {
  flex: 0 0 auto;
  margin: 0;
  margin-left: auto;
  display: inline-grid;
  place-items: center;
  width: 1.55rem;
  height: 1.55rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft, #94a3b8);
  opacity: 0.5;
  cursor: pointer;
}
.wall-card__exclude:hover {
  opacity: 1;
  color: var(--bad, #b91c1c);
  background: color-mix(in srgb, var(--bad, #dc2626) 12%, transparent);
}
.wall-carousel__nav {
  width: 2rem;
  height: 2.4rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
}
.wall-carousel__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.wall-carousel__track {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 0.25rem 0.1rem 0.55rem;
  min-height: 10.5rem;
  scrollbar-width: thin;
}
.wall-insert {
  flex: 0 0 1.7rem;
  align-self: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--brand, #6b5bf0) 55%, var(--line));
  background: color-mix(in srgb, var(--brand, #6b5bf0) 8%, var(--panel));
  color: var(--brand, #6b5bf0);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  scroll-snap-align: none;
}
.wall-insert:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand, #6b5bf0) 16%, var(--panel));
}
.wall-insert:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wall-card {
  position: relative;
  flex: 0 0 calc((100% - 5.6rem) / 3);
  min-width: 8.75rem;
  max-width: 12.5rem;
  scroll-snap-align: start;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 0.3rem;
  padding: 0.45rem 0.45rem 0.4rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  cursor: grab;
  user-select: none;
}
.wall-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-width: 0;
}
.wall-card__num {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  background: var(--brand, #6b5bf0);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
}
.wall-card__type {
  flex: 0 1 auto;
  max-width: calc(100% - 2rem);
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.14rem 0.45rem 0.14rem 0.32rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--brand, #6b5bf0) 10%, var(--panel));
  color: var(--ink-soft);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: none;
  letter-spacing: 0.01em;
}
.wall-card__type-ico {
  width: 0.85rem;
  height: 0.85rem;
  flex: 0 0 auto;
}
.wall-card__type--pub {
  border-color: color-mix(in srgb, var(--brand, #6b5bf0) 40%, var(--line));
  background: color-mix(in srgb, var(--brand, #6b5bf0) 14%, var(--panel));
  color: color-mix(in srgb, var(--brand, #6b5bf0) 75%, var(--ink));
}
.wall-card__type--extra {
  border-color: color-mix(in srgb, #0d9488 45%, var(--line));
  background: color-mix(in srgb, #0d9488 14%, var(--panel));
  color: #0f766e;
}
.wall-card.dragging { opacity: 0.45; }
.wall-card.drag-over {
  border-color: var(--brand, #6b5bf0);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #6b5bf0) 40%, transparent);
}
.wall-card.focus {
  border-color: var(--brand, #6b5bf0);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--brand, #6b5bf0) 45%, transparent),
    0 6px 16px rgba(15, 23, 42, 0.12);
  outline: none;
  animation: wall-card-focus 0.45s ease;
}
@keyframes wall-card-focus {
  from { transform: scale(0.97); }
  to { transform: none; }
}
.wall-card__foot {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  min-width: 0;
}
.wall-card__x {
  flex: 0 0 auto;
  margin: 0;
  margin-left: auto;
  padding: 0 0.1rem;
  border: 0;
  background: transparent;
  color: var(--ink-soft, #94a3b8);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1;
  opacity: 0.45;
  cursor: pointer;
}
.wall-card__x:hover {
  opacity: 0.9;
  color: var(--bad, #b91c1c);
  background: transparent;
}
.wall-card__media {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  aspect-ratio: 16 / 10;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
  cursor: pointer;
  color: inherit;
  text-align: left;
}
.wall-card__media:hover .wall-card__preview-ico,
.wall-card__media:focus-visible .wall-card__preview-ico {
  opacity: 1;
  transform: scale(1.05);
}
.wall-card__media:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand, #6b5bf0) 70%, transparent);
  outline-offset: 2px;
}
.wall-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.wall-card__ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  pointer-events: none;
}
.wall-card__extra-type {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0.35rem 0.45rem;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(
    to bottom,
    rgba(15, 23, 42, 0.15),
    rgba(15, 23, 42, 0.45) 45%,
    rgba(15, 23, 42, 0.15)
  );
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.wall-card__extra-type--quote {
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.25;
  word-break: break-word;
}
.wall-card__preview-ico {
  position: absolute;
  right: 0.4rem;
  bottom: 0.4rem;
  z-index: 2;
  display: inline-grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  opacity: 0.88;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.wall-card__title {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wall-card__drag {
  position: absolute;
  left: 0.5rem;
  top: 2.55rem;
  z-index: 1;
  padding: 0.1rem 0.2rem;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  font-size: 0.7rem;
  letter-spacing: -0.08em;
  pointer-events: none;
}
@media (max-width: 720px) {
  .wall-card {
    flex-basis: calc((100% - 3.8rem) / 2);
    min-width: 7.75rem;
  }
}
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 0.55rem; border-bottom: 1px solid var(--line); font-size: 0.92rem; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.ico-btn {
  display: inline-grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  cursor: pointer;
  flex: 0 0 auto;
}
.ico-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--line-2);
}
.ico-btn.danger { color: var(--bad); }
.ico-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ico-btn svg { display: block; }
.err { color: var(--bad); }
.ok { color: var(--ok); }
.empty { opacity: 0.65; }

/* Modales TV: ancho fijo chico (evitar fit-content + width:100% hijos = pantalla entera) */
.tv-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
}
.tv-modal--top { z-index: 95; }
.tv-modal-box {
  width: 18.5rem !important;
  max-width: calc(100vw - 2rem) !important;
  min-width: 0 !important;
  height: auto !important;
  max-height: min(85vh, 36rem) !important;
  margin: 0 !important;
  overflow: auto;
  box-sizing: border-box;
  display: grid;
  gap: 0.45rem;
  padding: 0.8rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel) !important;
  color: var(--ink);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}
.tv-modal-box--preview {
  width: min(40rem, calc(100vw - 2rem)) !important;
  max-width: min(40rem, calc(100vw - 2rem)) !important;
}
.tv-modal-box--tv-preview {
  width: min(52rem, calc(100vw - 2rem)) !important;
  max-width: min(52rem, calc(100vw - 2rem)) !important;
}
.tv-modal-box--slots {
  width: min(36rem, calc(100vw - 2rem)) !important;
  max-width: min(36rem, calc(100vw - 2rem)) !important;
}
.tv-modal-box--slots.tv-modal-box--slot-live {
  width: min(56rem, calc(100vw - 2rem)) !important;
  max-width: min(56rem, calc(100vw - 2rem)) !important;
  max-height: min(90vh, 44rem) !important;
}
.slot-editor-layout {
  display: grid;
  gap: 0.75rem;
}
.slot-editor-layout.ready {
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 1.05fr);
  align-items: start;
}
.slot-editor-form,
.slot-editor-preview {
  min-width: 0;
  display: grid;
  gap: 0.45rem;
}
.slot-preview--live {
  min-width: 0;
}
.slot-preview--live .slot-preview__screen {
  width: 100%;
  max-height: min(16rem, 38vh);
}
@media (max-width: 720px) {
  .slot-editor-layout.ready { grid-template-columns: 1fr; }
  .slot-text-style .cfg-row { grid-template-columns: 1fr; }
}
.tv-modal-aud {
  display: grid;
  gap: 0.35rem;
  margin: 0.35rem 0 0.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-2);
}
.tv-modal-aud .cfg-label { margin: 0; }
.preview-playlist {
  margin: 0.35rem 0 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
  background: var(--panel-2);
}
.preview-playlist summary {
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--ink-soft);
  list-style: none;
}
.preview-playlist summary::-webkit-details-marker { display: none; }
.preview-playlist .preview-list { margin-top: 0.45rem; }
.tv-modal-box h2 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.25;
}
.tv-modal-box label {
  display: grid;
  gap: 0.15rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.tv-modal-box input,
.tv-modal-box select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.35rem 0.45rem;
  font-size: 0.86rem;
  border-radius: 8px;
  border: 1px solid var(--line-2);
  background: var(--panel-2);
  color: var(--ink);
}
.tv-modal-box .card-head { margin-bottom: 0.15rem; }
.tv-modal-box .hint { margin: 0 0 0.5rem; font-size: 0.78rem; }
.preview-list { margin: 0 0 1rem; padding-left: 1.1rem; display: grid; gap: 0.4rem; }
.preview-list li { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: baseline; font-size: 0.9rem; }
.badge {
  font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem; border-radius: 999px; background: var(--line); color: var(--ink);
}
.preview-list em { opacity: 0.55; font-style: normal; margin-left: auto; }
.slot-card {
  display: grid;
  gap: 0.3rem;
  padding: 0.45rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-2);
}
.slot-card__top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: end;
}
.slot-card__n {
  display: inline-grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: var(--line);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-soft);
  flex: 0 0 auto;
  align-self: center;
}
.slot-card__top > select { flex: 1 1 6rem; min-width: 0; }
.slot-list {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.slot-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.88rem;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
}
.slot-list em {
  margin-left: auto;
  font-style: normal;
  opacity: 0.55;
  font-size: 0.8rem;
  font-weight: 700;
}
.slot-list .btn-compact { margin-left: 0.15rem; }
.slot-dur {
  display: grid !important;
  gap: 0.1rem;
  font-size: 0.7rem !important;
  width: 3.4rem;
}
.slot-dur input { width: 100%; padding: 0.3rem !important; }
.btn-compact {
  padding: 0.35rem 0.55rem !important;
  font-size: 0.8rem !important;
}
.slot-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.footer { display: flex; justify-content: flex-end; gap: 0.35rem; margin-top: 0.15rem; }
.slot-upload-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.35rem;
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
  .grid-2 { grid-template-columns: 1fr; }
  .config-layout,
  .config-layout--nav-collapsed {
    grid-template-columns: 1fr;
  }
  .config-nav-wrap {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding-right: 0;
    padding-bottom: 0.45rem;
    max-width: none;
  }
  .config-layout--nav-collapsed .config-nav-wrap {
    max-width: none;
    padding-right: 0;
  }
  .config-layout--nav-collapsed .config-nav__toggle {
    flex-direction: row;
    min-height: 0;
    padding: 0.45rem 0.5rem;
  }
  .config-layout--nav-collapsed .config-nav__toggle-current {
    display: inline;
    writing-mode: horizontal-tb;
    transform: none;
    max-height: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .config-nav {
    flex-direction: row;
    flex-wrap: wrap;
    padding-bottom: 0.15rem;
    margin-bottom: 0;
  }
  .config-nav__item { flex: 1 1 auto; }
}
</style>
