self.addEventListener('push', (event) => {
  // ← Handle both JSON and plain text
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = {
      title: event.data?.text() || 'RideSharePro',
      body: 'You have a new notification',
      link: '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'RideSharePro', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: { link: data.link || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const link = event.notification.data?.link || '/'
      for (const client of clientList) {
        if (client.url.includes(link) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link)
      }
    })
  )
})