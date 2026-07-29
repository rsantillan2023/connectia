import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { RequestType } from '../models/RequestType.js'
import { DocItem } from '../models/DocItem.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import { validateWorkflowPayload } from '../lib/workflowEngine.js'
import {
  draftWorkflowFromPrompt,
  workflowAiConfigured,
  WORKFLOW_USE_CASE_EXAMPLES,
  rolesLineForExample,
} from '../services/workflowAi.js'
import { serializeDefinition, listApprovalsForUser } from '../services/workflowRuntime.js'
import { ADMIN_SCREEN_CAPABILITIES } from '../constants/adminCapabilities.js'

const CAP_WHO_LABEL = {
  'admin.solicitudes': 'Líder o gestor de pedidos',
  'admin.usuarios': 'RRHH / People',
  'admin.documentos': 'Legal / Documentos',
  'admin.comunidad': 'Seguridad / Compliance',
  'admin.hub': 'TI / Accesos',
  'admin.publicaciones': 'Quien gestiona el muro',
  'admin.encuestas': 'Quien gestiona encuestas',
  'admin.notificaciones': 'Quien envía avisos',
  'admin.organizacion': 'Quien gestiona áreas y grupos',
  'admin.workflows': 'Quien administra flujos',
  'admin.tipos-solicitud': 'Quien arma plantillas de pedido',
}

const router = Router()
const CAP = 'admin.workflows'

router.get('/ai-status', requireAuth, requireCapability(CAP), (_req, res) => {
  res.json({ configured: workflowAiConfigured() })
})

/** Ejemplos de caso de uso (prompts) para el diseñador. */
router.get('/ai-examples', requireAuth, requireCapability(CAP), (_req, res) => {
  res.json({
    examples: WORKFLOW_USE_CASE_EXAMPLES.map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      emoji: e.emoji,
      prompt: e.prompt,
      rolesLine: rolesLineForExample(e),
    })),
  })
})

/** Borrador desde caso de uso (humano confirma). */
router.post('/ai-draft', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    const draft = await draftWorkflowFromPrompt({
      prompt,
      brandName: req.tenant?.nombre,
      capabilities: ADMIN_SCREEN_CAPABILITIES,
    })
    res.json({ draft, configured: workflowAiConfigured() })
  } catch (e) {
    next(e)
  }
})

router.get('/meta', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [requestTypes, docCats, areas, users] = await Promise.all([
      RequestType.find({ tenantId, activo: true })
        .sort({ orden: 1, nombre: 1 })
        .select('key nombre area')
        .lean(),
      DocItem.distinct('category', { tenantId }),
      OrgArea.find({ tenantId, activo: true }).select('_id nombre key').sort({ orden: 1, nombre: 1 }).lean(),
      User.find({ tenantId, activo: true })
        .select('nombre apellido usuario roles capabilities areaId')
        .lean(),
    ])
    const docCategories = (docCats || [])
      .map((c) => String(c || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'))

    const areaNameById = Object.fromEntries(areas.map((a) => [String(a._id), a.nombre]))

    function personBrief(u) {
      const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario
      const areaNombre = u.areaId ? areaNameById[String(u.areaId)] || '' : ''
      return {
        id: String(u._id),
        nombre,
        areaNombre,
        isAdmin: (u.roles || []).includes('admin') || (u.roles || []).includes('platform'),
      }
    }

    const capabilities = ADMIN_SCREEN_CAPABILITIES.map((c) => {
      const holders = users
        .filter((u) => {
          const roles = u.roles || []
          if (roles.includes('admin') || roles.includes('platform')) return true
          return (u.capabilities || []).includes(c.id)
        })
        .map(personBrief)
        .slice(0, 8)
      return {
        id: c.id,
        label: CAP_WHO_LABEL[c.id] || c.label,
        screenLabel: c.label,
        where: 'Se asigna a cada persona en Usuarios → permisos de pantallas. No es un área de Organización.',
        holders,
        holdersCount: holders.length,
      }
    })

    res.json({
      modules: [
        {
          id: 'solicitudes',
          label: 'Solicitudes / consultas',
          hint: 'Se dispara al crear una solicitud (Mis solicitudes). El tipo es la plantilla configurada en Plantillas.',
          wired: true,
          tipoSource: 'requestTypes',
          tipoUi: '/tipos-solicitud',
          tipoUiLabel: 'Plantillas',
        },
        {
          id: 'documentos',
          label: 'Documentos',
          hint: 'Se dispara al crear un documento en borrador / con aprobación. El tipo es la categoría/carpeta del documento.',
          wired: true,
          tipoSource: 'docCategories',
          tipoUi: '/documentos',
          tipoUiLabel: 'Documentos',
        },
        {
          id: 'generico',
          label: 'Genérico',
          hint: 'Plantilla sin enganche automático a otro módulo. Útil para diseños o disparos futuros/manuales.',
          wired: false,
          tipoSource: 'free',
        },
      ],
      modulesNote:
        'Hoy solo solicitudes y documentos inician instancias solas. Encuestas, publicaciones u otros pueden sumarse después; aún no están cableados.',
      approverNote:
        '“Líder”, “Seguridad” o “TI” son nombres del paso. Quién aprueba de verdad se define aparte: por permiso en Usuarios, por área de Organización, por rol, o eligiendo personas. El área del organigrama no asigna permisos sola.',
      requestTypes: requestTypes.map((t) => ({
        key: t.key,
        nombre: t.nombre,
        area: t.area || '',
      })),
      docCategories,
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre, key: a.key || '' })),
      people: users.map(personBrief),
      approverTypes: [
        { id: 'capability', label: 'Por equipo / función (permiso en Usuarios)' },
        { id: 'role', label: 'Por rol (admin / member)' },
        { id: 'area', label: 'Por área de Organización' },
        { id: 'users', label: 'Personas concretas' },
      ],
      capabilities,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (req.query.activo === 'true') filter.activo = true
    if (req.query.activo === 'false') filter.activo = false
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    const items = await WorkflowDefinition.find(filter).sort({ updatedAt: -1 }).limit(200)
    res.json({ items: items.map(serializeDefinition) })
  } catch (e) {
    next(e)
  }
})

router.get('/instances', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
    const { items, hasMore } = await listApprovalsForUser({
      tenant: req.tenant,
      user: req.user,
      scope: 'all',
      status: String(req.query.status || '').trim(),
      page,
      limit,
    })
    res.json({ items, hasMore, page })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const d = await WorkflowDefinition.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!d) return res.status(404).json({ error: 'No encontrado' })
    res.json({ workflow: serializeDefinition(d) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const { ok, errors, payload } = validateWorkflowPayload(req.body || {})
    if (!ok) return res.status(400).json({ error: errors.join('; '), errors })
    const name = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario
    const d = await WorkflowDefinition.create({
      tenantId: req.tenant._id,
      ...payload,
      createdById: req.user._id,
      createdByName: name,
      aiNotes: String(req.body?.aiNotes || req.body?.notes || '').trim().slice(0, 400),
    })
    res.status(201).json({ workflow: serializeDefinition(d) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const d = await WorkflowDefinition.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!d) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.name != null || body.steps != null || body.trigger != null || body.description != null) {
      const { ok, errors, payload } = validateWorkflowPayload({
        name: body.name ?? d.name,
        description: body.description ?? d.description,
        trigger: body.trigger ?? d.trigger,
        steps: body.steps ?? d.steps,
        activo: body.activo ?? d.activo,
      })
      if (!ok) return res.status(400).json({ error: errors.join('; '), errors })
      d.name = payload.name
      d.description = payload.description
      d.trigger = payload.trigger
      d.steps = payload.steps
      d.activo = payload.activo
    } else if (body.activo != null) {
      d.activo = Boolean(body.activo)
    }
    if (body.aiNotes != null) d.aiNotes = String(body.aiNotes).trim().slice(0, 400)
    await d.save()
    res.json({ workflow: serializeDefinition(d) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const d = await WorkflowDefinition.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!d) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
