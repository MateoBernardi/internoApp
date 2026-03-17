import { ThemedView } from "@/components/themed-view";
import { CrearSolicitudesLicencias } from "@/features/solicitudesLicencias/views/CrearSolicitudesLicencias";
import { StyleSheet } from "react-native";

export default function CrearSolicitudesLicenciasScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearSolicitudesLicencias />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
