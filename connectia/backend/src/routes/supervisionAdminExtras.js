/**
 * Extensión admin Ola 31: taxonomía, geo, imports XLSX, permisos_config.
 * Montado desde supervisionAdmin.js
 */
import multer from 'multer'
import {
  SupCadena,
  SupCliente,
  SupSala,
  SupClienteSala,
  SupSubcadena,
  SupCategoria,
  SupCoberturaRol,
  SupPilar,
  SupMedicion,
  SupItemMedicion,
  SupPilarMedicion,
  SupTemplateEstado,
  SupUbicacion,
  SupRolePermisos,
  SupVisitaRecurrencia,
  SupAsignacionConsulta,
  SupTemplate,
  serializeNamed,
  serializeCoberturaRol,
  serializeVisitaRecurrencia,
  serializeAsignacionConsulta,
  resolveAsignadosIds,
} from '../models/Supervision.js'
import { parseSupervisionImport, buildImportTemplate } from '../lib/supervisionImport.js'
import { defaultPermisosForRole, mergePermisos, SUP_SCREENS, SUP_ACTIONS } from '../lib/supervisionPermisos.js'
import { SUP_ROLE } from '../lib/supervisionTasks.js'
import { ensureDefaultCoberturaRoles } from '../lib/supervisionCoberturaRoles.js'
import {
  computeNextRunAt,
  validateRecurrenciaPayload,
  normalizeDiasSemana,
  normalizeSemanasMes,
} from '../lib/supervisionRecurrencia.js'
import { User } from '../models/User.js'
import mongoose from 'mongoose'

const ObjectId = mongoose.Types.ObjectId
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

function crudNamed(Model, serialize = serializeNamed) {
  return {
    list: async (req, res) => {
      const q = { tenantId: req.tenant._id }
      if (req.query.cadenaId && ObjectId.isValid(req.query.cadenaId)) q.cadenaId = req.query.cadenaId
      if (req.query.pilarId && ObjectId.isValid(req.query.pilarId)) q.pilarId = req.query.pilarId
      if (req.query.medicionId && ObjectId.isValid(req.query.medicionId)) q.medicionId = req.query.medicionId
      if (req.query.tipo) q.tipo = String(req.query.tipo)
      if (req.query.parentId && ObjectId.isValid(req.query.parentId)) q.parentId = req.query.parentId
      const rows = await Model.find(q).sort({ nombre: 1 }).lean()
      res.json({
        items: rows.map((d) =>
          serialize(d, {
            ...(d.cadenaId ? { cadenaId: String(d.cadenaId) } : {}),
            ...(d.color != null ? { color: d.color } : {}),
            ...(d.descripcion != null ? { descripcion: d.descripcion || '' } : {}),
            ...(d.tipo != null ? { tipo: d.tipo } : {}),
            ...(d.pilarId ? { pilarId: String(d.pilarId) } : {}),
            ...(d.medicionId ? { medicionId: String(d.medicionId) } : {}),
            ...(d.codigo != null ? { codigo: d.codigo || '' } : {}),
            ...(d.parentId ? { parentId: String(d.parentId) } : {}),
            ...(d.orden != null ? { orden: d.orden } : {}),
          }),
        ),
      })
    },
    create: async (req, res) => {
      const nombre = String(req.body?.nombre || '').trim()
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
      const payload = {
        tenantId: req.tenant._id,
        nombre: nombre.slice(0, 200),
        activo: true,
      }
      if (req.body?.color != null) payload.color = String(req.body.color).slice(0, 20)
      if (req.body?.descripcion != null) payload.descripcion = String(req.body.descripcion).slice(0, 500)
      if (req.body?.tipo != null) payload.tipo = String(req.body.tipo).slice(0, 40)
      if (req.body?.codigo != null) payload.codigo = String(req.body.codigo).slice(0, 40)
      if (req.body?.orden != null) payload.orden = Number(req.body.orden) || 0
      if (req.body?.cadenaId && ObjectId.isValid(req.body.cadenaId)) payload.cadenaId = req.body.cadenaId
      if (req.body?.pilarId && ObjectId.isValid(req.body.pilarId)) payload.pilarId = req.body.pilarId
      if (req.body?.medicionId && ObjectId.isValid(req.body.medicionId)) payload.medicionId = req.body.medicionId
      if (req.body?.parentId && ObjectId.isValid(req.body.parentId)) payload.parentId = req.body.parentId
      if (Model === SupSubcadena && !payload.cadenaId) {
        return res.status(400).json({ error: 'cadenaId requerido' })
      }
      if (Model === SupItemMedicion && !payload.medicionId) {
        return res.status(400).json({ error: 'medicionId requerido' })
      }
      if (Model === SupUbicacion && !payload.tipo) {
        return res.status(400).json({ error: 'tipo requerido (pais|region|comuna)' })
      }
      const d = await Model.create(payload)
      res.status(201).json({ item: serialize(d, payload) })
    },
    patch: async (req, res) => {
      if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
      const d = await Model.findOne({ _id: req.params.id, tenantId: req.tenant._id })
      if (!d) return res.status(404).json({ error: 'No encontrado' })
      const b = req.body || {}
      if (b.nombre != null) d.nombre = String(b.nombre).trim().slice(0, 200)
      if (b.activo != null) d.activo = Boolean(b.activo)
      if (b.color != null) d.color = String(b.color).slice(0, 20)
      if (b.descripcion != null) d.descripcion = String(b.descripcion).slice(0, 500)
      if (b.tipo != null) d.tipo = String(b.tipo).slice(0, 40)
      if (b.codigo != null) d.codigo = String(b.codigo).slice(0, 40)
      if (b.orden != null) d.orden = Number(b.orden) || 0
      if (b.cadenaId !== undefined) d.cadenaId = b.cadenaId && ObjectId.isValid(b.cadenaId) ? b.cadenaId : null
      if (b.pilarId !== undefined) d.pilarId = b.pilarId && ObjectId.isValid(b.pilarId) ? b.pilarId : null
      if (b.medicionId !== undefined) {
        d.medicionId = b.medicionId && ObjectId.isValid(b.medicionId) ? b.medicionId : null
      }
      if (b.parentId !== undefined) d.parentId = b.parentId && ObjectId.isValid(b.parentId) ? b.parentId : null
      await d.save()
      res.json({ item: serialize(d) })
    },
  }
}

export function mountSupervisionAdminExtras(router) {
  const sub = crudNamed(SupSubcadena)
  router.get('/subcadenas', sub.list)
  router.post('/subcadenas', sub.create)
  router.patch('/subcadenas/:id', sub.patch)

  const cat = crudNamed(SupCategoria)
  router.get('/categorias', cat.list)
  router.post('/categorias', cat.create)
  router.patch('/categorias/:id', cat.patch)

  /** Roles de cobertura (catálogo del módulo; no es el rol general del usuario). */
  router.get('/cobertura-roles', async (req, res) => {
    await ensureDefaultCoberturaRoles(req.tenant._id)
    const rows = await SupCoberturaRol.find({ tenantId: req.tenant._id }).sort({ orden: 1, nombre: 1 }).lean()
    res.json({ items: rows.map(serializeCoberturaRol) })
  })
  router.post('/cobertura-roles', async (req, res) => {
    const nombre = String(req.body?.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
    let codigo = String(req.body?.codigo || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40)
    if (!codigo) {
      codigo = nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40) || `rol_${Date.now()}`
    }
    try {
      const d = await SupCoberturaRol.create({
        tenantId: req.tenant._id,
        codigo,
        nombre: nombre.slice(0, 120),
        descripcion: String(req.body?.descripcion || '').slice(0, 500),
        orden: Number(req.body?.orden) || 0,
        activo: true,
      })
      res.status(201).json({ item: serializeCoberturaRol(d) })
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ error: 'Ya existe un rol con ese código' })
      throw err
    }
  })
  router.patch('/cobertura-roles/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const d = await SupCoberturaRol.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!d) return res.status(404).json({ error: 'No encontrado' })
    const b = req.body || {}
    if (b.nombre != null) d.nombre = String(b.nombre).trim().slice(0, 120)
    if (b.descripcion != null) d.descripcion = String(b.descripcion).slice(0, 500)
    if (b.orden != null) d.orden = Number(b.orden) || 0
    if (b.activo != null) d.activo = Boolean(b.activo)
    if (b.codigo != null) {
      const codigo = String(b.codigo)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40)
      if (codigo) d.codigo = codigo
    }
    try {
      await d.save()
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ error: 'Ya existe un rol con ese código' })
      throw err
    }
    res.json({ item: serializeCoberturaRol(d) })
  })

  const pil = crudNamed(SupPilar)
  router.get('/pilares', pil.list)
  router.post('/pilares', pil.create)
  router.patch('/pilares/:id', pil.patch)

  const med = crudNamed(SupMedicion)
  router.get('/mediciones', med.list)
  router.post('/mediciones', med.create)
  router.patch('/mediciones/:id', med.patch)

  const items = crudNamed(SupItemMedicion)
  router.get('/items', items.list)
  router.post('/items', items.create)
  router.patch('/items/:id', items.patch)

  const est = crudNamed(SupTemplateEstado)
  router.get('/templates-estados', est.list)
  router.post('/templates-estados', est.create)
  router.patch('/templates-estados/:id', est.patch)

  const ubi = crudNamed(SupUbicacion)
  router.get('/ubicaciones', ubi.list)
  router.post('/ubicaciones', ubi.create)
  router.patch('/ubicaciones/:id', ubi.patch)
  router.get('/ubicaciones/paises', async (req, res) => {
    const rows = await SupUbicacion.find({ tenantId: req.tenant._id, tipo: 'pais', activo: true })
      .sort({ nombre: 1 })
      .lean()
    res.json({ items: rows.map((d) => serializeNamed(d, { tipo: 'pais' })) })
  })
  router.get('/ubicaciones/regiones', async (req, res) => {
    const q = { tenantId: req.tenant._id, tipo: 'region', activo: true }
    if (req.query.parentId && ObjectId.isValid(req.query.parentId)) q.parentId = req.query.parentId
    const rows = await SupUbicacion.find(q).sort({ nombre: 1 }).lean()
    res.json({
      items: rows.map((d) => serializeNamed(d, { tipo: 'region', parentId: d.parentId ? String(d.parentId) : null })),
    })
  })
  router.get('/ubicaciones/comunas', async (req, res) => {
    const q = { tenantId: req.tenant._id, tipo: 'comuna', activo: true }
    if (req.query.parentId && ObjectId.isValid(req.query.parentId)) q.parentId = req.query.parentId
    const rows = await SupUbicacion.find(q).sort({ nombre: 1 }).lean()
    res.json({
      items: rows.map((d) => serializeNamed(d, { tipo: 'comuna', parentId: d.parentId ? String(d.parentId) : null })),
    })
  })

  router.get('/pilares-mediciones', async (req, res) => {
    const q = { tenantId: req.tenant._id }
    if (req.query.pilarId && ObjectId.isValid(req.query.pilarId)) q.pilarId = req.query.pilarId
    const rows = await SupPilarMedicion.find(q).lean()
    res.json({
      items: rows.map((d) => ({
        id: String(d._id),
        pilarId: String(d.pilarId),
        medicionId: String(d.medicionId),
      })),
    })
  })

  router.post('/pilares-mediciones', async (req, res) => {
    const { pilarId, medicionId } = req.body || {}
    if (!ObjectId.isValid(pilarId) || !ObjectId.isValid(medicionId)) {
      return res.status(400).json({ error: 'pilarId y medicionId requeridos' })
    }
    try {
      const d = await SupPilarMedicion.create({ tenantId: req.tenant._id, pilarId, medicionId })
      res.status(201).json({
        item: { id: String(d._id), pilarId: String(d.pilarId), medicionId: String(d.medicionId) },
      })
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ error: 'Ya vinculado' })
      throw err
    }
  })

  router.delete('/pilares-mediciones/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    await SupPilarMedicion.deleteOne({ _id: req.params.id, tenantId: req.tenant._id })
    res.json({ ok: true })
  })

  /* —— permisos_config —— */
  router.get('/roles-permisos', async (req, res) => {
    const rows = await SupRolePermisos.find({ tenantId: req.tenant._id }).lean()
    const byRole = Object.fromEntries(rows.map((r) => [r.role, r.permisos]))
    const items = Object.values(SUP_ROLE).map((role) => ({
      role,
      permisos: mergePermisos(role, byRole[role]),
    }))
    res.json({ items, screens: SUP_SCREENS, actions: SUP_ACTIONS })
  })

  router.put('/roles-permisos/:role', async (req, res) => {
    const role = String(req.params.role)
    if (!Object.values(SUP_ROLE).includes(role)) return res.status(400).json({ error: 'Rol inválido' })
    const permisos = mergePermisos(role, req.body?.permisos || {})
    const d = await SupRolePermisos.findOneAndUpdate(
      { tenantId: req.tenant._id, role },
      { $set: { permisos } },
      { upsert: true, new: true },
    )
    res.json({ item: { role, permisos: mergePermisos(role, d.permisos) } })
  })

  router.post('/roles-permisos/reset/:role', async (req, res) => {
    const role = String(req.params.role)
    if (!Object.values(SUP_ROLE).includes(role)) return res.status(400).json({ error: 'Rol inválido' })
    const permisos = defaultPermisosForRole(role)
    await SupRolePermisos.findOneAndUpdate(
      { tenantId: req.tenant._id, role },
      { $set: { permisos } },
      { upsert: true },
    )
    res.json({ item: { role, permisos } })
  })

  /* —— Import XLSX —— */
  router.get('/import/plantilla/:kind', (req, res) => {
    const kind = String(req.params.kind)
    const allowed = ['cadenas', 'subcadenas', 'clientes', 'salas', 'asignaciones']
    if (!allowed.includes(kind)) return res.status(400).json({ error: 'kind inválido' })
    const buf = buildImportTemplate(kind)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="plantilla-${kind}.xlsx"`)
    res.send(buf)
  })

  router.post('/import/:kind', upload.single('file'), async (req, res) => {
    const kind = String(req.params.kind)
    const allowed = ['cadenas', 'subcadenas', 'clientes', 'salas', 'asignaciones']
    if (!allowed.includes(kind)) return res.status(400).json({ error: 'kind inválido' })
    if (!req.file?.buffer) return res.status(400).json({ error: 'Archivo requerido' })
    const parsed = parseSupervisionImport(req.file.buffer, kind)
    const tenantId = req.tenant._id
    let created = 0
    let skipped = 0
    const errors = []

    if (kind === 'cadenas') {
      for (const row of parsed.items) {
        const exists = await SupCadena.findOne({ tenantId, nombre: row.nombre }).lean()
        if (exists) {
          skipped += 1
          continue
        }
        await SupCadena.create({ tenantId, nombre: row.nombre.slice(0, 120) })
        created += 1
      }
    } else if (kind === 'subcadenas') {
      for (const row of parsed.items) {
        const cadena = await SupCadena.findOne({ tenantId, nombre: row.cadena }).lean()
        if (!cadena) {
          errors.push(`Cadena no encontrada: ${row.cadena}`)
          skipped += 1
          continue
        }
        const exists = await SupSubcadena.findOne({ tenantId, cadenaId: cadena._id, nombre: row.nombre }).lean()
        if (exists) {
          skipped += 1
          continue
        }
        await SupSubcadena.create({ tenantId, cadenaId: cadena._id, nombre: row.nombre.slice(0, 120) })
        created += 1
      }
    } else if (kind === 'clientes') {
      for (const row of parsed.items) {
        const exists = await SupCliente.findOne({ tenantId, nombre: row.nombre }).lean()
        if (exists) {
          skipped += 1
          continue
        }
        await SupCliente.create({
          tenantId,
          nombre: row.nombre.slice(0, 160),
          codigo: (row.codigo || '').slice(0, 80),
        })
        created += 1
      }
    } else if (kind === 'salas') {
      for (const row of parsed.items) {
        let cadenaId = null
        if (row.cadena) {
          const c = await SupCadena.findOne({ tenantId, nombre: row.cadena }).lean()
          cadenaId = c?._id || null
        }
        const exists = await SupSala.findOne({ tenantId, nombre: row.nombre }).lean()
        if (exists) {
          skipped += 1
          continue
        }
        await SupSala.create({
          tenantId,
          nombre: row.nombre.slice(0, 160),
          codigo: (row.codigo || '').slice(0, 80),
          cadenaId,
          comuna: (row.comuna || '').slice(0, 80),
          region: (row.region || '').slice(0, 80),
        })
        created += 1
      }
    } else if (kind === 'asignaciones') {
      for (const row of parsed.items) {
        const cliente = await SupCliente.findOne({ tenantId, nombre: row.cliente }).lean()
        const sala = await SupSala.findOne({ tenantId, nombre: row.sala }).lean()
        if (!cliente || !sala) {
          errors.push(`Cliente/sala no hallados: ${row.cliente} / ${row.sala}`)
          skipped += 1
          continue
        }
        let link = await SupClienteSala.findOne({ tenantId, clienteId: cliente._id, salaId: sala._id })
        if (!link) {
          link = await SupClienteSala.create({
            tenantId,
            clienteId: cliente._id,
            salaId: sala._id,
            colaboradores: [],
          })
          created += 1
        }
        if (row.usuario) {
          const user =
            (await User.findOne({
              tenantId,
              $or: [{ usuario: row.usuario }, { email: row.usuario }, { empCodigo: row.usuario }],
            }).lean()) || null
          if (!user) {
            errors.push(`Usuario no hallado: ${row.usuario}`)
            continue
          }
          const roleRaw = String(row.role || 'operario').trim().slice(0, 40) || 'operario'
          let roleDoc = await SupCoberturaRol.findOne({
            tenantId,
            codigo: roleRaw,
            activo: true,
          }).lean()
          if (!roleDoc) {
            await ensureDefaultCoberturaRoles(tenantId)
            roleDoc = await SupCoberturaRol.findOne({
              tenantId,
              codigo: roleRaw,
              activo: true,
            }).lean()
          }
          const role = roleDoc?.codigo || 'operario'
          link.colaboradores = (link.colaboradores || []).filter((c) => String(c.userId) !== String(user._id))
          link.colaboradores.push({ userId: user._id, role })
          await link.save()
        }
      }
    }

    res.json({
      ok: true,
      kind,
      parsed: parsed.count,
      created,
      skipped,
      errors: errors.slice(0, 20),
      itemsPreview: {
        cadenas: kind === 'cadenas' ? undefined : undefined,
      },
    })
  })

  /* seed geo mínimo Chile demo */
  router.post('/ubicaciones/seed-demo', async (req, res) => {
    const tenantId = req.tenant._id
    let pais = await SupUbicacion.findOne({ tenantId, tipo: 'pais', nombre: 'Chile' })
    if (!pais) pais = await SupUbicacion.create({ tenantId, tipo: 'pais', nombre: 'Chile' })
    let region = await SupUbicacion.findOne({ tenantId, tipo: 'region', nombre: 'Metropolitana', parentId: pais._id })
    if (!region) {
      region = await SupUbicacion.create({
        tenantId,
        tipo: 'region',
        nombre: 'Metropolitana',
        parentId: pais._id,
      })
    }
    for (const name of ['Santiago', 'Providencia', 'Las Condes']) {
      const exists = await SupUbicacion.findOne({ tenantId, tipo: 'comuna', nombre: name, parentId: region._id })
      if (!exists) {
        await SupUbicacion.create({ tenantId, tipo: 'comuna', nombre: name, parentId: region._id })
      }
    }
    res.json({ ok: true })
  })

  /* Visitas programadas (recurrencia automática) */
  router.get('/visita-recurrencias', async (req, res) => {
    const rows = await SupVisitaRecurrencia.find({ tenantId: req.tenant._id, activo: true })
      .sort({ nextRunAt: 1, titulo: 1 })
      .lean()
    res.json({ items: rows.map(serializeVisitaRecurrencia) })
  })

  router.post('/visita-recurrencias', async (req, res) => {
    const check = validateRecurrenciaPayload(req.body || {})
    if (!check.ok) return res.status(400).json({ error: check.error })
    const body = req.body || {}
    if (!ObjectId.isValid(body.salaId)) return res.status(400).json({ error: 'Sala inválida' })
    const sala = await SupSala.findOne({ _id: body.salaId, tenantId: req.tenant._id, activo: true })
    if (!sala) return res.status(400).json({ error: 'Sala inválida' })
    if (body.templateId && ObjectId.isValid(body.templateId)) {
      const tpl = await SupTemplate.findOne({ _id: body.templateId, tenantId: req.tenant._id, activo: true })
      if (!tpl) return res.status(400).json({ error: 'Plantilla inválida' })
    }
    const asignadoId = body.asignadoId && ObjectId.isValid(body.asignadoId) ? body.asignadoId : null
    const fromList = Array.isArray(body.asignadosIds)
      ? body.asignadosIds.filter((id) => ObjectId.isValid(id))
      : []
    const asignadosIds = [...new Set([...(asignadoId ? [String(asignadoId)] : []), ...fromList.map(String)])]
    const payload = {
      tenantId: req.tenant._id,
      titulo: String(body.titulo).trim().slice(0, 40),
      descripcion: String(body.descripcion || '').slice(0, 4000),
      salaId: body.salaId,
      clienteId: body.clienteId && ObjectId.isValid(body.clienteId) ? body.clienteId : null,
      templateId: body.templateId && ObjectId.isValid(body.templateId) ? body.templateId : null,
      asignadoId: asignadosIds[0] || null,
      asignadosIds,
      creadorId: req.user._id,
      prioridad: ['alta', 'media', 'baja'].includes(body.prioridad) ? body.prioridad : 'media',
      requiereFoto: Boolean(body.requiereFoto),
      plazoHoras: Math.min(24 * 30, Math.max(1, Number(body.plazoHoras) || 24)),
      frecuencia: body.frecuencia,
      diaSemana: Math.min(6, Math.max(0, Number(body.diaSemana ?? 1))),
      diasSemana:
        body.frecuencia === 'semanal_custom'
          ? normalizeDiasSemana(body.diasSemana, body.diaSemana ?? 1)
          : [],
      diaMes: Math.min(28, Math.max(1, Number(body.diaMes ?? 1))),
      semanasMes:
        body.frecuencia === 'mensual_custom' ? normalizeSemanasMes(body.semanasMes) : [],
      horaLocal: String(body.horaLocal || '09:00').slice(0, 5),
      enabled: body.enabled !== false,
      activo: true,
    }
    payload.nextRunAt = computeNextRunAt(payload, new Date())
    const doc = await SupVisitaRecurrencia.create(payload)
    res.status(201).json({ item: serializeVisitaRecurrencia(doc) })
  })

  router.patch('/visita-recurrencias/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const doc = await SupVisitaRecurrencia.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 40)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).slice(0, 4000)
    if (body.prioridad && ['alta', 'media', 'baja'].includes(body.prioridad)) doc.prioridad = body.prioridad
    if (body.requiereFoto != null) doc.requiereFoto = Boolean(body.requiereFoto)
    if (body.plazoHoras != null) doc.plazoHoras = Math.min(24 * 30, Math.max(1, Number(body.plazoHoras) || 24))
    if (
      body.frecuencia &&
      ['diaria', 'semanal', 'semanal_custom', 'mensual', 'mensual_custom'].includes(body.frecuencia)
    ) {
      doc.frecuencia = body.frecuencia
    }
    if (body.diaSemana != null) doc.diaSemana = Math.min(6, Math.max(0, Number(body.diaSemana)))
    if (body.diasSemana !== undefined) {
      doc.diasSemana = normalizeDiasSemana(body.diasSemana, body.diaSemana ?? doc.diaSemana ?? 1)
    }
    if (body.diaMes != null) doc.diaMes = Math.min(28, Math.max(1, Number(body.diaMes)))
    if (body.semanasMes !== undefined) {
      doc.semanasMes = normalizeSemanasMes(body.semanasMes)
    }
    if (doc.frecuencia === 'semanal_custom' && body.diasSemana === undefined && !doc.diasSemana?.length) {
      doc.diasSemana = normalizeDiasSemana([doc.diaSemana], 1)
    }
    if (doc.frecuencia === 'mensual_custom' && body.semanasMes === undefined && !doc.semanasMes?.length) {
      doc.semanasMes = [1]
    }
    if (doc.frecuencia !== 'semanal_custom') doc.diasSemana = doc.diasSemana || []
    if (doc.frecuencia !== 'mensual_custom') doc.semanasMes = doc.semanasMes || []
    if (body.horaLocal != null) doc.horaLocal = String(body.horaLocal).slice(0, 5)
    if (body.enabled != null) doc.enabled = Boolean(body.enabled)
    if (body.salaId && ObjectId.isValid(body.salaId)) doc.salaId = body.salaId
    if (body.clienteId !== undefined) {
      doc.clienteId = body.clienteId && ObjectId.isValid(body.clienteId) ? body.clienteId : null
    }
    if (body.templateId !== undefined) {
      doc.templateId = body.templateId && ObjectId.isValid(body.templateId) ? body.templateId : null
    }
    if (body.asignadosIds !== undefined && Array.isArray(body.asignadosIds)) {
      const ids = [...new Set(body.asignadosIds.filter((id) => ObjectId.isValid(id)).map(String))]
      doc.asignadosIds = ids
      doc.asignadoId = ids[0] || null
    } else if (body.asignadoId !== undefined) {
      doc.asignadoId = body.asignadoId && ObjectId.isValid(body.asignadoId) ? body.asignadoId : null
      const cur = resolveAsignadosIds(doc)
      if (doc.asignadoId) {
        const rest = cur.filter((id) => id !== String(doc.asignadoId))
        doc.asignadosIds = [String(doc.asignadoId), ...rest]
      } else {
        doc.asignadosIds = cur
      }
    }
    doc.nextRunAt = computeNextRunAt(doc, new Date())
    await doc.save()
    res.json({ item: serializeVisitaRecurrencia(doc) })
  })

  router.post('/visita-recurrencias/:id/asignados', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const userId = req.body?.userId
    if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId inválido' })
    const doc = await SupVisitaRecurrencia.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const ids = resolveAsignadosIds(doc).filter((id) => id !== String(userId))
    ids.push(String(userId))
    doc.asignadosIds = ids
    doc.asignadoId = ids[0] || null
    await doc.save()
    res.json({ item: serializeVisitaRecurrencia(doc) })
  })

  router.delete('/visita-recurrencias/:id/asignados/:userId', async (req, res) => {
    if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'IDs inválidos' })
    }
    const doc = await SupVisitaRecurrencia.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const ids = resolveAsignadosIds(doc).filter((id) => id !== String(req.params.userId))
    if (!ids.length) {
      doc.activo = false
      doc.enabled = false
      doc.asignadosIds = []
      doc.asignadoId = null
      await doc.save()
      return res.json({ ok: true, deletedAssignment: true, item: null })
    }
    doc.asignadosIds = ids
    doc.asignadoId = ids[0]
    await doc.save()
    res.json({ ok: true, deletedAssignment: false, item: serializeVisitaRecurrencia(doc) })
  })

  router.delete('/visita-recurrencias/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const doc = await SupVisitaRecurrencia.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { $set: { activo: false, enabled: false } },
      { new: true },
    )
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  })

  /* Consultas / OK (leer pub, encuesta, doc, política…) */
  router.get('/asignaciones-consulta', async (req, res) => {
    const rows = await SupAsignacionConsulta.find({ tenantId: req.tenant._id, activo: true })
      .sort({ dueAt: 1, createdAt: -1 })
      .lean()
    res.json({ items: rows.map(serializeAsignacionConsulta) })
  })

  router.post('/asignaciones-consulta', async (req, res) => {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    if (!titulo) return res.status(400).json({ error: 'Título requerido' })
    const fromList = Array.isArray(body.asignadosIds)
      ? body.asignadosIds.filter((id) => ObjectId.isValid(id)).map(String)
      : []
    const one = body.asignadoId && ObjectId.isValid(body.asignadoId) ? String(body.asignadoId) : null
    const asignadosIds = [...new Set([...(one ? [one] : []), ...fromList])]
    if (!asignadosIds.length) return res.status(400).json({ error: 'Asignado requerido' })
    const refType = ['post', 'survey', 'document', 'policy', 'manual'].includes(body.refType)
      ? body.refType
      : 'manual'
    const doc = await SupAsignacionConsulta.create({
      tenantId: req.tenant._id,
      titulo: titulo.slice(0, 40),
      instrucciones: String(body.instrucciones || '').slice(0, 2000),
      refType,
      refId: body.refId && ObjectId.isValid(body.refId) ? body.refId : null,
      refLabel: String(body.refLabel || '').slice(0, 200),
      asignadoId: asignadosIds[0],
      asignadosIds,
      asignadoPorId: req.user._id,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      status: 'pendiente',
      activo: true,
    })
    res.status(201).json({ item: serializeAsignacionConsulta(doc) })
  })

  router.patch('/asignaciones-consulta/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const doc = await SupAsignacionConsulta.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 40)
    if (body.instrucciones != null) doc.instrucciones = String(body.instrucciones).slice(0, 2000)
    if (body.refLabel != null) doc.refLabel = String(body.refLabel).slice(0, 200)
    if (body.refType && ['post', 'survey', 'document', 'policy', 'manual'].includes(body.refType)) {
      doc.refType = body.refType
    }
    if (body.dueAt !== undefined) doc.dueAt = body.dueAt ? new Date(body.dueAt) : null
    if (body.status && ['pendiente', 'visto', 'ok', 'vencido'].includes(body.status)) {
      doc.status = body.status
      if (body.status === 'visto' && !doc.openedAt) doc.openedAt = new Date()
      if (body.status === 'ok') doc.okAt = new Date()
    }
    if (body.asignadosIds !== undefined && Array.isArray(body.asignadosIds)) {
      const ids = [...new Set(body.asignadosIds.filter((id) => ObjectId.isValid(id)).map(String))]
      if (!ids.length) return res.status(400).json({ error: 'Debe quedar al menos un asignado' })
      doc.asignadosIds = ids
      doc.asignadoId = ids[0]
    } else if (body.asignadoId && ObjectId.isValid(body.asignadoId)) {
      doc.asignadoId = body.asignadoId
      const cur = resolveAsignadosIds(doc).filter((id) => id !== String(body.asignadoId))
      doc.asignadosIds = [String(body.asignadoId), ...cur]
    }
    await doc.save()
    res.json({ item: serializeAsignacionConsulta(doc) })
  })

  router.post('/asignaciones-consulta/:id/asignados', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const userId = req.body?.userId
    if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'userId inválido' })
    const doc = await SupAsignacionConsulta.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const ids = resolveAsignadosIds(doc).filter((id) => id !== String(userId))
    ids.push(String(userId))
    doc.asignadosIds = ids
    doc.asignadoId = ids[0]
    await doc.save()
    res.json({ item: serializeAsignacionConsulta(doc) })
  })

  router.delete('/asignaciones-consulta/:id/asignados/:userId', async (req, res) => {
    if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'IDs inválidos' })
    }
    const doc = await SupAsignacionConsulta.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const ids = resolveAsignadosIds(doc).filter((id) => id !== String(req.params.userId))
    if (!ids.length) {
      doc.activo = false
      doc.asignadosIds = []
      await doc.save()
      return res.json({ ok: true, deletedAssignment: true, item: null })
    }
    doc.asignadosIds = ids
    doc.asignadoId = ids[0]
    await doc.save()
    res.json({ ok: true, deletedAssignment: false, item: serializeAsignacionConsulta(doc) })
  })

  router.delete('/asignaciones-consulta/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
    const doc = await SupAsignacionConsulta.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { $set: { activo: false } },
      { new: true },
    )
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  })
}
