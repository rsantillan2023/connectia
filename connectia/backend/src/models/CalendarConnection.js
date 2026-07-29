import mongoose from 'mongoose'

/**
 * Vínculo OAuth de calendario personal por usuario (§6).
 * Tokens cifrados (AES-GCM); nunca se serializan al cliente.
 */
const calendarConnectionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: {
      type: String,
      enum: ['OUTLOOK', 'GOOGLE'],
      required: true,
    },
    accessTokenEnc: { type: String, default: '' },
    refreshTokenEnc: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    /** Calendarios del proveedor a sincronizar (vacío = primary) */
    calendarIds: { type: [String], default: [] },
    /** Email / display del proveedor */
    accountEmail: { type: String, default: '', maxlength: 200 },
    status: {
      type: String,
      enum: ['active', 'error', 'revoked'],
      default: 'active',
      index: true,
    },
    lastError: { type: String, default: '', maxlength: 500 },
    connectedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date, default: null },
    /** Permite escritura hacia el proveedor (Calendars.ReadWrite) */
    writeEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
)

calendarConnectionSchema.index({ tenantId: 1, userId: 1, provider: 1 }, { unique: true })

export const CalendarConnection = mongoose.model('CalendarConnection', calendarConnectionSchema)
