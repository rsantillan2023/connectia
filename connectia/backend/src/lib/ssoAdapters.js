/**
 * Registry de adaptadores SSO del hub (46.04).
 * Sin secretos en el cliente: solo se resuelve en servidor.
 *
 * Config: SSO_ADAPTERS_JSON={"mi-adapter":{"baseUrl":"https://...","secretEnv":"SSO_MI_SECRET"}}
 * O un único adapter por defecto con SSO_DEFAULT_BASE_URL + SSO_DEFAULT_SECRET.
 */

function loadRegistry() {
  const map = {}
  const raw = process.env.SSO_ADAPTERS_JSON || ''
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') Object.assign(map, parsed)
    } catch (err) {
      console.warn('[sso] SSO_ADAPTERS_JSON inválido:', err.message)
    }
  }
  if (process.env.SSO_DEFAULT_BASE_URL) {
    map.default = {
      baseUrl: process.env.SSO_DEFAULT_BASE_URL,
      secretEnv: 'SSO_DEFAULT_SECRET',
    }
  }
  return map
}

export function listSsoAdapters() {
  return Object.keys(loadRegistry())
}

/**
 * Resuelve URL SSO firmada/tokenizada para el usuario.
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
export function resolveSsoUrl({ adapterId, target, user, tenant }) {
  const registry = loadRegistry()
  const id = String(adapterId || 'default').trim() || 'default'
  const cfg = registry[id]
  if (!cfg?.baseUrl) {
    return {
      ok: false,
      error: `Adaptador SSO "${id}" no configurado. Definí SSO_DEFAULT_BASE_URL o SSO_ADAPTERS_JSON.`,
    }
  }

  const secretEnv = cfg.secretEnv || 'SSO_DEFAULT_SECRET'
  const secret = process.env[secretEnv] || ''
  if (!secret) {
    return {
      ok: false,
      error: `Falta secreto ${secretEnv} para el adaptador SSO "${id}".`,
    }
  }

  try {
    const base = String(cfg.baseUrl).replace(/\/$/, '')
    const dest = String(target || '').trim()
    const u = new URL(dest ? (dest.startsWith('http') ? dest : `${base}${dest.startsWith('/') ? '' : '/'}${dest}`) : base)
    u.searchParams.set('empCodigo', tenant?.empCodigo || '')
    u.searchParams.set('usuario', user?.usuario || '')
    u.searchParams.set('email', user?.email || '')
    u.searchParams.set('token', Buffer.from(`${user?._id || ''}:${secret}`).toString('base64url').slice(0, 48))
    u.searchParams.set('ts', String(Date.now()))
    return { ok: true, url: u.toString() }
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo armar la URL SSO' }
  }
}
