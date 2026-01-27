import { Stack } from 'expo-router';

export default function ExtrasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="crear-solicitud" options={{ headerShown: false }} />
      <Stack.Screen name="solicitud" options={{ headerShown: false }} />
      <Stack.Screen name="crear-solicitudes-licencias" options={{ headerShown: false }} />
      <Stack.Screen name="solicitud-licencia" options={{ headerShown: false }} />
    </Stack>
  );
}
