import { Comment } from '../models/Comment.js'
import { heuristicCommentModeration } from '../services/commentModerationAi.js'

/**
 * Seed de comentarios de demo para bandeja de moderación §10.
 */
export async function seedCommentsForTenant({ tenant, post, authors = [] } = {}) {
  if (!tenant?._id || !post?._id || !authors.length) {
    return { created: 0, skipped: true }
  }

  await Comment.deleteMany({
    tenantId: tenant._id,
    texto: { $regex: /^\[Seed\]/i },
  })

  const samples = [
    {
      texto: '[Seed] ¡Excelente noticia, gracias por compartir!',
      status: 'visible',
      author: authors[0],
    },
    {
      texto: '[Seed] Esto es una mierda, qué forma de avisar',
      status: 'pending_review',
      author: authors[1] || authors[0],
      forceRisk: true,
    },
    {
      texto: '[Seed] ¿Alguien tiene el CBU de la empresa para transferir?',
      status: 'pending_review',
      author: authors[2] || authors[0],
      forceRisk: true,
    },
    {
      texto: '[Seed] Felicitaciones al equipo, muy buen laburo.',
      status: 'visible',
      author: authors[0],
    },
  ]

  let created = 0
  for (const s of samples) {
    const analysis = heuristicCommentModeration(s.texto, tenant.commentsModeration?.glossary || [])
    await Comment.create({
      tenantId: tenant._id,
      postId: post._id,
      authorId: s.author._id,
      authorName: [s.author.nombre, s.author.apellido].filter(Boolean).join(' ') || s.author.usuario,
      texto: s.texto,
      status: s.status,
      moderationAi: analysis,
    })
    created += 1
  }

  return { created }
}
