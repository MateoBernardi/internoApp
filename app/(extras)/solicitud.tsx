import { ThemedView } from "@/components/themed-view";
import { Solicitud } from "@/features/solicitudesActividades/views/Solicitud";
import { StyleSheet } from "react-native";

export default function SolicitudScreen() {
  return (
    <ThemedView style={styles.container}>
      <Solicitud />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 