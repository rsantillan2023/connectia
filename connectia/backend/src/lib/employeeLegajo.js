/**
 * Helpers de legajo RRHH local (sin API externa).
 */

const ESTADOS = new Set(['pre_ingreso', 'activo', 'licencia', 'baja'])

export function maskCbu(cbu) {
  const s = String(cbu || '').replace(/\s/g, '')
  if (s.length < 8) return s ? '••••' : ''
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`
}

function asDate(v) {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function str(v, max = 200) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

function serializeDomicilio(d) {
  return {
    id: String(d._id),
    tipo: d.tipo || 'particular',
    calle: d.calle || '',
    numero: d.numero || '',
    pisoDepto: d.pisoDepto || '',
    localidad: d.localidad || '',
    provincia: d.provincia || '',
    pais: d.pais || '',
    cp: d.cp || '',
    principal: Boolean(d.principal),
    activo: d.activo !== false,
  }
}

function serializeFamiliar(f) {
  return {
    id: String(f._id),
    parentesco: f.parentesco || '',
    nombre: f.nombre || '',
    apellido: f.apellido || '',
    dni: f.dni || '',
    fechaNacimiento: f.fechaNacimiento || null,
    activo: f.activo !== false,
  }
}

function serializeCuenta(c, { maskSensitive }) {
  return {
    id: String(c._id),
    banco: c.banco || '',
    tipoCuenta: c.tipoCuenta || '',
    cbu: maskSensitive ? maskCbu(c.cbu) : c.cbu || '',
    alias: c.alias || '',
    titular: c.titular || '',
    principal: Boolean(c.principal),
    activo: c.activo !== false,
  }
}

function serializeContrato(c) {
  return {
    id: String(c._id),
    tipo: c.tipo || '',
    numero: c.numero || '',
    fechaInicio: c.fechaInicio || null,
    fechaFin: c.fechaFin || null,
    modalidad: c.modalidad || '',
    observaciones: c.observaciones || '',
    activo: c.activo !== false,
  }
}

/**
 * @param {object} doc
 * @param {{ maskSensitive?: boolean, includeNotas?: boolean }} opts
 */
export function serializeLegajo(doc, opts = {}) {
  const maskSensitive = opts.maskSensitive !== false
  const includeNotas = opts.includeNotas === true
  const obra = doc.obraSocial || {}
  const med = doc.fichaMedica || {}
  const carrera = doc.carrera || {}

  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    userId: doc.userId ? String(doc.userId) : null,
    numeroLegajo: doc.numeroLegajo || '',
    estadoLaboral: doc.estadoLaboral || 'activo',
    activo: doc.activo !== false,
    nombre: doc.nombre || '',
    apellido: doc.apellido || '',
    email: doc.email || '',
    telefono: doc.telefono || '',
    dni: doc.dni || '',
    cuil: doc.cuil || '',
    genero: doc.genero || '',
    nacionalidad: doc.nacionalidad || '',
    estadoCivil: doc.estadoCivil || '',
    fechaNacimiento: doc.fechaNacimiento || null,
    fechaIngreso: doc.fechaIngreso || null,
    fechaEgreso: doc.fechaEgreso || null,
    cargo: doc.cargo || '',
    areaId: doc.areaId ? String(doc.areaId) : null,
    liderUserId: doc.liderUserId ? String(doc.liderUserId) : null,
    clasificacion: doc.clasificacion || '',
    subestado: doc.subestado || '',
    domicilios: (doc.domicilios || []).map(serializeDomicilio),
    familiares: (doc.familiares || []).map(serializeFamiliar),
    obraSocial: {
      nombre: obra.nombre || '',
      numeroAfiliado: obra.numeroAfiliado || '',
      plan: obra.plan || '',
      vigentesDesde: obra.vigentesDesde || null,
    },
    datosBancarios: (doc.datosBancarios || []).map((c) => serializeCuenta(c, { maskSensitive })),
    fichaMedica: {
      grupoSanguineo: med.grupoSanguineo || '',
      alergias: med.alergias || '',
      observaciones: maskSensitive ? '' : med.observaciones || '',
      contactoEmergenciaNombre: med.contactoEmergenciaNombre || '',
      contactoEmergenciaTel: med.contactoEmergenciaTel || '',
    },
    contratos: (doc.contratos || []).map(serializeContrato),
    carrera: {
      capacitaciones: (carrera.capacitaciones || []).map((c) => ({
        id: String(c._id),
        nombre: c.nombre || '',
        institucion: c.institucion || '',
        fecha: c.fecha || null,
        horas: c.horas ?? null,
        certificado: c.certificado || '',
      })),
      skills: (carrera.skills || []).map((s) => ({
        id: String(s._id),
        nombre: s.nombre || '',
        nivel: s.nivel || '',
      })),
    },
    ...(includeNotas ? { notasInternas: doc.notasInternas || '' } : {}),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  }
}

export function applyLegajoPatch(doc, body = {}) {
  const b = body && typeof body === 'object' ? body : {}

  if (b.numeroLegajo !== undefined) {
    const n = str(b.numeroLegajo, 64)
    if (!n) throw Object.assign(new Error('numeroLegajo obligatorio'), { status: 400 })
    doc.numeroLegajo = n
  }
  if (b.estadoLaboral !== undefined) {
    const e = str(b.estadoLaboral, 40)
    if (!ESTADOS.has(e)) throw Object.assign(new Error('estadoLaboral inválido'), { status: 400 })
    doc.estadoLaboral = e
  }
  if (typeof b.activo === 'boolean') doc.activo = b.activo

  for (const k of [
    'nombre',
    'apellido',
    'email',
    'telefono',
    'dni',
    'cuil',
    'genero',
    'nacionalidad',
    'estadoCivil',
    'cargo',
    'clasificacion',
    'subestado',
    'notasInternas',
  ]) {
    if (b[k] !== undefined) doc[k] = str(b[k], k === 'notasInternas' ? 2000 : 200)
  }

  for (const k of ['fechaNacimiento', 'fechaIngreso', 'fechaEgreso']) {
    if (b[k] !== undefined) doc[k] = asDate(b[k])
  }

  if (b.areaId !== undefined) doc.areaId = b.areaId || null
  if (b.liderUserId !== undefined) doc.liderUserId = b.liderUserId || null
  if (b.userId !== undefined) doc.userId = b.userId || null

  if (Array.isArray(b.domicilios)) {
    doc.domicilios = b.domicilios.map((d) => ({
      tipo: str(d.tipo || 'particular', 40),
      calle: str(d.calle, 200),
      numero: str(d.numero, 40),
      pisoDepto: str(d.pisoDepto, 40),
      localidad: str(d.localidad, 120),
      provincia: str(d.provincia, 120),
      pais: str(d.pais || 'AR', 80),
      cp: str(d.cp, 20),
      principal: Boolean(d.principal),
      activo: d.activo !== false,
    }))
  }

  if (Array.isArray(b.familiares)) {
    doc.familiares = b.familiares.map((f) => ({
      parentesco: str(f.parentesco, 60),
      nombre: str(f.nombre, 120),
      apellido: str(f.apellido, 120),
      dni: str(f.dni, 32),
      fechaNacimiento: asDate(f.fechaNacimiento),
      activo: f.activo !== false,
    }))
  }

  if (b.obraSocial && typeof b.obraSocial === 'object') {
    const o = b.obraSocial
    doc.obraSocial = {
      nombre: str(o.nombre, 160),
      numeroAfiliado: str(o.numeroAfiliado, 80),
      plan: str(o.plan, 80),
      vigentesDesde: asDate(o.vigentesDesde),
    }
  }

  if (Array.isArray(b.datosBancarios)) {
    doc.datosBancarios = b.datosBancarios.map((c) => ({
      banco: str(c.banco, 120),
      tipoCuenta: str(c.tipoCuenta || 'sueldo', 40),
      cbu: str(c.cbu, 32),
      alias: str(c.alias, 80),
      titular: str(c.titular, 160),
      principal: Boolean(c.principal),
      activo: c.activo !== false,
    }))
  }

  if (b.fichaMedica && typeof b.fichaMedica === 'object') {
    const m = b.fichaMedica
    doc.fichaMedica = {
      grupoSanguineo: str(m.grupoSanguineo, 16),
      alergias: str(m.alergias, 500),
      observaciones: str(m.observaciones, 1000),
      contactoEmergenciaNombre: str(m.contactoEmergenciaNombre, 160),
      contactoEmergenciaTel: str(m.contactoEmergenciaTel, 40),
    }
  }

  if (Array.isArray(b.contratos)) {
    doc.contratos = b.contratos.map((c) => ({
      tipo: str(c.tipo, 80),
      numero: str(c.numero, 80),
      fechaInicio: asDate(c.fechaInicio),
      fechaFin: asDate(c.fechaFin),
      modalidad: str(c.modalidad, 80),
      observaciones: str(c.observaciones, 500),
      activo: c.activo !== false,
    }))
  }

  if (b.carrera && typeof b.carrera === 'object') {
    const cap = Array.isArray(b.carrera.capacitaciones) ? b.carrera.capacitaciones : doc.carrera?.capacitaciones || []
    const skills = Array.isArray(b.carrera.skills) ? b.carrera.skills : doc.carrera?.skills || []
    doc.carrera = {
      capacitaciones: cap.map((c) => ({
        nombre: str(c.nombre, 200),
        institucion: str(c.institucion, 160),
        fecha: asDate(c.fecha),
        horas: typeof c.horas === 'number' ? c.horas : c.horas != null ? Number(c.horas) || null : null,
        certificado: str(c.certificado, 300),
      })),
      skills: skills.map((s) => ({
        nombre: str(s.nombre, 120),
        nivel: str(s.nivel, 40),
      })),
    }
  }

  return doc
}

export function seedFromUser(user) {
  if (!user) return {}
  return {
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    email: user.email || '',
    telefono: user.telefono || '',
    dni: user.dni || '',
    cuil: user.cuil || '',
    cargo: user.cargo || '',
    areaId: user.areaId || null,
    fechaNacimiento: user.fechaNacimiento || null,
    fechaIngreso: user.fechaIngreso || null,
    numeroLegajo: user.idExterno || '',
  }
}
