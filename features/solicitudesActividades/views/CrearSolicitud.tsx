import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Usuario } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { UserSelector } from '../components/UserSelector';
import { useCrearSolicitud } from '../viewmodels/useSolicitudes';

export function CrearSolicitud() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
  const [fechaFin, setFechaFin] = useState<Date>(new Date(Date.now() + 3600000)); // +1 hora
  const [allDay, setAllDay] = useState(false);
  const [tipoActividad, setTipoActividad] = useState<'REUNION' | 'MANDATO'>('REUNION');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'start' | 'end' | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);

  const users = useMemo(() => {
      const list = (searchResults as any)?.data || searchResults;
      return Array.isArray(list) ? list.map((u: any) => ({
          ...u,
          id: u.id_usuario || u.id 
      })) : [];
  }, [searchResults]);

  // Role Selection Logic
  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<Usuario[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

  const [selectedUsers, setSelectedUsers] = useState<Usuario[]>([]);
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  React.useEffect(() => {
      // Logic: if new role data comes in, prepare it for the modal and open it.
      if (activeRole && roleUsersData) {
          const roleUsersList = (roleUsersData as any)?.data || roleUsersData;
          if (Array.isArray(roleUsersList)) {
               const mappedUsers = roleUsersList.map((u: any) => ({
                   ...u,
                   id: u.id_usuario || u.id
               }));
               setRoleUsers(mappedUsers);
               setShowRoleModal(true);
          }
      } else if (roleError) {
          Alert.alert("No se encontraron usuarios con ese rol");
          setActiveRole('');
      }
  }, [roleUsersData, activeRole, roleError]);

  const handleCloseRoleModal = () => {
      setShowRoleModal(false);
      setActiveRole(''); // Reset to allow re-selection
      setRoleUsers([]);
  };

  const handleToggleUser = useCallback((user: Usuario) => {
      setSelectedUsers(prev => {
          const isSelected = prev.some(u => u.id === user.id);
          if (isSelected) {
              return prev.filter(u => u.id !== user.id);
          } else {
              return [...prev, user];
          }
      });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: Usuario[]) => {
      setSelectedUsers(prev => {
          const prevIds = new Set(prev.map(u => u.id));
          const newUsers = usersToSelect.filter(u => !prevIds.has(u.id));
          return [...prev, ...newUsers];
      });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: Usuario[]) => {
      setSelectedUsers(prev => {
          const idsToRemove = new Set(usersToDeselect.map(u => u.id));
          return prev.filter(u => !idsToRemove.has(u.id));
      });
  }, []);

  const { mutate: crearSolicitud, isPending } = useCrearSolicitud();

  const handleSearchUsers = useCallback((query: string) => {
      setSearchQuery(query);
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
      setActiveRole(role);
  }, []);

  const allRoles = ['admin', 'contable', 'gerencia', 'personasRelaciones', 'consejo', 'encargado', 'empleado'].map(r => r.charAt(0).toUpperCase() + r.slice(1));

  const onDateChange = (event: any, selectedDate?: Date) => {
      const currentDate = selectedDate || (activeDateType === 'start' ? fechaInicio : fechaFin);
      if (Platform.OS === 'android') {
          setShowDatePicker(false);
      }

      if (event.type === 'dismissed') {
        setActiveDateType(null);
        return;
      }

      if (activeDateType === 'start') {
          setFechaInicio(currentDate);
      } else {
          setFechaFin(currentDate);
      }
  };

  const showDatepicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    setActiveDateType(type);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };
    
  // Handlers for specific fields
  const handleStartDate = () => {
      showDatepicker('start', 'date');
  };
  const handleStartTime = () => {
      showDatepicker('start', 'time');
  };
  const handleEndDate = () => {
      showDatepicker('end', 'date');
  };
  const handleEndTime = () => {
      showDatepicker('end', 'time');
  };

  const isFormValid = useMemo(() => {
    return (
      titulo.trim().length > 0 &&
      descripcion.trim().length > 0 &&
      selectedUsers.length > 0 &&
      fechaInicio < fechaFin
    );
  }, [titulo, descripcion, selectedUsers, fechaInicio, fechaFin]);

  const handleCrearSolicitud = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor completa todos los campos');
      return;
    }

    let start = new Date(fechaInicio);
    let end = new Date(fechaFin);

    if (allDay) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    crearSolicitud(
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_inicio: start.toISOString(),
        fecha_fin: end.toISOString(),
        tipo_actividad: tipoActividad,
        invitados: selectedUsers.map((u: any) => u.user_context_id || u.id_entidad || u.id),
      },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Solicitud creada correctamente');
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'No se pudo crear la solicitud'
          );
        },
      }
    );
  }, [isFormValid, crearSolicitud, titulo, descripcion, fechaInicio, fechaFin, selectedUsers, router, allDay]);

  const handleCancel = useCallback(() => {
    if (
      titulo.trim() ||
      descripcion.trim() ||
      selectedUsers.length > 0
    ) {
      Alert.alert(
        'Descartar cambios',
        '¿Deseas descartar los cambios?',
        [
          { text: 'Cancelar', onPress: () => {} },
          { text: 'Descartar', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [titulo, descripcion, selectedUsers, router]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30} // Adjust based on header
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#5f6368" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Redactar invitación</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Dates Section (Moved to Top) */}
          <View style={styles.dateSection}>
             <View style={styles.switchRow}>
                <Ionicons name="time-outline" size={20} color="#1a73e8" style={{ marginRight: 8 }} />
                <ThemedText style={styles.dateSectionTitle}>Todo el día</ThemedText>
                <View style={{ flex: 1 }} />
                <Switch 
                    value={allDay} 
                    onValueChange={setAllDay} 
                    trackColor={{ false: '#767577', true: '#4CAF50' }} 
                    thumbColor={allDay ? "#fff" : "#f4f3f4"} 
                />
             </View>

             <View style={styles.dateRow}>
                 <TouchableOpacity onPress={handleStartDate} style={{ flex: 1 }}>
                    <ThemedText style={styles.dateValue}>
                        {fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </ThemedText>
                 </TouchableOpacity>
                 {!allDay && (
                     <TouchableOpacity onPress={handleStartTime}>
                        <ThemedText style={styles.timeValue}>
                            {fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </ThemedText>
                     </TouchableOpacity>
                 )}
             </View>

             <View style={styles.dateRow}>
                 <TouchableOpacity onPress={handleEndDate} style={{ flex: 1 }}>
                    <ThemedText style={styles.dateValue}>
                        {fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </ThemedText>
                 </TouchableOpacity>
                 {!allDay && (
                     <TouchableOpacity onPress={handleEndTime}>
                        <ThemedText style={styles.timeValue}>
                            {fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </ThemedText>
                     </TouchableOpacity>
                 )}
             </View>

            {fechaInicio >= fechaFin && (
              <ThemedText style={{ color: '#F44336', fontSize: 12, marginTop: 8 }}>
                La fecha de fin debe ser posterior a la de inicio
              </ThemedText>
            )}
          </View>

          {/* UserSelector */}
          <View style={styles.inputSection}>
             <View style={{ flex: 1 }}>
                <UserSelector
                    selectedUsers={selectedUsers}
                    onSelectUsers={setSelectedUsers}
                    users={users}
                    roles={allRoles}
                    isLoadingUsers={isLoadingUsers}
                    isLoadingRoles={false}
                    onSearch={handleSearchUsers}
                    onSelectRole={handleRoleSelect}
                />
             </View>
          </View>
          
          <RoleUserSelectionModal
             visible={showRoleModal}
             onClose={handleCloseRoleModal}
             roleName={activeRole}
             roleUsers={roleUsers}
             selectedUsers={selectedUsers}
             onToggleUser={handleToggleUser}
             onSelectAll={handleSelectAllRoleUsers}
             onDeselectAll={handleDeselectAllRoleUsers}
          />

          {/* Tipo de actividad (Chips) */}
          <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10, alignItems: 'center' }]}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[
                        styles.chip,
                        tipoActividad === 'REUNION' && { borderColor: '#1a73e8', backgroundColor: 'transparent', borderWidth: 1 }
                    ]}
                    onPress={() => setTipoActividad('REUNION')}
                >
                    <ThemedText style={[
                        styles.chipText,
                        tipoActividad === 'REUNION' ? { color: '#1a73e8', fontWeight: 'bold' } : { color: '#5f6368' }
                    ]}>Reunión</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.chip,
                        tipoActividad === 'MANDATO' && { borderColor: '#1a73e8', backgroundColor: 'transparent', borderWidth: 1 }
                    ]}
                    onPress={() => setTipoActividad('MANDATO')}
                >
                    <ThemedText style={[
                         styles.chipText,
                        tipoActividad === 'MANDATO' ? { color: '#1a73e8', fontWeight: 'bold' } : { color: '#5f6368' }
                    ]}>Pedido</ThemedText>
                </TouchableOpacity>
             </ScrollView>
          </View>

           {/* Asunto */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Asunto"
              placeholderTextColor="#5f6368"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={100}
            />
          </View>

          {/* Mensaje */}
          <TextInput
            style={styles.messageInput}
            placeholder="Escribe un mensaje"
            placeholderTextColor="#5f6368"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            textAlignVertical="top"
          />

        </ScrollView>

        {/* Floating Send Button */}
        <TouchableOpacity 
            style={[
                styles.fab, 
                { backgroundColor: !isFormValid || isPending ? '#ccc' : '#1a73e8' }
            ]}
            onPress={handleCrearSolicitud}
            disabled={!isFormValid || isPending}
        >
            {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Ionicons name="send" size={24} color="#fff" />
            )}
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Date Picker Component */}
      {(showDatePicker) && (
        <DateTimePicker
          testID="dateTimePicker"
          value={activeDateType === 'start' ? fechaInicio : fechaFin}
          mode={datePickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? 0 : 0, // Cleaned up
  },
  headerTitle: {
    fontSize: 20,
    color: '#1a73e8',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  inputSection: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
    padding: 0,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
  dateSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateSectionTitle: {
     fontSize: 16,
     color: '#202124',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateValue: {
     fontSize: 16,
     color: '#1a73e8',
  },
  timeValue: {
      fontSize: 16,
      color: '#1a73e8',
      marginLeft: 16,
  },
  messageInput: {
      flex: 1,
      fontSize: 16,
      color: '#202124',
      padding: 16,
      minHeight: 250, 
  },
  fab: {
      position: 'absolute',
      bottom: 80,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
  }
});
