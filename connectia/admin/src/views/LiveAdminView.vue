<template>
  <div class="page">
    <AdminPageHeader
      title="Live streaming"
      subtitle="Mensajes en vivo con cámara o emisiones por YouTube, Vimeo y HLS"
    >
      <template #actions>
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">
          Actualizar
        </button>
      </template>
    </AdminPageHeader>

    <ScreenHelp
      purpose="Creá emisiones En vivo (cámara) o por URL (YouTube, Vimeo, HLS). Primero se crea la emisión; después salís al aire o la activás."
      can-do="Activar el módulo, crear emisiones en Emisiones, salir al aire desde una emisión En vivo, activar/desactivar URLs y ver preview."
    />

    <nav class="tabs" aria-label="Secciones Live">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="tab"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span v-if="t.badge != null" class="tab-badge">{{ t.badge }}</span>
      </button>
    </nav>

    <p v-if="error" class="banner err" role="alert">{{ error }}</p>
    <p v-if="msg" class="banner ok" role="status">{{ msg }}</p>
    <p v-if="camError" class="banner err" role="alert">{{ camError }}</p>

    <!-- ESTADO -->
    <section v-if="tab === 'estado'" class="section">
      <header class="tab-intro">
        <h2>Estado</h2>
        <p>Encendé o apagá Live para toda la comunidad. Sin esto, los miembros no ven En vivo.</p>
      </header>

      <article class="card status-card">
        <div class="status-row">
          <div>
            <p class="status-label">Módulo</p>
            <p class="status-value" :class="liveMode ? 'is-on' : 'is-off'">
              {{ liveMode ? 'Activo' : 'Inactivo' }}
            </p>
            <p class="hint">
              {{
                liveMode
                  ? 'La app muestra En vivo y podés transmitir con cámara o URL.'
                  : 'Apagado: se oculta En vivo y se cierran emisiones en curso.'
              }}
            </p>
          </div>
          <div class="status-actions">
            <button
              v-if="!liveMode"
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

      <div class="kpi-strip" aria-label="Resumen de emisiones">
        <article class="kpi">
          <span class="kpi__label">Emisiones totales</span>
          <strong class="kpi__value">{{ emissionItems.length }}</strong>
        </article>
        <article class="kpi">
          <span class="kpi__label">Emisiones en vivo</span>
          <strong class="kpi__value">{{ cameraEmissionCount }}</strong>
        </article>
        <article class="kpi">
          <span class="kpi__label">Emisiones de stream</span>
          <strong class="kpi__value">{{ urlEmissionCount }}</strong>
        </article>
        <article class="kpi" :class="{ 'kpi--live': activeEmissionCount > 0 }">
          <span class="kpi__label">Emisiones activas</span>
          <strong class="kpi__value">{{ activeEmissionCount }}</strong>
        </article>
      </div>
    </section>

    <!-- CÓMO USARLO -->
    <section v-else-if="tab === 'howto'" class="section">
      <header class="tab-intro">
        <h2>Cómo usarlo</h2>
        <p>Flujo recomendado para un mensaje con cámara o emisiones por URL.</p>
      </header>

      <ol class="howto">
        <li class="howto__step">
          <span class="howto__num">1</span>
          <div>
            <h3>Activá el módulo</h3>
            <p>En <strong>Estado</strong>, tocá Activar. Sin eso, En vivo no aparece en la app.</p>
          </div>
        </li>
        <li class="howto__step">
          <span class="howto__num">2</span>
          <div>
            <h3>Creá una emisión</h3>
            <p>
              En <strong>Emisiones</strong> → Nueva emisión. Elegí <strong>En vivo</strong> (cámara) o
              <strong>URL</strong> (YouTube / Vimeo / HLS).
            </p>
          </div>
        </li>
        <li class="howto__step">
          <span class="howto__num">3</span>
          <div>
            <h3>Salí al aire o activá</h3>
            <p>
              En vivo: tocá <strong>Salir al aire</strong> en la card. URL: Activar. Varios admins pueden
              transmitir a la vez; los miembros eligen cuál ver.
            </p>
          </div>
        </li>
        <li class="howto__step">
          <span class="howto__num">4</span>
          <div>
            <h3>Cortá o apagá</h3>
            <p>
              Cámara: Cortar (vuelve a borrador). URL: Desactivar. Desactivar el módulo apaga todo lo activo.
            </p>
          </div>
        </li>
      </ol>
    </section>

    <!-- EMISIONES -->
    <section v-else-if="tab === 'emisiones'" class="section">
      <header class="tab-intro tab-intro--row">
        <div>
          <h2>Emisiones</h2>
          <p>
            Primero creá la emisión (En vivo o URL). Después salí al aire o activála. Varios admins
            pueden transmitir a la vez.
          </p>
        </div>
        <div class="tab-intro__actions">
          <button type="button" class="btn-primary" :disabled="!liveMode" @click="openNew">
            Nueva emisión
          </button>
        </div>
      </header>

      <div class="filters" role="toolbar" aria-label="Filtro">
        <button
          v-for="f in emissionFilters"
          :key="f.id"
          type="button"
          class="chip"
          :class="{ on: listFilter === f.id }"
          @click="listFilter = f.id"
        >
          {{ f.label }}
          <span class="chip__n">{{ f.count }}</span>
        </button>
      </div>

      <p v-if="!liveMode" class="warn-inline">
        El módulo está inactivo. Podés editar la biblioteca, pero para activar emisiones prendé Live en Estado.
      </p>

      <div v-if="!filteredItems.length" class="empty-cta">
        <p>
          {{
            emissionItems.length
              ? 'Nada con este filtro.'
              : 'Todavía no hay emisiones. Creá una En vivo o por URL.'
          }}
        </p>
        <button type="button" class="btn-primary" :disabled="!liveMode" @click="openNew">
          Nueva emisión
        </button>
      </div>

      <ul v-else class="emit-grid">
        <li
          v-for="item in filteredItems"
          :key="item.id"
          class="emit-card"
          :data-status="item.effectiveStatus"
          :data-source="item.source"
        >
          <button type="button" class="emit-card__media" @click="item.source === 'camera' ? openOwnOrPreview(item) : openPreview(item)">
            <img v-if="coverFor(item)" :src="coverFor(item)" alt="" />
            <div v-else class="emit-card__fallback" :class="{ 'emit-card__fallback--cam': item.source === 'camera' }">
              {{ item.source === 'camera' ? 'CAM' : sourceLabel(item) }}
            </div>
            <span class="pill" :class="isEmissionActive(item) ? 'live' : 'draft'">
              {{ item.source === 'camera' ? statusLabel(item) : item.activo ? 'Activa' : 'Inactiva' }}
            </span>
          </button>
          <div class="emit-card__body">
            <h3>{{ item.title }}</h3>
            <p>
              {{ item.source === 'camera' ? 'Cámara' : sourceLabel(item) }}
              <template v-if="item.source === 'camera'">
                · {{ item.peerCount || 0 }} viendo
                <template v-if="isOwnCamera(item)"> · tu sesión</template>
              </template>
              <template v-else>
                · {{ item.viewCount || 0 }} vistas
              </template>
              · {{ formatDate(item.startsAt) }}
            </p>
            <div class="emit-card__actions">
              <button
                v-if="item.source === 'camera' && !isEmissionActive(item)"
                type="button"
                class="btn-primary xs"
                :disabled="!liveMode"
                @click="openStudioFor(item)"
              >
                Al aire
              </button>
              <button
                v-if="item.source === 'camera' && isEmissionActive(item)"
                type="button"
                class="btn-ghost xs"
                @click="openStudioFor(item)"
              >
                Estudio
              </button>
              <button
                v-if="item.source === 'camera' && isEmissionActive(item)"
                type="button"
                class="btn-ghost xs danger"
                @click="endItem(item)"
              >
                Cortar
              </button>
              <button
                v-if="item.source !== 'camera'"
                type="button"
                class="btn-ghost xs"
                :class="item.activo ? 'danger' : ''"
                :disabled="!liveMode && !item.activo"
                @click="toggleEmission(item)"
              >
                {{ item.activo ? 'Desactivar' : 'Activar' }}
              </button>
              <button
                v-if="item.source !== 'camera'"
                type="button"
                class="btn-ghost xs"
                @click="openPreview(item)"
              >
                Ver
              </button>
              <button
                v-if="item.source !== 'camera' || !isEmissionActive(item)"
                type="button"
                class="btn-ghost xs"
                @click="edit(item)"
              >
                Editar
              </button>
              <button type="button" class="btn-ghost xs danger" @click="remove(item)">
                Borrar
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- MODAL ESTUDIO (sale al aire sobre una emisión En vivo ya creada) -->
    <div v-if="cameraModalOpen" class="sheet" @click.self="closeCameraModal">
      <div class="studio-modal" role="dialog" aria-modal="true" aria-labelledby="cam-modal-title">
        <header class="editor__head">
          <div>
            <h2 id="cam-modal-title">Estudio · En vivo</h2>
            <p>{{ cameraTitle || 'Emisión' }} · hasta ~{{ maxPeers }} conexiones</p>
          </div>
          <button type="button" class="icon-x" aria-label="Cerrar" @click="closeCameraModal">×</button>
        </header>

        <p v-if="!liveMode" class="warn-inline studio-modal__warn">
          Activá el módulo en Estado antes de transmitir.
        </p>
        <p v-else-if="!studioLiveId" class="warn-inline studio-modal__warn">
          Creá primero una emisión En vivo desde Emisiones.
        </p>

        <div class="studio-layout studio-layout--modal">
          <div class="studio-main">
            <div class="preview-stage">
              <video
                ref="setPreviewRef"
                class="preview-video"
                autoplay
                muted
                playsinline
                webkit-playsinline
              />
              <div v-if="camBroadcasting" class="stage-overlay">
                <span class="live-pill pulse">EN VIVO</span>
                <span class="viewers">{{ camPeerCount }} viendo</span>
              </div>
              <p v-if="!camLocalStream" class="preview-placeholder">
                Tocá «Salir al aire» para prender la cámara
              </p>
            </div>

            <div class="studio-panel">
              <p class="on-air-title">{{ camBroadcasting ? (camLive?.title || cameraTitle) : cameraTitle }}</p>

              <div class="ctl-row">
                <button
                  v-if="!camBroadcasting"
                  type="button"
                  class="btn-primary btn-lg"
                  :disabled="!liveMode || !studioLiveId || startingCam"
                  @click="startCamera"
                >
                  {{ startingCam ? 'Iniciando…' : 'Salir al aire' }}
                </button>
                <button
                  v-else
                  type="button"
                  class="btn-ghost danger btn-lg"
                  @click="stopCamera"
                >
                  Cortar emisión
                </button>
                <button
                  type="button"
                  class="btn-ghost"
                  :class="{ dim: camMuted }"
                  :disabled="!camLocalStream"
                  @click="setMuted(!camMuted)"
                >
                  {{ camMuted ? 'Mic off' : 'Mic' }}
                </button>
                <button
                  type="button"
                  class="btn-ghost"
                  :class="{ dim: camCameraOff }"
                  :disabled="!camLocalStream"
                  @click="setCameraOff(!camCameraOff)"
                >
                  {{ camCameraOff ? 'Cam off' : 'Cámara' }}
                </button>
              </div>
              <p class="studio-hint">
                HTTPS o localhost. Redes difíciles pueden necesitar TURN (<code>LIVE_TURN_*</code>).
              </p>
            </div>
          </div>

          <aside class="phone-aside" aria-label="Cómo lo ven los miembros">
            <p class="phone-aside__label">Preview app</p>
            <div class="phone">
              <div class="phone__notch" />
              <div class="phone__screen">
                <header class="phone__bar">
                  <span>En vivo</span>
                  <span v-if="camBroadcasting" class="phone__live">LIVE</span>
                </header>
                <div class="phone__player">
                  <video
                    v-show="camLocalStream"
                    ref="setPhonePreviewRef"
                    class="phone__video"
                    autoplay
                    playsinline
                    muted
                  />
                  <p v-if="!camLocalStream" class="phone__empty">Sin señal</p>
                </div>
                <p class="phone__title">
                  {{ camBroadcasting ? (camLive?.title || cameraTitle) : cameraTitle || 'Esperando' }}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <!-- MODAL VISTA PREVIA EMISIÓN -->
    <div v-if="previewModalOpen && previewItem" class="sheet" @click.self="closePreview">
      <div class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="prev-modal-title">
        <header class="editor__head">
          <div>
            <h2 id="prev-modal-title">Vista previa</h2>
            <p>{{ previewItem.title }}</p>
          </div>
          <button type="button" class="icon-x" aria-label="Cerrar" @click="closePreview">×</button>
        </header>
        <div class="preview-modal__body">
          <div class="desk-player">
            <iframe
              v-if="embedUrl(previewItem.streamUrl)"
              :src="embedUrl(previewItem.streamUrl)"
              title="Preview"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            />
            <img
              v-else-if="coverFor(previewItem)"
              :src="coverFor(previewItem)"
              alt=""
              class="desk-player__img"
            />
            <p v-else-if="previewItem.source === 'camera'" class="desk-player--cam">
              Abrí el <strong>Estudio</strong> de esta emisión para transmitir.
            </p>
            <a
              v-else-if="previewItem.streamUrl"
              class="btn-ghost"
              :href="previewItem.streamUrl"
              target="_blank"
              rel="noopener"
            >
              Abrir URL del stream
            </a>
          </div>
          <aside class="phone-aside">
            <p class="phone-aside__label">App miembro</p>
            <div class="phone">
              <div class="phone__notch" />
              <div class="phone__screen">
                <header class="phone__bar">
                  <span>En vivo</span>
                  <span v-if="previewItem.activo || previewItem.effectiveStatus === 'live'" class="phone__live">LIVE</span>
                </header>
                <div class="phone__player">
                  <iframe
                    v-if="embedUrl(previewItem.streamUrl)"
                    :src="embedUrl(previewItem.streamUrl)"
                    title="Phone preview"
                    allow="autoplay; encrypted-media"
                    referrerpolicy="strict-origin-when-cross-origin"
                  />
                  <img
                    v-else-if="coverFor(previewItem)"
                    :src="coverFor(previewItem)"
                    alt=""
                  />
                  <p v-else class="phone__empty">Sin media</p>
                </div>
                <p class="phone__title">{{ previewItem.title }}</p>
                <p class="phone__sub">
                  {{ previewItem.source === 'camera' ? 'Cámara' : sourceLabel(previewItem) }}
                  · {{ previewItem.activo ? 'Activa' : statusLabel(previewItem) }}
                </p>
              </div>
            </div>
          </aside>
        </div>
        <footer class="editor__foot">
          <button type="button" class="btn-ghost" @click="closePreview">Cerrar</button>
        </footer>
      </div>
    </div>

    <!-- MODAL EMISIÓN -->
    <div v-if="editorOpen" class="sheet" @click.self="editorOpen = false">
      <form class="editor" @submit.prevent="save">
        <header class="editor__head">
          <div>
            <h2>{{ form.id ? 'Editar emisión' : 'Nueva emisión' }}</h2>
            <p>
              {{
                form.kind === 'camera'
                  ? 'En vivo con cámara · después salís al aire desde Emisiones'
                  : 'URL externa · YouTube, Vimeo o HLS'
              }}
            </p>
          </div>
          <button type="button" class="icon-x" aria-label="Cerrar" @click="editorOpen = false">×</button>
        </header>

        <div class="editor__grid">
          <div class="editor__form">
            <div v-if="!form.id" class="source-block">
              <p class="field-label">Tipo</p>
              <div class="source-tabs" role="tablist">
                <button
                  type="button"
                  class="source-tab"
                  :class="{ on: form.kind === 'camera' }"
                  @click="form.kind = 'camera'"
                >
                  En vivo
                </button>
                <button
                  type="button"
                  class="source-tab"
                  :class="{ on: form.kind === 'url' }"
                  @click="form.kind = 'url'"
                >
                  URL
                </button>
              </div>
            </div>

            <label>
              Título
              <input
                v-model="form.title"
                required
                maxlength="200"
                :placeholder="form.kind === 'camera' ? 'Ej. Mensaje de la dirección' : 'Nombre de la emisión'"
              />
            </label>

            <template v-if="form.kind === 'url'">
              <div class="source-block">
                <p class="field-label">Origen</p>
                <div class="source-tabs" role="tablist">
                  <button
                    v-for="opt in sourceOptions"
                    :key="opt.id"
                    type="button"
                    class="source-tab"
                    :class="{ on: streamSource === opt.id }"
                    @click="streamSource = opt.id"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <div class="url-row">
                  <input v-model="form.streamUrl" required :placeholder="streamPlaceholder" />
                  <button type="button" class="btn-primary" @click="openStreamSearch">Buscar</button>
                </div>
                <p class="field-hint">Buscá y elegí, o pegá la URL si ya la tenés.</p>
              </div>

              <label class="check">
                <input v-model="form.activateNow" type="checkbox" :disabled="!liveMode" />
                Activar al guardar (visible en En vivo)
              </label>
              <p class="field-hint">
                Si no la activás, queda inactiva en Emisiones para usarla después.
              </p>
            </template>

            <p v-else class="field-hint">
              Se guarda como borrador. En Emisiones tocá <strong>Salir al aire</strong> para transmitir
              con tu cámara.
            </p>

            <details class="more">
              <summary>Opciones avanzadas</summary>
              <label>Inicio <input v-model="form.startsAt" type="datetime-local" /></label>
              <label>Cover URL <input v-model="form.coverUrl" placeholder="https://…" /></label>
              <label v-if="form.kind === 'url'">
                Replay URL <input v-model="form.replayUrl" placeholder="opcional" />
              </label>
              <label v-if="form.kind === 'url'">
                Fin <input v-model="form.endsAt" type="datetime-local" />
              </label>
            </details>
          </div>

          <aside class="editor__preview">
            <p class="field-label">Preview</p>
            <div class="editor__player">
              <template v-if="form.kind === 'camera'">
                <div class="editor__player-empty editor__player-empty--cam">
                  En vivo · cámara del admin
                </div>
              </template>
              <template v-else>
                <iframe
                  v-if="embedUrl(form.streamUrl)"
                  :src="embedUrl(form.streamUrl)"
                  title="Preview emisión"
                  allow="encrypted-media; picture-in-picture"
                  referrerpolicy="strict-origin-when-cross-origin"
                />
                <img v-else-if="form.coverUrl" :src="form.coverUrl" alt="" />
                <p v-else class="editor__player-empty">Elegí un video para verlo acá</p>
              </template>
            </div>
            <p class="picked-url">
              {{ form.kind === 'camera' ? 'Sin URL · WebRTC' : form.streamUrl || 'Sin URL' }}
            </p>
          </aside>
        </div>

        <footer class="editor__foot">
          <button type="button" class="btn-ghost" @click="editorOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </footer>
      </form>
    </div>

    <MediaUrlPickerModal
      v-if="streamPickerOpen"
      :kind="streamSource"
      :initial-query="form.title"
      @close="streamPickerOpen = false"
      @select="onStreamPicked"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'
import MediaUrlPickerModal from '../components/MediaUrlPickerModal.vue'
import { useCameraLiveHost } from '../composables/useCameraLiveHost'

const auth = useAuthStore()
const tab = ref('estado')
const loading = ref(false)
const items = ref([])
const error = ref('')
const msg = ref('')
const editorOpen = ref(false)
const streamPickerOpen = ref(false)
const streamSource = ref('youtube')
const toggling = ref(false)
const startingCam = ref(false)
const statusInfo = ref(null)
const cameraTitle = ref('')
const studioLiveId = ref('')
const listFilter = ref('all')
const cameraModalOpen = ref(false)
const previewModalOpen = ref(false)
const previewItem = ref(null)
let refreshTimer = null

const liveMode = computed(() => Boolean(statusInfo.value?.liveMode))
const maxPeers = computed(() => statusInfo.value?.maxPeers || 40)
const myUserId = computed(() => String(auth.user?.id || auth.user?._id || ''))

const {
  live: camLive,
  localStream: camLocalStream,
  previewEl,
  broadcasting: camBroadcasting,
  peerCount: camPeerCount,
  error: camError,
  muted: camMuted,
  cameraOff: camCameraOff,
  start: startCamHost,
  stop: stopCamHost,
  setMuted,
  setCameraOff,
  bindPreview,
  bindPreviewSoon,
} = useCameraLiveHost()

function isEmissionActive(item) {
  if (!item) return false
  if (item.source === 'camera') {
    return item.effectiveStatus === 'live' || item.status === 'live'
  }
  return Boolean(item.activo)
}

function isOwnCamera(item) {
  if (!item || item.source !== 'camera') return false
  if (camLive.value?.id && item.id === camLive.value.id) return true
  const owner = item.createdByUserId ? String(item.createdByUserId) : ''
  return Boolean(owner && myUserId.value && owner === myUserId.value)
}

/** URLs + emisiones En vivo (borrador o al aire). Las finalizadas se ocultan. */
const emissionItems = computed(() =>
  items.value.filter((i) => {
    if (i.source !== 'camera') return true
    return i.status !== 'ended' && i.effectiveStatus !== 'ended'
  }),
)

const cameraEmissionCount = computed(
  () => emissionItems.value.filter((i) => i.source === 'camera').length,
)

const urlEmissionCount = computed(
  () => emissionItems.value.filter((i) => i.source !== 'camera').length,
)

const activeEmissionCount = computed(
  () => emissionItems.value.filter((i) => isEmissionActive(i)).length,
)

const tabs = computed(() => [
  { id: 'estado', label: 'Estado' },
  { id: 'howto', label: 'Cómo usarlo' },
  {
    id: 'emisiones',
    label: 'Emisiones',
    badge: activeEmissionCount.value || null,
  },
])

const emissionFilters = computed(() => {
  const all = emissionItems.value
  return [
    { id: 'all', label: 'Emisiones totales', count: all.length },
    { id: 'camera', label: 'Emisiones en vivo', count: all.filter((i) => i.source === 'camera').length },
    { id: 'url', label: 'Emisiones de stream', count: all.filter((i) => i.source !== 'camera').length },
    { id: 'air', label: 'Emisiones activas', count: all.filter((i) => isEmissionActive(i)).length },
    {
      id: 'inactive',
      label: 'Emisiones inactivas',
      count: all.filter((i) => !isEmissionActive(i)).length,
    },
  ]
})

const filteredItems = computed(() => {
  const all = emissionItems.value
  if (listFilter.value === 'camera') return all.filter((i) => i.source === 'camera')
  if (listFilter.value === 'url') return all.filter((i) => i.source !== 'camera')
  if (listFilter.value === 'air' || listFilter.value === 'live') {
    return all.filter((i) => isEmissionActive(i))
  }
  if (listFilter.value === 'inactive') return all.filter((i) => !isEmissionActive(i))
  return all
})

const sourceOptions = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'hls', label: 'HLS' },
]

const streamPlaceholder = computed(() => {
  if (streamSource.value === 'vimeo') return 'https://vimeo.com/…'
  if (streamSource.value === 'hls') return 'https://…/stream.m3u8'
  return 'https://www.youtube.com/watch?v=…'
})

const phonePreviewEl = ref(null)

function setPreviewRef(el) {
  previewEl.value = el || null
  if (el && camLocalStream.value) {
    el.srcObject = camLocalStream.value
    el.muted = true
    el.playsInline = true
    el.play?.().catch(() => {})
  }
}

function setPhonePreviewRef(el) {
  phonePreviewEl.value = el || null
  if (el && camLocalStream.value) {
    el.srcObject = camLocalStream.value
    el.muted = true
    el.playsInline = true
    el.play?.().catch(() => {})
  }
}

watch(camLocalStream, (stream) => {
  if (previewEl.value) {
    previewEl.value.srcObject = stream || null
    if (stream) {
      previewEl.value.muted = true
      previewEl.value.play?.().catch(() => {})
    }
  }
  if (phonePreviewEl.value) {
    phonePreviewEl.value.srcObject = stream || null
    if (stream) {
      phonePreviewEl.value.muted = true
      phonePreviewEl.value.play?.().catch(() => {})
    }
  }
})

const form = reactive({
  id: '',
  kind: 'camera',
  title: '',
  streamUrl: '',
  coverUrl: '',
  replayUrl: '',
  activateNow: false,
  startsAt: '',
  endsAt: '',
})

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

function toLocalInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function statusLabel(item) {
  const s = item?.effectiveStatus || item?.status
  if (s === 'live') return 'En vivo'
  if (s === 'scheduled') return 'Programado'
  if (s === 'ended') return 'Finalizado'
  if (s === 'draft') return 'Borrador'
  return s || '—'
}

function sourceLabel(item) {
  return detectStreamSource(item?.streamUrl).toUpperCase()
}

function detectStreamSource(url) {
  const s = String(url || '')
  if (/\.m3u8(\?|$)/i.test(s)) return 'hls'
  if (/vimeo\.com/i.test(s)) return 'vimeo'
  return 'youtube'
}

function embedUrl(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}`
  const vm = String(url || '').match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d{6,})/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return ''
}

function coverFor(item) {
  if (item?.coverUrl) return item.coverUrl
  const m = String(item?.streamUrl || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/)
  if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`
  return ''
}

function openStreamSearch() {
  streamPickerOpen.value = true
}

function onStreamPicked({ url, title, imageUrl }) {
  if (url) form.streamUrl = url
  if (title && !form.title.trim()) form.title = String(title).slice(0, 200)
  if (imageUrl) form.coverUrl = imageUrl
  streamPickerOpen.value = false
}

async function openStudioFor(item) {
  if (!item || item.source !== 'camera') return
  studioLiveId.value = item.id
  cameraTitle.value = item.title || 'Mensaje en vivo'
  cameraModalOpen.value = true
  await bindPreviewSoon()
}

function closeCameraModal() {
  cameraModalOpen.value = false
  if (!camBroadcasting.value) {
    studioLiveId.value = ''
  }
}

function openOwnOrPreview(item) {
  if (item?.source === 'camera') {
    openStudioFor(item)
    return
  }
  openPreview(item)
}

function openPreview(item) {
  if (!item) return
  if (item.source === 'camera') {
    openStudioFor(item)
    return
  }
  previewItem.value = item
  previewModalOpen.value = true
}

function closePreview() {
  previewModalOpen.value = false
  previewItem.value = null
}

async function loadStatus() {
  try {
    const { data } = await api.get('/admin/live/status')
    statusInfo.value = data
  } catch {
    statusInfo.value = { liveMode: false, liveNow: 0, scheduled: 0, total: 0 }
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await loadStatus()
    const { data } = await api.get('/admin/live')
    items.value = data.items || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  } finally {
    loading.value = false
  }
}

async function activate() {
  toggling.value = true
  error.value = ''
  msg.value = ''
  try {
    await api.post('/admin/live/activate')
    msg.value = 'Módulo Live activado'
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
      '¿Desactivar Live? Se oculta En vivo en la app y se cierran las emisiones en curso.',
    )
  ) {
    return
  }
  if (camBroadcasting.value) await stopCamHost()
  toggling.value = true
  error.value = ''
  msg.value = ''
  try {
    const { data } = await api.post('/admin/live/deactivate')
    const n = Number(data?.livesEnded) || 0
    msg.value =
      n > 0
        ? `Módulo Live desactivado. Se cerraron ${n} emisión${n === 1 ? '' : 'es'} en vivo.`
        : 'Módulo Live desactivado.'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo desactivar'
  } finally {
    toggling.value = false
  }
}

async function startCamera() {
  if (!liveMode.value || !studioLiveId.value) return
  if (!cameraModalOpen.value) cameraModalOpen.value = true
  startingCam.value = true
  error.value = ''
  msg.value = ''
  try {
    await nextTick()
    await startCamHost({
      liveId: studioLiveId.value,
      title: cameraTitle.value || 'Mensaje en vivo',
    })
    await bindPreviewSoon()
    msg.value = 'Estás en vivo. Los miembros pueden verte en En vivo.'
    tab.value = 'emisiones'
    listFilter.value = 'air'
    await load()
  } catch {
    /* camError */
  } finally {
    startingCam.value = false
  }
}

async function stopCamera() {
  await stopCamHost()
  msg.value = 'Emisión cortada'
  await load()
}

function openNew() {
  if (!liveMode.value) {
    msg.value = ''
    error.value = 'Activá el módulo Live antes de crear una emisión'
    tab.value = 'estado'
    return
  }
  streamSource.value = 'youtube'
  Object.assign(form, {
    id: '',
    kind: 'camera',
    title: '',
    streamUrl: '',
    coverUrl: '',
    replayUrl: '',
    activateNow: false,
    startsAt: toLocalInput(new Date()),
    endsAt: '',
  })
  editorOpen.value = true
}

function edit(item) {
  if (!item) return
  if (item.source === 'camera') {
    if (isEmissionActive(item)) return
    Object.assign(form, {
      id: item.id,
      kind: 'camera',
      title: item.title,
      streamUrl: '',
      coverUrl: item.coverUrl || '',
      replayUrl: '',
      activateNow: false,
      startsAt: toLocalInput(item.startsAt),
      endsAt: '',
    })
    editorOpen.value = true
    return
  }
  streamSource.value = detectStreamSource(item.streamUrl)
  Object.assign(form, {
    id: item.id,
    kind: 'url',
    title: item.title,
    streamUrl: item.streamUrl,
    coverUrl: item.coverUrl || '',
    replayUrl: item.replayUrl || '',
    activateNow: Boolean(item.activo),
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
  })
  editorOpen.value = true
}

async function save() {
  error.value = ''
  try {
    if (form.kind === 'camera') {
      const payload = {
        title: form.title,
        coverUrl: form.coverUrl,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        audience: { mode: 'all' },
      }
      let createdId = form.id
      if (form.id) {
        await api.patch(`/admin/live/${form.id}`, payload)
        msg.value = 'Emisión En vivo actualizada. Tocá Salir al aire cuando quieras transmitir.'
      } else {
        const { data } = await api.post('/admin/live', { ...payload, source: 'camera' })
        createdId = data?.live?.id || ''
        msg.value = 'Emisión En vivo creada. Tocá Salir al aire para transmitir.'
      }
      editorOpen.value = false
      tab.value = 'emisiones'
      listFilter.value = 'camera'
      await load()
      if (createdId && !form.id) {
        const item = items.value.find((i) => i.id === createdId)
        if (item) await openStudioFor(item)
      }
      return
    }

    const payload = {
      title: form.title,
      streamUrl: form.streamUrl,
      coverUrl: form.coverUrl,
      replayUrl: form.replayUrl,
      activo: Boolean(form.activateNow),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      audience: { mode: 'all' },
    }
    if (form.id) await api.patch(`/admin/live/${form.id}`, payload)
    else await api.post('/admin/live', { ...payload, activateNow: payload.activo })
    editorOpen.value = false
    msg.value = form.activateNow ? 'Emisión guardada y activa' : 'Emisión guardada (inactiva)'
    tab.value = 'emisiones'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar'
  }
}

async function toggleEmission(item) {
  if (item.source === 'camera') return
  error.value = ''
  try {
    if (item.activo) {
      await api.post(`/admin/live/${item.id}/deactivate-emission`)
      msg.value = `«${item.title}» quedó inactiva (sigue en Emisiones)`
    } else {
      await api.post(`/admin/live/${item.id}/activate-emission`)
      msg.value = `«${item.title}» activada · visible en En vivo`
    }
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cambiar el estado'
  }
}

async function endItem(item) {
  if (!item) return
  if (item.source === 'camera') {
    if (camLive.value?.id === item.id) {
      await stopCamera()
      return
    }
    if (!isEmissionActive(item)) return
    error.value = ''
    try {
      await api.post(`/admin/live/camera/${item.id}/stop`)
      msg.value = 'Emisión de cámara cortada'
      await load()
    } catch (e) {
      error.value = e?.response?.data?.error || 'No se pudo cortar'
    }
    return
  }
  if (item.activo) await toggleEmission(item)
}

async function remove(item) {
  if (!confirm(`¿Borrar «${item.title}»?`)) return
  if (item.source === 'camera' && camLive.value?.id === item.id) await stopCamHost()
  await api.delete(`/admin/live/${item.id}`)
  if (studioLiveId.value === item.id) {
    studioLiveId.value = ''
    cameraModalOpen.value = false
  }
  msg.value = 'Emisión borrada'
  await load()
}

onMounted(() => {
  load()
  refreshTimer = setInterval(() => {
    if (!editorOpen.value && !cameraModalOpen.value && !previewModalOpen.value) load()
  }, 12000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.page { padding: 0.25rem 0 2rem; max-width: 1200px; }

.btn-ghost, .btn-primary {
  border: 0; border-radius: 10px; padding: 0.45rem 0.85rem; cursor: pointer; font-weight: 600; font: inherit;
}
.btn-ghost { background: var(--panel-2); color: var(--ink); border: 1px solid var(--line); }
.btn-ghost.danger { color: var(--bad); }
.btn-ghost.sm { padding: 0.3rem 0.55rem; font-size: 0.8rem; border-radius: 8px; }
.btn-ghost.xs, .btn-primary.xs {
  padding: 0.22rem 0.4rem; font-size: 0.72rem; border-radius: 7px; font-weight: 650; white-space: nowrap;
}
.btn-ghost.dim { opacity: 0.55; }
.btn-primary { background: var(--brand-primary, var(--bad, #b91c1c)); color: #fff; }
.btn-primary.sm { padding: 0.3rem 0.55rem; font-size: 0.8rem; border-radius: 8px; }
.btn-primary:disabled, .btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-lg { padding: 0.65rem 1.1rem; font-size: 0.95rem; }
.btn-live { border-color: #dc2626; color: #dc2626; }

.tabs {
  display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 1rem 0 1.1rem;
  padding: 0.25rem; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line);
}
.tab {
  border: 0; background: transparent; color: var(--ink-soft); font-weight: 700; font-size: 0.86rem;
  padding: 0.5rem 0.85rem; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;
}
.tab.on { background: var(--panel); color: var(--ink); box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 12%, transparent); }
.tab-badge {
  font-size: 0.68rem; min-width: 1.1rem; height: 1.1rem; padding: 0 0.3rem; border-radius: 999px;
  background: color-mix(in srgb, var(--bad, #dc2626) 18%, var(--panel)); color: var(--bad, #dc2626);
  display: inline-grid; place-items: center;
}

.banner { margin: 0 0 0.75rem; padding: 0.55rem 0.75rem; border-radius: 10px; font-size: 0.88rem; }
.banner.err { background: color-mix(in srgb, var(--bad) 12%, var(--panel)); color: var(--bad); }
.banner.ok { background: color-mix(in srgb, var(--ok, #047857) 12%, var(--panel)); color: var(--ok, #047857); }

.tab-intro {
  margin: 0 0 1rem; padding: 0.85rem 1rem; border-radius: 12px;
  border: 1px solid var(--line); background: var(--panel-2);
}
.tab-intro--row { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: center; }
.tab-intro__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.tab-intro h2 { margin: 0 0 0.25rem; font-size: 1.05rem; }
.tab-intro p { margin: 0; font-size: 0.9rem; color: var(--ink-soft); line-height: 1.4; }

.card {
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 1rem 1.1rem;
}
.status-card { margin-bottom: 0.85rem; }
.status-row { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; }
.status-label { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-faint, var(--ink-soft)); }
.status-value { margin: 0.15rem 0 0.35rem; font-size: 1.55rem; font-weight: 800; }
.status-value.is-on { color: var(--ok, #047857); }
.status-value.is-off { color: var(--bad, #b91c1c); }
.status-actions { display: flex; gap: 0.5rem; }
.hint { margin: 0; font-size: 0.88rem; color: var(--ink-soft); max-width: 36rem; line-height: 1.4; }

.kpi-strip {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.55rem; margin-bottom: 0.85rem;
}
@media (max-width: 800px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
.kpi {
  background: var(--panel-2); border: 1px solid var(--line); border-radius: 12px; padding: 0.75rem 0.9rem;
  display: grid; gap: 0.15rem;
}
.kpi--live { border-color: color-mix(in srgb, #dc2626 45%, var(--line)); }
.kpi__label {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
  color: var(--ink-soft); line-height: 1.25; min-height: 2.1em;
}
.kpi__value { font-size: 1.35rem; font-weight: 800; }

.live-pill {
  background: #dc2626; color: #fff; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em;
  padding: 0.25rem 0.5rem; border-radius: 999px; white-space: nowrap;
}
.live-pill.pulse { animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.warn-inline {
  margin: 0 0 0.85rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.88rem; line-height: 1.4;
  background: color-mix(in srgb, var(--warn, #b45309) 12%, var(--panel)); color: var(--warn, #b45309);
}

.studio-modal {
  width: min(920px, calc(100vw - 2rem));
  max-height: min(90vh, 780px);
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 22px 50px color-mix(in srgb, var(--ink) 28%, transparent);
  padding-bottom: 1rem;
}
.studio-modal__warn { margin: 0.75rem 1.05rem 0; }
.studio-layout {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(220px, 280px); gap: 1.1rem; align-items: start;
}
.studio-layout--modal { padding: 0.85rem 1.05rem 0; }
@media (max-width: 900px) { .studio-layout { grid-template-columns: 1fr; } }
.studio-main { display: grid; gap: 0.85rem; }
.preview-stage {
  position: relative; aspect-ratio: 16/9; background: #0b0f14; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--line);
}
.preview-video {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; transform: scaleX(-1); background: #0b0f14; z-index: 1;
}
.preview-placeholder {
  position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; margin: 0; color: #94a3b8; font-size: 0.92rem;
  padding: 1rem; text-align: center; pointer-events: none;
}
.stage-overlay {
  position: absolute; top: 0.65rem; left: 0.65rem; right: 0.65rem; z-index: 3;
  display: flex; justify-content: space-between; align-items: center; pointer-events: none;
}
.viewers {
  background: color-mix(in srgb, #000 55%, transparent); color: #fff; font-size: 0.78rem; font-weight: 700;
  padding: 0.25rem 0.55rem; border-radius: 999px;
}
.studio-panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 0.95rem 1rem;
  display: grid; gap: 0.7rem;
}
.studio-panel label { display: grid; gap: 0.25rem; font-size: 0.88rem; }
.studio-panel input {
  padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid var(--line-2, var(--line));
  font: inherit; background: var(--panel); color: inherit;
}
.ctl-row { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.on-air-title { margin: 0; font-weight: 700; font-size: 1.05rem; }
.studio-hint { margin: 0; font-size: 0.78rem; color: var(--ink-soft); line-height: 1.35; }
.studio-hint code { font-size: 0.85em; }

.phone-aside { display: grid; gap: 0.45rem; justify-items: center; }
.phone-aside__label {
  margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-soft);
}
.phone {
  width: 220px; background: #111827; border-radius: 28px; padding: 10px; border: 2px solid #374151;
  box-shadow: 0 16px 40px color-mix(in srgb, var(--ink) 18%, transparent);
}
.phone--lg { width: 250px; }
.phone__notch {
  width: 72px; height: 8px; border-radius: 999px; background: #1f2937; margin: 4px auto 8px;
}
.phone__screen {
  background: #0f172a; border-radius: 20px; overflow: hidden; min-height: 360px; color: #e2e8f0;
}
.phone__bar {
  display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.75rem;
  font-size: 0.85rem; font-weight: 700; border-bottom: 1px solid #1e293b;
}
.phone__live {
  background: #dc2626; color: #fff; font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 5px;
}
.phone__player {
  aspect-ratio: 16/9; background: #000; display: grid; place-items: center; overflow: hidden;
}
.phone__player iframe, .phone__player img, .phone__video {
  width: 100%; height: 100%; border: 0; object-fit: cover;
}
.phone__video { transform: scaleX(-1); }
.phone__empty { margin: 0; font-size: 0.8rem; color: #64748b; }
.phone__title { margin: 0.65rem 0.75rem 0.15rem; font-size: 0.88rem; font-weight: 700; }
.phone__sub { margin: 0 0.75rem 0.85rem; font-size: 0.75rem; color: #94a3b8; }

.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
.chip {
  border: 1px solid var(--line); background: var(--panel); color: var(--ink-soft);
  border-radius: 999px; padding: 0.32rem 0.6rem; font-size: 0.76rem; font-weight: 700; cursor: pointer;
  display: inline-flex; gap: 0.3rem; align-items: center;
}
.chip.on { background: var(--panel-2); color: var(--ink); border-color: var(--ink-soft); }
.chip__n {
  font-size: 0.72rem; background: var(--panel-2); padding: 0.05rem 0.35rem; border-radius: 999px;
}
.chip.on .chip__n { background: var(--panel); }

.empty-cta {
  text-align: center; padding: 2rem 1rem; border: 1px dashed var(--line); border-radius: 14px; color: var(--ink-soft);
  display: grid; gap: 0.75rem; justify-items: center;
}
.empty-cta__row { display: flex; flex-wrap: wrap; gap: 0.45rem; justify-content: center; }

.emit-grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.85rem;
}
.emit-card {
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden;
  display: grid; min-width: 0;
}
.emit-card__media {
  position: relative; aspect-ratio: 16/9; border: 0; padding: 0; cursor: pointer; background: #0b0f14; color: inherit;
}
.emit-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.emit-card__fallback {
  width: 100%; height: 100%; display: grid; place-items: center; color: #94a3b8; font-weight: 800; letter-spacing: 0.06em;
}
.emit-card__fallback--cam {
  background: linear-gradient(145deg, #1e1b4b, #0f172a);
  color: #fca5a5;
}
.emit-card[data-source='camera'] { border-color: color-mix(in srgb, #dc2626 35%, var(--line)); }
.emit-card__media .pill {
  position: absolute; top: 0.45rem; left: 0.45rem;
}
.emit-card__body { padding: 0.7rem 0.75rem 0.75rem; display: grid; gap: 0.3rem; min-width: 0; }
.emit-card__body h3 { margin: 0; font-size: 0.95rem; line-height: 1.3; }
.emit-card__body p { margin: 0; font-size: 0.78rem; color: var(--ink-soft); }
.emit-card__actions {
  display: flex; flex-wrap: nowrap; align-items: center; gap: 0.25rem;
  margin-top: 0.2rem; overflow-x: auto; scrollbar-width: thin;
}

.pill {
  display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.68rem; font-weight: 800;
  background: color-mix(in srgb, var(--ink) 12%, var(--panel)); text-transform: uppercase; letter-spacing: 0.03em;
}
.pill.live { background: #fecaca; color: #b91c1c; }
.pill.scheduled { background: #fef3c7; color: #b45309; }
.pill.ended, .pill.draft { background: var(--panel-2); color: var(--ink-soft); }

.preview-modal {
  width: min(820px, calc(100vw - 2rem));
  max-height: min(88vh, 720px);
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 22px 50px color-mix(in srgb, var(--ink) 28%, transparent);
  display: flex; flex-direction: column;
}
.preview-modal__body {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); gap: 1rem;
  padding: 0.85rem 1.05rem; align-items: start;
}
@media (max-width: 760px) { .preview-modal__body { grid-template-columns: 1fr; } }
.desk-player {
  aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid var(--line);
  display: grid; place-items: center;
}
.desk-player iframe, .desk-player__img { width: 100%; height: 100%; border: 0; object-fit: cover; }
.desk-player--cam { margin: 0; padding: 1rem; color: #94a3b8; text-align: center; font-size: 0.9rem; }

.howto { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
.howto__step {
  display: grid; grid-template-columns: auto 1fr; gap: 0.75rem; align-items: start;
  padding: 0.85rem 0.95rem; border-radius: 12px; border: 1px solid var(--line); background: var(--panel-2);
}
.howto__num {
  width: 1.75rem; height: 1.75rem; border-radius: 999px; display: grid; place-items: center;
  font-size: 0.82rem; font-weight: 800; background: var(--brand-primary, #6b5bf0); color: #fff;
}
.howto__step h3 { margin: 0 0 0.25rem; font-size: 0.95rem; }
.howto__step p { margin: 0; font-size: 0.88rem; line-height: 1.45; color: var(--ink-soft); }

/* Modal */
.sheet {
  position: fixed; inset: 0; z-index: 50;
  background: color-mix(in srgb, var(--ink) 48%, transparent);
  display: grid; place-items: center; padding: 1.25rem 1rem; overflow-y: auto;
}
.editor {
  width: min(720px, calc(100vw - 2rem));
  max-height: min(82vh, 680px);
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 22px 50px color-mix(in srgb, var(--ink) 28%, transparent);
  display: flex; flex-direction: column;
}
.editor__head {
  display: flex; justify-content: space-between; gap: 0.75rem; align-items: start;
  padding: 0.95rem 1.05rem; border-bottom: 1px solid var(--line);
}
.editor__head h2 { margin: 0; font-size: 1.05rem; }
.editor__head p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--ink-soft); }
.icon-x {
  border: 0; background: transparent; color: var(--ink-soft); font-size: 1.45rem; line-height: 1;
  cursor: pointer; padding: 0.1rem 0.4rem; border-radius: 8px;
}
.icon-x:hover { background: var(--panel-2); color: var(--ink); }
.editor__grid {
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 1rem;
  padding: 0.95rem 1.05rem; flex: 1; min-height: 0;
}
@media (max-width: 700px) { .editor__grid { grid-template-columns: 1fr; } }
.editor__form { display: grid; gap: 0.7rem; align-content: start; }
.editor__form label { display: grid; gap: 0.25rem; font-size: 0.86rem; }
.editor__form input, .editor__form select {
  padding: 0.42rem 0.5rem; border-radius: 8px; border: 1px solid var(--line-2, var(--line));
  font: inherit; background: var(--panel); color: inherit;
}
.editor__row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
@media (max-width: 500px) { .editor__row2 { grid-template-columns: 1fr; } }
.field-label { margin: 0 0 0.3rem; font-size: 0.82rem; font-weight: 700; }
.field-hint { margin: 0.3rem 0 0; font-size: 0.76rem; color: var(--ink-soft); line-height: 1.35; }
.source-tabs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.4rem; }
.source-tab {
  border: 1px solid var(--line); background: var(--panel-2); color: var(--ink-soft);
  border-radius: 999px; padding: 0.28rem 0.65rem; font-size: 0.78rem; font-weight: 700; cursor: pointer;
}
.source-tab.on { background: var(--panel); color: var(--ink); border-color: var(--ink-soft); }
.url-row { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; }
.check {
  display: flex !important; flex-direction: row !important; align-items: center; gap: 0.5rem;
  font-size: 0.88rem; font-weight: 600;
}
.check input { width: auto; }
.more { border-top: 1px solid var(--line); padding-top: 0.35rem; }
.more summary { cursor: pointer; font-size: 0.84rem; font-weight: 600; color: var(--ink-soft); margin-bottom: 0.4rem; }
.more label { margin-top: 0.4rem; }
.editor__preview { display: grid; gap: 0.4rem; align-content: start; }
.editor__player {
  aspect-ratio: 16/9; background: #0b0f14; border-radius: 12px; overflow: hidden; border: 1px solid var(--line);
  display: grid; place-items: center;
}
.editor__player iframe, .editor__player img { width: 100%; height: 100%; border: 0; object-fit: cover; }
.editor__player-empty { margin: 0; padding: 1rem; text-align: center; font-size: 0.82rem; color: #94a3b8; }
.editor__player-empty--cam {
  width: 100%; height: 100%; min-height: 10rem; display: grid; place-items: center;
  background: linear-gradient(145deg, #1e1b4b, #0f172a); color: #fca5a5; font-weight: 700;
}
.picked-url { margin: 0; font-size: 0.72rem; color: var(--ink-soft); word-break: break-all; line-height: 1.3; }
.editor__foot {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding: 0.75rem 1.05rem; border-top: 1px solid var(--line);
}
</style>
