import mongoose from 'mongoose'

/** Catálogos RRHH (§14.10): códigos versionados por tenant. */
export const HR_CATALOG_TYPES = [
  'pais',
  'provincia',
  'genero',
  'parentesco',
  'estado_civil',
  'tipo_contrato',
  'modalidad',
  'banco',
  'obra_social',
  'clasificacion_legajo',
  'subestado_laboral',
  'nivel_skill',
  'tipo_domicilio',
]

const hrCatalogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tipo: { type: String, enum: HR_CATALOG_TYPES, required: true, index: true },
    codigo: { type: String, required: true, trim: true, maxlength: 64 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    /** Código padre (ej. provincia → pais) */
    parentCodigo: { type: String, default: '', maxlength: 64 },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

hrCatalogSchema.index({ tenantId: 1, tipo: 1, codigo: 1 }, { unique: true })
hrCatalogSchema.index({ tenantId: 1, tipo: 1, activo: 1, orden: 1 })

export const HrCatalog = mongoose.model('HrCatalog', hrCatalogSchema)
