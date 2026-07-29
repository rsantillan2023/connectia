import { Router } from 'express'

const router = Router()

const MAX_BYTES = 8 * 1024 * 1024

/**
 * Proxy de imagen externa (evita bloqueo hotlink / referer).
 * GET /api/media/proxy?url=https://...
 * Público: las <img> no envían Bearer.
 */
router.get('/proxy', async (req, res) => {
  try {
    const raw = String(req.query.url || '').trim()
    if (!raw || raw.length > 2048) {
      return res.status(400).json({ error: 'URL inválida' })
    }
    let target
    try {
      target = new URL(raw)
    } catch {
      return res.status(400).json({ error: 'URL inválida' })
    }
    if (!/^https?:$/i.test(target.protocol)) {
      return res.status(400).json({ error: 'Solo http/https' })
    }
    // No proxyear loops a nosotros mismos
    if (/\/api\/media\/proxy/i.test(target.pathname)) {
      return res.status(400).json({ error: 'URL no permitida' })
    }

    const upstream = await fetch(target.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.5',
        Referer: target.origin + '/',
      },
    })

    if (!upstream.ok) {
      return res.status(502).json({ error: `Origen HTTP ${upstream.status}` })
    }

    const ctype = (upstream.headers.get('content-type') || '').toLowerCase()
    if (ctype && !ctype.startsWith('image/') && !ctype.includes('octet-stream')) {
      return res.status(415).json({ error: 'No es una imagen' })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    if (!buf.length || buf.length > MAX_BYTES) {
      return res.status(502).json({ error: 'Imagen vacía o demasiado grande' })
    }

    res.setHeader('Content-Type', ctype.startsWith('image/') ? ctype : 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(buf)
  } catch (e) {
    res.status(502).json({ error: e.message || 'No se pudo obtener la imagen' })
  }
})

export default router
