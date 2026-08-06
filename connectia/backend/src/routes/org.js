import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { buildOrgChart } from '../lib/orgChartBuild.js'

const router = Router()

/** Organigrama de lectura para miembros del tenant (§37.01). */
router.get('/chart', requireAuth, async (req, res, next) => {
  try {
    const chart = await buildOrgChart(req.tenant._id, {
      q: req.query.q,
      includeInactive: false,
    })
    res.json(chart)
  } catch (e) {
    next(e)
  }
})

export default router
