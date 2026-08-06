/**
 * Tokens visuales de la app miembro (frontend) para vistas previas en admin.
 * Evita heredar el tema/purple del panel admin.
 */

const APP_LIGHT = {
  '--cx-page': '#f8fafc',
  '--cx-surface': '#ffffff',
  '--cx-surface-2': '#f8fafc',
  '--cx-text': '#0f172a',
  '--cx-muted': '#64748b',
  '--cx-border': 'rgba(15, 23, 42, 0.1)',
  '--cx-input': '#ffffff',
  '--cx-danger': '#dc2626',
  '--cx-ok': '#0f766e',
  '--cx-elevated': '#ffffff',
  '--cx-nav': 'rgba(255, 255, 255, 0.92)',
}

const APP_DARK = {
  '--cx-page': '#0b1220',
  '--cx-surface': '#111827',
  '--cx-surface-2': '#0f172a',
  '--cx-text': '#e2e8f0',
  '--cx-muted': '#94a3b8',
  '--cx-border': 'rgba(148, 163, 184, 0.18)',
  '--cx-input': '#0f1720',
  '--cx-danger': '#f87171',
  '--cx-ok': '#2dd4bf',
  '--cx-elevated': '#1e293b',
  '--cx-nav': 'rgba(15, 23, 42, 0.92)',
}

function resolveAppMode(tenant) {
  const mode = tenant?.themeMode
  if (mode === 'dark' || mode === 'light') return mode
  return 'light'
}

/**
 * @param {{ branding?: object, themeMode?: string } | null} tenant
 * @returns {Record<string, string>}
 */
export function communityAppPreviewStyle(tenant) {
  const b = tenant?.branding || {}
  const primary = String(b.primary || '').trim() || '#8554C9'
  const secondary = String(b.secondary || '').trim() || primary || '#6B3FA0'
  const dark = resolveAppMode(tenant) === 'dark'
  const surfaces = dark ? APP_DARK : APP_LIGHT

  return {
    ...surfaces,
    '--brand-primary': primary,
    '--brand-secondary': secondary,
    '--cx-page-glow-a': `color-mix(in srgb, ${primary} ${dark ? 14 : 18}%, transparent)`,
    '--cx-page-glow-b': `color-mix(in srgb, ${secondary} ${dark ? 10 : 12}%, transparent)`,
    /* Alias usados por previews legacy (admin tokens) → paleta app */
    '--panel': surfaces['--cx-surface'],
    '--panel-2': surfaces['--cx-surface-2'],
    '--ink': surfaces['--cx-text'],
    '--ink-soft': surfaces['--cx-muted'],
    '--line': surfaces['--cx-border'],
    '--line-2': surfaces['--cx-border'],
  }
}
