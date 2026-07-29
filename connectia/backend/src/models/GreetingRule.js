import mongoose from 'mongoose'

/**
 * Regla de saludo automático (§5).
 * Al dispararse crea Post tipo `celebracion` (idempotente por runKey).
 */
const greetingRuleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, default: '', maxlength: 120 },
    /** Key del tipo configurable (GreetingEventType.key) */
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    titulo: { type: String, required: true, trim: true, maxlength: 160 },
    cuerpo: { type: String, default: '', maxlength: 5000 },
    /** Cover / video / YouTube (misma semántica que Post.imageUrl) */
    imageUrl: { type: String, default: '', maxlength: 500 },
    /** Carrusel de imágenes */
    imageUrls: { type: [String], default: [] },
    /** Audio opcional (con imagen/carrusel) */
    audioUrl: { type: String, default: '', maxlength: 500 },
    /** image | video | youtube | carousel */
    mediaKind: {
      type: String,
      enum: ['', 'image', 'video', 'youtube', 'carousel'],
      default: '',
    },
    /**
     * Plantilla de media al publicar:
     * - fixed: misma imagen/carrusel/video para todos
     * - random: elige 1 al azar del pool (imageUrls)
     * - profile: avatar del usuario (fallback al pool)
     */
    mediaPick: {
      type: String,
      enum: ['fixed', 'random', 'profile'],
      default: 'fixed',
    },
    /** Layout sugerido al crear el Post */
    layout: {
      type: String,
      enum: ['vertical', 'horizontal', 'banner'],
      default: 'banner',
    },
    /** Horas locales del tenant HH:MM */
    hours: { type: [String], default: ['09:00'] },
    daysBefore: { type: Number, default: 0, min: 0, max: 30 },
    fixedDay: { type: Number, default: null, min: 1, max: 31 },
    fixedMonth: { type: Number, default: null, min: 1, max: 12 },
    audience: {
      mode: { type: String, default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    notifyAudience: { type: Boolean, default: true },
    activo: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastRunAt: { type: Date, default: null },
    stats: {
      postsCreated: { type: Number, default: 0 },
      lastError: { type: String, default: '' },
    },
  },
  { timestamps: true },
)

greetingRuleSchema.index({ tenantId: 1, createdAt: -1 })
greetingRuleSchema.index({ tenantId: 1, activo: 1, eventType: 1 })

export const GreetingRule = mongoose.model('GreetingRule', greetingRuleSchema)
