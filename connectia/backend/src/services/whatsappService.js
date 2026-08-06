/**
 * Canal WhatsApp Business / Meta Cloud API (28.COM.07).
 * Sin credenciales: DEV fallback (log) — nunca wa.me desde servidor.
 * Spec: consolidado §30.08 · §44 D09 (firma, idempotencia, rate).
 */

class WhatsappService {
  get isConfigured() {
    return Boolean(
      process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        (process.env.WHATSAPP_API_VERSION || 'v21.0'),
    )
  }

  get phoneNumberId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  }

  get apiVersion() {
    return process.env.WHATSAPP_API_VERSION || 'v21.0'
  }

  /**
   * @param {string} toE164
   * @param {{ body?: string, templateName?: string, languageCode?: string, components?: object[] }} payload
   */
  async sendMessage(toE164, payload = {}) {
    const to = String(toE164 || '').replace(/^\+/, '').trim()
    if (!to) return { success: false, reason: 'No phone' }

    if (!this.isConfigured) {
      if (process.env.COM_WA_DEV_LOG === '1' || process.env.NODE_ENV !== 'production') {
        console.log(`[whatsapp] DEV fallback to=${to} body=${String(payload.body || '').slice(0, 120)}`)
        return { success: true, devFallback: true, providerId: `dev-wa-${Date.now()}` }
      }
      return { success: false, reason: 'WhatsApp not configured' }
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`
    const body =
      payload.templateName
        ? {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: payload.templateName,
              language: { code: payload.languageCode || 'es' },
              components: payload.components || [],
            },
          }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: String(payload.body || '').slice(0, 4096) },
          }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = json?.error?.message || json?.message || `HTTP ${res.status}`
        console.error('[whatsapp] Meta error', err)
        return { success: false, error: err }
      }
      const providerId = json?.messages?.[0]?.id || ''
      return { success: true, providerId }
    } catch (e) {
      console.error('[whatsapp] send failed', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Verificación de webhook Meta (GET challenge).
   */
  verifyWebhookChallenge({ mode, token, challenge }) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      return { ok: true, challenge }
    }
    return { ok: false }
  }
}

export const whatsappService = new WhatsappService()
