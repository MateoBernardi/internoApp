import { ThemedView } from "@/components/themed-view";
import { CrearSolicitud } from "@/features/solicitudesActividades/views/CrearSolicitud";
import { StyleSheet } from "react-native";

export default function CrearSolicitudScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearSolicitud />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
}); 