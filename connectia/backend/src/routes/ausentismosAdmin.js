import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import {
  serializeAbsence,
  canTransitionLicense,
  DEFAULT_ABSENCE_TYPES,
} from '../lib/licenciasConfig.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'
import { notifyAbsenceDecided } from '../services/notifyTramite.js'
import {
  ecrAusentismoStatus,
  persistEcrSync,
} from '../services/ecrAusentismoAdapter.js'

const router = Router()
const cap = 'admin.ausentismos'

function actorName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || 'Admin'
}

router.use(requireAuth, requireCapability(cap))

router.get('/tipos', (_req, res) => {
  res.json({ tipos: DEFAULT_ABSENCE_TYPES })
})

/** Estado de integración ECR (12.04). */
router.get('/ecr-status', (req, res) => {
  res.json(ecrAusentismoStatus(req.tenant))
})

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const q = { tenantId: req.tenant._id }
    if (req.query.estado) q.estado = String(req.query.estado)
    if (req.query.tipoKey) q.tipoKey = String(req.query.tipoKey)
    if (req.query.q) {
      const s = String(req.query.q).trim()
      q.$or = [
        { codigo: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { requesterName: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ]
    }
    const [items, total] = await Promise.all([
      AbsenceRequest.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AbsenceRequest.countDocuments(q),
    ])
    res.json({
      items: items.map((r) => serializeAbsence(r)),
      total,
      page,
      hasMore: page * limit < total,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/reporte.csv', async (req, res, next) => {
  try {
    const q = { tenantId: req.tenant._id }
    if (req.query.estado) q.estado = String(req.query.estado)
    const rows = await AbsenceRequest.find(q).sort({ createdAt: -1 }).limit(5000).lean()
    const header = 'codigo;tipo;solicitante;desde;hasta;dias;estado;motivo;ecr;creada\n'
    const body = rows
      .map((r) =>
        [
          r.codigo,
          r.tipoNombre || r.tipoKey,
          r.requesterName,
          r.desde?.toISOString?.().slice(0, 10) || '',
          r.hasta?.toISOString?.().slice(0, 10) || '',
          r.dias,
          r.estado,
          String(r.motivo || '').replace(/[;\n]/g, ' '),
          r.ecrSync?.status || 'none',
          r.createdAt?.toISOString?.() || '',
        ].join(';'),
      )
      .join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ausentismos.csv"')
    res.send(header + body)
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const r = await AbsenceRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrado' })
    res.json({ absence: serializeAbsence(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/decide', async (req, res, next) => {
  try {
    const decision = String(req.body?.decision || '').toLowerCase()
    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser aprobar o rechazar' })
    }
    const r = await AbsenceRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrado' })
    const nextEstado = decision === 'aprobar' ? 'aprobada' : 'rechazada'
    if (!canTransitionLicense(r.estado, nextEstado)) {
      return res.status(400).json({ error: `No se puede ${decision} desde ${r.estado}` })
    }
    const name = actorName(req.user)
    r.estado = nextEstado
    r.decisionById = req.user._id
    r.decisionByName = name
    r.decisionAt = new Date()
    r.decisionComentario = String(req.body?.comentario || '').slice(0, 1000)
    r.historial.push({
      estado: nextEstado,
      actorId: req.user._id,
      actorName: name,
      comentario: r.decisionComentario || decision,
      at: new Date(),
    })
    await r.save()
    try {
      await persistEcrSync(r, {
        tenant: req.tenant,
        user: req.user,
        event: 'decide',
      })
    } catch (syncErr) {
      console.warn('[ecr] absence decide', syncErr?.message || syncErr)
    }
    await recordActivity({
      tenantId: req.tenant._id,
      actor: req.user,
      action: `absence.${decision}`,
      entityType: 'AbsenceRequest',
      entityId: r._id,
      summary: `${r.codigo} → ${nextEstado}`,
      ...reqMeta(req),
    })
    notifyAbsenceDecided({ tenant: req.tenant, absence: r }).catch((err) =>
      console.warn('[notify] absence decide', err?.message || err),
    )
    res.json({ absence: serializeAbsence(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

/** Reintento manual de sync ECR (fallidos / pendientes). */
router.post('/:id/ecr-retry', async (req, res, next) => {
  try {
    const r = await AbsenceRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrado' })
    const event =
      r.estado === 'cancelada' ? 'cancel' : r.estado === 'pendiente' ? 'create' : 'decide'
    const result = await persistEcrSync(r, {
      tenant: req.tenant,
      user: req.user,
      event,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      actor: req.user,
      action: 'absence.ecr_retry',
      entityType: 'AbsenceRequest',
      entityId: r._id,
      summary: `${r.codigo} ecr→${result.status}`,
      ...reqMeta(req),
    })
    res.json({
      absence: serializeAbsence(r, { includeHistorial: true }),
      ecr: result,
    })
  } catch (e) {
    next(e)
  }
})

export default router
