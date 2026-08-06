/**
 * Publicar reconocimiento en el muro + puntos opcionales.
 */
import { Post } from '../models/Post.js'
import { postLedgerEntry, tenantHasWallet } from './walletService.js'
import { scheduleAwardPoints } from './pointsRules.js'

/**
 * Crea publicación tipo celebracion si visibility=public.
 * @returns {Promise<import('mongoose').Document|null>}
 */
export async function publishRecognitionPost({ tenant, recognition, fromUser }) {
  if (!recognition || recognition.visibility === 'private') return null
  const valueBit = recognition.valueName ? ` · ${recognition.valueName}` : ''
  const titulo = `👏 ${recognition.fromName || 'Alguien'} reconoció a ${recognition.toName || 'un colega'}${valueBit}`
  const cuerpo =
    String(recognition.mensaje || '').trim() +
    `\n\n— Reconocimiento en Cultura`
  const post = await Post.create({
    tenantId: tenant._id,
    titulo: titulo.slice(0, 200),
    cuerpo: cuerpo.slice(0, 8000),
    tipo: 'celebracion',
    status: 'published',
    publishedAt: new Date(),
    authorId: fromUser?._id || recognition.fromUserId,
    authorName: recognition.fromName || '',
    origin: 'member',
    audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    commentsEnabled: true,
    notifyAudience: false,
    greeting: {
      forUserId: recognition.toUserId || null,
      eventType: 'recognition',
      runKey: `recognition:${String(recognition._id)}`,
    },
  })
  return post
}

/**
 * Acredita puntos al reconocido.
 * - Si hay regla `recognition_received` → awardPointsForEvent
 * - Si body.points > 0 y billetera → crédito explícito (tope 100)
 */
export async function awardRecognitionPoints({ tenant, recognition, pointsRequested = 0 }) {
  if (!recognition?.toUserId || !tenant?._id) return { awarded: 0 }

  scheduleAwardPoints({
    tenant,
    userId: recognition.toUserId,
    event: 'recognition_received',
    entityId: recognition._id,
    meta: { fromUserId: String(recognition.fromUserId || '') },
  })

  const pts = Math.min(100, Math.max(0, Math.floor(Number(pointsRequested) || 0)))
  if (!pts || !tenantHasWallet(tenant)) {
    return { awarded: 0, requested: pts }
  }

  try {
    const result = await postLedgerEntry({
      tenantId: tenant._id,
      userId: recognition.toUserId,
      type: 'credit',
      amount: pts,
      concept: `Reconocimiento de ${recognition.fromName || 'colegas'}`.slice(0, 240),
      idempotencyKey: `recognition:manual:${String(recognition._id)}`,
      createdBy: recognition.fromUserId,
      meta: {
        source: 'recognition',
        recognitionId: String(recognition._id),
        fromUserId: String(recognition.fromUserId || ''),
      },
    })
    return {
      awarded: pts,
      replay: Boolean(result?.replay),
      transactionId: result?.transaction?._id ? String(result.transaction._id) : null,
    }
  } catch (err) {
    console.warn('[recognition-points]', err?.message || err)
    return { awarded: 0, error: err.message }
  }
}

export function buildRecognitionPostHref(postId) {
  return postId ? `/muro/${postId}` : '/cultura'
}
