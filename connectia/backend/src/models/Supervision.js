/**
 * Dominio supervisión comercial — Ola 31 (Mongo Connectia).
 */
import mongoose from 'mongoose'

const tenantIndex = { tenantId: 1 }

const cadenaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 120 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
cadenaSchema.index({ tenantId: 1, nombre: 1 })

const clienteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 160 },
    codigo: { type: String, default: '', maxlength: 80 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
clienteSchema.index({ tenantId: 1, nombre: 1 })

const salaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 160 },
    codigo: { type: String, default: '', maxlength: 80 },
    cadenaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCadena', default: null },
    subcadenaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupSubcadena', default: null },
    comuna: { type: String, default: '', maxlength: 80 },
    region: { type: String, default: '', maxlength: 80 },
    pais: { type: String, default: '', maxlength: 80 },
    comunaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupUbicacion', default: null },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupUbicacion', default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
salaSchema.index({ tenantId: 1, nombre: 1 })

const colaboradorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Código del rol de cobertura (catálogo SupCoberturaRol), no el supervisionRole del User. */
    role: {
      type: String,
      default: 'operario',
      maxlength: 40,
    },
  },
  { _id: false },
)

const clienteSalaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCliente', required: true },
    salaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupSala', required: true },
    /** Título corto visible en la card (antes de la jerarquía). */
    titulo: { type: String, default: '', maxlength: 40 },
    /** Qué se cubre / qué hay que hacer en este punto. */
    descripcion: { type: String, default: '', maxlength: 4000 },
    /** Checklist / plantilla sugerida para esta cobertura. */
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTemplate', default: null },
    colaboradores: { type: [colaboradorSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
/** Varias coberturas válidas sobre el mismo cliente↔sala (distintos objetivos/títulos). */
clienteSalaSchema.index({ tenantId: 1, clienteId: 1, salaId: 1 })

const medicionTplSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    nombre: { type: String, required: true, maxlength: 200 },
    tipo: { type: String, default: 'check', maxlength: 40 },
    obligatorio: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
    /** Evidencia pedida al completar este ítem en campo. */
    requiereFoto: { type: Boolean, default: false },
    requiereTexto: { type: Boolean, default: false },
  },
  { _id: false },
)

const templateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 1000 },
    categoriaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCategoria', default: null },
    estadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTemplateEstado', default: null },
    mediciones: { type: [medicionTplSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
templateSchema.index({ tenantId: 1, nombre: 1 })

const subcadenaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    cadenaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCadena', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 120 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
subcadenaSchema.index({ tenantId: 1, cadenaId: 1, nombre: 1 })

const categoriaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 120 },
    color: { type: String, default: '#0d9488', maxlength: 20 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
categoriaSchema.index({ tenantId: 1, nombre: 1 })

/** Roles específicos de cobertura (cliente↔sala), independientes del supervisionRole del usuario. */
const coberturaRolSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true, maxlength: 40 },
    nombre: { type: String, required: true, maxlength: 120 },
    descripcion: { type: String, default: '', maxlength: 500 },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
coberturaRolSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })
coberturaRolSchema.index({ tenantId: 1, nombre: 1 })

const pilarSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 500 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
pilarSchema.index({ tenantId: 1, nombre: 1 })

const medicionCatalogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 200 },
    tipo: { type: String, default: 'check', maxlength: 40 },
    pilarId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupPilar', default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
medicionCatalogSchema.index({ tenantId: 1, nombre: 1 })

const itemMedicionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    medicionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupMedicion', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 200 },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

const pilarMedicionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    pilarId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupPilar', required: true },
    medicionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupMedicion', required: true },
  },
  { timestamps: true },
)
pilarMedicionSchema.index({ tenantId: 1, pilarId: 1, medicionId: 1 }, { unique: true })

const templateEstadoSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 80 },
    codigo: { type: String, default: '', maxlength: 40 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
templateEstadoSchema.index({ tenantId: 1, nombre: 1 })

const ubicacionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tipo: { type: String, enum: ['pais', 'region', 'comuna'], required: true },
    nombre: { type: String, required: true, maxlength: 120 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupUbicacion', default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
ubicacionSchema.index({ tenantId: 1, tipo: 1, nombre: 1 })

const adjuntoSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tareaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTarea', required: true, index: true },
    comentarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTareaComentario', default: null },
    medicionKey: { type: String, default: '', maxlength: 80 },
    url: { type: String, required: true, maxlength: 500 },
    nombre: { type: String, default: '', maxlength: 200 },
    mime: { type: String, default: '', maxlength: 120 },
    size: { type: Number, default: 0 },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

const rolePermisosSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    role: {
      type: String,
      enum: ['operario', 'supervisor', 'plataforma_comercial', 'gestor', 'admin_mod'],
      required: true,
    },
    permisos: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)
rolePermisosSchema.index({ tenantId: 1, role: 1 }, { unique: true })

const respuestaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    completada: { type: Boolean, default: false },
    valor: { type: String, default: '' },
    observacion: { type: String, default: '' },
  },
  { _id: false },
)

const tareaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 4000 },
    nota: { type: String, default: '', maxlength: 2000 },
    tipo: { type: String, default: 'manual', maxlength: 40 },
    fechaLimite: { type: Date, required: true },
    prioridad: { type: String, enum: ['alta', 'media', 'baja'], default: 'media' },
    status: {
      type: String,
      enum: ['pendiente', 'asignacion', 'en_progreso', 'completada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    salaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupSala', required: true, index: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCliente', default: null },
    creadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    asignadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTemplate', default: null },
    medicionesSnapshot: { type: [medicionTplSchema], default: [] },
    respuestas: { type: [respuestaSchema], default: [] },
    requiereFoto: { type: Boolean, default: false },
    fotoUrl: { type: String, default: '' },
    observacionCierre: { type: String, default: '', maxlength: 2000 },
    fechaAsignacion: { type: Date, default: null },
    fechaCompletado: { type: Date, default: null },
    fechaCancelacion: { type: Date, default: null },
    completadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    canceladoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Si la tarea nació de un programa recurrente. */
    recurrenciaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupVisitaRecurrencia',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)
tareaSchema.index({ tenantId: 1, status: 1, fechaLimite: 1 })

/** Programa recurrente que genera visitas (SupTarea) automáticamente. */
const visitaRecurrenciaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, maxlength: 40 },
    descripcion: { type: String, default: '', maxlength: 4000 },
    salaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupSala', required: true, index: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupCliente', default: null },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTemplate', default: null },
    asignadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Varios asignados al programa (asignadoId se mantiene como el primero, compat). */
    asignadosIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    creadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    prioridad: { type: String, enum: ['alta', 'media', 'baja'], default: 'media' },
    requiereFoto: { type: Boolean, default: false },
    /** Ventana en horas desde la generación hasta la fecha límite de la tarea. */
    plazoHoras: { type: Number, default: 24, min: 1, max: 24 * 30 },
    frecuencia: {
      type: String,
      enum: ['diaria', 'semanal', 'semanal_custom', 'mensual', 'mensual_custom'],
      required: true,
    },
    /** 0=domingo … 6=sábado (semanal / mensual_custom). */
    diaSemana: { type: Number, default: 1, min: 0, max: 6 },
    /** Varios días (semanal_custom): 0=dom … 6=sáb. */
    diasSemana: { type: [Number], default: [] },
    /** 1–28 (solo mensual; se evita 29–31 por meses cortos). */
    diaMes: { type: Number, default: 1, min: 1, max: 28 },
    /** Semanas del mes 1–4 (mensual_custom). */
    semanasMes: { type: [Number], default: [] },
    /** Hora local aproximada HH:mm (servidor usa UTC del cálculo). */
    horaLocal: { type: String, default: '09:00', maxlength: 5 },
    enabled: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null, index: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
visitaRecurrenciaSchema.index({ tenantId: 1, enabled: 1, nextRunAt: 1 })

/** Asignación de consulta/OK: leer pub, encuesta, doc, política, etc. */
const asignacionConsultaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, maxlength: 40 },
    instrucciones: { type: String, default: '', maxlength: 2000 },
    /** Qué se asigna (contenido del sistema o manual). */
    refType: {
      type: String,
      enum: ['post', 'survey', 'document', 'policy', 'manual'],
      default: 'manual',
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** Etiqueta legible del contenido (útil si no hay refId). */
    refLabel: { type: String, default: '', maxlength: 200 },
    asignadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Varios asignados a la consulta (asignadoId = primero, compat). */
    asignadosIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    asignadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pendiente', 'visto', 'ok', 'vencido'],
      default: 'pendiente',
      index: true,
    },
    openedAt: { type: Date, default: null },
    okAt: { type: Date, default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)
asignacionConsultaSchema.index({ tenantId: 1, asignadoId: 1, status: 1 })

const comentarioSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tareaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupTarea', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    texto: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
)

export const SupCadena = mongoose.model('SupCadena', cadenaSchema)
export const SupCliente = mongoose.model('SupCliente', clienteSchema)
export const SupSala = mongoose.model('SupSala', salaSchema)
export const SupClienteSala = mongoose.model('SupClienteSala', clienteSalaSchema)
export const SupTemplate = mongoose.model('SupTemplate', templateSchema)
export const SupTarea = mongoose.model('SupTarea', tareaSchema)
export const SupVisitaRecurrencia = mongoose.model('SupVisitaRecurrencia', visitaRecurrenciaSchema)
export const SupAsignacionConsulta = mongoose.model('SupAsignacionConsulta', asignacionConsultaSchema)
export const SupTareaComentario = mongoose.model('SupTareaComentario', comentarioSchema)
export const SupSubcadena = mongoose.model('SupSubcadena', subcadenaSchema)
export const SupCategoria = mongoose.model('SupCategoria', categoriaSchema)
export const SupCoberturaRol = mongoose.model('SupCoberturaRol', coberturaRolSchema)
export const SupPilar = mongoose.model('SupPilar', pilarSchema)
export const SupMedicion = mongoose.model('SupMedicion', medicionCatalogSchema)
export const SupItemMedicion = mongoose.model('SupItemMedicion', itemMedicionSchema)
export const SupPilarMedicion = mongoose.model('SupPilarMedicion', pilarMedicionSchema)
export const SupTemplateEstado = mongoose.model('SupTemplateEstado', templateEstadoSchema)
export const SupUbicacion = mongoose.model('SupUbicacion', ubicacionSchema)
export const SupAdjunto = mongoose.model('SupAdjunto', adjuntoSchema)
export const SupRolePermisos = mongoose.model('SupRolePermisos', rolePermisosSchema)

/**
 * Quita el índice unique viejo cliente↔sala (si existe) y alinea índices al schema.
 * Permite varias coberturas con distintos objetivos en el mismo punto.
 */
export async function ensureSupClienteSalaIndexes() {
  try {
    const col = SupClienteSala.collection
    const indexes = await col.indexes()
    for (const idx of indexes) {
      if (!idx.unique) continue
      const k = idx.key || {}
      if (k.tenantId === 1 && k.clienteId === 1 && k.salaId === 1 && !k.titulo) {
        await col.dropIndex(idx.name)
      }
    }
  } catch (err) {
    if (err?.codeName !== 'IndexNotFound' && err?.code !== 27) {
      console.warn('[supervision] drop unique cliente-sala:', err?.message || err)
    }
  }
  try {
    await SupClienteSala.syncIndexes()
  } catch (err) {
    console.warn('[supervision] syncIndexes cliente-sala:', err?.message || err)
  }
}

export function serializeCadena(d) {
  if (!d) return null
  return { id: String(d._id), nombre: d.nombre, activo: d.activo !== false }
}

export function serializeCliente(d) {
  if (!d) return null
  return { id: String(d._id), nombre: d.nombre, codigo: d.codigo || '', activo: d.activo !== false }
}

export function serializeSala(d) {
  if (!d) return null
  return {
    id: String(d._id),
    nombre: d.nombre,
    codigo: d.codigo || '',
    cadenaId: d.cadenaId ? String(d.cadenaId) : null,
    subcadenaId: d.subcadenaId ? String(d.subcadenaId) : null,
    comuna: d.comuna || '',
    region: d.region || '',
    pais: d.pais || '',
    comunaId: d.comunaId ? String(d.comunaId) : null,
    regionId: d.regionId ? String(d.regionId) : null,
    lat: d.lat,
    lng: d.lng,
    activo: d.activo !== false,
  }
}

export function serializeNamed(d, extra = {}) {
  if (!d) return null
  return {
    id: String(d._id),
    nombre: d.nombre,
    activo: d.activo !== false,
    ...extra,
  }
}

export function serializeCoberturaRol(d) {
  if (!d) return null
  return {
    id: String(d._id),
    codigo: d.codigo || '',
    nombre: d.nombre,
    descripcion: d.descripcion || '',
    orden: d.orden || 0,
    activo: d.activo !== false,
  }
}

export function serializeAdjunto(d) {
  if (!d) return null
  return {
    id: String(d._id),
    tareaId: String(d.tareaId),
    comentarioId: d.comentarioId ? String(d.comentarioId) : null,
    medicionKey: d.medicionKey || '',
    url: d.url,
    nombre: d.nombre || '',
    mime: d.mime || '',
    size: d.size || 0,
    uploadedById: d.uploadedById ? String(d.uploadedById) : null,
    createdAt: d.createdAt,
  }
}

export function serializeClienteSala(d) {
  if (!d) return null
  return {
    id: String(d._id),
    tipoAsignacion: 'cobertura',
    clienteId: String(d.clienteId),
    salaId: String(d.salaId),
    titulo: d.titulo || '',
    descripcion: d.descripcion || '',
    templateId: d.templateId ? String(d.templateId) : null,
    colaboradores: (d.colaboradores || []).map((c) => ({
      userId: String(c.userId),
      role: c.role,
    })),
    activo: d.activo !== false,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function serializeTemplate(d) {
  if (!d) return null
  return {
    id: String(d._id),
    nombre: d.nombre,
    descripcion: d.descripcion || '',
    categoriaId: d.categoriaId ? String(d.categoriaId) : null,
    estadoId: d.estadoId ? String(d.estadoId) : null,
    mediciones: d.mediciones || [],
    activo: d.activo !== false,
  }
}

export function serializeTarea(d, extras = {}) {
  if (!d) return null
  return {
    id: String(d._id),
    titulo: d.titulo,
    descripcion: d.descripcion || '',
    nota: d.nota || '',
    tipo: d.tipo || 'manual',
    fechaLimite: d.fechaLimite,
    prioridad: d.prioridad || 'media',
    status: d.status,
    salaId: d.salaId ? String(d.salaId) : null,
    clienteId: d.clienteId ? String(d.clienteId) : null,
    creadorId: d.creadorId ? String(d.creadorId) : null,
    asignadoId: d.asignadoId ? String(d.asignadoId) : null,
    templateId: d.templateId ? String(d.templateId) : null,
    medicionesSnapshot: d.medicionesSnapshot || [],
    respuestas: d.respuestas || [],
    requiereFoto: Boolean(d.requiereFoto),
    fotoUrl: d.fotoUrl || '',
    observacionCierre: d.observacionCierre || '',
    fechaAsignacion: d.fechaAsignacion,
    fechaCompletado: d.fechaCompletado,
    fechaCancelacion: d.fechaCancelacion,
    recurrenciaId: d.recurrenciaId ? String(d.recurrenciaId) : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ...extras,
  }
}

export function resolveAsignadosIds(d) {
  const ids = []
  const seen = new Set()
  const push = (id) => {
    if (!id) return
    const s = String(id)
    if (seen.has(s)) return
    seen.add(s)
    ids.push(s)
  }
  for (const id of d?.asignadosIds || []) push(id)
  push(d?.asignadoId)
  return ids
}

export function serializeVisitaRecurrencia(d) {
  if (!d) return null
  const asignadosIds = resolveAsignadosIds(d)
  return {
    id: String(d._id),
    tipoAsignacion: 'visita',
    titulo: d.titulo,
    descripcion: d.descripcion || '',
    salaId: d.salaId ? String(d.salaId) : null,
    clienteId: d.clienteId ? String(d.clienteId) : null,
    templateId: d.templateId ? String(d.templateId) : null,
    asignadoId: asignadosIds[0] || null,
    asignadosIds,
    creadorId: d.creadorId ? String(d.creadorId) : null,
    prioridad: d.prioridad || 'media',
    requiereFoto: Boolean(d.requiereFoto),
    plazoHoras: Number(d.plazoHoras) || 24,
    frecuencia: d.frecuencia,
    diaSemana: d.diaSemana,
    diasSemana: Array.isArray(d.diasSemana) ? d.diasSemana.map(Number) : [],
    diaMes: d.diaMes,
    semanasMes: Array.isArray(d.semanasMes) ? d.semanasMes.map(Number) : [],
    horaLocal: d.horaLocal || '09:00',
    enabled: d.enabled !== false,
    lastRunAt: d.lastRunAt || null,
    nextRunAt: d.nextRunAt || null,
    activo: d.activo !== false,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function serializeAsignacionConsulta(d) {
  if (!d) return null
  const asignadosIds = resolveAsignadosIds(d)
  return {
    id: String(d._id),
    tipoAsignacion: 'consulta',
    titulo: d.titulo,
    instrucciones: d.instrucciones || '',
    refType: d.refType || 'manual',
    refId: d.refId ? String(d.refId) : null,
    refLabel: d.refLabel || '',
    asignadoId: asignadosIds[0] || null,
    asignadosIds,
    asignadoPorId: d.asignadoPorId ? String(d.asignadoPorId) : null,
    dueAt: d.dueAt || null,
    status: d.status || 'pendiente',
    openedAt: d.openedAt || null,
    okAt: d.okAt || null,
    activo: d.activo !== false,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function serializeComentario(d) {
  if (!d) return null
  return {
    id: String(d._id),
    tareaId: String(d.tareaId),
    userId: String(d.userId),
    texto: d.texto,
    createdAt: d.createdAt,
  }
}
