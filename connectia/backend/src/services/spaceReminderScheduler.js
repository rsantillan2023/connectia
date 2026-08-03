import { processDueSpaceReminders } from './spaceReminder.js'

let timer = null

/** Revisa recordatorios de reservas cada 60s. */
export function startSpaceReminderScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const r = await processDueSpaceReminders()
      if (r.sent) {
        console.log(`[space-reminder] enviados ${r.sent}/${r.scanned}`)
      }
    } catch (err) {
      console.warn('[space-reminder]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 15_000)
}
