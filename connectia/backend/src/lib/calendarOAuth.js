/**
 * OAuth Authorization Code + PKCE para Outlook (Microsoft) y Google Calendar.
 * Incluye scopes de lectura y escritura (sync bidireccional).
 */

import {
  generatePkce,
  signOAuthState,
  verifyOAuthState,
  encryptSecret,
  decryptSecret,
} from './calendarCrypto.js'

export const PROVIDERS = ['OUTLOOK', 'GOOGLE']

const MS_AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0'
const MS_GRAPH = 'https://graph.microsoft.com/v1.0'
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_CAL = 'https://www.googleapis.com/calendar/v3'

function msConfig() {
  return {
    clientId: process.env.MS_CALENDAR_CLIENT_ID || '',
    clientSecret: process.env.MS_CALENDAR_CLIENT_SECRET || '',
    redirectUri:
      process.env.MS_CALENDAR_REDIRECT_URI ||
      'http://localhost:4000/api/calendar/callback/outlook',
    scopes: (
      process.env.MS_CALENDAR_SCOPES ||
      'offline_access openid email profile Calendars.ReadWrite'
    )
      .split(/\s+/)
      .filter(Boolean),
  }
}

function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      'http://localhost:4000/api/calendar/callback/google',
    scopes: (
      process.env.GOOGLE_CALENDAR_SCOPES ||
      'openid email profile https://www.googleapis.com/auth/calendar'
    )
      .split(/\s+/)
      .filter(Boolean),
  }
}

export function providerConfigured(provider) {
  if (provider === 'OUTLOOK') {
    const c = msConfig()
    return !!(c.clientId && c.clientSecret)
  }
  if (provider === 'GOOGLE') {
    const c = googleConfig()
    return !!(c.clientId && c.clientSecret)
  }
  return false
}

export function buildAuthorizeUrl({ provider, tenantId, userId, frontendReturn }) {
  const pkce = generatePkce()
  const state = signOAuthState({
    provider,
    tenantId: String(tenantId),
    userId: String(userId),
    verifier: pkce.verifier,
    returnTo: frontendReturn || '/agenda?connected=1',
  })

  if (provider === 'OUTLOOK') {
    const c = msConfig()
    if (!c.clientId) {
      const err = new Error('Outlook Calendar no configurado (MS_CALENDAR_CLIENT_ID)')
      err.status = 503
      throw err
    }
    const params = new URLSearchParams({
      client_id: c.clientId,
      response_type: 'code',
      redirect_uri: c.redirectUri,
      response_mode: 'query',
      scope: c.scopes.join(' '),
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    })
    return { url: `${MS_AUTH}/authorize?${params}`, state }
  }

  if (provider === 'GOOGLE') {
    const c = googleConfig()
    if (!c.clientId) {
      const err = new Error('Google Calendar no configurado (GOOGLE_CALENDAR_CLIENT_ID)')
      err.status = 503
      throw err
    }
    const params = new URLSearchParams({
      client_id: c.clientId,
      response_type: 'code',
      redirect_uri: c.redirectUri,
      scope: c.scopes.join(' '),
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    })
    return { url: `${GOOGLE_AUTH}?${params}`, state }
  }

  const err = new Error('Proveedor inválido')
  err.status = 400
  throw err
}

export function parseCallbackState(state) {
  return verifyOAuthState(state)
}

async function exchangeMsCode(code, verifier) {
  const c = msConfig()
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    code,
    redirect_uri: c.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier,
    scope: c.scopes.join(' '),
  })
  const res = await fetch(`${MS_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || 'Error token Outlook')
    err.status = 502
    throw err
  }
  return json
}

async function exchangeGoogleCode(code, verifier) {
  const c = googleConfig()
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    code,
    redirect_uri: c.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  })
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || 'Error token Google')
    err.status = 502
    throw err
  }
  return json
}

export async function exchangeCode({ provider, code, verifier }) {
  if (provider === 'OUTLOOK') return exchangeMsCode(code, verifier)
  if (provider === 'GOOGLE') return exchangeGoogleCode(code, verifier)
  const err = new Error('Proveedor inválido')
  err.status = 400
  throw err
}

export function packTokens(tokenResponse) {
  const access = tokenResponse.access_token || ''
  const refresh = tokenResponse.refresh_token || ''
  const expiresIn = Number(tokenResponse.expires_in || 3600)
  return {
    accessTokenEnc: encryptSecret(access),
    refreshTokenEnc: refresh ? encryptSecret(refresh) : '',
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    scopes: String(tokenResponse.scope || '')
      .split(/\s+/)
      .filter(Boolean),
  }
}

export async function refreshAccessToken(connection) {
  const provider = connection.provider
  const refresh = decryptSecret(connection.refreshTokenEnc)
  if (!refresh) {
    const err = new Error('Sin refresh token; reconectá el calendario')
    err.status = 401
    throw err
  }

  if (provider === 'OUTLOOK') {
    const c = msConfig()
    const body = new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
      scope: c.scopes.join(' '),
    })
    const res = await fetch(`${MS_AUTH}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(json.error_description || 'Refresh Outlook falló')
      err.status = 401
      throw err
    }
    return packTokens({ ...json, refresh_token: json.refresh_token || refresh })
  }

  if (provider === 'GOOGLE') {
    const c = googleConfig()
    const body = new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    })
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(json.error_description || 'Refresh Google falló')
      err.status = 401
      throw err
    }
    return packTokens({ ...json, refresh_token: refresh })
  }

  const err = new Error('Proveedor inválido')
  err.status = 400
  throw err
}

/** Obtiene access token válido (refresca si hace falta) y persiste si cambió. */
export async function getValidAccessToken(connection) {
  const skew = 60 * 1000
  const expired =
    !connection.tokenExpiresAt || new Date(connection.tokenExpiresAt).getTime() < Date.now() + skew
  if (!expired && connection.accessTokenEnc) {
    return decryptSecret(connection.accessTokenEnc)
  }
  const packed = await refreshAccessToken(connection)
  connection.accessTokenEnc = packed.accessTokenEnc
  if (packed.refreshTokenEnc) connection.refreshTokenEnc = packed.refreshTokenEnc
  connection.tokenExpiresAt = packed.tokenExpiresAt
  if (packed.scopes?.length) connection.scopes = packed.scopes
  connection.status = 'active'
  connection.lastError = ''
  await connection.save()
  return decryptSecret(connection.accessTokenEnc)
}

export async function fetchAccountEmail(provider, accessToken) {
  try {
    if (provider === 'OUTLOOK') {
      const res = await fetch(`${MS_GRAPH}/me?$select=mail,userPrincipalName,displayName`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json().catch(() => ({}))
      return json.mail || json.userPrincipalName || ''
    }
    if (provider === 'GOOGLE') {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json().catch(() => ({}))
      return json.email || ''
    }
  } catch {
    /* ignore */
  }
  return ''
}

export async function revokeProviderToken(provider, connection) {
  try {
    const token = connection.refreshTokenEnc
      ? decryptSecret(connection.refreshTokenEnc)
      : decryptSecret(connection.accessTokenEnc)
    if (!token) return
    if (provider === 'GOOGLE') {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    }
    // Microsoft: no hay revoke simple con client secret en common; se borra local.
  } catch {
    /* best effort */
  }
}

export { MS_GRAPH, GOOGLE_CAL, msConfig, googleConfig }
