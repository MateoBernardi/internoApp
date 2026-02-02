import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ReporteStats } from '../models/Reporte';
import { useReporteStats } from '../viewmodels/useReportes';

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

export function Semaforo() {
	const { data: stats, isLoading, error } = useReporteStats();

	// Agrupar por zona
	const grouped = useMemo(() => {
		const byZona: Record<'rojo' | 'amarillo' | 'verde', ReporteStats[]> = { rojo: [], amarillo: [], verde: [] };
		if (stats) {
			for (const s of stats) {
				byZona[s.zona].push(s);
			}
		}
		return byZona;
	}, [stats]);

	if (isLoading) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText>Cargando semáforo...</ThemedText>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<ThemedText type="subtitle" style={styles.errorText}>
					Error al cargar el semáforo
				</ThemedText>
				<ThemedText style={{ color: colors.secondaryText }}>
					{error instanceof Error ? error.message : 'Intenta nuevamente'}
				</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{(['rojo', 'amarillo', 'verde'] as const).map((zona) => (
				<View key={zona} style={styles.zonaSection}>
					<ThemedText type="subtitle" style={[styles.zonaTitle, { color: zonaColors[zona] }]}>{zonaLabels[zona]}</ThemedText>
					<OwnFlatList
						data={grouped[zona]}
						renderItem={({ item }) => <SemaforoItem item={item} />}
						keyExtractor={(item) => item.usuario_id.toString()}
						showSeparators={true}
						containerStyle={styles.flatListContainer}
						ListEmptyComponent={<ThemedText style={styles.emptyText}>Sin usuarios en esta zona</ThemedText>}
					/>
				</View>
			))}
		</View>
	);
}

function SemaforoItem({ item }: { item: ReporteStats }) {
	const router = useRouter();
	const handlePress = () => {
		router.push({
			pathname: '/(extras)/detalle-empleados',
			params: { selectedUsers: JSON.stringify([{ id: item.usuario_id, nombre: item.nombre, apellido: item.apellido }]) },
		});
	};
	return (
		<View style={styles.itemContainer}>
			<ThemedText type="defaultSemiBold" onPress={handlePress} style={{ textDecorationLine: 'underline', color: colors.tint }}>
				{item.nombre} {item.apellido}
			</ThemedText>
			<View style={styles.statsRow}>
				<ThemedText style={[styles.stat, { color: colors.success }]}>+{item.positivos}</ThemedText>
				<ThemedText style={[styles.stat, { color: colors.error }]}>-{item.negativos}</ThemedText>
				<ThemedText style={[styles.stat, { color: colors.icon }]}>Puntos: {item.puntos}</ThemedText>
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
	errorText: {
		marginBottom: 8,
	},
	zonaSection: {
		marginBottom: 24,
	},
	zonaTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	flatListContainer: {
		minHeight: 40,
	},
	emptyText: {
		textAlign: 'center',
		color: colors.secondaryText,
		fontSize: 14,
		marginVertical: 8,
	},
	itemContainer: {
		marginHorizontal: 16,
		marginVertical: 4,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: 'rgba(0,0,0,0.03)',
	},
	statsRow: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 4,
	},
	stat: {
		fontSize: 14,
		fontWeight: '600',
		marginRight: 12,
	},
});
