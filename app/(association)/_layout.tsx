import { Colors } from '@/constants/theme';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AssociationLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      edges={['top', 'bottom']}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="asociar" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
}
