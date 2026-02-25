import { Stack } from 'expo-router';

export default function ExtrasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="agenda-personal" options={{ headerShown: false }} />
      <Stack.Screen name="cambiar-rol" options={{ headerShown: false }} />
      <Stack.Screen name="crear-reporte" options={{ headerShown: false }} />
      <Stack.Screen name="crear-solicitud" options={{ headerShown: false }} />
      <Stack.Screen name="crear-solicitudes-licencias" options={{ headerShown: false }} />
      <Stack.Screen name="detalle-empleados" options={{ headerShown: false }} />
      <Stack.Screen name="editar-usuario" options={{ headerShown: false }} />
      <Stack.Screen name="encuestas" options={{ headerShown: false }} />
      <Stack.Screen name="mis-reportes" options={{ headerShown: false }} />
      <Stack.Screen name="mis-solicitudes-licencias" options={{ headerShown: false }} />
      <Stack.Screen name="reportes" options={{ headerShown: false }} />
      <Stack.Screen name="reportes-encargado" options={{ headerShown: false }} />
      <Stack.Screen name="responder-encuesta" options={{ headerShown: false }} />
      <Stack.Screen name="solicitud" options={{ headerShown: false }} />
      <Stack.Screen name="solicitud-licencia" options={{ headerShown: false }} />
      <Stack.Screen name="solicitudes-licencias" options={{ headerShown: false }} />
    </Stack>
  );
}
