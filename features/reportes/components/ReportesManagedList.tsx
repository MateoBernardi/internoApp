import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Platform,
	StyleSheet,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
	useWindowDimensions,
} from 'react-native';
import type { EstadoReporte, Reporte } from '../models/Reporte';
import { REPORTE_ESTADO_FILTER_OPTIONS } from '../presentation';
import { useReportesManaged } from '../viewmodels/useReportes';
import { ReporteCard } from './ReporteCard';
import { ReporteModal } from './ReporteModal';

const colors = Colors['light'];
const ESTADO_LABELS: Record<EstadoReporte, string> = Object.fromEntries(
	REPORTE_ESTADO_FILTER_OPTIONS.map((o) => [o.value, o.label])
) as Record<EstadoReporte, string>;

/**
 * Lista paginada de todos los reportes visibles para la jerarquía del usuario
 * (encargado/gerencia/etc.), con filtro por estado. Se muestra en la vista
 * Encargado cuando no hay una búsqueda de empleado activa.
 */
export function ReportesManagedList() {
	const { width } = useWindowDimensions();
	const [estadoFilter, setEstadoFilter] = useState<EstadoReporte | null>(null);
	const [isEstadosVisible, setIsEstadosVisible] = useState(false);
	const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useReportesManaged(estadoFilter ?? undefined);

	const reportes = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

	const handleOpenReporte = useCallback((reporte: Reporte) => {
		setSelectedReporte(reporte);
		setModalVisible(true);
	}, []);

	const handleCloseModal = useCallback(() => {
		setModalVisible(false);
		setSelectedReporte(null);
	}, []);

	const handleEndReached = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const modalWidth = Platform.OS === 'web'
		? Math.min(560, Math.max(320, width - 48))
		: Math.min(width - 32, 420);

	if (isLoading) {
		return <ScreenSkeleton rows={4} showHeader={false} />;
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
			<View style={styles.filterRow}>
				<ThemedText type="defaultSemiBold" style={styles.filterLabel}>Todos los reportes</ThemedText>
				<TouchableOpacity style={styles.estadoButton} onPress={() => setIsEstadosVisible(true)}>
					<ThemedText style={styles.estadoButtonText}>
						{estadoFilter ? ESTADO_LABELS[estadoFilter] : 'Estado'}
					</ThemedText>
					<Ionicons name="chevron-down" size={16} color={colors.icon} style={{ marginLeft: 4 }} />
				</TouchableOpacity>
			</View>

			<Modal
				transparent
				visible={isEstadosVisible}
				animationType="fade"
				onRequestClose={() => setIsEstadosVisible(false)}
			>
				<TouchableWithoutFeedback onPress={() => setIsEstadosVisible(false)}>
					<View style={[styles.modalOverlay, Platform.OS === 'web' && styles.modalOverlayWeb]}>
						<TouchableWithoutFeedback>
							<View style={[styles.modalContent, { width: modalWidth }, Platform.OS === 'web' && styles.modalContentWeb]}>
								<ThemedText type="defaultSemiBold" style={{ marginBottom: 10, textAlign: 'center' }}>
									Filtrar por estado
								</ThemedText>
								<TouchableOpacity
									style={styles.modalItem}
									onPress={() => { setEstadoFilter(null); setIsEstadosVisible(false); }}
								>
									<ThemedText style={styles.modalItemText}>Todos</ThemedText>
									{estadoFilter === null && <Ionicons name="checkmark" size={20} color={colors.tint} />}
								</TouchableOpacity>
								{REPORTE_ESTADO_FILTER_OPTIONS.map((opcion) => (
									<TouchableOpacity
										key={opcion.value}
										style={styles.modalItem}
										onPress={() => { setEstadoFilter(opcion.value); setIsEstadosVisible(false); }}
									>
										<ThemedText style={styles.modalItemText}>{opcion.label}</ThemedText>
										{estadoFilter === opcion.value && <Ionicons name="checkmark" size={20} color={colors.tint} />}
									</TouchableOpacity>
								))}
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>

			{reportes.length === 0 ? (
				<View style={styles.centerContainer}>
					<ThemedText type="subtitle">
						{estadoFilter ? 'No hay reportes con ese estado.' : 'No hay reportes registrados.'}
					</ThemedText>
				</View>
			) : (
				<OwnFlatList
					data={reportes}
					renderItem={({ item }) => (
						<ReporteCard
							reporte={item}
							headerLabel={`${item.usuario_nombre ?? ''} ${item.usuario_apellido ?? ''}`.trim()}
							subLabel={`Creado por: ${item.creador_nombre ?? ''} ${item.creador_apellido ?? ''}`.trim()}
							onPress={() => handleOpenReporte(item)}
						/>
					)}
					keyExtractor={(item) => item.id.toString()}
					showSeparators={false}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.4}
					ListFooterComponent={isFetchingNextPage ? (
						<ActivityIndicator color={colors.lightTint} style={{ marginVertical: 16 }} />
					) : null}
				/>
			)}

			{selectedReporte && (
				<ReporteModal
					visible={modalVisible}
					onClose={handleCloseModal}
					reporte={selectedReporte}
					origen="empleado"
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
	filterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: '4%',
		paddingVertical: 10,
	},
	filterLabel: {
		fontSize: 16,
	},
	estadoButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: colors.componentBackground,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(17,24,28,0.12)',
	},
	estadoButtonText: {
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
	modalItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.componentBackground,
	},
	modalItemText: {
		fontSize: 16,
		color: colors.text,
	},
	listContent: {
		paddingBottom: 40,
	},
});
