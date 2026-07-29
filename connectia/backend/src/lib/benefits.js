/**
 * Helpers puros §18 Beneficios / billetera / recompensas.
 * Sin Mongo — testeable.
 */

export const BENEFIT_KINDS = ['benefit', 'reward']
export const BENEFIT_STATUSES = ['draft', 'published', 'archived']

export const BENEFIT_CATEGORIES = [
  { id: 'descuentos', label: 'Descuentos' },
  { id: 'salud', label: 'Salud y bienestar' },
  { id: 'gastronomia', label: 'Gastronomía' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'educacion', label: 'Educación' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'premios', label: 'Premios' },
  { id: 'otros', label: 'Otros' },
]

export const WALLET_TX_TYPES = [
  'credit',
  'debit',
  'redeem',
  'transfer_out',
  'transfer_in',
  'adjust',
  'withdraw',
]

export const WALLET_TX_STATUSES = ['pending', 'confirmed', 'failed', 'reversed']

export function kindLabel(kind) {
  return kind === 'reward' ? 'Premio' : 'Beneficio'
}

export function categoryLabel(id) {
  return BENEFIT_CATEGORIES.find((c) => c.id === id)?.label || id || 'Otros'
}

export function normalizeBenefitKind(raw) {
  return raw === 'reward' ? 'reward' : 'benefit'
}

export function normalizeBenefitStatus(raw) {
  return BENEFIT_STATUSES.includes(raw) ? raw : 'draft'
}

export function normalizeCategory(raw) {
  const id = String(raw || '').trim().toLowerCase()
  if (BENEFIT_CATEGORIES.some((c) => c.id === id)) return id
  return 'otros'
}

/** Vigencia + status published. */
export function isBenefitActiveNow(doc, now = new Date()) {
  if (!doc || doc.status !== 'published') return false
  if (doc.vigenciaDesde && new Date(doc.vigenciaDesde) > now) return false
  if (doc.vigenciaHasta && new Date(doc.vigenciaHasta) < now) return false
  return true
}

/** Cupo global / stock / límite por usuario. */
export function canRedeemBenefit(doc, { userRedeemCount = 0, now = new Date() } = {}) {
  if (!isBenefitActiveNow(doc, now)) {
    return { ok: false, reason: 'Beneficio no disponible' }
  }
  const stock = doc.stock
  if (stock != null && Number.isFinite(stock) && stock <= 0) {
    return { ok: false, reason: 'Sin stock' }
  }
  const cupo = doc.cupo
  if (cupo != null && Number.isFinite(cupo) && Number(doc.redeemCount || 0) >= cupo) {
    return { ok: false, reason: 'Cupo agotado' }
  }
  const lim = doc.limitePorUsuario
  if (lim != null && Number.isFinite(lim) && userRedeemCount >= lim) {
    return { ok: false, reason: 'Alcanzaste el límite de canjes' }
  }
  return { ok: true }
}

/**
 * Aplica un asiento al saldo (ledger).
 * amount > 0 siempre; el tipo determina el signo.
 * @returns {{ balanceAfter: number, signedAmount: number }}
 */
export function applyLedgerEntry(balanceBefore, type, amount) {
  const bal = Number(balanceBefore) || 0
  const amt = Math.abs(Number(amount) || 0)
  if (!Number.isFinite(amt) || amt <= 0) {
    const err = new Error('Monto inválido')
    err.status = 400
    throw err
  }
  if (!WALLET_TX_TYPES.includes(type)) {
    const err = new Error('Tipo de movimiento inválido')
    err.status = 400
    throw err
  }

  let signed = amt
  if (type === 'debit' || type === 'redeem' || type === 'transfer_out' || type === 'withdraw') {
    signed = -amt
  } else if (type === 'adjust') {
    // adjust puede ser positivo o negativo según amount sign — aquí amount ya es abs;
    // el caller debe usar credit/debit. Para adjust usamos amount con signo vía meta.
    signed = amt
  }

  const balanceAfter = bal + signed
  if (balanceAfter < 0) {
    const err = new Error('Saldo insuficiente')
    err.status = 400
    throw err
  }
  return { balanceAfter, signedAmount: signed }
}

/** Ajuste con signo explícito (admin). */
export function applyAdjust(balanceBefore, signedAmount) {
  const bal = Number(balanceBefore) || 0
  const delta = Number(signedAmount)
  if (!Number.isFinite(delta) || delta === 0) {
    const err = new Error('Ajuste inválido')
    err.status = 400
    throw err
  }
  const balanceAfter = bal + delta
  if (balanceAfter < 0) {
    const err = new Error('Saldo insuficiente')
    err.status = 400
    throw err
  }
  return { balanceAfter, signedAmount: delta }
}

export function serializeBenefit(doc, extras = {}) {
  if (!doc) return null
  const id = String(doc._id || doc.id)
  const kind = normalizeBenefitKind(doc.kind)
  return {
    id,
    kind,
    kindLabel: kindLabel(kind),
    titulo: doc.titulo || '',
    descripcion: doc.descripcion || '',
    condiciones: doc.condiciones || '',
    categoria: normalizeCategory(doc.categoria),
    categoriaLabel: categoryLabel(doc.categoria),
    imageUrl: doc.imageUrl || '',
    partnerName: doc.partnerName || '',
    partnerUrl: doc.partnerUrl || '',
    costoPuntos: doc.costoPuntos != null ? Number(doc.costoPuntos) : 0,
    stock: doc.stock == null ? null : Number(doc.stock),
    cupo: doc.cupo == null ? null : Number(doc.cupo),
    redeemCount: Number(doc.redeemCount || 0),
    limitePorUsuario: doc.limitePorUsuario == null ? null : Number(doc.limitePorUsuario),
    vigenciaDesde: doc.vigenciaDesde || null,
    vigenciaHasta: doc.vigenciaHasta || null,
    status: doc.status || 'draft',
    audience: doc.audience || { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    sucursal: doc.sucursal || '',
    lat: doc.lat ?? null,
    lng: doc.lng ?? null,
    destacado: Boolean(doc.destacado),
    orden: Number(doc.orden ?? 100),
    active: isBenefitActiveNow(doc),
    favorite: Boolean(extras.favorite),
    distanceKm: extras.distanceKm ?? null,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  }
}

export function serializeWalletTx(doc) {
  if (!doc) return null
  return {
    id: String(doc._id || doc.id),
    type: doc.type,
    status: doc.status,
    amount: Number(doc.amount || 0),
    signedAmount: Number(doc.signedAmount || 0),
    balanceAfter: Number(doc.balanceAfter || 0),
    currency: doc.currency || 'POINTS',
    concept: doc.concept || '',
    benefitId: doc.benefitId ? String(doc.benefitId) : null,
    counterpartyUserId: doc.counterpartyUserId ? String(doc.counterpartyUserId) : null,
    idempotencyKey: doc.idempotencyKey || '',
    createdAt: doc.createdAt || null,
  }
}

export function serializePartnerLink(doc) {
  if (!doc) return null
  return {
    id: String(doc._id || doc.id),
    titulo: doc.titulo || '',
    descripcion: doc.descripcion || '',
    url: doc.url || '',
    imageUrl: doc.imageUrl || '',
    orden: Number(doc.orden ?? 100),
    activo: doc.activo !== false,
  }
}

export function benefitsMeta() {
  return {
    kinds: BENEFIT_KINDS.map((k) => ({ id: k, label: kindLabel(k) })),
    categories: BENEFIT_CATEGORIES,
    statuses: BENEFIT_STATUSES,
  }
}

export function buildBenefitSearchFilter(q) {
  const term = String(q || '').trim()
  if (term.length < 2) return null
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return {
    $or: [{ titulo: re }, { descripcion: re }, { partnerName: re }, { categoria: re }, { condiciones: re }],
  }
}

/** Haversine km — null si faltan coords. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => Number.isFinite(Number(n)))) return null
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function applyBenefitPatch(doc, body = {}) {
  if (body.titulo !== undefined) {
    const t = String(body.titulo || '').trim()
    if (!t) {
      const err = new Error('titulo obligatorio')
      err.status = 400
      throw err
    }
    doc.titulo = t.slice(0, 160)
  }
  if (body.descripcion !== undefined) doc.descripcion = String(body.descripcion || '').slice(0, 4000)
  if (body.condiciones !== undefined) doc.condiciones = String(body.condiciones || '').slice(0, 4000)
  if (body.kind !== undefined) doc.kind = normalizeBenefitKind(body.kind)
  if (body.categoria !== undefined) doc.categoria = normalizeCategory(body.categoria)
  if (body.imageUrl !== undefined) doc.imageUrl = String(body.imageUrl || '').trim().slice(0, 500)
  if (body.partnerName !== undefined) doc.partnerName = String(body.partnerName || '').trim().slice(0, 120)
  if (body.partnerUrl !== undefined) doc.partnerUrl = String(body.partnerUrl || '').trim().slice(0, 500)
  if (body.costoPuntos !== undefined) {
    const n = Number(body.costoPuntos)
    doc.costoPuntos = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  }
  if (body.stock !== undefined) {
    if (body.stock === null || body.stock === '') doc.stock = null
    else {
      const n = Number(body.stock)
      doc.stock = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }
  }
  if (body.cupo !== undefined) {
    if (body.cupo === null || body.cupo === '') doc.cupo = null
    else {
      const n = Number(body.cupo)
      doc.cupo = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }
  }
  if (body.limitePorUsuario !== undefined) {
    if (body.limitePorUsuario === null || body.limitePorUsuario === '') doc.limitePorUsuario = null
    else {
      const n = Number(body.limitePorUsuario)
      doc.limitePorUsuario = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }
  }
  if (body.vigenciaDesde !== undefined) {
    doc.vigenciaDesde = body.vigenciaDesde ? new Date(body.vigenciaDesde) : null
  }
  if (body.vigenciaHasta !== undefined) {
    doc.vigenciaHasta = body.vigenciaHasta ? new Date(body.vigenciaHasta) : null
  }
  if (body.status !== undefined) doc.status = normalizeBenefitStatus(body.status)
  if (body.sucursal !== undefined) doc.sucursal = String(body.sucursal || '').trim().slice(0, 160)
  if (body.lat !== undefined) {
    const n = body.lat === null || body.lat === '' ? null : Number(body.lat)
    doc.lat = Number.isFinite(n) ? n : null
  }
  if (body.lng !== undefined) {
    const n = body.lng === null || body.lng === '' ? null : Number(body.lng)
    doc.lng = Number.isFinite(n) ? n : null
  }
  if (body.destacado !== undefined) doc.destacado = Boolean(body.destacado)
  if (body.orden !== undefined) {
    const n = Number(body.orden)
    doc.orden = Number.isFinite(n) ? n : 100
  }
  return doc
}

export function defaultBenefitSeed(brand = 'la empresa') {
  return [
    {
      kind: 'benefit',
      titulo: `Descuento en partner — ${brand}`,
      descripcion: 'Presentá tu credencial digital y obtené 15% en comercios adheridos.',
      condiciones: 'Válido para colaboradores activos. No acumulable con otras promociones.',
      categoria: 'descuentos',
      imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=900&q=80',
      costoPuntos: 0,
      status: 'published',
      destacado: true,
      orden: 10,
    },
    {
      kind: 'benefit',
      titulo: 'Gimnasio y bienestar',
      descripcion: 'Acceso preferencial a centros de bienestar con convenio corporativo.',
      condiciones: 'Cupo sujeto a disponibilidad. Consultá horarios en la ficha.',
      categoria: 'salud',
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
      costoPuntos: 0,
      status: 'published',
      orden: 20,
    },
    {
      kind: 'reward',
      titulo: 'Gift card café',
      descripcion: 'Canjeá puntos por una gift card de cafetería.',
      condiciones: 'Costo 500 puntos. Un canje por mes.',
      categoria: 'premios',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80',
      costoPuntos: 500,
      stock: 50,
      limitePorUsuario: 1,
      status: 'published',
      orden: 30,
    },
    {
      kind: 'reward',
      titulo: 'Día libre extra',
      descripcion: 'Canjeá puntos por media jornada libre (sujeto a aprobación de tu líder).',
      condiciones: 'Costo 2000 puntos. No aplica en fechas críticas del negocio.',
      categoria: 'premios',
      imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80',
      costoPuntos: 2000,
      stock: 10,
      limitePorUsuario: 1,
      status: 'published',
      orden: 40,
    },
  ]
}

/**
 * Normaliza ítems de carrito: [{ benefitId, cantidad }]
 * @returns {{ benefitId: string, cantidad: number }[]}
 */
export function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    const err = new Error('El carrito está vacío')
    err.status = 400
    throw err
  }
  const map = new Map()
  for (const row of rawItems) {
    const id = String(row?.benefitId || row?.id || '').trim()
    if (!id) continue
    const qty = Math.max(1, Math.floor(Number(row?.cantidad ?? row?.qty ?? 1)) || 1)
    map.set(id, (map.get(id) || 0) + qty)
  }
  if (!map.size) {
    const err = new Error('El carrito está vacío')
    err.status = 400
    throw err
  }
  if (map.size > 20) {
    const err = new Error('Máximo 20 beneficios distintos por canje')
    err.status = 400
    throw err
  }
  return [...map.entries()].map(([benefitId, cantidad]) => ({ benefitId, cantidad }))
}

/**
 * Calcula total de puntos del carrito dadas las fichas (docs lean).
 * @param {{ benefitId: string, cantidad: number }[]} items
 * @param {Map<string, object>} benefitById
 */
export function computeCartTotals(items, benefitById) {
  let totalPuntos = 0
  const lines = []
  for (const it of items) {
    const b = benefitById.get(it.benefitId)
    if (!b) {
      const err = new Error(`Beneficio no encontrado: ${it.benefitId}`)
      err.status = 404
      throw err
    }
    const unit = Number(b.costoPuntos || 0)
    const lineTotal = unit * it.cantidad
    totalPuntos += lineTotal
    lines.push({
      benefitId: it.benefitId,
      titulo: b.titulo || '',
      cantidad: it.cantidad,
      unitPuntos: unit,
      linePuntos: lineTotal,
    })
  }
  return { totalPuntos, lines }
}
