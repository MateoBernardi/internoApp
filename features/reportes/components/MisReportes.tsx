import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import React, { useCallback, useState } from 'react';
import { glassStyles } from '@/shared/ui/glass';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Reporte } from '../models/Reporte';
import { getReporteEstadoPresentation } from '../presentation';
import { useReportes } from '../viewmodels/useReportes';
import { ReporteModal } from './ReporteModal';


const colors = Colors['light'];

export function MisReportes() {
	const { user } = useAuth();

	// Pasar usuarioId del usuario autenticado
	const { data: reportes, isLoading, error } = useReportes(
		user?.user_context_id?.toString(),
		!!user?.user_context_id
	);

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
			<ScreenSkeleton rows={4} showHeader={false} />
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText style={styles.errorText}>No se pudieron cargar los reportes.</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{(!reportes || reportes.length === 0) ? (
				<View style={styles.centerContainer}>
					<ThemedText type="subtitle">No hay nada para mostar aún.</ThemedText>
				</View>
			) : (
				<OwnFlatList
					data={reportes}
					renderItem={({ item }) => (
						<MiReporteItem
							reporte={item}
							onPress={() => handleOpenReporte(item)}
						/>
					)}
					keyExtractor={(item) => item.id.toString()}
					showSeparators={false}
					contentContainerStyle={{ paddingBottom: 80 }}
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
	onPress: () => void;
}

function MiReporteItem({ reporte, onPress }: MiReporteItemProps) {
	const estado = getReporteEstadoPresentation(reporte.estado);

	return (
		<TouchableOpacity
			onPress={onPress}
			style={[glassStyles.card, styles.itemContainer]}
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
						{ backgroundColor: estado.backgroundColor },
					]}>
						<ThemedText style={[styles.estadoText, { color: estado.color }]}>{estado.label}</ThemedText>
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
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		backgroundColor: colors.componentBackground,
		paddingVertical: '3%',
		paddingHorizontal: '4%',
		borderRadius: 8,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: '4%',
	},
	errorText: {
		marginBottom: 8,
	},
	itemContainer: {
		marginHorizontal: '4%',
		marginVertical: 4,
		paddingHorizontal: '3%',
		paddingVertical: '3%',
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
});
