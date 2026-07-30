/**
 * Login por token opaco (deep-link) y login legacy firmado (§1.05 / §1.07).
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const TOKEN_TTL_MS = 10 * 60 * 1000

function legacySecret(tenant) {
  return (
    tenant?.authConfig?.legacySharedSecret ||
    process.env.LOGIN_LEGACY_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'connectia_dev_legacy'
  )
}

function tokenSecret() {
  return process.env.LOGIN_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET || 'connectia_dev_token'
}

/** Token opaco de un solo uso: payload firmado HMAC + jti. */
export function mintLoginToken(
  { userId, empId, empCodigo, action = 'login' },
  ttlMs = TOKEN_TTL_MS,
) {
  const jti = crypto.randomBytes(16).toString('hex')
  const body = {
    purpose: 'login_token',
    userId: String(userId),
    empId: String(empId),
    empCodigo: String(empCodigo || '').toUpperCase(),
    action,
    jti,
    exp: Date.now() + ttlMs,
  }
  const data = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto.createHmac('sha256', tokenSecret()).update(data).digest('base64url')
  return { token: `${data}.${sig}`, jti, expiresAt: new Date(body.exp) }
}

export function parseLoginToken(token) {
  const [data, sig] = String(token || '').split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', tokenSecret()).update(data).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (body.purpose !== 'login_token') return null
    if (!body.exp || body.exp < Date.now()) return null
    return body
  } catch {
    return null
  }
}

/**
 * Login legacy: JWT firmado con secreto por tenant/env.
 * Claims mínimos: empCodigo | empId, usuario | idExterno | email, exp.
 */
export function verifyLegacyLoginToken(token, tenant) {
  try {
    const decoded = jwt.verify(token, legacySecret(tenant), { algorithms: ['HS256'] })
    if (decoded.purpose && decoded.purpose !== 'legacy_login') {
      /* accept unsigned purpose for older issuers */
    }
    return decoded
  } catch {
    return null
  }
}

/** Firma helper (tests / scripts). */
export function signLegacyLoginToken(payload, tenant, expiresIn = '10m') {
  return jwt.sign(
    { purpose: 'legacy_login', ...payload },
    legacySecret(tenant),
    { expiresIn, algorithm: 'HS256' },
  )
}

export function hashConsumedJti(jti) {
  return crypto.createHash('sha256').update(String(jti)).digest('hex')
}
