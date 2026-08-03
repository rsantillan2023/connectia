import mongoose from 'mongoose'

/**
 * Beneficio o premio del catálogo §18.
 */
const benefitSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** benefit | reward (motor canje) */
    kind: { type: String, enum: ['benefit', 'reward'], default: 'benefit', index: true },
    /**
     * Tipología producto (admin wizard / legado):
     * informativo | canjeable | premio | geo | partner
     */
    offerType: {
      type: String,
      enum: ['informativo', 'canjeable', 'premio', 'geo', 'partner'],
      index: true,
    },
    titulo: { type: String, required: true, trim: true, maxlength: 160 },
    /** Nombre corto comercial (muro / listados U). Si vacío, se usa titulo. */
    nombreComercial: { type: String, default: '', trim: true, maxlength: 120 },
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
    /**
     * Sucursales del beneficio (N lugares). Si vacío, se usa sucursal/lat/lng legacy.
     * stock null = sin tope por sede.
     */
    locations: [
      {
        id: { type: String, default: '' },
        name: { type: String, default: '', maxlength: 160 },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        stock: { type: Number, default: null },
        redeemCount: { type: Number, default: 0 },
      },
    ],
    /** 0=dom … 6=sáb. Vacío = todos los días. */
    daysOfWeek: { type: [Number], default: [] },
    /** HH:mm local tenant; vacío = todo el día */
    timeFrom: { type: String, default: '', maxlength: 5 },
    timeTo: { type: String, default: '', maxlength: 5 },
    excludeHolidays: { type: Boolean, default: false },
    /** Solo visible/canjeable si user.sede coincide con alguna location.name / sucursal */
    requireUserSede: { type: Boolean, default: false },
    /** Radio km para canje geo (null = sin geocerca de canje) */
    redeemRadiusKm: { type: Number, default: null },
    limitePorDia: { type: Number, default: null },
    limitePorSemana: { type: Number, default: null },
    limitePorMes: { type: Number, default: null },
    /** Permite lista de espera si cupo/stock agotado */
    allowWaitlist: { type: Boolean, default: false },
    /** PIN comercio para marcar canje usado (vacío = sin validación comercio) */
    merchantPin: { type: String, default: '', maxlength: 32 },
    condicionesVersion: { type: Number, default: 1 },
    /** Publicación programada (si status draft y fecha futura → publicar) */
    scheduledPublishAt: { type: Date, default: null },
    destacado: { type: Boolean, default: false, index: true },
    orden: { type: Number, default: 100, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
  },
  { timestamps: true },
)

benefitSchema.index({ tenantId: 1, status: 1, kind: 1, orden: 1 })
benefitSchema.index({ tenantId: 1, categoria: 1, status: 1 })
/** Sort del catálogo U: destacado → orden → título */
benefitSchema.index({ tenantId: 1, status: 1, destacado: -1, orden: 1, titulo: 1 })
benefitSchema.index({ tenantId: 1, status: 1, 'audience.mode': 1 })

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

/** Lotes de códigos preimpresos / asignables al canjear. */
const benefitCodeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit', required: true, index: true },
    code: { type: String, required: true, trim: true, maxlength: 64 },
    status: {
      type: String,
      enum: ['available', 'assigned', 'used', 'void'],
      default: 'available',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    redemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BenefitRedemption', default: null },
  },
  { timestamps: true },
)
benefitCodeSchema.index({ tenantId: 1, benefitId: 1, code: 1 }, { unique: true })
benefitCodeSchema.index({ tenantId: 1, benefitId: 1, status: 1 })

export const BenefitCode = mongoose.model('BenefitCode', benefitCodeSchema)

/** Lista de espera cuando cupo/stock agotado. */
const benefitWaitlistSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'cancelled', 'fulfilled'],
      default: 'waiting',
      index: true,
    },
    note: { type: String, default: '', maxlength: 240 },
  },
  { timestamps: true },
)
benefitWaitlistSchema.index({ tenantId: 1, benefitId: 1, userId: 1 }, { unique: true })

export const BenefitWaitlist = mongoose.model('BenefitWaitlist', benefitWaitlistSchema)
