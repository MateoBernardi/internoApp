import { ThemedView } from '@/components/themed-view';
import { Reportes } from '@/features/reportes/views/Reportes';
import { StyleSheet } from 'react-native';

export default function ReportesScreen() {
  return (
		<ThemedView style={styles.container}>
		  <Reportes />
		</ThemedView>
	);
}

const styles = StyleSheet.create({
  container: {
	flex: 1,
	paddingTop: '10%',
  },
});
