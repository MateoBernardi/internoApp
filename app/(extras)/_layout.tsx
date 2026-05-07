import { Colors, UI } from '@/constants/theme';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { Stack, useRouter } from 'expo-router';

export default function ExtrasLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: {
          height: UI.header.height,
        },
        headerTitleStyle: {
          fontSize: UI.fontSize.xxl,
          lineHeight: UI.lineHeight.title,
          fontWeight: '500',
          color: Colors.light.lightTint,
        },
        headerLeftContainerStyle: {
          paddingLeft: UI.header.leftPadding,
        },
        headerTitleContainerStyle: {
          paddingHorizontal: UI.header.horizontalPadding,
        },
        headerLeft: () => <AppBackButton onPress={() => router.back()} />,
      }}
    >
      <Stack.Screen name="agenda-personal" options={{ title: 'Agenda Personal' }} />
      <Stack.Screen name="cambiar-rol" options={{ title: 'Gestión de Roles' }} />
      <Stack.Screen name="detalle-empleados" options={{ title: 'Detalle de Empleado' }} />
      <Stack.Screen name="editar-usuario" options={{ title: 'Editar Perfil' }} />
      <Stack.Screen name="encuestas" options={{ title: 'Gestión de Encuestas' }} />
      <Stack.Screen name="encuestas-pendientes" options={{ title: 'Encuestas sin Responder' }} />
      <Stack.Screen name="mis-reportes" options={{ title: 'Mis Reportes' }} />
      <Stack.Screen name="mis-solicitudes-licencias" options={{ title: 'Mis Solicitudes' }} />
      <Stack.Screen name="reportes" options={{ title: 'Métricas de empleados' }} />
      <Stack.Screen name="reportes-encargado" options={{ title: 'Reportes de Empleados' }} />
      <Stack.Screen name="responder-encuesta" options={{ title: 'Responder Encuesta' }} />
      <Stack.Screen name="solicitudes-licencias" options={{ title: 'Solicitudes de Licencias' }} />
    </Stack>
  );
}
