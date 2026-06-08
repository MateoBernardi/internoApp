import { Colors } from '@/constants/theme';
import EditarUsuario from '@/shared/views/EditarUsuario';
import { StyleSheet, View } from 'react-native';

export default function EditarUsuarioScreen() {
  return (
        <View style={styles.container}>
          <EditarUsuario />
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.componentBackground,
  },
});