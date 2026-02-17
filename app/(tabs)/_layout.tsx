import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Href, Redirect, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MenuOption {
  id: string;
  label: string;
  route?: Href;
  onPress?: () => void;
  textColor?: string;
}

export default function TabLayout() {
  const { user, signOut } = useAuth();
  const { hasRole, isKnownRole } = useRoleCheck();
  const router = useRouter();

  // Redirect unknown roles to login
  if (user?.rol_nombre && !isKnownRole()) {
    signOut();
    return <Redirect href="/login" />;
  }

  const isEmployee = hasRole('empleado');
  const isEncargado = hasRole('encargado');
  const hideExplore = isEmployee || isEncargado;
  const hideAdmin = isEmployee;
  const colors = Colors['light'];
  const [activeMenu, setActiveMenu] = useState<'personal' | 'admin' | null>(null);

  const administrationMenuOptions: MenuOption[] = [
    {
      id: 'reportes',
      label: 'Reportes',
      route: isEncargado ? '/(extras)/reportes-encargado' as Href : '/(extras)/reportes' as Href,
    },
    {
      id: 'solicitudes-licencias',
      label: 'Solicitudes de Licencias',
      route: '/(extras)/solicitudes-licencias' as Href,
    },
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

  const personalMenuOptions: MenuOption[] = [
    {
      id: 'agenda-personal',
      label: 'Agenda Personal',
      route: '/(extras)/agenda-personal' as Href,
    },
    {
      id: 'mis-solicitudes',
      label: 'Mis Licencias',
      route: '/(extras)/mis-solicitudes-licencias' as Href,
    },
    {
      id: 'mis-reportes',
      label: 'Mis Reportes',
      route: '/(extras)/mis-reportes' as Href,
    },
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
    }
  ];

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

  const renderMenu = () => {
    if (!activeMenu) return null;

    const options = activeMenu === 'personal' ? personalMenuOptions : administrationMenuOptions;
    const title = activeMenu === 'personal' ? 'Mi Área Personal' : 'Administración';

    return (
      <Pressable style={styles.overlay} onPress={() => setActiveMenu(null)}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{title}</Text>
          </View>
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt.id} 
              style={styles.menuItem} 
              onPress={() => handleMenuOptionPress(opt)}
            >
              <Text style={[styles.menuItemText, opt.textColor && { color: opt.textColor }]}>
                {opt.label}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={colors.tint} />
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* El menú aparece sobre el contenido pero debajo de la barra si quieres, 
          o sobre todo si lo pones aquí */}
      {renderMenu()}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          tabBarStyle: { position: 'relative' } // Asegura que los tabs estén al frente
        }}>
        
        <Tabs.Screen 
          name="index" 
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{ title: 'Inicio', tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} 
        />

        <Tabs.Screen 
          name="explore" 
          listeners={{ tabPress: () => setActiveMenu(null) }}
          options={{ 
            href: hideExplore ? null : undefined,
            title: 'Solicitudes', 
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} /> 
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
              <IconSymbol 
                size={24} 
                name={activeMenu === 'admin' ? 'xmark' : 'chart.bar.fill'} 
                color={activeMenu === 'admin' ? colors.tint : color} 
              />
            ),
          }}
        />

        <Tabs.Screen
          name="areaPersonalMenu"
          listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('personal'); } }}
          options={{
            title: user?.nombre || 'Usuario',
            tabBarIcon: ({ color }) => (
              <IconSymbol 
                size={24} 
                name={activeMenu === 'personal' ? 'xmark' : 'user.fill'} 
                color={activeMenu === 'personal' ? colors.tint : color} 
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100, // Deja espacio para la tab bar
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.light.componentBackground,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.background,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.light.text,
  },
});
