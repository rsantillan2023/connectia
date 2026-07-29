import { Router } from 'express'
import { HrCatalog } from '../models/HrCatalog.js'
import { requireAuth } from '../middleware/auth.js'
import { HR_CATALOG_TYPES, serializeCatalogItem } from '../lib/hrCatalog.js'

const router = Router()

/** Catálogos activos del tenant (lectura U/A para selects). */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tipo = String(req.query.tipo || '').trim()
    const q = { tenantId: req.tenant._id, activo: true }
    if (tipo && HR_CATALOG_TYPES.includes(tipo)) q.tipo = tipo
    const items = await HrCatalog.find(q).sort({ tipo: 1, orden: 1, label: 1 }).lean()
    const byTipo = {}
    for (const it of items) {
      if (!byTipo[it.tipo]) byTipo[it.tipo] = []
      byTipo[it.tipo].push(serializeCatalogItem(it))
    }
    res.json({
      tipos: HR_CATALOG_TYPES,
      items: items.map(serializeCatalogItem),
      byTipo,
    })
  } catch (e) {
    next(e)
  }
})

export default router
