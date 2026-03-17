import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ReportesEmpleado } from '../components/ReportesEmpleado';

const colors = Colors['light'];

export default function CrearReporteEncargado() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

	const { data: usuarios, isLoading: isSearching } = useSearchUsers(searchQuery);

	const handleSelectUser = useCallback((user: UserSummary) => {
		setSelectedUser(user);
		setSearchQuery('');
	}, []);

	const handleClearSelection = useCallback(() => {
		setSelectedUser(null);
		setSearchQuery('');
	}, []);

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
				{selectedUser ? (
					<TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
						<ThemedText style={styles.clearButtonText}>Cambiar</ThemedText>
					</TouchableOpacity>
				) : (
					<View style={styles.iconButton} />
				)}
				<ThemedText style={styles.headerTitle}>
					{selectedUser
						? `${selectedUser.nombre} ${selectedUser.apellido}`
						: 'Reportes de Empleados'}
				</ThemedText>
				<View style={{ width: 40 }} />
			</View>

			{/* Vista sin usuario seleccionado: buscador + resultados */}
			{!selectedUser && (
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
								Busca un empleado para ver sus reportes
							</ThemedText>
							<ThemedText style={styles.hintText}>
								Escribe al menos 2 caracteres para buscar
							</ThemedText>
						</View>
					)}
				</View>
			)}

			{/* Vista con usuario seleccionado: reportes del empleado */}
			{selectedUser && (
				<ReportesEmpleado
					userId={selectedUser.user_context_id.toString()}
					userNombre={selectedUser.nombre}
					userApellido={selectedUser.apellido}
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
	clearButton: {
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	clearButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.lightTint,
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
