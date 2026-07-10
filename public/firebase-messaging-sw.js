/* Firebase Cloud Messaging service worker — handles push notifications while
 * the app is in the background or closed. Registered on demand by lib/push.ts
 * (scope: /firebase-cloud-messaging-push-scope), so it coexists with the PWA
 * workbox service worker at "/".
 *
 * The Firebase web config below is public (security is enforced by Firestore
 * rules), so it is safe to ship in a static file. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCiZsfygf4L6UhyvOKRfoDI_tvPTt6Gte0',
  authDomain: 'car360-50b44.firebaseapp.com',
  projectId: 'car360-50b44',
  storageBucket: 'car360-50b44.firebasestorage.app',
  messagingSenderId: '160829353648',
  appId: '1:160829353648:web:6c133d0274e2aa141c1575',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {}
  const data = payload.data || {}
  self.registration.showNotification(n.title || 'Car360', {
    body: n.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: data.tag || 'car360',
    data: { url: data.url || '/reminders' },
  })
})

// focus an open tab (or open one) when a notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/reminders'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
