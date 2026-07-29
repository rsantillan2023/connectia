import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    usuario: { type: String, required: true },
    /** ID / legajo deskless (login sin mail) */
    idExterno: { type: String, default: '', index: true },
    passwordHash: { type: String, required: true },
    nombre: { type: String, default: '' },
    apellido: { type: String, default: '' },
    email: { type: String, default: '' },
    telefono: { type: String, default: '' },
    /** Documento nacional (bandeja docs / matching) */
    dni: { type: String, default: '', index: true },
    /** CUIL/CUIT (bandeja docs / matching) */
    cuil: { type: String, default: '', index: true },
    /** Avatar público (URL relativa /uploads o absoluta) */
    avatarUrl: { type: String, default: '' },
    /** Email verificado (última dirección confirmada) */
    emailVerifiedAt: { type: Date, default: null },
    /** Cambio de email pendiente de código */
    pendingEmail: { type: String, default: '' },
    emailVerifyCodeHash: { type: String, default: '' },
    emailVerifyExpires: { type: Date, default: null },
    roles: { type: [String], default: ['member'] },
    capabilities: { type: [String], default: [] },
    /** Roles nombrados del tenant (§27.10) — capabilities se unen en runtime */
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    /** Área organizacional (una) */
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea', default: null, index: true },
    /** Grupos de usuarios (varios) */
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    activo: { type: Boolean, default: true },
    /** MANUAL | FILE | GOOGLE | ENTRA | GEOPOP | … */
    origen: { type: String, default: 'MANUAL' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    termsAcceptedVersion: { type: String, default: '' },
    termsAcceptedAt: { type: Date, default: null },
    /** Hashes de refresh activos (revocación) */
    refreshTokens: { type: [String], default: [] },
    /** Último login exitoso (campañas a inactivos) */
    lastLoginAt: { type: Date, default: null, index: true },
    /** Preferencias de aviso (email / push) */
    notifPrefs: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    /** Cargo / rol visible (plantillas de saludo {{cargo}}) */
    cargo: { type: String, default: '', maxlength: 120 },
    /** Cumpleaños (date-only; comparar mes/día UTC) */
    fechaNacimiento: { type: Date, default: null, index: true },
    /** Fecha de ingreso (aniversarios laborales) */
    fechaIngreso: { type: Date, default: null, index: true },
    /**
     * Fechas de evento personalizadas (key → Date).
     * Ej: promocion, certificacion, fin_prueba.
     * Usadas por tipos de saludo con origen customDate / daysAfter.
     */
    customDates: {
      type: Map,
      of: Date,
      default: {},
    },
    /**
     * Valores de campos adicionales (§3.04) — key → valor según ProfileFieldDef del tenant.
     */
    extraFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /** Solicitud de baja / anonimización (§3.05) */
    deletionRequestedAt: { type: Date, default: null },
    anonymizedAt: { type: Date, default: null },
    /** Suscripciones Web Push (varios dispositivos) */
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, default: '' },
          auth: { type: String, default: '' },
        },
        userAgent: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

userSchema.index({ tenantId: 1, usuario: 1 }, { unique: true })
userSchema.index({ tenantId: 1, idExterno: 1 })

export const User = mongoose.model('User', userSchema)
