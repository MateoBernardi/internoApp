import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const colors = Colors['light'];

export default function CrearReporteEncargado() {
	const router = useRouter();
	const params = useLocalSearchParams<{ comparingWith?: string }>();
	const [searchQuery, setSearchQuery] = useState('');

	const { data: usuarios, isLoading: isSearching } = useSearchUsers(searchQuery);
	const isComparingMode = typeof params.comparingWith === 'string' && params.comparingWith.length > 0;

	const comparingUsers = useMemo(() => {
		if (!isComparingMode || typeof params.comparingWith !== 'string') {
			return [] as Array<{ id: number; nombre: string; apellido: string }>;
		}

		try {
			const parsed = JSON.parse(params.comparingWith) as Array<{ id: number; nombre: string; apellido: string }>;
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}, [isComparingMode, params.comparingWith]);

	const handleSelectUser = useCallback((user: UserSummary) => {
		const newUser = { id: user.user_context_id, nombre: user.nombre, apellido: user.apellido };

		if (isComparingMode) {
			const alreadyExists = comparingUsers.some((existingUser) => existingUser.id === newUser.id);
			if (alreadyExists) {
				setSearchQuery('');
				return;
			}

			const allUsers = [...comparingUsers, newUser].slice(0, 3);
			router.replace({
				pathname: '/(extras)/detalle-empleados',
				params: {
					selectedUsers: JSON.stringify(allUsers),
					source: 'reportes-encargado',
				},
			});
			setSearchQuery('');
			return;
		}

		router.push({
			pathname: '/(extras)/detalle-empleados',
			params: {
				selectedUsers: JSON.stringify([newUser]),
				source: 'reportes-encargado',
			},
		});
		setSearchQuery('');
	}, [comparingUsers, isComparingMode, router]);

	const renderUserItem = useCallback(({ item }: { item: UserSummary }) => (
		<TouchableOpacity
			style={styles.userItem}
			onPress={() => handleSelectUser(item)}
		>
			<View style={styles.userAvatar}>
				<ThemedText style={styles.userInitial}>
					{item.nombre?.charAt(0)?.toUpperCase() || '?'}
				</ThemedText>
			</View>
			<View style={styles.userInfo}>
				<ThemedText type="defaultSemiBold">
					{item.nombre} {item.apellido}
				</ThemedText>
				<ThemedText style={styles.userEmail}>{item.email}</ThemedText>
			</View>
			<Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
		</TouchableOpacity>
	), [handleSelectUser]);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.iconButton} />
				<ThemedText style={styles.headerTitle}>
					Reportes de Empleados
				</ThemedText>
				<View style={{ width: 40 }} />
			</View>

			{isComparingMode && (
				<View style={styles.compareBanner}>
					<ThemedText style={styles.compareBannerText}>
						Selecciona un empleado para comparar
					</ThemedText>
				</View>
			)}

			<View style={styles.searchSection}>
				<SearchBar
					placeholder="Buscar empleado por nombre..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					onClear={() => setSearchQuery('')}
				/>

				{isSearching && searchQuery.length > 1 && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color={colors.tint} />
						<ThemedText style={styles.loadingText}>Buscando...</ThemedText>
					</View>
				)}

				{!isSearching && usuarios && usuarios.length > 0 && (
					<FlatList
						data={usuarios}
						renderItem={renderUserItem}
						keyExtractor={(item) => item.user_context_id.toString()}
						style={styles.userList}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						contentContainerStyle={styles.listContent}
					/>
				)}

				{!isSearching && searchQuery.length > 1 && usuarios && usuarios.length === 0 && (
					<View style={styles.emptyContainer}>
						<Ionicons name="search-outline" size={48} color={colors.secondaryText} />
						<ThemedText style={styles.emptyText}>
							No se encontraron empleados
						</ThemedText>
					</View>
				)}

				{searchQuery.length <= 1 && !isSearching && (
					<View style={styles.emptyContainer}>
						<Ionicons name="people-outline" size={48} color={colors.secondaryText} />
						<ThemedText style={styles.emptyText}>
							{isComparingMode
								? `Seleccionados para comparar: ${comparingUsers.length}`
								: 'Busca un empleado para ver sus reportes'}
						</ThemedText>
						<ThemedText style={styles.hintText}>
							Escribe al menos 2 caracteres para buscar
						</ThemedText>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.componentBackground,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: '4%',
		paddingVertical: '3%',
	},
	headerTitle: {
		fontSize: 18,
		color: colors.text,
		fontWeight: '600',
		flex: 1,
		textAlign: 'center',
	},
	iconButton: {
		padding: 8,
	},
	compareBanner: {
		backgroundColor: colors.lightTint + '15',
		paddingVertical: '2.5%',
		paddingHorizontal: '4%',
	},
	compareBannerText: {
		color: colors.lightTint,
		fontWeight: '600',
		textAlign: 'center',
		fontSize: 14,
	},
	searchSection: {
		flex: 1,
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		gap: 8,
	},
	loadingText: {
		fontSize: 14,
		color: colors.secondaryText,
	},
	userList: {
		flex: 1,
	},
	listContent: {
		paddingBottom: 20,
	},
	userItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: '4%',
		paddingVertical: '3%',
	},
	userAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.lightTint,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	userInitial: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.componentBackground,
	},
	userInfo: {
		flex: 1,
	},
	userEmail: {
		fontSize: 13,
		color: colors.secondaryText,
		marginTop: 2,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.background,
		marginHorizontal: '4%',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: '8%',
		gap: 12,
	},
	emptyText: {
		fontSize: 16,
		color: colors.secondaryText,
		textAlign: 'center',
	},
	hintText: {
		fontSize: 13,
		color: colors.icon,
		textAlign: 'center',
	},
});
