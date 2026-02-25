import { ThemedText } from '@/components/themed-text';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	ListRenderItem,
	StyleSheet,
	TouchableOpacity,
	View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useReportes } from '../viewmodels/useReportes';
import { ReporteModal } from './ReporteModal';

const estadoMapping: Record<EstadoReporte, string> = {
	'PENDIENTE': 'Pendiente',
	'DISPUTA': 'En disputa',
	'ASENTADO': 'Asentado',
	'DESESTIMADO': 'Desestimado',
};

interface ReportesEmpleadoProps {
	userId: string;
	userNombre?: string;
	userApellido?: string;
}	

const colors = Colors['light'];

export function ReportesEmpleado({ userId, userNombre = '', userApellido = '' }: ReportesEmpleadoProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { data: reportes, isLoading, error } = useReportes(userId);

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

	const handleCrearReporte = useCallback(() => {
		router.push({
			pathname: '/(extras)/crear-reporte',
			params: {
				user_context_id: userId,
				user_nombre: userNombre,
				user_apellido: userApellido,
			},
		});
	}, [router, userId, userNombre, userApellido]);

	const renderSeparator = useCallback(() => {
		return (
			<View
				style={{
					height: StyleSheet.hairlineWidth,
					backgroundColor: colors.secondaryText,
					marginHorizontal: 16,
				}}
			/>
		);
	}, []);

	const renderItem: ListRenderItem<Reporte> = useCallback(({ item }) => {
		return (
			<MiReporteItem
				reporte={item}
				estadoUI={estadoMapping[item.estado] || item.estado}
				onPress={() => handleOpenReporte(item)}
			/>
		);
	}, [handleOpenReporte]);

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

	if (!reportes || reportes.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.centerContainer}>
					<ThemedText type="subtitle">No hay reportes para este usuario</ThemedText>
				</View>
				<CreateButton
					onPress={handleCrearReporte}
					style={{ ...styles.createButton, bottom: insets.bottom + 16, right: 36 }}
					accessibilityLabel="Crear nuevo reporte"
				/>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={reportes}
				renderItem={renderItem}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={{ paddingBottom: 80 }}
				ItemSeparatorComponent={renderSeparator}
			/>
			{selectedReporte && (
				<ReporteModal
					visible={modalVisible}
					onClose={handleCloseModal}
					reporte={selectedReporte}
					origen="empleado"
				/>
			)}
			<CreateButton
				onPress={handleCrearReporte}
				style={{ ...styles.createButton, bottom: insets.bottom + 16, right: 36 }}
				accessibilityLabel="Crear nuevo reporte"
			/>
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
					Creado por: {reporte.creador_nombre} {reporte.creador_apellido}
				</ThemedText>
				{/* Fecha incidente */}
				<ThemedText style={[styles.description, { color: colors.text }]}>Incidente: {new Date(reporte.fecha_incidente).toLocaleDateString()}</ThemedText>
				{/* Estado */}
				<View style={styles.footerContainer}>
					<View style={[
						styles.estadoBadge,
						{ backgroundColor: getEstadoColor(estadoUI) + '20' },
					]}>
						<ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>{estadoUI}</ThemedText>
					</View>
					<ThemedText style={[styles.dateText, { color: colors.text }]}>Creado: {new Date(reporte.created_at).toLocaleDateString()}</ThemedText>
				</View>
				{/* Título */}
				<ThemedText numberOfLines={1} style={{ marginTop: 4 }}>{reporte.titulo}</ThemedText>
				{/* Descripción */}
				<ThemedText numberOfLines={2} style={[styles.description, { color: colors.text }]}>{reporte.descripcion}</ThemedText>
				{/* Categoría */}
				<ThemedText style={[styles.categoriaText, { color: reporte.categoria === 'POSITIVO' ? colors.success : colors.error }]}>Categoría: {reporte.categoria}</ThemedText>
			</View>
		</TouchableOpacity>
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
		paddingHorizontal: 16,
	},
	errorText: {
		marginBottom: 8,
	},
	createButton: {
		position: 'absolute',
		right: 36,
	},
	itemContainer: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.componentBackground,
	},
	itemContent: {
		flexDirection: 'column',
	},
	description: {
		fontSize: 13,
		marginTop: 4,
		color: colors.secondaryText,
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
		gap: 8,
	},
	dateText: {
		fontSize: 12,
		color: colors.secondaryText,
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
