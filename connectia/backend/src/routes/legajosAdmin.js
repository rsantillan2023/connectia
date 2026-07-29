import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import {
  applyLegajoPatch,
  serializeLegajo,
  seedFromUser,
} from '../lib/employeeLegajo.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'
import {
  draftLegajoFromInput,
  extractPdfText,
  legajoAiConfigured,
} from '../services/legajoAi.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      file.mimetype === 'application/pdf' ||
      String(file.originalname || '')
        .toLowerCase()
        .endsWith('.pdf')
    cb(ok ? null : new Error('Solo PDF'), ok)
  },
})

router.use(requireAuth, requireCapability('admin.legajos'))

async function loadUserSeed(tenantId, userId) {
  if (!userId || !ObjectId.isValid(userId)) return null
  const u = await User.findOne({ _id: userId, tenantId }).lean()
  if (!u) return null
  return {
    id: String(u._id),
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    telefono: u.telefono || '',
    dni: u.dni || '',
    cuil: u.cuil || '',
    cargo: u.cargo || '',
    idExterno: u.idExterno || '',
    areaId: u.areaId ? String(u.areaId) : null,
    fechaNacimiento: u.fechaNacimiento || null,
    fechaIngreso: u.fechaIngreso || null,
  }
}

async function loadAreas(tenantId) {
  const areas = await OrgArea.find({ tenantId, activo: true }).select('_id key nombre').lean()
  return areas.map((a) => ({ id: a._id, key: a.key, nombre: a.nombre }))
}

async function resolveRefs(tenantId, body) {
  const out = { ...body }
  if (body.userId !== undefined) {
    if (!body.userId) out.userId = null
    else if (!ObjectId.isValid(body.userId)) {
      throw Object.assign(new Error('userId inválido'), { status: 400 })
    } else {
      const u = await User.findOne({ _id: body.userId, tenantId }).select('_id')
      if (!u) throw Object.assign(new Error('Usuario no encontrado en este tenant'), { status: 400 })
      out.userId = u._id
    }
  }
  if (body.areaId !== undefined) {
    if (!body.areaId) out.areaId = null
    else if (!ObjectId.isValid(body.areaId)) out.areaId = null
    else {
      const a = await OrgArea.findOne({ _id: body.areaId, tenantId, activo: true }).select('_id')
      out.areaId = a ? a._id : null
    }
  }
  if (body.liderUserId !== undefined) {
    if (!body.liderUserId) out.liderUserId = null
    else if (!ObjectId.isValid(body.liderUserId)) out.liderUserId = null
    else {
      const u = await User.findOne({ _id: body.liderUserId, tenantId }).select('_id')
      out.liderUserId = u ? u._id : null
    }
  }
  return out
}

/** GET /api/admin/legajos */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const q = String(req.query.q || '').trim()
    const estado = String(req.query.estado || '').trim()
    const conUsuario = String(req.query.conUsuario || '').trim()
    const filtro = { tenantId }
    if (req.query.activo === 'false') filtro.activo = false
    else if (req.query.activo === 'true') filtro.activo = true
    if (estado) filtro.estadoLaboral = estado
    if (conUsuario === '1') filtro.userId = { $ne: null }
    if (conUsuario === '0') filtro.userId = null
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filtro.$or = [
        { numeroLegajo: rx },
        { nombre: rx },
        { apellido: rx },
        { dni: rx },
        { cuil: rx },
        { email: rx },
        { cargo: rx },
      ]
    }
    const items = await EmployeeLegajo.find(filtro).sort({ updatedAt: -1 }).limit(200).lean()
    res.json({
      items: items.map((d) => serializeLegajo(d, { maskSensitive: false, includeNotas: true })),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/legajos/ai-status */
router.get('/ai-status', async (_req, res) => {
  res.json({ configured: legajoAiConfigured() })
})

/** POST /api/admin/legajos/ai-draft — prompt y/o userId (JSON) */
router.post('/ai-draft', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const prompt = String(req.body?.prompt || '').trim()
    const userId = req.body?.userId || null
    const userSeed = await loadUserSeed(tenantId, userId)
    if (userId && !userSeed) {
      return res.status(400).json({ error: 'Usuario no encontrado en este tenant' })
    }
    const areas = await loadAreas(tenantId)
    const draft = await draftLegajoFromInput({ prompt, userSeed, areas })
    res.json({ draft, configured: Boolean(draft.configured) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** POST /api/admin/legajos/ai-draft-upload — PDF + prompt/userId (multipart) */
router.post('/ai-draft-upload', (req, res, next) => {
  uploadPdf.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir PDF' })
    }
    try {
      const tenantId = req.tenant._id
      const prompt = String(req.body?.prompt || '').trim()
      const userId = req.body?.userId || null
      const userSeed = await loadUserSeed(tenantId, userId)
      if (userId && !userSeed) {
        return res.status(400).json({ error: 'Usuario no encontrado en este tenant' })
      }
      let pdfText = ''
      if (req.file?.buffer) {
        pdfText = await extractPdfText(req.file.buffer)
        if (!pdfText) {
          return res.status(400).json({
            error:
              'No se pudo leer texto del PDF (¿escaneado?). Probá un PDF con texto seleccionable o pegá los datos en el prompt.',
          })
        }
      } else if (!userSeed && prompt.length < 8) {
        return res.status(400).json({ error: 'Subí un PDF, elegí un miembro o escribí un prompt' })
      }
      const areas = await loadAreas(tenantId)
      const draft = await draftLegajoFromInput({ prompt, pdfText, userSeed, areas })
      res.json({
        draft,
        configured: Boolean(draft.configured),
        pdfChars: pdfText.length,
      })
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message })
      next(e)
    }
  })
})

/** GET /api/admin/legajos/:id */
router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await EmployeeLegajo.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ item: serializeLegajo(doc, { maskSensitive: false, includeNotas: true }) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/legajos — alta de empleado (con o sin cuenta de miembro) */
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const body = await resolveRefs(tenantId, req.body || {})
    let seed = {}
    if (body.userId) {
      const existing = await EmployeeLegajo.findOne({ tenantId, userId: body.userId }).select('_id')
      if (existing) {
        return res.status(409).json({ error: 'Ese miembro ya tiene un legajo' })
      }
      const u = await User.findOne({ _id: body.userId, tenantId })
      seed = seedFromUser(u)
    }
    const numeroLegajo = String(body.numeroLegajo || seed.numeroLegajo || '').trim()
    if (!numeroLegajo) {
      return res.status(400).json({ error: 'numeroLegajo obligatorio' })
    }
    const dup = await EmployeeLegajo.findOne({ tenantId, numeroLegajo }).select('_id')
    if (dup) return res.status(409).json({ error: 'Ya existe un legajo con ese número' })

    const doc = new EmployeeLegajo({
      tenantId,
      numeroLegajo,
      userId: body.userId || null,
      ...seed,
    })
    applyLegajoPatch(doc, { ...seed, ...body, numeroLegajo })
    await doc.save()

    const meta = reqMeta(req)
    await recordActivity({
      tenantId,
      userId: req.user._id,
      action: 'admin.legajo_create',
      meta: { legajoId: String(doc._id), numeroLegajo: doc.numeroLegajo },
      ...meta,
    })

    res.status(201).json({
      item: serializeLegajo(doc.toObject(), { maskSensitive: false, includeNotas: true }),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e.code === 11000) return res.status(409).json({ error: 'Legajo o vínculo de usuario duplicado' })
    next(e)
  }
})

/** PATCH /api/admin/legajos/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const tenantId = req.tenant._id
    const doc = await EmployeeLegajo.findOne({ _id: req.params.id, tenantId })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })

    const body = await resolveRefs(tenantId, req.body || {})
    if (body.userId && String(body.userId) !== String(doc.userId || '')) {
      const other = await EmployeeLegajo.findOne({
        tenantId,
        userId: body.userId,
        _id: { $ne: doc._id },
      }).select('_id')
      if (other) return res.status(409).json({ error: 'Ese miembro ya tiene otro legajo' })
    }
    if (body.numeroLegajo && body.numeroLegajo !== doc.numeroLegajo) {
      const dup = await EmployeeLegajo.findOne({
        tenantId,
        numeroLegajo: String(body.numeroLegajo).trim(),
        _id: { $ne: doc._id },
      }).select('_id')
      if (dup) return res.status(409).json({ error: 'Ya existe un legajo con ese número' })
    }

    applyLegajoPatch(doc, body)
    await doc.save()

    const meta = reqMeta(req)
    await recordActivity({
      tenantId,
      userId: req.user._id,
      action: 'admin.legajo_update',
      meta: { legajoId: String(doc._id) },
      ...meta,
    })

    res.json({
      item: serializeLegajo(doc.toObject(), { maskSensitive: false, includeNotas: true }),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e.code === 11000) return res.status(409).json({ error: 'Legajo o vínculo de usuario duplicado' })
    next(e)
  }
})

/** DELETE /api/admin/legajos/:id — baja lógica */
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await EmployeeLegajo.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.activo = false
    doc.estadoLaboral = 'baja'
    if (!doc.fechaEgreso) doc.fechaEgreso = new Date()
    await doc.save()

    const meta = reqMeta(req)
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.legajo_deactivate',
      meta: { legajoId: String(doc._id) },
      ...meta,
    })

    res.json({
      item: serializeLegajo(doc.toObject(), { maskSensitive: false, includeNotas: true }),
    })
  } catch (e) {
    next(e)
  }
})

export default router
