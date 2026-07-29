/**
 * Upsert de demos de los 11 kinds del hub.
 * Uso CLI: node src/scripts/seedHubKinds.js
 */
import mongoose from 'mongoose'
import { Tenant } from '../models/Tenant.js'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { RequestType } from '../models/RequestType.js'
import { Survey } from '../models/Survey.js'
import { DocItem } from '../models/DocItem.js'
import { Post } from '../models/Post.js'
import { openModeForKind } from '../lib/hubKinds.js'

export async function seedHubKindsForTenant(tenant) {
  const reqTypeDemo = await RequestType.findOne({ tenantId: tenant._id, activo: true }).sort({ orden: 1 })
  const surveyDemo = await Survey.findOne({ tenantId: tenant._id }).sort({ updatedAt: -1 })
  const docDemo = await DocItem.findOne({ tenantId: tenant._id, status: 'published' }).sort({ updatedAt: -1 })
  const postDemo = await Post.findOne({ tenantId: tenant._id, status: 'published' }).sort({ publishedAt: -1 })

  const hubSeed = [
    {
      titulo: 'Tipo · URL externa',
      subtitulo: 'Abre sitio en nueva pestaña',
      kind: 'url',
      target: 'https://example.com/intranet',
      category: 'Catálogo de tipos',
      icon: 'globe',
      order: 10,
    },
    {
      titulo: 'Tipo · Webview',
      subtitulo: 'URL dentro de Connectia',
      kind: 'webview',
      target: 'https://example.com/help',
      params: { title: 'Ayuda' },
      category: 'Catálogo de tipos',
      icon: 'laptop',
      order: 20,
    },
    {
      titulo: 'Tipo · Ruta interna',
      subtitulo: 'Va al muro',
      kind: 'route',
      target: '/muro',
      category: 'Catálogo de tipos',
      icon: 'home',
      order: 30,
    },
    {
      titulo: 'Tipo · Nueva solicitud',
      subtitulo: reqTypeDemo ? `Abre ${reqTypeDemo.nombre}` : 'Sin tipos aún',
      kind: 'request',
      target: reqTypeDemo ? String(reqTypeDemo._id) : '',
      params: reqTypeDemo ? { requestTypeId: String(reqTypeDemo._id) } : {},
      category: 'Catálogo de tipos',
      icon: 'inbox',
      order: 40,
    },
    {
      titulo: 'Tipo · Encuesta',
      subtitulo: surveyDemo ? surveyDemo.titulo : 'Sin encuestas aún',
      kind: 'survey',
      target: surveyDemo ? String(surveyDemo._id) : '',
      params: surveyDemo ? { surveyId: String(surveyDemo._id) } : {},
      category: 'Catálogo de tipos',
      icon: 'clipboard',
      order: 50,
    },
    {
      titulo: 'Tipo · Documento',
      subtitulo: docDemo ? docDemo.titulo : 'Sin documentos aún',
      kind: 'document',
      target: docDemo ? String(docDemo._id) : '',
      params: docDemo ? { docId: String(docDemo._id) } : {},
      category: 'Catálogo de tipos',
      icon: 'file',
      order: 60,
    },
    {
      titulo: 'Tipo · Publicación',
      subtitulo: postDemo ? postDemo.titulo : 'Sin posts aún',
      kind: 'post',
      target: postDemo ? String(postDemo._id) : '',
      params: postDemo ? { postId: String(postDemo._id) } : {},
      category: 'Catálogo de tipos',
      icon: 'megaphone',
      order: 70,
    },
    {
      titulo: 'Tipo · Correo',
      subtitulo: 'mailto a RRHH',
      kind: 'mailto',
      target: 'rrhh@demo.connectia.local',
      params: { subject: 'Consulta de {{nombre}}', body: 'Hola, soy {{nombre}} ({{usuario}}).' },
      category: 'Catálogo de tipos',
      icon: 'mail',
      order: 80,
    },
    {
      titulo: 'Tipo · Teléfono',
      subtitulo: 'Llamar a mesa de ayuda',
      kind: 'tel',
      target: '+541155550000',
      category: 'Catálogo de tipos',
      icon: 'phone',
      order: 90,
    },
    {
      titulo: 'Tipo · WhatsApp',
      subtitulo: 'Chat con mensaje',
      kind: 'whatsapp',
      target: '5491155550000',
      params: { text: 'Hola, soy {{nombre}} de {{tenant}}' },
      category: 'Catálogo de tipos',
      icon: 'chat',
      order: 100,
    },
    {
      titulo: 'Tipo · Copiar texto',
      subtitulo: 'Código de beneficios',
      kind: 'copy',
      target: 'DEMO-BENEFICIO-2026',
      params: { copyText: 'DEMO-BENEFICIO-2026', message: 'Código copiado' },
      category: 'Catálogo de tipos',
      icon: 'gift',
      order: 110,
    },
  ]

  await HubCategory.findOneAndUpdate(
    { tenantId: tenant._id, nombre: 'Catálogo de tipos' },
    { tenantId: tenant._id, nombre: 'Catálogo de tipos', orden: 5, activo: true, iconSize: 'md' },
    { upsert: true },
  )

  let n = 0
  for (const item of hubSeed) {
    if (['request', 'survey', 'document', 'post'].includes(item.kind) && !item.target) continue
    await HubLink.findOneAndUpdate(
      { tenantId: tenant._id, titulo: item.titulo },
      {
        titulo: item.titulo,
        subtitulo: item.subtitulo || '',
        kind: item.kind,
        target: item.target,
        url: item.target,
        params: item.params || {},
        category: item.category,
        icon: item.icon || 'grid',
        iconSize: 'md',
        featured: false,
        order: item.order ?? 100,
        openMode: openModeForKind(item.kind),
        tenantId: tenant._id,
        activo: true,
        visibleUntil: new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999)),
        audience: { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true },
    )
    n += 1
  }
  // Primeros 3 del catálogo como accesos rápidos
  const kindTitles = hubSeed.map((x) => x.titulo).slice(0, 3)
  await HubLink.updateMany(
    { tenantId: tenant._id, category: 'Catálogo de tipos' },
    { $set: { featured: false, iconSize: 'md' } },
  )
  await HubLink.updateMany(
    { tenantId: tenant._id, category: 'Catálogo de tipos', titulo: { $in: kindTitles } },
    { $set: { featured: true } },
  )
  return n
}

const isMain = process.argv[1] && String(process.argv[1]).replace(/\\/g, '/').endsWith('/seedHubKinds.js')
if (isMain) {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectia')
  const tenant = await Tenant.findOne({ empCodigo: 'DEMO' })
  if (!tenant) {
    console.error('Tenant DEMO no encontrado')
    process.exit(1)
  }
  const n = await seedHubKindsForTenant(tenant)
  const byKind = await HubLink.aggregate([
    { $match: { tenantId: tenant._id } },
    { $group: { _id: '$kind', c: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  console.log(`Upserted ${n} demos de kinds`)
  console.log('Conteo por kind:', Object.fromEntries(byKind.map((x) => [x._id || '(vacío)', x.c])))
  await mongoose.disconnect()
}
