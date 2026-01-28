import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ReportesEmpleado } from '@/features/reportes/components/ReportesEmpleado';
import { FrancosPorEmpleado } from '@/features/solicitudesLicencias/components/FrancosPorEmpleado';
import { PermisosPorEmpleado } from '@/features/solicitudesLicencias/components/PermisosPorEmpleado';
import { VacacionesPorEmpleado } from '@/features/solicitudesLicencias/components/VacacionesPorEmpleado';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type Seccion = 'reportes' | 'permisos' | 'francos' | 'vacaciones';
const SECCIONES: { key: Seccion; label: string }[] = [
	{ key: 'reportes', label: 'Reportes' },
	{ key: 'permisos', label: 'Permisos' },
	{ key: 'francos', label: 'Francos' },
	{ key: 'vacaciones', label: 'Vacaciones' },
];

// Recibe un array de usuarios seleccionados para comparar (mínimo 1, máximo 3)
export function DetalleEmpleado() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const router = useRouter();
	const params = useLocalSearchParams();
	
	const [seccion, setSeccion] = useState<Seccion>('reportes');
	
	// Parsear usuarios desde los params
	const usuarios = useMemo(() => {
		try {
			if (params.selectedUsers && typeof params.selectedUsers === 'string') {
				return JSON.parse(params.selectedUsers);
			}
			return [];
		} catch (error) {
			console.error('Error parseando selectedUsers:', error);
			return [];
		}
	}, [params.selectedUsers]);

	// Handler para ir a comparar (navegar a la pantalla de reportes/semáforo)
	const handleComparar = () => {
		router.push('/(tabs)/user');
	};

	// Handler para quitar usuario de la comparación
	const handleRemoveUser = (id: number) => {
		const nuevosUsuarios = usuarios.filter((u: any) => u.id !== id);
		if (nuevosUsuarios.length === 0) {
			// Si no quedan usuarios, volver atrás
			router.back();
		} else {
			// Actualizar la navegación con los nuevos usuarios
			router.setParams({ selectedUsers: JSON.stringify(nuevosUsuarios) });
		}
	};

	// Renderiza la sección para cada usuario
	const renderSeccion = (usuario: any) => {
		switch (seccion) {
			case 'reportes':
				return <ReportesEmpleado userId={usuario.id.toString()} />;
			case 'permisos':
				return <PermisosPorEmpleado usuarioId={usuario.id} />;
			case 'francos':
				return <FrancosPorEmpleado usuarioId={usuario.id} />;
			case 'vacaciones':
				return <VacacionesPorEmpleado usuarioId={usuario.id} />;
			default:
				return null;
		}
	};

	if (usuarios.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={styles.emptyContainer}>
					<Ionicons name="people-outline" size={64} color={colors.icon} />
					<ThemedText style={styles.emptyText}>No hay usuarios seleccionados</ThemedText>
					<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
						<ThemedText style={styles.backButtonText}>Volver</ThemedText>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header con botón comparar y usuarios seleccionados */}
			<View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.tint }]}>
				<View style={styles.headerTop}>
					<ThemedText type="subtitle" style={styles.headerTitle}>
						Detalle de Empleado{usuarios.length > 1 ? 's' : ''}
					</ThemedText>
					<TouchableOpacity 
						style={[styles.compararBtn, { backgroundColor: colors.tint }]} 
						onPress={handleComparar}
					>
						<Ionicons name="people" size={18} color="white" style={{ marginRight: 6 }} />
						<ThemedText style={styles.compararText}>Ver Todos</ThemedText>
					</TouchableOpacity>
				</View>

				{/* Mostrar usuarios seleccionados */}
				<ScrollView 
					horizontal 
					showsHorizontalScrollIndicator={false}
					style={styles.selectedUsersScroll}
					contentContainerStyle={styles.selectedUsersContent}
				>
					{usuarios.map((u: any) => (
						<View key={u.id} style={[styles.userBadge, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}>
							<View style={[styles.userAvatar, { backgroundColor: colors.tint }]}>
								<ThemedText style={styles.userInitials}>
									{u.nombre?.[0]}{u.apellido?.[0]}
								</ThemedText>
							</View>
							<View style={styles.userInfo}>
								<ThemedText style={styles.userName} numberOfLines={1}>
									{u.nombre} {u.apellido}
								</ThemedText>
							</View>
							{usuarios.length > 1 && (
								<TouchableOpacity 
									onPress={() => handleRemoveUser(u.id)}
									style={styles.removeBtn}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="close-circle" size={20} color="#F44336" />
								</TouchableOpacity>
							)}
						</View>
					))}
					{usuarios.length < 3 && (
						<TouchableOpacity 
							style={[styles.addUserBtn, { borderColor: colors.tint }]}
							onPress={handleComparar}
						>
							<Ionicons name="add-circle-outline" size={24} color={colors.tint} />
							<ThemedText style={[styles.addUserText, { color: colors.tint }]}>
								Agregar
							</ThemedText>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>

			{/* Selector de secciones */}
			<View style={[styles.selectorRow, { backgroundColor: colors.background, borderBottomColor: colors.tint }]}>
				<ScrollView 
					horizontal 
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.selectorContent}
				>
					{SECCIONES.map(s => (
						<TouchableOpacity
							key={s.key}
							style={[
								styles.selectorBtn,
								{ borderColor: colors.tint },
								seccion === s.key && { backgroundColor: colors.tint }
							]}
							onPress={() => setSeccion(s.key)}
						>
							<ThemedText 
								style={[
									styles.selectorText,
									{ color: seccion === s.key ? 'white' : colors.text }
								]}
							>
								{s.label}
							</ThemedText>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			{/* Contenido: columnas por usuario */}
			<ScrollView 
				horizontal={usuarios.length > 1}
				showsHorizontalScrollIndicator={usuarios.length > 1}
				contentContainerStyle={styles.contentScroll}
			>
				<View style={[styles.compararContainer, { gap: usuarios.length > 1 ? 12 : 0 }]}>
					{usuarios.map((u: any, index: number) => (
						<View 
							key={u.id} 
							style={[
								styles.col,
								{ 
									width: usuarios.length === 1 ? '100%' : 340,
									backgroundColor: colors.background,
									borderColor: colors.tint
								}
							]}
						>
							{usuarios.length > 1 && (
								<View style={[styles.colHeader, { backgroundColor: colors.tint + '10' }]}>
									<ThemedText type="defaultSemiBold" style={styles.colHeaderText}>
										{u.nombre} {u.apellido}
									</ThemedText>
								</View>
							)}
							<View style={styles.colContent}>
								{renderSeccion(u)}
							</View>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		marginBottom: 24,
	},
	backButton: {
		backgroundColor: '#00054b',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	backButtonText: {
		color: 'white',
		fontWeight: 'bold',
	},
	header: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	headerTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	compararBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	compararText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 15,
	},
	selectedUsersScroll: {
		marginTop: 4,
	},
	selectedUsersContent: {
		gap: 10,
		paddingVertical: 4,
	},
	userBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		gap: 8,
		borderWidth: 1,
	},
	userAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	userInitials: {
		color: 'white',
		fontSize: 12,
		fontWeight: 'bold',
	},
	userInfo: {
		flex: 1,
		marginRight: 4,
	},
	userName: {
		fontSize: 14,
		fontWeight: '600',
	},
	removeBtn: {
		padding: 2,
	},
	addUserBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 8,
		gap: 6,
		borderWidth: 2,
		borderStyle: 'dashed',
	},
	addUserText: {
		fontSize: 14,
		fontWeight: '600',
	},
	selectorRow: {
		borderBottomWidth: 1,
		paddingVertical: 8,
	},
	selectorContent: {
		paddingHorizontal: 16,
		gap: 8,
	},
	selectorBtn: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
	},
	selectorText: {
		fontWeight: '600',
		fontSize: 14,
	},
	contentScroll: {
		flexGrow: 1,
	},
	compararContainer: {
		flexDirection: 'row',
		padding: 12,
		minWidth: '100%',
	},
	col: {
		borderRadius: 12,
		borderWidth: 1,
		overflow: 'hidden',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	colHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)',
	},
	colHeaderText: {
		fontSize: 15,
	},
	colContent: {
		flex: 1,
	},
});