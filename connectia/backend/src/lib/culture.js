/**
 * Helpers puros §39 Cultura — testeables sin Mongo.
 */

export const CULTURE_CAPS = [
  'cultura',
  'cultura.reconocimientos',
  'cultura.marketplace',
  'cultura.referidos',
  'cultura.pulso',
]

export const REFERRAL_STATUSES = [
  'submitted',
  'reviewing',
  'interview',
  'hired',
  'rejected',
  'withdrawn',
]
export const MARKETPLACE_CATEGORIES = ['venta', 'regalo', 'servicio', 'otro']
export const MARKETPLACE_STATUSES = ['draft', 'published', 'sold', 'hidden', 'archived']

export function tenantHasCultureCap(tenant, sub = null) {
  const caps = new Set(tenant?.capabilities || [])
  if (!caps.has('cultura')) return false
  if (!sub) return true
  return caps.has(`cultura.${sub}`)
}

/**
 * eNPS = % promoters (9–10) − % detractors (0–6). Passives 7–8 ignored in formula.
 * @param {number[]} scores 0–10
 * @returns {{ enps: number|null, promoters: number, passives: number, detractors: number, n: number }}
 */
export function computeEnps(scores) {
  const list = (Array.isArray(scores) ? scores : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 10)
  const n = list.length
  if (!n) {
    return { enps: null, promoters: 0, passives: 0, detractors: 0, n: 0 }
  }
  let promoters = 0
  let passives = 0
  let detractors = 0
  for (const s of list) {
    if (s >= 9) promoters++
    else if (s >= 7) passives++
    else detractors++
  }
  const enps = Math.round(((promoters - detractors) / n) * 100)
  return { enps, promoters, passives, detractors, n }
}

/**
 * Solo devolver agregados si se alcanza el umbral de anonimato.
 */
export function pulseAggregateSafe(responses, campaign) {
  const threshold = Math.max(1, Number(campaign?.anonymityThreshold) || 5)
  const n = Array.isArray(responses) ? responses.length : 0
  if (n < threshold) {
    return {
      visible: false,
      reason: `Se necesitan al menos ${threshold} respuestas para mostrar resultados (hay ${n}).`,
      n,
      threshold,
      enps: null,
    }
  }
  const questions = campaign?.questions || []
  const enpsIdx = questions.findIndex((q) => q.tipo === 'enps')
  const scores =
    enpsIdx >= 0
      ? responses.map((r) => Number(r.answers?.[enpsIdx]?.value)).filter((v) => Number.isFinite(v))
      : []
  const enps = computeEnps(scores)
  const openThemes = []
  questions.forEach((q, qi) => {
    if (q.tipo !== 'text') return
    const texts = responses
      .map((r) => String(r.answers?.[qi]?.value || '').trim())
      .filter(Boolean)
      .slice(0, 50)
    openThemes.push({ question: q.texto, samples: texts.length, texts: texts.slice(0, 5) })
  })
  return {
    visible: true,
    n,
    threshold,
    ...enps,
    openThemes,
  }
}

export function serializeCultureValue(v) {
  return {
    id: String(v._id),
    nombre: v.nombre,
    descripcion: v.descripcion || '',
    color: v.color || '#0f766e',
    orden: v.orden ?? 100,
    activo: v.activo !== false,
  }
}

export function serializeRecognition(r) {
  return {
    id: String(r._id),
    fromUserId: r.fromUserId ? String(r.fromUserId) : null,
    fromName: r.fromName || '',
    toUserId: r.toUserId ? String(r.toUserId) : null,
    toName: r.toName || '',
    valueId: r.valueId ? String(r.valueId) : null,
    valueName: r.valueName || '',
    mensaje: r.mensaje,
    points: r.points || 0,
    postId: r.postId ? String(r.postId) : null,
    visibility: r.visibility || 'public',
    createdAt: r.createdAt,
  }
}

export function serializeMarketplace(m) {
  return {
    id: String(m._id),
    authorId: m.authorId ? String(m.authorId) : null,
    authorName: m.authorName || '',
    titulo: m.titulo,
    descripcion: m.descripcion || '',
    category: m.category || 'venta',
    precio: m.precio || '',
    imageUrl: m.imageUrl || '',
    contactNote: m.contactNote || '',
    status: m.status,
    hiddenReason: m.hiddenReason || '',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

export function serializeReferral(r) {
  return {
    id: String(r._id),
    vacancyId: r.vacancyId ? String(r.vacancyId) : null,
    vacancyTitle: r.vacancyTitle || '',
    referrerId: r.referrerId ? String(r.referrerId) : null,
    referrerName: r.referrerName || '',
    candidateName: r.candidateName,
    candidateEmail: r.candidateEmail || '',
    candidatePhone: r.candidatePhone || '',
    notes: r.notes || '',
    status: r.status,
    rewardGranted: Boolean(r.rewardGranted),
    rewardNote: r.rewardNote || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function serializePulseCampaign(c, { answeredByMe = false } = {}) {
  return {
    id: String(c._id),
    nombre: c.nombre,
    descripcion: c.descripcion || '',
    questions: (c.questions || []).map((q) => ({
      tipo: q.tipo,
      texto: q.texto,
    })),
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    anonymityThreshold: c.anonymityThreshold ?? 5,
    status: c.status,
    answeredByMe,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export function validatePulseAnswers(questions, answers) {
  const qs = Array.isArray(questions) ? questions : []
  const ans = Array.isArray(answers) ? answers : []
  if (ans.length !== qs.length) {
    return { ok: false, error: 'Debés responder todas las preguntas' }
  }
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i]
    const v = ans[i]?.value
    if (q.tipo === 'enps' || q.tipo === 'scale') {
      const n = Number(v)
      const max = q.tipo === 'enps' ? 10 : 5
      const min = q.tipo === 'enps' ? 0 : 1
      if (!Number.isFinite(n) || n < min || n > max) {
        return { ok: false, error: `Respuesta inválida en pregunta ${i + 1}` }
      }
    } else if (q.tipo === 'text') {
      if (String(v || '').trim().length > 2000) {
        return { ok: false, error: 'Texto demasiado largo' }
      }
    }
  }
  return { ok: true }
}
