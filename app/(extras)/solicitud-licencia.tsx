import { ThemedView } from "@/components/themed-view";
import { SolicitudLicencia } from "@/features/solicitudesLicencias/views/SolicitudLicencia";
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from "react-native";

export default function SolicitudLicenciaScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const title = type === 'enviada' ? 'Enviada' : 'Recibida';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <SolicitudLicencia />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
