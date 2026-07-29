import { KbArticle } from '../models/KbArticle.js'
import { DocItem } from '../models/DocItem.js'
import { Request } from '../models/Request.js'
import { Post } from '../models/Post.js'
import { audienceFilterForUser } from './audience.js'
import { stateLabel, normalizeSolicitudesConfig } from './solicitudesConfig.js'
import { MODULE_HINTS } from './assistantIntent.js'

const ACTIVE_REQUEST_STATES = ['abierta', 'en_proceso', 'a_completar', 'en_espera', 'escalada']

function excerpt(text, n = 160) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

export async function toolListOpenRequests({ tenantId, userId, tenant, limit = 8 }) {
  const cfg = normalizeSolicitudesConfig(tenant?.solicitudesConfig)
  const items = await Request.find({
    tenantId,
    requesterId: userId,
    estado: { $in: ACTIVE_REQUEST_STATES },
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

  return items.map((r) => ({
    id: String(r._id),
    codigo: r.codigo,
    titulo: r.titulo,
    estado: r.estado,
    estadoLabel: stateLabel(cfg, r.estado),
    tipoNombre: r.tipoNombre || r.tipoKey || 'Solicitud',
    href: `/solicitudes/${r._id}`,
    updatedAt: r.updatedAt,
  }))
}

export async function toolListDocuments({ tenantId, user, q = '', limit = 8 }) {
  const filter = {
    tenantId,
    status: 'published',
    ...audienceFilterForUser(user),
  }
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$and = [{ $or: [{ titulo: rx }, { descripcion: rx }, { category: rx }] }]
  }
  const items = await DocItem.find(filter).sort({ updatedAt: -1 }).limit(limit).lean()
  return items.map((d) => ({
    id: String(d._id),
    titulo: d.titulo,
    category: d.category || '',
    fileType: d.fileType || '',
    descripcion: excerpt(d.descripcion || '', 120),
    href: '/docs',
  }))
}

export async function toolSearchKb({ tenantId, user, q = '', limit = 6 }) {
  const filter = {
    tenantId,
    status: 'published',
    ...audienceFilterForUser(user),
  }
  const query = String(q || '').trim()
  let articles = []
  if (query) {
    try {
      articles = await KbArticle.find(
        { ...filter, $text: { $search: query } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean()
    } catch {
      const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      articles = await KbArticle.find({
        ...filter,
        $or: [{ titulo: rx }, { cuerpo: rx }, { tags: rx }],
      })
        .sort({ orden: 1, updatedAt: -1 })
        .limit(limit)
        .lean()
    }
  } else {
    articles = await KbArticle.find(filter).sort({ orden: 1, updatedAt: -1 }).limit(limit).lean()
  }

  return articles.map((a) => ({
    kind: 'kb',
    id: String(a._id),
    titulo: a.titulo,
    categoria: a.categoria,
    excerpt: excerpt(a.cuerpo, 220),
    cuerpo: a.cuerpo,
    href:
      a.href ||
      (a.sourceKind === 'faq' && a.sourceId
        ? `/ayuda/faq/${a.sourceId}`
        : a.sourceKind === 'tutorial' && a.sourceId
          ? `/ayuda/tutorial/${a.sourceId}`
          : a.sourceKind === 'policy' && a.sourceId
            ? `/politicas/${a.sourceId}`
            : '/asistente'),
  }))
}

/** Fuentes extra: avisos publicados recientes (conocimiento informal). */
export async function toolSearchPosts({ tenantId, user, q = '', limit = 4 }) {
  const query = String(q || '').trim()
  if (!query) return []
  const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const items = await Post.find({
    tenantId,
    status: 'published',
    ...audienceFilterForUser(user),
    $or: [{ titulo: rx }, { cuerpo: rx }],
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  return items.map((p) => ({
    kind: 'post',
    id: String(p._id),
    titulo: p.titulo,
    excerpt: excerpt(p.cuerpo, 160),
    href: `/muro/${p._id}`,
  }))
}

export function toolListModules() {
  return MODULE_HINTS.map((m) => ({ label: m.label, href: m.route }))
}

export function formatRequestsAnswer(list) {
  if (!list.length) {
    return {
      text: 'No tenés solicitudes en curso ahora. Si querés iniciar un trámite, pedime “abrir una consulta” o andá a Mis solicitudes.',
      links: [{ label: 'Mis solicitudes', href: '/solicitudes' }],
      sources: [],
    }
  }
  const lines = list.map(
    (r, i) => `${i + 1}. **${r.codigo}** — ${r.titulo} · ${r.estadoLabel} → ${r.href}`,
  )
  return {
    text: `Estas son tus solicitudes en curso:\n\n${lines.join('\n')}\n\nTocá el enlace o pedime el detalle de alguna.`,
    links: [
      { label: 'Ver todas', href: '/solicitudes' },
      ...list.slice(0, 5).map((r) => ({ label: r.codigo, href: r.href })),
    ],
    sources: list.map((r) => ({
      kind: 'request',
      id: r.id,
      titulo: `${r.codigo} · ${r.titulo}`,
      href: r.href,
      excerpt: r.estadoLabel,
    })),
  }
}

export function formatDocumentsAnswer(list, q = '') {
  if (!list.length) {
    return {
      text: q
        ? `No encontré documentos visibles que coincidan con “${q}”.`
        : 'No hay documentos publicados visibles para vos en este momento.',
      links: [{ label: 'Mis documentos', href: '/docs' }],
      sources: [],
    }
  }
  const lines = list.map((d, i) => {
    const cat = d.category ? ` (${d.category})` : ''
    return `${i + 1}. **${d.titulo}**${cat}${d.descripcion ? ` — ${d.descripcion}` : ''}`
  })
  const intro = q ? `Documentos visibles relacionados con “${q}”:` : 'Estos documentos están visibles para vos:'
  return {
    text: `${intro}\n\n${lines.join('\n')}\n\nAbrí Documentos para descargarlos.`,
    links: [{ label: 'Mis documentos', href: '/docs' }],
    sources: list.map((d) => ({
      kind: 'document',
      id: d.id,
      titulo: d.titulo,
      href: '/docs',
      excerpt: d.descripcion,
    })),
  }
}

export function formatKbAnswer(articles, posts = []) {
  const sources = [
    ...articles.map((a) => ({
      kind: 'kb',
      id: a.id,
      titulo: a.titulo,
      href: a.href || '/asistente',
      excerpt: a.excerpt,
    })),
    ...posts.map((p) => ({
      kind: 'post',
      id: p.id,
      titulo: p.titulo,
      href: p.href,
      excerpt: p.excerpt,
    })),
  ]
  if (!sources.length) {
    return {
      text: 'No encontré esa información en la base de conocimientos. Puedo ayudarte con tus solicitudes en curso, documentos visibles, o abrir una consulta a soporte/RRHH.',
      links: [
        { label: 'Mis solicitudes', href: '/solicitudes' },
        { label: 'Documentos', href: '/docs' },
        { label: 'Abrir consulta', href: '/solicitudes' },
      ],
      sources: [],
    }
  }
  const best = articles[0] || posts[0]
  const extras = sources
    .slice(0, 4)
    .map((s, i) => `${i + 1}. ${s.titulo}`)
    .join('\n')
  const body = articles[0]?.cuerpo || articles[0]?.excerpt || posts[0]?.excerpt || ''
  return {
    text: `Según la base de conocimientos de tu comunidad:\n\n**${best.titulo}**\n\n${excerpt(body, 700)}\n\nFuentes:\n${extras}`,
    links: sources.slice(0, 5).map((s) => ({ label: s.titulo, href: s.href })),
    sources,
  }
}
