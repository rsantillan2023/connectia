import { PostView } from '../models/PostView.js'
import { Post } from '../models/Post.js'
import { channelFromUa, utcDayKey } from './xlsxExport.js'

/**
 * Registra vista única por usuario/post/día (detail).
 * Incrementa Post.viewCount solo en el primer hit del día.
 * @returns {Promise<{ recorded: boolean, unique: boolean }>}
 */
export async function recordPostDetailView({ tenantId, postId, userId, userAgent = '' }) {
  if (!tenantId || !postId || !userId) return { recorded: false, unique: false }
  const dayKey = utcDayKey()
  const channel = channelFromUa(userAgent)
  try {
    await PostView.create({
      tenantId,
      postId,
      userId,
      kind: 'detail',
      channel,
      dayKey,
    })
    await Post.updateOne({ _id: postId, tenantId }, { $inc: { viewCount: 1 } })
    return { recorded: true, unique: true }
  } catch (e) {
    if (e?.code === 11000) return { recorded: true, unique: false }
    console.warn('[postView]', e.message)
    return { recorded: false, unique: false }
  }
}
