import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import {
  AttendancePlace,
  AttendanceShift,
  AttendancePunch,
  AttendancePolicy,
} from '../models/Attendance.js'
import { User } from '../models/User.js'
import { MenuItem } from '../models/MenuItem.js'
import {
  normalizeAttendancePolicy,
  defaultAttendancePolicy,
  serializePlace,
  serializeShift,
  serializePunch,
  attendanceMeta,
  SHIFT_STATUSES,
  toDateKey,
  punchesExportCsv,
} from '../lib/attendance.js'
import { aggregateSundayPunches } from '../lib/attendanceVertical.js'
import { seedAttendanceForTenant } from '../lib/attendanceSeed.js'
import { OLA18_MENU_ITEMS } from '../lib/ensureOla18Menu.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth, requireCapability('admin.asistencia'))

async function getOrCreatePolicy(tenantId) {
  let doc = await AttendancePolicy.findOne({ tenantId })
  if (!doc) {
    doc = await AttendancePolicy.create({ tenantId, ...defaultAttendancePolicy() })
  }
  return doc
}

function parseTime(v, fallback) {
  const s = String(v || fallback || '').trim()
  if (/^\d{2}:\d{2}$/.test(s)) return s
  return fallback
}

/** GET /api/admin/attendance/meta */
router.get('/meta', async (req, res) => {
  const policy = await getOrCreatePolicy(req.tenant._id)
  res.json({
    ...attendanceMeta(),
    policy: normalizeAttendancePolicy(policy),
  })
})

/** POST /api/admin/attendance/seed-defaults */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    for (const item of OLA18_MENU_ITEMS) {
      await MenuItem.findOneAndUpdate(
        { tenantId: req.tenant._id, key: item.key },
        {
          $setOnInsert: {
            tenantId: req.tenant._id,
            ...item,
            activo: true,
            audience: { roles: [], capabilities: [] },
          },
        },
        { upsert: true },
      )
    }
    const result = await seedAttendanceForTenant(req.tenant._id, {
      brandName: req.tenant.nombre,
    })
    res.json({ ...result, menuUpserted: true })
  } catch (e) {
    next(e)
  }
})

/** ─── Policy ─── */
router.get('/policy', async (req, res, next) => {
  try {
    const doc = await getOrCreatePolicy(req.tenant._id)
    res.json({ item: normalizeAttendancePolicy(doc) })
  } catch (e) {
    next(e)
  }
})

router.put('/policy', async (req, res, next) => {
  try {
    const body = req.body || {}
    const doc = await getOrCreatePolicy(req.tenant._id)
    const nextPol = normalizeAttendancePolicy({ ...doc.toObject(), ...body })
    Object.assign(doc, nextPol)
    await doc.save()
    res.json({ item: normalizeAttendancePolicy(doc) })
  } catch (e) {
    next(e)
  }
})

/** ─── Places ─── */
router.get('/places', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.activo === '1') filter.activo = true
    if (req.query.activo === '0') filter.activo = false
    const items = await AttendancePlace.find(filter).sort({ nombre: 1 }).lean()
    res.json({ items: items.map(serializePlace) })
  } catch (e) {
    next(e)
  }
})

router.post('/places', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.nombre?.trim()) return res.status(400).json({ error: 'nombre requerido' })
    const lat = Number(b.lat)
    const lng = Number(b.lng)
    if (![lat, lng].every((n) => Number.isFinite(n))) {
      return res.status(400).json({ error: 'lat/lng requeridos' })
    }
    const place = await AttendancePlace.create({
      tenantId: req.tenant._id,
      nombre: String(b.nombre).trim().slice(0, 120),
      codigo: String(b.codigo || '').trim().slice(0, 40),
      lat,
      lng,
      radioMetros: Number(b.radioMetros) || 150,
      timezone: String(b.timezone || req.tenant.timezone || 'America/Argentina/Buenos_Aires').slice(
        0,
        80,
      ),
      direccion: String(b.direccion || '').slice(0, 240),
      servicio: String(b.servicio || '').trim().slice(0, 80),
      objetivo: String(b.objetivo || '').trim().slice(0, 120),
      activo: b.activo !== false,
    })
    res.status(201).json({ item: serializePlace(place) })
  } catch (e) {
    next(e)
  }
})

router.put('/places/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const place = await AttendancePlace.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!place) return res.status(404).json({ error: 'Lugar no encontrado' })
    const b = req.body || {}
    if (b.nombre !== undefined) place.nombre = String(b.nombre).trim().slice(0, 120)
    if (b.codigo !== undefined) place.codigo = String(b.codigo).trim().slice(0, 40)
    if (b.lat !== undefined) place.lat = Number(b.lat)
    if (b.lng !== undefined) place.lng = Number(b.lng)
    if (b.radioMetros !== undefined) place.radioMetros = Number(b.radioMetros) || place.radioMetros
    if (b.timezone !== undefined) place.timezone = String(b.timezone).slice(0, 80)
    if (b.direccion !== undefined) place.direccion = String(b.direccion).slice(0, 240)
    if (b.servicio !== undefined) place.servicio = String(b.servicio).trim().slice(0, 80)
    if (b.objetivo !== undefined) place.objetivo = String(b.objetivo).trim().slice(0, 120)
    if (b.activo !== undefined) place.activo = !!b.activo
    await place.save()
    res.json({ item: serializePlace(place) })
  } catch (e) {
    next(e)
  }
})

router.delete('/places/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const place = await AttendancePlace.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!place) return res.status(404).json({ error: 'Lugar no encontrado' })
    place.activo = false
    await place.save()
    res.json({ item: serializePlace(place) })
  } catch (e) {
    next(e)
  }
})

/** ─── Shifts ─── */
router.get('/shifts', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.fecha) filter.fecha = String(req.query.fecha).slice(0, 10)
    if (req.query.from || req.query.to) {
      filter.fecha = {}
      if (req.query.from) filter.fecha.$gte = String(req.query.from).slice(0, 10)
      if (req.query.to) filter.fecha.$lte = String(req.query.to).slice(0, 10)
    }
    if (req.query.userId && ObjectId.isValid(req.query.userId)) filter.userId = req.query.userId
    if (req.query.estado) filter.estado = String(req.query.estado)
    else filter.estado = { $ne: 'cancelado' }

    const items = await AttendanceShift.find(filter).sort({ fecha: 1, startTime: 1 }).limit(200).lean()
    const placeIds = [...new Set(items.map((s) => String(s.placeId)))]
    const userIds = [...new Set(items.map((s) => String(s.userId)))]
    const [places, users] = await Promise.all([
      AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean(),
      User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
        .select('nombre apellido usuario')
        .lean(),
    ])
    const placeMap = new Map(places.map((p) => [String(p._id), p]))
    const nameMap = new Map(
      users.map((u) => [
        String(u._id),
        [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      ]),
    )
    res.json({
      items: items.map((s) =>
        serializeShift(s, {
          place: placeMap.get(String(s.placeId)),
          userName: nameMap.get(String(s.userId)),
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/shifts', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.userId || !ObjectId.isValid(b.userId)) {
      return res.status(400).json({ error: 'userId requerido' })
    }
    if (!b.placeId || !ObjectId.isValid(b.placeId)) {
      return res.status(400).json({ error: 'placeId requerido' })
    }
    const fecha = String(b.fecha || toDateKey(new Date())).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'fecha inválida (YYYY-MM-DD)' })
    }
    const user = await User.findOne({ _id: b.userId, tenantId: req.tenant._id, activo: true })
      .select('_id nombre apellido usuario')
      .lean()
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    const place = await AttendancePlace.findOne({
      _id: b.placeId,
      tenantId: req.tenant._id,
      activo: true,
    }).lean()
    if (!place) return res.status(404).json({ error: 'Lugar no encontrado' })

    const shift = await AttendanceShift.create({
      tenantId: req.tenant._id,
      userId: user._id,
      placeId: place._id,
      fecha,
      startTime: parseTime(b.startTime, '09:00'),
      endTime: parseTime(b.endTime, '18:00'),
      timezone: String(b.timezone || place.timezone).slice(0, 80),
      estado: SHIFT_STATUSES.includes(b.estado) ? b.estado : 'asignado',
      notas: String(b.notas || '').slice(0, 500),
      servicio: String(b.servicio || place.servicio || '').slice(0, 80),
      objetivo: String(b.objetivo || place.objetivo || '').slice(0, 120),
      alternatePlaceIds: Array.isArray(b.alternatePlaceIds)
        ? b.alternatePlaceIds.filter((id) => ObjectId.isValid(id)).slice(0, 20)
        : [],
    })
    const userName = [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario
    res.status(201).json({ item: serializeShift(shift, { place, userName }) })
  } catch (e) {
    next(e)
  }
})

router.put('/shifts/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const shift = await AttendanceShift.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!shift) return res.status(404).json({ error: 'Turno no encontrado' })
    const b = req.body || {}
    if (b.placeId && ObjectId.isValid(b.placeId)) {
      const place = await AttendancePlace.findOne({
        _id: b.placeId,
        tenantId: req.tenant._id,
        activo: true,
      })
      if (!place) return res.status(404).json({ error: 'Lugar no encontrado' })
      shift.placeId = place._id
    }
    if (b.userId && ObjectId.isValid(b.userId)) {
      const user = await User.findOne({ _id: b.userId, tenantId: req.tenant._id, activo: true })
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
      shift.userId = user._id
    }
    if (b.fecha) shift.fecha = String(b.fecha).slice(0, 10)
    if (b.startTime) shift.startTime = parseTime(b.startTime, shift.startTime)
    if (b.endTime) shift.endTime = parseTime(b.endTime, shift.endTime)
    if (b.timezone) shift.timezone = String(b.timezone).slice(0, 80)
    if (b.notas !== undefined) shift.notas = String(b.notas).slice(0, 500)
    if (b.estado && SHIFT_STATUSES.includes(b.estado)) shift.estado = b.estado
    await shift.save()
    const place = await AttendancePlace.findById(shift.placeId).lean()
    const user = await User.findById(shift.userId).select('nombre apellido usuario').lean()
    const userName = user
      ? [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario
      : null
    res.json({ item: serializeShift(shift, { place, userName }) })
  } catch (e) {
    next(e)
  }
})

router.post('/shifts/:id/cancel', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const shift = await AttendanceShift.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!shift) return res.status(404).json({ error: 'Turno no encontrado' })
    shift.estado = 'cancelado'
    await shift.save()
    res.json({ item: serializeShift(shift) })
  } catch (e) {
    next(e)
  }
})

/** POST replace: cancela original y crea uno nuevo */
router.post('/shifts/:id/replace', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const original = await AttendanceShift.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!original) return res.status(404).json({ error: 'Turno no encontrado' })
    const b = req.body || {}
    const userId = b.userId && ObjectId.isValid(b.userId) ? b.userId : original.userId
    const placeId = b.placeId && ObjectId.isValid(b.placeId) ? b.placeId : original.placeId
    original.estado = 'reemplazado'
    await original.save()
    const neu = await AttendanceShift.create({
      tenantId: req.tenant._id,
      userId,
      placeId,
      fecha: String(b.fecha || original.fecha).slice(0, 10),
      startTime: parseTime(b.startTime, original.startTime),
      endTime: parseTime(b.endTime, original.endTime),
      timezone: String(b.timezone || original.timezone).slice(0, 80),
      estado: 'asignado',
      notas: String(b.notas || `Reemplazo de ${original._id}`).slice(0, 500),
      reemplazoDeId: original._id,
    })
    const place = await AttendancePlace.findById(neu.placeId).lean()
    res.status(201).json({
      item: serializeShift(neu, { place }),
      replaced: serializeShift(original),
    })
  } catch (e) {
    next(e)
  }
})

/** ─── Novedades / punches ─── */
router.get('/punches/export', async (req, res, next) => {
  try {
    const q = { tenantId: req.tenant._id }
    if (req.query.geoResult) q.geoResult = String(req.query.geoResult)
    if (req.query.userId && ObjectId.isValid(req.query.userId)) q.userId = req.query.userId
    if (req.query.from || req.query.to) {
      q.serverReceivedAt = {}
      if (req.query.from) q.serverReceivedAt.$gte = new Date(String(req.query.from))
      if (req.query.to) {
        const end = new Date(String(req.query.to))
        if (!String(req.query.to).includes('T')) end.setHours(23, 59, 59, 999)
        q.serverReceivedAt.$lte = end
      }
    }
    const items = await AttendancePunch.find(q).sort({ serverReceivedAt: -1 }).limit(2000).lean()
    const placeIds = [...new Set(items.map((p) => String(p.placeId || '')).filter(Boolean))]
    const userIds = [...new Set(items.map((p) => String(p.userId)))]
    const [places, users] = await Promise.all([
      placeIds.length
        ? AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
        : [],
      User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
        .select('nombre apellido usuario')
        .lean(),
    ])
    const placeMap = new Map(places.map((p) => [String(p._id), p]))
    const nameMap = new Map(
      users.map((u) => [
        String(u._id),
        [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      ]),
    )
    const serialized = items.map((p) =>
      serializePunch(p, {
        place: placeMap.get(String(p.placeId)),
        userName: nameMap.get(String(p.userId)),
      }),
    )
    const csv = punchesExportCsv(serialized)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="asistencia-marcas.csv"')
    res.send(csv)
  } catch (e) {
    next(e)
  }
})

router.get('/punches', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const q = { tenantId: req.tenant._id }
    if (req.query.geoResult) q.geoResult = String(req.query.geoResult)
    if (req.query.userId && ObjectId.isValid(req.query.userId)) q.userId = req.query.userId
    if (req.query.from || req.query.to) {
      q.serverReceivedAt = {}
      if (req.query.from) q.serverReceivedAt.$gte = new Date(String(req.query.from))
      if (req.query.to) {
        const end = new Date(String(req.query.to))
        if (!String(req.query.to).includes('T')) end.setHours(23, 59, 59, 999)
        q.serverReceivedAt.$lte = end
      }
    }
    const [items, total] = await Promise.all([
      AttendancePunch.find(q)
        .sort({ serverReceivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AttendancePunch.countDocuments(q),
    ])
    const placeIds = [...new Set(items.map((p) => String(p.placeId || '')).filter(Boolean))]
    const userIds = [...new Set(items.map((p) => String(p.userId)))]
    const [places, users] = await Promise.all([
      placeIds.length
        ? AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
        : [],
      User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
        .select('nombre apellido usuario')
        .lean(),
    ])
    const placeMap = new Map(places.map((p) => [String(p._id), p]))
    const nameMap = new Map(
      users.map((u) => [
        String(u._id),
        [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      ]),
    )
    res.json({
      items: items.map((p) =>
        serializePunch(p, {
          place: placeMap.get(String(p.placeId)),
          userName: nameMap.get(String(p.userId)),
        }),
      ),
      total,
      page,
      limit,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/attendance/domingos?year=&month= — 11.09 */
router.get('/domingos', async (req, res, next) => {
  try {
    const now = new Date()
    const year = Number(req.query.year) || now.getFullYear()
    const month = Number(req.query.month) || now.getMonth() + 1
    const policy = normalizeAttendancePolicy(await getOrCreatePolicy(req.tenant._id))
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 0, 23, 59, 59, 999)
    const punches = await AttendancePunch.find({
      tenantId: req.tenant._id,
      serverReceivedAt: { $gte: from, $lte: to },
    })
      .select('userId serverReceivedAt kind')
      .lean()
    const userIds = [...new Set(punches.map((p) => String(p.userId)))]
    const users = await User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
      .select('nombre apellido usuario dni idExterno cargo')
      .lean()
    const userMap = new Map(users.map((u) => [String(u._id), u]))
    const rows = aggregateSundayPunches(punches, {
      year,
      month,
      expectedPerUser: policy.domingosEsperadosMes,
      users: userMap,
    })
    res.json({
      year,
      month,
      expectedPerUser: policy.domingosEsperadosMes,
      items: rows,
    })
  } catch (e) {
    next(e)
  }
})

/** Lista usuarios activos (para asignar turnos) */
router.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }
    if (q) {
      filter.$or = [
        { nombre: new RegExp(q, 'i') },
        { apellido: new RegExp(q, 'i') },
        { usuario: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ]
    }
    const users = await User.find(filter)
      .select('nombre apellido usuario email')
      .sort({ apellido: 1, nombre: 1 })
      .limit(50)
      .lean()
    res.json({
      items: users.map((u) => ({
        id: String(u._id),
        nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
        usuario: u.usuario,
        email: u.email || '',
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
