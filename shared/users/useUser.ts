import { getValidAccessToken } from "@/features/auth/services/authApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getUserByRole, searchUsers } from "./userApi";

// 1. Hook para el Debounce
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

export function useSearchUsers(query: string) {
    const debouncedQuery = useDebounce(query, 300);
    
    return useQuery({
        queryKey: ["searchUsers", debouncedQuery],
        queryFn: async ({signal}) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return searchUsers(token, debouncedQuery, signal);
        },
        enabled: query.length > 1,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useGetUserByRole(role: string) {
    return useQuery({
        queryKey: ["getUserByRole", role],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getUserByRole(token, role);
        },
        enabled: !!role,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}