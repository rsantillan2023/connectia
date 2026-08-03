/**
 * Catálogo de tipos de recurso + atributos (Ola 21 — activos reservables genéricos).
 */

export const DEFAULT_ATTRIBUTE_DEFS = [
  { key: 'wifi', label: 'WiFi', valueType: 'flag', orden: 10 },
  { key: 'hdmi', label: 'HDMI', valueType: 'flag', orden: 20 },
  { key: 'videollamada', label: 'Videollamada', valueType: 'flag', orden: 30 },
  { key: 'proyector', label: 'Proyector integrado', valueType: 'flag', orden: 40 },
  { key: 'pizarra', label: 'Pizarra', valueType: 'flag', orden: 50 },
  { key: 'monitor', label: 'Monitor', valueType: 'flag', orden: 60 },
  { key: '4k', label: '4K', valueType: 'flag', orden: 70 },
  { key: 'portatil', label: 'Portátil', valueType: 'flag', orden: 80 },
  { key: 'accesible', label: 'Accesible', valueType: 'flag', orden: 90 },
  { key: 'marca', label: 'Marca', valueType: 'text', orden: 100 },
  { key: 'potencia', label: 'Potencia', valueType: 'text', orden: 110 },
]

/** Tipos seed: motor + ejemplos de activos configurables. */
export const DEFAULT_RESOURCE_TYPES = [
  {
    codigo: 'sala',
    label: 'Sala',
    icon: 'meeting',
    engineKind: 'sala',
    attributeKeys: ['wifi', 'hdmi', 'videollamada', 'proyector', 'pizarra', 'accesible'],
    showInUserCatalog: true,
    showInOffice: false,
    system: true,
    orden: 10,
  },
  {
    codigo: 'cochera',
    label: 'Cochera',
    icon: 'parking',
    engineKind: 'cochera',
    attributeKeys: [],
    exigePatenteDefault: true,
    diaCompletoDefault: true,
    showInUserCatalog: true,
    showInOffice: false,
    system: true,
    orden: 20,
  },
  {
    codigo: 'puesto',
    label: 'Puesto',
    icon: 'desk',
    engineKind: 'puesto',
    attributeKeys: ['monitor', 'accesible'],
    showInUserCatalog: true,
    showInOffice: true,
    system: true,
    orden: 30,
  },
  {
    codigo: 'zona_cupo',
    label: 'Zona con cupo',
    icon: 'zone',
    engineKind: 'zona_cupo',
    attributeKeys: ['wifi', 'accesible'],
    showInUserCatalog: true,
    showInOffice: true,
    system: true,
    orden: 40,
  },
  {
    codigo: 'activo',
    label: 'Activo genérico',
    icon: 'box',
    engineKind: 'activo',
    attributeKeys: ['marca', 'portatil'],
    showInUserCatalog: true,
    showInOffice: false,
    system: true,
    orden: 50,
  },
  {
    codigo: 'proyector',
    label: 'Proyector',
    icon: 'projector',
    engineKind: 'activo',
    attributeKeys: ['hdmi', '4k', 'portatil', 'marca'],
    showInUserCatalog: true,
    showInOffice: false,
    system: false,
    orden: 60,
  },
  {
    codigo: 'herramienta',
    label: 'Herramienta',
    icon: 'tool',
    engineKind: 'activo',
    attributeKeys: ['marca', 'potencia', 'portatil'],
    showInUserCatalog: true,
    showInOffice: false,
    system: false,
    orden: 70,
  },
  {
    codigo: 'locker',
    label: 'Locker',
    icon: 'locker',
    engineKind: 'activo',
    attributeKeys: [],
    showInUserCatalog: true,
    showInOffice: false,
    system: false,
    orden: 80,
  },
  {
    codigo: 'hora_libre',
    label: 'Hora libre',
    icon: 'clock',
    engineKind: 'hora_libre',
    attributeKeys: [],
    showInUserCatalog: true,
    showInOffice: false,
    system: true,
    orden: 90,
  },
  {
    codigo: 'grupo',
    label: 'Espacio grupal',
    icon: 'group',
    engineKind: 'grupo',
    attributeKeys: ['wifi', 'videollamada', 'pizarra'],
    showInUserCatalog: true,
    showInOffice: false,
    system: true,
    orden: 100,
  },
]

export function normalizeAttributeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 40)
}

export function normalizeTypeCodigo(codigo) {
  return String(codigo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 40)
}

/** Normaliza attributes payload → [{ key, value }]. */
export function normalizeAttributes(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((a) => {
        if (typeof a === 'string') {
          const key = normalizeAttributeKey(a)
          return key ? { key, value: '' } : null
        }
        const key = normalizeAttributeKey(a?.key)
        if (!key) return null
        return { key, value: String(a.value ?? '').slice(0, 120) }
      })
      .filter(Boolean)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([k, v]) => {
        const key = normalizeAttributeKey(k)
        if (!key) return null
        if (v === false || v == null) return null
        return { key, value: v === true ? '' : String(v).slice(0, 120) }
      })
      .filter(Boolean)
  }
  return []
}

/** ¿El recurso tiene todos los attribute keys pedidos (flags presentes)? */
export function resourceHasAttributes(resource, requiredKeys = []) {
  const keys = (requiredKeys || []).map(normalizeAttributeKey).filter(Boolean)
  if (!keys.length) return true
  const have = new Set(
    (resource?.attributes || [])
      .map((a) => normalizeAttributeKey(a.key))
      .filter(Boolean),
  )
  // Compat: equipment[] legado cuenta como atributo presente
  for (const e of resource?.equipment || []) {
    have.add(normalizeAttributeKey(e))
  }
  if (resource?.accessible) have.add('accesible')
  return keys.every((k) => have.has(k))
}

export function serializeResourceType(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    codigo: doc.codigo,
    label: doc.label,
    icon: doc.icon || 'box',
    descripcion: doc.descripcion || '',
    engineKind: doc.engineKind,
    attributeKeys: doc.attributeKeys || [],
    exigePatenteDefault: !!doc.exigePatenteDefault,
    requiresApprovalDefault: !!doc.requiresApprovalDefault,
    diaCompletoDefault: !!doc.diaCompletoDefault,
    showInUserCatalog: doc.showInUserCatalog !== false,
    showInOffice: !!doc.showInOffice,
    system: !!doc.system,
    activo: doc.activo !== false,
    orden: doc.orden ?? 100,
  }
}

export function serializeAttributeDef(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    key: doc.key,
    label: doc.label,
    valueType: doc.valueType || 'flag',
    options: doc.options || [],
    activo: doc.activo !== false,
    orden: doc.orden ?? 100,
  }
}

/** Icono por defecto según motor de reserva. */
export function defaultIconForEngine(engineKind) {
  const map = {
    sala: 'meeting',
    cochera: 'parking',
    puesto: 'desk',
    zona_cupo: 'zone',
    activo: 'box',
    hora_libre: 'clock',
    grupo: 'group',
    otro: 'building',
  }
  return map[engineKind] || 'box'
}
