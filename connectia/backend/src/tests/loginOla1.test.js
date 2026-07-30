import test from 'node:test'
import assert from 'node:assert/strict'
import {
  emailAllowedForTenant,
  normalizeOidcIdentity,
  SSO_PROVIDERS,
  ssoProviderLabel,
} from '../lib/loginOidc.js'
import {
  generateOtpCode,
  hashOtp,
  maskDestination,
  shouldChallengeTwoFactor,
  resolveTwoFactorMethod,
} from '../lib/loginTwoFactor.js'
import {
  mintLoginToken,
  parseLoginToken,
  signLegacyLoginToken,
  verifyLegacyLoginToken,
  hashConsumedJti,
} from '../lib/loginTokenAuth.js'

test('SSO providers known', () => {
  assert.deepEqual(SSO_PROVIDERS, ['microsoft', 'google', 'okta'])
  assert.equal(ssoProviderLabel('google'), 'Google')
})

test('normalizeOidcIdentity picks email and names', () => {
  const id = normalizeOidcIdentity({
    sub: 'abc',
    email: 'User@Acme.COM',
    given_name: 'Ana',
    family_name: 'Pérez',
  })
  assert.equal(id.email, 'user@acme.com')
  assert.equal(id.sub, 'abc')
  assert.equal(id.givenName, 'Ana')
  assert.equal(id.familyName, 'Pérez')
})

test('emailAllowedForTenant respects domain allowlist', () => {
  assert.equal(emailAllowedForTenant('a@x.com', {}), true)
  assert.equal(emailAllowedForTenant('a@acme.com', { allowedEmailDomains: ['acme.com'] }), true)
  assert.equal(emailAllowedForTenant('a@other.com', { allowedEmailDomains: ['acme.com'] }), false)
})

test('OTP hash and mask', () => {
  const code = generateOtpCode(6)
  assert.match(code, /^\d{6}$/)
  assert.equal(hashOtp(code), hashOtp(code))
  assert.notEqual(hashOtp('123456'), hashOtp('654321'))
  assert.ok(maskDestination('email', 'demo@acme.com', '').includes('@'))
  assert.ok(maskDestination('sms', '', '5491112345678').endsWith('5678'))
})

test('shouldChallengeTwoFactor and method resolution', () => {
  assert.equal(shouldChallengeTwoFactor({ twoFactorEnabled: true }, {}), true)
  assert.equal(shouldChallengeTwoFactor({}, { authConfig: { twoFactorRequired: true } }), true)
  assert.equal(shouldChallengeTwoFactor({}, {}), false)
  assert.equal(resolveTwoFactorMethod({ twoFactorMethod: 'sms' }, {}), 'sms')
  assert.equal(
    resolveTwoFactorMethod({ twoFactorMethod: 'sms' }, { authConfig: { twoFactorMethods: ['email'] } }),
    'email',
  )
})

test('login token mint/parse one-shot jti', () => {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret_login_token'
  const { token, jti } = mintLoginToken({ userId: 'u1', empId: 't1', empCodigo: 'DEMO' })
  const parsed = parseLoginToken(token)
  assert.ok(parsed)
  assert.equal(parsed.userId, 'u1')
  assert.equal(parsed.empCodigo, 'DEMO')
  assert.equal(parsed.jti, jti)
  assert.ok(hashConsumedJti(jti).length > 10)
  assert.equal(parseLoginToken('bad.token'), null)
})

test('legacy login token verify', () => {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret_login_token'
  const tenant = { authConfig: { legacySharedSecret: 'legacy_test_secret' } }
  const tok = signLegacyLoginToken({ usuario: 'demo', empCodigo: 'DEMO' }, tenant, '5m')
  const decoded = verifyLegacyLoginToken(tok, tenant)
  assert.ok(decoded)
  assert.equal(decoded.usuario, 'demo')
  assert.equal(verifyLegacyLoginToken('nope', tenant), null)
})
