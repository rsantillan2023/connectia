import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { FieldForm } from '../models/FieldForm.js'
import { FieldRoute } from '../models/FieldRoute.js'
import { FieldAssignment, FIELD_MODALITIES } from '../models/FieldAssignment.js'
import { FieldSubmission } from '../models/FieldSubmission.js'
import { User } from '../models/User.js'
import { FIELD_QUESTION_TYPE_META, normalizeQuestions } from '../lib/fieldFormQuestions.js'
import { activateOla37ForTenant } from '../lib/ensureOla37Menu.js'
import { notifyRelevamiento } from '../services/notifyRelevamientos.js'

const router = Router()

function tenantHasRel(req) {
  return hasCapability(req.user, req.tenant, 'relevamientos', 'campo.relevamientos')
}

function requireProductCap(req, res, next) {
  if (!tenantHasRel(req) && !hasCapability(req.user, req.tenant, 'admin.relevamientos')) {
    return res.status(403).json({ error: 'Módulo Relevamientos no activo en esta comunidad' })
  }
  next()
}

function serializeForm(doc) {
  return {
    id: String(doc._id),
    titulo: doc.titulo,
    descripcion: doc.descripcion || '',
    status: doc.status,
    version: doc.version || 1,
    questions: doc.questions || [],
    authorName: doc.authorName || '',
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function serializeRoute(doc) {
  return {
    id: String(doc._id),
    nombre: doc.nombre,
    descripcion: doc.descripcion || '',
    activo: doc.activo !== false,
    stops: (doc.stops || []).map((s) => ({
      id: s.id,
      label: s.label,
      address: s.address || '',
      lat: s.lat,
      lng: s.lng,
      radiusM: s.radiusM,
      notes: s.notes || '',
      order: s.order ?? 0,
      defaultFormId: s.defaultFormId ? String(s.defaultFormId) : null,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function serializeAssignment(doc, extras = {}) {
  return {
    id: String(doc._id),
    day: doc.day,
    operatorId: String(doc.operatorId),
    formId: String(doc.formId),
    formVersion: doc.formVersion,
    routeId: doc.routeId ? String(doc.routeId) : null,
    stopId: doc.stopId || '',
    stopLabel: doc.stopLabel || '',
    modality: doc.modality,
    status: doc.status,
    order: doc.order ?? 0,
    windowStart: doc.windowStart || '',
    windowEnd: doc.windowEnd || '',
    notes: doc.notes || '',
    submittedAt: doc.submittedAt,
    createdAt: doc.createdAt,
    ...extras,
  }
}

router.use(requireAuth, requireCapability('admin.relevamientos'), requireProductCap)

router.get('/meta', (_req, res) => {
  res.json({
    questionTypes: FIELD_QUESTION_TYPE_META,
    modalities: FIELD_MODALITIES,
  })
})

router.post('/ensure-menu', async (req, res, next) => {
  try {
    await activateOla37ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

router.post('/activate', async (req, res, next) => {
  try {
    await activateOla37ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

/* —— Forms —— */
router.get('/forms', async (req, res, next) => {
  try {
    const list = await FieldForm.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).limit(200)
    res.json({ items: list.map(serializeForm) })
  } catch (e) {
    next(e)
  }
})

router.post('/forms', async (req, res, next) => {
  try {
    const body = req.body || {}
    const doc = await FieldForm.create({
      tenantId: req.tenant._id,
      titulo: String(body.titulo || 'Relevamiento').trim().slice(0, 200),
      descripcion: String(body.descripcion || '').slice(0, 2000),
      status: 'draft',
      questions: normalizeQuestions(body.questions),
      version: 1,
      authorId: req.user._id,
      authorName: req.user.nombre || req.user.usuario || '',
    })
    res.status(201).json(serializeForm(doc))
  } catch (e) {
    next(e)
  }
})

router.get('/forms/:id', async (req, res, next) => {
  try {
    const doc = await FieldForm.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Formulario no encontrado' })
    res.json(serializeForm(doc))
  } catch (e) {
    next(e)
  }
})

router.patch('/forms/:id', async (req, res, next) => {
  try {
    const doc = await FieldForm.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Formulario no encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).slice(0, 2000)
    if (body.questions != null) {
      doc.questions = normalizeQuestions(body.questions)
      if (doc.status === 'published') doc.version = (doc.version || 1) + 1
    }
    if (body.status === 'published' && doc.status !== 'published') {
      if (!doc.questions?.length) return res.status(400).json({ error: 'Publicar requiere al menos 1 pregunta' })
      doc.status = 'published'
      doc.publishedAt = new Date()
    } else if (body.status === 'archived') {
      doc.status = 'archived'
    } else if (body.status === 'draft' && doc.status === 'archived') {
      doc.status = 'draft'
    }
    await doc.save()
    res.json(serializeForm(doc))
  } catch (e) {
    next(e)
  }
})

/* —— Routes —— */
router.get('/routes', async (req, res, next) => {
  try {
    const list = await FieldRoute.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).limit(200)
    res.json({ items: list.map(serializeRoute) })
  } catch (e) {
    next(e)
  }
})

router.post('/routes', async (req, res, next) => {
  try {
    const body = req.body || {}
    const stops = Array.isArray(body.stops)
      ? body.stops.map((s, i) => ({
          id: String(s.id || `s${i + 1}`).slice(0, 64),
          label: String(s.label || `Parada ${i + 1}`).trim().slice(0, 200),
          address: String(s.address || '').slice(0, 300),
          lat: Number.isFinite(Number(s.lat)) ? Number(s.lat) : null,
          lng: Number.isFinite(Number(s.lng)) ? Number(s.lng) : null,
          radiusM: Number.isFinite(Number(s.radiusM)) ? Number(s.radiusM) : null,
          notes: String(s.notes || '').slice(0, 500),
          order: Number.isFinite(Number(s.order)) ? Number(s.order) : i,
          defaultFormId: s.defaultFormId || null,
        }))
      : []
    const doc = await FieldRoute.create({
      tenantId: req.tenant._id,
      nombre: String(body.nombre || 'Ruta').trim().slice(0, 200),
      descripcion: String(body.descripcion || '').slice(0, 2000),
      activo: body.activo !== false,
      stops,
      authorId: req.user._id,
    })
    res.status(201).json(serializeRoute(doc))
  } catch (e) {
    next(e)
  }
})

router.patch('/routes/:id', async (req, res, next) => {
  try {
    const doc = await FieldRoute.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Ruta no encontrada' })
    const body = req.body || {}
    if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).slice(0, 2000)
    if (body.activo != null) doc.activo = Boolean(body.activo)
    if (Array.isArray(body.stops)) {
      doc.stops = body.stops.map((s, i) => ({
        id: String(s.id || `s${i + 1}`).slice(0, 64),
        label: String(s.label || `Parada ${i + 1}`).trim().slice(0, 200),
        address: String(s.address || '').slice(0, 300),
        lat: Number.isFinite(Number(s.lat)) ? Number(s.lat) : null,
        lng: Number.isFinite(Number(s.lng)) ? Number(s.lng) : null,
        radiusM: Number.isFinite(Number(s.radiusM)) ? Number(s.radiusM) : null,
        notes: String(s.notes || '').slice(0, 500),
        order: Number.isFinite(Number(s.order)) ? Number(s.order) : i,
        defaultFormId: s.defaultFormId || null,
      }))
    }
    await doc.save()
    res.json(serializeRoute(doc))
  } catch (e) {
    next(e)
  }
})

/* —— Assignments / agenda —— */
router.get('/assignments', async (req, res, next) => {
  try {
    const day = String(req.query.day || '').slice(0, 10)
    const filter = { tenantId: req.tenant._id }
    if (day) filter.day = day
    if (req.query.operatorId) filter.operatorId = req.query.operatorId
    if (req.query.status) filter.status = String(req.query.status)
    const list = await FieldAssignment.find(filter).sort({ day: -1, order: 1 }).limit(500)
    const opIds = [...new Set(list.map((a) => String(a.operatorId)))]
    const users = await User.find({ _id: { $in: opIds }, tenantId: req.tenant._id }).select(
      'nombre usuario email',
    )
    const byOp = Object.fromEntries(
      users.map((u) => [
        String(u._id),
        { id: String(u._id), nombre: u.nombre || u.usuario || '', email: u.email || '' },
      ]),
    )
    res.json({
      items: list.map((a) =>
        serializeAssignment(a, { operator: byOp[String(a.operatorId)] || null }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/assignments', async (req, res, next) => {
  try {
    const body = req.body || {}
    const day = String(body.day || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return res.status(400).json({ error: 'day debe ser YYYY-MM-DD' })
    }
    const form = await FieldForm.findOne({
      _id: body.formId,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!form) return res.status(400).json({ error: 'Formulario publicado requerido' })
    const operator = await User.findOne({ _id: body.operatorId, tenantId: req.tenant._id, activo: true })
    if (!operator) return res.status(400).json({ error: 'Operador inválido' })

    let stopLabel = String(body.stopLabel || '')
    let routeId = body.routeId || null
    let stopId = String(body.stopId || '')
    if (routeId) {
      const route = await FieldRoute.findOne({ _id: routeId, tenantId: req.tenant._id })
      if (!route) return res.status(400).json({ error: 'Ruta inválida' })
      const stop = (route.stops || []).find((s) => s.id === stopId)
      if (stop) stopLabel = stop.label
    }

    const modality = FIELD_MODALITIES.includes(body.modality) ? body.modality : 'scheduled'
    const doc = await FieldAssignment.create({
      tenantId: req.tenant._id,
      day,
      operatorId: operator._id,
      formId: form._id,
      formVersion: form.version || 1,
      formSnapshot: {
        titulo: form.titulo,
        questions: form.questions,
        version: form.version || 1,
      },
      routeId,
      stopId,
      stopLabel,
      modality: stopId ? 'on_route' : modality === 'scheduled' ? 'scheduled' : modality,
      status: 'pending',
      order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
      windowStart: String(body.windowStart || '').slice(0, 8),
      windowEnd: String(body.windowEnd || '').slice(0, 8),
      notes: String(body.notes || '').slice(0, 500),
      createdBy: req.user._id,
    })

    await notifyRelevamiento({
      tenant: req.tenant,
      userId: operator._id,
      title: 'Relevamiento asignado',
      body: `${form.titulo} · ${day}${stopLabel ? ` · ${stopLabel}` : ''}`,
      assignmentId: doc._id,
      day,
    })

    res.status(201).json(serializeAssignment(doc))
  } catch (e) {
    next(e)
  }
})

router.patch('/assignments/:id', async (req, res, next) => {
  try {
    const doc = await FieldAssignment.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Asignación no encontrada' })
    const body = req.body || {}
    const wasSubmitted = ['submitted', 'synced'].includes(doc.status)

    if (body.day != null && !wasSubmitted) {
      const day = String(body.day).slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day inválido' })
      doc.day = day
    }
    if (body.operatorId != null && !wasSubmitted) {
      const operator = await User.findOne({
        _id: body.operatorId,
        tenantId: req.tenant._id,
        activo: true,
      })
      if (!operator) return res.status(400).json({ error: 'Operador inválido' })
      doc.operatorId = operator._id
    }
    if (body.order != null) doc.order = Number(body.order) || 0
    if (body.status === 'skipped' && doc.status === 'pending') doc.status = 'skipped'
    if (body.notes != null) doc.notes = String(body.notes).slice(0, 500)
    await doc.save()
    res.json(serializeAssignment(doc))
  } catch (e) {
    next(e)
  }
})

/* —— Ops board —— */
router.get('/stats', async (req, res, next) => {
  try {
    const day = String(req.query.day || '').slice(0, 10)
    const filter = { tenantId: req.tenant._id }
    if (day) filter.day = day
    const list = await FieldAssignment.find(filter).select('status day operatorId')
    const assigned = list.length
    const completed = list.filter((a) => ['submitted', 'synced'].includes(a.status)).length
    const pending = list.filter((a) => a.status === 'pending' || a.status === 'in_progress').length
    const skipped = list.filter((a) => a.status === 'skipped').length
    const pct = assigned ? Math.round((completed / assigned) * 1000) / 10 : 0
    res.json({ day: day || null, assigned, completed, pending, skipped, pct })
  } catch (e) {
    next(e)
  }
})

router.post('/remind', async (req, res, next) => {
  try {
    const day = String(req.body?.day || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day requerido' })
    const pending = await FieldAssignment.find({
      tenantId: req.tenant._id,
      day,
      status: { $in: ['pending', 'in_progress'] },
    })
    let sent = 0
    for (const a of pending) {
      await notifyRelevamiento({
        tenant: req.tenant,
        userId: a.operatorId,
        title: 'Recordatorio de relevamiento',
        body: `Tenés pendientes el ${day}`,
        assignmentId: a._id,
        day,
      })
      sent += 1
    }
    res.json({ ok: true, sent, pending: pending.length })
  } catch (e) {
    next(e)
  }
})

router.get('/export', async (req, res, next) => {
  try {
    const day = String(req.query.day || '').slice(0, 10)
    const filter = { tenantId: req.tenant._id }
    if (day) filter.day = day
    const assignments = await FieldAssignment.find(filter).sort({ day: 1, order: 1 }).limit(2000)
    const subs = await FieldSubmission.find({
      tenantId: req.tenant._id,
      assignmentId: { $in: assignments.map((a) => a._id) },
    })
    const subByAsg = Object.fromEntries(subs.map((s) => [String(s.assignmentId), s]))
    const rows = assignments.map((a) => {
      const s = subByAsg[String(a._id)]
      return {
        day: a.day,
        assignmentId: String(a._id),
        operatorId: String(a.operatorId),
        formId: String(a.formId),
        formVersion: a.formVersion,
        stopLabel: a.stopLabel || '',
        modality: a.modality,
        status: a.status,
        submittedAt: s?.submittedAt || a.submittedAt || '',
        answersJson: s ? JSON.stringify(s.answers || {}) : '',
      }
    })
    if (String(req.query.format || '') === 'csv') {
      const header = Object.keys(rows[0] || { day: '', status: '' })
      const lines = [
        header.join(','),
        ...rows.map((r) =>
          header
            .map((h) => {
              const v = String(r[h] ?? '').replace(/"/g, '""')
              return `"${v}"`
            })
            .join(','),
        ),
      ]
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="relevamientos-${day || 'all'}.csv"`)
      return res.send(lines.join('\n'))
    }
    res.json({ items: rows })
  } catch (e) {
    next(e)
  }
})

router.get('/operators', async (req, res, next) => {
  try {
    const users = await User.find({ tenantId: req.tenant._id, activo: true })
      .select('nombre usuario email')
      .sort({ nombre: 1 })
      .limit(500)
    res.json({
      items: users.map((u) => ({
        id: String(u._id),
        nombre: u.nombre || u.usuario || '',
        email: u.email || '',
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
