import { Router } from 'express'
import { requireAuth, isFullAdmin } from '../middleware/auth.js'
import { MenuItem } from '../models/MenuItem.js'
import { capabilityForMenuKey } from '../constants/adminCapabilities.js'
import { isUserMenuItemAllowed } from '../constants/moduleCatalog.js'
import { ensureOla15MenuItems } from '../lib/ensureOla15Menu.js'
import { ensureOla17MenuItems } from '../lib/ensureOla17Menu.js'
import { ensureOla18MenuItems } from '../lib/ensureOla18Menu.js'
import { ensureOla19MenuItems } from '../lib/ensureOla19Menu.js'
import { ensureOla21MenuItems } from '../lib/ensureOla21Menu.js'
import { ensureOla22MenuItems } from '../lib/ensureOla22Menu.js'
import { ensureOla27MenuItems } from '../lib/ensureOla27Menu.js'
import { ensureOla26MenuItems } from '../lib/ensureOla26Menu.js'
import { ensureOla25MenuItems } from '../lib/ensureOla25Menu.js'
import { ensureOla28MenuItems } from '../lib/ensureOla28Menu.js'
import { ensureAdminChromePins } from '../lib/ensureAdminChromePins.js'
import { serializeBranding } from '../lib/mediaUrl.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const channel = req.query.channel === 'a' ? 'a' : 'u'
    await ensureOla15MenuItems(req.tenant._id)
    await ensureOla17MenuItems(req.tenant._id)
    await ensureOla18MenuItems(req.tenant._id)
    await ensureOla19MenuItems(req.tenant._id)
    await ensureOla21MenuItems(req.tenant._id)
    await ensureOla22MenuItems(req.tenant._id)
    await ensureOla27MenuItems(req.tenant._id)
    await ensureOla26MenuItems(req.tenant._id)
    await ensureOla25MenuItems(req.tenant._id)
    await ensureOla28MenuItems(req.tenant._id)
    if (channel === 'a') await ensureAdminChromePins(req.tenant._id)
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

      // Canal U: módulos del catálogo inactivos no aparecen en el menú lateral
      if (channel === 'u' && !isUserMenuItemAllowed(item, caps)) return false

      if (needCaps.length && !fullAdmin && !needCaps.some((c) => caps.has(c))) return false
      return true
    })

    res.setHeader('X-Menu-Version', String(req.tenant.menuVersion || 1))
    res.json({
      allowDesktop: req.tenant.allowDesktop,
      menuVersion: req.tenant.menuVersion || 1,
      branding: serializeBranding(req.tenant.branding),
      items: filtered.map((i) => ({
        id: String(i._id),
        key: i.key,
        label: i.label,
        route: i.route,
        icon: i.icon,
        order: i.order,
        showInTabbar: Boolean(i.showInTabbar),
        tabOrder: Number(i.tabOrder) || 100,
        showInAdminSidebar: Boolean(i.showInAdminSidebar),
        showInAdminHeader: Boolean(i.showInAdminHeader),
        actionType: i.actionType === 'compose_post' ? 'compose_post' : 'navigate',
        actionParams: i.actionParams && typeof i.actionParams === 'object' ? i.actionParams : {},
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
