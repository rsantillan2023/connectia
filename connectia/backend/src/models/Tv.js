import mongoose from 'mongoose'

const audienceSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['all', 'restricted', 'users', 'none'], default: 'all' },
    areaIds: [{ type: mongoose.Schema.Types.ObjectId }],
    groupIds: [{ type: mongoose.Schema.Types.ObjectId }],
    userIds: [{ type: mongoose.Schema.Types.ObjectId }],
    clientIds: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { _id: false },
)

const playlistItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video', 'youtube', 'text', 'post'],
      required: true,
    },
    url: { type: String, maxlength: 2000, default: '' },
    text: { type: String, maxlength: 500, default: '' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    durationSec: { type: Number, min: 5, max: 3600, default: 15 },
    /** Estilo propio de diapos extras tipo texto (no heredan tipografía/ubicación de Bienvenida). */
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    textValign: { type: String, enum: ['top', 'center', 'bottom'], default: 'center' },
    textScale: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    showBrand: { type: Boolean, default: true },
    showTextLogo: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const tvChannelSchema = new mongoose.Schema(
  {
    welcomeEnabled: { type: Boolean, default: true },
    welcomeText: { type: String, maxlength: 200, default: '' },
    welcomeDurationSec: { type: Number, min: 5, max: 60, default: 10 },
    welcomeEveryN: { type: Number, min: 1, max: 20, default: 5 },
    showLogo: { type: Boolean, default: true },
    /** Segundos por slide (pubs/texto). Videos pueden esperar al final. */
    defaultSlideDurationSec: { type: Number, min: 5, max: 120, default: 12 },
    /** Si true, video/youtube no avanzan hasta terminar (o duration del slot). */
    waitForVideoEnd: { type: Boolean, default: true },
    /**
     * auto = reglas del muro (recientes/tipos/categorías).
     * list = wallIncludeEntries (pubs y/o diapos extras) en ese orden.
     */
    contentMode: { type: String, enum: ['auto', 'list'], default: 'auto' },
    wallEnabled: { type: Boolean, default: true },
    wallDays: { type: Number, min: 1, max: 90, default: 14 },
    wallMax: { type: Number, min: 0, max: 40, default: 12 },
    wallTypes: {
      type: [String],
      default: ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion'],
    },
    /** Vacío = todas las categorías (sigue filtrando por wallTypes). */
    wallCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PostCategory' }],
    /** Incluir pubs origin=member (UGC). Off = solo admin. */
    wallIncludeMemberPosts: { type: Boolean, default: false },
    wallMediaOnly: { type: Boolean, default: false },
    wallExcludeKnowledge: { type: Boolean, default: true },
    wallExcludePostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    /** Lista controlada (modo list): orden estricto de postIds (legado; se sincroniza desde wallIncludeEntries). */
    wallIncludePostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    /**
     * Lista controlada mixta: pubs del muro y/o diapos extras del canal, en orden.
     * kind=post → id de Post; kind=extra → id de playlist.items[].
     */
    wallIncludeEntries: [
      {
        _id: false,
        kind: { type: String, enum: ['post', 'extra'], required: true },
        id: { type: String, required: true, maxlength: 64 },
      },
    ],
    /** Modo auto: si false, el loop no incluye diapos extras del canal. */
    wallIncludeExtras: { type: Boolean, default: true },
    /**
     * Modo auto: cómo mezclar diapos extras con pubs del muro.
     * end | start | interleave (cada N pubs) | shuffle (mezcla estable del ciclo).
     */
    extrasPlacement: {
      type: String,
      enum: ['end', 'start', 'interleave', 'shuffle'],
      default: 'end',
    },
    /** Solo si extrasPlacement=interleave: insertar una extra cada N pubs. */
    extrasEveryN: { type: Number, min: 1, max: 20, default: 3 },
    wallPostDurationSec: { type: Number, min: 5, max: 120, default: 12 },
    /** Look & layout del kiosk (pestaña Presentación en admin). */
    presentation: {
      logoPosition: {
        type: String,
        enum: ['tl', 'tr', 'bl', 'br', 'center', 'hidden'],
        default: 'tr',
      },
      /** Tamaño del logo en esquina/posición: sm | md | lg */
      logoScale: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
      postLayout: {
        type: String,
        enum: [
          'media-left',
          'media-right',
          'media-top',
          'media-bottom',
          'media-only',
          'text-only',
          'split',
        ],
        default: 'media-left',
      },
      /** Cómo encajar media: contain | cover | letterbox | blur-fill */
      mediaFit: {
        type: String,
        enum: ['contain', 'cover', 'letterbox', 'blur-fill'],
        default: 'contain',
      },
      /** Si la foto es chica: letterbox | cover | contain | blur-fill | text-priority */
      smallImageMode: {
        type: String,
        enum: ['letterbox', 'cover', 'contain', 'blur-fill', 'text-priority'],
        default: 'contain',
      },
      smallImageMinWidth: { type: Number, min: 120, max: 2000, default: 480 },
      smallImageMinHeight: { type: Number, min: 120, max: 2000, default: 320 },
      /** force-mute | force-sound | device */
      mutePolicy: {
        type: String,
        enum: ['force-mute', 'force-sound', 'device'],
        default: 'device',
      },
      allowUnmuteFromTv: { type: Boolean, default: false },
      showSlideDots: { type: Boolean, default: true },
      transition: { type: String, enum: ['cut', 'fade'], default: 'fade' },
      showPostTipo: { type: Boolean, default: true },
      showCta: { type: Boolean, default: true },
      /** Mensaje de acción sugerido en pubs (si showCta). Vacío = textos por tipo. */
      ctaMessage: { type: String, maxlength: 80, default: '' },
      showLocationOnWelcome: { type: Boolean, default: true },
      titleScale: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
      accentColor: { type: String, maxlength: 20, default: '#5eead4' },
      showClock: { type: Boolean, default: false },
      /** Esquina del reloj: tl | tr | bl | br */
      clockPosition: {
        type: String,
        enum: ['tl', 'tr', 'bl', 'br'],
        default: 'tl',
      },
      idleShowLogo: { type: Boolean, default: true },
      welcomeShowLogo: { type: Boolean, default: true },
      welcomeLogoScale: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    },
  },
  { _id: false },
)

const tvPlaylistSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    version: { type: Number, default: 1 },
    items: [playlistItemSchema],
    channel: { type: tvChannelSchema, default: () => ({}) },
    fallbackText: { type: String, maxlength: 300, default: 'Contenido no disponible' },
    activo: { type: Boolean, default: true },
    /** Quién puede elegir este canal al emparejar una TV. */
    audience: { type: audienceSchema, default: () => ({ mode: 'all' }) },
  },
  { timestamps: true },
)

tvPlaylistSchema.index({ tenantId: 1, name: 1 })

const tvDeviceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, maxlength: 120, default: 'Pantalla TV' },
    locationLabel: { type: String, maxlength: 200, default: '' },
    fingerprint: { type: String, maxlength: 200, default: '' },
    credentialHash: { type: String, required: true, index: true },
    playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'TvPlaylist', default: null },
    mute: { type: Boolean, default: true },
    orientation: { type: String, enum: ['landscape', 'portrait'], default: 'landscape' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    pairedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pairedAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastError: { type: String, maxlength: 500, default: '' },
    configVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
)

tvDeviceSchema.index({ tenantId: 1, status: 1 })

const tvPairingSessionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    code: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'expired', 'consumed'],
      default: 'pending',
      index: true,
    },
    fingerprint: { type: String, maxlength: 200, default: '' },
    deviceName: { type: String, maxlength: 120, default: 'Pantalla TV' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
    confirmedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TvDevice', default: null },
    /** Token en claro solo hasta que la TV lo lea una vez (o expire). */
    pendingCredential: { type: String, default: '' },
  },
  { timestamps: true },
)

tvPairingSessionSchema.index({ code: 1, status: 1 })

export const TvPlaylist = mongoose.model('TvPlaylist', tvPlaylistSchema)
export const TvDevice = mongoose.model('TvDevice', tvDeviceSchema)
export const TvPairingSession = mongoose.model('TvPairingSession', tvPairingSessionSchema)
export { audienceSchema }
