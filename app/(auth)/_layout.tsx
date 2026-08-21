import { AUTH_GRADIENT_START } from '@/shared/ui/AuthGradientBackground';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: AUTH_GRADIENT_START }}
      edges={['top', 'bottom']}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="crear-usuario" />
        <Stack.Screen name="cambiar-contrasena" />
      </Stack>
    </SafeAreaView>
  );
}
