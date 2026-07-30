import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { requireAuth, requireAdmin, requireCapability, requirePlatformAdmin, isPlatformUser } from '../middleware/auth.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { MenuItem } from '../models/MenuItem.js'
import { Post } from '../models/Post.js'
import { Request } from '../models/Request.js'
import { Survey } from '../models/Survey.js'
import { DocItem } from '../models/DocItem.js'
import { HubLink } from '../models/HubLink.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { RequestType } from '../models/RequestType.js'
import { PushCampaign } from '../models/PushCampaign.js'
import { GreetingRule } from '../models/GreetingRule.js'
import { Comment } from '../models/Comment.js'
import { ChatReport } from '../models/ChatReport.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WorkflowInstance } from '../models/WorkflowInstance.js'
import { serializeBranding } from '../lib/mediaUrl.js'
import { normalizePeopleCareConfig } from '../lib/peopleCare.js'
import { normalizeLicenciasConfig } from '../lib/licenciasConfig.js'
import { LEGISLACION_META } from '../lib/legislacionLicencias.js'
import { applyLegislacionPack } from '../services/licenciaSaldo.js'
import { DEFAULT_SEED_PASSWORD, buildTenantOnboardingSummary } from '../lib/genericTenantDefaults.js'
import { researchCompanyForTenant } from '../services/companyResearchAi.js'
import { seedGenericTenant } from '../scripts/seedGenericTenant.js'
import { seedDirectoryForTenant } from '../lib/directorySeed.js'
import {
  DEFAULT_CAPS,
  MODULE_ID_SET,
  clampCapabilitiesToLicense,
  mergeCapabilitiesPreservingExtras,
  resolveLicensedCapabilities,
  sanitizeModuleIds,
} from '../constants/moduleCatalog.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function publicTenant(t) {
  return {
    id: t._id,
    empCodigo: t.empCodigo,
    nombre: t.nombre,
    activo: t.activo,
    allowDesktop: t.allowDesktop,
    branding: serializeBranding(t.branding),
    themeMode: t.themeMode || 'system',
    uxShell: t.uxShell,
    homeVariant: t.homeVariant === 'genz' ? 'genz' : 'classic',
    uiLocale: t.uiLocale === 'es-CL' ? 'es-CL' : 'es-AR',
    hasPointsApiKey: Boolean(t.pointsApiKey),
    loginMethods: t.loginMethods,
    authConfig: {
      allowedEmailDomains: t.authConfig?.allowedEmailDomains || [],
      twoFactorRequired: Boolean(t.authConfig?.twoFactorRequired),
      twoFactorMethods: t.authConfig?.twoFactorMethods || ['email', 'sms'],
      ssoAutoProvision: Boolean(t.authConfig?.ssoAutoProvision),
      hasLegacySecret: Boolean(t.authConfig?.legacySharedSecret),
    },
    capabilities: t.capabilities,
    licensedCapabilities: Array.isArray(t.licensedCapabilities) ? t.licensedCapabilities : [],
    timezone: t.timezone,
    menuVersion: t.menuVersion,
    peopleCare: normalizePeopleCareConfig(t.peopleCare),
    licenciasConfig: normalizeLicenciasConfig(t.licenciasConfig),
    onboarding: t.onboarding || null,
    isPlatform: t.empCodigo === 'PLATFORM',
    updatedAt: t.updatedAt,
    createdAt: t.createdAt,
  }
}

async function seedTenantMenus(tenantId) {
  const menuSeed = [
    { key: 'muro', label: 'Publicaciones', route: '/muro', icon: 'home', order: 10, channel: 'u' },
    { key: 'mis-publicaciones', label: 'Mis publicaciones', route: '/muro/mias', icon: 'inbox', order: 12, channel: 'u' },
    { key: 'guardados', label: 'Mis guardados', route: '/guardados', icon: 'bookmark', order: 15, channel: 'u' },
    { key: 'solicitudes', label: 'Mis solicitudes', route: '/solicitudes', icon: 'inbox', order: 20, channel: 'u' },
    { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 30, channel: 'u' },
    { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file', order: 40, channel: 'u' },
    { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 50, channel: 'u' },
    { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid', order: 58, channel: 'u' },
    { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 59, channel: 'u' },
    { key: 'admin.home', label: 'Dashboard', route: '/', icon: 'home', order: 10, channel: 'a' },
    { key: 'admin.tenants', label: 'Comunidad', route: '/comunidad', icon: 'building', order: 50, channel: 'a' },
    { key: 'admin.menu', label: 'Menú dinámico', route: '/menu', icon: 'menu', order: 55, channel: 'a' },
    { key: 'admin.pubs', label: 'Publicaciones', route: '/publicaciones', icon: 'megaphone', order: 40, channel: 'a' },
    { key: 'admin.stories', label: 'Stories', route: '/stories', icon: 'sparkles', order: 40.5, channel: 'a' },
    { key: 'admin.engagement', label: 'Emociones', route: '/emociones', icon: 'heart', order: 41, channel: 'a' },
    { key: 'admin.surveys', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 45, channel: 'a' },
    { key: 'admin.docs', label: 'Documentos', route: '/documentos', icon: 'file', order: 46, channel: 'a' },
    { key: 'admin.directorio', label: 'Datos útiles', route: '/directorio', icon: 'grid', order: 46.2, channel: 'a' },
    { key: 'admin.beneficios', label: 'Beneficios y billetera', route: '/beneficios', icon: 'gift', order: 46.3, channel: 'a' },
    { key: 'admin.hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 47, channel: 'a' },
  ]
  for (const item of menuSeed) {
    await MenuItem.findOneAndUpdate(
      { tenantId, key: item.key },
      { ...item, tenantId, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true },
    )
  }
  await seedDirectoryForTenant(tenantId, { brandName: 'la empresa' })
  const { seedBenefitsForTenant } = await import('../lib/benefitsSeed.js')
  await seedBenefitsForTenant(tenantId, { brandName: 'la empresa' })
  const { seedStoriesForTenant } = await import('../lib/storiesSeed.js')
  await seedStoriesForTenant(tenantId, { brandName: 'la empresa', variant: 'default' })
}

/** Comunidad del admin logueado (tenant admin; plataforma también puede leer la suya) */
router.get('/me', requireAuth, requireAdmin, async (req, res) => {
  res.json({
    tenant: publicTenant(req.tenant),
    isPlatformAdmin: isPlatformUser(req.user, req.tenant),
  })
})

/** Dashboard: tenant metrics o métricas de plataforma */
router.get('/me/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (isPlatformUser(req.user, req.tenant)) {
      const [tenants, activeTenants, users] = await Promise.all([
        Tenant.countDocuments({ empCodigo: { $ne: 'PLATFORM' } }),
        Tenant.countDocuments({ empCodigo: { $ne: 'PLATFORM' }, activo: true }),
        User.countDocuments({}),
      ])
      return res.json({
        mode: 'platform',
        tenant: publicTenant(req.tenant),
        metrics: { tenants, activeTenants, users },
      })
    }
    const tenantId = req.tenant._id
    const [
      users,
      activeUsers,
      menuItems,
      postsPublished,
      postsDraft,
      postsPendingModeration,
      requestsOpen,
      requestsTotal,
      surveysOpen,
      surveysTotal,
      docsPublished,
      hubLinks,
      orgAreas,
      orgGroups,
      requestTypes,
      notificationsScheduled,
      notificationsSent,
      greetingRulesActive,
      commentsPending,
      chatReportsOpen,
      workflowsActive,
      approvalsOpen,
    ] = await Promise.all([
      User.countDocuments({ tenantId }),
      User.countDocuments({ tenantId, activo: true }),
      MenuItem.countDocuments({ tenantId, activo: true }),
      Post.countDocuments({ tenantId, status: 'published' }),
      Post.countDocuments({ tenantId, status: 'draft' }),
      Post.countDocuments({ tenantId, status: 'pending_review' }),
      Request.countDocuments({ tenantId, estado: { $ne: 'cerrada' } }),
      Request.countDocuments({ tenantId }),
      Survey.countDocuments({ tenantId, status: 'published' }),
      Survey.countDocuments({ tenantId }),
      DocItem.countDocuments({ tenantId, status: 'published' }),
      HubLink.countDocuments({ tenantId, activo: true }),
      OrgArea.countDocuments({ tenantId, activo: true }),
      UserGroup.countDocuments({ tenantId, activo: true }),
      RequestType.countDocuments({ tenantId, activo: true }),
      PushCampaign.countDocuments({ tenantId, status: 'scheduled' }),
      PushCampaign.countDocuments({ tenantId, status: 'sent' }),
      GreetingRule.countDocuments({ tenantId, activo: true }),
      Comment.countDocuments({ tenantId, status: 'pending_review' }),
      ChatReport.countDocuments({ tenantId, status: 'open' }),
      WorkflowDefinition.countDocuments({ tenantId, activo: true }),
      WorkflowInstance.countDocuments({ tenantId, status: 'en_curso' }),
    ])
    res.json({
      mode: 'tenant',
      tenant: publicTenant(req.tenant),
      metrics: {
        users,
        activeUsers,
        menuItems,
        menuVersion: req.tenant.menuVersion,
        allowDesktop: req.tenant.allowDesktop,
        postsPublished,
        postsDraft,
        postsPendingModeration,
        requestsOpen,
        requestsTotal,
        surveysOpen,
        surveysTotal,
        docsPublished,
        hubLinks,
        orgAreas,
        orgGroups,
        requestTypes,
        notificationsScheduled,
        notificationsSent,
        greetingRulesActive,
        commentsPending,
        chatReportsOpen,
        workflowsActive,
        approvalsOpen,
      },
    })
  } catch (e) {
    next(e)
  }
})

/** Actualizar comunidad del tenant logueado (no para editar otros) */
router.patch('/me', requireAuth, requireCapability('admin.comunidad'), async (req, res, next) => {
  try {
    if (isPlatformUser(req.user, req.tenant) && req.tenant.empCodigo === 'PLATFORM') {
      // plataforma edita su propio branding operativo, no suscriptores
    }
    const t = await Tenant.findById(req.tenant._id)
    const body = req.body || {}

    if (typeof body.nombre === 'string' && body.nombre.trim()) t.nombre = body.nombre.trim()
    if (typeof body.allowDesktop === 'boolean') t.allowDesktop = body.allowDesktop
    if (typeof body.timezone === 'string' && body.timezone) t.timezone = body.timezone
    if (Array.isArray(body.loginMethods)) {
      t.loginMethods = body.loginMethods.filter((m) => typeof m === 'string')
    }
    if (body.authConfig && typeof body.authConfig === 'object') {
      const cur = t.authConfig || {}
      const next = body.authConfig
      const domains = Array.isArray(next.allowedEmailDomains)
        ? next.allowedEmailDomains
            .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
            .filter(Boolean)
        : cur.allowedEmailDomains || []
      const methods = Array.isArray(next.twoFactorMethods)
        ? next.twoFactorMethods.filter((m) => m === 'email' || m === 'sms')
        : cur.twoFactorMethods || ['email', 'sms']
      t.authConfig = {
        allowedEmailDomains: domains,
        twoFactorRequired:
          typeof next.twoFactorRequired === 'boolean'
            ? next.twoFactorRequired
            : Boolean(cur.twoFactorRequired),
        twoFactorMethods: methods.length ? methods : ['email'],
        ssoAutoProvision:
          typeof next.ssoAutoProvision === 'boolean'
            ? next.ssoAutoProvision
            : Boolean(cur.ssoAutoProvision),
        legacySharedSecret:
          typeof next.legacySharedSecret === 'string'
            ? next.legacySharedSecret
            : cur.legacySharedSecret || '',
      }
    }
    if (Array.isArray(body.capabilities) && !isPlatformUser(req.user, req.tenant)) {
      const requested = body.capabilities.filter((m) => typeof m === 'string')
      // Candado comercial (ola 35): no activar módulos no contratados.
      t.capabilities = clampCapabilitiesToLicense(requested, t.licensedCapabilities)
    }
    if (body.uxShell && ['connectia', 'modern', 'legacy'].includes(body.uxShell)) {
      t.uxShell = body.uxShell
    }
    if (body.homeVariant && ['classic', 'genz'].includes(body.homeVariant)) {
      t.homeVariant = body.homeVariant
    }
    if (body.uiLocale && ['es-AR', 'es-CL'].includes(body.uiLocale)) {
      t.uiLocale = body.uiLocale
    }
    if (typeof body.pointsApiKey === 'string' && isPlatformUser(req.user, req.tenant)) {
      t.pointsApiKey = body.pointsApiKey.trim().slice(0, 120)
    }
    if (body.themeMode && ['light', 'dark', 'system'].includes(body.themeMode)) {
      t.themeMode = body.themeMode
    }
    if (body.branding && typeof body.branding === 'object') {
      const b = body.branding
      t.branding = t.branding || {}
      if (b.primary) t.branding.primary = b.primary
      if (b.secondary) t.branding.secondary = b.secondary
      if (typeof b.logoUrl === 'string') t.branding.logoUrl = b.logoUrl
      if (typeof b.loginBgUrl === 'string') t.branding.loginBgUrl = b.loginBgUrl
      if (typeof b.splashTitle === 'string') t.branding.splashTitle = b.splashTitle
      if (typeof b.splashSubtitle === 'string') t.branding.splashSubtitle = b.splashSubtitle
      if (b.splashDurationSec !== undefined && b.splashDurationSec !== null) {
        const n = Number(b.splashDurationSec)
        if (Number.isFinite(n)) {
          t.branding.splashDurationSec = Math.min(30, Math.max(0, Math.round(n)))
        }
      }
      if (b.splash && typeof b.splash === 'object') {
        const s = b.splash
        t.branding.splash = t.branding.splash || {}
        if (typeof s.enabledPreLogin === 'boolean') t.branding.splash.enabledPreLogin = s.enabledPreLogin
        if (typeof s.enabledPostLogin === 'boolean') t.branding.splash.enabledPostLogin = s.enabledPostLogin
        if (s.durationSec !== undefined && s.durationSec !== null) {
          const n = Number(s.durationSec)
          if (Number.isFinite(n)) {
            t.branding.splash.durationSec = Math.min(30, Math.max(0, Math.round(n)))
            t.branding.splashDurationSec = t.branding.splash.durationSec
          }
        }
        if (typeof s.title === 'string') {
          t.branding.splash.title = s.title
          t.branding.splashTitle = s.title
        }
        if (typeof s.subtitle === 'string') {
          t.branding.splash.subtitle = s.subtitle
          t.branding.splashSubtitle = s.subtitle
        }
        if (typeof s.logoUrl === 'string') t.branding.splash.logoUrl = s.logoUrl
        if (typeof s.bgColor === 'string') t.branding.splash.bgColor = s.bgColor
        if (typeof s.bgImageUrl === 'string') t.branding.splash.bgImageUrl = s.bgImageUrl
        if (typeof s.textColor === 'string') t.branding.splash.textColor = s.textColor
        if (typeof s.showLogo === 'boolean') t.branding.splash.showLogo = s.showLogo
        if (typeof s.showTitle === 'boolean') t.branding.splash.showTitle = s.showTitle
        if (typeof s.showSubtitle === 'boolean') t.branding.splash.showSubtitle = s.showSubtitle
      }
    }
    if (typeof body.activo === 'boolean' && req.tenant.empCodigo !== 'PLATFORM') {
      t.activo = body.activo
    }
    if (body.peopleCare && typeof body.peopleCare === 'object') {
      const cur = normalizePeopleCareConfig(t.peopleCare)
      const next = body.peopleCare
      t.peopleCare = normalizePeopleCareConfig({
        enabled: typeof next.enabled === 'boolean' ? next.enabled : cur.enabled,
        label: next.label !== undefined ? next.label : cur.label,
      })
    }

    /** Legislación de licencias/vacaciones: por comunidad (AR | CL). */
    let appliedLegislacion = null
    const licBody = body.licenciasConfig && typeof body.licenciasConfig === 'object' ? body.licenciasConfig : null
    const paisRaw = licBody?.pais || body.legislacionPais
    if (paisRaw != null && String(paisRaw).trim() !== '') {
      const prev = normalizeLicenciasConfig(t.licenciasConfig)
      const nextCfg = normalizeLicenciasConfig({ ...prev, pais: paisRaw })
      const paisChanged = nextCfg.pais !== prev.pais || !t.licenciasConfig?.pais
      const replaceTypes = licBody?.replaceTypes !== false
      const syncTimezone = licBody?.syncTimezone !== false
      const forceRefresh = licBody?.forceRefresh === true

      if (syncTimezone && paisChanged) {
        const meta = LEGISLACION_META[nextCfg.pais]
        if (meta?.timezoneDefault) t.timezone = meta.timezoneDefault
      }

      if (paisChanged || forceRefresh) {
        appliedLegislacion = await applyLegislacionPack(t, nextCfg.pais, {
          replaceTypes: paisChanged ? replaceTypes : forceRefresh,
        })
      } else {
        t.licenciasConfig = nextCfg
      }
    }

    if (!appliedLegislacion) await t.save()
    req.tenant = t
    res.json({
      tenant: publicTenant(t),
      legislacion: appliedLegislacion || normalizeLicenciasConfig(t.licenciasConfig),
    })
  } catch (e) {
    next(e)
  }
})

/** Listado suscriptores (plataforma) */
router.get('/', requireAuth, requirePlatformAdmin, async (req, res, next) => {
  try {
    const list = await Tenant.find().sort({ empCodigo: 1 }).limit(500)
    const withCounts = await Promise.all(
      list.map(async (t) => {
        const users = await User.countDocuments({ tenantId: t._id })
        return { ...publicTenant(t), usersCount: users }
      }),
    )
    res.json({ items: withCounts })
  } catch (e) {
    next(e)
  }
})

/** Alta suscriptor (plataforma) — seed genérico + research IA del cliente */
router.post('/', requireAuth, requirePlatformAdmin, async (req, res, next) => {
  try {
    const {
      empCodigo,
      nombre,
      allowDesktop,
      capabilities,
      pack,
      loginMethods,
      skipAiResearch,
      websiteUrl,
      industryHint,
      country,
      notes,
      logoUrl,
    } = req.body || {}
    if (!empCodigo || !nombre) {
      return res.status(400).json({ error: 'empCodigo y nombre obligatorios' })
    }
    const code = String(empCodigo).toUpperCase().trim()
    const brandName = String(nombre).trim()
    if (code === 'PLATFORM') {
      return res.status(400).json({ error: 'Código PLATFORM reservado' })
    }
    const exists = await Tenant.findOne({ empCodigo: code })
    if (exists) return res.status(409).json({ error: 'Código de empresa ya existe' })

    const licensed = resolveLicensedCapabilities({ pack, capabilities })

    let research = { profile: null, usedAi: false, error: null, context: null }
    if (skipAiResearch !== true) {
      research = await researchCompanyForTenant({
        empCodigo: code,
        nombre: brandName,
        websiteUrl,
        industryHint,
        country,
        notes,
        logoUrl,
      })
    }

    const t = await Tenant.create({
      empCodigo: code,
      nombre: brandName,
      allowDesktop: allowDesktop !== false,
      loginMethods: Array.isArray(loginMethods) && loginMethods.length ? loginMethods : ['password', 'id'],
      capabilities: licensed.capabilities.length ? licensed.capabilities : DEFAULT_CAPS,
      licensedCapabilities: licensed.capabilities.length ? licensed.capabilities : DEFAULT_CAPS,
      branding: {
        primary: '#8554C9',
        secondary: '#6B3FA0',
        splashTitle: brandName,
        splashSubtitle: 'Tu comunidad Connectia',
      },
    })

    void recordActivity({
      tenantId: t._id,
      userId: req.user?._id,
      action: 'admin.license_update',
      meta: {
        pack: licensed.pack,
        licensedCapabilities: licensed.capabilities,
        source: 'create',
      },
      ...reqMeta(req),
    })

    let seed = null
    let onboarding = null
    try {
      const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 12)
      seed = await seedGenericTenant({
        tenant: t,
        passwordHash,
        profile: research.profile || undefined,
      })
      const refreshedForOnboarding = await Tenant.findById(t._id)
      onboarding = buildTenantOnboardingSummary({
        empCodigo: code,
        nombre: refreshedForOnboarding?.nombre || brandName,
        profile: research.profile || {},
        context: research.context || {
          websiteUrl,
          industryHint,
          country,
          notes,
          logoUrl,
        },
        credentials: seed?.credentials,
        usedAi: research.usedAi,
        branding: refreshedForOnboarding?.branding,
      })
      if (refreshedForOnboarding) {
        refreshedForOnboarding.onboarding = onboarding
        await refreshedForOnboarding.save()
      }
    } catch (seedErr) {
      console.error('[tenants] seed genérico falló, menú mínimo:', seedErr)
      await seedTenantMenus(t._id)
      seed = { error: seedErr.message, fallbackMenus: true }
    }

    const refreshed = await Tenant.findById(t._id)
    res.status(201).json({
      tenant: publicTenant(refreshed || t),
      seed: {
        ok: !seed?.error,
        knownCompany: onboarding?.knownCompany ?? seed?.knownCompany ?? false,
        industry: onboarding?.industry || seed?.industry || '',
        description: onboarding?.description || '',
        usedAi: research.usedAi,
        researchError: research.error || null,
        credentials: onboarding?.credentials || seed?.credentials || null,
        accessMessage: onboarding?.accessMessage || '',
        onboarding,
        users: seed?.users || [],
        error: seed?.error || null,
      },
    })
  } catch (e) {
    next(e)
  }
})

/** Editar suscriptor (plataforma) */
router.patch('/:id', requireAuth, requirePlatformAdmin, async (req, res, next) => {
  try {
    const t = await Tenant.findById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Tenant no encontrado' })
    if (t.empCodigo === 'PLATFORM') {
      return res.status(400).json({ error: 'No se edita PLATFORM por esta vía' })
    }
    const body = req.body || {}
    if (typeof body.nombre === 'string' && body.nombre.trim()) t.nombre = body.nombre.trim()
    if (typeof body.allowDesktop === 'boolean') t.allowDesktop = body.allowDesktop
    if (typeof body.activo === 'boolean') t.activo = body.activo
    if (typeof body.timezone === 'string') t.timezone = body.timezone
    if (Array.isArray(body.loginMethods)) t.loginMethods = body.loginMethods

    const licenseTouched =
      body.pack != null ||
      Array.isArray(body.licensedCapabilities) ||
      Array.isArray(body.capabilities)
    if (licenseTouched) {
      const prevLicensed = [...(t.licensedCapabilities || [])]
      let nextLicensed
      if (body.pack != null || Array.isArray(body.licensedCapabilities)) {
        const resolved = resolveLicensedCapabilities({
          pack: body.pack,
          capabilities: Array.isArray(body.licensedCapabilities)
            ? body.licensedCapabilities
            : body.capabilities,
        })
        nextLicensed = resolved.capabilities
      } else if (Array.isArray(body.capabilities)) {
        // Solo capabilities sin pack: no cambia lo contratado; solo lo activo (PLATFORM).
        nextLicensed = null
      }
      if (nextLicensed) {
        t.licensedCapabilities = nextLicensed
        // Downgrade: apagar módulos del catálogo que ya no están contratados.
        // Caps operativas fuera de MODULE_CATALOG (directorio, talento, …) se preservan.
        const incoming = Array.isArray(body.capabilities) ? body.capabilities : t.capabilities
        t.capabilities = clampCapabilitiesToLicense(
          mergeCapabilitiesPreservingExtras(incoming, t.capabilities),
          nextLicensed,
        )
        t.menuVersion = (t.menuVersion || 1) + 1
        void recordActivity({
          tenantId: t._id,
          userId: req.user?._id,
          action: 'admin.license_update',
          meta: {
            pack: body.pack || null,
            before: prevLicensed,
            after: nextLicensed,
            source: 'platform_patch',
          },
          ...reqMeta(req),
        })
      } else if (Array.isArray(body.capabilities)) {
        const raw = body.capabilities.filter((c) => typeof c === 'string')
        const catalog = sanitizeModuleIds(raw)
        const extras = raw.filter((c) => !MODULE_ID_SET.has(c))
        t.capabilities = clampCapabilitiesToLicense(
          [...catalog, ...extras],
          t.licensedCapabilities,
        )
      }
    }

    await t.save()
    res.json({ tenant: publicTenant(t) })
  } catch (e) {
    next(e)
  }
})

export default router
