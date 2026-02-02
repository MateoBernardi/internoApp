
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpgradedEmployee } from '../viewmodels/useReportes';

const colors = Colors['light'];

export function UpgradedEmployee() {
	const { data, isLoading, error } = useUpgradedEmployee();

	if (isLoading) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>Cargando...</ThemedText>
			</View>
		);
	}

	if (error || !data || data.length === 0) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>No hay mejoras recientes</ThemedText>
			</View>
		);
	}

	// Tomar el primero como el top mejorado
	const empleado = data[0];
	const iniciales = `${empleado.nombre?.[0] ?? ''}${empleado.apellido?.[0] ?? ''}`.toUpperCase();

	return (
		<View style={styles.card}>
			<View style={styles.iconCircle}>
				<ThemedText style={styles.iconText}>{iniciales}</ThemedText>
			</View>
			<ThemedText type="subtitle" style={styles.title}>
				Más mejoras en los últimos 3 meses
			</ThemedText>
			<View style={styles.upRow}>
				<Ionicons name="arrow-up" size={22} color={colors.lightTint} style={{ marginRight: 4 }} />
				<ThemedText style={styles.upCount}>{empleado.puntos}</ThemedText>
			</View>
			<ThemedText style={styles.name}>{empleado.nombre} {empleado.apellido}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 180,
		height: 180,
		backgroundColor: colors.componentBackground,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 8,
		elevation: 4,
		margin: 12,
		alignSelf: 'center',
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.icon, 
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	iconText: {
		color: colors.secondaryText,
		fontSize: 28,
		fontWeight: 'bold',
	},
	title: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 2,
		textAlign: 'center',
	},
	upRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
	},
	upCount: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.lightTint,
	},
	name: {
		fontSize: 15,
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
