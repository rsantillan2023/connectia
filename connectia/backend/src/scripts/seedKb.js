import { KbArticle } from '../models/KbArticle.js'

const DEMO_ARTICLES = [
  {
    titulo: 'Cómo crear una solicitud',
    categoria: 'guia',
    tags: ['solicitudes', 'trámites', 'consultas'],
    orden: 10,
    cuerpo:
      'Para abrir un trámite andá a Mis solicitudes → Nueva. Elegí el tipo, completá los campos y enviá. ' +
      'Podés seguir el estado (Abierta, En curso, Resuelta) desde el listado. ' +
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
    tags: ['avisos', 'notificaciones', 'push', 'marcar', 'asistencia'],
    orden: 30,
    cuerpo:
      'Los avisos llegan por push (si diste permiso) y quedan en Avisos (/avisos). ' +
      'Podés marcarlos como leídos o descartarlos. La campana del topbar muestra no leídos. ' +
      'La marcación de asistencia/fichaje de turnos llega en una ola posterior; mientras tanto usá Avisos y consultá a RRHH si necesitás registrar presencia.',
  },
  {
    titulo: 'Política de uso del Asistente',
    categoria: 'politica',
    tags: ['ia', 'asistente', 'privacidad'],
    orden: 40,
    cuerpo:
      'El Asistente solo usa datos de tu comunidad y de tu usuario. No ve información de otros tenants. ' +
      'Las acciones (crear solicitudes, licencias o reservas) requieren tu confirmación explícita. ' +
      'Las respuestas de “cómo hacer” citan la base de conocimientos cuando hay fuente.',
  },
  {
    titulo: 'Vacaciones y licencias',
    categoria: 'guia',
    tags: ['vacaciones', 'licencias', 'rrhh', 'saldo'],
    orden: 50,
    cuerpo:
      'Preguntá al Asistente “¿cuántas vacaciones tengo?” para ver el saldo real. ' +
      'Para pedir: “quiero vacaciones del 10/08 al 20/08” — te muestra un borrador y solo se crea al confirmar. ' +
      'También podés combinar: “quiero saber cuántas vacaciones tengo y tomarme del X al Y”. ' +
      'En la app: Vacaciones y permisos (/licencias).',
  },
  {
    titulo: 'Recibo de sueldo',
    categoria: 'faq',
    tags: ['recibo', 'sueldo', 'haberes', 'rrhh'],
    orden: 55,
    cuerpo:
      'El módulo de descarga de recibos aún no está en Connectia. ' +
      'Si pedís “quiero mi recibo de sueldo”, el Asistente te ofrece abrir una consulta a RRHH (con tu confirmación) ' +
      'indicando el período. No inventa montos ni genera PDFs.',
  },
  {
    titulo: 'Reservar sala, cochera u oficina',
    categoria: 'guia',
    tags: ['reserva', 'sala', 'cochera', 'oficina', 'espacios'],
    orden: 60,
    cuerpo:
      'Decile al Asistente “quiero reservar una sala mañana a las 10”, “necesito una cochera el jueves patente AB123CD” ' +
      'o “voy a la oficina el viernes”. Armá el borrador, confirmá, y se crea la reserva con las mismas reglas que Espacios/Oficina. ' +
      'También podés ir a /espacios o /oficina.',
  },
  {
    titulo: 'Cómo gestionar usuarios en Admin',
    categoria: 'guia',
    tags: ['admin', 'usuarios', 'miembros', 'alta'],
    orden: 70,
    cuerpo:
      'En Admin → Usuarios (/usuarios) podés listar, filtrar y editar miembros de la comunidad. ' +
      'También está en «Funciones de Administración». El asistente de Admin responde “dónde están los usuarios” y apunta a esa pantalla.',
  },
  {
    titulo: 'Cómo administrar la base de conocimientos',
    categoria: 'guia',
    tags: ['admin', 'kb', 'conocimiento', 'faq', 'asistente'],
    orden: 80,
    cuerpo:
      'En Admin → Base de conocimientos (/asistente-kb) cargás y publicás artículos (guías, FAQs, políticas). ' +
      'Esos artículos alimentan al asistente de la app miembro y al chatbot del panel Admin. ' +
      'Si falta una respuesta frecuente, sumá un artículo publicado.',
  },
  {
    titulo: 'Dónde gestiono solicitudes en Admin',
    categoria: 'faq',
    tags: ['admin', 'solicitudes', 'bandeja', 'trámites'],
    orden: 90,
    cuerpo:
      'La bandeja de solicitudes de la comunidad está en Admin → Solicitudes (/solicitudes). ' +
      'Tipos, estados y workflows se configuran en Tipos de solicitud, Estados y Workflows. ' +
      'Preguntá al asistente Admin “dónde están las solicitudes” para ir directo.',
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
  const total = await KbArticle.countDocuments({ tenantId: tenant._id, status: 'published' })
  return { created, total }
}
