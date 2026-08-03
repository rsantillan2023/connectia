import mongoose from 'mongoose'
import { Post } from '../models/Post.js'
import {
  buildFeedManifest,
  normalizeChannelConfig,
  filterActivePlaylistItems,
} from './tvLive.js'

/**
 * Carga pubs relevantes y arma el manifiesto TV-ready del canal.
 * Solo pubs publicadas con audiencia "all" (visibles en muro público).
 */
export async function resolveTvFeedManifest(playlist, device, tenant, now = new Date()) {
  if (!playlist) {
    return buildFeedManifest({
      playlist: {
        _id: 'none',
        version: 1,
        channel: normalizeChannelConfig(null, tenant?.nombre),
        items: [],
        fallbackText: `${tenant?.nombre || 'Connectia'} · pantalla en espera`,
      },
      device,
      tenant,
      posts: [],
      now,
    })
  }
  const channel = normalizeChannelConfig(playlist?.channel, tenant?.nombre)
  const curated = filterActivePlaylistItems(playlist?.items, now)
  const curatedPostIds = curated
    .filter((it) => it.type === 'post' && it.postId)
    .map((it) => it.postId)
    .filter((id) => mongoose.isValidObjectId(id))

  const listIds = (channel.wallIncludePostIds || []).filter((id) => mongoose.isValidObjectId(id))
  const posts = []
  const idSet = new Set()

  const audienceClause = {
    $or: [{ 'audience.mode': 'all' }, { audience: { $exists: false } }, { audience: null }],
  }

  if (channel.wallEnabled && channel.contentMode === 'list' && listIds.length) {
    const listed = await Post.find({
      tenantId: tenant._id,
      _id: { $in: listIds },
      status: 'published',
      $and: [audienceClause],
    }).lean()
    for (const p of listed) {
      idSet.add(String(p._id))
      posts.push(p)
    }
  } else if (channel.wallEnabled && channel.contentMode === 'auto' && channel.wallMax > 0) {
    const since = new Date(now.getTime() - channel.wallDays * 24 * 60 * 60 * 1000)
    const and = [
      audienceClause,
      {
        $or: [
          { publishedAt: { $gte: since } },
          { $and: [{ $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }] }, { createdAt: { $gte: since } }] },
        ],
      },
    ]
    const wallQuery = {
      tenantId: tenant._id,
      status: 'published',
      $and: and,
    }
    if (channel.wallExcludeKnowledge) wallQuery.isKnowledge = { $ne: true }
    if (channel.wallTypes?.length) wallQuery.tipo = { $in: channel.wallTypes }
    if (!channel.wallIncludeMemberPosts) wallQuery.origin = { $ne: 'member' }
    if (channel.wallCategoryIds?.length) {
      wallQuery.categoryId = {
        $in: channel.wallCategoryIds.filter((id) => mongoose.isValidObjectId(id)),
      }
    }
    const exclude = (channel.wallExcludePostIds || []).filter((id) => mongoose.isValidObjectId(id))
    if (exclude.length) wallQuery._id = { $nin: exclude }

    const wall = await Post.find(wallQuery).sort({ pinned: -1, publishedAt: -1 }).limit(60).lean()
    for (const p of wall) {
      idSet.add(String(p._id))
      posts.push(p)
    }
  }

  const missingCurated = curatedPostIds.filter((id) => !idSet.has(String(id)))
  if (missingCurated.length) {
    const extra = await Post.find({
      tenantId: tenant._id,
      _id: { $in: missingCurated },
      status: 'published',
      $and: [audienceClause],
    }).lean()
    posts.push(...extra)
  }

  return buildFeedManifest({ playlist, device, tenant, posts, now })
}
