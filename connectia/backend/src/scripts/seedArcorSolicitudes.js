/**
 * Seed de solicitudes demo para tenant ARCOR.
 * Garantiza plantillas + tickets en varios estados.
 */
import { Request } from '../models/Request.js'
import { RequestType } from '../models/RequestType.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'

const TYPE_DEFS = [
  {
    key: 'rrhh',
    nombre: 'Consulta RRHH',
    descripcion: 'Vacaciones, legajo, recibos, beneficios',
    area: 'RRHH',
    orden: 10,
    campos: [
      {
        key: 'motivo',
        label: 'Motivo',
        tipo: 'select',
        required: true,
        orden: 10,
        opciones: ['Vacaciones', 'Legajo', 'Recibo de sueldo', 'Beneficios', 'Otro'],
      },
      { key: 'desde', label: 'Desde', tipo: 'date', required: false, orden: 20 },
      { key: 'hasta', label: 'Hasta', tipo: 'date', required: false, orden: 30 },
      {
        key: 'detalle',
        label: 'Detalle',
        tipo: 'textarea',
        required: true,
        orden: 40,
        placeholder: 'Contanos el caso',
      },
    ],
  },
  {
    key: 'mantenimiento',
    nombre: 'Mantenimiento de planta',
    descripcion: 'Averías, órdenes de trabajo, utilidades',
    area: 'Producción',
    orden: 20,
    campos: [
      {
        key: 'planta',
        label: 'Planta',
        tipo: 'select',
        required: true,
        orden: 10,
        opciones: ['Arroyito', 'Córdoba', 'Otra'],
      },
      {
        key: 'linea',
        label: 'Línea / sector',
        tipo: 'text',
        required: true,
        orden: 20,
        placeholder: 'Ej. Línea 3 chocolates',
      },
      {
        key: 'prioridad',
        label: 'Prioridad',
        tipo: 'select',
        required: true,
        orden: 30,
        opciones: ['Baja', 'Media', 'Alta', 'Parada de línea'],
      },
      { key: 'detalle', label: 'Descripción del desvío', tipo: 'textarea', required: true, orden: 40 },
    ],
  },
  {
    key: 'calidad',
    nombre: 'Calidad / no conformidad',
    descripcion: 'Desvíos de calidad, food safety, reclamos',
    area: 'Calidad',
    orden: 30,
    campos: [
      {
        key: 'tipo_desvio',
        label: 'Tipo de desvío',
        tipo: 'select',
        required: true,
        orden: 10,
        opciones: ['Producto no conforme', 'Higiene', 'Alérgenos', 'Reclamo cliente', 'Otro'],
      },
      { key: 'lote', label: 'Lote / OP', tipo: 'text', required: false, orden: 20 },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
    ],
  },
  {
    key: 'comercial',
    nombre: 'Soporte comercial',
    descripcion: 'Pedidos, precios, trade y cobertura',
    area: 'Comercial',
    orden: 40,
    campos: [
      {
        key: 'tema',
        label: 'Tema',
        tipo: 'select',
        required: true,
        orden: 10,
        opciones: ['Pedido bloqueado', 'Lista de precios', 'Material POP', 'Cobertura PDV', 'Otro'],
      },
      { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', required: false, orden: 20 },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
    ],
  },
  {
    key: 'sistemas',
    nombre: 'Soporte sistemas',
    descripcion: 'SAP, accesos, notebooks, VPN',
    area: 'IT',
    orden: 50,
    campos: [
      {
        key: 'sistema',
        label: 'Sistema / app',
        tipo: 'text',
        required: true,
        orden: 10,
        placeholder: 'Ej. SAP, correo, VPN',
      },
      {
        key: 'prioridad',
        label: 'Prioridad',
        tipo: 'select',
        required: true,
        orden: 20,
        opciones: ['Baja', 'Media', 'Alta'],
      },
      { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', required: false, orden: 30 },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 40 },
    ],
  },
]

function displayName(u) {
  return `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.usuario || 'Usuario'
}

function msg(user, texto, isAdmin = false) {
  return {
    texto,
    authorId: user._id,
    authorName: displayName(user),
    isAdmin,
    interno: false,
    createdAt: new Date(),
  }
}

/**
 * @param {{ tenant: import('mongoose').Document, users: Record<string, any>, force?: boolean }} opts
 */
export async function seedArcorSolicitudes({ tenant, users, force = true }) {
  const juan = users['juan.perez']
  const sofia = users['sofia.garcia']
  const diego = users['diego.fernandez']
  const carlos = users['carlos.ruiz']
  const laura = users['laura.martinez']
  const ana = users['ana.torres']
  const rrhh = users['rrhh.gestor'] || users['admin.arcor']
  const admin = users['admin.arcor'] || rrhh

  if (!juan || !rrhh) {
    throw new Error('Faltan usuarios demo (juan.perez / rrhh.gestor). Corré runSeedArcor.js primero.')
  }

  if (!tenant.solicitudesConfig?.estados?.length) {
    tenant.solicitudesConfig = defaultSolicitudesConfig()
    await tenant.save()
  }

  const typesByKey = {}
  for (const t of TYPE_DEFS) {
    const doc = await RequestType.findOneAndUpdate(
      { tenantId: tenant._id, key: t.key },
      {
        ...t,
        tenantId: tenant._id,
        activo: true,
        audience: { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true, new: true },
    )
    typesByKey[t.key] = doc
  }

  const prefix = 'SOL-ARCOR-'
  if (force) {
    const del = await Request.deleteMany({
      tenantId: tenant._id,
      codigo: { $regex: `^${prefix}` },
    })
    if (del.deletedCount) console.log(`Solicitudes demo previas borradas: ${del.deletedCount}`)
  } else {
    const existing = await Request.countDocuments({
      tenantId: tenant._id,
      codigo: { $regex: `^${prefix}` },
    })
    if (existing > 0) {
      return { created: 0, skipped: existing, types: Object.keys(typesByKey).length }
    }
  }

  const stockImg =
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&q=80'
  const stockPlant =
    'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=900&q=80'

  const seeds = [
    {
      n: '0001',
      tipoKey: 'rrhh',
      titulo: 'Consulta saldo de vacaciones 2026',
      cuerpo: 'Hola People, ¿cuántos días me quedan pendientes para tomar en agosto?',
      estado: 'abierta',
      requester: juan,
      camposValores: [
        { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Vacaciones' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Necesito planificar franco de agosto.' },
      ],
      messages: [msg(juan, 'Hola People, ¿cuántos días me quedan pendientes para tomar en agosto?')],
    },
    {
      n: '0002',
      tipoKey: 'mantenimiento',
      titulo: 'Parada intermitente en Línea 3 — chocolates',
      cuerpo: 'La cinta transportadora frena cada ~20 min. Impacta throughput del turno mañana.',
      estado: 'en_proceso',
      requester: juan,
      mediaUrl: stockPlant,
      assignee: rrhh,
      camposValores: [
        { key: 'planta', label: 'Planta', tipo: 'select', value: 'Arroyito' },
        { key: 'linea', label: 'Línea / sector', tipo: 'text', value: 'Línea 3 chocolates' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Parada de línea' },
        { key: 'detalle', label: 'Descripción del desvío', tipo: 'textarea', value: 'Freno intermitente en cinta.' },
      ],
      messages: [
        msg(juan, 'La cinta transportadora frena cada ~20 min.'),
        msg(rrhh, 'Tomamos el caso. Mantenimiento va en 30 minutos.', true),
      ],
    },
    {
      n: '0003',
      tipoKey: 'calidad',
      titulo: 'Desvío de peso en lote OP-45821',
      cuerpo: 'Muestreo detectó sobremesa fuera de tolerancia en 3 unidades del lote OP-45821.',
      estado: 'abierta',
      requester: diego || juan,
      mediaUrl: stockImg,
      camposValores: [
        { key: 'tipo_desvio', label: 'Tipo de desvío', tipo: 'select', value: 'Producto no conforme' },
        { key: 'lote', label: 'Lote / OP', tipo: 'text', value: 'OP-45821' },
        {
          key: 'detalle',
          label: 'Detalle',
          tipo: 'textarea',
          value: 'Sobremesa fuera de tolerancia en 3 unidades.',
        },
      ],
      messages: [
        msg(diego || juan, 'Muestreo detectó sobremesa fuera de tolerancia en 3 unidades.'),
      ],
    },
    {
      n: '0004',
      tipoKey: 'comercial',
      titulo: 'Pedido bloqueado — cliente Mayorista Norte',
      cuerpo: 'El pedido #88421 quedó bloqueado por crédito. Necesito desbloqueo urgente para entrega del jueves.',
      estado: 'a_completar',
      requester: sofia || juan,
      camposValores: [
        { key: 'tema', label: 'Tema', tipo: 'select', value: 'Pedido bloqueado' },
        { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', value: 'Mayorista Norte' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Pedido #88421 bloqueado por crédito.' },
      ],
      messages: [
        msg(sofia || juan, 'Pedido #88421 bloqueado por crédito. Entrega jueves.'),
        msg(rrhh, 'Necesitamos el N° de CUIT del cliente para avanzar.', true),
      ],
    },
    {
      n: '0005',
      tipoKey: 'sistemas',
      titulo: 'Sin acceso a VPN desde notebook de planta',
      cuerpo: 'No puedo conectar a la VPN corporativa desde el notebook asignado en Arroyito.',
      estado: 'cerrada',
      requester: carlos || juan,
      assignee: admin,
      closedAt: new Date(Date.now() - 2 * 86400000),
      rating: 5,
      camposValores: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'VPN' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
        { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: true },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Error de certificado al conectar.' },
      ],
      messages: [
        msg(carlos || juan, 'No puedo conectar a la VPN desde Arroyito.'),
        msg(admin, 'Renovamos el certificado. Probá de nuevo y avisanos.', true),
      ],
    },
    {
      n: '0006',
      tipoKey: 'rrhh',
      titulo: 'Actualización de datos en legajo',
      cuerpo: 'Cambié de domicilio y necesito actualizar el legajo digital.',
      estado: 'resuelta',
      requester: laura || juan,
      assignee: rrhh,
      camposValores: [
        { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Legajo' },
        {
          key: 'detalle',
          label: 'Detalle',
          tipo: 'textarea',
          value: 'Nuevo domicilio en Arroyito, Córdoba.',
        },
      ],
      messages: [
        msg(laura || juan, 'Cambié de domicilio y necesito actualizar el legajo.'),
        msg(rrhh, 'Actualizado en People Soft. Ya debería verse en Mi legajo.', true),
      ],
    },
    {
      n: '0007',
      tipoKey: 'comercial',
      titulo: 'Material POP faltante — campaña Rocklets',
      cuerpo: 'En zona Norte faltan 12 kits POP de la campaña verano.',
      estado: 'en_proceso',
      requester: sofia || juan,
      camposValores: [
        { key: 'tema', label: 'Tema', tipo: 'select', value: 'Material POP' },
        { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', value: 'Zona Norte — 8 PDV' },
        {
          key: 'detalle',
          label: 'Detalle',
          tipo: 'textarea',
          value: 'Faltan 12 kits POP Rocklets Verano.',
        },
      ],
      messages: [
        msg(sofia || juan, 'Faltan 12 kits POP en zona Norte.'),
        msg(rrhh, 'Pedimos reposición a Trade. ETA 48 hs.', true),
      ],
    },
    {
      n: '0008',
      tipoKey: 'sistemas',
      titulo: 'Alta de usuario SAP — nuevo ingreso',
      cuerpo: 'Necesito acceso SAP MM para el ingreso de Ana Torres.',
      estado: 'abierta',
      requester: ana || diego || juan,
      camposValores: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'SAP MM' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Media' },
        { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: false },
        {
          key: 'detalle',
          label: 'Detalle',
          tipo: 'textarea',
          value: 'Alta de roles MM para legajo A2007.',
        },
      ],
      messages: [msg(ana || diego || juan, 'Necesito acceso SAP MM para el nuevo ingreso.')],
    },
    {
      n: '0009',
      tipoKey: 'mantenimiento',
      titulo: 'Fuga de aire comprimido — sala de máquinas',
      cuerpo: 'Se escucha fuga constante cerca del compresor 2 en Arroyito.',
      estado: 'cancelada',
      requester: juan,
      camposValores: [
        { key: 'planta', label: 'Planta', tipo: 'select', value: 'Arroyito' },
        { key: 'linea', label: 'Línea / sector', tipo: 'text', value: 'Sala de máquinas' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Media' },
        {
          key: 'detalle',
          label: 'Descripción del desvío',
          tipo: 'textarea',
          value: 'Fuga audible cerca del compresor 2.',
        },
      ],
      messages: [
        msg(juan, 'Fuga de aire comprimido en sala de máquinas.'),
        msg(rrhh, 'Duplicado del OT-4412. Cerramos este ticket.', true),
      ],
    },
    {
      n: '0010',
      tipoKey: 'rrhh',
      titulo: 'Consulta de beneficios — gimnasio corporativo',
      cuerpo: '¿Cómo activo el beneficio de gimnasio y cuántos puntos necesito?',
      estado: 'en_proceso',
      requester: juan,
      camposValores: [
        { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Beneficios' },
        {
          key: 'detalle',
          label: 'Detalle',
          tipo: 'textarea',
          value: 'Quiero activar gimnasio corporativo con puntos.',
        },
      ],
      messages: [
        msg(juan, '¿Cómo activo el beneficio de gimnasio?'),
        msg(rrhh, 'Entrá a Beneficios → Canjes. Te dejamos el código en Accesos.', true),
      ],
    },
  ]

  let created = 0
  for (const r of seeds) {
    const tipo = typesByKey[r.tipoKey]
    const requester = r.requester
    if (!requester) continue
    await Request.create({
      tenantId: tenant._id,
      codigo: `${prefix}${r.n}`,
      tipoId: tipo?._id,
      tipoKey: tipo?.key || r.tipoKey,
      tipoNombre: tipo?.nombre || r.tipoKey,
      area: tipo?.area || 'General',
      titulo: r.titulo,
      cuerpo: r.cuerpo,
      mediaUrl: r.mediaUrl || '',
      estado: r.estado,
      requesterId: requester._id,
      requesterName: displayName(requester),
      createdById: requester._id,
      createdByName: displayName(requester),
      assigneeId: r.assignee?._id || null,
      assigneeName: r.assignee ? displayName(r.assignee) : '',
      camposDefinicion: tipo?.campos || [],
      camposValores: r.camposValores || [],
      messages: r.messages || [],
      origen: 'member',
      closedAt: r.closedAt || null,
      rating: r.rating ?? null,
    })
    created += 1
  }

  return { created, skipped: 0, types: Object.keys(typesByKey).length }
}
