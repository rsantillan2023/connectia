/**
 * Seed Ola 36 — mejoras referenciadas (idempotente).
 * Cubrir al crear comunidad nueva + refrescar DEMO/ARCOR.
 *
 * Incluye: plantillas de pubs, newsletter rule, áreas internas,
 * clientes de audiencia, hub con tokens {{puntos}}, pubs demo
 * (sección / pin temporal / vencimiento), recursos espacio ampliados,
 * flags tenant (homeVariant, uiLocale, pointsApiKey demo).
 */
import crypto from 'crypto'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { OrgArea } from '../models/OrgArea.js'
import { Post } from '../models/Post.js'
import { PostTemplate } from '../models/PostTemplate.js'
import { NewsletterRule } from '../models/NewsletterRule.js'
import { AudienceClient } from '../models/AudienceClient.js'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { SpaceSite, SpaceResource } from '../models/Space.js'
import { ensureDefaultPointsRules } from '../lib/pointsRules.js'
import { seedSpacesForTenant } from './spacesSeed.js'

export const DEFAULT_POST_TEMPLATES = [
  {
    key: 'cumple',
    nombre: 'Cumpleaños',
    tipo: 'celebracion',
    titulo: '¡Feliz cumpleaños, [Nombre]! 🎉',
    cuerpo:
      'Todo el equipo de [Empresa] te desea un muy feliz cumpleaños. ¡Que tengas un día increíble!',
    layout: 'vertical',
    section: '',
    pinned: false,
  },
  {
    key: 'feriado',
    nombre: 'Feriado / día no laborable',
    tipo: 'aviso',
    titulo: 'Recordatorio: [Fecha] es feriado',
    cuerpo:
      'Te recordamos que el [Fecha] es feriado nacional. Retomamos actividad el siguiente día hábil.',
    layout: 'horizontal',
    section: '',
    pinned: true,
  },
  {
    key: 'aviso',
    nombre: 'Aviso general',
    tipo: 'aviso',
    titulo: 'Aviso importante',
    cuerpo: 'Contanos acá la novedad que el equipo necesita conocer.',
    layout: 'vertical',
    section: '',
    pinned: false,
  },
  {
    key: 'beneficio',
    nombre: 'Nuevo beneficio',
    tipo: 'beneficio',
    titulo: 'Nuevo beneficio disponible',
    cuerpo: 'Sumamos un nuevo beneficio para el equipo. Mirá los detalles y cómo acceder.',
    layout: 'vertical',
    section: 'beneficio',
    pinned: false,
  },
  {
    key: 'deporte',
    nombre: 'Nota deporte / bienestar',
    tipo: 'noticia',
    titulo: 'Actividad de bienestar',
    cuerpo: 'Sumate a la actividad de la semana. Cupos limitados — anotáte desde la app.',
    layout: 'vertical',
    section: 'deporte',
    pinned: false,
  },
]

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ brandName?: string, createdBy?: import('mongoose').Types.ObjectId|null, ensureSpaces?: boolean }} [opts]
 */
export async function seedOla36ForTenant(tenantId, opts = {}) {
  const tenant = await Tenant.findById(tenantId)
  if (!tenant) throw new Error('Tenant no encontrado')

  const brand = opts.brandName || tenant.nombre || tenant.empCodigo || 'Comunidad'
  const createdBy = opts.createdBy || null
  const stats = {
    templates: 0,
    newsletterRules: 0,
    areasInternas: 0,
    clients: 0,
    hubLinks: 0,
    posts: 0,
    spaceExtras: 0,
    pointsRules: null,
    tenantFlags: false,
  }

  // —— Tenant flags ——
  let tenantDirty = false
  if (!tenant.homeVariant) {
    tenant.homeVariant = 'classic'
    tenantDirty = true
  }
  if (!tenant.uiLocale) {
    tenant.uiLocale = 'es-AR'
    tenantDirty = true
  }
  if (!tenant.pointsApiKey) {
    tenant.pointsApiKey = `cx_pts_${crypto.randomBytes(12).toString('hex')}`
    tenantDirty = true
  }
  if (tenantDirty) {
    await tenant.save()
    stats.tenantFlags = true
  }

  // —— Plantillas ——
  for (const st of DEFAULT_POST_TEMPLATES) {
    const existing = await PostTemplate.findOne({ tenantId: tenant._id, key: st.key })
    if (existing) {
      Object.assign(existing, { ...st, activo: true })
      await existing.save()
      continue
    }
    await PostTemplate.create({ tenantId: tenant._id, ...st, activo: true })
    stats.templates += 1
  }

  // —— Newsletter rule (deshabilitada por defecto para no spamear en local) ——
  let rule = await NewsletterRule.findOne({ tenantId: tenant._id, nombre: new RegExp('Digest', 'i') })
  if (!rule) {
    rule = await NewsletterRule.create({
      tenantId: tenant._id,
      nombre: `Digest automático · ${brand}`,
      intervalHours: 8,
      postCount: 6,
      selectMode: 'pinned_first',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      enabled: false,
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 8 * 3600_000),
    })
    stats.newsletterRules += 1
  }

  // —— Área interna ——
  const areaInterna = await OrgArea.findOneAndUpdate(
    { tenantId: tenant._id, key: 'comms_interna' },
    {
      tenantId: tenant._id,
      key: 'comms_interna',
      nombre: 'Comunicación interna',
      kind: 'interna',
      activo: true,
      orden: 90,
    },
    { upsert: true, new: true },
  )
  if (areaInterna) stats.areasInternas = 1

  // —— Clientes de audiencia ——
  const sampleUsers = await User.find({ tenantId: tenant._id, activo: true })
    .select('_id email usuario')
    .limit(8)
    .lean()
  const clientDefs = [
    {
      nombre: 'Proveedores VIP',
      emails: [`proveedor@${String(tenant.empCodigo || 'demo').toLowerCase()}.example.com`],
      userIds: [],
    },
    {
      nombre: 'Embajadores internos',
      emails: [],
      userIds: sampleUsers.slice(0, 3).map((u) => u._id),
    },
  ]
  for (const c of clientDefs) {
    const existing = await AudienceClient.findOne({ tenantId: tenant._id, nombre: c.nombre })
    if (existing) {
      existing.emails = c.emails
      existing.userIds = c.userIds
      existing.activo = true
      await existing.save()
      continue
    }
    await AudienceClient.create({
      tenantId: tenant._id,
      nombre: c.nombre,
      emails: c.emails,
      userIds: c.userIds,
      activo: true,
    })
    stats.clients += 1
  }

  // —— Hub: enlace con valores dinámicos ——
  await HubCategory.findOneAndUpdate(
    { tenantId: tenant._id, nombre: 'People' },
    { tenantId: tenant._id, nombre: 'People', orden: 20, iconSize: 'md', showOnMuro: true, activo: true },
    { upsert: true },
  )
  const hubDyn = {
    titulo: 'BENEFICIOS · {{puntos_saludo}}',
    subtitulo: '{{si_puntos_gt:0:Canjeá tus puntos}}{{si_puntos_lte:0:Empezá a sumar puntos}}',
    kind: 'route',
    target: '/beneficios',
    url: '/beneficios',
    openMode: 'internal',
    category: 'People',
    icon: 'gift',
    color: '#C2410C',
    order: 22.5,
    featured: true,
  }
  await HubLink.findOneAndUpdate(
    { tenantId: tenant._id, titulo: hubDyn.titulo },
    {
      ...hubDyn,
      tenantId: tenant._id,
      params: {},
      activo: true,
      iconSize: 'md',
      visibleUntil: new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999)),
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [], clientIds: [] },
    },
    { upsert: true },
  )
  stats.hubLinks = 1

  // —— Publicaciones demo con sección / pin / vencimiento ——
  const author =
    (await User.findOne({ tenantId: tenant._id, roles: 'admin' }).select('_id nombre usuario')) ||
    sampleUsers[0]
  const now = new Date()
  const postDefs = [
    {
      seedKey: 'ola36-section-deporte',
      titulo: `Torneo interno · ${brand}`,
      cuerpo: 'Inscripciones abiertas para el torneo de fútbol 5. Sección editorial: deporte.',
      tipo: 'noticia',
      section: 'deporte',
      pinned: true,
      pinnedUntil: new Date(now.getTime() + 3 * 864e5),
      expiresAt: new Date(now.getTime() + 14 * 864e5),
    },
    {
      seedKey: 'ola36-section-internacional',
      titulo: 'Mirada internacional de la semana',
      cuerpo: 'Resumen de tendencias globales que impactan al equipo. Sección: internacional.',
      tipo: 'noticia',
      section: 'internacional',
      pinned: false,
      pinnedUntil: null,
      expiresAt: new Date(now.getTime() + 7 * 864e5),
    },
    {
      seedKey: 'ola36-expira-promo',
      titulo: 'Promo puntos — solo esta semana',
      cuerpo: 'Duplicamos puntos por reacciones hasta el vencimiento de esta publicación.',
      tipo: 'beneficio',
      section: 'beneficio',
      pinned: false,
      pinnedUntil: null,
      expiresAt: new Date(now.getTime() + 5 * 864e5),
    },
  ]
  for (const p of postDefs) {
    const existing = await Post.findOne({
      tenantId: tenant._id,
      'greeting.runKey': p.seedKey,
    })
    const payload = {
      tenantId: tenant._id,
      titulo: p.titulo,
      cuerpo: p.cuerpo,
      tipo: p.tipo,
      section: p.section,
      pinned: p.pinned,
      pinnedUntil: p.pinnedUntil,
      expiresAt: p.expiresAt,
      status: 'published',
      publishedAt: now,
      origin: 'admin',
      layout: 'vertical',
      authorId: author?._id || null,
      authorName: author?.nombre || author?.usuario || 'Seed',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [], clientIds: [] },
      commentsEnabled: true,
      greeting: { runKey: p.seedKey, eventType: 'seed_ola36', forUserId: null, ruleId: null },
    }
    if (existing) {
      Object.assign(existing, payload)
      await existing.save()
    } else {
      try {
        await Post.create(payload)
        stats.posts += 1
      } catch (e) {
        if (e?.code !== 11000) throw e
      }
    }
  }

  // —— Espacios: asegurar sedes + kinds nuevos ——
  if (opts.ensureSpaces !== false) {
    await seedSpacesForTenant(tenant._id, { brandName: brand })
  }
  const hq = await SpaceSite.findOne({ tenantId: tenant._id, codigo: 'HQ' })
  if (hq) {
    const extras = [
      {
        kind: 'activo',
        nombre: 'Notebook pool A',
        codigo: 'NB-A',
        capacity: 1,
        orden: 200,
        equipment: ['notebook'],
      },
      {
        kind: 'hora_libre',
        nombre: 'Franja bienestar 15–16',
        codigo: 'HL-15',
        capacity: 20,
        orden: 210,
        zone: 'Bienestar',
      },
      {
        kind: 'grupo',
        nombre: 'Sala grupal Open',
        codigo: 'GRP-1',
        capacity: 12,
        orden: 220,
        zone: 'Colab',
      },
    ]
    for (const r of extras) {
      const existing = await SpaceResource.findOne({
        tenantId: tenant._id,
        siteId: hq._id,
        codigo: r.codigo,
      })
      if (existing) {
        Object.assign(existing, { ...r, siteId: hq._id, activo: true })
        await existing.save()
        continue
      }
      await SpaceResource.create({
        tenantId: tenant._id,
        siteId: hq._id,
        ...r,
        activo: true,
      })
      stats.spaceExtras += 1
    }
  }

  stats.pointsRules = await ensureDefaultPointsRules(tenant._id, { createdBy })

  return stats
}
