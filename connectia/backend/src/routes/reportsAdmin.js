import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability, hasCapability, isFullAdmin } from '../middleware/auth.js'
import {
  resolveReportWindow,
  computeAdoption,
  rankPostsByEngagement,
  countByKey,
  toExportPayload,
  aggregateEventRsvps,
} from '../lib/reportsMetrics.js'
import { rowsToXlsxBuffer, channelFromUa } from '../lib/xlsxExport.js'
import { User } from '../models/User.js'
import { Post } from '../models/Post.js'
import { Comment } from '../models/Comment.js'
import { SavedPost } from '../models/SavedPost.js'
import { PostView } from '../models/PostView.js'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { Request } from '../models/Request.js'
import { DocumentDownload } from '../models/DocumentDownload.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { ActivityEvent } from '../models/ActivityEvent.js'
import { PushCampaign } from '../models/PushCampaign.js'
import { Event, EventRsvp } from '../models/Event.js'
import { buildCampaignPayload, validateCampaignPayload } from '../lib/pushCampaignPayload.js'
import { serializeCampaign, dispatchPushCampaign } from '../services/notifyCampaign.js'

const router = Router()
const { ObjectId } = mongoose.Types
const requireReports = requireCapability('admin.reportes')

async function resolveOrgFilters(tenantId, query) {
  const filter = { tenantId, activo: true }
  const areaId = String(query.areaId || '').trim()
  const groupId = String(query.groupId || '').trim()
  if (areaId && ObjectId.isValid(areaId)) filter.areaId = new ObjectId(areaId)
  if (groupId && ObjectId.isValid(groupId)) filter.groupIds = new ObjectId(groupId)
  return filter
}

function wantsExport(query) {
  const e = String(query.export || '').toLowerCase()
  return e === '1' || e === 'csv' || e === 'xlsx' || e === 'excel'
}

function wantsXlsx(query) {
  const e = String(query.export || '').toLowerCase()
  return e === 'xlsx' || e === 'excel'
}

function sendExport(res, query, fields, rows, sheetName) {
  const payload = toExportPayload(fields, rows)
  if (wantsXlsx(query)) {
    const buf = rowsToXlsxBuffer(payload.fields, payload.rows, sheetName)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName || 'reporte'}.xlsx"`)
    return res.send(buf)
  }
  return res.json(payload)
}

router.get('/adoption', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const userFilter = await resolveOrgFilters(req.tenant._id, req.query)
    const users = await User.find(userFilter)
      .select('nombre apellido usuario email lastLoginAt areaId groupIds activo cargo')
      .lean()

    const mapped = users.map((u) => ({
      id: String(u._id),
      lastLoginAt: u.lastLoginAt || null,
      activo: u.activo !== false,
    }))
    const summary = computeAdoption(mapped, window)

    const loginEvents = await ActivityEvent.find({
      tenantId: req.tenant._id,
      action: 'login',
      createdAt: { $gte: window.from, $lte: window.to },
    })
      .select('userId userAgent')
      .lean()
    const byChannel = { mobile: 0, desktop: 0, unknown: 0 }
    const seenUser = new Set()
    for (const ev of loginEvents) {
      const uid = ev.userId ? String(ev.userId) : ''
      if (!uid || seenUser.has(uid)) continue
      seenUser.add(uid)
      byChannel[channelFromUa(ev.userAgent)] += 1
    }

    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]))
    const pick = (ids, limit = 200) =>
      ids.slice(0, limit).map((id) => {
        const u = byId[id]
        return {
          id,
          nombre: [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || u?.usuario || '',
          usuario: u?.usuario || '',
          email: u?.email || '',
          cargo: u?.cargo || '',
          lastLoginAt: u?.lastLoginAt || null,
        }
      })

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      summary: {
        active: summary.active,
        inactive: summary.inactive,
        never: summary.never,
        considered: summary.considered,
        pctAdopcion: summary.pctAdopcion,
        byChannel,
      },
      lists: {
        active: pick(summary.activeIds),
        inactive: pick(summary.inactiveIds),
        never: pick(summary.neverIds),
      },
      definition:
        'Activo = login (lastLoginAt) en el rango. Canal = último login en ventana (User-Agent).',
    }

    if (wantsExport(req.query)) {
      const segment = String(req.query.segment || 'inactive')
      const rows = (payload.lists[segment] || payload.lists.inactive).map((r) => ({
        usuario: r.usuario,
        nombre: r.nombre,
        email: r.email,
        cargo: r.cargo,
        lastLoginAt: r.lastLoginAt ? new Date(r.lastLoginAt).toISOString() : '',
        segmento: segment,
      }))
      return sendExport(
        res,
        req.query,
        ['usuario', 'nombre', 'email', 'cargo', 'lastLoginAt', 'segmento'],
        rows,
        'adopcion',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** Campaña de impulso al segmento de adopción (§29.02) */
router.post('/adoption/boost', requireAuth, requireReports, async (req, res, next) => {
  try {
    if (!isFullAdmin(req.user) && !hasCapability(req.user, req.tenant, 'admin.notificaciones')) {
      return res.status(403).json({ error: 'Se requiere permiso admin.notificaciones para enviar campañas' })
    }

    const window = resolveReportWindow({ ...req.query, ...req.body })
    const userFilter = await resolveOrgFilters(req.tenant._id, { ...req.query, ...req.body })
    const users = await User.find(userFilter).select('lastLoginAt activo').lean()
    const summary = computeAdoption(
      users.map((u) => ({ id: String(u._id), lastLoginAt: u.lastLoginAt, activo: u.activo !== false })),
      window,
    )
    const segment = String(req.body.segment || 'inactive')
    const idList =
      segment === 'never'
        ? summary.neverIds
        : segment === 'active'
          ? summary.activeIds
          : summary.inactiveIds
    if (!idList.length) {
      return res.status(400).json({ error: 'El segmento no tiene destinatarios' })
    }

    const days = Math.max(
      1,
      Math.round((window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000)),
    )
    const payload = buildCampaignPayload({
      title: req.body.title || req.body.titulo || 'Te extrañamos en la comunidad',
      body:
        req.body.body ||
        req.body.cuerpo ||
        (segment === 'never'
          ? 'Todavía no entraste a la app. Entrá y mirá las novedades.'
          : 'Hace un tiempo que no nos visitás. Volvé a Connectia.'),
      href: req.body.href || '/',
      name: req.body.name || `Impulso ${segment} ${days}d`,
      audience: { mode: 'users', userIds: idList },
      segment: 'audience',
      sendType: req.body.sendType === 'scheduled' ? 'scheduled' : 'now',
      scheduledAt: req.body.scheduledAt,
      channels: req.body.channels,
    })
    const err = validateCampaignPayload(payload)
    if (err) return res.status(400).json({ error: err })

    const doc = await PushCampaign.create({
      tenantId: req.tenant._id,
      ...payload,
      status: payload.sendType === 'scheduled' ? 'scheduled' : 'draft',
      createdBy: req.user._id,
    })

    let campaign = doc.toObject()
    const shouldSend = req.body.send !== false && req.body.draft !== true && payload.sendType === 'now'
    if (shouldSend) {
      campaign = await dispatchPushCampaign(doc._id, { tenant: req.tenant })
    }

    res.status(201).json({
      campaign: serializeCampaign(campaign),
      targeted: idList.length,
      segment,
      sent: shouldSend,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/wall', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const posts = await Post.find({
      tenantId,
      status: 'published',
      publishedAt: { $gte: window.from, $lte: window.to },
    })
      .select('titulo tipo publishedAt reactions origin viewCount')
      .lean()

    const postIds = posts.map((p) => p._id)
    const [commentAgg, saveAgg, viewAgg] = postIds.length
      ? await Promise.all([
          Comment.aggregate([
            { $match: { tenantId, postId: { $in: postIds }, status: { $nin: ['hidden', 'deleted'] } } },
            { $group: { _id: '$postId', n: { $sum: 1 } } },
          ]),
          SavedPost.aggregate([
            { $match: { tenantId, postId: { $in: postIds } } },
            { $group: { _id: '$postId', n: { $sum: 1 } } },
          ]),
          PostView.aggregate([
            {
              $match: {
                tenantId,
                postId: { $in: postIds },
                kind: 'detail',
                createdAt: { $gte: window.from, $lte: window.to },
              },
            },
            { $group: { _id: '$postId', n: { $sum: 1 }, uniques: { $addToSet: '$userId' } } },
          ]),
        ])
      : [[], [], []]
    const commentsByPost = Object.fromEntries(commentAgg.map((c) => [String(c._id), c.n]))
    const savesByPost = Object.fromEntries(saveAgg.map((c) => [String(c._id), c.n]))
    const viewsByPost = Object.fromEntries(
      viewAgg.map((c) => [String(c._id), { views: c.n, uniqueViews: (c.uniques || []).length }]),
    )

    const rankedInput = posts.map((p) => {
      const v = viewsByPost[String(p._id)] || { views: 0, uniqueViews: 0 }
      return {
        id: String(p._id),
        titulo: p.titulo,
        tipo: p.tipo,
        origin: p.origin || 'admin',
        publishedAt: p.publishedAt,
        reactions: p.reactions || {},
        commentCount: commentsByPost[String(p._id)] || 0,
        saveCount: savesByPost[String(p._id)] || 0,
        viewCount: p.viewCount || 0,
        uniqueViews: v.uniqueViews,
      }
    })

    const sortBy = String(req.query.sort || 'engagement')
    const ranking = rankPostsByEngagement(rankedInput, Number(req.query.limit) || 50, sortBy)
    const byTipo = countByKey(posts, (p) => p.tipo || 'general')
    const byOrigin = countByKey(posts, (p) => p.origin || 'admin')

    const totals = ranking.reduce(
      (acc, r) => {
        acc.reactions += r.reactions
        acc.comments += r.comments
        acc.views += r.views || 0
        acc.engagement += r.engagement
        return acc
      },
      { posts: posts.length, reactions: 0, comments: 0, views: 0, engagement: 0 },
    )

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals,
      byTipo,
      byOrigin,
      ranking,
      note: 'Engagement = reacciones + comentarios + guardados + vistas únicas en el período.',
    }

    if (wantsExport(req.query)) {
      const rows = ranking.map((r, i) => ({
        rank: i + 1,
        titulo: r.titulo,
        tipo: r.tipo,
        publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : '',
        views: r.views,
        reactions: r.reactions,
        comments: r.comments,
        saves: r.saves,
        engagement: r.engagement,
      }))
      return sendExport(
        res,
        req.query,
        ['rank', 'titulo', 'tipo', 'publishedAt', 'views', 'reactions', 'comments', 'saves', 'engagement'],
        rows,
        'muro',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

router.get('/surveys', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const [surveys, responsesInWindow] = await Promise.all([
      Survey.find({ tenantId }).select('titulo status publishedAt createdAt').lean(),
      SurveyResponse.find({
        tenantId,
        createdAt: { $gte: window.from, $lte: window.to },
      })
        .select('surveyId createdAt')
        .lean(),
    ])

    const byStatus = countByKey(surveys, (s) => s.status || 'draft')
    const responsesBySurvey = countByKey(responsesInWindow, (r) => String(r.surveyId))
    const items = surveys.map((s) => ({
      id: String(s._id),
      titulo: s.titulo,
      status: s.status,
      publishedAt: s.publishedAt || null,
      responsesInWindow: responsesBySurvey[String(s._id)] || 0,
    }))
    items.sort((a, b) => b.responsesInWindow - a.responsesInWindow)

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: {
        surveys: surveys.length,
        byStatus,
        responsesInWindow: responsesInWindow.length,
      },
      items,
    }

    if (wantsExport(req.query)) {
      const rows = items.map((r) => ({
        titulo: r.titulo,
        status: r.status,
        publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : '',
        responsesInWindow: r.responsesInWindow,
      }))
      return sendExport(
        res,
        req.query,
        ['titulo', 'status', 'publishedAt', 'responsesInWindow'],
        rows,
        'encuestas',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** Reporte dedicado de confirmaciones RSVP (§29.03) — eventos con inicio en la ventana. */
router.get('/rsvp', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const events = await Event.find({
      tenantId,
      inicio: { $gte: window.from, $lte: window.to },
    })
      .select('titulo inicio status cupo rsvpConfirmados rsvpRechazados')
      .sort({ inicio: 1 })
      .lean()

    const eventIds = events.map((e) => e._id)
    const rsvps = eventIds.length
      ? await EventRsvp.find({ tenantId, eventId: { $in: eventIds } })
          .select('eventId userId estado confirmedAt')
          .lean()
      : []

    const agg = aggregateEventRsvps(
      events.map((e) => ({
        id: String(e._id),
        titulo: e.titulo,
        inicio: e.inicio,
        status: e.status,
        cupo: e.cupo,
      })),
      rsvps.map((r) => ({ eventId: String(r.eventId), estado: r.estado })),
    )

    const userIds = [...new Set(rsvps.map((r) => String(r.userId)))]
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds }, tenantId })
          .select('_id nombre apellido email usuario')
          .lean()
      : []
    const byUser = new Map(users.map((u) => [String(u._id), u]))
    const byEvent = new Map(events.map((e) => [String(e._id), e]))

    const details = rsvps
      .map((r) => {
        const u = byUser.get(String(r.userId))
        const ev = byEvent.get(String(r.eventId))
        return {
          eventId: String(r.eventId),
          evento: ev?.titulo || '',
          inicio: ev?.inicio || null,
          userId: String(r.userId),
          nombre: u ? [u.nombre, u.apellido].filter(Boolean).join(' ').trim() : '',
          email: u?.email || '',
          usuario: u?.usuario || '',
          estado: r.estado,
          confirmedAt: r.confirmedAt || null,
        }
      })
      .sort((a, b) => {
        const ta = a.confirmedAt ? new Date(a.confirmedAt).getTime() : 0
        const tb = b.confirmedAt ? new Date(b.confirmedAt).getTime() : 0
        return tb - ta
      })

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: agg.totals,
      items: agg.items.map((i) => ({
        ...i,
        inicio: i.inicio ? new Date(i.inicio).toISOString() : null,
      })),
      details: details.slice(0, 500).map((d) => ({
        ...d,
        inicio: d.inicio ? new Date(d.inicio).toISOString() : null,
        confirmedAt: d.confirmedAt ? new Date(d.confirmedAt).toISOString() : null,
      })),
    }

    if (wantsExport(req.query)) {
      const detailMode = String(req.query.detail || '').toLowerCase()
      if (detailMode === '1' || detailMode === 'true' || detailMode === 'yes') {
        const rows = details.map((d) => ({
          evento: d.evento,
          inicio: d.inicio ? new Date(d.inicio).toISOString() : '',
          nombre: d.nombre,
          email: d.email,
          usuario: d.usuario,
          estado: d.estado,
          confirmedAt: d.confirmedAt ? new Date(d.confirmedAt).toISOString() : '',
        }))
        return sendExport(
          res,
          req.query,
          ['evento', 'inicio', 'nombre', 'email', 'usuario', 'estado', 'confirmedAt'],
          rows,
          'rsvp-detalle',
        )
      }
      const rows = agg.items.map((r) => ({
        titulo: r.titulo,
        inicio: r.inicio ? new Date(r.inicio).toISOString() : '',
        status: r.status,
        cupo: r.cupo == null ? '' : r.cupo,
        confirmados: r.confirmados,
        rechazados: r.rechazados,
        total: r.total,
        pctConfirmados: r.pctConfirmados,
      }))
      return sendExport(
        res,
        req.query,
        ['titulo', 'inicio', 'status', 'cupo', 'confirmados', 'rechazados', 'total', 'pctConfirmados'],
        rows,
        'rsvp',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

router.get('/requests', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const items = await Request.find({
      tenantId,
      createdAt: { $gte: window.from, $lte: window.to },
    })
      .select('titulo estado createdAt updatedAt typeId requesterId')
      .lean()

    const byEstado = countByKey(items, (r) => r.estado || 'abierta')
    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: { total: items.length, byEstado },
      items: items.slice(0, 200).map((r) => ({
        id: String(r._id),
        titulo: r.titulo || '',
        estado: r.estado || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    }

    if (wantsExport(req.query)) {
      const rows = payload.items.map((r) => ({
        titulo: r.titulo,
        estado: r.estado,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      }))
      return sendExport(res, req.query, ['titulo', 'estado', 'createdAt', 'updatedAt'], rows, 'tramites')
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** §29.10 — eventos de blanqueo de dispositivos */
router.get('/wiped', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const events = await ActivityEvent.find({
      tenantId: req.tenant._id,
      action: { $in: ['admin.device_wipe', 'admin.device_revoke', 'device_revoke'] },
      createdAt: { $gte: window.from, $lte: window.to },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    const userIds = [...new Set(events.map((e) => (e.userId ? String(e.userId) : '')).filter(Boolean))]
    const users = userIds.length
      ? await User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
          .select('usuario nombre apellido')
          .lean()
      : []
    const byUser = Object.fromEntries(users.map((u) => [String(u._id), u]))

    const items = events.map((e) => {
      const u = e.userId ? byUser[String(e.userId)] : null
      const meta = e.meta || {}
      return {
        id: String(e._id),
        action: e.action,
        occurredAt: e.createdAt,
        usuario: u?.usuario || '',
        nombre: [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || '',
        operadorId: meta.by || '',
        motivo: meta.motivo || meta.reason || (e.action === 'admin.device_revoke' ? 'Revocación individual' : '—'),
        devicesCleared: meta.devicesCleared ?? (e.action === 'admin.device_revoke' ? 1 : ''),
        resultado: 'ok',
      }
    })

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: { total: items.length, byAction: countByKey(items, (i) => i.action) },
      items,
    }

    if (wantsExport(req.query)) {
      const rows = items.map((r) => ({
        occurredAt: r.occurredAt ? new Date(r.occurredAt).toISOString() : '',
        action: r.action,
        usuario: r.usuario,
        nombre: r.nombre,
        motivo: r.motivo,
        devicesCleared: r.devicesCleared,
        operadorId: r.operadorId,
      }))
      return sendExport(
        res,
        req.query,
        ['occurredAt', 'action', 'usuario', 'nombre', 'motivo', 'devicesCleared', 'operadorId'],
        rows,
        'blanqueados',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** §29.11 — descargas de documentos */
router.get('/documents', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const downloads = await DocumentDownload.find({
      tenantId,
      createdAt: { $gte: window.from, $lte: window.to },
      result: 'ok',
    })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean()

    const byDoc = {}
    for (const d of downloads) {
      const id = String(d.docId)
      if (!byDoc[id]) {
        byDoc[id] = {
          docId: id,
          titulo: d.titulo || '',
          fileType: d.fileType || '',
          downloads: 0,
          uniqueUsers: new Set(),
        }
      }
      byDoc[id].downloads += 1
      if (d.userId) byDoc[id].uniqueUsers.add(String(d.userId))
    }
    const ranking = Object.values(byDoc)
      .map((r) => ({
        docId: r.docId,
        titulo: r.titulo,
        fileType: r.fileType,
        downloads: r.downloads,
        uniqueUsers: r.uniqueUsers.size,
      }))
      .sort((a, b) => b.downloads - a.downloads)

    const userIds = [...new Set(downloads.map((d) => (d.userId ? String(d.userId) : '')).filter(Boolean))]
    const users = userIds.length
      ? await User.find({ tenantId, _id: { $in: userIds } })
          .select('usuario nombre apellido')
          .lean()
      : []
    const byUser = Object.fromEntries(users.map((u) => [String(u._id), u]))

    const items = downloads.slice(0, 300).map((d) => {
      const u = d.userId ? byUser[String(d.userId)] : null
      return {
        id: String(d._id),
        occurredAt: d.createdAt,
        titulo: d.titulo || '',
        fileType: d.fileType || '',
        channel: d.channel || 'unknown',
        usuario: u?.usuario || '',
        nombre: [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || '',
        result: d.result || 'ok',
      }
    })

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: {
        downloads: downloads.length,
        uniqueDocs: ranking.length,
        byChannel: countByKey(downloads, (d) => d.channel || 'unknown'),
      },
      ranking,
      items,
      note: 'No afirma lectura del documento; registra emisión de descarga.',
    }

    if (wantsExport(req.query)) {
      const rows = items.map((r) => ({
        occurredAt: r.occurredAt ? new Date(r.occurredAt).toISOString() : '',
        titulo: r.titulo,
        fileType: r.fileType,
        usuario: r.usuario,
        nombre: r.nombre,
        channel: r.channel,
        result: r.result,
      }))
      return sendExport(
        res,
        req.query,
        ['occurredAt', 'titulo', 'fileType', 'usuario', 'nombre', 'channel', 'result'],
        rows,
        'documentos',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** §29.12 — ausentismos agregados */
router.get('/absences', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const items = await AbsenceRequest.find({
      tenantId: req.tenant._id,
      createdAt: { $gte: window.from, $lte: window.to },
    })
      .select('tipoKey tipoNombre desde hasta dias estado requesterName createdAt decisionAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    const byEstado = countByKey(items, (r) => r.estado || 'pendiente')
    const byTipo = countByKey(items, (r) => r.tipoNombre || r.tipoKey || 'otro')
    const diasTotal = items.reduce((s, r) => s + (Number(r.dias) || 0), 0)

    const payload = {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: { total: items.length, diasTotal, byEstado, byTipo },
      items: items.map((r) => ({
        id: String(r._id),
        tipo: r.tipoNombre || r.tipoKey || '',
        solicitante: r.requesterName || '',
        desde: r.desde,
        hasta: r.hasta,
        dias: r.dias || 0,
        estado: r.estado || '',
        createdAt: r.createdAt,
      })),
      note: 'Motivos médicos omitidos del export por defecto.',
    }

    if (wantsExport(req.query)) {
      const rows = payload.items.map((r) => ({
        tipo: r.tipo,
        solicitante: r.solicitante,
        desde: r.desde ? new Date(r.desde).toISOString().slice(0, 10) : '',
        hasta: r.hasta ? new Date(r.hasta).toISOString().slice(0, 10) : '',
        dias: r.dias,
        estado: r.estado,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      }))
      return sendExport(
        res,
        req.query,
        ['tipo', 'solicitante', 'desde', 'hasta', 'dias', 'estado', 'createdAt'],
        rows,
        'ausentismos',
      )
    }

    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/**
 * §29.13 — actividad en vivo (monitor genérico por tenant; sin hardcode Emp_Id).
 */
router.get('/live', requireAuth, requireReports, async (req, res, next) => {
  try {
    const minutes = Math.min(120, Math.max(1, Number(req.query.minutes) || 15))
    const since = new Date(Date.now() - minutes * 60 * 1000)
    const fetchedAt = new Date()
    const tenantId = req.tenant._id

    const [logins, views] = await Promise.all([
      ActivityEvent.find({ tenantId, action: 'login', createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      PostView.find({ tenantId, kind: 'detail', createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ])

    const userIds = [
      ...new Set(
        [...logins, ...views]
          .map((e) => (e.userId ? String(e.userId) : ''))
          .filter(Boolean),
      ),
    ]
    const postIds = [...new Set(views.map((v) => String(v.postId)))]
    const [users, posts] = await Promise.all([
      userIds.length
        ? User.find({ tenantId, _id: { $in: userIds } })
            .select('usuario nombre apellido')
            .lean()
        : [],
      postIds.length
        ? Post.find({ tenantId, _id: { $in: postIds } })
            .select('titulo')
            .lean()
        : [],
    ])
    const byUser = Object.fromEntries(users.map((u) => [String(u._id), u]))
    const byPost = Object.fromEntries(posts.map((p) => [String(p._id), p]))

    const labelUser = (id) => {
      const u = byUser[id]
      if (!u) return { usuarioHash: id ? id.slice(-6) : '', nombre: '' }
      const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
      return { usuarioHash: u.usuario || id.slice(-6), nombre }
    }

    const events = [
      ...logins.map((e) => ({
        eventId: String(e._id),
        type: 'login',
        occurredAt: e.createdAt,
        channel: channelFromUa(e.userAgent),
        ...labelUser(e.userId ? String(e.userId) : ''),
        recurso: 'login',
      })),
      ...views.map((v) => ({
        eventId: String(v._id),
        type: 'post_view',
        occurredAt: v.createdAt,
        channel: v.channel || 'unknown',
        ...labelUser(v.userId ? String(v.userId) : ''),
        recurso: byPost[String(v.postId)]?.titulo || String(v.postId),
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
      .slice(0, 150)

    const lastEventAt = events[0]?.occurredAt ? new Date(events[0].occurredAt) : null
    const lagMs = lastEventAt ? fetchedAt.getTime() - lastEventAt.getTime() : null

    res.json({
      windowMinutes: minutes,
      since: since.toISOString(),
      fetchedAt: fetchedAt.toISOString(),
      lastEventAt: lastEventAt ? lastEventAt.toISOString() : null,
      lagMs,
      stale: lagMs != null && lagMs > minutes * 60 * 1000,
      totals: {
        events: events.length,
        logins: logins.length,
        postViews: views.length,
        uniqueUsers: userIds.length,
      },
      events,
      note: 'Monitor de actividad reciente del tenant (polling). Política del suscriptor.',
    })
  } catch (e) {
    next(e)
  }
})

router.get('/summary', requireAuth, requireReports, async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const tenantId = req.tenant._id
    const userFilter = await resolveOrgFilters(tenantId, req.query)
    const [users, posts, surveysOpen, requestsOpen, downloads, absences, wipes, eventsInWin] =
      await Promise.all([
      User.find(userFilter).select('lastLoginAt activo').lean(),
      Post.countDocuments({
        tenantId,
        status: 'published',
        publishedAt: { $gte: window.from, $lte: window.to },
      }),
      Survey.countDocuments({ tenantId, status: 'published' }),
      Request.countDocuments({
        tenantId,
        estado: { $nin: ['cerrada', 'cancelada', 'rechazada'] },
      }),
      DocumentDownload.countDocuments({
        tenantId,
        createdAt: { $gte: window.from, $lte: window.to },
      }),
      AbsenceRequest.countDocuments({
        tenantId,
        createdAt: { $gte: window.from, $lte: window.to },
      }),
      ActivityEvent.countDocuments({
        tenantId,
        action: { $in: ['admin.device_wipe', 'admin.device_revoke'] },
        createdAt: { $gte: window.from, $lte: window.to },
      }),
      Event.find({
        tenantId,
        inicio: { $gte: window.from, $lte: window.to },
      })
        .select('_id')
        .lean(),
    ])
    const eventIdsInWindow = eventsInWin.map((e) => e._id)
    const eventsInWindow = eventIdsInWindow.length
    const rsvpConfirmados = eventsInWindow
      ? await EventRsvp.countDocuments({
          tenantId,
          eventId: { $in: eventIdsInWindow },
          estado: 'confirmado',
        })
      : 0
    const adoption = computeAdoption(
      users.map((u) => ({ id: String(u._id), lastLoginAt: u.lastLoginAt, activo: u.activo !== false })),
      window,
    )
    res.json({
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      adoption: {
        pctAdopcion: adoption.pctAdopcion,
        active: adoption.active,
        inactive: adoption.inactive,
        never: adoption.never,
      },
      wallPosts: posts,
      surveysOpen,
      requestsOpen,
      documentDownloads: downloads,
      absences,
      deviceWipes: wipes,
      eventsInWindow,
      rsvpConfirmados,
    })
  } catch (e) {
    next(e)
  }
})

export default router
