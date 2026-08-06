/**
 * 2FA por código OTP (email / SMS) — §1.08 / §1.09
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const DEFAULT_TTL_MIN = 10
const CODE_LEN = 6

export function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

export function generateOtpCode(length = CODE_LEN) {
  const max = 10 ** length
  const n = crypto.randomInt(0, max)
  return String(n).padStart(length, '0')
}

export function otpTtlMinutes() {
  return Number(process.env.LOGIN_2FA_TTL_MINUTES || DEFAULT_TTL_MIN)
}

/**
 * Challenge JWT de corta duración (no es sesión).
 * @param {{ userId: string, empId: string, method: string }} payload
 */
export function signTwoFactorChallenge(payload, ttlMin = otpTtlMinutes()) {
  return jwt.sign(
    {
      sub: payload.userId,
      empId: payload.empId,
      method: payload.method || 'email',
      purpose: '2fa',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: `${ttlMin}m` },
  )
}

export function verifyTwoFactorChallenge(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    if (decoded.purpose !== '2fa') return null
    return decoded
  } catch {
    return null
  }
}

export function maskDestination(method, email, telefono) {
  if (method === 'sms') {
    const t = String(telefono || '')
    if (t.length < 4) return '***'
    return `${'*'.repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`
  }
  const e = String(email || '')
  const at = e.indexOf('@')
  if (at < 2) return '***'
  return `${e[0]}***${e.slice(at - 1)}`
}

/** ¿El usuario/tenant exige 2FA en este login? */
export function shouldChallengeTwoFactor(user, tenant) {
  if (user?.twoFactorEnabled) return true
  if (tenant?.authConfig?.twoFactorRequired) return true
  return false
}

export function resolveTwoFactorMethod(user, tenant) {
  const preferred = user?.twoFactorMethod || 'email'
  const allowed = tenant?.authConfig?.twoFactorMethods || ['email', 'sms']
  if (allowed.includes(preferred)) return preferred
  return allowed[0] || 'email'
}
