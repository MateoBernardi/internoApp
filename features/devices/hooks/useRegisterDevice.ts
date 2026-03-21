import { useAuth } from '@/features/auth/context/AuthContext';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { registerDeviceSafely } from '../services/devicesApi';
import { getWebPushToken, onForegroundMessage } from '../services/webPush';

/**
 * Hook para gestionar el registro del dispositivo
 * Obtiene el push token, configura las notificaciones y registra el dispositivo
 * cuando el usuario esté autenticado
 */
export function useRegisterDevice() {
  const { tokens, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const lastRegistrationFingerprintRef = useRef<string | null>(null);
  const invalidTokenRegistryRef = useRef<Set<string>>(new Set());
  const hasLoggedDeniedPermissionRef = useRef(false);
  const lastPrereqLogKeyRef = useRef<string | null>(null);

  const refreshWebPushToken = useCallback(async () => {
    const token = await getWebPushToken();
    if (token) {
      invalidTokenRegistryRef.current.delete(token);
      setExpoPushToken((current) => (current === token ? current : token));
    }
    return token;
  }, []);

  // Configurar los canales de notificación para Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      }).catch((error) => console.error('Error setting notification channel:', error));
    }
  }, []);

  // Web push: obtener FCM token via Firebase Messaging
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const firebaseConfig = Constants.expoConfig?.extra?.FIREBASE_WEB;
    const hasFirebaseConfig =
      !!firebaseConfig &&
      typeof firebaseConfig.apiKey === 'string' &&
      firebaseConfig.apiKey.length > 0 &&
      firebaseConfig.apiKey !== 'TU_API_KEY_WEB';
    const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY;
    const hasVapid = !!vapidKey && vapidKey !== 'TU_VAPID_PUBLIC_KEY';

    console.log('[WebPush] Config status', {
      hasFirebaseConfig,
      hasVapid,
    });

    let isMounted = true;

    const setupWebPush = async () => {
      try {
        const token = await refreshWebPushToken();
        if (isMounted && token) {
          setExpoPushToken((current) => (current === token ? current : token));
        }
      } catch (error) {
        console.error('[WebPush] Error:', error);
      } finally {
        if (isMounted) setIsLoadingToken(false);
      }
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshWebPushToken().catch((error) => {
          console.error('[WebPush] Error refreshing token on visibility change:', error);
        });
      }
    };

    const handleWindowFocusRefresh = () => {
      refreshWebPushToken().catch((error) => {
        console.error('[WebPush] Error refreshing token on focus:', error);
      });
    };

    setupWebPush();
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleWindowFocusRefresh);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleWindowFocusRefresh);
    };
  }, [refreshWebPushToken]);

  // Web push: escuchar mensajes en foreground
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let unsubscribe: (() => void) | null = null;

    onForegroundMessage((payload) => {
      // Mostrar notificación nativa del browser cuando la app está en foreground
      if (Notification.permission === 'granted' && payload.title) {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/assets/images/icon-1024.png',
        });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => { unsubscribe?.(); };
  }, []);

  // Reintentar obtencion de token web al autenticarse y al recuperar conectividad.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated) return;

    refreshWebPushToken().catch((error) => {
      console.error('[WebPush] Error refreshing token after auth:', error);
    });

    const handleOnline = () => {
      refreshWebPushToken().catch((error) => {
        console.error('[WebPush] Error refreshing token after reconnect:', error);
      });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, refreshWebPushToken]);

  // Mientras haya sesion web activa y no haya token, reintentar de forma controlada.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !tokens?.accessToken || expoPushToken) {
      return;
    }

    if (typeof window === 'undefined' || !window.isSecureContext) {
      console.warn('[Devices] No se puede obtener token web en contexto no seguro', {
        origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      });
      return;
    }

    if (Notification.permission === 'denied') {
      if (!hasLoggedDeniedPermissionRef.current) {
        console.warn('[Devices] Permiso de notificaciones denegado; no se puede registrar dispositivo web');
        hasLoggedDeniedPermissionRef.current = true;
      }
      return;
    }

    hasLoggedDeniedPermissionRef.current = false;

    const retryOnce = () => {
      refreshWebPushToken().catch((error) => {
        console.error('[WebPush] Retry token refresh failed:', error);
      });
    };

    retryOnce();
    const retryId = window.setInterval(retryOnce, 15000);

    return () => {
      window.clearInterval(retryId);
    };
  }, [expoPushToken, isAuthenticated, refreshWebPushToken, tokens?.accessToken]);

  // Request de permisos de notificaciones y obtener el push token (nativo)
  useEffect(() => {
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
  }, []);

  // Registrar el dispositivo cuando esté autenticado y tengamos el token
  useEffect(() => {
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
              result.message || 'Unable to register this device for notifications. Requesting a new token.'
            );

            if (platform === 'web') {
              await refreshWebPushToken();
            }
          }
        }
      });
    } else if (Platform.OS === 'web') {
      const prereqState = {
        hasPushToken: !!expoPushToken,
        hasAccessToken: !!tokens?.accessToken,
        isAuthenticated,
        notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      };
      const nextLogKey = JSON.stringify(prereqState);

      if (lastPrereqLogKeyRef.current !== nextLogKey) {
        lastPrereqLogKeyRef.current = nextLogKey;
        console.log('[Devices] Registro web omitido por prerequisitos faltantes', prereqState);
      }
    }
  }, [expoPushToken, tokens?.accessToken, isAuthenticated, refreshWebPushToken]);

  return {
    expoPushToken,
    isLoadingToken,
  };
}


