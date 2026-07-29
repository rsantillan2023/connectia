import { Router } from 'express'
import { KbArticle } from '../models/KbArticle.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import { assistantAiConfigured } from '../services/assistantAi.js'

const router = Router()
const cap = requireCapability('admin.ia')

function serialize(a) {
  return {
    id: String(a._id),
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    tags: a.tags || [],
    categoria: a.categoria,
    status: a.status,
    audience: serializeAudience(a.audience),
    orden: a.orden,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

router.get('/meta', requireAuth, cap, (_req, res) => {
  res.json({
    aiConfigured: assistantAiConfigured(),
    categorias: ['faq', 'guia', 'politica', 'general'],
    statuses: ['draft', 'published', 'archived'],
  })
})

router.get('/', requireAuth, cap, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const status = String(req.query.status || '').trim()
    const categoria = String(req.query.categoria || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (status) filter.status = status
    if (categoria) filter.categoria = categoria
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ titulo: rx }, { cuerpo: rx }, { tags: rx }]
    }
    const items = await KbArticle.find(filter).sort({ orden: 1, updatedAt: -1 }).limit(200)
    res.json({ items: items.map(serialize) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, cap, async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    const cuerpo = String(body.cuerpo || '').trim()
    if (!titulo || !cuerpo) return res.status(400).json({ error: 'titulo y cuerpo obligatorios' })
    const doc = await KbArticle.create({
      tenantId: req.tenant._id,
      titulo: titulo.slice(0, 200),
      cuerpo: cuerpo.slice(0, 20000),
      tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
      categoria: ['faq', 'guia', 'politica', 'general'].includes(body.categoria) ? body.categoria : 'faq',
      status: ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'published',
      audience: normalizeAudience(body.audience),
      orden: Number(body.orden) || 100,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })
    res.status(201).json({ item: serialize(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, cap, async (req, res, next) => {
  try {
    const doc = await KbArticle.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.cuerpo != null) doc.cuerpo = String(body.cuerpo).trim().slice(0, 20000)
    if (Array.isArray(body.tags)) {
      doc.tags = body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
    }
    if (['faq', 'guia', 'politica', 'general'].includes(body.categoria)) doc.categoria = body.categoria
    if (['draft', 'published', 'archived'].includes(body.status)) doc.status = body.status
    if (body.audience) doc.audience = normalizeAudience(body.audience)
    if (body.orden != null) doc.orden = Number(body.orden) || 100
    doc.updatedBy = req.user._id
    await doc.save()
    res.json({ item: serialize(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, cap, async (req, res, next) => {
  try {
    const r = await KbArticle.deleteOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r.deletedCount) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
