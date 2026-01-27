import { ThemedView } from "@/components/themed-view";
import { SolicitudLicencia } from "@/features/solicitudesLicencias/views/SolicitudLicencia";
import { StyleSheet } from "react-native";

export default function SolicitudLicenciaScreen() {
  return (
    <ThemedView style={styles.container}>
      <SolicitudLicencia />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
