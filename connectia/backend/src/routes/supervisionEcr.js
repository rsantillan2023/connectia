/**
 * BFF Panel ECR supervisores ? secretos solo en servidor (ADR-D31-3 / 23.ECR.09).
 * Sin API externa: usa AttendancePunch locales (Ola 18 ? 11.09 / 11.11).
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, hasCapability, isFullAdmin } from '../middleware/auth.js'
import { User } from '../models/User.js'
import {
  AttendancePunch,
  AttendancePlace,
  AttendanceShift,
  AttendancePolicy,
  AttendanceWarning,
} from '../models/Attendance.js'
import { TeamScope } from '../models/TeamScope.js'
import { notifyEcrAction } from '../services/notifySupervision.js'
import { punchToEcrMarca, aggregateSundayPunches } from '../lib/attendanceVertical.js'
import { normalizeAttendancePolicy, defaultAttendancePolicy } from '../lib/attendance.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function ecrConfigured() {
  return Boolean(process.env.ECR_SUPERVISORS_API && process.env.ECR_SUPERVISORS_API_KEY)
}

function requireEcrCap(req, res) {
  if (
    !hasCapability(
      req.user,
      req.tenant,
      'supervision.ecr',
      'supervision.comercial',
      'admin.asistencia',
      'asistencia.ecr',
    )
  ) {
    res.status(403).json({ error: 'Panel ECR no habilitado' })
    return false
  }
  return true
}

async function ecrFetch(path, { method = 'GET', body } = {}) {
  const base = process.env.ECR_SUPERVISORS_API.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    'x-api-key': process.env.ECR_SUPERVISORS_API_KEY,
    Accept: 'application/json',
  }
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/** Alcance: reportes managerId + TeamScope (+ self). */
async function teamUserIds(tenantId, supervisorId, { admin = false } = {}) {
  if (admin) {
    const all = await User.find({ tenantId, activo: true }).select('_id').lean()
    return all.map((u) => u._id)
  }
  const idSet = new Set([String(supervisorId)])
  const reports = await User.find({ tenantId, managerId: supervisorId, activo: true })
    .select('_id')
    .lean()
  for (const u of reports) idSet.add(String(u._id))
  const scopes = await TeamScope.find({
    tenantId,
    supervisorId,
    activo: true,
  })
    .select('memberIds')
    .lean()
  for (const s of scopes) {
    for (const mid of s.memberIds || []) idSet.add(String(mid))
  }
  return [...idSet].filter((id) => ObjectId.isValid(id))
}

function parseEcrFecha(raw) {
  // dd-mm-yyyy o yyyy-mm-dd
  const s = String(raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function localOutOfRangeMarcas(req, fechaIso) {
  const admin = isFullAdmin(req.user)
  const userIds = await teamUserIds(req.tenant._id, req.user._id, { admin })
  const dayStart = new Date(`${fechaIso}T00:00:00`)
  const dayEnd = new Date(`${fechaIso}T23:59:59.999`)
  const punches = await AttendancePunch.find({
    tenantId: req.tenant._id,
    userId: { $in: userIds },
    geoResult: 'out_of_range',
    serverReceivedAt: { $gte: dayStart, $lte: dayEnd },
  })
    .sort({ serverReceivedAt: -1 })
    .limit(100)
    .lean()

  if (!punches.length) {
    // Fallback demo si no hay datos del d?a
    return {
      exito: true,
      data: [],
      mock: true,
      source: 'attendance_local',
    }
  }

  const placeIds = [...new Set(punches.map((p) => String(p.placeId || '')).filter(Boolean))]
  const shiftIds = [...new Set(punches.map((p) => String(p.shiftId || '')).filter(Boolean))]
  const uIds = [...new Set(punches.map((p) => String(p.userId)))]
  const [places, shifts, users] = await Promise.all([
    placeIds.length
      ? AttendancePlace.find({ tenantId: req.tenant._id, _id: { $in: placeIds } }).lean()
      : [],
    shiftIds.length
      ? AttendanceShift.find({ tenantId: req.tenant._id, _id: { $in: shiftIds } }).lean()
      : [],
    User.find({ tenantId: req.tenant._id, _id: { $in: uIds } })
      .select('nombre apellido usuario dni idExterno cargo')
      .lean(),
  ])
  const placeMap = new Map(places.map((p) => [String(p._id), p]))
  const shiftMap = new Map(shifts.map((s) => [String(s._id), s]))
  const userMap = new Map(users.map((u) => [String(u._id), u]))

  return {
    exito: true,
    data: punches.map((p) =>
      punchToEcrMarca(p, {
        user: userMap.get(String(p.userId)),
        place: placeMap.get(String(p.placeId)),
        shift: shiftMap.get(String(p.shiftId)),
      }),
    ),
    mock: true,
    source: 'attendance_local',
  }
}

async function localDomingos(req) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const polDoc = await AttendancePolicy.findOne({ tenantId: req.tenant._id }).lean()
  const policy = normalizeAttendancePolicy(polDoc || defaultAttendancePolicy())
  const admin = isFullAdmin(req.user)
  const userIds = await teamUserIds(req.tenant._id, req.user._id, { admin })
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  const punches = await AttendancePunch.find({
    tenantId: req.tenant._id,
    userId: { $in: userIds },
    serverReceivedAt: { $gte: from, $lte: to },
  })
    .select('userId serverReceivedAt')
    .lean()
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
  return { exito: true, data: rows, mock: true, source: 'attendance_local' }
}

async function notifyWorkerByRut(tenant, rutTrabajador, title, body) {
  if (!rutTrabajador) return
  const clean = String(rutTrabajador).replace(/\./g, '').replace(/-/g, '').toLowerCase()
  const users = await User.find({
    tenantId: tenant._id,
    activo: true,
    $or: [
      { dni: new RegExp(clean.slice(0, -1), 'i') },
      { idExterno: String(rutTrabajador) },
      { usuario: String(rutTrabajador) },
    ],
  })
    .select('_id')
    .limit(3)
    .lean()
  for (const u of users) {
    await notifyEcrAction({ tenant, userId: u._id, title, body })
  }
}

async function resolvePunchFromPayload(tenantId, payload) {
  if (payload.punchId && ObjectId.isValid(payload.punchId)) {
    return AttendancePunch.findOne({ _id: payload.punchId, tenantId })
  }
  return null
}

router.use(requireAuth)

router.get('/meta', (req, res) => {
  if (!requireEcrCap(req, res)) return
  res.json({
    configured: ecrConfigured(),
    mock: !ecrConfigured(),
    source: ecrConfigured() ? 'ecr_api' : 'attendance_local',
  })
})

router.get('/marcas', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const fecha = String(req.query.fecha || '')
  const pernr = String(req.query.pernrSupervisor || req.user.idExterno || req.user.usuario || '')
  if (!ecrConfigured()) {
    const fechaIso = parseEcrFecha(fecha)
    return res.json(await localOutOfRangeMarcas(req, fechaIso))
  }
  try {
    const q = new URLSearchParams({ pernrSupervisor: pernr, fecha })
    const r = await ecrFetch(`/api/v1/getMarcasFueraRango?${q}`)
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.get('/justificaciones', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  if (!ecrConfigured()) {
    return res.json({
      exito: true,
      data: [
        { idJustificacion: 1, justificacion: 'Error de geocerca' },
        { idJustificacion: 2, justificacion: 'Trabajo en cliente' },
        { idJustificacion: 3, justificacion: 'Visita temporal autorizada' },
      ],
      mock: true,
    })
  }
  try {
    const r = await ecrFetch('/api/v1/getJustificaciones')
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.get('/proyectos', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const { division, latRef, lngRef } = req.query
  if (!ecrConfigured()) {
    const places = await AttendancePlace.find({ tenantId: req.tenant._id, activo: true })
      .sort({ nombre: 1 })
      .limit(20)
      .lean()
    return res.json({
      exito: true,
      data: places.map((p, i) => ({
        idProyecto: i + 1,
        placeId: String(p._id),
        nombreProyecto: p.nombre,
        servicio: p.servicio || '',
      })),
      mock: true,
    })
  }
  try {
    const q = new URLSearchParams({
      division: String(division || ''),
      latRef: String(latRef || ''),
      lngRef: String(lngRef || ''),
    })
    const r = await ecrFetch(`/api/v1/getProyectos?${q}`)
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.post('/justificar', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const payload = req.body || {}
  if (!ecrConfigured()) {
    const punch = await resolvePunchFromPayload(req.tenant._id, payload)
    if (punch) {
      punch.justification =
        String(payload.justificacion || payload.motivo || 'Justificado por supervisor').slice(0, 1000)
      await punch.save()
    }
    await notifyWorkerByRut(
      req.tenant,
      payload.rutTrabajador,
      'Marca justificada',
      'Tu supervisor justific? una marca fuera de rango',
    )
    return res.json({
      exito: true,
      mock: true,
      mensaje: 'Justificaci?n registrada',
      punchId: punch ? String(punch._id) : null,
    })
  }
  try {
    const r = await ecrFetch('/api/v1/setJustificarFueraRangos', { method: 'POST', body: payload })
    if (r.ok || r.data?.exito) {
      await notifyWorkerByRut(
        req.tenant,
        payload.rutTrabajador,
        'Marca justificada',
        'Tu supervisor justific? una marca fuera de rango',
      )
    }
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.post('/anexo', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const payload = req.body || {}
  if (!ecrConfigured()) {
    const punch = await resolvePunchFromPayload(req.tenant._id, payload)
    let userId = punch?.userId
    if (!userId && payload.userId && ObjectId.isValid(payload.userId)) userId = payload.userId
    if (userId) {
      await AttendanceWarning.create({
        tenantId: req.tenant._id,
        userId,
        punchId: punch?._id || null,
        supervisorId: req.user._id,
        motivo: String(payload.motivo || 'Anexo por cambio de PDV').slice(0, 500),
        tipo: 'anexo',
      })
    }
    await notifyWorkerByRut(
      req.tenant,
      payload.rutTrabajador,
      'Anexo de contrato',
      'Se gener? un anexo por cambio de PDV',
    )
    return res.json({ exito: true, mock: true, mensaje: 'Anexo registrado' })
  }
  try {
    const r = await ecrFetch('/api/v1/setAnexoContratoFueraRango', { method: 'POST', body: payload })
    if (r.ok || r.data?.exito) {
      await notifyWorkerByRut(
        req.tenant,
        payload.rutTrabajador,
        'Anexo de contrato',
        'Se gener? un anexo por cambio de PDV',
      )
    }
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.post('/amonestar', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const payload = req.body || {}
  if (!ecrConfigured()) {
    const punch = await resolvePunchFromPayload(req.tenant._id, payload)
    let userId = punch?.userId
    if (!userId && payload.userId && ObjectId.isValid(payload.userId)) userId = payload.userId
    if (userId) {
      await AttendanceWarning.create({
        tenantId: req.tenant._id,
        userId,
        punchId: punch?._id || null,
        supervisorId: req.user._id,
        motivo: String(payload.motivo || 'Amonestaci?n por marca fuera de rango').slice(0, 500),
        tipo: 'amonestacion',
      })
    }
    await notifyWorkerByRut(
      req.tenant,
      payload.rutTrabajador,
      'Amonestaci?n registrada',
      'Tu supervisor registr? una amonestaci?n por marca fuera de rango',
    )
    return res.json({ exito: true, mock: true, mensaje: 'Amonestaci?n registrada' })
  }
  try {
    const r = await ecrFetch('/api/v1/setAmonestarFueraRango', { method: 'POST', body: payload })
    if (r.ok || r.data?.exito) {
      await notifyWorkerByRut(
        req.tenant,
        payload.rutTrabajador,
        'Amonestaci?n registrada',
        'Tu supervisor registr? una amonestaci?n por marca fuera de rango',
      )
    }
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

router.get('/domingos', async (req, res) => {
  if (!requireEcrCap(req, res)) return
  const pernr = String(req.query.pernrSupervisor || req.user.idExterno || req.user.usuario || '')
  if (!ecrConfigured()) {
    return res.json(await localDomingos(req))
  }
  try {
    const q = new URLSearchParams({ pernrSupervisor: pernr })
    const r = await ecrFetch(`/api/v1/getReporteDomingosAdicionales?${q}`)
    res.status(r.ok ? 200 : r.status).json(r.data)
  } catch (err) {
    res.status(502).json({ error: 'Error ECR', detail: err?.message })
  }
})

export default router
