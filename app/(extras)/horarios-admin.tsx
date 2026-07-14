import { HorariosHome } from '@/features/horarios/views/HorariosHome';
import { StyleSheet, View } from 'react-native';

export default function HorariosAdminScreen() {
  return (
    <View style={styles.container}>
      <HorariosHome />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
