/**
 * Seed demo de encuestas para un tenant (idempotente por externalId).
 * Cubre tipologías de pregunta, categorías, estados, audiencias, flujos y media.
 */
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { SURVEY_QUESTION_TYPES } from './surveyQuestions.js'
import { SURVEY_CATEGORIES } from './surveyCategories.js'
import { normalizeAudience } from './audience.js'

const IMG = (seed) => `https://picsum.photos/seed/cx-survey-${seed}/960/540`

function q(externalKey, id, texto, tipo, extras = {}) {
  return {
    id: `seed_${externalKey}_${id}`,
    texto,
    tipo,
    required: extras.required !== false,
    opciones: Array.isArray(extras.opciones) ? extras.opciones : [],
    grupo: extras.grupo || 'General',
    imageUrl: extras.imageUrl || '',
  }
}

function allTypesQuestions(key) {
  return [
    q(key, 'text', '¿Cuál es tu puesto o rol?', 'text', { grupo: 'Perfil' }),
    q(key, 'textarea', '¿Qué mejorarías en la comunicación interna?', 'textarea', {
      grupo: 'Comunicación',
      required: false,
    }),
    q(key, 'number', '¿Cuántos años llevás en la empresa?', 'number', { grupo: 'Perfil' }),
    q(key, 'yesno', '¿Recomendarías trabajar acá a un amigo?', 'yesno', { grupo: 'NPS' }),
    q(key, 'single', '¿Cómo calificarías el clima laboral?', 'single', {
      grupo: 'Clima',
      opciones: ['Excelente', 'Bueno', 'Regular', 'Malo'],
    }),
    q(key, 'multiple', '¿En qué temas querés más formación?', 'multiple', {
      grupo: 'Desarrollo',
      opciones: ['Liderazgo', 'Tecnología', 'Comunicación', 'Idiomas', 'Bienestar'],
      required: false,
    }),
    q(key, 'rating', 'Valorá tu satisfacción general', 'rating', { grupo: 'NPS' }),
    q(key, 'date', '¿Qué día preferís para la próxima reunión de equipo?', 'date', {
      grupo: 'Agenda',
      required: false,
    }),
    q(key, 'time', '¿A qué hora solés empezar tu jornada?', 'time', { grupo: 'Agenda', required: false }),
    q(key, 'datetime', '¿Cuándo preferís la próxima capacitación?', 'datetime', {
      grupo: 'Agenda',
      required: false,
    }),
    q(key, 'email', '¿Cuál es tu email de contacto preferido?', 'email', { grupo: 'Contacto' }),
    q(key, 'phone', '¿Cuál es tu teléfono?', 'phone', { grupo: 'Contacto', required: false }),
    q(key, 'geopoint', 'Confirmá tu ubicación al responder (check-in)', 'geopoint', {
      grupo: 'Presencia',
      required: false,
    }),
    q(key, 'img', '¿Qué ves en esta imagen del espacio de trabajo?', 'single', {
      grupo: 'Media',
      opciones: ['Oficina abierta', 'Sala de reuniones', 'Cafetería', 'Otro'],
      imageUrl: IMG('q-workspace'),
    }),
  ]
}

/**
 * Catálogo estático (sin IDs de audiencia reales).
 * @returns {Array<object>}
 */
export function buildSurveysSeedCatalog() {
  const now = Date.now()
  const day = 86400_000

  return [
    {
      externalId: 'seed-survey:kitchen-sink',
      titulo: 'Catálogo completo de tipos de pregunta',
      descripcion:
        'Encuesta demo con los 13 tipos de pregunta, grupos, opción con imagen y galería de portada.',
      aiContext:
        'Demo kitchen-sink: sirve para probar tipologías, preview, flujo all y resultados.',
      categoria: 'general',
      purpose: 'general',
      status: 'published',
      anonymous: false,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [IMG('cover-a'), IMG('cover-b'), IMG('cover-c')],
      imageUrl: IMG('cover-a'),
      videoUrl: '',
      startsAt: new Date(now - 7 * day),
      endsAt: new Date(now + 60 * day),
      audienceMode: 'all',
      questions: allTypesQuestions('kitchen'),
      sampleResponses: true,
    },
    {
      externalId: 'seed-survey:clima-one-by-one',
      titulo: 'Clima laboral (una a una)',
      descripcion: 'Flujo pregunta a pregunta con barra de progreso. Categoría clima.',
      aiContext: 'Clima Q3: liderazgo, carga y bienestar.',
      categoria: 'clima',
      purpose: 'general',
      status: 'published',
      anonymous: false,
      questionFlow: 'one_by_one',
      showProgress: true,
      imageUrls: [IMG('clima')],
      imageUrl: IMG('clima'),
      startsAt: new Date(now - 2 * day),
      endsAt: new Date(now + 30 * day),
      audienceMode: 'all',
      questions: [
        q('clima', 'r1', '¿Cómo está tu carga de trabajo?', 'rating', { grupo: 'Carga' }),
        q('clima', 'r2', '¿Cómo valorarías a tu líder?', 'rating', { grupo: 'Liderazgo' }),
        q('clima', 'yn', '¿Sentís que podés desconectar fuera del horario?', 'yesno', {
          grupo: 'Bienestar',
        }),
        q('clima', 'sg', '¿Cuál es tu principal fricción hoy?', 'single', {
          grupo: 'Clima',
          opciones: ['Comunicación', 'Procesos', 'Herramientas', 'Reconocimiento', 'Otro'],
        }),
        q('clima', 'ta', 'Contanos con más detalle (opcional)', 'textarea', {
          grupo: 'Apertura',
          required: false,
        }),
      ],
      sampleResponses: true,
    },
    {
      externalId: 'seed-survey:nps-anon',
      titulo: 'NPS anónimo',
      descripcion: 'Encuesta anónima de recomendación (NPS).',
      categoria: 'nps',
      purpose: 'general',
      status: 'published',
      anonymous: true,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [],
      imageUrl: '',
      startsAt: null,
      endsAt: new Date(now + 45 * day),
      audienceMode: 'all',
      questions: [
        q('nps', 'r', 'Del 1 al 5, ¿nos recomendarías como lugar para trabajar?', 'rating'),
        q('nps', 'sg', '¿Qué pesó más en tu nota?', 'single', {
          opciones: ['Cultura', 'Sueldo/beneficios', 'Liderazgo', 'Desarrollo', 'Otro'],
        }),
        q('nps', 'ta', 'Comentario libre', 'textarea', { required: false }),
      ],
      sampleResponses: true,
    },
    {
      externalId: 'seed-survey:onboarding',
      titulo: 'Bienvenida / onboarding',
      descripcion: 'Encuesta de ingreso para vincular a hitos de onboarding.',
      categoria: 'onboarding',
      purpose: 'onboarding',
      status: 'published',
      anonymous: false,
      questionFlow: 'one_by_one',
      showProgress: true,
      imageUrls: [IMG('onb')],
      imageUrl: IMG('onb'),
      startsAt: new Date(now - day),
      endsAt: new Date(now + 90 * day),
      audienceMode: 'all',
      questions: [
        q('onb', 'yn', '¿Recibiste tu kit de bienvenida?', 'yesno'),
        q('onb', 'sg', '¿Cómo fue tu primer día?', 'single', {
          opciones: ['Excelente', 'Bueno', 'Regular', 'Difícil'],
        }),
        q('onb', 'mp', '¿Qué te faltó en la inducción?', 'multiple', {
          opciones: ['Accesos IT', 'Presentación del equipo', 'Beneficios', 'Procesos', 'Nada'],
          required: false,
        }),
        q('onb', 'em', 'Email personal de contacto', 'email', { required: false }),
        q('onb', 'ta', '¿Algún comentario para RRHH?', 'textarea', { required: false }),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:offboarding',
      titulo: 'Egreso / offboarding',
      descripcion: 'Encuesta de salida (propósito offboarding).',
      categoria: 'offboarding',
      purpose: 'offboarding',
      status: 'published',
      anonymous: true,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [],
      imageUrl: '',
      startsAt: null,
      endsAt: null,
      audienceMode: 'all',
      questions: [
        q('off', 'sg', 'Motivo principal de egreso', 'single', {
          opciones: ['Desarrollo', 'Compensación', 'Liderazgo', 'Clima', 'Personal', 'Otro'],
        }),
        q('off', 'r', '¿Volverías a trabajar con nosotros?', 'rating'),
        q('off', 'ta', '¿Qué deberíamos mejorar?', 'textarea'),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:draft-capacitacion',
      titulo: 'Borrador capacitación',
      descripcion: 'Borrador para editar y publicar. Categoría capacitación.',
      categoria: 'capacitacion',
      purpose: 'general',
      status: 'draft',
      anonymous: false,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [IMG('cap')],
      imageUrl: IMG('cap'),
      startsAt: null,
      endsAt: null,
      audienceMode: 'all',
      questions: [
        q('cap', 'mp', 'Temas de interés', 'multiple', {
          opciones: ['IA', 'Gestión de proyectos', 'Ventas', 'Soft skills'],
        }),
        q('cap', 'num', 'Horas semanales disponibles para aprender', 'number'),
        q('cap', 'tm', 'Horario preferido', 'time', { required: false }),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:closed-engagement',
      titulo: 'Engagement cerrado',
      descripcion: 'Encuesta desactivada (cerrada) para probar el listado y filtros.',
      categoria: 'engagement',
      purpose: 'general',
      status: 'closed',
      anonymous: false,
      questionFlow: 'all',
      showProgress: false,
      imageUrls: [IMG('eng')],
      imageUrl: IMG('eng'),
      startsAt: new Date(now - 90 * day),
      endsAt: new Date(now - 30 * day),
      audienceMode: 'all',
      questions: [
        q('eng', 'r', 'Sentido de pertenencia', 'rating'),
        q('eng', 'yn', '¿Participás en actividades de la comunidad?', 'yesno'),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:liderazgo-restricted',
      titulo: 'Liderazgo (audiencia restringida)',
      descripcion: 'Si hay áreas/grupos en la comunidad, apunta a ellos; si no, queda en toda la comunidad.',
      categoria: 'liderazgo',
      purpose: 'general',
      status: 'published',
      anonymous: false,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [IMG('lid'), IMG('lid2')],
      imageUrl: IMG('lid'),
      startsAt: new Date(now - day),
      endsAt: new Date(now + 20 * day),
      audienceMode: 'restricted',
      questions: [
        q('lid', 'r1', 'Claridad de objetivos del equipo', 'rating', { grupo: 'Gestión' }),
        q('lid', 'r2', 'Feedback recibido', 'rating', { grupo: 'Gestión' }),
        q('lid', 'ta', 'Sugerencias para tu líder', 'textarea', { grupo: 'Apertura', required: false }),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:beneficios-no-progress',
      titulo: 'Beneficios sin barra de progreso',
      descripcion: 'showProgress=false para probar la UI de la app sin contador.',
      categoria: 'beneficios',
      purpose: 'general',
      status: 'published',
      anonymous: false,
      questionFlow: 'all',
      showProgress: false,
      imageUrls: [IMG('ben')],
      imageUrl: IMG('ben'),
      startsAt: null,
      endsAt: new Date(now + 40 * day),
      audienceMode: 'all',
      questions: [
        q('ben', 'sg', 'Beneficio más valorado', 'single', {
          opciones: ['Prepaga', 'Gym', 'Home office', 'Capacitación', 'Otros'],
        }),
        q('ben', 'mp', '¿Cuáles usarías más?', 'multiple', {
          opciones: ['Descuentos', 'Días off', 'Guardería', 'Transporte'],
          required: false,
        }),
        q('ben', 'yn', '¿Conocés el catálogo actual de beneficios?', 'yesno'),
      ],
      sampleResponses: true,
    },
    {
      externalId: 'seed-survey:comunicacion-users',
      titulo: 'Comunicación (solo personas)',
      descripcion: 'Audiencia mode=users con las primeras personas activas del tenant (si hay).',
      categoria: 'comunicacion',
      purpose: 'general',
      status: 'published',
      anonymous: false,
      questionFlow: 'one_by_one',
      showProgress: true,
      imageUrls: [],
      imageUrl: '',
      startsAt: new Date(now - day),
      endsAt: new Date(now + 15 * day),
      audienceMode: 'users',
      questions: [
        q('com', 'sg', 'Canal preferido para novedades', 'single', {
          opciones: ['App Connectia', 'Email', 'Reunión', 'Cartelera'],
        }),
        q('com', 'r', 'Claridad de los mensajes internos', 'rating'),
        q('com', 'ph', 'Teléfono para urgencias (opcional)', 'phone', { required: false }),
      ],
      sampleResponses: false,
    },
    {
      externalId: 'seed-survey:otros-datetime',
      titulo: 'Otros · agenda y GPS',
      descripcion: 'Casuística date/time/datetime/geopoint concentrada.',
      categoria: 'otros',
      purpose: 'general',
      status: 'draft',
      anonymous: false,
      questionFlow: 'all',
      showProgress: true,
      imageUrls: [IMG('otros')],
      imageUrl: IMG('otros'),
      startsAt: null,
      endsAt: null,
      audienceMode: 'all',
      questions: [
        q('otr', 'd', 'Fecha del evento', 'date'),
        q('otr', 't', 'Hora de llegada', 'time'),
        q('otr', 'dt', 'Fecha y hora de la visita', 'datetime'),
        q('otr', 'gps', 'Check-in en sede', 'geopoint'),
      ],
      sampleResponses: false,
    },
  ]
}

function sampleAnswerFor(q) {
  switch (q.tipo) {
    case 'yesno':
      return true
    case 'rating':
      return 4
    case 'number':
      return 3
    case 'single':
      return q.opciones?.[0] || 'Opción'
    case 'multiple':
      return (q.opciones || []).slice(0, 2)
    case 'date':
      return '2026-08-15'
    case 'time':
      return '09:30'
    case 'datetime':
      return '2026-08-15T09:30'
    case 'email':
      return 'demo@connectia.local'
    case 'phone':
      return '+54 11 5555-0000'
    case 'geopoint':
      return { lat: -34.6037, lng: -58.3816, accuracy: 12 }
    case 'textarea':
      return 'Comentario demo del seed de encuestas.'
    case 'text':
    default:
      return 'Respuesta demo'
  }
}

async function resolveAudience(tenantId, mode) {
  if (mode === 'restricted') {
    const areas = await OrgArea.find({ tenantId, activo: { $ne: false } }).limit(3).select('_id').lean()
    const groups = await UserGroup.find({ tenantId, activo: { $ne: false } }).limit(3).select('_id').lean()
    if (areas.length || groups.length) {
      return normalizeAudience({
        mode: 'restricted',
        areaIds: areas.map((a) => a._id),
        groupIds: groups.map((g) => g._id),
        userIds: [],
      })
    }
    return normalizeAudience({ mode: 'all' })
  }
  if (mode === 'users') {
    const users = await User.find({ tenantId, activo: { $ne: false } })
      .sort({ createdAt: 1 })
      .limit(5)
      .select('_id')
      .lean()
    if (users.length) {
      return normalizeAudience({
        mode: 'users',
        userIds: users.map((u) => u._id),
      })
    }
    return normalizeAudience({ mode: 'all' })
  }
  return normalizeAudience({ mode: 'all' })
}

async function upsertSampleResponses(tenantId, survey, wantSamples) {
  if (!wantSamples || survey.status !== 'published') return 0
  const users = await User.find({ tenantId, activo: { $ne: false } })
    .sort({ createdAt: 1 })
    .limit(3)
    .select('_id')
    .lean()
  if (!users.length) return 0
  let n = 0
  for (const u of users) {
    const answers = (survey.questions || [])
      .filter((qq, qi) => qq.required !== false || qi % 2 === 0)
      .map((qq) => ({ questionId: qq.id, value: sampleAnswerFor(qq) }))
    await SurveyResponse.findOneAndUpdate(
      { tenantId, surveyId: survey._id, userId: u._id },
      {
        $set: {
          tenantId,
          surveyId: survey._id,
          userId: u._id,
          surveyVersion: survey.version || 1,
          answers,
          submittedAt: new Date(Date.now() - n * 3600_000),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    n += 1
  }
  return n
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ authorId?: any, authorName?: string }} [opts]
 */
export async function seedSurveysForTenant(tenantId, { authorId = null, authorName = 'Admin demo' } = {}) {
  const catalog = buildSurveysSeedCatalog()
  let created = 0
  let updated = 0
  let responsesUpserted = 0
  const byStatus = { draft: 0, published: 0, closed: 0 }
  const questionTypesCovered = new Set()

  for (const row of catalog) {
    const audience = await resolveAudience(tenantId, row.audienceMode)
    const imageUrls = Array.isArray(row.imageUrls) ? row.imageUrls.filter(Boolean) : []
    const questions = (row.questions || []).map((qq) => {
      questionTypesCovered.add(qq.tipo)
      return {
        id: qq.id,
        texto: qq.texto,
        tipo: qq.tipo,
        required: qq.required !== false,
        opciones: qq.opciones || [],
        grupo: qq.grupo || 'General',
        imageUrl: qq.imageUrl || '',
      }
    })

    const payload = {
      tenantId,
      externalId: row.externalId,
      titulo: row.titulo,
      descripcion: row.descripcion || '',
      aiContext: row.aiContext || '',
      categoria: row.categoria || 'general',
      purpose: row.purpose || 'general',
      status: row.status || 'draft',
      anonymous: Boolean(row.anonymous),
      questionFlow: row.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
      showProgress: row.showProgress !== false,
      imageUrl: row.imageUrl || imageUrls[0] || '',
      imageUrls,
      videoUrl: row.videoUrl || '',
      startsAt: row.startsAt || null,
      endsAt: row.endsAt || null,
      audience,
      questions,
      version: 1,
      authorId: authorId || null,
      authorName: authorName || 'Admin demo',
      publishedAt: row.status === 'published' ? row.startsAt || new Date() : null,
      audienceSnapshot:
        row.status === 'published'
          ? {
              invitedCount: null,
              capturedAt: new Date(),
              mode: audience.mode,
              areaIds: audience.areaIds || [],
              groupIds: audience.groupIds || [],
              userIds: audience.userIds || [],
            }
          : undefined,
    }

    if (payload.status === 'published') {
      const invitedCount = await User.countDocuments({
        tenantId,
        activo: { $ne: false },
        ...(audience.mode === 'users' && audience.userIds?.length
          ? { _id: { $in: audience.userIds } }
          : {}),
      })
      if (payload.audienceSnapshot) payload.audienceSnapshot.invitedCount = invitedCount
    }

    const existing = await Survey.findOne({ tenantId, externalId: row.externalId }).select('_id').lean()
    const doc = await Survey.findOneAndUpdate(
      { tenantId, externalId: row.externalId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    if (existing) updated += 1
    else created += 1
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1

    responsesUpserted += await upsertSampleResponses(tenantId, doc, row.sampleResponses)
  }

  const missingTypes = SURVEY_QUESTION_TYPES.filter((t) => !questionTypesCovered.has(t))
  const categoriesUsed = [...new Set(catalog.map((c) => c.categoria))]

  return {
    created,
    updated,
    total: catalog.length,
    responsesUpserted,
    byStatus,
    categoriesUsed,
    categoriesAvailable: SURVEY_CATEGORIES.map((c) => c.id),
    questionTypesCovered: [...questionTypesCovered],
    questionTypesMissing: missingTypes,
  }
}
