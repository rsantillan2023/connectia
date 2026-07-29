import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { LicenseType } from '../models/LicenseType.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { LicenseBalance } from '../models/LicenseBalance.js'
import {
  serializeLicense,
  serializeLicenseType,
  canTransitionLicense,
  validatePeriod,
  normalizeLicenciasConfig,
  normalizeFeriadosList,
  listLegislacionOptions,
  licenseTypesForPais,
  feriadosSetForYear,
  feriadosExtraDates,
  FERIADOS_FIJOS,
} from '../lib/licenciasConfig.js'
import {
  ensureDefaultLicenseTypes,
  findOverlappingLicense,
  applyLegislacionPack,
} from '../services/licenciaSaldo.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'
import { notifyLicenseDecided } from '../services/notifyTramite.js'
import { Tenant } from '../models/Tenant.js'

const router = Router()
const cap = 'admin.licencias'

function actorName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || 'Admin'
}

router.use(requireAuth, requireCapability(cap))

router.get('/legislacion', async (req, res) => {
  const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
  res.json({
    legislacion: cfg,
    opciones: listLegislacionOptions(),
  })
})

/** Calendario de feriados de la comunidad (+ nacionales del pack). */
router.get('/feriados', async (req, res) => {
  const anio = Number(req.query.anio) || new Date().getUTCFullYear()
  const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
  const extras = feriadosExtraDates(cfg, anio)
  const nacionales = [...feriadosSetForYear(cfg.pais, anio, [])]
  const efectivos = [...feriadosSetForYear(cfg.pais, anio, extras)].sort()
  res.json({
    anio,
    pais: cfg.pais,
    feriados: cfg.feriados,
    nacionales,
    efectivos,
  })
})

router.put('/feriados', async (req, res, next) => {
  try {
    const t = await Tenant.findById(req.tenant._id)
    if (!t) return res.status(404).json({ error: 'Comunidad no encontrada' })
    const cfg = normalizeLicenciasConfig(t.licenciasConfig)
    cfg.feriados = normalizeFeriadosList(req.body?.feriados)
    t.licenciasConfig = cfg
    await t.save()
    req.tenant = t
    await recordActivity({
      tenantId: t._id,
      actor: req.user,
      action: 'license.feriados',
      entityType: 'Tenant',
      entityId: t._id,
      summary: `Feriados comunidad: ${cfg.feriados.length}`,
      ...reqMeta(req),
    })
    const anio = Number(req.body?.anio) || new Date().getUTCFullYear()
    res.json({
      feriados: cfg.feriados,
      legislacion: cfg,
      efectivos: [...feriadosSetForYear(cfg.pais, anio, feriadosExtraDates(cfg, anio))].sort(),
    })
  } catch (e) {
    next(e)
  }
})

/** Carga feriados nacionales fijos del pack como ítems recurrentes editables. */
router.post('/feriados/seed-nacionales', async (req, res, next) => {
  try {
    const t = await Tenant.findById(req.tenant._id)
    if (!t) return res.status(404).json({ error: 'Comunidad no encontrada' })
    const cfg = normalizeLicenciasConfig(t.licenciasConfig)
    const anio = Number(req.body?.anio) || new Date().getUTCFullYear()
    const fixed = FERIADOS_FIJOS[cfg.pais] || []
    const seeded = fixed.map((md) => ({
      fecha: `${anio}-${md}`,
      nombre: `Feriado nacional ${md}`,
      recurrente: true,
    }))
    const merged = normalizeFeriadosList([...(cfg.feriados || []), ...seeded])
    cfg.feriados = merged
    t.licenciasConfig = cfg
    await t.save()
    req.tenant = t
    res.json({ feriados: cfg.feriados, added: seeded.length })
  } catch (e) {
    next(e)
  }
})

/** Cambia pack AR/CL y sincroniza tipos de licencia. */
router.put('/legislacion', async (req, res, next) => {
  try {
    const pais = String(req.body?.pais || '').toUpperCase()
    if (!['AR', 'CL'].includes(pais)) {
      return res.status(400).json({ error: 'pais debe ser AR o CL' })
    }
    const replaceTypes = req.body?.replaceTypes !== false
    const cfg = await applyLegislacionPack(req.tenant, pais, { replaceTypes })
    await recordActivity({
      tenantId: req.tenant._id,
      actor: req.user,
      action: 'license.legislacion',
      entityType: 'Tenant',
      entityId: req.tenant._id,
      summary: `Legislación licencias → ${pais}`,
      ...reqMeta(req),
    })
    const tipos = await LicenseType.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1 })
      .lean()
    res.json({
      legislacion: cfg,
      tipos: tipos.map(serializeLicenseType),
      preview: licenseTypesForPais(pais),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/tipos', async (req, res, next) => {
  try {
    const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
    await ensureDefaultLicenseTypes(req.tenant._id, cfg.pais)
    const rows = await LicenseType.find({ tenantId: req.tenant._id }).sort({ orden: 1 }).lean()
    res.json({ tipos: rows.map(serializeLicenseType), legislacion: cfg })
  } catch (e) {
    next(e)
  }
})

router.post('/tipos', async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = String(body.key || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 40)
    if (!key) return res.status(400).json({ error: 'key obligatoria' })
    const nombre = String(body.nombre || '').trim().slice(0, 120)
    if (!nombre) return res.status(400).json({ error: 'nombre obligatorio' })
    const t = await LicenseType.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      diasAnualesDefault: Math.max(0, Number(body.diasAnualesDefault) || 0),
      requiereAdjunto: Boolean(body.requiereAdjunto),
      esVacaciones: Boolean(body.esVacaciones),
      cuentaDias: body.cuentaDias === 'habiles' ? 'habiles' : 'calendario',
      codigoLegal: String(body.codigoLegal || '').slice(0, 40),
      normativaRef: String(body.normativaRef || '').slice(0, 240),
      activo: body.activo !== false,
      orden: Number(body.orden) || 100,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      actor: req.user,
      action: 'license_type.create',
      entityType: 'LicenseType',
      entityId: t._id,
      summary: `Tipo licencia ${key}`,
      ...reqMeta(req),
    })
    res.status(201).json({ tipo: serializeLicenseType(t) })
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Ya existe ese key' })
    next(e)
  }
})

router.put('/tipos/:id', async (req, res, next) => {
  try {
    const t = await LicenseType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!t) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.nombre != null) t.nombre = String(body.nombre).trim().slice(0, 120)
    if (body.diasAnualesDefault != null) t.diasAnualesDefault = Math.max(0, Number(body.diasAnualesDefault) || 0)
    if (body.requiereAdjunto != null) t.requiereAdjunto = Boolean(body.requiereAdjunto)
    if (body.esVacaciones != null) t.esVacaciones = Boolean(body.esVacaciones)
    if (body.cuentaDias === 'habiles' || body.cuentaDias === 'calendario') t.cuentaDias = body.cuentaDias
    if (body.codigoLegal != null) t.codigoLegal = String(body.codigoLegal).slice(0, 40)
    if (body.normativaRef != null) t.normativaRef = String(body.normativaRef).slice(0, 240)
    if (body.activo != null) t.activo = Boolean(body.activo)
    if (body.orden != null) t.orden = Number(body.orden) || 100
    await t.save()
    res.json({ tipo: serializeLicenseType(t) })
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const q = { tenantId: req.tenant._id }
    if (req.query.estado) q.estado = String(req.query.estado)
    if (req.query.tipoKey) q.tipoKey = String(req.query.tipoKey)
    if (req.query.requesterId) q.requesterId = req.query.requesterId
    if (req.query.q) {
      const s = String(req.query.q).trim()
      q.$or = [
        { codigo: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { requesterName: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { tipoNombre: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ]
    }
    const [items, total] = await Promise.all([
      LicenseRequest.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LicenseRequest.countDocuments(q),
    ])
    res.json({
      items: items.map((r) => serializeLicense(r)),
      total,
      page,
      hasMore: page * limit < total,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/reporte.csv', async (req, res, next) => {
  try {
    const q = { tenantId: req.tenant._id }
    if (req.query.estado) q.estado = String(req.query.estado)
    if (req.query.desde) q.desde = { $gte: new Date(String(req.query.desde)) }
    if (req.query.hasta) {
      q.hasta = { ...(q.hasta || {}), $lte: new Date(String(req.query.hasta)) }
    }
    const rows = await LicenseRequest.find(q).sort({ createdAt: -1 }).limit(5000).lean()
    const header = 'codigo;tipo;solicitante;desde;hasta;dias;estado;motivo;creada\n'
    const body = rows
      .map((r) =>
        [
          r.codigo,
          r.tipoNombre || r.tipoKey,
          r.requesterName,
          r.desde?.toISOString?.().slice(0, 10) || '',
          r.hasta?.toISOString?.().slice(0, 10) || '',
          r.dias,
          r.estado,
          String(r.motivo || '').replace(/[;\n]/g, ' '),
          r.createdAt?.toISOString?.() || '',
        ].join(';'),
      )
      .join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="licencias.csv"')
    res.send(header + body)
  } catch (e) {
    next(e)
  }
})

router.get('/:id([a-fA-F0-9]{24})', async (req, res, next) => {
  try {
    const r = await LicenseRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrada' })
    res.json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id([a-fA-F0-9]{24})/decide', async (req, res, next) => {
  try {
    const decision = String(req.body?.decision || '').toLowerCase()
    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser aprobar o rechazar' })
    }
    const r = await LicenseRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrada' })
    const nextEstado = decision === 'aprobar' ? 'aprobada' : 'rechazada'
    if (!canTransitionLicense(r.estado, nextEstado)) {
      return res.status(400).json({ error: `No se puede ${decision} desde ${r.estado}` })
    }
    const name = actorName(req.user)
    r.estado = nextEstado
    r.decisionById = req.user._id
    r.decisionByName = name
    r.decisionAt = new Date()
    r.decisionComentario = String(req.body?.comentario || '').slice(0, 1000)
    r.historial.push({
      estado: nextEstado,
      actorId: req.user._id,
      actorName: name,
      comentario: r.decisionComentario || decision,
      at: new Date(),
    })
    await r.save()
    await recordActivity({
      tenantId: req.tenant._id,
      actor: req.user,
      action: `license.${decision}`,
      entityType: 'LicenseRequest',
      entityId: r._id,
      summary: `${r.codigo} → ${nextEstado}`,
      ...reqMeta(req),
    })
    notifyLicenseDecided({ tenant: req.tenant, license: r }).catch((err) =>
      console.warn('[notify] license decide', err?.message || err),
    )
    res.json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id([a-fA-F0-9]{24})', async (req, res, next) => {
  try {
    const r = await LicenseRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'No encontrada' })
    if (!['pendiente', 'aprobada'].includes(r.estado)) {
      return res.status(400).json({ error: 'Solo se editan pendientes o aprobadas' })
    }
    const body = req.body || {}
    if (body.desde || body.hasta) {
      const period = validatePeriod({
        desde: body.desde || r.desde,
        hasta: body.hasta || r.hasta,
      })
      if (!period.ok) return res.status(400).json({ error: period.error })
      const overlap = await findOverlappingLicense({
        tenantId: req.tenant._id,
        userId: r.requesterId,
        desde: period.desde,
        hasta: period.hasta,
        excludeId: r._id,
      })
      if (overlap) {
        return res.status(409).json({ error: `Se solapa con ${overlap.codigo}` })
      }
      r.desde = period.desde
      r.hasta = period.hasta
      r.dias = period.dias
    }
    if (body.motivo != null) r.motivo = String(body.motivo).slice(0, 2000)
    const name = actorName(req.user)
    r.historial.push({
      estado: r.estado,
      actorId: req.user._id,
      actorName: name,
      comentario: 'Editada por admin',
      at: new Date(),
    })
    await r.save()
    res.json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

/** Ajuste de saldo anual por usuario/tipo. */
router.put('/saldos', async (req, res, next) => {
  try {
    const body = req.body || {}
    const userId = body.userId
    const tipoKey = String(body.tipoKey || '').toLowerCase().trim()
    const anio = Number(body.anio) || new Date().getUTCFullYear()
    if (!userId || !tipoKey) return res.status(400).json({ error: 'userId y tipoKey obligatorios' })
    const bal = await LicenseBalance.findOneAndUpdate(
      { tenantId: req.tenant._id, userId, tipoKey, anio },
      {
        $set: {
          devengados: body.devengados == null ? null : Number(body.devengados),
          ajuste: Number(body.ajuste) || 0,
          notas: String(body.notas || '').slice(0, 500),
        },
      },
      { upsert: true, new: true },
    )
    res.json({
      balance: {
        id: String(bal._id),
        userId: String(bal.userId),
        tipoKey: bal.tipoKey,
        anio: bal.anio,
        devengados: bal.devengados,
        ajuste: bal.ajuste,
        notas: bal.notas,
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/seed-defaults', async (req, res, next) => {
  try {
    const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
    const pais = String(req.body?.pais || cfg.pais).toUpperCase()
    await applyLegislacionPack(req.tenant, pais, { replaceTypes: Boolean(req.body?.replaceTypes) })
    const rows = await LicenseType.find({ tenantId: req.tenant._id }).lean()
    res.json({
      tipos: rows.map(serializeLicenseType),
      defaults: licenseTypesForPais(pais),
      legislacion: normalizeLicenciasConfig(req.tenant.licenciasConfig),
    })
  } catch (e) {
    next(e)
  }
})

export default router
