import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { UserSelector } from '../components/UserSelector';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import { EstadoInvitacionDB, estadoInvitacionMapping, ModificarSolicitudFechasRequest, ReenviarSolicitudRequest } from '../models/Solicitud';
import { useCrearActividad } from '../viewmodels/useActividades';
import {
  useActualizarEstadoInvitacion,
  useInvitaciones,
  useModificarSolicitudFechas,
  useReenviarSolicitud,
  useSolicitudBitacora,
  useSolicitudesCreadas
} from '../viewmodels/useSolicitudes';
import { useValidacionFechas } from '../viewmodels/useValidacionFechas';

const colors = Colors['light'];

// Para este ejemplo, asumimos que obtenemos la solicitud del caché o desde un parámetro
export function Solicitud() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { user } = useAuth();

  const solicitudId = parseInt(id);

  const { data: bitacora, isLoading: isLoadingBitacora } = useSolicitudBitacora(solicitudId);
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: modificarSolicitud, isPending: isModifying } = useModificarSolicitudFechas();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: crearActividad, isPending: isCreatingActividad } = useCrearActividad();
  const validacion = useValidacionFechas();
  
  const { data: enviadas } = useSolicitudesCreadas();
  const { data: recibidas } = useInvitaciones();

  const isMutating = isUpdatingEstado || isModifying || isSharing || isCreatingActividad;

  // Estados para modales
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToAgendaModal, setShowAddToAgendaModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Estados para el modal "Agregar a la agenda"
  const [agendaFechaInicio, setAgendaFechaInicio] = useState<Date>(new Date());
  const [agendaFechaFin, setAgendaFechaFin] = useState<Date>(new Date(Date.now() + 3600000));
  const [showAgendaDatePicker, setShowAgendaDatePicker] = useState<{show: boolean, mode: 'date'|'time', target: 'start'|'end'}>({show: false, mode: 'date', target: 'start'});
  
  // Estado para modificación
  const [modStartDate, setModStartDate] = useState(new Date());
  const [modEndDate, setModEndDate] = useState(new Date());
  const [modObservation, setModObservation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<{show: boolean, mode: 'date'|'time', target: 'start'|'end'}>({show: false, mode: 'date', target: 'start'});

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

  // Para REUNION: obtener todos los invitados de esta solicitud (desde enviadas)
  const todosInvitados = useMemo(() => {
    if (!enviadas) return [];
    return enviadas.filter(s => s.solicitud_id === solicitudId);
  }, [enviadas, solicitudId]);

  // IDs de participantes aceptados (para REUNION "agregar a la agenda")
  const participantesAceptados = useMemo(() => {
    const ids: number[] = [];
    // Agregar al creador
    if (solicitud?.created_by) ids.push(solicitud.created_by);
    // Agregar a todos los invitados aceptados
    // Necesitamos obtener los IDs de invitados — el modelo SolicitudEnviada no tiene invitado_id directamente
    // Usamos los datos disponibles: para REUNION el backend debe agregar a todos
    return [...new Set(ids)];
  }, [solicitud, todosInvitados]);

  // Determinar si se puede "agregar a la agenda" según tipo
  const puedeAgregarAAgenda = useMemo(() => {
    if (!solicitud) return false;
    // Si ya se creó la actividad, no se puede agregar nuevamente
    if (solicitud.estado === 'ACTIVIDAD_CREADA') return false;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const esMandato = solicitud.tipo_actividad === 'MANDATO';

    if (esReunion) {
      // REUNION: solo el creador (ve la solicitud como "enviada") puede agregar
      // Y al menos un invitado debe haber aceptado
      const algunAceptado = todosInvitados.some(inv => inv.estado === 'ACCEPTED');
      return type === 'enviada' && algunAceptado;
    }
    if (esMandato) {
      // MANDATO: el invitado (recibida) agrega a su propia agenda cuando acepta
      return type === 'recibida' && solicitud.estado === 'ACCEPTED';
    }
    // Fallback: comportamiento anterior
    return type === 'recibida' && solicitud.estado === 'ACCEPTED';
  }, [solicitud, type, todosInvitados]);

  const esActividadCreada = solicitud?.estado === 'ACTIVIDAD_CREADA';

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
  }, [type, solicitud, actualizarEstado]);

  const handleAceptarPress = useCallback(() => {
    setShowAcceptModal(true);
  }, []);
  const confirmAceptar = useCallback(() => {
      // Lógica normal para recibidas
      actualizarEstado(
        {
          solicitudId,
          estado: 'ACCEPTED' as EstadoInvitacionDB,
        },
        {
          onSuccess: () => {
             setShowAcceptModal(false);
             Alert.alert('Éxito', 'Solicitud aceptada');
             // router.back(); // Opcional: volver atrás o quedarse
          },
          onError: (error) => {
            Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
          },
        }
      );
  }, [solicitudId, actualizarEstado]);

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
          setModStartDate(solicitud.fecha_inicio ? new Date(solicitud.fecha_inicio) : new Date());
          setModEndDate(solicitud.fecha_fin ? new Date(solicitud.fecha_fin) : new Date(Date.now() + 3600000));
          setModObservation('');
          setShowModifyModal(true);
      }
  }, [solicitud]);

  const ejecutarModificar = useCallback(() => {
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
              Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
          }
      });
  }, [solicitudId, modStartDate, modEndDate, modObservation, modificarSolicitud]);

  const confirmModificar = useCallback(() => {
      // Obtener participantes disponibles
      const participantes: number[] = [solicitud?.created_by ?? 0].filter(id => id > 0);
      if (user?.user_context_id) {
          participantes.push(user.user_context_id);
      }
      // Deduplicar
      const uniqueParticipantes = [...new Set(participantes)];

      validacion.validate(
        {
          fechaInicio: modStartDate.toISOString(),
          fechaFin: modEndDate.toISOString(),
          participantes: uniqueParticipantes,
          solicitudIdExcluir: solicitudId,
        },
        () => ejecutarModificar()
      );
  }, [solicitudId, modStartDate, modEndDate, solicitud, user, validacion, ejecutarModificar]);

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

  const handleAgregarAAgenda = useCallback(() => {
    // Prellena fechas desde la solicitud si existen
    if (solicitud?.fecha_inicio && solicitud?.fecha_fin) {
      setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
      setAgendaFechaFin(new Date(solicitud.fecha_fin));
    } else {
      setAgendaFechaInicio(new Date());
      setAgendaFechaFin(new Date(Date.now() + 3600000));
    }
    setShowAddToAgendaModal(true);
  }, [solicitud]);

  const onAgendaDateChange = (event: any, selectedDate?: Date) => {
    const currentTarget = showAgendaDatePicker.target;
    if (Platform.OS === 'android') {
      setShowAgendaDatePicker(prev => ({ ...prev, show: false }));
    }
    if (selectedDate && event.type !== 'dismissed') {
      if (currentTarget === 'start') {
        setAgendaFechaInicio(selectedDate);
        if (selectedDate >= agendaFechaFin) {
          setAgendaFechaFin(new Date(selectedDate.getTime() + 3600000));
        }
      } else {
        setAgendaFechaFin(selectedDate);
      }
    }
  };

  const ejecutarAgregarAAgenda = useCallback(() => {
    if (!solicitud) return;
    const esReunion = solicitud.tipo_actividad === 'REUNION';

    crearActividad(
      {
        titulo: solicitud.titulo,
        descripcion: solicitud.descripcion,
        fecha_inicio: agendaFechaInicio.toISOString(),
        fecha_fin: agendaFechaFin.toISOString(),
        solicitud_id: solicitud.solicitud_id,
        // Para REUNION: enviar todos los participantes aceptados
        ...(esReunion ? { participantes: participantesAceptados } : {}),
      },
      {
        onSuccess: () => {
          setShowAddToAgendaModal(false);
          Alert.alert('Éxito', esReunion
            ? 'Actividad agregada a la agenda de todos los participantes'
            : 'Actividad agregada a tu agenda');
        },
        onError: (error) => {
          const msg = error instanceof Error ? error.message : 'Intenta nuevamente';
          Alert.alert('Error', msg);
        },
      }
    );
  }, [agendaFechaInicio, agendaFechaFin, solicitud, crearActividad, participantesAceptados]);

  const confirmAgregarAAgenda = useCallback(() => {
    if (agendaFechaInicio >= agendaFechaFin) {
      Alert.alert('Error', 'La fecha de fin debe ser posterior a la de inicio');
      return;
    }
    if (!solicitud) return;

    const esReunion = solicitud.tipo_actividad === 'REUNION';

    // Para REUNION: validar con todos los participantes; para MANDATO: solo el usuario actual
    const participantes: number[] = esReunion
      ? [...participantesAceptados]
      : (user?.user_context_id ? [user.user_context_id] : []);

    validacion.validate(
      {
        fechaInicio: agendaFechaInicio.toISOString(),
        fechaFin: agendaFechaFin.toISOString(),
        participantes,
        actividadIdExcluir: null,
      },
      () => ejecutarAgregarAAgenda()
    );
  }, [agendaFechaInicio, agendaFechaFin, solicitud, user, validacion, ejecutarAgregarAAgenda, participantesAceptados]);

  const ejecutarCompartir = useCallback(() => {
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
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      },
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un usuario');
      return;
    }

    const hasDates = !!(solicitud?.fecha_inicio && solicitud?.fecha_fin);

    if (hasDates) {
      // Validar fechas para los nuevos participantes
      validacion.validate(
        {
          fechaInicio: solicitud!.fecha_inicio!,
          fechaFin: solicitud!.fecha_fin!,
          participantes: selectedUsersToShare.map(u => u.user_context_id),
          solicitudIdExcluir: solicitudId,
        },
        () => ejecutarCompartir()
      );
    } else {
      // Sin fechas, compartir directamente
      ejecutarCompartir();
    }
  }, [solicitudId, selectedUsersToShare, solicitud, validacion, ejecutarCompartir]);

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

  const hasDates = !!(solicitud?.fecha_inicio && solicitud?.fecha_fin);
  const fechaInicio = solicitud?.fecha_inicio ? new Date(solicitud.fecha_inicio) : new Date();
  const fechaFin = solicitud?.fecha_fin ? new Date(solicitud.fecha_fin) : new Date();
  const fechaInicioPasada = hasDates ? fechaInicio < new Date() : false;
  const isExpiredState = solicitud?.estado === 'EXPIRED';
  
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
        <View style={styles.iconButton} />
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

                {hasDates ? (
                  <>
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
                  </>
                ) : (
                  <ThemedText style={{ color: colors.secondaryText, fontSize: 14, marginTop: 4 }}>
                    Sin fecha definida
                  </ThemedText>
                )}
            </View>

             <View style={styles.inputSection}>
                 <ThemedText style={styles.label}>{type === 'enviada' ? 'Para' : 'De'}</ThemedText>
                 <View style={styles.userChip}>
                     <ThemedText style={{ color: colors.lightTint }}>
                         {type === 'enviada' 
                            ? `${solicitud?.invitado_nombre || ''} ${solicitud?.invitado_apellido || ''}` 
                            : `${solicitud?.nombre_creador || ''} ${solicitud?.apellido_creador || ''}`}
                     </ThemedText>
                 </View>
             </View>

            <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10 }]}>
                 <View style={[styles.chip, { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}>
                    <ThemedText style={[styles.chipText, { color: colors.lightTint, fontWeight: 'bold' }]}>
                        {solicitud?.tipo_actividad === 'MANDATO' ? 'Tarea' : 'Reunión'}
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

            {isExpiredState && (
              <View style={styles.expiredBanner}>
                <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.expiredBannerTitle}>Solicitud expirada</ThemedText>
                  <ThemedText style={styles.expiredBannerText}>No se pueden realizar acciones sobre esta solicitud.</ThemedText>
                </View>
              </View>
            )}

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
          {/* Indicador de actividad creada */}
          {esActividadCreada && (
            <View style={[styles.fab, { backgroundColor: '#00897B', marginRight: 16, width: 'auto', paddingHorizontal: 16, borderRadius: 28, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="checkmark-done" size={20} color={colors.background} />
              <ThemedText style={{ color: colors.background, fontSize: 13, fontWeight: '600' }}>Actividad creada</ThemedText>
            </View>
          )}

          {isExpiredState && (
            <View style={[styles.fab, styles.expiredFabIndicator]}>
              <Ionicons name="time-outline" size={20} color={colors.background} />
              <ThemedText style={styles.expiredFabText}>Expirada</ThemedText>
            </View>
          )}

          {/* Secondary Actions (Revealed via Menu) */}
          {menuOpen && !esActividadCreada && !isExpiredState && (
              <>
                {/* Opciones para Recibidas */}
                {type === 'recibida' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && !fechaInicioPasada && (
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
                {type === 'enviada' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && !fechaInicioPasada && (
                  <>
                    <TouchableOpacity style={[styles.fab, { backgroundColor: colors.lightTint, marginRight: 16 }]} onPress={handleModificarPress}>
                        <Ionicons name="create-outline" size={24} color={colors.background} />
                    </TouchableOpacity>
                    {solicitud?.created_by === user?.user_context_id && (
                      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.icon, marginRight: 16 }]} onPress={handleCompartir}>
                          <Ionicons name="share-social-outline" size={24} color={colors.background} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
          )}

          {/* Agregar a la agenda (REUNION: solo creador/enviada; MANDATO: invitado/recibida aceptada) */}
          {!isExpiredState && !fechaInicioPasada && puedeAgregarAAgenda && (
            <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success, marginRight: 16 }]} onPress={handleAgregarAAgenda}>
              <Ionicons name="calendar-outline" size={24} color={colors.background} />
            </TouchableOpacity>
          )}

          {/* Main Action: Accept (Recibida) - only if date not passed */}
          {!esActividadCreada && !isExpiredState && !fechaInicioPasada && type === 'recibida' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && solicitud?.estado !== 'MODIFIED' && (
               <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success, marginRight: 16 }]} onPress={handleAceptarPress}>
                   <Ionicons name="checkmark" size={24} color={colors.background} />
               </TouchableOpacity>
          )}

          {/* Menu Button */}
          {!esActividadCreada && !isExpiredState && !fechaInicioPasada && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && (
            <TouchableOpacity style={[styles.fab, { backgroundColor: colors.icon }]} onPress={() => setMenuOpen(!menuOpen)}>
                 <Ionicons name={menuOpen ? "close" : "ellipsis-horizontal"} size={24} color={colors.background} />
            </TouchableOpacity>
          )}
      </View>

      {/* Modal Aceptar */}
      <Modal visible={showAcceptModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAcceptModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{marginBottom: 16}}>Aceptar Solicitud</ThemedText>
                  <ThemedText style={{marginBottom: 8}}>¿Confirmas que deseas aceptar esta solicitud?</ThemedText>
                  <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setShowAcceptModal(false)} style={styles.modalBtnCancel}>
                          <ThemedText style={{color: colors.error}}>Cancelar</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={confirmAceptar} style={styles.modalBtnConfirm}>
                          <ThemedText style={{color: colors.background}}>Aceptar</ThemedText>
                      </TouchableOpacity>
                  </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Modificar */}
      <Modal visible={showModifyModal} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <TouchableWithoutFeedback onPress={() => setShowModifyModal(false)}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
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
          </TouchableWithoutFeedback>
          </View>
          </TouchableWithoutFeedback>
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
      <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={() => setShowShareModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
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
          </TouchableWithoutFeedback>
        </View>
        </TouchableWithoutFeedback>
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

      {/* Modal Agregar a la Agenda */}
      <Modal visible={showAddToAgendaModal} transparent animationType="fade" onRequestClose={() => setShowAddToAgendaModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={() => setShowAddToAgendaModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <ThemedText type="subtitle" style={{marginBottom: 8}}>Agregar a la agenda</ThemedText>
              {!hasDates && (
                <ThemedText style={{color: colors.secondaryText, marginBottom: 16, fontSize: 13}}>
                  Esta tarea no tiene fechas. Ingresa las fechas para agendar la actividad.
                </ThemedText>
              )}

              <ThemedText style={styles.label}>Fecha de inicio</ThemedText>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setShowAgendaDatePicker({show: true, mode: 'date', target: 'start'})} style={styles.dateBtn}>
                  <ThemedText>{agendaFechaInicio.toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'numeric'})}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAgendaDatePicker({show: true, mode: 'time', target: 'start'})} style={styles.dateBtn}>
                  <ThemedText>{agendaFechaInicio.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.label}>Fecha de fin</ThemedText>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setShowAgendaDatePicker({show: true, mode: 'date', target: 'end'})} style={styles.dateBtn}>
                  <ThemedText>{agendaFechaFin.toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'numeric'})}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAgendaDatePicker({show: true, mode: 'time', target: 'end'})} style={styles.dateBtn}>
                  <ThemedText>{agendaFechaFin.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</ThemedText>
                </TouchableOpacity>
              </View>

              {agendaFechaInicio >= agendaFechaFin && (
                <ThemedText style={{color: colors.error, fontSize: 12, marginBottom: 8}}>
                  La fecha de fin debe ser posterior a la de inicio
                </ThemedText>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowAddToAgendaModal(false)} style={styles.modalBtnCancel}>
                  <ThemedText style={{color: colors.error}}>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmAgregarAAgenda}
                  style={[styles.modalBtnConfirm, { opacity: agendaFechaInicio >= agendaFechaFin ? 0.5 : 1 }]}
                  disabled={isCreatingActividad || agendaFechaInicio >= agendaFechaFin}
                >
                  {isCreatingActividad
                    ? <ActivityIndicator color={colors.background}/>
                    : <ThemedText style={{color: colors.background}}>Agregar</ThemedText>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
        </TouchableWithoutFeedback>
        {showAgendaDatePicker.show && (
          <DateTimePicker
            testID="agendaDateTimePicker"
            value={showAgendaDatePicker.target === 'start' ? agendaFechaInicio : agendaFechaFin}
            mode={showAgendaDatePicker.mode}
            is24Hour={true}
            display="default"
            onChange={onAgendaDateChange}
          />
        )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de validación de fechas */}
      <ValidacionFechasModal
        state={validacion.state}
        avisos={validacion.avisos}
        rangosOcupados={validacion.rangosOcupados}
        errorMessage={validacion.errorMessage}
        onConfirm={validacion.confirm}
        onCancel={validacion.cancel}
      />

      {/* Modal operación pendiente */}
      <OperacionPendienteModal visible={isMutating} />

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
  expiredBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B0B5BA',
    backgroundColor: '#EEF0F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expiredBannerTitle: {
    color: '#4B4F54',
    fontWeight: '700',
    fontSize: 14,
  },
  expiredBannerText: {
    color: '#5F6368',
    fontSize: 13,
    marginTop: 2,
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
    expiredFabIndicator: {
      width: 'auto',
      paddingHorizontal: 14,
      borderRadius: 24,
      backgroundColor: '#757575',
      flexDirection: 'row',
      gap: 8,
      marginRight: 16,
    },
    expiredFabText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '600',
    },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '90%',
      maxWidth: 450,
      maxHeight: '85%',
      backgroundColor: colors.componentBackground,
      borderRadius: 16,
      padding: 24,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
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
      borderRadius: 8,
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