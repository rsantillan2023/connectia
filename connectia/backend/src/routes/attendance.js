import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, isFullAdmin } from '../middleware/auth.js'
import {
  AttendancePlace,
  AttendanceShift,
  AttendancePunch,
  AttendancePolicy,
  AttendanceQrToken,
} from '../models/Attendance.js'
import { User } from '../models/User.js'
import {
  normalizeAttendancePolicy,
  defaultAttendancePolicy,
  parseGps,
  evaluatePunch,
  evaluateShiftWindow,
  serializePlace,
  serializeShift,
  serializePunch,
  attendanceMeta,
  PUNCH_KINDS,
  PUNCH_MODES,
  toDateKey,
} from '../lib/attendance.js'
import {
  createQrTokenPayload,
  qrPayloadString,
  parseQrPayload,
  shiftsToPrefichada,
} from '../lib/attendanceVertical.js'
import { TeamScope } from '../models/TeamScope.js'
import { notifyAttendancePunch } from '../services/notifyAttendance.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth)

async function getPolicy(tenantId) {
  const doc = await AttendancePolicy.findOne({ tenantId }).lean()
  return normalizeAttendancePolicy(doc || defaultAttendancePolicy())
}

function tenantHasAsistencia(tenant) {
  const caps = tenant?.capabilities || []
  return (
    caps.includes('asistencia') ||
    caps.includes('asistencia.marcar') ||
    caps.includes('asistencia.turnos')
  )
}

/** GET /api/attendance/meta */
router.get('/meta', async (req, res) => {
  const policy = await getPolicy(req.tenant._id)
  res.json({
    ...attendanceMeta(),
    policy,
    enabled: tenantHasAsistencia(req.tenant),
  })
})

/** GET /api/attendance/my-shifts?from=&to= */
router.get('/my-shifts', async (req, res, next) => {
  try {
    const from = String(req.query.from || toDateKey(new Date())).slice(0, 10)
    const to = String(req.query.to || from).slice(0, 10)
    const filter = {
      tenantId: req.tenant._id,
      userId: req.user._id,
      fecha: { $gte: from, $lte: to },
      estado: { $ne: 'cancelado' },
    }
    const shifts = await AttendanceShift.find(filter).sort({ fecha: 1, startTime: 1 }).lean()
    const placeIds = [...new Set(shifts.map((s) => String(s.placeId)).filter(Boolean))]
    const places = placeIds.length
      ? await AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
      : []
    const placeMap = new Map(places.map((p) => [String(p._id), p]))

    const shiftIds = shifts.map((s) => s._id)
    const punches = shiftIds.length
      ? await AttendancePunch.find({
          tenantId: req.tenant._id,
          userId: req.user._id,
          shiftId: { $in: shiftIds },
        })
          .sort({ serverReceivedAt: -1 })
          .lean()
      : []
    const punchByShift = new Map()
    for (const p of punches) {
      const key = String(p.shiftId)
      if (!punchByShift.has(key)) punchByShift.set(key, [])
      punchByShift.get(key).push(serializePunch(p, { place: placeMap.get(String(p.placeId)) }))
    }

    res.json({
      from,
      to,
      items: shifts.map((s) => ({
        ...serializeShift(s, { place: placeMap.get(String(s.placeId)) }),
        punches: punchByShift.get(String(s._id)) || [],
      })),
      policy: await getPolicy(req.tenant._id),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/attendance/history?scope=me|team&from=&to=&geoResult= */
router.get('/history', async (req, res, next) => {
  try {
    const scope = req.query.scope === 'team' ? 'team' : 'me'
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))

    let userIds = [req.user._id]
    if (scope === 'team') {
      const idSet = new Set([String(req.user._id)])
      const reports = await User.find({
        tenantId: req.tenant._id,
        managerId: req.user._id,
        activo: true,
      })
        .select('_id')
        .lean()
      for (const u of reports) idSet.add(String(u._id))

      const scopes = await TeamScope.find({
        tenantId: req.tenant._id,
        supervisorId: req.user._id,
        activo: true,
      })
        .select('memberIds')
        .lean()
      for (const s of scopes) {
        for (const mid of s.memberIds || []) idSet.add(String(mid))
      }

      userIds = [...idSet].filter((id) => ObjectId.isValid(id))
      if (!isFullAdmin(req.user) && userIds.length <= 1) {
        userIds = [req.user._id]
      }
    }

    const q = { tenantId: req.tenant._id, userId: { $in: userIds } }
    if (req.query.geoResult) q.geoResult = String(req.query.geoResult)
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
    const places = placeIds.length
      ? await AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
      : []
    const placeMap = new Map(places.map((p) => [String(p._id), p]))

    const uIds = [...new Set(items.map((p) => String(p.userId)))]
    const users = await User.find({ _id: { $in: uIds } })
      .select('nombre apellido usuario')
      .lean()
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
      scope,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/attendance/punch
 * Body: { shiftId?, placeId?, kind, mode?, gps?, idempotencyKey, justification?, deviceClockAt?, channel? }
 */
router.post('/punch', async (req, res, next) => {
  try {
    const body = req.body || {}
    const kind = String(body.kind || '')
    if (!PUNCH_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'kind inválido (entrada|salida|presencia)' })
    }

    const idempotencyKey = String(body.idempotencyKey || '').trim().slice(0, 80)
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey requerido' })
    }

    const existing = await AttendancePunch.findOne({
      tenantId: req.tenant._id,
      idempotencyKey,
    }).lean()
    if (existing) {
      const place = existing.placeId
        ? await AttendancePlace.findOne({ _id: existing.placeId, tenantId: req.tenant._id }).lean()
        : null
      return res.json({
        item: serializePunch(existing, { place }),
        replayed: true,
      })
    }

    let shift = null
    if (body.shiftId && ObjectId.isValid(body.shiftId)) {
      shift = await AttendanceShift.findOne({
        _id: body.shiftId,
        tenantId: req.tenant._id,
        userId: req.user._id,
        estado: { $ne: 'cancelado' },
      }).lean()
      if (!shift) return res.status(404).json({ error: 'Turno no encontrado' })
    }

    let placeId = shift?.placeId || (body.placeId && ObjectId.isValid(body.placeId) ? body.placeId : null)
    if (shift && body.placeId && ObjectId.isValid(body.placeId)) {
      const allowed = new Set([
        String(shift.placeId),
        ...(shift.alternatePlaceIds || []).map(String),
      ])
      if (allowed.has(String(body.placeId))) placeId = body.placeId
    }
    let place = placeId
      ? await AttendancePlace.findOne({ _id: placeId, tenantId: req.tenant._id, activo: true }).lean()
      : null

    // Multi-instalación: si el body pide otro lugar del mismo servicio
    if (shift && body.placeId && ObjectId.isValid(body.placeId) && !place) {
      const candidate = await AttendancePlace.findOne({
        _id: body.placeId,
        tenantId: req.tenant._id,
        activo: true,
      }).lean()
      const primary = shift.placeId
        ? await AttendancePlace.findOne({ _id: shift.placeId, tenantId: req.tenant._id }).lean()
        : null
      if (
        candidate &&
        primary?.servicio &&
        candidate.servicio &&
        candidate.servicio === primary.servicio
      ) {
        place = candidate
        placeId = candidate._id
      }
    }
    const policy = await getPolicy(req.tenant._id)
    const mode = PUNCH_MODES.includes(body.mode) ? body.mode : policy.defaultMode
    const gps = parseGps(body.gps)
    const now = new Date()

    if (shift) {
      const windowEval = evaluateShiftWindow({ shift, now, policy })
      if (!windowEval.ok) {
        return res.status(windowEval.status || 400).json({
          error: windowEval.error,
          lateMinutes: windowEval.lateMinutes,
          earlyMinutes: windowEval.earlyMinutes,
          outsideWindow: true,
        })
      }
    }

    const evalResult = evaluatePunch({ mode, place, gps, policy, now })
    if (!evalResult.ok) {
      return res.status(evalResult.status || 400).json({
        error: evalResult.error,
        geoResult: evalResult.geoResult,
        distanceMetros: evalResult.distanceMetros ?? null,
      })
    }

    const justification = String(body.justification || '').trim().slice(0, 1000)
    if (evalResult.requiresJustification && !justification) {
      return res.status(400).json({
        error: 'Estás fuera de rango: agregá una justificación para registrar la marca',
        geoResult: 'out_of_range',
        distanceMetros: evalResult.distanceMetros,
        requiresJustification: true,
      })
    }

    const windowMeta = shift
      ? evaluateShiftWindow({ shift, now, policy })
      : { lateMinutes: 0, earlyMinutes: 0 }

    let punch
    try {
      punch = await AttendancePunch.create({
        tenantId: req.tenant._id,
        userId: req.user._id,
        shiftId: shift?._id || null,
        placeId: place?._id || null,
        kind,
        mode,
        geoResult: evalResult.geoResult,
        distanceMetros: evalResult.distanceMetros,
        lateMinutes: windowMeta.lateMinutes || 0,
        earlyMinutes: windowMeta.earlyMinutes || 0,
        expiresAt: evalResult.expiresAt || null,
        gps: gps
          ? {
              lat: gps.lat,
              lng: gps.lng,
              accuracy: gps.accuracy,
              capturedAt: gps.capturedAt || now,
              source: gps.source,
            }
          : undefined,
        deviceClockAt: body.deviceClockAt ? new Date(body.deviceClockAt) : null,
        serverReceivedAt: now,
        timezone: place?.timezone || req.tenant.timezone || 'America/Argentina/Buenos_Aires',
        justification,
        channel: String(body.channel || 'app').slice(0, 40),
        idempotencyKey,
        actorId: req.user._id,
      })
    } catch (e) {
      if (e?.code === 11000) {
        const again = await AttendancePunch.findOne({
          tenantId: req.tenant._id,
          idempotencyKey,
        }).lean()
        if (again) {
          return res.json({
            item: serializePunch(again, { place }),
            replayed: true,
          })
        }
      }
      throw e
    }

    const userName =
      [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario || 'Usuario'
    try {
      await notifyAttendancePunch({
        tenant: req.tenant,
        punch,
        userName,
        placeName: place?.nombre,
      })
    } catch (err) {
      console.warn('[attendance] notify:', err?.message || err)
    }

    res.status(201).json({
      item: serializePunch(punch, { place }),
      replayed: false,
    })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/attendance/punches/:id/justify */
router.patch('/punches/:id/justify', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const punch = await AttendancePunch.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!punch) return res.status(404).json({ error: 'Marca no encontrada' })
    const text = String(req.body?.justification || '').trim().slice(0, 1000)
    if (!text) return res.status(400).json({ error: 'justification requerida' })
    punch.justification = text
    await punch.save()
    const place = punch.placeId
      ? await AttendancePlace.findOne({ _id: punch.placeId, tenantId: req.tenant._id }).lean()
      : null
    res.json({ item: serializePunch(punch, { place }) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/attendance/prefichada — 11.03 mock Geopop desde turnos locales */
router.get('/prefichada', async (req, res, next) => {
  try {
    const policy = await getPolicy(req.tenant._id)
    if (!policy.enableGeopopPrefichada) {
      return res.json({ items: [], source: 'disabled', enabled: false })
    }
    const fecha = String(req.query.fecha || toDateKey(new Date())).slice(0, 10)
    const shifts = await AttendanceShift.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      fecha,
      estado: { $ne: 'cancelado' },
    })
      .sort({ startTime: 1 })
      .lean()
    const placeIds = [...new Set(shifts.map((s) => String(s.placeId)).filter(Boolean))]
    const places = placeIds.length
      ? await AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
      : []
    const placeMap = new Map(places.map((p) => [String(p._id), p]))
    const shiftIds = shifts.map((s) => s._id)
    const punches = shiftIds.length
      ? await AttendancePunch.find({
          tenantId: req.tenant._id,
          userId: req.user._id,
          shiftId: { $in: shiftIds },
        })
          .sort({ serverReceivedAt: -1 })
          .lean()
      : []
    const punchesByShift = new Map()
    for (const p of punches) {
      const k = String(p.shiftId)
      if (!punchesByShift.has(k)) punchesByShift.set(k, [])
      punchesByShift.get(k).push(p)
    }
    res.json({
      fecha,
      source: 'geopop_mock',
      enabled: true,
      items: shiftsToPrefichada(shifts, { places: placeMap, punchesByShift }),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/attendance/my-places — lugares del día / servicio (11.04) */
router.get('/my-places', async (req, res, next) => {
  try {
    const fecha = String(req.query.fecha || toDateKey(new Date())).slice(0, 10)
    const shifts = await AttendanceShift.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      fecha,
      estado: { $ne: 'cancelado' },
    }).lean()
    const ids = new Set()
    for (const s of shifts) {
      if (s.placeId) ids.add(String(s.placeId))
      for (const a of s.alternatePlaceIds || []) ids.add(String(a))
    }
    let places = ids.size
      ? await AttendancePlace.find({
          tenantId: req.tenant._id,
          _id: { $in: [...ids] },
          activo: true,
        }).lean()
      : []
    // Ampliar por mismo servicio
    const servicios = [...new Set(places.map((p) => p.servicio).filter(Boolean))]
    if (servicios.length) {
      const extra = await AttendancePlace.find({
        tenantId: req.tenant._id,
        activo: true,
        servicio: { $in: servicios },
      }).lean()
      const map = new Map(places.map((p) => [String(p._id), p]))
      for (const e of extra) map.set(String(e._id), e)
      places = [...map.values()]
    }
    res.json({ fecha, items: places.map(serializePlace) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/attendance/qr/token — credencial QR (11.06) */
router.post('/qr/token', async (req, res, next) => {
  try {
    const policy = await getPolicy(req.tenant._id)
    if (!policy.enableQrPunch) {
      return res.status(403).json({ error: 'Marcación QR no habilitada' })
    }
    const body = req.body || {}
    let shift = null
    if (body.shiftId && ObjectId.isValid(body.shiftId)) {
      shift = await AttendanceShift.findOne({
        _id: body.shiftId,
        tenantId: req.tenant._id,
        userId: req.user._id,
        estado: { $ne: 'cancelado' },
      }).lean()
    }
    const placeId =
      (body.placeId && ObjectId.isValid(body.placeId) && body.placeId) ||
      shift?.placeId ||
      null
    const payload = createQrTokenPayload({
      tenantId: req.tenant._id,
      userId: req.user._id,
      shiftId: shift?._id,
      placeId,
      ttlSec: Number(body.ttlSec) || 120,
    })
    await AttendanceQrToken.create({
      tenantId: req.tenant._id,
      userId: req.user._id,
      shiftId: shift?._id || null,
      placeId,
      token: payload.token,
      expiresAt: payload.expiresAt,
      actorId: req.user._id,
    })
    const qrText = qrPayloadString(payload)
    res.status(201).json({
      token: payload.token,
      payload: qrText,
      expiresAt: payload.expiresAt,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrText)}`,
      shiftId: shift?._id ? String(shift._id) : null,
      placeId: placeId ? String(placeId) : null,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/attendance/qr/punch — marca por token QR (colaborador o supervisor).
 * Body: { token|payload, kind?, mode?, gps?, justification?, idempotencyKey? }
 */
router.post('/qr/punch', async (req, res, next) => {
  try {
    const policy = await getPolicy(req.tenant._id)
    if (!policy.enableQrPunch) {
      return res.status(403).json({ error: 'Marcación QR no habilitada' })
    }
    const body = req.body || {}
    const token = parseQrPayload(body.payload || body.token)
    if (!token) return res.status(400).json({ error: 'token QR inválido' })

    const row = await AttendanceQrToken.findOne({
      tenantId: req.tenant._id,
      token,
    })
    if (!row) return res.status(404).json({ error: 'Token no encontrado' })
    if (row.usedAt) return res.status(409).json({ error: 'Token ya utilizado' })
    if (row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: 'Token expirado' })
    }

    const targetUserId = row.userId
    const kind = PUNCH_KINDS.includes(body.kind) ? body.kind : 'presencia'
    const mode = PUNCH_MODES.includes(body.mode) ? body.mode : 'en_lugar'
    const gps = parseGps(body.gps)
    const place = row.placeId
      ? await AttendancePlace.findOne({
          _id: row.placeId,
          tenantId: req.tenant._id,
          activo: true,
        }).lean()
      : null
    const shift = row.shiftId
      ? await AttendanceShift.findOne({ _id: row.shiftId, tenantId: req.tenant._id }).lean()
      : null

    const now = new Date()
    const evalResult = evaluatePunch({ mode, place, gps, policy, now })
    if (!evalResult.ok) {
      return res.status(evalResult.status || 400).json({
        error: evalResult.error,
        geoResult: evalResult.geoResult,
        distanceMetros: evalResult.distanceMetros ?? null,
      })
    }
    const justification = String(body.justification || '').trim().slice(0, 1000)
    if (evalResult.requiresJustification && !justification) {
      return res.status(400).json({
        error: 'Fuera de rango: justificación requerida',
        requiresJustification: true,
        distanceMetros: evalResult.distanceMetros,
      })
    }

    const idempotencyKey =
      String(body.idempotencyKey || '').trim().slice(0, 80) || `qr-${token}-${kind}`

    const existing = await AttendancePunch.findOne({
      tenantId: req.tenant._id,
      idempotencyKey,
    }).lean()
    if (existing) {
      return res.json({ item: serializePunch(existing, { place }), replayed: true })
    }

    const windowMeta = shift
      ? evaluateShiftWindow({ shift, now, policy })
      : { lateMinutes: 0, earlyMinutes: 0, ok: true }
    if (shift && !windowMeta.ok) {
      return res.status(windowMeta.status || 400).json({ error: windowMeta.error })
    }

    const punch = await AttendancePunch.create({
      tenantId: req.tenant._id,
      userId: targetUserId,
      shiftId: shift?._id || null,
      placeId: place?._id || null,
      kind,
      mode,
      geoResult: evalResult.geoResult,
      distanceMetros: evalResult.distanceMetros,
      lateMinutes: windowMeta.lateMinutes || 0,
      earlyMinutes: windowMeta.earlyMinutes || 0,
      expiresAt: evalResult.expiresAt || null,
      gps: gps
        ? {
            lat: gps.lat,
            lng: gps.lng,
            accuracy: gps.accuracy,
            capturedAt: gps.capturedAt || now,
            source: gps.source || 'qr',
          }
        : undefined,
      deviceClockAt: body.deviceClockAt ? new Date(body.deviceClockAt) : null,
      serverReceivedAt: now,
      timezone: place?.timezone || req.tenant.timezone || 'America/Argentina/Buenos_Aires',
      justification,
      channel: 'qr',
      idempotencyKey,
      actorId: req.user._id,
    })

    row.usedAt = now
    await row.save()

    const target = await User.findById(targetUserId).select('nombre apellido usuario').lean()
    const userName = target
      ? [target.nombre, target.apellido].filter(Boolean).join(' ') || target.usuario
      : 'Colaborador'
    try {
      await notifyAttendancePunch({
        tenant: req.tenant,
        punch,
        userName,
        placeName: place?.nombre,
      })
    } catch {
      /* ignore */
    }

    res.status(201).json({
      item: serializePunch(punch, { place, userName }),
      replayed: false,
    })
  } catch (e) {
    next(e)
  }
})

export default router
