/**
 * Microsoft Graph Calendar — lectura y escritura (sync bidireccional).
 */

import { getValidAccessToken, MS_GRAPH } from '../lib/calendarOAuth.js'

function toGraphDate(iso, allDay) {
  if (allDay) {
    return { date: String(iso).slice(0, 10) }
  }
  return { dateTime: new Date(iso).toISOString().replace(/\.\d{3}Z$/, ''), timeZone: 'UTC' }
}

function fromGraphEvent(ev) {
  const start = ev.start?.dateTime
    ? new Date(`${ev.start.dateTime}${ev.start.timeZone === 'UTC' ? 'Z' : ''}`).toISOString()
    : ev.start?.date
      ? `${ev.start.date}T00:00:00.000Z`
      : null
  const end = ev.end?.dateTime
    ? new Date(`${ev.end.dateTime}${ev.end.timeZone === 'UTC' ? 'Z' : ''}`).toISOString()
    : ev.end?.date
      ? `${ev.end.date}T23:59:59.000Z`
      : null
  return {
    id: `outlook:${ev.id}`,
    externalId: ev.id,
    titulo: ev.subject || '(sin título)',
    descripcion: ev.bodyPreview || '',
    inicio: start,
    fin: end,
    allDay: !!ev.isAllDay,
    lugar: ev.location?.displayName || '',
    origin: 'OUTLOOK',
    provider: 'OUTLOOK',
    editable: true,
    webLink: ev.webLink || '',
  }
}

export async function listOutlookEvents(connection, { from, to }) {
  const token = await getValidAccessToken(connection)
  const calendarId = connection.calendarIds?.[0] || null
  const base = calendarId
    ? `${MS_GRAPH}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`
    : `${MS_GRAPH}/me/calendarView`
  const params = new URLSearchParams({
    startDateTime: new Date(from).toISOString(),
    endDateTime: new Date(to).toISOString(),
    $orderby: 'start/dateTime',
    $top: '100',
  })
  const res = await fetch(`${base}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error listando Outlook')
    err.status = res.status === 401 ? 401 : 502
    throw err
  }
  return (json.value || []).map(fromGraphEvent)
}

export async function createOutlookEvent(connection, event) {
  const token = await getValidAccessToken(connection)
  const body = {
    subject: event.titulo,
    body: {
      contentType: 'text',
      content: event.descripcion || '',
    },
    start: {
      dateTime: new Date(event.inicio).toISOString().replace(/\.\d{3}Z$/, ''),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(event.fin).toISOString().replace(/\.\d{3}Z$/, ''),
      timeZone: 'UTC',
    },
    isAllDay: !!event.allDay,
    location: event.lugar ? { displayName: event.lugar } : undefined,
  }
  const calendarId = connection.calendarIds?.[0]
  const url = calendarId
    ? `${MS_GRAPH}/me/calendars/${encodeURIComponent(calendarId)}/events`
    : `${MS_GRAPH}/me/events`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error creando evento Outlook')
    err.status = 502
    throw err
  }
  return fromGraphEvent(json)
}

export async function updateOutlookEvent(connection, externalId, patch) {
  const token = await getValidAccessToken(connection)
  const body = {}
  if (patch.titulo != null) body.subject = patch.titulo
  if (patch.descripcion != null) body.body = { contentType: 'text', content: patch.descripcion }
  if (patch.inicio != null) {
    body.start = {
      dateTime: new Date(patch.inicio).toISOString().replace(/\.\d{3}Z$/, ''),
      timeZone: 'UTC',
    }
  }
  if (patch.fin != null) {
    body.end = {
      dateTime: new Date(patch.fin).toISOString().replace(/\.\d{3}Z$/, ''),
      timeZone: 'UTC',
    }
  }
  if (patch.lugar != null) body.location = { displayName: patch.lugar }
  const res = await fetch(`${MS_GRAPH}/me/events/${encodeURIComponent(externalId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error actualizando Outlook')
    err.status = 502
    throw err
  }
  return fromGraphEvent(json)
}

export async function deleteOutlookEvent(connection, externalId) {
  const token = await getValidAccessToken(connection)
  const res = await fetch(`${MS_GRAPH}/me/events/${encodeURIComponent(externalId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    const json = await res.json().catch(() => ({}))
    const err = new Error(json.error?.message || 'Error eliminando Outlook')
    err.status = 502
    throw err
  }
  return { ok: true }
}

export { toGraphDate }
