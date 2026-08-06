/**
 * ABM Clientes de audiencia (Ola 36-l).
 */
import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { AudienceClient } from '../models/AudienceClient.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function serClient(c) {
  return {
    id: String(c._id),
    nombre: c.nombre,
    emails: c.emails || [],
    userIds: (c.userIds || []).map(String),
    activo: c.activo !== false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function normalizeEmails(raw) {
  return [
    ...new Set(
      (Array.isArray(raw) ? raw : [])
        .map((e) => String(e || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

function normalizeUserIds(raw) {
  return [...new Set((Array.isArray(raw) ? raw : []).map(String).filter(Boolean))]
}

router.use(requireAuth, requireCapability('admin.organizacion', 'admin.usuarios'))

router.get('/', async (req, res, next) => {
  try {
    const all = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!all) filter.activo = true
    const items = await AudienceClient.find(filter).sort({ nombre: 1 }).lean()
    res.json({ items: items.map(serClient) })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' })
    const c = await AudienceClient.create({
      tenantId: req.tenant._id,
      nombre,
      emails: normalizeEmails(body.emails),
      userIds: normalizeUserIds(body.userIds),
      activo: body.activo !== false,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.audience_client_create',
      meta: { id: String(c._id), nombre },
      ...reqMeta(req),
    })
    res.status(201).json({ item: serClient(c) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const c = await AudienceClient.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' })
    const body = req.body || {}
    if (typeof body.nombre === 'string' && body.nombre.trim()) c.nombre = body.nombre.trim()
    if (body.emails !== undefined) c.emails = normalizeEmails(body.emails)
    if (body.userIds !== undefined) c.userIds = normalizeUserIds(body.userIds)
    if (typeof body.activo === 'boolean') c.activo = body.activo
    await c.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.audience_client_update',
      meta: { id: String(c._id) },
      ...reqMeta(req),
    })
    res.json({ item: serClient(c) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const c = await AudienceClient.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' })
    c.activo = false
    await c.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.audience_client_deactivate',
      meta: { id: String(c._id) },
      ...reqMeta(req),
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
