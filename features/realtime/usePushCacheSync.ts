import { onForegroundMessage } from '@/features/devices/services/webPush';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { syncPushPayloadToCache } from './querySync';

interface ServiceWorkerPushMessage {
  type?: string;
  payload?: unknown;
}

export function usePushCacheSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    if (Platform.OS === 'web') {
      let unsubscribeForeground: (() => void) | null = null;

      onForegroundMessage((payload) => {
        syncPushPayloadToCache(queryClient, payload, 'web-foreground');
      }).then((unsubscribe) => {
        unsubscribeForeground = unsubscribe;
      });

      const handleServiceWorkerMessage = (event: MessageEvent<ServiceWorkerPushMessage>) => {
        if (event.data?.type !== 'PUSH_NOTIFICATION') {
          return;
        }

        syncPushPayloadToCache(queryClient, event.data.payload, 'web-service-worker');
      };

      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }

      return () => {
        unsubscribeForeground?.();
        if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    }

    const onReceived = Notifications.addNotificationReceivedListener((notification) => {
      syncPushPayloadToCache(queryClient, notification.request.content.data, 'native');
    });

    const onResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      syncPushPayloadToCache(queryClient, response.notification.request.content.data, 'native');
    });

    return () => {
      onReceived.remove();
      onResponse.remove();
    };
  }, [enabled, queryClient]);
}
