import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useReportes } from '../viewmodels/useReportes';
import { ReporteModal } from './ReporteModal';

const estadoMapping: Record<EstadoReporte, string> = {
	'PENDIENTE': 'Pendiente',
	'DISPUTA': 'En disputa',
	'ASENTADO': 'Asentado',
	'DESESTIMADO': 'Desestimado',
};

const colors = Colors['light'];

export function MisReportes() {

	// No se pasa usuarioId, el backend lo resuelve
	const { data: reportes, isLoading, error } = useReportes();

	const [modalVisible, setModalVisible] = useState(false);
	const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);

	const handleOpenReporte = useCallback((reporte: Reporte) => {
		setSelectedReporte(reporte);
		setModalVisible(true);
	}, []);

	const handleCloseModal = useCallback(() => {
		setModalVisible(false);
		setSelectedReporte(null);
	}, []);

	if (isLoading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color={colors.tint} />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText type="subtitle" style={styles.errorText}>
					Error al cargar reportes
				</ThemedText>
				<ThemedText style={{ color: colors.icon }}>
					{error instanceof Error ? error.message : 'Intenta nuevamente'}
				</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{(!reportes || reportes.length === 0) ? (
				<View style={styles.centerContainer}>
					<ThemedText type="subtitle">No hay reportes enviados</ThemedText>
				</View>
			) : (
				<OwnFlatList
					data={reportes}
					renderItem={({ item }) => (
						<MiReporteItem
							reporte={item}
							estadoUI={estadoMapping[item.estado] || item.estado}
							onPress={() => handleOpenReporte(item)}
						/>
					)}
					keyExtractor={(item) => item.id.toString()}
					showSeparators={true}
				/>
			)}
			{selectedReporte && (
				<ReporteModal
					visible={modalVisible}
					onClose={handleCloseModal}
					reporte={selectedReporte}
					origen="mis"
				/>
			)}
		</View>
	);
}

interface MiReporteItemProps {
	reporte: Reporte;
	estadoUI: string;
	onPress: () => void;
}

function MiReporteItem({ reporte, estadoUI, onPress }: MiReporteItemProps) {
	const getEstadoColor = (estado: string): string => {
		switch (estado) {
			case 'Pendiente':
				return '#FF9800';
			case 'En disputa':
				return '#F44336';
			case 'Asentado':
				return '#4CAF50';
			case 'Desestimado':
				return '#9C27B0';
			default:
				return colors.icon;
		}
	};

	return (
		<TouchableOpacity
			onPress={onPress}
			style={[
				styles.itemContainer,
				{ backgroundColor: colors.componentBackground },
			]}
		>
			<View style={styles.itemContent}>
				{/* Nombre y apellido del creador */}
				<ThemedText type="defaultSemiBold" numberOfLines={1}>
					{reporte.creador_nombre} {reporte.creador_apellido}
				</ThemedText>
				{/* Fecha incidente */}
				<ThemedText style={[styles.description, { color: colors.icon }]}>Incidente: {new Date(reporte.fecha_incidente).toLocaleDateString()}</ThemedText>
				{/* Estado */}
				<View style={styles.footerContainer}>
					<View style={[
						styles.estadoBadge,
						{ backgroundColor: getEstadoColor(estadoUI) + '20' },
					]}>
						<ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>{estadoUI}</ThemedText>
					</View>
					<ThemedText style={[styles.dateText, { color: colors.icon }]}>Creado: {new Date(reporte.created_at).toLocaleDateString()}</ThemedText>
				</View>
				{/* Título */}
				<ThemedText numberOfLines={1} style={{ marginTop: 4 }}>{reporte.titulo}</ThemedText>
				{/* Descripción */}
				<ThemedText numberOfLines={2} style={[styles.description, { color: colors.icon }]}>{reporte.descripcion}</ThemedText>
				{/* Categoría */}
				<ThemedText style={[styles.categoriaText, { color: reporte.categoria === 'POSITIVO' ? colors.success : colors.error }]}>Categoría: {reporte.categoria}</ThemedText>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	errorText: {
		marginBottom: 8,
	},
	itemContainer: {
		marginHorizontal: 16,
		marginVertical: 4,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRadius: 8,
	},
	itemContent: {
		flexDirection: 'column',
	},
	description: {
		fontSize: 13,
		marginTop: 4,
	},
	categoriaText: {
		fontSize: 12,
		marginTop: 4,
		fontWeight: '600',
	},
	footerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	dateText: {
		fontSize: 12,
	},
	estadoBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	estadoText: {
		fontSize: 11,
		fontWeight: '600',
	},
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
	},
});
