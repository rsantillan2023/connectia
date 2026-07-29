import mongoose from 'mongoose'

/**
 * Evento corporativo del tenant (§6 / Ola 15).
 * Fechas en UTC; la UI convierte con Tenant.timezone (IANA).
 */
const eventSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 8000 },
    tipo: {
      type: String,
      enum: ['general', 'reunion', 'capacitacion', 'celebracion', 'otro'],
      default: 'general',
      index: true,
    },
    inicio: { type: Date, required: true, index: true },
    fin: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    lugar: { type: String, default: '', maxlength: 240 },
    /** URL o dirección libre */
    ubicacionUrl: { type: String, default: '', maxlength: 500 },
    cupo: { type: Number, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'draft',
      index: true,
    },
    imageUrl: { type: String, default: '', maxlength: 500 },
    /** Adjuntos multimedia (URLs https) */
    media: {
      type: [
        {
          url: { type: String, maxlength: 500 },
          tipo: { type: String, enum: ['image', 'video', 'file'], default: 'image' },
          nombre: { type: String, default: '', maxlength: 160 },
        },
      ],
      default: [],
    },
    audience: {
      mode: { type: String, enum: ['all', 'restricted', 'users', 'none'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    /** Vínculo opcional a publicación del muro */
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    /** Snapshot IANA al crear (informativo; fuente de verdad = Tenant.timezone) */
    timezone: { type: String, default: '', maxlength: 80 },
    /** Clave de seed idempotente (ej. arcor-townhall-q3) */
    seedKey: { type: String, default: '', maxlength: 80, index: true },
    /** Contadores denormalizados */
    rsvpConfirmados: { type: Number, default: 0 },
    rsvpRechazados: { type: Number, default: 0 },
  },
  { timestamps: true },
)

eventSchema.index({ tenantId: 1, status: 1, inicio: 1 })
eventSchema.index({ tenantId: 1, inicio: 1, fin: 1 })
eventSchema.index({ tenantId: 1, seedKey: 1 }, { unique: true, partialFilterExpression: { seedKey: { $gt: '' } } })

export const Event = mongoose.model('Event', eventSchema)

const eventRsvpSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** confirmado | rechazado */
    estado: {
      type: String,
      enum: ['confirmado', 'rechazado'],
      required: true,
      index: true,
    },
    confirmedAt: { type: Date, default: Date.now },
    /** IDs en calendarios externos tras push bidireccional */
    external: {
      outlookEventId: { type: String, default: '' },
      googleEventId: { type: String, default: '' },
    },
  },
  { timestamps: true },
)

eventRsvpSchema.index({ tenantId: 1, eventId: 1, userId: 1 }, { unique: true })
eventRsvpSchema.index({ tenantId: 1, userId: 1, estado: 1 })

export const EventRsvp = mongoose.model('EventRsvp', eventRsvpSchema)
