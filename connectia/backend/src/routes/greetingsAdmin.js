import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { GreetingRule } from '../models/GreetingRule.js'
import { GreetingEventType } from '../models/GreetingEventType.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { normalizeAudience } from '../lib/audience.js'
import {
  GREETING_MEDIA_PICKS,
  GREETING_MEDIA_PICK_LABELS,
  GREETING_DATE_SOURCES,
  GREETING_DATE_SOURCE_LABELS,
  GREETING_DATE_SOURCE_META,
  GREETING_OFFSET_FIELDS,
  validateGreetingRuleInput,
  normalizeGreetingRuleInput,
  serializeGreetingEventType,
  slugifyGreetingTypeKey,
  normalizeDateSource,
  normalizeGreetingTypeDefaultsInput,
  normalizeCustomDateKey,
  normalizeOffsetField,
} from '../lib/greetingHelpers.js'
import { draftGreetingRuleFromPrompt, greetingAiConfigured } from '../services/greetingAi.js'
import {
  serializeGreetingRule,
  processDueGreetingRules,
  loadGreetingTypeMap,
} from '../services/greetingEngine.js'
import { seedGreetingEventTypesForTenant } from '../scripts/seedGreetingEventTypes.js'

const router = Router()
const CAP = 'admin.saludos'

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') return a
  if (a.areaIds.length) {
    const n = await OrgArea.countDocuments({
      tenantId,
      _id: { $in: a.areaIds },
      activo: { $ne: false },
    })
    if (n !== a.areaIds.length) {
      const err = new Error('Área inválida en audiencia')
      err.status = 400
      throw err
    }
  }
  if (a.groupIds.length) {
    const n = await UserGroup.countDocuments({
      tenantId,
      _id: { $in: a.groupIds },
      activo: { $ne: false },
    })
    if (n !== a.groupIds.length) {
      const err = new Error('Grupo inválido en audiencia')
      err.status = 400
      throw err
    }
  }
  if (a.mode === 'restricted' && !a.areaIds.length && !a.groupIds.length && !a.userIds.length) {
    const err = new Error('Audiencia restringida: elegí al menos un área, grupo o usuario')
    err.status = 400
    throw err
  }
  if (a.mode === 'users' && !a.userIds.length) {
    const err = new Error('Audiencia por usuarios: elegí al menos uno')
    err.status = 400
    throw err
  }
  return a
}

async function listEventTypes(tenantId, { includeInactive = true } = {}) {
  await seedGreetingEventTypesForTenant(tenantId)
  const filter = { tenantId }
  if (!includeInactive) filter.activo = true
  const items = await GreetingEventType.find(filter).sort({ sortOrder: 1, label: 1 }).lean()
  return items.map(serializeGreetingEventType)
}

async function resolveRuleTypeContext(tenantId, eventTypeKey) {
  const map = await loadGreetingTypeMap(tenantId)
  const typeConfig = map.get(eventTypeKey) || null
  const allowedKeys = [...map.entries()]
    .filter(([, t]) => t.activo !== false)
    .map(([k]) => k)
  return { typeConfig, allowedKeys }
}

router.get('/meta', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const eventTypes = await listEventTypes(req.tenant._id, { includeInactive: false })
    res.json({
      eventTypes: eventTypes.map((t) => ({
        id: t.key,
        key: t.key,
        label: t.label,
        dateSource: t.dateSource,
        dateSourceLabel: t.dateSourceLabel,
        minYears: t.minYears,
        description: t.description,
        defaultTitulo: t.defaultTitulo,
        defaultCuerpo: t.defaultCuerpo,
        imageUrl: t.imageUrl,
        imageUrls: t.imageUrls,
        audioUrl: t.audioUrl,
        mediaKind: t.mediaKind,
        mediaPick: t.mediaPick,
        customDateKey: t.customDateKey,
        offsetDays: t.offsetDays,
        offsetField: t.offsetField,
      })),
      dateSources: GREETING_DATE_SOURCE_META,
      offsetFields: GREETING_OFFSET_FIELDS,
      mediaPicks: GREETING_MEDIA_PICKS.map((id) => ({ id, label: GREETING_MEDIA_PICK_LABELS[id] })),
      variables: ['nombre', 'apellido', 'cargo', 'anios'],
      postTipo: 'celebracion',
      aiConfigured: greetingAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/ai-status', requireAuth, requireCapability(CAP), (_req, res) => {
  res.json({ configured: greetingAiConfigured() })
})

/** ——— Tipos de celebración (ABM) ——— */
router.get('/event-types', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const items = await listEventTypes(req.tenant._id, { includeInactive: true })
    res.json({
      items,
      dateSources: GREETING_DATE_SOURCE_META,
      offsetFields: GREETING_OFFSET_FIELDS,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/event-types', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const body = req.body || {}
    const label = String(body.label || '').trim()
    if (!label) return res.status(400).json({ error: 'Nombre del tipo obligatorio' })
    let key = slugifyGreetingTypeKey(body.key || label)
    if (!key) return res.status(400).json({ error: 'Key inválida' })
    const dateSource = normalizeDateSource(body.dateSource)
    const customDateKey = normalizeCustomDateKey(body.customDateKey)
    const offsetField = normalizeOffsetField(body.offsetField)
    const offsetDays = Math.min(3650, Math.max(0, Number(body.offsetDays) || 0))
    const minYears = Math.min(80, Math.max(0, Number(body.minYears) || 0))
    if (dateSource === 'customDate' && !customDateKey) {
      return res.status(400).json({ error: 'Indicá la key de fecha personalizada (ej. promocion)' })
    }
    if (dateSource === 'daysAfter' && offsetField === 'customDate' && !customDateKey) {
      return res.status(400).json({ error: 'Indicá la key de fecha personalizada para el offset' })
    }
    const defaults = normalizeGreetingTypeDefaultsInput(body)
    if (defaults.mediaPick === 'random' && !defaults.imageUrls.length && !defaults.imageUrl) {
      return res.status(400).json({ error: 'Plantilla al azar: cargá al menos 1 imagen en el pool' })
    }
    const exists = await GreetingEventType.findOne({ tenantId: req.tenant._id, key })
    if (exists) return res.status(409).json({ error: `Ya existe el tipo “${key}”` })
    const doc = await GreetingEventType.create({
      tenantId: req.tenant._id,
      key,
      label: label.slice(0, 80),
      description: String(body.description || '').trim().slice(0, 400),
      dateSource,
      customDateKey: dateSource === 'customDate' || offsetField === 'customDate' ? customDateKey : '',
      offsetDays: dateSource === 'daysAfter' ? offsetDays : 0,
      offsetField: dateSource === 'daysAfter' ? offsetField : 'fechaIngreso',
      minYears: ['fixed', 'manual', 'daysAfter'].includes(dateSource) ? 0 : minYears,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 100,
      activo: body.activo !== false,
      isSystem: false,
      ...defaults,
    })
    res.status(201).json({ type: serializeGreetingEventType(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/event-types/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const doc = await GreetingEventType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Tipo no encontrado' })
    const body = req.body || {}
    if (body.label != null) {
      const label = String(body.label).trim()
      if (!label) return res.status(400).json({ error: 'Nombre del tipo obligatorio' })
      doc.label = label.slice(0, 80)
    }
    if (body.description != null) doc.description = String(body.description).trim().slice(0, 400)
    if (body.dateSource != null) doc.dateSource = normalizeDateSource(body.dateSource)
    if (body.customDateKey != null) doc.customDateKey = normalizeCustomDateKey(body.customDateKey)
    if (body.offsetField != null) doc.offsetField = normalizeOffsetField(body.offsetField)
    if (body.offsetDays != null) {
      doc.offsetDays = Math.min(3650, Math.max(0, Number(body.offsetDays) || 0))
    }
    if (body.minYears != null) {
      doc.minYears = ['fixed', 'manual', 'daysAfter'].includes(doc.dateSource)
        ? 0
        : Math.min(80, Math.max(0, Number(body.minYears) || 0))
    }
    if (doc.dateSource === 'customDate' && !doc.customDateKey) {
      return res.status(400).json({ error: 'Indicá la key de fecha personalizada (ej. promocion)' })
    }
    if (doc.dateSource === 'daysAfter' && doc.offsetField === 'customDate' && !doc.customDateKey) {
      return res.status(400).json({ error: 'Indicá la key de fecha personalizada para el offset' })
    }
    if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder))) {
      doc.sortOrder = Number(body.sortOrder)
    }
    if (typeof body.activo === 'boolean') doc.activo = body.activo
    if (
      body.defaultTitulo != null ||
      body.defaultCuerpo != null ||
      body.imageUrl != null ||
      body.imageUrls != null ||
      body.audioUrl != null ||
      body.mediaKind != null ||
      body.mediaPick != null
    ) {
      const defaults = normalizeGreetingTypeDefaultsInput({
        defaultTitulo: body.defaultTitulo ?? doc.defaultTitulo,
        defaultCuerpo: body.defaultCuerpo ?? doc.defaultCuerpo,
        imageUrl: body.imageUrl ?? doc.imageUrl,
        imageUrls: body.imageUrls ?? doc.imageUrls,
        audioUrl: body.audioUrl ?? doc.audioUrl,
        mediaKind: body.mediaKind ?? doc.mediaKind,
        mediaPick: body.mediaPick ?? doc.mediaPick,
      })
      if (defaults.mediaPick === 'random' && !defaults.imageUrls.length && !defaults.imageUrl) {
        return res.status(400).json({ error: 'Plantilla al azar: cargá al menos 1 imagen en el pool' })
      }
      Object.assign(doc, defaults)
    }
    await doc.save()
    res.json({ type: serializeGreetingEventType(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/event-types/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const doc = await GreetingEventType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Tipo no encontrado' })
    if (doc.isSystem) {
      return res.status(400).json({ error: 'Los tipos de sistema no se borran; podés pausarlos' })
    }
    const used = await GreetingRule.countDocuments({ tenantId: req.tenant._id, eventType: doc.key })
    if (used) {
      return res.status(400).json({
        error: `Hay ${used} regla(s) usando este tipo. Reasignalas o pausá el tipo.`,
      })
    }
    await doc.deleteOne()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Candidatos de audiencia (personas puntuales). */
router.get('/audience-candidates', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }

    if (ids.length) {
      filter._id = { $in: ids.filter((id) => id.length === 24) }
    } else if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    } else {
      return res.json({ items: [] })
    }

    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(ids.length ? Math.min(ids.length, 100) : 40)
      .lean()

    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        usuario: u.usuario || '',
        email: u.email || '',
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        areaId: u.areaId ? String(u.areaId) : null,
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/ai-draft', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const draft = await draftGreetingRuleFromPrompt({
      prompt: req.body?.prompt,
      brandName: req.tenant?.nombre,
    })
    res.json({ draft })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
    const skip = (page - 1) * limit
    const filter = { tenantId: req.tenant._id }
    const q = String(req.query.q || '').trim()
    if (q) {
      filter.$or = [
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { titulo: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ]
    }
    if (req.query.activo === 'true') filter.activo = true
    if (req.query.activo === 'false') filter.activo = false
    const et = String(req.query.eventType || '').trim()
    if (et) filter.eventType = et

    const typeMap = await loadGreetingTypeMap(req.tenant._id)
    const labelByKey = new Map([...typeMap.entries()].map(([k, t]) => [k, t.label || k]))

    const [items, total] = await Promise.all([
      GreetingRule.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      GreetingRule.countDocuments(filter),
    ])
    res.json({
      items: items.map((r) => serializeGreetingRule(r, labelByKey)),
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const body = req.body || {}
    const { typeConfig, allowedKeys } = await resolveRuleTypeContext(req.tenant._id, body.eventType)
    const errMsg = validateGreetingRuleInput(body, { allowedKeys, typeConfig })
    if (errMsg) return res.status(400).json({ error: errMsg })
    const norm = normalizeGreetingRuleInput(body, { typeConfig })
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const doc = await GreetingRule.create({
      tenantId: req.tenant._id,
      ...norm,
      audience,
      createdBy: req.user._id,
    })
    res.status(201).json({
      rule: serializeGreetingRule(doc, new Map([[doc.eventType, typeConfig?.label || doc.eventType]])),
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const rule = await GreetingRule.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!rule) return res.status(404).json({ error: 'Regla no encontrada' })
    const body = req.body || {}
    const merged = {
      name: body.name ?? rule.name,
      eventType: body.eventType ?? rule.eventType,
      titulo: body.titulo ?? rule.titulo,
      cuerpo: body.cuerpo ?? rule.cuerpo,
      imageUrl: body.imageUrl ?? rule.imageUrl,
      imageUrls: body.imageUrls ?? rule.imageUrls,
      audioUrl: body.audioUrl ?? rule.audioUrl,
      mediaKind: body.mediaKind ?? rule.mediaKind,
      mediaPick: body.mediaPick ?? rule.mediaPick,
      layout: body.layout ?? rule.layout,
      hours: body.hours ?? rule.hours,
      daysBefore: body.daysBefore ?? rule.daysBefore,
      fixedDay: body.fixedDay ?? rule.fixedDay,
      fixedMonth: body.fixedMonth ?? rule.fixedMonth,
      notifyAudience: body.notifyAudience ?? rule.notifyAudience,
      activo: body.activo ?? rule.activo,
    }
    const { typeConfig, allowedKeys } = await resolveRuleTypeContext(req.tenant._id, merged.eventType)
    const errMsg = validateGreetingRuleInput(merged, { allowedKeys, typeConfig })
    if (errMsg) return res.status(400).json({ error: errMsg })
    const norm = normalizeGreetingRuleInput(merged, { typeConfig })
    Object.assign(rule, norm)
    if (body.audience) {
      rule.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    }
    await rule.save()
    res.json({
      rule: serializeGreetingRule(rule, new Map([[rule.eventType, typeConfig?.label || rule.eventType]])),
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const r = await GreetingRule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!r) return res.status(404).json({ error: 'Regla no encontrada' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Ejecuta ya (ignora hora) — útil para prueba; sigue siendo idempotente por día/hora base. */
router.post('/:id/run', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const rule = await GreetingRule.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!rule) return res.status(404).json({ error: 'Regla no encontrada' })
    const results = await processDueGreetingRules({ forceRuleId: rule._id })
    res.json({ ok: true, result: results[0] || { created: 0 } })
  } catch (e) {
    next(e)
  }
})

export default router
