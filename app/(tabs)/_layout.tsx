import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoleCheck } from '@/hooks/useRoleCheck';


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { isEmployeeOrEncargado } = useRoleCheck();
  const userInitial = user?.nombre?.[0]?.toUpperCase();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors['transparent'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      {!isEmployeeOrEncargado() && (
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Solicitudes',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="area-personal"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="documentos"
        options={{
            title: 'Docs',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title:(user?.nombre || 'Usuario'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
