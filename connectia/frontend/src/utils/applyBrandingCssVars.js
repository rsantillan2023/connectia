/** Aplica variables CSS de branding de comunidad en :root. */
export function applyBrandingCssVars(branding = {}) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (branding.primary) {
    root.style.setProperty('--brand-primary', branding.primary)
  }
  if (branding.secondary) {
    root.style.setProperty('--brand-secondary', branding.secondary)
  } else if (branding.primary) {
    root.style.setProperty('--brand-secondary', branding.primary)
  }
  const n = Number(branding.pointsBtnDarkenPct)
  const darken = Number.isFinite(n) ? Math.min(80, Math.max(0, Math.round(n))) : 22
  const keep = Math.max(0, 100 - darken)
  root.style.setProperty('--brand-points-darken', `${darken}%`)
  root.style.setProperty('--brand-points-keep', `${keep}%`)
}

/** Hex/rgb resuelto de una CSS var (Leaflet, canvas, etc. no aceptan `var()`). */
export function resolveCssColor(varName = '--brand-primary', fallback = '#8554c9') {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return raw || fallback
}

