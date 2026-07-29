import mongoose from 'mongoose'

const licenseTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    unidad: { type: String, enum: ['dias'], default: 'dias' },
    diasAnualesDefault: { type: Number, default: 0, min: 0 },
    requiereAdjunto: { type: Boolean, default: false },
    esVacaciones: { type: Boolean, default: false },
    /** calendario = días corridos (AR vacaciones); habiles = lun–vie sin feriados (CL). */
    cuentaDias: { type: String, enum: ['calendario', 'habiles'], default: 'calendario' },
    codigoLegal: { type: String, default: '' },
    normativaRef: { type: String, default: '' },
    pais: { type: String, default: '' },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

licenseTypeSchema.index({ tenantId: 1, key: 1 }, { unique: true })
licenseTypeSchema.index({ tenantId: 1, activo: 1, orden: 1 })

export const LicenseType = mongoose.model('LicenseType', licenseTypeSchema)
