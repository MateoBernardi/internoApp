import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const apiBaseUrl = process.env.API_BASE_URL;

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
          - static.cloudflareinsights.com: script inyectado por Cloudflare Browser Insights (si esta habilitado)
          - connect-src: API backend + Firebase Cloud Messaging endpoints + blob: para fetch(blob:...)
          - agregar dominios R2 si cambia la infraestructura de uploads firmados
          - worker-src blob: requerido por algunos bundlers para web workers
          - Actualizar la IP/dominio de connect-src si cambia API_BASE_URL
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://static.cloudflareinsights.com;
            style-src 'self' 'unsafe-inline';
            img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com;
            font-src 'self' https://fonts.gstatic.com;
            connect-src 'self'
              blob:
              ${apiBaseUrl}
              https://italoapp-backend-production.up.railway.app
              https://*.r2.cloudflarestorage.com
              https://fcm.googleapis.com
              https://fcmregistrations.googleapis.com
              https://firebaseinstallations.googleapis.com
              https://firebaselogging-pa.googleapis.com
              https://cloudflareinsights.com;
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

@media (min-width: 1024px) {
  body {
    overflow-y: auto;
  }
}

/* Contenedor general */
.cp-picker-wrap {
  width: 100%;
}
.cp-picker-wrap .react-datepicker,
.react-datepicker.cp-picker-calendar {
  width: 100%;
  max-width: 340px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: hidden;
  background: transparent !important;
}

/* Header estilo nativo limpio */
.cp-picker-wrap .react-datepicker__header,
.cp-picker-calendar .react-datepicker__header {
  background: #f6f7fb;
  border-bottom: 1px solid #e6e8ef;
  padding-top: 10px;
}
.cp-picker-wrap .react-datepicker__current-month,
.cp-picker-calendar .react-datepicker__current-month {
  font-size: 15px;
  font-weight: 600;
  color: #1a1f36;
}
.cp-picker-wrap .react-datepicker__day-name,
.cp-picker-calendar .react-datepicker__day-name {
  color: #687087;
  font-size: 12px;
  font-weight: 600;
}

/* Día normal/hover/seleccionado */
.cp-picker-wrap .react-datepicker__day,
.cp-picker-calendar .react-datepicker__day {
  width: 34px;
  line-height: 34px;
  margin: 3px;
  border-radius: 10px;
  color: #1f2435;
}
.cp-picker-wrap .react-datepicker__day:hover,
.cp-picker-calendar .react-datepicker__day:hover {
  background: #eef2ff;
}
.cp-picker-wrap .react-datepicker__day--selected,
.cp-picker-wrap .react-datepicker__day--keyboard-selected,
.cp-picker-calendar .react-datepicker__day--selected,
.cp-picker-calendar .react-datepicker__day--keyboard-selected {
  background: #0a66ff;
  color: #fff;
  font-weight: 700;
}
.cp-picker-wrap .react-datepicker__day--today,
.cp-picker-calendar .react-datepicker__day--today {
  border: 1px solid #0a66ff;
  font-weight: 700;
}

/* Tiempo */
.cp-picker-wrap .react-datepicker__time-container,
.cp-picker-calendar .react-datepicker__time-container {
  width: 100%;
  border-left: 0;
}
.cp-picker-wrap .react-datepicker__time-list-item,
.cp-picker-calendar .react-datepicker__time-list-item {
  height: 34px !important;
  line-height: 34px !important;
}
.cp-picker-wrap .react-datepicker__time-list-item--selected,
.cp-picker-calendar .react-datepicker__time-list-item--selected {
  background: #0a66ff !important;
  color: #fff !important;
  font-weight: 700;
}
`;

const swRegistration = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.getRegistrations()
      .then(function(registrations) {
        var hasMessagingSw = registrations.some(function(registration) {
          var activeUrl = registration.active && registration.active.scriptURL;
          var installingUrl = registration.installing && registration.installing.scriptURL;
          var waitingUrl = registration.waiting && registration.waiting.scriptURL;
          return [activeUrl, installingUrl, waitingUrl].some(function(url) {
            return typeof url === 'string' && url.indexOf('firebase-messaging-sw.js') !== -1;
          });
        });

        if (hasMessagingSw) {
          return null;
        }

        return navigator.serviceWorker.register('/firebase-messaging-sw.js');
      })
      .catch(function() {});
  });
}
`;
