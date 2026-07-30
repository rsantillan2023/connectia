/**
 * API U — Supervisión comercial (Ola 31).
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import {
  SupClienteSala,
  SupSala,
  SupCliente,
  SupTemplate,
  SupTarea,
  SupTareaComentario,
  SupAdjunto,
  SupRolePermisos,
  serializeTarea,
  serializeSala,
  serializeCliente,
  serializeTemplate,
  serializeComentario,
  serializeAdjunto,
} from '../models/Supervision.js'
import {
  TASK_STATUS,
  SUP_ROLE,
  defaultStatusOnCreate,
  statusAfterAssign,
  validateComplete,
  snapshotMediciones,
  isOperarioRole,
  validateBulkPayload,
  canApplyBulkAction,
  BULK_ACTIONS,
} from '../lib/supervisionTasks.js'
import { mergePermisos } from '../lib/supervisionPermisos.js'
import { buildSupervisionAiInsights } from '../lib/supervisionAi.js'
import { notifyTaskAssigned, notifyTaskCreatedManagers } from '../services/notifySupervision.js'
import { User } from '../models/User.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../../uploads/supervision')
fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 10) || '.jpg'
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
})

function requireSupCap(req, res) {
  if (!hasCapability(req.user, req.tenant, 'supervision.comercial', 'supervision.ecr')) {
    res.status(403).json({ error: 'Módulo supervisión no habilitado' })
    return false
  }
  return true
}

function userSupRole(user) {
  return String(user?.supervisionRole || '') || (isFullAdminLike(user) ? SUP_ROLE.ADMIN_MOD : '')
}

function isFullAdminLike(user) {
  const roles = user?.roles || []
  return roles.includes('admin') || roles.includes('platform')
}

async function salaIdsForUser(tenantId, userId, role) {
  if (role === SUP_ROLE.ADMIN_MOD || isFullAdminLike({ roles: role === SUP_ROLE.ADMIN_MOD ? ['admin'] : [] })) {
    // admin_mod sees all — handled by caller; return empty means "no filter" when combined with role check
  }
  if (role === SUP_ROLE.ADMIN_MOD) {
    const salas = await SupSala.find({ tenantId, activo: true }).select('_id').lean()
    return salas.map((s) => s._id)
  }
  const links = await SupClienteSala.find({
    tenantId,
    activo: true,
    'colaboradores.userId': userId,
  })
    .select('salaId')
    .lean()
  return [...new Set(links.map((l) => String(l.salaId)))].map((id) => new ObjectId(id))
}

async function managerIdsForSala(tenantId, salaId) {
  const links = await SupClienteSala.find({
    tenantId,
    salaId,
    activo: true,
  }).lean()
  const ids = []
  for (const link of links) {
    for (const c of link.colaboradores || []) {
      if (['supervisor', 'plataforma_comercial', 'gestor', 'admin_mod'].includes(c.role)) {
        ids.push(String(c.userId))
      }
    }
  }
  return [...new Set(ids)]
}

router.use(requireAuth)

router.get('/meta', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  const caps = req.tenant?.capabilities || []
  res.json({
    role: role || null,
    ecr: caps.includes('supervision.ecr'),
    comercial: caps.includes('supervision.comercial') || caps.includes('supervision.ecr'),
    relevamientos:
      caps.includes('relevamientos') ||
      caps.includes('campo.relevamientos') ||
      caps.includes('relevamientos.ejecutar'),
    statuses: Object.values(TASK_STATUS),
  })
})

router.get('/salas', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  const ids = await salaIdsForUser(req.tenant._id, req.user._id, role)
  const q = { tenantId: req.tenant._id, activo: true }
  if (ids.length && role !== SUP_ROLE.ADMIN_MOD && !isFullAdminLike(req.user)) {
    q._id = { $in: ids }
  }
  const rows = await SupSala.find(q).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeSala) })
})

router.get('/clientes', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const rows = await SupCliente.find({ tenantId: req.tenant._id, activo: true }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeCliente) })
})

router.get('/templates', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const rows = await SupTemplate.find({ tenantId: req.tenant._id, activo: true }).sort({ nombre: 1 }).lean()
  res.json({ items: rows.map(serializeTemplate) })
})

router.get('/operarios', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const salaId = req.query.salaId
  let userIds = []
  if (salaId && ObjectId.isValid(salaId)) {
    const links = await SupClienteSala.find({
      tenantId: req.tenant._id,
      salaId,
      activo: true,
    }).lean()
    for (const link of links) {
      for (const c of link.colaboradores || []) {
        if (c.role === SUP_ROLE.OPERARIO || !c.role) userIds.push(String(c.userId))
      }
    }
  }
  const q = {
    tenantId: req.tenant._id,
    activo: true,
    $or: [{ supervisionRole: SUP_ROLE.OPERARIO }, ...(userIds.length ? [{ _id: { $in: userIds } }] : [])],
  }
  const users = await User.find(q).select('nombre apellido usuario supervisionRole').limit(200).lean()
  res.json({
    items: users.map((u) => ({
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      role: u.supervisionRole || SUP_ROLE.OPERARIO,
    })),
  })
})

router.get('/tareas', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  const mine = req.query.mine === '1' || isOperarioRole(role)
  const q = { tenantId: req.tenant._id }
  if (req.query.status) q.status = String(req.query.status)
  if (req.query.prioridad && ['alta', 'media', 'baja'].includes(String(req.query.prioridad))) {
    q.prioridad = String(req.query.prioridad)
  }
  if (req.query.q) {
    const term = String(req.query.q).trim()
    if (term) q.titulo = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  }
  const filterSalaId =
    req.query.salaId && ObjectId.isValid(req.query.salaId) ? String(req.query.salaId) : null
  if (mine || isOperarioRole(role)) {
    q.asignadoId = req.user._id
    if (filterSalaId) q.salaId = filterSalaId
  } else if (!isFullAdminLike(req.user) && role !== SUP_ROLE.ADMIN_MOD) {
    const ids = await salaIdsForUser(req.tenant._id, req.user._id, role)
    const allowed = ids.map(String)
    if (filterSalaId) {
      q.salaId = allowed.includes(filterSalaId) ? filterSalaId : new ObjectId()
    } else {
      q.salaId = { $in: ids.length ? ids : [new ObjectId()] }
    }
  } else if (filterSalaId) {
    q.salaId = filterSalaId
  }
  const rows = await SupTarea.find(q).sort({ fechaLimite: 1, createdAt: -1 }).limit(200).lean()
  res.json({ items: rows.map((t) => serializeTarea(t)) })
})

router.get('/tareas/:id', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const t = await SupTarea.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
  if (!t) return res.status(404).json({ error: 'Tarea no encontrada' })
  const comments = await SupTareaComentario.find({ tenantId: req.tenant._id, tareaId: t._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
  res.json({
    item: serializeTarea(t),
    comentarios: comments.map(serializeComentario),
  })
})

router.post('/tareas', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  if (isOperarioRole(role) && !isFullAdminLike(req.user)) {
    return res.status(403).json({ error: 'El operario no crea tareas' })
  }
  const body = req.body || {}
  if (!body.titulo?.trim()) return res.status(400).json({ error: 'Título requerido' })
  if (!body.salaId || !ObjectId.isValid(body.salaId)) return res.status(400).json({ error: 'Sala requerida' })
  if (!body.fechaLimite) return res.status(400).json({ error: 'Fecha límite requerida' })

  const sala = await SupSala.findOne({ _id: body.salaId, tenantId: req.tenant._id, activo: true })
  if (!sala) return res.status(400).json({ error: 'Sala inválida' })

  let medicionesSnapshot = []
  let templateId = null
  if (body.templateId && ObjectId.isValid(body.templateId)) {
    const tpl = await SupTemplate.findOne({ _id: body.templateId, tenantId: req.tenant._id, activo: true })
    if (!tpl) return res.status(400).json({ error: 'Plantilla inválida' })
    templateId = tpl._id
    medicionesSnapshot = snapshotMediciones(tpl.mediciones)
  }

  const asignadoId =
    body.asignadoId && ObjectId.isValid(body.asignadoId) ? body.asignadoId : null
  const status = defaultStatusOnCreate({ usuarioAsignadoId: asignadoId })

  const tarea = await SupTarea.create({
    tenantId: req.tenant._id,
    titulo: String(body.titulo).trim().slice(0, 200),
    descripcion: String(body.descripcion || '').slice(0, 4000),
    nota: String(body.nota || '').slice(0, 2000),
    tipo: templateId ? 'template' : String(body.tipo || 'manual').slice(0, 40),
    fechaLimite: new Date(body.fechaLimite),
    prioridad: ['alta', 'media', 'baja'].includes(body.prioridad) ? body.prioridad : 'media',
    status,
    salaId: sala._id,
    clienteId: body.clienteId && ObjectId.isValid(body.clienteId) ? body.clienteId : null,
    creadorId: req.user._id,
    asignadoId,
    templateId,
    medicionesSnapshot,
    respuestas: medicionesSnapshot.map((m) => ({ key: m.key, completada: false, valor: '', observacion: '' })),
    requiereFoto: Boolean(body.requiereFoto),
    fechaAsignacion: asignadoId ? new Date() : null,
  })

  if (asignadoId) {
    await notifyTaskAssigned({ tenant: req.tenant, tarea, assigneeId: asignadoId })
  } else if (role === SUP_ROLE.GESTOR) {
    const managers = await managerIdsForSala(req.tenant._id, sala._id)
    await notifyTaskCreatedManagers({
      tenant: req.tenant,
      tarea,
      managerIds: managers,
      excludeUserId: req.user._id,
    })
  }

  res.status(201).json({ item: serializeTarea(tarea) })
})

/**
 * Acciones masivas: assign | cancel | prioritize | start | complete | set_deadline
 */
router.post('/tareas/bulk', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  if (isOperarioRole(role) && !isFullAdminLike(req.user)) {
    return res.status(403).json({ error: 'El operario no ejecuta acciones masivas' })
  }

  const check = validateBulkPayload(req.body || {})
  if (!check.ok) return res.status(400).json({ error: check.error })

  const { ids, action } = check
  const body = req.body || {}
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const tareas = await SupTarea.find({ _id: { $in: objectIds }, tenantId: req.tenant._id })

  const results = []
  let ok = 0
  let skipped = 0

  for (const t of tareas) {
    if (!canApplyBulkAction(action, t)) {
      skipped += 1
      results.push({ id: String(t._id), ok: false, error: 'estado_no_aplica' })
      continue
    }
    try {
      if (action === BULK_ACTIONS.ASSIGN) {
        const prevAssignee = t.asignadoId ? String(t.asignadoId) : null
        const next = body.asignadoId
        t.asignadoId = next
        t.status = statusAfterAssign({
          prevStatus: t.status,
          prevAssignee,
          nextAssignee: next,
        })
        if (next && !prevAssignee) t.fechaAsignacion = new Date()
        await t.save()
        if (next && String(next) !== prevAssignee) {
          await notifyTaskAssigned({ tenant: req.tenant, tarea: t, assigneeId: next })
        }
      } else if (action === BULK_ACTIONS.CANCEL) {
        t.status = TASK_STATUS.CANCELLED
        t.fechaCancelacion = new Date()
        t.canceladoPorId = req.user._id
        await t.save()
      } else if (action === BULK_ACTIONS.PRIORITIZE) {
        t.prioridad = body.prioridad
        await t.save()
      } else if (action === BULK_ACTIONS.START) {
        t.status = TASK_STATUS.IN_PROGRESS
        await t.save()
      } else if (action === BULK_ACTIONS.COMPLETE) {
        if (t.requiereFoto && !t.fotoUrl) {
          skipped += 1
          results.push({ id: String(t._id), ok: false, error: 'requiere_foto' })
          continue
        }
        t.observacionCierre = String(body.observacion || '').trim().slice(0, 2000)
        t.status = TASK_STATUS.COMPLETED
        t.fechaCompletado = new Date()
        t.completadoPorId = req.user._id
        await t.save()
      } else if (action === BULK_ACTIONS.SET_DEADLINE) {
        t.fechaLimite = new Date(body.fechaLimite)
        if (body.prioridad && ['alta', 'media', 'baja'].includes(body.prioridad)) {
          t.prioridad = body.prioridad
        }
        if (body.nota != null) t.nota = String(body.nota).slice(0, 2000)
        await t.save()
      }
      ok += 1
      results.push({ id: String(t._id), ok: true, status: t.status, prioridad: t.prioridad })
    } catch (e) {
      skipped += 1
      results.push({ id: String(t._id), ok: false, error: e.message || 'error' })
    }
  }

  const found = new Set(tareas.map((t) => String(t._id)))
  for (const id of ids) {
    if (!found.has(id)) {
      skipped += 1
      results.push({ id, ok: false, error: 'not_found' })
    }
  }

  res.json({ action, ok, skipped, total: ids.length, results })
})

router.patch('/tareas/:id', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const t = await SupTarea.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!t) return res.status(404).json({ error: 'Tarea no encontrada' })

  const body = req.body || {}
  const prevAssignee = t.asignadoId ? String(t.asignadoId) : null
  const prevStatus = t.status

  if (body.titulo != null) t.titulo = String(body.titulo).trim().slice(0, 200)
  if (body.descripcion != null) t.descripcion = String(body.descripcion).slice(0, 4000)
  if (body.nota != null) t.nota = String(body.nota).slice(0, 2000)
  if (body.prioridad && ['alta', 'media', 'baja'].includes(body.prioridad)) t.prioridad = body.prioridad
  if (body.fechaLimite) t.fechaLimite = new Date(body.fechaLimite)
  if (body.requiereFoto != null) t.requiereFoto = Boolean(body.requiereFoto)

  if (body.asignadoId !== undefined) {
    const next = body.asignadoId && ObjectId.isValid(body.asignadoId) ? body.asignadoId : null
    t.asignadoId = next
    t.status = statusAfterAssign({
      prevStatus: t.status,
      prevAssignee,
      nextAssignee: next,
    })
    if (next && !prevAssignee) t.fechaAsignacion = new Date()
    if (next && String(next) !== prevAssignee) {
      await notifyTaskAssigned({ tenant: req.tenant, tarea: t, assigneeId: next })
    }
  }

  if (body.action === 'iniciar') {
    t.status = TASK_STATUS.IN_PROGRESS
  }
  if (body.action === 'cancelar') {
    t.status = TASK_STATUS.CANCELLED
    t.fechaCancelacion = new Date()
    t.canceladoPorId = req.user._id
  }

  if (Array.isArray(body.respuestas)) {
    t.respuestas = body.respuestas.map((r) => ({
      key: String(r.key || ''),
      completada: Boolean(r.completada),
      valor: String(r.valor || '').slice(0, 500),
      observacion: String(r.observacion || '').slice(0, 1000),
    }))
  }

  await t.save()
  res.json({ item: serializeTarea(t), prevStatus })
})

router.post('/tareas/:id/completar', upload.single('foto'), async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const t = await SupTarea.findOne({ _id: req.params.id, tenantId: req.tenant._id })
  if (!t) return res.status(404).json({ error: 'Tarea no encontrada' })

  const observacion = String(req.body?.observacion || '').trim()
  const hasPhoto = Boolean(req.file) || Boolean(t.fotoUrl)
  const check = validateComplete({
    requiereFoto: t.requiereFoto,
    hasPhoto,
    observacion,
  })
  if (!check.ok) return res.status(400).json({ error: check.error })

  if (req.file) {
    t.fotoUrl = `/uploads/supervision/${req.file.filename}`
  }
  t.observacionCierre = observacion.slice(0, 2000)
  t.status = TASK_STATUS.COMPLETED
  t.fechaCompletado = new Date()
  t.completadoPorId = req.user._id
  await t.save()
  res.json({ item: serializeTarea(t) })
})

router.post('/tareas/:id/comentarios', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const texto = String(req.body?.texto || '').trim()
  if (!texto) return res.status(400).json({ error: 'Texto requerido' })
  const t = await SupTarea.findOne({ _id: req.params.id, tenantId: req.tenant._id }).select('_id')
  if (!t) return res.status(404).json({ error: 'Tarea no encontrada' })
  const c = await SupTareaComentario.create({
    tenantId: req.tenant._id,
    tareaId: t._id,
    userId: req.user._id,
    texto: texto.slice(0, 2000),
  })
  res.status(201).json({ item: serializeComentario(c) })
})

router.delete('/tareas/:id/comentarios/:comentarioId', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.comentarioId)) {
    return res.status(400).json({ error: 'IDs inválidos' })
  }
  const c = await SupTareaComentario.findOne({
    _id: req.params.comentarioId,
    tareaId: req.params.id,
    tenantId: req.tenant._id,
  })
  if (!c) return res.status(404).json({ error: 'No encontrado' })
  if (String(c.userId) !== String(req.user._id) && !isFullAdminLike(req.user)) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  await c.deleteOne()
  res.json({ ok: true })
})

/* —— Adjuntos —— */
router.get('/tareas/:id/adjuntos', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const q = { tenantId: req.tenant._id, tareaId: req.params.id }
  if (req.query.medicionKey) q.medicionKey = String(req.query.medicionKey)
  if (req.query.comentarioId && ObjectId.isValid(req.query.comentarioId)) {
    q.comentarioId = req.query.comentarioId
  }
  const rows = await SupAdjunto.find(q).sort({ createdAt: -1 }).lean()
  res.json({
    items: rows.map(serializeAdjunto),
    count: rows.length,
  })
})

router.post('/tareas/:id/adjuntos', upload.single('file'), async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const t = await SupTarea.findOne({ _id: req.params.id, tenantId: req.tenant._id }).select('_id')
  if (!t) return res.status(404).json({ error: 'Tarea no encontrada' })
  if (!req.file && !req.body?.url) return res.status(400).json({ error: 'Archivo o url requerido' })
  const url = req.file ? `/uploads/supervision/${req.file.filename}` : String(req.body.url).slice(0, 500)
  const d = await SupAdjunto.create({
    tenantId: req.tenant._id,
    tareaId: t._id,
    comentarioId:
      req.body?.comentarioId && ObjectId.isValid(req.body.comentarioId) ? req.body.comentarioId : null,
    medicionKey: String(req.body?.medicionKey || '').slice(0, 80),
    url,
    nombre: String(req.body?.nombre || req.file?.originalname || '').slice(0, 200),
    mime: String(req.file?.mimetype || req.body?.mime || '').slice(0, 120),
    size: Number(req.file?.size || req.body?.size || 0),
    uploadedById: req.user._id,
  })
  res.status(201).json({ item: serializeAdjunto(d) })
})

router.delete('/tareas/:id/adjuntos/:adjuntoId', async (req, res) => {
  if (!requireSupCap(req, res)) return
  if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.adjuntoId)) {
    return res.status(400).json({ error: 'IDs inválidos' })
  }
  const d = await SupAdjunto.findOneAndDelete({
    _id: req.params.adjuntoId,
    tareaId: req.params.id,
    tenantId: req.tenant._id,
  })
  if (!d) return res.status(404).json({ error: 'No encontrado' })
  res.json({ ok: true })
})

router.get('/adjuntos/counts', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const tareaId = req.query.tareaId
  if (!tareaId || !ObjectId.isValid(tareaId)) return res.status(400).json({ error: 'tareaId requerido' })
  const total = await SupAdjunto.countDocuments({ tenantId: req.tenant._id, tareaId })
  const byMedicion = await SupAdjunto.aggregate([
    { $match: { tenantId: req.tenant._id, tareaId: new ObjectId(tareaId), medicionKey: { $ne: '' } } },
    { $group: { _id: '$medicionKey', count: { $sum: 1 } } },
  ])
  res.json({
    tareaId,
    total,
    byMedicion: Object.fromEntries(byMedicion.map((x) => [x._id, x.count])),
  })
})

/* —— KPIs / dashboard —— */
router.get('/stats', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  const q = { tenantId: req.tenant._id }
  if (isOperarioRole(role)) q.asignadoId = req.user._id
  else if (!isFullAdminLike(req.user) && role !== SUP_ROLE.ADMIN_MOD) {
    const ids = await salaIdsForUser(req.tenant._id, req.user._id, role)
    q.salaId = { $in: ids.length ? ids : [new ObjectId()] }
  }
  const rows = await SupTarea.find(q).select('status prioridad fechaLimite').lean()
  const byStatus = {}
  for (const s of Object.values(TASK_STATUS)) byStatus[s] = 0
  let overdue = 0
  let high = 0
  const now = new Date()
  for (const t of rows) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1
    if (!['completada', 'cancelada'].includes(t.status) && t.fechaLimite && new Date(t.fechaLimite) < now) {
      overdue += 1
    }
    if (t.prioridad === 'alta' && !['completada', 'cancelada'].includes(t.status)) high += 1
  }
  res.json({ total: rows.length, byStatus, overdue, high })
})

/* —— IA insights —— */
router.get('/ai/insights', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user)
  const q = { tenantId: req.tenant._id }
  if (isOperarioRole(role)) q.asignadoId = req.user._id
  else if (!isFullAdminLike(req.user) && role !== SUP_ROLE.ADMIN_MOD) {
    const ids = await salaIdsForUser(req.tenant._id, req.user._id, role)
    q.salaId = { $in: ids.length ? ids : [new ObjectId()] }
  }
  const rows = await SupTarea.find(q).limit(500).lean()
  const serialized = rows.map((t) => serializeTarea(t))
  res.json(buildSupervisionAiInsights(serialized))
})

/* —— Permisos del rol actual —— */
router.get('/mis-permisos', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const role = userSupRole(req.user) || SUP_ROLE.OPERARIO
  const stored = await SupRolePermisos.findOne({ tenantId: req.tenant._id, role }).lean()
  res.json({ role, permisos: mergePermisos(role, stored?.permisos) })
})

/* —— Preferencias i18n módulo —— */
router.get('/config', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const locale = req.user?.preferences?.supervisionLocale || req.user?.preferences?.locale || 'es'
  res.json({
    locale: ['es', 'en'].includes(locale) ? locale : 'es',
    locales: ['es', 'en'],
    pwaHint: true,
  })
})

router.patch('/config', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const locale = String(req.body?.locale || 'es')
  if (!['es', 'en'].includes(locale)) return res.status(400).json({ error: 'locale inválido' })
  const prefs = { ...(req.user.preferences || {}), supervisionLocale: locale }
  await User.updateOne({ _id: req.user._id }, { $set: { preferences: prefs } })
  res.json({ locale })
})

/* —— Sync offline: aplicar mutaciones encoladas —— */
router.post('/sync', async (req, res) => {
  if (!requireSupCap(req, res)) return
  const ops = Array.isArray(req.body?.ops) ? req.body.ops : []
  const results = []
  for (const op of ops.slice(0, 40)) {
    const idem = String(op.idempotencyKey || '')
    try {
      if (op.type === 'comment' && ObjectId.isValid(op.tareaId)) {
        const c = await SupTareaComentario.create({
          tenantId: req.tenant._id,
          tareaId: op.tareaId,
          userId: req.user._id,
          texto: String(op.texto || '').slice(0, 2000),
        })
        results.push({ idempotencyKey: idem, ok: true, id: String(c._id) })
      } else if (op.type === 'respuestas' && ObjectId.isValid(op.tareaId)) {
        const t = await SupTarea.findOne({ _id: op.tareaId, tenantId: req.tenant._id })
        if (!t) {
          results.push({ idempotencyKey: idem, ok: false, error: 'not_found' })
          continue
        }
        if (Array.isArray(op.respuestas)) {
          t.respuestas = op.respuestas.map((r) => ({
            key: String(r.key || ''),
            completada: Boolean(r.completada),
            valor: String(r.valor || '').slice(0, 500),
            observacion: String(r.observacion || '').slice(0, 1000),
          }))
          await t.save()
        }
        results.push({ idempotencyKey: idem, ok: true })
      } else if (op.type === 'iniciar' && ObjectId.isValid(op.tareaId)) {
        await SupTarea.updateOne(
          { _id: op.tareaId, tenantId: req.tenant._id },
          { $set: { status: TASK_STATUS.IN_PROGRESS } },
        )
        results.push({ idempotencyKey: idem, ok: true })
      } else {
        results.push({ idempotencyKey: idem, ok: false, error: 'unsupported' })
      }
    } catch (e) {
      results.push({ idempotencyKey: idem, ok: false, error: e.message || 'error' })
    }
  }
  res.json({ results })
})

export default router
