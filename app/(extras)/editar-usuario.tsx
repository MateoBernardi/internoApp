import { Colors } from '@/constants/theme';
import EditarUsuario from '@/shared/views/EditarUsuario';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditarUsuarioScreen() {
  return (
        <SafeAreaView style={styles.container}>
          <EditarUsuario />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.componentBackground,
  },
});