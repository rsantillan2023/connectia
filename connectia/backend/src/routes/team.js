/**
 * API U — Mi equipo / composer (Ola 32).
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { TeamScope, serializeTeamScope } from '../models/TeamScope.js'
import { User } from '../models/User.js'
import { Post } from '../models/Post.js'
import { Event } from '../models/Event.js'
import { AppNotification } from '../models/AppNotification.js'
import {
  forceTeamAudience,
  moduleAllowed,
  refreshTeamScope,
  loadScopeForSupervisor,
  teamsContainingMember,
  TEAM_MODULES,
} from '../lib/teamScope.js'
import { ensureOla32MenuItems } from '../lib/ensureOla32Menu.js'
import { notifyUsersTeam } from '../services/notifyTeam.js'
import { SupTarea } from '../models/Supervision.js'
import { Chat } from '../models/Chat.js'
import { Survey } from '../models/Survey.js'
import { DocItem } from '../models/DocItem.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { FieldAssignment } from '../models/FieldAssignment.js'
import { notifySurveyPublished } from '../services/notifySurvey.js'
import { usersFilterForAudience } from '../lib/audience.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function requireEquipoCap(req, res) {
  if (!hasCapability(req.user, req.tenant, 'supervision.equipo')) {
    res.status(403).json({ error: 'Módulo Mi equipo no habilitado' })
    return false
  }
  return true
}

function caps(req) {
  return req.tenant?.capabilities || []
}

function hasRelevamientosCap(req) {
  const c = caps(req)
  return (
    c.includes('relevamientos') ||
    c.includes('campo.relevamientos') ||
    c.includes('relevamientos.ejecutar')
  )
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function isAdminLike(user) {
  const roles = user?.roles || []
  return roles.includes('admin') || roles.includes('platform')
}

async function getOwnedScopes(tenantId, userId) {
  return TeamScope.find({ tenantId, supervisorId: userId, activo: true }).sort({ nombre: 1 })
}

router.use(requireAuth)

router.post('/ensure-menu', async (req, res) => {
  if (!isAdminLike(req.user) && !hasCapability(req.user, req.tenant, 'admin.equipos')) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  await ensureOla32MenuItems(req.tenant._id)
  const set = new Set(req.tenant.capabilities || [])
  set.add('supervision.equipo')
  for (const m of TEAM_MODULES) {
    set.add(`supervision.equipo.${m}`)
  }
  req.tenant.capabilities = [...set]
  await req.tenant.save()
  res.json({ ok: true, capabilities: req.tenant.capabilities })
})

router.get('/meta', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const owned = await getOwnedScopes(req.tenant._id, req.user._id)
  const asMember = await teamsContainingMember(req.tenant._id, req.user._id)
  res.json({
    isSupervisor: owned.length > 0 || isAdminLike(req.user),
    isMemberOnly: owned.length === 0 && asMember.length > 0,
    modules: TEAM_MODULES,
    teamsCount: owned.length,
  })
})

router.get('/scopes', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const rows = await getOwnedScopes(req.tenant._id, req.user._id)
  res.json({ items: rows.map((d) => serializeTeamScope(d)) })
})

router.get('/scopes/:id', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const scope = await loadScopeForSupervisor(req.tenant._id, req.params.id, req.user._id, {
    admin: isAdminLike(req.user),
  })
  if (!scope) return res.status(404).json({ error: 'Equipo no encontrado' })
  res.json({ item: serializeTeamScope(scope) })
})

router.post('/scopes/:id/refresh', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const scope = await loadScopeForSupervisor(req.tenant._id, req.params.id, req.user._id, {
    admin: isAdminLike(req.user),
  })
  if (!scope) return res.status(404).json({ error: 'Equipo no encontrado' })
  await refreshTeamScope(scope)
  res.json({ item: serializeTeamScope(scope) })
})

router.get('/scopes/:id/members', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido' })
  const scope = await loadScopeForSupervisor(req.tenant._id, req.params.id, req.user._id, {
    admin: isAdminLike(req.user),
  })
  if (!scope) return res.status(404).json({ error: 'Equipo no encontrado' })
  const users = await User.find({
    tenantId: req.tenant._id,
    _id: { $in: scope.memberIds || [] },
    activo: true,
  })
    .select('nombre apellido usuario email avatarUrl cargo areaId')
    .limit(500)
    .lean()
  res.json({
    items: users.map((u) => ({
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      email: u.email || '',
      avatarUrl: u.avatarUrl || '',
      cargo: u.cargo || '',
    })),
  })
})

router.get('/hub', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scopes = await getOwnedScopes(req.tenant._id, req.user._id)
  if (!scopes.length) {
    const asMember = await teamsContainingMember(req.tenant._id, req.user._id)
    return res.json({
      role: 'member',
      teams: asMember.map((t) => ({
        id: String(t._id),
        nombre: t.nombre,
        memberCount: t.memberCount || 0,
      })),
      counters: { members: 0, openTasks: 0, pendingRelevamientos: 0, unreadNotifs: 0 },
      relevamientosEnabled: hasRelevamientosCap(req),
    })
  }

  const allMemberIds = [...new Set(scopes.flatMap((s) => (s.memberIds || []).map(String)))]
  let openTasks = 0
  if (allMemberIds.length && caps(req).includes('supervision.comercial')) {
    openTasks = await SupTarea.countDocuments({
      tenantId: req.tenant._id,
      asignadoId: { $in: allMemberIds },
      status: { $in: ['pendiente', 'asignacion', 'en_progreso'] },
    })
  }

  let pendingRelevamientos = 0
  if (allMemberIds.length && hasRelevamientosCap(req)) {
    pendingRelevamientos = await FieldAssignment.countDocuments({
      tenantId: req.tenant._id,
      operatorId: { $in: allMemberIds },
      day: todayYmd(),
      status: { $in: ['pending', 'in_progress'] },
    })
  }
  const unreadNotifs = await AppNotification.countDocuments({
    tenantId: req.tenant._id,
    userId: req.user._id,
    readAt: null,
    kind: { $regex: /^team/ },
  }).catch(() => 0)

  res.json({
    role: 'supervisor',
    teams: scopes.map((s) => serializeTeamScope(s)),
    counters: {
      members: allMemberIds.length,
      openTasks,
      pendingRelevamientos,
      unreadNotifs,
    },
    relevamientosEnabled: hasRelevamientosCap(req),
  })
})

router.get('/members/:userId', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  if (!ObjectId.isValid(req.params.userId)) return res.status(400).json({ error: 'ID inválido' })
  const scopes = await getOwnedScopes(req.tenant._id, req.user._id)
  const allowed = new Set(scopes.flatMap((s) => (s.memberIds || []).map(String)))
  if (!allowed.has(String(req.params.userId)) && !isAdminLike(req.user)) {
    return res.status(403).json({ error: 'Fuera de tu alcance' })
  }
  const u = await User.findOne({ _id: req.params.userId, tenantId: req.tenant._id })
    .select('nombre apellido usuario email avatarUrl cargo areaId lastLoginAt')
    .lean()
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })

  const posts = await Post.find({
    tenantId: req.tenant._id,
    status: 'published',
    'audience.mode': 'users',
    'audience.userIds': u._id,
  })
    .sort({ publishedAt: -1 })
    .limit(10)
    .select('titulo publishedAt tipo')
    .lean()

  let tasks = []
  if (caps(req).includes('supervision.comercial')) {
    tasks = await SupTarea.find({
      tenantId: req.tenant._id,
      asignadoId: u._id,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('titulo status prioridad fechaLimite')
      .lean()
  }

  let relevamientos = []
  if (hasRelevamientosCap(req)) {
    relevamientos = await FieldAssignment.find({
      tenantId: req.tenant._id,
      operatorId: u._id,
    })
      .sort({ day: -1, order: 1 })
      .limit(15)
      .select('day status stopLabel modality formSnapshot formVersion submittedAt')
      .lean()
  }

  const absences = await AbsenceRequest.find({
    tenantId: req.tenant._id,
    requesterId: u._id,
  })
    .sort({ desde: -1 })
    .limit(8)
    .select('tipoNombre desde hasta estado dias')
    .lean()
    .catch(() => [])

  const licenses = await LicenseRequest.find({
    tenantId: req.tenant._id,
    requesterId: u._id,
  })
    .sort({ desde: -1 })
    .limit(8)
    .select('tipoNombre desde hasta estado dias')
    .lean()
    .catch(() => [])

  res.json({
    item: {
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      email: u.email || '',
      avatarUrl: u.avatarUrl || '',
      cargo: u.cargo || '',
      lastLoginAt: u.lastLoginAt,
    },
    activity: {
      posts: posts.map((p) => ({
        id: String(p._id),
        titulo: p.titulo,
        tipo: p.tipo,
        at: p.publishedAt,
      })),
      tasks: tasks.map((t) => ({
        id: String(t._id),
        titulo: t.titulo,
        status: t.status,
        prioridad: t.prioridad,
        fechaLimite: t.fechaLimite,
      })),
      relevamientos: relevamientos.map((r) => ({
        id: String(r._id),
        day: r.day,
        status: r.status,
        stopLabel: r.stopLabel || '',
        formTitle: r.formSnapshot?.titulo || 'Relevamiento',
        modality: r.modality,
        submittedAt: r.submittedAt,
      })),
      absences: (absences || []).map((a) => ({
        id: String(a._id),
        tipo: a.tipoNombre,
        desde: a.desde,
        hasta: a.hasta,
        estado: a.estado,
        dias: a.dias,
      })),
      licenses: (licenses || []).map((a) => ({
        id: String(a._id),
        tipo: a.tipoNombre,
        desde: a.desde,
        hasta: a.hasta,
        estado: a.estado,
        dias: a.dias,
      })),
    },
  })
})

router.get('/timeline', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scopeId = req.query.scopeId
  let memberIds = []
  if (scopeId && ObjectId.isValid(scopeId)) {
    const scope = await loadScopeForSupervisor(req.tenant._id, scopeId, req.user._id, {
      admin: isAdminLike(req.user),
    })
    if (!scope) return res.status(404).json({ error: 'Equipo no encontrado' })
    memberIds = (scope.memberIds || []).map(String)
  } else {
    const scopes = await getOwnedScopes(req.tenant._id, req.user._id)
    memberIds = [...new Set(scopes.flatMap((s) => (s.memberIds || []).map(String)))]
  }
  if (!memberIds.length) return res.json({ items: [] })

  const oid = memberIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [posts, events, notifs, absences, licenses, tasks, relevamientos] = await Promise.all([
    Post.find({
      tenantId: req.tenant._id,
      status: 'published',
      authorId: req.user._id,
      'audience.mode': 'users',
      'audience.userIds': { $in: oid },
    })
      .sort({ publishedAt: -1 })
      .limit(20)
      .select('titulo publishedAt')
      .lean(),
    Event.find({
      tenantId: req.tenant._id,
      status: 'published',
      authorId: req.user._id,
      'audience.mode': 'users',
      'audience.userIds': { $in: oid },
    })
      .sort({ inicio: -1 })
      .limit(20)
      .select('titulo inicio')
      .lean(),
    AppNotification.find({
      tenantId: req.tenant._id,
      userId: { $in: oid },
      kind: { $in: ['team_notice', 'team_post', 'team_event', 'team_survey', 'team_doc', 'relevamiento'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title body kind createdAt userId')
      .lean()
      .catch(() => []),
    AbsenceRequest.find({
      tenantId: req.tenant._id,
      requesterId: { $in: oid },
      estado: { $in: ['pendiente', 'aprobada'] },
    })
      .sort({ desde: -1 })
      .limit(15)
      .select('tipoNombre desde requesterName estado')
      .lean()
      .catch(() => []),
    LicenseRequest.find({
      tenantId: req.tenant._id,
      requesterId: { $in: oid },
      estado: { $in: ['pendiente', 'aprobada'] },
    })
      .sort({ desde: -1 })
      .limit(15)
      .select('tipoNombre desde requesterName estado')
      .lean()
      .catch(() => []),
    caps(req).includes('supervision.comercial')
      ? SupTarea.find({
          tenantId: req.tenant._id,
          asignadoId: { $in: oid },
          status: { $in: ['pendiente', 'asignacion', 'en_progreso'] },
        })
          .sort({ fechaLimite: 1 })
          .limit(15)
          .select('titulo status fechaLimite')
          .lean()
      : Promise.resolve([]),
    hasRelevamientosCap(req)
      ? FieldAssignment.find({
          tenantId: req.tenant._id,
          operatorId: { $in: oid },
          day: { $gte: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10) },
        })
          .sort({ day: -1, updatedAt: -1 })
          .limit(25)
          .select('day status stopLabel formSnapshot operatorId submittedAt updatedAt')
          .lean()
      : Promise.resolve([]),
  ])

  const opIds = [...new Set((relevamientos || []).map((r) => String(r.operatorId)))]
  const opUsers = opIds.length
    ? await User.find({ _id: { $in: opIds }, tenantId: req.tenant._id })
        .select('nombre apellido usuario')
        .lean()
    : []
  const opName = Object.fromEntries(
    opUsers.map((u) => [
      String(u._id),
      [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Operador',
    ]),
  )

  const items = [
    ...posts.map((p) => ({
      type: 'post',
      id: String(p._id),
      title: p.titulo,
      at: p.publishedAt,
    })),
    ...events.map((e) => ({
      type: 'event',
      id: String(e._id),
      title: e.titulo,
      at: e.inicio,
    })),
    ...notifs.map((n) => ({
      type: 'notif',
      id: String(n._id),
      title: n.title || n.body,
      at: n.createdAt,
      userId: n.userId ? String(n.userId) : null,
    })),
    ...(absences || []).map((a) => ({
      type: 'absence',
      id: String(a._id),
      title: `${a.requesterName || 'Miembro'}: ${a.tipoNombre} (${a.estado})`,
      at: a.desde,
    })),
    ...(licenses || []).map((a) => ({
      type: 'license',
      id: String(a._id),
      title: `${a.requesterName || 'Miembro'}: licencia ${a.tipoNombre || ''} (${a.estado})`,
      at: a.desde,
    })),
    ...(tasks || []).map((t) => ({
      type: 'task',
      id: String(t._id),
      title: t.titulo,
      at: t.fechaLimite,
      status: t.status,
    })),
    ...(relevamientos || []).map((r) => ({
      type: 'relevamiento',
      id: String(r._id),
      title: `${opName[String(r.operatorId)] || 'Operador'}: ${r.formSnapshot?.titulo || 'Relevamiento'}${r.stopLabel ? ` · ${r.stopLabel}` : ''} (${r.status})`,
      at: r.submittedAt || r.updatedAt || r.day,
      status: r.status,
      day: r.day,
      operatorId: String(r.operatorId),
      href: r.operatorId ? `/mi-equipo/miembro/${r.operatorId}` : null,
    })),
  ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))

  res.json({ items: items.slice(0, 50) })
})

/* —— Composer —— */
async function loadScopeOrFail(req, res) {
  const scopeId = req.body?.scopeId || req.query?.scopeId
  if (!scopeId || !ObjectId.isValid(scopeId)) {
    res.status(400).json({ error: 'scopeId requerido' })
    return null
  }
  const scope = await loadScopeForSupervisor(req.tenant._id, scopeId, req.user._id, {
    admin: isAdminLike(req.user),
  })
  if (!scope) {
    res.status(404).json({ error: 'Equipo no encontrado' })
    return null
  }
  return scope
}

router.post('/compose/post', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'muro', caps(req))) {
    return res.status(403).json({ error: 'Módulo muro no permitido en este equipo' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const titulo = String(req.body?.titulo || '').trim()
  if (!titulo) return res.status(400).json({ error: 'Título requerido' })

  const p = await Post.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 200),
    cuerpo: String(req.body?.cuerpo || '').slice(0, 20000),
    tipo: 'aviso',
    status: 'published',
    publishedAt: new Date(),
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    origin: 'member',
    audience: forced.audience,
    notifyAudience: Boolean(req.body?.notifyAudience),
  })

  if (p.notifyAudience) {
    await notifyUsersTeam({
      tenant: req.tenant,
      userIds: forced.audience.userIds,
      kind: 'team_post',
      title: `Equipo: ${scope.nombre}`,
      body: titulo,
      href: `/muro/${p._id}`,
      refType: 'post',
      refId: p._id,
      excludeUserId: req.user._id,
    })
  }

  res.status(201).json({
    item: { id: String(p._id), titulo: p.titulo, audience: forced.audience },
    correlationId: `team-post-${p._id}`,
  })
})

router.post('/compose/event', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'eventos', caps(req))) {
    return res.status(403).json({ error: 'Módulo eventos no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const titulo = String(req.body?.titulo || '').trim()
  if (!titulo) return res.status(400).json({ error: 'Título requerido' })
  if (!req.body?.inicio || !req.body?.fin) return res.status(400).json({ error: 'inicio/fin requeridos' })

  const e = await Event.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 200),
    descripcion: String(req.body?.descripcion || '').slice(0, 8000),
    inicio: new Date(req.body.inicio),
    fin: new Date(req.body.fin),
    status: 'published',
    publishedAt: new Date(),
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    audience: forced.audience,
    lugar: String(req.body?.lugar || '').slice(0, 240),
  })

  await notifyUsersTeam({
    tenant: req.tenant,
    userIds: forced.audience.userIds,
    kind: 'team_event',
    title: `Evento · ${scope.nombre}`,
    body: titulo,
    href: `/eventos/${e._id}`,
    refType: 'event',
    refId: e._id,
    excludeUserId: req.user._id,
  })

  res.status(201).json({
    item: { id: String(e._id), titulo: e.titulo, audience: forced.audience },
    correlationId: `team-event-${e._id}`,
  })
})

router.post('/compose/notif', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'notif', caps(req))) {
    return res.status(403).json({ error: 'Módulo notif no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const title = String(req.body?.title || req.body?.titulo || '').trim()
  const body = String(req.body?.body || req.body?.mensaje || '').trim()
  if (!title || !body) return res.status(400).json({ error: 'title y body requeridos' })

  const result = await notifyUsersTeam({
    tenant: req.tenant,
    userIds: forced.audience.userIds,
    kind: 'team_notice',
    title: title.slice(0, 120),
    body: body.slice(0, 500),
    href: String(req.body?.href || '/avisos').slice(0, 200),
    refType: 'team',
    refId: scope._id,
    excludeUserId: req.user._id,
  })

  res.status(201).json({
    ok: true,
    audienceSize: forced.audience.userIds.length,
    result,
    correlationId: `team-notif-${scope._id}-${Date.now()}`,
  })
})

router.post('/compose/survey', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'encuestas', caps(req))) {
    return res.status(403).json({ error: 'Módulo encuestas no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const titulo = String(req.body?.titulo || '').trim()
  if (!titulo) return res.status(400).json({ error: 'Título requerido' })

  const questions = Array.isArray(req.body?.questions) && req.body.questions.length
    ? req.body.questions.map((q, i) => ({
        id: String(q.id || `q${i + 1}`),
        texto: String(q.texto || q.text || `Pregunta ${i + 1}`).slice(0, 500),
        tipo: q.tipo || 'yesno',
        required: q.required !== false,
        opciones: Array.isArray(q.opciones) ? q.opciones : ['Sí', 'No'],
        grupo: String(q.grupo || 'General').slice(0, 80),
      }))
    : [
        {
          id: 'q1',
          texto: String(req.body?.pregunta || '¿Cómo estás con el equipo esta semana?').slice(0, 500),
          tipo: 'rating',
          required: true,
          opciones: [],
          grupo: 'Equipo',
        },
      ]

  const invitedCount = await User.countDocuments(
    usersFilterForAudience(req.tenant._id, forced.audience),
  )
  const survey = await Survey.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 160),
    descripcion: String(req.body?.descripcion || `Encuesta del equipo ${scope.nombre}`).slice(0, 4000),
    status: 'published',
    questions,
    audience: forced.audience,
    audienceSnapshot: {
      invitedCount,
      capturedAt: new Date(),
      mode: 'users',
      areaIds: [],
      groupIds: [],
      userIds: forced.audience.userIds,
    },
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    publishedAt: new Date(),
  })

  notifySurveyPublished({ survey: survey.toObject?.() || survey, tenant: req.tenant }).catch(() => {})
  await notifyUsersTeam({
    tenant: req.tenant,
    userIds: forced.audience.userIds,
    kind: 'team_survey',
    title: `Encuesta · ${scope.nombre}`,
    body: titulo,
    href: `/encuestas/${survey._id}`,
    refType: 'survey',
    refId: survey._id,
    excludeUserId: req.user._id,
  })

  res.status(201).json({
    item: { id: String(survey._id), titulo: survey.titulo, audience: forced.audience },
    href: `/encuestas/${survey._id}`,
    correlationId: `team-survey-${survey._id}`,
  })
})

router.post('/compose/doc', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'docs', caps(req))) {
    return res.status(403).json({ error: 'Módulo docs no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const titulo = String(req.body?.titulo || '').trim()
  const fileUrl = String(req.body?.fileUrl || '').trim()
  if (!titulo || !fileUrl) return res.status(400).json({ error: 'titulo y fileUrl requeridos' })

  const doc = await DocItem.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 200),
    descripcion: String(req.body?.descripcion || '').slice(0, 4000),
    category: String(req.body?.category || 'equipo').slice(0, 80),
    fileUrl: fileUrl.slice(0, 500),
    fileName: String(req.body?.fileName || '').slice(0, 260),
    mimeType: String(req.body?.mimeType || '').slice(0, 120),
    repository: 'url',
    status: 'published',
    audience: forced.audience,
    requiresSignature: Boolean(req.body?.requiresSignature),
    origin: 'member',
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    publishedAt: new Date(),
  })

  await notifyUsersTeam({
    tenant: req.tenant,
    userIds: forced.audience.userIds,
    kind: 'team_doc',
    title: `Documento · ${scope.nombre}`,
    body: titulo,
    href: `/docs/${doc._id}`,
    refType: 'doc',
    refId: doc._id,
    excludeUserId: req.user._id,
  })

  res.status(201).json({
    item: { id: String(doc._id), titulo: doc.titulo, audience: forced.audience },
    href: `/docs`,
    correlationId: `team-doc-${doc._id}`,
  })
})

router.post('/compose/beneficio', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'beneficios', caps(req))) {
    return res.status(403).json({ error: 'Módulo beneficios no permitido en este equipo' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const titulo = String(req.body?.titulo || '').trim()
  if (!titulo) return res.status(400).json({ error: 'Título requerido' })

  const p = await Post.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 200),
    cuerpo: String(req.body?.cuerpo || '').slice(0, 20000),
    tipo: 'beneficio',
    status: 'published',
    publishedAt: new Date(),
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    origin: 'member',
    audience: forced.audience,
    notifyAudience: Boolean(req.body?.notifyAudience),
  })

  if (p.notifyAudience) {
    await notifyUsersTeam({
      tenant: req.tenant,
      userIds: forced.audience.userIds,
      kind: 'team_post',
      title: `Beneficio · ${scope.nombre}`,
      body: titulo,
      href: `/muro/${p._id}`,
      refType: 'post',
      refId: p._id,
      excludeUserId: req.user._id,
    })
  }

  res.status(201).json({
    item: { id: String(p._id), titulo: p.titulo, audience: forced.audience },
    correlationId: `team-beneficio-${p._id}`,
  })
})

router.post('/compose/reconocimiento', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'reconocimientos', caps(req))) {
    return res.status(403).json({ error: 'Módulo reconocimientos no permitido en este equipo' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  const paraNombre = String(req.body?.paraNombre || '').trim()
  const mensaje = String(req.body?.mensaje || req.body?.cuerpo || '').trim()
  if (!mensaje) return res.status(400).json({ error: 'Mensaje requerido' })
  const titulo = `👏 ${req.user.nombre || req.user.usuario || 'Tu supervisor'} reconoció${
    paraNombre ? ` a ${paraNombre}` : ' al equipo'
  }`

  const p = await Post.create({
    tenantId: req.tenant._id,
    titulo: titulo.slice(0, 200),
    cuerpo: mensaje.slice(0, 20000),
    tipo: 'aviso',
    status: 'published',
    publishedAt: new Date(),
    authorId: req.user._id,
    authorName: req.user.nombre || req.user.usuario,
    origin: 'member',
    audience: forced.audience,
    notifyAudience: Boolean(req.body?.notifyAudience),
  })

  if (p.notifyAudience) {
    await notifyUsersTeam({
      tenant: req.tenant,
      userIds: forced.audience.userIds,
      kind: 'team_post',
      title: `Reconocimiento · ${scope.nombre}`,
      body: titulo,
      href: `/muro/${p._id}`,
      refType: 'post',
      refId: p._id,
      excludeUserId: req.user._id,
    })
  }

  res.status(201).json({
    item: { id: String(p._id), titulo: p.titulo, audience: forced.audience },
    correlationId: `team-reconocimiento-${p._id}`,
  })
})

/** Compat: si mandan titulo crea encuesta; si no, solo audience */
router.post('/compose/survey-hint', async (req, res) => {
  if (req.body?.titulo) {
    req.url = '/compose/survey'
    // fallthrough — call handler inline
  }
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'encuestas', caps(req))) {
    return res.status(403).json({ error: 'Módulo encuestas no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  if (req.body?.titulo) {
    // duplicate create path via redirect body — client should use /compose/survey
    return res.json({ audience: forced.audience, useEndpoint: '/team/compose/survey' })
  }
  res.json({ audience: forced.audience, useEndpoint: '/team/compose/survey' })
})

router.post('/compose/doc-hint', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })
  res.json({ audience: forced.audience, useEndpoint: '/team/compose/doc' })
})

router.post('/compose/chat', async (req, res) => {
  if (!requireEquipoCap(req, res)) return
  const scope = await loadScopeOrFail(req, res)
  if (!scope) return
  if (!moduleAllowed(scope, 'chat', caps(req))) {
    return res.status(403).json({ error: 'Módulo chat no permitido' })
  }
  const forced = forceTeamAudience(scope.memberIds)
  if (!forced.ok) return res.status(400).json({ error: forced.error })

  const participantIds = [
    ...new Set([...forced.audience.userIds.map(String), String(req.user._id)]),
  ]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id))

  const title = String(req.body?.nombre || `Equipo ${scope.nombre}`).slice(0, 80)
  let ch = await Chat.findOne({
    tenantId: req.tenant._id,
    kind: 'group',
    createdByAdmin: true,
    title,
    'audience.userIds': { $all: forced.audience.userIds.slice(0, 1).map((id) => new ObjectId(id)) },
  })

  if (!ch) {
    ch = await Chat.create({
      tenantId: req.tenant._id,
      kind: 'group',
      title,
      participants: participantIds.map((userId) => ({
        userId,
        role: String(userId) === String(req.user._id) ? 'admin' : 'member',
      })),
      participantIds,
      createdByAdmin: true,
      createdByUserId: req.user._id,
      allowReplies: true,
      audience: forced.audience,
      lastMessageAt: new Date(),
      lastMessagePreview: 'Canal de equipo creado',
    })
  }

  res.status(201).json({
    item: { id: String(ch._id), nombre: ch.title },
    href: `/chat/${ch._id}`,
    correlationId: `team-chat-${ch._id}`,
  })
})

export default router
