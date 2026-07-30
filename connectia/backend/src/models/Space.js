import mongoose from 'mongoose'

/**
 * Sede física del tenant (§34 / §35).
 */
const spaceSiteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    codigo: { type: String, default: '', trim: true, maxlength: 40 },
    direccion: { type: String, default: '', maxlength: 240 },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires', maxlength: 80 },
    aforoMax: { type: Number, default: null },
    amenities: { type: [String], default: [] },
    whoIsHereEnabled: { type: Boolean, default: false },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

spaceSiteSchema.index({ tenantId: 1, activo: 1, orden: 1 })
spaceSiteSchema.index({ tenantId: 1, codigo: 1 })

export const SpaceSite = mongoose.model('SpaceSite', spaceSiteSchema)

/**
 * Tipo de recurso reservable configurable por tenant (Ola 21 gap).
 * Sala/cochera/puesto son seed; el admin puede crear Proyector, Herramienta, etc.
 * `engineKind` define cómo se comporta la reserva (cupo, patente, aforo…).
 */
const spaceResourceTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    icon: { type: String, default: 'box', trim: true, maxlength: 40 },
    descripcion: { type: String, default: '', maxlength: 400 },
    engineKind: {
      type: String,
      enum: ['sala', 'otro', 'cochera', 'puesto', 'zona_cupo', 'activo', 'hora_libre', 'grupo'],
      required: true,
      index: true,
    },
    /** Keys de SpaceAttributeDef permitidas en recursos de este tipo. */
    attributeKeys: { type: [String], default: [] },
    exigePatenteDefault: { type: Boolean, default: false },
    requiresApprovalDefault: { type: Boolean, default: false },
    diaCompletoDefault: { type: Boolean, default: false },
    showInUserCatalog: { type: Boolean, default: true },
    showInOffice: { type: Boolean, default: false },
    system: { type: Boolean, default: false },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

spaceResourceTypeSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })
spaceResourceTypeSchema.index({ tenantId: 1, activo: 1, orden: 1 })

export const SpaceResourceType = mongoose.model('SpaceResourceType', spaceResourceTypeSchema)

/**
 * Catálogo de atributos / amenities filtrables (HDMI, WiFi, potencia…).
 */
const spaceAttributeDefSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    valueType: {
      type: String,
      enum: ['flag', 'text', 'enum'],
      default: 'flag',
    },
    options: { type: [String], default: [] },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

spaceAttributeDefSchema.index({ tenantId: 1, key: 1 }, { unique: true })
spaceAttributeDefSchema.index({ tenantId: 1, activo: 1, orden: 1 })

export const SpaceAttributeDef = mongoose.model('SpaceAttributeDef', spaceAttributeDefSchema)

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

/**
 * Recurso reservable (instancia de un tipo: sala, proyector, herramienta…).
 * `kind` = engineKind del tipo (compat motor de cupos/patente).
 */
const spaceResourceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpaceSite', required: true, index: true },
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpaceResourceType',
      default: null,
      index: true,
    },
    kind: {
      type: String,
      enum: ['sala', 'otro', 'cochera', 'puesto', 'zona_cupo', 'activo', 'hora_libre', 'grupo'],
      required: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    codigo: { type: String, default: '', trim: true, maxlength: 40 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    floor: { type: String, default: '', maxlength: 40 },
    zone: { type: String, default: '', maxlength: 80 },
    zoneType: {
      type: String,
      enum: ['', 'open', 'focus', 'quiet', 'meeting', 'parking'],
      default: '',
    },
    capacity: { type: Number, default: null },
    /** Cupo concurrente (zona_cupo o zona de cocheras). null = 1 (plaza nominada). */
    cupo: { type: Number, default: null },
    equipment: { type: [String], default: [] },
    /** Atributos del catálogo: [{ key, value }] — value '' = flag presente. */
    attributes: {
      type: [
        {
          key: { type: String, required: true, maxlength: 40 },
          value: { type: String, default: '', maxlength: 120 },
        },
      ],
      default: [],
    },
    vehicleTypes: { type: [String], default: [] },
    esFija: { type: Boolean, default: false },
    exigePatente: { type: Boolean, default: false },
    diaCompleto: { type: Boolean, default: false },
    accessible: { type: Boolean, default: false },
    bufferMin: { type: Number, default: 0, min: 0 },
    requiresApproval: { type: Boolean, default: false },
    horario: {
      days: { type: [Number], default: [1, 2, 3, 4, 5] },
      open: { type: String, default: '08:00' },
      close: { type: String, default: '20:00' },
    },
    audience: audienceSchema,
    imageUrl: { type: String, default: '', maxlength: 500 },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

spaceResourceSchema.index({ tenantId: 1, kind: 1, activo: 1, orden: 1 })
spaceResourceSchema.index({ tenantId: 1, siteId: 1, kind: 1, activo: 1 })
spaceResourceSchema.index({ tenantId: 1, typeId: 1, activo: 1 })
spaceResourceSchema.index({ tenantId: 1, 'attributes.key': 1 })

export const SpaceResource = mongoose.model('SpaceResource', spaceResourceSchema)

/**
 * Políticas del módulo espacios/coworking (1 doc por tenant).
 */
const spacePolicySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
    },
    salasEnabled: { type: Boolean, default: true },
    cocherasEnabled: { type: Boolean, default: true },
    coworkingEnabled: { type: Boolean, default: true },
    maxSimultaneousParking: { type: Number, default: 1, min: 1 },
    maxSimultaneousDesk: { type: Number, default: 1, min: 1 },
    maxOfficeDaysPerWeek: { type: Number, default: 5, min: 0 },
    cancelMinutesBefore: { type: Number, default: 30, min: 0 },
    checkInGraceMinutes: { type: Number, default: 15, min: 0 },
    requirePlateDefault: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const SpacePolicy = mongoose.model('SpacePolicy', spacePolicySchema)

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in']

/**
 * Reserva unificada (§34 salas/cocheras + §35 puestos).
 */
const reservationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpaceResource', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpaceSite', required: true, index: true },
    kind: {
      type: String,
      enum: ['sala', 'otro', 'cochera', 'puesto', 'zona_cupo', 'activo', 'hora_libre', 'grupo'],
      required: true,
      index: true,
    },
    title: { type: String, default: '', maxlength: 160 },
    motivo: { type: String, default: '', maxlength: 500 },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'rejected', 'completed', 'no_show', 'checked_in'],
      default: 'confirmed',
      index: true,
    },
    plate: { type: String, default: '', maxlength: 20 },
    vehicleType: { type: String, default: '', maxlength: 40 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectReason: { type: String, default: '', maxlength: 400 },
    linkedReservationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }],
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '', maxlength: 400 },
  },
  { timestamps: true },
)

reservationSchema.index({ tenantId: 1, resourceId: 1, startAt: 1, endAt: 1 })
reservationSchema.index({ tenantId: 1, userId: 1, startAt: -1 })
reservationSchema.index({ tenantId: 1, status: 1, startAt: 1 })

export const Reservation = mongoose.model('Reservation', reservationSchema)
export const RESERVATION_ACTIVE_STATUSES = ACTIVE_STATUSES

/**
 * Día en sede sin puesto obligatorio (§35 “voy a la oficina”).
 */
const officeDaySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpaceSite', required: true, index: true },
    /** YYYY-MM-DD en timezone de la sede */
    dateKey: { type: String, required: true, maxlength: 10, index: true },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'checked_in', 'no_show'],
      default: 'confirmed',
      index: true,
    },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },
  },
  { timestamps: true },
)

officeDaySchema.index({ tenantId: 1, userId: 1, dateKey: 1 }, { unique: true })
officeDaySchema.index({ tenantId: 1, siteId: 1, dateKey: 1, status: 1 })

export const OfficeDay = mongoose.model('OfficeDay', officeDaySchema)
