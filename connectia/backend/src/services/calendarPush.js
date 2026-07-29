/**
 * Sync bidireccional: empujar evento corporativo al calendario personal del usuario.
 */

import { CalendarConnection } from '../models/CalendarConnection.js'
import { createOutlookEvent, deleteOutlookEvent } from './msGraphCalendar.js'
import { createGoogleEvent, deleteGoogleEvent } from './googleCalendar.js'

/**
 * Tras RSVP confirmado: crea copia en Outlook/Google si hay vínculo activo.
 * @returns {{ outlookEventId?: string, googleEventId?: string, errors: string[] }}
 */
export async function pushEventToPersonalCalendars({ tenantId, userId, event, existingExternal }) {
  const result = {
    outlookEventId: existingExternal?.outlookEventId || '',
    googleEventId: existingExternal?.googleEventId || '',
    errors: [],
  }

  const connections = await CalendarConnection.find({
    tenantId,
    userId,
    status: 'active',
    writeEnabled: true,
  })

  for (const conn of connections) {
    try {
      if (conn.provider === 'OUTLOOK') {
        if (result.outlookEventId) continue
        const created = await createOutlookEvent(conn, {
          titulo: `[Connectia] ${event.titulo}`,
          descripcion: event.descripcion || '',
          inicio: event.inicio,
          fin: event.fin,
          allDay: event.allDay,
          lugar: event.lugar || '',
        })
        result.outlookEventId = created.externalId
        conn.lastSyncAt = new Date()
        await conn.save()
      } else if (conn.provider === 'GOOGLE') {
        if (result.googleEventId) continue
        const created = await createGoogleEvent(conn, {
          titulo: `[Connectia] ${event.titulo}`,
          descripcion: event.descripcion || '',
          inicio: event.inicio,
          fin: event.fin,
          allDay: event.allDay,
          lugar: event.lugar || '',
        })
        result.googleEventId = created.externalId
        conn.lastSyncAt = new Date()
        await conn.save()
      }
    } catch (e) {
      result.errors.push(`${conn.provider}: ${e.message}`)
      conn.status = conn.status === 'revoked' ? 'revoked' : 'error'
      conn.lastError = String(e.message || '').slice(0, 500)
      await conn.save().catch(() => {})
    }
  }

  return result
}

/** Al cancelar RSVP: borra copias externas si existen. */
export async function removeEventFromPersonalCalendars({ tenantId, userId, external }) {
  const errors = []
  if (!external?.outlookEventId && !external?.googleEventId) return { errors }

  const connections = await CalendarConnection.find({
    tenantId,
    userId,
    status: { $in: ['active', 'error'] },
  })

  for (const conn of connections) {
    try {
      if (conn.provider === 'OUTLOOK' && external.outlookEventId) {
        await deleteOutlookEvent(conn, external.outlookEventId)
      }
      if (conn.provider === 'GOOGLE' && external.googleEventId) {
        await deleteGoogleEvent(conn, external.googleEventId)
      }
    } catch (e) {
      errors.push(`${conn.provider}: ${e.message}`)
    }
  }
  return { errors }
}
