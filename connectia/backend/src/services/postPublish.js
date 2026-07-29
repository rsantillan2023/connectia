import { Post } from '../models/Post.js'
import { Tenant } from '../models/Tenant.js'
import { notifyPostPublished } from './notifyPost.js'

/**
 * Publica posts con status `scheduled` cuya `scheduledAt` ya venció.
 * @returns {Promise<Array<{ id: string, tenantId: string }>>}
 */
export async function processDueScheduledPosts(now = new Date()) {
  const due = await Post.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  }).limit(50)

  const results = []
  for (const p of due) {
    const prev = p.status
    if (prev !== 'scheduled') continue

    p.status = 'published'
    p.publishedAt = p.publishedAt || now
    await p.save()

    results.push({ id: String(p._id), tenantId: String(p.tenantId) })

    if (p.notifyAudience) {
      const tenant = await Tenant.findById(p.tenantId).lean()
      notifyPostPublished({ post: p.toObject(), tenant }).catch((err) =>
        console.warn('[post-scheduler] notify:', err?.message || err),
      )
    }
  }
  return results
}
