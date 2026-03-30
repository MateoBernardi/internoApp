import { IconSymbol } from '@/components/ui/icon-symbol';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { triggerWebPushPermissionPrompt } from '@/features/devices/hooks/useRegisterDevice';
import { useReportes } from '@/features/reportes/viewmodels/useReportes';
import {
  useInvitaciones,
  useSolicitudesCreadas,
} from '@/features/solicitudesActividades/viewmodels/useSolicitudes';
import {
  useGetSolicitudesLicencias,
  useGetSolicitudesUsuario,
} from '@/features/solicitudesLicencias/viewmodels/useSolicitudes';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import Constants from 'expo-constants';
import { Href, Redirect, Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_BASE_HEIGHT = 56;
const DESKTOP_NAV_HEIGHT = 54;
const MENU_MAX_WIDTH = 280;
const MENU_SIDE_PADDING = 8;

interface MenuOption {
  id: string;
  label: string;
  route?: Href;
  onPress?: () => void;
  textColor?: string;
  hasBadge?: boolean;
  showChevron?: boolean;
}

export default function TabLayout() {
  const { user, signOut, isLoggingOut, isAuthenticated, requiresAssociation } = useAuth();
  const { hasRole, isKnownRole, isEmployee, isContableOrSistemas } = useRoleCheck();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const shouldRedirectUnknownRole = Boolean(user?.rol_nombre) && !isKnownRole();

  useEffect(() => {
    if (shouldRedirectUnknownRole) {
      signOut();
    }
  }, [shouldRedirectUnknownRole, signOut]);

  const isRolePending = !user?.rol_nombre;
  const isEmployeeUser = isRolePending || isEmployee();
  const isEncargado = !isRolePending && hasRole('encargado');
  const hideExplore = isEmployeeUser || isEncargado;
  const hideAdmin = isEmployeeUser;
  const hasSolicitudesTab = !hideExplore;
  const hasAdminTab = !hideAdmin;
  const hasSessionContext = isAuthenticated && !requiresAssociation && !!user?.user_context_id;
  const canSeeAdminReportesButton = !isContableOrSistemas();
  const canSeeActivityRequests = isEmployeeUser || isEncargado;
  const canSeeLicenciasAdmin = hasAdminTab;
  const canSeeReportesAdmin = hasAdminTab && canSeeAdminReportesButton;
  const canSeeLicenciasPersonal = !hasAdminTab;
  const canSeeReportesPersonal = !hasAdminTab;
  const userContextId = user?.user_context_id?.toString();
  const colors = Colors['light'];
  const [activeMenu, setActiveMenu] = useState<'personal' | 'admin' | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRequestingWebPush, setIsRequestingWebPush] = useState(false);
  const hasShownWebPushDialogRef = useRef(false);
  const responsiveLayout = useResponsiveLayout();
  const isDesktopWeb = Platform.OS === 'web' && responsiveLayout.isDesktop;
  const currentTab = useMemo(() => (segments[1] as string) || 'index', [segments]);
  const firebaseConfig = Constants.expoConfig?.extra?.FIREBASE_WEB;
  const hasFirebaseConfig =
    !!firebaseConfig &&
    typeof firebaseConfig.apiKey === 'string' &&
    firebaseConfig.apiKey.length > 0 &&
    firebaseConfig.apiKey !== 'TU_API_KEY_WEB' &&
    typeof firebaseConfig.projectId === 'string' &&
    firebaseConfig.projectId.length > 0 &&
    typeof firebaseConfig.messagingSenderId === 'string' &&
    firebaseConfig.messagingSenderId.length > 0 &&
    typeof firebaseConfig.appId === 'string' &&
    firebaseConfig.appId.length > 0;
  const vapidKey = Constants.expoConfig?.extra?.VAPID_PUBLIC_KEY;
  const hasVapid = !!vapidKey && vapidKey !== 'TU_VAPID_PUBLIC_KEY';

  const { data: invitaciones = [] } = useInvitaciones(canSeeActivityRequests && hasSessionContext);
  const { data: solicitudesEnviadas = [] } = useSolicitudesCreadas(canSeeActivityRequests && hasSessionContext);
  const { data: solicitudesLicenciasAdmin = [] } = useGetSolicitudesLicencias(
    canSeeLicenciasAdmin && hasSessionContext ? {} : undefined
  );
  const { data: solicitudesLicenciasPersonal = [] } = useGetSolicitudesUsuario(
    canSeeLicenciasPersonal && hasSessionContext
  );
  const { data: reportesAdmin = [] } = useReportes(
    userContextId,
    canSeeReportesAdmin && hasSessionContext
  );
  const { data: reportesPersonal = [] } = useReportes(
    userContextId,
    canSeeReportesPersonal && hasSessionContext
  );

  const hasSolicitudesActividadesPendientesRecibidas = invitaciones.some((item) =>
    ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'].includes(item.estado)
  );

  const hasSolicitudesActividadesPendientesEnviadas = solicitudesEnviadas.some(
    (item) => item.estado === 'MODIFIED'
  );

  const hasSolicitudesActividadesPendientes =
    hasSolicitudesActividadesPendientesRecibidas ||
    hasSolicitudesActividadesPendientesEnviadas;

  const hasSolicitudesLicenciasPendientesAdmin = solicitudesLicenciasAdmin.some((item) =>
    ['PENDIENTE', 'PENDIENTE_DOCUMENTACION', 'PENDIENTE_APROBACION'].includes(item.estado)
  );

  const hasSolicitudesLicenciasPendientesPersonal = solicitudesLicenciasPersonal.some((item) =>
    ['PENDIENTE_DOCUMENTACION'].includes(item.estado)
  );

  const hasReportesPendientesAdmin = reportesAdmin.some((item) => item.estado === 'PENDIENTE');
  const hasReportesPendientesPersonal = reportesPersonal.some((item) => item.estado === 'PENDIENTE');

  const hasSolicitudesBadgeInTab = hasSolicitudesTab && hasSolicitudesActividadesPendientes;
  const hasSolicitudesBadgeInHome = !hasSolicitudesTab && hasSolicitudesActividadesPendientes;

  const hasAdminBadge =
    hasAdminTab &&
    (hasSolicitudesLicenciasPendientesAdmin ||
      (canSeeAdminReportesButton && hasReportesPendientesAdmin));

  const administrationMenuOptions: MenuOption[] = [
    ...(canSeeAdminReportesButton ? [{
      id: 'reportes',
      label: 'Reportes',
      route: isEncargado ? '/(extras)/reportes-encargado' as Href : '/(extras)/reportes' as Href,
      hasBadge: hasReportesPendientesAdmin,
    }] : []),
    ...(!hasRole(['consejo', 'presidencia']) ? [{
      id: 'solicitudes-licencias',
      label: 'Solicitudes de Licencias',
      route: '/(extras)/solicitudes-licencias' as Href,
      hasBadge: hasSolicitudesLicenciasPendientesAdmin,
    }] : []),
    ...(!isEncargado ? [{
      id: 'encuestas',
      label: 'Encuestas',
      route: '/(extras)/encuestas' as Href,
    }] : []),
    ...(hasRole('gerencia') ? [{
      id: 'empleados',
      label: 'Gestión de Roles',
      route: '/(extras)/cambiar-rol' as Href,
    }] : []),
  ];

  const hideMisReportes = hasRole(['gerencia', 'personasRelaciones', 'consejo', 'contable', 'sistemas', 'presidencia']);
  const hideMisLicencias = hasRole(['consejo', 'presidencia', 'contable', 'sistemas']);

  const personalMenuOptions: MenuOption[] = [
    {
      id: 'agenda-personal',
      label: 'Agenda Personal',
      route: '/(extras)/agenda-personal' as Href,
    },
    ...(!hideMisLicencias ? [{
      id: 'mis-solicitudes',
      label: 'Mis Licencias',
      route: '/(extras)/mis-solicitudes-licencias' as Href,
      hasBadge: hasSolicitudesLicenciasPendientesPersonal,
    }] : []),
    ...(!hideMisReportes ? [{
      id: 'mis-reportes',
      label: 'Mis Reportes',
      route: '/(extras)/mis-reportes' as Href,
      hasBadge: hasReportesPendientesPersonal,
    }] : []),
    {
      id: 'configuracion-cuenta',
      label: 'Configuración de Cuenta',
      route: '/(extras)/editar-usuario' as Href,
    },
    {
      id: 'cerrar-sesion',
      label: 'Cerrar Sesión',
      onPress: signOut,
      textColor: '#FF3B30',
      showChevron: false,
    }
  ];

  const hasPersonalBadge = personalMenuOptions.some((option) => !!option.hasBadge);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasSessionContext || isRequestingWebPush) {
      return;
    }

    if (!hasFirebaseConfig || !hasVapid) {
      return;
    }

    if (typeof window === 'undefined' || !window.isSecureContext || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'default') {
      return;
    }

    if (hasShownWebPushDialogRef.current) {
      return;
    }

    hasShownWebPushDialogRef.current = true;

    const wantsNotifications = window.confirm(
      'Quieres recibir notificaciones de tus mensajes?'
    );

    if (!wantsNotifications) {
      return;
    }

    const requestWebPushFromDialog = async () => {
      setIsRequestingWebPush(true);

      try {
        const result = await triggerWebPushPermissionPrompt();

        if (result.permission === 'granted') {
          return;
        }

        if (result.permission === 'denied') {
          window.alert('No podremos enviarte notificaciones porque el permiso fue denegado.');
          return;
        }

        if (result.permission === 'default') {
          window.alert('No se pudo completar la accion. Si quieres, vuelve a intentar desde el proximo inicio de sesion.');
          return;
        }

        if (result.permission === 'unsupported') {
          window.alert('Este navegador o contexto no soporta notificaciones push.');
          return;
        }

        window.alert('No pudimos activar notificaciones en este momento.');
      } catch {
        window.alert('No pudimos activar notificaciones en este momento.');
      } finally {
        setIsRequestingWebPush(false);
      }
    };

    void requestWebPushFromDialog();
  }, [hasFirebaseConfig, hasSessionContext, hasVapid, isRequestingWebPush]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasShownWebPushDialogRef.current = false;
    }
  }, [isAuthenticated]);

  const handlePress = (menuType: 'personal' | 'admin') => {
    if (activeMenu === menuType) {
      setActiveMenu(null); // Si ya está abierto, lo cierra (se vuelve cruz -> icono normal)
    } else {
      setActiveMenu(menuType); // Abre el menú correspondiente
    }
  };

  const handleMenuOptionPress = (option: MenuOption) => {
    setActiveMenu(null);
    if (option.onPress) {
      option.onPress();
    } else if (option.route) {
      router.push(option.route);
    }
  };

  const navigateToTab = (href: Href) => {
    setActiveMenu(null);
    router.replace(href);
  };

  const renderDesktopNavigation = () => {
    if (!isDesktopWeb) return null;

    return (
      <View style={[styles.desktopTopBar, { height: DESKTOP_NAV_HEIGHT }]}> 
        <View style={styles.desktopTopBarLeft}>
          <TouchableOpacity
            style={[styles.desktopTopButton, currentTab === 'index' && styles.desktopTopButtonActive]}
            onPress={() => navigateToTab('/(tabs)' as Href)}
          >
            <Text style={[styles.desktopTopButtonText, currentTab === 'index' && styles.desktopTopButtonTextActive]}>Inicio</Text>
            {hasSolicitudesBadgeInHome && <View style={styles.desktopNavPendingDot} />}
          </TouchableOpacity>

          {!hideExplore && (
            <TouchableOpacity
              style={[styles.desktopTopButton, currentTab === 'explore' && styles.desktopTopButtonActive]}
              onPress={() => navigateToTab('/(tabs)/explore' as Href)}
            >
              <Text style={[styles.desktopTopButtonText, currentTab === 'explore' && styles.desktopTopButtonTextActive]}>Solicitudes</Text>
              {hasSolicitudesBadgeInTab && <View style={styles.desktopNavPendingDot} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.desktopTopButton, currentTab === 'documentos' && styles.desktopTopButtonActive]}
            onPress={() => navigateToTab('/(tabs)/documentos' as Href)}
          >
            <Text style={[styles.desktopTopButtonText, currentTab === 'documentos' && styles.desktopTopButtonTextActive]}>Documentos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.desktopTopBarRight}>
          {!hideAdmin && (
            <TouchableOpacity
              style={[styles.desktopTopButton, activeMenu === 'admin' && styles.desktopTopButtonActive]}
              onPress={() => handlePress('admin')}
            >
              <Text style={[styles.desktopTopButtonText, activeMenu === 'admin' && styles.desktopTopButtonTextActive]}>Administración</Text>
              {hasAdminBadge && <View style={styles.desktopNavPendingDot} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.desktopTopButton, activeMenu === 'personal' && styles.desktopTopButtonActive]}
            onPress={() => handlePress('personal')}
          >
            <Text style={[styles.desktopTopButtonText, activeMenu === 'personal' && styles.desktopTopButtonTextActive]}>
              {user?.nombre || 'Mi cuenta'}
            </Text>
            {hasPersonalBadge && <View style={styles.desktopNavPendingDot} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMenu = () => {
    if (!activeMenu) return null;

    const options = activeMenu === 'personal' ? personalMenuOptions : administrationMenuOptions;
    const title = activeMenu === 'personal' ? 'Mi Área Personal' : 'Administración';

    if (isDesktopWeb) {
      const currentWidth = Math.max(containerWidth, 720);
      const menuWidth = Math.min(340, currentWidth - MENU_SIDE_PADDING * 2);

      return (
        <View style={styles.menuLayer} pointerEvents="box-none">
          <Pressable style={styles.dismissArea} onPress={() => setActiveMenu(null)} />
          <View style={[styles.menuContainer, styles.desktopMenuContainer, { top: DESKTOP_NAV_HEIGHT + 12, width: menuWidth }]}> 
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{title}</Text>
            </View>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.menuItem}
                onPress={() => handleMenuOptionPress(opt)}
              >
                <View style={styles.menuItemLabelRow}>
                  <Text style={[styles.menuItemText, opt.textColor && { color: opt.textColor }]}> 
                    {opt.label}
                  </Text>
                  {opt.hasBadge && <View style={styles.menuPendingDot} />}
                </View>
                {opt.showChevron !== false && (
                  <IconSymbol name="chevron.right" size={16} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    const visibleTabs = [
      'index',
      !hideExplore ? 'explore' : null,
      'documentos',
      !hideAdmin ? 'administracionMenu' : null,
      'areaPersonalMenu',
    ].filter(Boolean) as string[];

    const targetTab = activeMenu === 'personal' ? 'areaPersonalMenu' : 'administracionMenu';
    const tabIndex = Math.max(visibleTabs.indexOf(targetTab), 0);
    const currentWidth = Math.max(containerWidth, 320);
    const tabWidth = currentWidth / Math.max(visibleTabs.length, 1);
    const tabCenterX = tabWidth * tabIndex + tabWidth / 2;

    const menuWidth = Math.min(MENU_MAX_WIDTH, currentWidth - MENU_SIDE_PADDING * 2);
    const minLeft = MENU_SIDE_PADDING;
    const maxLeft = Math.max(currentWidth - menuWidth - MENU_SIDE_PADDING, MENU_SIDE_PADDING);
    const rawLeft = tabCenterX - menuWidth / 2;
    const menuLeft = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    const rawArrowLeft = tabCenterX - menuLeft - 6;
    const arrowLeft = Math.min(Math.max(rawArrowLeft, 14), Math.max(menuWidth - 26, 14));

    return (
      <View style={styles.menuLayer} pointerEvents="box-none">
        <Pressable style={styles.dismissArea} onPress={() => setActiveMenu(null)} />
        <View style={[styles.menuContainer, { bottom: tabBarHeight + 10, left: menuLeft, width: menuWidth }]}> 
          <View style={[styles.menuArrow, { left: arrowLeft }]} />
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{title}</Text>
          </View>
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt.id} 
              style={styles.menuItem} 
              onPress={() => handleMenuOptionPress(opt)}
            >
              <View style={styles.menuItemLabelRow}>
                <Text style={[styles.menuItemText, opt.textColor && { color: opt.textColor }]}>
                  {opt.label}
                </Text>
                {opt.hasBadge && <View style={styles.menuPendingDot} />}
              </View>
              {opt.showChevron !== false && (
                <IconSymbol name="chevron.right" size={16} color={colors.tint} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (shouldRedirectUnknownRole) {
    return <Redirect href="/login" />;
  }

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {renderDesktopNavigation()}

      {/* Modal de espera para cierre de sesión */}
      <OperacionPendienteModal visible={isLoggingOut} message="Cerrando sesión..." />

      {/* El menú aparece sobre el contenido pero debajo de la barra si quieres, 
          o sobre todo si lo pones aquí */}
      {renderMenu()}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          sceneStyle: isDesktopWeb ? styles.desktopScene : undefined,
          tabBarStyle: isDesktopWeb
            ? { display: 'none' }
            : {
                position: 'relative',
                height: tabBarHeight,
                paddingBottom: insets.bottom,
              },
        }}>
        
        <Tabs.Screen 
          name="index" 
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <IconSymbol size={24} name="house.fill" color={color} />
                {hasSolicitudesBadgeInHome && <View style={styles.tabPendingDot} />}
              </View>
            ),
          }} 
        />

        <Tabs.Screen 
          name="explore" 
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{ 
            href: hideExplore ? null : undefined,
            title: 'Solicitudes', 
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <IconSymbol size={24} name="paperplane.fill" color={color} />
                {hasSolicitudesBadgeInTab && <View style={styles.tabPendingDot} />}
              </View>
            ),
          }} 
        />

        <Tabs.Screen 
          name="documentos" 
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{ title: 'Documentos', tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} /> }} 
        />

        <Tabs.Screen
          name="administracionMenu"
          listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('admin'); } }}
          options={{
            href: hideAdmin ? null : undefined,
            title: 'Admin',
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <IconSymbol 
                  size={24} 
                  name={activeMenu === 'admin' ? 'xmark' : 'chart.bar.fill'} 
                  color={activeMenu === 'admin' ? colors.tint : color} 
                />
                {hasAdminBadge && <View style={styles.tabPendingDot} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="areaPersonalMenu"
          listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('personal'); } }}
          options={{
            title: user?.nombre || 'Usuario',
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <IconSymbol 
                  size={24} 
                  name={activeMenu === 'personal' ? 'xmark' : 'user.fill'} 
                  color={activeMenu === 'personal' ? colors.tint : color} 
                />
                {hasPersonalBadge && <View style={styles.tabPendingDot} />}
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  menuLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: Colors.light.componentBackground,
    borderRadius: 16,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  menuArrow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: Colors.light.componentBackground,
    transform: [{ rotate: '45deg' }],
  },
  menuHeader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.background,
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  menuItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuPendingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: 8,
  },
  tabIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPendingDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  desktopTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.background,
    backgroundColor: Colors.light.componentBackground,
    zIndex: 9,
  },
  desktopTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  desktopTopButtonActive: {
    backgroundColor: Colors.light.background,
  },
  desktopTopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.secondaryText,
  },
  desktopTopButtonTextActive: {
    color: Colors.light.tint,
  },
  desktopNavPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: 6,
  },
  desktopMenuContainer: {
    left: 'auto',
    right: 8,
    bottom: 'auto',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.background,
  },
  desktopScene: {
    paddingTop: 0,
    marginTop: 0,
  },
});
