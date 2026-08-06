/** Catálogo y helpers de tipos de enlace del hub. */

export const HUB_KINDS = [
  {
    id: 'url',
    label: 'URL externa',
    hint: 'Abre un sitio en nueva pestaña',
    group: 'Web',
  },
  {
    id: 'webview',
    label: 'Webview in-app',
    hint: 'Muestra la URL dentro de Connectia',
    group: 'Web',
  },
  {
    id: 'route',
    label: 'Ruta interna',
    hint: 'Navega a una pantalla de la app',
    group: 'App',
  },
  {
    id: 'request',
    label: 'Nueva solicitud',
    hint: 'Abre el alta con una plantilla de solicitud',
    group: 'App',
  },
  {
    id: 'survey',
    label: 'Encuesta',
    hint: 'Va a una encuesta concreta',
    group: 'App',
  },
  {
    id: 'document',
    label: 'Documento',
    hint: 'Abre o descarga un documento',
    group: 'App',
  },
  {
    id: 'post',
    label: 'Publicación',
    hint: 'Abre un post del muro',
    group: 'App',
  },
  {
    id: 'faq',
    label: 'FAQ',
    hint: 'Abre un artículo del centro de ayuda',
    group: 'App',
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    hint: 'Abre un tutorial paso a paso',
    group: 'App',
  },
  {
    id: 'policy',
    label: 'Política',
    hint: 'Abre una política corporativa',
    group: 'App',
  },
  {
    id: 'mailto',
    label: 'Correo (mailto)',
    hint: 'Compone un email',
    group: 'Contacto',
  },
  {
    id: 'tel',
    label: 'Teléfono',
    hint: 'Inicia una llamada',
    group: 'Contacto',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Abre chat con mensaje opcional',
    group: 'Contacto',
  },
  {
    id: 'copy',
    label: 'Copiar texto',
    hint: 'Copia un código o texto al portapapeles',
    group: 'Utilidad',
  },
  {
    id: 'sso',
    label: 'SSO / adaptador',
    hint: 'Abre destino vía adaptador SSO (secreto solo en servidor)',
    group: 'Integraciones',
  },
]

export const HUB_KIND_IDS = HUB_KINDS.map((k) => k.id)

export function normalizeHubKind(kind, openMode) {
  if (HUB_KIND_IDS.includes(kind)) return kind
  if (openMode === 'internal') return 'route'
  return 'url'
}

export function openModeForKind(kind) {
  if (
    ['route', 'request', 'survey', 'document', 'post', 'faq', 'tutorial', 'policy', 'copy', 'webview'].includes(
      kind,
    )
  ) {
    return 'internal'
  }
  return 'external'
}

/** Contexto de plantillas {{usuario}}, {{email}}, {{puntos}}, etc. */
export function buildTemplateContext(user, tenant, extras = {}) {
  const primerNombre = String(user?.nombre || '').trim()
  const apellido = String(user?.apellido || '').trim()
  const nombre = [primerNombre, apellido].filter(Boolean).join(' ').trim()
  const iniciales = [primerNombre, apellido]
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
  const puntos = extras.puntos != null ? Number(extras.puntos) : extras.balance != null ? Number(extras.balance) : 0
  const pts = Number.isFinite(puntos) ? Math.max(0, Math.floor(puntos)) : 0
  const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires'
  return {
    usuario: user?.usuario || '',
    legajo: user?.idExterno || user?.usuario || '',
    idExterno: user?.idExterno || '',
    nombre: nombre || primerNombre || '',
    primer_nombre: primerNombre,
    apellido,
    iniciales,
    email: user?.email || '',
    telefono: user?.telefono || '',
    dni: user?.dni || '',
    cuil: user?.cuil || '',
    cargo: user?.cargo || '',
    sede: user?.sede || '',
    fecha_ingreso: formatTemplateDate(user?.fechaIngreso, tz),
    fecha_hoy: formatTemplateDate(new Date(), tz),
    userId: user?._id ? String(user._id) : user?.id ? String(user.id) : '',
    empCodigo: tenant?.empCodigo || '',
    tenant: tenant?.nombre || tenant?.empCodigo || '',
    puntos: String(pts),
    puntos_saludo: pts === 1 ? 'Tenés 1 punto' : `Tenés ${pts} puntos`,
    _puntosNum: pts,
    _user: user,
    _tenant: tenant,
  }
}

function formatTemplateDate(value, timeZone = 'America/Argentina/Buenos_Aires') {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone,
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

/**
 * Aplica {{var}} y condicionals {{si_puntos_gt:N:texto}} / {{si_puntos_gte:N:texto}} / {{si_puntos_lt:N:texto}}.
 */
export function applyTemplates(input, ctx = {}) {
  if (input == null) return ''
  if (typeof input === 'object' && !Array.isArray(input)) {
    const out = {}
    for (const [k, v] of Object.entries(input)) out[k] = applyTemplates(v, ctx)
    return out
  }
  if (Array.isArray(input)) return input.map((v) => applyTemplates(v, ctx))
  let s = String(input)
  const pts = Number(ctx._puntosNum) || Number(ctx.puntos) || 0
  s = s.replace(/\{\{\s*si_puntos_(gt|gte|lt|lte)\s*:\s*(\d+)\s*:\s*([^}]+)\}\}/gi, (_, op, nRaw, text) => {
    const n = Number(nRaw)
    let ok = false
    if (op === 'gt') ok = pts > n
    else if (op === 'gte') ok = pts >= n
    else if (op === 'lt') ok = pts < n
    else if (op === 'lte') ok = pts <= n
    return ok ? String(text).trim() : ''
  })
  s = s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key]
    return v == null ? '' : String(v)
  })
  return s.replace(/\s{2,}/g, ' ').trim()
}

export function digitsOnly(phone) {
  return String(phone || '').replace(/\D+/g, '')
}

/**
 * Resuelve qué debe hacer el cliente al abrir el enlace.
 * @returns {{ action, path?, query?, url?, text?, message?, title?, error? }}
 */
export function resolveHubAction(link, ctx) {
  const kind = normalizeHubKind(link.kind, link.openMode)
  const params = link.params && typeof link.params === 'object' ? link.params : {}
  const target = applyTemplates(link.target || link.url || '', ctx)
  const p = applyTemplates(params, ctx)

  switch (kind) {
    case 'route': {
      const path = target.startsWith('/') ? target : `/${target}`
      return { action: 'navigate', path, query: p.query || undefined }
    }
    case 'request': {
      const tipo = p.requestTypeId || p.requestTypeKey || target
      return {
        action: 'navigate',
        path: '/solicitudes',
        query: { nueva: '1', tipo: String(tipo || '') },
      }
    }
    case 'survey': {
      const id = p.surveyId || target
      return { action: 'navigate', path: `/encuestas/${id}` }
    }
    case 'document': {
      const id = p.docId || target
      return { action: 'navigate', path: '/docs', query: { doc: String(id || '') } }
    }
    case 'post': {
      const id = p.postId || target
      return { action: 'navigate', path: `/muro/${id}` }
    }
    case 'faq': {
      const id = p.faqId || target
      return { action: 'navigate', path: `/ayuda/faq/${id}` }
    }
    case 'tutorial': {
      const id = p.tutorialId || target
      return { action: 'navigate', path: `/ayuda/tutorial/${id}` }
    }
    case 'policy': {
      const id = p.policyId || target
      return { action: 'navigate', path: `/politicas/${id}` }
    }
    case 'mailto': {
      const email = target
      const q = new URLSearchParams()
      if (p.subject) q.set('subject', p.subject)
      if (p.body) q.set('body', p.body)
      const qs = q.toString()
      return { action: 'external', url: `mailto:${email}${qs ? `?${qs}` : ''}` }
    }
    case 'tel': {
      return { action: 'external', url: `tel:${digitsOnly(target)}` }
    }
    case 'whatsapp': {
      const phone = digitsOnly(target)
      const text = p.text || p.body || ''
      const url = text
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/${phone}`
      return { action: 'external', url }
    }
    case 'copy': {
      return {
        action: 'copy',
        text: p.copyText || p.text || target,
        message: p.message || 'Copiado al portapapeles',
      }
    }
    case 'webview': {
      return {
        action: 'webview',
        url: target,
        title: p.title || link.titulo || 'Enlace',
      }
    }
    case 'sso': {
      // Lazy import-free: caller puede enriquecer; acá devolvemos señal para resolver en ruta
      return {
        action: 'sso',
        adapterId: p.adapterId || p.adapter || 'default',
        target,
      }
    }
    case 'url':
    default: {
      let url = target
      if (p.query && typeof p.query === 'object') {
        try {
          const u = new URL(url)
          for (const [k, v] of Object.entries(p.query)) {
            if (v != null && v !== '') u.searchParams.set(k, String(v))
          }
          url = u.toString()
        } catch {
          const qs = new URLSearchParams(
            Object.entries(p.query)
              .filter(([, v]) => v != null && v !== '')
              .map(([k, v]) => [k, String(v)]),
          ).toString()
          if (qs) url += (url.includes('?') ? '&' : '?') + qs
        }
      }
      return { action: 'external', url }
    }
  }
}

export function validateHubLinkPayload({ kind, target, params }) {
  const k = normalizeHubKind(kind)
  const t = String(target || '').trim()
  const p = params && typeof params === 'object' ? params : {}

  switch (k) {
    case 'url':
    case 'webview':
      if (!t) return 'La URL es requerida'
      break
    case 'route':
      if (!t) return 'La ruta es requerida'
      break
    case 'request':
      if (!t && !p.requestTypeId && !p.requestTypeKey) return 'Elegí una plantilla de solicitud'
      break
    case 'survey':
      if (!t && !p.surveyId) return 'Elegí una encuesta'
      break
    case 'document':
      if (!t && !p.docId) return 'Elegí un documento'
      break
    case 'post':
      if (!t && !p.postId) return 'Elegí una publicación'
      break
    case 'faq':
      if (!t && !p.faqId) return 'Elegí una FAQ'
      break
    case 'tutorial':
      if (!t && !p.tutorialId) return 'Elegí un tutorial'
      break
    case 'policy':
      if (!t && !p.policyId) return 'Elegí una política'
      break
    case 'mailto':
      if (!t) return 'El email es requerido'
      break
    case 'tel':
    case 'whatsapp':
      if (!t) return 'El teléfono es requerido'
      break
    case 'copy':
      if (!String(p.copyText || p.text || t).trim()) return 'El texto a copiar es requerido'
      break
    case 'sso':
      if (!t && !p.adapterId && !p.adapter) return 'Indicá destino o adapterId SSO'
      break
    default:
      break
  }
  return null
}
