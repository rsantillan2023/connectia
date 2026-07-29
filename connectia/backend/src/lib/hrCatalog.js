/**
 * Catálogos RRHH — helpers puros + defaults AR.
 */
import { HR_CATALOG_TYPES } from '../models/HrCatalog.js'

export { HR_CATALOG_TYPES }

export function serializeCatalogItem(doc) {
  return {
    id: String(doc._id),
    tipo: doc.tipo,
    codigo: doc.codigo,
    label: doc.label,
    parentCodigo: doc.parentCodigo || '',
    orden: doc.orden ?? 0,
    activo: doc.activo !== false,
    meta: doc.meta && typeof doc.meta === 'object' ? doc.meta : {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function applyCatalogPatch(doc, body = {}) {
  if (body.label != null) doc.label = String(body.label).trim().slice(0, 160)
  if (body.parentCodigo != null) doc.parentCodigo = String(body.parentCodigo).trim().slice(0, 64)
  if (body.orden != null) doc.orden = Number(body.orden) || 0
  if (body.activo != null) doc.activo = Boolean(body.activo)
  if (body.meta != null && typeof body.meta === 'object') doc.meta = body.meta
  return doc
}

/** Defaults mínimos para tenant nuevo (AR). */
export function defaultHrCatalogRows() {
  const rows = []
  const push = (tipo, codigo, label, orden = 0, parentCodigo = '') => {
    rows.push({ tipo, codigo, label, orden, parentCodigo, activo: true })
  }

  push('pais', 'AR', 'Argentina', 1)
  push('pais', 'UY', 'Uruguay', 2)
  push('pais', 'CL', 'Chile', 3)

  ;[
    ['CABA', 'Ciudad Autónoma de Buenos Aires', 1],
    ['BA', 'Buenos Aires', 2],
    ['CBA', 'Córdoba', 3],
    ['SF', 'Santa Fe', 4],
    ['MZ', 'Mendoza', 5],
  ].forEach(([c, l, o]) => push('provincia', c, l, o, 'AR'))

  ;[
    ['F', 'Femenino', 1],
    ['M', 'Masculino', 2],
    ['X', 'No binario / otro', 3],
    ['NR', 'Prefiero no decir', 4],
  ].forEach(([c, l, o]) => push('genero', c, l, o))

  ;[
    ['soltero', 'Soltero/a', 1],
    ['casado', 'Casado/a', 2],
    ['union', 'Unión convivencial', 3],
    ['divorciado', 'Divorciado/a', 4],
    ['viudo', 'Viudo/a', 5],
  ].forEach(([c, l, o]) => push('estado_civil', c, l, o))

  ;[
    ['conyuge', 'Cónyuge / pareja', 1],
    ['hijo', 'Hijo/a', 2],
    ['padre', 'Padre / madre', 3],
    ['hermano', 'Hermano/a', 4],
    ['otro', 'Otro', 9],
  ].forEach(([c, l, o]) => push('parentesco', c, l, o))

  ;[
    ['particular', 'Particular', 1],
    ['laboral', 'Laboral', 2],
    ['fiscal', 'Fiscal', 3],
  ].forEach(([c, l, o]) => push('tipo_domicilio', c, l, o))

  ;[
    ['rel_dep', 'Relación de dependencia', 1],
    ['monotributo', 'Monotributo', 2],
    ['pasantia', 'Pasantía', 3],
    ['contrato', 'Contrato temporal', 4],
  ].forEach(([c, l, o]) => push('tipo_contrato', c, l, o))

  ;[
    ['presencial', 'Presencial', 1],
    ['hibrido', 'Híbrido', 2],
    ['remoto', 'Remoto', 3],
  ].forEach(([c, l, o]) => push('modalidad', c, l, o))

  ;[
    ['galicia', 'Banco Galicia', 1],
    ['nacion', 'Banco Nación', 2],
    ['santander', 'Santander', 3],
    ['bbva', 'BBVA', 4],
    ['macro', 'Macro', 5],
  ].forEach(([c, l, o]) => push('banco', c, l, o))

  ;[
    ['osde', 'OSDE', 1],
    ['swiss', 'Swiss Medical', 2],
    ['galeno', 'Galeno', 3],
    ['pami', 'PAMI', 4],
    ['otra', 'Otra', 9],
  ].forEach(([c, l, o]) => push('obra_social', c, l, o))

  ;[
    ['planta', 'Planta', 1],
    ['contratado', 'Contratado', 2],
    ['pasante', 'Pasante', 3],
  ].forEach(([c, l, o]) => push('clasificacion_legajo', c, l, o))

  ;[
    ['ok', 'En regla', 1],
    ['pendiente_docs', 'Pendiente documentación', 2],
    ['revision', 'En revisión', 3],
  ].forEach(([c, l, o]) => push('subestado_laboral', c, l, o))

  ;[
    ['basico', 'Básico', 1],
    ['intermedio', 'Intermedio', 2],
    ['avanzado', 'Avanzado', 3],
    ['experto', 'Experto', 4],
  ].forEach(([c, l, o]) => push('nivel_skill', c, l, o))

  return rows
}

/**
 * Upsert idempotente de defaults (no pisa label editado si ya existe).
 */
export async function seedHrCatalogsForTenant(HrCatalog, tenantId) {
  const rows = defaultHrCatalogRows()
  let created = 0
  for (const row of rows) {
    const existing = await HrCatalog.findOne({
      tenantId,
      tipo: row.tipo,
      codigo: row.codigo,
    }).lean()
    if (existing) continue
    await HrCatalog.create({ ...row, tenantId })
    created += 1
  }
  return { created, totalDefaults: rows.length }
}
