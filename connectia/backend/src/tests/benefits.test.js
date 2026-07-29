import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyLedgerEntry,
  applyAdjust,
  canRedeemBenefit,
  isBenefitActiveNow,
  serializeBenefit,
  applyBenefitPatch,
  buildBenefitSearchFilter,
  kindLabel,
  defaultBenefitSeed,
  distanceKm,
  normalizeCartItems,
  computeCartTotals,
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
    assert.equal(s.categoriaLabel, 'Premios')
    assert.equal(s.active, true)
  })

  it('applyBenefitPatch valida titulo', () => {
    const doc = { titulo: 'X' }
    assert.throws(() => applyBenefitPatch(doc, { titulo: '  ' }))
    applyBenefitPatch(doc, { titulo: 'Nuevo', costoPuntos: 12.7, stock: 3 })
    assert.equal(doc.titulo, 'Nuevo')
    assert.equal(doc.costoPuntos, 12)
    assert.equal(doc.stock, 3)
  })

  it('search filter', () => {
    assert.equal(buildBenefitSearchFilter('a'), null)
    assert.ok(buildBenefitSearchFilter('cafe').$or.length >= 3)
  })
})

describe('benefits seed', () => {
  it('defaults con marca y al menos un reward', () => {
    const rows = defaultBenefitSeed('Acme')
    assert.ok(rows.length >= 3)
    assert.ok(rows.some((r) => r.kind === 'reward' && r.costoPuntos > 0))
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
