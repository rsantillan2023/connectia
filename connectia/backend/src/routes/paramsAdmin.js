import { Router } from 'express'
import { requireAuth, requireCapability, isFullAdmin } from '../middleware/auth.js'
import { TenantParam, DEFAULT_TENANT_PARAMS } from '../models/TenantParam.js'
import { Tenant } from '../models/Tenant.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function maskSecret(val) {
  if (val == null || val === '') return ''
  return '••••••••'
}

function ser(p, { reveal = false } = {}) {
  const sensible = p.sensible || p.tipo === 'secret'
  let valor = p.valor
  if (sensible && !reveal) valor = maskSecret(valor)
  return {
    id: p._id,
    key: p.key,
    label: p.label || p.key,
    descripcion: p.descripcion || '',
    tipo: p.tipo,
    valor,
    valorPorDefecto: p.valorPorDefecto,
    opciones: p.opciones || [],
    sensible,
    grupo: p.grupo || 'general',
    orden: p.orden ?? 100,
    activo: p.activo !== false,
    hasValue: p.valor != null && p.valor !== '',
  }
}

export async function ensureDefaultParams(tenantId) {
  for (const d of DEFAULT_TENANT_PARAMS) {
    await TenantParam.findOneAndUpdate(
      { tenantId, key: d.key },
      {
        $setOnInsert: {
          tenantId,
          ...d,
          sensible: d.tipo === 'secret',
          activo: true,
        },
      },
      { upsert: true },
    )
  }
}

function coerceValue(tipo, raw, opciones = []) {
  if (tipo === 'boolean') {
    if (typeof raw === 'boolean') return raw
    const s = String(raw).toLowerCase()
    return s === '1' || s === 'true' || s === 'yes' || s === 'si'
  }
  if (tipo === 'number') {
    const n = Number(raw)
    if (Number.isNaN(n)) {
      const err = new Error('Valor numérico inválido')
      err.status = 400
      throw err
    }
    return n
  }
  if (tipo === 'enum') {
    const s = String(raw)
    if (opciones.length && !opciones.includes(s)) {
      const err = new Error(`Valor no permitido. Opciones: ${opciones.join(', ')}`)
      err.status = 400
      throw err
    }
    return s
  }
  if (tipo === 'json') {
    if (typeof raw === 'object') return raw
    try {
      return JSON.parse(String(raw))
    } catch {
      const err = new Error('JSON inválido')
      err.status = 400
      throw err
    }
  }
  return raw == null ? '' : String(raw)
}

router.get('/', requireAuth, requireCapability('admin.parametros', 'admin.comunidad'), async (req, res, next) => {
  try {
    await ensureDefaultParams(req.tenant._id)
    const items = await TenantParam.find({ tenantId: req.tenant._id, activo: true }).sort({
      grupo: 1,
      orden: 1,
      key: 1,
    })
    res.json({
      items: items.map((p) => ser(p)),
      tenantBuiltins: {
        timezone: req.tenant.timezone || '',
        themeMode: req.tenant.themeMode || 'system',
        allowDesktop: req.tenant.allowDesktop !== false,
        loginMethods: req.tenant.loginMethods || [],
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.parametros'), async (req, res, next) => {
  try {
    if (!isFullAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo admin del tenant puede crear parámetros' })
    }
    const body = req.body || {}
    const key = String(body.key || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.')
    if (!key) return res.status(400).json({ error: 'key obligatoria' })
    const tipo = ['string', 'number', 'boolean', 'enum', 'json', 'secret'].includes(body.tipo)
      ? body.tipo
      : 'string'
    const opciones = Array.isArray(body.opciones) ? body.opciones.map(String) : []
    const valor = body.valor !== undefined ? coerceValue(tipo, body.valor, opciones) : null
    const p = await TenantParam.create({
      tenantId: req.tenant._id,
      key,
      label: String(body.label || key),
      descripcion: String(body.descripcion || ''),
      tipo,
      valor,
      valorPorDefecto: body.valorPorDefecto ?? null,
      opciones,
      sensible: tipo === 'secret' || body.sensible === true,
      grupo: String(body.grupo || 'general'),
      orden: Number(body.orden) || 100,
      activo: true,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.param_create',
      meta: { key },
      ...reqMeta(req),
    })
    res.status(201).json({ param: ser(p) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa key' })
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** Atajo: actualizar builtins del tenant (timezone, etc.) desde la misma pantalla. */
router.patch(
  '/builtins/tenant',
  requireAuth,
  requireCapability('admin.parametros', 'admin.comunidad'),
  async (req, res, next) => {
    try {
      const t = await Tenant.findById(req.tenant._id)
      if (!t) return res.status(404).json({ error: 'Tenant no encontrado' })
      const body = req.body || {}
      if (body.timezone != null) t.timezone = String(body.timezone).trim() || t.timezone
      if (body.themeMode != null && ['light', 'dark', 'system'].includes(body.themeMode)) {
        t.themeMode = body.themeMode
      }
      if (typeof body.allowDesktop === 'boolean') t.allowDesktop = body.allowDesktop
      await t.save()
      await recordActivity({
        tenantId: t._id,
        userId: req.user._id,
        action: 'admin.param_update',
        meta: { key: 'tenant.builtins' },
        ...reqMeta(req),
      })
      res.json({
        tenantBuiltins: {
          timezone: t.timezone,
          themeMode: t.themeMode,
          allowDesktop: t.allowDesktop !== false,
          loginMethods: t.loginMethods || [],
        },
      })
    } catch (e) {
      next(e)
    }
  },
)

router.patch('/:id', requireAuth, requireCapability('admin.parametros', 'admin.comunidad'), async (req, res, next) => {
  try {
    const p = await TenantParam.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p) return res.status(404).json({ error: 'Parámetro no encontrado' })
    const body = req.body || {}
    if (body.label != null) p.label = String(body.label)
    if (body.descripcion != null) p.descripcion = String(body.descripcion)
    if (body.valor !== undefined) {
      p.valor = coerceValue(p.tipo, body.valor, p.opciones || [])
    }
    if (body.orden != null) p.orden = Number(body.orden) || 100
    if (typeof body.activo === 'boolean') p.activo = body.activo
    await p.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.param_update',
      meta: { key: p.key },
      ...reqMeta(req),
    })
    res.json({ param: ser(p) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

export default router
