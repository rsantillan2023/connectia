/**
 * Adapter stub de documentos SAP (17.05).
 * Sin credenciales reales: si SAP_DOCS_ENABLED=true y hay BASE_URL, intenta GET;
 * si no, responde configured:false con mensaje claro.
 */

export function sapDocsConfigured() {
  return String(process.env.SAP_DOCS_ENABLED || '').toLowerCase() === 'true'
}

/**
 * @returns {Promise<{ configured: boolean, items: Array, message?: string, error?: string }>}
 */
export async function fetchDocumentsFromSap(tenant) {
  if (!sapDocsConfigured()) {
    return {
      configured: false,
      items: [],
      message:
        'SAP no configurado. Definí SAP_DOCS_ENABLED=true, SAP_DOCS_BASE_URL y opcionalmente SAP_DOCS_API_KEY.',
    }
  }

  const base = String(process.env.SAP_DOCS_BASE_URL || '').replace(/\/$/, '')
  if (!base) {
    return {
      configured: false,
      items: [],
      message: 'SAP_DOCS_ENABLED=true pero falta SAP_DOCS_BASE_URL.',
    }
  }

  const headers = { Accept: 'application/json' }
  if (process.env.SAP_DOCS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SAP_DOCS_API_KEY}`
  }

  try {
    const emp = tenant?.empCodigo || ''
    const url = `${base}/documents?empCodigo=${encodeURIComponent(emp)}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      return {
        configured: true,
        items: [],
        error: `SAP respondió ${res.status}`,
      }
    }
    const data = await res.json()
    const raw = Array.isArray(data) ? data : data?.items || data?.documents || []
    const items = raw.map((d, i) => ({
      externalId: String(d.id || d.externalId || d.docId || `sap-${i}`),
      titulo: String(d.titulo || d.title || d.name || 'Documento SAP').slice(0, 200),
      descripcion: String(d.descripcion || d.description || ''),
      category: String(d.category || d.categoria || 'sap'),
      fileUrl: String(d.fileUrl || d.url || d.link || ''),
      mimeType: String(d.mimeType || d.mime || ''),
    })).filter((d) => d.fileUrl)

    return { configured: true, items, message: `OK · ${items.length} documento(s)` }
  } catch (err) {
    return {
      configured: true,
      items: [],
      error: err?.message || 'Error al consultar SAP',
    }
  }
}
