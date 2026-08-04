self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Terret CMO', body: 'Nueva tarea pendiente' }
  event.waitUntil(self.registration.showNotification(data.title || 'Terret CMO', {
    body: data.body || '', icon: '/icon-192.png',
    data: { url: data.url || '/calendario' }
  }))
})
self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})
