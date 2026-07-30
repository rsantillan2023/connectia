/**
 * Newsletter personalizado por audiencia a partir de publicaciones seleccionadas.
 * Cada destinatario solo recibe las pubs a las que pertenece.
 */
import PDFDocument from 'pdfkit'
import { User } from '../models/User.js'
import { userCanSeePost } from '../lib/audience.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { emailService } from './emailService.js'
import { aiConfigured } from './openaiPosts.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const TIPO_LABEL = {
  noticia: 'Noticia',
  aviso: 'Aviso',
  beneficio: 'Beneficio',
  evento: 'Evento',
  general: 'General',
}

/** Fingerprint para destinatarios externos (reciben todas las pubs del boletín). */
export const EXTERNAL_FINGERPRINT = '__external_all__'

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

function displayName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function publicApiBase() {
  return (
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  ).replace(/\/$/, '')
}

function absoluteUrl(pathOrUrl) {
  const u = String(pathOrUrl || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  const base = publicApiBase()
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`
}

function feedUrl() {
  return `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/`
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(s) {
  return escapeHtml(s).replace(/\n/g, '<br/>')
}

function brandColors(tenant) {
  const primary = String(tenant?.branding?.primary || '#8554c9').trim() || '#8554c9'
  const secondary = String(tenant?.branding?.secondary || '#115e59').trim() || '#115e59'
  return { primary, secondary }
}

function postFingerprint(posts) {
  return posts
    .map((p) => String(p._id))
    .sort()
    .join('|')
}

function stripHtmlLite(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerpt(text, max = 280) {
  const t = stripHtmlLite(text)
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

async function chatSummary({ system, userContent }) {
  const errors = []
  if (openaiKey()) {
    try {
      const res = await fetch(OPENAI_CHAT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent },
          ],
          temperature: 0.55,
          max_tokens: 700,
          response_format: { type: 'json_object' },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`)
      return data?.choices?.[0]?.message?.content || '{}'
    } catch (e) {
      errors.push(`openai: ${e.message}`)
    }
  }
  if (anthropicKey()) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
      const res = await fetch(ANTHROPIC_MESSAGES, {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey(),
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          temperature: 0.55,
          system,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`)
      return (data?.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
    } catch (e) {
      errors.push(`anthropic: ${e.message}`)
    }
  }
  throw new Error(errors.length ? errors.join(' | ') : 'IA no configurada')
}

function fallbackSummary(posts, brandName) {
  const n = posts.length
  const titles = posts.map((p) => `«${p.titulo}»`).join(', ')
  if (n === 1) {
    return `En este boletín de ${brandName} te compartimos lo más reciente: ${titles}.`
  }
  return `En este boletín de ${brandName} reunimos ${n} novedades pensadas para vos: ${titles}.`
}

/**
 * Resumen IA del contenido que verá ese destinatario (solo sus pubs).
 */
export async function generateNewsletterSummary({ posts, tenant }) {
  const brandName = tenant?.nombre || 'Connectia'
  const payload = posts.map((p) => ({
    titulo: p.titulo,
    tipo: p.tipo,
    extracto: excerpt(p.cuerpo, 400),
  }))

  if (!aiConfigured()) {
    return { summary: fallbackSummary(posts, brandName), ai: false }
  }

  try {
    const system = [
      'Sos el editor del newsletter interno de Connectia.',
      `Escribís un resumen breve (2 a 4 oraciones) en español rioplatense para "${brandName}".`,
      'Tocá solo lo que está en las publicaciones; no inventes datos.',
      'Tono cercano, claro y profesional. Sin emojis.',
      'Respondé SOLO JSON: {"summary":"texto"}',
    ].join('\n')
    const raw = await chatSummary({
      system,
      userContent: `Armá el resumen de apertura del newsletter con estas publicaciones:\n${JSON.stringify(payload)}`,
    })
    let text = String(raw || '').trim()
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    }
    const data = JSON.parse(text)
    const summary = String(data.summary || '').trim()
    if (!summary) return { summary: fallbackSummary(posts, brandName), ai: false }
    return { summary, ai: true }
  } catch (e) {
    console.warn('[newsletter] resumen IA:', e.message)
    return { summary: fallbackSummary(posts, brandName), ai: false, aiError: e.message }
  }
}

export function buildNewsletterHtml({
  nombre,
  brandName,
  logoUrl,
  primary,
  secondary,
  subject,
  summary,
  posts,
  appUrl,
}) {
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" width="140" style="display:block;max-width:140px;height:auto;margin:0 0 12px;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 8px;">${escapeHtml(brandName)}</div>`

  const itemsHtml = posts
    .map((p, i) => {
      const tipo = TIPO_LABEL[p.tipo] || p.tipo || 'Publicación'
      const img = absoluteUrl(toPublicMediaUrl(p.imageUrl))
      const imgBlock = img
        ? `<img src="${escapeHtml(img)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;margin:0 0 12px;" />`
        : ''
      return `
      <tr>
        <td style="padding:0 0 ${i < posts.length - 1 ? '22' : '0'}px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#ffffff;">
            <tr>
              <td style="padding:18px 18px 16px;">
                <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${escapeHtml(primary)};background:${escapeHtml(primary)}18;border-radius:6px;padding:4px 8px;margin-bottom:10px;">${escapeHtml(tipo)}</span>
                <h2 style="margin:10px 0 8px;font-size:18px;line-height:1.3;color:#111827;font-weight:700;">${escapeHtml(p.titulo)}</h2>
                ${imgBlock}
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${nl2br(excerpt(p.cuerpo, 520))}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg, ${escapeHtml(primary)} 0%, ${escapeHtml(secondary)} 100%);padding:28px 28px 24px;color:#ffffff;">
              ${logoBlock}
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;opacity:0.85;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Newsletter</div>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:800;">${escapeHtml(subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 14px;font-size:15px;color:#111827;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${escapeHtml(primary)};border-radius:12px;margin:0 0 22px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${escapeHtml(primary)};margin-bottom:6px;">Resumen</div>
                    <p style="margin:0;font-size:15px;line-height:1.55;color:#1f2937;">${escapeHtml(summary)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Lo que sigue es solo el contenido relevante para vos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${escapeHtml(primary)};color:#ffffff !important;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;">Ver en la app</a>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Adjuntamos un PDF con la misma información para guardar o reenviar.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px;border-top:1px solid #e5e7eb;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">
              ${escapeHtml(brandName)} · Newsletter automático · No responder a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildNewsletterText({ nombre, brandName, subject, summary, posts, appUrl }) {
  const lines = [
    `Hola ${nombre},`,
    '',
    subject,
    '',
    'Resumen:',
    summary,
    '',
    '---',
  ]
  for (const p of posts) {
    lines.push('')
    lines.push(`[${TIPO_LABEL[p.tipo] || p.tipo}] ${p.titulo}`)
    lines.push(excerpt(p.cuerpo, 400))
  }
  lines.push('', `Ver en la app: ${appUrl}`, '', `Equipo de ${brandName}`)
  return lines.join('\n')
}

/**
 * PDF con la misma info del mail (buffer).
 */
export function buildNewsletterPdfBuffer({
  brandName,
  subject,
  summary,
  posts,
  nombre,
  primary = '#0f766e',
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: subject,
        Author: brandName,
        Subject: 'Newsletter',
      },
    })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const accent = primary || '#0f766e'

    doc
      .fillColor(accent)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(String(brandName || 'Connectia').toUpperCase(), { characterSpacing: 1.2 })
    doc.moveDown(0.35)
    doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text(subject, { lineGap: 2 })
    doc.moveDown(0.4)
    doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text(`Para: ${nombre}`)
    doc.moveDown(0.8)

    doc
      .roundedRect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 8, 4)
      .fill(accent)
    doc.moveDown(1.2)

    doc.fillColor(accent).fontSize(10).font('Helvetica-Bold').text('RESUMEN')
    doc.moveDown(0.35)
    doc.fillColor('#1f2937').fontSize(11).font('Helvetica').text(summary, { lineGap: 3, align: 'left' })
    doc.moveDown(1)

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i]
      if (doc.y > doc.page.height - 140) doc.addPage()

      doc
        .fillColor(accent)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text((TIPO_LABEL[p.tipo] || p.tipo || 'Publicación').toUpperCase())
      doc.moveDown(0.25)
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text(p.titulo, { lineGap: 2 })
      doc.moveDown(0.35)
      doc
        .fillColor('#374151')
        .fontSize(10.5)
        .font('Helvetica')
        .text(excerpt(p.cuerpo, 900), { lineGap: 3 })
      if (i < posts.length - 1) {
        doc.moveDown(0.7)
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke()
        doc.moveDown(0.7)
      }
    }

    doc.moveDown(1.5)
    doc
      .fillColor('#9ca3af')
      .fontSize(9)
      .font('Helvetica')
      .text(`Generado por ${brandName} · Podés reenviar este PDF`, {
        align: 'center',
      })

    doc.end()
  })
}

/**
 * Resuelve destinatarios y qué publicaciones ve cada uno.
 * @returns {{ recipients: Array, variants: number, posts: Array }}
 */
export async function resolveNewsletterRecipients({ tenantId, posts }) {
  if (!posts?.length) {
    return { recipients: [], variants: 0, posts: [] }
  }

  // Cargar todos los usuarios activos del tenant (con email preferible) y filtrar en memoria
  // por userCanSeePost — correcto con audiencias mixtas all/restricted.
  const users = await User.find({ tenantId, activo: true })
    .select('_id email nombre apellido usuario areaId groupIds notifPrefs')
    .lean()

  const recipients = []
  const fingerprintCounts = new Map()

  for (const u of users) {
    const visible = posts.filter((p) => userCanSeePost(u, p))
    if (!visible.length) continue
    const fp = postFingerprint(visible)
    fingerprintCounts.set(fp, (fingerprintCounts.get(fp) || 0) + 1)
    recipients.push({
      userId: String(u._id),
      email: u.email || '',
      nombre: displayName(u),
      canEmail: Boolean(u.email && u.notifPrefs?.email !== false),
      postIds: visible.map((p) => String(p._id)),
      fingerprint: fp,
      areaId: u.areaId ? String(u.areaId) : null,
      groupIds: (u.groupIds || []).map(String),
    })
  }

  return {
    recipients,
    variants: fingerprintCounts.size,
    posts: posts.map((p) => ({
      id: String(p._id),
      titulo: p.titulo,
      tipo: p.tipo,
      status: p.status,
      audienceMode: p.audience?.mode || 'all',
    })),
  }
}

/**
 * Envía el newsletter personalizado.
 */
export async function sendPersonalizedNewsletter({
  tenant,
  posts,
  subject: subjectIn,
  dryRun = false,
}) {
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const { primary, secondary } = brandColors(tenant)
  const logoPath = toPublicMediaUrl(tenant?.branding?.logoUrl || '')
  const logoUrl = absoluteUrl(logoPath)
  const appUrl = feedUrl()
  const subject =
    String(subjectIn || '').trim() ||
    `Novedades de ${brandName} · ${new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    })}`

  const { recipients, variants } = await resolveNewsletterRecipients({
    tenantId: tenant._id,
    posts,
  })

  const emailable = recipients.filter((r) => r.canEmail)
  if (!emailable.length) {
    return {
      ok: false,
      reason: 'Sin destinatarios con email habilitado',
      recipients: recipients.length,
      emailed: 0,
      variants,
      subject,
    }
  }

  // Cache por fingerprint: resumen IA + PDF (mismo contenido para misma audiencia)
  const contentCache = new Map()
  async function contentFor(fp, visiblePosts) {
    if (contentCache.has(fp)) return contentCache.get(fp)
    const { summary, ai } = await generateNewsletterSummary({ posts: visiblePosts, tenant })
    const pdfBuffer = await buildNewsletterPdfBuffer({
      brandName,
      subject,
      summary,
      posts: visiblePosts,
      nombre: 'tu boletín',
      primary,
    })
    const entry = { summary, ai, pdfBuffer }
    contentCache.set(fp, entry)
    return entry
  }

  if (dryRun) {
    const sample = emailable[0]
    const visible = posts.filter((p) => sample.postIds.includes(String(p._id)))
    const { summary, ai } = await generateNewsletterSummary({ posts: visible, tenant })
    const html = buildNewsletterHtml({
      nombre: sample.nombre,
      brandName,
      logoUrl,
      primary,
      secondary,
      subject,
      summary,
      posts: visible,
      appUrl,
    })
    return {
      ok: true,
      dryRun: true,
      recipients: recipients.length,
      emailable: emailable.length,
      variants,
      subject,
      sample: {
        nombre: sample.nombre,
        email: sample.email,
        postCount: visible.length,
        summary,
        ai,
        htmlPreview: html,
      },
    }
  }

  if (!emailService.isConfigured) {
    return {
      ok: false,
      reason: 'Mail no configurado (EMAIL_USER / EMAIL_PASSWORD)',
      recipients: recipients.length,
      emailed: 0,
      variants,
      subject,
    }
  }

  let emailed = 0
  let failed = 0
  const errors = []
  const batchSize = 12

  for (let i = 0; i < emailable.length; i += batchSize) {
    const batch = emailable.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (r) => {
        try {
          const visible = posts.filter((p) => r.postIds.includes(String(p._id)))
          const { summary, pdfBuffer } = await contentFor(r.fingerprint, visible)
          const html = buildNewsletterHtml({
            nombre: r.nombre,
            brandName,
            logoUrl,
            primary,
            secondary,
            subject,
            summary,
            posts: visible,
            appUrl,
          })
          const text = buildNewsletterText({
            nombre: r.nombre,
            brandName,
            subject,
            summary,
            posts: visible,
            appUrl,
          })
          const result = await emailService.sendNewsletterEmail(r.email, {
            subject,
            text,
            html,
            pdfBuffer,
            filename: `newsletter-${brandName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            brandName,
          })
          if (result?.success) emailed += 1
          else {
            failed += 1
            if (errors.length < 8) errors.push(result?.reason || result?.error || r.email)
          }
        } catch (e) {
          failed += 1
          if (errors.length < 8) errors.push(`${r.email}: ${e.message}`)
          console.warn('[newsletter] send:', e.message)
        }
      }),
    )
  }

  console.log(
    `[newsletter] tenant=${tenant._id} posts=${posts.length} recipients=${recipients.length} emailed=${emailed} failed=${failed} variants=${variants}`,
  )

  return {
    ok: emailed > 0,
    recipients: recipients.length,
    emailable: emailable.length,
    emailed,
    failed,
    variants,
    subject,
    errors,
  }
}

function actorFromUser(user) {
  const name =
    [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || user?.email || 'Admin'
  return {
    userId: user?._id || null,
    name,
    at: new Date(),
    note: '',
  }
}

function pushAudit(doc, user, action, note = '') {
  const a = actorFromUser(user)
  doc.auditLog = doc.auditLog || []
  doc.auditLog.push({
    at: new Date(),
    byUserId: a.userId,
    byName: a.name,
    action,
    note: String(note || '').trim().slice(0, 500),
  })
}

function excerptCuerpo(cuerpo) {
  return excerpt(cuerpo, 2000)
}

/** Recalcula totales según included + canEmail. */
export function recalcNewsletterTotals(doc) {
  const recipients = doc.recipients || []
  const emailable = recipients.filter((r) => r.canEmail && r.included !== false)
  const excluded = recipients.filter((r) => r.included === false).length
  const noEmail = recipients.filter((r) => !r.canEmail).length
  doc.totals = doc.totals || {}
  doc.totals.recipients = recipients.length
  doc.totals.emailable = emailable.length
  doc.totals.variants = (doc.variants || []).length
  doc.totals.skipped = noEmail + excluded
  if (doc.totals.emailed == null) doc.totals.emailed = 0
  if (doc.totals.failed == null) doc.totals.failed = 0

  // Actualizar conteos por variante
  const byFp = new Map()
  for (const r of recipients) {
    if (!byFp.has(r.fingerprint)) {
      byFp.set(r.fingerprint, { recipientCount: 0, emailableCount: 0 })
    }
    const v = byFp.get(r.fingerprint)
    v.recipientCount += 1
    if (r.canEmail && r.included !== false) v.emailableCount += 1
  }
  for (const variant of doc.variants || []) {
    const counts = byFp.get(variant.fingerprint)
    if (!counts) continue
    variant.recipientCount = counts.recipientCount
    variant.emailableCount = counts.emailableCount
  }
  return doc
}

/**
 * Asegura variante "externos" con todas las pubs del newsletter.
 */
export async function ensureExternalVariant(doc, tenant) {
  let variant = (doc.variants || []).find((v) => v.fingerprint === EXTERNAL_FINGERPRINT)
  const allPostIds = (doc.posts || []).map((p) => p.postId)
  if (!variant) {
    const postsForSummary = (doc.posts || []).map((p) => ({
      titulo: p.titulo,
      tipo: p.tipo,
      cuerpo: p.cuerpo,
    }))
    const { summary, ai } = await generateNewsletterSummary({
      posts: postsForSummary,
      tenant,
    })
    variant = {
      fingerprint: EXTERNAL_FINGERPRINT,
      postIds: allPostIds,
      summary,
      summaryAi: Boolean(ai),
      recipientCount: 0,
      emailableCount: 0,
    }
    doc.variants.push(variant)
  } else {
    variant.postIds = allPostIds
  }
  return variant
}

/**
 * Agrega destinatarios externos (cualquier email).
 * @returns {{ added: number, skipped: string[] }}
 */
export async function addExternalRecipients(doc, { emails, tenant }) {
  const list = Array.isArray(emails) ? emails : []
  const skipped = []
  let added = 0
  await ensureExternalVariant(doc, tenant)
  const allPostIds = (doc.posts || []).map((p) => p.postId)
  const existing = new Set(
    (doc.recipients || []).map((r) => normalizeEmail(r.email)).filter(Boolean),
  )

  for (const raw of list) {
    const email =
      typeof raw === 'string' ? normalizeEmail(raw) : normalizeEmail(raw?.email)
    const nombre =
      typeof raw === 'object' && raw?.nombre
        ? String(raw.nombre).trim().slice(0, 120)
        : email.split('@')[0]
    if (!email || !isValidEmail(email)) {
      skipped.push(email || '(vacío)')
      continue
    }
    if (existing.has(email)) {
      skipped.push(email)
      continue
    }
    doc.recipients.push({
      userId: null,
      email,
      nombre: nombre || email,
      fingerprint: EXTERNAL_FINGERPRINT,
      postIds: allPostIds,
      canEmail: true,
      included: true,
      isExternal: true,
      areaId: null,
      areaNombre: 'Externo',
      groupIds: [],
      groupNombres: [],
      deliveryStatus: 'pending',
      error: '',
    })
    existing.add(email)
    added += 1
  }
  recalcNewsletterTotals(doc)
  return { added, skipped }
}

async function enrichRecipientsOrg(tenantId, recipients) {
  const { OrgArea } = await import('../models/OrgArea.js')
  const { UserGroup } = await import('../models/UserGroup.js')
  const areaIds = [...new Set(recipients.map((r) => r.areaId).filter(Boolean))]
  const groupIds = [...new Set(recipients.flatMap((r) => r.groupIds || []).filter(Boolean))]
  const [areas, groups] = await Promise.all([
    areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds } }).select('_id nombre').lean()
      : [],
    groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds } }).select('_id nombre').lean()
      : [],
  ])
  const areaMap = new Map(areas.map((a) => [String(a._id), a.nombre || '']))
  const groupMap = new Map(groups.map((g) => [String(g._id), g.nombre || '']))
  return recipients.map((r) => ({
    ...r,
    areaNombre: r.areaId ? areaMap.get(String(r.areaId)) || '' : '',
    groupNombres: (r.groupIds || []).map((id) => groupMap.get(String(id)) || '').filter(Boolean),
  }))
}

/**
 * Crea un newsletter en pending_review con snapshots, variantes y resúmenes IA.
 * No envía mail: requiere moderación/aprobación.
 */
export async function createNewsletterDraft({ tenant, posts, subject: subjectIn, user }) {
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const subject =
    String(subjectIn || '').trim() ||
    `Novedades de ${brandName} · ${new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    })}`

  const { recipients: rawRecipients } = await resolveNewsletterRecipients({ tenantId: tenant._id, posts })
  if (!rawRecipients.length) {
    const err = new Error('Ningún usuario activo entra en la audiencia de estas publicaciones')
    err.status = 400
    throw err
  }
  const recipients = await enrichRecipientsOrg(tenant._id, rawRecipients)

  const byFp = new Map()
  for (const r of recipients) {
    if (!byFp.has(r.fingerprint)) {
      byFp.set(r.fingerprint, {
        fingerprint: r.fingerprint,
        postIds: r.postIds,
        recipientCount: 0,
        emailableCount: 0,
      })
    }
    const v = byFp.get(r.fingerprint)
    v.recipientCount += 1
    if (r.canEmail) v.emailableCount += 1
  }

  const variants = []
  for (const v of byFp.values()) {
    const visible = posts.filter((p) => v.postIds.includes(String(p._id)))
    const { summary, ai } = await generateNewsletterSummary({ posts: visible, tenant })
    variants.push({
      fingerprint: v.fingerprint,
      postIds: v.postIds,
      summary,
      summaryAi: Boolean(ai),
      recipientCount: v.recipientCount,
      emailableCount: v.emailableCount,
    })
  }

  const emailable = recipients.filter((r) => r.canEmail)
  const { Newsletter } = await import('../models/Newsletter.js')

  const doc = new Newsletter({
    tenantId: tenant._id,
    subject,
    status: 'pending_review',
    posts: posts.map((p) => ({
      postId: p._id,
      titulo: p.titulo || '',
      tipo: p.tipo || 'general',
      cuerpo: excerptCuerpo(p.cuerpo),
      imageUrl: p.imageUrl || '',
      audienceMode: p.audience?.mode || 'all',
    })),
    variants,
    recipients: recipients.map((r) => ({
      userId: r.userId,
      email: r.email,
      nombre: r.nombre,
      fingerprint: r.fingerprint,
      postIds: r.postIds,
      canEmail: r.canEmail,
      included: true,
      areaId: r.areaId || null,
      areaNombre: r.areaNombre || '',
      groupIds: r.groupIds || [],
      groupNombres: r.groupNombres || [],
      deliveryStatus: r.canEmail ? 'pending' : 'skipped',
    })),
    totals: {
      recipients: recipients.length,
      emailable: emailable.length,
      variants: variants.length,
      emailed: 0,
      failed: 0,
      skipped: recipients.length - emailable.length,
    },
    createdBy: actorFromUser(user),
  })
  pushAudit(doc, user, 'created', `Borrador con ${posts.length} pubs · ${variants.length} versiones`)
  await doc.save()
  return doc
}

/**
 * Envía un newsletter ya aprobado. Actualiza delivery por destinatario y auditoría.
 */
export async function sendApprovedNewsletter({ newsletter, tenant, user, postsById }) {
  if (newsletter.status !== 'approved') {
    const err = new Error('Solo se pueden enviar newsletters aprobados')
    err.status = 400
    throw err
  }
  recalcNewsletterTotals(newsletter)
  if (!(newsletter.totals?.emailable > 0)) {
    const err = new Error('No hay destinatarios con email incluidos para enviar')
    err.status = 400
    throw err
  }
  if (!emailService.isConfigured) {
    const err = new Error('Mail no configurado (EMAIL_USER / EMAIL_PASSWORD)')
    err.status = 503
    throw err
  }

  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const { primary, secondary } = brandColors(tenant)
  const logoUrl = absoluteUrl(toPublicMediaUrl(tenant?.branding?.logoUrl || ''))
  const appUrl = feedUrl()
  const subject = newsletter.subject

  const summaryByFp = new Map(
    (newsletter.variants || []).map((v) => [v.fingerprint, String(v.summary || '').trim()]),
  )

  const pdfCache = new Map()
  async function pdfFor(fp, visiblePosts, summary) {
    if (pdfCache.has(fp)) return pdfCache.get(fp)
    const buf = await buildNewsletterPdfBuffer({
      brandName,
      subject,
      summary,
      posts: visiblePosts,
      nombre: 'tu boletín',
      primary,
    })
    pdfCache.set(fp, buf)
    return buf
  }

  newsletter.status = 'sending'
  newsletter.sentBy = { ...actorFromUser(user), note: 'Inicio de envío' }
  pushAudit(newsletter, user, 'sending_started')
  await newsletter.save()

  let emailed = 0
  let failed = 0
  const emailable = (newsletter.recipients || []).filter(
    (r) => r.canEmail && r.included !== false,
  )
  const batchSize = 12

  for (let i = 0; i < emailable.length; i += batchSize) {
    const batch = emailable.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (r) => {
        const idx = newsletter.recipients.findIndex((x) => {
          if (r.isExternal || !r.userId) {
            return (
              normalizeEmail(x.email) === normalizeEmail(r.email) &&
              x.fingerprint === r.fingerprint
            )
          }
          return String(x.userId) === String(r.userId) && x.fingerprint === r.fingerprint
        })
        try {
          const postIds = (r.postIds || []).map(String)
          // Externos: todas las pubs del boletín
          const effectiveIds =
            r.isExternal || r.fingerprint === EXTERNAL_FINGERPRINT
              ? (newsletter.posts || []).map((p) => String(p.postId))
              : postIds
          const visible = effectiveIds.map((id) => postsById.get(id)).filter(Boolean)
          // Fallback a snapshots del newsletter si el post ya no está
          const postsForMail =
            visible.length > 0
              ? visible
              : (newsletter.posts || [])
                  .filter((p) => effectiveIds.includes(String(p.postId)))
                  .map((p) => ({
                    _id: p.postId,
                    titulo: p.titulo,
                    tipo: p.tipo,
                    cuerpo: p.cuerpo,
                    imageUrl: p.imageUrl,
                  }))
          const summary =
            summaryByFp.get(r.fingerprint) ||
            fallbackSummary(postsForMail, brandName)
          const pdfBuffer = await pdfFor(r.fingerprint, postsForMail, summary)
          const html = buildNewsletterHtml({
            nombre: r.nombre,
            brandName,
            logoUrl,
            primary,
            secondary,
            subject,
            summary,
            posts: postsForMail,
            appUrl,
          })
          const text = buildNewsletterText({
            nombre: r.nombre,
            brandName,
            subject,
            summary,
            posts: postsForMail,
            appUrl,
          })
          const result = await emailService.sendNewsletterEmail(r.email, {
            subject,
            text,
            html,
            pdfBuffer,
            filename: `newsletter-${brandName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            brandName,
          })
          if (result?.success) {
            emailed += 1
            if (idx >= 0) {
              newsletter.recipients[idx].deliveryStatus = 'sent'
              newsletter.recipients[idx].sentAt = new Date()
              newsletter.recipients[idx].error = ''
            }
          } else {
            failed += 1
            if (idx >= 0) {
              newsletter.recipients[idx].deliveryStatus = 'failed'
              newsletter.recipients[idx].error = result?.reason || result?.error || 'Error de envío'
            }
          }
        } catch (e) {
          failed += 1
          if (idx >= 0) {
            newsletter.recipients[idx].deliveryStatus = 'failed'
            newsletter.recipients[idx].error = e.message || 'Error'
          }
          console.warn('[newsletter] send approved:', e.message)
        }
      }),
    )
  }

  newsletter.totals = newsletter.totals || {}
  newsletter.totals.emailed = emailed
  newsletter.totals.failed = failed
  newsletter.status = 'sent'
  newsletter.sentBy = actorFromUser(user)
  pushAudit(
    newsletter,
    user,
    'sent',
    `Enviados ${emailed} · fallidos ${failed} · versiones ${newsletter.variants?.length || 0}`,
  )
  await newsletter.save()

  return {
    ok: emailed > 0 || failed === 0,
    emailed,
    failed,
    recipients: newsletter.totals.recipients,
    emailable: newsletter.totals.emailable,
    variants: newsletter.totals.variants,
    subject,
    newsletterId: String(newsletter._id),
  }
}

export function serializeNewsletter(doc, { includeRecipients = false } = {}) {
  if (!doc) return null
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const base = {
    id: String(o._id),
    subject: o.subject,
    status: o.status,
    posts: (o.posts || []).map((p) => ({
      postId: String(p.postId),
      titulo: p.titulo,
      tipo: p.tipo,
      cuerpo: p.cuerpo,
      imageUrl: p.imageUrl,
      audienceMode: p.audienceMode,
    })),
    variants: (o.variants || []).map((v) => ({
      fingerprint: v.fingerprint,
      postIds: (v.postIds || []).map(String),
      summary: v.summary,
      summaryAi: Boolean(v.summaryAi),
      recipientCount: v.recipientCount || 0,
      emailableCount: v.emailableCount || 0,
    })),
    totals: {
      recipients: o.totals?.recipients || 0,
      emailable: o.totals?.emailable || 0,
      variants: o.totals?.variants || 0,
      emailed: o.totals?.emailed || 0,
      failed: o.totals?.failed || 0,
      skipped: o.totals?.skipped || 0,
    },
    createdBy: o.createdBy || null,
    reviewedBy: o.reviewedBy || null,
    approvedBy: o.approvedBy || null,
    rejectedBy: o.rejectedBy || null,
    sentBy: o.sentBy || null,
    cancelledBy: o.cancelledBy || null,
    rejectionReason: o.rejectionReason || '',
    auditLog: (o.auditLog || []).map((a) => ({
      at: a.at,
      byName: a.byName || '',
      byUserId: a.byUserId ? String(a.byUserId) : null,
      action: a.action,
      note: a.note || '',
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
  if (includeRecipients) {
    base.recipients = (o.recipients || []).map((r) => ({
      userId: r.userId ? String(r.userId) : null,
      email: r.email,
      nombre: r.nombre,
      fingerprint: r.fingerprint,
      postIds: (r.postIds || []).map(String),
      canEmail: Boolean(r.canEmail),
      included: r.included !== false,
      isExternal: Boolean(r.isExternal),
      areaId: r.areaId ? String(r.areaId) : null,
      areaNombre: r.areaNombre || (r.isExternal ? 'Externo' : ''),
      groupIds: (r.groupIds || []).map(String),
      groupNombres: Array.isArray(r.groupNombres) ? r.groupNombres : [],
      deliveryStatus: r.deliveryStatus || 'pending',
      sentAt: r.sentAt || null,
      error: r.error || '',
    }))
  } else {
    base.recipientPreview = (o.recipients || []).slice(0, 8).map((r) => ({
      nombre: r.nombre,
      email: r.email,
      canEmail: Boolean(r.canEmail),
      included: r.included !== false,
      isExternal: Boolean(r.isExternal),
      deliveryStatus: r.deliveryStatus || 'pending',
      areaNombre: r.areaNombre || (r.isExternal ? 'Externo' : ''),
    }))
  }
  return base
}

export { actorFromUser, pushAudit, brandColors, absoluteUrl, feedUrl, normalizeEmail, isValidEmail }
