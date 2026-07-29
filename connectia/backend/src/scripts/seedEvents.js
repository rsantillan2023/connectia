/**
 * Seed Ola 15 — Eventos y calendario (§6).
 * Idempotente por seedKey (+ fallback título).
 *
 * Uso:
 *   node src/scripts/seedEvents.js
 *   node src/scripts/seedEvents.js ARCOR
 *   node src/scripts/seedEvents.js ARCOR --force
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { Event, EventRsvp } from '../models/Event.js'
import { TenantParam } from '../models/TenantParam.js'
import { AppNotification } from '../models/AppNotification.js'
import { MenuItem } from '../models/MenuItem.js'
import { ensureOla15MenuItems, OLA15_MENU_ITEMS } from '../lib/ensureOla15Menu.js'
import { ensureDefaultParams } from '../routes/paramsAdmin.js'

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000)
}

function daysFromNow(d, hourUTC = 15) {
  const x = new Date()
  x.setUTCHours(Math.floor(hourUTC), (hourUTC % 1) * 60, 0, 0)
  x.setUTCDate(x.getUTCDate() + d)
  return x
}

/** Hoy a cierta hora local AR aproximada (UTC-3 → +3 en UTC). */
function todayAt(hourLocal = 10, durationH = 1) {
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourLocal + 3, 0, 0),
  )
  return { inicio: start, fin: new Date(start.getTime() + durationH * 3600000) }
}

function actorName(u) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ') || u?.usuario || 'Admin'
}

const PDF_DEMO = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

/** Catálogo demo Arcor / genérico — cubre mes, hoy, multimedia, cupo, draft. */
export function defaultEventDefs(brandName = 'Connectia') {
  const brand = String(brandName || 'Connectia').trim() || 'Connectia'
  const isArcor = /arcor/i.test(brand)
  const todayMorning = todayAt(9, 1)
  const todayNoon = todayAt(12, 1.5)

  if (isArcor) {
    return [
      {
        seedKey: 'arcor-today-standup',
        titulo: 'Stand-up planta Arroyito (hoy)',
        descripcion:
          'Sincronización diaria de línea Rocklets: seguridad, OEE y novedades de turno.\n\nEste evento alimenta el resumen «Qué tengo hoy» en Agenda.',
        tipo: 'reunion',
        inicio: todayMorning.inicio,
        fin: todayMorning.fin,
        lugar: 'Sala de turnos — Planta Arroyito',
        cupo: 30,
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80',
        media: [
          { url: PDF_DEMO, tipo: 'file', nombre: 'Checklist seguridad turno.pdf' },
        ],
        ubicacionUrl: 'https://maps.google.com/?q=Arroyito+Cordoba',
        status: 'published',
      },
      {
        seedKey: 'arcor-today-almuerzo',
        titulo: 'Almuerzo de equipo Comercial CABA',
        descripcion: 'Encuentro informal del equipo de ventas AMBA. Confirmá para reservar mesa.',
        tipo: 'celebracion',
        inicio: todayNoon.inicio,
        fin: todayNoon.fin,
        lugar: 'Comedor HQ Maipú',
        cupo: 24,
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
        status: 'published',
      },
      {
        seedKey: 'arcor-townhall-q3',
        titulo: 'Town hall Q3 — resultados y prioridades',
        descripcion:
          'Reunión abierta con la dirección: resultados del trimestre, foco en plantas Córdoba/Arroyito y lanzamientos comerciales.\n\nHabrá espacio de preguntas al final. Traé tus dudas por el chat de la app.',
        tipo: 'reunion',
        inicio: daysFromNow(3, 14),
        fin: daysFromNow(3, 15.5),
        lugar: 'Auditorio HQ Maipú + Teams',
        cupo: 200,
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
        media: [
          { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80', tipo: 'image', nombre: 'Afiche town hall' },
          { url: PDF_DEMO, tipo: 'file', nombre: 'Agenda Q3.pdf' },
        ],
        ubicacionUrl: 'https://maps.google.com/?q=Av+Maipu+1210+Buenos+Aires',
        status: 'published',
      },
      {
        seedKey: 'arcor-seg-industrial',
        titulo: 'Capacitación seguridad industrial — Planta Arroyito',
        descripcion:
          'Módulo obligatorio de seguridad: EPP, bloqueo/etiquetado y evacuación. Dirigido a operarios y supervisores de línea.\n\nCupo limitado — confirmá asistencia.',
        tipo: 'capacitacion',
        inicio: daysFromNow(7, 12),
        fin: daysFromNow(7, 14),
        lugar: 'Sala de capacitación Planta Arroyito',
        cupo: 40,
        imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=80',
        media: [{ url: PDF_DEMO, tipo: 'file', nombre: 'Manual EPP.pdf' }],
        status: 'published',
      },
      {
        seedKey: 'arcor-familia',
        titulo: 'Día de la familia Arcor',
        descripcion:
          'Jornada recreativa para colaboradores y familias: juegos, stands de marcas (Rocklets, Bon o Bon) y almuerzo.\n\nConfirmá asistencia para el catering.',
        tipo: 'celebracion',
        inicio: daysFromNow(21, 15),
        fin: daysFromNow(21, 21),
        lugar: 'Predio deportivo Arroyito',
        cupo: 500,
        imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
        media: [
          {
            url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80',
            tipo: 'image',
            nombre: 'Flyer familia',
          },
        ],
        status: 'published',
      },
      {
        seedKey: 'arcor-rocklets-launch',
        titulo: 'Kickoff comercial — campaña Rocklets verano',
        descripcion:
          'Presentación del kit trade, listas de precios y objetivos por canal. Para fuerza de ventas y marketing.',
        tipo: 'reunion',
        inicio: daysFromNow(10, 13),
        fin: daysFromNow(10, 15),
        lugar: 'Sala comercial CABA + Zoom',
        cupo: 80,
        imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=80',
        media: [{ url: PDF_DEMO, tipo: 'file', nombre: 'Kit trade Rocklets.pdf' }],
        status: 'published',
      },
      {
        seedKey: 'arcor-calidad-haccp',
        titulo: 'Taller HACCP y no conformidades',
        descripcion:
          'Repaso de procedimientos de calidad y carga de no conformidades en el portal. Obligatoria para supervisores de calidad.',
        tipo: 'capacitacion',
        inicio: daysFromNow(14, 11),
        fin: daysFromNow(14, 13),
        lugar: 'Laboratorio calidad Córdoba',
        cupo: 25,
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
        status: 'published',
      },
      {
        seedKey: 'arcor-voluntariado',
        titulo: 'Jornada de voluntariado — Banco de alimentos',
        descripcion: 'Inscripción abierta para colaborar con el banco de alimentos de Córdoba.',
        tipo: 'general',
        inicio: daysFromNow(18, 13),
        fin: daysFromNow(18, 18),
        lugar: 'Córdoba capital',
        cupo: 60,
        imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80',
        status: 'published',
      },
      {
        seedKey: 'arcor-mes-cierre',
        titulo: 'Cierre de mes — indicadores People',
        descripcion: 'Revisión de indicadores de clima, ausentismo y onboarding del mes.',
        tipo: 'reunion',
        inicio: daysFromNow(25, 15),
        fin: daysFromNow(25, 16),
        lugar: 'People & Culture — Maipú',
        cupo: 20,
        imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        status: 'published',
      },
      {
        seedKey: 'arcor-draft-navidad',
        titulo: 'Fiesta de fin de año (borrador)',
        descripcion: 'Borrador interno — no publicar hasta definir fecha y salón. Usá «Crear con IA» para pulir el copy.',
        tipo: 'celebracion',
        inicio: daysFromNow(90, 20),
        fin: daysFromNow(90, 23),
        lugar: 'A confirmar',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1200&q=80',
        status: 'draft',
      },
      {
        seedKey: 'arcor-past-onboarding',
        titulo: 'Bienvenida nuevos ingresos julio',
        descripcion: 'Inducción ya realizada — queda en agenda como histórico.',
        tipo: 'general',
        inicio: hoursFromNow(-72),
        fin: hoursFromNow(-70),
        lugar: 'People & Culture — Maipú',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
        status: 'published',
      },
    ]
  }

  return [
    {
      seedKey: 'generic-today',
      titulo: `Check-in matutino — ${brand}`,
      descripcion: 'Evento de hoy para el resumen de agenda.',
      tipo: 'reunion',
      inicio: todayMorning.inicio,
      fin: todayMorning.fin,
      lugar: 'Sala principal',
      status: 'published',
    },
    {
      seedKey: 'generic-townhall',
      titulo: `Reunión de comunidad — ${brand}`,
      descripcion: 'Encuentro mensual con novedades de la organización.',
      tipo: 'reunion',
      inicio: daysFromNow(5, 15),
      fin: daysFromNow(5, 16),
      lugar: 'Sala principal',
      cupo: 100,
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      status: 'published',
    },
    {
      seedKey: 'generic-training',
      titulo: 'Capacitación de onboarding digital',
      descripcion: 'Cómo usar la app: muro, solicitudes y agenda.',
      tipo: 'capacitacion',
      inicio: daysFromNow(8, 14),
      fin: daysFromNow(8, 15.5),
      lugar: 'Virtual',
      cupo: 50,
      status: 'published',
    },
    {
      seedKey: 'generic-celeb',
      titulo: 'Celebración de equipo',
      descripcion: 'Encuentro informal del equipo.',
      tipo: 'celebracion',
      inicio: daysFromNow(20, 18),
      fin: daysFromNow(20, 21),
      lugar: 'Terraza',
      status: 'published',
    },
  ]
}

async function ensureMenuLabels(tenantId) {
  await ensureOla15MenuItems(tenantId)
  for (const item of OLA15_MENU_ITEMS) {
    await MenuItem.findOneAndUpdate(
      { tenantId, key: item.key },
      {
        $set: {
          label: item.label,
          route: item.route,
          icon: item.icon,
          channel: item.channel,
          activo: true,
        },
        $setOnInsert: {
          tenantId,
          key: item.key,
          order: item.order,
          audience: { roles: [], capabilities: [] },
        },
      },
      { upsert: true },
    )
  }
}

/**
 * @param {{
 *   tenant: object,
 *   users?: Record<string, object>|object[],
 *   brandName?: string,
 *   author?: object,
 *   enableExternalCalendars?: boolean,
 *   force?: boolean,
 *   notifyDemo?: boolean,
 * }} opts
 */
export async function seedEventsForTenant({
  tenant,
  users = {},
  brandName,
  author = null,
  enableExternalCalendars = false,
  force = true,
  notifyDemo = true,
} = {}) {
  if (!tenant?._id) throw new Error('tenant requerido')
  const tenantId = tenant._id
  const brand = brandName || tenant.nombre || 'Connectia'

  await ensureMenuLabels(tenantId)
  await ensureDefaultParams(tenantId)

  // Params calendario: existen; por defecto off (OAuth real requiere env).
  for (const key of ['calendar.outlook.enabled', 'calendar.google.enabled']) {
    await TenantParam.findOneAndUpdate(
      { tenantId, key },
      { $set: { valor: enableExternalCalendars === true } },
      { upsert: false },
    )
  }

  const userList = Array.isArray(users)
    ? users
    : Object.values(users || {}).filter(Boolean)
  const authorUser =
    author ||
    userList.find((u) => (u.roles || []).includes('admin')) ||
    userList.find((u) => String(u.usuario || '').includes('comunicacion')) ||
    (await User.findOne({ tenantId, roles: 'admin', activo: true })) ||
    userList[0]

  const defs = defaultEventDefs(brand)
  let created = 0
  let updated = 0
  let skipped = 0
  let rsvps = 0
  let notifs = 0
  const createdEvents = []

  for (const def of defs) {
    const filter = def.seedKey
      ? { tenantId, seedKey: def.seedKey }
      : { tenantId, titulo: def.titulo }
    const existing = await Event.findOne(filter)

    if (existing && !force) {
      skipped += 1
      createdEvents.push(existing)
      continue
    }

    const payload = {
      tenantId,
      seedKey: def.seedKey || '',
      titulo: def.titulo,
      descripcion: def.descripcion || '',
      tipo: def.tipo || 'general',
      inicio: def.inicio,
      fin: def.fin,
      allDay: !!def.allDay,
      lugar: def.lugar || '',
      ubicacionUrl: def.ubicacionUrl || '',
      cupo: def.cupo ?? null,
      imageUrl: def.imageUrl || '',
      media: Array.isArray(def.media) ? def.media : [],
      status: def.status || 'published',
      audience: def.audience || { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorId: authorUser?._id || null,
      authorName: actorName(authorUser),
      timezone: tenant.timezone || 'America/Argentina/Buenos_Aires',
      publishedAt: def.status === 'draft' ? null : existing?.publishedAt || new Date(),
    }

    let doc
    if (existing) {
      Object.assign(existing, payload)
      await existing.save()
      doc = existing
      updated += 1
    } else {
      doc = await Event.create({ ...payload, rsvpConfirmados: 0, rsvpRechazados: 0 })
      created += 1
    }
    createdEvents.push(doc)
  }

  // RSVPs demo: todos los publicados (hoy + futuros), hasta 10 usuarios
  const forRsvp = createdEvents.filter(
    (e) => e.status === 'published' && new Date(e.fin) >= hoursFromNow(-24),
  )
  const attendees = userList.filter((u) => u?._id).slice(0, 10)

  for (const ev of forRsvp) {
    let conf = 0
    let rech = 0
    for (let i = 0; i < attendees.length; i++) {
      const u = attendees[i]
      // Variedad: ~1 de cada 5 rechaza; el resto confirma
      const estado = i % 5 === 0 ? 'rechazado' : 'confirmado'
      await EventRsvp.findOneAndUpdate(
        { tenantId, eventId: ev._id, userId: u._id },
        {
          $set: { estado, confirmedAt: new Date() },
          $setOnInsert: { tenantId, eventId: ev._id, userId: u._id },
        },
        { upsert: true },
      )
      rsvps += 1
      if (estado === 'confirmado') conf += 1
      else rech += 1
    }
    await Event.updateOne({ _id: ev._id }, { $set: { rsvpConfirmados: conf, rsvpRechazados: rech } })
  }

  // Avisos in-app con deep link /agenda/:id (para smoke de push/centro)
  if (notifyDemo && attendees.length) {
    const highlight = forRsvp
      .filter((e) => new Date(e.inicio) > new Date())
      .slice(0, 3)
    for (const ev of highlight) {
      for (const u of attendees.slice(0, 5)) {
        await AppNotification.findOneAndUpdate(
          {
            tenantId,
            userId: u._id,
            kind: 'event_published',
            refId: ev._id,
          },
          {
            $set: {
              title: `Evento: ${ev.titulo}`.slice(0, 160),
              body: (ev.lugar || ev.descripcion || 'Nuevo evento en la agenda').slice(0, 180),
              href: `/agenda/${ev._id}`,
              refType: 'event',
              readAt: null,
            },
            $setOnInsert: {
              tenantId,
              userId: u._id,
              kind: 'event_published',
              refId: ev._id,
            },
          },
          { upsert: true },
        )
        notifs += 1
      }
    }
  }

  return {
    created,
    updated,
    skipped,
    rsvps,
    notifs,
    total: defs.length,
    brand,
    published: createdEvents.filter((e) => e.status === 'published').length,
    drafts: createdEvents.filter((e) => e.status === 'draft').length,
  }
}

/** CLI */
async function main() {
  const args = process.argv.slice(2)
  const empCodigo = String(args.find((a) => !a.startsWith('--')) || 'ARCOR')
    .trim()
    .toUpperCase()
  const force = args.includes('--force') || !args.includes('--no-force')
  const enableCal = args.includes('--enable-calendars')

  await connectDB()
  const tenant = await Tenant.findOne({ empCodigo })
  if (!tenant) {
    console.error(`Tenant ${empCodigo} no encontrado. Corré primero npm run seed.`)
    process.exit(1)
  }
  const users = await User.find({ tenantId: tenant._id, activo: true }).limit(40)
  const author =
    users.find((u) => u.usuario === 'comunicacion') ||
    users.find((u) => (u.roles || []).includes('admin')) ||
    users[0]

  const result = await seedEventsForTenant({
    tenant,
    users,
    brandName: tenant.nombre || empCodigo,
    author,
    enableExternalCalendars: enableCal,
    force,
    notifyDemo: true,
  })
  console.log(
    `Eventos ${empCodigo}: ${result.created} nuevos · ${result.updated} actualizados · ${result.skipped} omitidos · ${result.published} publicados · ${result.drafts} borradores · ${result.rsvps} RSVPs · ${result.notifs} avisos · menú Agenda/Eventos OK`,
  )
  await mongoose.disconnect()
}

const isDirect = (() => {
  const entry = String(process.argv[1] || '').replace(/\\/g, '/')
  return entry.endsWith('/seedEvents.js') || entry.endsWith('\\seedEvents.js')
})()

if (isDirect) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
