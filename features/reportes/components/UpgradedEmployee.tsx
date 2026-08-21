
import { ThemedText } from '@/components/themed-text';
import { glassStyles } from '@/shared/ui/glass';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpgradedEmployee } from '../viewmodels/useReportes';

const colors = Colors['light'];

export function UpgradedEmployee() {
	const { data, error, isLoading } = useUpgradedEmployee();

	if (error || isLoading || !data) {
		return null;
	}

	// Tomar el primero como el top mejorado
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
				<ThemedText style={styles.title} numberOfLines={1}>
					Más mejoras en los últimos 3 meses
				</ThemedText>
				<ThemedText style={styles.name} numberOfLines={1}>{empleado.nombre} {empleado.apellido}</ThemedText>
			</View>
			<View style={styles.upRow}>
				<Ionicons name="arrow-up" size={18} color={colors.lightTint} />
				<ThemedText style={styles.upCount}>{empleado.positivos_recientes}</ThemedText>
			</View>
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
		backgroundColor: '#9C27B0',
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
	upRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		flexShrink: 0,
	},
	upCount: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.lightTint,
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
