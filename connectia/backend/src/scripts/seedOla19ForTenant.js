/**
 * Seed genérico Ola 19 (catálogos + legajos + plantillas onboarding/egreso).
 * Idempotente por tenant.
 */
import { User } from '../models/User.js'
import { Survey } from '../models/Survey.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { HrCatalog } from '../models/HrCatalog.js'
import { OnboardingTemplate } from '../models/OnboardingTemplate.js'
import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { seedHrCatalogsForTenant } from '../lib/hrCatalog.js'
import { seedFromUser } from '../lib/employeeLegajo.js'
import { snapshotMilestonesFromTemplate, originKeyFor } from '../lib/onboarding.js'
import { ensureOla19MenuItems } from '../lib/ensureOla19Menu.js'

/**
 * @param {object} opts
 * @param {import('mongoose').Document} opts.tenant
 * @param {string} [opts.brandName]
 * @param {import('mongoose').Document} [opts.author] usuario RRHH/admin
 * @param {string[]} [opts.onboardUsuarios] usuarios a iniciar onboarding
 * @param {string[]} [opts.offboardUsuarios] usuarios a iniciar offboarding (demo)
 */
export async function seedOla19ForTenant({
  tenant,
  brandName = 'Connectia',
  author = null,
  onboardUsuarios = [],
  offboardUsuarios = [],
} = {}) {
  if (!tenant?._id) throw new Error('tenant requerido')

  await ensureOla19MenuItems(tenant._id)
  tenant.peopleCare = { enabled: true, label: 'Mi legajo', ...(tenant.peopleCare?.toObject?.() || tenant.peopleCare || {}) }
  if (typeof tenant.markModified === 'function') tenant.markModified('peopleCare')
  await tenant.save()

  const hr = await seedHrCatalogsForTenant(HrCatalog, tenant._id)

  const users = await User.find({ tenantId: tenant._id, activo: true }).limit(50)
  const authorUser = author || users.find((u) => (u.roles || []).includes('admin')) || users[0]
  let legajosCreated = 0

  for (const u of users) {
    const existing = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: u._id })
    if (existing) continue
    const seeded = seedFromUser(u)
    await EmployeeLegajo.create({
      tenantId: tenant._id,
      userId: u._id,
      ...seeded,
      numeroLegajo: seeded.numeroLegajo || u.idExterno || `L-${String(u._id).slice(-6)}`,
      estadoLaboral: 'activo',
      activo: true,
      cargo: u.cargo || seeded.cargo || 'Colaborador',
      areaId: u.areaId || null,
      clasificacion: 'planta',
      subestado: 'ok',
      nacionalidad: 'AR',
      domicilios: [
        {
          tipo: 'particular',
          calle: 'Av. Principal',
          numero: '100',
          localidad: brandName,
          provincia: 'CABA',
          pais: 'AR',
          principal: true,
        },
      ],
      obraSocial: { nombre: 'OSDE', numeroAfiliado: `${brandName}-${u.idExterno || 'X'}`, plan: '210' },
      datosBancarios: [
        {
          banco: 'Banco Galicia',
          tipoCuenta: 'sueldo',
          cbu: `0070${String(u.idExterno || '1000').replace(/\D/g, '').padEnd(12, '0').slice(0, 12)}0001`,
          alias: `${u.usuario}.sueldo`,
          titular: [u.nombre, u.apellido].filter(Boolean).join(' '),
          principal: true,
        },
      ],
      fichaMedica: {
        grupoSanguineo: 'O+',
        contactoEmergenciaNombre: 'Familiar',
        contactoEmergenciaTel: '1100000000',
      },
      contratos: [
        {
          tipo: 'rel_dep',
          numero: `CTR-${u.idExterno || '1'}`,
          fechaInicio: new Date(),
          modalidad: 'hibrido',
          activo: true,
        },
      ],
      carrera: {
        capacitaciones: [{ nombre: `Inducción ${brandName}`, institucion: brandName, fecha: new Date(), horas: 4 }],
        skills: [{ nombre: 'Trabajo en equipo', nivel: 'intermedio' }],
      },
    })
    legajosCreated += 1
  }

  const invitedCount = users.length
  const authorName = authorUser
    ? [authorUser.nombre, authorUser.apellido].filter(Boolean).join(' ') || authorUser.usuario
    : 'RRHH'

  async function upsertSurvey(titulo, purpose, questions) {
    let s = await Survey.findOne({ tenantId: tenant._id, titulo })
    if (!s) {
      s = await Survey.create({
        tenantId: tenant._id,
        titulo,
        descripcion: `${purpose} · ${brandName}`,
        status: 'published',
        purpose,
        publishedAt: new Date(),
        version: 1,
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        audienceSnapshot: {
          invitedCount,
          capturedAt: new Date(),
          mode: 'all',
          areaIds: [],
          groupIds: [],
        },
        anonymous: false,
        authorId: authorUser?._id || null,
        authorName,
        questions,
      })
    } else if (s.purpose !== purpose) {
      s.purpose = purpose
      await s.save()
    }
    return s
  }

  const onboardSurvey = await upsertSurvey(`Bienvenida ${brandName} — primer día`, 'onboarding', [
    {
      id: 'q_ob_1',
      texto: '¿Recibiste tu kit de bienvenida?',
      tipo: 'single',
      required: true,
      opciones: ['Sí', 'Parcialmente', 'Aún no'],
      grupo: 'Ingreso',
    },
    {
      id: 'q_ob_2',
      texto: 'Comentarios',
      tipo: 'text',
      required: false,
      opciones: [],
      grupo: 'Ingreso',
    },
  ])

  const exitSurvey = await upsertSurvey(`Encuesta de salida ${brandName}`, 'offboarding', [
    {
      id: 'q_off_1',
      texto: '¿Motivo principal de egreso?',
      tipo: 'single',
      required: true,
      opciones: ['Oportunidad externa', 'Motivos personales', 'Otro'],
      grupo: 'Egreso',
    },
    {
      id: 'q_off_2',
      texto: '¿Recomendarías la empresa?',
      tipo: 'rating',
      required: true,
      opciones: [],
      grupo: 'Egreso',
    },
  ])

  let onboardTpl = await OnboardingTemplate.findOne({
    tenantId: tenant._id,
    nombre: `Ingreso estándar ${brandName}`,
  })
  if (!onboardTpl) {
    onboardTpl = await OnboardingTemplate.create({
      tenantId: tenant._id,
      kind: 'onboarding',
      nombre: `Ingreso estándar ${brandName}`,
      descripcion: 'Plantilla ola 19',
      version: 1,
      status: 'published',
      publishedAt: new Date(),
      slaDias: 14,
      authorId: authorUser?._id || null,
      authorName,
      milestones: [
        {
          key: 'politicas',
          titulo: 'Leer políticas',
          tipo: 'content',
          orden: 1,
          contentUrl: '/politicas',
          obligatorio: true,
        },
        {
          key: 'encuesta',
          titulo: 'Encuesta de bienvenida',
          tipo: 'survey',
          orden: 2,
          dependsOn: ['politicas'],
          surveyId: onboardSurvey._id,
          obligatorio: true,
        },
        {
          key: 'equipo',
          titulo: 'Presentarte al equipo',
          tipo: 'task',
          orden: 3,
          dependsOn: ['encuesta'],
          obligatorio: true,
        },
      ],
    })
  }

  let offTpl = await OnboardingTemplate.findOne({
    tenantId: tenant._id,
    nombre: `Egreso estándar ${brandName}`,
  })
  if (!offTpl) {
    offTpl = await OnboardingTemplate.create({
      tenantId: tenant._id,
      kind: 'offboarding',
      nombre: `Egreso estándar ${brandName}`,
      descripcion: 'Checklist de egreso ola 19',
      version: 1,
      status: 'published',
      publishedAt: new Date(),
      slaDias: 10,
      authorId: authorUser?._id || null,
      authorName,
      milestones: [
        {
          key: 'activos',
          titulo: 'Devolver activos',
          tipo: 'checklist',
          orden: 1,
          obligatorio: true,
        },
        {
          key: 'encuesta_salida',
          titulo: 'Encuesta de salida',
          tipo: 'survey',
          orden: 2,
          dependsOn: ['activos'],
          surveyId: exitSurvey._id,
          obligatorio: true,
        },
      ],
    })
  }

  async function startProcess(usuario, tpl) {
    if (!tpl) return false
    const u = users.find((x) => x.usuario === usuario)
    if (!u) return false
    const originKey = originKeyFor({ userId: u._id, kind: tpl.kind, templateId: tpl._id })
    const existing = await OnboardingInstance.findOne({ tenantId: tenant._id, originKey })
    if (existing) return false
    const startedAt = new Date()
    const leg = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: u._id }).lean()
    await OnboardingInstance.create({
      tenantId: tenant._id,
      kind: tpl.kind,
      templateId: tpl._id,
      templateName: tpl.nombre,
      templateVersion: tpl.version || 1,
      milestones: snapshotMilestonesFromTemplate(tpl, startedAt),
      status: 'in_progress',
      userId: u._id,
      userName: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      legajoId: leg?._id || null,
      progressPercent: 0,
      startedAt,
      originKey,
      history: [
        {
          at: startedAt,
          actorId: authorUser?._id || null,
          actorName: authorName,
          action: 'started',
          detail: tpl.nombre,
        },
      ],
    })
    return true
  }

  let onboardStarted = 0
  for (const u of onboardUsuarios) {
    if (await startProcess(u, onboardTpl)) onboardStarted += 1
  }
  let offStarted = 0
  for (const u of offboardUsuarios) {
    if (await startProcess(u, offTpl)) offStarted += 1
  }

  return {
    catalogsCreated: hr.created,
    legajosCreated,
    onboardStarted,
    offStarted,
  }
}
