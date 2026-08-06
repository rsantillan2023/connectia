import mongoose from 'mongoose'

const geoSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    capturedAt: { type: Date, default: null },
    permission: {
      type: String,
      enum: ['granted', 'denied', 'prompt', 'unavailable', ''],
      default: '',
    },
  },
  { _id: false },
)

const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    from: { type: String, default: '' },
    to: { type: String, required: true },
    reason: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
)

const itemSchema = new mongoose.Schema(
  {
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PedidoArticle', default: null },
    label: { type: String, default: '', maxlength: 200 },
    qty: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: 'u', maxlength: 40 },
  },
  { _id: false },
)

const pedidoSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    number: { type: Number, required: true },
    source: {
      type: String,
      enum: ['alarm', 'catalog', 'api'],
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PedidoCategory',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['urgent', 'normal'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: ['abierta', 'en_curso', 'cerrada', 'cancelada'],
      default: 'abierta',
      index: true,
    },
    closeReason: {
      type: String,
      enum: ['', 'resuelto', 'falsa_alarma', 'otro'],
      default: '',
    },
    note: { type: String, default: '', maxlength: 2000 },
    attachments: [{ type: String, maxlength: 500 }],
    geo: { type: geoSchema, default: null },
    items: { type: [itemSchema], default: [] },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    history: { type: [historySchema], default: [] },
    idempotencyKey: { type: String, default: '', maxlength: 180, index: true },
  },
  { timestamps: true },
)

pedidoSchema.index({ tenantId: 1, number: 1 }, { unique: true })
pedidoSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } } },
)
pedidoSchema.index({ tenantId: 1, status: 1, createdAt: -1 })
pedidoSchema.index({ tenantId: 1, 'geo.lat': 1, 'geo.lng': 1 })

export const PEDIDO_STATUSES = ['abierta', 'en_curso', 'cerrada', 'cancelada']
export const PEDIDO_SOURCES = ['alarm', 'catalog', 'api']

export const Pedido = mongoose.model('Pedido', pedidoSchema)
