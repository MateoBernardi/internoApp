import { ThemedView } from '@/components/themed-view';
import { useSafeTopInset } from '@/hooks/useSafeTopInset';
import { AUTH_GRADIENT_START } from '@/shared/ui/AuthGradientBackground';
import { CambiarContrasenaView } from '@/shared/views/CambiarContrasenaView';
import { StyleSheet } from 'react-native';

export default function CambiarContrasenaScreen() {
  const top = useSafeTopInset();
  return (
    <ThemedView style={[styles.container, { paddingTop: top }]} lightColor={AUTH_GRADIENT_START}>
      <CambiarContrasenaView />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
