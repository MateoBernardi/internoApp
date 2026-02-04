import { ThemedView } from '@/components/themed-view';
import EditarUsuario from '@/shared/views/EditarUsuario';
import { StyleSheet } from 'react-native';

export default function EditarUsuarioScreen() {
  return (
        <ThemedView style={styles.container}>
          <EditarUsuario />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});