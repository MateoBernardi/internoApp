import { getQueryClient } from '@/context/QueryProvider';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGetUserContext, useLogin, useLogout, useRefresh } from '../hooks/useAuthActions';
import { ExtendedUserContext } from '../models/User';

/**
 * Decodifica un JWT y devuelve el payload
 */
function decodeJWT(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Verifica si un token está expirado
 * @param token - JWT token
 * @param marginSeconds - Margen de segundos antes de considerar expirado (default: 10s)
 */
function isTokenExpired(token: string | null, marginSeconds = 10): boolean {
  if (!token) return true;
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + marginSeconds;
}

/**
 * Obtiene el tiempo restante en ms hasta que un token expire
 */
function getTokenExpirationTime(token: string | null): number | null {
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = payload.exp - now;
  return Math.max(secondsLeft * 1000, 0);
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string; // Opcional si requiresAssociation es true
}

interface AuthContextType {
  user: ExtendedUserContext | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresAssociation: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  reloadUserContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUserContext | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [requiresAssociation, setRequiresAssociation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hooks de TanStack Query
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshMutation = useRefresh();
  const userContextQuery = useGetUserContext(tokens?.accessToken ?? null, !!tokens?.accessToken);

  /**
   * Cargar tokens almacenados en SecureStore
   */
  const loadStoredTokens = useCallback(async (): Promise<{ tokens: AuthTokens; requiresAssociation: boolean } | null> => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const requiresAssociationStr = await SecureStore.getItemAsync('requiresAssociation');
      const requiresAssociation = requiresAssociationStr === 'true';

      if (accessToken && (refreshToken || requiresAssociation)) {
        return { 
          tokens: { accessToken, refreshToken: refreshToken ?? undefined },
          requiresAssociation 
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading stored tokens:', error);
      return null;
    }
  }, []);

  /**
   * Guardar tokens en SecureStore
   */
  const saveTokens = useCallback(async (newTokens: AuthTokens) => {
    try {
      await SecureStore.setItemAsync('accessToken', newTokens.accessToken);
      if (newTokens.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', newTokens.refreshToken);
      } else {
        await SecureStore.deleteItemAsync('refreshToken');
      }
      setTokens(newTokens);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  }, []);

  /**
   * Limpiar tokens almacenados
   */
  const clearStoredTokens = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('requiresAssociation');
      setTokens(null);
      setUser(null);
      setRequiresAssociation(false);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }, []);

  /**
   * Refrescar tokens usando el refreshToken
   */
  const refreshTokens = useCallback(async () => {
    if (!tokens?.refreshToken) {
      // Si no hay refreshToken, limpiar tokens (usuario en estado requiresAssociation)
      await clearStoredTokens();
      return;
    }

    try {
      const response = await refreshMutation.mutateAsync(tokens.refreshToken);
      const newTokens: AuthTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };
      await saveTokens(newTokens);
      
      // Invalidar y refetch del user context
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({ queryKey: ['userContext'] });
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      await clearStoredTokens();
      throw error;
    }
  }, [tokens?.refreshToken, refreshMutation, saveTokens, clearStoredTokens]);

  /**
   * Recargar el contexto del usuario
   */
  const reloadUserContext = useCallback(async () => {
    if (!tokens?.accessToken) return;

    try {
      const queryClient = getQueryClient();
      await queryClient.invalidateQueries({ queryKey: ['userContext', tokens.accessToken] });
      await queryClient.refetchQueries({ queryKey: ['userContext', tokens.accessToken] });
    } catch (error) {
      console.error('Error reloading user context:', error);
    }
  }, [tokens?.accessToken]);

  /**
   * Sign In con username y password
   */
  const signIn = useCallback(
    async (username: string, password: string) => {
      try {
        const response = await loginMutation.mutateAsync({ username, password });

        if (response.accessToken) {
          // Si requiresAssociation es true, el servidor envía solo accessToken
          const newTokens: AuthTokens = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken, // Será undefined si requiresAssociation es true
          };
          await saveTokens(newTokens);
          
          const reqAssoc = response.requiresAssociation || false;
          setRequiresAssociation(reqAssoc);
          
          if (reqAssoc) {
            await SecureStore.setItemAsync('requiresAssociation', 'true');
          } else {
            await SecureStore.deleteItemAsync('requiresAssociation');
          }

          // Solo cargar contexto del usuario si NO requiere asociación
          if (!response.requiresAssociation) {
            const queryClient = getQueryClient();
            queryClient.invalidateQueries({ queryKey: ['userContext'] });
          }
        } else {
          throw new Error(response.message || 'Login failed');
        }
      } catch (error) {
        console.error('Error signing in:', error);
        throw error;
      }
    },
    [loginMutation, saveTokens]
  );

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    try {
      if (tokens?.refreshToken) {
        // Notificar al servidor
        await logoutMutation.mutateAsync(tokens.refreshToken);
      }
    } catch (error) {
      console.error('Error notifying logout to server:', error);
    } finally {
      // Siempre limpiar tokens locales
      await clearStoredTokens();
      const queryClient = getQueryClient();
      queryClient.clear();
    }
  }, [tokens?.refreshToken, logoutMutation, clearStoredTokens]);

  /**
   * Configurar timer para refrescar token automáticamente
   */
  const setupTokenRefreshTimer = useCallback(() => {
    // Limpiar timer anterior
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    if (!tokens?.accessToken) return;

    const expirationTime = getTokenExpirationTime(tokens.accessToken);
    if (!expirationTime) return;

    // Refrescar 5 minutos antes de que expire
    const refreshIn = Math.max(expirationTime - 5 * 60 * 1000, 0);

    refreshTimerRef.current = setTimeout(() => {
      refreshTokens().catch((error) => {
        console.error('Auto-refresh failed:', error);
      });
    }, refreshIn);
  }, [tokens?.accessToken, refreshTokens]);

  /**
   * Efecto: cargar tokens al inicializar
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedData = await loadStoredTokens();
        
        if (storedData) {
          const { tokens: storedTokens, requiresAssociation: storedReqAssoc } = storedData;

          // Si el token está expirado, intentar refrescar si tenemos refreshToken
          if (isTokenExpired(storedTokens.accessToken)) {
            try {
              if (storedTokens.refreshToken) {
                const response = await refreshMutation.mutateAsync(storedTokens.refreshToken);
                const newTokens: AuthTokens = {
                  accessToken: response.accessToken,
                  refreshToken: response.refreshToken,
                };
                setTokens(newTokens);
                await saveTokens(newTokens);
                // Si refrescamos exitosamente, asumimos que ya no requiere asociación (o mantenemos estado?)
                // Generalmente refresh implica sesión válida completa, pero si estábamos en asociación...
                // El backend decide si necesitamos asociación. Por ahora asumimos false o mantenemos storedReqAssoc?
                // Si refrescamos, el backend nos daría un token nuevo.
              } else {
                // No hay refreshToken (usuario en requiresAssociation), limpiar
                await clearStoredTokens();
              }
            } catch (error) {
              console.error('Error refreshing expired token on init:', error);
              await clearStoredTokens();
            }
          } else {
            setTokens(storedTokens);
            setRequiresAssociation(storedReqAssoc);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [loadStoredTokens, saveTokens, clearStoredTokens, refreshMutation.mutateAsync]);

  /**
   * Efecto: actualizar user cuando userContextQuery cambia
   */
  useEffect(() => {
    if (userContextQuery.data) {
      setUser(userContextQuery.data);
      setRequiresAssociation(false);
    } else if (userContextQuery.isError) {
      setUser(null);
      // No limpiar tokens, solo el contexto de usuario
    }
  }, [userContextQuery.data, userContextQuery.isError]);

  /**
   * Efecto: configurar timer de auto-refresh cuando tokens cambian
   */
  useEffect(() => {
    setupTokenRefreshTimer();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [setupTokenRefreshTimer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!tokens?.accessToken && !isTokenExpired(tokens?.accessToken),
        requiresAssociation,
        signIn,
        signOut,
        refreshTokens,
        reloadUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
