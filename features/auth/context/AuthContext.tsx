import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExtendedUserContext } from '../models/User';
import { getUserContext, getValidAccessToken } from '../services/authApi';

interface AuthContextType {
  user: ExtendedUserContext | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadUserContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserContext = async () => {
    try {
      const token = await getValidAccessToken();
      if (token) {
        const userData = await getUserContext();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('Error loading user context:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserContext();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string) => {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await loadUserContext();
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signIn, signOut, loadUserContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
