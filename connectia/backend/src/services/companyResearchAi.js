/**
 * Investiga un cliente vía web + IA: logo, colores, rubro, copy.
 * Objetivo: con nombre (+ web opcional) dejar la comunidad usable y un pack claro para el cliente.
 */
import { aiConfigured } from './openaiPosts.js'
import { searchWebNews } from './webNewsSearch.js'
import { fetchArticleContent } from './webArticleFetch.js'
import {
  heuristicCompanyProfile,
  normalizeCompanyProfile,
  normalizeOnboardingContext,
  sanitizeWebsiteUrl,
} from '../lib/genericTenantDefaults.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user, { maxTokens = 1600 } = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.25,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

async function callAnthropic(system, user, { maxTokens = 1600 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

async function chatRaw(system, user) {
  if (!aiConfigured()) {
    const err = new Error('IA no configurada')
    err.status = 503
    throw err
  }
  if (openaiKey()) {
    try {
      return await callOpenAi(system, user)
    } catch (e) {
      if (!anthropicKey()) throw e
      return callAnthropic(system, user)
    }
  }
  return callAnthropic(system, user)
}

const SYSTEM = [
  'Sos un analista de onboarding para Connectia (intranet / comunicación interna).',
  'Tu objetivo: con el mínimo input, armar un perfil completo y usable (marca, colores, áreas, bienvenida).',
  'Priorizá datos extraídos del sitio oficial (logo, theme-color, descripción) sobre inventar.',
  'Si te pasan logoUrl/primary/secondary detectados, USALOS salvo que sean claramente incorrectos.',
  'Si es empresa conocida o hay sitio web, knownCompany=true.',
  'Respondé SOLO JSON válido (sin markdown) con este esquema:',
  JSON.stringify({
    knownCompany: true,
    industry: 'string corto',
    description: '1-2 oraciones sobre la empresa',
    primary: '#RRGGBB',
    secondary: '#RRGGBB',
    logoUrl: 'url https o vacío',
    loginBgUrl: 'url https de imagen de ambiente o vacío',
    splashSubtitle: 'subtítulo corto splash',
    timezone: 'IANA timezone',
    areas: [{ key: 'rrhh', nombre: 'RRHH', descripcion: '...', orden: 10 }],
    groups: [{ key: 'liderazgo', nombre: 'Liderazgo', descripcion: '...', orden: 10 }],
    welcomeTitle: 'título muro bienvenida',
    welcomeBody: 'cuerpo muro (puede tener \\n)',
  }),
  'Áreas: 4-7 típicas del sector. Grupos: 2-4.',
  'Colores: hex reales. Si hay theme-color/detectados, respetalos.',
  'Timezone: AR → America/Argentina/Buenos_Aires; ES → Europe/Madrid; default AR.',
].join('\n')

async function discoverOfficialWebsite(brand) {
  try {
    const results = await searchWebNews(`${brand} sitio oficial`, { limit: 5 })
    const items = Array.isArray(results?.items) ? results.items : []
    for (const r of items) {
      const url = sanitizeWebsiteUrl(r?.url || '')
      if (!url) continue
      const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      if (/wikipedia|linkedin|facebook|instagram|twitter|youtube|mercadolibre|amazon|glassdoor|indeed/i.test(host)) {
        continue
      }
      return url
    }
  } catch (e) {
    console.warn('[company-research] discover site:', e.message)
  }
  return ''
}

/**
 * @param {{
 *   empCodigo: string,
 *   nombre: string,
 *   websiteUrl?: string,
 *   industryHint?: string,
 *   country?: string,
 *   notes?: string,
 *   logoUrl?: string,
 *   timeoutMs?: number,
 * }} opts
 */
export async function researchCompanyForTenant(opts = {}) {
  const { empCodigo, nombre, timeoutMs = 32000 } = opts
  const hints = normalizeOnboardingContext(opts)
  const code = String(empCodigo || '').toUpperCase().trim()
  const brand = String(nombre || code).trim()
  const base = heuristicCompanyProfile(code, brand)

  const run = async () => {
    let websiteUrl = hints.websiteUrl
    if (!websiteUrl) {
      websiteUrl = await discoverOfficialWebsite(brand)
      if (websiteUrl) hints.websiteUrl = websiteUrl
    }

    let sitePage = null
    let siteHints = null
    if (websiteUrl) {
      try {
        sitePage = await fetchArticleContent(websiteUrl)
        siteHints = sitePage?.siteHints || null
        if (!sitePage?.ok) {
          console.warn('[company-research] sitio web:', sitePage?.error || 'sin texto')
        }
      } catch (e) {
        console.warn('[company-research] sitio web:', e.message)
      }
    }

    let sources = []
    try {
      const queryParts = [brand, 'empresa']
      if (hints.industryHint) queryParts.push(hints.industryHint)
      if (hints.country) queryParts.push(hints.country)
      const results = await searchWebNews(queryParts.join(' '), { limit: 5 })
      const items = Array.isArray(results?.items) ? results.items : []
      sources = items
        .filter((r) => r?.title && r?.url)
        .slice(0, 5)
        .map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet || '',
          source: r.source || '',
        }))
    } catch (e) {
      console.warn('[company-research] web search:', e.message)
    }

    if (websiteUrl) {
      sources = [
        {
          title: sitePage?.title || `Sitio oficial ${brand}`,
          url: websiteUrl,
          snippet: (sitePage?.text || siteHints?.description || '').slice(0, 280),
          source: 'sitio',
        },
        ...sources.filter((s) => s.url !== websiteUrl),
      ].slice(0, 6)
    }

    const detectedLogo =
      hints.logoUrlHint || siteHints?.logoUrl || siteHints?.logoCandidates?.[0] || ''
    const detectedPrimary = siteHints?.primary || ''
    const detectedSecondary = siteHints?.secondary || ''
    const detectedDesc = siteHints?.description || ''

    if (!aiConfigured()) {
      return normalizeCompanyProfile(
        {
          ...base,
          sources,
          knownCompany: Boolean(websiteUrl || hints.notes),
          industry: hints.industryHint || base.industry,
          description: hints.notes || detectedDesc || base.description,
          logoUrl: detectedLogo || base.logoUrl,
          primary: detectedPrimary || base.primary,
          secondary: detectedSecondary || base.secondary,
          loginBgUrl: siteHints?.loginBgUrl || base.loginBgUrl,
        },
        { empCodigo: code, nombre: brand },
      )
    }

    const operatorBlock = [
      websiteUrl ? `Sitio web oficial: ${websiteUrl}` : null,
      hints.industryHint ? `Rubro hint: ${hints.industryHint}` : null,
      hints.country ? `País: ${hints.country}` : null,
      hints.notes ? `Notas del operador:\n${hints.notes}` : null,
      siteHints
        ? `Detectado automáticamente del sitio:\n${JSON.stringify(
            {
              logoUrl: detectedLogo,
              logoCandidates: siteHints.logoCandidates,
              primary: detectedPrimary,
              secondary: detectedSecondary,
              themeColor: siteHints.themeColor,
              description: detectedDesc,
              title: siteHints.title,
              loginBgUrl: siteHints.loginBgUrl,
            },
            null,
            2,
          )}`
        : null,
      sitePage?.ok
        ? `Texto del sitio:\n${String(sitePage.text || '').slice(0, 4000)}`
        : websiteUrl
          ? `No se pudo leer bien el HTML de ${websiteUrl}; igual usá la URL y lo detectado.`
          : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    const userContent = [
      `Código tenant: ${code}`,
      `Nombre comercial: ${brand}`,
      operatorBlock || 'Sin sitio web; inferí solo si es marca muy conocida.',
      sources.length ? `Resultados web:\n${JSON.stringify(sources, null, 2)}` : '',
      'Preferí logoUrl y colores detectados del sitio. Completá áreas/grupos y bienvenida.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const raw = await chatRaw(SYSTEM, userContent)
    const parsed = parseJson(raw)
    return normalizeCompanyProfile(
      {
        ...parsed,
        sources,
        brandName: brand,
        knownCompany: parsed.knownCompany !== false && Boolean(websiteUrl || parsed.knownCompany),
        logoUrl: parsed.logoUrl || detectedLogo || '',
        primary: parsed.primary || detectedPrimary || base.primary,
        secondary: parsed.secondary || detectedSecondary || base.secondary,
        loginBgUrl: parsed.loginBgUrl || siteHints?.loginBgUrl || base.loginBgUrl,
        description: parsed.description || detectedDesc || base.description,
        industry: parsed.industry || hints.industryHint || base.industry,
      },
      { empCodigo: code, nombre: brand },
    )
  }

  try {
    const profile = await Promise.race([
      run(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout research')), timeoutMs)
      }),
    ])
    return { profile, usedAi: aiConfigured(), context: hints, error: null }
  } catch (e) {
    console.warn('[company-research] fallback heurístico:', e.message)
    return {
      profile: normalizeCompanyProfile(
        {
          ...base,
          industry: hints.industryHint || base.industry,
          description: hints.notes || base.description,
          logoUrl: hints.logoUrlHint || base.logoUrl,
        },
        { empCodigo: code, nombre: brand },
      ),
      usedAi: false,
      context: hints,
      error: e.message,
    }
  }
}

export { heuristicCompanyProfile, normalizeCompanyProfile, normalizeOnboardingContext }
