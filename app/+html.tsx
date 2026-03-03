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

        {/* Theme & status bar */}
        <meta name="theme-color" content="#00054b" />
        <meta name="background-color" content="#eeeeee" />

        {/* iOS PWA meta tags */}
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
body {
  background-color: #eeeeee;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root {
  display: flex;
  flex: 1;
  height: 100%;
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
