import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            retry: 1,
        },
    },
});

export interface KanbanProviderProps {
    children: React.ReactNode;
}

/**
 * Provider de TanStack Query para el Kanban
 * Proporciona cacheo y gestión de estado del servidor
 */
export function KanbanProvider({ children }: KanbanProviderProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function getQueryClient() {
    return queryClient;
}
