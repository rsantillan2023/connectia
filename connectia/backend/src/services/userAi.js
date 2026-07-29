/**
 * IA opcional para completar el formulario de alta/edición de usuario.
 * Heurística siempre disponible; LLM si hay OPENAI_API_KEY / ANTHROPIC_API_KEY.
 */

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function userAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 700,
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

async function callAnthropic(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

function slugUser(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40)
}

function matchOrg(list, prompt) {
  const p = String(prompt || '').toLowerCase()
  for (const item of list || []) {
    const nombre = String(item.nombre || '').toLowerCase()
    const key = String(item.key || '').toLowerCase()
    if (nombre && p.includes(nombre)) return String(item.id)
    if (key && p.includes(key)) return String(item.id)
  }
  return ''
}

function matchGroups(list, prompt) {
  const p = String(prompt || '').toLowerCase()
  const ids = []
  for (const item of list || []) {
    const nombre = String(item.nombre || '').toLowerCase()
    const key = String(item.key || '').toLowerCase()
    if ((nombre && p.includes(nombre)) || (key && p.includes(key))) ids.push(String(item.id))
  }
  return ids
}

/** Borrador heurístico (sin LLM). */
export function heuristicUserDraft(prompt, { areas = [], groups = [] } = {}) {
  const text = String(prompt || '').trim()
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/i)
  const email = emailMatch ? emailMatch[0].toLowerCase() : ''

  const dniMatch = text.match(/\b(?:dni[:\s]*)?(\d{7,8})\b/i)
  const cuilMatch = text.match(/\b(?:cuil[:\s]*)?(\d{2}-?\d{8}-?\d)\b/i)
  const legajoMatch = text.match(/\b(?:legajo|id)[:\s#]*([A-Za-z0-9_-]{2,20})\b/i)

  let nombre = ''
  let apellido = ''
  const nameMatch =
    text.match(/(?:se llama|llamad[oa]|nombre[:\s]+)([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/i) ||
    text.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b/)
  if (nameMatch) {
    nombre = nameMatch[1]
    apellido = nameMatch[2]
  }

  let usuario = ''
  if (email) usuario = slugUser(email.split('@')[0])
  else if (nombre || apellido) usuario = slugUser([nombre, apellido].filter(Boolean).join('.'))

  const wantsAdmin = /\b(admin|administrador|gestor completo)\b/i.test(text)
  const areaId = matchOrg(areas, text)
  const groupIds = matchGroups(groups, text)

  const caps = []
  if (/\b(publicacion|publicaciones|muro)\b/i.test(text)) caps.push('admin.publicaciones')
  if (/\b(solicitud|solicitudes|bandeja)\b/i.test(text)) caps.push('admin.solicitudes')
  if (/\b(encuesta|encuestas)\b/i.test(text)) caps.push('admin.encuestas')
  if (/\b(documento|documentos)\b/i.test(text)) caps.push('admin.docs')
  if (/\b(usuario|usuarios|rrhh)\b/i.test(text) && !wantsAdmin) caps.push('admin.usuarios')

  const notes = []
  if (!usuario) notes.push('No detecté usuario/login: completá a mano.')
  if (!nombre && !apellido) notes.push('No detecté nombre y apellido claros.')
  if (!email) notes.push('Sin email en el texto.')
  notes.push('La contraseña no la inventa la IA: definila vos al guardar.')

  return {
    usuario,
    nombre,
    apellido,
    email,
    idExterno: legajoMatch ? legajoMatch[1] : '',
    dni: dniMatch ? dniMatch[1] : '',
    cuil: cuilMatch ? cuilMatch[1].replace(/-/g, '') : '',
    roleMember: true,
    roleAdmin: wantsAdmin,
    capabilities: wantsAdmin ? [] : caps,
    areaId,
    groupIds,
    activo: !/\b(inactiv[oa]|deshabilitad[oa]|baja)\b/i.test(text),
    password: '',
    notes: notes.join(' '),
    source: 'heuristic',
  }
}

function normalizeDraft(raw, ctx) {
  const base = heuristicUserDraft('', ctx)
  const d = raw && typeof raw === 'object' ? raw : {}
  const out = {
    ...base,
    usuario: slugUser(d.usuario || base.usuario),
    nombre: String(d.nombre || '').trim().slice(0, 80),
    apellido: String(d.apellido || '').trim().slice(0, 80),
    email: String(d.email || '').trim().toLowerCase().slice(0, 160),
    idExterno: String(d.idExterno || '').trim().slice(0, 64),
    dni: String(d.dni || '').replace(/\D/g, '').slice(0, 32),
    cuil: String(d.cuil || '').replace(/\D/g, '').slice(0, 32),
    roleMember: d.roleMember !== false,
    roleAdmin: Boolean(d.roleAdmin),
    capabilities: Array.isArray(d.capabilities)
      ? d.capabilities.map(String).filter((c) => c.startsWith('admin.'))
      : [],
    areaId: d.areaId ? String(d.areaId) : '',
    groupIds: Array.isArray(d.groupIds) ? d.groupIds.map(String) : [],
    activo: d.activo !== false,
    password: '',
    notes: String(d.notes || base.notes || '').slice(0, 400),
    source: d.source || 'llm',
  }
  if (out.roleAdmin) out.capabilities = []
  // Validar area/group contra catálogo
  const areaIds = new Set((ctx.areas || []).map((a) => String(a.id)))
  const groupIds = new Set((ctx.groups || []).map((g) => String(g.id)))
  if (out.areaId && !areaIds.has(out.areaId)) out.areaId = ''
  out.groupIds = out.groupIds.filter((id) => groupIds.has(id))
  return out
}

/**
 * @param {{ prompt: string, areas?: array, groups?: array, capabilityIds?: string[] }} opts
 */
export async function draftUserFromPrompt(opts = {}) {
  const prompt = String(opts.prompt || '').trim()
  if (prompt.length < 8) {
    const err = new Error('Escribí al menos unas palabras sobre la persona')
    err.status = 400
    throw err
  }

  const areas = (opts.areas || []).map((a) => ({
    id: String(a.id || a._id),
    key: a.key || '',
    nombre: a.nombre || '',
  }))
  const groups = (opts.groups || []).map((g) => ({
    id: String(g.id || g._id),
    key: g.key || '',
    nombre: g.nombre || '',
  }))
  const ctx = { areas, groups }
  const heuristic = heuristicUserDraft(prompt, ctx)

  if (!userAiConfigured()) {
    return { ...heuristic, configured: false }
  }

  const system = `Sos un asistente que completa formularios de alta de usuarios para un admin de intranet.
Respondé SOLO JSON válido con: usuario, nombre, apellido, email, idExterno, dni, cuil, roleMember (bool), roleAdmin (bool), capabilities (array de ids), areaId (string id o ""), groupIds (array ids), activo (bool), notes (string breve).
No inventes contraseña. usuario en minúsculas sin espacios. capabilities solo de esta lista si no es roleAdmin: ${(opts.capabilityIds || []).join(', ') || 'admin.publicaciones, admin.solicitudes, admin.usuarios, admin.encuestas, admin.docs'}.
Áreas disponibles: ${JSON.stringify(areas.map((a) => ({ id: a.id, nombre: a.nombre })))}.
Grupos disponibles: ${JSON.stringify(groups.map((g) => ({ id: g.id, nombre: g.nombre })))}.
Si falta un dato, dejá string vacío.`

  try {
    let raw
    if (openaiKey()) {
      try {
        raw = await callOpenAi(system, prompt)
      } catch (e) {
        if (!anthropicKey()) throw e
        raw = await callAnthropic(system, prompt)
      }
    } else {
      raw = await callAnthropic(system, prompt)
    }
    const parsed = parseJson(raw)
    return { ...normalizeDraft({ ...parsed, source: 'llm' }, ctx), configured: true }
  } catch {
    return {
      ...heuristic,
      configured: true,
      notes: `${heuristic.notes} (IA no disponible; usé heurística).`,
      source: 'heuristic_fallback',
    }
  }
}
