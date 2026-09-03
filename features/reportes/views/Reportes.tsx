import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { allRoles } from '@/shared/users/roles';
import { glassStyles } from '@/shared/ui/glass';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Semaforo } from '../components/Semaforo';
import { TopEmployee } from '../components/TopEmployee';
import { UpgradedEmployee } from '../components/UpgradedEmployee';
import { useReporteStats } from '../viewmodels/useReportes';

const colors = Colors['light'];
const ROLE_LABELS: Record<string, string> = Object.fromEntries(allRoles.map((r) => [r.value, r.label]));

export function Reportes() {
	const params = useLocalSearchParams<{ comparingWith?: string }>();
	const [searchQuery, setSearchQuery] = useState('');
	const [rolFilter, setRolFilter] = useState<string | null>(null);
	const { data: stats, refetch, isRefetching } = useReporteStats();

	const handleRefresh = useCallback(async () => {
		await refetch();
	}, [refetch]);

	// Roles presentes en los datos cargados, para no ofrecer chips vacíos.
	const availableRoles = useMemo(() => {
		if (!stats) return [];
		const roles = new Set<string>();
		stats.forEach((item) => { if (item.rol) roles.add(item.rol); });
		return Array.from(roles).sort();
	}, [stats]);

	// Filtrar datos del semáforo por búsqueda + rol
	const filteredStats = useMemo(() => {
		if (!stats) return [];
		let result = stats;

		if (rolFilter) {
			result = result.filter((item) => item.rol === rolFilter);
		}

		const query = searchQuery.toLowerCase().trim();
		if (query) {
			result = result.filter((item) => `${item.nombre} ${item.apellido}`.toLowerCase().includes(query));
		}

		return result;
	}, [stats, searchQuery, rolFilter]);

	const hasActiveFilter = !!searchQuery.trim() || !!rolFilter;

	return (
		<View style={styles.container}>
			{/* Banner de comparación */}
			{params.comparingWith && (
				<View style={[glassStyles.fieldGlass, styles.compareBanner]}>
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

			{/* Filtro por rol */}
			{availableRoles.length > 0 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.roleFilterScroll}
					contentContainerStyle={styles.roleFilterContent}
				>
					<RoleChip label="Todos" active={rolFilter === null} onPress={() => setRolFilter(null)} />
					{availableRoles.map((rol) => (
						<RoleChip
							key={rol}
							label={ROLE_LABELS[rol] ?? rol}
							active={rolFilter === rol}
							onPress={() => setRolFilter(rolFilter === rol ? null : rol)}
						/>
					))}
				</ScrollView>
			)}

			<ScrollView
				style={styles.scrollContent}
				contentContainerStyle={styles.scrollContentContainer}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={handleRefresh}
						colors={[colors.lightTint]}
						tintColor={colors.lightTint}
					/>
				}
			>
				{/* Tarjetas de empleados destacados - ocultas mientras hay un filtro activo */}
				{!hasActiveFilter && (
					<View style={styles.cardsContainer}>
						<TopEmployee />
						<UpgradedEmployee />
					</View>
				)}

				{/* Título del semáforo - oculto mientras hay un filtro activo */}
				{!hasActiveFilter && (
					<View style={styles.titleContainer}>
						<ThemedText type="subtitle" style={styles.semaforoTitle}>
							Semáforo de Desempeño
						</ThemedText>
					</View>
				)}

				{/* Semáforo con datos filtrados */}
				<View style={styles.semaforoContainer}>
					<Semaforo query={searchQuery} hasActiveFilter={hasActiveFilter} filteredData={filteredStats} comparingWith={params.comparingWith} />
				</View>
			</ScrollView>
		</View>
	);
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	return (
		<TouchableOpacity onPress={onPress} style={[styles.roleChip, active && styles.roleChipActive]}>
			<Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.componentBackground,
	},
	compareBanner: {
		paddingVertical: '2.5%',
		paddingHorizontal: '4%',
		marginHorizontal: '3%',
		marginBottom: 10,
	},
	searchBarContainer: {
		paddingHorizontal: '3%',
		paddingTop: 0,
		paddingBottom: '4%',
	},
	searchBar: {
		marginHorizontal: 0,
		marginTop: 0,
		marginBottom: 0,
	},
	roleFilterScroll: {
		flexGrow: 0,
		paddingBottom: '3%',
	},
	roleFilterContent: {
		paddingHorizontal: '3%',
		gap: 8,
	},
	roleChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: 'rgba(17,24,28,0.12)',
		backgroundColor: 'rgba(17,24,28,0.03)',
	},
	roleChipActive: {
		borderColor: 'rgba(26,115,232,0.35)',
		backgroundColor: 'rgba(26,115,232,0.12)',
	},
	roleChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.secondaryText,
	},
	roleChipTextActive: {
		color: colors.lightTint,
	},
	scrollContent: {
		flex: 1,
	},
	scrollContentContainer: {
		paddingBottom: 80,
	},
	cardsContainer: {
		flexDirection: 'column',
		paddingHorizontal: '4%',
		marginBottom: 20,
		gap: 12,
	},
	titleContainer: {
		paddingHorizontal: '4%',
		paddingTop: 0,
	},
	semaforoTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	semaforoContainer: {
		flex: 1,
		paddingHorizontal: '1%',
		minHeight: 300,
	},
});