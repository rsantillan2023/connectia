import { Router } from 'express'
import mongoose from 'mongoose'
import { DocItem } from '../models/DocItem.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience } from '../lib/audience.js'
import { serializeDoc } from './documents.js'
import { fetchDocumentsFromSap, sapDocsConfigured } from '../services/sapDocsAdapter.js'
import {
  documentsMeta,
  normalizeFileType,
  normalizeRepository,
  inferFileType,
} from '../lib/docTypes.js'
import { storageStatus } from '../services/docStorage.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'
import {
  serializeDocsDropConfig,
  mergeDocsDropConfig,
  validateDocsDropConfig,
} from '../lib/docsDropConfig.js'
import { syncDocsDrop, testDropPattern } from '../services/docDropSync.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }

  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))

  const [areas, groups, users] = await Promise.all([
    a.mode === 'restricted' && areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id')
      : [],
    a.mode === 'restricted' && groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id')
      : [],
    userIds.length
      ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id')
      : [],
  ])

  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

function mapAudienceCandidate(u) {
  return {
    id: String(u._id),
    usuario: u.usuario || '',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    areaId: u.areaId ? String(u.areaId) : null,
    label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
  }
}

router.get('/meta', requireAuth, requireCapability('admin.documentos'), async (_req, res) => {
  res.json({
    ...documentsMeta(),
    storageStatus: storageStatus(),
    sapConfigured: sapDocsConfigured(),
  })
})

/** Candidatos para destinatarios puntuales (capability de documentos). */
router.get('/audience-candidates', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .slice(0, 100)
      .map((id) => new ObjectId(id))

    if (ids.length) {
      const items = await User.find({ tenantId: req.tenant._id, _id: { $in: ids } })
        .select('_id usuario nombre apellido email areaId')
        .lean()
      return res.json({ items: items.map(mapAudienceCandidate) })
    }

    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    }
    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(40)
      .lean()
    res.json({ items: items.map(mapAudienceCandidate) })
  } catch (e) {
    next(e)
  }
})

/** Config bandeja externa (URL / S3 / Drive + patrón de nombre → usuario). */
router.get('/drop-config', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id).select('docsDrop').lean()
    res.json({ config: serializeDocsDropConfig(tenant?.docsDrop) })
  } catch (e) {
    next(e)
  }
})

router.put('/drop-config', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id)
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' })
    const merged = mergeDocsDropConfig(tenant.docsDrop, req.body?.config ?? req.body)
    const check = validateDocsDropConfig(merged)
    if (!check.ok) {
      return res.status(400).json({ error: check.errors[0] || 'Config inválida', errors: check.errors })
    }
    tenant.docsDrop = check.config
    tenant.markModified('docsDrop')
    await tenant.save()
    res.json({ config: serializeDocsDropConfig(tenant.docsDrop) })
  } catch (e) {
    next(e)
  }
})

/** Prueba un nombre de archivo contra el patrón (sin sync). */
router.post('/drop-test', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id).select('docsDrop').lean()
    const cfg = mergeDocsDropConfig(tenant?.docsDrop, req.body?.config ?? {})
    const fileName = String(req.body?.fileName || req.body?.name || '').trim()
    if (!fileName) return res.status(400).json({ error: 'fileName es requerido' })
    const result = testDropPattern(cfg, fileName)
    if (!result.ok) return res.status(400).json(result)

    const strip = cfg.stripNonDigits || cfg.matchField === 'dni' || cfg.matchField === 'cuil'
    const users = await User.find({ tenantId: req.tenant._id, activo: true })
      .select('_id usuario nombre apellido dni cuil idExterno email')
      .lean()
    const hits = users.filter((u) => {
      const raw = u[cfg.matchField] ?? ''
      const key = String(raw || '')
        .trim()
      const norm = strip
        ? key.replace(/\D+/g, '')
        : key.replace(/\s+/g, '').toLowerCase()
      return norm && norm === result.matchKey
    })
    res.json({
      ...result,
      users: hits.map((u) => ({
        id: String(u._id),
        usuario: u.usuario,
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Sincroniza bandeja → documentos personales (audience users). */
router.post('/drop-sync', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const dryRun = req.body?.dryRun === true || req.query?.dryRun === '1'
    const result = await syncDocsDrop({ tenantId: req.tenant._id, dryRun })
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const items = await DocItem.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).lean()
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
    ])
    res.json({
      items: items.map((d) => ({
        ...serializeDoc(d),
        requiresSignature: Boolean(d.requiresSignature),
        signatureCount: (d.signatures || []).length,
        source: d.source || 'manual',
        externalId: d.externalId || '',
      })),
      sapConfigured: sapDocsConfigured(),
      meta: documentsMeta(),
      storageStatus: storageStatus(),
      org: {
        areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
        groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
      },
      docsDrop: serializeDocsDropConfig(req.tenant.docsDrop),
    })
  } catch (e) {
    next(e)
  }
})

/** Reporte de descargas (17.06) */
router.get('/report', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const items = await DocItem.find({ tenantId: req.tenant._id })
      .select(
        'titulo category downloadCount downloads requiresSignature signatures source status repository fileType',
      )
      .sort({ downloadCount: -1 })
      .lean()

    const byCategory = {}
    let totalDownloads = 0
    const ranking = items.map((d) => {
      totalDownloads += d.downloadCount || 0
      const cat = d.category || 'general'
      byCategory[cat] = (byCategory[cat] || 0) + (d.downloadCount || 0)
      return {
        id: String(d._id),
        titulo: d.titulo,
        category: cat,
        downloadCount: d.downloadCount || 0,
        signatureCount: (d.signatures || []).length,
        source: d.source || 'manual',
        repository: d.repository || 'url',
        fileType: d.fileType || 'other',
        status: d.status,
        recentDownloads: (d.downloads || []).slice(-10).map((x) => ({
          userId: x.userId ? String(x.userId) : null,
          at: x.at,
        })),
      }
    })

    res.json({
      totalDownloads,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      ranking,
    })
  } catch (e) {
    next(e)
  }
})

/** Sync stub SAP (17.05) */
router.post('/sap-sync', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const result = await fetchDocumentsFromSap(req.tenant)
    if (!result.configured) {
      return res.status(400).json({ error: result.message || 'SAP no configurado', configured: false })
    }
    if (result.error && !result.items.length) {
      return res.status(502).json({ error: result.error, configured: true })
    }

    let upserted = 0
    for (const item of result.items) {
      const fileType = inferFileType({
        mimeType: item.mimeType,
        fileName: item.titulo,
        fileUrl: item.fileUrl,
      })
      await DocItem.findOneAndUpdate(
        { tenantId: req.tenant._id, source: 'sap', externalId: item.externalId },
        {
          $set: {
            titulo: item.titulo,
            descripcion: item.descripcion,
            category: item.category || 'sap',
            fileUrl: item.fileUrl,
            mimeType: item.mimeType || '',
            fileType,
            fileName: item.titulo || '',
            repository: 'sap',
            status: 'published',
            source: 'sap',
            externalId: item.externalId,
            publishedAt: new Date(),
            authorName: 'SAP sync',
          },
          $setOnInsert: {
            tenantId: req.tenant._id,
            audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
          },
        },
        { upsert: true },
      )
      upserted += 1
    }

    res.json({
      ok: true,
      configured: true,
      upserted,
      message: result.message,
      items: upserted,
    })
  } catch (e) {
    next(e)
  }
})

async function buildDocFields(tenantId, body, { isCreate = false } = {}) {
  const fileUrl = String(body.fileUrl || '').trim()
  const fileName = String(body.fileName || '').trim()
  const mimeType = String(body.mimeType || '').trim()
  const repository = normalizeRepository(body.repository)
  const fileType = normalizeFileType(body.fileType, { mimeType, fileName, fileUrl })
  const fields = {
    titulo: String(body.titulo || '').trim().slice(0, 200),
    descripcion: String(body.descripcion || '').slice(0, 4000),
    category: String(body.category || 'general').trim().slice(0, 80) || 'general',
    fileUrl,
    mimeType,
    fileType,
    fileName: fileName.slice(0, 260),
    fileSize: Math.max(0, Number(body.fileSize) || 0),
    repository,
    storageKey: String(body.storageKey || '').trim().slice(0, 500),
    audience: await resolveAudienceIds(tenantId, body.audience),
    requiresSignature: Boolean(body.requiresSignature),
  }
  if (isCreate) {
    fields.source = repository === 'sap' ? 'sap' : 'manual'
  }
  return fields
}

router.post('/', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!String(body.titulo || '').trim() || !String(body.fileUrl || '').trim()) {
      return res.status(400).json({ error: 'Título y archivo/URL son requeridos' })
    }
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'published'
    const fields = await buildDocFields(req.tenant._id, body, { isCreate: true })
    if (fields.audience.mode === 'users' && !fields.audience.userIds.length) {
      return res.status(400).json({ error: 'Elegí al menos un destinatario puntual' })
    }
    const wantApproval = body.requireApproval === true || body.startWorkflow === true
    const initialStatus = wantApproval ? 'draft' : status
    const authorName = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario
    const doc = await DocItem.create({
      tenantId: req.tenant._id,
      ...fields,
      status: initialStatus,
      authorId: req.user._id,
      authorName,
      publishedAt: initialStatus === 'published' ? new Date() : null,
    })
    if (wantApproval || initialStatus === 'draft') {
      try {
        await startWorkflowForOrigin({
          tenantId: req.tenant._id,
          module: 'documentos',
          refId: doc._id,
          titulo: doc.titulo,
          codigo: '',
          tipoKey: doc.category || '',
          solicitanteId: req.user._id,
          solicitanteName: authorName,
        })
      } catch (wfErr) {
        console.warn('[workflow] doc instance', wfErr?.message || wfErr)
      }
    }
    res.status(201).json({ document: serializeDoc(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const doc = await DocItem.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).slice(0, 4000)
    if (body.category != null) doc.category = String(body.category).trim().slice(0, 80) || 'general'
    if (body.fileUrl != null) doc.fileUrl = String(body.fileUrl).trim()
    if (body.mimeType != null) doc.mimeType = String(body.mimeType).trim()
    if (body.fileName != null) doc.fileName = String(body.fileName).trim().slice(0, 260)
    if (body.fileSize != null) doc.fileSize = Math.max(0, Number(body.fileSize) || 0)
    if (body.storageKey != null) doc.storageKey = String(body.storageKey).trim().slice(0, 500)
    if (body.repository != null) doc.repository = normalizeRepository(body.repository)
    if (body.fileType != null || body.fileUrl != null || body.mimeType != null || body.fileName != null) {
      doc.fileType = normalizeFileType(body.fileType ?? doc.fileType, {
        mimeType: doc.mimeType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
      })
    }
    if (body.audience) {
      const audience = await resolveAudienceIds(req.tenant._id, body.audience)
      if (audience.mode === 'users' && !audience.userIds.length) {
        return res.status(400).json({ error: 'Elegí al menos un destinatario puntual' })
      }
      doc.audience = audience
    }
    if (body.requiresSignature != null) doc.requiresSignature = Boolean(body.requiresSignature)
    if (['draft', 'published', 'archived'].includes(body.status)) {
      if (body.status === 'published' && doc.status !== 'published') doc.publishedAt = new Date()
      doc.status = body.status
    }
    await doc.save()
    res.json({ document: serializeDoc(doc) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const r = await DocItem.deleteOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r.deletedCount) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
