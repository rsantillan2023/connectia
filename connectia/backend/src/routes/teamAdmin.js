/**
 * API Admin — ABM TeamScope (Ola 32).
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { TeamScope, serializeTeamScope } from '../models/TeamScope.js'
import { User } from '../models/User.js'
import { ensureOla32MenuItems } from '../lib/ensureOla32Menu.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { SupCliente } from '../models/Supervision.js'
import {
  normalizeTeamSource,
  refreshTeamScope,
  TEAM_MODULES,
} from '../lib/teamScope.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function allowAdmin(req, res, next) {
  if (
    hasCapability(req.user, req.tenant, 'admin.equipos') ||
    hasCapability(req.user, req.tenant, 'admin.supervision') ||
    (req.user?.roles || []).includes('admin') ||
    (req.user?.roles || []).includes('platform')
  ) {
    return next()
  }
  return requireCapability('admin.equipos')(req, res, next)
}

router.use(requireAuth)
router.use(allowAdmin)

router.post('/ensure-menu', async (req, res) => {
  await ensureOla32MenuItems(req.tenant._id)
  const set = new Set(req.tenant.capabilities || [])
  set.add('supervision.equipo')
  for (const m of TEAM_MODULES) {
    set.add(`supervision.equipo.${m}`)
  }
  set.add('admin.equipos')
  req.tenant.capabilities = [...set]
  await req.tenant.save()
  res.json({ ok: true, capabilities: req.tenant.capabilities })
})

router.get('/candidates/users', async (req, res) => {
  const users = await User.find({ tenantId: req.tenant._id, activo: true })
    .select('nombre apellido usuario email')
    .sort({ nombre: 1 })
    .limit(500)
    .lean()
  res.json({
    items: users.map((u) => ({
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      email: u.email || '',
    })),
  })
})

router.get('/candidates/org', async (req, res) => {
  const [areas, groups, clientes] = await Promise.all([
    OrgArea.find({ tenantId: req.tenant._id, activo: true }).sort({ nombre: 1 }).select('nombre').lean(),
    UserGroup.find({ tenantId: req.tenant._id, activo: true }).sort({ nombre: 1 }).select('nombre').lean(),
    SupCliente.find({ tenantId: req.tenant._id, activo: true }).sort({ nombre: 1 }).select('nombre codigo').lean(),
  ])
  res.json({
    areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
    groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
    clientes: clientes.map((c) => ({ id: String(c._id), nombre: c.nombre, codigo: c.codigo || '' })),
  })
})

router.get('/', async (req, res) => {
  const q = { tenantId: req.tenant._id }
  if (req.query.supervisorId && ObjectId.isValid(req.query.supervisorId)) {
    q.supervisorId = req.query.supervisorId
  }
  const rows = await TeamScope.find(q).sort({ updatedAt: -1 }).limit(200).lean()
  res.json({ items: rows.map((d) => serializeTeamScope(d)), modules: TEAM_MODULES })
})

router.post('/', async (req, res) => {
  const body = req.body || {}
  const nombre = String(body.nombre || '').trim()
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  if (!body.supervisorId || !ObjectId.isValid(body.supervisorId)) {
    return res.status(400).json({ error: 'supervisorId requerido' })
  }
  const supervisor = await User.findOne({
    _id: body.supervisorId,
    tenantId: req.tenant._id,
    activo: true,
  }).select('_id')
  if (!supervisor) return res.status(400).json({ error: 'Supervisor inválido' })

  const allowedModules = Array.isArray(body.allowedModules)
    ? body.allowedModules.filter((m) => TEAM_MODULES.includes(m))
    : ['muro', 'eventos', 'notif']

  const doc = await TeamScope.create({
    tenantId: req.tenant._id,
    supervisorId: supervisor._id,
    nombre: nombre.slice(0, 160),
    source: normalizeTeamSource(body.source || {}),
    allowedModules: allowedModules.length ? allowedModules : ['muro', 'eventos', 'notif'],
    createdById: req.user._id,
    activo: true,
  })
  await refreshTeamScope(doc)
  res.status(201).json({ item: serializeTeamScope(doc) })
})

router.patch('/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const doc = await TeamScope.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!doc) return res.status(404).json({ error: 'No encontrado' })
  const body = req.body || {}
  if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 160)
  if (body.supervisorId && ObjectId.isValid(body.supervisorId)) doc.supervisorId = body.supervisorId
  if (body.source) doc.source = normalizeTeamSource(body.source)
  if (Array.isArray(body.allowedModules)) {
    doc.allowedModules = body.allowedModules.filter((m) => TEAM_MODULES.includes(m))
  }
  if (body.activo != null) doc.activo = Boolean(body.activo)
  await refreshTeamScope(doc)
  res.json({ item: serializeTeamScope(doc) })
})

router.post('/:id/refresh', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const doc = await TeamScope.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!doc) return res.status(404).json({ error: 'No encontrado' })
  await refreshTeamScope(doc)
  res.json({ item: serializeTeamScope(doc) })
})

router.delete('/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const doc = await TeamScope.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!doc) return res.status(404).json({ error: 'No encontrado' })
  doc.activo = false
  await doc.save()
  res.json({ ok: true })
})

export default router
