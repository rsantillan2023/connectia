import mongoose from 'mongoose'

/**
 * Tipos de celebración / saludo configurables por tenant (§5).
 * Las reglas (GreetingRule) referencian `key`.
 */
const greetingEventTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** slug estable: birthday, work_anniversary, custom_… */
    key: { type: String, required: true, trim: true, maxlength: 64 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 400 },
    /**
     * Origen del disparo:
     * - fechaNacimiento | fechaIngreso | createdAt: aniversario anual
     * - fixed: día/mes de la regla
     * - customDate: user.customDates[customDateKey]
     * - daysAfter: N días después de offsetField
     * - manual: solo Ejecutar ahora / API
     */
    dateSource: {
      type: String,
      enum: [
        'fechaNacimiento',
        'fechaIngreso',
        'createdAt',
        'fixed',
        'customDate',
        'daysAfter',
        'manual',
      ],
      required: true,
    },
    /** Key en user.customDates (customDate o daysAfter+customDate) */
    customDateKey: { type: String, default: '', maxlength: 64 },
    /** Para daysAfter: cantidad de días desde offsetField */
    offsetDays: { type: Number, default: 0, min: 0, max: 3650 },
    offsetField: {
      type: String,
      enum: ['fechaIngreso', 'fechaNacimiento', 'createdAt', 'customDate'],
      default: 'fechaIngreso',
    },
    /** Mínimo de años desde la fecha (aniversarios ≥ 1) */
    minYears: { type: Number, default: 0, min: 0, max: 80 },
    /** Plantilla de copy por defecto (las reglas pueden sobrescribir) */
    defaultTitulo: { type: String, default: '', maxlength: 160 },
    defaultCuerpo: { type: String, default: '', maxlength: 5000 },
    /** Media por defecto del tipo */
    imageUrl: { type: String, default: '', maxlength: 500 },
    imageUrls: { type: [String], default: [] },
    audioUrl: { type: String, default: '', maxlength: 500 },
    mediaKind: {
      type: String,
      enum: ['', 'image', 'video', 'youtube', 'carousel'],
      default: '',
    },
    mediaPick: {
      type: String,
      enum: ['fixed', 'random', 'profile'],
      default: 'fixed',
    },
    activo: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100 },
    /** Semilla del sistema: no se puede borrar la key, sí pausar/editar label */
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
)

greetingEventTypeSchema.index({ tenantId: 1, key: 1 }, { unique: true })
greetingEventTypeSchema.index({ tenantId: 1, sortOrder: 1, label: 1 })

export const GreetingEventType = mongoose.model('GreetingEventType', greetingEventTypeSchema)
