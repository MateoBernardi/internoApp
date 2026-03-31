import { Stack } from 'expo-router';

export default function AssociationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="asociar" options={{ headerShown: false }} />
    </Stack>
  );
}
