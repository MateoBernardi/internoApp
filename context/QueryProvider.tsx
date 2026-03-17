import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnReconnect: true,
            refetchOnMount: true,
        },
        mutations: {
            retry: false,
        },
    },
});

export interface QueryProviderProps {
    children: React.ReactNode;
}

/**
 * Provider de TanStack Query
 * Proporciona cacheo y gestión de estado del servidor
 */
export function QueryProvider({ children }: QueryProviderProps) {
    useEffect(() => {
        focusManager.setEventListener((handleFocus) => {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
                const onVisibilityChange = () => {
                    handleFocus(document.visibilityState === 'visible');
                };

                const onFocus = () => handleFocus(true);
                const onBlur = () => handleFocus(false);

                document.addEventListener('visibilitychange', onVisibilityChange, false);
                window.addEventListener('focus', onFocus, false);
                window.addEventListener('blur', onBlur, false);

                return () => {
                    document.removeEventListener('visibilitychange', onVisibilityChange);
                    window.removeEventListener('focus', onFocus);
                    window.removeEventListener('blur', onBlur);
                };
            }

            const subscription = AppState.addEventListener('change', (status) => {
                handleFocus(status === 'active');
            });

            return () => subscription.remove();
        });

        onlineManager.setEventListener((setOnline) => {
            if (Platform.OS !== 'web' || typeof window === 'undefined') {
                setOnline(true);
                return () => undefined;
            }

            const updateOnline = () => {
                setOnline(window.navigator.onLine);
            };

            window.addEventListener('online', updateOnline, false);
            window.addEventListener('offline', updateOnline, false);
            updateOnline();

            return () => {
                window.removeEventListener('online', updateOnline);
                window.removeEventListener('offline', updateOnline);
            };
        });
    }, []);

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function getQueryClient() {
    return queryClient;
}
