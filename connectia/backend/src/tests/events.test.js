import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateEventDates,
  cupoRestante,
  canConfirmRsvp,
  serializeEvent,
  applyEventPatch,
  EVENT_TIPOS,
  rsvpRowsToCsv,
} from '../lib/event.js'
import {
  encryptSecret,
  decryptSecret,
  generatePkce,
  signOAuthState,
  verifyOAuthState,
} from '../lib/calendarCrypto.js'
import { OLA15_MENU_ITEMS } from '../lib/ensureOla15Menu.js'
import { providerConfigured, PROVIDERS } from '../lib/calendarOAuth.js'
import {
  heuristicEventDraft,
  heuristicExtractFromText,
  suggestScheduleSlots,
  heuristicTodaySummary,
  eventAiConfigured,
} from '../services/eventAi.js'

describe('event lib', () => {
  it('validateEventDates', () => {
    const a = new Date('2026-08-01T10:00:00Z')
    const b = new Date('2026-08-01T12:00:00Z')
    assert.equal(validateEventDates(a, b).ok, true)
    assert.equal(validateEventDates(b, a).ok, false)
    assert.equal(validateEventDates(null, b).ok, false)
  })

  it('cupoRestante y canConfirmRsvp', () => {
    const ev = { cupo: 2, rsvpConfirmados: 1, status: 'published' }
    assert.equal(cupoRestante(ev), 1)
    assert.equal(canConfirmRsvp(ev, 2).ok, false)
    assert.equal(canConfirmRsvp(ev, 2, 'confirmado').ok, true)
    assert.equal(canConfirmRsvp({ ...ev, status: 'draft' }, 0).ok, false)
  })

  it('serializeEvent', () => {
    const doc = {
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      titulo: 'Kickoff',
      tipo: 'reunion',
      inicio: new Date('2026-08-01T15:00:00Z'),
      fin: new Date('2026-08-01T16:00:00Z'),
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      rsvpConfirmados: 3,
    }
    const s = serializeEvent(doc, {
      rsvp: { estado: 'confirmado', confirmedAt: new Date('2026-07-28T12:00:00Z') },
    })
    assert.equal(s.titulo, 'Kickoff')
    assert.equal(s.origin, 'CORPORATE')
    assert.equal(s.rsvp.estado, 'confirmado')
    assert.equal(s.tipoLabel, 'Reunión')
  })

  it('applyEventPatch valida fechas', () => {
    const doc = {
      titulo: 'X',
      inicio: new Date('2026-08-01T10:00:00Z'),
      fin: new Date('2026-08-01T12:00:00Z'),
      status: 'draft',
      audience: { mode: 'all' },
      media: [],
    }
    applyEventPatch(doc, { titulo: 'Nuevo', tipo: 'celebracion' })
    assert.equal(doc.titulo, 'Nuevo')
    assert.equal(doc.tipo, 'celebracion')
    assert.throws(() => applyEventPatch(doc, { fin: '2026-07-01T00:00:00Z' }), /fin/)
  })

  it('EVENT_TIPOS cubre catálogo', () => {
    assert.ok(EVENT_TIPOS.includes('general'))
    assert.ok(EVENT_TIPOS.includes('capacitacion'))
  })

  it('rsvpRowsToCsv escapa comillas', () => {
    const csv = rsvpRowsToCsv([
      { nombre: 'Ana "Torres"', usuario: 'ana', email: 'a@x.com', estado: 'confirmado', confirmedAt: '2026-07-28' },
    ])
    assert.match(csv, /Ana ""Torres""/)
    assert.match(csv, /nombre,usuario,email/)
  })
})

describe('eventAi', () => {
  it('heuristicEventDraft detecta capacitación y cupo', () => {
    const d = heuristicEventDraft('Capacitación seguridad para 40 personas en planta Arroyito', {
      brandName: 'Arcor',
    })
    assert.equal(d.tipo, 'capacitacion')
    assert.equal(d.cupo, 40)
    assert.ok(d.titulo)
    assert.ok(d.inicio)
  })

  it('heuristicExtractFromText usa primera línea como título', () => {
    const d = heuristicExtractFromText('Town hall Q3\n\nResultados del trimestre.')
    assert.equal(d.titulo, 'Town hall Q3')
    assert.match(d.descripcion, /Resultados/)
  })

  it('suggestScheduleSlots evita busy', () => {
    const start = new Date()
    start.setUTCDate(start.getUTCDate() + 2)
    while (start.getUTCDay() === 0 || start.getUTCDay() === 6) start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(15, 0, 0, 0)
    const end = new Date(start.getTime() + 3600000)
    const { slots } = suggestScheduleSlots({
      busyItems: [{ inicio: start.toISOString(), fin: end.toISOString() }],
      durationHours: 1,
      preferHourUTC: 15,
      daysToScan: 12,
    })
    assert.ok(slots.length >= 1)
    assert.ok(!slots.some((s) => s.inicio === start.toISOString()))
  })

  it('heuristicTodaySummary vacío y con items', () => {
    assert.match(heuristicTodaySummary([]).text, /no tenés/i)
    const s = heuristicTodaySummary([
      {
        titulo: 'Kickoff',
        inicio: '2026-08-01T15:00:00.000Z',
        allDay: false,
        origin: 'CORPORATE',
        lugar: 'HQ',
      },
    ])
    assert.equal(s.count, 1)
    assert.match(s.text, /Kickoff/)
  })

  it('eventAiConfigured es boolean', () => {
    assert.equal(typeof eventAiConfigured(), 'boolean')
  })
})

describe('calendarCrypto', () => {
  it('encrypt/decrypt roundtrip', () => {
    const plain = 'ya29.a0AfH6SMB-secret-token'
    const enc = encryptSecret(plain)
    assert.notEqual(enc, plain)
    assert.equal(decryptSecret(enc), plain)
  })

  it('pkce + state', () => {
    const { verifier, challenge } = generatePkce()
    assert.ok(verifier.length > 20)
    assert.ok(challenge.length > 20)
    const state = signOAuthState({ provider: 'GOOGLE', userId: 'u1', tenantId: 't1', verifier })
    const parsed = verifyOAuthState(state)
    assert.equal(parsed.provider, 'GOOGLE')
    assert.equal(parsed.verifier, verifier)
    assert.equal(verifyOAuthState('bad.state'), null)
  })
})

describe('calendarOAuth', () => {
  it('PROVIDERS y configured sin env', () => {
    assert.deepEqual(PROVIDERS, ['OUTLOOK', 'GOOGLE'])
    // Sin env, no configurado (ok)
    assert.equal(typeof providerConfigured('OUTLOOK'), 'boolean')
  })
})

describe('ensureOla15Menu', () => {
  it('tiene Agenda U y Eventos A', () => {
    const keys = OLA15_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('agenda'))
    assert.ok(keys.includes('admin.eventos'))
    assert.equal(OLA15_MENU_ITEMS.find((i) => i.key === 'agenda').route, '/agenda')
  })
})
