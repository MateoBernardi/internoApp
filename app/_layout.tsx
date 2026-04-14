import { DesktopGate } from '@/components/DesktopFallback';
import { Colors } from '@/constants/theme';
import { getQueryClient, QueryProvider } from '@/context/QueryProvider';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterDevice } from '@/features/devices/hooks/useRegisterDevice';
import { prefetchCoreRealtimeData } from '@/features/realtime/prefetchOrchestrator';
import { syncPushPayloadToCache } from '@/features/realtime/querySync';
import { installWebAlertPolyfill } from '@/shared/ui/webAlertPolyfill';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

installWebAlertPolyfill();

export const unstable_settings = {
  anchor: '(tabs)',
};

const colors = Colors['light']; // Usar siempre el tema claro

function RootNavigator() {
  const { isAuthenticated, isLoading, requiresAssociation, tokens, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasUserContext = !!user?.user_context_id;
  const authReadyAndEligible =
    !isLoading && isAuthenticated && !requiresAssociation && !!tokens?.accessToken;
  const authReadyWithUserContext = authReadyAndEligible && hasUserContext;
  const navigateFromNotificationUrl = useCallback(
    (rawUrl: unknown): boolean => {
      if (typeof rawUrl !== 'string') {
        return false;
      }

      const trimmed = rawUrl.trim();
      if (!trimmed) {
        return false;
      }

      try {
        const parsed = new URL(trimmed, 'https://internal-app.local');
        if (parsed.origin !== 'https://internal-app.local') {
          return false;
        }

        const targetPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (!targetPath.startsWith('/')) {
          return false;
        }

        router.push(targetPath as any);
        return true;
      } catch {
        if (trimmed.startsWith('/')) {
          router.push(trimmed as any);
          return true;
        }
        return false;
      }
    },
    [router]
  );
  const handleNotificationOpen = useCallback((rawPayload: unknown) => {
    const payload = (rawPayload ?? {}) as Record<string, unknown>;
    const dynamicUrl = payload.url ?? payload.link ?? payload.path ?? payload.deepLink;

    if (navigateFromNotificationUrl(dynamicUrl)) {
      return;
    }

    const eventType = String(payload.event ?? payload.type ?? '').toLowerCase();
    const solicitudId = Number(payload.solicitud_id ?? payload.solicitudId ?? payload.request_id ?? payload.requestId);
    const actividadId = Number(payload.actividad_id ?? payload.actividadId);

    if (eventType !== 'estado_actualizado' && eventType !== 'status_changed') {
      return;
    }

    if (Number.isFinite(actividadId) && actividadId > 0) {
      router.push({
        pathname: '/(extras)/actividad-detalle' as any,
        params: { id: actividadId.toString(), actividadId: actividadId.toString() },
      });
      return;
    }

    if (Number.isFinite(solicitudId) && solicitudId > 0) {
      const esCreador = Boolean(payload.es_creador ?? payload.is_creator ?? payload.creator);
      router.push({
        pathname: '/(extras)/solicitud' as any,
        params: { id: solicitudId.toString(), type: esCreador ? 'enviada' : 'recibida' },
      });
    }
  },
    [navigateFromNotificationUrl, router]
  );
  // Obtiene el push token, registra el dispositivo y sincroniza cache de queries por eventos push.
  useRegisterDevice({
    enabled: authReadyAndEligible,
    onPushPayload: (payload, source) => {
      if (!authReadyWithUserContext) {
        return;
      }
      syncPushPayloadToCache(getQueryClient(), payload, source);
    },
    onNotificationOpen: handleNotificationOpen,
  });

  useEffect(() => {
    if (!authReadyWithUserContext || !tokens?.accessToken || !user?.rol_nombre || !user?.user_context_id) {
      return;
    }

    prefetchCoreRealtimeData(getQueryClient(), {
      accessToken: tokens.accessToken,
      roleName: user?.rol_nombre,
      userContextId: user?.user_context_id,
      reason: 'post-auth',
    });
  }, [authReadyWithUserContext, tokens?.accessToken, user?.rol_nombre, user?.user_context_id]);

  // Limpiar notificaciones y badge al entrar a la app autenticado (solo native)
  useEffect(() => {
    if (authReadyAndEligible && Platform.OS !== 'web') {
      Notifications.dismissAllNotificationsAsync();
      Notifications.setBadgeCountAsync(0);
    }
  }, [authReadyAndEligible]);

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

  // Si ESTA autenticado, no requiere asociación y sigue en association, redirigir a tabs
  if (isAuthenticated && !requiresAssociation && inAssociationGroup) {
    return <Redirect href="/(tabs)" />;
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
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
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
