import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Semaforo } from '../components/Semaforo';
import { TopEmployee } from '../components/TopEmployee';
import { UpgradedEmployee } from '../components/UpgradedEmployee';
import { useReporteStats } from '../viewmodels/useReportes';

const colors = Colors['light'];

export function Reportes() {
	const [searchQuery, setSearchQuery] = useState('');
	const { data: stats } = useReporteStats();

	// Filtrar datos del semáforo por búsqueda
	const filteredStats = useMemo(() => {
		if (!stats) return [];
		if (!searchQuery.trim()) return stats;

		const query = searchQuery.toLowerCase().trim();
		return stats.filter((item) => {
			const fullName = `${item.nombre} ${item.apellido}`.toLowerCase();
			return fullName.includes(query);
		});
	}, [stats, searchQuery]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="title" style={{ fontWeight: 'bold' }}>
					Métricas de empleados
				</ThemedText>
			</View>
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
				{/* Tarjetas de empleados destacados */}
				<View style={styles.cardsContainer}>
					<TopEmployee />
					<UpgradedEmployee />
				</View>

				{/* Título del semáforo */}
				<View style={styles.titleContainer}>
					<ThemedText type="subtitle" style={styles.semaforoTitle}>
						Semáforo de Desempeño
					</ThemedText>
				</View>

				{/* Semáforo con datos filtrados */}
				<View style={styles.semaforoContainer}>
					<Semaforo query={searchQuery} filteredData={filteredStats} />
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
		paddingBottom: 20,
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