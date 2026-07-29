import { Router } from 'express'
import { HrCatalog } from '../models/HrCatalog.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import {
  HR_CATALOG_TYPES,
  serializeCatalogItem,
  applyCatalogPatch,
  seedHrCatalogsForTenant,
} from '../lib/hrCatalog.js'

const router = Router()
router.use(requireAuth, requireCapability('admin.legajos'))

router.get('/meta', (_req, res) => {
  res.json({ tipos: HR_CATALOG_TYPES })
})

router.get('/', async (req, res, next) => {
  try {
    const tipo = String(req.query.tipo || '').trim()
    const q = { tenantId: req.tenant._id }
    if (tipo && HR_CATALOG_TYPES.includes(tipo)) q.tipo = tipo
    if (req.query.activo === '1') q.activo = true
    if (req.query.activo === '0') q.activo = false
    const items = await HrCatalog.find(q).sort({ tipo: 1, orden: 1, label: 1 }).lean()
    res.json({ items: items.map(serializeCatalogItem) })
  } catch (e) {
    next(e)
  }
})

router.post('/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedHrCatalogsForTenant(HrCatalog, req.tenant._id)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const tipo = String(req.body?.tipo || '').trim()
    const codigo = String(req.body?.codigo || '').trim().slice(0, 64)
    const label = String(req.body?.label || '').trim().slice(0, 160)
    if (!HR_CATALOG_TYPES.includes(tipo)) return res.status(400).json({ error: 'tipo inválido' })
    if (!codigo || !label) return res.status(400).json({ error: 'codigo y label son obligatorios' })
    const doc = await HrCatalog.create({
      tenantId: req.tenant._id,
      tipo,
      codigo,
      label,
      parentCodigo: String(req.body?.parentCodigo || '').trim().slice(0, 64),
      orden: Number(req.body?.orden) || 0,
      activo: req.body?.activo !== false,
      meta: req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {},
    })
    res.status(201).json({ item: serializeCatalogItem(doc) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe ese código en el tipo' })
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await HrCatalog.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    applyCatalogPatch(doc, req.body)
    await doc.save()
    res.json({ item: serializeCatalogItem(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await HrCatalog.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.activo = false
    await doc.save()
    res.json({ ok: true, item: serializeCatalogItem(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
