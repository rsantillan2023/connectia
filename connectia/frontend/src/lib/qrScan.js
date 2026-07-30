/**
 * Escaneo QR con cámara: BarcodeDetector nativo + fallback jsQR.
 */

let activeStream = null
let rafId = 0
let stopped = true

export function supportsCameraScan() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function supportsBarcodeDetector() {
  return typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function'
}

async function loadJsQR() {
  const mod = await import('jsqr')
  return mod.default || mod
}

/**
 * @param {HTMLVideoElement} video
 * @param {(text: string) => void} onDetect
 * @param {{ facingMode?: string }} [opts]
 * @returns {Promise<{ stop: () => void, engine: string }>}
 */
export async function startQrScan(video, onDetect, opts = {}) {
  if (!supportsCameraScan()) {
    throw new Error('Este dispositivo no permite acceso a la cámara')
  }
  stopQrScan()
  stopped = false

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: opts.facingMode || { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  })
  activeStream = stream
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()

  let engine = 'barcodeDetector'
  let detector = null
  let jsQR = null

  if (supportsBarcodeDetector()) {
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    } catch {
      detector = null
    }
  }
  if (!detector) {
    jsQR = await loadJsQR()
    engine = 'jsQR'
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let lastHit = ''
  let lastAt = 0

  const tick = async () => {
    if (stopped) return
    rafId = requestAnimationFrame(tick)
    if (!video.videoWidth || !ctx) return

    try {
      let value = ''
      if (detector) {
        const codes = await detector.detect(video)
        value = codes?.[0]?.rawValue || ''
      } else if (jsQR) {
        const w = video.videoWidth
        const h = video.videoHeight
        canvas.width = w
        canvas.height = h
        ctx.drawImage(video, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' })
        value = code?.data || ''
      }
      if (!value) return
      const now = Date.now()
      if (value === lastHit && now - lastAt < 1500) return
      lastHit = value
      lastAt = now
      onDetect(String(value).trim())
    } catch {
      /* frame skip */
    }
  }

  rafId = requestAnimationFrame(tick)
  return {
    engine,
    stop: () => stopQrScan(),
  }
}

export function stopQrScan() {
  stopped = true
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (activeStream) {
    for (const t of activeStream.getTracks()) t.stop()
    activeStream = null
  }
}
