import { Colors } from '@/constants/theme';
import { QueryProvider } from '@/context/QueryProvider';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

const colors = Colors['light']; // Usar siempre el tema claro

function RootNavigator() {
  const { isAuthenticated, isLoading, requiresAssociation } = useAuth();
  const segments = useSegments();

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color= {colors.lightTint} />
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
  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
