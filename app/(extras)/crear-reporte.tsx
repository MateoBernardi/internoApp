import { ThemedView } from "@/components/themed-view";
import CrearReporte from "@/features/reportes/views/CrearReporte";
import { StyleSheet } from "react-native";

export default function CrearReporteScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearReporte />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});