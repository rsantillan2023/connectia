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
  serializeCadena,
  serializeCliente,
  serializeSala,
  serializeClienteSala,
  serializeTemplate,
} from '../models/Supervision.js'
import { snapshotMediciones, SUP_ROLE } from '../lib/supervisionTasks.js'
import { User } from '../models/User.js'
import { ensureOla31MenuItems } from '../lib/ensureOla31Menu.js'
import { mountSupervisionAdminExtras } from './supervisionAdminExtras.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth)
router.use(requireCapability('admin.supervision'))

mountSupervisionAdminExtras(router)

router.post('/ensure-menu', async (req, res) => {
  await ensureOla31MenuItems(req.tenant._id)
  const caps = new Set(req.tenant.capabilities || [])
  caps.add('supervision.comercial')
  req.tenant.capabilities = [...caps]
  await req.tenant.save()
  res.json({ ok: true, capabilities: req.tenant.capabilities })
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
  try {
    const d = await SupClienteSala.create({
      tenantId: req.tenant._id,
      clienteId,
      salaId,
      colaboradores: [],
    })
    res.status(201).json({ item: serializeClienteSala(d) })
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'Relación ya existe' })
    throw err
  }
})

router.post('/cliente-salas/:id/colaboradores', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const d = await SupClienteSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  const userId = req.body?.userId
  const role = String(req.body?.role || SUP_ROLE.OPERARIO)
  if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId inválido' })
  const allowed = Object.values(SUP_ROLE)
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rol inválido' })
  d.colaboradores = (d.colaboradores || []).filter((c) => String(c.userId) !== String(userId))
  d.colaboradores.push({ userId, role })
  await d.save()
  await User.updateOne(
    { _id: userId, tenantId: req.tenant._id },
    { $set: { supervisionRole: role } },
  )
  res.json({ item: serializeClienteSala(d) })
})

router.delete('/cliente-salas/:id/colaboradores/:userId', async (req, res) => {
  if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'IDs inválidos' })
  }
  const d = await SupClienteSala.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!d) return res.status(404).json({ error: 'No encontrada' })
  d.colaboradores = (d.colaboradores || []).filter((c) => String(c.userId) !== String(req.params.userId))
  await d.save()
  res.json({ item: serializeClienteSala(d) })
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
