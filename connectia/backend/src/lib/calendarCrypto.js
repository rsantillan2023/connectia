/**
 * Cifrado AES-256-GCM para tokens OAuth de calendario.
 * Clave: CALENDAR_TOKEN_ENC_KEY (32 bytes en base64) o derivada de JWT_ACCESS_SECRET en dev.
 */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function getKey() {
  const raw = process.env.CALENDAR_TOKEN_ENC_KEY || ''
  if (raw) {
    try {
      const buf = Buffer.from(raw, 'base64')
      if (buf.length === 32) return buf
    } catch {
      /* fallthrough */
    }
    return crypto.createHash('sha256').update(raw).digest()
  }
  const fallback = process.env.JWT_ACCESS_SECRET || 'connectia_dev_calendar_enc'
  return crypto.createHash('sha256').update(`calendar:${fallback}`).digest()
}

/**
 * @param {string} plaintext
 * @returns {string} iv.tag.ciphertext (base64 parts joined by .)
 */
export function encryptSecret(plaintext) {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

/**
 * @param {string} packed
 * @returns {string}
 */
export function decryptSecret(packed) {
  if (!packed) return ''
  const parts = String(packed).split('.')
  if (parts.length !== 3) {
    const err = new Error('Token cifrado inválido')
    err.status = 500
    throw err
  }
  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** Genera verifier + challenge PKCE (S256). */
export function generatePkce() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

/** State anti-CSRF firmado (HMAC). */
export function signOAuthState(payload, ttlMs = 10 * 60 * 1000) {
  const body = {
    ...payload,
    exp: Date.now() + ttlMs,
  }
  const data = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto.createHmac('sha256', getKey()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyOAuthState(state) {
  const [data, sig] = String(state || '').split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', getKey()).update(data).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!body.exp || body.exp < Date.now()) return null
    return body
  } catch {
    return null
  }
}
