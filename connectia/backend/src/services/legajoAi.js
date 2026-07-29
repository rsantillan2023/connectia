/**
 * IA opcional para completar el formulario de legajo RRHH.
 * Fuentes: prompt libre, datos de un User, texto extraído de PDF.
 * Heurística siempre; LLM si hay OPENAI_API_KEY / ANTHROPIC_API_KEY.
 */

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function legajoAiConfigured() {
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
      max_tokens: 1800,
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
      max_tokens: 1800,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

function str(v, max = 200) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

function dateOnly(v) {
  if (!v) return ''
  const s = String(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

const ESTADOS = new Set(['pre_ingreso', 'activo', 'licencia', 'baja'])

function emptyDraft() {
  return {
    numeroLegajo: '',
    estadoLaboral: 'activo',
    userId: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    dni: '',
    cuil: '',
    cargo: '',
    clasificacion: '',
    genero: '',
    nacionalidad: '',
    estadoCivil: '',
    fechaNacimiento: '',
    fechaIngreso: '',
    areaId: '',
    notasInternas: '',
    domicilios: [],
    familiares: [],
    obraSocial: { nombre: '', numeroAfiliado: '', plan: '' },
    datosBancarios: [],
    fichaMedica: {
      grupoSanguineo: '',
      alergias: '',
      observaciones: '',
      contactoEmergenciaNombre: '',
      contactoEmergenciaTel: '',
    },
    contratos: [],
    carrera: { capacitaciones: [], skills: [] },
    notes: '',
    source: 'heuristic',
  }
}

/** Borrador desde texto (prompt + PDF) + opcional seed de usuario. */
export function heuristicLegajoDraft(text, { userSeed = null, areas = [] } = {}) {
  const t = String(text || '').trim()
  const out = emptyDraft()

  if (userSeed) {
    out.userId = userSeed.id ? String(userSeed.id) : ''
    out.nombre = str(userSeed.nombre, 120)
    out.apellido = str(userSeed.apellido, 120)
    out.email = str(userSeed.email, 200)
    out.telefono = str(userSeed.telefono, 40)
    out.dni = str(userSeed.dni, 32)
    out.cuil = str(userSeed.cuil, 32)
    out.cargo = str(userSeed.cargo, 120)
    out.areaId = userSeed.areaId ? String(userSeed.areaId) : ''
    out.numeroLegajo = str(userSeed.idExterno || userSeed.numeroLegajo, 64)
    out.fechaNacimiento = dateOnly(userSeed.fechaNacimiento)
    out.fechaIngreso = dateOnly(userSeed.fechaIngreso)
  }

  const emailMatch = t.match(/[\w.+-]+@[\w.-]+\.\w{2,}/i)
  if (emailMatch && !out.email) out.email = emailMatch[0].toLowerCase()

  const telMatch = t.match(/(?:tel[eé]fono|cel(?:ular)?|whatsapp)[:\s]*([+\d\s()-]{8,20})/i)
  if (telMatch && !out.telefono) out.telefono = telMatch[1].replace(/\s+/g, ' ').trim()

  const dniMatch = t.match(/\b(?:dni[:\s]*)?(\d{7,8})\b/i)
  if (dniMatch && !out.dni) out.dni = dniMatch[1]

  const cuilMatch = t.match(/\b(?:cuil|cuit)[:\s]*(\d{2}-?\d{8}-?\d)\b/i)
  if (cuilMatch && !out.cuil) out.cuil = cuilMatch[1].replace(/-/g, '')

  const legajoMatch = t.match(/\b(?:legajo|n[°º]?\s*legajo|id\s*empleado)[:\s#]*([A-Za-z0-9_./-]{2,20})\b/i)
  if (legajoMatch && !out.numeroLegajo) out.numeroLegajo = legajoMatch[1]

  const cargoMatch = t.match(/(?:cargo|puesto|posici[oó]n)[:\s]+([^\n,]{3,80})/i)
  if (cargoMatch && !out.cargo) out.cargo = str(cargoMatch[1], 120)

  const nameMatch =
    t.match(/(?:apellido\s*y\s*nombre|nombre\s*completo)[:\s]+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/i) ||
    t.match(/(?:se llama|nombre[:\s]+)([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/i) ||
    t.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b/)
  if (nameMatch) {
    if (!out.nombre) out.nombre = nameMatch[1]
    if (!out.apellido) out.apellido = nameMatch[2]
  }

  const birthMatch = t.match(/(?:nacimiento|fecha\s*nac)[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
  if (birthMatch && !out.fechaNacimiento) out.fechaNacimiento = normalizeLooseDate(birthMatch[1])

  const ingresoMatch = t.match(/(?:ingreso|fecha\s*de\s*ingreso|alta)[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
  if (ingresoMatch && !out.fechaIngreso) out.fechaIngreso = normalizeLooseDate(ingresoMatch[1])

  const osMatch = t.match(/(?:obra\s*social|os)[:\s]+([^\n,]{3,80})/i)
  if (osMatch) out.obraSocial.nombre = str(osMatch[1], 160)

  const cbuMatch = t.match(/\b(\d{22})\b/)
  const bancoMatch = t.match(/(?:banco)[:\s]+([^\n,]{3,80})/i)
  if (cbuMatch || bancoMatch) {
    out.datosBancarios = [
      {
        banco: bancoMatch ? str(bancoMatch[1], 120) : '',
        cbu: cbuMatch ? cbuMatch[1] : '',
        alias: '',
        titular: [out.nombre, out.apellido].filter(Boolean).join(' '),
        principal: true,
      },
    ]
  }

  const calleMatch = t.match(/(?:domicilio|direcci[oó]n|calle)[:\s]+([^\n]{5,120})/i)
  if (calleMatch) {
    out.domicilios = [
      {
        tipo: 'particular',
        calle: str(calleMatch[1], 200),
        numero: '',
        localidad: '',
        provincia: '',
        cp: '',
        principal: true,
      },
    ]
  }

  if (/\b(pre[\s-]?ingreso|a\s*incorporar)\b/i.test(t)) out.estadoLaboral = 'pre_ingreso'
  else if (/\b(licencia)\b/i.test(t)) out.estadoLaboral = 'licencia'
  else if (/\b(baja|egreso|desvinculad)\b/i.test(t)) out.estadoLaboral = 'baja'

  const p = t.toLowerCase()
  for (const a of areas || []) {
    const nombre = String(a.nombre || '').toLowerCase()
    const key = String(a.key || '').toLowerCase()
    if ((nombre && p.includes(nombre)) || (key && p.includes(key))) {
      out.areaId = String(a.id)
      break
    }
  }

  const notes = []
  if (!out.numeroLegajo) notes.push('Falta n° de legajo.')
  if (!out.nombre && !out.apellido) notes.push('No detecté nombre y apellido claros.')
  if (userSeed) notes.push('Se partió de un miembro de la comunidad; revisá y completá el resto.')
  if (t.length > 40) notes.push('Revisá domicilios, familiares y datos sensibles antes de guardar.')
  out.notes = notes.join(' ')
  out.source = 'heuristic'
  return out
}

function normalizeLooseDate(raw) {
  const s = String(raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!m) return ''
  let y = m[3]
  if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`
  const d = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  // Prefer DD/MM/YYYY (AR)
  return `${y}-${mo}-${d}`
}

function normalizeDraft(raw, ctx) {
  const base = heuristicLegajoDraft('', ctx)
  const d = raw && typeof raw === 'object' ? raw : {}
  const out = {
    ...base,
    numeroLegajo: str(d.numeroLegajo ?? base.numeroLegajo, 64),
    estadoLaboral: ESTADOS.has(String(d.estadoLaboral || '')) ? d.estadoLaboral : base.estadoLaboral || 'activo',
    userId: d.userId != null ? String(d.userId) : base.userId,
    nombre: str(d.nombre ?? base.nombre, 120),
    apellido: str(d.apellido ?? base.apellido, 120),
    email: str(d.email ?? base.email, 200).toLowerCase(),
    telefono: str(d.telefono ?? base.telefono, 40),
    dni: str(d.dni ?? base.dni, 32).replace(/\D/g, ''),
    cuil: str(d.cuil ?? base.cuil, 32).replace(/\D/g, ''),
    cargo: str(d.cargo ?? base.cargo, 120),
    clasificacion: str(d.clasificacion ?? base.clasificacion, 80),
    genero: str(d.genero ?? base.genero, 40),
    nacionalidad: str(d.nacionalidad ?? base.nacionalidad, 80),
    estadoCivil: str(d.estadoCivil ?? base.estadoCivil, 40),
    fechaNacimiento: dateOnly(d.fechaNacimiento) || base.fechaNacimiento,
    fechaIngreso: dateOnly(d.fechaIngreso) || base.fechaIngreso,
    areaId: d.areaId ? String(d.areaId) : base.areaId,
    notasInternas: str(d.notasInternas ?? base.notasInternas, 2000),
    obraSocial: {
      nombre: str(d.obraSocial?.nombre ?? base.obraSocial.nombre, 160),
      numeroAfiliado: str(d.obraSocial?.numeroAfiliado ?? base.obraSocial.numeroAfiliado, 80),
      plan: str(d.obraSocial?.plan ?? base.obraSocial.plan, 80),
    },
    fichaMedica: {
      grupoSanguineo: str(d.fichaMedica?.grupoSanguineo ?? base.fichaMedica.grupoSanguineo, 16),
      alergias: str(d.fichaMedica?.alergias ?? base.fichaMedica.alergias, 500),
      observaciones: str(d.fichaMedica?.observaciones ?? base.fichaMedica.observaciones, 1000),
      contactoEmergenciaNombre: str(
        d.fichaMedica?.contactoEmergenciaNombre ?? base.fichaMedica.contactoEmergenciaNombre,
        160,
      ),
      contactoEmergenciaTel: str(
        d.fichaMedica?.contactoEmergenciaTel ?? base.fichaMedica.contactoEmergenciaTel,
        40,
      ),
    },
    domicilios: Array.isArray(d.domicilios)
      ? d.domicilios.slice(0, 8).map((x) => ({
          tipo: str(x.tipo || 'particular', 40),
          calle: str(x.calle, 200),
          numero: str(x.numero, 40),
          localidad: str(x.localidad, 120),
          provincia: str(x.provincia, 120),
          cp: str(x.cp, 20),
          principal: Boolean(x.principal),
        }))
      : base.domicilios,
    familiares: Array.isArray(d.familiares)
      ? d.familiares.slice(0, 12).map((x) => ({
          parentesco: str(x.parentesco, 60),
          nombre: str(x.nombre, 120),
          apellido: str(x.apellido, 120),
          dni: str(x.dni, 32),
        }))
      : base.familiares,
    datosBancarios: Array.isArray(d.datosBancarios)
      ? d.datosBancarios.slice(0, 4).map((x) => ({
          banco: str(x.banco, 120),
          cbu: str(x.cbu, 32),
          alias: str(x.alias, 80),
          titular: str(x.titular, 160),
          principal: x.principal !== false,
        }))
      : base.datosBancarios,
    contratos: Array.isArray(d.contratos)
      ? d.contratos.slice(0, 6).map((x) => ({
          tipo: str(x.tipo, 80),
          numero: str(x.numero, 80),
          fechaInicio: dateOnly(x.fechaInicio),
          fechaFin: dateOnly(x.fechaFin),
          modalidad: str(x.modalidad, 80),
        }))
      : base.contratos,
    carrera: {
      capacitaciones: Array.isArray(d.carrera?.capacitaciones)
        ? d.carrera.capacitaciones.slice(0, 12).map((x) => ({
            nombre: str(x.nombre, 200),
            institucion: str(x.institucion, 160),
          }))
        : base.carrera.capacitaciones,
      skills: Array.isArray(d.carrera?.skills)
        ? d.carrera.skills.slice(0, 20).map((x) => ({
            nombre: str(x.nombre, 120),
            nivel: str(x.nivel, 40),
          }))
        : base.carrera.skills,
    },
    notes: str(d.notes ?? base.notes, 500),
    source: d.source || 'llm',
  }

  const areaIds = new Set((ctx.areas || []).map((a) => String(a.id)))
  if (out.areaId && !areaIds.has(out.areaId)) out.areaId = ''
  return out
}

/**
 * Extrae texto de un buffer PDF (pdf-parse v2).
 */
export async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return ''
  let parser = null
  try {
    const { PDFParse } = await import('pdf-parse')
    parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return String(result?.text || '')
      .replace(/\s+\n/g, '\n')
      .trim()
      .slice(0, 40000)
  } catch (e) {
    console.warn('[legajoAi] pdf-parse', e.message)
    return ''
  } finally {
    try {
      if (parser?.destroy) await parser.destroy()
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ prompt?: string, pdfText?: string, userSeed?: object, areas?: array }} opts
 */
export async function draftLegajoFromInput(opts = {}) {
  const prompt = String(opts.prompt || '').trim()
  const pdfText = String(opts.pdfText || '').trim()
  const userSeed = opts.userSeed || null
  const combined = [prompt, pdfText ? `--- TEXTO DEL PDF ---\n${pdfText}` : '']
    .filter(Boolean)
    .join('\n\n')
    .trim()

  if (!userSeed && combined.length < 8) {
    const err = new Error('Escribí un prompt, elegí un miembro o subí un PDF con datos')
    err.status = 400
    throw err
  }

  const areas = (opts.areas || []).map((a) => ({
    id: String(a.id || a._id),
    key: a.key || '',
    nombre: a.nombre || '',
  }))
  const ctx = { areas, userSeed }
  const heuristic = heuristicLegajoDraft(combined || `${userSeed?.nombre || ''} ${userSeed?.apellido || ''}`, ctx)

  if (!legajoAiConfigured() || combined.length < 12) {
    return {
      ...heuristic,
      configured: legajoAiConfigured(),
      notes:
        combined.length < 12 && userSeed
          ? `${heuristic.notes} (Solo datos del miembro; ampliá con prompt o PDF).`
          : heuristic.notes,
    }
  }

  const system = `Sos un asistente de RRHH que completa un legajo digital de empleado para una intranet.
Respondé SOLO JSON válido con estas claves (usá "" o [] si falta dato; no inventes CBU/DNI si no aparecen):
numeroLegajo, estadoLaboral (pre_ingreso|activo|licencia|baja), nombre, apellido, email, telefono, dni, cuil, cargo, clasificacion, genero, nacionalidad, estadoCivil, fechaNacimiento (YYYY-MM-DD), fechaIngreso (YYYY-MM-DD), areaId (id de la lista o ""), notasInternas,
obraSocial: { nombre, numeroAfiliado, plan },
fichaMedica: { grupoSanguineo, alergias, observaciones, contactoEmergenciaNombre, contactoEmergenciaTel },
domicilios: [{ tipo, calle, numero, localidad, provincia, cp, principal }],
familiares: [{ parentesco, nombre, apellido, dni }],
datosBancarios: [{ banco, cbu, alias, titular, principal }],
contratos: [{ tipo, numero, fechaInicio, fechaFin, modalidad }],
carrera: { capacitaciones: [{ nombre, institucion }], skills: [{ nombre, nivel }] },
notes (string breve sobre qué revisó el humano).
Áreas disponibles: ${JSON.stringify(areas.map((a) => ({ id: a.id, nombre: a.nombre })))}.
Priorizá datos explícitos del PDF/prompt sobre conjeturas.`

  const userMsg = [
    userSeed
      ? `Miembro ya elegido (vincular userId=${userSeed.id}): ${JSON.stringify({
          nombre: userSeed.nombre,
          apellido: userSeed.apellido,
          email: userSeed.email,
          telefono: userSeed.telefono,
          dni: userSeed.dni,
          cuil: userSeed.cuil,
          cargo: userSeed.cargo,
          idExterno: userSeed.idExterno,
          areaId: userSeed.areaId,
          fechaNacimiento: userSeed.fechaNacimiento,
          fechaIngreso: userSeed.fechaIngreso,
        })}`
      : 'Sin miembro vinculado aún.',
    combined.slice(0, 35000),
  ].join('\n\n')

  try {
    let raw
    if (openaiKey()) {
      try {
        raw = await callOpenAi(system, userMsg)
      } catch (e) {
        if (!anthropicKey()) throw e
        raw = await callAnthropic(system, userMsg)
      }
    } else {
      raw = await callAnthropic(system, userMsg)
    }
    const parsed = parseJson(raw)
    if (userSeed?.id) parsed.userId = String(userSeed.id)
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
