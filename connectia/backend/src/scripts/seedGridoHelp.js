import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { Policy } from '../models/Policy.js'
import { MenuItem } from '../models/MenuItem.js'
import { User } from '../models/User.js'
import { syncKbSource } from '../services/kbIndex.js'

await connectDB()

const HELP_MENU = [
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 45, channel: 'u' },
  { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield', order: 46, channel: 'u' },
  { key: 'admin.ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 46.5, channel: 'a' },
  {
    key: 'admin.politicas',
    label: 'Políticas y cumplimiento',
    route: '/politicas',
    icon: 'shield',
    order: 46.7,
    channel: 'a',
  },
]

function brandName(tenant) {
  return tenant.nombre || tenant.empCodigo || 'la comunidad'
}

async function seedHelpForTenant(tenant, { force = false } = {}) {
  const brand = brandName(tenant)
  const audience = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }

  for (const item of HELP_MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }
  tenant.menuVersion = (tenant.menuVersion || 1) + 1
  await tenant.save()

  const faqCount = await Faq.countDocuments({ tenantId: tenant._id })
  if (force || faqCount === 0) {
    if (force && faqCount) await Faq.deleteMany({ tenantId: tenant._id })
    const faqs = await Faq.create([
      {
        tenantId: tenant._id,
        category: 'Locales',
        pregunta: '¿Cómo marco asistencia en mi heladería?',
        respuesta:
          `Desde Connectia abrí Mis solicitudes (o el acceso rápido del hub) y elegí la plantilla de asistencia/turno. Completá el local y el horario. En ${brand} el estado lo ve el encargado del local.`,
        keywords: ['asistencia', 'turno', 'local', 'marcar'],
        orden: 10,
        status: 'published',
        audience,
        authorName: 'Operaciones',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'Comunicación',
        pregunta: '¿Dónde veo las novedades de la red?',
        respuesta:
          'En Publicaciones (Home). Ahí aparecen lanzamientos de sabor, campañas y avisos de la red. También podés guardar posts importantes en Mis guardados.',
        keywords: ['novedades', 'muro', 'campaña', 'sabor'],
        orden: 20,
        status: 'published',
        audience,
        authorName: 'Comunicación',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'RRHH',
        pregunta: '¿Cómo pido vacaciones o un permiso?',
        respuesta:
          'Menú → Mis solicitudes → Nueva → plantilla de vacaciones/permiso. Completá fechas y motivo. Vas a ver el estado en la misma pantalla cuando lo aprueben.',
        keywords: ['vacaciones', 'permiso', 'licencia'],
        orden: 30,
        status: 'published',
        audience,
        authorName: 'RRHH',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'Connectia',
        pregunta: '¿Dónde están los documentos del local?',
        respuesta:
          'En Mis documentos. Hay carpetas por categoría (RRHH, operaciones, marca). Si un archivo pide firma, tenés que aceptarlo antes de descargarlo.',
        keywords: ['documentos', 'manual', 'marca'],
        orden: 40,
        status: 'published',
        audience,
        authorName: 'Soporte',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
    ])
    for (const f of faqs) {
      await syncKbSource('faq', f)
      await f.save()
    }
    console.log(`  FAQs: ${faqs.length}`)
  } else {
    console.log(`  FAQs ya existen (${faqCount})`)
  }

  const tutCount = await Tutorial.countDocuments({ tenantId: tenant._id })
  if (force || tutCount === 0) {
    if (force && tutCount) await Tutorial.deleteMany({ tenantId: tenant._id })
    const tutorials = await Tutorial.create([
      {
        tenantId: tenant._id,
        category: 'Primeros pasos',
        titulo: 'Primeros pasos en Connectia (Grido)',
        descripcion: `Cómo moverte en la app de ${brand}: muro, solicitudes y ayuda.`,
        moduloRelacionado: 'muro',
        keywords: ['onboarding', 'primeros pasos', 'grido'],
        orden: 10,
        status: 'published',
        showOnFirstLogin: true,
        audience,
        authorName: brand,
        publishedAt: new Date(),
        steps: [
          {
            orden: 1,
            titulo: 'Abrí el menú',
            cuerpo: 'Tocá Menú (abajo a la derecha). Ahí están Ayuda, Políticas, Documentos y más.',
            mediaType: 'none',
          },
          {
            orden: 2,
            titulo: 'Mirá el muro',
            cuerpo: 'En Home ves las novedades de la red. Reaccioná y comentá cuando esté habilitado.',
            mediaType: 'none',
          },
          {
            orden: 3,
            titulo: 'Pedí lo que necesites',
            cuerpo: 'En Mis solicitudes cargás vacaciones, permisos u otros trámites del local.',
            mediaType: 'none',
          },
        ],
      },
      {
        tenantId: tenant._id,
        category: 'Operaciones',
        titulo: 'Responder una encuesta de clima / local',
        descripcion: 'Completá las encuestas que te llegan para tu local o área.',
        moduloRelacionado: 'encuestas',
        keywords: ['encuesta', 'clima', 'local'],
        orden: 20,
        status: 'published',
        audience,
        authorName: brand,
        publishedAt: new Date(),
        steps: [
          {
            orden: 1,
            titulo: 'Entrá a Encuestas',
            cuerpo: 'Desde el menú o el aviso push. Las pendientes aparecen arriba.',
            mediaType: 'none',
          },
          {
            orden: 2,
            titulo: 'Respondé y enviá',
            cuerpo: 'Completá las preguntas obligatorias. Si es anónima, no se verá tu nombre en resultados.',
            mediaType: 'none',
          },
        ],
      },
    ])
    for (const t of tutorials) {
      await syncKbSource('tutorial', t)
      await t.save()
    }
    console.log(`  Tutoriales: ${tutorials.length}`)
  } else {
    console.log(`  Tutoriales ya existen (${tutCount})`)
  }

  const polCount = await Policy.countDocuments({ tenantId: tenant._id })
  if (force || polCount === 0) {
    if (force && polCount) await Policy.deleteMany({ tenantId: tenant._id })
    const policies = await Policy.create([
      {
        tenantId: tenant._id,
        codigo: 'ETH-GRIDO',
        titulo: 'Código de conducta en el local',
        resumen: 'Respeto, higiene y atención al cliente en la red.',
        cuerpo:
          `Código de conducta — ${brand}\n\n` +
          '1. Trato respetuoso a clientes y compañeros.\n' +
          '2. Cumplir normas de higiene y seguridad alimentaria.\n' +
          '3. Cuidar la imagen de marca en el salón y en redes.\n' +
          '4. No compartir credenciales de sistemas.\n\n' +
          'Al aceptar confirmás haber leído esta versión.',
        category: 'Ética',
        keywords: ['conducta', 'local', 'marca'],
        version: '1',
        status: 'published',
        requiresAck: true,
        mandatory: true,
        audience,
        authorName: 'Legal',
        publishedAt: new Date(),
        acks: [],
      },
      {
        tenantId: tenant._id,
        codigo: 'SEC-GRIDO',
        titulo: 'Uso responsable de Connectia',
        resumen: 'Datos, contraseñas y dispositivos del equipo.',
        cuerpo:
          'No compartas tu usuario ni contraseña. Bloqueá el dispositivo al alejarte. ' +
          'Reportá incidentes a tu encargado o a TI. Una nueva versión de esta política pide re-aceptación.',
        category: 'Seguridad',
        keywords: ['seguridad', 'password', 'datos'],
        version: '1',
        status: 'published',
        requiresAck: true,
        mandatory: false,
        audience,
        authorName: 'TI',
        publishedAt: new Date(),
        acks: [],
      },
    ])
    for (const p of policies) {
      await syncKbSource('policy', p)
      await p.save()
    }
    console.log(`  Políticas: ${policies.length}`)
  } else {
    console.log(`  Políticas ya existen (${polCount})`)
  }

  const users = await User.find({ tenantId: tenant._id, activo: true })
    .select('usuario roles')
    .limit(6)
    .lean()
  console.log(
    '  Usuarios demo:',
    users.map((u) => u.usuario).join(', ') || '(ninguno)',
  )
}

const codes = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const force = process.argv.includes('--force')
const filter = codes.length
  ? { empCodigo: { $in: codes.map((c) => c.toUpperCase()) } }
  : {
      $or: [
        { empCodigo: /^GRIDO/i },
        { nombre: /grido/i },
      ],
    }

const tenants = await Tenant.find(filter)
if (!tenants.length) {
  console.log('No se encontró tenant Grido. Códigos en DB:')
  const all = await Tenant.find({}).select('empCodigo nombre').lean()
  for (const t of all) console.log(`  ${t.empCodigo} | ${t.nombre}`)
  process.exit(1)
}

for (const t of tenants) {
  console.log(`→ ${t.empCodigo} (${t.nombre})`)
  await seedHelpForTenant(t, { force })
}

console.log('Listo. Recargá la app (F5) y abrí /ayuda y /politicas.')
process.exit(0)
