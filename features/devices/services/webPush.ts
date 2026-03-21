/**
 * Firebase Web Push utilities.
 * Only imported on web platform — uses dynamic imports to avoid
 * bundling Firebase JS SDK on native builds.
 */

import Constants from 'expo-constants';

let firebaseApp: any = null;
let messagingInstance: any = null;

/**
 * Lazily initialize the Firebase web app and messaging instance.
 */
async function getMessaging() {
  if (messagingInstance) return messagingInstance;

  const { initializeApp } = await import('firebase/app');
  const { getMessaging, isSupported } = await import('firebase/messaging');

  const supported = await isSupported();
  if (!supported) {
    console.warn('[WebPush] Firebase Messaging is not supported in this browser');
    return null;
  }

  const config = Constants.expoConfig?.extra?.FIREBASE_WEB;
  if (!config || config.apiKey === 'TU_API_KEY_WEB') {
    console.warn('[WebPush] Firebase web config not set — update app.config.ts extra.FIREBASE_WEB');
    return null;
  }

  firebaseApp = initializeApp(config);
  messagingInstance = getMessaging(firebaseApp);
  return messagingInstance;
}

/**
 * Register the Firebase Messaging service worker and get an FCM token.
 * Returns the FCM token string, or null if not supported / permission denied.
 */
export async function getWebPushToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[WebPush] Service Worker API no disponible en este navegador');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('[WebPush] Notifications API no disponible en este navegador');
      return null;
    }

    if (!window.isSecureContext) {
      console.warn('[WebPush] Se requiere contexto seguro (HTTPS o localhost) para Web Push', {
        origin: window.location.origin,
      });
      return null;
    }

    const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY;
    if (!vapidKey || vapidKey === 'TU_VAPID_PUBLIC_KEY') {
      console.warn('[WebPush] VAPID key not set — update app.config.ts extra.VAPID_PUBLIC_KEY');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = await getMessaging();
    if (!messaging) return null;

    // Check current permission status before requesting to avoid spam when already denied
    if (Notification.permission === 'denied') {
      return null;
    }

    // Only request if not yet decided
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('[WebPush] Permiso de notificaciones no concedido', { permission });
      return null;
    }

    // Get FCM token
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('[WebPush] Firebase no devolvio token FCM');
      return null;
    }

    console.log('[WebPush] FCM token obtained');
    return token;
  } catch (error) {
    console.error('[WebPush] Error getting web push token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when the PWA is open and focused).
 * Returns an unsubscribe function, or null if messaging is not available.
 */
export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: any }) => void
): Promise<(() => void) | null> {
  try {
    const messaging = await getMessaging();
    if (!messaging) return null;

    const { onMessage } = await import('firebase/messaging');

    const unsubscribe = onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });
    });

    return unsubscribe;
  } catch (error) {
    console.error('[WebPush] Error setting up foreground listener:', error);
    return null;
  }
}
