import { KbArticle } from '../models/KbArticle.js'

const DEMO_ARTICLES = [
  {
    titulo: 'Cómo crear una solicitud',
    categoria: 'guia',
    tags: ['solicitudes', 'trámites', 'consultas'],
    orden: 10,
    cuerpo:
      'Para abrir un trámite andá a Mis solicitudes → Nueva. Elegí el tipo, completá los campos y enviá. ' +
      'Podés seguir el estado (Abierta, En proceso, Resuelta) desde el listado. ' +
      'También podés pedirle al Asistente: “abrí una consulta” y confirmar.',
  },
  {
    titulo: 'Dónde veo mis documentos',
    categoria: 'faq',
    tags: ['documentos', 'pdf', 'biblioteca'],
    orden: 20,
    cuerpo:
      'En el menú Mis documentos (/docs) ves solo los archivos publicados visibles para tu área/grupo. ' +
      'Podés filtrar por categoría y descargarlos. El Asistente puede listarlos si le pedís “qué documentos tengo”.',
  },
  {
    titulo: 'Cómo marcar o ver avisos',
    categoria: 'faq',
    tags: ['avisos', 'notificaciones', 'push'],
    orden: 30,
    cuerpo:
      'Los avisos llegan por push (si diste permiso) y quedan en Avisos (/avisos). ' +
      'Podés marcarlos como leídos o descartarlos. La campana del topbar muestra no leídos.',
  },
  {
    titulo: 'Política de uso del Asistente',
    categoria: 'politica',
    tags: ['ia', 'asistente', 'privacidad'],
    orden: 40,
    cuerpo:
      'El Asistente solo usa datos de tu comunidad y de tu usuario. No ve información de otros tenants. ' +
      'Las acciones (crear solicitudes) requieren tu confirmación explícita. ' +
      'Las respuestas de “cómo hacer” citan la base de conocimientos cuando hay fuente.',
  },
  {
    titulo: 'Vacaciones y licencias',
    categoria: 'guia',
    tags: ['vacaciones', 'licencias', 'rrhh'],
    orden: 50,
    cuerpo:
      'Podés pedir vacaciones desde el Asistente (“quiero vacaciones del … al …”) o abriendo una consulta a RRHH. ' +
      'El saldo automático se habilitará con el módulo de licencias; mientras tanto RRHH valida cada pedido.',
  },
]

/**
 * Seed idempotente de artículos KB para un tenant.
 */
export async function seedKbForTenant(tenant) {
  let created = 0
  for (const a of DEMO_ARTICLES) {
    const sourceKey = `manual:${a.titulo}`
    const existing = await KbArticle.findOne({
      tenantId: tenant._id,
      $or: [{ titulo: a.titulo, sourceKind: { $in: ['', 'manual'] } }, { tags: sourceKey }],
    })
    if (existing) {
      existing.cuerpo = a.cuerpo
      existing.tags = [...new Set([...(a.tags || []), sourceKey])]
      existing.categoria = a.categoria
      existing.status = 'published'
      existing.orden = a.orden
      existing.sourceKind = 'manual'
      existing.href = '/asistente'
      existing.audience = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
      await existing.save()
      continue
    }
    await KbArticle.create({
      tenantId: tenant._id,
      ...a,
      tags: [...(a.tags || []), sourceKey],
      status: 'published',
      sourceKind: 'manual',
      href: '/asistente',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    })
    created += 1
  }
  return { created, total: DEMO_ARTICLES.length }
}
