import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { DirectoryEntry } from '../models/DirectoryEntry.js'
import { User } from '../models/User.js'
import {
  applyDirectoryPatch,
  serializeDirectoryEntry,
  DIRECTORY_TIPOS,
  TIPO_META,
  buildSearchFilter,
} from '../lib/directory.js'
import { normalizeAudience } from '../lib/audience.js'
import { directoryAiConfigured, researchDirectoryFromWeb } from '../services/directoryAi.js'
import { seedDirectoryForTenant } from '../lib/directorySeed.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth, requireCapability('admin.directorio'))

router.get('/meta', async (_req, res) => {
  res.json({
    tipos: DIRECTORY_TIPOS.map((t) => ({ id: t, label: TIPO_META[t].label, color: TIPO_META[t].color })),
  })
})

router.get('/ai-status', async (_req, res) => {
  res.json({ configured: directoryAiConfigured() })
})

/**
 * Busca en la web (+ LLM si hay) y opcionalmente crea las fichas en el directorio.
 * Body: { prompt, companyName?, websiteUrl?, autoCreate?: true }
 */
router.post('/ai-import', async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await researchDirectoryFromWeb({
      tenantId: req.tenant._id,
      prompt: body.prompt,
      companyName: body.companyName || req.tenant.nombre || '',
      websiteUrl: body.websiteUrl || '',
      autoCreate: body.autoCreate !== false,
    })
    res.json(result)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** Restaura las 4+ entradas base si faltan (no pisa las ya existentes por nombre). */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedDirectoryForTenant(req.tenant._id, {
      brandName: req.tenant.nombre || 'la empresa',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const q = String(req.query.q || '').trim()
    const tipo = String(req.query.tipo || '').trim()
    const activo = req.query.activo
    const filter = { tenantId }
    if (tipo && DIRECTORY_TIPOS.includes(tipo)) filter.tipo = tipo
    if (activo === 'true') filter.activo = true
    if (activo === 'false') filter.activo = false
    const search = buildSearchFilter(q)
    if (search) Object.assign(filter, search)

    const items = await DirectoryEntry.find(filter).sort({ orden: 1, nombre: 1 }).limit(400).lean()
    const cats = await DirectoryEntry.distinct('categoria', { tenantId })
    res.json({
      items: items.map((d) => serializeDirectoryEntry(d)),
      categories: cats.filter(Boolean).sort(),
      tipos: DIRECTORY_TIPOS.map((t) => ({ id: t, label: TIPO_META[t].label })),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await DirectoryEntry.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ item: serializeDirectoryEntry(doc) })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'nombre obligatorio' })

    if (body.userId && ObjectId.isValid(body.userId)) {
      const u = await User.findOne({ _id: body.userId, tenantId: req.tenant._id }).select('_id')
      if (!u) return res.status(400).json({ error: 'Usuario no encontrado' })
      body.userId = u._id
    } else {
      body.userId = null
    }

    const doc = new DirectoryEntry({
      tenantId: req.tenant._id,
      nombre,
      audience: normalizeAudience(body.audience),
    })
    applyDirectoryPatch(doc, body)
    await doc.save()
    res.status(201).json({ item: serializeDirectoryEntry(doc.toObject()) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await DirectoryEntry.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = { ...(req.body || {}) }
    if (body.userId !== undefined) {
      if (!body.userId) body.userId = null
      else if (ObjectId.isValid(body.userId)) {
        const u = await User.findOne({ _id: body.userId, tenantId: req.tenant._id }).select('_id')
        body.userId = u ? u._id : null
      } else body.userId = null
    }
    applyDirectoryPatch(doc, body)
    await doc.save()
    res.json({ item: serializeDirectoryEntry(doc.toObject()) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** Baja lógica */
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await DirectoryEntry.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.activo = false
    await doc.save()
    res.json({ item: serializeDirectoryEntry(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

export default router
