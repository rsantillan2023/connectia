import { Router } from 'express'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { requireAuth, hasCapability, requireCapability } from '../middleware/auth.js'
import { Request } from '../models/Request.js'
import { RequestType } from '../models/RequestType.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import {
  normalizeSolicitudesConfig,
  activeStates,
  stateLabel,
  allowedTransitions,
  validateCampoValues,
  normalizeCampos,
  STATE_CATALOG,
  defaultSolicitudesConfig,
} from '../lib/solicitudesConfig.js'
import {
  normalizeAudience,
  serializeAudience,
  userMatchesAudience,
  usersFilterForAudience,
} from '../lib/audience.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function canManageRequests(user, tenant) {
  return hasCapability(user, tenant, 'admin.solicitudes')
}

function getCfg(tenant) {
  return normalizeSolicitudesConfig(tenant.solicitudesConfig)
}

function normalizeMediaUrl(raw) {
  const u = String(raw || '').trim()
  if (!u) return ''
  if (u.startsWith('/uploads/')) return u
  if (/^https?:\/\//i.test(u)) return u
  return ''
}

function serializeMessage(m, includeInternal) {
  if (m.interno && !includeInternal) return null
  return {
    id: m._id,
    texto: m.texto,
    authorName: m.authorName,
    isAdmin: Boolean(m.isAdmin),
    interno: Boolean(m.interno),
    adjuntos: (m.adjuntos || []).map((a) => ({ nombre: a.nombre || '', url: a.url })),
    createdAt: m.createdAt,
  }
}

function serializeCampoDef(c) {
  return {
    key: c.key,
    label: c.label,
    tipo: c.tipo || 'text',
    required: Boolean(c.required),
    opciones: c.opciones || [],
    placeholder: c.placeholder || '',
    orden: c.orden ?? 100,
  }
}

function serialize(r, { includeInternal = false, cfg = null } = {}) {
  const messages = (r.messages || [])
    .map((m) => serializeMessage(m, includeInternal))
    .filter(Boolean)
  const needsCompletion =
    r.origen === 'admin' &&
    Array.isArray(r.camposDefinicion) &&
    r.camposDefinicion.length > 0 &&
    !r.completada
  return {
    id: r._id,
    codigo: r.codigo,
    tipoId: r.tipoId,
    tipoKey: r.tipoKey,
    tipoNombre: r.tipoNombre,
    area: r.area,
    titulo: r.titulo,
    cuerpo: r.cuerpo,
    mediaUrl: toPublicMediaUrl(r.mediaUrl || ''),
    estado: r.estado,
    estadoLabel: cfg ? stateLabel(cfg, r.estado) : r.estado,
    origen: r.origen || 'member',
    campaignId: r.campaignId || '',
    audience: serializeAudience(r.audience),
    camposDefinicion: (r.camposDefinicion || []).map(serializeCampoDef),
    camposValores: (r.camposValores || []).map((c) => ({
      key: c.key,
      label: c.label,
      tipo: c.tipo,
      value: c.value,
    })),
    completada: Boolean(r.completada),
    completadaAt: r.completadaAt,
    needsCompletion,
    requesterId: r.requesterId,
    requesterName: r.requesterName,
    createdByName: r.createdByName || '',
    assigneeName: r.assigneeName || '',
    rating: r.rating,
    closedAt: r.closedAt,
    messages,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function parseAdjuntos(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => {
      const url = String(a?.url || '').trim()
      if (!url || !/^https?:\/\//i.test(url)) return null
      return { nombre: String(a?.nombre || '').trim() || url.split('/').pop(), url }
    })
    .filter(Boolean)
    .slice(0, 5)
}

async function nextCodigo(tenantId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `SOL-${day}-`
  const last = await Request.findOne({ tenantId, codigo: new RegExp(`^${prefix}`) })
    .sort({ codigo: -1 })
    .select('codigo')
  let n = 1
  if (last?.codigo) {
    const part = last.codigo.split('-').pop()
    const parsed = Number(part)
    if (!Number.isNaN(parsed)) n = parsed + 1
  }
  return `${prefix}${String(n).padStart(4, '0')}`
}

async function nextCodigos(tenantId, count) {
  const first = await nextCodigo(tenantId)
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `SOL-${day}-`
  const start = Number(first.split('-').pop()) || 1
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(4, '0')}`)
}

function canAccess(req, r) {
  if (canManageRequests(req.user, req.tenant)) return true
  return String(r.requesterId) === String(req.user._id)
}

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode !== 'restricted') return { mode: 'all', areaIds: [], groupIds: [] }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, groups] = await Promise.all([
    areaIds.length ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id') : [],
    groupIds.length ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id') : [],
  ])
  return {
    mode: 'restricted',
    areaIds: areas.map((x) => x._id),
    groupIds: groups.map((x) => x._id),
  }
}

function mergeCampos(base, extra) {
  const map = new Map()
  for (const c of normalizeCampos(base || [])) map.set(c.key, c)
  for (const c of normalizeCampos(extra || [])) map.set(c.key, c)
  return [...map.values()].sort((a, b) => a.orden - b.orden)
}

router.get('/meta/config', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const estados = activeStates(cfg)
    res.json({
      catalog: STATE_CATALOG,
      config: { ...cfg, estados },
      fullConfig: canManageRequests(req.user, req.tenant) ? cfg : undefined,
    })
  } catch (e) {
    next(e)
  }
})

router.put('/meta/config', requireAuth, requireCapability('admin.solicitudes'), async (req, res, next) => {
  try {
    const normalized = normalizeSolicitudesConfig(req.body || {})
    const t = await Tenant.findById(req.tenant._id)
    t.solicitudesConfig = normalized
    await t.save()
    req.tenant.solicitudesConfig = normalized
    res.json({ config: normalized })
  } catch (e) {
    next(e)
  }
})

router.post('/meta/config/reset', requireAuth, requireCapability('admin.solicitudes'), async (req, res, next) => {
  try {
    const normalized = defaultSolicitudesConfig()
    const t = await Tenant.findById(req.tenant._id)
    t.solicitudesConfig = normalized
    await t.save()
    res.json({ config: normalized })
  } catch (e) {
    next(e)
  }
})

/** Preview destinatarios de un envío dirigido */
router.post('/broadcast/preview', requireAuth, requireCapability('admin.solicitudes'), async (req, res, next) => {
  try {
    const audience = await resolveAudienceIds(req.tenant._id, req.body?.audience)
    const filter = usersFilterForAudience(req.tenant._id, audience)
    const total = await User.countDocuments(filter)
    const sample = await User.find(filter).select('usuario nombre apellido areaId groupIds').limit(8)
    res.json({
      audience: serializeAudience(audience),
      total,
      sample: sample.map((u) => ({
        id: u._id,
        usuario: u.usuario,
        nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Admin envía una solicitud a una audiencia (área/grupo/todos).
 * Crea 1 ticket por destinatario con formulario a completar.
 */
router.post('/broadcast', requireAuth, requireCapability('admin.solicitudes'), async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    const cuerpo = String(body.cuerpo || '').trim()
    const mediaUrl = normalizeMediaUrl(body.mediaUrl || body.imageUrl)
    if (!titulo) return res.status(400).json({ error: 'titulo obligatorio' })

    let tipo = null
    if (body.tipoId) {
      tipo = await RequestType.findOne({ _id: body.tipoId, tenantId: req.tenant._id, activo: true })
      if (!tipo) return res.status(400).json({ error: 'Tipo inválido' })
    }

    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (audience.mode === 'restricted' && !audience.areaIds.length && !audience.groupIds.length) {
      return res.status(400).json({ error: 'Elegí al menos un área o grupo' })
    }

    const camposDef = mergeCampos(tipo?.campos || [], body.camposExtra || body.campos || [])
    if (!camposDef.length && !cuerpo && !mediaUrl) {
      return res.status(400).json({ error: 'Agregá un mensaje, una imagen/video o preguntas' })
    }

    const filter = usersFilterForAudience(req.tenant._id, audience)
    const users = await User.find(filter).limit(500)
    if (!users.length) return res.status(400).json({ error: 'La audiencia no tiene usuarios activos' })

    const activos = new Set(activeStates(cfg).map((e) => e.key))
    let estado = String(body.estado || 'a_completar')
    if (!activos.has(estado)) estado = activos.has('a_completar') ? 'a_completar' : cfg.estadoInicial

    const campaignId = `camp_${crypto.randomBytes(6).toString('hex')}`
    const codes = await nextCodigos(req.tenant._id, users.length)
    const adminName = req.user.nombre || req.user.usuario
    const docs = users.map((u, i) => ({
      tenantId: req.tenant._id,
      codigo: codes[i],
      tipoId: tipo?._id || null,
      tipoKey: tipo?.key || '',
      tipoNombre: tipo?.nombre || 'Solicitud dirigida',
      area: tipo?.area || 'General',
      titulo,
      cuerpo,
      mediaUrl,
      estado,
      origen: 'admin',
      campaignId,
      audience,
      camposDefinicion: camposDef,
      camposValores: [],
      completada: false,
      requesterId: u._id,
      requesterName: u.nombre || u.usuario,
      createdById: req.user._id,
      createdByName: adminName,
      assigneeId: req.user._id,
      assigneeName: adminName,
      messages: [
        {
          texto: cuerpo || `Completá los datos solicitados: ${titulo}`,
          authorId: req.user._id,
          authorName: adminName,
          isAdmin: true,
          interno: false,
        },
      ],
    }))

    await Request.insertMany(docs)
    res.status(201).json({
      campaignId,
      created: docs.length,
      audience: serializeAudience(audience),
      estado,
      sampleCodigos: codes.slice(0, 5),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(30, Math.max(1, Number(req.query.size) || 20))
    const q = String(req.query.q || '').trim()
    const estado = String(req.query.estado || '').trim()
    const area = String(req.query.area || '').trim()
    const origen = String(req.query.origen || '').trim()
    const campaignId = String(req.query.campaignId || '').trim()
    const scopeAdmin = req.query.scope === 'admin'
    const filter = { tenantId: req.tenant._id }
    const activos = new Set(activeStates(cfg).map((e) => e.key))

    if (scopeAdmin) {
      if (!canManageRequests(req.user, req.tenant)) {
        return res.status(403).json({ error: 'Se requiere permiso de solicitudes' })
      }
    } else {
      filter.requesterId = req.user._id
    }

    if (estado) {
      if (!activos.has(estado)) return res.status(400).json({ error: 'Estado no habilitado en este tenant' })
      filter.estado = estado
    }
    if (area) filter.area = area
    if (origen === 'member' || origen === 'admin') filter.origen = origen
    if (campaignId) filter.campaignId = campaignId
    if (q.length >= 2) {
      filter.$or = [
        { codigo: { $regex: q, $options: 'i' } },
        { titulo: { $regex: q, $options: 'i' } },
        { cuerpo: { $regex: q, $options: 'i' } },
        { tipoNombre: { $regex: q, $options: 'i' } },
        { 'camposValores.value': { $regex: q, $options: 'i' } },
        { campaignId: { $regex: q, $options: 'i' } },
      ]
    }

    const [items, total] = await Promise.all([
      Request.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      Request.countDocuments(filter),
    ])

    res.json({
      page,
      size,
      total,
      estados: activeStates(cfg),
      items: items.map((r) =>
        serialize(r, {
          includeInternal: scopeAdmin && canManageRequests(req.user, req.tenant),
          cfg,
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/export/csv', requireAuth, async (req, res, next) => {
  try {
    if (!canManageRequests(req.user, req.tenant)) {
      return res.status(403).json({ error: 'Se requiere permiso de solicitudes' })
    }
    const cfg = getCfg(req.tenant)
    const campaignId = String(req.query.campaignId || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (campaignId) filter.campaignId = campaignId
    const items = await Request.find(filter).sort({ createdAt: -1 }).limit(5000)
    res.json({
      fields: [
        'codigo',
        'titulo',
        'tipoNombre',
        'area',
        'estado',
        'estadoLabel',
        'origen',
        'campaignId',
        'completada',
        'campos',
        'requesterName',
        'createdAt',
        'updatedAt',
      ],
      rows: items.map((r) => ({
        codigo: r.codigo,
        titulo: r.titulo,
        tipoNombre: r.tipoNombre,
        area: r.area,
        estado: r.estado,
        estadoLabel: stateLabel(cfg, r.estado),
        origen: r.origen || 'member',
        campaignId: r.campaignId || '',
        completada: r.completada ? '1' : '0',
        campos: (r.camposValores || []).map((c) => `${c.label}=${c.value}`).join(' | '),
        requesterName: r.requesterName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      exportedAt: new Date().toISOString(),
      tenant: req.tenant.empCodigo,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const r = await Request.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (!canAccess(req, r)) return res.status(403).json({ error: 'Sin acceso a esta solicitud' })
    const admin = canManageRequests(req.user, req.tenant)
    res.json({
      request: serialize(r, { includeInternal: admin, cfg }),
      transitions: allowedTransitions(cfg, r.estado, { isAdmin: admin }),
      config: {
        estadosCalificables: cfg.estadosCalificables,
        estadosTerminales: cfg.estadosTerminales,
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    const cuerpo = String(body.cuerpo || '').trim()
    const mediaUrl = normalizeMediaUrl(body.mediaUrl || body.imageUrl)
    if (!titulo) return res.status(400).json({ error: 'titulo obligatorio' })

    let tipo = null
    if (body.tipoId) {
      tipo = await RequestType.findOne({
        _id: body.tipoId,
        tenantId: req.tenant._id,
        activo: true,
      })
      if (!tipo) return res.status(400).json({ error: 'Tipo de solicitud inválido' })
      if (!userMatchesAudience(req.user, tipo.audience)) {
        return res.status(403).json({ error: 'Este tipo no está disponible para tu área/grupo' })
      }
    }

    const camposDef = tipo?.campos || []
    const { values, errors } = validateCampoValues(camposDef, body.campos || body.camposValores || {})
    if (errors.length) return res.status(400).json({ error: errors.join('; '), fieldErrors: errors })
    if (!camposDef.length && !cuerpo && !mediaUrl) {
      return res.status(400).json({ error: 'descripción obligatoria' })
    }

    const estadoInicial = cfg.estadoInicial
    const codigo = await nextCodigo(req.tenant._id)
    const authorName = req.user.nombre || req.user.usuario
    const resumenCampos = values
      .filter((v) => v.value !== '' && v.value !== false)
      .map((v) => `${v.label}: ${v.value}`)
      .join('\n')
    const msgTexto = cuerpo || resumenCampos || titulo

    const r = await Request.create({
      tenantId: req.tenant._id,
      codigo,
      tipoId: tipo?._id || null,
      tipoKey: tipo?.key || '',
      tipoNombre: tipo?.nombre || 'General',
      area: tipo?.area || 'General',
      titulo,
      cuerpo: cuerpo || resumenCampos,
      mediaUrl,
      estado: estadoInicial,
      origen: 'member',
      camposDefinicion: camposDef,
      camposValores: values,
      completada: true,
      completadaAt: new Date(),
      requesterId: req.user._id,
      requesterName: authorName,
      createdById: req.user._id,
      createdByName: authorName,
      messages: [
        {
          texto: msgTexto,
          authorId: req.user._id,
          authorName,
          isAdmin: false,
          interno: false,
          adjuntos: parseAdjuntos(body.adjuntos),
        },
      ],
    })

    try {
      await startWorkflowForOrigin({
        tenantId: req.tenant._id,
        module: 'solicitudes',
        refId: r._id,
        titulo: r.titulo,
        codigo: r.codigo,
        tipoKey: r.tipoKey || '',
        solicitanteId: req.user._id,
        solicitanteName: authorName,
      })
    } catch (wfErr) {
      console.warn('[workflow] no se pudo iniciar instancia', wfErr?.message || wfErr)
    }

    res.status(201).json({ request: serialize(r, { cfg }) })
  } catch (e) {
    next(e)
  }
})

/** Destinatario completa formulario de una solicitud dirigida */
router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const r = await Request.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (String(r.requesterId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Solo el destinatario puede completar' })
    }
    if (r.completada) return res.status(400).json({ error: 'Ya fue completada' })

    const camposDef = r.camposDefinicion?.length ? r.camposDefinicion : []
    if (!camposDef.length) return res.status(400).json({ error: 'Esta solicitud no pide campos' })

    const { values, errors } = validateCampoValues(camposDef, req.body?.campos || req.body?.camposValores || {})
    if (errors.length) return res.status(400).json({ error: errors.join('; '), fieldErrors: errors })

    r.camposValores = values
    r.completada = true
    r.completadaAt = new Date()
    const resumen = values
      .filter((v) => v.value !== '' && v.value !== false)
      .map((v) => `${v.label}: ${v.value}`)
      .join('\n')
    r.messages.push({
      texto: resumen || 'Formulario completado',
      authorId: req.user._id,
      authorName: req.user.nombre || req.user.usuario,
      isAdmin: false,
      interno: false,
    })

    const activos = new Set(activeStates(cfg).map((e) => e.key))
    if (r.estado === 'a_completar' && activos.has('en_proceso')) {
      r.estado = 'en_proceso'
    }

    await r.save()
    res.json({ request: serialize(r, { cfg }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const r = await Request.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (!canAccess(req, r)) return res.status(403).json({ error: 'Sin acceso' })

    const texto = String(req.body?.texto || '').trim()
    const adjuntos = parseAdjuntos(req.body?.adjuntos)
    if (!texto && !adjuntos.length) return res.status(400).json({ error: 'texto o adjunto obligatorio' })

    const admin = canManageRequests(req.user, req.tenant)
    const interno = Boolean(req.body?.interno) && admin
    const terminales = new Set(cfg.estadosTerminales || [])

    if (terminales.has(r.estado) && !admin) {
      return res.status(400).json({ error: 'La solicitud está cerrada' })
    }

    r.messages.push({
      texto: texto || '(adjunto)',
      authorId: req.user._id,
      authorName: req.user.nombre || req.user.usuario,
      isAdmin: admin,
      interno,
      adjuntos,
    })

    const activos = new Set(activeStates(cfg).map((e) => e.key))
    if (!interno && !admin && r.estado === 'a_completar' && activos.has('en_proceso')) {
      r.estado = 'en_proceso'
    } else if (!interno && admin && r.estado === cfg.estadoInicial && activos.has('en_proceso')) {
      const next = allowedTransitions(cfg, r.estado, { isAdmin: true })
      if (next.includes('en_proceso')) {
        r.estado = 'en_proceso'
        r.assigneeId = req.user._id
        r.assigneeName = req.user.nombre || req.user.usuario
      }
    }

    await r.save()
    res.status(201).json({
      request: serialize(r, { includeInternal: admin, cfg }),
      transitions: allowedTransitions(cfg, r.estado, { isAdmin: admin }),
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const cfg = getCfg(req.tenant)
    const r = await Request.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (!canAccess(req, r)) return res.status(403).json({ error: 'Sin acceso' })

    const body = req.body || {}
    const admin = canManageRequests(req.user, req.tenant)
    const activos = new Set(activeStates(cfg).map((e) => e.key))

    if (body.estado) {
      if (!activos.has(body.estado)) {
        return res.status(400).json({ error: 'Estado no habilitado en este tenant' })
      }
      const allowed = allowedTransitions(cfg, r.estado, { isAdmin: admin })
      if (!allowed.includes(body.estado)) {
        return res.status(400).json({
          error: `Transición no permitida: ${stateLabel(cfg, r.estado)} → ${stateLabel(cfg, body.estado)}`,
        })
      }
      r.estado = body.estado
      if ((cfg.estadosTerminales || []).includes(body.estado) || body.estado === 'resuelta') {
        r.closedAt = r.closedAt || new Date()
      }
      if (body.estado === cfg.estadoInicial) r.closedAt = null
      if (admin && !r.assigneeId) {
        r.assigneeId = req.user._id
        r.assigneeName = req.user.nombre || req.user.usuario
      }
    }

    if (body.rating != null) {
      const rating = Number(body.rating)
      if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating 1–5' })
      if (String(r.requesterId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Solo el solicitante califica' })
      }
      const calificables = cfg.estadosCalificables || []
      if (!calificables.includes(r.estado) && r.estado !== 'cerrada') {
        return res.status(400).json({ error: 'Solo se califica en estados configurados' })
      }
      r.rating = rating
      if (calificables.includes(r.estado) && activos.has('cerrada')) {
        const toClose = allowedTransitions(cfg, r.estado, { isAdmin: false })
        if (toClose.includes('cerrada')) {
          r.estado = 'cerrada'
          r.closedAt = r.closedAt || new Date()
        }
      }
    }

    if (admin && typeof body.area === 'string' && body.area.trim()) {
      r.area = body.area.trim()
    }

    await r.save()
    res.json({
      request: serialize(r, { includeInternal: admin, cfg }),
      transitions: allowedTransitions(cfg, r.estado, { isAdmin: admin }),
    })
  } catch (e) {
    next(e)
  }
})

export default router
