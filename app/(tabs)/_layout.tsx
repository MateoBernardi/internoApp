import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
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
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title:(user?.nombre || 'Usuario'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="user.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
