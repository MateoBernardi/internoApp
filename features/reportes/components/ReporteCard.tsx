import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Reporte } from '../models/Reporte';
import { getReporteEstadoPresentation } from '../presentation';

const colors = Colors['light'];

interface ReporteCardProps {
	reporte: Reporte;
	onPress: () => void;
	/** Línea principal del encabezado (ej: creador, o empleado reportado). */
	headerLabel: string;
	/** Línea secundaria opcional (ej: "Creado por: X Y" cuando el header ya muestra al reportado). */
	subLabel?: string;
}

export function ReporteCard({ reporte, onPress, headerLabel, subLabel }: ReporteCardProps) {
	const estado = getReporteEstadoPresentation(reporte.estado);

	return (
		<TouchableOpacity
			onPress={onPress}
			style={[glassStyles.card, styles.itemContainer]}
		>
			<View style={styles.itemContent}>
				<ThemedText type="defaultSemiBold" numberOfLines={1}>{headerLabel}</ThemedText>
				{!!subLabel && (
					<ThemedText style={[styles.description, { color: colors.secondaryText }]} numberOfLines={1}>{subLabel}</ThemedText>
				)}
				<ThemedText style={[styles.description, { color: colors.secondaryText }]}>Incidente: {new Date(reporte.fecha_incidente).toLocaleDateString()}</ThemedText>
				<View style={styles.footerContainer}>
					<View style={[
						styles.estadoBadge,
						{ backgroundColor: estado.backgroundColor },
					]}>
						<ThemedText style={[styles.estadoText, { color: estado.color }]}>{estado.label}</ThemedText>
					</View>
					<ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>Creado: {new Date(reporte.created_at).toLocaleDateString()}</ThemedText>
				</View>
				<ThemedText numberOfLines={1} style={{ marginTop: 4 }}>{reporte.titulo}</ThemedText>
				<ThemedText numberOfLines={2} style={[styles.description, { color: colors.secondaryText }]}>{reporte.descripcion}</ThemedText>
				<ThemedText style={[styles.categoriaText, { color: reporte.categoria === 'POSITIVO' ? colors.success : colors.error }]}>Categoría: {reporte.categoria}</ThemedText>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
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
		gap: 8,
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
