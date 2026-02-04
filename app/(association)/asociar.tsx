import { ThemedView } from "@/components/themed-view";
import AsociarCuenta from "@/shared/views/AsociarCuenta";
import { StyleSheet } from "react-native";

export default function AsociarCuentaScreen() {
  return (
    <ThemedView style={styles.container}>
      <AsociarCuenta />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});