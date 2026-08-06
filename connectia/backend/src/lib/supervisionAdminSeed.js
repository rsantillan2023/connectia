/**
 * Catálogo + seed rico para pantallas admin /supervision y /equipos (Olas 31·32).
 * Nombres visibles sin prefijo. Cleanup idempotente: lista exacta + legado «SEED ·» + códigos SEED-*.
 */
import bcrypt from 'bcryptjs'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import {
  SupCadena,
  SupSubcadena,
  SupCliente,
  SupSala,
  SupClienteSala,
  SupCategoria,
  SupCoberturaRol,
  SupPilar,
  SupMedicion,
  SupTemplateEstado,
  SupTemplate,
  SupRolePermisos,
  SupTarea,
  SupUbicacion,
  SupVisitaRecurrencia,
  SupAsignacionConsulta,
} from '../models/Supervision.js'
import { computeNextRunAt } from './supervisionRecurrencia.js'
import { TeamScope } from '../models/TeamScope.js'
import { ensureOla31MenuItems } from './ensureOla31Menu.js'
import { ensureOla32MenuItems } from './ensureOla32Menu.js'
import { defaultPermisosForRole } from './supervisionPermisos.js'
import { snapshotMediciones, TASK_STATUS, SUP_ROLE } from './supervisionTasks.js'
import { ensureDefaultCoberturaRoles } from './supervisionCoberturaRoles.js'
import { refreshTeamScope, TEAM_MODULES } from './teamScope.js'
import { DEFAULT_SEED_PASSWORD } from './genericTenantDefaults.js'

/** Vacío a propósito: los nombres demo ya no llevan prefijo visible. */
export const SEED_PREFIX = ''
/** Prefijo de datos demo viejos (para force cleanup). */
export const SEED_LEGACY_PREFIX = 'SEED ·'

function escapeRe(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nombreDemoFilter(nombres) {
  const list = [...new Set((nombres || []).filter(Boolean))]
  return {
    $or: [
      ...(list.length ? [{ nombre: { $in: list } }] : []),
      { nombre: new RegExp(`^${escapeRe(SEED_LEGACY_PREFIX)}`) },
    ],
  }
}

function tituloDemoFilter(titulos) {
  const list = [...new Set((titulos || []).filter(Boolean))]
  return {
    $or: [
      ...(list.length ? [{ titulo: { $in: list } }] : []),
      { titulo: new RegExp(`^${escapeRe(SEED_LEGACY_PREFIX)}`) },
    ],
  }
}

function collectCatalogNombres(catalog) {
  const out = []
  const push = (n) => {
    if (n) out.push(n)
  }
  for (const a of catalog.areas || []) push(a.nombre)
  for (const g of catalog.groups || []) push(g.nombre)
  for (const x of catalog.cadenas || []) push(x.nombre)
  for (const x of catalog.subcadenas || []) push(x.nombre)
  for (const x of catalog.clientes || []) push(x.nombre)
  for (const x of catalog.salas || []) push(x.nombre)
  for (const x of catalog.categorias || []) push(x.nombre)
  for (const x of catalog.pilares || []) push(x.nombre)
  for (const x of catalog.mediciones || []) push(x.nombre)
  for (const x of catalog.templateEstados || []) push(x.nombre)
  for (const x of catalog.templates || []) push(x.nombre)
  for (const x of catalog.teamScopes || []) push(x.nombre)
  push('Argentina')
  push('CABA')
  push('Palermo')
  return out
}

/** Definición pura (testeable) de la casuística. */
export function supervisionAdminSeedCatalog() {
  return {
    areas: [
      { key: 'seed-comercial', nombre: `${SEED_PREFIX}Área Comercial`, orden: 10 },
      { key: 'seed-operaciones', nombre: `${SEED_PREFIX}Área Operaciones`, orden: 20 },
      { key: 'seed-trade', nombre: `${SEED_PREFIX}Área Trade`, orden: 30 },
    ],
    groups: [
      { key: 'seed-field-norte', nombre: `${SEED_PREFIX}Grupo Field Norte`, orden: 10 },
      { key: 'seed-field-sur', nombre: `${SEED_PREFIX}Grupo Field Sur`, orden: 20 },
      { key: 'seed-backoffice', nombre: `${SEED_PREFIX}Grupo Backoffice`, orden: 30 },
    ],
    users: [
      {
        usuario: 'sup.campo',
        nombre: 'Sofía',
        apellido: 'Supervisor',
        idExterno: 'SEED-SUP-01',
        supervisionRole: SUP_ROLE.SUPERVISOR,
        areaKey: 'seed-comercial',
        groupKeys: ['seed-field-norte'],
        caps: ['admin.supervision', 'admin.equipos', 'supervision.comercial', 'supervision.equipo'],
      },
      {
        usuario: 'jefe.regional',
        nombre: 'Ricardo',
        apellido: 'Regional',
        idExterno: 'SEED-SUP-02',
        supervisionRole: SUP_ROLE.GESTOR,
        areaKey: 'seed-operaciones',
        groupKeys: ['seed-field-sur'],
        caps: ['admin.equipos', 'supervision.equipo'],
      },
      {
        usuario: 'op.norte',
        nombre: 'Nadia',
        apellido: 'Norte',
        idExterno: 'SEED-OP-01',
        supervisionRole: SUP_ROLE.OPERARIO,
        areaKey: 'seed-comercial',
        groupKeys: ['seed-field-norte'],
      },
      {
        usuario: 'op.sur',
        nombre: 'Santiago',
        apellido: 'Sur',
        idExterno: 'SEED-OP-02',
        supervisionRole: SUP_ROLE.OPERARIO,
        areaKey: 'seed-operaciones',
        groupKeys: ['seed-field-sur'],
      },
      {
        usuario: 'op.centro',
        nombre: 'Camila',
        apellido: 'Centro',
        idExterno: 'SEED-OP-03',
        supervisionRole: SUP_ROLE.OPERARIO,
        areaKey: 'seed-trade',
        groupKeys: ['seed-field-norte', 'seed-backoffice'],
      },
      {
        usuario: 'plat.comercial',
        nombre: 'Paula',
        apellido: 'Plataforma',
        idExterno: 'SEED-PL-01',
        supervisionRole: SUP_ROLE.PLATAFORMA_COMERCIAL,
        areaKey: 'seed-comercial',
        groupKeys: ['seed-backoffice'],
      },
      {
        usuario: 'admin.mod.campo',
        nombre: 'Andrés',
        apellido: 'Moderador',
        idExterno: 'SEED-AM-01',
        supervisionRole: SUP_ROLE.ADMIN_MOD,
        areaKey: 'seed-trade',
        groupKeys: ['seed-backoffice'],
        caps: ['admin.supervision'],
      },
    ],
    cadenas: [
      { nombre: `${SEED_PREFIX}Cadena Retail Norte` },
      { nombre: `${SEED_PREFIX}Cadena Hipermercado` },
      { nombre: `${SEED_PREFIX}Cadena Inactiva`, activo: false },
    ],
    subcadenas: [
      { cadena: `${SEED_PREFIX}Cadena Retail Norte`, nombre: `${SEED_PREFIX}Sub Express` },
      { cadena: `${SEED_PREFIX}Cadena Retail Norte`, nombre: `${SEED_PREFIX}Sub Premium` },
      { cadena: `${SEED_PREFIX}Cadena Hipermercado`, nombre: `${SEED_PREFIX}Sub Gran Formato` },
    ],
    clientes: [
      { nombre: `${SEED_PREFIX}Cliente Jumbo Demo`, codigo: 'SEED-CLI-01' },
      { nombre: `${SEED_PREFIX}Cliente Disco Demo`, codigo: 'SEED-CLI-02' },
      { nombre: `${SEED_PREFIX}Cliente Farmacity`, codigo: 'SEED-CLI-03' },
      { nombre: `${SEED_PREFIX}Cliente Inactivo`, codigo: 'SEED-CLI-X', activo: false },
    ],
    salas: [
      {
        nombre: `${SEED_PREFIX}Sala Palermo`,
        codigo: 'SEED-S-01',
        cadena: `${SEED_PREFIX}Cadena Retail Norte`,
        subcadena: `${SEED_PREFIX}Sub Express`,
        comuna: 'Palermo',
        region: 'CABA',
        pais: 'Argentina',
        lat: -34.5875,
        lng: -58.4234,
      },
      {
        nombre: `${SEED_PREFIX}Sala Belgrano`,
        codigo: 'SEED-S-02',
        cadena: `${SEED_PREFIX}Cadena Retail Norte`,
        subcadena: `${SEED_PREFIX}Sub Premium`,
        comuna: 'Belgrano',
        region: 'CABA',
        pais: 'Argentina',
        lat: -34.5627,
        lng: -58.4583,
      },
      {
        nombre: `${SEED_PREFIX}Sala Quilmes`,
        codigo: 'SEED-S-03',
        cadena: `${SEED_PREFIX}Cadena Hipermercado`,
        subcadena: `${SEED_PREFIX}Sub Gran Formato`,
        comuna: 'Quilmes',
        region: 'Buenos Aires',
        pais: 'Argentina',
        lat: -34.7207,
        lng: -58.2546,
      },
      {
        nombre: `${SEED_PREFIX}Sala Córdoba Centro`,
        codigo: 'SEED-S-04',
        cadena: `${SEED_PREFIX}Cadena Hipermercado`,
        comuna: 'Córdoba',
        region: 'Córdoba',
        pais: 'Argentina',
        lat: -31.4201,
        lng: -64.1888,
      },
      {
        nombre: `${SEED_PREFIX}Sala Sin Cadena`,
        codigo: 'SEED-S-05',
        comuna: 'Rosario',
        region: 'Santa Fe',
        pais: 'Argentina',
      },
      {
        nombre: `${SEED_PREFIX}Sala Inactiva`,
        codigo: 'SEED-S-X',
        cadena: `${SEED_PREFIX}Cadena Inactiva`,
        comuna: 'La Plata',
        region: 'Buenos Aires',
        pais: 'Argentina',
        activo: false,
      },
    ],
    categorias: [
      { nombre: `${SEED_PREFIX}Visita rutinaria`, color: '#0d9488' },
      { nombre: `${SEED_PREFIX}Auditoría planograma`, color: '#7c3aed' },
      { nombre: `${SEED_PREFIX}Lanzamiento`, color: '#ea580c' },
    ],
    pilares: [
      { nombre: `${SEED_PREFIX}Pilar Disponibilidad`, descripcion: 'Stock y faltantes' },
      { nombre: `${SEED_PREFIX}Pilar Precio`, descripcion: 'Precio y promo' },
      { nombre: `${SEED_PREFIX}Pilar Imagen`, descripcion: 'Góndola y material POP' },
    ],
    mediciones: [
      { nombre: `${SEED_PREFIX}Check apertura`, tipo: 'check', pilar: `${SEED_PREFIX}Pilar Disponibilidad` },
      { nombre: `${SEED_PREFIX}Check stock crítico`, tipo: 'check', pilar: `${SEED_PREFIX}Pilar Disponibilidad` },
      { nombre: `${SEED_PREFIX}Foto góndola`, tipo: 'foto', pilar: `${SEED_PREFIX}Pilar Imagen` },
      { nombre: `${SEED_PREFIX}Precio shelf`, tipo: 'texto', pilar: `${SEED_PREFIX}Pilar Precio` },
      { nombre: `${SEED_PREFIX}Share of shelf %`, tipo: 'numero', pilar: `${SEED_PREFIX}Pilar Imagen` },
    ],
    templateEstados: [
      { nombre: `${SEED_PREFIX}Borrador`, codigo: 'SEED-DRAFT' },
      { nombre: `${SEED_PREFIX}Publicada`, codigo: 'SEED-PUB' },
      { nombre: `${SEED_PREFIX}Archivada`, codigo: 'SEED-ARCH' },
    ],
    templates: [
      {
        nombre: `${SEED_PREFIX}Checklist visita express`,
        descripcion: 'Visita corta de apertura + stock',
        categoria: `${SEED_PREFIX}Visita rutinaria`,
        estado: `${SEED_PREFIX}Publicada`,
        mediciones: [
          { nombre: 'Check apertura', tipo: 'check' },
          { nombre: 'Check stock crítico', tipo: 'check' },
          { nombre: 'Foto góndola', tipo: 'foto' },
        ],
      },
      {
        nombre: `${SEED_PREFIX}Auditoría planograma full`,
        descripcion: 'Revisión completa de exhibición',
        categoria: `${SEED_PREFIX}Auditoría planograma`,
        estado: `${SEED_PREFIX}Publicada`,
        mediciones: [
          { nombre: 'Share of shelf %', tipo: 'numero' },
          { nombre: 'Precio shelf', tipo: 'texto' },
          { nombre: 'Foto góndola', tipo: 'foto', obligatorio: true },
          { nombre: 'Observaciones', tipo: 'texto', obligatorio: false },
        ],
      },
      {
        nombre: `${SEED_PREFIX}Lanzamiento SKU`,
        descripcion: 'Alta de producto nuevo en sala',
        categoria: `${SEED_PREFIX}Lanzamiento`,
        estado: `${SEED_PREFIX}Borrador`,
        mediciones: [
          { nombre: 'SKU visible', tipo: 'check' },
          { nombre: 'Material POP', tipo: 'check' },
          { nombre: 'Foto lanzamiento', tipo: 'foto' },
        ],
      },
    ],
    /** Visitas programadas (tipo asignación: visita). */
    visitaRecurrencias: [
      {
        titulo: `${SEED_PREFIX}Visita semanal Palermo`,
        sala: `${SEED_PREFIX}Sala Palermo`,
        cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
        template: `${SEED_PREFIX}Checklist visita express`,
        asignado: 'op.norte',
        frecuencia: 'semanal',
        diaSemana: 1,
        horaLocal: '09:00',
        plazoHoras: 24,
        prioridad: 'alta',
      },
      {
        titulo: `${SEED_PREFIX}Auditoría mensual Belgrano`,
        sala: `${SEED_PREFIX}Sala Belgrano`,
        cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
        template: `${SEED_PREFIX}Auditoría planograma full`,
        asignado: 'op.centro',
        frecuencia: 'mensual',
        diaMes: 5,
        horaLocal: '10:30',
        plazoHoras: 48,
        prioridad: 'media',
      },
      {
        titulo: `${SEED_PREFIX}Ronda diaria Quilmes`,
        sala: `${SEED_PREFIX}Sala Quilmes`,
        cliente: `${SEED_PREFIX}Cliente Disco Demo`,
        template: `${SEED_PREFIX}Checklist visita express`,
        asignado: 'op.sur',
        frecuencia: 'diaria',
        horaLocal: '08:00',
        plazoHoras: 12,
        prioridad: 'media',
      },
    ],
    /** Consultas / OK (tipo asignación: consulta). */
    consultas: [
      {
        titulo: `${SEED_PREFIX}Leer política de visitas`,
        instrucciones: 'Leé la política y marcá OK cuando termines.',
        refType: 'policy',
        refLabel: 'Política de visitas en sala',
        asignado: 'op.norte',
        daysDue: 3,
        status: 'pendiente',
      },
      {
        titulo: `${SEED_PREFIX}Responder encuesta de clima`,
        instrucciones: 'Completá la encuesta corta de clima laboral.',
        refType: 'survey',
        refLabel: 'Encuesta clima Q1',
        asignado: 'op.centro',
        daysDue: 7,
        status: 'pendiente',
      },
      {
        titulo: `${SEED_PREFIX}Revisar documento planograma`,
        instrucciones: 'Abrí el PDF y confirmá con OK.',
        refType: 'document',
        refLabel: 'Planograma góndola refrigerados',
        asignado: 'op.sur',
        daysDue: 5,
        status: 'visto',
      },
      {
        titulo: `${SEED_PREFIX}Ver publicación lanzamiento`,
        instrucciones: 'Mirá la pub del muro y dejá OK.',
        refType: 'post',
        refLabel: 'Pub · Lanzamiento SKU verano',
        asignado: 'op.norte',
        daysDue: 2,
        status: 'ok',
      },
    ],
    teamScopes: [
      {
        nombre: `${SEED_PREFIX}Equipo personas a mano`,
        supervisorUsuario: 'sup.campo',
        source: { userKeys: ['op.norte', 'op.centro'] },
        allowedModules: [...TEAM_MODULES],
      },
      {
        nombre: `${SEED_PREFIX}Equipo por área Comercial`,
        supervisorUsuario: 'sup.campo',
        source: { areaKeys: ['seed-comercial'] },
        allowedModules: ['muro', 'eventos', 'notif', 'encuestas', 'docs', 'chat'],
      },
      {
        nombre: `${SEED_PREFIX}Equipo por grupo Field Sur`,
        supervisorUsuario: 'jefe.regional',
        source: { groupKeys: ['seed-field-sur'] },
        allowedModules: ['muro', 'notif', 'chat'],
      },
      {
        nombre: `${SEED_PREFIX}Equipo por clientes Jumbo+Disco`,
        supervisorUsuario: 'sup.campo',
        source: {
          clientNames: [`${SEED_PREFIX}Cliente Jumbo Demo`, `${SEED_PREFIX}Cliente Disco Demo`],
        },
        allowedModules: ['muro', 'eventos', 'notif', 'docs'],
      },
      {
        nombre: `${SEED_PREFIX}Equipo área ∩ cliente (Trade∩Farmacity)`,
        supervisorUsuario: 'jefe.regional',
        source: {
          areaKeys: ['seed-trade'],
          clientNames: [`${SEED_PREFIX}Cliente Farmacity`],
          areaClientIntersect: true,
          userKeys: ['op.centro'],
        },
        allowedModules: ['muro', 'notif'],
      },
      {
        nombre: `${SEED_PREFIX}Equipo módulos mínimos`,
        supervisorUsuario: 'sup.campo',
        source: { userKeys: ['op.sur'] },
        allowedModules: ['muro', 'notif'],
      },
      {
        nombre: `${SEED_PREFIX}Equipo inactivo`,
        supervisorUsuario: 'jefe.regional',
        source: { userKeys: ['op.norte'] },
        allowedModules: ['muro'],
        activo: false,
      },
    ],
  }
}

async function upsertBy(Model, filter, data) {
  let doc = await Model.findOne(filter)
  if (!doc) {
    doc = await Model.create({ ...filter, ...data })
    return { doc, created: true }
  }
  Object.assign(doc, data)
  await doc.save()
  return { doc, created: false }
}

async function ensureCaps(tenant) {
  const set = new Set(tenant.capabilities || [])
  for (const c of [
    'supervision.comercial',
    'supervision.ecr',
    'supervision.equipo',
    ...TEAM_MODULES.map((m) => `supervision.equipo.${m}`),
    'admin.supervision',
    'admin.equipos',
  ]) {
    set.add(c)
  }
  tenant.capabilities = [...set]
  await tenant.save()
}

/**
 * @param {import('mongoose').Document} tenant
 * @param {{ force?: boolean }} [opts]
 */
export async function seedSupervisionAdminDemo(tenant, opts = {}) {
  const force = Boolean(opts.force)
  const catalog = supervisionAdminSeedCatalog()
  const stats = {
    areas: 0,
    groups: 0,
    users: 0,
    cadenas: 0,
    subcadenas: 0,
    clientes: 0,
    salas: 0,
    asignaciones: 0,
    categorias: 0,
    coberturaRoles: 0,
    pilares: 0,
    mediciones: 0,
    templateEstados: 0,
    templates: 0,
    rolePermisos: 0,
    tareas: 0,
    visitaRecurrencias: 0,
    consultas: 0,
    teamScopes: 0,
    ubicaciones: 0,
  }

  await ensureCaps(tenant)
  await ensureOla31MenuItems(tenant._id)
  await ensureOla32MenuItems(tenant._id)
  stats.coberturaRoles = await ensureDefaultCoberturaRoles(tenant._id)

  if (force) {
    const tid = tenant._id
    const demoNombres = collectCatalogNombres(catalog)
    const clienteNombres = (catalog.clientes || []).map((c) => c.nombre).filter(Boolean)
    const tareaTitulos = [
      'Visita Palermo pendiente',
      'Auditoría Belgrano en progreso',
      'Quilmes sin asignar',
      'Córdoba completada',
      'Rosario cancelada',
    ]
    const visitaTitulos = (catalog.visitaRecurrencias || []).map((v) => v.titulo).filter(Boolean)
    const consultaTitulos = (catalog.consultas || []).map((c) => c.titulo).filter(Boolean)
    const seedClientes = await SupCliente.find({
      tenantId: tid,
      $or: [
        ...(clienteNombres.length ? [{ nombre: { $in: clienteNombres } }] : []),
        { codigo: /^SEED-/ },
        { nombre: new RegExp(`^${escapeRe(SEED_LEGACY_PREFIX)}`) },
      ],
    })
      .select('_id')
      .lean()
    const seedClienteIds = seedClientes.map((c) => c._id)
    const byNombre = nombreDemoFilter(demoNombres)
    const byNombreOrCodigo = {
      $or: [...(byNombre.$or || []), { codigo: /^SEED-/ }],
    }
    await Promise.all([
      TeamScope.deleteMany({ tenantId: tid, ...byNombre }),
      SupTarea.deleteMany({ tenantId: tid, ...tituloDemoFilter(tareaTitulos) }),
      SupVisitaRecurrencia.deleteMany({ tenantId: tid, ...tituloDemoFilter(visitaTitulos) }),
      SupAsignacionConsulta.deleteMany({ tenantId: tid, ...tituloDemoFilter(consultaTitulos) }),
      seedClienteIds.length
        ? SupClienteSala.deleteMany({ tenantId: tid, clienteId: { $in: seedClienteIds } })
        : Promise.resolve(),
      SupTemplate.deleteMany({ tenantId: tid, ...byNombre }),
      SupTemplateEstado.deleteMany({ tenantId: tid, ...byNombreOrCodigo }),
      SupMedicion.deleteMany({ tenantId: tid, ...byNombre }),
      SupPilar.deleteMany({ tenantId: tid, ...byNombre }),
      SupCategoria.deleteMany({ tenantId: tid, ...byNombre }),
      SupSala.deleteMany({ tenantId: tid, ...byNombreOrCodigo }),
      SupSubcadena.deleteMany({ tenantId: tid, ...byNombre }),
      SupCliente.deleteMany({
        tenantId: tid,
        $or: [
          ...(clienteNombres.length ? [{ nombre: { $in: clienteNombres } }] : []),
          { codigo: /^SEED-/ },
          { nombre: new RegExp(`^${escapeRe(SEED_LEGACY_PREFIX)}`) },
        ],
      }),
      SupCadena.deleteMany({ tenantId: tid, ...byNombre }),
      SupUbicacion.deleteMany({ tenantId: tid, ...byNombre }),
      OrgArea.deleteMany({ tenantId: tid, key: /^seed-/ }),
      UserGroup.deleteMany({ tenantId: tid, key: /^seed-/ }),
      User.deleteMany({ tenantId: tid, idExterno: /^SEED-/ }),
    ])
  }

  const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 12)

  const areaByKey = {}
  for (const a of catalog.areas) {
    const { doc, created } = await upsertBy(
      OrgArea,
      { tenantId: tenant._id, key: a.key },
      {
        nombre: a.nombre,
        descripcion: 'Área demo seed supervisión/equipos',
        kind: 'organizativa',
        activo: true,
        orden: a.orden,
      },
    )
    areaByKey[a.key] = doc
    if (created) stats.areas += 1
  }

  const groupByKey = {}
  for (const g of catalog.groups) {
    const { doc, created } = await upsertBy(
      UserGroup,
      { tenantId: tenant._id, key: g.key },
      {
        nombre: g.nombre,
        descripcion: 'Grupo demo seed supervisión/equipos',
        activo: true,
        orden: g.orden,
      },
    )
    groupByKey[g.key] = doc
    if (created) stats.groups += 1
  }

  const userByUsuario = {}
  for (const u of catalog.users) {
    const areaId = u.areaKey ? areaByKey[u.areaKey]?._id : null
    const groupIds = (u.groupKeys || []).map((k) => groupByKey[k]?._id).filter(Boolean)
    let doc = await User.findOne({ tenantId: tenant._id, usuario: u.usuario })
    if (!doc) {
      doc = await User.create({
        tenantId: tenant._id,
        usuario: u.usuario,
        idExterno: u.idExterno,
        passwordHash,
        nombre: u.nombre,
        apellido: u.apellido,
        email: `${u.usuario}@seed.connectia.local`,
        roles: ['member'],
        capabilities: u.caps || [],
        supervisionRole: u.supervisionRole || '',
        areaId,
        groupIds,
        origen: 'MANUAL',
        termsAcceptedVersion: '1.0',
        termsAcceptedAt: new Date(),
        activo: true,
      })
      stats.users += 1
    } else {
      doc.passwordHash = passwordHash
      doc.nombre = u.nombre
      doc.apellido = u.apellido
      doc.idExterno = u.idExterno
      doc.supervisionRole = u.supervisionRole || ''
      doc.areaId = areaId
      doc.groupIds = groupIds
      doc.activo = true
      if (u.caps?.length) {
        const caps = new Set([...(doc.capabilities || []), ...u.caps])
        doc.capabilities = [...caps]
      }
      await doc.save()
    }
    userByUsuario[u.usuario] = doc
  }

  // Admin del tenant también con caps de pantalla
  const admin = await User.findOne({ tenantId: tenant._id, roles: 'admin', activo: true })
  if (admin) {
    const caps = new Set([...(admin.capabilities || []), 'admin.supervision', 'admin.equipos'])
    admin.capabilities = [...caps]
    if (!admin.supervisionRole) admin.supervisionRole = SUP_ROLE.ADMIN_MOD
    await admin.save()
  }

  const cadenaByName = {}
  for (const c of catalog.cadenas) {
    const { doc, created } = await upsertBy(
      SupCadena,
      { tenantId: tenant._id, nombre: c.nombre },
      { activo: c.activo !== false },
    )
    cadenaByName[c.nombre] = doc
    if (created) stats.cadenas += 1
  }

  const subByName = {}
  for (const s of catalog.subcadenas) {
    const cadena = cadenaByName[s.cadena]
    if (!cadena) continue
    const { doc, created } = await upsertBy(
      SupSubcadena,
      { tenantId: tenant._id, cadenaId: cadena._id, nombre: s.nombre },
      { activo: true },
    )
    subByName[s.nombre] = doc
    if (created) stats.subcadenas += 1
  }

  const clienteByName = {}
  for (const c of catalog.clientes) {
    const { doc, created } = await upsertBy(
      SupCliente,
      { tenantId: tenant._id, nombre: c.nombre },
      { codigo: c.codigo || '', activo: c.activo !== false },
    )
    clienteByName[c.nombre] = doc
    if (created) stats.clientes += 1
  }

  // Ubicaciones demo (país → región → comuna)
  const { doc: pais, created: paisCreated } = await upsertBy(
    SupUbicacion,
    { tenantId: tenant._id, tipo: 'pais', nombre: `${SEED_PREFIX}Argentina` },
    { parentId: null, activo: true },
  )
  if (paisCreated) stats.ubicaciones += 1
  const { doc: regionCaba, created: regCreated } = await upsertBy(
    SupUbicacion,
    { tenantId: tenant._id, tipo: 'region', nombre: `${SEED_PREFIX}CABA` },
    { parentId: pais._id, activo: true },
  )
  if (regCreated) stats.ubicaciones += 1
  const { doc: comunaPalermo, created: comCreated } = await upsertBy(
    SupUbicacion,
    { tenantId: tenant._id, tipo: 'comuna', nombre: `${SEED_PREFIX}Palermo` },
    { parentId: regionCaba._id, activo: true },
  )
  if (comCreated) stats.ubicaciones += 1

  const salaByName = {}
  for (const s of catalog.salas) {
    const cadenaId = s.cadena ? cadenaByName[s.cadena]?._id : null
    const subcadenaId = s.subcadena ? subByName[s.subcadena]?._id : null
    const { doc, created } = await upsertBy(
      SupSala,
      { tenantId: tenant._id, nombre: s.nombre },
      {
        codigo: s.codigo || '',
        cadenaId: cadenaId || null,
        subcadenaId: subcadenaId || null,
        comuna: s.comuna || '',
        region: s.region || '',
        pais: s.pais || '',
        comunaId: s.nombre.includes('Palermo') ? comunaPalermo._id : null,
        regionId: s.region === 'CABA' ? regionCaba._id : null,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        activo: s.activo !== false,
      },
    )
    salaByName[s.nombre] = doc
    if (created) stats.salas += 1
  }

  // Asignaciones se crean después de plantillas (llevan descripción + template).

  const catByName = {}
  for (const c of catalog.categorias) {
    const { doc, created } = await upsertBy(
      SupCategoria,
      { tenantId: tenant._id, nombre: c.nombre },
      { color: c.color || '#0d9488', activo: true },
    )
    catByName[c.nombre] = doc
    if (created) stats.categorias += 1
  }

  const pilarByName = {}
  for (const p of catalog.pilares) {
    const { doc, created } = await upsertBy(
      SupPilar,
      { tenantId: tenant._id, nombre: p.nombre },
      { descripcion: p.descripcion || '', activo: true },
    )
    pilarByName[p.nombre] = doc
    if (created) stats.pilares += 1
  }

  for (const m of catalog.mediciones) {
    const pilarId = m.pilar ? pilarByName[m.pilar]?._id : null
    const { created } = await upsertBy(
      SupMedicion,
      { tenantId: tenant._id, nombre: m.nombre },
      { tipo: m.tipo || 'check', pilarId: pilarId || null, activo: true },
    )
    if (created) stats.mediciones += 1
  }

  const estadoByName = {}
  for (const e of catalog.templateEstados) {
    const { doc, created } = await upsertBy(
      SupTemplateEstado,
      { tenantId: tenant._id, nombre: e.nombre },
      { codigo: e.codigo || '', activo: true },
    )
    estadoByName[e.nombre] = doc
    if (created) stats.templateEstados += 1
  }

  const tplByName = {}
  for (const t of catalog.templates) {
    const { doc, created } = await upsertBy(
      SupTemplate,
      { tenantId: tenant._id, nombre: t.nombre },
      {
        descripcion: t.descripcion || '',
        categoriaId: catByName[t.categoria]?._id || null,
        estadoId: estadoByName[t.estado]?._id || null,
        mediciones: snapshotMediciones(t.mediciones || []),
        activo: true,
      },
    )
    tplByName[t.nombre] = doc
    if (created) stats.templates += 1
  }

  // Coberturas cliente↔sala: qué cubrir + checklist sugerida + equipo
  const asignaciones = [
    {
      titulo: 'Flagship Palermo',
      cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
      sala: `${SEED_PREFIX}Sala Palermo`,
      descripcion:
        'Cobertura flagship Palermo: apertura de góndola, control de faltantes críticos y foto de cabecera. ' +
        'Priorizar SKUs de campaña y reportar roturas de planograma el mismo día.',
      template: `${SEED_PREFIX}Checklist visita express`,
      colaboradores: [
        { usuario: 'op.norte', role: SUP_ROLE.OPERARIO },
        { usuario: 'sup.campo', role: SUP_ROLE.SUPERVISOR },
        { usuario: 'plat.comercial', role: SUP_ROLE.PLATAFORMA_COMERCIAL },
      ],
    },
    {
      titulo: 'Auditoría Belgrano',
      cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
      sala: `${SEED_PREFIX}Sala Belgrano`,
      descripcion:
        'Auditoría de exhibición en Belgrano: revisar planograma completo, precios vigentes y material POP. ' +
        'Completar checklist de auditoría y adjuntar evidencia de pasillos principales.',
      template: `${SEED_PREFIX}Auditoría planograma full`,
      colaboradores: [
        { usuario: 'op.centro', role: SUP_ROLE.OPERARIO },
        { usuario: 'sup.campo', role: SUP_ROLE.SUPERVISOR },
      ],
    },
    {
      titulo: 'Disco Quilmes',
      cliente: `${SEED_PREFIX}Cliente Disco Demo`,
      sala: `${SEED_PREFIX}Sala Quilmes`,
      descripcion:
        'Cobertura Disco Quilmes: foco en disponibilidad de surtido básico y reposición de fin de semana. ' +
        'Avisar al gestor si hay quiebres de más de 48 hs.',
      template: `${SEED_PREFIX}Checklist visita express`,
      colaboradores: [
        { usuario: 'op.sur', role: SUP_ROLE.OPERARIO },
        { usuario: 'jefe.regional', role: SUP_ROLE.GESTOR },
      ],
    },
    {
      titulo: 'Farmacity Córdoba',
      cliente: `${SEED_PREFIX}Cliente Farmacity`,
      sala: `${SEED_PREFIX}Sala Córdoba Centro`,
      descripcion:
        'Punto Farmacity Córdoba: acompañar lanzamientos de SKU, chequear exhibición en mostrador ' +
        'y validar material de lanzamiento con el checklist correspondiente.',
      template: `${SEED_PREFIX}Lanzamiento SKU`,
      colaboradores: [
        { usuario: 'op.centro', role: SUP_ROLE.OPERARIO },
        { usuario: 'admin.mod.campo', role: SUP_ROLE.ADMIN_MOD },
      ],
    },
    {
      titulo: 'Punto satélite',
      cliente: `${SEED_PREFIX}Cliente Disco Demo`,
      sala: `${SEED_PREFIX}Sala Sin Cadena`,
      descripcion:
        'Punto satélite sin cadena: cobertura mínima de presencia y reporte libre. ' +
        'Sin checklist fijo; documentar hallazgos en notas de visita.',
      template: null,
      colaboradores: [{ usuario: 'op.sur', role: SUP_ROLE.OPERARIO }],
    },
  ]

  for (const a of asignaciones) {
    const cliente = clienteByName[a.cliente]
    const sala = salaByName[a.sala]
    if (!cliente || !sala) continue
    const colaboradores = a.colaboradores
      .map((c) => {
        const u = userByUsuario[c.usuario]
        return u ? { userId: u._id, role: c.role } : null
      })
      .filter(Boolean)
    const tpl = a.template ? tplByName[a.template] : null
    const { created } = await upsertBy(
      SupClienteSala,
      {
        tenantId: tenant._id,
        clienteId: cliente._id,
        salaId: sala._id,
        titulo: String(a.titulo || '').trim().slice(0, 40),
      },
      {
        colaboradores,
        descripcion: a.descripcion || '',
        templateId: tpl?._id || null,
        activo: true,
      },
    )
    if (created) stats.asignaciones += 1
  }

  for (const role of Object.values(SUP_ROLE)) {
    const { created } = await upsertBy(
      SupRolePermisos,
      { tenantId: tenant._id, role },
      { permisos: defaultPermisosForRole(role) },
    )
    if (created) stats.rolePermisos += 1
  }

  // Tareas con varios estados (útil para entender el dominio; el admin ve plantillas/roles)
  const creador = userByUsuario['sup.campo'] || admin
  if (creador) {
    const taskDefs = [
      {
        titulo: `${SEED_PREFIX}Visita Palermo pendiente`,
        sala: `${SEED_PREFIX}Sala Palermo`,
        cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
        template: `${SEED_PREFIX}Checklist visita express`,
        asignado: 'op.norte',
        status: TASK_STATUS.ASSIGNED,
        prioridad: 'alta',
        days: 2,
      },
      {
        titulo: `${SEED_PREFIX}Auditoría Belgrano en progreso`,
        sala: `${SEED_PREFIX}Sala Belgrano`,
        cliente: `${SEED_PREFIX}Cliente Jumbo Demo`,
        template: `${SEED_PREFIX}Auditoría planograma full`,
        asignado: 'op.centro',
        status: TASK_STATUS.IN_PROGRESS,
        prioridad: 'media',
        days: 5,
      },
      {
        titulo: `${SEED_PREFIX}Quilmes sin asignar`,
        sala: `${SEED_PREFIX}Sala Quilmes`,
        cliente: `${SEED_PREFIX}Cliente Disco Demo`,
        template: null,
        asignado: null,
        status: TASK_STATUS.PENDING,
        prioridad: 'baja',
        days: 10,
        tipo: 'manual',
      },
      {
        titulo: `${SEED_PREFIX}Córdoba completada`,
        sala: `${SEED_PREFIX}Sala Córdoba Centro`,
        cliente: `${SEED_PREFIX}Cliente Farmacity`,
        template: `${SEED_PREFIX}Lanzamiento SKU`,
        asignado: 'op.centro',
        status: TASK_STATUS.COMPLETED,
        prioridad: 'media',
        days: -1,
      },
      {
        titulo: `${SEED_PREFIX}Rosario cancelada`,
        sala: `${SEED_PREFIX}Sala Sin Cadena`,
        cliente: `${SEED_PREFIX}Cliente Disco Demo`,
        template: null,
        asignado: 'op.sur',
        status: TASK_STATUS.CANCELLED,
        prioridad: 'baja',
        days: -3,
        tipo: 'manual',
      },
    ]

    for (const td of taskDefs) {
      const sala = salaByName[td.sala]
      if (!sala) continue
      const tpl = td.template ? tplByName[td.template] : null
      const snap = tpl ? snapshotMediciones(tpl.mediciones) : []
      const asignado = td.asignado ? userByUsuario[td.asignado] : null
      const existing = await SupTarea.findOne({ tenantId: tenant._id, titulo: td.titulo })
      if (existing && !force) continue
      if (existing && force) await existing.deleteOne()
      await SupTarea.create({
        tenantId: tenant._id,
        titulo: td.titulo,
        descripcion: 'Tarea demo seed para casuística de estados',
        tipo: td.tipo || (tpl ? 'template' : 'manual'),
        fechaLimite: new Date(Date.now() + (td.days || 3) * 86400000),
        prioridad: td.prioridad || 'media',
        status: td.status,
        salaId: sala._id,
        clienteId: clienteByName[td.cliente]?._id || null,
        creadorId: creador._id,
        asignadoId: asignado?._id || null,
        templateId: tpl?._id || null,
        medicionesSnapshot: snap,
        respuestas: snap.map((m) => ({
          key: m.key,
          completada: td.status === TASK_STATUS.COMPLETED,
          valor: '',
        })),
        requiereFoto: Boolean(snap.some((m) => m.tipo === 'foto')),
        fechaAsignacion: asignado ? new Date() : null,
        fechaCompletado: td.status === TASK_STATUS.COMPLETED ? new Date() : null,
        fechaCancelacion: td.status === TASK_STATUS.CANCELLED ? new Date() : null,
        completadoPorId: td.status === TASK_STATUS.COMPLETED ? asignado?._id : null,
        canceladoPorId: td.status === TASK_STATUS.CANCELLED ? creador._id : null,
      })
      stats.tareas += 1
    }
  }

  // Visitas programadas (asignación tipo visita)
  const creadorVisita = userByUsuario['sup.campo'] || admin
  for (const vr of catalog.visitaRecurrencias || []) {
    const sala = salaByName[vr.sala]
    if (!sala || !creadorVisita) continue
    const tpl = vr.template ? tplByName[vr.template] : null
    const asignado = vr.asignado ? userByUsuario[vr.asignado] : null
    const rule = {
      frecuencia: vr.frecuencia || 'semanal',
      diaSemana: vr.diaSemana ?? 1,
      diaMes: vr.diaMes ?? 1,
      horaLocal: vr.horaLocal || '09:00',
    }
    const { created } = await upsertBy(
      SupVisitaRecurrencia,
      { tenantId: tenant._id, titulo: vr.titulo },
      {
        descripcion: vr.descripcion || 'Programa demo seed',
        salaId: sala._id,
        clienteId: clienteByName[vr.cliente]?._id || null,
        templateId: tpl?._id || null,
        asignadoId: asignado?._id || null,
        creadorId: creadorVisita._id,
        prioridad: vr.prioridad || 'media',
        requiereFoto: Boolean(vr.requiereFoto),
        plazoHoras: vr.plazoHoras || 24,
        frecuencia: rule.frecuencia,
        diaSemana: rule.diaSemana,
        diaMes: rule.diaMes,
        horaLocal: rule.horaLocal,
        enabled: true,
        nextRunAt: computeNextRunAt(rule),
        activo: true,
      },
    )
    if (created) stats.visitaRecurrencias += 1
  }

  // Consultas / OK (asignación tipo consulta)
  const asignador = userByUsuario['sup.campo'] || admin
  for (const cq of catalog.consultas || []) {
    const asignado = cq.asignado ? userByUsuario[cq.asignado] : null
    if (!asignado) continue
    const dueAt =
      cq.daysDue != null ? new Date(Date.now() + Number(cq.daysDue) * 86400000) : null
    const status = cq.status || 'pendiente'
    const { created } = await upsertBy(
      SupAsignacionConsulta,
      { tenantId: tenant._id, titulo: cq.titulo },
      {
        instrucciones: cq.instrucciones || '',
        refType: cq.refType || 'manual',
        refLabel: cq.refLabel || '',
        asignadoId: asignado._id,
        asignadoPorId: asignador?._id || null,
        dueAt,
        status,
        openedAt: status === 'visto' || status === 'ok' ? new Date() : null,
        okAt: status === 'ok' ? new Date() : null,
        activo: true,
      },
    )
    if (created) stats.consultas += 1
  }

  // TeamScopes (admin /equipos)
  for (const t of catalog.teamScopes) {
    const supervisor = userByUsuario[t.supervisorUsuario]
    if (!supervisor) continue
    const source = {
      areaIds: (t.source.areaKeys || []).map((k) => areaByKey[k]?._id).filter(Boolean),
      groupIds: (t.source.groupKeys || []).map((k) => groupByKey[k]?._id).filter(Boolean),
      userIds: (t.source.userKeys || []).map((k) => userByUsuario[k]?._id).filter(Boolean),
      clientIds: (t.source.clientNames || []).map((n) => clienteByName[n]?._id).filter(Boolean),
      areaClientIntersect: Boolean(t.source.areaClientIntersect),
    }
    let scope = await TeamScope.findOne({ tenantId: tenant._id, nombre: t.nombre })
    if (!scope) {
      scope = await TeamScope.create({
        tenantId: tenant._id,
        supervisorId: supervisor._id,
        nombre: t.nombre,
        source,
        allowedModules: t.allowedModules || ['muro', 'eventos', 'notif'],
        activo: t.activo !== false,
        createdById: admin?._id || supervisor._id,
      })
      stats.teamScopes += 1
    } else {
      scope.supervisorId = supervisor._id
      scope.source = source
      scope.allowedModules = t.allowedModules || scope.allowedModules
      scope.activo = t.activo !== false
      await scope.save()
    }
    if (scope.activo !== false) await refreshTeamScope(scope)
    else {
      scope.memberIds = []
      scope.memberCount = 0
      scope.resolvedAt = new Date()
      await scope.save()
    }
  }

  return {
    ok: true,
    tenant: tenant.empCodigo,
    password: DEFAULT_SEED_PASSWORD,
    stats,
    users: catalog.users.map((u) => ({
      usuario: u.usuario,
      supervisionRole: u.supervisionRole,
      password: DEFAULT_SEED_PASSWORD,
    })),
    tips: [
      'Admin → /supervision: Asignaciones (cobertura · visita · consulta), catálogo, plantillas, roles',
      'Admin → /equipos: 7 team scopes (personas, área, grupo, clientes, intersección, módulos mínimos, inactivo)',
      'Usuarios seed: sup.campo, jefe.regional, op.norte, op.sur, op.centro, plat.comercial, admin.mod.campo',
    ],
  }
}
