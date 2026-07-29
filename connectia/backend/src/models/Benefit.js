import mongoose from 'mongoose'

/**
 * Beneficio o premio del catálogo §18.
 */
const benefitSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** benefit | reward */
    kind: { type: String, enum: ['benefit', 'reward'], default: 'benefit', index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 4000 },
    condiciones: { type: String, default: '', maxlength: 4000 },
    categoria: { type: String, default: 'otros', trim: true, index: true },
    imageUrl: { type: String, default: '', maxlength: 500 },
    partnerName: { type: String, default: '', maxlength: 120 },
    partnerUrl: { type: String, default: '', maxlength: 500 },
    /** Costo en puntos para canjear (0 = informativo / sin canje de puntos) */
    costoPuntos: { type: Number, default: 0, min: 0 },
    /** null = ilimitado */
    stock: { type: Number, default: null },
    /** Cupo total de canjes (null = sin tope global) */
    cupo: { type: Number, default: null },
    redeemCount: { type: Number, default: 0 },
    limitePorUsuario: { type: Number, default: null },
    vigenciaDesde: { type: Date, default: null },
    vigenciaHasta: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
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
    sucursal: { type: String, default: '', maxlength: 160 },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    destacado: { type: Boolean, default: false, index: true },
    orden: { type: Number, default: 100, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
  },
  { timestamps: true },
)

benefitSchema.index({ tenantId: 1, status: 1, kind: 1, orden: 1 })
benefitSchema.index({ tenantId: 1, categoria: 1, status: 1 })

export const Benefit = mongoose.model('Benefit', benefitSchema)

const benefitFavoriteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit', required: true, index: true },
  },
  { timestamps: true },
)

benefitFavoriteSchema.index({ tenantId: 1, userId: 1, benefitId: 1 }, { unique: true })

export const BenefitFavorite = mongoose.model('BenefitFavorite', benefitFavoriteSchema)

/**
 * Links de partners (YoClaro-style) — capability `beneficios.partners`, sin Emp_Id hardcode.
 */
const benefitPartnerLinkSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: '', maxlength: 400 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl: { type: String, default: '', maxlength: 500 },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

benefitPartnerLinkSchema.index({ tenantId: 1, activo: 1, orden: 1 })

export const BenefitPartnerLink = mongoose.model('BenefitPartnerLink', benefitPartnerLinkSchema)
