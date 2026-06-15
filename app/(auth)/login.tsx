import { ThemedView } from "@/components/themed-view";
import LogIn from "@/features/auth/views/LoginScreen";
import { useSafeTopInset } from "@/hooks/useSafeTopInset";
import { StyleSheet } from "react-native";

export default function LogInScreen() {
  const top = useSafeTopInset();
  return (
    <ThemedView style={[styles.container, { paddingTop: top }]} lightColor="#ffffff">
      <LogIn />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
