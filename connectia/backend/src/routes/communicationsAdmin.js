import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { CommunicationType } from '../models/CommunicationType.js'
import { CommunicationTemplate, COM_CHANNELS } from '../models/CommunicationTemplate.js'
import { Communication } from '../models/Communication.js'
import { User } from '../models/User.js'
import {
  sendBulkCommunications,
  previewCommunication,
  serializeCommunication,
  channelHealth,
} from '../services/communicationService.js'
import {
  generateCommunicationTemplateFromPrompt,
  communicationAiConfigured,
} from '../services/communicationTemplateAi.js'
import { DEFAULT_PLACEHOLDERS } from '../lib/communicationTemplates.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const CAP = 'admin.comunicaciones'

const DEFAULT_TYPES = [
  { codigo: 'AVISO_GENERAL', nombre: 'Aviso general', descripcion: 'Comunicado a la comunidad' },
  { codigo: 'RECORDATORIO', nombre: 'Recordatorio', descripcion: 'Recordatorio de plazo o evento' },
  { codigo: 'BIENVENIDA', nombre: 'Bienvenida', descripcion: 'Saludo a nuevos miembros' },
  { codigo: 'DOCUMENTACION', nombre: 'Solicitud de documentación', descripcion: 'Pedir archivos o datos' },
]

function serializeType(t) {
  const d = t?.toObject ? t.toObject() : t
  return {
    id: String(d._id),
    codigo: d.codigo,
    nombre: d.nombre,
    descripcion: d.descripcion || '',
    activo: d.activo !== false,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function serializeTemplate(t) {
  const d = t?.toObject ? t.toObject() : t
  return {
    id: String(d._id),
    communicationType: d.communicationType,
    channel: d.channel,
    nombre: d.nombre || '',
    subject: d.subject || '',
    body: d.body || '',
    activo: d.activo !== false,
    version: d.version || 1,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

/** Metadata: canales, placeholders, health, IA */
router.get('/metadata', requireAuth, requireCapability(CAP), async (req, res) => {
  res.json({
    channels: COM_CHANNELS,
    placeholders: DEFAULT_PLACEHOLDERS,
    health: channelHealth(),
    aiConfigured: communicationAiConfigured(),
  })
})

router.get('/health', requireAuth, requireCapability(CAP), async (_req, res) => {
  res.json({ ok: true, channels: channelHealth() })
})

/** Tipos */
router.get('/types', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    let items = await CommunicationType.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
    if (!items.length) {
      await CommunicationType.insertMany(
        DEFAULT_TYPES.map((t) => ({ ...t, tenantId: req.tenant._id, activo: true })),
      )
      items = await CommunicationType.find({ tenantId: req.tenant._id }).sort({ nombre: 1 }).lean()
    }
    res.json({ types: items.map(serializeType) })
  } catch (e) {
    next(e)
  }
})

router.post('/types', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const codigo = String(req.body?.codigo || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 64)
    const nombre = String(req.body?.nombre || '').trim().slice(0, 120)
    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'codigo y nombre son obligatorios' })
    }
    const created = await CommunicationType.create({
      tenantId: req.tenant._id,
      codigo,
      nombre,
      descripcion: String(req.body?.descripcion || '').slice(0, 500),
      activo: req.body?.activo !== false,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.com_type_create',
      ...reqMeta(req),
      meta: { codigo },
    })
    res.status(201).json({ type: serializeType(created) })
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Ya existe ese código' })
    next(e)
  }
})

router.put('/types/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await CommunicationType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    if (req.body?.nombre != null) doc.nombre = String(req.body.nombre).trim().slice(0, 120)
    if (req.body?.descripcion != null) doc.descripcion = String(req.body.descripcion).slice(0, 500)
    if (req.body?.activo != null) doc.activo = Boolean(req.body.activo)
    await doc.save()
    res.json({ type: serializeType(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/types/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await CommunicationType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.activo = false
    await doc.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Plantillas */
router.get('/templates', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.type) filter.communicationType = String(req.query.type)
    if (req.query.channel) filter.channel = String(req.query.channel)
    if (req.query.activo !== 'all') filter.activo = { $ne: false }
    const items = await CommunicationTemplate.find(filter).sort({ updatedAt: -1 }).limit(200).lean()
    res.json({ templates: items.map(serializeTemplate) })
  } catch (e) {
    next(e)
  }
})

router.post('/templates', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const channel = String(req.body?.channel || '').trim()
    const communicationType = String(req.body?.communicationType || '').trim()
    const body = String(req.body?.body || '')
    if (!COM_CHANNELS.includes(channel)) {
      return res.status(400).json({ error: 'Canal inválido' })
    }
    if (!communicationType || !body.trim()) {
      return res.status(400).json({ error: 'communicationType y body son obligatorios' })
    }
    const created = await CommunicationTemplate.create({
      tenantId: req.tenant._id,
      communicationType,
      channel,
      nombre: String(req.body?.nombre || '').slice(0, 160),
      subject: String(req.body?.subject || '').slice(0, 200),
      body: body.slice(0, 8000),
      activo: true,
      version: 1,
    })
    res.status(201).json({ template: serializeTemplate(created) })
  } catch (e) {
    next(e)
  }
})

router.put('/templates/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await CommunicationTemplate.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    if (req.body?.nombre != null) doc.nombre = String(req.body.nombre).slice(0, 160)
    if (req.body?.subject != null) doc.subject = String(req.body.subject).slice(0, 200)
    if (req.body?.body != null) doc.body = String(req.body.body).slice(0, 8000)
    if (req.body?.activo != null) doc.activo = Boolean(req.body.activo)
    doc.version = (doc.version || 1) + 1
    await doc.save()
    res.json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/templates/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await CommunicationTemplate.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.activo = false
    await doc.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Generar plantilla con IA */
router.post('/generate-template', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    if (!communicationAiConfigured()) {
      return res.status(503).json({ error: 'IA no configurada' })
    }
    const generated = await generateCommunicationTemplateFromPrompt(req.body?.prompt, {
      tipoComunicacion: req.body?.communicationType,
      canal: req.body?.channel,
      brandName: req.tenant?.nombre,
    })
    res.json(generated)
  } catch (e) {
    if (e.message) return res.status(400).json({ error: e.message })
    next(e)
  }
})

/** Preview */
router.post('/preview', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const templateId = req.body?.templateId
    const userId = req.body?.userId
    if (!ObjectId.isValid(templateId)) {
      return res.status(400).json({ error: 'templateId inválido' })
    }
    const template = await CommunicationTemplate.findOne({
      _id: templateId,
      tenantId: req.tenant._id,
    }).lean()
    if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' })

    let user = {
      nombre: 'Ana',
      apellido: 'Demo',
      email: 'ana@ejemplo.com',
      telefono: '+5491112345678',
      cargo: 'Analista',
      usuario: 'ana',
    }
    if (userId && ObjectId.isValid(userId)) {
      const u = await User.findOne({ _id: userId, tenantId: req.tenant._id }).lean()
      if (u) user = u
    }
    res.json(previewCommunication({ template, user, tenant: req.tenant }))
  } catch (e) {
    next(e)
  }
})

/** Destinatarios (búsqueda simple) */
router.get('/recipients', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: { $ne: false } }
    if (q) {
      filter.$or = [
        { nombre: new RegExp(q, 'i') },
        { apellido: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { usuario: new RegExp(q, 'i') },
      ]
    }
    const users = await User.find(filter)
      .select('nombre apellido email telefono usuario cargo')
      .sort({ apellido: 1, nombre: 1 })
      .limit(80)
      .lean()
    res.json({
      recipients: users.map((u) => ({
        id: String(u._id),
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email || '',
        telefono: u.telefono || '',
        cargo: u.cargo || '',
        label: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.usuario,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Envío masivo */
router.post('/send-bulk', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const result = await sendBulkCommunications({
      tenant: req.tenant,
      actor: req.user,
      communicationType: String(req.body?.communicationType || '').trim(),
      channel: String(req.body?.channel || '').trim(),
      templateId: req.body?.templateId,
      userIds: Array.isArray(req.body?.userIds) ? req.body.userIds : [],
      attachmentUrls: Array.isArray(req.body?.attachmentUrls) ? req.body.attachmentUrls : [],
      extraVariables: req.body?.variables && typeof req.body.variables === 'object' ? req.body.variables : {},
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.com_send_bulk',
      ...reqMeta(req),
      meta: { batchId: result.batchId, summary: result.summary, channel: req.body?.channel },
    })
    res.json(result)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** Outbox */
router.get('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.channel) filter.channel = String(req.query.channel)
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.type) filter.communicationType = String(req.query.type)
    const items = await Communication.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 100, 300))
      .lean()
    res.json({
      communications: items.map(serializeCommunication),
      health: channelHealth(),
      aiConfigured: communicationAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

export default router
