/**
 * Google Calendar API — lectura y escritura (sync bidireccional).
 */

import { getValidAccessToken, GOOGLE_CAL } from '../lib/calendarOAuth.js'

function fromGoogleEvent(ev) {
  const start = ev.start?.dateTime
    ? new Date(ev.start.dateTime).toISOString()
    : ev.start?.date
      ? `${ev.start.date}T00:00:00.000Z`
      : null
  const end = ev.end?.dateTime
    ? new Date(ev.end.dateTime).toISOString()
    : ev.end?.date
      ? `${ev.end.date}T23:59:59.000Z`
      : null
  return {
    id: `google:${ev.id}`,
    externalId: ev.id,
    titulo: ev.summary || '(sin título)',
    descripcion: ev.description || '',
    inicio: start,
    fin: end,
    allDay: !!(ev.start?.date && !ev.start?.dateTime),
    lugar: ev.location || '',
    origin: 'GOOGLE',
    provider: 'GOOGLE',
    editable: true,
    webLink: ev.htmlLink || '',
  }
}

function calendarPath(connection) {
  const id = connection.calendarIds?.[0] || 'primary'
  return `${GOOGLE_CAL}/calendars/${encodeURIComponent(id)}`
}

export async function listGoogleEvents(connection, { from, to }) {
  const token = await getValidAccessToken(connection)
  const params = new URLSearchParams({
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const res = await fetch(`${calendarPath(connection)}/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error listando Google Calendar')
    err.status = res.status === 401 ? 401 : 502
    throw err
  }
  return (json.items || []).map(fromGoogleEvent)
}

export async function createGoogleEvent(connection, event) {
  const token = await getValidAccessToken(connection)
  const body = event.allDay
    ? {
        summary: event.titulo,
        description: event.descripcion || '',
        location: event.lugar || '',
        start: { date: String(event.inicio).slice(0, 10) },
        end: { date: String(event.fin).slice(0, 10) },
      }
    : {
        summary: event.titulo,
        description: event.descripcion || '',
        location: event.lugar || '',
        start: { dateTime: new Date(event.inicio).toISOString() },
        end: { dateTime: new Date(event.fin).toISOString() },
      }
  const res = await fetch(`${calendarPath(connection)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error creando evento Google')
    err.status = 502
    throw err
  }
  return fromGoogleEvent(json)
}

export async function updateGoogleEvent(connection, externalId, patch) {
  const token = await getValidAccessToken(connection)
  const body = {}
  if (patch.titulo != null) body.summary = patch.titulo
  if (patch.descripcion != null) body.description = patch.descripcion
  if (patch.lugar != null) body.location = patch.lugar
  if (patch.inicio != null || patch.fin != null) {
    if (patch.allDay) {
      if (patch.inicio) body.start = { date: String(patch.inicio).slice(0, 10) }
      if (patch.fin) body.end = { date: String(patch.fin).slice(0, 10) }
    } else {
      if (patch.inicio) body.start = { dateTime: new Date(patch.inicio).toISOString() }
      if (patch.fin) body.end = { dateTime: new Date(patch.fin).toISOString() }
    }
  }
  const res = await fetch(`${calendarPath(connection)}/events/${encodeURIComponent(externalId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || 'Error actualizando Google')
    err.status = 502
    throw err
  }
  return fromGoogleEvent(json)
}

export async function deleteGoogleEvent(connection, externalId) {
  const token = await getValidAccessToken(connection)
  const res = await fetch(`${calendarPath(connection)}/events/${encodeURIComponent(externalId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    const json = await res.json().catch(() => ({}))
    const err = new Error(json.error?.message || 'Error eliminando Google')
    err.status = 502
    throw err
  }
  return { ok: true }
}
