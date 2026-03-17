import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

export default function ExtrasLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={6} style={{ paddingLeft: 0, marginLeft: 0 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.light.lightTint} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="actividad-detalle" />
      <Stack.Screen name="agenda-personal" />
      <Stack.Screen name="cambiar-rol" />
      <Stack.Screen name="crear-reporte" />
      <Stack.Screen name="crear-solicitud" />
      <Stack.Screen name="crear-solicitudes-licencias" />
      <Stack.Screen name="detalle-empleados" />
      <Stack.Screen name="editar-usuario" />
      <Stack.Screen name="encuestas" />
      <Stack.Screen name="encuestas-pendientes" />
      <Stack.Screen name="mis-reportes" />
      <Stack.Screen name="mis-solicitudes-licencias" />
      <Stack.Screen name="reportes" />
      <Stack.Screen name="reportes-encargado" />
      <Stack.Screen name="responder-encuesta" />
      <Stack.Screen name="solicitud" />
      <Stack.Screen name="solicitud-licencia" />
      <Stack.Screen name="solicitudes-licencias" />
    </Stack>
  );
}
