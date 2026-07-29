import { processDueScheduledPosts } from './postPublish.js'

let timer = null

/** Revisa publicaciones programadas cada 60s. */
export function startPostPublishScheduler() {
  if (timer) return
  const tick = async () => {
    try {
      const results = await processDueScheduledPosts()
      if (results.length) {
        console.log(`[post-scheduler] publicadas ${results.length} pieza(s)`)
      }
    } catch (err) {
      console.warn('[post-scheduler]', err?.message || err)
    }
  }
  timer = setInterval(tick, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 10_000)
}
