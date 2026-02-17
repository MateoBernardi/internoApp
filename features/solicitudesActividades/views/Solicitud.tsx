import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { UserSelector } from '../components/UserSelector';
import { EstadoInvitacionDB, estadoInvitacionMapping, ModificarSolicitudFechasRequest, ReenviarSolicitudRequest } from '../models/Solicitud';
import {
    useAceptarModificaciones,
    useActualizarEstadoInvitacion,
    useInvitaciones,
    useModificarSolicitudFechas,
    useReenviarSolicitud,
    useSolicitudBitacora,
    useSolicitudesCreadas
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

// Para este ejemplo, asumimos que obtenemos la solicitud del caché o desde un parámetro
export function Solicitud() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();

  const solicitudId = parseInt(id);

  const { data: bitacora, isLoading: isLoadingBitacora } = useSolicitudBitacora(solicitudId);
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: aceptarModificaciones, isPending: isAcceptingMod } = useAceptarModificaciones();
  const { mutate: modificarSolicitud, isPending: isModifying } = useModificarSolicitudFechas();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  
  const { data: enviadas } = useSolicitudesCreadas();
  const { data: recibidas } = useInvitaciones();

  // Estados para modales
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Estado para modificación
  const [modStartDate, setModStartDate] = useState(new Date());
  const [modEndDate, setModEndDate] = useState(new Date());
  const [modObservation, setModObservation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<{show: boolean, mode: 'date'|'time', target: 'start'|'end'}>({show: false, mode: 'date', target: 'start'});

  // Estado para aceptación
  const [priority, setPriority] = useState('3');

  // Estado para compartir
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<UserSummary[]>([]);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);

  // Role Selection Logic (para compartir)
  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<UserSummary[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  // Effect para manejar la respuesta de búsqueda por rol
  useEffect(() => {
      if (activeRole && roleUsersData) {
          const roleUsersList = roleUsersData;
          setRoleUsers(roleUsersList);
          setShowRoleModal(true);
      } else if (roleError) {
          Alert.alert("No se encontraron usuarios con ese rol");
          setActiveRole('');
      }
  }, [roleUsersData, activeRole, roleError]);

  const solicitud = useMemo(() => {
    if (type === 'enviada') {
        return enviadas?.find(s => s.solicitud_id === solicitudId);
    }
    return recibidas?.find(s => s.solicitud_id === solicitudId);
  }, [type, solicitudId, enviadas, recibidas]);

  // Marcar como visto
  useEffect(() => {
    if (!solicitud) return;

    // Para recibidas: SENT, MODIFIED_BY_HOST, ACCEPTED_BY_HOST -> SEEN
    if (type === 'recibida') {
        const estadosVistos = ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'];
        if (estadosVistos.includes(solicitud.estado)) {
            actualizarEstado({
                solicitudId: solicitud.solicitud_id,
                estado: 'SEEN' as EstadoInvitacionDB,
            });
        }
    } 
    // Para enviadas: MODIFIED -> SEEN (simulado si el backend lo soporta, o simplemente lógica visual futura)
    else if (type === 'enviada') {
        if (solicitud.estado === 'MODIFIED') {
            actualizarEstado({
                solicitudId: solicitud.solicitud_id,
                estado: 'SEEN' as EstadoInvitacionDB,
            });
        }
    }
  }, [type, solicitud, actualizarEstado]);

  const handleAceptarPress = useCallback(() => {
    setShowAcceptModal(true);
  }, []);
  const confirmAceptar = useCallback(() => {
      // Si es enviada y está en MODIFIED, usamos el endpoint de aceptar modificaciones
      if (type === 'enviada' && solicitud?.estado === 'MODIFIED') {
        aceptarModificaciones(solicitudId, {
            onSuccess: () => {
                setShowAcceptModal(false);
                Alert.alert('Éxito', 'Modificaciones aceptadas');
            },
            onError: (error) => {
                Alert.alert('Error', error instanceof Error ? error.message : 'Error al aceptar modificaciones');
            }
        });
        return;
      }
      
      // Lógica normal para recibidas
      actualizarEstado(
        {
          solicitudId,
          estado: 'ACCEPTED' as EstadoInvitacionDB,
          prioridad: parseInt(priority, 10),
        },
        {
          onSuccess: () => {
             setShowAcceptModal(false);
             Alert.alert('Éxito', 'Solicitud aceptada');
             // router.back(); // Opcional: volver atrás o quedarse
          },
          onError: (error) => {
            Alert.alert('Error', error instanceof Error ? error.message : 'Error al aceptar');
          },
        }
      );
  }, [solicitudId, priority, actualizarEstado, aceptarModificaciones, type, solicitud]);

  const handleRechazar = useCallback(() => {
    Alert.alert('Rechazar solicitud', '¿Deseas rechazar esta solicitud?', [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
      {
        text: 'Rechazar',
        onPress: () => {
          actualizarEstado(
            {
              solicitudId,
              estado: 'REJECTED' as EstadoInvitacionDB,
            },
            {
              onSuccess: () => {
                Alert.alert('Éxito', 'Solicitud rechazada');
                router.back();
              },
            }
          );
        },
        style: 'destructive',
      },
    ]);
  }, [solicitudId, actualizarEstado, router]);

  const handleModificarPress = useCallback(() => {
      if (solicitud) {
          setModStartDate(new Date(solicitud.fecha_inicio));
          setModEndDate(new Date(solicitud.fecha_fin));
          setModObservation('');
          setShowModifyModal(true);
      }
  }, [solicitud]);

  const confirmModificar = useCallback(() => {
      const payload: ModificarSolicitudFechasRequest = {
          solicitudId,
          nuevaFechaInicio: modStartDate.toISOString(),
          nuevaFechaFin: modEndDate.toISOString(),
          observacion: modObservation
      };

      modificarSolicitud(payload, {
          onSuccess: () => {
              setShowModifyModal(false);
              Alert.alert('Éxito', 'Solicitud modificada');
          },
          onError: (error) => {
              Alert.alert('Error', error instanceof Error ? error.message : 'Error al modificar');
          }
      });
  }, [solicitudId, modStartDate, modEndDate, modObservation, modificarSolicitud]);

  const onDateChange = (event: any, selectedDate?: Date) => {
      const currentTarget = showDatePicker.target;
      setShowDatePicker(prev => ({ ...prev, show: Platform.OS === 'ios' })); // En Android se cierra
      
      if (selectedDate && event.type !== 'dismissed') {
          if (currentTarget === 'start') {
              setModStartDate(selectedDate);
              // Validar fin
              if (selectedDate > modEndDate) {
                  setModEndDate(new Date(selectedDate.getTime() + 3600000));
              }
          } else {
              setModEndDate(selectedDate);
          }
      }
      
      if (Platform.OS === 'android') {
           setShowDatePicker(prev => ({...prev, show: false}));
      }
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
      setShowDatePicker({ show: true, mode, target });
  };

  const handleCompartir = useCallback(() => {
    setSelectedUsersToShare([]);
    setSearchQuery('');
    setActiveRole('');
    setShowShareModal(true);
  }, []);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un usuario');
      return;
    }

    const payload: ReenviarSolicitudRequest = {
      solicitudId,
      nuevosInvitadosIds: selectedUsersToShare.map(u => u.user_context_id),
    };

    reenviarSolicitud(payload, {
      onSuccess: () => {
        setShowShareModal(false);
        Alert.alert('Éxito', 'Solicitud reenviada correctamente');
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Error al reenviar');
      },
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud]);

  const handleToggleUserShare = useCallback((user: UserSummary) => {
    setSelectedUsersToShare(prev => {
        const isSelected = prev.some(u => u.user_context_id === user.user_context_id);
        if (isSelected) {
            return prev.filter(u => u.user_context_id !== user.user_context_id);
        } else {
            return [...prev, user];
        }
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
      setSelectedUsersToShare(prev => {
          const prevIds = new Set(prev.map(u => u.user_context_id));
          const newUsers = usersToSelect.filter(u => !prevIds.has(u.user_context_id));
          return [...prev, ...newUsers];
      });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
      setSelectedUsersToShare(prev => {
          const idsToRemove = new Set(usersToDeselect.map(u => u.user_context_id));
          return prev.filter(u => !idsToRemove.has(u.user_context_id));
      });
  }, []);

  const handleCloseRoleModal = useCallback(() => {
      setShowRoleModal(false);
      setActiveRole('');
      setRoleUsers([]);
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
      setActiveRole(role);
  }, []);

  const allRoles = [
    { label: 'Contable', value: 'contable' },
    { label: 'Consejo', value: 'consejo' },
    { label: 'Encargado', value: 'encargado' },
    { label: 'Gerencia', value: 'gerencia' },
    { label: 'Personal', value: 'empleado' },
    { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  ];

  const fechaInicio = solicitud ? new Date(solicitud.fecha_inicio) : new Date();
  const fechaFin = solicitud ? new Date(solicitud.fecha_fin) : new Date();
  
  if (!solicitud && !enviadas && !recibidas) {
       return (
           <View style={[styles.container, { justifyContent: 'center', alignItems: 'center'}]}>
               <ActivityIndicator size="large" color= {colors.lightTint} />
           </View>
       )
  }

  return (
    <View style={styles.container}>
      {/* Header sin paddingTop extra */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
            {type === 'enviada' ? 'Enviada' : 'Recibida'}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
          {/* Detalles */}
            <View style={styles.dateSection}>
                <View style={styles.switchRow}>
                    <Ionicons name="time-outline" size={20} color={colors.lightTint} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.dateSectionTitle}>
                         Horario
                    </ThemedText>
                </View>

                <View style={styles.dateRow}>
                    <ThemedText style={styles.dateValue}>
                        {fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </ThemedText>
                    <ThemedText style={styles.timeValue}>
                        {fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                </View>

                <View style={styles.dateRow}>
                    <ThemedText style={styles.dateValue}>
                        {fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </ThemedText>
                    <ThemedText style={styles.timeValue}>
                         {fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                </View>
            </View>

             <View style={styles.inputSection}>
                 <ThemedText style={styles.label}>{type === 'enviada' ? 'Para' : 'De'}</ThemedText>
                 <View style={styles.userChip}>
                     <ThemedText style={{ color: colors.lightTint }}>
                         {type === 'enviada' 
                            ? `${solicitud?.invitado_nombre || ''} ${solicitud?.invitado_apellido || ''}` 
                            : `${solicitud?.creador_nombre || ''} ${solicitud?.creador_apellido || ''}`}
                     </ThemedText>
                 </View>
             </View>

            <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10 }]}>
                 <View style={[styles.chip, { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}>
                    <ThemedText style={[styles.chipText, { color: colors.lightTint, fontWeight: 'bold' }]}>
                        Reunión
                    </ThemedText>
                 </View>
            </View>

             <View style={styles.inputSection}>
                 <ThemedText style={styles.label}>Asunto</ThemedText>
                 <ThemedText style={styles.valueText}>{solicitud?.titulo}</ThemedText>
             </View>

             <View style={styles.messageSection}>
                 <ThemedText style={styles.label}>Mensaje</ThemedText>
                 <ThemedText style={styles.messageText}>{solicitud?.descripcion}</ThemedText>
             </View>

            {/* Separador Bitácora */}
            <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Actividad</ThemedText>
            </View>

            {/* Bitácora Integrada */}
            <View style={styles.bitacoraContainer}>
                {isLoadingBitacora ? (
                    <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
                ) : (
                    bitacora && bitacora.length > 0 ? (
                        bitacora.map((b) => (
                        <View key={b.id} style={styles.bitacoraItem}>
                             <View style={styles.bitacoraHeader}>
                                <ThemedText style={styles.bitacoraUser}>{b.usuario_nombre} {b.usuario_apellido}</ThemedText>
                                <ThemedText style={styles.bitacoraDate}>{new Date(b.created_at).toLocaleString()}</ThemedText>
                             </View>
                             <View style={styles.bitacoraBody}>
                                <ThemedText style={styles.bitacoraAction}>
                                    {estadoInvitacionMapping[b.estado] || b.estado}
                                </ThemedText>
                                {b.observacion && (
                                    <View style={styles.bitacoraBubble}>
                                        <ThemedText style={styles.bitacoraText}>{b.observacion}</ThemedText>
                                    </View>
                                )}
                                {b.fecha_inicio_nueva && (
                                    <View style={styles.changeBubble}>
                                        <ThemedText style={styles.changeText}>
                                            Propuso cambio:
                                        </ThemedText>
                                        <ThemedText style={styles.changeText}>
                                            Inicio: {new Date(b.fecha_inicio_nueva).toLocaleString()}
                                        </ThemedText>
                                        {b.fecha_fin_nueva && (
                                            <ThemedText style={styles.changeText}>
                                                Fin: {new Date(b.fecha_fin_nueva).toLocaleString()}
                                            </ThemedText>
                                        )}
                                    </View>
                                )}
                             </View>
                        </View>
                        ))
                    ) : (
                        <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>No hay actividad reciente</ThemedText>
                    )
                )}
            </View>
      </ScrollView>

      {/* Footer Actions (FABs) */}
      <View style={styles.fabContainer}>
          {/* Secondary Actions (Revealed via Menu) */}
          {menuOpen && (
              <>
                {/* Opciones para Recibidas */}
                {type === 'recibida' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && (
                  <>
                    <TouchableOpacity style={[styles.fab, { backgroundColor: colors.error,  marginRight: 16 }]} onPress={handleRechazar}>
                        <Ionicons name="close" size={24} color={colors.background} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.fab, { backgroundColor: colors.lightTint, marginRight: 16 }]} onPress={handleModificarPress}>
                        <Ionicons name="create-outline" size={24} color={colors.background} />
                    </TouchableOpacity>
                  </>
                )}
                
                {/* Opciones para Enviadas */}
                {type === 'enviada' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && (
                  <>
                    <TouchableOpacity style={[styles.fab, { backgroundColor: colors.lightTint, marginRight: 16 }]} onPress={handleModificarPress}>
                        <Ionicons name="create-outline" size={24} color={colors.background} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.fab, { backgroundColor: colors.icon, marginRight: 16 }]} onPress={handleCompartir}>
                        <Ionicons name="share-social-outline" size={24} color={colors.background} />
                    </TouchableOpacity>
                  </>
                )}
              </>
          )}

          {/* Main Action: Accept (Recibida or Enviada[MODIFIED]) */}
          {((type === 'recibida') || (type === 'enviada' && solicitud?.estado === 'MODIFIED')) && (
               <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success, marginRight: 16 }]} onPress={handleAceptarPress}>
                   <Ionicons name="checkmark" size={24} color={colors.background} />
               </TouchableOpacity>
          )}

          {/* Menu Button */}
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.icon }]} onPress={() => setMenuOpen(!menuOpen)}>
               <Ionicons name={menuOpen ? "close" : "ellipsis-horizontal"} size={24} color={colors.background} />
          </TouchableOpacity>
      </View>

      {/* Modal Aceptar (Prioridad) */}
      <Modal visible={showAcceptModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{marginBottom: 16}}>Aceptar Solicitud</ThemedText>
                  <ThemedText style={{marginBottom: 8}}>Selecciona la prioridad:</ThemedText>
                  <View style={styles.priorityRow}>
                       {['1', '2', '3'].map((p) => (
                           <TouchableOpacity 
                                key={p} 
                                style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                                onPress={() => setPriority(p)}
                           >
                               <ThemedText style={[styles.priorityText, priority === p && {color: colors.background}]}>
                                   {p === '1' ? 'Alta' : p === '2' ? 'Media' : 'Baja'}
                               </ThemedText>
                           </TouchableOpacity>
                       ))}
                  </View>
                  <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setShowAcceptModal(false)} style={styles.modalBtnCancel}>
                          <ThemedText style={{color: colors.error}}>Cancelar</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={confirmAceptar} style={styles.modalBtnConfirm}>
                          <ThemedText style={{color: colors.background}}>Aceptar</ThemedText>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* Modal Modificar */}
      <Modal visible={showModifyModal} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{marginBottom: 16}}>Modificar Solicitud</ThemedText>
                  
                  <ThemedText style={styles.label}>Nueva Fecha Inicio</ThemedText>
                  <View style={styles.row}>
                      <TouchableOpacity onPress={() => showPicker('date', 'start')} style={styles.dateBtn}>
                          <ThemedText>{modStartDate.toLocaleDateString()}</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => showPicker('time', 'start')} style={styles.dateBtn}>
                           <ThemedText>{modStartDate.toLocaleTimeString()}</ThemedText>
                      </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.label}>Nueva Fecha Fin</ThemedText>
                  <View style={styles.row}>
                      <TouchableOpacity onPress={() => showPicker('date', 'end')} style={styles.dateBtn}>
                          <ThemedText>{modEndDate.toLocaleDateString()}</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => showPicker('time', 'end')} style={styles.dateBtn}>
                           <ThemedText>{modEndDate.toLocaleTimeString()}</ThemedText>
                      </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.label}>Observación</ThemedText>
                  <TextInput 
                      style={styles.input} 
                      placeholder="Motivo del cambio" 
                      value={modObservation} 
                      onChangeText={setModObservation}
                  />

                  <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setShowModifyModal(false)} style={styles.modalBtnCancel}>
                          <ThemedText style={{color: colors.error}}>Cancelar</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={confirmModificar} style={styles.modalBtnConfirm}>
                          {isModifying ? <ActivityIndicator color={colors.background}/> : <ThemedText style={{color: colors.background}}>Guardar</ThemedText>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
          {showDatePicker.show && (
                <DateTimePicker
                testID="dateTimePicker"
                value={showDatePicker.target === 'start' ? modStartDate : modEndDate}
                mode={showDatePicker.mode}
                is24Hour={true}
                display="default"
                onChange={onDateChange}
                />
            )}
      </KeyboardAvoidingView>
      </Modal>

      {/* Modal Compartir */}
      <Modal visible={showShareModal} transparent animationType="slide" onRequestClose={() => setShowShareModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <ThemedText type="subtitle" style={{marginBottom: 16}}>Compartir Solicitud</ThemedText>
                <UserSelector 
                    selectedUsers={selectedUsersToShare}
                    onSelectUsers={setSelectedUsersToShare}
                    users={users || []}
                    onSearch={setSearchQuery}
                    isLoadingUsers={isLoadingUsers}
                    roles={allRoles}
                    onSelectRole={handleRoleSelect}
                />
                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.modalBtnCancel}>
                        <ThemedText style={{color: colors.error}}>Cancelar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmCompartir} style={styles.modalBtnConfirm}>
                        {isSharing ? <ActivityIndicator color={colors.background}/> : <ThemedText style={{color: colors.background}}>Compartir</ThemedText>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Selección de Usuarios por Rol */}
      <RoleUserSelectionModal
        visible={showRoleModal}
        onClose={handleCloseRoleModal}
        roleName={activeRole}
        roleUsers={roleUsers}
        selectedUsers={selectedUsersToShare}
        onToggleUser={handleToggleUserShare}
        onSelectAll={handleSelectAllRoleUsers}
        onDeselectAll={handleDeselectAllRoleUsers}
      />

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Removed marginTop platform specific to avoid double padding if layout handles it
  },
  headerTitle: {
    fontSize: 20,
    color: colors.tint,
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  dateSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.componentBackground,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSectionTitle: {
     fontSize: 16,
     color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateValue: {
     fontSize: 16,
     color: colors.tint,
     width: 120,
  },
  timeValue: {
      fontSize: 16,
      color: colors.tint,
  },
  inputSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
  },
  label: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 4,
  },
  valueText: {
      fontSize: 16,
      color: colors.text,
  },
  userChip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.background,
  },
  chipText: {
    fontSize: 14,
  },
  messageSection: {
      padding: 16,
      minHeight: 100,
  },
  messageText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
  },
  sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.background,
  },
  sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.secondaryText,
  },
  bitacoraContainer: {
      padding: 16,
  },
  bitacoraItem: {
      marginBottom: 16,
  },
  bitacoraHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
  },
  bitacoraBody: {
      marginLeft: 8,
      borderLeftWidth: 2,
      borderLeftColor: colors.componentBackground,
      paddingLeft: 12,
      paddingVertical: 4,
  },
  bitacoraUser: {
      fontWeight: 'bold',
      color: colors.text,
      fontSize: 13,
  },
  bitacoraDate: {
      fontSize: 11,
      color: colors.secondaryText,
  },
  bitacoraAction: {
      color: colors.lightTint,
      fontSize: 14,
      fontWeight: '500',
  },
  bitacoraBubble: {
      marginTop: 6,
      backgroundColor: colors.background,
      padding: 8,
      borderRadius: 8,
  },
  bitacoraText: {
      fontSize: 14,
      color: colors.secondaryText,
  },
  changeBubble: {
      marginTop: 6,
      backgroundColor: colors.background,
      padding: 8,
      borderRadius: 8,
  },
  changeText: {
      fontSize: 13,
      color: colors.lightTint,
  },
  fabContainer: {
      position: 'absolute',
      bottom: 80, // Raised up
      right: 24,
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  fab: {
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
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '85%',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      elevation: 5,
  },
  modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 24,
  },
  modalBtnCancel: {
      padding: 10,
      marginRight: 10,
  },
  modalBtnConfirm: {
      backgroundColor: colors.tint,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 4,
  },
  priorityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
  },
  priorityBtn: {
      padding: 12,
      borderWidth: 1,
      borderColor: colors.background,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 4,
      alignItems: 'center',
  },
  priorityBtnActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
  },
  priorityText: {
      color: colors.secondaryText,
      fontWeight: 'bold',
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  dateBtn: {
      padding: 10,
      backgroundColor: colors.background,
      borderRadius: 8,
      flex: 0.48,
      alignItems: 'center',
  },
  input: {
      borderBottomWidth: 1,
      borderBottomColor: colors.background,
      paddingVertical: 8,
      fontSize: 16,
  }
});