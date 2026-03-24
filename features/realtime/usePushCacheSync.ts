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

interface UsePushCacheSyncOptions {
  onNotificationOpen?: (payload: unknown) => void;
}

export function usePushCacheSync(enabled: boolean, options?: UsePushCacheSyncOptions) {
  const queryClient = useQueryClient();
  const onNotificationOpen = options?.onNotificationOpen;

  useEffect(() => {
    if (!enabled) return;

    if (Platform.OS === 'web') {
      let unsubscribeForeground: (() => void) | null = null;

      onForegroundMessage((payload) => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && payload.title) {
          new Notification(payload.title, {
            body: payload.body,
            icon: '/assets/images/icon-1024.png',
          });
        }

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
      const payload = response.notification.request.content.data;
      syncPushPayloadToCache(queryClient, payload, 'native');
      onNotificationOpen?.(payload);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }

        const payload = response.notification.request.content.data;
        syncPushPayloadToCache(queryClient, payload, 'native-initial');
        onNotificationOpen?.(payload);

        const notificationsModule = Notifications as typeof Notifications & {
          clearLastNotificationResponseAsync?: () => Promise<void>;
        };
        notificationsModule.clearLastNotificationResponseAsync?.().catch(() => null);
      })
      .catch(() => null);

    return () => {
      onReceived.remove();
      onResponse.remove();
    };
  }, [enabled, onNotificationOpen, queryClient]);
}
