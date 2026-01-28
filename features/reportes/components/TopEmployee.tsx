
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTopEmployee } from '../viewmodels/useReportes';

export function TopEmployee() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const { data, isLoading, error } = useTopEmployee();

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
				<ThemedText>No hay empleados destacados</ThemedText>
			</View>
		);
	}

	// Tomar el primero como el top
	const empleado = data[0];
	const iniciales = `${empleado.nombre?.[0] ?? ''}${empleado.apellido?.[0] ?? ''}`.toUpperCase();

	return (
		<View style={styles.card}>
			<View style={styles.iconCircle}>
				<ThemedText style={styles.iconText}>{iniciales}</ThemedText>
			</View>
			<ThemedText type="subtitle" style={styles.title}>Más comentarios positivos</ThemedText>
			<ThemedText style={styles.positiveCount}>+{empleado.positivos}</ThemedText>
			<ThemedText style={styles.name}>{empleado.nombre} {empleado.apellido}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 180,
		height: 180,
		backgroundColor: '#E0F7FA', // celeste claro, asociado a lo bueno
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
		backgroundColor: '#4CAF50', // verde positivo
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	iconText: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold',
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#388E3C',
		marginBottom: 2,
	},
	positiveCount: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#388E3C',
		marginBottom: 2,
	},
	name: {
		fontSize: 15,
		color: '#222',
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
