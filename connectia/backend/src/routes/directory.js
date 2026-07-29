import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { DirectoryEntry, DirectoryFavorite } from '../models/DirectoryEntry.js'
import { audienceFilterForUser } from '../lib/audience.js'
import {
  serializeDirectoryEntry,
  isEntryVisibleNow,
  buildSearchFilter,
  distanceKm,
  TIPO_META,
  DIRECTORY_TIPOS,
} from '../lib/directory.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

async function favoriteIdsFor(tenantId, userId) {
  const favs = await DirectoryFavorite.find({ tenantId, userId }).select('entryId').lean()
  return new Set(favs.map((f) => String(f.entryId)))
}

function baseVisibleFilter(tenantId, user) {
  const now = new Date()
  return {
    tenantId,
    activo: true,
    $and: [
      audienceFilterForUser(user),
      {
        $or: [{ vigenciaDesde: null }, { vigenciaDesde: { $exists: false } }, { vigenciaDesde: { $lte: now } }],
      },
      {
        $or: [{ vigenciaHasta: null }, { vigenciaHasta: { $exists: false } }, { vigenciaHasta: { $gte: now } }],
      },
    ],
  }
}

/** GET /api/directory — listado + filtros */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const q = String(req.query.q || '').trim()
    const tipo = String(req.query.tipo || '').trim()
    const categoria = String(req.query.categoria || '').trim()
    const favoritos = String(req.query.favoritos || '') === '1'
    const nearLat = req.query.lat != null ? Number(req.query.lat) : null
    const nearLng = req.query.lng != null ? Number(req.query.lng) : null
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 40))

    const filter = baseVisibleFilter(tenantId, req.user)
    if (tipo && DIRECTORY_TIPOS.includes(tipo)) filter.tipo = tipo
    if (categoria) filter.categoria = categoria
    const search = buildSearchFilter(q)
    if (search) Object.assign(filter, search)

    const favSet = await favoriteIdsFor(tenantId, req.user._id)
    if (favoritos) {
      if (!favSet.size) {
        return res.json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          categories: [],
          tipos: DIRECTORY_TIPOS.map((t) => ({ id: t, ...TIPO_META[t] })),
          emergencias: [],
        })
      }
      filter._id = { $in: [...favSet].map((id) => new ObjectId(id)) }
    }

    let items = await DirectoryEntry.find(filter)
      .sort({ destacado: -1, orden: 1, nombre: 1 })
      .limit(500)
      .lean()

    items = items.filter((e) => isEntryVisibleNow(e))

    if (nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
      items = items
        .map((e) => ({
          e,
          d: distanceKm(nearLat, nearLng, e.lat, e.lng),
        }))
        .sort((a, b) => {
          if (a.d == null && b.d == null) return 0
          if (a.d == null) return 1
          if (b.d == null) return -1
          return a.d - b.d
        })
        .map(({ e, d }) => ({ ...e, _dist: d }))
    }

    const total = items.length
    const slice = items.slice((page - 1) * pageSize, page * pageSize)
    const serialized = slice.map((e) =>
      serializeDirectoryEntry(e, {
        favorite: favSet.has(String(e._id)),
        distanceKm: e._dist ?? null,
      }),
    )

    const cats = await DirectoryEntry.distinct('categoria', {
      tenantId,
      activo: true,
    })

    const emergencias = serialized.filter((i) => i.tipo === 'emergencia').slice(0, 6)
    // Si filtramos por tipo, emergencias aparte desde query dedicada
    let emerList = emergencias
    if (tipo && tipo !== 'emergencia') {
      const emerDocs = await DirectoryEntry.find({
        ...baseVisibleFilter(tenantId, req.user),
        tipo: 'emergencia',
      })
        .sort({ orden: 1, nombre: 1 })
        .limit(8)
        .lean()
      emerList = emerDocs
        .filter((e) => isEntryVisibleNow(e))
        .map((e) => serializeDirectoryEntry(e, { favorite: favSet.has(String(e._id)) }))
    }

    res.json({
      items: serialized,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      categories: cats.filter(Boolean).sort(),
      tipos: DIRECTORY_TIPOS.map((t) => ({ id: t, label: TIPO_META[t].label, color: TIPO_META[t].color })),
      emergencias: emerList,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/directory/map — solo con coordenadas */
router.get('/map', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const favSet = await favoriteIdsFor(tenantId, req.user._id)
    const items = await DirectoryEntry.find({
      ...baseVisibleFilter(tenantId, req.user),
      lat: { $ne: null, $type: 'number' },
      lng: { $ne: null, $type: 'number' },
    })
      .sort({ orden: 1, nombre: 1 })
      .limit(300)
      .lean()

    res.json({
      items: items
        .filter((e) => isEntryVisibleNow(e))
        .map((e) =>
          serializeDirectoryEntry(e, {
            favorite: favSet.has(String(e._id)),
          }),
        ),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/directory/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await DirectoryEntry.findOne({
      _id: req.params.id,
      ...baseVisibleFilter(req.tenant._id, req.user),
    }).lean()
    if (!doc || !isEntryVisibleNow(doc)) return res.status(404).json({ error: 'No encontrado' })
    const favSet = await favoriteIdsFor(req.tenant._id, req.user._id)
    await DirectoryEntry.updateOne({ _id: doc._id }, { $inc: { openCount: 1 } })
    res.json({
      item: serializeDirectoryEntry(doc, { favorite: favSet.has(String(doc._id)) }),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/directory/:id/favorite — idempotente */
router.post('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const entry = await DirectoryEntry.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    }).select('_id')
    if (!entry) return res.status(404).json({ error: 'No encontrado' })
    await DirectoryFavorite.updateOne(
      { tenantId: req.tenant._id, userId: req.user._id, entryId: entry._id },
      { $setOnInsert: { tenantId: req.tenant._id, userId: req.user._id, entryId: entry._id } },
      { upsert: true },
    )
    res.json({ ok: true, favorite: true })
  } catch (e) {
    if (e.code === 11000) return res.json({ ok: true, favorite: true })
    next(e)
  }
})

/** DELETE /api/directory/:id/favorite — idempotente */
router.delete('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.json({ ok: true, favorite: false })
    await DirectoryFavorite.deleteOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      entryId: req.params.id,
    })
    res.json({ ok: true, favorite: false })
  } catch (e) {
    next(e)
  }
})

export default router
