import mongoose from 'mongoose'
import {
  PUNCH_KINDS,
  PUNCH_MODES,
  GEO_RESULTS,
  FUERA_DE_RANGO,
  SHIFT_STATUSES,
  defaultAttendancePolicy,
} from '../lib/attendance.js'

/**
 * Lugar / instalación con geocerca (Ola 18 · §11).
 * No reutilizar SpaceSite.
 */
const attendancePlaceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    codigo: { type: String, default: '', trim: true, maxlength: 40 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radioMetros: { type: Number, required: true, min: 10, max: 5000, default: 150 },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires', maxlength: 80 },
    direccion: { type: String, default: '', maxlength: 240 },
    /** Servicio / instalación lógica (multi-sede · 11.04). */
    servicio: { type: String, default: '', trim: true, maxlength: 80 },
    /** Objetivo operativo asociado al lugar. */
    objetivo: { type: String, default: '', trim: true, maxlength: 120 },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

attendancePlaceSchema.index({ tenantId: 1, codigo: 1 })
attendancePlaceSchema.index({ tenantId: 1, activo: 1, nombre: 1 })

export const AttendancePlace = mongoose.model('AttendancePlace', attendancePlaceSchema)

/**
 * Turno asignado a un colaborador en un lugar/fecha.
 */
const attendanceShiftSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePlace', required: true, index: true },
    /** YYYY-MM-DD en timezone del lugar/turno */
    fecha: { type: String, required: true, index: true },
    startTime: { type: String, required: true, maxlength: 5 }, // HH:mm
    endTime: { type: String, required: true, maxlength: 5 },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires', maxlength: 80 },
    estado: {
      type: String,
      enum: SHIFT_STATUSES,
      default: 'asignado',
      index: true,
    },
    notas: { type: String, default: '', maxlength: 500 },
    /** Lugares alternativos del mismo servicio (multi-instalación). */
    alternatePlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePlace' }],
    servicio: { type: String, default: '', maxlength: 80 },
    objetivo: { type: String, default: '', maxlength: 120 },
    reemplazoDeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceShift', default: null },
  },
  { timestamps: true },
)

attendanceShiftSchema.index({ tenantId: 1, userId: 1, fecha: 1 })
attendanceShiftSchema.index({ tenantId: 1, fecha: 1, estado: 1 })

export const AttendanceShift = mongoose.model('AttendanceShift', attendanceShiftSchema)

/**
 * Marca de asistencia (punch) con trazabilidad GPS.
 */
const attendancePunchSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceShift', default: null, index: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePlace', default: null, index: true },
    kind: { type: String, enum: PUNCH_KINDS, required: true },
    mode: { type: String, enum: PUNCH_MODES, required: true },
    geoResult: { type: String, enum: GEO_RESULTS, required: true },
    distanceMetros: { type: Number, default: null },
    lateMinutes: { type: Number, default: 0 },
    earlyMinutes: { type: Number, default: 0 },
    /** Solo modo temporal: vigencia de la marca de presencia. */
    expiresAt: { type: Date, default: null },
    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      capturedAt: { type: Date, default: null },
      source: { type: String, default: 'device', maxlength: 40 },
    },
    deviceClockAt: { type: Date, default: null },
    serverReceivedAt: { type: Date, required: true },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires', maxlength: 80 },
    justification: { type: String, default: '', maxlength: 1000 },
    channel: { type: String, default: 'app', maxlength: 40 },
    idempotencyKey: { type: String, required: true, maxlength: 80 },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

attendancePunchSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true })
attendancePunchSchema.index({ tenantId: 1, userId: 1, serverReceivedAt: -1 })
attendancePunchSchema.index({ tenantId: 1, geoResult: 1, serverReceivedAt: -1 })

export const AttendancePunch = mongoose.model('AttendancePunch', attendancePunchSchema)

/**
 * Política de asistencia por tenant.
 */
const attendancePolicySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
    },
    fueraDeRango: {
      type: String,
      enum: FUERA_DE_RANGO,
      default: defaultAttendancePolicy().fueraDeRango,
    },
    minAccuracyMetros: { type: Number, default: defaultAttendancePolicy().minAccuracyMetros },
    defaultMode: {
      type: String,
      enum: PUNCH_MODES,
      default: defaultAttendancePolicy().defaultMode,
    },
    enableLibre: { type: Boolean, default: true },
    enableEnLugar: { type: Boolean, default: true },
    enableTemporal: { type: Boolean, default: true },
    toleranciaHorariaMin: { type: Number, default: 15 },
    temporalVigenciaMin: { type: Number, default: 30 },
    /** Domingos esperados por colaborador/mes (11.09). */
    domingosEsperadosMes: { type: Number, default: 2, min: 0, max: 8 },
    enableGeopopPrefichada: { type: Boolean, default: true },
    enableQrPunch: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const AttendancePolicy = mongoose.model('AttendancePolicy', attendancePolicySchema)

/** Token QR de corta vida para marcación asistida (11.06). */
const attendanceQrTokenSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceShift', default: null },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePlace', default: null },
    token: { type: String, required: true, unique: true, maxlength: 64 },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

export const AttendanceQrToken = mongoose.model('AttendanceQrToken', attendanceQrTokenSchema)

/** Amonestación por marca fuera de rango (11.11 · local). */
const attendanceWarningSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    punchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePunch', default: null },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    motivo: { type: String, default: '', maxlength: 500 },
    tipo: { type: String, enum: ['amonestacion', 'anexo'], default: 'amonestacion' },
  },
  { timestamps: true },
)

attendanceWarningSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })

export const AttendanceWarning = mongoose.model('AttendanceWarning', attendanceWarningSchema)
