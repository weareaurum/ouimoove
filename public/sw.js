self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'OuiMoove', {
      body:  data.body  ?? '',
      icon:  data.icon  ?? '/ouimoove-logo.png',
      badge: data.badge ?? '/ouimoove-logo.png',
      data:  { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const target = event.notification.data?.url ?? '/'
      const found  = cs.find((c) => c.url === target)
      return found ? found.focus() : clients.openWindow(target)
    })
  )
})

self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
