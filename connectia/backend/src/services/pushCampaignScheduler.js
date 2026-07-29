import { processDuePushCampaigns } from './notifyCampaign.js'

let timer = null

/** Revisa campañas programadas cada 60s. */
export function startPushCampaignScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const results = await processDuePushCampaigns()
      if (results.length) {
        console.log(`[push-scheduler] procesadas ${results.length} campañas`)
      }
    } catch (err) {
      console.warn('[push-scheduler]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  // primer pase a los 8s (dejar que arranque Mongo)
  setTimeout(tick, 8_000)
}
