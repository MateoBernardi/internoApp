import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ReporteStats } from '../models/Reporte';
import { useReporteStats } from '../viewmodels/useReportes';

const colors = Colors['light'];

// Fondo del header de zona: tinte translúcido del mismo color semántico que
// el borde izquierdo, en vez del gris plano que no distinguía una zona de otra.
const zonaConfig: Record<'rojo' | 'amarillo' | 'verde', { label: string; backgroundColor: string; color: string }> = {
	rojo: {
		label: 'Requiere atención',
		backgroundColor: 'rgba(244,67,54,0.08)',
		color: colors.error,
	},
	amarillo: {
		label: 'Requiere seguimiento',
		backgroundColor: 'rgba(255,152,0,0.08)',
		color: colors.warning,
	},
	verde: {
		label: 'Sin novedades',
		backgroundColor: 'rgba(46,125,50,0.08)',
		color: colors.success,
	},
};

interface SemaforoProps {
	query?: string;
	hasActiveFilter?: boolean;
	filteredData?: ReporteStats[];
	comparingWith?: string;
}

export function Semaforo({ query = '', hasActiveFilter = false, filteredData, comparingWith }: SemaforoProps = {}) {
	const { data: stats, error, isLoading } = useReporteStats();
	const [expandedZones, setExpandedZones] = useState<Record<'rojo' | 'amarillo' | 'verde', boolean>>({
		rojo: true,
		amarillo: true,
		verde: true,
	});
	
	// Usar datos filtrados si se proporcionan, de lo contrario usar stats
	const dataToUse = filteredData ?? stats ?? [];

	// Agrupar por zona
	const grouped = useMemo(() => {
		const byZona: Record<'rojo' | 'amarillo' | 'verde', ReporteStats[]> = { rojo: [], amarillo: [], verde: [] };
		const validZonas = ['rojo', 'amarillo', 'verde'] as const;
		
		if (dataToUse.length > 0) {
			for (const s of dataToUse) {
				const zona = s.zona as string;
				if (validZonas.includes(zona as any)) {
					byZona[zona as 'rojo' | 'amarillo' | 'verde'].push(s);
				}
			}
		}
		return byZona;
	}, [dataToUse]);

	const toggleZone = (zona: 'rojo' | 'amarillo' | 'verde') => {
		setExpandedZones(prev => ({
			...prev,
			[zona]: !prev[zona],
		}));
	};

	if (isLoading) {
		return (
			<ScreenSkeleton rows={4} />
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>No se pudieron cargar los datos.</ThemedText>
			</View>
		);
	}

	// Si hay un filtro activo (búsqueda y/o rol) pero no hay resultados
	if (hasActiveFilter && dataToUse.length === 0) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>
					{query ? `No se encontraron resultados para "${query}"` : 'No se encontraron resultados para ese filtro'}
				</ThemedText>
			</View>
		);
	}

	// Sin filtros activos y sin reportes registrados en absoluto
	if (!hasActiveFilter && dataToUse.length === 0) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>No hay reportes registrados.</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{(['rojo', 'amarillo', 'verde'] as const).map((zona) => {
				// Si hay un filtro activo, mostrar solo las zonas que tengan items
				if (hasActiveFilter && grouped[zona].length === 0) {
					return null;
				}
				return (
					<ZonaSection
						key={zona}
						zona={zona}
						items={grouped[zona]}
						isExpanded={expandedZones[zona]}
						onToggle={() => toggleZone(zona)}
						searchQuery={query}
						comparingWith={comparingWith}
					/>
				);
			})}
		</View>
	);
}

function ZonaSection({
	zona,
	items,
	isExpanded,
	onToggle,
	searchQuery,
	comparingWith,
}: {
	zona: 'rojo' | 'amarillo' | 'verde';
	items: ReporteStats[];
	isExpanded: boolean;
	onToggle: () => void;
	searchQuery: string;
	comparingWith?: string;
}) {
	const config = zonaConfig[zona];

	return (
		<View style={[glassStyles.card, styles.zonaSectionContainer, { borderLeftColor: config.color }]}>
			{/* Header collapsible */}
			<TouchableOpacity style={[styles.zonaHeader, { backgroundColor: config.backgroundColor }]} onPress={onToggle}>
				<View style={styles.zonaHeaderContent}>
					<ThemedText style={styles.zonaTitle}>{config.label}</ThemedText>
					<View style={[glassStyles.pill, styles.zonaCount]}>
						<ThemedText style={styles.countText}>{items.length}</ThemedText>
					</View>
				</View>
				<Ionicons
					name={isExpanded ? 'chevron-up' : 'chevron-down'}
					size={24}
					color={colors.text}
				/>
			</TouchableOpacity>

			{/* Contenido expandible */}
			{isExpanded && (
				<View style={styles.zonaContent}>
					{items.map((item, idx) => (
						<SemaforoItem
							key={item.usuario_id}
							item={item}
							comparingWith={comparingWith}
							isLast={idx === items.length - 1}
						/>
					))}
				</View>
			)}
		</View>
	);
}

function SemaforoItem({ item, comparingWith, isLast }: { item: ReporteStats; comparingWith?: string; isLast?: boolean }) {
	const router = useRouter();

	const handlePress = () => {
		const newUser = { id: item.usuario_id, nombre: item.nombre, apellido: item.apellido };

		if (comparingWith) {
			// Comparison mode: add the new user to existing users
			try {
				const existingUsers = JSON.parse(comparingWith) as any[];
				const alreadyExists = existingUsers.some((u: any) => u.id === item.usuario_id);
				if (alreadyExists) return;
				const allUsers = [...existingUsers, newUser];
				router.replace({
					pathname: '/(extras)/detalle-empleados',
					params: {
						selectedUsers: JSON.stringify(allUsers),
						source: 'semaforo',
					},
				});
			} catch {
				router.push({
					pathname: '/(extras)/detalle-empleados',
					params: {
						selectedUsers: JSON.stringify([newUser]),
						source: 'semaforo',
					},
				});
			}
		} else {
			router.push({
				pathname: '/(extras)/detalle-empleados',
				params: {
					selectedUsers: JSON.stringify([newUser]),
					source: 'semaforo',
				},
			});
		}
	};
	return (
		<View style={[styles.itemRow, !isLast && styles.itemRowDivider]}>
			<ThemedText type="defaultSemiBold" onPress={handlePress} style={{ textDecorationLine: 'underline', color: glassColors.link }}>
				{item.nombre} {item.apellido}
			</ThemedText>
			<View style={styles.statsRow}>
				<ThemedText style={[styles.stat, { color: colors.success }]}>+{item.positivos}</ThemedText>
				<ThemedText style={[styles.stat, { color: colors.error }]}>-{item.negativos}</ThemedText>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 8,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	zonaSectionContainer: {
		marginBottom: 16,
		borderLeftWidth: 4,
		borderRadius: 8,
		overflow: 'hidden',
	},
	zonaHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	zonaHeaderContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	zonaTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	zonaCount: {
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		minWidth: 32,
		alignItems: 'center',
	},
	countText: {
		color: colors.text,
		fontWeight: 'bold',
		fontSize: 14,
	},
	zonaContent: {
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	itemRow: {
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	itemRowDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(17,24,28,0.08)',
	},
	statsRow: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 4,
	},
	stat: {
		fontSize: 13,
		fontWeight: '600',
	},
});
