import { ThemedView } from "@/components/themed-view";
import LogIn from "@/features/auth/views/LoginScreen";
import { StyleSheet } from "react-native";

export default function LogInScreen() {
  return (
    <ThemedView style={styles.container}>
      <LogIn />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
