import mongoose from 'mongoose'

/** Eventos de uso de app que pueden acreditar puntos. */
export const POINTS_EVENTS = [
  // Comunidad / muro
  'post_created',
  'post_reaction_given',
  'comment_created',
  'post_saved',
  'post_shared',
  'story_viewed',
  // Cultura
  'recognition_received',
  'recognition_sent',
  'pulse_responded',
  'marketplace_listing_created',
  'referral_created',
  // Encuestas / onboarding
  'survey_completed',
  'onboarding_milestone',
  // Servicios / pedidos / solicitudes
  'service_request_created',
  'service_feedback_given',
  'pedido_created',
  'request_created',
  // Espacios / asistencia / ausencias / licencias
  'space_reservation_created',
  'space_checkin',
  'attendance_punch',
  'ausencia_requested',
  'licencia_requested',
  // Agenda / aprobaciones / perfil
  'event_rsvp_confirmed',
  'approval_decided',
  'profile_updated',
  // Campo / docs / políticas / desarrollo
  'relevamiento_submitted',
  'document_signed',
  'policy_acked',
  'course_completed',
  'vacancy_applied',
  // Integraciones
  'external_credit',
]

export const POINTS_EVENT_LABELS = {
  post_created: 'Publicar en el muro',
  post_reaction_given: 'Reaccionar a una publicación',
  comment_created: 'Comentar',
  post_saved: 'Guardar una publicación',
  post_shared: 'Compartir por chat',
  story_viewed: 'Ver una historia',
  recognition_received: 'Recibir un reconocimiento',
  recognition_sent: 'Reconocer a un colega',
  pulse_responded: 'Responder el pulso cultural',
  marketplace_listing_created: 'Publicar en el marketplace',
  referral_created: 'Referir un candidato',
  survey_completed: 'Completar una encuesta',
  onboarding_milestone: 'Completar un hito de onboarding',
  service_request_created: 'Solicitar un servicio',
  service_feedback_given: 'Calificar o sugerir un servicio',
  pedido_created: 'Crear un pedido',
  request_created: 'Crear una solicitud',
  space_reservation_created: 'Reservar un espacio',
  space_checkin: 'Hacer check-in en un espacio',
  attendance_punch: 'Marcar asistencia',
  ausencia_requested: 'Solicitar una ausencia',
  licencia_requested: 'Solicitar una licencia',
  event_rsvp_confirmed: 'Confirmar asistencia a un evento',
  approval_decided: 'Aprobar o rechazar un trámite',
  profile_updated: 'Actualizar tu perfil',
  relevamiento_submitted: 'Enviar un relevamiento de campo',
  document_signed: 'Firmar un documento',
  policy_acked: 'Acusar recibo de una política',
  course_completed: 'Completar un curso',
  vacancy_applied: 'Postularte a una vacante',
  external_credit: 'Crédito desde sistema externo',
}

/**
 * Regla de puntos por engagement (§18 + uso de app).
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
