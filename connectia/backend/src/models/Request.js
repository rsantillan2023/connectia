import mongoose from 'mongoose'

const adjuntoSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    url: { type: String, required: true },
  },
  { _id: false },
)

const messageSchema = new mongoose.Schema(
  {
    texto: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    interno: { type: Boolean, default: false },
    adjuntos: { type: [adjuntoSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const campoDefSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    tipo: { type: String, default: 'text' },
    required: { type: Boolean, default: false },
    opciones: { type: [String], default: [] },
    placeholder: { type: String, default: '' },
    orden: { type: Number, default: 100 },
  },
  { _id: false },
)

const campoValorSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    tipo: { type: String, default: 'text' },
    value: { type: mongoose.Schema.Types.Mixed, default: '' },
  },
  { _id: false },
)

const requestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true },
    tipoId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestType', default: null },
    tipoKey: { type: String, default: '' },
    tipoNombre: { type: String, default: '' },
    area: { type: String, default: 'General' },
    titulo: { type: String, required: true, trim: true },
    cuerpo: { type: String, default: '' },
    /** Imagen o video (URL o /uploads/…) que acompaña el título/mensaje */
    mediaUrl: { type: String, default: '' },
    estado: { type: String, default: 'abierta', index: true },
    /** member = la pidió el colaborador; admin = dirigida/enviada por gestión */
    origen: { type: String, enum: ['member', 'admin'], default: 'member', index: true },
    /** Agrupa envíos masivos del admin */
    campaignId: { type: String, default: '', index: true },
    /**
     * Audiencia de ESTE envío/solicitud (independiente del tipo).
     * En directed: a quién se destinó la campaña; se guarda snapshot por ticket.
     */
    audience: {
      mode: { type: String, enum: ['all', 'restricted'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    },
    /** Snapshot del formulario a completar (sobre todo en envíos dirigidos) */
    camposDefinicion: { type: [campoDefSchema], default: [] },
    camposValores: { type: [campoValorSchema], default: [] },
    /** true cuando el destinatario ya cargó los campos del envío dirigido */
    completada: { type: Boolean, default: false },
    completadaAt: { type: Date, default: null },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterName: { type: String, default: '' },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, default: '' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assigneeName: { type: String, default: '' },
    rating: { type: Number, default: null, min: 1, max: 5 },
    closedAt: { type: Date, default: null },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
)

requestSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })
requestSchema.index({ tenantId: 1, requesterId: 1, createdAt: -1 })
requestSchema.index({ tenantId: 1, estado: 1, updatedAt: -1 })
requestSchema.index({ tenantId: 1, campaignId: 1 })

export const Request = mongoose.model('Request', requestSchema)
