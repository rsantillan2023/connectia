import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyLedgerEntry,
  applyAdjust,
  canRedeemBenefit,
  isBenefitActiveNow,
  isBenefitInSchedule,
  serializeBenefit,
  serializeWalletTx,
  applyBenefitPatch,
  buildBenefitSearchFilter,
  kindLabel,
  walletTxKindLabel,
  summarizeEarnedByWindows,
  defaultBenefitSeed,
  defaultPartnerSeed,
  distanceKm,
  normalizeCartItems,
  computeCartTotals,
  inferOfferType,
  applyOfferTypeToDoc,
  offerTypeLabel,
  resolveOfferTypes,
  normalizeBenefitsConfig,
  resolveCategories,
  normalizeCategoriesInput,
  slugCategoryId,
  categoryLabel,
  benefitDirectionsUrl,
  benefitMapsPinUrl,
  simulateBenefitEligibility,
  resolveBenefitLocations,
} from '../lib/benefits.js'

describe('benefits ledger', () => {
  it('crédito y débito actualizan balance', () => {
    const c = applyLedgerEntry(100, 'credit', 50)
    assert.equal(c.balanceAfter, 150)
    assert.equal(c.signedAmount, 50)
    const d = applyLedgerEntry(150, 'redeem', 40)
    assert.equal(d.balanceAfter, 110)
    assert.equal(d.signedAmount, -40)
  })

  it('rechaza saldo insuficiente', () => {
    assert.throws(() => applyLedgerEntry(10, 'debit', 20), /Saldo insuficiente/)
  })

  it('ajuste con signo', () => {
    const a = applyAdjust(100, -30)
    assert.equal(a.balanceAfter, 70)
    assert.throws(() => applyAdjust(10, -20), /Saldo insuficiente/)
  })

  it('etiqueta acreditación y desacreditación', () => {
    assert.equal(walletTxKindLabel('credit', 50), 'Acreditación')
    assert.equal(walletTxKindLabel('adjust', -20), 'Desacreditación')
    assert.equal(walletTxKindLabel('adjust', 10), 'Ajuste')
    assert.equal(walletTxKindLabel('redeem', -40), 'Canje')
  })

  it('serializeWalletTx incluye kindLabel', () => {
    const tx = serializeWalletTx({
      _id: '507f1f77bcf86cd799439011',
      type: 'adjust',
      status: 'confirmed',
      amount: 25,
      signedAmount: -25,
      balanceAfter: 75,
      concept: 'Corrección',
      createdAt: new Date('2026-08-03T12:00:00Z'),
    })
    assert.equal(tx.kindLabel, 'Desacreditación')
    assert.equal(tx.signedAmount, -25)
  })

  it('resume puntos sumados por ventanas', () => {
    const now = new Date('2026-08-03T12:00:00Z')
    const txs = [
      { signedAmount: 100, status: 'confirmed', createdAt: '2026-08-01T10:00:00Z' },
      { signedAmount: 50, status: 'confirmed', createdAt: '2026-07-10T10:00:00Z' },
      { signedAmount: 200, status: 'confirmed', createdAt: '2026-06-01T10:00:00Z' },
      { signedAmount: -30, status: 'confirmed', createdAt: '2026-08-02T10:00:00Z' },
      { signedAmount: 10, status: 'pending', createdAt: '2026-08-02T10:00:00Z' },
    ]
    const rows = summarizeEarnedByWindows(txs, now)
    assert.equal(rows.find((r) => r.id === '7d')?.points, 100)
    assert.equal(rows.find((r) => r.id === '30d')?.points, 150)
    assert.equal(rows.find((r) => r.id === '60d')?.points, 150)
    assert.equal(rows.find((r) => r.id === '6m')?.points, 350)
  })
})

describe('benefits eligibility', () => {
  it('vigencia y cupo', () => {
    const now = new Date('2026-07-28T12:00:00Z')
    assert.equal(isBenefitActiveNow({ status: 'published' }, now), true)
    assert.equal(isBenefitActiveNow({ status: 'draft' }, now), false)
    assert.equal(
      isBenefitActiveNow({ status: 'published', vigenciaHasta: new Date('2026-01-01') }, now),
      false,
    )

    const ok = canRedeemBenefit(
      { status: 'published', stock: 2, cupo: 10, redeemCount: 3, limitePorUsuario: 2 },
      { userRedeemCount: 1, now },
    )
    assert.equal(ok.ok, true)

    const stock = canRedeemBenefit({ status: 'published', stock: 0 }, { now })
    assert.equal(stock.ok, false)

    const lim = canRedeemBenefit(
      { status: 'published', limitePorUsuario: 1 },
      { userRedeemCount: 1, now },
    )
    assert.equal(lim.ok, false)
  })

  it('días, horario y sede', () => {
    // jueves 2026-07-30 15:00 local (depende de TZ; usamos Date con componentes)
    const thu = new Date(2026, 6, 30, 15, 0, 0)
    assert.equal(thu.getDay(), 4)
    assert.equal(
      isBenefitInSchedule({ daysOfWeek: [4], timeFrom: '09:00', timeTo: '18:00' }, thu),
      true,
    )
    assert.equal(
      isBenefitInSchedule({ daysOfWeek: [1], timeFrom: '09:00', timeTo: '18:00' }, thu),
      false,
    )
    assert.equal(
      isBenefitInSchedule({ timeFrom: '16:00', timeTo: '18:00' }, thu),
      false,
    )
    const sedeOk = canRedeemBenefit(
      { status: 'published', requireUserSede: true, sucursal: 'Centro', locations: [] },
      { user: { sede: 'Centro' }, now: thu },
    )
    assert.equal(sedeOk.ok, true)
    const sedeBad = canRedeemBenefit(
      { status: 'published', requireUserSede: true, sucursal: 'Centro' },
      { user: { sede: 'Norte' }, now: thu },
    )
    assert.equal(sedeBad.ok, false)
  })

  it('límites por día y simulador', () => {
    const now = new Date('2026-07-28T12:00:00')
    const day = canRedeemBenefit(
      { status: 'published', limitePorDia: 1 },
      { userRedeemCountDay: 1, now },
    )
    assert.equal(day.ok, false)
    const sim = simulateBenefitEligibility(
      { status: 'published', daysOfWeek: [2], timeFrom: '10:00', timeTo: '11:00' },
      { now },
    )
    assert.equal(sim.ok, false)
    const locs = resolveBenefitLocations({
      locations: [{ id: 'a', name: 'Norte', lat: -34.5, lng: -58.4, stock: 3 }],
    })
    assert.equal(locs.length, 1)
    assert.equal(locs[0].name, 'Norte')
  })
})

describe('benefits serialize / patch', () => {
  it('serialize y labels', () => {
    assert.equal(kindLabel('reward'), 'Premio')
    const s = serializeBenefit({
      _id: '507f1f77bcf86cd799439011',
      kind: 'reward',
      titulo: 'Gift',
      categoria: 'premios',
      status: 'published',
      costoPuntos: 500,
    })
    assert.equal(s.kindLabel, 'Premio')
    assert.equal(s.offerType, 'premio')
    assert.equal(s.offerTypeLabel, 'Premio / recompensa')
    assert.equal(s.statusLabel, 'Publicado')
    assert.equal(s.categoriaLabel, 'Premios')
    assert.equal(s.active, true)
    assert.equal(s.directionsUrl, '')
    assert.equal(s.displayTitle, 'Gift')
    assert.equal(s.nombreComercial, '')

    const branded = serializeBenefit({
      _id: '507f1f77bcf86cd799439013',
      kind: 'benefit',
      titulo: '10% reintegro combustible',
      nombreComercial: 'Puma Energy',
      status: 'published',
    })
    assert.equal(branded.displayTitle, 'Puma Energy')
    assert.equal(branded.nombreComercial, 'Puma Energy')

    const geo = serializeBenefit({
      _id: '507f1f77bcf86cd799439012',
      kind: 'benefit',
      titulo: 'Farmacia',
      status: 'published',
      lat: -34.6,
      lng: -58.4,
      sucursal: 'Centro',
    })
    assert.equal(geo.hasLocation, true)
    assert.ok(geo.directionsUrl.includes('maps/dir'))
    assert.ok(geo.mapsUrl.includes('maps/search'))
  })

  it('applyBenefitPatch valida titulo', () => {
    const doc = { titulo: 'X' }
    assert.throws(() => applyBenefitPatch(doc, { titulo: '  ' }))
    applyBenefitPatch(doc, { titulo: 'Nuevo', nombreComercial: 'Marca X', costoPuntos: 12.7, stock: 3 })
    assert.equal(doc.titulo, 'Nuevo')
    assert.equal(doc.nombreComercial, 'Marca X')
    assert.equal(doc.costoPuntos, 12)
    assert.equal(doc.stock, 3)
  })

  it('offerType tipología legado', () => {
    assert.equal(inferOfferType({ kind: 'reward', costoPuntos: 100 }), 'premio')
    assert.equal(inferOfferType({ partnerUrl: 'https://x' }), 'partner')
    assert.equal(inferOfferType({ lat: -34, lng: -58 }), 'geo')
    assert.equal(inferOfferType({ costoPuntos: 50 }), 'canjeable')
    assert.equal(inferOfferType({ costoPuntos: 0 }), 'informativo')
    assert.equal(offerTypeLabel('geo'), 'Con ubicación')
    assert.equal(
      offerTypeLabel('geo', { benefitsConfig: { offerTypes: { geo: { label: 'Sucursales' } } } }),
      'Sucursales',
    )
    const resolved = resolveOfferTypes({
      benefitsConfig: { offerTypes: [{ id: 'premio', label: 'Premios club', hint: 'Canjeá puntos' }] },
    })
    assert.equal(resolved.find((t) => t.id === 'premio')?.label, 'Premios club')
    assert.equal(resolved.find((t) => t.id === 'informativo')?.label, 'Informativo / convenio')
    const cfg = normalizeBenefitsConfig({ offerTypes: { canjeable: { label: '  ', hint: 'x' } } })
    assert.equal(cfg.offerTypes.canjeable.label, 'Canjeable con puntos')

    const doc = { titulo: 'A', costoPuntos: 0 }
    applyOfferTypeToDoc(doc, 'premio')
    assert.equal(doc.offerType, 'premio')
    assert.equal(doc.kind, 'reward')
    assert.ok(doc.costoPuntos > 0)

    applyBenefitPatch(doc, { offerType: 'informativo', costoPuntos: 99 })
    assert.equal(doc.offerType, 'informativo')
    assert.equal(doc.costoPuntos, 0)
    assert.equal(doc.kind, 'benefit')
  })

  it('Google Maps Directions URL', () => {
    const dir = benefitDirectionsUrl({ lat: -34.6, lng: -58.4, titulo: 'Farmacia' })
    assert.ok(dir.includes('google.com/maps/dir/'))
    assert.ok(dir.includes('destination=-34.6%2C-58.4') || dir.includes('destination=-34.6,-58.4'))
    assert.ok(dir.includes('travelmode=driving'))

    const withOrigin = benefitDirectionsUrl(
      { lat: -34.6, lng: -58.4 },
      { originLat: -34.5, originLng: -58.5 },
    )
    assert.ok(withOrigin.includes('origin='))

    const byPlace = benefitDirectionsUrl({ sucursal: 'Sucursal Centro' })
    assert.ok(byPlace.includes('destination=Sucursal'))

    assert.equal(benefitDirectionsUrl({}), '')
    assert.ok(benefitMapsPinUrl({ lat: -34, lng: -58 }).includes('maps/search'))
  })

  it('search filter', () => {
    assert.equal(buildBenefitSearchFilter('a'), null)
    assert.ok(buildBenefitSearchFilter('cafe').$or.length >= 3)
  })
})

describe('benefits categories config', () => {
  it('defaults y custom CRUD', () => {
    const defs = resolveCategories({})
    assert.ok(defs.length >= 5)
    assert.ok(defs.every((c) => c.id && c.label && c.emoji))
    assert.ok(defs.every((c) => typeof c.example === 'string'))

    const custom = normalizeCategoriesInput([
      { label: 'Club Viajes', emoji: '✈️', example: 'Paquetes a la costa' },
      { id: 'salud', label: 'Salud plus' },
    ])
    assert.ok(custom.some((c) => c.id === 'club_viajes' && c.emoji === '✈️' && c.example === 'Paquetes a la costa'))
    assert.ok(custom.some((c) => c.id === 'salud' && c.label === 'Salud plus' && c.example))
    assert.ok(custom.some((c) => c.id === 'otros'))

    const cfg = normalizeBenefitsConfig({
      categories: custom,
      offerTypes: { geo: { label: 'Mapa', hint: 'x' } },
    })
    assert.equal(cfg.offerTypes.geo.label, 'Mapa')
    assert.ok(cfg.categories.some((c) => c.id === 'club_viajes'))
    assert.equal(categoryLabel('club_viajes', { benefitsConfig: cfg }), 'Club Viajes')
    assert.equal(slugCategoryId('¡Hola Mundo!'), 'hola_mundo')
  })
})

describe('benefits seed', () => {
  it('defaults con marca, tipología completa y casuísticas', () => {
    const rows = defaultBenefitSeed('Acme')
    assert.ok(rows.length >= 18)
    assert.ok(rows.some((r) => r.kind === 'reward' && r.costoPuntos > 0))
    assert.ok(rows.some((r) => r.kind === 'benefit'))
    for (const t of ['informativo', 'canjeable', 'premio', 'geo', 'partner']) {
      const ofType = rows.filter((r) => r.offerType === t)
      assert.ok(ofType.length >= 3, `offerType ${t} necesita ≥3 (tiene ${ofType.length})`)
      const published = ofType.filter((r) => r.status === 'published')
      assert.ok(published.length >= 3, `offerType ${t} necesita ≥3 published (tiene ${published.length})`)
    }
    for (const s of ['published', 'draft', 'archived']) {
      assert.ok(rows.some((r) => r.status === s), `falta status ${s}`)
    }
    assert.ok(rows.some((r) => r.destacado === true))
    assert.ok(rows.some((r) => r.partnerUrl))
    assert.ok(rows.some((r) => Array.isArray(r.locations) && r.locations.length > 1))
    assert.ok(rows.some((r) => r.requireUserSede === true))
    assert.ok(rows.some((r) => r.allowWaitlist === true))
    assert.ok(rows.some((r) => r.limitePorDia != null))
    assert.ok(rows.some((r) => Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0))
    assert.ok(rows.some((r) => /Acme/.test(r.titulo) || /Acme/.test(r.nombreComercial || '')))
    const cats = new Set(rows.map((r) => r.categoria))
    assert.ok(cats.size >= 5, 'cubre varias categorías')
  })

  it('empresas asociadas seed trae varias', () => {
    const rows = defaultPartnerSeed('Acme')
    assert.ok(rows.length >= 5)
    assert.ok(rows.every((r) => r.titulo && r.url))
    assert.ok(rows.some((r) => /Acme/.test(r.titulo)))
  })
})

describe('benefits cart', () => {
  it('normalizeCartItems agrupa y valida', () => {
    const items = normalizeCartItems([
      { benefitId: 'a', cantidad: 2 },
      { benefitId: 'a', cantidad: 1 },
      { benefitId: 'b', qty: 1 },
    ])
    assert.equal(items.find((i) => i.benefitId === 'a').cantidad, 3)
    assert.throws(() => normalizeCartItems([]), /vacío/)
  })

  it('computeCartTotals suma puntos', () => {
    const map = new Map([
      ['a', { titulo: 'X', costoPuntos: 100 }],
      ['b', { titulo: 'Y', costoPuntos: 50 }],
    ])
    const { totalPuntos, lines } = computeCartTotals(
      [
        { benefitId: 'a', cantidad: 2 },
        { benefitId: 'b', cantidad: 1 },
      ],
      map,
    )
    assert.equal(totalPuntos, 250)
    assert.equal(lines.length, 2)
  })

  it('withdraw debita saldo', () => {
    const w = applyLedgerEntry(500, 'withdraw', 120)
    assert.equal(w.balanceAfter, 380)
    assert.equal(w.signedAmount, -120)
  })
})

describe('benefits AI draft', () => {
  it('heurística infiere canjeable y arma campos', async () => {
    const { draftBenefitHeuristic, searchBenefitImages, draftBenefitCopy } = await import(
      '../services/benefitsAi.js'
    )
    const h = draftBenefitHeuristic({
      prompt: 'Canje de 150 puntos por almuerzo en el comedor',
      brand: 'Demo',
    })
    assert.equal(h.offerType, 'canjeable')
    assert.ok(h.titulo)
    assert.ok(h.descripcion)
    assert.ok(h.costoPuntos > 0)
    assert.equal(h.source, 'heuristic')

    const images = await searchBenefitImages('farmacia descuento', 'salud')
    assert.ok(/^https?:\/\//i.test(images.imageUrl))
    assert.ok(images.imageCandidates.length >= 1)

    const draft = await draftBenefitCopy({
      prompt: 'Premio gift card 500 puntos',
      brand: 'Demo',
      findImage: true,
    })
    assert.equal(draft.offerType, 'premio')
    assert.ok(draft.imageUrl)
  })
})
