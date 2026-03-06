/**
 * Generate firebase-messaging-sw.js from environment variables.
 *
 * Usage:  node scripts/generate-sw.js
 * Called automatically via the "prebuild:web" npm script.
 */
const fs = require('fs');
const path = require('path');

// Load .env manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      env[key.trim()] = rest.join('=').trim();
    });
}

const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

for (const key of required) {
  if (!env[key] || env[key].startsWith('TU_')) {
    console.error(`⚠ Missing or placeholder value for ${key} in .env`);
  }
}

const sw = `// AUTO-GENERATED — Do not edit manually.
// Run "node scripts/generate-sw.js" or "npm run generate:sw" to regenerate.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '${env.FIREBASE_API_KEY || ''}',
  authDomain: '${env.FIREBASE_AUTH_DOMAIN || ''}',
  projectId: '${env.FIREBASE_PROJECT_ID || ''}',
  storageBucket: '${env.FIREBASE_STORAGE_BUCKET || ''}',
  messagingSenderId: '${env.FIREBASE_MESSAGING_SENDER_ID || ''}',
  appId: '${env.FIREBASE_APP_ID || ''}',
});

var messaging = firebase.messaging();

// Handle background messages (when the PWA is closed or in background)
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);

  var title = (payload.notification && payload.notification.title) || 'Nueva notificación';
  var options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/assets/images/icon-1024.png',
    badge: '/assets/images/favicon.png',
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
`;

const outPath = path.resolve(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sw, 'utf-8');
console.log('✓ Generated public/firebase-messaging-sw.js');
