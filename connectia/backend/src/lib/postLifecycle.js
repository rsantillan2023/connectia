/**
 * Helpers Ola 36 a/b — fijación temporal y vencimiento de publicaciones.
 */

export function parseOptionalDate(raw) {
  if (raw == null || raw === '') return null
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/** Duración de fijación en ms desde presets o horas/días explícitos. */
export function pinnedUntilFromDuration({ hours, days, preset } = {}, now = new Date()) {
  const base = now instanceof Date ? now : new Date(now)
  const presets = {
    '1h': 1 * 3600_000,
    '8h': 8 * 3600_000,
    '1d': 24 * 3600_000,
    '3d': 3 * 24 * 3600_000,
    '7d': 7 * 24 * 3600_000,
  }
  if (preset && presets[preset]) {
    return new Date(base.getTime() + presets[preset])
  }
  const h = Number(hours)
  const d = Number(days)
  let ms = 0
  if (Number.isFinite(h) && h > 0) ms += h * 3600_000
  if (Number.isFinite(d) && d > 0) ms += d * 24 * 3600_000
  if (ms <= 0) return null
  return new Date(base.getTime() + ms)
}

export function normalizeSection(raw) {
  const s = String(raw || '')
    .trim()
    .slice(0, 80)
  return s
}

/**
 * Condición Mongo: pub publicada aún vigente (sin vencimiento o futuro).
 */
export function notExpiredFilter(now = new Date()) {
  return {
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  }
}

/**
 * Desfija pubs con pinnedUntil vencido; archiva pubs con expiresAt vencido.
 */
export async function processPostLifecycle(Post, now = new Date()) {
  const unpin = await Post.updateMany(
    {
      pinned: true,
      pinnedUntil: { $ne: null, $lte: now },
    },
    { $set: { pinned: false, pinnedUntil: null } },
  )

  const expired = await Post.find({
    status: { $in: ['published', 'scheduled'] },
    expiresAt: { $ne: null, $lte: now },
  }).limit(50)

  let archived = 0
  for (const p of expired) {
    p.status = 'archived'
    p.pinned = false
    p.pinnedUntil = null
    await p.save()
    archived += 1
  }

  return {
    unpinned: unpin.modifiedCount || 0,
    archived,
  }
}
