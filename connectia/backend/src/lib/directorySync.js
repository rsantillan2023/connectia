/**
 * Sync de directorios externos (§27.08 Google · §27.09 Entra).
 * - Con credenciales de entorno: Directory API / Microsoft Graph.
 * - Sin credenciales: el admin puede pegar lista JSON (demos/tests).
 */
import crypto from 'crypto'

function normalizeUsuarioFromEmail(email) {
  const local = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
  return local || ''
}

export function normalizeDirectoryEntries(entries) {
  const list = Array.isArray(entries) ? entries : []
  return list
    .map((e, idx) => {
      const email = String(e.email || e.mail || '')
        .trim()
        .toLowerCase()
      const usuario =
        String(e.usuario || e.userPrincipalName || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '')
          .split('@')[0] || normalizeUsuarioFromEmail(email)
      return {
        index: idx + 1,
        usuario,
        email,
        nombre: String(e.nombre || e.givenName || e.firstName || '').trim(),
        apellido: String(e.apellido || e.surname || e.lastName || e.familyName || '').trim(),
        idExterno: String(e.idExterno || e.id || e.employeeId || '').trim().slice(0, 64),
        cargo: String(e.cargo || e.jobTitle || '').trim().slice(0, 120),
        activo: e.activo !== false && e.accountEnabled !== false && e.suspended !== true,
      }
    })
    .filter((e) => e.usuario || e.email)
}

function loadGoogleCredentials() {
  if (process.env.GOOGLE_WORKSPACE_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_WORKSPACE_CREDENTIALS_JSON)
      return {
        clientEmail: parsed.client_email,
        privateKey: String(parsed.private_key || '').replace(/\\n/g, '\n'),
      }
    } catch {
      return null
    }
  }
  const clientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL
  const privateKey = String(process.env.GOOGLE_WORKSPACE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (clientEmail && privateKey) return { clientEmail, privateKey }
  return null
}

export function googleWorkspaceConfigured() {
  const creds = loadGoogleCredentials()
  return Boolean(creds?.clientEmail && creds?.privateKey)
}

export function entraConfigured() {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET,
  )
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function googleServiceAccountAccessToken() {
  const creds = loadGoogleCredentials()
  if (!creds) {
    const err = new Error('Google Workspace no configurado')
    err.status = 400
    throw err
  }
  const subject = process.env.GOOGLE_WORKSPACE_SUBJECT || ''
  if (!subject) {
    const err = new Error(
      'Falta GOOGLE_WORKSPACE_SUBJECT (email admin del dominio a impersonar, domain-wide delegation)',
    )
    err.status = 400
    throw err
  }

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      sub: subject,
      scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer
    .sign(creds.privateKey)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const assertion = `${unsigned}.${signature}`

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || 'No se pudo obtener token Google')
    err.status = 502
    throw err
  }
  return data.access_token
}

export async function fetchGoogleDirectoryUsers(opts = {}) {
  if (!googleWorkspaceConfigured()) return null

  const domain = String(opts.domain || process.env.GOOGLE_WORKSPACE_DOMAIN || '').trim()
  const maxResults = Math.min(500, Math.max(1, Number(opts.maxResults) || 200))
  if (!domain) {
    const err = new Error('Indicá domain (o GOOGLE_WORKSPACE_DOMAIN) para listar usuarios')
    err.status = 400
    throw err
  }

  const accessToken = await googleServiceAccountAccessToken()
  const out = []
  let pageToken = opts.pageToken || undefined

  while (out.length < maxResults) {
    const url = new URL('https://admin.googleapis.com/admin/directory/v1/users')
    url.searchParams.set('domain', domain)
    url.searchParams.set('maxResults', String(Math.min(100, maxResults - out.length)))
    url.searchParams.set('orderBy', 'email')
    url.searchParams.set('projection', 'basic')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error?.message || data.error || `Google Directory HTTP ${res.status}`)
      err.status = res.status >= 400 && res.status < 500 ? res.status : 502
      throw err
    }

    for (const u of data.users || []) {
      out.push({
        email: u.primaryEmail,
        nombre: u.name?.givenName || '',
        apellido: u.name?.familyName || '',
        idExterno: u.externalIds?.[0]?.value || u.id || '',
        cargo: u.organizations?.[0]?.title || '',
        activo: u.suspended !== true,
        usuario: String(u.primaryEmail || '')
          .split('@')[0]
          .toLowerCase(),
      })
      if (out.length >= maxResults) break
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return out
}

async function entraAccessToken() {
  const tenant = process.env.ENTRA_TENANT_ID
  const clientId = process.env.ENTRA_CLIENT_ID
  const clientSecret = process.env.ENTRA_CLIENT_SECRET
  if (!tenant || !clientId || !clientSecret) {
    const err = new Error('Entra ID no configurado')
    err.status = 400
    throw err
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || 'No se pudo obtener token Entra')
    err.status = 502
    throw err
  }
  return data.access_token
}

export async function fetchEntraDirectoryUsers(opts = {}) {
  if (!entraConfigured()) return null

  const maxResults = Math.min(500, Math.max(1, Number(opts.maxResults) || 200))
  const accessToken = await entraAccessToken()
  const out = []
  let url =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,accountEnabled,employeeId&$top=100'

  while (url && out.length < maxResults) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error?.message || data.error || `Graph HTTP ${res.status}`)
      err.status = res.status >= 400 && res.status < 500 ? res.status : 502
      throw err
    }

    for (const u of data.value || []) {
      const email = (u.mail || u.userPrincipalName || '').toLowerCase()
      const parts = String(u.displayName || '')
        .trim()
        .split(/\s+/)
      out.push({
        email,
        nombre: u.givenName || parts[0] || '',
        apellido: u.surname || (parts.length > 1 ? parts.slice(1).join(' ') : ''),
        idExterno: u.employeeId || u.id || '',
        cargo: u.jobTitle || '',
        activo: u.accountEnabled !== false,
        usuario: String(u.userPrincipalName || email)
          .split('@')[0]
          .toLowerCase(),
      })
      if (out.length >= maxResults) break
    }

    url = data['@odata.nextLink'] || null
  }

  return out
}

export function planDirectorySync(entries, { existingByUsuario, existingByEmail, origen }) {
  const plan = []
  for (const e of normalizeDirectoryEntries(entries)) {
    const byUser = e.usuario ? existingByUsuario.get(e.usuario) : null
    const byEmail = e.email ? existingByEmail.get(e.email) : null
    const existing = byUser || byEmail
    plan.push({
      ...e,
      action: existing ? 'update' : 'create',
      existingId: existing || null,
      origen: origen || 'GOOGLE',
      ok: Boolean(e.usuario || e.email),
      issues: !e.usuario && !e.email ? ['sin usuario ni email'] : [],
    })
  }
  return plan
}

export function directoryStatusNotes() {
  return {
    google: {
      envConfigured: googleWorkspaceConfigured(),
      needsSubject: !process.env.GOOGLE_WORKSPACE_SUBJECT,
      needsDomain: !process.env.GOOGLE_WORKSPACE_DOMAIN,
      note: googleWorkspaceConfigured()
        ? 'Credenciales OK — podés traer usuarios del dominio (Directory API)'
        : 'Sin GOOGLE_WORKSPACE_*: pegá lista JSON o configurá service account',
    },
    entra: {
      envConfigured: entraConfigured(),
      note: entraConfigured()
        ? 'Credenciales OK — podés traer usuarios desde Microsoft Graph'
        : 'Sin ENTRA_*: pegá lista JSON o configurá app registration',
    },
  }
}
