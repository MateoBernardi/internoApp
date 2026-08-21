
import { ThemedText } from '@/components/themed-text';
import { glassStyles } from '@/shared/ui/glass';
import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTopEmployee } from '../viewmodels/useReportes';

const colors = Colors['light'];

export function TopEmployee() {
	const { data, error, isLoading } = useTopEmployee();

	if (error || isLoading || !data) {
		return null;
	}

	// Tomar el top
	const empleado = data;
	
	if (!empleado) {
		return null;
	}

	const iniciales = `${empleado.nombre?.[0] ?? ''}${empleado.apellido?.[0] ?? ''}`.toUpperCase();

	return (
		<View style={[glassStyles.card, styles.card]}>
			<View style={styles.iconCircle}>
				<ThemedText style={styles.iconText}>{iniciales}</ThemedText>
			</View>
			<ThemedText type="subtitle" style={styles.title} numberOfLines={2}>Más comentarios positivos</ThemedText>
			<ThemedText style={styles.positiveCount}>{empleado.total_positivos}</ThemedText>
			<ThemedText style={styles.name} numberOfLines={2}>{empleado.nombre} {empleado.apellido}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 140,
		minHeight: 180,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 10,
		paddingVertical: 14,
		margin: 12,
		alignSelf: 'center',
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.success, // verde positivo
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	iconText: {
		color: colors.componentBackground,
		fontSize: 28,
		fontWeight: 'bold',
	},
	title: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 2,
		textAlign: 'center',
	},
	positiveCount: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.success,
		marginBottom: 2,
	},
	name: {
		fontSize: 13,
		color: colors.text,
		marginTop: 4,
		fontWeight: '500',
		textAlign: 'center',
	},
	centerContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
		minHeight: 120,
	},
});
