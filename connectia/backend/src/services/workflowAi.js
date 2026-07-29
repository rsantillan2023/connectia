/**
 * IA para diseñar workflows desde un caso de uso en lenguaje natural (§41).
 * Incluye los 3 ejemplos canónicos como prompts / borradores de respaldo.
 */
function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function workflowAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user, { temperature = 0.4, maxTokens = 1100 } = {}) {
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

async function callAnthropic(system, user, { maxTokens = 1100 } = {}) {
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
  if (!workflowAiConfigured()) {
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

/** Tres casos de uso canónicos (prompts + borrador listo para el diseñador). */
export const WORKFLOW_USE_CASE_EXAMPLES = [
  {
    id: 'vacaciones',
    title: 'Vacaciones',
    subtitle: 'Líder → RRHH si son muchos días',
    emoji: '🌴',
    prompt:
      'Pedido de vacaciones: el colaborador solicita días libres. Primero aprueba el líder directo (gestores de solicitudes) en 48 horas. Si pide más de 10 días, después aprueba RRHH (capability admin.usuarios) en 72 horas. Notificar al solicitante al cerrar.',
    draft: {
      name: 'Vacaciones estándar',
      description: 'Aprobación de vacaciones con escalamiento a RRHH cuando supera 10 días.',
      trigger: { module: 'solicitudes', tipoKey: 'vacaciones', label: 'Vacaciones' },
      steps: [
        {
          orden: 1,
          nombre: 'Aprobación del líder',
          approverType: 'capability',
          approverValue: 'admin.solicitudes',
          slaHoras: 48,
          condition: '',
          userIds: [],
        },
        {
          orden: 2,
          nombre: 'RRHH (si > 10 días)',
          approverType: 'capability',
          approverValue: 'admin.usuarios',
          slaHoras: 72,
          condition: 'Solo si la solicitud supera 10 días',
          userIds: [],
        },
      ],
      notes: 'La condición de 10 días se evalúa sola (campo días o desde/hasta). Si no supera, se omite RRHH.',
    },
  },
  {
    id: 'acceso',
    title: 'Acceso a sistemas',
    subtitle: 'Líder → Seguridad → TI',
    emoji: '🔐',
    prompt:
      'Consulta de acceso a un sistema (VPN o ERP): el colaborador pide acceso. Paso 1: líder del área aprueba (admin.solicitudes) en 48 h; si no, escalar. Paso 2: si el sistema es crítico, Seguridad/Compliance (admin.comunidad). Paso 3: TI otorga el acceso (admin.hub) y cierra. Auditoría de quién autorizó.',
    draft: {
      name: 'Acceso a sistemas',
      description: 'Autorización de accesos IT con paso opcional de seguridad en sistemas críticos.',
      trigger: { module: 'solicitudes', tipoKey: 'acceso', label: 'Acceso a sistemas' },
      steps: [
        {
          orden: 1,
          nombre: 'Aprobación del líder',
          approverType: 'capability',
          approverValue: 'admin.solicitudes',
          slaHoras: 48,
          condition: '',
          userIds: [],
        },
        {
          orden: 2,
          nombre: 'Seguridad (si crítico)',
          approverType: 'capability',
          approverValue: 'admin.comunidad',
          slaHoras: 72,
          condition: 'Solo si el sistema es crítico',
          userIds: [],
        },
        {
          orden: 3,
          nombre: 'TI otorga acceso',
          approverType: 'capability',
          approverValue: 'admin.hub',
          slaHoras: 48,
          condition: '',
          userIds: [],
        },
      ],
      notes: 'El paso de Seguridad se omite solo si el sistema no es crítico (prioridad/campo crítico).',
    },
  },
  {
    id: 'documento',
    title: 'Publicar documento',
    subtitle: 'Legal → Director People',
    emoji: '📄',
    prompt:
      'Publicación de documento corporativo: RRHH sube una política (ej. home office). No debe verse publicada hasta que Legal revise y apruebe (admin.documentos). Si el documento es tipo política, después aprueba el Director de People (admin.usuarios). Al cerrar, publicar y dejar auditoría.',
    draft: {
      name: 'Publicar documento corporativo',
      description: 'Control previo a publicar políticas y documentos sensibles.',
      trigger: { module: 'documentos', tipoKey: '', label: 'Documentos' },
      steps: [
        {
          orden: 1,
          nombre: 'Revisión Legal',
          approverType: 'capability',
          approverValue: 'admin.documentos',
          slaHoras: 72,
          condition: '',
          userIds: [],
        },
        {
          orden: 2,
          nombre: 'Director People (si es política)',
          approverType: 'capability',
          approverValue: 'admin.usuarios',
          slaHoras: 48,
          condition: 'Solo si el documento es una política',
          userIds: [],
        },
      ],
      notes: 'Al aprobar el último paso aplicable, el documento draft pasa a published. El paso People se omite si la categoría no es política.',
    },
  },
]

/** Línea legible de quién aprueba (para cards de ejemplo). */
const WHO_SHORT = {
  'admin.solicitudes': 'Líder o gestor de pedidos',
  'admin.usuarios': 'RRHH / People',
  'admin.documentos': 'Legal / Documentos',
  'admin.comunidad': 'Seguridad / Compliance',
  'admin.hub': 'TI / Accesos',
  'admin.publicaciones': 'Quien gestiona el muro',
  'admin.encuestas': 'Quien gestiona encuestas',
  'admin.notificaciones': 'Quien envía avisos',
  'admin.organizacion': 'Quien gestiona áreas',
  'admin.workflows': 'Quien administra flujos',
}

export function rolesLineForExample(ex) {
  const steps = ex?.draft?.steps || []
  if (!steps.length) return ''
  return steps
    .map((s) => {
      const name = String(s.nombre || 'Paso').trim()
      const who = WHO_SHORT[s.approverValue] || 'un gestor'
      return `${name}: ${who}`
    })
    .join(' · ')
}

function normalizeDraft(data, fallbackName = 'Workflow IA') {
  const stepsRaw = Array.isArray(data?.steps) ? data.steps : []
  const steps = stepsRaw.map((s, i) => ({
    orden: i + 1,
    nombre: String(s?.nombre || `Paso ${i + 1}`).trim().slice(0, 120),
    approverType: ['capability', 'role', 'area', 'users'].includes(s?.approverType)
      ? s.approverType
      : 'capability',
    approverValue: String(s?.approverValue || 'admin.solicitudes').trim().slice(0, 120),
    slaHoras: Math.min(720, Math.max(1, Number(s?.slaHoras) || 48)),
    condition: String(s?.condition || '').trim().slice(0, 240),
    userIds: [],
  }))
  const module = ['solicitudes', 'documentos', 'generico'].includes(data?.trigger?.module)
    ? data.trigger.module
    : 'solicitudes'
  return {
    name: String(data?.name || fallbackName).trim().slice(0, 120),
    description: String(data?.description || '').trim().slice(0, 800),
    trigger: {
      module,
      tipoKey: String(data?.trigger?.tipoKey || '').trim().slice(0, 80),
      label: String(data?.trigger?.label || '').trim().slice(0, 120),
    },
    steps: steps.length
      ? steps
      : [
          {
            orden: 1,
            nombre: 'Aprobación',
            approverType: 'capability',
            approverValue: 'admin.solicitudes',
            slaHoras: 48,
            condition: '',
            userIds: [],
          },
        ],
    notes: String(data?.notes || '').trim().slice(0, 400),
    source: data?.source || 'ai',
  }
}

/** Si el prompt coincide con un ejemplo, devolver su borrador (sin IA). */
export function matchExampleDraft(prompt) {
  const p = String(prompt || '').trim().toLowerCase()
  if (p.length < 8) return null
  for (const ex of WORKFLOW_USE_CASE_EXAMPLES) {
    if (p === ex.prompt.toLowerCase()) {
      return normalizeDraft({ ...ex.draft, notes: ex.draft.notes, source: 'example' }, ex.draft.name)
    }
    const keywords = {
      vacaciones: ['vacaciones', 'días libres', '10 días'],
      acceso: ['acceso', 'vpn', 'erp', 'sistema'],
      documento: ['documento', 'política', 'home office', 'legal'],
    }[ex.id]
    if (keywords && keywords.filter((k) => p.includes(k)).length >= 2) {
      return normalizeDraft({ ...ex.draft, notes: ex.draft.notes, source: 'example' }, ex.draft.name)
    }
  }
  return null
}

/**
 * Borrador desde prompt. Usa IA si está configurada; si no, ejemplos canónicos.
 */
export async function draftWorkflowFromPrompt({ prompt, brandName, capabilities = [] }) {
  const brief = String(prompt || '').trim()
  if (brief.length < 8) {
    const err = new Error('Describí el caso de uso con un poco más de detalle (mín. 8 caracteres)')
    err.status = 400
    throw err
  }

  const local = matchExampleDraft(brief)
  if (!workflowAiConfigured()) {
    if (local) return local
    const err = new Error(
      'IA no configurada. Elegí uno de los 3 ejemplos de caso de uso o configurá OPENAI_API_KEY / ANTHROPIC_API_KEY.',
    )
    err.status = 503
    throw err
  }

  const capList = (capabilities || []).map((c) => c.id || c).filter(Boolean)

  const system = [
    'Sos diseñador de workflows de aprobación para Connectia (app de comunidad laboral).',
    `Marca/tenant: ${brandName || 'Connectia'}. Español rioplatense.`,
    'El humano confirmará antes de publicar: proponé un borrador, no publiques.',
    'Pasos LINEALES solamente (MVP). Condiciones en texto legible (no código).',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      name: 'nombre corto',
      description: 'para qué sirve',
      trigger: { module: 'solicitudes|documentos|generico', tipoKey: 'opcional', label: '' },
      steps: [
        {
          orden: 1,
          nombre: 'paso',
          approverType: 'capability',
          approverValue: 'admin.solicitudes',
          slaHoras: 48,
          condition: 'opcional texto',
        },
      ],
      notes: 'qué revisar',
    }),
    `Capabilities válidas preferidas: ${capList.join(', ') || 'admin.solicitudes, admin.documentos, admin.usuarios, admin.hub, admin.comunidad'}.`,
    'approverType preferido: capability. No inventes organigrama ni personas concretas.',
    'Máximo 5 pasos. SLA razonable (24–72 h).',
  ].join('\n')

  try {
    const raw = await generateRaw(system, brief, { temperature: 0.4, maxTokens: 1100 })
    const data = parseJson(raw)
    return normalizeDraft({ ...data, source: 'ai' })
  } catch (e) {
    if (local) return { ...local, notes: `${local.notes} (fallback local: ${e.message})`.slice(0, 400) }
    throw e
  }
}
