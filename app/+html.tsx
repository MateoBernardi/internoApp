import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page
 * during static rendering. The contents of this function only run in Node.js
 * environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/*
          Content Security Policy
          - unsafe-inline en script-src/style-src: necesario por los bloques inline (SW registration + estilos)
          - connect-src: API backend + Firebase Cloud Messaging endpoints
          - worker-src blob: requerido por algunos bundlers para web workers
          - Actualizar la IP/dominio de connect-src si cambia API_BASE_URL
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com;
            style-src 'self' 'unsafe-inline';
            img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com;
            font-src 'self' https://fonts.gstatic.com;
            connect-src 'self'
              http://192.168.1.189:3000
              https://italoapp-backend-production.up.railway.app
              https://fcm.googleapis.com
              https://fcmregistrations.googleapis.com
              https://firebaseinstallations.googleapis.com
              https://firebaselogging-pa.googleapis.com;
            worker-src 'self' blob:;
            manifest-src 'self';
            object-src 'none';
            base-uri 'self';
            form-action 'self';
          `.replace(/\s+/g, ' ').trim()}
        />

        {/* Theme & status bar */}
        <meta name="theme-color" content="#00054b" />
        <meta name="background-color" content="#eeeeee" />

        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Italo Arg" />
        <link rel="apple-touch-icon" href="/assets/images/icon-1024.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />

        {/* Disable phone number detection on iOS Safari */}
        <meta name="format-detection" content="telephone=no" />

        <ScrollViewStyleReset />

        {/* Web-only global styles */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        {children}
        {/* Register Service Worker for PWA + Web Push */}
        <script dangerouslySetInnerHTML={{ __html: swRegistration }} />
      </body>
    </html>
  );
}

const responsiveBackground = `
html,
body {
  margin: 0;
  min-height: 100%;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  min-height: 100vh;
}
#root {
  display: flex;
  flex: 1;
  min-height: 100vh;
}
`;

const swRegistration = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Registration failed:', err); });
  });
}
`;
