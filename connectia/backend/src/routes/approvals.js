import { Router } from 'express'
import { requireAuth, isFullAdmin } from '../middleware/auth.js'
import { WorkflowInstance } from '../models/WorkflowInstance.js'
import {
  serializeInstance,
  decideInstance,
  listApprovalsForUser,
  enrichApprovalsWithOrigin,
} from '../services/workflowRuntime.js'

const router = Router()

/** Bandeja unificada U: mis pendientes / mis pedidos / todo lo que puedo ver */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const scope = ['mine', 'requested', 'all'].includes(req.query.scope) ? req.query.scope : 'mine'
    // "all" solo para admins del tenant
    if (scope === 'all' && !isFullAdmin(req.user) && !(req.user.capabilities || []).includes('admin.workflows')) {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
    const status = String(req.query.status || '').trim()
    const { items, hasMore } = await listApprovalsForUser({
      tenant: req.tenant,
      user: req.user,
      scope,
      status,
      page,
      limit,
    })
    res.json({ items, hasMore, page })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const inst = await WorkflowInstance.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!inst) return res.status(404).json({ error: 'No encontrado' })
    const ser = serializeInstance(inst, { user: req.user })
    const isOwner = String(inst.solicitanteId) === String(req.user._id)
    const isWfAdmin =
      isFullAdmin(req.user) || (req.user.capabilities || []).includes('admin.workflows')
    if (!ser.canDecide && !isOwner && !isWfAdmin) {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    await enrichApprovalsWithOrigin([ser], req.tenant._id)
    res.json({ approval: ser })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/decide', requireAuth, async (req, res, next) => {
  try {
    const decision = String(req.body?.decision || '').toLowerCase()
    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser aprobar o rechazar' })
    }
    const inst = await decideInstance({
      tenant: req.tenant,
      user: req.user,
      instanceId: req.params.id,
      decision,
      comentario: req.body?.comentario,
    })
    res.json({ approval: serializeInstance(inst, { user: req.user }) })
  } catch (e) {
    next(e)
  }
})

export default router
