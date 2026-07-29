/**
 * Listado de objetos S3 (ListObjectsV2) con Signature V4, sin SDK.
 * Credenciales: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (o S3_ACCESS_KEY / S3_SECRET_KEY).
 */
import crypto from 'crypto'

function envCreds() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || ''
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || ''
  const sessionToken = process.env.AWS_SESSION_TOKEN || process.env.S3_SESSION_TOKEN || ''
  return { accessKeyId, secretAccessKey, sessionToken }
}

export function s3DropConfigured(s3Cfg = {}) {
  const bucket = String(s3Cfg.bucket || process.env.S3_BUCKET || '').trim()
  const { accessKeyId, secretAccessKey } = envCreds()
  return Boolean(bucket && accessKeyId && secretAccessKey)
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function amzDate(d = new Date()) {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { amz: iso.slice(0, 16), date: iso.slice(0, 8) }
}

/**
 * @returns {Promise<{ ok: true, items: Array<{name,url,storageKey,size}> } | { ok: false, error: string }>}
 */
export async function listS3DropFiles(s3Cfg = {}) {
  const bucket = String(s3Cfg.bucket || process.env.S3_BUCKET || '').trim()
  const prefix = String(s3Cfg.prefix || '').trim()
  const region = String(s3Cfg.region || process.env.S3_REGION || 'us-east-1').trim() || 'us-east-1'
  const endpoint = String(s3Cfg.endpoint || process.env.S3_ENDPOINT || '').replace(/\/$/, '')
  const publicBaseUrl = String(s3Cfg.publicBaseUrl || '').replace(/\/$/, '')
  const { accessKeyId, secretAccessKey, sessionToken } = envCreds()

  if (!bucket) return { ok: false, error: 'Falta bucket S3' }
  if (!accessKeyId || !secretAccessKey) {
    return { ok: false, error: 'Faltan credenciales AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY' }
  }

  const items = []
  let continuationToken = null
  let pages = 0

  do {
    pages += 1
    if (pages > 20) break

    const qs = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000' })
    if (prefix) qs.set('prefix', prefix)
    if (continuationToken) qs.set('continuation-token', continuationToken)

    const host = endpoint
      ? new URL(endpoint).host
      : region === 'us-east-1'
        ? `${bucket}.s3.amazonaws.com`
        : `${bucket}.s3.${region}.amazonaws.com`
    const path = endpoint ? `/${bucket}` : '/'
    const query = qs.toString()
    const url = endpoint
      ? `${endpoint}${path}?${query}`
      : `https://${host}${path}?${query}`

    const { amz, date } = amzDate()
    const payloadHash = sha256Hex('')
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amz}`,
      sessionToken ? `x-amz-security-token:${sessionToken}` : null,
    ]
      .filter(Boolean)
      .join('\n')
    const signedHeaders = sessionToken
      ? 'host;x-amz-content-sha256;x-amz-date;x-amz-security-token'
      : 'host;x-amz-content-sha256;x-amz-date'

    // Query must be sorted for SigV4
    const sortedQs = [...qs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    const canonicalRequest = [
      'GET',
      path,
      sortedQs,
      `${canonicalHeaders}\n`,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const credentialScope = `${date}/${region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amz, credentialScope, sha256Hex(canonicalRequest)].join(
      '\n',
    )
    const kDate = hmac(`AWS4${secretAccessKey}`, date)
    const kRegion = hmac(kDate, region)
    const kService = hmac(kRegion, 's3')
    const kSigning = hmac(kService, 'aws4_request')
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')

    const headers = {
      Host: host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amz,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    }
    if (sessionToken) headers['x-amz-security-token'] = sessionToken

    let res
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
    } catch (e) {
      return { ok: false, error: e?.message || 'Error de red al listar S3' }
    }
    const xml = await res.text()
    if (!res.ok) {
      return { ok: false, error: `S3 ListObjects ${res.status}: ${xml.slice(0, 200)}` }
    }

    const keys = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((x) => decodeXml(x[1]))
    const sizes = [...xml.matchAll(/<Size>([^<]*)<\/Size>/g)].map((x) => Number(x[1]) || 0)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (!key || key.endsWith('/')) continue
      const name = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
      const urlOut = publicBaseUrl
        ? `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
        : endpoint
          ? `${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
          : `https://${host}/${key.split('/').map(encodeURIComponent).join('/')}`
      items.push({
        name,
        url: urlOut,
        storageKey: key,
        size: sizes[i] || 0,
        source: 's3',
      })
    }

    const truncated = /<IsTruncated>true<\/IsTruncated>/i.test(xml)
    const next = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)
    continuationToken = truncated && next ? decodeXml(next[1]) : null
  } while (continuationToken)

  return { ok: true, items }
}

function decodeXml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
