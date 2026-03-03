// Firebase Messaging Service Worker
// FCM requires this file to be named exactly "firebase-messaging-sw.js" at the root

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// This config is duplicated here because the SW runs in a separate context
// TODO: Replace placeholders with your Firebase web app values
firebase.initializeApp({
  apiKey: 'AIzaSyC0t94wuOGd2nI-bv1NDI-Lz-FYLbKx318',
  authDomain: 'italoapp-7def0.firebaseapp.com',
  projectId: 'italoapp-7def0',
  storageBucket: 'italoapp-7def0.firebasestorage.app',
  messagingSenderId: '444092191215',
  appId: '1:444092191215:web:39515ca4ca036f8a93261a',
});

const messaging = firebase.messaging();

// Handle background messages (when the PWA is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const title = payload.notification?.title || 'Nueva notificación';
  const options = {
    body: payload.notification?.body || '',
    icon: '/assets/images/icon-1024.png',
    badge: '/assets/images/favicon.png',
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow('/');
    })
  );
});
