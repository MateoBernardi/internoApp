import Constants from 'expo-constants';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

export type WebPushPermissionStatus = NotificationPermission | 'unsupported' | 'error';

export interface WebPushPermissionResult {
  permission: WebPushPermissionStatus;
  token: string | null;
}

const firebaseConfig = {
  apiKey: "AIzaSyC0t94wuOGd2nI-bv1NDI-Lz-FYLbKx318",
  authDomain: "italoapp-7def0.firebaseapp.com",
  projectId: "italoapp-7def0",
  storageBucket: "italoapp-7def0.firebasestorage.app",
  messagingSenderId: "444092191215",
  appId: "1:444092191215:web:39515ca4ca036f8a93261a",
  measurementId: "G-B6F7QJ6X3Z"
};

/**
 * 1. Inicializa Firebase y Messaging de forma segura
 */
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
} 

/**
 * 2. Obtiene el FCM Token (requiere permiso previamente concedido)
 */
export async function getWebPushToken(): Promise<string | null> {
  try {
    const fcmMessaging = await messaging();

    if(fcmMessaging){
      console.log('[WebPush] Obteniendo token de notificaciones push con vapid_key:' + Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY);
      const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY;
      const token = await getToken(fcmMessaging, {
        vapidKey: vapidKey,
      });
      console.log('[WebPush] Token obtenido:', token);
      return token;
    }

    console.log('[WebPush] Messaging no soportado en este entorno');

    return null;

  } catch (error) {
    console.error('[WebPush] Error obteniendo el token:', error);
    return null;
  }
}

