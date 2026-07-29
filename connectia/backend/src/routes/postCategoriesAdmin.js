import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { PostCategory, DEFAULT_POST_CATEGORIES } from '../models/PostCategory.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function ser(c) {
  return {
    id: c._id,
    key: c.key,
    nombre: c.nombre,
    slug: c.slug || c.key,
    descripcion: c.descripcion || '',
    icono: c.icono || '',
    color: c.color || '',
    parentId: c.parentId ? String(c.parentId) : null,
    legacyTipo: c.legacyTipo || '',
    orden: c.orden ?? 100,
    activo: c.activo !== false,
    sistema: c.sistema === true,
  }
}

function normalizeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

/** Asegura categorías sistema del tenant (idempotente). */
export async function ensureDefaultPostCategories(tenantId) {
  for (const d of DEFAULT_POST_CATEGORIES) {
    await PostCategory.findOneAndUpdate(
      { tenantId, key: d.key },
      {
        $setOnInsert: {
          tenantId,
          key: d.key,
          nombre: d.nombre,
          slug: d.key,
          legacyTipo: d.legacyTipo,
          orden: d.orden,
          sistema: true,
          activo: true,
        },
      },
      { upsert: true },
    )
  }
}

router.get('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    await ensureDefaultPostCategories(req.tenant._id)
    const includeInactive = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!includeInactive) filter.activo = true
    const items = await PostCategory.find(filter).sort({ orden: 1, nombre: 1 })
    res.json({ items: items.map(ser) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = normalizeKey(body.key || body.nombre)
    if (!key) return res.status(400).json({ error: 'key/nombre obligatorio' })
    const nombre = String(body.nombre || key).trim()
    const c = await PostCategory.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      slug: normalizeKey(body.slug || key),
      descripcion: String(body.descripcion || ''),
      icono: String(body.icono || ''),
      color: String(body.color || ''),
      parentId: body.parentId || null,
      legacyTipo: body.legacyTipo || 'general',
      orden: Number(body.orden) || 100,
      activo: body.activo !== false,
      sistema: false,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_category_create',
      meta: { id: String(c._id), key },
      ...reqMeta(req),
    })
    res.status(201).json({ category: ser(c) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa key' })
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const c = await PostCategory.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!c) return res.status(404).json({ error: 'Categoría no encontrada' })
    const body = req.body || {}
    if (body.nombre != null) c.nombre = String(body.nombre).trim()
    if (body.slug != null) c.slug = normalizeKey(body.slug)
    if (body.descripcion != null) c.descripcion = String(body.descripcion)
    if (body.icono != null) c.icono = String(body.icono)
    if (body.color != null) c.color = String(body.color)
    if (body.parentId !== undefined) c.parentId = body.parentId || null
    if (body.legacyTipo != null) c.legacyTipo = body.legacyTipo || ''
    if (body.orden != null) c.orden = Number(body.orden) || 100
    if (typeof body.activo === 'boolean') c.activo = body.activo
    if (body.key != null && !c.sistema) c.key = normalizeKey(body.key)
    await c.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_category_update',
      meta: { id: String(c._id), key: c.key },
      ...reqMeta(req),
    })
    res.json({ category: ser(c) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa key' })
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const c = await PostCategory.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!c) return res.status(404).json({ error: 'Categoría no encontrada' })
    if (c.sistema) return res.status(400).json({ error: 'No se puede eliminar una categoría de sistema' })
    c.activo = false
    await c.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.post_category_deactivate',
      meta: { id: String(c._id), key: c.key },
      ...reqMeta(req),
    })
    res.json({ ok: true, category: ser(c) })
  } catch (e) {
    next(e)
  }
})

export default router
