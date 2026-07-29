/* Handlers Web Push — importado por el service worker de vite-plugin-pwa */
/* global self, clients */

self.addEventListener('push', (event) => {
  let data = {
    title: 'Connectia',
    body: 'Tenés un aviso nuevo',
    url: '/',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data?.text?.()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Connectia', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
      tag: data.kind || data.surveyId || 'connectia',
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data?.url || '/'
  const url = raw.startsWith('http') ? raw : new URL(raw, self.location.origin).href

  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(url)
            } catch {
              /* ignore */
            }
          }
          return
        }
      }
      await clients.openWindow(url)
    })(),
  )
})
