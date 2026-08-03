/**
 * Helpers puros §18 Beneficios / billetera / recompensas.
 * Sin Mongo — testeable.
 */

import { isArgentinaHoliday } from '../services/arHolidays.js'

export const BENEFIT_KINDS = ['benefit', 'reward']
export const BENEFIT_STATUSES = ['draft', 'published', 'archived']
export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Tipología producto (admin wizard · paridad legado). */
export const BENEFIT_OFFER_TYPES = [
  {
    id: 'informativo',
    label: 'Informativo / convenio',
    hint: 'Descuento o perk sin gastar puntos. Solo lectura y condiciones.',
    kind: 'benefit',
  },
  {
    id: 'canjeable',
    label: 'Canjeable con puntos',
    hint: 'Se canjea con puntos: código/QR, stock y cupos.',
    kind: 'benefit',
  },
  {
    id: 'premio',
    label: 'Premio / recompensa',
    hint: 'Catálogo de premios canjeables (gift card, día libre…).',
    kind: 'reward',
  },
  {
    id: 'geo',
    label: 'Con ubicación',
    hint: 'Sucursal o punto en el mapa de la app.',
    kind: 'benefit',
  },
  {
    id: 'partner',
    label: 'Link / empresa asociada',
    hint: 'Abre URL de una empresa asociada; ideal con imagen y nombre.',
    kind: 'benefit',
  },
]

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

const OFFER_TYPE_IDS = BENEFIT_OFFER_TYPES.map((t) => t.id)

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

export function statusLabel(status) {
  if (status === 'published') return 'Publicado'
  if (status === 'archived') return 'Archivado'
  return 'Borrador'
}

const DEFAULT_CATEGORY_EMOJI = {
  gastronomia: '🍔',
  descuentos: '🛒',
  salud: '💊',
  transporte: '⛽',
  educacion: '📚',
  tecnologia: '📱',
  premios: '🎁',
  otros: '🍿',
}

const DEFAULT_CATEGORY_EXAMPLE = {
  descuentos: '15% en supermercados adheridos',
  salud: 'Gimnasio y óptica con convenio',
  gastronomia: 'Menú del día en el comedor',
  transporte: 'Nafta y movilidad corporativa',
  educacion: 'Cursos e idiomas online',
  tecnologia: 'Notebooks y auriculares',
  premios: 'Gift cards y días libres',
  otros: 'Merchandising y extras',
}

export function defaultCategoryEmoji(id) {
  return DEFAULT_CATEGORY_EMOJI[id] || '🏷️'
}

export function defaultCategoryExample(id) {
  return DEFAULT_CATEGORY_EXAMPLE[id] || 'Beneficios de esta categoría'
}

export function slugCategoryId(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return base || 'categoria'
}

function mapCategoryRow(c) {
  return {
    id: c.id,
    label: c.label,
    emoji: defaultCategoryEmoji(c.id),
    example: defaultCategoryExample(c.id),
  }
}

export function normalizeCategoriesInput(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    return BENEFIT_CATEGORIES.map(mapCategoryRow)
  }
  const seen = new Set()
  const out = []
  for (const row of raw) {
    if (!row) continue
    let id = String(row.id || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 40)
    const label = String(row.label || '').trim().slice(0, 80)
    if (!label && !id) continue
    if (!id) id = slugCategoryId(label)
    let unique = id
    let n = 2
    while (seen.has(unique)) {
      unique = `${id}_${n++}`.slice(0, 40)
    }
    seen.add(unique)
    const emoji = String(row.emoji != null ? row.emoji : '').trim().slice(0, 8)
    const example = String(row.example != null ? row.example : row.hint != null ? row.hint : '')
      .trim()
      .slice(0, 160)
    out.push({
      id: unique,
      label: label || unique.replace(/_/g, ' '),
      emoji: emoji || defaultCategoryEmoji(unique),
      example: example || defaultCategoryExample(unique),
    })
    if (out.length >= 40) break
  }
  if (!out.length) {
    return BENEFIT_CATEGORIES.map(mapCategoryRow)
  }
  if (!out.some((c) => c.id === 'otros')) {
    out.push({
      id: 'otros',
      label: 'Otros',
      emoji: defaultCategoryEmoji('otros'),
      example: defaultCategoryExample('otros'),
    })
  }
  return out
}

export function categoryLabel(id, tenantOrConfig) {
  const cats = tenantOrConfig != null ? resolveCategories(tenantOrConfig) : BENEFIT_CATEGORIES
  const found = cats.find((c) => c.id === id)
  return found?.label || id || 'Otros'
}

/**
 * Normaliza overrides de tipología y categorías por tenant.
 * offerTypes: ids fijos; label/hint editables.
 * categories: lista editable (CRUD) con id/label/emoji.
 */
export function normalizeBenefitsConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const fromArr = Array.isArray(src.offerTypes)
    ? Object.fromEntries(
        src.offerTypes
          .filter((t) => t && t.id)
          .map((t) => [String(t.id), { label: t.label, hint: t.hint }]),
      )
    : src.offerTypes && typeof src.offerTypes === 'object'
      ? src.offerTypes
      : {}
  const offerTypes = {}
  for (const t of BENEFIT_OFFER_TYPES) {
    const ov = fromArr[t.id] || {}
    const label = String(ov.label != null ? ov.label : t.label)
      .trim()
      .slice(0, 80)
    const hint = String(ov.hint != null ? ov.hint : t.hint)
      .trim()
      .slice(0, 240)
    offerTypes[t.id] = {
      label: label || t.label,
      hint: hint || t.hint,
    }
  }
  const categories =
    Array.isArray(src.categories) && src.categories.length
      ? normalizeCategoriesInput(src.categories)
      : BENEFIT_CATEGORIES.map(mapCategoryRow)
  return { offerTypes, categories }
}

/** Lista tipologías con labels/hints de la comunidad (fallback a defaults). */
export function resolveOfferTypes(tenantOrConfig) {
  const cfg = normalizeBenefitsConfig(
    tenantOrConfig?.benefitsConfig != null ? tenantOrConfig.benefitsConfig : tenantOrConfig,
  )
  return BENEFIT_OFFER_TYPES.map((t) => ({
    id: t.id,
    kind: t.kind,
    label: cfg.offerTypes[t.id].label,
    hint: cfg.offerTypes[t.id].hint,
  }))
}

/** Categorías de la comunidad (defaults o CRUD guardado). */
export function resolveCategories(tenantOrConfig) {
  const cfg = normalizeBenefitsConfig(
    tenantOrConfig?.benefitsConfig != null ? tenantOrConfig.benefitsConfig : tenantOrConfig,
  )
  return cfg.categories.map((c) => ({ ...c }))
}

export function offerTypeLabel(id, tenantOrConfig) {
  const found = resolveOfferTypes(tenantOrConfig).find((t) => t.id === id)
  return found?.label || id || 'Beneficio'
}

export function normalizeBenefitKind(raw) {
  return raw === 'reward' ? 'reward' : 'benefit'
}

export function normalizeBenefitStatus(raw) {
  return BENEFIT_STATUSES.includes(raw) ? raw : 'draft'
}

export function normalizeOfferType(raw) {
  const id = String(raw || '').trim().toLowerCase()
  return OFFER_TYPE_IDS.includes(id) ? id : null
}

/**
 * Infere tipología producto desde campos existentes (docs sin offerType).
 * Prioridad: offerType guardado → premio → partner → geo → canjeable → informativo.
 */
export function inferOfferType(doc = {}) {
  const stored = normalizeOfferType(doc.offerType)
  if (stored) return stored
  if (normalizeBenefitKind(doc.kind) === 'reward') return 'premio'
  if (String(doc.partnerUrl || '').trim()) return 'partner'
  const locs = resolveBenefitLocations(doc)
  const hasGeo =
    locs.some((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng)) ||
    Boolean(String(doc.sucursal || '').trim()) ||
    locs.some((l) => String(l.name || '').trim())
  if (hasGeo) return 'geo'
  if (Number(doc.costoPuntos || 0) > 0) return 'canjeable'
  return 'informativo'
}

/** Normaliza HH:mm → minutos desde 00:00, o null. */
export function parseTimeHm(raw) {
  const s = String(raw || '').trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Sucursales efectivas: locations[] o legacy sucursal/lat/lng.
 * @returns {{ id: string, name: string, lat: number|null, lng: number|null, stock: number|null, redeemCount: number }[]}
 */
export function resolveBenefitLocations(doc = {}) {
  const raw = Array.isArray(doc.locations) ? doc.locations : []
  const fromArr = raw
    .map((l, i) => {
      const name = String(l?.name || '').trim().slice(0, 160)
      const lat = l?.lat == null || l?.lat === '' ? null : Number(l.lat)
      const lng = l?.lng == null || l?.lng === '' ? null : Number(l.lng)
      const stock =
        l?.stock == null || l?.stock === '' ? null : Number.isFinite(Number(l.stock)) ? Math.floor(Number(l.stock)) : null
      const id = String(l?.id || `loc-${i}`).slice(0, 64)
      return {
        id,
        name,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        stock,
        redeemCount: Number(l?.redeemCount || 0),
      }
    })
    .filter((l) => l.name || (l.lat != null && l.lng != null))
  if (fromArr.length) return fromArr
  const name = String(doc.sucursal || '').trim()
  const lat = doc.lat == null || doc.lat === '' ? null : Number(doc.lat)
  const lng = doc.lng == null || doc.lng === '' ? null : Number(doc.lng)
  if (!name && !(Number.isFinite(lat) && Number.isFinite(lng))) return []
  return [
    {
      id: 'legacy',
      name: name || 'Sucursal',
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      stock: null,
      redeemCount: 0,
    },
  ]
}

/** Días/horario/feriados (local del `now` pasado). */
export function isBenefitInSchedule(doc, now = new Date()) {
  if (!doc) return false
  if (doc.excludeHolidays && isArgentinaHoliday(now)) return false
  const days = Array.isArray(doc.daysOfWeek)
    ? doc.daysOfWeek.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : []
  if (days.length && !days.includes(now.getDay())) return false
  const fromM = parseTimeHm(doc.timeFrom)
  const toM = parseTimeHm(doc.timeTo)
  if (fromM != null || toM != null) {
    const cur = now.getHours() * 60 + now.getMinutes()
    if (fromM != null && toM != null) {
      if (fromM <= toM) {
        if (cur < fromM || cur > toM) return false
      } else if (cur < fromM && cur > toM) {
        // cruza medianoche
        return false
      }
    } else if (fromM != null && cur < fromM) return false
    else if (toM != null && cur > toM) return false
  }
  return true
}

export function userSedeMatchesBenefit(doc, user = {}) {
  if (!doc?.requireUserSede) return true
  const sede = String(user.sede || '').trim().toLowerCase()
  if (!sede) return false
  const locs = resolveBenefitLocations(doc)
  const names = locs.map((l) => String(l.name || '').trim().toLowerCase()).filter(Boolean)
  if (String(doc.sucursal || '').trim()) names.push(String(doc.sucursal).trim().toLowerCase())
  if (!names.length) return true
  return names.includes(sede)
}

export function findNearestLocation(doc, lat, lng) {
  const locs = resolveBenefitLocations(doc).filter((l) => l.lat != null && l.lng != null)
  if (!locs.length) return null
  if (![lat, lng].every((n) => Number.isFinite(Number(n)))) return locs[0]
  let best = null
  let bestD = Infinity
  for (const l of locs) {
    const d = distanceKm(lat, lng, l.lat, l.lng)
    if (d != null && d < bestD) {
      bestD = d
      best = { ...l, distanceKm: d }
    }
  }
  return best
}

export function periodStart(kind, now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (kind === 'day') return d
  if (kind === 'week') {
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1 // lunes
    d.setDate(d.getDate() - diff)
    return d
  }
  if (kind === 'month') {
    d.setDate(1)
    return d
  }
  return d
}

/**
 * Ajusta kind / defaults mínimos al elegir tipología (no borra título ni imagen).
 */
export function applyOfferTypeToDoc(doc, offerTypeRaw) {
  const offerType = normalizeOfferType(offerTypeRaw)
  if (!offerType) return doc
  doc.offerType = offerType
  const meta = BENEFIT_OFFER_TYPES.find((t) => t.id === offerType)
  if (meta?.kind) doc.kind = meta.kind
  if (offerType === 'informativo') {
    doc.costoPuntos = 0
  }
  if (offerType === 'premio' || offerType === 'canjeable') {
    if (doc.costoPuntos == null || Number(doc.costoPuntos) <= 0) {
      doc.costoPuntos = offerType === 'premio' ? 500 : 100
    }
  }
  if (offerType === 'premio' && (!doc.categoria || doc.categoria === 'otros')) {
    doc.categoria = 'premios'
  }
  return doc
}

export function normalizeCategory(raw, tenantOrConfig) {
  const id = String(raw || '').trim().toLowerCase()
  if (!id) return 'otros'
  const cats = tenantOrConfig != null ? resolveCategories(tenantOrConfig) : BENEFIT_CATEGORIES
  if (cats.some((c) => c.id === id)) return id
  if (BENEFIT_CATEGORIES.some((c) => c.id === id)) return id
  return 'otros'
}

/** Vigencia + status published (sin días/horario — eso es schedule). */
export function isBenefitActiveNow(doc, now = new Date()) {
  if (!doc || doc.status !== 'published') return false
  if (doc.vigenciaDesde && new Date(doc.vigenciaDesde) > now) return false
  if (doc.vigenciaHasta && new Date(doc.vigenciaHasta) < now) return false
  return true
}

/** Publicado + vigencia + calendario (días/horario/feriados). */
export function isBenefitAvailableNow(doc, now = new Date()) {
  return isBenefitActiveNow(doc, now) && isBenefitInSchedule(doc, now)
}

/**
 * Cupo global / stock / límites / sede / stock por sucursal.
 * @param {object} opts
 * @param {number} [opts.userRedeemCount]
 * @param {number} [opts.userRedeemCountDay]
 * @param {number} [opts.userRedeemCountWeek]
 * @param {number} [opts.userRedeemCountMonth]
 * @param {object} [opts.user]
 * @param {string} [opts.locationId]
 * @param {Date} [opts.now]
 */
export function canRedeemBenefit(doc, opts = {}) {
  const {
    userRedeemCount = 0,
    userRedeemCountDay = 0,
    userRedeemCountWeek = 0,
    userRedeemCountMonth = 0,
    user = {},
    locationId = '',
    now = new Date(),
  } = opts
  if (!isBenefitAvailableNow(doc, now)) {
    if (!isBenefitActiveNow(doc, now)) return { ok: false, reason: 'Beneficio no disponible' }
    return { ok: false, reason: 'Fuera de día u horario' }
  }
  if (!userSedeMatchesBenefit(doc, user)) {
    return { ok: false, reason: 'No disponible para tu sede' }
  }
  const stock = doc.stock
  if (stock != null && Number.isFinite(stock) && stock <= 0) {
    return { ok: false, reason: 'Sin stock', waitlist: Boolean(doc.allowWaitlist) }
  }
  const cupo = doc.cupo
  if (cupo != null && Number.isFinite(cupo) && Number(doc.redeemCount || 0) >= cupo) {
    return { ok: false, reason: 'Cupo agotado', waitlist: Boolean(doc.allowWaitlist) }
  }
  const lim = doc.limitePorUsuario
  if (lim != null && Number.isFinite(lim) && userRedeemCount >= lim) {
    return { ok: false, reason: 'Alcanzaste el límite de canjes' }
  }
  const limD = doc.limitePorDia
  if (limD != null && Number.isFinite(limD) && userRedeemCountDay >= limD) {
    return { ok: false, reason: 'Alcanzaste el límite diario' }
  }
  const limW = doc.limitePorSemana
  if (limW != null && Number.isFinite(limW) && userRedeemCountWeek >= limW) {
    return { ok: false, reason: 'Alcanzaste el límite semanal' }
  }
  const limM = doc.limitePorMes
  if (limM != null && Number.isFinite(limM) && userRedeemCountMonth >= limM) {
    return { ok: false, reason: 'Alcanzaste el límite mensual' }
  }

  const locs = resolveBenefitLocations(doc)
  if (locs.length && (locationId || doc.requireUserSede)) {
    let loc = locationId ? locs.find((l) => l.id === locationId) : null
    if (!loc && user?.sede) {
      const sede = String(user.sede).trim().toLowerCase()
      loc = locs.find((l) => String(l.name || '').toLowerCase() === sede) || null
    }
    if (locationId && !loc) return { ok: false, reason: 'Sucursal inválida' }
    if (loc && loc.stock != null && Number.isFinite(loc.stock) && loc.stock <= 0) {
      return { ok: false, reason: 'Sin stock en esa sucursal', waitlist: Boolean(doc.allowWaitlist) }
    }
  }
  return { ok: true }
}

/** Simulador admin: elegibilidad sin side-effects. */
export function simulateBenefitEligibility(doc, opts = {}) {
  const check = canRedeemBenefit(doc, opts)
  return {
    ok: check.ok,
    reason: check.reason || null,
    waitlist: Boolean(check.waitlist),
    inSchedule: isBenefitInSchedule(doc, opts.now || new Date()),
    active: isBenefitActiveNow(doc, opts.now || new Date()),
    sedeOk: userSedeMatchesBenefit(doc, opts.user || {}),
    availableNow: isBenefitAvailableNow(doc, opts.now || new Date()),
  }
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
  const offerType = inferOfferType(doc)
  const status = doc.status || 'draft'
  const locations = resolveBenefitLocations(doc)
  const primary = locations[0] || null
  const lat = extras.lat ?? primary?.lat ?? doc.lat ?? null
  const lng = extras.lng ?? primary?.lng ?? doc.lng ?? null
  const sucursal = primary?.name || doc.sucursal || ''
  const days = Array.isArray(doc.daysOfWeek)
    ? doc.daysOfWeek.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : []
  return {
    id,
    kind,
    kindLabel: kindLabel(kind),
    offerType,
    offerTypeLabel: extras.offerTypeLabel || offerTypeLabel(offerType, extras.benefitsConfig || extras.tenant),
    titulo: doc.titulo || '',
    nombreComercial: doc.nombreComercial || '',
    displayTitle: String(doc.nombreComercial || doc.titulo || '').trim(),
    descripcion: doc.descripcion || '',
    condiciones: doc.condiciones || '',
    condicionesVersion: Number(doc.condicionesVersion || 1),
    categoria: normalizeCategory(doc.categoria, extras.tenant || extras.benefitsConfig),
    categoriaLabel: categoryLabel(doc.categoria, extras.tenant || extras.benefitsConfig),
    imageUrl: doc.imageUrl || '',
    partnerName: doc.partnerName || '',
    partnerUrl: doc.partnerUrl || '',
    costoPuntos: doc.costoPuntos != null ? Number(doc.costoPuntos) : 0,
    stock: doc.stock == null ? null : Number(doc.stock),
    cupo: doc.cupo == null ? null : Number(doc.cupo),
    redeemCount: Number(doc.redeemCount || 0),
    limitePorUsuario: doc.limitePorUsuario == null ? null : Number(doc.limitePorUsuario),
    limitePorDia: doc.limitePorDia == null ? null : Number(doc.limitePorDia),
    limitePorSemana: doc.limitePorSemana == null ? null : Number(doc.limitePorSemana),
    limitePorMes: doc.limitePorMes == null ? null : Number(doc.limitePorMes),
    vigenciaDesde: doc.vigenciaDesde || null,
    vigenciaHasta: doc.vigenciaHasta || null,
    daysOfWeek: days,
    daysOfWeekLabels: days.map((d) => DAY_LABELS[d] || String(d)),
    timeFrom: doc.timeFrom || '',
    timeTo: doc.timeTo || '',
    excludeHolidays: Boolean(doc.excludeHolidays),
    requireUserSede: Boolean(doc.requireUserSede),
    redeemRadiusKm: doc.redeemRadiusKm == null ? null : Number(doc.redeemRadiusKm),
    allowWaitlist: Boolean(doc.allowWaitlist),
    hasMerchantPin: Boolean(String(doc.merchantPin || '').trim()),
    scheduledPublishAt: doc.scheduledPublishAt || null,
    status,
    statusLabel: statusLabel(status),
    audience: doc.audience || { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    sucursal,
    locations,
    lat,
    lng,
    hasLocation: locations.length > 0,
    directionsUrl: benefitDirectionsUrl({ lat, lng, sucursal }),
    mapsUrl: benefitMapsPinUrl({ lat, lng, sucursal }),
    destacado: Boolean(doc.destacado),
    orden: Number(doc.orden ?? 100),
    active: isBenefitActiveNow(doc),
    availableNow: isBenefitAvailableNow(doc),
    inSchedule: isBenefitInSchedule(doc),
    favorite: Boolean(extras.favorite),
    distanceKm: extras.distanceKm ?? null,
    recommendScore: extras.recommendScore ?? null,
    recommendReason: extras.recommendReason || null,
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

export function benefitsMeta(tenant) {
  return {
    kinds: BENEFIT_KINDS.map((k) => ({ id: k, label: kindLabel(k) })),
    offerTypes: resolveOfferTypes(tenant),
    categories: resolveCategories(tenant),
    statuses: BENEFIT_STATUSES.map((s) => ({ id: s, label: statusLabel(s) })),
    benefitsConfig: normalizeBenefitsConfig(tenant?.benefitsConfig),
  }
}

export function buildBenefitSearchFilter(q) {
  const term = String(q || '').trim()
  if (term.length < 2) return null
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return {
    $or: [
      { titulo: re },
      { nombreComercial: re },
      { descripcion: re },
      { partnerName: re },
      { categoria: re },
      { condiciones: re },
    ],
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

/**
 * URL Google Maps Directions (“cómo llegar”).
 * Con origen → ruta origen→destino; sin origen → Google pide/usa ubicación del dispositivo.
 * @param {{ lat?: number|null, lng?: number|null, sucursal?: string, titulo?: string }} dest
 * @param {{ originLat?: number|null, originLng?: number|null }} [origin]
 * @returns {string} URL o '' si no hay destino usable
 */
export function benefitDirectionsUrl(dest = {}, origin = {}) {
  const dLat = dest.lat == null || dest.lat === '' ? null : Number(dest.lat)
  const dLng = dest.lng == null || dest.lng === '' ? null : Number(dest.lng)
  const hasCoords = Number.isFinite(dLat) && Number.isFinite(dLng)
  const place = String(dest.sucursal || '').trim()
  if (!hasCoords && !place) return ''

  const destination = hasCoords ? `${dLat},${dLng}` : place

  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  })

  const oLat = origin.originLat == null || origin.originLat === '' ? null : Number(origin.originLat)
  const oLng = origin.originLng == null || origin.originLng === '' ? null : Number(origin.originLng)
  if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
    params.set('origin', `${oLat},${oLng}`)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Pin / búsqueda en Google Maps (sin ruta). */
export function benefitMapsPinUrl(dest = {}) {
  const dLat = dest.lat == null || dest.lat === '' ? null : Number(dest.lat)
  const dLng = dest.lng == null || dest.lng === '' ? null : Number(dest.lng)
  if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
    return `https://www.google.com/maps/search/?api=1&query=${dLat},${dLng}`
  }
  const q = String(dest.sucursal || '').trim()
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function applyBenefitPatch(doc, body = {}, opts = {}) {
  if (body.offerType !== undefined) {
    const ot = normalizeOfferType(body.offerType)
    if (ot) applyOfferTypeToDoc(doc, ot)
  }
  if (body.titulo !== undefined) {
    const t = String(body.titulo || '').trim()
    if (!t) {
      const err = new Error('titulo obligatorio')
      err.status = 400
      throw err
    }
    doc.titulo = t.slice(0, 160)
  }
  if (body.nombreComercial !== undefined) {
    doc.nombreComercial = String(body.nombreComercial || '').trim().slice(0, 120)
  }
  if (body.descripcion !== undefined) doc.descripcion = String(body.descripcion || '').slice(0, 4000)
  if (body.condiciones !== undefined) doc.condiciones = String(body.condiciones || '').slice(0, 4000)
  if (body.kind !== undefined) doc.kind = normalizeBenefitKind(body.kind)
  if (body.categoria !== undefined) {
    doc.categoria = normalizeCategory(body.categoria, opts.tenant)
  }
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
  for (const key of ['limitePorDia', 'limitePorSemana', 'limitePorMes', 'redeemRadiusKm']) {
    if (body[key] === undefined) continue
    if (body[key] === null || body[key] === '') doc[key] = null
    else {
      const n = Number(body[key])
      doc[key] = Number.isFinite(n) && n >= 0 ? (key === 'redeemRadiusKm' ? n : Math.floor(n)) : null
    }
  }
  if (body.vigenciaDesde !== undefined) {
    doc.vigenciaDesde = body.vigenciaDesde ? new Date(body.vigenciaDesde) : null
  }
  if (body.vigenciaHasta !== undefined) {
    doc.vigenciaHasta = body.vigenciaHasta ? new Date(body.vigenciaHasta) : null
  }
  if (body.scheduledPublishAt !== undefined) {
    doc.scheduledPublishAt = body.scheduledPublishAt ? new Date(body.scheduledPublishAt) : null
  }
  if (body.daysOfWeek !== undefined) {
    const arr = Array.isArray(body.daysOfWeek) ? body.daysOfWeek : String(body.daysOfWeek || '').split(',')
    doc.daysOfWeek = [...new Set(arr.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
  }
  if (body.timeFrom !== undefined) {
    const t = String(body.timeFrom || '').trim()
    doc.timeFrom = parseTimeHm(t) != null ? t.slice(0, 5) : ''
  }
  if (body.timeTo !== undefined) {
    const t = String(body.timeTo || '').trim()
    doc.timeTo = parseTimeHm(t) != null ? t.slice(0, 5) : ''
  }
  if (body.excludeHolidays !== undefined) doc.excludeHolidays = Boolean(body.excludeHolidays)
  if (body.requireUserSede !== undefined) doc.requireUserSede = Boolean(body.requireUserSede)
  if (body.allowWaitlist !== undefined) doc.allowWaitlist = Boolean(body.allowWaitlist)
  if (body.merchantPin !== undefined) doc.merchantPin = String(body.merchantPin || '').trim().slice(0, 32)
  if (body.condiciones !== undefined && body.bumpCondiciones) {
    doc.condicionesVersion = Number(doc.condicionesVersion || 1) + 1
  }
  if (body.locations !== undefined) {
    const arr = Array.isArray(body.locations) ? body.locations : []
    doc.locations = arr
      .map((l, i) => {
        const name = String(l?.name || '').trim().slice(0, 160)
        const lat = l?.lat == null || l?.lat === '' ? null : Number(l.lat)
        const lng = l?.lng == null || l?.lng === '' ? null : Number(l.lng)
        let stock = null
        if (l?.stock !== undefined && l?.stock !== null && l?.stock !== '') {
          const n = Number(l.stock)
          stock = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
        }
        return {
          id: String(l?.id || `loc-${i}-${Date.now()}`).slice(0, 64),
          name,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          stock,
          redeemCount: Number(l?.redeemCount || 0),
        }
      })
      .filter((l) => l.name || (l.lat != null && l.lng != null))
      .slice(0, 40)
    if (doc.locations[0]) {
      doc.sucursal = doc.locations[0].name || doc.sucursal
      doc.lat = doc.locations[0].lat
      doc.lng = doc.locations[0].lng
    }
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
  // Re-sync offerType if not explicitly set but fields imply one, keep stored
  if (body.offerType === undefined && !doc.offerType) {
    doc.offerType = inferOfferType(doc)
  } else if (doc.offerType) {
    const meta = BENEFIT_OFFER_TYPES.find((t) => t.id === doc.offerType)
    if (meta?.kind && body.kind === undefined) doc.kind = meta.kind
  }
  if (doc.offerType === 'informativo') doc.costoPuntos = 0
  if (doc.offerType === 'premio') doc.kind = 'reward'
  return doc
}

export function defaultBenefitSeed(brand = 'la empresa') {
  const brandName = String(brand || 'la empresa').trim() || 'la empresa'
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 864e5)
  const in60 = new Date(now.getTime() + 60 * 864e5)
  const past = new Date(now.getTime() - 7 * 864e5)
  const soon = new Date(now.getTime() + 3 * 864e5)

  return [
    // —— Informativos (sin puntos) · 3+ publicados ——
    {
      kind: 'benefit',
      offerType: 'informativo',
      titulo: `Descuento en partner — ${brandName}`,
      nombreComercial: `15% en partners ${brandName}`,
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
      offerType: 'informativo',
      titulo: 'Gimnasio y bienestar',
      nombreComercial: 'Wellness club',
      descripcion: 'Acceso preferencial a centros de bienestar con convenio corporativo.',
      condiciones: 'Cupo sujeto a disponibilidad. Consultá horarios en la ficha.',
      categoria: 'salud',
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
      costoPuntos: 0,
      status: 'published',
      orden: 11,
    },
    {
      kind: 'benefit',
      offerType: 'informativo',
      titulo: 'Óptica con convenio',
      nombreComercial: 'Lentes 20% off',
      descripcion: 'Descuento en anteojos de sol y receta en ópticas adheridas.',
      condiciones: 'Presentá credencial. No válido con otras promos de la óptica.',
      categoria: 'salud',
      imageUrl: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=900&q=80',
      costoPuntos: 0,
      partnerName: 'Óptica Vision+',
      status: 'published',
      orden: 12,
    },
    {
      kind: 'benefit',
      offerType: 'informativo',
      titulo: 'Cursos de idiomas',
      nombreComercial: 'Idiomas corporativos',
      descripcion: 'Descuento en academias de inglés y portugués con convenio.',
      condiciones: 'Inscripción con mail corporativo. Cupos por cohorte.',
      categoria: 'educacion',
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80',
      costoPuntos: 0,
      status: 'published',
      orden: 13,
    },
    {
      kind: 'benefit',
      offerType: 'informativo',
      titulo: 'Capacitación online — borrador',
      descripcion: 'Borrador de demo: curso interno aún no publicado.',
      condiciones: 'Solo visible en admin hasta publicar.',
      categoria: 'educacion',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
      costoPuntos: 0,
      status: 'draft',
      scheduledPublishAt: soon,
      orden: 95,
    },
    {
      kind: 'benefit',
      offerType: 'informativo',
      titulo: 'Descuento tech archivado',
      descripcion: 'Caso demo archivado: ya no se muestra en la app.',
      condiciones: 'Histórico.',
      categoria: 'tecnologia',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80',
      costoPuntos: 0,
      status: 'archived',
      orden: 200,
    },

    // —— Geo / ubicación · 3 publicados ——
    {
      kind: 'benefit',
      offerType: 'geo',
      titulo: 'Farmacia adherida — sucursal centro',
      descripcion: 'Descuento en farmacia cercana. Ver punto en el mapa de beneficios.',
      condiciones: 'Presentá DNI laboral. Horario de lunes a viernes.',
      categoria: 'salud',
      imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=900&q=80',
      costoPuntos: 0,
      sucursal: 'Centro',
      lat: -34.6037,
      lng: -58.3816,
      redeemRadiusKm: 2,
      daysOfWeek: [1, 2, 3, 4, 5],
      timeFrom: '09:00',
      timeTo: '18:00',
      excludeHolidays: true,
      status: 'published',
      orden: 20,
    },
    {
      kind: 'benefit',
      offerType: 'geo',
      titulo: 'Estación de servicio — multi sede',
      nombreComercial: 'Nafta con convenio',
      descripcion: 'Descuento en combustible en sedes adheridas. Requiere sede del usuario.',
      condiciones: 'Solo si tu sede coincide con una de las sucursales.',
      categoria: 'transporte',
      imageUrl: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=900&q=80',
      costoPuntos: 0,
      requireUserSede: true,
      locations: [
        { id: 'palermo', name: 'Palermo', lat: -34.5889, lng: -58.4306, stock: null },
        { id: 'belgrano', name: 'Belgrano', lat: -34.5627, lng: -58.4584, stock: 100 },
      ],
      status: 'published',
      destacado: true,
      orden: 21,
    },
    {
      kind: 'benefit',
      offerType: 'geo',
      titulo: 'Cafetería de planta',
      nombreComercial: 'Café oficina',
      descripcion: 'Descuento en la cafetería del edificio. Ubicación en el mapa.',
      condiciones: 'Lunes a viernes 8–17 hs. Presentá credencial.',
      categoria: 'gastronomia',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80',
      costoPuntos: 0,
      sucursal: 'Planta baja · Torre A',
      lat: -34.5951,
      lng: -58.3731,
      redeemRadiusKm: 0.5,
      daysOfWeek: [1, 2, 3, 4, 5],
      timeFrom: '08:00',
      timeTo: '17:00',
      status: 'published',
      orden: 22,
    },

    // —— Partner / link · 3 publicados ——
    {
      kind: 'benefit',
      offerType: 'partner',
      titulo: 'Portal de descuentos externos',
      nombreComercial: 'Club partners',
      descripcion: 'Abrí el portal del partner para ver ofertas actualizadas.',
      condiciones: 'Se abre en navegador externo. Login con mail corporativo.',
      categoria: 'descuentos',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80',
      partnerName: 'Club Partners',
      partnerUrl: 'https://example.com/partners',
      costoPuntos: 0,
      status: 'published',
      orden: 30,
    },
    {
      kind: 'benefit',
      offerType: 'partner',
      titulo: 'Streaming educativo',
      descripcion: 'Acceso al campus de cursos online del partner.',
      condiciones: 'Un acceso por colaborador.',
      categoria: 'educacion',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80',
      partnerName: 'Campus+',
      partnerUrl: 'https://example.com/campus',
      costoPuntos: 0,
      status: 'published',
      orden: 31,
    },
    {
      kind: 'benefit',
      offerType: 'partner',
      titulo: 'Tienda tech corporativa',
      nombreComercial: 'Tech Store',
      descripcion: 'Comprá notebooks y accesorios con precio empleado en el portal del partner.',
      condiciones: 'Envío a domicilio o retiro en sucursal partner.',
      categoria: 'tecnologia',
      imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
      partnerName: 'Tech Store Corp',
      partnerUrl: 'https://example.com/tech-store',
      costoPuntos: 0,
      status: 'published',
      destacado: true,
      orden: 32,
    },

    // —— Canjeables (benefit + puntos) · 3+ publicados ——
    {
      kind: 'benefit',
      offerType: 'canjeable',
      titulo: 'Merchandising club',
      descripcion: 'Canjeá puntos por un ítem de merchandising de la comunidad.',
      condiciones: 'Stock limitado. Retiro en recepción.',
      categoria: 'otros',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80',
      costoPuntos: 300,
      stock: 40,
      cupo: 200,
      limitePorUsuario: 2,
      status: 'published',
      orden: 40,
    },
    {
      kind: 'benefit',
      offerType: 'canjeable',
      titulo: 'Almuerzo en comedor',
      nombreComercial: 'Menú del día',
      descripcion: 'Canjeá puntos por el menú ejecutivo del comedor.',
      condiciones: 'Tope diario y semanal. Lista de espera si no hay cupo.',
      categoria: 'gastronomia',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
      costoPuntos: 80,
      stock: 30,
      cupo: 500,
      limitePorUsuario: 20,
      limitePorDia: 1,
      limitePorSemana: 5,
      allowWaitlist: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      timeFrom: '12:00',
      timeTo: '14:30',
      vigenciaDesde: past,
      vigenciaHasta: in60,
      status: 'published',
      orden: 41,
    },
    {
      kind: 'benefit',
      offerType: 'canjeable',
      titulo: 'Voucher transporte mensual',
      descripcion: 'Ayuda de movilidad canjeable una vez al mes.',
      condiciones: 'Tope mensual 1. Vigencia 30 días.',
      categoria: 'transporte',
      imageUrl: 'https://images.unsplash.com/photo-1544620341-1ada256fd0d3?w=900&q=80',
      costoPuntos: 400,
      stock: 80,
      limitePorMes: 1,
      vigenciaDesde: now,
      vigenciaHasta: in30,
      status: 'published',
      orden: 42,
    },
    {
      kind: 'benefit',
      offerType: 'canjeable',
      titulo: 'Snack saludable',
      nombreComercial: 'Box snack',
      descripcion: 'Canjeá puntos por un box de snacks saludables en recepción.',
      condiciones: 'Stock semanal. Un canje cada 7 días.',
      categoria: 'gastronomia',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80',
      costoPuntos: 120,
      stock: 60,
      limitePorUsuario: 4,
      limitePorSemana: 1,
      status: 'published',
      orden: 43,
    },

    // —— Premios (reward) · 3+ publicados ——
    {
      kind: 'reward',
      offerType: 'premio',
      titulo: 'Gift card café',
      nombreComercial: 'Café 500 pts',
      descripcion: 'Canjeá puntos por una gift card de cafetería.',
      condiciones: 'Costo 500 puntos. Un canje por mes.',
      categoria: 'premios',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80',
      costoPuntos: 500,
      stock: 50,
      limitePorUsuario: 1,
      limitePorMes: 1,
      status: 'published',
      destacado: true,
      orden: 50,
    },
    {
      kind: 'reward',
      offerType: 'premio',
      titulo: 'Día libre extra',
      descripcion: 'Canjeá puntos por media jornada libre (sujeto a aprobación de tu líder).',
      condiciones: 'Costo 2000 puntos. No aplica en fechas críticas del negocio.',
      categoria: 'premios',
      imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80',
      costoPuntos: 2000,
      stock: 10,
      cupo: 25,
      limitePorUsuario: 1,
      allowWaitlist: true,
      status: 'published',
      orden: 51,
    },
    {
      kind: 'reward',
      offerType: 'premio',
      titulo: 'Auriculares wireless',
      nombreComercial: 'Tech prize',
      descripcion: 'Premio de alto valor: stock bajo y PIN de comercio al retirar.',
      condiciones: 'Retiro con documento. Validación con PIN en recepción.',
      categoria: 'tecnologia',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80',
      costoPuntos: 3500,
      stock: 5,
      cupo: 5,
      limitePorUsuario: 1,
      merchantPin: '1234',
      status: 'published',
      orden: 52,
    },
    {
      kind: 'reward',
      offerType: 'premio',
      titulo: 'Kit bienestar — solo finde',
      descripcion: 'Premio disponible sábados y domingos en horario reducido.',
      condiciones: 'Solo fin de semana 10–14 hs.',
      categoria: 'salud',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80',
      costoPuntos: 900,
      stock: 20,
      daysOfWeek: [0, 6],
      timeFrom: '10:00',
      timeTo: '14:00',
      status: 'published',
      orden: 53,
    },
  ]
}

export function defaultPartnerSeed(brand = 'la empresa') {
  const brandName = String(brand || 'la empresa').trim() || 'la empresa'
  return [
    {
      titulo: `Club de descuentos ${brandName}`,
      descripcion: 'Portal con ofertas actualizadas para colaboradores.',
      url: 'https://example.com/club-descuentos',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80',
      orden: 10,
      activo: true,
    },
    {
      titulo: 'Campus+ educación',
      descripcion: 'Cursos online y certificaciones con acceso corporativo.',
      url: 'https://example.com/campus',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80',
      orden: 20,
      activo: true,
    },
    {
      titulo: 'Tech Store Corp',
      descripcion: 'Notebooks y accesorios con precio empleado.',
      url: 'https://example.com/tech-store',
      imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
      orden: 30,
      activo: true,
    },
    {
      titulo: 'Wellness & Gym',
      descripcion: 'Gimnasios y centros de bienestar adheridos.',
      url: 'https://example.com/wellness',
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
      orden: 40,
      activo: true,
    },
    {
      titulo: 'Óptica Vision+',
      descripcion: 'Descuentos en anteojos de sol y receta.',
      url: 'https://example.com/optica',
      imageUrl: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=900&q=80',
      orden: 50,
      activo: true,
    },
    {
      titulo: 'Movilidad corporativa',
      descripcion: 'Convenio de transporte y apps de movilidad.',
      url: 'https://example.com/movilidad',
      imageUrl: 'https://images.unsplash.com/photo-1544620341-1ada256fd0d3?w=900&q=80',
      orden: 60,
      activo: true,
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
