import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { LicenseType } from '../models/LicenseType.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import {
  serializeLicense,
  canTransitionLicense,
  DEFAULT_ABSENCE_TYPES,
  buildPeriodValidation,
  normalizeLicenciasConfig,
} from '../lib/licenciasConfig.js'
import {
  listActiveLicenseTypes,
  getSaldosForUser,
  findOverlappingLicense,
  nextLicenseCodigo,
} from '../services/licenciaSaldo.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { notifyLicenseCreated } from '../services/notifyTramite.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function actorName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || 'Usuario'
}

function parseAdjuntos(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => ({
      nombre: String(a?.nombre || '').slice(0, 120),
      url: String(a?.url || '').slice(0, 500),
    }))
    .filter((a) => a.url)
    .slice(0, 10)
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      ensureUploadDir()
      cb(null, UPLOAD_DIR)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const rawExt = path.extname(file.originalname || '').toLowerCase()
    const safe = /^\.(jpe?g|png|webp|gif|pdf)$/i.test(rawExt) ? rawExt.replace(/jpeg/i, 'jpg') : '.bin'
    cb(null, `lic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (
      /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype) ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true)
    } else {
      cb(new Error('Tipo no permitido (jpg, png, webp, gif, pdf)'))
    }
  },
})

router.post(
  '/upload',
  requireAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' })
    const url = toPublicMediaUrl(`/uploads/${req.file.filename}`)
    res.status(201).json({
      url,
      nombre: req.file.originalname || req.file.filename,
      mimeType: req.file.mimetype,
    })
  },
)

router.get('/tipos', requireAuth, async (req, res, next) => {
  try {
    const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
    const tipos = await listActiveLicenseTypes(req.tenant._id, cfg.pais)
    res.json({ tipos, legislacion: cfg })
  } catch (e) {
    next(e)
  }
})

router.get('/legislacion', requireAuth, async (req, res) => {
  const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
  res.json({ legislacion: cfg })
})

router.get('/saldo', requireAuth, async (req, res, next) => {
  try {
    const anio = Number(req.query.anio) || new Date().getUTCFullYear()
    const saldos = await getSaldosForUser({
      tenantId: req.tenant._id,
      userId: req.user._id,
      anio,
      tenant: req.tenant,
    })
    const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
    res.json({ anio, saldos, legislacion: cfg })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
    const q = { tenantId: req.tenant._id, requesterId: req.user._id }
    if (req.query.estado) q.estado = String(req.query.estado)
    if (req.query.tipoKey) q.tipoKey = String(req.query.tipoKey)
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

router.get('/:id([a-fA-F0-9]{24})', requireAuth, async (req, res, next) => {
  try {
    const r = await LicenseRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Licencia no encontrada' })
    if (String(r.requesterId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    res.json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    const tipoKey = String(body.tipoKey || body.tipo || 'vacaciones').toLowerCase().trim()
    const cfg = normalizeLicenciasConfig(req.tenant.licenciasConfig)
    await listActiveLicenseTypes(req.tenant._id, cfg.pais)
    const tipo = await LicenseType.findOne({
      tenantId: req.tenant._id,
      key: tipoKey,
      activo: true,
    })
    if (!tipo) return res.status(400).json({ error: 'Tipo de licencia inválido' })

    const period = buildPeriodValidation({
      desde: body.desde,
      hasta: body.hasta || body.desde,
      tipo,
      licenciasConfig: cfg,
    })
    if (!period.ok) return res.status(400).json({ error: period.error })

    const adjuntos = parseAdjuntos(body.adjuntos)
    if (tipo.requiereAdjunto && !adjuntos.length) {
      return res.status(400).json({ error: 'Este tipo requiere un adjunto' })
    }

    const overlap = await findOverlappingLicense({
      tenantId: req.tenant._id,
      userId: req.user._id,
      desde: period.desde,
      hasta: period.hasta,
    })
    if (overlap) {
      return res.status(409).json({
        error: `Se solapa con ${overlap.codigo} (${overlap.estado})`,
        overlapId: String(overlap._id),
      })
    }

    const saldos = await getSaldosForUser({
      tenantId: req.tenant._id,
      userId: req.user._id,
      anio: period.desde.getUTCFullYear(),
      tenant: req.tenant,
    })
    const row = saldos.find((s) => s.tipo.key === tipo.key)
    if (row && (row.tipo.diasAnualesDefault > 0 || row.tipo.esVacaciones) && period.dias > row.saldo.disponibleNeto) {
      return res.status(400).json({
        error: `Saldo insuficiente: disponible ${row.saldo.disponibleNeto} día(s), pedís ${period.dias}`,
        saldo: row.saldo,
      })
    }

    const name = actorName(req.user)
    const codigo = await nextLicenseCodigo(req.tenant._id)
    const r = await LicenseRequest.create({
      tenantId: req.tenant._id,
      codigo,
      tipoId: tipo._id,
      tipoKey: tipo.key,
      tipoNombre: tipo.nombre,
      desde: period.desde,
      hasta: period.hasta,
      dias: period.dias,
      cuentaDias: period.cuentaDias || 'calendario',
      estado: 'pendiente',
      motivo: String(body.motivo || '').slice(0, 2000),
      saldoAntes: row?.saldo?.disponible ?? null,
      requesterId: req.user._id,
      requesterName: name,
      adjuntos,
      historial: [
        {
          estado: 'pendiente',
          actorId: req.user._id,
          actorName: name,
          comentario: 'Solicitud creada',
          at: new Date(),
        },
      ],
    })

    try {
      await startWorkflowForOrigin({
        tenantId: req.tenant._id,
        module: 'licencias',
        refId: r._id,
        titulo: `${tipo.nombre}: ${period.dias} día(s)`,
        codigo: r.codigo,
        tipoKey: r.tipoKey,
        solicitanteId: req.user._id,
        solicitanteName: name,
      })
    } catch (wfErr) {
      console.warn('[workflow] licencia', wfErr?.message || wfErr)
    }

    notifyLicenseCreated({ tenant: req.tenant, license: r }).catch((err) =>
      console.warn('[notify] license create', err?.message || err),
    )

    res.status(201).json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id([a-fA-F0-9]{24})/cancel', requireAuth, async (req, res, next) => {
  try {
    const r = await LicenseRequest.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Licencia no encontrada' })
    if (String(r.requesterId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    if (!canTransitionLicense(r.estado, 'cancelada')) {
      return res.status(400).json({ error: `No se puede cancelar desde ${r.estado}` })
    }
    const name = actorName(req.user)
    r.estado = 'cancelada'
    r.historial.push({
      estado: 'cancelada',
      actorId: req.user._id,
      actorName: name,
      comentario: String(req.body?.comentario || 'Cancelada por el solicitante').slice(0, 500),
      at: new Date(),
    })
    await r.save()
    res.json({ license: serializeLicense(r, { includeHistorial: true }) })
  } catch (e) {
    next(e)
  }
})

export default router
