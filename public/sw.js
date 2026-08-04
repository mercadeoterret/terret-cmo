self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('push', function(e) {
  const d = e.data ? e.data.json() : { title: 'Terret CMO', body: 'Nueva tarea pendiente' }
  e.waitUntil(self.registration.showNotification(d.title || 'Terret CMO', { body: d.body || '', icon: '/icon-192.png', data: { url: d.url || '/tareas' } }))
})
self.addEventListener('notificationclick', function(e) { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data.url || '/')) })
