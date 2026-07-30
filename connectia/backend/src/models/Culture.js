import mongoose from 'mongoose'

const audienceSchema = {
  mode: {
    type: String,
    enum: ['all', 'restricted', 'users', 'none'],
    default: 'all',
  },
  areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}

/** Valores de empresa para reconocimientos. */
const cultureValueSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 80 },
    descripcion: { type: String, default: '', maxlength: 400 },
    color: { type: String, default: '#0f766e', maxlength: 20 },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)
cultureValueSchema.index({ tenantId: 1, activo: 1, orden: 1 })
export const CultureValue = mongoose.model('CultureValue', cultureValueSchema)

/** Reconocimiento peer-to-peer / líder. */
const recognitionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromName: { type: String, default: '', maxlength: 160 },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toName: { type: String, default: '', maxlength: 160 },
    valueId: { type: mongoose.Schema.Types.ObjectId, ref: 'CultureValue', default: null },
    valueName: { type: String, default: '', maxlength: 80 },
    mensaje: { type: String, required: true, trim: true, maxlength: 2000 },
    points: { type: Number, default: 0, min: 0 },
    /** Si se publicó en muro */
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
  },
  { timestamps: true },
)
recognitionSchema.index({ tenantId: 1, toUserId: 1, createdAt: -1 })
recognitionSchema.index({ tenantId: 1, fromUserId: 1, createdAt: -1 })
export const Recognition = mongoose.model('Recognition', recognitionSchema)

/** Aviso de marketplace interno. */
const marketplaceListingSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, default: '', maxlength: 160 },
    titulo: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 4000 },
    category: {
      type: String,
      enum: ['venta', 'regalo', 'servicio', 'otro'],
      default: 'venta',
      index: true,
    },
    precio: { type: String, default: '', maxlength: 80 },
    imageUrl: { type: String, default: '', maxlength: 500 },
    contactNote: { type: String, default: '', maxlength: 400 },
    status: {
      type: String,
      enum: ['draft', 'published', 'sold', 'hidden', 'archived'],
      default: 'published',
      index: true,
    },
    hiddenReason: { type: String, default: '', maxlength: 400 },
  },
  { timestamps: true },
)
marketplaceListingSchema.index({ tenantId: 1, status: 1, createdAt: -1 })
export const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema)

/** Referido a vacante interna. */
const referralSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vacancyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalVacancy', default: null, index: true },
    vacancyTitle: { type: String, default: '', maxlength: 200 },
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referrerName: { type: String, default: '', maxlength: 160 },
    candidateName: { type: String, required: true, trim: true, maxlength: 160 },
    candidateEmail: { type: String, default: '', maxlength: 200 },
    candidatePhone: { type: String, default: '', maxlength: 60 },
    notes: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: ['submitted', 'reviewing', 'interview', 'hired', 'rejected', 'withdrawn'],
      default: 'submitted',
      index: true,
    },
    rewardGranted: { type: Boolean, default: false },
    rewardNote: { type: String, default: '', maxlength: 400 },
  },
  { timestamps: true },
)
referralSchema.index({ tenantId: 1, referrerId: 1, createdAt: -1 })
export const Referral = mongoose.model('Referral', referralSchema)

/** Campaña de pulso / eNPS. */
const pulseCampaignSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    /** eNPS principal + preguntas abiertas opcionales */
    questions: [
      {
        tipo: { type: String, enum: ['enps', 'scale', 'text'], default: 'enps' },
        texto: { type: String, required: true, maxlength: 400 },
      },
    ],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    /** Mínimo de respuestas para mostrar agregados (anonimato) */
    anonymityThreshold: { type: Number, default: 5, min: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    audience: audienceSchema,
  },
  { timestamps: true },
)
pulseCampaignSchema.index({ tenantId: 1, status: 1 })
export const PulseCampaign = mongoose.model('PulseCampaign', pulseCampaignSchema)

const pulseResponseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'PulseCampaign', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Respuestas alineadas a questions[] */
    answers: [
      {
        /** 0–10 para eNPS; 1–5 scale; texto libre */
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
)
pulseResponseSchema.index({ tenantId: 1, campaignId: 1, userId: 1 }, { unique: true })
export const PulseResponse = mongoose.model('PulseResponse', pulseResponseSchema)
