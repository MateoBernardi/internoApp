import { DesktopGate } from '@/components/DesktopFallback';
import { Colors } from '@/constants/theme';
import { QueryProvider } from '@/context/QueryProvider';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterDevice } from '@/features/devices/hooks/useRegisterDevice';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

const colors = Colors['light']; // Usar siempre el tema claro

function RootNavigator() {
  const { isAuthenticated, isLoading, requiresAssociation } = useAuth();
  const segments = useSegments();
  // Obtiene el push token y lo registra automáticamente cuando esté autenticado
  useRegisterDevice();

  // Limpiar notificaciones y badge al entrar a la app autenticado (solo native)
  useEffect(() => {
    if (isAuthenticated && !requiresAssociation && Platform.OS !== 'web') {
      Notifications.dismissAllNotificationsAsync();
      Notifications.setBadgeCountAsync(0);
    }
  }, [isAuthenticated, requiresAssociation]);

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </View>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inAssociationGroup = segments[0] === '(association)';

  // Si está autenticado, requiere asociación, y NO está en association, redirigir
  if (isAuthenticated && requiresAssociation && !inAssociationGroup) {
    return <Redirect href="/asociar" />;
  }

  // Si NO está autenticado y NO está en el grupo (auth), redirigir a login
  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  // Si ESTÁ autenticado, no requiere asociación, y está intentando acceder a (auth), redirigir a tabs
  if (isAuthenticated && !requiresAssociation && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(extras)" options={{ headerShown: false }} />
        <Stack.Screen name="(association)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Configurar el manejador de notificaciones (solo native)
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Permitir que AuthProvider y el hook useRegisterDevice se encarguen de registrar el dispositivo
  // cuando el usuario esté autenticado
  return (
    <DesktopGate>
      <QueryProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryProvider>
    </DesktopGate>
  );
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
