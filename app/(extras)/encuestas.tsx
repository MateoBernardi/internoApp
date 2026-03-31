import { ThemedView } from '@/components/themed-view';
import { Encuestas } from '@/features/encuestas/views/Encuestas';
import { StyleSheet } from 'react-native';


export default function TabTwoScreen() {
  return (
      <ThemedView style={styles.container}>
        <Encuestas />
      </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
