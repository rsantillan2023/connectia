/**
 * Import masivo de documentos desde ZIP (patrón → usuario / biblioteca por carpetas).
 */
import { Router } from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience } from '../lib/audience.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { importZipPersonal } from '../services/docZipPersonalImport.js'
import { importZipLibrary } from '../services/docZipLibraryImport.js'
import { serializeDocsDropConfig } from '../lib/docsDropConfig.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || '').toLowerCase()
    const ok =
      name.endsWith('.zip') ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream'
    if (ok) cb(null, true)
    else cb(new Error('Solo se aceptan archivos .zip'))
  },
})

function parseJsonField(raw, fallback = {}) {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return fallback
  }
}

function parseBool(v) {
  return v === true || v === 'true' || v === '1' || v === 'on'
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

function patternConfigFromBody(body) {
  const fromJson = parseJsonField(body?.config, null)
  const src = fromJson && typeof fromJson === 'object' ? fromJson : body || {}
  const out = {}
  for (const key of [
    'namePattern',
    'matchToken',
    'matchField',
    'stripNonDigits',
    'tituloTemplate',
    'category',
    'requiresSignature',
    'publishOnMatch',
  ]) {
    if (src[key] != null && src[key] !== '') out[key] = src[key]
  }
  if (body?.namePattern) out.namePattern = body.namePattern
  if (body?.matchToken) out.matchToken = body.matchToken
  if (body?.matchField) out.matchField = body.matchField
  if (body?.tituloTemplate) out.tituloTemplate = body.tituloTemplate
  if (body?.category) out.category = body.category
  if (body?.stripNonDigits != null) out.stripNonDigits = parseBool(body.stripNonDigits)
  if (body?.requiresSignature != null) out.requiresSignature = parseBool(body.requiresSignature)
  if (body?.publishOnMatch != null) out.publishOnMatch = parseBool(body.publishOnMatch)
  return out
}

/** Meta para el panel (reusa ayuda de bandeja). */
router.get('/meta', requireAuth, requireCapability('admin.documentos'), async (req, res, next) => {
  try {
    const drop = serializeDocsDropConfig(req.tenant?.docsDrop)
    res.json({
      patternHelp: drop.meta?.patternHelp || '',
      matchFields: drop.meta?.matchFields || [],
      defaults: {
        namePattern: drop.namePattern,
        matchToken: drop.matchToken,
        matchField: drop.matchField,
        stripNonDigits: drop.stripNonDigits,
        tituloTemplate: drop.tituloTemplate,
        category: drop.category,
        requiresSignature: drop.requiresSignature,
        publishOnMatch: drop.publishOnMatch,
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post(
  '/personal',
  requireAuth,
  requireCapability('admin.documentos'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  async (req, res, next) => {
    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: 'Subí un archivo .zip' })
      }
      const dryRun = parseBool(req.body?.dryRun) || req.query?.dryRun === '1'
      const useAi = req.body?.useAi == null ? true : parseBool(req.body.useAi)
      const config = patternConfigFromBody(req.body)
      const result = await importZipPersonal({
        tenantId: req.tenant._id,
        buffer: req.file.buffer,
        config,
        useAi,
        dryRun,
      })
      if (!result.ok) return res.status(400).json(result)
      res.json(result)
    } catch (e) {
      next(e)
    }
  },
)

router.post(
  '/library',
  requireAuth,
  requireCapability('admin.documentos'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  async (req, res, next) => {
    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: 'Subí un archivo .zip' })
      }
      const dryRun = parseBool(req.body?.dryRun) || req.query?.dryRun === '1'
      const basePath = String(req.body?.basePath || '').trim()
      const status = String(req.body?.status || 'draft').trim()
      const requiresSignature = parseBool(req.body?.requiresSignature)
      const useAi = req.body?.useAi == null ? true : parseBool(req.body.useAi)
      const audienceRaw = parseJsonField(req.body?.audience, { mode: req.body?.audienceMode || 'all' })
      if (req.body?.audienceMode) audienceRaw.mode = req.body.audienceMode
      const audience = await resolveAudienceIds(req.tenant._id, audienceRaw)
      const authorName =
        [req.user?.nombre, req.user?.apellido].filter(Boolean).join(' ') ||
        req.user?.usuario ||
        'Import ZIP biblioteca'

      const result = await importZipLibrary({
        tenantId: req.tenant._id,
        buffer: req.file.buffer,
        basePath,
        audience,
        status,
        requiresSignature,
        useAi,
        dryRun,
        authorName,
      })
      if (!result.ok) return res.status(400).json(result)
      res.json(result)
    } catch (e) {
      next(e)
    }
  },
)

export default router
