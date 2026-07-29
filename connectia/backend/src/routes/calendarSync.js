import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { CalendarConnection } from '../models/CalendarConnection.js'
import { Event, EventRsvp } from '../models/Event.js'
import { TenantParam } from '../models/TenantParam.js'
import { audienceFilterForUser } from '../lib/audience.js'
import { serializeEvent, serializeUnifiedItem, parseDate } from '../lib/event.js'
import {
  PROVIDERS,
  providerConfigured,
  buildAuthorizeUrl,
  parseCallbackState,
  exchangeCode,
  packTokens,
  fetchAccountEmail,
  revokeProviderToken,
} from '../lib/calendarOAuth.js'
import { listOutlookEvents, createOutlookEvent, updateOutlookEvent, deleteOutlookEvent } from '../services/msGraphCalendar.js'
import { listGoogleEvents, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '../services/googleCalendar.js'
import {
  eventAiConfigured,
  summarizeTodayWithAi,
  suggestScheduleSlots,
} from '../services/eventAi.js'

const router = Router()

const FRONTEND = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

async function tenantCalendarPolicy(tenantId) {
  const keys = ['calendar.outlook.enabled', 'calendar.google.enabled']
  const rows = await TenantParam.find({ tenantId, key: { $in: keys } }).lean()
  const map = Object.fromEntries(rows.map((r) => [r.key, r.valor]))
  return {
    outlook: map['calendar.outlook.enabled'] === true || map['calendar.outlook.enabled'] === 'true',
    google: map['calendar.google.enabled'] === true || map['calendar.google.enabled'] === 'true',
  }
}

function serializeConnection(c) {
  return {
    id: String(c._id),
    provider: c.provider,
    status: c.status,
    accountEmail: c.accountEmail || '',
    connectedAt: c.connectedAt ? new Date(c.connectedAt).toISOString() : null,
    lastSyncAt: c.lastSyncAt ? new Date(c.lastSyncAt).toISOString() : null,
    writeEnabled: !!c.writeEnabled,
    lastError: c.status === 'error' ? c.lastError || '' : '',
    calendarIds: c.calendarIds || [],
  }
}

/** GET /api/calendar/status — política + conexiones del usuario */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const policy = await tenantCalendarPolicy(req.tenant._id)
    const connections = await CalendarConnection.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: { $ne: 'revoked' },
    }).lean()

    res.json({
      policy: {
        outlookEnabled: policy.outlook,
        googleEnabled: policy.google,
      },
      providers: {
        OUTLOOK: {
          enabled: policy.outlook,
          configured: providerConfigured('OUTLOOK'),
        },
        GOOGLE: {
          enabled: policy.google,
          configured: providerConfigured('GOOGLE'),
        },
      },
      connections: connections.map(serializeConnection),
      timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
      aiConfigured: eventAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * GET /api/calendar/today-summary
 * Resumen “qué tengo hoy” (corp + personales conectados).
 */
router.get('/today-summary', requireAuth, async (req, res, next) => {
  try {
    const tz = req.tenant.timezone || 'America/Argentina/Buenos_Aires'
    const now = new Date()
    // Rango día local aproximado: ±14h alrededor de medianoche UTC ajustado — usamos día calendario del tenant vía Intl
    let ymd
    try {
      ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now)
    } catch {
      ymd = now.toISOString().slice(0, 10)
    }
    const from = new Date(`${ymd}T00:00:00.000Z`)
    const to = new Date(`${ymd}T23:59:59.999Z`)
    // Ampliar para cubrir offset TZ (hasta ±14h)
    from.setUTCHours(from.getUTCHours() - 14)
    to.setUTCHours(to.getUTCHours() + 14)

    const items = []
    const events = await Event.find({
      tenantId: req.tenant._id,
      status: 'published',
      inicio: { $lte: to },
      fin: { $gte: from },
      $and: [audienceFilterForUser(req.user)],
    })
      .sort({ inicio: 1 })
      .limit(50)
      .lean()

    for (const e of events) {
      items.push(
        serializeUnifiedItem({
          id: `corp:${e._id}`,
          titulo: e.titulo,
          inicio: e.inicio.toISOString(),
          fin: e.fin.toISOString(),
          allDay: e.allDay,
          lugar: e.lugar,
          origin: 'CORPORATE',
        }),
      )
    }

    const connections = await CalendarConnection.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: 'active',
    })
    for (const conn of connections) {
      try {
        const list =
          conn.provider === 'OUTLOOK'
            ? await listOutlookEvents(conn, { from, to })
            : await listGoogleEvents(conn, { from, to })
        items.push(...list.map(serializeUnifiedItem))
      } catch {
        /* ignore provider errors for summary */
      }
    }

    items.sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))
    const summary = await summarizeTodayWithAi(items, { timezone: tz })
    res.json({ ...summary, items, timezone: tz, date: ymd })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/calendar/suggest-slots
 * Body: { durationHours? } — sugiere horarios libres vs agenda unificada.
 */
router.post('/suggest-slots', requireAuth, async (req, res, next) => {
  try {
    const durationHours = Math.min(8, Math.max(0.5, Number(req.body?.durationHours) || 1))
    const from = new Date()
    const to = new Date(from.getTime() + 14 * 86400000)

    const busy = []
    const events = await Event.find({
      tenantId: req.tenant._id,
      status: 'published',
      inicio: { $lte: to },
      fin: { $gte: from },
      $and: [audienceFilterForUser(req.user)],
    })
      .select('inicio fin')
      .lean()
    for (const e of events) {
      busy.push({ inicio: e.inicio.toISOString(), fin: e.fin.toISOString() })
    }

    const connections = await CalendarConnection.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: 'active',
    })
    for (const conn of connections) {
      try {
        const list =
          conn.provider === 'OUTLOOK'
            ? await listOutlookEvents(conn, { from, to })
            : await listGoogleEvents(conn, { from, to })
        for (const i of list) busy.push({ inicio: i.inicio, fin: i.fin })
      } catch {
        /* ignore */
      }
    }

    const result = suggestScheduleSlots({ busyItems: busy, durationHours })
    res.json({ ...result, configured: eventAiConfigured() })
  } catch (e) {
    next(e)
  }
})

/**
 * GET /api/calendar/connect/:provider
 * Inicia OAuth; query returnTo opcional.
 */
router.get('/connect/:provider', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toUpperCase()
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Proveedor inválido' })

    const policy = await tenantCalendarPolicy(req.tenant._id)
    if (provider === 'OUTLOOK' && !policy.outlook) {
      return res.status(403).json({ error: 'Outlook no habilitado en este tenant' })
    }
    if (provider === 'GOOGLE' && !policy.google) {
      return res.status(403).json({ error: 'Google Calendar no habilitado en este tenant' })
    }

    const returnTo = String(req.query.returnTo || '/agenda?connected=1')
    const { url } = buildAuthorizeUrl({
      provider,
      tenantId: req.tenant._id,
      userId: req.user._id,
      frontendReturn: returnTo.startsWith('/') ? returnTo : '/agenda?connected=1',
    })

    if (req.query.redirect === '0') {
      return res.json({ url })
    }
    res.redirect(url)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * GET /api/calendar/callback/:provider
 * Callback OAuth (sin JWT; state firmado).
 */
router.get('/callback/:provider', async (req, res) => {
  const providerParam = String(req.params.provider || '').toUpperCase()
  const provider = providerParam === 'OUTLOOK' || providerParam === 'GOOGLE' ? providerParam : null
  const fail = (msg) => {
    const q = new URLSearchParams({ calendar_error: msg })
    res.redirect(`${FRONTEND()}/agenda?${q}`)
  }

  try {
    if (!provider) return fail('proveedor_invalido')
    if (req.query.error) return fail(String(req.query.error))

    const state = parseCallbackState(req.query.state)
    if (!state || state.provider !== provider) return fail('state_invalido')

    const code = String(req.query.code || '')
    if (!code) return fail('sin_code')

    const tokenResponse = await exchangeCode({
      provider,
      code,
      verifier: state.verifier,
    })
    const packed = packTokens(tokenResponse)
    const access = (await import('../lib/calendarCrypto.js')).decryptSecret(packed.accessTokenEnc)
    const email = await fetchAccountEmail(provider, access)

    await CalendarConnection.findOneAndUpdate(
      {
        tenantId: state.tenantId,
        userId: state.userId,
        provider,
      },
      {
        $set: {
          ...packed,
          accountEmail: email,
          status: 'active',
          lastError: '',
          connectedAt: new Date(),
          writeEnabled: true,
        },
      },
      { upsert: true },
    )

    const returnTo = state.returnTo || '/agenda?connected=1'
    res.redirect(`${FRONTEND()}${returnTo}`)
  } catch (e) {
    console.error('[calendar callback]', e.message)
    fail('oauth_fallo')
  }
})

/** DELETE /api/calendar/connect/:provider — desconectar */
router.delete('/connect/:provider', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toUpperCase()
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Proveedor inválido' })

    const conn = await CalendarConnection.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      provider,
    })
    if (conn) {
      await revokeProviderToken(provider, conn)
      conn.status = 'revoked'
      conn.accessTokenEnc = ''
      conn.refreshTokenEnc = ''
      await conn.save()
    }
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/**
 * GET /api/calendar/unified?from=&to=&layers=CORPORATE,OUTLOOK,GOOGLE
 * Vista unificada (corp + personales). Fallo externo no tumba corporativo.
 */
router.get('/unified', requireAuth, async (req, res, next) => {
  try {
    const from = parseDate(req.query.from) || new Date()
    const to =
      parseDate(req.query.to) || new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000)
    const layersRaw = String(req.query.layers || 'CORPORATE,OUTLOOK,GOOGLE')
    const layers = new Set(
      layersRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    )

    const items = []
    const warnings = []

    if (layers.has('CORPORATE')) {
      const events = await Event.find({
        tenantId: req.tenant._id,
        status: 'published',
        inicio: { $lte: to },
        fin: { $gte: from },
        $and: [audienceFilterForUser(req.user)],
      })
        .sort({ inicio: 1 })
        .limit(300)
        .lean()

      const rsvps = await EventRsvp.find({
        tenantId: req.tenant._id,
        userId: req.user._id,
        eventId: { $in: events.map((e) => e._id) },
      }).lean()
      const rsvpMap = new Map(rsvps.map((r) => [String(r.eventId), r]))

      for (const e of events) {
        const ser = serializeEvent(e, { rsvp: rsvpMap.get(String(e._id)) || null })
        items.push(
          serializeUnifiedItem({
            id: `corp:${ser.id}`,
            eventId: ser.id,
            titulo: ser.titulo,
            descripcion: ser.descripcion,
            inicio: ser.inicio,
            fin: ser.fin,
            allDay: ser.allDay,
            lugar: ser.lugar,
            origin: 'CORPORATE',
            editable: false,
            rsvp: ser.rsvp,
            tipo: ser.tipo,
            tipoLabel: ser.tipoLabel,
            imageUrl: ser.imageUrl,
            status: ser.status,
          }),
        )
      }
    }

    const connections = await CalendarConnection.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: 'active',
    })

    for (const conn of connections) {
      if (conn.provider === 'OUTLOOK' && layers.has('OUTLOOK')) {
        try {
          const list = await listOutlookEvents(conn, { from, to })
          items.push(...list.map(serializeUnifiedItem))
          conn.lastSyncAt = new Date()
          await conn.save()
        } catch (e) {
          warnings.push({ provider: 'OUTLOOK', message: e.message || 'No se pudo sync Outlook' })
        }
      }
      if (conn.provider === 'GOOGLE' && layers.has('GOOGLE')) {
        try {
          const list = await listGoogleEvents(conn, { from, to })
          items.push(...list.map(serializeUnifiedItem))
          conn.lastSyncAt = new Date()
          await conn.save()
        } catch (e) {
          warnings.push({ provider: 'GOOGLE', message: e.message || 'No se pudo sync Google' })
        }
      }
    }

    items.sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))

    res.json({
      items,
      warnings,
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
    })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/calendar/personal
 * Crear evento en calendario personal (escritura bidireccional).
 * Body: { provider, titulo, inicio, fin, descripcion?, lugar?, allDay? }
 */
router.post('/personal', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.body?.provider || '').toUpperCase()
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Proveedor inválido' })

    const conn = await CalendarConnection.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      provider,
      status: 'active',
    })
    if (!conn) return res.status(404).json({ error: 'Calendario no conectado' })
    if (!conn.writeEnabled) return res.status(403).json({ error: 'Escritura no habilitada' })

    const titulo = String(req.body?.titulo || '').trim()
    const inicio = parseDate(req.body?.inicio)
    const fin = parseDate(req.body?.fin)
    if (!titulo || !inicio || !fin) {
      return res.status(400).json({ error: 'titulo, inicio y fin obligatorios' })
    }

    const payload = {
      titulo,
      descripcion: String(req.body?.descripcion || ''),
      inicio,
      fin,
      allDay: !!req.body?.allDay,
      lugar: String(req.body?.lugar || ''),
    }

    const created =
      provider === 'OUTLOOK'
        ? await createOutlookEvent(conn, payload)
        : await createGoogleEvent(conn, payload)

    conn.lastSyncAt = new Date()
    await conn.save()

    res.status(201).json({ item: serializeUnifiedItem(created) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * PATCH /api/calendar/personal/:provider/:externalId
 */
router.patch('/personal/:provider/:externalId', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toUpperCase()
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Proveedor inválido' })
    const externalId = decodeURIComponent(req.params.externalId)

    const conn = await CalendarConnection.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      provider,
      status: 'active',
    })
    if (!conn) return res.status(404).json({ error: 'Calendario no conectado' })

    const patch = { ...req.body }
    if (patch.inicio) patch.inicio = parseDate(patch.inicio)
    if (patch.fin) patch.fin = parseDate(patch.fin)

    const updated =
      provider === 'OUTLOOK'
        ? await updateOutlookEvent(conn, externalId, patch)
        : await updateGoogleEvent(conn, externalId, patch)

    res.json({ item: serializeUnifiedItem(updated) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * DELETE /api/calendar/personal/:provider/:externalId
 */
router.delete('/personal/:provider/:externalId', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toUpperCase()
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Proveedor inválido' })
    const externalId = decodeURIComponent(req.params.externalId)

    const conn = await CalendarConnection.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      provider,
      status: 'active',
    })
    if (!conn) return res.status(404).json({ error: 'Calendario no conectado' })

    if (provider === 'OUTLOOK') await deleteOutlookEvent(conn, externalId)
    else await deleteGoogleEvent(conn, externalId)

    res.json({ ok: true })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** PATCH calendarios visibles del vínculo */
router.patch('/connect/:provider', requireAuth, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toUpperCase()
    const conn = await CalendarConnection.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      provider,
      status: { $ne: 'revoked' },
    })
    if (!conn) return res.status(404).json({ error: 'No conectado' })

    if (Array.isArray(req.body?.calendarIds)) {
      conn.calendarIds = req.body.calendarIds.map(String).slice(0, 20)
    }
    if (req.body?.writeEnabled !== undefined) conn.writeEnabled = !!req.body.writeEnabled
    await conn.save()
    res.json({ connection: serializeConnection(conn) })
  } catch (e) {
    next(e)
  }
})

export default router
