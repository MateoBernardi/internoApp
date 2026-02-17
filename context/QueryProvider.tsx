import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function getQueryClient() {
    return queryClient;
}
