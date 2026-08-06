/**
 * OIDC / OAuth2 Authorization Code + PKCE para login SSO (§1).
 * Proveedores: microsoft (Entra ID), google, okta (y OIDC genérico vía issuer Okta).
 */

import {
  generatePkce,
  signOAuthState,
  verifyOAuthState,
} from './calendarCrypto.js'

export const SSO_PROVIDERS = ['microsoft', 'google', 'okta']

const LABELS = {
  microsoft: 'Microsoft',
  google: 'Google',
  okta: 'Okta',
}

function microsoftConfig() {
  const tenant = process.env.LOGIN_ENTRA_TENANT_ID || process.env.ENTRA_TENANT_ID || 'common'
  return {
    clientId: process.env.LOGIN_ENTRA_CLIENT_ID || process.env.ENTRA_CLIENT_ID || '',
    clientSecret: process.env.LOGIN_ENTRA_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET || '',
    redirectUri:
      process.env.LOGIN_ENTRA_REDIRECT_URI ||
      'http://localhost:4000/api/auth/sso/microsoft/callback',
    scopes: (process.env.LOGIN_ENTRA_SCOPES || 'openid email profile offline_access')
      .split(/\s+/)
      .filter(Boolean),
    authBase: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`,
  }
}

function googleConfig() {
  return {
    clientId: process.env.LOGIN_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.LOGIN_GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.LOGIN_GOOGLE_REDIRECT_URI ||
      'http://localhost:4000/api/auth/sso/google/callback',
    scopes: (process.env.LOGIN_GOOGLE_SCOPES || 'openid email profile').split(/\s+/).filter(Boolean),
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  }
}

function oktaConfig() {
  const domain = (process.env.LOGIN_OKTA_DOMAIN || '').replace(/\/$/, '')
  const issuer = (process.env.LOGIN_OKTA_ISSUER || (domain ? `https://${domain}/oauth2/default` : '')).replace(
    /\/$/,
    '',
  )
  return {
    clientId: process.env.LOGIN_OKTA_CLIENT_ID || '',
    clientSecret: process.env.LOGIN_OKTA_CLIENT_SECRET || '',
    redirectUri:
      process.env.LOGIN_OKTA_REDIRECT_URI || 'http://localhost:4000/api/auth/sso/okta/callback',
    scopes: (process.env.LOGIN_OKTA_SCOPES || 'openid email profile').split(/\s+/).filter(Boolean),
    issuer,
    authUrl: issuer ? `${issuer}/v1/authorize` : '',
    tokenUrl: issuer ? `${issuer}/v1/token` : '',
    userInfoUrl: issuer ? `${issuer}/v1/userinfo` : '',
  }
}

export function ssoProviderLabel(provider) {
  return LABELS[provider] || provider
}

export function ssoProviderConfigured(provider) {
  if (provider === 'microsoft') {
    const c = microsoftConfig()
    return Boolean(c.clientId && c.clientSecret)
  }
  if (provider === 'google') {
    const c = googleConfig()
    return Boolean(c.clientId && c.clientSecret)
  }
  if (provider === 'okta') {
    const c = oktaConfig()
    return Boolean(c.clientId && c.clientSecret && c.issuer)
  }
  return false
}

/** Lista providers habilitados en tenant ∩ configurados en env. */
export function resolveSsoProviders(loginMethods = []) {
  const enabled = (loginMethods || []).map((m) => String(m).toLowerCase())
  return SSO_PROVIDERS.filter((p) => enabled.includes(p) && ssoProviderConfigured(p)).map((id) => ({
    id,
    label: ssoProviderLabel(id),
    configured: true,
  }))
}

export function buildSsoAuthorizeUrl({ provider, empCodigo, tenantId, app = 'u', returnTo = '/' }) {
  const pkce = generatePkce()
  const state = signOAuthState({
    purpose: 'login_sso',
    provider,
    empCodigo: String(empCodigo || '').toUpperCase(),
    tenantId: String(tenantId || ''),
    verifier: pkce.verifier,
    app: app === 'a' ? 'a' : 'u',
    returnTo: returnTo || '/',
  })

  if (provider === 'microsoft') {
    const c = microsoftConfig()
    if (!c.clientId) {
      const err = new Error('SSO Microsoft no configurado (LOGIN_ENTRA_CLIENT_ID)')
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
    return { url: `${c.authBase}/authorize?${params}`, state }
  }

  if (provider === 'google') {
    const c = googleConfig()
    if (!c.clientId) {
      const err = new Error('SSO Google no configurado (LOGIN_GOOGLE_CLIENT_ID)')
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
      access_type: 'online',
      prompt: 'select_account',
    })
    return { url: `${c.authUrl}?${params}`, state }
  }

  if (provider === 'okta') {
    const c = oktaConfig()
    if (!c.clientId || !c.authUrl) {
      const err = new Error('SSO Okta no configurado (LOGIN_OKTA_*)')
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
    })
    return { url: `${c.authUrl}?${params}`, state }
  }

  const err = new Error('Proveedor SSO inválido')
  err.status = 400
  throw err
}

export function parseSsoState(state) {
  const body = verifyOAuthState(state)
  if (!body || body.purpose !== 'login_sso') return null
  return body
}

async function exchangeCode(tokenUrl, params) {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || 'Error al intercambiar código SSO')
    err.status = 502
    throw err
  }
  return json
}

function decodeIdTokenClaims(idToken) {
  if (!idToken) return null
  try {
    const part = String(idToken).split('.')[1]
    if (!part) return null
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

async function fetchUserInfo(url, accessToken) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || 'Error userinfo SSO')
    err.status = 502
    throw err
  }
  return json
}

/**
 * @returns {{ sub: string, email: string, emailVerified: boolean, name: string, givenName: string, familyName: string, raw: object }}
 */
export function normalizeOidcIdentity(claims = {}) {
  const email = String(claims.email || claims.preferred_username || claims.upn || '')
    .trim()
    .toLowerCase()
  const sub = String(claims.sub || claims.oid || claims.id || '').trim()
  const givenName = String(claims.given_name || claims.givenName || '').trim()
  const familyName = String(claims.family_name || claims.familyName || '').trim()
  let name = String(claims.name || '').trim()
  if (!name) name = [givenName, familyName].filter(Boolean).join(' ')
  return {
    sub,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true' || Boolean(email),
    name,
    givenName,
    familyName,
    raw: claims,
  }
}

export async function exchangeSsoCode({ provider, code, verifier }) {
  if (provider === 'microsoft') {
    const c = microsoftConfig()
    const tokens = await exchangeCode(
      `${c.authBase}/token`,
      new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        code,
        redirect_uri: c.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
        scope: c.scopes.join(' '),
      }),
    )
    const fromId = decodeIdTokenClaims(tokens.id_token) || {}
    let claims = { ...fromId }
    if (tokens.access_token) {
      try {
        const info = await fetchUserInfo('https://graph.microsoft.com/oidc/userinfo', tokens.access_token)
        claims = { ...claims, ...info }
      } catch {
        /* id_token alcanza */
      }
    }
    return normalizeOidcIdentity(claims)
  }

  if (provider === 'google') {
    const c = googleConfig()
    const tokens = await exchangeCode(
      c.tokenUrl,
      new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        code,
        redirect_uri: c.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    )
    const fromId = decodeIdTokenClaims(tokens.id_token) || {}
    let claims = { ...fromId }
    if (tokens.access_token) {
      const info = await fetchUserInfo(c.userInfoUrl, tokens.access_token)
      claims = { ...claims, ...info }
    }
    return normalizeOidcIdentity(claims)
  }

  if (provider === 'okta') {
    const c = oktaConfig()
    const tokens = await exchangeCode(
      c.tokenUrl,
      new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        code,
        redirect_uri: c.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    )
    const fromId = decodeIdTokenClaims(tokens.id_token) || {}
    let claims = { ...fromId }
    if (tokens.access_token) {
      const info = await fetchUserInfo(c.userInfoUrl, tokens.access_token)
      claims = { ...claims, ...info }
    }
    return normalizeOidcIdentity(claims)
  }

  const err = new Error('Proveedor SSO inválido')
  err.status = 400
  throw err
}

/** Dominio de email permitido por tenant (vacío = cualquiera). */
export function emailAllowedForTenant(email, authConfig = {}) {
  const domains = (authConfig?.allowedEmailDomains || [])
    .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
  if (!domains.length) return true
  const e = String(email || '').toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 0) return false
  const dom = e.slice(at + 1)
  return domains.includes(dom)
}
