import { processDueGreetingRules } from './greetingEngine.js'

let timer = null

/** Evalúa saludos cada 60s (hora local del tenant). */
export function startGreetingScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const results = await processDueGreetingRules()
      const created = results.filter((r) => r.created > 0)
      if (created.length) {
        const n = created.reduce((a, r) => a + (r.created || 0), 0)
        console.log(`[greeting-scheduler] ${n} publicación(es) celebración`)
      }
    } catch (err) {
      console.warn('[greeting-scheduler]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 12_000)
}
