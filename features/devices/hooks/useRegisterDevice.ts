import { useAuth } from '@/features/auth/context/AuthContext';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Unsubscribe, onMessage } from 'firebase/messaging';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { registerDeviceSafely } from '../services/devicesApi';
import {
  getWebPushToken,
  messaging
} from '../services/webPush';

export async function triggerWebPushPermissionAndToken() {
  if(!('Notification' in window)){
    console.warn('[Devices] Notificaciones web no soportadas en este navegador.');
    return null;
  }

  if(Notification.permission === 'granted'){
    return await getWebPushToken();
  }

  if(Notification.permission !== 'denied'){
    const permission = await Notification.requestPermission();
    if(permission === 'granted'){
      return await getWebPushToken();
    }
  }

  console.warn('[Devices] Permiso para notificaciones web no concedido.');
  return null;    

}

interface UseRegisterDeviceOptions {
  enabled?: boolean;
  onPushPayload?: (payload: unknown, source: 'web-foreground' | 'web-service-worker' | 'native') => void;
  onNotificationOpen?: (payload: unknown) => void;
}  

/**
 * Hook para gestionar el registro del dispositivo
 * Obtiene el push token, configura las notificaciones y registra el dispositivo
 * cuando el usuario esté autenticado
 */
export function useRegisterDevice(options: UseRegisterDeviceOptions = {}) {
  const router = useRouter();
  const { enabled = true } = options;
  const { onPushPayload, onNotificationOpen } = options;
  const { tokens, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const isLoadingToken = useRef(false);
  const lastRegistrationFingerprintRef = useRef<string | null>(null);
  const invalidTokenRegistryRef = useRef<Set<string>>(new Set());
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);
  const retryLoadtoken = useRef(0);

  const loadTokens = async () => {
    if (isLoadingToken.current) return;

    isLoadingToken.current = true;
    const token = await triggerWebPushPermissionAndToken();

    if(Notification.permission === 'denied'){
      setNotificationPermissionStatus('denied');
      console.info('[Devices] Permiso de notificaciones denegado por el usuario.');
      isLoadingToken.current = false;
      return;
    }
    
    if(!token){
      if(retryLoadtoken.current >= 3){
        console.warn('[Devices] Máximo de reintentos para cargar el token alcanzado.');
        isLoadingToken.current = false;
        return;
      }

      retryLoadtoken.current += 1;
      console.error(`[Devices] Token no disponible. Intentando cargar token (intento ${retryLoadtoken.current})...`);
      isLoadingToken.current = false;
      await loadTokens();
      return;
    }

      setNotificationPermissionStatus(Notification.permission);
      setToken(token);
      isLoadingToken.current = false;
  }

  useEffect(() => {
    if(Platform.OS === 'web' && 'Notification' in window && enabled){
      loadTokens();
    }
  }, [enabled]);

  useEffect(() => {
    const setUpListener = async () => {
      if (!token || !enabled) return;

      const m = await messaging();
      if (!m) return;

      const unsubscribe = onMessage(m, (payload) => {
        onPushPayload?.(payload, 'web-foreground');

        if (Notification.permission !== 'granted') return;

        const link = payload?.data?.link || payload?.data?.url || null;

        const n = new Notification(payload.notification?.title || 'Nueva notificación', {
          body: payload.notification?.body,
          icon: '/assets/images/icon-1024.png',
          data: link ? { url: link } : undefined,
        });

        n.onclick = (event) => {
          event.preventDefault();
          const nextLink = (event.target as Notification | null)?.data?.url || null;
          if (nextLink) {
            router.push(nextLink as any);
            onNotificationOpen?.(payload);
          } else {
            console.log('[Devices] Notificación recibida sin link:', payload);
          }
        };
      });

      return unsubscribe;
    };

    const handleServiceWorkerMessage = (event: MessageEvent<{ type?: string; payload?: unknown }>) => {
      if (event.data?.type !== 'PUSH_NOTIFICATION') {
        return;
      }
      onPushPayload?.(event.data.payload, 'web-service-worker');
    };

    let unsubscribe: Unsubscribe | null = null;

    if (Platform.OS === 'web' && token && enabled) {
      setUpListener().then((u) => {
        if (u) {
          unsubscribe = u;
        }
      });

      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }
    }

    return () => {
      unsubscribe?.();
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [onNotificationOpen, onPushPayload, router, token, enabled]);

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

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    const onReceived = Notifications.addNotificationReceivedListener((notification) => {
      onPushPayload?.(notification.request.content.data, 'native');
    });

    const onResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response.notification.request.content.data;
      onPushPayload?.(payload, 'native');
      onNotificationOpen?.(payload);
    });

    const response = Notifications.getLastNotificationResponse();

    if (response) {
      const payload = response.notification.request.content.data;
      onPushPayload?.(payload, 'native');
      onNotificationOpen?.(payload);

      const notificationsModule = Notifications as typeof Notifications & {
        clearLastNotificationResponse?: () => void;
      };
      notificationsModule.clearLastNotificationResponse?.();
    }

    return () => {
      onReceived.remove();
      onResponse.remove();
    };
  }, [enabled, onNotificationOpen, onPushPayload]);


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
            isLoadingToken.current = false;
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
            isLoadingToken.current = false;
          }
          return;
        }

        // Obtener el project ID
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

        if (!projectId) {
          console.warn('Project ID not found for push notifications');
          if (isMounted) {
            isLoadingToken.current = false;
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
          isLoadingToken.current = false;
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

    const pushToken = Platform.OS === 'web' ? token : expoPushToken;

    if (pushToken && tokens?.accessToken && isAuthenticated) {
      if (invalidTokenRegistryRef.current.has(pushToken)) {
        console.warn('[Devices] Token marcado como invalido; se omite registro', {
          tokenPreview: pushToken.slice(0, 24),
        });
        return;
      }

      const deviceName = Platform.OS === 'web'
        ? `Web ${navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'}`
        : Device.modelName || Device.osName || 'Unknown Device';
      const platform: 'ios' | 'android' | 'web' =
        Platform.OS === 'web' ? 'web' : (Platform.OS as 'ios' | 'android') || 'android';

      const registrationFingerprint = `${platform}:${tokens.accessToken.slice(0, 10)}:${pushToken}`;
      if (lastRegistrationFingerprintRef.current === registrationFingerprint) {
        return;
      }

      lastRegistrationFingerprintRef.current = registrationFingerprint;
      registerDeviceSafely(tokens.accessToken, pushToken, platform, deviceName, 3).then(async (result) => {
        if (!result.ok) {
          lastRegistrationFingerprintRef.current = null;

          if (result.invalidToken) {
            invalidTokenRegistryRef.current.add(pushToken);
            console.warn(
              '[Devices] Invalid push token while registering device:',
              result.message || 'Unable to register this device for notifications. Request a new token from user action.'
            );
          }
        }
      });
    }
  }, [enabled, expoPushToken, token, tokens?.accessToken, isAuthenticated]);

  return {
    expoPushToken,
    token,
    notificationPermissionStatus,
    isLoadingToken,
  };
}


