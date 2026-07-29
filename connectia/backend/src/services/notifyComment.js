import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'

/**
 * Avisa al autor que su comentario fue ocultado (in-app).
 */
export async function notifyCommentHidden({ comment, post, reason }) {
  if (!comment?.authorId) return { inApp: 0, skipped: true }

  const user = await User.findOne({
    _id: comment.authorId,
    tenantId: comment.tenantId,
    activo: true,
  })
    .select('_id')
    .lean()

  if (!user) return { inApp: 0, skipped: true }

  const motivo = String(reason || '').trim() || 'No cumple las normas de la comunidad.'
  const postTitle = String(post?.titulo || 'una publicación').trim().slice(0, 80)
  const body = `Tu comentario en «${postTitle}» fue ocultado. Motivo: ${motivo}`.slice(0, 500)

  try {
    await AppNotification.create({
      tenantId: comment.tenantId,
      userId: user._id,
      kind: 'comment_hidden',
      title: 'Comentario ocultado',
      body,
      href: post?._id ? `/muro/${post._id}` : '/muro',
      refType: 'comment',
      refId: comment._id,
    })
    return { inApp: 1 }
  } catch (err) {
    console.warn('[notify-comment-hidden]', err?.message || err)
    return { inApp: 0 }
  }
}
