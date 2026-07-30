import { processDueNewsletterRules } from './newsletterAuto.js'

let timer = null

/** Revisa reglas de newsletter automáticas vencidas cada 60s. */
export function startNewsletterRuleScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const results = await processDueNewsletterRules()
      if (results.length) {
        const ok = results.filter((r) => r.ok).length
        console.log(`[newsletter-rule-scheduler] reglas procesadas: ${results.length} (ok: ${ok})`)
      }
    } catch (err) {
      console.warn('[newsletter-rule-scheduler]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 15_000)
}
