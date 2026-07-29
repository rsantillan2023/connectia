import { GreetingRule } from '../models/GreetingRule.js'
import { GreetingEventType } from '../models/GreetingEventType.js'
import { Post } from '../models/Post.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { normalizeAudience, usersFilterForAudience, serializeAudience } from '../lib/audience.js'
import { notifyPostPublished } from './notifyPost.js'
import {
  GREETING_EVENT_LABELS,
  DEFAULT_GREETING_EVENT_TYPES,
  localParts,
  eventYmdForRun,
  userMatchesEvent,
  buildRunKey,
  applyTemplate,
  templateVarsForUser,
  normalizeHours,
  resolveGreetingPostMedia,
  normalizeMediaPick,
  resolveEventTypeConfig,
  mergeRuleWithTypeDefaults,
} from '../lib/greetingHelpers.js'

export function serializeGreetingRule(r, typeLabelByKey = null) {
  const label =
    (typeLabelByKey && typeLabelByKey.get?.(r.eventType)) ||
    GREETING_EVENT_LABELS[r.eventType] ||
    r.eventType
  return {
    id: String(r._id),
    name: r.name || '',
    eventType: r.eventType,
    eventLabel: label,
    titulo: r.titulo,
    cuerpo: r.cuerpo || '',
    imageUrl: r.imageUrl || '',
    imageUrls: Array.isArray(r.imageUrls) ? r.imageUrls.filter(Boolean) : [],
    audioUrl: r.audioUrl || '',
    mediaKind: r.mediaKind || '',
    mediaPick: normalizeMediaPick(r.mediaPick),
    layout: r.layout || 'banner',
    hours: normalizeHours(r.hours),
    daysBefore: r.daysBefore || 0,
    fixedDay: r.fixedDay,
    fixedMonth: r.fixedMonth,
    audience: serializeAudience(r.audience),
    notifyAudience: r.notifyAudience !== false,
    activo: r.activo !== false,
    lastRunAt: r.lastRunAt,
    stats: {
      postsCreated: r.stats?.postsCreated || 0,
      lastError: r.stats?.lastError || '',
    },
    postTipo: 'celebracion',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export async function loadGreetingTypeMap(tenantId) {
  const docs = await GreetingEventType.find({ tenantId }).lean()
  const map = new Map()
  for (const d of docs) map.set(d.key, d)
  for (const def of DEFAULT_GREETING_EVENT_TYPES) {
    if (!map.has(def.key)) map.set(def.key, { ...def, activo: true })
  }
  return map
}

async function createCelebrationPost({
  tenant,
  rule,
  runKey,
  forUser,
  titulo,
  cuerpo,
  authorId,
  typeConfig = null,
}) {
  try {
    const effective = mergeRuleWithTypeDefaults(rule, typeConfig)
    const media = resolveGreetingPostMedia(effective, forUser)
    const post = await Post.create({
      tenantId: rule.tenantId,
      titulo,
      cuerpo,
      tipo: 'celebracion',
      imageUrl: media.imageUrl,
      imageUrls: media.imageUrls,
      audioUrl: media.audioUrl,
      layout: media.layout,
      status: 'published',
      publishedAt: new Date(),
      origin: 'admin',
      authorId: authorId || rule.createdBy || null,
      authorName: 'Celebraciones',
      audience: normalizeAudience(rule.audience),
      notifyAudience: rule.notifyAudience !== false,
      greeting: {
        ruleId: rule._id,
        eventType: rule.eventType,
        forUserId: forUser?._id || null,
        runKey,
      },
    })
    if (rule.notifyAudience !== false) {
      notifyPostPublished({ post, tenant }).catch((err) => {
        console.warn('[greeting] notify', err?.message || err)
      })
    }
    return { created: true, postId: String(post._id) }
  } catch (e) {
    if (e?.code === 11000) return { created: false, duplicate: true }
    throw e
  }
}

/**
 * Evalúa una regla en un instante (timezone del tenant).
 * @param {{ force?: boolean, typeConfig?: object }} opts
 */
export async function evaluateGreetingRule(rule, tenant, { force = false, now = new Date(), typeConfig = null } = {}) {
  const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires'
  const local = localParts(now, tz)
  const hours = normalizeHours(rule.hours)
  if (!force && !hours.includes(local.timeKey)) {
    return { skipped: 'hora', created: 0 }
  }

  const cfg = resolveEventTypeConfig(typeConfig || rule.eventType)
  if (!cfg || cfg.activo === false) {
    return { skipped: 'tipo', created: 0 }
  }

  const effectiveRule = mergeRuleWithTypeDefaults(rule, cfg)
  const eventYmd = eventYmdForRun(local, rule.daysBefore || 0)
  const timeKey = force ? hours[0] || local.timeKey : local.timeKey
  let created = 0
  const details = []

  if (cfg.dateSource === 'fixed') {
    if (
      !userMatchesEvent({
        eventType: rule.eventType,
        eventYmd,
        user: null,
        fixedDay: rule.fixedDay,
        fixedMonth: rule.fixedMonth,
        typeConfig: cfg,
        force,
      })
    ) {
      return { skipped: 'fecha', created: 0 }
    }
    const runKey = buildRunKey({
      ruleId: rule._id,
      eventType: rule.eventType,
      dateKey: local.dateKey,
      timeKey,
      userId: null,
    })
    const titulo = applyTemplate(effectiveRule.titulo || rule.titulo, {
      nombre: tenant?.nombre || 'equipo',
      apellido: '',
      cargo: 'comunidad',
      anios: '',
    })
    const cuerpo = applyTemplate(effectiveRule.cuerpo || rule.cuerpo, {
      nombre: tenant?.nombre || 'equipo',
      apellido: '',
      cargo: 'comunidad',
      anios: '',
    })
    const res = await createCelebrationPost({
      tenant,
      rule: effectiveRule,
      runKey,
      forUser: null,
      titulo,
      cuerpo,
      typeConfig: cfg,
    })
    if (res.created) {
      created += 1
      details.push(res.postId)
    }
  } else {
    if (cfg.dateSource === 'manual' && !force) {
      return { skipped: 'manual', created: 0 }
    }

    const candidateFilter = {
      ...usersFilterForAudience(rule.tenantId, rule.audience),
    }
    if (cfg.dateSource === 'fechaNacimiento') candidateFilter.fechaNacimiento = { $ne: null }
    else if (cfg.dateSource === 'fechaIngreso') candidateFilter.fechaIngreso = { $ne: null }
    else if (cfg.dateSource === 'createdAt') {
      /* todos tienen createdAt */
    } else if (cfg.dateSource === 'customDate' && cfg.customDateKey) {
      candidateFilter[`customDates.${cfg.customDateKey}`] = { $exists: true, $ne: null }
    } else if (cfg.dateSource === 'daysAfter') {
      const field = cfg.offsetField || 'fechaIngreso'
      if (field === 'customDate' && cfg.customDateKey) {
        candidateFilter[`customDates.${cfg.customDateKey}`] = { $exists: true, $ne: null }
      } else if (field !== 'createdAt') {
        candidateFilter[field] = { $ne: null }
      }
    }

    const candidates = await User.find(candidateFilter)
      .select('_id nombre apellido cargo fechaNacimiento fechaIngreso avatarUrl createdAt customDates')
      .lean()

    for (const user of candidates) {
      if (
        !userMatchesEvent({
          eventType: rule.eventType,
          eventYmd,
          user,
          fixedDay: rule.fixedDay,
          fixedMonth: rule.fixedMonth,
          typeConfig: cfg,
          force,
        })
      ) {
        continue
      }
      const vars = templateVarsForUser(user, eventYmd)
      const runKey = buildRunKey({
        ruleId: rule._id,
        eventType: rule.eventType,
        dateKey: local.dateKey,
        timeKey,
        userId: user._id,
      })
      const res = await createCelebrationPost({
        tenant,
        rule: effectiveRule,
        runKey,
        forUser: user,
        titulo: applyTemplate(effectiveRule.titulo || rule.titulo, vars),
        cuerpo: applyTemplate(effectiveRule.cuerpo || rule.cuerpo, vars),
        typeConfig: cfg,
      })
      if (res.created) {
        created += 1
        details.push(res.postId)
      }
    }
  }

  await GreetingRule.updateOne(
    { _id: rule._id },
    {
      $set: { lastRunAt: now, 'stats.lastError': '' },
      ...(created ? { $inc: { 'stats.postsCreated': created } } : {}),
    },
  )

  return { skipped: null, created, postIds: details, dateKey: local.dateKey, timeKey }
}

/** Procesa reglas activas cuya hora local coincide (o force por id). */
export async function processDueGreetingRules({ forceRuleId = null } = {}) {
  const filter = forceRuleId ? { _id: forceRuleId } : { activo: true }
  const rules = await GreetingRule.find(filter).limit(forceRuleId ? 1 : 200).lean(false)
  if (!rules.length) return []

  const tenantIds = [...new Set(rules.map((r) => String(r.tenantId)))]
  const tenants = await Tenant.find({ _id: { $in: tenantIds } }).lean()
  const byId = new Map(tenants.map((t) => [String(t._id), t]))

  const typeMaps = new Map()
  for (const tid of tenantIds) {
    typeMaps.set(tid, await loadGreetingTypeMap(tid))
  }

  const results = []
  for (const rule of rules) {
    const tid = String(rule.tenantId)
    const tenant = byId.get(tid)
    if (!tenant) continue
    try {
      const typeConfig = typeMaps.get(tid)?.get(rule.eventType) || null
      const r = await evaluateGreetingRule(rule, tenant, {
        force: Boolean(forceRuleId),
        typeConfig,
      })
      if (r.created > 0 || forceRuleId) {
        results.push({ ruleId: String(rule._id), ...r })
      }
    } catch (e) {
      await GreetingRule.updateOne(
        { _id: rule._id },
        { $set: { 'stats.lastError': String(e?.message || e).slice(0, 300) } },
      )
      results.push({ ruleId: String(rule._id), error: e?.message || String(e) })
    }
  }
  return results
}
