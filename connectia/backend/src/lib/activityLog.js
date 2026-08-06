import { ActivityEvent } from '../models/ActivityEvent.js'

const ALLOWED = new Set([
  'login',
  'logout',
  'logout_all',
  'login_failed',
  'login_2fa_challenge',
  'login_2fa_ok',
  'login_sso',
  'login_token',
  'login_legacy',
  'password_change',
  'profile_update',
  'account_disable',
  'account_delete_request',
  'device_revoke',
  'admin.user_disable',
  'admin.user_create',
  'admin.user_update',
  'admin.user_import',
  'admin.user_sync_google',
  'admin.user_sync_entra',
  'admin.device_revoke',
  'admin.device_wipe',
  'admin.legajo_create',
  'admin.legajo_update',
  'admin.legajo_deactivate',
  'admin.role_create',
  'admin.role_update',
  'admin.role_deactivate',
  'admin.param_create',
  'admin.param_update',
  'admin.post_category_create',
  'admin.post_category_update',
  'admin.post_category_deactivate',
  'admin.post_template_create',
  'admin.post_template_update',
  'admin.post_template_deactivate',
  'admin.newsletter_rule_create',
  'admin.newsletter_rule_update',
  'admin.newsletter_rule_delete',
  'admin.org_area_create',
  'admin.org_area_update',
  'admin.org_area_deactivate',
  'admin.org_group_create',
  'admin.org_group_update',
  'admin.org_group_deactivate',
  'admin.audience_client_create',
  'admin.audience_client_update',
  'admin.audience_client_deactivate',
  'admin.post_import',
  'admin.license_update',
  'admin.com_type_create',
  'admin.com_send_bulk',
])

/**
 * Registra un evento de actividad (fire-and-forget safe).
 * Nunca lanza hacia el caller de auth.
 */
export async function recordActivity({
  tenantId,
  userId = null,
  action,
  meta = {},
  ip = '',
  userAgent = '',
}) {
  try {
    const act = String(action || '')
    if (!tenantId || !ALLOWED.has(act)) return null
    return await ActivityEvent.create({
      tenantId,
      userId: userId || null,
      action: act,
      meta: meta && typeof meta === 'object' ? meta : {},
      ip: String(ip || '').slice(0, 80),
      userAgent: String(userAgent || '').slice(0, 300),
    })
  } catch (e) {
    console.warn('[activity]', e.message)
    return null
  }
}

export function reqMeta(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  }
}

export function serializeActivity(ev) {
  return {
    id: String(ev._id),
    userId: ev.userId ? String(ev.userId) : null,
    action: ev.action,
    meta: ev.meta || {},
    ip: ev.ip || '',
    userAgent: ev.userAgent || '',
    createdAt: ev.createdAt,
  }
}
