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
  SupPilar,
  SupMedicion,
  SupItemMedicion,
  SupPilarMedicion,
  SupTemplateEstado,
  SupUbicacion,
  SupRolePermisos,
  serializeNamed,
} from '../models/Supervision.js'
import { parseSupervisionImport, buildImportTemplate } from '../lib/supervisionImport.js'
import { defaultPermisosForRole, mergePermisos, SUP_SCREENS, SUP_ACTIONS } from '../lib/supervisionPermisos.js'
import { SUP_ROLE } from '../lib/supervisionTasks.js'
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
          const role = Object.values(SUP_ROLE).includes(row.role) ? row.role : SUP_ROLE.OPERARIO
          link.colaboradores = (link.colaboradores || []).filter((c) => String(c.userId) !== String(user._id))
          link.colaboradores.push({ userId: user._id, role })
          await link.save()
          await User.updateOne({ _id: user._id }, { $set: { supervisionRole: role } })
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
}
