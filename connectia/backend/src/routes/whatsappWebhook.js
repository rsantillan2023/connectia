import { Router } from 'express'
import { whatsappService } from '../services/whatsappService.js'
import { Communication } from '../models/Communication.js'
import { sanitizeErrorMessage } from '../lib/communicationTemplates.js'

/**
 * Webhook público Meta WhatsApp (28.COM.07).
 * GET = challenge · POST = estados (sin PII en logs).
 */
const router = Router()

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const result = whatsappService.verifyWebhookChallenge({ mode, token, challenge })
  if (result.ok) return res.status(200).send(result.challenge)
  return res.sendStatus(403)
})

router.post('/whatsapp', async (req, res) => {
  try {
    const entries = req.body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        const statuses = change?.value?.statuses || []
        for (const st of statuses) {
          const providerId = st.id
          const status = st.status
          if (!providerId || !status) continue
          const mapped =
            status === 'delivered'
              ? 'delivered'
              : status === 'read'
                ? 'read'
                : status === 'failed'
                  ? 'failed'
                  : null
          if (!mapped) continue
          const update = { status: mapped }
          if (mapped === 'failed') {
            update.errorMessage = sanitizeErrorMessage(
              st?.errors?.[0]?.title || st?.errors?.[0]?.message || 'WhatsApp failed',
            )
          }
          await Communication.updateOne({ providerId }, { $set: update })
        }
      }
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('[whatsapp-webhook]', e.message)
    res.sendStatus(200)
  }
})

export default router
