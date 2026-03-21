import { authSessionService, AuthSessionSnapshot, AuthTokens } from '@/features/auth/services/AuthSessionService';
import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
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

interface AuthContextType {
  user: ExtendedUserContext | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresAssociation: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoggingOut: boolean;
  refreshTokens: () => Promise<void>;
  reloadUserContext: () => Promise<void>;
  /** Setea tokens directamente (ej: post-asociación) sin llamar al endpoint de login */
  setAuthTokens: (accessToken: string, refreshToken?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    authSessionService.subscribe,
    authSessionService.getSnapshot,
    authSessionService.getSnapshot
  ) as AuthSessionSnapshot;

  useEffect(() => {
    authSessionService.initialize().catch((error) => {
      console.error('Error initializing auth:', error);
    });
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user: snapshot.user,
      tokens: snapshot.tokens,
      isLoading: snapshot.isLoading,
      isAuthenticated:
        !!snapshot.tokens?.accessToken && !isTokenExpired(snapshot.tokens.accessToken),
      requiresAssociation: snapshot.requiresAssociation,
      signIn: authSessionService.signIn,
      signOut: authSessionService.signOut,
      isLoggingOut: snapshot.isLoggingOut,
      refreshTokens: authSessionService.refreshTokens,
      reloadUserContext: authSessionService.reloadUserContext,
      setAuthTokens: authSessionService.setAuthTokens,
    }),
    [snapshot]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
