import mongoose from 'mongoose'

/** Eventos de comunidad / uso de app que pueden acreditar puntos. */
export const POINTS_EVENTS = [
  'post_created',
  'post_reaction_given',
  'comment_created',
  'post_saved',
  'post_shared',
  'recognition_received',
  'external_credit',
]

export const POINTS_EVENT_LABELS = {
  post_created: 'Publicar en el muro',
  post_reaction_given: 'Reaccionar a una publicación',
  comment_created: 'Comentar',
  post_saved: 'Guardar una publicación',
  post_shared: 'Compartir por chat',
  recognition_received: 'Recibir un reconocimiento',
  external_credit: 'Crédito desde sistema externo',
}

/**
 * Regla de puntos por engagement (§18 + comunidad).
 * Una regla por evento por tenant; acredita vía ledger de billetera.
 */
const pointsRuleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    event: {
      type: String,
      enum: POINTS_EVENTS,
      required: true,
      trim: true,
    },
    label: { type: String, default: '', maxlength: 120 },
    points: { type: Number, required: true, min: 0, max: 100000 },
    /** Máx. acreditaciones del evento por usuario por día UTC; null = sin tope. */
    dailyCap: { type: Number, default: null, min: 0 },
    enabled: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

pointsRuleSchema.index({ tenantId: 1, event: 1 }, { unique: true })

export const PointsRule = mongoose.model('PointsRule', pointsRuleSchema)
