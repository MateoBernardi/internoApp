import { Colors } from '@/constants/theme';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.light.componentBackground }}
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
