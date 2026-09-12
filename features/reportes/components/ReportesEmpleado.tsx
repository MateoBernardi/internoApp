import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { CreateButton } from '@/components/ui/CreateButton';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Reporte } from '../models/Reporte';
import { useReportes } from '../viewmodels/useReportes';
import CrearReporte from '../views/CrearReporte';
import { ReporteCard } from './ReporteCard';
import { ReporteModal } from './ReporteModal';


interface ReportesEmpleadoProps {
	userId: string;
	userNombre?: string;
	userApellido?: string;
}

const colors = Colors['light'];

export function ReportesEmpleado({ userId, userNombre = '', userApellido = '' }: ReportesEmpleadoProps) {
	const { hasRole } = useRoleCheck();
	const { data: reportes, isLoading, error } = useReportes(userId);
	const canCreateReporte = hasRole(['gerencia', 'personasRelaciones', 'encargado']);

	const [modalVisible, setModalVisible] = useState(false);
	const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
	const [createModalVisible, setCreateModalVisible] = useState(false);

	const handleOpenReporte = useCallback((reporte: Reporte) => {
		setSelectedReporte(reporte);
		setModalVisible(true);
	}, []);

	const handleCloseModal = useCallback(() => {
		setModalVisible(false);
		setSelectedReporte(null);
	}, []);

	const handleCrearReporte = useCallback(() => {
		setCreateModalVisible(true);
	}, []);

	const handleCloseCreateModal = useCallback(() => {
		setCreateModalVisible(false);
	}, []);


	const renderHeader = useCallback(() => {
		if (!canCreateReporte) return null;

		return (
			<View style={styles.header}>
				<ThemedText style={styles.createLegend}>Generar nuevo reporte</ThemedText>
				<CreateButton onPress={handleCrearReporte} accessibilityLabel="Nuevo reporte" />
			</View>
		);
	}, [canCreateReporte, handleCrearReporte]);

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

	if (!reportes || reportes.length === 0) {
		return (
			<View style={styles.container}>
				{renderHeader()}
				<View style={styles.centerContainer}>
					<ThemedText type="subtitle">No hay reportes para este usuario</ThemedText>
				</View>
				{createModalVisible && (
					<CrearReporte
						visible={createModalVisible}
						onClose={handleCloseCreateModal}
						user_context_id={userId}
						user_nombre={userNombre}
						user_apellido={userApellido}
					/>
				)}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{renderHeader()}
			<OwnFlatList
				data={reportes}
				renderItem={({ item }) => (
					<ReporteCard
						reporte={item}
						headerLabel={`Creado por: ${item.creador_nombre ?? ''} ${item.creador_apellido ?? ''}`.trim()}
						onPress={() => handleOpenReporte(item)}
					/>
				)}
				keyExtractor={(item) => item.id.toString()}
				showSeparators={false}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>
			{selectedReporte && (
				<ReporteModal
					visible={modalVisible}
					onClose={handleCloseModal}
					reporte={selectedReporte}
					origen="empleado"
				/>
			)}
			{createModalVisible && (
				<CrearReporte
					visible={createModalVisible}
					onClose={handleCloseCreateModal}
					user_context_id={userId}
					user_nombre={userNombre}
					user_apellido={userApellido}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.componentBackground,
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
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: '4%',
		paddingVertical: 10,
		backgroundColor: colors.componentBackground,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
	},
	createLegend: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	listContent: {
		paddingBottom: 92,
	},
});
