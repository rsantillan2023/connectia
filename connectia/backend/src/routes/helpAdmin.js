import { Router } from 'express'
import mongoose from 'mongoose'
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience } from '../lib/audience.js'
import {
  normalizeHelpStatus,
  normalizeKeywords,
  normalizeTutorialSteps,
} from '../lib/helpContent.js'
import { syncKbSource } from '../services/kbIndex.js'
import { aiConfigured, generateHelpDraft } from '../services/helpAi.js'
import { serializeFaq, serializeTutorial } from './help.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const cap = 'admin.ayuda'

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, groups, users] = await Promise.all([
    a.mode === 'restricted' && areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id')
      : [],
    a.mode === 'restricted' && groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id')
      : [],
    userIds.length ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id') : [],
  ])
  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

function authorName(user) {
  return [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario
}

router.get('/meta', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').sort({ orden: 1, nombre: 1 }).lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').sort({ nombre: 1 }).lean(),
    ])
    res.json({
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
      groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
      statuses: ['draft', 'published', 'archived'],
      aiConfigured: aiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Genera borrador FAQ o tutorial con IA (o heurística si no hay keys).
 * Body: { kind: 'faq'|'tutorial', prompt, provider? }
 */
router.post('/generate', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const body = req.body || {}
    const kind = body.kind === 'tutorial' ? 'tutorial' : 'faq'
    const result = await generateHelpDraft({
      kind,
      prompt: body.prompt,
      tenant: req.tenant,
      provider: body.provider || 'auto',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/* ─── FAQs ─── */

router.get('/faqs', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const items = await Faq.find(filter).sort({ orden: 1, updatedAt: -1 }).lean()
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
    ])
    res.json({
      items: items.map((f) => serializeFaq(f)),
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
      groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/faqs', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const body = req.body || {}
    const pregunta = String(body.pregunta || '').trim().slice(0, 400)
    const respuesta = String(body.respuesta || '').trim().slice(0, 20000)
    if (!pregunta || !respuesta) {
      return res.status(400).json({ error: 'Pregunta y respuesta son requeridas' })
    }
    const status = normalizeHelpStatus(body.status, 'draft')
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const doc = new Faq({
      tenantId: req.tenant._id,
      category: String(body.category || 'general').trim().slice(0, 80) || 'general',
      pregunta,
      respuesta,
      keywords: normalizeKeywords(body.keywords),
      orden: Number.isFinite(Number(body.orden)) ? Number(body.orden) : 100,
      status,
      audience,
      authorId: req.user._id,
      authorName: authorName(req.user),
      publishedAt: status === 'published' ? new Date() : null,
      revisadoEn: body.revisadoEn ? new Date(body.revisadoEn) : new Date(),
    })
    await syncKbSource('faq', doc)
    await doc.save()
    res.status(201).json({ faq: serializeFaq(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.put('/faqs/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Faq.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'FAQ no encontrada' })
    const body = req.body || {}
    if (body.pregunta != null) doc.pregunta = String(body.pregunta).trim().slice(0, 400)
    if (body.respuesta != null) doc.respuesta = String(body.respuesta).trim().slice(0, 20000)
    if (!doc.pregunta || !doc.respuesta) {
      return res.status(400).json({ error: 'Pregunta y respuesta son requeridas' })
    }
    if (body.category != null) {
      doc.category = String(body.category).trim().slice(0, 80) || 'general'
    }
    if (body.keywords != null) doc.keywords = normalizeKeywords(body.keywords)
    if (body.orden != null && Number.isFinite(Number(body.orden))) doc.orden = Number(body.orden)
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (body.revisadoEn != null) doc.revisadoEn = body.revisadoEn ? new Date(body.revisadoEn) : null
    if (body.status != null) {
      const nextStatus = normalizeHelpStatus(body.status, doc.status)
      if (nextStatus === 'published' && doc.status !== 'published') {
        doc.publishedAt = new Date()
      }
      doc.status = nextStatus
    }
    doc.authorName = authorName(req.user)
    await syncKbSource('faq', doc)
    await doc.save()
    res.json({ faq: serializeFaq(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.delete('/faqs/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Faq.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'FAQ no encontrada' })
    // Baja lógica
    doc.status = 'archived'
    await syncKbSource('faq', doc)
    await doc.save()
    res.json({ ok: true, faq: serializeFaq(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/* ─── Tutoriales ─── */

router.get('/tutorials', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const items = await Tutorial.find(filter).sort({ orden: 1, updatedAt: -1 }).lean()
    res.json({ items: items.map((t) => serializeTutorial(t)) })
  } catch (e) {
    next(e)
  }
})

router.post('/tutorials', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    if (!titulo) return res.status(400).json({ error: 'Título requerido' })
    const status = normalizeHelpStatus(body.status, 'draft')
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const steps = normalizeTutorialSteps(body.steps || body.pasos)
    const doc = new Tutorial({
      tenantId: req.tenant._id,
      category: String(body.category || 'general').trim().slice(0, 80) || 'general',
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 4000),
      steps,
      keywords: normalizeKeywords(body.keywords),
      moduloRelacionado: String(body.moduloRelacionado || '').trim().slice(0, 80),
      orden: Number.isFinite(Number(body.orden)) ? Number(body.orden) : 100,
      status,
      showOnFirstLogin: Boolean(body.showOnFirstLogin),
      audience,
      authorId: req.user._id,
      authorName: authorName(req.user),
      publishedAt: status === 'published' ? new Date() : null,
    })
    await syncKbSource('tutorial', doc)
    await doc.save()
    res.status(201).json({ tutorial: serializeTutorial(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.put('/tutorials/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Tutorial.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Tutorial no encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (!doc.titulo) return res.status(400).json({ error: 'Título requerido' })
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 4000)
    if (body.category != null) {
      doc.category = String(body.category).trim().slice(0, 80) || 'general'
    }
    if (body.steps != null || body.pasos != null) {
      doc.steps = normalizeTutorialSteps(body.steps || body.pasos)
    }
    if (body.keywords != null) doc.keywords = normalizeKeywords(body.keywords)
    if (body.moduloRelacionado != null) {
      doc.moduloRelacionado = String(body.moduloRelacionado).trim().slice(0, 80)
    }
    if (body.orden != null && Number.isFinite(Number(body.orden))) doc.orden = Number(body.orden)
    if (body.showOnFirstLogin != null) doc.showOnFirstLogin = Boolean(body.showOnFirstLogin)
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (body.status != null) {
      const nextStatus = normalizeHelpStatus(body.status, doc.status)
      if (nextStatus === 'published' && doc.status !== 'published') {
        doc.publishedAt = new Date()
      }
      doc.status = nextStatus
    }
    doc.authorName = authorName(req.user)
    await syncKbSource('tutorial', doc)
    await doc.save()
    res.json({ tutorial: serializeTutorial(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.delete('/tutorials/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Tutorial.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Tutorial no encontrado' })
    doc.status = 'archived'
    await syncKbSource('tutorial', doc)
    await doc.save()
    res.json({ ok: true, tutorial: serializeTutorial(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

export default router
