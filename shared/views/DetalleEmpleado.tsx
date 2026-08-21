import { ThemedText } from '@/components/themed-text';
import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { Colors } from '@/constants/theme';
import { ReportesEmpleado } from '@/features/reportes/components/ReportesEmpleado';
import { FrancosPorEmpleado } from '@/features/solicitudesLicencias/components/FrancosPorEmpleado';
import { PermisosPorEmpleado } from '@/features/solicitudesLicencias/components/PermisosPorEmpleado';
import { VacacionesPorEmpleado } from '@/features/solicitudesLicencias/components/VacacionesPorEmpleado';
import { Ionicons } from '@expo/vector-icons';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type TabType = 'reportes' | 'permisos' | 'francos' | 'vacaciones' | 'rol';

const TABS: { key: TabType; label: string }[] = [
	{ key: 'reportes', label: 'Reportes' },
	{ key: 'permisos', label: 'Permisos' },
	{ key: 'francos', label: 'Francos' },
	{ key: 'vacaciones', label: 'Vacaciones' },
];

const colors = Colors['light'];

export function DetalleEmpleado() {
	const router = useRouter();
	const params = useLocalSearchParams<{ selectedUsers?: string; source?: string }>();
	const queryClient = useQueryClient();
	const [isRefreshing, setIsRefreshing] = useState(false);
	
	const [activeTab, setActiveTab] = useState<TabType>('reportes');

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		await queryClient.invalidateQueries();
		setIsRefreshing(false);
	}, [queryClient]);

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

	const handleComparar = () => {
		const source =
			params.source === 'reportes-encargado'
				? 'reportes-encargado'
				: params.source === 'semaforo'
					? 'semaforo'
					: undefined;

		const destination = source === 'reportes-encargado' ? '/(extras)/reportes-encargado' : '/(extras)/reportes';
		router.push({
			pathname: destination,
			params: {
				comparingWith: JSON.stringify(usuarios),
				source: source ?? 'semaforo',
			},
		});
	};

	const handleRemoveUser = (id: number) => {
		const nuevosUsuarios = usuarios.filter((u: any) => u.id !== id);
		if (nuevosUsuarios.length === 0) {
			router.back();
		} else {
			router.setParams({ selectedUsers: JSON.stringify(nuevosUsuarios) });
		}
	};

	const renderTabContent = (usuario: any) => {
		switch (activeTab) {
			case 'reportes':
				return (
					<ReportesEmpleado
						userId={usuario.id.toString()}
						userNombre={usuario.nombre}
						userApellido={usuario.apellido}
					/>
				);
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
			<View style={styles.container}>
				<View style={styles.emptyContainer}>
					<Ionicons name="people-outline" size={64} color={colors.icon} />
					<ThemedText style={styles.emptyText}>No hay usuarios seleccionados</ThemedText>
				</View>
			</View>
		);
	}

	const shouldUseStaticRoot = usuarios.length === 1;

	const pageContent = (
		<>
			{/* Sección de búsqueda y usuarios seleccionados */}
			<View style={styles.selectionSection}>

				{/* Usuarios seleccionados */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.usersScroll}
				>
					{usuarios.map((u: any) => (
						<View 
							key={u.id} 
							style={[glassStyles.fieldGlass, styles.userBadge]}
						>
							<View style={styles.userAvatar}>
								<ThemedText style={styles.userInitials}>
									{u.nombre?.[0]}{u.apellido?.[0]}
								</ThemedText>
							</View>
							<View style={styles.userNameContainer}>
								<ThemedText style={styles.userNameText} numberOfLines={1}>
									{u.nombre} {u.apellido}
								</ThemedText>
							</View>
							{usuarios.length > 1 && (
								<TouchableOpacity
									onPress={() => handleRemoveUser(u.id)}
									style={styles.removeButton}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons name="close-circle" size={18} color={colors.error} />
								</TouchableOpacity>
							)}
						</View>
					))}

					{usuarios.length < 3 && (
						<TouchableOpacity
							style={styles.addUserButton}
							onPress={handleComparar}
						>
							<Ionicons name="add-circle-outline" size={20} color={glassColors.link} />
							<ThemedText style={styles.addUserText}>
								Comparar
							</ThemedText>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>

			{/* Tabs */}
			<View style={styles.tabsSection}>
				<GlassTabSelector
					tabs={TABS}
					activeKey={activeTab}
					onChange={(key) => setActiveTab(key as TabType)}
				/>
			</View>

			{/* Contenido */}
			<View style={styles.contentContainer}>
				{usuarios.length === 1 ? (
					renderTabContent(usuarios[0])
				) : (
					<ScrollView
						horizontal={true}
						showsHorizontalScrollIndicator={true}
					>
						<View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
							{usuarios.map((u: any) => (
								<View
									key={u.id}
									style={[glassStyles.card, styles.comparisonCard]}
								>
									<View style={styles.comparisonHeader}>
										<ThemedText type="defaultSemiBold">
											{u.nombre} {u.apellido}
										</ThemedText>
									</View>
									<View style={{ flex: 1 }}>
										{renderTabContent(u)}
									</View>
								</View>
							))}
						</View>
					</ScrollView>
				)}
			</View>
		</>
	);

	if (shouldUseStaticRoot) {
		return (
			<View style={styles.container}>
				{pageContent}
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ flexGrow: 1 }}
			refreshControl={
				<RefreshControl
					refreshing={isRefreshing}
					onRefresh={handleRefresh}
					colors={[glassColors.link]}
					tintColor={glassColors.link}
				/>
			}
		>
			{pageContent}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		marginBottom: 32,
		textAlign: 'center',
	},
	selectionSection: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(17,24,28,0.08)',
	},
	usersScroll: {
		gap: 8,
		paddingHorizontal: 4,
		paddingVertical: 4,
	},
	userBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
		gap: 8,
		borderWidth: 1,
		borderColor: 'rgba(26,115,232,0.35)',
		minHeight: 40,
	},
	userAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(26,115,232,0.12)',
	},
	userInitials: {
		color: glassColors.link,
		fontSize: 12,
		fontWeight: 'bold',
	},
	userNameContainer: {
		flex: 1,
		maxWidth: 120,
	},
	userNameText: {
		fontSize: 13,
		fontWeight: '600',
	},
	removeButton: {
		padding: 4,
	},
	addUserButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 6,
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: glassColors.link,
		minHeight: 40,
	},
	addUserText: {
		fontSize: 13,
		fontWeight: '600',
		color: glassColors.link,
	},
	tabsSection: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: 'transparent',
	},
	comparisonCard: {
		width: 320,
		overflow: 'hidden',
	},
	comparisonHeader: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(17,24,28,0.08)',
		backgroundColor: 'rgba(26,115,232,0.08)',
	},
	contentContainer: {
		flex: 1,
	},
});