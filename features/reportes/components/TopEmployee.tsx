
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
			<View style={styles.textColumn}>
				<ThemedText style={styles.title} numberOfLines={1}>Más comentarios positivos</ThemedText>
				<ThemedText style={styles.name} numberOfLines={1}>{empleado.nombre} {empleado.apellido}</ThemedText>
			</View>
			<ThemedText style={styles.positiveCount}>{empleado.total_positivos}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 14,
	},
	iconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: colors.success, // verde positivo
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	iconText: {
		color: colors.componentBackground,
		fontSize: 20,
		fontWeight: 'bold',
	},
	textColumn: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
	},
	positiveCount: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.success,
	},
	name: {
		fontSize: 13,
		color: colors.secondaryText,
		fontWeight: '500',
	},
	centerContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
		minHeight: 120,
	},
});
