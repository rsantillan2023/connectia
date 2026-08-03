/**
 * IA beneficios: redactar catálogo + explicar canje + buscar imagen.
 */
import { aiConfigured } from './openaiPosts.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const CATEGORY_IMAGE_FALLBACKS = {
  descuentos: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=900&q=80',
  salud: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
  gastronomia: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
  transporte: 'https://images.unsplash.com/photo-1544620341-1ada256fd0d3?w=900&q=80',
  educacion: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
  tecnologia: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80',
  premios: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80',
  otros: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80',
}

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

async function chat(system, user, maxTokens = 700) {
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
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `openai ${res.status}`)
      return String(data.choices?.[0]?.message?.content || '')
    } catch (e) {
      errors.push(`openai: ${e.message}`)
    }
  }
  if (anthropicKey()) {
    try {
      const res = await fetch(ANTHROPIC_MESSAGES, {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey(),
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `anthropic ${res.status}`)
      return String(data.content?.[0]?.text || '')
    } catch (e) {
      errors.push(`anthropic: ${e.message}`)
    }
  }
  const err = new Error(errors.join('; ') || 'IA no configurada')
  err.status = 503
  throw err
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

function inferOfferFromPrompt(prompt = '') {
  const p = String(prompt || '').toLowerCase()
  if (/premio|gift\s*card|día libre|dia libre|recompensa/.test(p)) return 'premio'
  if (/partner|link|url|portal|convenio externo/.test(p)) return 'partner'
  if (/sucursal|mapa|ubicación|ubicacion|geo|farmacia|estación|estacion/.test(p)) return 'geo'
  if (/punto|canje|pts|costo|stock|cupo/.test(p)) return 'canjeable'
  return 'informativo'
}

function normalizeDraftFields(data = {}, fallbackOfferType = 'informativo') {
  const offerType = ['informativo', 'canjeable', 'premio', 'geo', 'partner'].includes(
    String(data.offerType || '').trim().toLowerCase(),
  )
    ? String(data.offerType).trim().toLowerCase()
    : fallbackOfferType
  const categoria = String(data.categoria || (offerType === 'premio' ? 'premios' : 'descuentos'))
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const costoRaw = Number(data.costoPuntos)
  let costoPuntos = Number.isFinite(costoRaw) ? Math.max(0, Math.floor(costoRaw)) : 0
  if (offerType === 'informativo' || offerType === 'partner' || offerType === 'geo') costoPuntos = 0
  if ((offerType === 'canjeable' || offerType === 'premio') && costoPuntos <= 0) {
    costoPuntos = offerType === 'premio' ? 500 : 100
  }
  const stockRaw = data.stock
  const stock =
    stockRaw == null || stockRaw === ''
      ? null
      : Number.isFinite(Number(stockRaw))
        ? Math.max(0, Math.floor(Number(stockRaw)))
        : null

  return {
    titulo: String(data.titulo || '').trim().slice(0, 160),
    nombreComercial: String(data.nombreComercial || '').trim().slice(0, 120),
    descripcion: String(data.descripcion || '').trim().slice(0, 4000),
    condiciones: String(data.condiciones || '').trim().slice(0, 4000),
    categoria,
    offerType,
    costoPuntos,
    stock,
    partnerName: String(data.partnerName || '').trim().slice(0, 120),
    partnerUrl: String(data.partnerUrl || '').trim().slice(0, 500),
    sucursal: String(data.sucursal || '').trim().slice(0, 160),
    destacado: Boolean(data.destacado),
    imageQuery: String(data.imageQuery || data.titulo || '').trim().slice(0, 120),
  }
}

/** Heurística sin LLM. */
export function draftBenefitHeuristic({ prompt = '', offerType = '', brand = 'la comunidad' } = {}) {
  const p = String(prompt || '').trim() || 'beneficio para colaboradores'
  const ot = offerType || inferOfferFromPrompt(p)
  const base = normalizeDraftFields(
    {
      titulo: p.slice(0, 80),
      nombreComercial: p.slice(0, 40),
      descripcion: `Beneficio pensado para ${brand}: ${p}. Revisá condiciones y vigencia antes de publicar.`,
      condiciones:
        'Válido para colaboradores activos. Sujeto a stock y políticas internas. No acumulable salvo indicación.',
      categoria: ot === 'premio' ? 'premios' : ot === 'geo' ? 'salud' : 'descuentos',
      offerType: ot,
      costoPuntos: ot === 'premio' ? 500 : ot === 'canjeable' ? 100 : 0,
      stock: ot === 'canjeable' || ot === 'premio' ? 50 : null,
      imageQuery: p.slice(0, 80),
      destacado: /destacad|promo|lanzamiento/.test(p.toLowerCase()),
    },
    ot,
  )
  return { ...base, source: 'heuristic' }
}

/**
 * Busca imágenes libres / web para el beneficio.
 * @returns {{ imageUrl: string, imageCandidates: { url: string, title?: string }[], provider: string }}
 */
export async function searchBenefitImages(query = '', categoria = 'otros') {
  const q = String(query || '').trim() || String(categoria || 'beneficio corporativo')
  const fallback = CATEGORY_IMAGE_FALLBACKS[categoria] || CATEGORY_IMAGE_FALLBACKS.otros
  const key = (process.env.SERPER_API_KEY || '').trim()
  if (key) {
    try {
      const res = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: `${q} benefit offer photo`, num: 6 }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const images = Array.isArray(data.images) ? data.images : []
        const candidates = images
          .map((img) => ({
            url: String(img.imageUrl || img.url || '').trim(),
            title: String(img.title || '').trim().slice(0, 120),
          }))
          .filter((c) => /^https?:\/\//i.test(c.url))
          .slice(0, 6)
        if (candidates.length) {
          return {
            imageUrl: candidates[0].url,
            imageCandidates: candidates,
            provider: 'serper-images',
          }
        }
      }
    } catch {
      /* fallback abajo */
    }
  }
  return {
    imageUrl: fallback,
    imageCandidates: [{ url: fallback, title: categoria || 'beneficio' }],
    provider: 'fallback',
  }
}

export async function draftBenefitCopy({
  prompt,
  offerType = '',
  brand = 'la comunidad',
  tenant,
  findImage = true,
} = {}) {
  const suggested = offerType || inferOfferFromPrompt(prompt)
  let draft
  if (!aiConfigured()) {
    draft = draftBenefitHeuristic({ prompt, offerType: suggested, brand })
  } else {
    const system = [
      'Sos copywriter de beneficios corporativos Connectia (español rioplatense).',
      `Comunidad: ${tenant?.nombre || brand}.`,
      'Armá un borrador completo listo para el wizard admin.',
      'Respondé SOLO JSON válido con estas claves:',
      JSON.stringify({
        titulo: 'máx 80 chars',
        nombreComercial: 'nombre corto para el muro',
        descripcion: '2-4 oraciones claras',
        condiciones: 'reglas cortas',
        categoria: 'descuentos|salud|gastronomia|transporte|educacion|tecnologia|premios|otros',
        offerType: 'informativo|canjeable|premio|geo|partner',
        costoPuntos: 0,
        stock: null,
        partnerName: '',
        partnerUrl: '',
        sucursal: '',
        destacado: false,
        imageQuery: 'palabras clave en inglés para buscar foto',
      }),
      'Si es informativo/partner/geo, costoPuntos=0.',
      'Si es canjeable/premio, sugerí un costo razonable en puntos.',
      'No inventes URLs de partners reales; solo si el prompt las menciona.',
      'imageQuery debe describir bien la foto (sin marcas registradas inventadas).',
    ].join('\n')
    const user = `Tipo sugerido: ${suggested}\nPedido del admin:\n${String(prompt || '').slice(0, 1500)}`
    try {
      const raw = await chat(system, user, 900)
      const data = parseJson(raw)
      draft = { ...normalizeDraftFields(data, suggested), source: 'llm' }
      if (!draft.titulo) {
        draft = draftBenefitHeuristic({ prompt, offerType: suggested, brand })
      }
    } catch {
      draft = draftBenefitHeuristic({ prompt, offerType: suggested, brand })
    }
  }

  if (findImage) {
    const images = await searchBenefitImages(draft.imageQuery || draft.titulo, draft.categoria)
    draft.imageUrl = images.imageUrl
    draft.imageCandidates = images.imageCandidates
    draft.imageProvider = images.provider
  }

  return draft
}

export async function explainRedeemCopy({ benefit, reason = '', balance = null } = {}) {
  const titulo = benefit?.titulo || 'este beneficio'
  const costo = Number(benefit?.costoPuntos || 0)
  const base = reason
    ? `No podés canjear «${titulo}» ahora: ${reason}.`
    : costo > 0
      ? `Canjear «${titulo}» cuesta ${costo} pts${balance != null ? ` (tu saldo: ${balance})` : ''}. Al confirmar se genera un código/QR para presentar.`
      : `«${titulo}» es informativo: no gasta puntos. Revisá condiciones y presentá tu credencial si aplica.`

  if (!aiConfigured()) {
    return { text: base, source: 'heuristic' }
  }
  try {
    const system =
      'Explicá en 2 oraciones claras (español rioplatense) cómo funciona el canje de un beneficio. Sin inventar reglas.'
    const user = JSON.stringify({ titulo, costo, reason, balance, condiciones: benefit?.condiciones || '' })
    const text = (await chat(system, user, 220)).trim().slice(0, 500)
    return { text: text || base, source: 'llm' }
  } catch {
    return { text: base, source: 'heuristic' }
  }
}

export { aiConfigured as benefitsAiConfigured }
