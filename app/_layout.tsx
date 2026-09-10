import { DesktopGate } from '@/components/DesktopFallback';
import { Colors } from '@/constants/theme';
import { getQueryClient, QueryProvider } from '@/context/QueryProvider';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterDevice } from '@/features/devices/hooks/useRegisterDevice';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { prefetchCoreRealtimeData } from '@/features/realtime/prefetchOrchestrator';
import { syncPushPayloadToCache } from '@/features/realtime/querySync';
import { Notifications } from '@/features/devices/services/notificationsCompat';
import '@/shared/silenceConsole';
import { FullScreenPortalHost } from '@/shared/ui/FullScreenPortal';
import { installWebAlertPolyfill } from '@/shared/ui/webAlertPolyfill';
import { DefaultTheme, Href, Redirect, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

installWebAlertPolyfill();

export const unstable_settings = {
  anchor: '(tabs)',
};

const colors = Colors['light']; // Usar siempre el tema claro

function RootNavigator() {
  const { isAuthenticated, isLoading, requiresAssociation, tokens, user } = useAuth();
  const { isKiosk } = useRoleCheck();
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
        // URL malformada: no navegar a entradas sin validar.
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
    const domain = String(payload.domain ?? '').toLowerCase();

    if (domain === 'reportes') {
      const usuarioReportadoId = Number(payload.usuario_reportado_id);
      if (Number.isFinite(usuarioReportadoId) && usuarioReportadoId > 0) {
        if (usuarioReportadoId === user?.user_context_id) {
          router.push('/(extras)/mis-reportes' as any);
        } else {
          router.push({
            pathname: '/(extras)/detalle-empleados' as any,
            params: {
              selectedUsers: JSON.stringify([{ id: usuarioReportadoId, nombre: '', apellido: '' }]),
              source: 'reportes-encargado',
            },
          });
        }
      }
      return;
    }

    if (eventType !== 'estado_actualizado' && eventType !== 'status_changed') {
      return;
    }

    if (Number.isFinite(actividadId) && actividadId > 0) {
      const rol = String(payload.rol ?? payload.role ?? '');
      router.push({
        pathname: '/(extras)/agenda-personal' as any,
        params: { actividadId: actividadId.toString(), rol },
      });
      return;
    }

    if (Number.isFinite(solicitudId) && solicitudId > 0) {
      const esCreador = Boolean(payload.es_creador ?? payload.is_creator ?? payload.creator);
      router.push({
        pathname: '/(tabs)/explore' as any,
        params: { solicitudId: solicitudId.toString(), type: esCreador ? 'enviada' : 'recibida' },
      });
    }
  },
    [navigateFromNotificationUrl, router, user?.user_context_id]
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
    if (authReadyAndEligible && Platform.OS !== 'web' && Notifications) {
      Notifications.dismissAllNotificationsAsync();
      Notifications.setBadgeCountAsync(0);
    }
  }, [authReadyAndEligible]);

  const inAuthGroup = segments[0] === '(auth)';
  const inAssociationGroup = segments[0] === '(association)';
  const onKioscoQrScreen = segments[0] === '(extras)' && segments[1] === 'kiosco-qr';
  const isKioskUser = isKiosk();

  // Destino al que hay que mandar al usuario según el estado de sesión, o `null` si ya
  // está donde corresponde. Se calcula en vez de hacer `return <Redirect />` temprano:
  // el layout raíz DEBE renderizar siempre un navegador en el primer render. Si devuelve
  // otra cosa, el `replace` del <Redirect> no lo atiende ningún navegador, la condición
  // nunca se limpia y expo-router vuelve a despachar la navegación en cada render
  // ("Maximum update depth exceeded").
  const redirectHref = useMemo<Href | null>(() => {
    if (isLoading) {
      return null;
    }

    // Autenticado pero sin asociar: sólo puede estar en (association).
    if (isAuthenticated && requiresAssociation) {
      return inAssociationGroup ? null : '/asociar';
    }

    // Sin sesión: sólo puede estar en (auth).
    if (!isAuthenticated) {
      return inAuthGroup ? null : '/login';
    }

    // Kiosco: rol dedicado a mostrar el QR rotativo de una sede. No es un empleado ni un
    // rol administrativo, así que nunca debe llegar a los tabs normales de la app.
    if (isKioskUser) {
      return onKioscoQrScreen ? null : '/(extras)/kiosco-qr';
    }

    // Sesión válida: (auth) y (association) ya no son destinos posibles.
    if (inAuthGroup || inAssociationGroup) {
      return '/(tabs)';
    }

    return null;
  }, [
    isLoading,
    isAuthenticated,
    requiresAssociation,
    isKioskUser,
    inAuthGroup,
    inAssociationGroup,
    onKioscoQrScreen,
  ]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <FullScreenPortalHost>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(extras)" options={{ headerShown: false }} />
          <Stack.Screen name="(association)" options={{ headerShown: false }} />
        </Stack>
        {redirectHref && <Redirect href={redirectHref} />}
        {/* Tapa el navegador mientras se resuelve la sesión, en vez de reemplazarlo. */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.lightTint} />
          </View>
        )}
      </FullScreenPortalHost>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Permitir que AuthProvider y el hook useRegisterDevice se encarguen de registrar el dispositivo
  // cuando el usuario esté autenticado
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <DesktopGate>
          <QueryProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryProvider>
        </DesktopGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

if (Platform.OS !== 'web' && Notifications) {
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
  gestureRoot: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
