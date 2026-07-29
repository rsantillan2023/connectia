import { Router } from 'express'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import { requireAuth, requireCapability, isFullAdmin } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { TenantParam } from '../models/TenantParam.js'
import {
  parseUserImportFile,
  buildImportTemplateCsv,
  buildImportTemplateXlsx,
  validateImportRow,
} from '../lib/userImport.js'
import {
  planDirectorySync,
  fetchGoogleDirectoryUsers,
  fetchEntraDirectoryUsers,
  directoryStatusNotes,
} from '../lib/directorySync.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

async function buildImportContext(tenantId, operator) {
  const [users, areas, groups, policyParam] = await Promise.all([
    User.find({ tenantId }).select('_id usuario email').lean(),
    OrgArea.find({ tenantId, activo: true }).select('_id key').lean(),
    UserGroup.find({ tenantId, activo: true }).select('_id key').lean(),
    TenantParam.findOne({ tenantId, key: 'import.policy' }).lean(),
  ])
  const existingByUsuario = new Map(users.map((u) => [String(u.usuario).toLowerCase(), String(u._id)]))
  const existingByEmail = new Map(
    users.filter((u) => u.email).map((u) => [String(u.email).toLowerCase(), String(u._id)]),
  )
  return {
    existingByUsuario,
    existingByEmail,
    areaByKey: new Map(areas.map((a) => [String(a.key).toLowerCase(), a._id])),
    groupByKey: new Map(groups.map((g) => [String(g.key).toLowerCase(), g._id])),
    operatorIsFullAdmin: isFullAdmin(operator),
    policy: policyParam?.valor === 'all_or_nothing' ? 'all_or_nothing' : 'partial',
  }
}

function parseUploadedImport(req) {
  if (req.file?.buffer) {
    return parseUserImportFile(req.file.buffer, req.file.originalname || '')
  }
  if (req.body?.csv) {
    return parseUserImportFile(String(req.body.csv), 'paste.csv')
  }
  return null
}

router.get('/template', requireAuth, requireCapability('admin.usuarios'), (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase()
  if (format === 'xlsx' || format === 'excel') {
    const buf = buildImportTemplateXlsx()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-usuarios.xlsx"')
    return res.send(Buffer.from(buf))
  }
  const csv = buildImportTemplateCsv()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-usuarios.csv"')
  res.send(csv)
})

router.post(
  '/preview',
  requireAuth,
  requireCapability('admin.usuarios'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const parsed = parseUploadedImport(req)
      if (!parsed) {
        return res.status(400).json({ error: 'Subí un archivo CSV/Excel o enviá el campo csv' })
      }
      if (parsed.errors.length && !parsed.rows.length) {
        return res.status(400).json({ error: 'Archivo inválido', errors: parsed.errors, format: parsed.format })
      }
      if (parsed.rows.length > 500) {
        return res.status(400).json({ error: 'Máximo 500 filas por lote' })
      }
      const ctx = await buildImportContext(req.tenant._id, req.user)
      const preview = parsed.rows.map((row) => validateImportRow(row, ctx))
      const summary = {
        total: preview.length,
        create: preview.filter((p) => p.ok && p.action === 'create').length,
        update: preview.filter((p) => p.ok && p.action === 'update').length,
        errors: preview.filter((p) => !p.ok).length,
        policy: ctx.policy,
        format: parsed.format,
      }
      res.json({
        headers: parsed.headers,
        parseErrors: parsed.errors,
        preview,
        summary,
      })
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message })
      next(e)
    }
  },
)

router.post(
  '/commit',
  requireAuth,
  requireCapability('admin.usuarios'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const parsed = parseUploadedImport(req)
      if (!parsed) {
        return res.status(400).json({ error: 'Subí un archivo CSV/Excel o enviá el campo csv' })
      }
      if (parsed.rows.length > 500) {
        return res.status(400).json({ error: 'Máximo 500 filas por lote' })
      }
      const ctx = await buildImportContext(req.tenant._id, req.user)
      const preview = parsed.rows.map((row) => validateImportRow(row, ctx))
      const valid = preview.filter((p) => p.ok)
      const invalid = preview.filter((p) => !p.ok)

      if (ctx.policy === 'all_or_nothing' && invalid.length) {
        return res.status(400).json({
          error: 'Lote abortado (política todo-o-nada): hay filas con error',
          summary: { errors: invalid.length, total: preview.length },
          report: invalid,
        })
      }

      const report = []
      const defaultPassword = await bcrypt.hash('Cambiar123!', 12)

      for (const row of valid) {
        const p = row.payload
        try {
          if (row.action === 'create') {
            let passwordHash = defaultPassword
            if (p.password && p.password.length >= 8) {
              passwordHash = await bcrypt.hash(p.password, 12)
            }
            const u = await User.create({
              tenantId: req.tenant._id,
              usuario: p.usuario,
              email: p.email,
              nombre: p.nombre,
              apellido: p.apellido,
              idExterno: p.idExterno,
              dni: p.dni,
              cuil: p.cuil,
              cargo: p.cargo,
              roles: p.roles.includes('admin') && !ctx.operatorIsFullAdmin ? ['member'] : p.roles,
              areaId: p.areaId,
              groupIds: p.groupIds,
              activo: p.activo,
              passwordHash,
              origen: 'FILE',
            })
            report.push({ line: row.line, action: 'create', ok: true, id: String(u._id), usuario: p.usuario })
          } else {
            const u = await User.findOne({ _id: p.existingId, tenantId: req.tenant._id })
            if (!u) {
              report.push({ line: row.line, action: 'update', ok: false, issues: ['usuario no encontrado'] })
              continue
            }
            if (p.email) u.email = p.email
            if (p.nombre) u.nombre = p.nombre
            if (p.apellido) u.apellido = p.apellido
            if (p.idExterno) u.idExterno = p.idExterno
            if (p.dni) u.dni = p.dni
            if (p.cuil) u.cuil = p.cuil
            if (p.cargo) u.cargo = p.cargo
            u.activo = p.activo
            if (p.areaId) u.areaId = p.areaId
            if (p.groupIds?.length) u.groupIds = p.groupIds
            if (p.roles?.length && ctx.operatorIsFullAdmin) u.roles = p.roles
            if (p.password && p.password.length >= 8) {
              u.passwordHash = await bcrypt.hash(p.password, 12)
            }
            await u.save()
            report.push({ line: row.line, action: 'update', ok: true, id: String(u._id), usuario: p.usuario })
          }
        } catch (err) {
          report.push({
            line: row.line,
            action: row.action,
            ok: false,
            issues: [err.code === 11000 ? 'usuario duplicado' : err.message],
          })
        }
      }

      for (const bad of invalid) {
        report.push({ line: bad.line, action: bad.action, ok: false, issues: bad.issues })
      }

      await recordActivity({
        tenantId: req.tenant._id,
        userId: req.user._id,
        action: 'admin.user_import',
        meta: {
          total: preview.length,
          ok: report.filter((r) => r.ok).length,
          errors: report.filter((r) => !r.ok).length,
          format: parsed.format,
        },
        ...reqMeta(req),
      })

      res.json({
        summary: {
          total: preview.length,
          ok: report.filter((r) => r.ok).length,
          errors: report.filter((r) => !r.ok).length,
          created: report.filter((r) => r.ok && r.action === 'create').length,
          updated: report.filter((r) => r.ok && r.action === 'update').length,
          format: parsed.format,
        },
        report,
      })
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message })
      next(e)
    }
  },
)

router.get('/directory/status', requireAuth, requireCapability('admin.usuarios'), async (_req, res) => {
  res.json(directoryStatusNotes())
})

async function resolveDirectoryEntries(req, origen) {
  let entries = Array.isArray(req.body?.entries) ? req.body.entries : null
  if (entries?.length) return { entries, source: 'payload' }

  const maxResults = Math.min(500, Math.max(1, Number(req.body?.maxResults) || 200))
  if (origen === 'GOOGLE') {
    entries = await fetchGoogleDirectoryUsers({
      domain: req.body?.domain,
      maxResults,
    })
  } else {
    entries = await fetchEntraDirectoryUsers({ maxResults })
  }
  if (!entries) {
    const err = new Error(
      'Sin usuarios del IdP. Configurá credenciales de plataforma o enviá body.entries (lista JSON).',
    )
    err.status = 400
    throw err
  }
  return { entries, source: 'idp' }
}

router.post('/directory/preview', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const provider = String(req.body?.provider || 'google').toLowerCase()
    const origen = provider === 'entra' ? 'ENTRA' : 'GOOGLE'
    const { entries, source } = await resolveDirectoryEntries(req, origen)

    const ctx = await buildImportContext(req.tenant._id, req.user)
    const plan = planDirectorySync(entries, {
      existingByUsuario: ctx.existingByUsuario,
      existingByEmail: ctx.existingByEmail,
      origen,
    })
    res.json({
      provider,
      origen,
      source,
      summary: {
        total: plan.length,
        create: plan.filter((p) => p.action === 'create').length,
        update: plan.filter((p) => p.action === 'update').length,
      },
      plan,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.post('/directory/commit', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const provider = String(req.body?.provider || 'google').toLowerCase()
    const origen = provider === 'entra' ? 'ENTRA' : 'GOOGLE'
    const { entries, source } = await resolveDirectoryEntries(req, origen)
    if (entries.length > 500) {
      return res.status(400).json({ error: 'Máximo 500 usuarios por lote' })
    }

    const ctx = await buildImportContext(req.tenant._id, req.user)
    const plan = planDirectorySync(entries, {
      existingByUsuario: ctx.existingByUsuario,
      existingByEmail: ctx.existingByEmail,
      origen,
    })
    const defaultPassword = await bcrypt.hash('Cambiar123!', 12)
    const report = []

    for (const row of plan) {
      if (!row.ok) {
        report.push({ ...row, applied: false })
        continue
      }
      try {
        if (row.action === 'create') {
          const u = await User.create({
            tenantId: req.tenant._id,
            usuario: row.usuario,
            email: row.email,
            nombre: row.nombre,
            apellido: row.apellido,
            idExterno: row.idExterno,
            cargo: row.cargo,
            roles: ['member'],
            activo: row.activo,
            passwordHash: defaultPassword,
            origen,
          })
          report.push({ usuario: row.usuario, action: 'create', ok: true, id: String(u._id) })
        } else {
          const u = await User.findOne({ _id: row.existingId, tenantId: req.tenant._id })
          if (!u) {
            report.push({ usuario: row.usuario, action: 'update', ok: false, issues: ['no encontrado'] })
            continue
          }
          if (row.email) u.email = row.email
          if (row.nombre) u.nombre = row.nombre
          if (row.apellido) u.apellido = row.apellido
          if (row.idExterno) u.idExterno = row.idExterno
          if (row.cargo) u.cargo = row.cargo
          u.activo = row.activo
          if (!u.origen || u.origen === 'MANUAL') u.origen = origen
          await u.save()
          report.push({ usuario: row.usuario, action: 'update', ok: true, id: String(u._id) })
        }
      } catch (err) {
        report.push({
          usuario: row.usuario,
          action: row.action,
          ok: false,
          issues: [err.code === 11000 ? 'duplicado' : err.message],
        })
      }
    }

    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: origen === 'ENTRA' ? 'admin.user_sync_entra' : 'admin.user_sync_google',
      meta: {
        total: plan.length,
        ok: report.filter((r) => r.ok).length,
        source,
      },
      ...reqMeta(req),
    })

    res.json({
      provider,
      origen,
      source,
      summary: {
        total: plan.length,
        ok: report.filter((r) => r.ok).length,
        errors: report.filter((r) => !r.ok).length,
      },
      report,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

export default router
