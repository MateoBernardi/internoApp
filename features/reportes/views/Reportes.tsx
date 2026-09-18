import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
	Modal,
	Platform,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	TouchableWithoutFeedback,
	useWindowDimensions,
	View,
} from 'react-native';
import type { EstadoReporte } from '../models/Reporte';
import { REPORTE_ESTADO_FILTER_OPTIONS, REPORTE_ROL_FILTER_OPTIONS } from '../presentation';
import { Semaforo } from '../components/Semaforo';
import { TopEmployee } from '../components/TopEmployee';
import { UpgradedEmployee } from '../components/UpgradedEmployee';
import { useReporteStats } from '../viewmodels/useReportes';

const colors = Colors['light'];
const ROLE_LABELS: Record<string, string> = Object.fromEntries(
	REPORTE_ROL_FILTER_OPTIONS.map((r) => [r.value, r.label])
);
const ESTADO_LABELS: Record<EstadoReporte, string> = Object.fromEntries(
	REPORTE_ESTADO_FILTER_OPTIONS.map((o) => [o.value, o.label])
) as Record<EstadoReporte, string>;

export function Reportes() {
	const params = useLocalSearchParams<{ comparingWith?: string }>();
	const { width } = useWindowDimensions();
	const [searchQuery, setSearchQuery] = useState('');
	const [rolFilter, setRolFilter] = useState<string | null>(null);
	const [estadoFilter, setEstadoFilter] = useState<EstadoReporte | null>(null);
	const [isRolesVisible, setIsRolesVisible] = useState(false);
	const [isEstadosVisible, setIsEstadosVisible] = useState(false);
	const { data: stats, refetch, isRefetching } = useReporteStats(estadoFilter ?? undefined);

	const handleRefresh = useCallback(async () => {
		await refetch();
	}, [refetch]);

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

	const hasActiveFilter = !!searchQuery.trim() || !!rolFilter || !!estadoFilter;
	const rolesModalWidth = Platform.OS === 'web'
		? Math.min(560, Math.max(320, width - 48))
		: Math.min(width - 32, 420);

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

			{/* Buscador + selectores de rol y estado, mismo patrón que UserSelector (usado en
			    Crear Solicitud/Objetivo/Encuesta, etc.): input + botón que abre un modal,
			    en vez de una fila de chips ad-hoc. El filtro de estado acota qué usuarios
			    entran al semáforo (los que tienen algún reporte en ese estado); no cambia
			    cómo se agrupan/calculan las zonas. */}
			<View style={styles.searchRow}>
				<SearchBar
					placeholder="Buscar usuario..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					onClear={() => setSearchQuery('')}
					style={styles.searchBar}
				/>
				<TouchableOpacity style={styles.rolesButton} onPress={() => setIsEstadosVisible(true)}>
					<ThemedText style={styles.rolesButtonText}>
						{estadoFilter ? ESTADO_LABELS[estadoFilter] : 'Estado'}
					</ThemedText>
					<Ionicons name="chevron-down" size={16} color={colors.icon} style={{ marginLeft: 4 }} />
				</TouchableOpacity>
				<TouchableOpacity style={styles.rolesButton} onPress={() => setIsRolesVisible(true)}>
					<ThemedText style={styles.rolesButtonText}>
						{rolFilter ? (ROLE_LABELS[rolFilter] ?? rolFilter) : 'Roles'}
					</ThemedText>
					<Ionicons name="chevron-down" size={16} color={colors.icon} style={{ marginLeft: 4 }} />
				</TouchableOpacity>
			</View>

			<Modal
				transparent
				visible={isRolesVisible}
				animationType="fade"
				onRequestClose={() => setIsRolesVisible(false)}
			>
				<TouchableWithoutFeedback onPress={() => setIsRolesVisible(false)}>
					<View style={[styles.modalOverlay, Platform.OS === 'web' && styles.modalOverlayWeb]}>
						<TouchableWithoutFeedback>
							<View
								style={[
									styles.modalContent,
									{ width: rolesModalWidth },
									Platform.OS === 'web' && styles.modalContentWeb,
								]}
							>
								<ThemedText type="defaultSemiBold" style={{ marginBottom: 10, textAlign: 'center' }}>
									Filtrar por rol
								</ThemedText>
								<ScrollView style={styles.rolesScroll} contentContainerStyle={styles.rolesScrollContent}>
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => { setRolFilter(null); setIsRolesVisible(false); }}
									>
										<ThemedText style={styles.roleText}>Todos</ThemedText>
										{rolFilter === null && <Ionicons name="checkmark" size={20} color={colors.tint} />}
									</TouchableOpacity>
									{REPORTE_ROL_FILTER_OPTIONS.map((opcion) => (
										<TouchableOpacity
											key={opcion.value}
											style={styles.modalItem}
											onPress={() => { setRolFilter(opcion.value); setIsRolesVisible(false); }}
										>
											<ThemedText style={styles.roleText}>{opcion.label}</ThemedText>
											{rolFilter === opcion.value && <Ionicons name="checkmark" size={20} color={colors.tint} />}
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>

			<Modal
				transparent
				visible={isEstadosVisible}
				animationType="fade"
				onRequestClose={() => setIsEstadosVisible(false)}
			>
				<TouchableWithoutFeedback onPress={() => setIsEstadosVisible(false)}>
					<View style={[styles.modalOverlay, Platform.OS === 'web' && styles.modalOverlayWeb]}>
						<TouchableWithoutFeedback>
							<View
								style={[
									styles.modalContent,
									{ width: rolesModalWidth },
									Platform.OS === 'web' && styles.modalContentWeb,
								]}
							>
								<ThemedText type="defaultSemiBold" style={{ marginBottom: 10, textAlign: 'center' }}>
									Filtrar por estado
								</ThemedText>
								<ScrollView style={styles.rolesScroll} contentContainerStyle={styles.rolesScrollContent}>
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => { setEstadoFilter(null); setIsEstadosVisible(false); }}
									>
										<ThemedText style={styles.roleText}>Todos</ThemedText>
										{estadoFilter === null && <Ionicons name="checkmark" size={20} color={colors.tint} />}
									</TouchableOpacity>
									{REPORTE_ESTADO_FILTER_OPTIONS.map((opcion) => (
										<TouchableOpacity
											key={opcion.value}
											style={styles.modalItem}
											onPress={() => { setEstadoFilter(opcion.value); setIsEstadosVisible(false); }}
										>
											<ThemedText style={styles.roleText}>{opcion.label}</ThemedText>
											{estadoFilter === opcion.value && <Ionicons name="checkmark" size={20} color={colors.tint} />}
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>

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
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: '3%',
		paddingTop: 0,
		paddingBottom: '4%',
		gap: 10,
	},
	searchBar: {
		flex: 1,
		marginHorizontal: 0,
		marginTop: 0,
		marginBottom: 0,
	},
	// Mismo look que el botón "Roles" de UserSelector (usado en las vistas de
	// creación: CrearSolicitud, CrearObjetivo, CrearEncuesta, etc.).
	rolesButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: colors.componentBackground,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(17,24,28,0.12)',
	},
	rolesButtonText: {
		fontSize: 14,
		color: colors.secondaryText,
		fontWeight: '500',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalOverlayWeb: {
		zIndex: 1000,
		pointerEvents: 'auto',
	},
	modalContent: {
		backgroundColor: colors.componentBackground,
		borderRadius: 12,
		padding: 16,
		maxHeight: '70%',
		elevation: 5,
	},
	modalContentWeb: {
		zIndex: 1001,
		pointerEvents: 'auto',
	},
	rolesScroll: {
		maxHeight: 360,
	},
	rolesScrollContent: {
		paddingBottom: 6,
	},
	modalItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.componentBackground,
	},
	roleText: {
		fontSize: 16,
		color: colors.text,
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