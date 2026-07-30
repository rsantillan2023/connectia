import { Router } from 'express'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { requireAuth } from '../middleware/auth.js'
import { audienceFilterForUser, userMatchesAudience, serializeAudience } from '../lib/audience.js'
import {
  defaultVisibleUntil,
  formatVisibleUntilInput,
  isLinkVisibleNow,
  isTemporaryVisibleUntil,
  categoryVisibleOnSurface,
} from '../lib/hubVisibility.js'
import {
  normalizeHubKind,
  openModeForKind,
  buildTemplateContext,
  resolveHubAction,
  applyTemplates,
} from '../lib/hubKinds.js'
import { getOrCreateWalletAccount, tenantHasWallet } from '../lib/walletService.js'

const router = Router()

function serializeLink(l, categoryMeta = null, opts = {}) {
  const resolveSize = opts.resolveSize !== false
  const catSize = categoryMeta?.iconSize
  const linkSize = l.iconSize || null
  const resolved = ['sm', 'md', 'lg'].includes(linkSize)
    ? linkSize
    : ['sm', 'md', 'lg'].includes(catSize)
      ? catSize
      : 'md'
  const visibleUntil = l.visibleUntil || defaultVisibleUntil()
  const kind = normalizeHubKind(l.kind, l.openMode)
  const target = l.target || l.url || ''
  const ctx = opts.templateCtx
  const titulo = ctx ? applyTemplates(l.titulo || '', ctx) : l.titulo
  const subtitulo = ctx ? applyTemplates(l.subtitulo || '', ctx) : l.subtitulo || ''
  return {
    id: String(l._id),
    titulo,
    subtitulo,
    kind,
    target,
    url: target,
    params: l.params && typeof l.params === 'object' ? l.params : {},
    category: l.category || 'General',
    icon: l.icon || 'grid',
    color: l.color || '',
    iconSize: resolveSize ? resolved : linkSize,
    order: l.order ?? 100,
    activo: l.activo !== false,
    featured: Boolean(l.featured),
    openMode: openModeForKind(kind),
    visibleUntil,
    visibleUntilDate: formatVisibleUntilInput(visibleUntil),
    temporary: isTemporaryVisibleUntil(visibleUntil),
    expired: !isLinkVisibleNow(l),
    audience: serializeAudience(l.audience),
    clickCount: l.clickCount || 0,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const now = new Date()
    const surface = String(req.query.for || req.query.surface || 'hub').toLowerCase() === 'muro'
      ? 'muro'
      : 'hub'
    const [items, categories] = await Promise.all([
      HubLink.find({
        tenantId,
        activo: true,
        $and: [
          audienceFilterForUser(req.user),
          {
            $or: [{ visibleUntil: { $exists: false } }, { visibleUntil: null }, { visibleUntil: { $gte: now } }],
          },
        ],
      })
        .sort({ order: 1, titulo: 1 })
        .lean(),
      HubCategory.find({ tenantId }).sort({ orden: 1, nombre: 1 }).lean(),
    ])

    const catByName = Object.fromEntries(categories.map((c) => [c.nombre, c]))
    const surfaceCatNames = new Set(
      categories.filter((c) => categoryVisibleOnSurface(c, surface)).map((c) => c.nombre),
    )
    const hasCats = categories.length > 0

    let templateCtx = buildTemplateContext(req.user, req.tenant)
    try {
      if (tenantHasWallet(req.tenant)) {
        const acc = await getOrCreateWalletAccount(tenantId, req.user._id)
        templateCtx = buildTemplateContext(req.user, req.tenant, { puntos: acc.balance })
      }
    } catch {
      /* sin billetera: contexto sin puntos */
    }

    const visible = items.filter((l) => {
      if (!isLinkVisibleNow(l, now)) return false
      if (!hasCats) return true
      const name = l.category || 'General'
      if (!catByName[name]) return true
      return surfaceCatNames.has(name)
    })

    const byCat = {}
    for (const l of visible) {
      const cat = l.category || 'General'
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(serializeLink(l, catByName[cat], { templateCtx }))
    }

    const orderedCats = [
      ...categories
        .filter((c) => categoryVisibleOnSurface(c, surface) && byCat[c.nombre]?.length)
        .map((c) => c.nombre),
      ...Object.keys(byCat).filter((n) => !categories.some((c) => c.nombre === n)),
    ]

    /** Hasta 3 accesos rápidos por pestaña; si no hay featured, usa los primeros 3 del grupo. */
    const quickByCategory = {}
    for (const cat of orderedCats) {
      const list = byCat[cat] || []
      const featured = list.filter((l) => l.featured)
      quickByCategory[cat] = (featured.length ? featured : list).slice(0, 3)
    }

    res.json({
      items: visible.map((l) => serializeLink(l, catByName[l.category || 'General'], { templateCtx })),
      categories: orderedCats,
      grouped: byCat,
      quickByCategory,
      maxQuickPerCategory: 3,
      surface,
      categoryMeta: categories
        .filter((c) => categoryVisibleOnSurface(c, surface))
        .map((c) => ({
          nombre: c.nombre,
          orden: c.orden,
          iconSize: c.iconSize || 'md',
          showOnMuro: c.showOnMuro !== false,
        })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/click', requireAuth, async (req, res, next) => {
  try {
    const link = await HubLink.findOne({ _id: req.params.id, tenantId: req.tenant._id, activo: true })
    if (!link || !userMatchesAudience(req.user, link.audience)) {
      return res.status(404).json({ error: 'Enlace no encontrado' })
    }
    if (!isLinkVisibleNow(link)) {
      return res.status(404).json({ error: 'Enlace vencido' })
    }
    const cat = await HubCategory.findOne({ tenantId: req.tenant._id, nombre: link.category || 'General' }).lean()
    if (cat && cat.activo === false) {
      return res.status(404).json({ error: 'Enlace no encontrado' })
    }

    link.clickCount = (link.clickCount || 0) + 1
    await link.save()

    const ctx = buildTemplateContext(req.user, req.tenant)
    try {
      if (tenantHasWallet(req.tenant)) {
        const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
        Object.assign(ctx, buildTemplateContext(req.user, req.tenant, { puntos: acc.balance }))
      }
    } catch {
      /* ignore */
    }
    const resolved = resolveHubAction(link.toObject ? link.toObject() : link, ctx)

    res.json({
      ...resolved,
      titulo: applyTemplates(link.titulo || '', ctx),
      subtitulo: applyTemplates(link.subtitulo || '', ctx),
      kind: normalizeHubKind(link.kind, link.openMode),
      openMode: openModeForKind(normalizeHubKind(link.kind, link.openMode)),
      url: resolved.url || link.target || link.url,
      clickCount: link.clickCount,
    })
  } catch (e) {
    next(e)
  }
})

export { serializeLink }
export default router
