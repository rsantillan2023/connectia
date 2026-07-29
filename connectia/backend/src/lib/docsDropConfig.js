import { compileNamePattern, DOC_DROP_MATCH_FIELDS } from './docDropPattern.js'

export const DOC_DROP_SOURCES = [
  {
    id: 'url',
    label: 'URL / manifiesto JSON',
    hint: 'GET a una URL que lista archivos [{ name, url }]. Ideal si un proceso externo (o Drive/S3 vía proxy) publica el índice.',
  },
  {
    id: 's3',
    label: 'Amazon S3 / compatible',
    hint: 'Lista objetos del bucket/prefix con credenciales AWS_* (o S3_*). Requiere publicBaseUrl o endpoint para armar el link.',
  },
  {
    id: 'gdrive',
    label: 'Google Drive',
    hint: 'Carpeta compartida vía API key + folderId, o un listUrl (Apps Script / proxy) con el mismo formato JSON.',
  },
]

export function defaultDocsDropConfig() {
  return {
    enabled: false,
    source: 'url',
    namePattern: '{dni}_recibo_{periodo}.pdf',
    matchToken: 'dni',
    matchField: 'dni',
    stripNonDigits: true,
    tituloTemplate: 'Documento {periodo}',
    category: 'personal',
    requiresSignature: false,
    /** Solo publicar si hay match 1:1 con un usuario activo */
    publishOnMatch: true,
    listUrl: '',
    fileUrlTemplate: '',
    s3: {
      bucket: '',
      prefix: '',
      region: 'us-east-1',
      endpoint: '',
      publicBaseUrl: '',
    },
    gdrive: {
      folderId: '',
      apiKey: '',
      listUrl: '',
    },
    lastSyncAt: null,
    lastSyncSummary: null,
  }
}

export function normalizeDocsDropConfig(raw) {
  const d = defaultDocsDropConfig()
  const src = raw && typeof raw === 'object' ? raw : {}
  const source = DOC_DROP_SOURCES.some((x) => x.id === src.source) ? src.source : d.source
  const matchField = DOC_DROP_MATCH_FIELDS.some((x) => x.id === src.matchField)
    ? src.matchField
    : d.matchField
  const namePattern = String(src.namePattern ?? d.namePattern).trim().slice(0, 260) || d.namePattern
  const matchToken = String(src.matchToken || matchField || 'dni')
    .trim()
    .slice(0, 40) || matchField

  const s3In = src.s3 && typeof src.s3 === 'object' ? src.s3 : {}
  const gdIn = src.gdrive && typeof src.gdrive === 'object' ? src.gdrive : {}

  return {
    enabled: Boolean(src.enabled),
    source,
    namePattern,
    matchToken,
    matchField,
    stripNonDigits: src.stripNonDigits != null ? Boolean(src.stripNonDigits) : d.stripNonDigits,
    tituloTemplate: String(src.tituloTemplate ?? d.tituloTemplate).trim().slice(0, 200),
    category: String(src.category ?? d.category).trim().slice(0, 80) || 'personal',
    requiresSignature: Boolean(src.requiresSignature),
    publishOnMatch: src.publishOnMatch != null ? Boolean(src.publishOnMatch) : true,
    listUrl: String(src.listUrl || '').trim().slice(0, 2000),
    fileUrlTemplate: String(src.fileUrlTemplate || '').trim().slice(0, 2000),
    s3: {
      bucket: String(s3In.bucket || '').trim().slice(0, 200),
      prefix: String(s3In.prefix || '').trim().slice(0, 500),
      region: String(s3In.region || d.s3.region).trim().slice(0, 40) || d.s3.region,
      endpoint: String(s3In.endpoint || process.env.S3_ENDPOINT || '').trim().slice(0, 500),
      publicBaseUrl: String(s3In.publicBaseUrl || '').trim().slice(0, 2000),
    },
    gdrive: {
      folderId: String(gdIn.folderId || '').trim().slice(0, 200),
      apiKey: String(gdIn.apiKey || '').trim().slice(0, 200),
      listUrl: String(gdIn.listUrl || '').trim().slice(0, 2000),
    },
    lastSyncAt: src.lastSyncAt || null,
    lastSyncSummary: src.lastSyncSummary || null,
  }
}

/** Config segura para el admin (oculta secretos parciales). */
export function serializeDocsDropConfig(raw) {
  const c = normalizeDocsDropConfig(raw)
  return {
    ...c,
    gdrive: {
      ...c.gdrive,
      apiKey: c.gdrive.apiKey ? maskSecret(c.gdrive.apiKey) : '',
      apiKeySet: Boolean(String(raw?.gdrive?.apiKey || '').trim()),
    },
    meta: {
      sources: DOC_DROP_SOURCES,
      matchFields: DOC_DROP_MATCH_FIELDS,
      patternHelp:
        'Usá {token} para capturar partes del nombre. Ej: {dni}_recibo_{periodo}.pdf. * = cualquier texto, ? = un carácter.',
    },
  }
}

function maskSecret(s) {
  const v = String(s)
  if (v.length <= 4) return '••••'
  return `${'•'.repeat(Math.min(12, v.length - 4))}${v.slice(-4)}`
}

/**
 * Al guardar: si el apiKey viene enmascarado, conservar el anterior.
 */
export function mergeDocsDropConfig(previous, incoming) {
  const prev = normalizeDocsDropConfig(previous)
  const next = normalizeDocsDropConfig(incoming)
  const incomingKey = String(incoming?.gdrive?.apiKey || '').trim()
  if (!incomingKey || incomingKey.includes('•')) {
    next.gdrive.apiKey = prev.gdrive.apiKey
  } else {
    next.gdrive.apiKey = incomingKey.slice(0, 200)
  }
  next.lastSyncAt = prev.lastSyncAt
  next.lastSyncSummary = prev.lastSyncSummary
  return next
}

export function validateDocsDropConfig(raw) {
  const c = normalizeDocsDropConfig(raw)
  const errors = []
  const compiled = compileNamePattern(c.namePattern)
  if (!compiled.ok) errors.push(compiled.error)
  else if (!compiled.tokens.includes(c.matchToken)) {
    errors.push(
      `El token de matching "{${c.matchToken}}" no está en el patrón. Tokens: ${compiled.tokens.map((t) => `{${t}}`).join(', ') || '(ninguno)'}`,
    )
  }
  if (c.enabled) {
    if (c.source === 'url' && !c.listUrl) {
      errors.push('Para origen URL hace falta listUrl (manifiesto JSON)')
    }
    if (c.source === 's3' && !c.s3.bucket && !process.env.S3_BUCKET) {
      errors.push('Para S3 configurá bucket (o S3_BUCKET en el entorno)')
    }
    if (c.source === 'gdrive') {
      const hasApi = c.gdrive.folderId && c.gdrive.apiKey
      const hasList = Boolean(c.gdrive.listUrl || c.listUrl)
      if (!hasApi && !hasList) {
        errors.push('Para Drive: folderId+apiKey, o un listUrl con el índice JSON')
      }
    }
  }
  return { ok: !errors.length, errors, config: c }
}
