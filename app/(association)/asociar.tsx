import { ThemedView } from "@/components/themed-view";
import { useSafeTopInset } from "@/hooks/useSafeTopInset";
import AsociarCuenta from "@/shared/views/AsociarCuenta";
import { StyleSheet } from "react-native";

export default function AsociarCuentaScreen() {
  const top = useSafeTopInset();
  return (
    <ThemedView style={[styles.container, { paddingTop: top }]} lightColor="#ffffff">
      <AsociarCuenta />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
