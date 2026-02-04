import { ThemedView } from "@/components/themed-view";
import CrearUsuario from "@/shared/views/CrearUsuario";
import { StyleSheet } from "react-native";

export default function CrearReporteScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearUsuario />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});