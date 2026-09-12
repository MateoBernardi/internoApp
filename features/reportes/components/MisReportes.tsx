import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Reporte } from '../models/Reporte';
import { useReportes } from '../viewmodels/useReportes';
import { ReporteCard } from './ReporteCard';
import { ReporteModal } from './ReporteModal';

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
						<ReporteCard
							reporte={item}
							headerLabel={`${item.creador_nombre ?? ''} ${item.creador_apellido ?? ''}`.trim()}
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

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
});
