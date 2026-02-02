import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Href, Tabs, useRouter } from 'expo-router';
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
  const { hasRole } = useRoleCheck();
  const router = useRouter();

  const isAdminUser = hasRole(['gerencia', 'personasRelaciones', 'consejo', 'encargado']);
  const isEmployee = hasRole('empleado');
  const colors = Colors['light'];
  const [activeMenu, setActiveMenu] = useState<'personal' | 'admin' | null>(null);

  const administrationMenuOptions: MenuOption[] = [
    {
      id: 'reportes',
      label: 'Reportes',
      route: '/(extras)/reportes' as Href,
    },
    {
      id: 'solicitudes-licencias',
      label: 'Solicitudes de Licencias',
      route: '/(extras)/solicitudes-licencias' as Href,
    },
    {
      id: 'encuestas',
      label: 'Encuestas',
      route: '/(extras)/encuestas' as Href,
    },
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
    ...(isEmployee
      ? [
          {
            id: 'mis-reportes',
            label: 'Mis Reportes',
            route: '/(extras)/reportes' as Href,
          },
        ]
      : []),
    {
      id: 'configuracion-cuenta',
      label: 'Configuración de Cuenta',
      route: '/(extras)/configuracion-cuenta' as Href,
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
              <IconSymbol name="chevron.right" size={16} color="#999" />
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
        
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />

        {isAdminUser && (<Tabs.Screen name="explore" options={{ title: 'Solicitudes', tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} /> }} />)}

        <Tabs.Screen name="documentos" options={{ title: 'Documentos', tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} /> }} />

        {isAdminUser && (
          <Tabs.Screen
            name="administracionMenu"
            listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('admin'); } }}
            options={{
              title: 'Admin',
              tabBarIcon: ({ color }) => (
                <IconSymbol 
                  size={24} 
                  name={activeMenu === 'admin' ? 'chart.bar.fill' : 'chart.bar.fill'} 
                  color={activeMenu === 'admin' ? '#FF3B30' : color} 
                />
              ),
            }}
          />
        )}

        <Tabs.Screen
          name="areaPersonalMenu"
          listeners={{ tabPress: (e) => { e.preventDefault(); handlePress('personal'); } }}
          options={{
            title: user?.nombre || 'Usuario',
            tabBarIcon: ({ color }) => (
              <IconSymbol 
                size={24} 
                name={activeMenu === 'personal' ? 'user.fill' : 'user.fill'} 
                color={activeMenu === 'personal' ? '#FF3B30' : color} 
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
    bottom: 0, // Ajusta esto si quieres que no tape el tab bar
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 80, // Espacio para que no lo tape la tab bar
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
    borderBottomColor: '#EEE',
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#444',
  },
});
