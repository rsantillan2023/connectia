import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { ProfileFieldDef } from '../models/ProfileFieldDef.js'
import {
  PROFILE_FIELD_TYPES,
  normalizeFieldKey,
  serializeFieldDef,
} from '../lib/profileFields.js'

const router = Router()

router.get('/', requireAuth, requireCapability('admin.usuarios', 'admin.organizacion'), async (req, res, next) => {
  try {
    const all = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!all) filter.activo = true
    const items = await ProfileFieldDef.find(filter).sort({ orden: 1, nombre: 1 })
    res.json({ items: items.map(serializeFieldDef) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = normalizeFieldKey(body.key || body.nombre)
    const nombre = String(body.nombre || '').trim().slice(0, 80)
    const tipo = PROFILE_FIELD_TYPES.includes(body.tipo) ? body.tipo : 'text'
    if (!key || !nombre) return res.status(400).json({ error: 'key y nombre obligatorios' })
    const opciones =
      tipo === 'list'
        ? (Array.isArray(body.opciones) ? body.opciones : String(body.opciones || '').split(','))
            .map((s) => String(s).trim())
            .filter(Boolean)
            .slice(0, 50)
        : []
    if (tipo === 'list' && !opciones.length) {
      return res.status(400).json({ error: 'Lista requiere al menos una opción' })
    }
    const doc = await ProfileFieldDef.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      tipo,
      obligatorio: Boolean(body.obligatorio),
      opciones,
      orden: Number(body.orden) || 100,
      activo: body.activo !== false,
      descripcion: String(body.descripcion || '').trim().slice(0, 240),
    })
    res.status(201).json({ field: serializeFieldDef(doc) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe un campo con esa key' })
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const doc = await ProfileFieldDef.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Campo no encontrado' })
    const body = req.body || {}
    if (typeof body.nombre === 'string') doc.nombre = body.nombre.trim().slice(0, 80)
    if (PROFILE_FIELD_TYPES.includes(body.tipo)) doc.tipo = body.tipo
    if (typeof body.obligatorio === 'boolean') doc.obligatorio = body.obligatorio
    if (typeof body.activo === 'boolean') doc.activo = body.activo
    if (body.orden != null) doc.orden = Number(body.orden) || 100
    if (typeof body.descripcion === 'string') doc.descripcion = body.descripcion.trim().slice(0, 240)
    if (body.opciones !== undefined || doc.tipo === 'list') {
      const opciones = Array.isArray(body.opciones)
        ? body.opciones
        : body.opciones != null
          ? String(body.opciones).split(',')
          : doc.opciones
      doc.opciones = (opciones || [])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 50)
    }
    await doc.save()
    res.json({ field: serializeFieldDef(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const doc = await ProfileFieldDef.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Campo no encontrado' })
    doc.activo = false
    await doc.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
