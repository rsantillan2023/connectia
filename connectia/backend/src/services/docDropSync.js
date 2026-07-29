/**
 * Sync de bandeja externa → DocItem con audiencia mode:users (solo el dueño).
 */
import { DocItem } from '../models/DocItem.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import {
  matchFileName,
  extractMatchKey,
  applyTemplate,
  normalizeMatchValue,
  userFieldValue,
} from '../lib/docDropPattern.js'
import { normalizeDocsDropConfig } from '../lib/docsDropConfig.js'
import { listDropFiles } from './docDropSources.js'
import { inferFileType, normalizeRepository } from '../lib/docTypes.js'

function buildUserIndex(users, matchField, stripNonDigits) {
  const map = new Map()
  for (const u of users) {
    const raw = userFieldValue(u, matchField)
    const key = normalizeMatchValue(raw, {
      stripNonDigits: stripNonDigits || matchField === 'dni' || matchField === 'cuil',
    })
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(u)
  }
  return map
}

/**
 * Prueba el patrón contra un nombre (sin tocar DB).
 */
export function testDropPattern(config, fileName) {
  const c = normalizeDocsDropConfig(config)
  const matched = matchFileName(fileName, c.namePattern)
  if (!matched.ok) {
    return { ok: false, error: matched.error, fileName }
  }
  const key = extractMatchKey(matched.captures, c.matchToken, c.matchField, {
    stripNonDigits: c.stripNonDigits,
  })
  const titulo = applyTemplate(c.tituloTemplate, matched.captures) || fileName
  return {
    ok: true,
    fileName,
    captures: matched.captures,
    matchKey: key,
    matchField: c.matchField,
    matchToken: c.matchToken,
    titulo,
  }
}

/**
 * @param {{ tenantId: import('mongoose').Types.ObjectId, dryRun?: boolean }} opts
 */
export async function syncDocsDrop({ tenantId, dryRun = false } = {}) {
  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return { ok: false, error: 'Tenant no encontrado' }

  const config = normalizeDocsDropConfig(tenant.docsDrop)
  if (!config.enabled) {
    return { ok: false, error: 'Bandeja externa deshabilitada. Activála en la configuración.' }
  }

  const listed = await listDropFiles(config)
  if (!listed.ok) {
    return { ok: false, error: listed.error || 'No se pudo listar archivos', config }
  }

  const users = await User.find({ tenantId, activo: true })
    .select('_id dni cuil idExterno usuario email nombre apellido')
    .lean()
  const index = buildUserIndex(users, config.matchField, config.stripNonDigits)

  const summary = {
    listed: listed.items.length,
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    patternMiss: 0,
    upserted: 0,
    skipped: 0,
    dryRun: Boolean(dryRun),
    note: listed.note || listed.message || '',
    samples: {
      matched: [],
      unmatched: [],
      ambiguous: [],
      patternMiss: [],
    },
  }

  const repository = normalizeRepository(
    config.source === 's3' ? 's3' : config.source === 'gdrive' ? 'gdrive' : 'url',
  )

  for (const file of listed.items) {
    const parsed = matchFileName(file.name, config.namePattern)
    if (!parsed.ok) {
      summary.patternMiss += 1
      if (summary.samples.patternMiss.length < 15) {
        summary.samples.patternMiss.push({ name: file.name, reason: parsed.error })
      }
      continue
    }

    const key = extractMatchKey(parsed.captures, config.matchToken, config.matchField, {
      stripNonDigits: config.stripNonDigits,
    })
    if (!key) {
      summary.unmatched += 1
      if (summary.samples.unmatched.length < 15) {
        summary.samples.unmatched.push({ name: file.name, reason: 'Captura vacía' })
      }
      continue
    }

    const hits = index.get(key) || []
    if (!hits.length) {
      summary.unmatched += 1
      if (summary.samples.unmatched.length < 15) {
        summary.samples.unmatched.push({
          name: file.name,
          matchKey: key,
          reason: `Sin usuario con ${config.matchField}=${key}`,
        })
      }
      continue
    }
    if (hits.length > 1) {
      summary.ambiguous += 1
      if (summary.samples.ambiguous.length < 15) {
        summary.samples.ambiguous.push({
          name: file.name,
          matchKey: key,
          users: hits.map((u) => u.usuario || String(u._id)),
        })
      }
      continue
    }

    const user = hits[0]
    summary.matched += 1
    const titulo =
      applyTemplate(config.tituloTemplate, parsed.captures) ||
      file.name.replace(/\.[^.]+$/, '') ||
      file.name
    const externalId = `drop:${config.source}:${file.storageKey || file.name}`

    if (summary.samples.matched.length < 15) {
      summary.samples.matched.push({
        name: file.name,
        matchKey: key,
        userId: String(user._id),
        usuario: user.usuario,
        titulo,
      })
    }

    if (dryRun) continue

    const fileType = inferFileType({
      mimeType: file.mimeType,
      fileName: file.name,
      fileUrl: file.url,
    })
    const status = config.publishOnMatch ? 'published' : 'draft'

    await DocItem.findOneAndUpdate(
      { tenantId, source: 'drop', externalId },
      {
        $set: {
          titulo: String(titulo).slice(0, 200),
          descripcion: `Bandeja externa · ${file.name}`,
          category: config.category,
          fileUrl: file.url,
          mimeType: file.mimeType || '',
          fileType,
          fileName: file.name,
          fileSize: file.size || 0,
          repository,
          storageKey: file.storageKey || '',
          status,
          source: 'drop',
          externalId,
          requiresSignature: Boolean(config.requiresSignature),
          audience: {
            mode: 'users',
            areaIds: [],
            groupIds: [],
            userIds: [user._id],
          },
          authorName: 'Bandeja externa',
          publishedAt: status === 'published' ? new Date() : null,
        },
        $setOnInsert: {
          tenantId,
          downloadCount: 0,
          downloads: [],
          signatures: [],
        },
      },
      { upsert: true },
    )
    summary.upserted += 1
  }

  summary.skipped = summary.patternMiss + summary.unmatched + summary.ambiguous

  if (!dryRun) {
    tenant.docsDrop = {
      ...config,
      lastSyncAt: new Date(),
      lastSyncSummary: {
        at: new Date(),
        listed: summary.listed,
        matched: summary.matched,
        unmatched: summary.unmatched,
        ambiguous: summary.ambiguous,
        patternMiss: summary.patternMiss,
        upserted: summary.upserted,
      },
    }
    tenant.markModified('docsDrop')
    await tenant.save()
  }

  return {
    ok: true,
    dryRun: Boolean(dryRun),
    summary,
    config: {
      source: config.source,
      namePattern: config.namePattern,
      matchField: config.matchField,
      matchToken: config.matchToken,
    },
  }
}
