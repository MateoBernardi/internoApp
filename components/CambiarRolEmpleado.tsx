import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { useBajaUsuario, useSearchUsers, useUpdateUserRole } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const allRoles = [
  { id: 1, label: 'Contable', value: 'contable' },
  { id: 2, label: 'Consejo', value: 'consejo' },
  { id: 3, label: 'Encargado', value: 'encargado' },
  { id: 4, label: 'Gerencia', value: 'gerencia' },
  { id: 5, label: 'Personal', value: 'empleado' },
  { id: 6, label: 'Personas y Relaciones', value: 'personasRelaciones' },
];

const colors = Colors['light'];

export function CambiarRolEmpleado() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  
  const searchUsersQuery = useSearchUsers(searchQuery);
  const updateRolMutation = useUpdateUserRole();
  const bajaMutation = useBajaUsuario();

  const handleSearchClear = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setSelectedRoleId(null);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSelectedRoleId(null);
  };

  const handleCambiarRol = async () => {
    if (!selectedUser?.user_context_id) {
      Alert.alert('Error', 'No se encontró el usuario');
      return;
    }

    if (!selectedRoleId) {
      Alert.alert('Error', 'Por favor selecciona un rol');
      return;
    }

    const rolSeleccionado = allRoles.find(r => r.id === selectedRoleId);
    if (!rolSeleccionado) {
      Alert.alert('Error', 'Rol no válido');
      return;
    }

    Alert.alert(
      'Confirmar cambio de rol',
      `¿Cambiar el rol de ${selectedUser.nombre} ${selectedUser.apellido} a ${rolSeleccionado.label}?`,
      [
        {
          text: 'Cancelar',
          onPress: () => setSelectedRoleId(null),
          style: 'cancel',
        },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              await updateRolMutation.mutateAsync({
                userId: selectedUser.user_context_id,
                roleId: selectedRoleId,
              });

              Alert.alert(
                'Éxito',
                `Rol actualizado a ${rolSeleccionado.label}`
              );
              
              setSelectedUser(null);
              setSelectedRoleId(null);
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Intenta nuevamente'
              );
              setSelectedRoleId(null);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleBajaUsuario = () => {
    if (!selectedUser?.user_context_id) {
      Alert.alert('Error', 'No se encontró el usuario');
      return;
    }

    Alert.alert(
      '⚠️ Dar de baja usuario',
      `¿Estás seguro de que deseas dar de baja a ${selectedUser.nombre} ${selectedUser.apellido}?\n\nEsta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: async () => {
            try {
              await bajaMutation.mutateAsync(selectedUser.user_context_id);
              Alert.alert(
                'Éxito',
                `El usuario ${selectedUser.nombre} ${selectedUser.apellido} ha sido dado de baja.`
              );
              setSelectedUser(null);
              setSelectedRoleId(null);
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Intenta nuevamente'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <>
    <ScrollView 
      style={[{ backgroundColor: colors.componentBackground }]}
      contentContainerStyle={[styles.container]}
    >
      {/* Título */}
      <ThemedText type="title" style={styles.pageTitle}>Gestión de Roles</ThemedText>

      {/* Buscador de usuarios */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Buscar usuario"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleSearchClear}
        />

        {/* Resultados de búsqueda */}
        {searchQuery.length > 1 && (
          <View style={[styles.resultsContainer, { backgroundColor: colors.componentBackground }]}>
            {searchUsersQuery.isPending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.tint} size="large" />
                <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
                  Buscando usuarios...
                </ThemedText>
              </View>
            )}

            {searchUsersQuery.isError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {searchUsersQuery.error instanceof Error
                    ? searchUsersQuery.error.message
                    : 'Intenta nuevamente'}
                </ThemedText>
              </View>
            )}

            {searchUsersQuery.isSuccess && searchUsersQuery.data?.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={32} color={colors.secondaryText} />
                <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
                  No se encontraron usuarios
                </ThemedText>
              </View>
            )}

            {searchUsersQuery.isSuccess && searchUsersQuery.data && (
              <FlatList
                data={searchUsersQuery.data}
                keyExtractor={(item) => item.user_context_id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userResultCard,
                      { borderBottomColor: colors.background }
                    ]}
                    onPress={() => handleSelectUser(item)}
                  >
                    <View style={[styles.userResultAvatar, { backgroundColor: colors.tint }]}>
                      <ThemedText style={styles.userInitials}>
                        {item.nombre?.[0]}{item.apellido?.[0]}
                      </ThemedText>
                    </View>
                    <View style={styles.userResultInfo}>
                      <ThemedText style={styles.userName}>
                        {item.nombre} {item.apellido}
                      </ThemedText>
                      <ThemedText style={[styles.userEmail, { color: colors.secondaryText }]}>
                        {item.email}
                      </ThemedText>
                      <ThemedText style={[styles.userRole, { color: colors.tint }]}>
                        Rol: {item.role?.[0] || 'Sin rol'}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.tint} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* Usuario seleccionado */}
      {selectedUser && (
        <View style={[styles.selectedUserCard, { backgroundColor: colors.componentBackground }]}>
          <View style={styles.selectedUserHeader}>
            <View style={[styles.userAvatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.userInitials}>
                {selectedUser.nombre?.[0]}{selectedUser.apellido?.[0]}
              </ThemedText>
            </View>
            <View style={styles.userInfoContent}>
              <ThemedText style={styles.selectedUserName}>
                {selectedUser.nombre} {selectedUser.apellido}
              </ThemedText>
              <ThemedText style={[styles.userEmail, { color: colors.secondaryText }]}>
                {selectedUser.email}
              </ThemedText>
              <View style={styles.rolActualContainer}>
                <ThemedText style={[styles.rolLabel, { color: colors.secondaryText }]}>
                  Rol actual:
                </ThemedText>
                <ThemedText
                  style={[
                    styles.rolValue,
                    { color: colors.tint, fontWeight: '600' },
                  ]}
                >
                  {selectedUser.role?.[0] || 'Sin rol'}
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedUser(null);
                setSelectedRoleId(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>

          {/* Lista de roles disponibles */}
          <View style={styles.rolesSection}>
            <ThemedText style={styles.sectionTitle}>Selecciona nuevo rol</ThemedText>
            <View style={styles.rolesList}>
              {allRoles.map(rol => {
                const isSelected = selectedRoleId === rol.id;
                const isCurrent = selectedUser.role?.[0] === rol.value;
                const isLoading = updateRolMutation.isPending && selectedRoleId === rol.id;

                return (
                  <TouchableOpacity
                    key={rol.id}
                    style={[
                      styles.roleCard,
                      {
                        borderColor: isSelected ? colors.tint : colors.background,
                        backgroundColor: isCurrent ? colors.tint + '10' : 'transparent',
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (!isCurrent && !isLoading) {
                        setSelectedRoleId(rol.id);
                      }
                    }}
                    disabled={isCurrent || isLoading}
                  >
                    <View style={styles.roleCardContent}>
                      <View style={styles.roleIconContainer}>
                        {isCurrent ? (
                          <View
                            style={[
                              styles.currentBadge,
                              { backgroundColor: colors.success },
                            ]}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.roleIcon,
                              { backgroundColor: colors.tint + '20' },
                            ]}
                          >
                            <Ionicons
                              name="person-circle-outline"
                              size={24}
                              color={colors.tint}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.roleInfo}>
                        <ThemedText style={styles.roleName}>{rol.label}</ThemedText>
                        {isCurrent && (
                          <ThemedText
                            style={[
                              styles.currentLabel,
                              { color: colors.success },
                            ]}
                          >
                            Rol actual
                          </ThemedText>
                        )}
                      </View>

                      {isLoading && (
                        <ActivityIndicator color={colors.tint} size="small" />
                      )}
                      {!isCurrent && !isLoading && (
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={colors.tint}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botones de acción */}
            <View style={styles.actionsContainer}>
              {/* Botón de cambiar rol */}
              <TouchableOpacity
                style={[
                  styles.changeButton,
                  styles.changeRoleButton,
                  {
                    backgroundColor: colors.tint,
                    opacity: !selectedRoleId || updateRolMutation.isPending ? 0.5 : 1,
                  },
                ]}
                onPress={handleCambiarRol}
                disabled={!selectedRoleId || updateRolMutation.isPending}
              >
                {updateRolMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="swap-horizontal" size={18} color={colors.componentBackground} />
                    <ThemedText style={styles.changeButtonText}>Cambiar Rol</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Botón de dar de baja */}
              <TouchableOpacity
                style={[
                  styles.changeButton,
                  styles.bajaButton,
                  {
                    opacity: bajaMutation.isPending ? 0.5 : 1,
                  },
                ]}
                onPress={handleBajaUsuario}
                disabled={bajaMutation.isPending}
              >
                {bajaMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-remove" size={18} color={colors.componentBackground} />
                    <ThemedText style={styles.changeButtonText}>Dar de baja</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Estado de error */}
          {(updateRolMutation.isError || bajaMutation.isError) && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {updateRolMutation.error instanceof Error
                  ? updateRolMutation.error.message
                  : bajaMutation.error instanceof Error
                  ? bajaMutation.error.message
                  : 'Intenta nuevamente'}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </ScrollView>
    <OperacionPendienteModal visible={updateRolMutation.isPending || bajaMutation.isPending} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: colors.componentBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    color: colors.text,
  },
  searchSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    color: colors.text,
  },
  resultsContainer: {
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  userResultCard: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  userResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userResultInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '500',
  },
  userInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.componentBackground,
  },
  selectedUserCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedUserHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContent: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rolActualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  rolLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rolValue: {
    fontSize: 12,
  },
  rolesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
  },
  rolesList: {
    gap: 8,
    marginBottom: 16,
  },
  roleCard: {
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  changeRoleButton: {
    backgroundColor: colors.tint,
  },
  bajaButton: {
    backgroundColor: colors.error,
  },
  changeButtonText: {
    color: colors.componentBackground,
    fontSize: 14,
    fontWeight: '600',
  },
});
