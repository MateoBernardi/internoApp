import { GestionHorarios } from '@/features/horarios/views/GestionHorarios';
import { StyleSheet, View } from 'react-native';

export default function HorariosAdminScreen() {
  return (
    <View style={styles.container}>
      <GestionHorarios />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
