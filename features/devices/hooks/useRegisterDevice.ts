import { useAuth } from '@/features/auth/context/AuthContext';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { registerDeviceSafely } from '../services/devicesApi';

/**
 * Hook para gestionar el registro del dispositivo
 * Obtiene el push token, configura las notificaciones y registra el dispositivo
 * cuando el usuario esté autenticado
 */
export function useRegisterDevice() {
  const { tokens, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

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

  // Request de permisos de notificaciones y obtener el push token
  useEffect(() => {
    let isMounted = true;

    const setupPushNotifications = async () => {
      try {
        if (!Device.isDevice) {
          console.log('Push notifications disabled: not a physical device');
          if (isMounted) {
            setIsLoadingToken(false);
          }
          return;
        }

        // Verificar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
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
          console.log('✓ Push token obtenido:', token.substring(0, 20) + '...');
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

    return () => {
      isMounted = false;
    };
  }, []);

  // Registrar el dispositivo cuando esté autenticado y tengamos el token
  useEffect(() => {
    if (expoPushToken && tokens?.accessToken && isAuthenticated) {
      const deviceName = Device.modelName || Device.osName || 'Unknown Device';
      const platform = (Platform.OS as 'ios' | 'android') || 'android';

      registerDeviceSafely(tokens.accessToken, expoPushToken, platform, deviceName);
    }
  }, [expoPushToken, tokens?.accessToken, isAuthenticated]);

  return {
    expoPushToken,
    isLoadingToken,
  };
}


