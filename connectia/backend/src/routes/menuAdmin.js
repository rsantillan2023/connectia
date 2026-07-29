import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { MenuItem } from '../models/MenuItem.js'
import { Tenant } from '../models/Tenant.js'

const router = Router()

async function bumpMenuVersion(tenantId) {
  const t = await Tenant.findByIdAndUpdate(
    tenantId,
    { $inc: { menuVersion: 1 } },
    { new: true },
  )
  return t?.menuVersion || 1
}

function serialize(i) {
  return {
    id: i._id,
    key: i.key,
    label: i.label,
    route: i.route,
    icon: i.icon,
    order: i.order,
    channel: i.channel,
    activo: i.activo,
    audience: {
      roles: i.audience?.roles || [],
      capabilities: i.audience?.capabilities || [],
    },
  }
}

/** ABM menú del tenant */
router.get('/', requireAuth, requireCapability('admin.menu'), async (req, res, next) => {
  try {
    const channel = req.query.channel
    const filter = { tenantId: req.tenant._id }
    if (channel === 'u' || channel === 'a' || channel === 'both') {
      filter.channel = channel
    }
    const items = await MenuItem.find(filter).sort({ channel: 1, order: 1 })
    res.json({
      menuVersion: req.tenant.menuVersion,
      items: items.map(serialize),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.menu'), async (req, res, next) => {
  try {
    const { key, label, route, icon, order, channel, audience, activo } = req.body || {}
    if (!key || !label || !route) {
      return res.status(400).json({ error: 'key, label y route son obligatorios' })
    }
    const item = await MenuItem.create({
      tenantId: req.tenant._id,
      key: String(key).trim(),
      label: String(label).trim(),
      route: String(route).trim(),
      icon: icon || 'circle',
      order: Number(order) || 100,
      channel: ['u', 'a', 'both'].includes(channel) ? channel : 'u',
      activo: activo !== false,
      audience: {
        roles: audience?.roles || [],
        capabilities: audience?.capabilities || [],
      },
    })
    const menuVersion = await bumpMenuVersion(req.tenant._id)
    res.status(201).json({ item: serialize(item), menuVersion })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe un ítem con esa key' })
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.menu'), async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' })
    const body = req.body || {}
    if (typeof body.label === 'string') item.label = body.label.trim()
    if (typeof body.route === 'string') item.route = body.route.trim()
    if (typeof body.icon === 'string') item.icon = body.icon
    if (body.order != null) item.order = Number(body.order)
    if (['u', 'a', 'both'].includes(body.channel)) item.channel = body.channel
    if (typeof body.activo === 'boolean') item.activo = body.activo
    if (body.audience) {
      item.audience = {
        roles: body.audience.roles || [],
        capabilities: body.audience.capabilities || [],
      }
    }
    await item.save()
    const menuVersion = await bumpMenuVersion(req.tenant._id)
    res.json({ item: serialize(item), menuVersion })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.menu'), async (req, res, next) => {
  try {
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id })
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' })
    const menuVersion = await bumpMenuVersion(req.tenant._id)
    res.json({ ok: true, menuVersion })
  } catch (e) {
    next(e)
  }
})

export default router
