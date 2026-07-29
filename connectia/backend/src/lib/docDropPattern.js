/**
 * Patrones de nombre para bandeja externa de documentos.
 *
 * Sintaxis:
 *  - Tokens `{nombre}` → captura nombrada (comodín no vacío)
 *  - `*` → comodín anónimo (cualquier cosa, incl. vacío)
 *  - `?` → un carácter
 *  - El resto es literal (se escapa)
 *
 * Ej.: `{dni}_recibo_{periodo}.pdf`  →  30111222_recibo_202603.pdf
 */

const TOKEN_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)\}|\*|\?/g

export const DOC_DROP_MATCH_FIELDS = [
  { id: 'dni', label: 'DNI', userPath: 'dni' },
  { id: 'cuil', label: 'CUIL', userPath: 'cuil' },
  { id: 'idExterno', label: 'ID externo / legajo', userPath: 'idExterno' },
  { id: 'usuario', label: 'Usuario (login)', userPath: 'usuario' },
  { id: 'email', label: 'Email', userPath: 'email' },
]

export function normalizeMatchValue(raw, { stripNonDigits = false } = {}) {
  let s = String(raw ?? '').trim()
  if (!s) return ''
  if (stripNonDigits) {
    s = s.replace(/\D+/g, '')
  } else {
    s = s.replace(/\s+/g, '').toLowerCase()
  }
  return s
}

/**
 * Compila el patrón a RegExp con named groups.
 * @returns {{ ok: true, regex: RegExp, tokens: string[] } | { ok: false, error: string }}
 */
export function compileNamePattern(pattern) {
  const raw = String(pattern || '').trim()
  if (!raw) return { ok: false, error: 'El patrón de nombre es obligatorio' }
  if (raw.length > 260) return { ok: false, error: 'Patrón demasiado largo' }

  const tokens = []
  let out = '^'
  let last = 0
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(raw))) {
    out += escapeRegex(raw.slice(last, m.index))
    if (m[0] === '*') {
      out += '.*'
    } else if (m[0] === '?') {
      out += '.'
    } else {
      const name = m[1]
      if (tokens.includes(name)) {
        return { ok: false, error: `Token duplicado: {${name}}` }
      }
      tokens.push(name)
      out += `(?<${name}>.+?)`
    }
    last = m.index + m[0].length
  }
  out += escapeRegex(raw.slice(last))
  out += '$'

  try {
    return { ok: true, regex: new RegExp(out, 'i'), tokens }
  } catch (e) {
    return { ok: false, error: e?.message || 'Patrón inválido' }
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extrae capturas del nombre de archivo.
 * @returns {{ ok: true, captures: Record<string,string> } | { ok: false, error: string }}
 */
export function matchFileName(fileName, pattern) {
  const compiled = compileNamePattern(pattern)
  if (!compiled.ok) return compiled
  const name = String(fileName || '').trim()
  if (!name) return { ok: false, error: 'Nombre vacío' }
  const m = compiled.regex.exec(name)
  if (!m) return { ok: false, error: 'No coincide con el patrón' }
  const captures = {}
  for (const t of compiled.tokens) {
    captures[t] = m.groups?.[t] != null ? String(m.groups[t]) : ''
  }
  return { ok: true, captures, tokens: compiled.tokens }
}

/**
 * Aplica plantilla con capturas: "Recibo {periodo} — {dni}"
 */
export function applyTemplate(template, captures = {}) {
  const t = String(template || '').trim()
  if (!t) return ''
  return t.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, key) => {
    const v = captures[key]
    return v != null && v !== '' ? String(v) : `{${key}}`
  })
}

/**
 * Valor a buscar en el usuario según matchToken + matchField.
 */
export function extractMatchKey(captures, matchToken, matchField, opts = {}) {
  const token = String(matchToken || '').trim() || String(matchField || 'dni')
  const raw = captures?.[token] ?? captures?.[matchField] ?? ''
  const field = String(matchField || 'dni')
  const stripNonDigits = field === 'dni' || field === 'cuil' || opts.stripNonDigits === true
  return normalizeMatchValue(raw, { stripNonDigits })
}

export function userFieldValue(user, matchField) {
  const field = String(matchField || 'dni')
  const meta = DOC_DROP_MATCH_FIELDS.find((x) => x.id === field)
  const path = meta?.userPath || field
  return user?.[path] ?? ''
}

export function userMatchesKey(user, matchField, key, opts = {}) {
  if (!key) return false
  const field = String(matchField || 'dni')
  const stripNonDigits = field === 'dni' || field === 'cuil' || opts.stripNonDigits === true
  const uv = normalizeMatchValue(userFieldValue(user, field), { stripNonDigits })
  return Boolean(uv) && uv === key
}
