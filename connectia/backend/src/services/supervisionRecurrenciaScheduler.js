import { processDueSupervisionRecurrencias } from './supervisionRecurrencia.js'

let timer = null

/** Genera visitas programadas vencidas cada 60s. */
export function startSupervisionRecurrenciaScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const results = await processDueSupervisionRecurrencias()
      if (results.length) {
        const ok = results.filter((r) => r.ok).length
        console.log(`[supervision-recurrencia] reglas: ${results.length} (ok: ${ok})`)
      }
    } catch (err) {
      console.warn('[supervision-recurrencia]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 20_000)
}
