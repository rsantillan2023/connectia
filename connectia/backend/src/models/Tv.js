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
    order: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const tvPlaylistSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    version: { type: Number, default: 1 },
    items: [playlistItemSchema],
    fallbackText: { type: String, maxlength: 300, default: 'Contenido no disponible' },
    activo: { type: Boolean, default: true },
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
