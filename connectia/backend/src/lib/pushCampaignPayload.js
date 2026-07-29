import { normalizeAudience } from './audience.js'

export function parseIdsCsv(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  return String(raw || '')
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildCampaignPayload(body = {}) {
  const audience = normalizeAudience({
    mode: body.audience?.mode || body.audiencia || 'all',
    areaIds: body.audience?.areaIds ?? parseIdsCsv(body.areaIds),
    groupIds: body.audience?.groupIds ?? parseIdsCsv(body.groupIds),
    userIds: body.audience?.userIds ?? parseIdsCsv(body.userIds),
  })

  const title = String(body.title || body.titulo || '').trim().slice(0, 120)
  const messageBody = String(body.body || body.cuerpo || '').trim().slice(0, 500)
  const href = String(body.href || body.url || '/').trim().slice(0, 300) || '/'
  const name = String(body.name || body.nombre || title).trim().slice(0, 120)
  const segment = body.segment === 'inactive' ? 'inactive' : 'audience'
  const inactiveDays = Math.min(365, Math.max(1, Number(body.inactiveDays) || 30))
  const sendTypeRaw = String(body.sendType || body.envio || body.tipoEnvio || 'now').toLowerCase()
  const sendType =
    sendTypeRaw === 'scheduled' || sendTypeRaw === '1' || sendTypeRaw === 'programado'
      ? 'scheduled'
      : 'now'

  let scheduledAt = null
  if (sendType === 'scheduled') {
    const raw = body.scheduledAt || body.fechaProgramada || body.fechaDesde
    scheduledAt = raw ? new Date(raw) : null
  }

  const channels = {
    inApp: body.channels?.inApp !== false && body.inApp !== false,
    push: body.channels?.push !== false && body.push !== false,
  }

  return {
    name,
    title,
    body: messageBody,
    href,
    audience,
    segment,
    inactiveDays,
    sendType,
    scheduledAt,
    channels,
    idempotencyKey: String(body.idempotencyKey || '').trim().slice(0, 80),
  }
}

/** @returns {string|null} mensaje de error o null si OK */
export function validateCampaignPayload(p) {
  if (!p?.title) return 'Título obligatorio'
  if (p.sendType === 'scheduled') {
    if (!p.scheduledAt || Number.isNaN(p.scheduledAt.getTime())) return 'Fecha de programación inválida'
    if (p.scheduledAt.getTime() < Date.now() - 60_000) return 'La fecha programada ya pasó'
  }
  if (
    p.audience?.mode === 'restricted' &&
    !p.audience.areaIds?.length &&
    !p.audience.groupIds?.length &&
    !p.audience.userIds?.length
  ) {
    return 'Audiencia restringida sin áreas, grupos ni usuarios'
  }
  if (p.audience?.mode === 'users' && !p.audience.userIds?.length) {
    return 'Audiencia por usuarios sin destinatarios'
  }
  return null
}

export function csvEscape(v) {
  const s = String(v ?? '')
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(headers, rows) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return `${lines.join('\n')}\n`
}

/** Normaliza href de deep link / URL. */
export function sanitizeCampaignHref(raw) {
  const h = String(raw || '/').trim().slice(0, 300)
  if (!h) return '/'
  if (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('/')) return h
  return `/${h}`
}
