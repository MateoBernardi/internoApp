import Constants from 'expo-constants';

let messagingInstance: any = null;

export type WebPushPermissionStatus = NotificationPermission | 'unsupported' | 'error';

export interface WebPushPermissionResult {
  permission: WebPushPermissionStatus;
  token: string | null;
}

/**
 * 1. Inicializa Firebase y Messaging de forma segura
 */
async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;

  const { getApp, getApps, initializeApp } = await import('firebase/app');
  const { getMessaging, isSupported } = await import('firebase/messaging');

  // Verifica soporte del navegador
  const supported = await isSupported();
  if (!supported) {
    console.warn('[WebPush] Este navegador no soporta notificaciones push.');
    return null;
  }

  const config = Constants.expoConfig?.extra?.FIREBASE_WEB;
  if (!config) return null;

  // Evita inicializar la app dos veces
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  messagingInstance = getMessaging(app);
  
  return messagingInstance;
}

/**
 * 2. Obtiene el FCM Token (requiere permiso previamente concedido)
 */
export async function getWebPushToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    if (Notification.permission !== 'granted') {
      console.warn('[WebPush] Permiso no concedido; se omite obtencion de token.', {
        permission: Notification.permission,
      });
      return null;
    }

    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY?.trim(); // El .trim() evita espacios fantasma

    // Pedir el token a Firebase
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    console.log('[WebPush] ¡Token obtenido exitosamente!', token);
    return token || null;

  } catch (error) {
    console.error('[WebPush] Error obteniendo el token:', error);
    return null;
  }
}

/**
 * 2.b Solicita permiso en contexto de user gesture y, si se concede, obtiene token.
 */
export async function requestWebPushTokenFromUserGesture(): Promise<WebPushPermissionResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { permission: 'unsupported', token: null };
  }

  if (!window.isSecureContext) {
    return { permission: 'unsupported', token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { permission, token: null };
    }

    const token = await getWebPushToken();
    return { permission, token };
  } catch (error) {
    console.error('[WebPush] Error solicitando permiso por gesto de usuario:', error);
    return { permission: 'error', token: null };
  }
}

/**
 * 3. Escucha mensajes mientras la app está abierta
 */
export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: any }) => void
): Promise<(() => void) | null> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const { onMessage } = await import('firebase/messaging');

    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });
    });
  } catch (error) {
    console.error('[WebPush] Error en el listener:', error);
    return null;
  }
}