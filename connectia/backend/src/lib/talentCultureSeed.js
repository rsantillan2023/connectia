/**
 * Seed demo Ola 27 (talento + cultura) para un tenant.
 */
import { MenuItem } from '../models/MenuItem.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import {
  OkrCycle,
  Okr,
  PerformanceCycle,
  CareerPlan,
  LmsCourse,
  LmsEnrollment,
  InternalVacancy,
} from '../models/Talent.js'
import {
  CultureValue,
  Recognition,
  MarketplaceListing,
  PulseCampaign,
  Referral,
} from '../models/Culture.js'
import { OLA27_MENU_ITEMS } from './ensureOla27Menu.js'
import { TALENT_CAPS } from './talent.js'
import { CULTURE_CAPS } from './culture.js'
import { displayName } from './talent.js'
import { ensureDefaultPointsRules } from './pointsRules.js'

export const OLA27_PRODUCT_CAPS = [...TALENT_CAPS, ...CULTURE_CAPS]

export async function ensureOla27Capabilities(tenantId) {
  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return { added: [] }
  const caps = new Set(tenant.capabilities || [])
  const added = []
  for (const c of OLA27_PRODUCT_CAPS) {
    if (!caps.has(c)) {
      caps.add(c)
      added.push(c)
    }
  }
  if (added.length) {
    tenant.capabilities = [...caps]
    tenant.menuVersion = (tenant.menuVersion || 1) + 1
    await tenant.save()
  }
  return { added }
}

export async function ensureOla27MenuSeed(tenantId) {
  for (const item of OLA27_MENU_ITEMS) {
    const existing = await MenuItem.findOne({ tenantId, key: item.key })
    if (existing) {
      if (!existing.activo) {
        existing.activo = true
        await existing.save()
      }
      continue
    }
    await MenuItem.create({
      tenantId,
      ...item,
      activo: true,
      audience: { roles: [], capabilities: [] },
    })
  }
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ brandName?: string }} [opts]
 */
export async function seedTalentCultureForTenant(tenantId, opts = {}) {
  const brand = opts.brandName || 'Connectia'
  await ensureOla27Capabilities(tenantId)
  await ensureOla27MenuSeed(tenantId)
  try {
    await ensureDefaultPointsRules(tenantId)
  } catch (err) {
    console.warn('[ola27-seed] points rules', err?.message || err)
  }

  const users = await User.find({ tenantId, activo: true }).limit(8).lean()
  const admin = users.find((u) => (u.roles || []).includes('admin')) || users[0]
  const member = users.find((u) => String(u._id) !== String(admin?._id)) || users[0]

  let cycle = await OkrCycle.findOne({ tenantId, nombre: 'Q3 Demo' })
  if (!cycle) {
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 3)
    cycle = await OkrCycle.create({
      tenantId,
      nombre: 'Q3 Demo',
      descripcion: `Ciclo OKR demo · ${brand}`,
      startsAt: now,
      endsAt: end,
      status: 'active',
    })
  }

  if (member) {
    const existingOkr = await Okr.findOne({ tenantId, ownerId: member._id, cycleId: cycle._id })
    if (!existingOkr) {
      await Okr.create({
        tenantId,
        cycleId: cycle._id,
        ownerId: member._id,
        ownerName: displayName(member),
        titulo: 'Mejorar adopción de la app interna',
        descripcion: 'Impulsar el uso activo de Connectia en el equipo.',
        keyResults: [
          { titulo: 'Usuarios activos semanales', target: 100, current: 42, unit: 'usuarios' },
          { titulo: 'Publicaciones del equipo', target: 20, current: 8, unit: 'posts' },
        ],
        progress: 40,
        status: 'active',
        createdBy: admin?._id || member._id,
      })
    }

    const plan = await CareerPlan.findOne({ tenantId, userId: member._id })
    if (!plan) {
      await CareerPlan.create({
        tenantId,
        userId: member._id,
        userName: displayName(member),
        currentRole: 'Analista',
        targetRole: 'Líder de equipo',
        skillGaps: ['Liderazgo', 'Comunicación'],
        milestones: [
          { titulo: 'Completar curso de liderazgo', done: false },
          { titulo: 'Mentoría con líder actual', done: false, proposedByLeader: true },
        ],
        status: 'active',
      })
    }
  }

  let perf = await PerformanceCycle.findOne({ tenantId, nombre: 'Evaluación anual demo' })
  if (!perf) {
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)
    await PerformanceCycle.create({
      tenantId,
      nombre: 'Evaluación anual demo',
      descripcion: 'Ciclo formal de desempeño',
      startsAt: now,
      endsAt: end,
      status: 'active',
      allowSelf: true,
      allowLeader: true,
      allowPeer: false,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    })
  }

  let course = await LmsCourse.findOne({ tenantId, titulo: 'Bienvenida a Connectia' })
  if (!course) {
    course = await LmsCourse.create({
      tenantId,
      titulo: 'Bienvenida a Connectia',
      descripcion: 'Conocé la plataforma y sus módulos principales.',
      category: 'onboarding',
      durationMinutes: 20,
      contentHtml:
        '<p>Este curso te guía por muro, solicitudes, beneficios y cultura.</p><p>Marcá progreso al avanzar.</p>',
      quiz: [
        {
          pregunta: '¿Dónde ves las publicaciones de la comunidad?',
          opciones: ['Muro', 'Billetera', 'TV'],
          correcta: 0,
        },
      ],
      mandatory: true,
      status: 'published',
      audience: { mode: 'all' },
      authorId: admin?._id,
      authorName: admin ? displayName(admin) : 'Admin',
      publishedAt: new Date(),
    })
  }

  if (member && course) {
    const en = await LmsEnrollment.findOne({ tenantId, courseId: course._id, userId: member._id })
    if (!en) {
      await LmsEnrollment.create({
        tenantId,
        courseId: course._id,
        userId: member._id,
        userName: displayName(member),
        progress: 0,
        mandatory: true,
        assignedBy: admin?._id,
      })
    }
  }

  let vacancy = await InternalVacancy.findOne({ tenantId, titulo: 'Analista de People' })
  if (!vacancy) {
    vacancy = await InternalVacancy.create({
      tenantId,
      titulo: 'Analista de People',
      descripcion: 'Vacante interna demo para movilidad.',
      area: 'People',
      ubicacion: 'Híbrido',
      requirements: 'Experiencia en RRHH y comunicación.',
      status: 'open',
      audience: { mode: 'all' },
      authorId: admin?._id,
      authorName: admin ? displayName(admin) : 'Talent',
      publishedAt: new Date(),
    })
  }

  const valuesSeed = [
    { nombre: 'Colaboración', descripcion: 'Trabajamos juntos', color: '#0f766e', orden: 10 },
    { nombre: 'Innovación', descripcion: 'Buscamos mejorar', color: '#0369a1', orden: 20 },
    { nombre: 'Cuidado', descripcion: 'Personas primero', color: '#b45309', orden: 30 },
  ]
  for (const v of valuesSeed) {
    const exists = await CultureValue.findOne({ tenantId, nombre: v.nombre })
    if (!exists) await CultureValue.create({ tenantId, ...v, activo: true })
  }

  if (admin && member) {
    const rec = await Recognition.findOne({ tenantId, fromUserId: admin._id, toUserId: member._id })
    if (!rec) {
      const val = await CultureValue.findOne({ tenantId, nombre: 'Colaboración' })
      await Recognition.create({
        tenantId,
        fromUserId: admin._id,
        fromName: displayName(admin),
        toUserId: member._id,
        toName: displayName(member),
        valueId: val?._id,
        valueName: val?.nombre || 'Colaboración',
        mensaje: `¡Gracias por impulsar la comunidad ${brand}!`,
        visibility: 'public',
      })
    }
  }

  const listing = await MarketplaceListing.findOne({ tenantId, titulo: 'Monitor 24" (demo)' })
  if (!listing && member) {
    await MarketplaceListing.create({
      tenantId,
      authorId: member._id,
      authorName: displayName(member),
      titulo: 'Monitor 24" (demo)',
      descripcion: 'Clasificado de ejemplo · acuerdo fuera de la app.',
      category: 'venta',
      precio: 'Consultar',
      status: 'published',
      contactNote: 'Escribime por chat',
    })
  }

  let pulse = await PulseCampaign.findOne({ tenantId, nombre: 'Pulso semanal demo' })
  if (!pulse) {
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 14)
    await PulseCampaign.create({
      tenantId,
      nombre: 'Pulso semanal demo',
      descripcion: 'eNPS liviano de clima',
      questions: [
        { tipo: 'enps', texto: '¿Qué tan probable es que recomiendes trabajar acá a un amigo?' },
        { tipo: 'text', texto: '¿Qué mejorarías esta semana?' },
      ],
      startsAt: now,
      endsAt: end,
      anonymityThreshold: 3,
      status: 'active',
      audience: { mode: 'all' },
    })
  }

  if (member && vacancy) {
    const ref = await Referral.findOne({ tenantId, referrerId: member._id })
    if (!ref) {
      await Referral.create({
        tenantId,
        vacancyId: vacancy._id,
        vacancyTitle: vacancy.titulo,
        referrerId: member._id,
        referrerName: displayName(member),
        candidateName: 'Candela Demo',
        candidateEmail: 'candela.demo@example.com',
        notes: 'Referido de ejemplo',
        status: 'submitted',
      })
    }
  }

  return {
    ok: true,
    caps: OLA27_PRODUCT_CAPS,
    users: users.length,
  }
}
