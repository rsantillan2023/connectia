<template>
  <div class="com">
    <header class="com-top">
      <div class="com-hero">
        <h1>Tu comunidad</h1>
        <p>Identidad, apariencia, legislación laboral e ingreso de la app para tus miembros.</p>
        <ScreenHelp
          purpose="Define cómo se presenta Connectia a esta comunidad: marca, tema, splash, país de licencias (AR/CL) y métodos de login."
          can-do="Cambiar nombre visible, colores, logo, fondos, splash, zona horaria, legislación de vacaciones, ingreso y módulos. Guardá para que los miembros vean los cambios al recargar."
        />
      </div>
      <div v-if="form" class="com-save-bar">
        <button type="button" class="save" :disabled="saving" @click="save">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </header>

    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <form v-if="form" class="com-form" @submit.prevent="save">
      <div class="com-split">
        <nav class="com-index" aria-label="Secciones">
          <button
            v-for="s in sections"
            :key="s.id"
            type="button"
            class="index-item"
            :class="{ on: !s.external && activeSection === s.id, external: s.external }"
            @click="onSectionClick(s)"
          >
            <span class="index-label">{{ s.label }}</span>
            <span class="index-hint">{{ s.hint }}</span>
          </button>
        </nav>

        <div class="com-panel">
          <!-- Logo y fondo -->
          <section v-show="activeSection === 'marca'" class="panel-body">
            <div class="panel-head">
              <h2>Logo y fondo</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Logo y fondo"
                @click="openSectionInfo('marca')"
              >
                i
              </button>
            </div>
            <p class="hint top">Imágenes visibles en el login y el encabezado de la app.</p>

            <div class="field">
              <label for="logoUrl">Logo de la comunidad</label>
              <p class="hint">
                Se ve en el login y el encabezado. Subí un archivo o pegá una URL y después tocá
                <strong>Guardar cambios</strong>.
              </p>
              <div class="media-row">
                <div class="media-preview" :class="{ empty: !form.branding.logoUrl }">
                  <img
                    v-if="form.branding.logoUrl && !logoBroken"
                    :src="previewUrl(form.branding.logoUrl)"
                    alt="Logo actual"
                    @error="logoBroken = true"
                  />
                  <span v-else class="media-empty">{{ form.branding.logoUrl ? 'No se pudo cargar' : 'Sin logo' }}</span>
                </div>
                <div class="media-actions">
                  <input
                    ref="logoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
                    class="file-hidden"
                    @change="onLogoFile"
                  />
                  <button type="button" class="btn-ghost" :disabled="uploadingLogo" @click="logoFileInput?.click()">
                    {{ uploadingLogo ? 'Subiendo…' : 'Subir logo' }}
                  </button>
                  <button v-if="form.branding.logoUrl" type="button" class="btn-ghost danger" @click="clearLogo">
                    Quitar
                  </button>
                  <input
                    id="logoUrl"
                    v-model="form.branding.logoUrl"
                    class="input"
                    placeholder="https://… o /uploads/…"
                    @input="logoBroken = false"
                  />
                </div>
              </div>
              <p v-if="logoUploadError" class="field-err">{{ logoUploadError }}</p>
            </div>

            <div class="field">
              <label for="loginBgUrl">Fondo de la pantalla de ingreso</label>
              <p class="hint">Imagen de fondo detrás del formulario de login. Vacío = fondo suave por defecto.</p>
              <div class="media-row tall">
                <div class="media-preview wide" :class="{ empty: !form.branding.loginBgUrl }">
                  <img
                    v-if="form.branding.loginBgUrl && !loginBgBroken"
                    :src="previewUrl(form.branding.loginBgUrl)"
                    alt="Fondo login"
                    @error="loginBgBroken = true"
                  />
                  <span v-else class="media-empty">
                    {{ form.branding.loginBgUrl ? 'No se pudo cargar' : 'Sin imagen' }}
                  </span>
                </div>
                <div class="media-actions">
                  <input
                    ref="loginBgFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    class="file-hidden"
                    @change="onLoginBgFile"
                  />
                  <button
                    type="button"
                    class="btn-ghost"
                    :disabled="uploadingLoginBg"
                    @click="loginBgFileInput?.click()"
                  >
                    {{ uploadingLoginBg ? 'Subiendo…' : 'Subir imagen' }}
                  </button>
                  <button v-if="form.branding.loginBgUrl" type="button" class="btn-ghost danger" @click="clearLoginBg">
                    Quitar
                  </button>
                  <input
                    id="loginBgUrl"
                    v-model="form.branding.loginBgUrl"
                    class="input"
                    placeholder="https://… o /uploads/…"
                    @input="loginBgBroken = false"
                  />
                </div>
              </div>
              <p v-if="loginBgUploadError" class="field-err">{{ loginBgUploadError }}</p>
            </div>
          </section>

          <!-- Identidad -->
          <section v-show="activeSection === 'identidad'" class="panel-body">
            <div class="panel-head">
              <h2>Identidad</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Identidad"
                @click="openSectionInfo('identidad')"
              >
                i
              </button>
            </div>
            <p class="hint top">Datos base de la comunidad.</p>

            <div class="field">
              <label for="empCodigo">Código de la comunidad</label>
              <p class="hint">
                Es el código corto que escriben al ingresar (ej. DEMO). No se puede cambiar después de creada.
              </p>
              <input id="empCodigo" :value="form.empCodigo" disabled class="input locked" />
            </div>

            <div class="field">
              <label for="nombre">Nombre visible</label>
              <p class="hint">Aparece en la app, el menú y los correos. Usá el nombre comercial de la organización.</p>
              <input id="nombre" v-model="form.nombre" class="input" required placeholder="Ej. Comunidad Demo Connectia" />
            </div>

            <div class="field">
              <label for="timezone">Zona horaria</label>
              <p class="hint">
                Se usa para fechas de publicaciones, solicitudes y reportes. Si no estás seguro, dejá la del país de
                licencias.
              </p>
              <select id="timezone" v-model="form.timezone" class="input">
                <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
                <option value="America/Santiago">Chile (Santiago)</option>
                <option value="America/Bogota">Colombia (Bogotá)</option>
                <option value="America/Mexico_City">México (Ciudad de México)</option>
                <option value="America/Sao_Paulo">Brasil (São Paulo)</option>
                <option value="Europe/Madrid">España (Madrid)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </section>

          <!-- Legislación laboral (por comunidad) -->
          <section v-show="activeSection === 'legislacion'" class="panel-body">
            <div class="panel-head">
              <h2>Legislación laboral</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Legislación"
                @click="openSectionInfo('legislacion')"
              >
                i
              </button>
            </div>
            <p class="hint top">
              Cada comunidad elige su marco. Define cómo se calculan vacaciones y el catálogo de licencias
              (Argentina LCT o Chile Código del Trabajo).
            </p>

            <div class="field">
              <span class="label-text">País de licencias y vacaciones</span>
              <div class="checks">
                <label class="check">
                  <input v-model="legislacionPais" type="radio" value="AR" />
                  <span>
                    <strong>Argentina (LCT)</strong>
                    <small>Vacaciones en días corridos · tramos 14 / 21 / 28 / 35 por antigüedad.</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="legislacionPais" type="radio" value="CL" />
                  <span>
                    <strong>Chile (Código del Trabajo)</strong>
                    <small>Vacaciones en días hábiles · 15 base + progresivas.</small>
                  </span>
                </label>
              </div>
            </div>

            <p v-if="legislacionMarco" class="hint">Marco: {{ legislacionMarco }}</p>

            <div class="field">
              <label class="check solo">
                <input v-model="syncTimezoneConPais" type="checkbox" />
                <span>
                  <strong>Alinear zona horaria al país</strong>
                  <small>
                    Al guardar, usa Buenos Aires (AR) o Santiago (CL). Podés cambiarla después en Identidad.
                  </small>
                </span>
              </label>
            </div>

            <div class="field">
              <label class="check solo">
                <input v-model="replaceLicenseTypes" type="checkbox" />
                <span>
                  <strong>Actualizar tipos de licencia del pack</strong>
                  <small>
                    Sincroniza el catálogo (vacaciones, enfermedad, etc.) con la legislación elegida. Los tipos
                    ajenos al pack quedan inactivos.
                  </small>
                </span>
              </label>
            </div>
          </section>

          <!-- Ingreso -->
          <section v-show="activeSection === 'ingreso'" class="panel-body">
            <div class="panel-head">
              <h2>Ingreso a la app</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Ingreso"
                @click="openSectionInfo('ingreso')"
              >
                i
              </button>
            </div>
            <p class="hint top">Activá solo los métodos que tu comunidad usa de verdad.</p>

            <div class="field">
              <span class="label-text">Cómo pueden iniciar sesión los miembros</span>
              <div class="checks">
                <label class="check">
                  <input v-model="loginPassword" type="checkbox" />
                  <span>
                    <strong>Usuario y contraseña</strong>
                    <small>Ingreso clásico con usuario interno.</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginId" type="checkbox" />
                  <span>
                    <strong>ID / legajo</strong>
                    <small>Útil cuando no tienen mail corporativo (ej. personal de planta).</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginMicrosoft" type="checkbox" />
                  <span>
                    <strong>SSO Microsoft (Entra ID)</strong>
                    <small>Requiere LOGIN_ENTRA_* en el servidor.</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginGoogle" type="checkbox" />
                  <span>
                    <strong>SSO Google</strong>
                    <small>Requiere LOGIN_GOOGLE_* en el servidor.</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginOkta" type="checkbox" />
                  <span>
                    <strong>SSO Okta / OIDC</strong>
                    <small>Requiere LOGIN_OKTA_* en el servidor.</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginToken" type="checkbox" />
                  <span>
                    <strong>Login por token</strong>
                    <small>Deep-link de un solo uso (?token=…).</small>
                  </span>
                </label>
                <label class="check">
                  <input v-model="loginLegacy" type="checkbox" />
                  <span>
                    <strong>Login legacy</strong>
                    <small>JWT firmado por sistemas antiguos.</small>
                  </span>
                </label>
              </div>
            </div>

            <div class="field">
              <label class="check solo">
                <input v-model="twoFactorRequired" type="checkbox" />
                <span>
                  <strong>Exigir 2FA a todos</strong>
                  <small>Código por email/SMS después de la contraseña o SSO.</small>
                </span>
              </label>
            </div>
            <div class="field">
              <label class="check solo">
                <input v-model="ssoAutoProvision" type="checkbox" />
                <span>
                  <strong>Auto-alta por SSO</strong>
                  <small>Si el IdP autentica un email nuevo, crea el miembro automáticamente.</small>
                </span>
              </label>
            </div>
            <div class="field">
              <div class="label-row">
                <label>Dominios de email permitidos para SSO (uno por línea, vacío = todos)</label>
                <button
                  type="button"
                  class="info-btn"
                  aria-label="Cómo traer miembros de Google o Azure hoy"
                  @click="openSectionInfo('miembros')"
                >
                  i
                </button>
              </div>
              <textarea v-model="allowedEmailDomainsText" rows="3" class="input" placeholder="sooft.com.ar&#10;empresa.com" />
              <p class="hint">
                Tip: si tu comunidad es “todos los @sooft.com.ar”, poné ese dominio, activá SSO + auto-alta, y cargá el padrón en
                <strong>Usuarios → Google / Entra</strong>. Tocá la <strong>i</strong> para el paso a paso.
              </p>
            </div>

            <div class="field">
              <label class="check solo">
                <input v-model="form.allowDesktop" type="checkbox" />
                <span>
                  <strong>Permitir abrir la app en computadora</strong>
                  <small>
                    Si lo desactivás, en pantallas grandes verán un aviso de “usá el celular”. Ideal para forzar experiencia
                    móvil.
                  </small>
                </span>
              </label>
            </div>
          </section>

          <!-- Apariencia -->
          <section v-show="activeSection === 'apariencia'" class="panel-body">
            <div class="panel-head">
              <h2>Apariencia</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Apariencia"
                @click="openSectionInfo('apariencia')"
              >
                i
              </button>
            </div>
            <p class="hint top">Tema, colores y paletas de la marca.</p>

            <div class="field">
              <label for="themeMode">Modo claro u oscuro</label>
              <p class="hint">Definí si la comunidad fija un tema o deja elegir a cada persona.</p>
              <select id="themeMode" v-model="form.themeMode" class="input">
                <option value="system">Dejar que cada persona elija (o seguir el celular)</option>
                <option value="light">Siempre claro</option>
                <option value="dark">Siempre oscuro</option>
              </select>
            </div>

            <div class="field">
              <label for="uxShell">Estilo visual de la app</label>
              <p class="hint">Connectia es el diseño actual. Las otras opciones son para migraciones especiales.</p>
              <select id="uxShell" v-model="form.uxShell" class="input">
                <option value="connectia">Connectia (recomendado)</option>
                <option value="modern">Moderno (variante)</option>
                <option value="legacy">Heredado (solo migración)</option>
              </select>
            </div>

            <div class="field">
              <label for="homeVariant">Home de la app (U)</label>
              <p class="hint">Clásica = muro actual. Moderna = home alternativa (20–30 años) sin tocar el muro.</p>
              <select id="homeVariant" v-model="form.homeVariant" class="input">
                <option value="classic">Clásica (muro)</option>
                <option value="genz">Moderna / alternativa</option>
              </select>
            </div>

            <div class="field">
              <label for="uiLocale">Idioma / modismo de interfaz</label>
              <p class="hint">es-CL aplica modismos chilenos en textos clave del shell (sin cambiar todo el producto).</p>
              <select id="uiLocale" v-model="form.uiLocale" class="input">
                <option value="es-AR">Español (Argentina)</option>
                <option value="es-CL">Español (Chile · modismos)</option>
              </select>
            </div>

            <div class="field">
              <span class="label-text">Paletas predefinidas</span>
              <p class="hint">Elegí un set listo. El principal + secundario forman el degradado de la marca en la app.</p>

              <div class="preset-live" :style="brandPreviewStyle">
                <span>Vista previa</span>
                <small>{{ form.branding.primary }} → {{ form.branding.secondary }}</small>
              </div>

              <div v-for="group in colorPresetGroups" :key="group.id" class="preset-group">
                <p class="preset-group-title">{{ group.label }}</p>
                <div class="preset-grid">
                  <button
                    v-for="p in group.items"
                    :key="p.id"
                    type="button"
                    class="preset-swatch"
                    :class="{ on: isPresetActive(p) }"
                    :title="`${p.label}: ${p.primary} / ${p.secondary}`"
                    :style="{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }"
                    @click="applyColorPreset(p)"
                  >
                    <span class="preset-name">{{ p.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="primary">Color principal</label>
                <p class="hint">Botones, links y acentos. También podés ajustarlo a mano.</p>
                <div class="color-line">
                  <input id="primary" v-model="form.branding.primary" type="color" class="color" />
                  <input
                    v-model="form.branding.primary"
                    class="input mono"
                    maxlength="7"
                    placeholder="var(--brand-primary)"
                    @change="normalizeHex('primary')"
                  />
                </div>
              </div>
              <div class="field">
                <label for="secondary">Color secundario</label>
                <p class="hint">Complementa al principal (degradados, detalles).</p>
                <div class="color-line">
                  <input id="secondary" v-model="form.branding.secondary" type="color" class="color" />
                  <input
                    v-model="form.branding.secondary"
                    class="input mono"
                    maxlength="7"
                    placeholder="var(--brand-secondary)"
                    @change="normalizeHex('secondary')"
                  />
                </div>
              </div>
            </div>

            <div class="field">
              <label for="pointsBtnDarkenPct">Oscuridad del botón «Hola» (muro)</label>
              <p class="hint">
                Respecto al color del header. 0% = mismo color; más alto = más oscuro. Valor actual de referencia: 22%.
              </p>
              <div class="color-line" style="align-items: center; gap: 12px">
                <input
                  id="pointsBtnDarkenPct"
                  v-model.number="form.branding.pointsBtnDarkenPct"
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  class="range"
                  style="flex: 1"
                />
                <input
                  v-model.number="form.branding.pointsBtnDarkenPct"
                  type="number"
                  min="0"
                  max="60"
                  class="input mono"
                  style="width: 4.5rem"
                />
                <span class="hint" style="margin: 0">%</span>
              </div>
              <div
                class="preset-live"
                style="margin-top: 0.65rem"
                :style="{
                  background: `color-mix(in srgb, ${form.branding.primary || '#0f766e'} ${100 - Number(form.branding.pointsBtnDarkenPct || 0)}%, #000)`,
                  color: '#fff',
                }"
              >
                <span>Vista previa · Hola Martín</span>
                <small>{{ Number(form.branding.pointsBtnDarkenPct) || 0 }}% más oscuro</small>
              </div>
            </div>
          </section>

          <!-- Splash -->
          <section v-show="activeSection === 'splash'" class="panel-body">
            <div class="panel-head">
              <h2>Splash de marca</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Splash"
                @click="openSectionInfo('splash')"
              >
                i
              </button>
            </div>
            <p class="hint top">
              Pantalla a pantalla completa al abrir el login y/o después de ingresar.
            </p>

            <div class="checks">
              <label class="check">
                <input v-model="form.branding.splash.enabledPreLogin" type="checkbox" />
                <span>
                  <strong>Mostrar antes del login</strong>
                  <small>Al abrir la pantalla de ingreso (una vez por sesión).</small>
                </span>
              </label>
              <label class="check">
                <input v-model="form.branding.splash.enabledPostLogin" type="checkbox" />
                <span>
                  <strong>Mostrar después del login</strong>
                  <small>Al ingresar con éxito y al reabrir la app con sesión activa.</small>
                </span>
              </label>
            </div>

            <div class="field">
              <label for="splashDurationSec">Duración (segundos)</label>
              <p class="hint">0 = desactiva el splash aunque los checks estén activos. Máximo 30.</p>
              <input
                id="splashDurationSec"
                v-model.number="form.branding.splash.durationSec"
                type="number"
                min="0"
                max="30"
                step="1"
                class="input"
              />
            </div>

            <div class="field">
              <label for="splashTitle">Título</label>
              <p class="hint">También se usa como título de bienvenida en el login si no hay otro.</p>
              <input id="splashTitle" v-model="form.branding.splash.title" class="input" placeholder="Nombre o saludo" />
            </div>

            <div class="field">
              <label for="splashSubtitle">Subtítulo</label>
              <input
                id="splashSubtitle"
                v-model="form.branding.splash.subtitle"
                class="input"
                placeholder="Frase corta de marca"
              />
            </div>

            <div class="field">
              <label for="splashLogoUrl">Logo del splash</label>
              <p class="hint">Vacío = usa el logo general de la comunidad.</p>
              <div class="media-row">
                <div class="media-preview" :class="{ empty: !splashLogoPreview }">
                  <img
                    v-if="splashLogoPreview && !splashLogoBroken"
                    :src="previewUrl(splashLogoPreview)"
                    alt="Logo splash"
                    @error="splashLogoBroken = true"
                  />
                  <span v-else class="media-empty">
                    {{ splashLogoPreview ? 'No se pudo cargar' : 'Usa el logo general' }}
                  </span>
                </div>
                <div class="media-actions">
                  <input
                    ref="splashLogoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
                    class="file-hidden"
                    @change="onSplashLogoFile"
                  />
                  <button
                    type="button"
                    class="btn-ghost"
                    :disabled="uploadingSplashLogo"
                    @click="splashLogoFileInput?.click()"
                  >
                    {{ uploadingSplashLogo ? 'Subiendo…' : 'Subir logo splash' }}
                  </button>
                  <button
                    v-if="form.branding.splash.logoUrl"
                    type="button"
                    class="btn-ghost danger"
                    @click="clearSplashLogo"
                  >
                    Quitar
                  </button>
                  <input
                    id="splashLogoUrl"
                    v-model="form.branding.splash.logoUrl"
                    class="input"
                    placeholder="https://… o vacío = logo general"
                    @input="splashLogoBroken = false"
                  />
                </div>
              </div>
              <p v-if="splashLogoUploadError" class="field-err">{{ splashLogoUploadError }}</p>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="splashBgColor">Color de fondo</label>
                <p class="hint">Vacío = usa el color principal / tema.</p>
                <input
                  id="splashBgColor"
                  :value="form.branding.splash.bgColor || 'var(--brand-primary)'"
                  type="color"
                  class="color"
                  @input="form.branding.splash.bgColor = $event.target.value"
                />
                <button type="button" class="linkish" @click="form.branding.splash.bgColor = ''">Usar default</button>
              </div>
              <div class="field">
                <label for="splashTextColor">Color de texto</label>
                <p class="hint">Vacío = color de marca / tema.</p>
                <input
                  id="splashTextColor"
                  :value="form.branding.splash.textColor || 'var(--brand-primary)'"
                  type="color"
                  class="color"
                  @input="form.branding.splash.textColor = $event.target.value"
                />
                <button type="button" class="linkish" @click="form.branding.splash.textColor = ''">Usar default</button>
              </div>
            </div>

            <div class="field">
              <label for="splashBgImageUrl">Imagen de fondo del splash (URL)</label>
              <p class="hint">
                Opcional. Se muestra con un velo oscuro para leer el texto. Si está vacío, usa el
                fondo de la pantalla de ingreso (Logo y fondo).
              </p>
              <input
                id="splashBgImageUrl"
                v-model="form.branding.splash.bgImageUrl"
                class="input"
                placeholder="https://… (vacío = mismo que login)"
              />
            </div>

            <div class="checks inline">
              <label class="check">
                <input v-model="form.branding.splash.showLogo" type="checkbox" />
                <span><strong>Mostrar logo</strong></span>
              </label>
              <label class="check">
                <input v-model="form.branding.splash.showTitle" type="checkbox" />
                <span><strong>Mostrar título</strong></span>
              </label>
              <label class="check">
                <input v-model="form.branding.splash.showSubtitle" type="checkbox" />
                <span><strong>Mostrar subtítulo</strong></span>
              </label>
            </div>
          </section>

          <!-- Funciones -->
          <section v-show="activeSection === 'funciones'" class="panel-body">
            <div class="panel-head">
              <h2>Funciones habilitadas</h2>
              <button
                type="button"
                class="info-btn"
                aria-label="Qué se configura en Funciones"
                @click="openSectionInfo('funciones')"
              >
                i
              </button>
            </div>
            <p class="hint top">
              Activá los módulos de esta comunidad. Lo apagado no debería ofrecerse en el menú.
              <span v-if="hasLicenseLock"> Solo podés activar lo contratado por la plataforma.</span>
            </p>
            <div class="caps-grid">
              <label
                v-for="cap in capabilityOptions"
                :key="cap.id"
                class="cap-card"
                :class="{
                  on: capsSelected.includes(cap.id),
                  locked: isCapLocked(cap.id),
                }"
                :title="isCapLocked(cap.id) ? 'No contratado — pedí upgrade a la plataforma' : ''"
              >
                <input
                  v-model="capsSelected"
                  type="checkbox"
                  :value="cap.id"
                  class="cap-check"
                  :disabled="isCapLocked(cap.id)"
                />
                <span class="cap-title">{{ cap.label }}</span>
                <span class="cap-hint">{{ cap.hint }}</span>
                <span class="cap-state">
                  {{
                    isCapLocked(cap.id)
                      ? 'No contratado'
                      : capsSelected.includes(cap.id)
                        ? 'Activo'
                        : 'Apagado'
                  }}
                </span>
              </label>
            </div>

            <div class="panel-head mt-6">
              <h2>Expediente RRHH en perfil</h2>
            </div>
            <p class="hint top">
              Si está activo, los miembros sin legajo ven un aviso amable. Los empleados con legajo
              vinculado siempre ven <strong>Mi legajo</strong> en la app (menú U), aunque este toggle esté
              apagado. Los legajos se gestionan en Admin → Empleados → Legajos RRHH.
            </p>
            <label class="check">
              <input v-model="peopleCareEnabled" type="checkbox" />
              <span><strong>Mostrar expediente en perfil</strong></span>
            </label>
            <label class="field-label">
              Etiqueta
              <input v-model="peopleCareLabel" class="input" maxlength="80" placeholder="Mi expediente" />
            </label>
          </section>
        </div>
      </div>
    </form>

    <div
      v-if="sectionInfo"
      class="info-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'section-info-title'"
      @click.self="sectionInfo = null"
    >
      <div class="info-modal-card">
        <header class="info-modal-head">
          <h3 id="section-info-title">{{ sectionInfo.title }}</h3>
          <button type="button" class="info-modal-close" aria-label="Cerrar" @click="sectionInfo = null">
            ×
          </button>
        </header>
        <p class="info-modal-lead">{{ sectionInfo.lead }}</p>
        <ul class="info-modal-list">
          <li v-for="(item, i) in sectionInfo.points" :key="i">{{ item }}</li>
        </ul>
        <p v-if="sectionInfo.tip" class="info-modal-tip"><strong>Tip.</strong> {{ sectionInfo.tip }}</p>
        <footer class="info-modal-foot">
          <button type="button" class="save" @click="sectionInfo = null">Entendido</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import ScreenHelp from '../components/ScreenHelp.vue'
import { resolveMediaUrl } from '../utils/media'
import { MODULE_CATALOG } from '../utils/moduleCatalog.js'

const sections = [
  { id: 'marca', label: 'Logo y fondo', hint: 'Login y encabezado' },
  { id: 'identidad', label: 'Identidad', hint: 'Nombre y zona' },
  { id: 'legislacion', label: 'Legislación', hint: 'AR o Chile' },
  { id: 'ingreso', label: 'Ingreso', hint: 'Login y desktop' },
  { id: 'apariencia', label: 'Apariencia', hint: 'Colores y tema' },
  { id: 'splash', label: 'Splash', hint: 'Pantalla de marca' },
  { id: 'funciones', label: 'Funciones', hint: 'Módulos de la app' },
  { id: 'app', label: 'APP', hint: 'Abrir app en otra pestaña', external: true },
]

const SECTION_INFO = {
  marca: {
    title: 'Logo y fondo',
    lead: 'Acá configurás las imágenes de marca que ven los miembros al entrar a la app.',
    points: [
      'El logo aparece en la pantalla de login y en el encabezado de la app.',
      'El fondo de ingreso es la imagen detrás del formulario de usuario/contraseña.',
      'Ese mismo fondo se usa en el splash si no configurás una imagen propia en Splash.',
      'Podés subir un archivo (PNG, JPG, SVG, etc.) o pegar una URL.',
      'Si dejás el fondo vacío, la app usa un fondo suave por defecto.',
    ],
    tip: 'Después de subir o cambiar algo, tocá Guardar cambios arriba para que quede en la comunidad.',
  },
  identidad: {
    title: 'Identidad',
    lead: 'Define cómo se nombra y se ubica temporalmente esta comunidad.',
    points: [
      'El código (ej. DEMO) es el que escriben al ingresar: no se puede cambiar.',
      'El nombre visible sale en la app, menús y correos.',
      'La zona horaria ordena fechas de publicaciones, solicitudes y reportes.',
    ],
    tip: 'Usá el nombre comercial real de la organización para que los miembros lo reconozcan al toque.',
  },
  legislacion: {
    title: 'Legislación laboral',
    lead: 'Cada comunidad configura su propio marco de vacaciones y licencias (Argentina o Chile).',
    points: [
      'Argentina (LCT): vacaciones en días corridos y tramos por antigüedad.',
      'Chile (CT): vacaciones en días hábiles, con días progresivos.',
      'El cambio aplica solo a esta comunidad; otras comunidades no se ven afectadas.',
      'Al guardar podés alinear la zona horaria y refrescar el catálogo de tipos de licencia.',
    ],
    tip: 'Si operás en Chile, elegí CL acá; no hace falta tocar Tipos de licencia a mano.',
  },
  ingreso: {
    title: 'Ingreso a la app',
    lead: 'Controla cómo y desde dónde pueden autenticarse los miembros. El login clásico sigue disponible; SSO y 2FA son complementarios.',
    points: [
      'Usuario y contraseña: ingreso clásico con cuenta interna (como siempre).',
      'ID / legajo: útil cuando no hay mail corporativo (ej. planta).',
      'SSO Microsoft / Google / Okta: entrar con la cuenta corporativa (requiere variables LOGIN_* en el servidor).',
      '2FA: código extra por email o SMS si lo exigís a todos o por usuario.',
      'Permitir desktop: si lo apagás, en PC verán un aviso para usar el celular.',
      'Dominios SSO + auto-alta: definen quién puede entrar y si se crea solo al primer login (no reemplazan el padrón).',
    ],
    tip: 'Para armar el padrón desde Google o Azure, mirá la ayuda “i” junto a Dominios de email, o andá a Usuarios → Google / Entra.',
  },
  miembros: {
    title: 'Cómo traer miembros hoy (sin desarrollo nuevo)',
    lead: 'Hay dos pasos distintos: quién puede entrar (puerta) y quiénes están el padrón (lista de usuarios). Ambos ya existen.',
    points: [
      'Puerta (esta pantalla · Ingreso): activá SSO Google y/o Microsoft, escribí el dominio (ej. sooft.com.ar) y, si querés, “Auto-alta por SSO”. Así solo esos mails pueden autenticarse y, con auto-alta, se crean al primer ingreso.',
      'Padrón (Admin → Usuarios → botón “Google / Entra”): sincronizá el directorio de Google Workspace o Microsoft Entra para precargar nombres y mails sin esperar el primer login. También podés Importar CSV/Excel.',
      'Alta manual: Usuarios → “+ Usuario” para casos puntuales.',
      'Qué aún no está: filtrar por un Google Group concreto (ej. solo el grupo “Connectia”). Hoy el IdP trae el dominio/Directory; el filtro por grupo es la Ola 38.',
      'Credenciales: SSO usa LOGIN_GOOGLE_* / LOGIN_ENTRA_* (o ENTRA_*). El sync de directorio usa GOOGLE_WORKSPACE_* y ENTRA_* en el backend. Sin env, el sync acepta pegar una lista JSON.',
    ],
    tip: 'Receta Sooft: dominio sooft.com.ar + SSO Google + auto-alta + sync Directory una vez. Guardá cambios en Comunidad antes de probar el login.',
  },
  apariencia: {
    title: 'Apariencia',
    lead: 'Define el look & feel de la marca dentro de Connectia.',
    points: [
      'Tema claro/oscuro: fijo para todos o que cada persona elija.',
      'Estilo visual: Connectia es el recomendado; el resto es para migraciones.',
      'Paletas predefinidas (clásicas, degradados y pasteles) setean principal + secundario.',
      'Esos dos colores arman botones, acentos y degradados en la app.',
    ],
    tip: 'Probá una paleta, mirá la vista previa y guardá. Los miembros ven el cambio al recargar.',
  },
  splash: {
    title: 'Splash de marca',
    lead: 'Es la pantalla a pantalla completa que refuerza la marca al abrir o después de ingresar.',
    points: [
      'Podés mostrarla antes del login, después del login, o en ambos momentos.',
      'Configurás duración, título, subtítulo, logo propio, colores e imagen de fondo.',
      'Si el logo del splash está vacío, usa el logo general de la comunidad.',
      'Si la imagen de fondo del splash está vacía, usa el fondo de la pantalla de ingreso.',
      'Duración 0 desactiva el splash aunque los checks estén activos.',
    ],
    tip: 'Mantenele 1–3 segundos: alcanza para reforzar marca sin demorar el acceso.',
  },
  funciones: {
    title: 'Funciones habilitadas',
    lead: 'Activa o apaga los módulos que esta comunidad puede usar en la app.',
    points: [
      'Muro, Solicitudes, Encuestas, Documentos, Enlaces, Chat y Menú configurable.',
      'Lo que esté apagado no debería ofrecerse en el menú de los miembros.',
      'Sirve para adaptar Connectia al alcance real de cada organización.',
    ],
    tip: 'Si apagás un módulo, revisá también el menú dinámico para no dejar links huérfanos.',
  },
}

/** Paletas: primary/secondary (el degradado de la app usa ambos). */
const colorPresetGroups = [
  {
    id: 'marca',
    label: 'Marca clásica',
    items: [
      { id: 'connectia', label: 'Connectia', primary: 'var(--brand-primary)', secondary: 'var(--brand-secondary)' },
      { id: 'ocean', label: 'Océano', primary: '#0284C7', secondary: '#075985' },
      { id: 'ink', label: 'Tinta', primary: '#334155', secondary: '#0F172A' },
      { id: 'forest', label: 'Bosque', primary: '#15803D', secondary: '#14532D' },
      { id: 'wine', label: 'Vino', primary: '#9F1239', secondary: '#4C0519' },
      { id: 'amber', label: 'Ámbar', primary: '#D97706', secondary: '#92400E' },
    ],
  },
  {
    id: 'degradados',
    label: 'Degradados',
    items: [
      { id: 'aurora', label: 'Aurora', primary: '#06B6D4', secondary: '#8B5CF6' },
      { id: 'sunset', label: 'Atardecer', primary: '#F97316', secondary: '#EC4899' },
      { id: 'midnight', label: 'Medianoche', primary: '#1D4ED8', secondary: '#7C3AED' },
      { id: 'tropic', label: 'Trópico', primary: '#14B8A6', secondary: '#0EA5E9' },
      { id: 'ember', label: 'Brasas', primary: '#EF4444', secondary: '#F59E0B' },
      { id: 'nordic', label: 'Nórdico', primary: '#64748B', secondary: '#0EA5E9' },
      { id: 'grape', label: 'Uva', primary: '#7C3AED', secondary: '#DB2777' },
      { id: 'moss', label: 'Musgo', primary: '#65A30D', secondary: 'var(--brand-primary)' },
    ],
  },
  {
    id: 'pasteles',
    label: 'Pasteles',
    items: [
      { id: 'mint', label: 'Menta', primary: '#6EE7B7', secondary: '#99F6E4' },
      { id: 'lilac', label: 'Lila', primary: '#C4B5FD', secondary: '#DDD6FE' },
      { id: 'peach', label: 'Durazno', primary: '#FDBA74', secondary: '#FED7AA' },
      { id: 'sky', label: 'Cielo', primary: '#7DD3FC', secondary: '#BAE6FD' },
      { id: 'rose', label: 'Rosa', primary: '#FDA4AF', secondary: '#FECDD3' },
      { id: 'butter', label: 'Manteca', primary: '#FDE68A', secondary: '#FEF3C7' },
      { id: 'sage', label: 'Salvia', primary: '#A7F3D0', secondary: '#D1FAE5' },
      { id: 'lavender', label: 'Lavanda', primary: '#A5B4FC', secondary: '#C7D2FE' },
      { id: 'blush', label: 'Rubor', primary: '#F9A8D4', secondary: '#FBCFE8' },
      { id: 'powder', label: 'Polvo', primary: '#93C5FD', secondary: '#BFDBFE' },
      { id: 'pistachio', label: 'Pistacho', primary: '#BEF264', secondary: '#D9F99D' },
      { id: 'coral', label: 'Coral suave', primary: '#FCA5A5', secondary: '#FECACA' },
    ],
  },
]

const capabilityOptions = MODULE_CATALOG

const auth = useAuthStore()
const theme = useThemeStore()
const form = ref(null)
const activeSection = ref('marca')
const sectionInfo = ref(null)
const loginPassword = ref(true)
const loginId = ref(false)
const loginMicrosoft = ref(false)
const loginGoogle = ref(false)
const loginOkta = ref(false)
const loginToken = ref(false)
const loginLegacy = ref(false)
const twoFactorRequired = ref(false)
const ssoAutoProvision = ref(false)
const allowedEmailDomainsText = ref('')
const capsSelected = ref([])
const licensedCapabilities = ref([])
const peopleCareEnabled = ref(false)
const peopleCareLabel = ref('Mi expediente')
const legislacionPais = ref('AR')
const syncTimezoneConPais = ref(true)
const replaceLicenseTypes = ref(true)
const saving = ref(false)
const msg = ref('')
const error = ref('')

const hasLicenseLock = computed(
  () => Array.isArray(licensedCapabilities.value) && licensedCapabilities.value.length > 0,
)

function isCapLocked(capId) {
  if (!hasLicenseLock.value) return false
  return !licensedCapabilities.value.includes(capId)
}

function memberAppBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  // En local el admin suele estar en :5174 y la app miembro en :5173
  if (typeof window !== 'undefined' && /localhost:5174/i.test(window.location.origin)) {
    return 'http://localhost:5173'
  }
  return String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

function openMemberApp() {
  const base = memberAppBaseUrl()
  const code = String(form.value?.empCodigo || auth.tenant?.empCodigo || '').trim()
  const url = code ? `${base}/login?emp=${encodeURIComponent(code)}` : `${base}/login`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function onSectionClick(s) {
  if (s?.external || s?.id === 'app') {
    openMemberApp()
    return
  }
  activeSection.value = s.id
}

const logoFileInput = ref(null)
const loginBgFileInput = ref(null)
const splashLogoFileInput = ref(null)
const uploadingLogo = ref(false)
const uploadingLoginBg = ref(false)
const uploadingSplashLogo = ref(false)
const logoUploadError = ref('')
const loginBgUploadError = ref('')
const splashLogoUploadError = ref('')
const logoBroken = ref(false)
const loginBgBroken = ref(false)
const splashLogoBroken = ref(false)

const knownCapIds = computed(() => new Set(capabilityOptions.map((c) => c.id)))

const splashLogoPreview = computed(
  () => form.value?.branding?.splash?.logoUrl || form.value?.branding?.logoUrl || '',
)

const legislacionMarco = computed(() => {
  if (legislacionPais.value === 'CL') return 'Código del Trabajo (arts. 67–68 y afines)'
  return 'Ley de Contrato de Trabajo N° 20.744'
})

const brandPreviewStyle = computed(() => {
  const p = form.value?.branding?.primary || 'var(--brand-primary)'
  const s = form.value?.branding?.secondary || 'var(--brand-secondary)'
  return {
    background: `linear-gradient(135deg, ${p}, ${s})`,
  }
})

function normalizeHexKey(value) {
  let v = String(value || '').trim()
  if (!v) return ''
  if (!v.startsWith('#')) v = `#${v}`
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return ''
  return v.toUpperCase()
}

function normalizeHex(which) {
  const key = which === 'secondary' ? 'secondary' : 'primary'
  const next = normalizeHexKey(form.value.branding[key])
  if (next) form.value.branding[key] = next
}

function isPresetActive(p) {
  const primary = normalizeHexKey(form.value?.branding?.primary)
  const secondary = normalizeHexKey(form.value?.branding?.secondary)
  return primary === normalizeHexKey(p.primary) && secondary === normalizeHexKey(p.secondary)
}

function applyColorPreset(p) {
  form.value.branding.primary = normalizeHexKey(p.primary) || p.primary
  form.value.branding.secondary = normalizeHexKey(p.secondary) || p.secondary
}

function openSectionInfo(id) {
  sectionInfo.value = SECTION_INFO[id] || null
}

function previewUrl(url) {
  return resolveMediaUrl(url)
}

function clearLogo() {
  form.value.branding.logoUrl = ''
  logoBroken.value = false
  logoUploadError.value = ''
}

function clearLoginBg() {
  form.value.branding.loginBgUrl = ''
  loginBgBroken.value = false
  loginBgUploadError.value = ''
}

function clearSplashLogo() {
  form.value.branding.splash.logoUrl = ''
  splashLogoBroken.value = false
  splashLogoUploadError.value = ''
}

async function uploadBrandFile(file, kind) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post(`/admin/tenants/upload?kind=${encodeURIComponent(kind)}`, fd)
  return data.url
}

async function onLogoFile(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  uploadingLogo.value = true
  logoUploadError.value = ''
  logoBroken.value = false
  try {
    form.value.branding.logoUrl = await uploadBrandFile(file, 'logo')
  } catch (err) {
    logoUploadError.value = err.response?.data?.error || 'No se pudo subir el logo'
  } finally {
    uploadingLogo.value = false
  }
}

async function onLoginBgFile(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  uploadingLoginBg.value = true
  loginBgUploadError.value = ''
  loginBgBroken.value = false
  try {
    form.value.branding.loginBgUrl = await uploadBrandFile(file, 'login-bg')
  } catch (err) {
    loginBgUploadError.value = err.response?.data?.error || 'No se pudo subir la imagen'
  } finally {
    uploadingLoginBg.value = false
  }
}

async function onSplashLogoFile(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  uploadingSplashLogo.value = true
  splashLogoUploadError.value = ''
  splashLogoBroken.value = false
  try {
    form.value.branding.splash.logoUrl = await uploadBrandFile(file, 'splash-logo')
  } catch (err) {
    splashLogoUploadError.value = err.response?.data?.error || 'No se pudo subir el logo del splash'
  } finally {
    uploadingSplashLogo.value = false
  }
}

function normalizeSplash(branding = {}) {
  const s = branding.splash || {}
  const duration =
    s.durationSec === 0 || s.durationSec
      ? Number(s.durationSec)
      : branding.splashDurationSec === 0 || branding.splashDurationSec
        ? Number(branding.splashDurationSec)
        : 2
  return {
    enabledPreLogin: s.enabledPreLogin !== false,
    enabledPostLogin: s.enabledPostLogin !== false,
    durationSec: Number.isFinite(duration) ? duration : 2,
    title: s.title || branding.splashTitle || '',
    subtitle: s.subtitle || branding.splashSubtitle || '',
    logoUrl: s.logoUrl || '',
    bgColor: s.bgColor || '',
    bgImageUrl: s.bgImageUrl || '',
    textColor: s.textColor || '',
    showLogo: s.showLogo !== false,
    showTitle: s.showTitle !== false,
    showSubtitle: s.showSubtitle !== false,
  }
}

onMounted(async () => {
  const { data } = await api.get('/admin/tenants/me')
  form.value = {
    ...data.tenant,
    themeMode: data.tenant.themeMode || 'system',
    uxShell: data.tenant.uxShell || 'connectia',
    homeVariant: data.tenant.homeVariant === 'genz' ? 'genz' : 'classic',
    uiLocale: data.tenant.uiLocale === 'es-CL' ? 'es-CL' : 'es-AR',
    branding: {
      primary: data.tenant.branding?.primary || 'var(--brand-primary)',
      secondary: data.tenant.branding?.secondary || 'var(--brand-secondary)',
      logoUrl: data.tenant.branding?.logoUrl || '',
      loginBgUrl: data.tenant.branding?.loginBgUrl || '',
      pointsBtnDarkenPct:
        data.tenant.branding?.pointsBtnDarkenPct == null
          ? 22
          : Number(data.tenant.branding.pointsBtnDarkenPct),
      splash: normalizeSplash(data.tenant.branding),
    },
  }
  logoBroken.value = false
  loginBgBroken.value = false
  splashLogoBroken.value = false
  const methods = data.tenant.loginMethods || []
  loginPassword.value = methods.includes('password') || methods.length === 0
  loginId.value = methods.includes('id')
  loginMicrosoft.value = methods.includes('microsoft')
  loginGoogle.value = methods.includes('google')
  loginOkta.value = methods.includes('okta')
  loginToken.value = methods.includes('token')
  loginLegacy.value = methods.includes('legacy')
  const ac = data.tenant.authConfig || {}
  twoFactorRequired.value = Boolean(ac.twoFactorRequired)
  ssoAutoProvision.value = Boolean(ac.ssoAutoProvision)
  allowedEmailDomainsText.value = (ac.allowedEmailDomains || []).join('\n')
  capsSelected.value = (data.tenant.capabilities || []).filter((c) => knownCapIds.value.has(c))
  licensedCapabilities.value = Array.isArray(data.tenant.licensedCapabilities)
    ? data.tenant.licensedCapabilities
    : []
  peopleCareEnabled.value = Boolean(data.tenant.peopleCare?.enabled)
  peopleCareLabel.value = data.tenant.peopleCare?.label || 'Mi expediente'
  legislacionPais.value = data.tenant.licenciasConfig?.pais === 'CL' ? 'CL' : 'AR'
  syncTimezoneConPais.value = true
  replaceLicenseTypes.value = true
})

watch([loginPassword, loginId, loginMicrosoft, loginGoogle, loginOkta, loginToken, loginLegacy], () => {
  if (
    !loginPassword.value &&
    !loginId.value &&
    !loginMicrosoft.value &&
    !loginGoogle.value &&
    !loginOkta.value &&
    !loginToken.value &&
    !loginLegacy.value
  ) {
    loginPassword.value = true
  }
})

async function save() {
  saving.value = true
  msg.value = ''
  error.value = ''
  try {
    const loginMethods = []
    if (loginPassword.value) loginMethods.push('password')
    if (loginId.value) loginMethods.push('id')
    if (loginMicrosoft.value) loginMethods.push('microsoft')
    if (loginGoogle.value) loginMethods.push('google')
    if (loginOkta.value) loginMethods.push('okta')
    if (loginToken.value) loginMethods.push('token')
    if (loginLegacy.value) loginMethods.push('legacy')

    const existingExtra = (form.value.capabilities || []).filter((c) => !knownCapIds.value.has(c))
    const capabilities = [...new Set([...capsSelected.value, ...existingExtra])]

    const { data } = await api.patch('/admin/tenants/me', {
      nombre: form.value.nombre,
      allowDesktop: form.value.allowDesktop,
      timezone: form.value.timezone,
      uxShell: form.value.uxShell,
      homeVariant: form.value.homeVariant,
      uiLocale: form.value.uiLocale,
      themeMode: form.value.themeMode,
      branding: form.value.branding,
      loginMethods,
      authConfig: {
        twoFactorRequired: twoFactorRequired.value,
        ssoAutoProvision: ssoAutoProvision.value,
        allowedEmailDomains: allowedEmailDomainsText.value
          .split(/[\n,;]+/)
          .map((d) => d.trim())
          .filter(Boolean),
        twoFactorMethods: ['email', 'sms'],
      },
      capabilities,
      peopleCare: {
        enabled: peopleCareEnabled.value,
        label: peopleCareLabel.value || 'Mi expediente',
      },
      licenciasConfig: {
        pais: legislacionPais.value,
        replaceTypes: replaceLicenseTypes.value,
        syncTimezone: syncTimezoneConPais.value,
      },
    })
    form.value = {
      ...form.value,
      ...data.tenant,
      branding: {
        ...form.value.branding,
        ...data.tenant.branding,
        splash: normalizeSplash(data.tenant.branding),
      },
    }
    legislacionPais.value = data.tenant.licenciasConfig?.pais === 'CL' ? 'CL' : 'AR'
    auth.tenant = {
      ...auth.tenant,
      nombre: data.tenant.nombre,
      allowDesktop: data.tenant.allowDesktop,
      branding: data.tenant.branding,
      themeMode: data.tenant.themeMode,
      licenciasConfig: data.tenant.licenciasConfig,
      timezone: data.tenant.timezone,
    }
    theme.initFromTenant(auth.tenant)
    localStorage.setItem('cxa_tenant', JSON.stringify(auth.tenant))
    const paisLabel = legislacionPais.value === 'CL' ? 'Chile' : 'Argentina'
    msg.value = `Cambios guardados (legislación ${paisLabel}). Pedile a los miembros que recarguen la app.`
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.com {
  max-width: none;
  color: var(--cx-text);
}
.com-top {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.com-hero h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}
.com-hero p {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted);
  max-width: 56ch;
}
.com-save-bar {
  flex-shrink: 0;
  padding-top: 4px;
}
.com-form {
  margin-top: 4px;
}
.com-split {
  display: grid;
  grid-template-columns: minmax(160px, 20%) minmax(0, 80%);
  gap: 16px;
  align-items: start;
  min-height: 420px;
}
@media (max-width: 860px) {
  .com-split {
    grid-template-columns: 1fr;
  }
}
.com-index {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 12px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 16px;
  padding: 8px;
}
@media (max-width: 860px) {
  .com-index {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }
}
.index-item {
  display: grid;
  gap: 2px;
  text-align: left;
  border: 0;
  background: transparent;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  color: var(--cx-text);
}
.index-item:hover {
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.index-item.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
}
.index-item.external {
  border: 1px dashed color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  margin-top: 4px;
}
.index-item.external .index-label::after {
  content: ' ↗';
  font-weight: 600;
}
.index-label {
  font-size: 13px;
  font-weight: 700;
}
.index-hint {
  font-size: 11px;
  color: var(--cx-muted);
  font-weight: 500;
}
.index-item.on .index-hint {
  color: color-mix(in srgb, var(--brand-primary) 70%, var(--cx-muted));
}
@media (max-width: 860px) {
  .index-item {
    flex: 1 1 auto;
    min-width: 110px;
  }
  .index-hint {
    display: none;
  }
}
.com-panel {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 16px;
  min-height: 420px;
}
.panel-body {
  padding: 18px 20px 10px;
  display: grid;
  gap: 4px;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
}
.panel-body h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.info-btn {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--cx-border);
  background: color-mix(in srgb, var(--cx-page) 60%, var(--cx-surface));
  color: var(--cx-muted);
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.info-btn:hover {
  color: var(--brand-primary);
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.info-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid;
  place-items: center;
  padding: 20px;
}
.info-modal-card {
  width: min(100%, 480px);
  max-height: min(84vh, 640px);
  overflow: auto;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 18px;
  border: 1px solid var(--cx-border);
  padding: 18px 18px 14px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}
.info-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.info-modal-head h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}
.info-modal-close {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.info-modal-lead {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted);
}
.info-modal-list {
  margin: 12px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}
.info-modal-list li {
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--cx-text);
}
.info-modal-tip {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted);
  background: color-mix(in srgb, var(--brand-primary) 8%, transparent);
  border-radius: 12px;
  padding: 10px 12px;
}
.info-modal-foot {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.field {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
label,
.label-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--cx-text);
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.label-row label {
  margin: 0;
}
.hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--cx-muted);
  font-weight: 400;
}
.hint.top {
  margin: 0 0 14px;
}
.linkish {
  border: 0;
  background: transparent;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  padding: 0;
  cursor: pointer;
}
.input {
  width: 100%;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
}
.input.locked {
  opacity: 0.75;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.color {
  width: 56px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 4px;
  background: var(--cx-input);
}
.color-line {
  display: flex;
  gap: 8px;
  align-items: center;
}
.color-line .input.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.preset-live {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  min-height: 72px;
  border-radius: 14px;
  padding: 12px 14px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.35);
  margin-bottom: 12px;
  border: 1px solid var(--cx-border);
}
.preset-live span {
  font-size: 13px;
  font-weight: 700;
}
.preset-live small {
  font-size: 11px;
  opacity: 0.92;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.preset-group {
  margin-bottom: 12px;
}
.preset-group-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cx-muted);
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 8px;
}
.preset-swatch {
  position: relative;
  min-height: 64px;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  box-shadow: inset 0 0 0 1px var(--sh);
}
.preset-swatch:hover {
  filter: brightness(1.03);
}
.preset-swatch.on {
  border-color: var(--ink);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 18%, transparent);
}
.preset-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(4px);
  border-radius: 999px;
  padding: 2px 8px;
}
.media-row {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 12px;
  align-items: start;
}
.media-row.tall {
  grid-template-columns: 160px 1fr;
}
@media (max-width: 640px) {
  .media-row,
  .media-row.tall {
    grid-template-columns: 1fr;
  }
}
.media-preview {
  width: 112px;
  height: 112px;
  border: 1px dashed var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 10px;
}
.media-preview.wide {
  width: 160px;
  height: 100px;
}
.media-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.media-empty {
  font-size: 11px;
  color: var(--cx-muted);
  text-align: center;
  padding: 0 6px;
  line-height: 1.3;
}
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.media-actions .input {
  flex: 1 1 100%;
}
.file-hidden {
  display: none;
}
.btn-ghost {
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost.danger {
  color: var(--bad);
  border-color: color-mix(in srgb, var(--bad) 35%, var(--cx-border));
}
.field-err {
  margin: 0;
  font-size: 12.5px;
  color: var(--bad);
}
.checks {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}
.checks.inline {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
.check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  font-weight: 400;
}
.check.solo {
  margin-bottom: 12px;
}
.check input {
  margin-top: 3px;
}
.check strong {
  display: block;
  font-size: 14px;
  color: var(--cx-text);
}
.check small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--cx-muted);
  line-height: 1.35;
}
.caps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.cap-card {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 14px 14px 12px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cx-page) 55%, var(--cx-surface));
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.cap-card:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--cx-border));
}
.cap-card.on {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.cap-card.locked {
  opacity: 0.55;
  cursor: not-allowed;
  background: color-mix(in srgb, var(--cx-page) 70%, var(--cx-surface));
}
.cap-card.locked:hover {
  border-color: var(--cx-border);
}
.cap-card.locked .cap-state {
  color: var(--warn);
}
.cap-check {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.cap-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--cx-text);
}
.cap-hint {
  font-size: 12px;
  line-height: 1.35;
  color: var(--cx-muted);
}
.cap-state {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cx-muted);
}
.cap-card.on .cap-state {
  color: var(--brand-primary);
}
.save {
  border: 0;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ok {
  margin: 0 0 12px;
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
}
.err {
  margin: 0 0 12px;
  color: var(--bad);
  background: var(--bad-bg);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
}
</style>
