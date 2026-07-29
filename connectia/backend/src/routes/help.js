import { Router } from 'express'
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { requireAuth } from '../middleware/auth.js'
import {
  audienceFilterForUser,
  userMatchesAudience,
  serializeAudience,
} from '../lib/audience.js'
import { deepLinkFor, helpSearchClause, normalizeTutorialSteps } from '../lib/helpContent.js'
import { kbPayloadSummary } from '../services/kbIndex.js'

const router = Router()

export function serializeFaq(f, { includeBody = true } = {}) {
  return {
    id: String(f._id),
    category: f.category || 'general',
    pregunta: f.pregunta,
    respuesta: includeBody ? f.respuesta || '' : undefined,
    keywords: f.keywords || [],
    orden: f.orden ?? 100,
    status: f.status,
    audience: serializeAudience(f.audience),
    authorName: f.authorName || '',
    publishedAt: f.publishedAt,
    revisadoEn: f.revisadoEn,
    href: deepLinkFor('faq', f._id),
    kb: kbPayloadSummary(f),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }
}

export function serializeTutorial(t, { includeSteps = true } = {}) {
  const steps = includeSteps ? normalizeTutorialSteps(t.steps) : undefined
  return {
    id: String(t._id),
    category: t.category || 'general',
    titulo: t.titulo,
    descripcion: t.descripcion || '',
    steps,
    stepCount: Array.isArray(t.steps) ? t.steps.length : 0,
    keywords: t.keywords || [],
    moduloRelacionado: t.moduloRelacionado || '',
    orden: t.orden ?? 100,
    status: t.status,
    showOnFirstLogin: Boolean(t.showOnFirstLogin),
    audience: serializeAudience(t.audience),
    authorName: t.authorName || '',
    publishedAt: t.publishedAt,
    href: deepLinkFor('tutorial', t._id),
    kb: kbPayloadSummary(t),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

/** GET /api/help/faqs — listar/buscar FAQs publicadas */
router.get('/faqs', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      $and: [audienceFilterForUser(req.user)],
    }
    if (category) filter.category = category
    const search = helpSearchClause(q, ['pregunta', 'respuesta', 'keywords', 'category'])
    if (search) filter.$and.push(search)

    const [items, cats] = await Promise.all([
      Faq.find(filter).sort({ orden: 1, publishedAt: -1 }).lean(),
      Faq.find({
        tenantId: req.tenant._id,
        status: 'published',
        $and: [audienceFilterForUser(req.user)],
      })
        .select('category')
        .lean(),
    ])

    const categories = [
      ...new Set(cats.map((c) => String(c.category || 'general').trim() || 'general')),
    ].sort((a, b) => a.localeCompare(b, 'es'))

    res.json({
      items: items.map((f) => serializeFaq(f)),
      categories,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/faqs/:id', requireAuth, async (req, res, next) => {
  try {
    const f = await Faq.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!f || f.status !== 'published' || !userMatchesAudience(req.user, f.audience)) {
      return res.status(404).json({ error: 'FAQ no encontrada' })
    }
    res.json({ faq: serializeFaq(f) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/help/tutorials */
router.get('/tutorials', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      $and: [audienceFilterForUser(req.user)],
    }
    if (category) filter.category = category
    const search = helpSearchClause(q, ['titulo', 'descripcion', 'keywords', 'moduloRelacionado', 'category'])
    if (search) filter.$and.push(search)

    const [items, cats] = await Promise.all([
      Tutorial.find(filter).sort({ orden: 1, publishedAt: -1 }).lean(),
      Tutorial.find({
        tenantId: req.tenant._id,
        status: 'published',
        $and: [audienceFilterForUser(req.user)],
      })
        .select('category')
        .lean(),
    ])

    const categories = [
      ...new Set(cats.map((c) => String(c.category || 'general').trim() || 'general')),
    ].sort((a, b) => a.localeCompare(b, 'es'))

    res.json({
      items: items.map((t) => serializeTutorial(t, { includeSteps: false })),
      categories,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/tutorials/:id', requireAuth, async (req, res, next) => {
  try {
    const t = await Tutorial.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!t || t.status !== 'published' || !userMatchesAudience(req.user, t.audience)) {
      return res.status(404).json({ error: 'Tutorial no encontrado' })
    }
    res.json({ tutorial: serializeTutorial(t) })
  } catch (e) {
    next(e)
  }
})

/** Resumen del centro de ayuda (conteos) */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const aud = audienceFilterForUser(req.user)
    const base = { tenantId: req.tenant._id, status: 'published', $and: [aud] }
    const [faqCount, tutorialCount] = await Promise.all([
      Faq.countDocuments(base),
      Tutorial.countDocuments(base),
    ])
    res.json({ faqCount, tutorialCount })
  } catch (e) {
    next(e)
  }
})

export default router
