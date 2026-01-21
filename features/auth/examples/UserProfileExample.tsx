/**
 * EJEMPLO DE USO - Componente de Usuario
 * 
 * Este ejemplo muestra cómo usar la nueva arquitectura de autenticación:
 * - useAuth() para leer el estado
 * - useAuthActions() para ejecutar acciones
 */

import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export function UserProfileExample() {
  // 1. LEER ESTADO (Solo lectura, no acciones)
  const { 
    user,              // Usuario actual
    userContext,       // Contexto con cuentas
    isLoading,         // ¿Está cargando?
    isAuthenticated,   // ¿Está autenticado?
    loadUserContext    // Refrescar datos del usuario
  } = useAuth();

  // 2. EJECUTAR ACCIONES (Solo acciones, no estado)
  const { logout } = useAuthActions();

  // 3. Manejar eventos
  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            // El contexto se limpia automáticamente
            // La UI se actualiza sin hacer nada más
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    // Refrescar datos del usuario desde la API
    await loadUserContext();
    Alert.alert('Éxito', 'Perfil actualizado');
  };

  // 4. Renderizar UI
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Cargando perfil...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <Text>No has iniciado sesión</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Información del usuario */}
      <View style={styles.card}>
        <Text style={styles.title}>Perfil de Usuario</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{user.id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Usuario:</Text>
          <Text style={styles.value}>{user.username}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>

        {user.nombre && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{user.nombre} {user.apellido}</Text>
          </View>
        )}
      </View>

      {/* Cuentas asociadas */}
      {userContext?.cuentas && userContext.cuentas.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>Cuentas Asociadas</Text>
          <Text style={styles.value}>
            Total: {userContext.cuentas.length}
          </Text>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={handleRefresh}
        >
          <Text style={styles.buttonTextSecondary}>Refrescar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonDanger]} 
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==========================================
// EJEMPLO 2: Hook personalizado
// ==========================================

/**
 * Hook personalizado que combina estado y acciones
 * para un caso de uso específico
 */
export function useUserProfile() {
  const { user, userContext, isLoading } = useAuth();
  const { logout } = useAuthActions();

  const fullName = user 
    ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.username
    : 'Invitado';

  const accountCount = userContext?.cuentas?.length || 0;

  return {
    user,
    fullName,
    accountCount,
    isLoading,
    logout,
  };
}

// Uso del hook personalizado
export function UserHeaderExample() {
  const { fullName, accountCount, logout } = useUserProfile();

  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>Hola, {fullName}</Text>
      <Text style={styles.subtext}>{accountCount} cuentas</Text>
      <TouchableOpacity onPress={logout}>
        <Text style={styles.link}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
}

// ==========================================
// EJEMPLO 3: Proteger rutas
// ==========================================

/**
 * Componente que protege rutas privadas
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text>Debes iniciar sesión para acceder a esta página</Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Uso
export function PrivateScreen() {
  return (
    <ProtectedRoute>
      <UserProfileExample />
    </ProtectedRoute>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  actions: {
    marginTop: 20,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  link: {
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
