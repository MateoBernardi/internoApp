import { useAuth } from '@/features/auth/context/AuthContext';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { registerDeviceSafely } from '../services/devicesApi';
import {
    requestWebPushTokenFromUserGesture,
    WebPushPermissionResult,
} from '../services/webPush';

const isDevBuild = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
let webPushGestureRequester: (() => Promise<WebPushPermissionResult>) | null = null;

export async function triggerWebPushPermissionPrompt(): Promise<WebPushPermissionResult> {
  if (!webPushGestureRequester) {
    return { permission: 'unsupported', token: null };
  }

  return webPushGestureRequester();
}

interface UseRegisterDeviceOptions {
  enabled?: boolean;
}

/**
 * Hook para gestionar el registro del dispositivo
 * Obtiene el push token, configura las notificaciones y registra el dispositivo
 * cuando el usuario esté autenticado
 */
export function useRegisterDevice(options: UseRegisterDeviceOptions = {}) {
  const { enabled = true } = options;
  const { tokens, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const lastRegistrationFingerprintRef = useRef<string | null>(null);
  const invalidTokenRegistryRef = useRef<Set<string>>(new Set());
  const lastPrereqLogKeyRef = useRef<string | null>(null);

  const firebaseConfig = Constants.expoConfig?.extra?.FIREBASE_WEB;
  const hasFirebaseConfig =
    !!firebaseConfig &&
    typeof firebaseConfig.apiKey === 'string' &&
    firebaseConfig.apiKey.length > 0 &&
    firebaseConfig.apiKey !== 'TU_API_KEY_WEB' &&
    typeof firebaseConfig.projectId === 'string' &&
    firebaseConfig.projectId.length > 0 &&
    typeof firebaseConfig.messagingSenderId === 'string' &&
    firebaseConfig.messagingSenderId.length > 0 &&
    typeof firebaseConfig.appId === 'string' &&
    firebaseConfig.appId.length > 0;
  const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY;
  const hasVapid = !!vapidKey && vapidKey !== 'TU_VAPID_PUBLIC_KEY';

  const requestWebPushPermissionWithGesture = useCallback(async (): Promise<WebPushPermissionResult> => {
    if (!enabled || Platform.OS !== 'web' || !hasFirebaseConfig || !hasVapid) {
      return { permission: 'unsupported', token: null };
    }

    const result = await requestWebPushTokenFromUserGesture();
    if (result.token) {
      invalidTokenRegistryRef.current.delete(result.token);
      setExpoPushToken((current) => (current === result.token ? current : result.token));
    }

    return result;
  }, [enabled, hasFirebaseConfig, hasVapid]);

  useEffect(() => {
    webPushGestureRequester = requestWebPushPermissionWithGesture;
    return () => {
      if (webPushGestureRequester === requestWebPushPermissionWithGesture) {
        webPushGestureRequester = null;
      }
    };
  }, [requestWebPushPermissionWithGesture]);

  // Configurar los canales de notificación para Android
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      }).catch((error) => console.error('Error setting notification channel:', error));
    }
  }, [enabled]);

  // Web push en web no hace solicitudes automaticas de token.
  // El token solo se obtiene desde requestWebPushPermissionWithGesture (clic explicito del usuario).
  useEffect(() => {
    if (!enabled) {
      setIsLoadingToken(false);
      return;
    }

    if (Platform.OS !== 'web') return;

    setIsLoadingToken(false);
  }, [enabled]);

  // Request de permisos de notificaciones y obtener el push token (nativo)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (Platform.OS === 'web') return; // Web se maneja arriba con FCM

    let isMounted = true;

    const setupPushNotifications = async () => {
      try {
        if (!Device.isDevice) {
          if (isMounted) {
            setIsLoadingToken(false);
          }
          return;
        }

        // Verificar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('No permission for push notifications');
          if (isMounted) {
            setIsLoadingToken(false);
          }
          return;
        }

        // Obtener el project ID
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

        if (!projectId) {
          console.warn('Project ID not found for push notifications');
          if (isMounted) {
            setIsLoadingToken(false);
          }
          return;
        }

        // Obtener el push token
        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        if (isMounted) {
          setExpoPushToken(token);
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      } finally {
        if (isMounted) {
          setIsLoadingToken(false);
        }
      }
    };

    setupPushNotifications();

    let tokenSubscription: { remove?: () => void } | null = null;
    const addPushTokenListener = (Notifications as any).addPushTokenListener;
    if (typeof addPushTokenListener === 'function') {
      tokenSubscription = addPushTokenListener((event: { data?: string }) => {
        const nextToken = event?.data;
        if (typeof nextToken === 'string' && nextToken.trim().length > 0) {
          invalidTokenRegistryRef.current.delete(nextToken);
          setExpoPushToken((current) => (current === nextToken ? current : nextToken));
        }
      });
    }

    return () => {
      isMounted = false;
      tokenSubscription?.remove?.();
    };
  }, [enabled]);

  // Registrar el dispositivo cuando esté autenticado y tengamos el token
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (expoPushToken && tokens?.accessToken && isAuthenticated) {
      if (invalidTokenRegistryRef.current.has(expoPushToken)) {
        console.warn('[Devices] Token marcado como invalido; se omite registro', {
          tokenPreview: expoPushToken.slice(0, 24),
        });
        return;
      }

      const deviceName = Platform.OS === 'web'
        ? `Web ${navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'}`
        : Device.modelName || Device.osName || 'Unknown Device';
      const platform: 'ios' | 'android' | 'web' =
        Platform.OS === 'web' ? 'web' : (Platform.OS as 'ios' | 'android') || 'android';

      const registrationFingerprint = `${platform}:${tokens.accessToken.slice(0, 10)}:${expoPushToken}`;
      if (lastRegistrationFingerprintRef.current === registrationFingerprint) {
        return;
      }

      lastRegistrationFingerprintRef.current = registrationFingerprint;
      registerDeviceSafely(tokens.accessToken, expoPushToken, platform, deviceName, 3).then(async (result) => {
        if (!result.ok) {
          lastRegistrationFingerprintRef.current = null;

          if (result.invalidToken) {
            invalidTokenRegistryRef.current.add(expoPushToken);
            console.warn(
              '[Devices] Invalid push token while registering device:',
              result.message || 'Unable to register this device for notifications. Request a new token from user action.'
            );
          }
        }
      });
    } else if (Platform.OS === 'web' && isAuthenticated) {
      const prereqState = {
        hasPushToken: !!expoPushToken,
        hasAccessToken: !!tokens?.accessToken,
        isAuthenticated,
        hasFirebaseConfig,
        hasVapid,
        notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      };
      const nextLogKey = JSON.stringify(prereqState);

      if (isDevBuild && lastPrereqLogKeyRef.current !== nextLogKey) {
        lastPrereqLogKeyRef.current = nextLogKey;
        console.log('[Devices] Registro web omitido por prerequisitos faltantes', prereqState);
      }
    }
  }, [enabled, expoPushToken, hasFirebaseConfig, hasVapid, tokens?.accessToken, isAuthenticated]);

  return {
    expoPushToken,
    isLoadingToken,
    requestWebPushPermissionWithGesture,
  };
}


