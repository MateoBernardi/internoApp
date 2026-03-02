import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Semaforo } from '../components/Semaforo';
import { TopEmployee } from '../components/TopEmployee';
import { UpgradedEmployee } from '../components/UpgradedEmployee';
import { useReporteStats } from '../viewmodels/useReportes';

const colors = Colors['light'];

export function Reportes() {
	const params = useLocalSearchParams<{ comparingWith?: string }>();
	const [searchQuery, setSearchQuery] = useState('');
	const { data: stats } = useReporteStats();

	// Filtrar datos del semáforo por búsqueda
	const filteredStats = useMemo(() => {
		if (!stats) return [];
		if (!searchQuery.trim()) return stats;

		const query = searchQuery.toLowerCase().trim();
		const result = stats.filter((item) => {
			const fullName = `${item.nombre} ${item.apellido}`.toLowerCase();
			const matches = fullName.includes(query);
			return matches;
		});
		return result;
	}, [stats, searchQuery]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="title" style={styles.headerTitle}>
					Métricas de empleados
				</ThemedText>
			</View>

			{/* Banner de comparación */}
			{params.comparingWith && (
				<View style={{ backgroundColor: colors.lightTint + '15', paddingVertical: 10, paddingHorizontal: 16 }}>
					<ThemedText style={{ color: colors.lightTint, fontWeight: '600', textAlign: 'center', fontSize: 14 }}>
						Seleccioná un empleado para comparar
					</ThemedText>
				</View>
			)}

			{/* Buscador */}
			<View style={styles.searchBarContainer}>
				<SearchBar
					placeholder="Buscar usuario..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					onClear={() => setSearchQuery('')}
					style={styles.searchBar}
				/>
			</View>

			<ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
				{/* Tarjetas de empleados destacados - ocultas durante búsqueda */}
				{!searchQuery.trim() && (
					<View style={styles.cardsContainer}>
						<TopEmployee />
						<UpgradedEmployee />
					</View>
				)}

				{/* Título del semáforo - oculto durante búsqueda */}
				{!searchQuery.trim() && (
					<View style={styles.titleContainer}>
						<ThemedText type="subtitle" style={styles.semaforoTitle}>
							Semáforo de Desempeño
						</ThemedText>
					</View>
				)}

				{/* Semáforo con datos filtrados */}
				<View style={styles.semaforoContainer}>
					<Semaforo query={searchQuery} filteredData={filteredStats} comparingWith={params.comparingWith} />
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.componentBackground,
	},
	header: {
		paddingHorizontal: 16,
		paddingTop: 24,
		paddingBottom: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		backgroundColor: colors.componentBackground,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	searchBarContainer: {
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 16,
	},
	searchBar: {
		marginHorizontal: 0,
		marginTop: 0,
		marginBottom: 0,
	},
	scrollContent: {
		flex: 1,
	},
	scrollContentContainer: {
		paddingBottom: 80,
	},
	cardsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		paddingHorizontal: 8,
		marginBottom: 20,
		gap: 12,
	},
	titleContainer: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	semaforoTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	semaforoContainer: {
		flex: 1,
		paddingHorizontal: 4,
		minHeight: 300,
	},
});