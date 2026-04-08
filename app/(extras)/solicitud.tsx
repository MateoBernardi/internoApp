import { ThemedView } from "@/components/themed-view";
import { Solicitud } from "@/features/solicitudesActividades/views/Solicitud";
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from "react-native";

export default function SolicitudScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const title = type === 'enviada' ? 'Enviada' : 'Recibida';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <Solicitud />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 