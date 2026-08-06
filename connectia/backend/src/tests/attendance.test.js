import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  distanceMeters,
  evaluatePunch,
  evaluateShiftWindow,
  normalizeAttendancePolicy,
  parseGps,
  toDateKey,
  defaultAttendancePolicy,
  punchesExportCsv,
} from '../lib/attendance.js'
import { OLA18_MENU_ITEMS } from '../lib/ensureOla18Menu.js'
import {
  aggregateSundayPunches,
  parseQrPayload,
  punchToEcrMarca,
} from '../lib/attendanceVertical.js'

describe('attendance geofence', () => {
  const place = { lat: -34.6037, lng: -58.3816, radioMetros: 150 }

  it('calcula distancia en metros', () => {
    const d = distanceMeters(place.lat, place.lng, place.lat, place.lng)
    assert.equal(d, 0)
    const far = distanceMeters(place.lat, place.lng, place.lat + 0.01, place.lng)
    assert.ok(far > 900)
  })

  it('marca en_lugar dentro del radio → in_range', () => {
    const gps = parseGps({ lat: place.lat + 0.0003, lng: place.lng, accuracy: 20 })
    const r = evaluatePunch({
      mode: 'en_lugar',
      place,
      gps,
      policy: defaultAttendancePolicy(),
    })
    assert.equal(r.ok, true)
    assert.equal(r.geoResult, 'in_range')
    assert.ok(r.distanceMetros < 150)
  })

  it('fuera de rango con política block → error', () => {
    const gps = parseGps({ lat: place.lat + 0.02, lng: place.lng, accuracy: 15 })
    const r = evaluatePunch({
      mode: 'en_lugar',
      place,
      gps,
      policy: { ...defaultAttendancePolicy(), fueraDeRango: 'block' },
    })
    assert.equal(r.ok, false)
    assert.equal(r.geoResult, 'out_of_range')
    assert.equal(r.status, 403)
  })

  it('fuera de rango con justify → ok + requiresJustification', () => {
    const gps = parseGps({ lat: place.lat + 0.02, lng: place.lng, accuracy: 15 })
    const r = evaluatePunch({
      mode: 'en_lugar',
      place,
      gps,
      policy: { ...defaultAttendancePolicy(), fueraDeRango: 'justify' },
    })
    assert.equal(r.ok, true)
    assert.equal(r.geoResult, 'out_of_range')
    assert.equal(r.requiresJustification, true)
  })

  it('sin GPS en modo en_lugar → no inventa coordenada', () => {
    const r = evaluatePunch({
      mode: 'en_lugar',
      place,
      gps: null,
      policy: defaultAttendancePolicy(),
    })
    assert.equal(r.ok, false)
    assert.equal(r.geoResult, 'no_gps')
  })

  it('accuracy pobre → accuracy_poor', () => {
    const gps = parseGps({ lat: place.lat, lng: place.lng, accuracy: 500 })
    const r = evaluatePunch({
      mode: 'en_lugar',
      place,
      gps,
      policy: { ...defaultAttendancePolicy(), minAccuracyMetros: 80 },
    })
    assert.equal(r.ok, false)
    assert.equal(r.geoResult, 'accuracy_poor')
  })

  it('modo libre no exige geocerca', () => {
    const r = evaluatePunch({
      mode: 'libre',
      place: null,
      gps: null,
      policy: defaultAttendancePolicy(),
    })
    assert.equal(r.ok, true)
    assert.equal(r.geoResult, 'not_required')
  })
})

describe('attendance policy & menu', () => {
  it('normaliza política', () => {
    const p = normalizeAttendancePolicy({ fueraDeRango: 'nope', minAccuracyMetros: 9999 })
    assert.equal(p.fueraDeRango, 'justify')
    assert.equal(p.minAccuracyMetros, 500)
  })

  it('toDateKey estable', () => {
    assert.equal(toDateKey('2026-07-29'), '2026-07-29')
  })

  it('menú Ola 18 tiene U y A', () => {
    assert.ok(OLA18_MENU_ITEMS.some((i) => i.route === '/mi-asistencia' && i.channel === 'u'))
    assert.ok(OLA18_MENU_ITEMS.some((i) => i.route === '/asistencia' && i.channel === 'a'))
  })
})

describe('attendance window & temporal', () => {
  it('rechaza fuera de ventana con tolerancia', () => {
    const shift = { fecha: '2026-07-29', startTime: '09:00', endTime: '18:00' }
    const early = evaluateShiftWindow({
      shift,
      now: new Date(2026, 6, 29, 7, 0, 0),
      policy: { toleranciaHorariaMin: 15 },
    })
    assert.equal(early.ok, false)
    assert.equal(early.outsideWindow, true)

    const ok = evaluateShiftWindow({
      shift,
      now: new Date(2026, 6, 29, 9, 10, 0),
      policy: { toleranciaHorariaMin: 15 },
    })
    assert.equal(ok.ok, true)
    assert.ok(ok.lateMinutes >= 10)
  })

  it('modo temporal setea expiresAt', () => {
    const now = new Date('2026-07-29T12:00:00.000Z')
    const r = evaluatePunch({
      mode: 'temporal',
      place: { lat: -34.6, lng: -58.4, radioMetros: 200 },
      gps: parseGps({ lat: -34.6, lng: -58.4, accuracy: 10 }),
      policy: { ...defaultAttendancePolicy(), temporalVigenciaMin: 30 },
      now,
    })
    assert.equal(r.ok, true)
    assert.ok(r.expiresAt instanceof Date)
    assert.equal(r.expiresAt.getTime() - now.getTime(), 30 * 60_000)
  })

  it('export CSV escapa comillas', () => {
    const csv = punchesExportCsv([
      {
        id: '1',
        userName: 'Ana "Boss"',
        kind: 'entrada',
        mode: 'en_lugar',
        geoResult: 'in_range',
        distanceMetros: 5,
        lateMinutes: 0,
        earlyMinutes: 0,
        place: { nombre: 'HQ' },
        justification: '',
        serverReceivedAt: '2026-07-29',
        expiresAt: '',
        channel: 'app',
      },
    ])
    assert.match(csv, /Ana ""Boss""/)
    assert.match(csv, /^id,usuario/)
  })
})

describe('attendance vertical helpers', () => {
  it('parsea payload QR', () => {
    assert.equal(parseQrPayload('connectia-att:abcdef0123456789abcdef0123456789'), 'abcdef0123456789abcdef0123456789')
    assert.equal(parseQrPayload('nope'), null)
  })

  it('agrega domingos del mes', () => {
    const punches = [
      { userId: 'u1', serverReceivedAt: new Date(2026, 6, 5, 10, 0, 0) }, // domingo julio
      { userId: 'u1', serverReceivedAt: new Date(2026, 6, 12, 10, 0, 0) },
      { userId: 'u1', serverReceivedAt: new Date(2026, 6, 6, 10, 0, 0) }, // lunes — ignore
    ]
    const rows = aggregateSundayPunches(punches, {
      year: 2026,
      month: 7,
      expectedPerUser: 3,
      users: new Map([['u1', { nombre: 'Ana', apellido: 'Perez' }]]),
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].domEntregados, 2)
    assert.equal(rows[0].domPorEntregar, 1)
  })

  it('mapea punch a fila ECR', () => {
    const row = punchToEcrMarca(
      {
        _id: 'p1',
        userId: 'u1',
        kind: 'entrada',
        distanceMetros: 200,
        lateMinutes: 5,
        serverReceivedAt: new Date(2026, 6, 29, 9, 15, 0),
        gps: { lat: -34.6, lng: -58.4 },
        justification: '',
        geoResult: 'out_of_range',
      },
      {
        user: { nombre: 'Juan', apellido: 'Perez', dni: '30111222' },
        place: { nombre: 'HQ', servicio: 'Retail' },
        shift: { startTime: '09:00', endTime: '18:00' },
      },
    )
    assert.equal(row.punchId, 'p1')
    assert.equal(row.accJustificar, true)
    assert.match(row.mFueraRango, /200/)
  })
})
