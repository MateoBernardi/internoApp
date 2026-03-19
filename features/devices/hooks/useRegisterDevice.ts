import { useAuth } from '@/features/auth/context/AuthContext';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
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
            Alert.alert(
              'Notificaciones',
              result.message || 'No pudimos registrar este dispositivo para notificaciones. Vamos a solicitar un token nuevo.'
            );

            if (platform === 'web') {
              await refreshWebPushToken();
            }
          }
        }
      });
    }
  }, [expoPushToken, tokens?.accessToken, isAuthenticated, refreshWebPushToken]);

  return {
    expoPushToken,
    isLoadingToken,
  };
}


