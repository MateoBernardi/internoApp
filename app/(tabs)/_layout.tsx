import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useArchivosUnseenCount } from '@/features/docs/viewmodels/useArchivos';
import { useReportesPendingCount } from '@/features/reportes/viewmodels/useReportes';
import { useSolicitudesUnseen } from '@/features/solicitudesActividades/viewmodels/useSolicitudes';
import { useLicenciasUnseenCount } from '@/features/solicitudesLicencias/viewmodels/useSolicitudes';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Href, Redirect, Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const hasUserContext = Boolean(user?.user_context_id);
  const isEmployeeUser = isRolePending || isEmployee();
  const isEncargado = !isRolePending && hasRole('encargado');
  const hideExplore = !hasUserContext;
  const hideAdmin = !hasUserContext || isEmployeeUser;
  const hasSolicitudesTab = !hideExplore;
  const hasAdminTab = !hideAdmin;
  const hasSessionContext = isAuthenticated && !requiresAssociation && !!user?.user_context_id;
  const canSeeAdminReportesButton = !isContableOrSistemas();
  const canSeeActivityRequests = isEmployeeUser || isEncargado;
  const canSeeLicenciasAdmin = hasAdminTab;
  const canSeeReportesAdmin = hasAdminTab && canSeeAdminReportesButton;
  const canSeeLicenciasPersonal = !hasAdminTab;
  const canSeeReportesPersonal = !hasAdminTab;
  const colors = Colors['light'];
  const [activeMenu, setActiveMenu] = useState<'personal' | 'admin' | null>(null);
  const [renderedMenu, setRenderedMenu] = useState<'personal' | 'admin' | null>(null);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const hasShownWebPushDialogRef = useRef(false);
  // Posición (relativa a `desktopTopBar`) de cada botón que abre un popover,
  // para anclar el menú desktop exactamente debajo del botón en vez de un
  // offset fijo — desktopTopBarRight.x + button.x = x absoluto dentro del bar.
  const [desktopRightGroupX, setDesktopRightGroupX] = useState(0);
  const [desktopAdminButtonRect, setDesktopAdminButtonRect] = useState<{ x: number; width: number } | null>(null);
  const [desktopPersonalButtonRect, setDesktopPersonalButtonRect] = useState<{ x: number; width: number } | null>(null);

  // Anima la entrada/salida del popover; `renderedMenu` se mantiene un instante
  // más que `activeMenu` para poder animar el cierre antes de desmontar.
  useEffect(() => {
    if (activeMenu) {
      setRenderedMenu(activeMenu);
      menuAnim.setValue(0);
      Animated.timing(menuAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else if (renderedMenu) {
      Animated.timing(menuAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setRenderedMenu(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);
  const responsiveLayout = useResponsiveLayout();
  const isDesktopWeb = Platform.OS === 'web' && responsiveLayout.isDesktop;
  const currentTab = useMemo(() => (segments[1] as string) || 'index', [segments]);

  // Contador de solicitudes ('Mensajes') sin ver → badge rojo en la tab.
  const { data: unseenSolicitudes = 0 } = useSolicitudesUnseen(
    hasSolicitudesTab && hasSessionContext
  );
  const hasMensajesBadge = unseenSolicitudes > 0;
  const mensajesBadgeLabel = unseenSolicitudes > 99 ? '99+' : String(unseenSolicitudes);

  const { data: licenciasUnseenCount = 0 } = useLicenciasUnseenCount(
    (canSeeLicenciasAdmin || canSeeLicenciasPersonal) && hasSessionContext
  );
  const { data: reportesPendingCount = 0 } = useReportesPendingCount(
    (canSeeReportesAdmin || canSeeReportesPersonal) && hasSessionContext
  );
  const { data: archivosUnseenCount = 0 } = useArchivosUnseenCount(hasSessionContext);

  const hasArchivosBadge = archivosUnseenCount > 0;
  const archivosBadgeLabel = archivosUnseenCount > 99 ? '99+' : String(archivosUnseenCount);

  const hasSolicitudesLicenciasPendientesAdmin = canSeeLicenciasAdmin && licenciasUnseenCount > 0;
  const hasSolicitudesLicenciasPendientesPersonal = canSeeLicenciasPersonal && licenciasUnseenCount > 0;
  const hasReportesPendientesAdmin = canSeeReportesAdmin && reportesPendingCount > 0;
  const hasReportesPendientesPersonal = canSeeReportesPersonal && reportesPendingCount > 0;

  const hasAdminBadge =
    hasAdminTab &&
    (hasSolicitudesLicenciasPendientesAdmin ||
      (canSeeAdminReportesButton && hasReportesPendientesAdmin));

  const administrationMenuOptions: MenuOption[] = [
    {
      id: 'horarios',
      label: 'Horarios',
      route: '/(extras)/horarios-admin' as Href,
    },
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
    ...(hasRole(['gerencia', 'encargado', 'contable', 'personasRelaciones', 'consejo', 'presidencia']) ? [{
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

  const hideMisReportes = hasRole(['gerencia', 'personasRelaciones', 'consejo', 'contable', 'sistemas', 'presidencia', 'estudio-contable']);
  const hideMisLicencias = hasRole(['consejo', 'presidencia', 'contable', 'sistemas', 'estudio-contable']);

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
            <IconSymbol name="house.fill" size={16} color={currentTab === 'index' ? glassColors.link : colors.secondaryText} />
            <Text style={[styles.desktopTopButtonText, currentTab === 'index' && styles.desktopTopButtonTextActive]}>Inicio</Text>
          </TouchableOpacity>

          {!hideExplore && (
            <TouchableOpacity
              style={[styles.desktopTopButton, currentTab === 'explore' && styles.desktopTopButtonActive]}
              onPress={() => navigateToTab('/(tabs)/explore' as Href)}
            >
              <IconSymbol name="paperplane.fill" size={16} color={currentTab === 'explore' ? glassColors.link : colors.secondaryText} />
              <Text style={[styles.desktopTopButtonText, currentTab === 'explore' && styles.desktopTopButtonTextActive]}>Solicitudes</Text>
              {hasMensajesBadge && <View style={styles.desktopNavPendingDot} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.desktopTopButton, currentTab === 'documentos' && styles.desktopTopButtonActive]}
            onPress={() => navigateToTab('/(tabs)/documentos' as Href)}
          >
            <IconSymbol name="doc.text.fill" size={16} color={currentTab === 'documentos' ? glassColors.link : colors.secondaryText} />
            <Text style={[styles.desktopTopButtonText, currentTab === 'documentos' && styles.desktopTopButtonTextActive]}>Documentos</Text>
            {hasArchivosBadge && <View style={styles.desktopNavPendingDot} />}
          </TouchableOpacity>
        </View>

        <View
          style={styles.desktopTopBarRight}
          onLayout={(e) => setDesktopRightGroupX(e.nativeEvent.layout.x)}
        >
          {!hideAdmin && (
            <TouchableOpacity
              style={[styles.desktopTopButton, activeMenu === 'admin' && styles.desktopTopButtonActive]}
              onPress={() => handlePress('admin')}
              onLayout={(e) => setDesktopAdminButtonRect({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
            >
              <IconSymbol name="chart.bar.fill" size={16} color={activeMenu === 'admin' ? glassColors.link : colors.secondaryText} />
              <Text style={[styles.desktopTopButtonText, activeMenu === 'admin' && styles.desktopTopButtonTextActive]}>Administración</Text>
              {hasAdminBadge && <View style={styles.desktopNavPendingDot} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.desktopTopButton, activeMenu === 'personal' && styles.desktopTopButtonActive]}
            onPress={() => handlePress('personal')}
            onLayout={(e) => setDesktopPersonalButtonRect({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
          >
            <IconSymbol name="user.fill" size={16} color={activeMenu === 'personal' ? glassColors.link : colors.secondaryText} />
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
    if (!renderedMenu) return null;

    const options = renderedMenu === 'personal' ? personalMenuOptions : administrationMenuOptions;
    const title = renderedMenu === 'personal' ? 'Mi Área Personal' : 'Administración';
    const animatedMenuStyle = {
      opacity: menuAnim,
      transform: [
        { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
        { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
      ],
    };

    if (isDesktopWeb) {
      const currentWidth = Math.max(containerWidth, 720);
      const menuWidth = Math.min(300, currentWidth - MENU_SIDE_PADDING * 2);

      // Ancla el popover al botón que lo abrió (no a un offset fijo del borde).
      const anchorRect = renderedMenu === 'personal' ? desktopPersonalButtonRect : desktopAdminButtonRect;
      const anchorCenterX = anchorRect
        ? desktopRightGroupX + anchorRect.x + anchorRect.width / 2
        : currentWidth - 40;
      const minLeft = MENU_SIDE_PADDING;
      const maxLeft = Math.max(currentWidth - menuWidth - MENU_SIDE_PADDING, MENU_SIDE_PADDING);
      const menuLeft = Math.min(Math.max(anchorCenterX - menuWidth / 2, minLeft), maxLeft);
      const rawArrowLeft = anchorCenterX - menuLeft - 6;
      const arrowLeft = Math.min(Math.max(rawArrowLeft, 14), Math.max(menuWidth - 26, 14));

      return (
        <View style={styles.menuLayer} pointerEvents={activeMenu ? 'box-none' : 'none'}>
          <Pressable style={styles.dismissArea} onPress={() => setActiveMenu(null)} />
          <Animated.View
            style={[
              glassStyles.modalCard,
              styles.menuContainer,
              { top: DESKTOP_NAV_HEIGHT + 12, left: menuLeft, width: menuWidth },
              animatedMenuStyle,
            ]}
          >
            <View style={[styles.menuArrow, styles.menuArrowTop, { left: arrowLeft }]} />
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
                  <IconSymbol name="chevron.right" size={16} color={glassColors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
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

    const targetTab = renderedMenu === 'personal' ? 'areaPersonalMenu' : 'administracionMenu';
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
      <View style={styles.menuLayer} pointerEvents={activeMenu ? 'box-none' : 'none'}>
        <Pressable style={styles.dismissArea} onPress={() => setActiveMenu(null)} />
        <Animated.View
          style={[
            glassStyles.modalCard,
            styles.menuContainer,
            { bottom: tabBarHeight + 10, left: menuLeft, width: menuWidth },
            animatedMenuStyle,
          ]}
        >
          <View style={[styles.menuArrow, styles.menuArrowBottom, { left: arrowLeft }]} />
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
                <IconSymbol name="chevron.right" size={16} color={glassColors.textMuted} />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    );
  };

  if (shouldRedirectUnknownRole) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
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
          tabBarActiveTintColor: glassColors.link,
          headerShown: false,
          sceneStyle: isDesktopWeb ? styles.desktopScene : undefined,
          tabBarStyle: isDesktopWeb
            ? { display: 'none' }
            : {
              position: 'relative',
              height: tabBarHeight,
              paddingBottom: insets.bottom,
              backgroundColor: Colors.light.componentBackground,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Colors.light.background,
            },
        }}>

        <Tabs.Screen
          name="index"
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="explore"
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{
            href: hideExplore ? null : undefined,
            title: 'Mensajes',
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons size={24} name={focused ? 'paper-plane' : 'paper-plane-outline'} color={color} />
                {hasMensajesBadge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{mensajesBadgeLabel}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="documentos"
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{
            title: 'Documentos',
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons size={24} name={focused ? 'document-text' : 'document-text-outline'} color={color} />
                {hasArchivosBadge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{archivosBadgeLabel}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="administracionMenu"
          listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('admin'); } }}
          options={{
            href: hideAdmin ? null : undefined,
            title: 'Admin',
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons
                  size={24}
                  name={activeMenu === 'admin' ? 'close' : 'bar-chart'}
                  color={activeMenu === 'admin' ? glassColors.link : color}
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
                <Ionicons
                  size={24}
                  name={activeMenu === 'personal' ? 'close' : 'person'}
                  color={activeMenu === 'personal' ? glassColors.link : color}
                />
                {hasPersonalBadge && <View style={styles.tabPendingDot} />}
              </View>
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
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
  // Posición/relleno propios; el fondo/borde/sombra sólidos vienen de
  // glassStyles.modalCard (mismo recipe que el resto de los diálogos).
  menuContainer: {
    position: 'absolute',
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 12,
  },
  // Base del "pico" que conecta el popover con el botón que lo abrió;
  // los modificadores de abajo eligen qué dos bordes quedan visibles según
  // el pico apunte hacia abajo (mobile, menú arriba del tab) o hacia arriba
  // (desktop, menú debajo del botón).
  menuArrow: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: Colors.light.componentBackground,
    borderColor: 'rgba(17,24,28,0.08)',
    transform: [{ rotate: '45deg' }],
  },
  menuArrowBottom: {
    bottom: -6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  menuArrowTop: {
    top: -6,
    borderLeftWidth: 1,
    borderTopWidth: 1,
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
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  desktopTopButtonActive: {
    backgroundColor: 'rgba(26,115,232,0.12)',
    borderColor: 'rgba(26,115,232,0.35)',
  },
  desktopTopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.secondaryText,
  },
  desktopTopButtonTextActive: {
    color: glassColors.link,
  },
  desktopNavPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: 6,
  },
  desktopScene: {
    paddingTop: 0,
    marginTop: 0,
  },
});
