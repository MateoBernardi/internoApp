import {
  getUserContext,
  login,
  logout,
  refresh,
  registerUser
} from '@/features/auth/services/authApi';
import type {
  CreateUserData,
  CreateUserResponse,
  LoginResponse,
  RefreshResponse
} from '@/features/auth/types';
import type { UserContext } from '@/shared/users/User';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook para hacer login
 * Mutations no cachean automáticamente, se ejecutan cuando se llamen
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return login(username, password) as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      // Invalidar cualquier query anterior relacionada con auth
      queryClient.removeQueries({ queryKey: ['userContext'] });
    },
  });
}

/**
 * Hook para refrescar tokens
 */
export function useRefresh() {
  return useMutation({
    mutationFn: async (refreshToken: string) => {
      return refresh(refreshToken) as Promise<RefreshResponse>;
    },
  });
}

/**
 * Hook para logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (refreshToken: string) => {
      return logout(refreshToken);
    },
    onSuccess: () => {
      // Limpiar todas las queries de auth
      queryClient.removeQueries({ queryKey: ['userContext'] });
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  });
}

/**
 * Hook para obtener el contexto del usuario (requiere accessToken válido)
 * Este es un query porque se ejecuta automáticamente cuando tenemos token
 */
export function useGetUserContext(accessToken: string | null, enabled = true) {
  return useQuery({
    queryKey: ['userContext', accessToken],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('No access token provided');
      }
      return getUserContext(accessToken) as Promise<UserContext>;
    },
    enabled: enabled && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });
}

/**
 * Hook para registrar un nuevo usuario
 * No requiere autenticación
 */
export function useRegisterUser() {
  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      return registerUser(userData) as Promise<CreateUserResponse>;
    },
  });
}
