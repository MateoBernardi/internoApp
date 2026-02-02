
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
  View,
} from 'react-native';
import { SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';

interface PermisosPorEmpleadoProps {
	usuarioId: number;
}

const colors = Colors['light'];


export function PermisosPorEmpleado({ usuarioId }: PermisosPorEmpleadoProps) {
	const { data, isLoading, error } = useGetSolicitudesLicencias({ usuario_id: usuarioId, tipo_licencia_id: 3 });

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

	const renderItem: ListRenderItem<SolicitudLicencia> = useCallback(({ item }) => {
		return <PermisoItem item={item} />;
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
					Error al cargar permisos
				</ThemedText>
				<ThemedText style={{ color: colors.icon }}>
					{error instanceof Error ? error.message : 'Intenta nuevamente'}
				</ThemedText>
			</View>
		);
	}

	if (!data || data.length === 0) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText type="subtitle">No hay permisos solicitados por este usuario.</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={data}
				keyExtractor={item => item.id.toString()}
				renderItem={renderItem}
				scrollEnabled={false}
				ItemSeparatorComponent={renderSeparator}
			/>
		</View>
	);
}

function PermisoItem({ item }: { item: SolicitudLicencia }) {
	return (
		<View style={styles.card}>
			<View style={styles.row}>
				<ThemedText type="defaultSemiBold" style={styles.title}>
					{item.fecha_inicio} a {item.fecha_fin}
				</ThemedText>
				<ThemedText style={[styles.estado, { color: colors.icon }]}>{item.estado}</ThemedText>
			</View>
			<ThemedText style={styles.label}>Días: <ThemedText>{item.cantidad_dias}</ThemedText></ThemedText>
			<ThemedText style={styles.label}>Solicitada el: <ThemedText>{new Date(item.created_at).toLocaleDateString()}</ThemedText></ThemedText>
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
		paddingHorizontal: 16,
	},
	errorText: {
		marginBottom: 8,
	},
	card: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.componentBackground,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	title: {
		fontSize: 16,
	},
	estado: {
		fontWeight: 'bold',
		fontSize: 13,
		textTransform: 'capitalize',
	},
	label: {
		color: colors.secondaryText,
		fontSize: 13,
		marginBottom: 2,
	},
});
