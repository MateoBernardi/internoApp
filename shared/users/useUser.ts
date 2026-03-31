import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { UpdatePasswordRequest, UpdateUserRequest, UserSummary } from "./User";
import { bajaUsuario, getUserByRole, searchUsers, updatePassword, updateUserData, updateUserRole } from "./userApi";
import type { UsuarioEntidadDTO } from "./UserDTO";

interface SearchResponse {
  success: boolean;
  data: UsuarioEntidadDTO[];
}

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
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: ["searchUsers", debouncedQuery],
        queryFn: async ({signal}) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return searchUsers(token, debouncedQuery, signal);
        },
        select: (response: SearchResponse): UserSummary[] => {
            return response.data.map((user): UserSummary => ({
            user_context_id: user.user_context_id,
            id_usuario: user.id_usuario,
            username: user.username,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            role: [user.rol_nombre],
            }));
        },
        enabled: query.length > 1,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useGetUserByRole(role: string) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ["getUserByRole", role],
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getUserByRole(token, role);
        },
        select: (response: SearchResponse): UserSummary[] => {
            return response.data.map((user): UserSummary => ({
            user_context_id: user.user_context_id,
            id_usuario: user.id_usuario,
            username: user.username,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            role: [user.rol_nombre],
            }));
        },
        enabled: !!role,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

// Hook para actualizar datos del usuario autenticado
export function useUpdateUserData() {
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (userData: UpdateUserRequest) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return updateUserData(token, userData);
        },
    });
}

// Hook para actualizar contraseña del usuario autenticado
export function useUpdatePassword() {
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({ oldPassword, newPassword }: UpdatePasswordRequest) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return updatePassword(token, oldPassword, newPassword);
        },
    });
}

// Hook para actualizar rol de un usuario (requiere permisos de admin)
export function useUpdateUserRole() {
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return updateUserRole(token, userId, roleId);
        },
    });
}

// Hook para dar de baja a un usuario (solo gerencia)
export function useBajaUsuario() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return bajaUsuario(token, userId);
        },
        onSuccess: () => {
            // Invalidar queries de usuarios para refrescar datos
            queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
            queryClient.invalidateQueries({ queryKey: ['getUserByRole'] });
        },
    });
}