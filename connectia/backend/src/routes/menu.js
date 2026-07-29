import { Router } from 'express'
import { requireAuth, isFullAdmin } from '../middleware/auth.js'
import { MenuItem } from '../models/MenuItem.js'
import { capabilityForMenuKey } from '../constants/adminCapabilities.js'
import { ensureOla15MenuItems } from '../lib/ensureOla15Menu.js'
import { ensureOla17MenuItems } from '../lib/ensureOla17Menu.js'
import { ensureOla19MenuItems } from '../lib/ensureOla19Menu.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const channel = req.query.channel === 'a' ? 'a' : 'u'
    await ensureOla15MenuItems(req.tenant._id)
    await ensureOla17MenuItems(req.tenant._id)
    await ensureOla19MenuItems(req.tenant._id)
    const items = await MenuItem.find({
      tenantId: req.tenant._id,
      activo: true,
      channel: { $in: [channel, 'both'] },
    }).sort({ order: 1 })

    const roles = req.user.roles || []
    const caps = new Set([...(req.tenant.capabilities || []), ...(req.user.capabilities || [])])
    const fullAdmin = isFullAdmin(req.user)

    const filtered = items.filter((item) => {
      const needRoles = item.audience?.roles || []
      const needCaps = item.audience?.capabilities || []

      if (needRoles.length && !needRoles.some((r) => roles.includes(r))) return false

      // Canal admin: staff solo ve pantallas con permiso (admin completo ve todo)
      if (channel === 'a' && !fullAdmin) {
        const screenCap = capabilityForMenuKey(item.key)
        if (screenCap && !caps.has(screenCap)) return false
        if (item.key === 'admin.home') return true
      }

      if (needCaps.length && !fullAdmin && !needCaps.some((c) => caps.has(c))) return false
      return true
    })

    res.setHeader('X-Menu-Version', String(req.tenant.menuVersion || 1))
    res.json({
      allowDesktop: req.tenant.allowDesktop,
      menuVersion: req.tenant.menuVersion || 1,
      branding: req.tenant.branding,
      items: filtered.map((i) => ({
        key: i.key,
        label: i.label,
        route: i.route,
        icon: i.icon,
        order: i.order,
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
