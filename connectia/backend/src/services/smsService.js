/**
 * SMS transaccional (Twilio) — 2FA §1.09.
 * Sin credenciales: log en consola (dev) y success=false salvo LOGIN_SMS_DEV_LOG=1.
 */

class SmsService {
  get isConfigured() {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER,
    )
  }

  /**
   * @param {string} to
   * @param {string} body
   */
  async sendSms(to, body) {
    const phone = String(to || '').trim()
    if (!phone) return { success: false, reason: 'No phone' }

    if (!this.isConfigured) {
      if (process.env.LOGIN_SMS_DEV_LOG === '1' || process.env.NODE_ENV !== 'production') {
        console.log(`[sms] DEV fallback to=${phone} body=${body}`)
        return { success: true, devFallback: true }
      }
      return { success: false, reason: 'SMS not configured' }
    }

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM_NUMBER
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
    const params = new URLSearchParams({ To: phone, From: from, Body: body })
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[sms] Twilio error', json)
        return { success: false, error: json.message || 'Twilio error' }
      }
      return { success: true, sid: json.sid }
    } catch (e) {
      console.error('[sms] send failed', e)
      return { success: false, error: e.message }
    }
  }

  async sendTwoFactorCode(phone, { code, brandName = 'Connectia', expiresInMinutes = 10 }) {
    const body = `${brandName}: tu código de verificación es ${code}. Vence en ${expiresInMinutes} min.`
    return this.sendSms(phone, body)
  }
}

export const smsService = new SmsService()
