/**
 * Mejora copy de push y arma borradores desde un prompt (humano confirma).
 */
function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function pushAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user, { temperature = 0.5, maxTokens = 800 } = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature,
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

async function callAnthropic(system, user, { maxTokens = 800 } = {}) {
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

async function generateRaw(system, user, opts) {
  if (!pushAiConfigured()) {
    const err = new Error('IA no configurada')
    err.status = 503
    throw err
  }
  if (openaiKey()) {
    try {
      return await callOpenAi(system, user, opts)
    } catch (e) {
      if (!anthropicKey()) throw e
      return callAnthropic(system, user, opts)
    }
  }
  return callAnthropic(system, user, opts)
}

/**
 * @returns {{ title: string, body: string, notes?: string }}
 */
export async function improvePushCopy({ title, body, href, brandName }) {
  const system = [
    'Sos copywriter de notificaciones push corporativas (Connectia).',
    `Marca: ${brandName || 'Connectia'}. Español rioplatense, claro y breve.`,
    'Respondé SOLO JSON: {"title":"...","body":"...","notes":"opcional"}',
    'title máx 80 chars; body máx 140 chars; CTA implícito; no inventes beneficios.',
  ].join(' ')

  const raw = await generateRaw(
    system,
    JSON.stringify({ title: title || '', body: body || '', href: href || '/' }),
    { temperature: 0.5, maxTokens: 400 },
  )
  const data = parseJson(raw)
  return {
    title: String(data.title || title || '').trim().slice(0, 120),
    body: String(data.body || body || '').trim().slice(0, 500),
    notes: String(data.notes || '').trim().slice(0, 300),
  }
}

const HREF_HINTS = ['/muro', '/avisos', '/encuestas', '/docs', '/accesos', '/perfil', '/solicitudes', '/guardados']

/**
 * Arma un borrador completo de campaña a partir de un prompt en lenguaje natural.
 * El admin siempre revisa antes de enviar.
 */
export async function draftPushFromPrompt({ prompt, brandName, areas = [], groups = [] }) {
  const brief = String(prompt || '').trim()
  if (brief.length < 8) {
    const err = new Error('Escribí un prompt más descriptivo (mín. 8 caracteres)')
    err.status = 400
    throw err
  }

  const areaList = (areas || []).map((a) => ({ key: a.key, nombre: a.nombre })).filter((a) => a.key)
  const groupList = (groups || []).map((g) => ({ key: g.key, nombre: g.nombre })).filter((g) => g.key)

  const system = [
    'Sos productor de campañas de notificación para Connectia (app de comunidad laboral).',
    `Marca/tenant: ${brandName || 'Connectia'}. Español rioplatense.`,
    'El humano confirmará antes de enviar: proponé un borrador completo, no envíes.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      name: 'nombre interno corto',
      title: 'título push ≤80',
      body: 'cuerpo ≤140',
      href: '/ruta-app',
      audienceMode: 'all|restricted',
      areaKeys: ['solo keys de la lista si restricted'],
      groupKeys: ['solo keys de la lista si restricted'],
      segment: 'audience|inactive',
      inactiveDays: 30,
      sendType: 'now|scheduled',
      scheduleHint: 'si scheduled: texto ej. mañana 10:00',
      channels: { inApp: true, push: true },
      notes: 'qué asumir / qué revisar',
    }),
    `Rutas válidas preferidas: ${HREF_HINTS.join(', ')}.`,
    `Áreas disponibles: ${JSON.stringify(areaList)}.`,
    `Grupos disponibles: ${JSON.stringify(groupList)}.`,
    'Si el brief habla de inactivos/reenganche → segment=inactive.',
    'Si menciona un área/grupo concreto y está en la lista → audienceMode=restricted + keys.',
    'No inventes montos, fechas legales ni beneficios que el brief no diga.',
  ].join('\n')

  const raw = await generateRaw(system, brief, { temperature: 0.55, maxTokens: 900 })
  const data = parseJson(raw)

  const audienceMode = data.audienceMode === 'restricted' ? 'restricted' : 'all'
  const knownAreas = new Set(areaList.map((a) => a.key))
  const knownGroups = new Set(groupList.map((g) => g.key))
  const areaKeys = (Array.isArray(data.areaKeys) ? data.areaKeys : [])
    .map(String)
    .filter((k) => knownAreas.has(k))
  const groupKeys = (Array.isArray(data.groupKeys) ? data.groupKeys : [])
    .map(String)
    .filter((k) => knownGroups.has(k))

  let href = String(data.href || '/muro').trim().slice(0, 300) || '/muro'
  if (!href.startsWith('/') && !href.startsWith('http')) href = `/${href}`

  const sendType = data.sendType === 'scheduled' ? 'scheduled' : 'now'
  const segment = data.segment === 'inactive' ? 'inactive' : 'audience'

  return {
    name: String(data.name || data.title || 'Campaña IA').trim().slice(0, 120),
    title: String(data.title || '').trim().slice(0, 120),
    body: String(data.body || '').trim().slice(0, 500),
    href,
    audienceMode: audienceMode === 'restricted' && (areaKeys.length || groupKeys.length) ? 'restricted' : 'all',
    areaKeys,
    groupKeys,
    segment,
    inactiveDays: Math.min(365, Math.max(1, Number(data.inactiveDays) || 30)),
    sendType,
    scheduleHint: String(data.scheduleHint || '').trim().slice(0, 120),
    channels: {
      inApp: data.channels?.inApp !== false,
      push: data.channels?.push !== false,
    },
    notes: String(data.notes || '').trim().slice(0, 400),
  }
}
