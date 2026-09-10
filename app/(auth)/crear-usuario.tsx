import { ThemedView } from "@/components/themed-view";
import { useSafeTopInset } from "@/hooks/useSafeTopInset";
import { AUTH_GRADIENT_START } from "@/shared/ui/AuthGradientBackground";
import CrearUsuario from "@/shared/views/CrearUsuario";
import { StyleSheet } from "react-native";

export default function CrearReporteScreen() {
  const top = useSafeTopInset();
  return (
    <ThemedView style={[styles.container, { paddingTop: top }]} lightColor={AUTH_GRADIENT_START}>
      <CrearUsuario />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
