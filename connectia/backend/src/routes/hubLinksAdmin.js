import { Router } from 'express'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience } from '../lib/audience.js'
import { HUB_ICONS } from '../lib/hubIcons.js'
import { parseVisibleUntil, defaultVisibleUntil } from '../lib/hubVisibility.js'
import {
  HUB_KINDS,
  normalizeHubKind,
  openModeForKind,
  validateHubLinkPayload,
} from '../lib/hubKinds.js'
import { serializeLink } from './hubLinks.js'
import { RequestType } from '../models/RequestType.js'
import { Survey } from '../models/Survey.js'
import { DocItem } from '../models/DocItem.js'
import { Post } from '../models/Post.js'
import {
  hubAiConfigured,
  HUB_AI_GUIDE,
  planHubOpsFromPrompt,
  applyHubOps,
  suggestHubDestinationFromPrompt,
} from '../services/hubAi.js'

const router = Router()
const MAX_QUICK_PER_CATEGORY = 48

/** Tope blando de accesos rápidos (featured) por grupo; en app se scrollean. */
async function assertQuickSlotAvailable(tenantId, category, { excludeId = null, enabling = true } = {}) {
  if (!enabling) return null
  const filter = {
    tenantId,
    category: String(category || 'General').trim() || 'General',
    featured: true,
  }
  if (excludeId) filter._id = { $ne: excludeId }
  const count = await HubLink.countDocuments(filter)
  if (count >= MAX_QUICK_PER_CATEGORY) {
    return `Ya hay ${MAX_QUICK_PER_CATEGORY} accesos rápidos en «${filter.category}». Quitá uno antes de agregar otro.`
  }
  return null
}

function normalizeParams(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return { ...raw }
}

function resolveTargetAndParams(body) {
  const kind = normalizeHubKind(body.kind, body.openMode)
  const params = normalizeParams(body.params)
  let target = String(body.target ?? body.url ?? '').trim()

  if (kind === 'request') {
    const id = body.requestTypeId || params.requestTypeId || target
    if (id) {
      params.requestTypeId = String(id)
      target = String(id)
    }
  }
  if (kind === 'survey') {
    const id = body.surveyId || params.surveyId || target
    if (id) {
      params.surveyId = String(id)
      target = String(id)
    }
  }
  if (kind === 'document') {
    const id = body.docId || params.docId || target
    if (id) {
      params.docId = String(id)
      target = String(id)
    }
  }
  if (kind === 'post') {
    const id = body.postId || params.postId || target
    if (id) {
      params.postId = String(id)
      target = String(id)
    }
  }
  if (kind === 'copy') {
    const text = body.copyText || params.copyText || params.text || target
    params.copyText = String(text || '')
    if (!target) target = params.copyText
  }
  if (kind === 'mailto') {
    if (body.subject != null) params.subject = String(body.subject)
    if (body.body != null) params.body = String(body.body)
  }
  if (kind === 'whatsapp' && body.text != null) params.text = String(body.text)
  if ((kind === 'url' || kind === 'route') && body.queryText != null) {
    // queryText as key=value lines optional - skip, use params.query
  }
  if (body.query && typeof body.query === 'object') params.query = body.query

  return { kind, target, params }
}

function serializeCategory(c, count = 0) {
  return {
    id: String(c._id),
    nombre: c.nombre,
    orden: c.orden ?? 100,
    activo: c.activo !== false,
    showOnMuro: c.showOnMuro !== false,
    iconSize: ['sm', 'md', 'lg'].includes(c.iconSize) ? c.iconSize : 'md',
    count,
  }
}

async function ensureCategoriesFromLinks(tenantId) {
  const cats = await HubLink.distinct('category', { tenantId })
  let orden = 10
  for (const nombre of cats.filter(Boolean).sort()) {
    const existing = await HubCategory.findOne({ tenantId, nombre }).lean()
    if (!existing) {
      await HubCategory.create({ tenantId, nombre, orden, activo: true, iconSize: 'md' })
      orden += 10
    }
  }
}

async function ensureCategory(tenantId, nombre) {
  const name = String(nombre || 'General').trim().slice(0, 80) || 'General'
  let cat = await HubCategory.findOne({ tenantId, nombre: name })
  if (!cat) {
    const max = await HubCategory.findOne({ tenantId }).sort({ orden: -1 }).lean()
    cat = await HubCategory.create({
      tenantId,
      nombre: name,
      orden: (max?.orden || 0) + 10,
      activo: true,
      iconSize: 'md',
    })
  }
  return cat
}

router.get('/', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    await ensureCategoriesFromLinks(tenantId)
    const [items, categories] = await Promise.all([
      HubLink.find({ tenantId }).sort({ order: 1, titulo: 1 }).lean(),
      HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean(),
    ])
    const counts = {}
    for (const l of items) {
      const k = l.category || 'General'
      counts[k] = (counts[k] || 0) + 1
    }
    res.json({
      items: items.map((l) => serializeLink(l, null, { resolveSize: false })),
      categories: categories.map((c) => serializeCategory(c, counts[c.nombre] || 0)),
      icons: HUB_ICONS,
      kinds: HUB_KINDS,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/ai-status', requireAuth, requireCapability('admin.hub'), (_req, res) => {
  res.json({ configured: hubAiConfigured(), maxQuickPerCategory: MAX_QUICK_PER_CATEGORY })
})

router.get('/ai-guide', requireAuth, requireCapability('admin.hub'), (_req, res) => {
  res.json({ guide: HUB_AI_GUIDE, configured: hubAiConfigured() })
})

/**
 * Planifica cambios como operador (sin aplicar).
 * Body: { prompt, intent?: 'edit'|'create' }
 */
router.post('/ai-plan', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    await ensureCategoriesFromLinks(tenantId)
    const [items, categories] = await Promise.all([
      HubLink.find({ tenantId }).sort({ order: 1, titulo: 1 }).lean(),
      HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean(),
    ])
    const branding = req.tenant?.branding || {}
    const plan = await planHubOpsFromPrompt({
      prompt: req.body?.prompt,
      intent: req.body?.intent === 'create' ? 'create' : 'edit',
      categories: categories.map((c) => serializeCategory(c)),
      links: items.map((l) => serializeLink(l, null, { resolveSize: false })),
      brandName: req.tenant?.nombre || '',
      brandColor: branding.primaryColor || branding.primary || '',
    })
    res.json(plan)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * Aplica un plan (ops) o planifica+aplica si viene prompt y apply=true.
 * Body: { ops } | { prompt, apply: true, intent?: 'edit'|'create' }
 */
router.post('/ai-apply', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    let ops = Array.isArray(req.body?.ops) ? req.body.ops : null
    let plan = null

    if (!ops?.length && req.body?.prompt) {
      await ensureCategoriesFromLinks(tenantId)
      const [items, categories] = await Promise.all([
        HubLink.find({ tenantId }).sort({ order: 1, titulo: 1 }).lean(),
        HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean(),
      ])
      const branding = req.tenant?.branding || {}
      plan = await planHubOpsFromPrompt({
        prompt: req.body.prompt,
        intent: req.body?.intent === 'create' ? 'create' : 'edit',
        categories: categories.map((c) => serializeCategory(c)),
        links: items.map((l) => serializeLink(l, null, { resolveSize: false })),
        brandName: req.tenant?.nombre || '',
        brandColor: branding.primaryColor || branding.primary || '',
      })
      ops = plan.ops
    }

    if (!ops?.length) {
      return res.status(400).json({
        error: plan?.explanation || 'No hay operaciones para aplicar',
        plan,
      })
    }

    const result = await applyHubOps({ tenantId, ops })
    await ensureCategoriesFromLinks(tenantId)
    const [items, categories] = await Promise.all([
      HubLink.find({ tenantId }).sort({ order: 1, titulo: 1 }).lean(),
      HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean(),
    ])
    const counts = {}
    for (const l of items) {
      const k = l.category || 'General'
      counts[k] = (counts[k] || 0) + 1
    }

    res.json({
      ...result,
      plan,
      items: items.map((l) => serializeLink(l, null, { resolveSize: false })),
      categories: categories.map((c) => serializeCategory(c, counts[c.nombre] || 0)),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * Sugiere / completa el destino de un enlace (sin guardar).
 * Body: { prompt, draft?: { titulo, kind, target, ... } }
 */
router.post('/ai-suggest-destination', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [requestTypes, surveys, documents, posts] = await Promise.all([
      RequestType.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }).select('nombre key area').lean(),
      Survey.find({ tenantId, status: { $in: ['published', 'draft', 'closed'] } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo status')
        .lean(),
      DocItem.find({ tenantId, status: { $ne: 'archived' } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo category status')
        .lean(),
      Post.find({ tenantId, status: { $in: ['published', 'draft'] } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo status')
        .lean(),
    ])
    const catalog = {
      requestTypes: requestTypes.map((t) => ({
        id: String(t._id),
        nombre: t.nombre,
        key: t.key,
        area: t.area || '',
      })),
      surveys: surveys.map((s) => ({ id: String(s._id), titulo: s.titulo, status: s.status })),
      documents: documents.map((d) => ({
        id: String(d._id),
        titulo: d.titulo,
        category: d.category || '',
      })),
      posts: posts.map((p) => ({ id: String(p._id), titulo: p.titulo, status: p.status })),
    }
    const suggestion = await suggestHubDestinationFromPrompt({
      prompt: req.body?.prompt,
      draft: req.body?.draft && typeof req.body.draft === 'object' ? req.body.draft : {},
      catalog,
      brandName: req.tenant?.nombre || '',
    })
    res.json(suggestion)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.get('/options', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [requestTypes, surveys, documents, posts] = await Promise.all([
      RequestType.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }).select('nombre key area').lean(),
      Survey.find({ tenantId, status: { $in: ['published', 'draft', 'closed'] } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo status')
        .lean(),
      DocItem.find({ tenantId, status: { $ne: 'archived' } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo category status')
        .lean(),
      Post.find({ tenantId, status: { $in: ['published', 'draft'] } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .select('titulo status')
        .lean(),
    ])
    res.json({
      kinds: HUB_KINDS,
      requestTypes: requestTypes.map((t) => ({
        id: String(t._id),
        nombre: t.nombre,
        key: t.key,
        area: t.area || '',
      })),
      surveys: surveys.map((s) => ({
        id: String(s._id),
        titulo: s.titulo,
        status: s.status,
      })),
      documents: documents.map((d) => ({
        id: String(d._id),
        titulo: d.titulo,
        category: d.category || '',
        status: d.status,
      })),
      posts: posts.map((p) => ({
        id: String(p._id),
        titulo: p.titulo,
        status: p.status,
      })),
      templates: [
        '{{usuario}}',
        '{{legajo}}',
        '{{nombre}}',
        '{{email}}',
        '{{empCodigo}}',
        '{{tenant}}',
        '{{userId}}',
      ],
    })
  } catch (e) {
    next(e)
  }
})

router.post('/reorder', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const list = Array.isArray(req.body?.items) ? req.body.items : []
    for (const row of list) {
      if (!row?.id) continue
      const order = Number(row.order)
      if (!Number.isFinite(order)) continue
      await HubLink.updateOne({ _id: row.id, tenantId }, { $set: { order } })
    }
    const items = await HubLink.find({ tenantId }).sort({ order: 1, titulo: 1 }).lean()
    res.json({ items: items.map((l) => serializeLink(l, null, { resolveSize: false })) })
  } catch (e) {
    next(e)
  }
})

router.put('/categories', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const list = Array.isArray(req.body?.categories) ? req.body.categories : []
    for (const row of list) {
      if (!row?.nombre) continue
      const patch = {}
      if (row.orden != null && Number.isFinite(Number(row.orden))) patch.orden = Number(row.orden)
      if (row.activo != null) patch.activo = Boolean(row.activo)
      if (row.showOnMuro != null) patch.showOnMuro = Boolean(row.showOnMuro)
      if (row.iconSize != null && ['sm', 'md', 'lg'].includes(row.iconSize)) patch.iconSize = row.iconSize
      if (Object.keys(patch).length) {
        await HubCategory.updateOne({ tenantId, nombre: String(row.nombre) }, { $set: patch })
      }
    }
    const categories = await HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean()
    res.json({ categories: categories.map((c) => serializeCategory(c)) })
  } catch (e) {
    next(e)
  }
})

router.post('/categories/rename', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const from = String(req.body?.from || '').trim()
    const to = String(req.body?.to || '').trim().slice(0, 80)
    if (!from || !to) return res.status(400).json({ error: 'from y to son requeridos' })
    if (from === to) return res.json({ ok: true })

    const cat = await HubCategory.findOne({ tenantId, nombre: from })
    if (!cat) return res.status(404).json({ error: 'Grupo no encontrado' })

    const clash = await HubCategory.findOne({ tenantId, nombre: to })
    if (clash) return res.status(400).json({ error: 'Ya existe un grupo con ese nombre' })

    cat.nombre = to
    await cat.save()
    await HubLink.updateMany({ tenantId, category: from }, { $set: { category: to } })
    res.json({ ok: true, category: serializeCategory(cat) })
  } catch (e) {
    next(e)
  }
})

router.post('/categories', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const nombre = String(req.body?.nombre || '').trim().slice(0, 80)
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
    const existing = await HubCategory.findOne({ tenantId, nombre })
    if (existing) return res.status(400).json({ error: 'El grupo ya existe' })
    const max = await HubCategory.findOne({ tenantId }).sort({ orden: -1 }).lean()
    const cat = await HubCategory.create({
      tenantId,
      nombre,
      orden: (max?.orden || 0) + 10,
      activo: true,
      showOnMuro: req.body?.showOnMuro !== false,
      iconSize: ['sm', 'md', 'lg'].includes(req.body?.iconSize) ? req.body.iconSize : 'md',
    })
    res.status(201).json({ category: serializeCategory(cat) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!String(body.titulo || '').trim()) {
      return res.status(400).json({ error: 'Título es requerido' })
    }
    const { kind, target, params } = resolveTargetAndParams(body)
    const err = validateHubLinkPayload({ kind, target, params })
    if (err) return res.status(400).json({ error: err })

    const category = String(body.category || 'General').trim().slice(0, 80) || 'General'
    await ensureCategory(req.tenant._id, category)
    const iconSize =
      body.iconSize === null || body.iconSize === '' || body.iconSize === 'inherit'
        ? null
        : ['sm', 'md', 'lg'].includes(body.iconSize)
          ? body.iconSize
          : null
    const visibleUntil = parseVisibleUntil(body.visibleUntil ?? body.visibleUntilDate)
    if (!visibleUntil) return res.status(400).json({ error: 'Fecha de vencimiento inválida' })
    const featured = Boolean(body.featured)
    if (featured) {
      const limitErr = await assertQuickSlotAvailable(req.tenant._id, category, { enabling: true })
      if (limitErr) return res.status(400).json({ error: limitErr })
    }
    const doc = await HubLink.create({
      tenantId: req.tenant._id,
      titulo: String(body.titulo).trim().slice(0, 120),
      subtitulo: String(body.subtitulo || '').slice(0, 200),
      kind,
      target,
      url: target,
      params,
      category,
      icon: String(body.icon || 'grid').slice(0, 40),
      color: String(body.color || '').slice(0, 32),
      iconSize,
      order: Number.isFinite(Number(body.order)) ? Number(body.order) : 100,
      activo: body.activo !== false,
      featured,
      visibleUntil,
      openMode: openModeForKind(kind),
      audience: normalizeAudience(body.audience),
    })
    res.status(201).json({ link: serializeLink(doc, null, { resolveSize: false }) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const doc = await HubLink.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 120)
    if (body.subtitulo != null) doc.subtitulo = String(body.subtitulo).slice(0, 200)

    const touchingKind =
      body.kind != null ||
      body.target != null ||
      body.url != null ||
      body.params != null ||
      body.requestTypeId != null ||
      body.surveyId != null ||
      body.docId != null ||
      body.postId != null ||
      body.copyText != null ||
      body.openMode != null

    if (touchingKind) {
      const { kind, target, params } = resolveTargetAndParams({
        kind: body.kind ?? doc.kind,
        openMode: body.openMode ?? doc.openMode,
        target: body.target ?? body.url ?? doc.target ?? doc.url,
        url: body.url,
        params: body.params != null ? body.params : doc.params,
        requestTypeId: body.requestTypeId,
        surveyId: body.surveyId,
        docId: body.docId,
        postId: body.postId,
        copyText: body.copyText,
        subject: body.subject,
        body: body.mailBody ?? body.bodyText,
        text: body.text,
        query: body.query,
      })
      // mailto subject/body from dedicated fields
      if (body.mailSubject != null) params.subject = String(body.mailSubject)
      if (body.mailBody != null) params.body = String(body.mailBody)
      const err = validateHubLinkPayload({ kind, target, params })
      if (err) return res.status(400).json({ error: err })
      doc.kind = kind
      doc.target = target
      doc.url = target
      doc.params = params
      doc.openMode = openModeForKind(kind)
    }

    if (body.category != null) {
      const nextCategory = String(body.category).trim().slice(0, 80) || 'General'
      if (doc.featured && nextCategory !== (doc.category || 'General')) {
        const limitErr = await assertQuickSlotAvailable(req.tenant._id, nextCategory, {
          excludeId: doc._id,
          enabling: true,
        })
        if (limitErr) return res.status(400).json({ error: limitErr })
      }
      doc.category = nextCategory
      await ensureCategory(req.tenant._id, doc.category)
    }
    if (body.icon != null) doc.icon = String(body.icon).slice(0, 40)
    if (body.color != null) doc.color = String(body.color).slice(0, 32)
    if (body.iconSize !== undefined) {
      doc.iconSize =
        body.iconSize === null || body.iconSize === '' || body.iconSize === 'inherit'
          ? null
          : ['sm', 'md', 'lg'].includes(body.iconSize)
            ? body.iconSize
            : doc.iconSize
    }
    if (body.order != null && Number.isFinite(Number(body.order))) doc.order = Number(body.order)
    if (body.activo != null) doc.activo = Boolean(body.activo)
    if (body.featured != null) {
      const nextFeatured = Boolean(body.featured)
      const nextCategory =
        body.category != null
          ? String(body.category).trim().slice(0, 80) || 'General'
          : doc.category || 'General'
      if (nextFeatured && !doc.featured) {
        const limitErr = await assertQuickSlotAvailable(req.tenant._id, nextCategory, {
          excludeId: doc._id,
          enabling: true,
        })
        if (limitErr) return res.status(400).json({ error: limitErr })
      }
      doc.featured = nextFeatured
    }
    if (body.visibleUntil !== undefined || body.visibleUntilDate !== undefined) {
      const parsed = parseVisibleUntil(body.visibleUntil ?? body.visibleUntilDate)
      if (!parsed) return res.status(400).json({ error: 'Fecha de vencimiento inválida' })
      doc.visibleUntil = parsed
    }
    if (body.audience) doc.audience = normalizeAudience(body.audience)
    if (!doc.visibleUntil) doc.visibleUntil = defaultVisibleUntil()
    await doc.save()
    res.json({ link: serializeLink(doc, null, { resolveSize: false }) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.hub'), async (req, res, next) => {
  try {
    const r = await HubLink.deleteOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r.deletedCount) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
