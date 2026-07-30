/**
 * Seed demo asistencia / turnos / marcación (Ola 18).
 */
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import {
  AttendancePlace,
  AttendanceShift,
  AttendancePunch,
  AttendancePolicy,
} from '../models/Attendance.js'
import { ensureOla18MenuItems } from './ensureOla18Menu.js'
import { defaultAttendancePolicy, toDateKey } from './attendance.js'

const DEMO_PLACE = {
  codigo: 'HQ-ATT',
  nombre: 'Planta Central — Fichaje',
  lat: -34.6037,
  lng: -58.3816,
  radioMetros: 150,
  timezone: 'America/Argentina/Buenos_Aires',
  direccion: 'Av. Corrientes 1234, CABA',
  servicio: 'Retail CABA',
  objetivo: 'Cobertura sede central',
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ brandName?: string, userIds?: string[] }} [opts]
 */
export async function seedAttendanceForTenant(tenantId, { brandName, userIds } = {}) {
  await ensureOla18MenuItems(tenantId)

  const caps = new Set()
  const tenant = await Tenant.findById(tenantId)
  if (tenant) {
    for (const c of tenant.capabilities || []) caps.add(c)
    caps.add('asistencia')
    caps.add('asistencia.marcar')
    caps.add('asistencia.turnos')
    caps.add('asistencia.geopop')
    caps.add('asistencia.qr')
    caps.add('asistencia.ecr')
    tenant.capabilities = [...caps]
    tenant.menuVersion = (tenant.menuVersion || 0) + 1
    await tenant.save()
  }

  await AttendancePolicy.findOneAndUpdate(
    { tenantId },
    { $setOnInsert: { tenantId, ...defaultAttendancePolicy() } },
    { upsert: true, new: true },
  )

  let place = await AttendancePlace.findOne({ tenantId, codigo: DEMO_PLACE.codigo })
  if (!place) {
    place = await AttendancePlace.create({
      tenantId,
      ...DEMO_PLACE,
      nombre: brandName ? `${brandName} — Fichaje` : DEMO_PLACE.nombre,
      activo: true,
    })
  } else {
    Object.assign(place, {
      lat: DEMO_PLACE.lat,
      lng: DEMO_PLACE.lng,
      radioMetros: DEMO_PLACE.radioMetros,
      servicio: DEMO_PLACE.servicio,
      objetivo: DEMO_PLACE.objetivo,
      activo: true,
    })
    await place.save()
  }

  let place2 = await AttendancePlace.findOne({ tenantId, codigo: 'NORTE-ATT' })
  if (!place2) {
    place2 = await AttendancePlace.create({
      tenantId,
      codigo: 'NORTE-ATT',
      nombre: brandName ? `${brandName} — Norte` : 'Sucursal Norte — Fichaje',
      lat: -34.55,
      lng: -58.45,
      radioMetros: 120,
      timezone: DEMO_PLACE.timezone,
      direccion: 'Panamericana km 35',
      servicio: DEMO_PLACE.servicio,
      objetivo: 'Cobertura norte',
      activo: true,
    })
  }

  let members = []
  if (Array.isArray(userIds) && userIds.length) {
    members = await User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id').lean()
  }
  if (!members.length) {
    members = await User.find({ tenantId, activo: true, roles: 'member' })
      .select('_id')
      .limit(3)
      .lean()
  }
  if (!members.length) {
    members = await User.find({ tenantId, activo: true }).select('_id').limit(2).lean()
  }

  const today = toDateKey(new Date())
  let shiftsCreated = 0
  let punchesCreated = 0

  for (const u of members) {
    let shift = await AttendanceShift.findOne({
      tenantId,
      userId: u._id,
      fecha: today,
      estado: 'asignado',
    })
    if (!shift) {
      shift = await AttendanceShift.create({
        tenantId,
        userId: u._id,
        placeId: place._id,
        alternatePlaceIds: place2 ? [place2._id] : [],
        fecha: today,
        startTime: '09:00',
        endTime: '18:00',
        timezone: place.timezone,
        estado: 'asignado',
        notas: 'Turno demo Ola 18',
        servicio: place.servicio,
        objetivo: place.objetivo,
      })
      shiftsCreated++
    }

    const existingPunch = await AttendancePunch.findOne({
      tenantId,
      userId: u._id,
      shiftId: shift._id,
      kind: 'entrada',
    })
    if (!existingPunch && punchesCreated === 0) {
      await AttendancePunch.create({
        tenantId,
        userId: u._id,
        shiftId: shift._id,
        placeId: place._id,
        kind: 'entrada',
        mode: 'en_lugar',
        geoResult: 'in_range',
        distanceMetros: 12,
        gps: {
          lat: place.lat + 0.00005,
          lng: place.lng,
          accuracy: 15,
          capturedAt: new Date(),
          source: 'seed',
        },
        deviceClockAt: new Date(),
        serverReceivedAt: new Date(),
        timezone: place.timezone,
        channel: 'seed',
        idempotencyKey: `seed-entrada-${tenantId}-${u._id}-${today}`,
        actorId: u._id,
      })
      punchesCreated++
    }
  }

  return {
    placeId: String(place._id),
    shiftsCreated,
    punchesCreated,
    members: members.length,
    capabilities: [...caps],
  }
}
