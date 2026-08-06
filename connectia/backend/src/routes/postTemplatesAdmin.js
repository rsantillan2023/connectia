import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { PostTemplate } from '../models/PostTemplate.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

const TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']
const LAYOUTS = ['vertical', 'horizontal', 'banner']

function ser(t) {
  return {
    id: t._id,
    nombre: t.nombre,
    key: t.key || '',
    tipo: t.tipo || 'noticia',
    titulo: t.titulo || '',
    cuerpo: t.cuerpo || '',
    layout: t.layout || 'vertical',
    section: t.section || '',
    imageUrl: t.imageUrl || '',
    pinned: t.pinned === true,
    activo: t.activo !== false,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

router.get('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const includeInactive = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!includeInactive) filter.activo = true
    const items = await PostTemplate.find(filter).sort({ nombre: 1 })
    res.json({ items: items.map(ser) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'nombre obligatorio' })
    const t = await PostTemplate.create({
      tenantId: req.tenant._id,
      nombre,
      key: String(body.key || '').trim(),
      tipo: TIPOS.includes(body.tipo) ? body.tipo : 'noticia',
      titulo: String(body.titulo || ''),
      cuerpo: String(body.cuerpo || ''),
      layout: LAYOUTS.includes(body.layout) ? body.layout : 'vertical',
      section: String(body.section || '').slice(0, 80),
      imageUrl: String(body.imageUrl || ''),
      pinned: body.pinned === true,
      activo: body.activo !== false,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_template_create',
      meta: { id: String(t._id), nombre },
      ...reqMeta(req),
    })
    res.status(201).json({ template: ser(t) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const t = await PostTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!t) return res.status(404).json({ error: 'Plantilla no encontrada' })
    const body = req.body || {}
    if (body.nombre != null) t.nombre = String(body.nombre).trim()
    if (body.key != null) t.key = String(body.key).trim()
    if (body.tipo != null && TIPOS.includes(body.tipo)) t.tipo = body.tipo
    if (body.titulo != null) t.titulo = String(body.titulo)
    if (body.cuerpo != null) t.cuerpo = String(body.cuerpo)
    if (body.layout != null && LAYOUTS.includes(body.layout)) t.layout = body.layout
    if (body.section != null) t.section = String(body.section).slice(0, 80)
    if (body.imageUrl != null) t.imageUrl = String(body.imageUrl)
    if (typeof body.pinned === 'boolean') t.pinned = body.pinned
    if (typeof body.activo === 'boolean') t.activo = body.activo
    await t.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_template_update',
      meta: { id: String(t._id) },
      ...reqMeta(req),
    })
    res.json({ template: ser(t) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const t = await PostTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!t) return res.status(404).json({ error: 'Plantilla no encontrada' })
    t.activo = false
    await t.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_template_deactivate',
      meta: { id: String(t._id) },
      ...reqMeta(req),
    })
    res.json({ ok: true, template: ser(t) })
  } catch (e) {
    next(e)
  }
})

export default router
