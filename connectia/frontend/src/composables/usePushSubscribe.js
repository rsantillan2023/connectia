import api from '../services/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Pide permiso y registra suscripción Web Push en el backend.
 * Silencioso si el navegador no soporta o el usuario niega.
 */
export async function ensurePushSubscription() {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' }
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const { data } = await api.get('/notifications/push/vapid-public-key')
    const publicKey = data?.publicKey
    if (!publicKey) return { ok: false, reason: 'no-vapid' }

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    await api.post('/notifications/push/subscribe', {
      subscription: sub.toJSON(),
    })
    return { ok: true }
  } catch (err) {
    console.warn('[push] subscribe failed', err)
    return { ok: false, reason: err?.message || 'error' }
  }
}
