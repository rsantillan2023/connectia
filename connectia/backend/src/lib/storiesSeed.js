import { Story } from '../models/Story.js'

const TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Imágenes verticales stock para stories (9:16 aprox). */
const MEDIA = {
  equipo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=720&h=1280&fit=crop&q=80',
  oficina: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=720&h=1280&fit=crop&q=80',
  celebracion: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=720&h=1280&fit=crop&q=80',
  seguridad: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=720&h=1280&fit=crop&q=80',
  comida: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=720&h=1280&fit=crop&q=80',
  planta: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=720&h=1280&fit=crop&q=80',
  cafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=720&h=1280&fit=crop&q=80',
}

/**
 * Stories demo por variante (idempotentes por título).
 * @param {string} [brandName]
 * @param {'default'|'demo'|'arcor'} [variant]
 */
export function defaultStories(brandName = 'la empresa', { variant = 'default' } = {}) {
  const brand = String(brandName || 'la empresa').trim() || 'la empresa'

  if (variant === 'arcor') {
    return [
      {
        titulo: 'Hoy en planta — clima top',
        category: 'planta',
        mediaUrl: MEDIA.planta,
        order: 1,
      },
      {
        titulo: 'Novedad dulce de la semana',
        category: 'producto',
        mediaUrl: MEDIA.comida,
        order: 2,
      },
      {
        titulo: 'Seguridad primero',
        category: 'seguridad',
        mediaUrl: MEDIA.seguridad,
        order: 3,
      },
      {
        titulo: 'Celebramos al equipo Arcor',
        category: 'cultura',
        mediaUrl: MEDIA.celebracion,
        order: 4,
      },
    ]
  }

  if (variant === 'demo') {
    return [
      {
        titulo: 'Bienvenida a Connectia',
        category: 'onboarding',
        mediaUrl: MEDIA.oficina,
        order: 1,
      },
      {
        titulo: 'Tu equipo en el muro',
        category: 'comunidad',
        mediaUrl: MEDIA.equipo,
        order: 2,
      },
      {
        titulo: 'Café y buenas noticias',
        category: 'cultura',
        mediaUrl: MEDIA.cafe,
        order: 3,
      },
      {
        titulo: 'Reconocimientos de la semana',
        category: 'reconocimiento',
        mediaUrl: MEDIA.celebracion,
        order: 4,
      },
    ]
  }

  return [
    {
      titulo: `Bienvenida a ${brand}`,
      category: 'onboarding',
      mediaUrl: MEDIA.oficina,
      order: 1,
    },
    {
      titulo: 'Novedades del equipo',
      category: 'comunidad',
      mediaUrl: MEDIA.equipo,
      order: 2,
    },
    {
      titulo: 'Recordatorio de seguridad',
      category: 'seguridad',
      mediaUrl: MEDIA.seguridad,
      order: 3,
    },
  ]
}

/**
 * Upsert de stories publicadas (vigencia 7 días para que el seed se vea en demo).
 * No pisa si ya existe el mismo título (salvo force).
 */
export async function seedStoriesForTenant(
  tenantId,
  {
    brandName = 'la empresa',
    variant = 'default',
    authorId = null,
    authorName = 'seed',
    force = false,
  } = {},
) {
  const rows = defaultStories(brandName, { variant })
  const now = new Date()
  const endsAt = new Date(now.getTime() + TTL_MS)
  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const existing = await Story.findOne({ tenantId, titulo: row.titulo })
    const payload = {
      titulo: row.titulo,
      category: row.category || 'general',
      mediaUrl: row.mediaUrl,
      mediaType: 'image',
      startsAt: now,
      endsAt,
      order: row.order || 0,
      status: 'published',
      authorId: authorId || null,
      authorName: authorName || 'seed',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [], clientIds: [] },
    }

    if (existing) {
      if (!force) {
        skipped += 1
        continue
      }
      Object.assign(existing, payload)
      await existing.save()
      updated += 1
      continue
    }

    await Story.create({
      tenantId,
      ...payload,
      viewCount: 0,
    })
    created += 1
  }

  return { created, updated, skipped, total: rows.length }
}
