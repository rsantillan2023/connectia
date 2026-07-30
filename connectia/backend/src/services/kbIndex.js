/**
 * Indexación hacia la KB del chatbot (Ola 12 / KbArticle).
 * Al publicar FAQ / tutorial / política se upserta un artículo KB con deep link.
 */
import { KbArticle } from '../models/KbArticle.js'
import { buildKbDocument } from '../lib/helpContent.js'
import { normalizeAudience } from '../lib/audience.js'

const KIND_TO_CATEGORIA = {
  faq: 'faq',
  tutorial: 'guia',
  policy: 'politica',
  document: 'general',
}

/**
 * Marca payload local + upsert en KbArticle.
 * @param {'faq'|'tutorial'|'policy'|'document'} kind
 * @param {import('mongoose').Document} doc
 */
export async function syncKbSource(kind, doc) {
  if (!doc) return { synced: false, reason: 'missing' }
  const plain = doc.toObject ? doc.toObject() : doc
  const payload = buildKbDocument({ kind, doc: plain })
  const tenantId = doc.tenantId
  const sourceId = doc._id

  if (!payload.indexable) {
    doc.kbSyncedAt = null
    doc.kbIndexPayload = null
    if (tenantId && sourceId) {
      await KbArticle.updateMany(
        { tenantId, sourceKind: kind, sourceId },
        { $set: { status: 'archived' } },
      )
    }
    return { synced: false, reason: 'not_published', payload }
  }

  doc.kbSyncedAt = new Date()
  doc.kbIndexPayload = {
    title: payload.title,
    body: payload.body,
    tags: payload.tags,
    href: payload.href,
    category: payload.category,
    version: payload.version || '',
    syncedAt: doc.kbSyncedAt,
  }

  const categoria = KIND_TO_CATEGORIA[kind] || 'general'
  const tags = [
    ...payload.tags,
    `source:${kind}`,
    payload.version ? `v:${payload.version}` : '',
  ].filter(Boolean)

  const article = await KbArticle.findOneAndUpdate(
    { tenantId, sourceKind: kind, sourceId },
    {
      $set: {
        titulo: (payload.title || 'Sin título').slice(0, 200),
        cuerpo: `${payload.body || ''}${payload.href ? `\n\nMás info: ${payload.href}` : ''}`.slice(0, 20000),
        tags: [...new Set(tags)].slice(0, 20),
        categoria,
        status: 'published',
        audience: normalizeAudience(plain.audience),
        orden: Number(plain.orden) || 100,
        href: payload.href,
        sourceKind: kind,
        sourceId,
      },
      $setOnInsert: {
        tenantId,
        createdBy: plain.authorId || null,
      },
    },
    { upsert: true, new: true },
  )

  doc.kbIndexPayload.kbArticleId = String(article._id)
  return { synced: true, payload, kbArticleId: String(article._id) }
}

export function kbPayloadSummary(doc) {
  if (!doc?.kbIndexPayload) return null
  return {
    href: doc.kbIndexPayload.href || '',
    tags: doc.kbIndexPayload.tags || [],
    syncedAt: doc.kbSyncedAt || doc.kbIndexPayload.syncedAt || null,
    kbArticleId: doc.kbIndexPayload.kbArticleId || null,
  }
}
