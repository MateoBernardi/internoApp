import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ReporteStats } from '../models/Reporte';
import { useReporteStats, useTopEmployee, useUpgradedEmployee } from '../viewmodels/useReportes';

// Nota: La API devuelve zona_alerta, no zona
type ReporteStatsAPI = ReporteStats & {
	zona_alerta?: 'rojo' | 'amarillo' | 'verde';
	user_context_id?: number;
	rol_nombre?: string;
	cantidad_neta?: number;
	negativos_puros?: number;
	positivos_puros?: number;
};

const colors = Colors['light'];

const zonaLabels: Record<'rojo' | 'amarillo' | 'verde', string> = {
	rojo: 'Zona Roja',
	amarillo: 'Zona Amarilla',
	verde: 'Zona Verde',
};

const zonaColors: Record<'rojo' | 'amarillo' | 'verde', string> = {
	rojo: colors.error,
	amarillo: colors.warning,
	verde: colors.success,
};

// Type guard para validar zona
type ZonaValida = 'rojo' | 'amarillo' | 'verde';
const isZonaValida = (zona: any): zona is ZonaValida => {
	return zona === 'rojo' || zona === 'amarillo' || zona === 'verde';
};

// Exportación nombrada como "Reportes"
export function Reportes() {
	const router = useRouter();
	const params = useLocalSearchParams();
	
	const [searchQuery, setSearchQuery] = useState('');

	const { data: stats, error: statsError } = useReporteStats();
	const { data: topEmployee, error: topError } = useTopEmployee();
	const { data: upgradedEmployee, error: upgradedError } = useUpgradedEmployee();

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

	// Agrupar por zona
	const grouped = useMemo(() => {
		const byZona: Record<ZonaValida, ReporteStats[]> = {
			rojo: [],
			amarillo: [],
			verde: [],
		};
		
		filteredStats.forEach((s) => {
			// Usar zona_alerta que es el campo real de la API
			const zona = (s as any).zona_alerta || s.zona;
			
			// Debug: ver qué zonas están llegando
			if (!isZonaValida(zona)) {
				console.warn('Zona inválida encontrada:', zona, 'Usuario:', s.nombre, s.apellido);
				return;
			}
			
			// Ahora TypeScript sabe que zona es válido
			byZona[zona].push(s);
		});
		return byZona;
	}, [filteredStats]);

	return (
		<ScrollView 
			style={styles.container}
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.scrollContent}
		>
			{/* Buscador */}
			<SearchBar
				placeholder="Buscar por nombre o apellido..."
				value={searchQuery}
				onChangeText={setSearchQuery}
				onClear={() => setSearchQuery('')}
				style={styles.searchBar}
			/>

			{/* Tarjetas de empleados destacados */}
			<View style={styles.cardsContainer}>
				<TopEmployeeCard data={topEmployee} error={topError} />
				<UpgradedEmployeeCard data={upgradedEmployee} error={upgradedError} />
			</View>

			{/* Título del semáforo */}
			<ThemedText type="subtitle" style={styles.semaforoTitle}>
				Semáforo de Desempeño
			</ThemedText>

			{/* Semáforo */}
			<View style={styles.semaforoContainer}>
				{statsError ? (
					<View style={styles.centerContainer}>
						<ThemedText type="subtitle" style={styles.errorText}>
							Error al cargar el semáforo
						</ThemedText>
						<ThemedText style={{ color: colors.icon }}>
							{statsError instanceof Error ? statsError.message : 'Intenta nuevamente'}
						</ThemedText>
					</View>
				) : (
					(['rojo', 'amarillo', 'verde'] as const).map((zona) => (
						<View key={zona} style={styles.zonaSection}>
							<View style={styles.zonaTitleContainer}>
								<View style={[styles.zonaIndicator, { backgroundColor: zonaColors[zona] }]} />
								<ThemedText type="subtitle" style={styles.zonaTitle}>
									{zonaLabels[zona]}
								</ThemedText>
								<ThemedText style={[styles.zonaCount, { color: colors.secondaryText }]}>
									({grouped[zona].length})
								</ThemedText>
							</View>
							<OwnFlatList
								data={grouped[zona]}
								renderItem={({ item }) => <SemaforoItem item={item} />}
								keyExtractor={(item) => {
									const itemAPI = item as any;
									const id = itemAPI.user_context_id ?? item.usuario_id ?? Math.random();
									return id.toString();
								}}
								showSeparators={true}
								containerStyle={styles.flatListContainer}
								ListEmptyComponent={
									<ThemedText style={styles.emptyText}>
										{searchQuery ? 'No se encontraron resultados' : 'Sin usuarios en esta zona'}
									</ThemedText>
								}
							/>
						</View>
					))
				)}
			</View>
		</ScrollView>
	);
}

// Componente de tarjeta Top Employee
function TopEmployeeCard({ data, isLoading, error }: any) {
	if (isLoading) {
		return (
			<View style={[styles.card, styles.topCard]}>
				<ActivityIndicator size="small" color={colors.success} />
			</View>
		);
	}

	if (error || !data || data.length === 0) {
		return (
			<View style={[styles.card, styles.topCard]}>
				<Ionicons name="trophy-outline" size={40} color={colors.icon} />
				<ThemedText style={styles.emptyCardText}>Sin datos</ThemedText>
			</View>
		);
	}

	const empleado = data[0];
	const iniciales = `${empleado.nombre}${empleado.apellido}`.toUpperCase();
	const positivos = empleado.positivos_puros ?? empleado.positivos ?? 0;

	return (
		<View style={[styles.card, styles.topCard]}>
			<View style={[styles.iconCircle, styles.topIconCircle]}>
				<ThemedText style={styles.iconText}>{iniciales}</ThemedText>
			</View>
			<ThemedText type="subtitle" style={styles.cardTitle}>
				Más comentarios positivos
			</ThemedText>
			<ThemedText style={styles.positiveCount}>+{positivos}</ThemedText>
			<ThemedText style={styles.cardName} numberOfLines={1}>
				{empleado.nombre} {empleado.apellido}
			</ThemedText>
		</View>
	);
}

// Componente de tarjeta Upgraded Employee
function UpgradedEmployeeCard({ data, isLoading, error }: any) {
	if (isLoading) {
		return (
			<View style={[styles.card, styles.upgradedCard]}>
				<ActivityIndicator size="small" color={colors.lightTint} />
			</View>
		);
	}

	if (error || !data || data.length === 0) {
		return (
			<View style={[styles.card, styles.upgradedCard]}>
				<Ionicons name="trending-up-outline" size={40} color={colors.icon} />
				<ThemedText style={styles.emptyCardText}>Sin datos</ThemedText>
			</View>
		);
	}

	const empleado = data[0];
	const iniciales = `${empleado.nombre}${empleado.apellido}`.toUpperCase();
	const puntos = empleado.cantidad_neta ?? empleado.puntos ?? 0;

	return (
		<View style={[styles.card, styles.upgradedCard]}>
			<View style={[styles.iconCircle, styles.upgradedIconCircle]}>
				<ThemedText style={styles.iconText}>{iniciales}</ThemedText>
			</View>
			<ThemedText type="subtitle" style={styles.cardTitle}>
				Más mejoras (3 meses)
			</ThemedText>
			<View style={styles.upRow}>
				<Ionicons name="arrow-up" size={24} color={colors.lightTint} />
				<ThemedText style={styles.upgradedCount}>{puntos}</ThemedText>
			</View>
			<ThemedText style={styles.cardName} numberOfLines={1}>
				{empleado.nombre} {empleado.apellido}
			</ThemedText>
		</View>
	);
}

// Componente de item del semáforo
function SemaforoItem({ item }: { item: ReporteStats }) {
	const router = useRouter();
	
	// Mapear campos de la API a los esperados
	const itemAPI = item as any;
	const positivos = itemAPI.positivos_puros ?? item.positivos ?? 0;
	const negativos = itemAPI.negativos_puros ?? item.negativos ?? 0;
	const puntos = itemAPI.cantidad_neta ?? item.puntos ?? 0;
	const usuarioId = itemAPI.user_context_id ?? item.usuario_id;
	
	const handlePress = () => {
		router.push({
			pathname: '/(extras)/detalle-empleados',
			params: {
				selectedUsers: JSON.stringify([
					{ id: usuarioId, nombre: item.nombre, apellido: item.apellido },
				]),
			},
		});
	};

	return (
		<View style={[styles.itemContainer, { backgroundColor: colors.componentBackground }]}>
			<ThemedText
				type="defaultSemiBold"
				onPress={handlePress}
				style={[styles.itemName, { color: colors.tint }]}
			>
				{item.nombre} {item.apellido}
			</ThemedText>
			<View style={styles.statsRow}>
				<View style={styles.statBadge}>
					<Ionicons name="arrow-up" size={14} color={colors.success} />
					<ThemedText style={[styles.stat, styles.positiveText]}>{positivos}</ThemedText>
				</View>
				<View style={styles.statBadge}>
					<Ionicons name="arrow-down" size={14} color={colors.error} />
					<ThemedText style={[styles.stat, styles.negativeText]}>{negativos}</ThemedText>
				</View>
				<View style={styles.statBadge}>
					<Ionicons name="star" size={14} color={colors.warning} />
					<ThemedText style={[styles.stat, { color: colors.text }]}>{puntos}</ThemedText>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 24,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
	},
	errorText: {
		marginBottom: 8,
		color: colors.error,
	},
	searchBar: {
		marginHorizontal: 12,
		marginTop: 12,
		marginBottom: 16,
	},
	cardsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		paddingHorizontal: 8,
		marginBottom: 20,
		gap: 12,
	},
	card: {
		flex: 1,
		maxWidth: 180,
		minHeight: 200,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		paddingHorizontal: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 10,
		elevation: 5,
	},
	topCard: {
		backgroundColor: colors.componentBackground,
	},
	upgradedCard: {
		backgroundColor: colors.componentBackground,
	},
	iconCircle: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	topIconCircle: {
		backgroundColor: colors.success,
	},
	upgradedIconCircle: {
		backgroundColor: colors.lightTint,
	},
	iconText: {
		color: colors.text,
		fontSize: 26,
		fontWeight: 'bold',
	},
	cardTitle: {
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 8,
		color: colors.text,
	},
	positiveCount: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.success,
		marginBottom: 4,
	},
	upRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 4,
	},
	upgradedCount: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.lightTint,
	},
	cardName: {
		fontSize: 14,
		color: colors.text,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: 4,
	},
	emptyCardText: {
		fontSize: 13,
		color: colors.text,
		marginTop: 8,
	},
	semaforoTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginHorizontal: 16,
		marginBottom: 16,
		marginTop: 8,
	},
	semaforoContainer: {
		paddingHorizontal: 8,
	},
	zonaSection: {
		marginBottom: 24,
	},
	zonaTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		paddingHorizontal: 12,
	},
	zonaIndicator: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: 8,
	},
	zonaTitle: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	zonaCount: {
		fontSize: 16,
		marginLeft: 6,
		fontWeight: '500',
	},
	flatListContainer: {
		minHeight: 40,
	},
	emptyText: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 14,
		marginVertical: 12,
		fontStyle: 'italic',
	},
	itemContainer: {
		marginHorizontal: 12,
		marginVertical: 6,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.background,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
	itemName: {
		fontSize: 16,
		marginBottom: 8,
		textDecorationLine: 'underline',
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
		flexWrap: 'wrap',
	},
	statBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: colors.componentBackground,
	},
	stat: {
		fontSize: 14,
		fontWeight: '600',
	},
	positiveText: {
		color: colors.success,
	},
	negativeText: {
		color: colors.error,
	},
});