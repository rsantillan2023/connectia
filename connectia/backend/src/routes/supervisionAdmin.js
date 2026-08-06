/**
 * API Admin — Supervisión comercial ABM + plantillas + roles (Ola 31).
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import {
  SupCadena,
  SupCliente,
  SupSala,
  SupClienteSala,
  SupTemplate,
  SupCoberturaRol,
  serializeCadena,
  serializeCliente,
  serializeSala,
  serializeClienteSala,
  serializeTemplate,
} from '../models/Supervision.js'
import { snapshotMediciones, SUP_ROLE } from '../lib/supervisionTasks.js'
import { ensureDefaultCoberturaRoles } from '../lib/supervisionCoberturaRoles.js'
import { User } from '../models/User.js'
import { ensureOla31MenuItems, OLA31_MENU_ITEMS } from '../lib/ensureOla31Menu.js'
import { MenuItem } from '../models/MenuItem.js'
import { seedSupervisionAdminDemo } from '../lib/supervisionAdminSeed.js'
import { mountSupervisionAdminExtras } from './supervisionAdminExtras.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const SUP_MODULE_CAP = 'supervision.comercial'

router.use(requireAuth)
router.use(requireCapability('admin.supervision'))

mountSupervisionAdminExtras(router)

/** Estado del módulo (capability + menú) en esta comunidad. */
router.get('/module', async (req, res) => {
  const caps = req.tenant.capabilities || []
  res.json({ enabled: caps.includes(SUP_MODULE_CAP), capability: SUP_MODULE_CAP })
})

/**
 * Activa o desactiva Supervisión comercial en el tenant:
 * - capability `supervision.comercial`
 * - ítems de menú Ola 31 (app + admin)
 */
router.put('/module', async (req, res) => {
  const enabled = Boolean(req.body?.enabled)
  const caps = new Set(req.tenant.capabilities || [])
  if (enabled) {
    caps.add(SUP_MODULE_CAP)
    await ensureOla31MenuItems(req.tenant._id)
  } else {
    caps.delete(SUP_MODULE_CAP)
    await MenuItem.updateMany(
      { tenantId: req.tenant._id, key: { $in: OLA31_MENU_ITEMS.map((i) => i.key) } },
      { $set: { activo: false } },
    )
  }
  req.tenant.capabilities = [...caps]
  req.tenant.menuVersion = (req.tenant.menuVersion || 1) + 1
  await req.tenant.save()
  res.json({
    ok: true,
    enabled,
    capability: SUP_MODULE_CAP,
    capabilities: req.tenant.capabilities,
    menuVersion: req.tenant.menuVersion,
  })
})

/** Compat: activar menú + capability (equivalente a PUT /module { enabled: true }). */
router.post('/ensure-menu', async (req, res) => {
  const caps = new Set(req.tenant.capabilities || [])
  caps.add(SUP_MODULE_CAP)
  await ensureOla31MenuItems(req.tenant._id)
  req.tenant.capabilities = [...caps]
  req.tenant.menuVersion = (req.tenant.menuVersion || 1) + 1
  await req.tenant.save()
  res.json({ ok: true, enabled: true, capabilities: req.tenant.capabilities })
})

/** Seed rico supervisión + equipos para la comunidad actual. Body: { force?: boolean } */
router.post('/seed-demo', async (req, res, next) => {
  try {
    const force = Boolean(req.body?.force)
    const result = await seedSupervisionAdminDemo(req.tenant, { force })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/* —— Cadenas —— */
router.get('/cadenas', async (req, res) => {
  const rows = await SupCadena.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeCadena) })
})

router.post('/cadenas', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim()
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  const d = await SupCadena.create({ tenantId: req.tenant._id, nombre: nombre.slice(0, 120) })
  res.status(201).json({ item: serializeCadena(d) })
})

router.patch('/cadenas/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupCadena.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  if (req.body?.nombre != null) d.nombre = String(req.body.nombre).trim().slice(0, 120)
  if (req.body?.activo != null) d.activo = Boolean(req.body.activo)
  await d.save()
  res.json({ item: serializeCadena(d) })
})

/* —— Clientes —— */
router.get('/clientes', async (req, res) => {
  const rows = await SupCliente.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeCliente) })
})

router.post('/clientes', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim()
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  const d = await SupCliente.create({
    tenantId: req.tenant._id,
    nombre: nombre.slice(0, 160),
    codigo: String(req.body?.codigo || '').slice(0, 80),
  })
  res.status(201).json({ item: serializeCliente(d) })
})

router.patch('/clientes/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupCliente.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrado' })
  if (req.body?.nombre != null) d.nombre = String(req.body.nombre).trim().slice(0, 160)
  if (req.body?.codigo != null) d.codigo = String(req.body.codigo).slice(0, 80)
  if (req.body?.activo != null) d.activo = Boolean(req.body.activo)
  await d.save()
  res.json({ item: serializeCliente(d) })
})

/* —— Salas —— */
router.get('/salas', async (req, res) => {
  const rows = await SupSala.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeSala) })
})

router.post('/salas', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim()
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  const d = await SupSala.create({
    tenantId: req.tenant._id,
    nombre: nombre.slice(0, 160),
    codigo: String(req.body?.codigo || '').slice(0, 80),
    cadenaId: req.body?.cadenaId && ObjectId.isValid(req.body.cadenaId) ? req.body.cadenaId : null,
    comuna: String(req.body?.comuna || '').slice(0, 80),
    region: String(req.body?.region || '').slice(0, 80),
    lat: req.body?.lat != null ? Number(req.body.lat) : null,
    lng: req.body?.lng != null ? Number(req.body.lng) : null,
  })
  res.status(201).json({ item: serializeSala(d) })
})

router.patch('/salas/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  const b = req.body || {}
  if (b.nombre != null) d.nombre = String(b.nombre).trim().slice(0, 160)
  if (b.codigo != null) d.codigo = String(b.codigo).slice(0, 80)
  if (b.cadenaId !== undefined) d.cadenaId = b.cadenaId && ObjectId.isValid(b.cadenaId) ? b.cadenaId : null
  if (b.subcadenaId !== undefined) {
    d.subcadenaId = b.subcadenaId && ObjectId.isValid(b.subcadenaId) ? b.subcadenaId : null
  }
  if (b.comuna != null) d.comuna = String(b.comuna).slice(0, 80)
  if (b.region != null) d.region = String(b.region).slice(0, 80)
  if (b.pais != null) d.pais = String(b.pais).slice(0, 80)
  if (b.lat !== undefined) d.lat = b.lat != null ? Number(b.lat) : null
  if (b.lng !== undefined) d.lng = b.lng != null ? Number(b.lng) : null
  if (b.activo != null) d.activo = Boolean(b.activo)
  await d.save()
  res.json({ item: serializeSala(d) })
})

/* —— Cliente–Sala + colaboradores —— */
router.get('/cliente-salas', async (req, res) => {
  const rows = await SupClienteSala.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).lean()
  res.json({ items: rows.map(serializeClienteSala) })
})

router.post('/cliente-salas', async (req, res) => {
  const { clienteId, salaId } = req.body || {}
  if (!ObjectId.isValid(clienteId) || !ObjectId.isValid(salaId)) {
    return res.status(400).json({ error: 'clienteId y salaId requeridos' })
  }
  const titulo = String(req.body?.titulo || '').trim().slice(0, 40)
  if (!titulo) return res.status(400).json({ error: 'Título requerido (máx. 40 caracteres)' })
  let templateId = null
  if (req.body?.templateId && ObjectId.isValid(req.body.templateId)) {
    const tpl = await SupTemplate.findOne({
      _id: req.body.templateId,
      tenantId: req.tenant._id,
      activo: true,
    }).lean()
    if (!tpl) return res.status(400).json({ error: 'Plantilla no encontrada' })
    templateId = tpl._id
  }
  const d = await SupClienteSala.create({
    tenantId: req.tenant._id,
    clienteId,
    salaId,
    titulo,
    descripcion: String(req.body?.descripcion || '').trim().slice(0, 4000),
    templateId,
    colaboradores: [],
  })
  res.status(201).json({ item: serializeClienteSala(d) })
})

router.patch('/cliente-salas/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupClienteSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  const b = req.body || {}
  if (typeof b.activo === 'boolean') d.activo = b.activo
  if (b.titulo !== undefined) {
    const titulo = String(b.titulo || '').trim().slice(0, 40)
    if (!titulo) return res.status(400).json({ error: 'Título requerido (máx. 40 caracteres)' })
    d.titulo = titulo
  }
  if (b.descripcion !== undefined) d.descripcion = String(b.descripcion || '').trim().slice(0, 4000)
  if (b.clienteId !== undefined) {
    if (!ObjectId.isValid(b.clienteId)) return res.status(400).json({ error: 'clienteId inválido' })
    d.clienteId = b.clienteId
  }
  if (b.salaId !== undefined) {
    if (!ObjectId.isValid(b.salaId)) return res.status(400).json({ error: 'salaId inválido' })
    d.salaId = b.salaId
  }
  if (b.templateId !== undefined) {
    if (!b.templateId) {
      d.templateId = null
    } else if (ObjectId.isValid(b.templateId)) {
      const tpl = await SupTemplate.findOne({
        _id: b.templateId,
        tenantId: req.tenant._id,
      }).lean()
      if (!tpl) return res.status(400).json({ error: 'Plantilla no encontrada' })
      d.templateId = tpl._id
    } else {
      return res.status(400).json({ error: 'templateId inválido' })
    }
  }
  await d.save()
  res.json({ item: serializeClienteSala(d) })
})

router.post('/cliente-salas/:id/colaboradores', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupClienteSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  const userId = req.body?.userId
  const role = String(req.body?.role || 'operario').trim().slice(0, 40)
  if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId inválido' })
  if (!role) return res.status(400).json({ error: 'Rol de cobertura requerido' })

  let rolOk = await SupCoberturaRol.findOne({
    tenantId: req.tenant._id,
    codigo: role,
    activo: true,
  }).lean()
  if (!rolOk) {
    const n = await SupCoberturaRol.countDocuments({ tenantId: req.tenant._id })
    if (n === 0) {
      await ensureDefaultCoberturaRoles(req.tenant._id)
      rolOk = await SupCoberturaRol.findOne({
        tenantId: req.tenant._id,
        codigo: role,
        activo: true,
      }).lean()
    }
  }
  if (!rolOk) {
    return res.status(400).json({ error: 'Rol de cobertura inválido o inactivo. Configuralo en Roles de cobertura.' })
  }

  d.colaboradores = (d.colaboradores || []).filter((c) => String(c.userId) !== String(userId))
  d.colaboradores.push({ userId, role })
  await d.save()
  // No tocar User.supervisionRole: el rol de cobertura es solo de este módulo/punto.
  res.json({ item: serializeClienteSala(d) })
})

router.delete('/cliente-salas/:id/colaboradores/:userId', async (req, res) => {
  if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'IDs inválidos' })
  }
  const d = await SupClienteSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  d.colaboradores = (d.colaboradores || []).filter((c) => String(c.userId) !== String(req.params.userId))
  if (!d.colaboradores.length) {
    await d.deleteOne()
    return res.json({ ok: true, deletedAssignment: true, item: null })
  }
  await d.save()
  res.json({ ok: true, deletedAssignment: false, item: serializeClienteSala(d) })
})

router.delete('/cliente-salas/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupClienteSala.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  res.json({ ok: true })
})

/* —— Templates —— */
router.get('/templates', async (req, res) => {
  const rows = await SupTemplate.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeTemplate) })
})

router.post('/templates', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim()
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  const mediciones = snapshotMediciones(req.body?.mediciones || [])
  const d = await SupTemplate.create({
    tenantId: req.tenant._id,
    nombre: nombre.slice(0, 160),
    descripcion: String(req.body?.descripcion || '').slice(0, 1000),
    mediciones,
    categoriaId:
      req.body?.categoriaId && ObjectId.isValid(req.body.categoriaId) ? req.body.categoriaId : null,
    estadoId: req.body?.estadoId && ObjectId.isValid(req.body.estadoId) ? req.body.estadoId : null,
  })
  res.status(201).json({ item: serializeTemplate(d) })
})

router.patch('/templates/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  if (req.body?.nombre != null) d.nombre = String(req.body.nombre).trim().slice(0, 160)
  if (req.body?.descripcion != null) d.descripcion = String(req.body.descripcion).slice(0, 1000)
  if (req.body?.mediciones != null) d.mediciones = snapshotMediciones(req.body.mediciones)
  if (req.body?.categoriaId !== undefined) {
    d.categoriaId = req.body.categoriaId && ObjectId.isValid(req.body.categoriaId) ? req.body.categoriaId : null
  }
  if (req.body?.estadoId !== undefined) {
    d.estadoId = req.body.estadoId && ObjectId.isValid(req.body.estadoId) ? req.body.estadoId : null
  }
  if (req.body?.activo != null) d.activo = Boolean(req.body.activo)
  await d.save()
  res.json({ item: serializeTemplate(d) })
})

/* —— Roles supervisión en usuarios —— */
router.get('/usuarios-roles', async (req, res) => {
  const users = await User.find({ tenantId: req.tenant._id, activo: true })
    .select('nombre apellido usuario supervisionRole email')
    .sort({ nombre: 1 })
    .limit(500)
    .lean()
  res.json({
    items: users.map((u) => ({
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      usuario: u.usuario,
      email: u.email || '',
      supervisionRole: u.supervisionRole || '',
    })),
    roles: Object.values(SUP_ROLE),
  })
})

router.patch('/usuarios-roles/:userId', async (req, res) => {
  if (!ObjectId.isValid(req.params.userId)) return res.status(400).json({ error: 'ID inválido' })
  const role = String(req.body?.supervisionRole || '')
  const allowed = ['', ...Object.values(SUP_ROLE)]
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rol inválido' })
  const u = await User.findOneAndUpdate(
    { _id: req.params.userId, tenantId: req.tenant._id },
    { $set: { supervisionRole: role } },
    { new: true },
  )
    .select('nombre apellido usuario supervisionRole')
    .lean()
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json({
    item: {
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      supervisionRole: u.supervisionRole || '',
    },
  })
})

export default router
