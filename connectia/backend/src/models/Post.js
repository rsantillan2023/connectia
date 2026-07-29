import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    cuerpo: { type: String, default: '' },
    tipo: {
      type: String,
      enum: ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion'],
      default: 'noticia',
    },
    /** Categoría administrable (§27.02); si falta, se usa tipo legacy */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostCategory',
      default: null,
      index: true,
    },
    imageUrl: { type: String, default: '' },
    /** Carrusel opcional (además de imageUrl como cover) */
    imageUrls: { type: [String], default: [] },
    /** Audio opcional asociado a la publicación (pensado para acompañar imagen) */
    audioUrl: { type: String, default: '' },
    /** vertical | horizontal | banner — U elige render; S solo persiste */
    layout: {
      type: String,
      enum: ['vertical', 'horizontal', 'banner'],
      default: 'vertical',
    },
    pinned: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    /**
     * Si true, al pasar a published se notifica a la audiencia
     * (in-app + email + push). Off por defecto para evitar spam.
     */
    notifyAudience: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'scheduled', 'published', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    /** Si status=scheduled: cuándo el scheduler la pasa a published */
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    /** Origen: CMS admin vs colaborador (UGC) */
    origin: {
      type: String,
      enum: ['admin', 'member'],
      default: 'admin',
      index: true,
    },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    /**
     * Análisis IA previo (solo sugerencia; el admin decide).
     * status: pending | ready | error | skipped
     * risk: low | medium | high
     * suggestedAction: approve | review | reject
     */
    moderationAi: {
      status: { type: String, default: '' },
      analyzedAt: { type: Date, default: null },
      provider: { type: String, default: '' },
      model: { type: String, default: '' },
      risk: { type: String, default: '' },
      score: { type: Number, default: 0 },
      suggestedAction: { type: String, default: '' },
      summary: { type: String, default: '' },
      reasons: { type: [String], default: [] },
      categories: { type: [String], default: [] },
      policyFlags: { type: [String], default: [] },
      error: { type: String, default: '' },
    },
    reactions: {
      like: { type: Number, default: 0 }, // legacy → se suma a love al leer
      love: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      fire: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      clap: { type: Number, default: 0 },
    },
    /** userId -> reaction key (una por usuario en MVP) */
    reactors: {
      type: Map,
      of: String,
      default: {},
    },
    /** Quién ve la pub: all | restricted | users | none (+ userIds puntuales) */
    audience: {
      mode: {
        type: String,
        enum: ['all', 'restricted', 'users', 'none'],
        default: 'all',
      },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    /**
     * Overrides de presentación por instancia.
     * Keys ausentes heredan del postsConfig del tenant para ese tipo.
     */
    display: {
      show: { type: mongoose.Schema.Types.Mixed, default: undefined },
    },
    /** Encuesta embebida / vinculada desde el muro (Ola 5 · 15.09) */
    linkedSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      default: null,
      index: true,
    },
    /** Si false, U no puede comentar esta publicación (§4.10 / Pub_Comentarios) */
    commentsEnabled: { type: Boolean, default: true },
    /** Origen saludo automático (§5) — publicación tipo celebracion */
    greeting: {
      ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'GreetingRule', default: null },
      eventType: { type: String, default: '' },
      forUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      runKey: { type: String, default: '', maxlength: 120 },
    },
  },
  { timestamps: true },
)

postSchema.index({ tenantId: 1, status: 1, pinned: -1, priority: -1, publishedAt: -1 })
postSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 })
postSchema.index({ tenantId: 1, authorId: 1, createdAt: -1 })
postSchema.index({ tenantId: 1, origin: 1, status: 1 })
postSchema.index({ tenantId: 1, status: 1, 'moderationAi.risk': 1, 'moderationAi.score': -1 })
postSchema.index(
  { tenantId: 1, 'greeting.runKey': 1 },
  { unique: true, partialFilterExpression: { 'greeting.runKey': { $gt: '' } } },
)

export const Post = mongoose.model('Post', postSchema)
