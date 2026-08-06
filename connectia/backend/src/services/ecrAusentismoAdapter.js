/**
 * Adapter integración ausentismo ECR (12.04).
 * Legacy: ausentismo.ecrgroup.cl / VUE_APP_ECR_API.
 *
 * Sin credenciales: mock idempotente (mismo patrón que panel supervisores ECR).
 * Con ECR_AUSENTISMO_API + ECR_AUSENTISMO_API_KEY: POST/PATCH al API externo.
 *
 * Paths por defecto (ajustables con ECR_AUSENTISMO_*_PATH):
 *   POST   /api/v1/ausentismos
 *   PATCH  /api/v1/ausentismos/:id
 *   POST   /api/v1/ausentismos/:id/cancelar
 */

const ECR_CAPS = ['pack.ecr', 'asistencia.ecr', 'integracion.ausentismo.ecr']

export function ecrAusentismoConfigured() {
  return Boolean(process.env.ECR_AUSENTISMO_API && process.env.ECR_AUSENTISMO_API_KEY)
}

export function tenantWantsEcrAusentismo(tenant) {
  const caps = tenant?.capabilities || []
  return ECR_CAPS.some((c) => caps.includes(c))
}

export function ecrAusentismoStatus(tenant) {
  const wants = tenantWantsEcrAusentismo(tenant)
  const configured = ecrAusentismoConfigured()
  const endpoint =
    (process.env.ECR_AUSENTISMO_API || 'https://ausentismo.ecrgroup.cl').replace(/\/$/, '') ||
    'https://ausentismo.ecrgroup.cl'

  if (!wants) {
    return {
      enabled: false,
      deferred: false,
      mock: false,
      configured: false,
      endpoint,
      mode: 'local_only',
      note: 'Tenant sin pack ECR (pack.ecr / asistencia.ecr). Ausencias solo locales.',
    }
  }

  if (!configured) {
    return {
      enabled: true,
      deferred: false,
      mock: true,
      configured: false,
      endpoint,
      mode: 'mock',
      note:
        'Pack ECR activo · sync mock (definí ECR_AUSENTISMO_API + ECR_AUSENTISMO_API_KEY para productivo).',
    }
  }

  return {
    enabled: true,
    deferred: false,
    mock: false,
    configured: true,
    endpoint,
    mode: 'live',
    note: 'Integración ECR ausentismos activa (API externa).',
  }
}

function toISODate(d) {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  try {
    return new Date(d).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/**
 * Payload canónico hacia API ECR (contrato flexible / legado).
 */
export function buildEcrAbsencePayload(absence, user = null, { event = 'create' } = {}) {
  const dni = user?.dni || user?.idExterno || user?.usuario || ''
  return {
    event,
    idempotencyKey: `aus-${absence.codigo || absence._id || absence.id}-${event}`,
    codigo: absence.codigo || '',
    externalId: absence.ecrSync?.externalId || '',
    tipoKey: absence.tipoKey || '',
    tipoNombre: absence.tipoNombre || '',
    desde: toISODate(absence.desde),
    hasta: toISODate(absence.hasta),
    dias: Number(absence.dias) || 0,
    estado: absence.estado || 'pendiente',
    motivo: String(absence.motivo || '').slice(0, 2000),
    solicitante: {
      id: String(absence.requesterId || user?._id || ''),
      nombre: absence.requesterName || '',
      dni: String(dni),
      legajo: String(user?.idExterno || user?.legajo || ''),
    },
    decision: absence.decisionComentario
      ? {
          by: absence.decisionByName || '',
          at: absence.decisionAt || null,
          comentario: absence.decisionComentario || '',
        }
      : undefined,
    adjuntos: (absence.adjuntos || []).map((a) => ({
      nombre: a.nombre || '',
      url: a.url || '',
    })),
  }
}

function pathCreate() {
  return process.env.ECR_AUSENTISMO_CREATE_PATH || '/api/v1/ausentismos'
}

function pathUpdate(externalId) {
  const tpl = process.env.ECR_AUSENTISMO_UPDATE_PATH || '/api/v1/ausentismos/:id'
  return tpl.replace(':id', encodeURIComponent(externalId))
}

function pathCancel(externalId) {
  const tpl = process.env.ECR_AUSENTISMO_CANCEL_PATH || '/api/v1/ausentismos/:id/cancelar'
  return tpl.replace(':id', encodeURIComponent(externalId))
}

async function ecrFetch(path, { method = 'GET', body } = {}) {
  const base = String(process.env.ECR_AUSENTISMO_API || '').replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    'x-api-key': process.env.ECR_AUSENTISMO_API_KEY,
    Accept: 'application/json',
  }
  if (process.env.ECR_AUSENTISMO_BEARER) {
    headers.Authorization = `Bearer ${process.env.ECR_AUSENTISMO_BEARER}`
  }
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

function mockResult(absence, event) {
  const codigo = absence.codigo || String(absence._id || 'x')
  const externalId = absence.ecrSync?.externalId || `mock-aus-${codigo}`
  return {
    ok: true,
    mock: true,
    status: 'synced',
    externalId,
    note: `Mock ECR (${event}) · sin API productiva`,
    at: new Date(),
  }
}

function errorResult(err, event) {
  return {
    ok: false,
    mock: false,
    status: 'error',
    externalId: '',
    note: `Error sync ECR (${event}): ${err?.message || err}`,
    at: new Date(),
  }
}

/**
 * Aplica resultado de sync sobre el documento (mutación in-place; caller save).
 */
export function applyEcrSyncToAbsence(absence, result) {
  if (!absence) return absence
  absence.ecrSync = {
    status: result.status || 'none',
    note: result.note || '',
    externalId: result.externalId || absence.ecrSync?.externalId || '',
    at: result.at || new Date(),
  }
  return absence
}

/**
 * @returns {Promise<{ ok: boolean, mock: boolean, status: string, externalId: string, note: string, at: Date }>}
 */
export async function syncAbsenceToEcr({
  tenant,
  absence,
  user = null,
  event = 'create',
} = {}) {
  if (!tenantWantsEcrAusentismo(tenant)) {
    return {
      ok: true,
      mock: false,
      status: 'none',
      externalId: '',
      note: 'Tenant sin pack ECR; sin sync externo.',
      at: new Date(),
    }
  }

  if (!ecrAusentismoConfigured()) {
    return mockResult(absence, event)
  }

  const payload = buildEcrAbsencePayload(absence, user, { event })
  try {
    let r
    if (event === 'create') {
      r = await ecrFetch(pathCreate(), { method: 'POST', body: payload })
    } else if (event === 'cancel') {
      const id = absence.ecrSync?.externalId || absence.codigo
      r = await ecrFetch(pathCancel(id), { method: 'POST', body: payload })
    } else {
      // decide / update
      const id = absence.ecrSync?.externalId || absence.codigo
      r = await ecrFetch(pathUpdate(id), { method: 'PATCH', body: payload })
    }

    if (!r.ok && !r.data?.exito && !r.data?.ok) {
      return {
        ok: false,
        mock: false,
        status: 'error',
        externalId: absence.ecrSync?.externalId || '',
        note: `ECR HTTP ${r.status}: ${r.data?.error || r.data?.mensaje || 'fallo'}`,
        at: new Date(),
      }
    }

    const externalId =
      String(
        r.data?.externalId ||
          r.data?.id ||
          r.data?.data?.id ||
          absence.ecrSync?.externalId ||
          `ecr-${absence.codigo}`,
      ) || ''

    return {
      ok: true,
      mock: false,
      status: 'synced',
      externalId,
      note: `Sync ECR OK (${event})`,
      at: new Date(),
    }
  } catch (err) {
    return errorResult(err, event)
  }
}

/**
 * Sync + persist ecrSync en el documento ya cargado.
 * No lanza: errores quedan en ecrSync.status=error.
 */
export async function persistEcrSync(absence, opts) {
  const result = await syncAbsenceToEcr({ ...opts, absence })
  applyEcrSyncToAbsence(absence, result)
  if (typeof absence.save === 'function') {
    await absence.save()
  }
  return result
}
