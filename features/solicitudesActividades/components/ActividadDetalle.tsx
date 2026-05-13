import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { Archivo, ArchivoUso } from '@/features/docs/models/Archivo';
import { useGetArchivoUrlFirmada, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { AppFab } from '@/shared/ui/AppFab';
import { UserSummary } from '@/shared/users/User';
import { allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../../solicitudesActividades/components/RoleUserSelectionModal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import type { ActividadDetalleParticipante, ModificarActividadFechasResponse } from '../models/Actividad';
import type { RangoOcupado } from '../models/Solicitud';
import {
  useActividadById,
  useArchivoActividad,
  useCancelarActividad,
  useInvitadosActividad,
  useModificarActividadFechas,
} from '../viewmodels/useActividades';

const colors = Colors['light'];

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PendingFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function formatDateLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatParticipantRole(role: string): string {
  if (role === 'host') return 'creador';
  if (role === 'guest') return 'invitado';
  return role;
}

function makePlaceholderUser(userId: number): UserSummary {
  return {
    user_context_id: userId,
    username: `user-${userId}`,
    nombre: 'Usuario',
    apellido: `#${userId}`,
    email: '',
    role: [],
  };
}

function mergeUsers(current: UserSummary[], incoming: UserSummary[]): UserSummary[] {
  const byId = new Map(current.map((u) => [u.user_context_id, u]));
  incoming.forEach((u) => {
    if (!byId.has(u.user_context_id)) {
      byId.set(u.user_context_id, u);
    }
  });
  return Array.from(byId.values());
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActividadDetalleProps {
  actividadId?: number;
  rol?: string;
  visible?: boolean;
  onClose?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ActividadDetalle({
  actividadId: actividadIdProp,
  rol: rolProp,
  visible,
  onClose,
}: ActividadDetalleProps) {
  const router = useRouter();
  const {
    actividadId: actividadIdParam,
    id: idParam,
    rol: rolParam,
  } = useLocalSearchParams<{
    actividadId?: string | string[];
    id?: string | string[];
    rol?: string | string[];
  }>();

  const rawActividadId = Array.isArray(actividadIdParam) ? actividadIdParam[0] : actividadIdParam;
  const rawId = rawActividadId ?? (Array.isArray(idParam) ? idParam[0] : idParam);
  const resolvedActividadId = actividadIdProp ?? (rawId ? Number(rawId) : Number.NaN);
  const resolvedRol = rolProp ?? (Array.isArray(rolParam) ? rolParam[0] : rolParam);
  const modalVisible = visible ?? true;
  const handleClose = onClose ?? (() => router.back());
  const hasIdParam = Number.isFinite(resolvedActividadId) && resolvedActividadId > 0;
  const numericId = Number(resolvedActividadId);
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  // ─── Queries y mutations existentes ─────────────────────────────────────────

  const actividadQuery = useActividadById(isValidId ? numericId : undefined);
  const { mutate: modificarFechas, isPending: isModifying } = useModificarActividadFechas();
  const { mutate: cancelarActividad, isPending: isCancelling } = useCancelarActividad();

  // ─── Mutations de archivos y participantes (misma lógica que objetivos) ──────

  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const archivoMutation = useArchivoActividad();
  const participantesMutation = useInvitadosActividad();
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  // ─── Estado local de archivos ─────────────────────────────────────────────

  const [localArchivos, setLocalArchivos] = useState<Archivo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // ─── Estado local de participantes ───────────────────────────────────────

  const [localParticipantes, setLocalParticipantes] = useState<ActividadDetalleParticipante[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  // ─── Búsqueda de usuarios ─────────────────────────────────────────────────

  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  // ─── Estado del modal de modificar fechas (sin cambios) ───────────────────

  const [showModifyModal, setShowModifyModal] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [modStartDate, setModStartDate] = useState(new Date());
  const [modEndDate, setModEndDate] = useState(new Date());
  const [showEndDateFields, setShowEndDateFields] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    mode: 'date' | 'time';
    target: 'start' | 'end';
  }>({ show: false, mode: 'date', target: 'start' });
  const [backendRangosOcupados, setBackendRangosOcupados] = useState<RangoOcupado[]>([]);

  const avisosBackend = useMemo(() => {
    const grouped = new Map<string, number>();
    backendRangosOcupados.forEach((rango) => {
      grouped.set(rango.usuario, (grouped.get(rango.usuario) ?? 0) + 1);
    });
    return Array.from(grouped.entries()).map(
      ([usuario, cantidad]) =>
        `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendRangosOcupados]);

  // ─── Datos derivados ──────────────────────────────────────────────────────

  const actividad = actividadQuery.data ?? null;
  const roleFromParams = typeof resolvedRol === 'string' ? resolvedRol.toLowerCase() : '';
  const roleFromApi = typeof actividad?.rol === 'string' ? actividad.rol.toLowerCase() : '';
  const effectiveRole = roleFromApi || roleFromParams;
  const isHost = effectiveRole === 'host';
  const isGuest = effectiveRole === 'guest';

  const fechaInicio = actividad?.fecha_inicio ?? new Date();
  const fechaFin = actividad?.fecha_fin ?? null;

  // ─── Limpieza al cerrar ───────────────────────────────────────────────────

  useEffect(() => {
    if (modalVisible) return;
    setLocalArchivos([]);
    setPendingFiles([]);
    setLocalParticipantes([]);
    setSelectedUsers([]);
    setSearchQuery('');
    setShowSelector(false);
    setShowRoleModal(false);
    setActiveRole('');
  }, [modalVisible]);

  // ─── Inicialización con datos de la actividad ─────────────────────────────

  useEffect(() => {
    if (!modalVisible || !actividad) return;

    setLocalArchivos(actividad.archivos ?? []);

    const participantesIniciales: ActividadDetalleParticipante[] = (actividad.participantes ?? []).map((p) => ({
      user_context_id: p.user_context_id,
      nombre: p.nombre,
      apellido: p.apellido,
      rol: p.rol,
    }));
    setLocalParticipantes(participantesIniciales);
    setSelectedUsers(
      participantesIniciales.map((p) =>
        p.nombre
          ? {
            user_context_id: p.user_context_id,
            username: '',
            nombre: p.nombre,
            apellido: p.apellido ?? '',
            email: '',
            role: [],
          }
          : makePlaceholderUser(p.user_context_id)
      )
    );
  }, [modalVisible, actividad]);

  // ─── Helpers de archivos ──────────────────────────────────────────────────

  const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
    r.status === 'success' && r.data !== undefined;

  const handleSeleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const nuevosArchivos: PendingFile[] = result.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
      }));

      setPendingFiles((prev) => [...prev, ...nuevosArchivos]);
      setIsUploadingFile(true);

      try {
        const response = await uploadArchivo({
          item: nuevosArchivos.map((file) => ({
            archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
            archivoData: { nombre: file.name, tamaño: file.size, tipo: file.type, uso: ArchivoUso.TAREA },
          })),
        });

        const resultados = response?.exitosos ?? [];
        const fallidos = response?.fallidos ?? [];
        const validos = resultados.filter(isSuccess);
        const nuevosIds = validos.map((r) => r.data.id);
        const nuevosArchivosData = validos.map((r) => r.data) as Archivo[];

        if (validos.length === 0) {
          Alert.alert('Error de archivos', 'No se pudo subir ningún archivo.');
        } else if (fallidos.length > 0) {
          Alert.alert(
            'Archivos parciales',
            `Se subieron ${validos.length} de ${nuevosArchivos.length}`
          );
        }

        if (nuevosIds.length > 0) {
          setLocalArchivos((prev) => [...prev, ...nuevosArchivosData]);
          await archivoMutation.mutateAsync({
            id: numericId,
            action: 'add',
            archivosIds: nuevosIds,
          });
        }
      } catch {
        Alert.alert('Error de archivos', 'No se pudieron subir los archivos.');
      } finally {
        setIsUploadingFile(false);
        setPendingFiles((prev) =>
          prev.filter((file) => !nuevosArchivos.some((nuevo) => nuevo.uri === file.uri))
        );
      }
    } catch (err) {
      console.error('Error seleccionando documento', err);
      Alert.alert('Error', 'No se pudo seleccionar el documento. Intentá nuevamente.');
    }
  };

  const handleOpenArchivo = async (archivoId: number) => {
    try {
      const url = await getArchivoUrlFirmada(archivoId);
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo'));
    } catch {
      Alert.alert('Error', 'No se pudo obtener el enlace del archivo');
    }
  };

  const handleRemoveArchivo = (archivoId: number) => {
    Alert.alert('Eliminar archivo', '¿Querés quitar este archivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setLocalArchivos((prev) => prev.filter((a) => a.id !== archivoId));
          void archivoMutation.mutateAsync({
            id: numericId,
            action: 'remove',
            archivosIds: [archivoId],
          });
        },
      },
    ]);
  };

  // ─── Helpers de participantes ─────────────────────────────────────────────

  const getDisplayName = (userId: number) => {
    const p = localParticipantes.find((i) => i.user_context_id === userId);
    if (p?.nombre) return `${p.nombre} ${p.apellido ?? ''}`.trim();
    const matched = selectedUsers.find((u) => u.user_context_id === userId);
    if (matched) return `${matched.nombre} ${matched.apellido}`.trim();
    return `Usuario #${userId}`;
  };

  const persistParticipantes = async (nextParticipantes: ActividadDetalleParticipante[]) => {
    setLocalParticipantes(nextParticipantes);
    setSelectedUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.user_context_id, u]));
      return nextParticipantes.map(
        (p) => byId.get(p.user_context_id) ?? makePlaceholderUser(p.user_context_id)
      );
    });
    await participantesMutation.mutateAsync({
      id: numericId,
      action: 'add',
      invitados: nextParticipantes,
    });
  };

  const handleSelectUsers = (usersToSelect: UserSummary[]) => {
    const incomingIds = new Set(usersToSelect.map((u) => u.user_context_id));
    const nextParticipantes: ActividadDetalleParticipante[] = [
      ...localParticipantes.filter((p) => !incomingIds.has(p.user_context_id)),
      ...usersToSelect.map((u) => ({
        user_context_id: u.user_context_id,
        nombre: u.nombre,
        apellido: u.apellido,
        rol: 'guest',
      })),
    ];
    setSelectedUsers((prev) => mergeUsers(prev, usersToSelect));
    void persistParticipantes(nextParticipantes);
  };

  const handleSelectRole = (role: string) => {
    setActiveRole(role);
    setShowRoleModal(true);
  };

  const handleToggleUser = (selectedUser: UserSummary) => {
    const exists = localParticipantes.some((p) => p.user_context_id === selectedUser.user_context_id);
    const nextParticipantes: ActividadDetalleParticipante[] = exists
      ? localParticipantes.filter((p) => p.user_context_id !== selectedUser.user_context_id)
      : [
        ...localParticipantes,
        {
          user_context_id: selectedUser.user_context_id,
          nombre: selectedUser.nombre,
          apellido: selectedUser.apellido,
          rol: 'guest',
        },
      ];

    if (!exists) {
      setSelectedUsers((prev) =>
        prev.some((u) => u.user_context_id === selectedUser.user_context_id)
          ? prev
          : [...prev, selectedUser]
      );
    } else {
      setSelectedUsers((prev) =>
        prev.filter((u) => u.user_context_id !== selectedUser.user_context_id)
      );
    }

    void persistParticipantes(nextParticipantes);
  };

  const handleRemoveParticipante = (userId: number) => {
    const toRemove = localParticipantes.filter((p) => p.user_context_id === userId);
    const nextParticipantes = localParticipantes.filter((p) => p.user_context_id !== userId);
    setSelectedUsers((prev) => prev.filter((u) => u.user_context_id !== userId));
    setLocalParticipantes(nextParticipantes);
    void participantesMutation.mutateAsync({
      id: numericId,
      action: 'remove',
      invitados: toRemove,
    });
  };

  // ─── Handlers existentes (sin cambios) ───────────────────────────────────

  const handleModificarPress = useCallback(() => {
    if (!actividad) return;
    setIsFabExpanded(false);
    const startDate = new Date(actividad.fecha_inicio);
    setModStartDate(startDate);
    setModEndDate(new Date(actividad.fecha_fin ?? startDate.getTime() + 3600000));
    setShowEndDateFields(Boolean(actividad.fecha_fin));
    setShowModifyModal(true);
  }, [actividad]);

  const confirmDeleteOrLeave = useCallback(() => {
    if (!actividad) return;
    const isGuestAction = isGuest && !isHost;
    const confirmTitle = isGuestAction ? 'Darse de baja' : 'Eliminar actividad';
    const confirmMessage = isGuestAction
      ? '¿Querés darte de baja de esta actividad?'
      : '¿Querés eliminar esta actividad?';

    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: isGuestAction ? 'Darme de baja' : 'Eliminar',
        style: 'destructive',
        onPress: () => {
          cancelarActividad(
            { id: actividad.id },
            {
              onSuccess: () => {
                Alert.alert(
                  'Éxito',
                  isGuestAction
                    ? 'Te diste de baja de la actividad'
                    : 'Actividad eliminada correctamente'
                );
                router.back();
              },
              onError: (error) => {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Intentá nuevamente'
                );
              },
            }
          );
        },
      },
    ]);
  }, [actividad, cancelarActividad, isGuest, isHost, router]);

  const handleHostDeletePress = useCallback(() => {
    setIsFabExpanded(false);
    confirmDeleteOrLeave();
  }, [confirmDeleteOrLeave]);

  const handleGuestLeavePress = useCallback(() => {
    confirmDeleteOrLeave();
  }, [confirmDeleteOrLeave]);

  const handleFabPress = useCallback(() => {
    if (isHost) {
      setIsFabExpanded((prev) => !prev);
      return;
    }
    if (isGuest) {
      handleGuestLeavePress();
      return;
    }
    handleModificarPress();
  }, [handleGuestLeavePress, handleModificarPress, isGuest, isHost]);

  const confirmModificar = useCallback(() => {
    if (!actividad) return;
    if (showEndDateFields && modStartDate >= modEndDate) {
      Alert.alert('Error', 'La fecha de fin debe ser posterior a la de inicio');
      return;
    }
    modificarFechas(
      {
        actividad_id: actividad.id,
        fecha_inicio: modStartDate,
        ...(showEndDateFields ? { fecha_fin: modEndDate } : {}),
      },
      {
        onError: (error) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'Intentá nuevamente'
          );
        },
        onSuccess: (response: ModificarActividadFechasResponse) => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendRangosOcupados(response.rangosOcupados ?? []);
            return;
          }
          setBackendRangosOcupados([]);
          setShowModifyModal(false);
          Alert.alert('Éxito', 'Fechas de la actividad modificadas');
        },
      }
    );
  }, [actividad, modStartDate, modEndDate, modificarFechas, showEndDateFields]);

  const onDateConfirm = (selectedDate: Date) => {
    const currentTarget = showDatePicker.target;
    if (currentTarget === 'start') {
      setModStartDate(selectedDate);
      if (selectedDate > modEndDate) {
        setModEndDate(new Date(selectedDate.getTime() + 3600000));
      }
    } else {
      setModEndDate(selectedDate);
    }
    setShowDatePicker((prev) => ({ ...prev, show: false }));
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    setShowDatePicker({ show: true, mode, target });
  };

  // ─── Guards ───────────────────────────────────────────────────────────────

  const isLoadingActividad = hasIdParam && actividadQuery.isLoading;
  const hasActividadError =
    !hasIdParam || !isValidId || actividadQuery.isError || !actividad;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {isLoadingActividad ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.lightTint} />
              </View>
            ) : hasActividadError ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={{ color: colors.secondaryText }}>
                  {isValidId ? 'No se pudo cargar la actividad' : 'Actividad inválida'}
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Título */}
                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Título</ThemedText>
                  <ThemedText style={styles.titulo}>{actividad.titulo}</ThemedText>
                </View>

                {/* Descripción */}
                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Descripción</ThemedText>
                  <ThemedText style={styles.descriptionText}>
                    {actividad.descripcion || 'Sin descripción'}
                  </ThemedText>
                </View>

                {/* Fechas */}
                <View style={styles.contentBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="time-outline" size={18} color={colors.lightTint} />
                    <ThemedText style={[styles.label, styles.labelInline]}>Fechas</ThemedText>
                  </View>

                  <View style={styles.dateRow}>
                    <ThemedText style={styles.dateValue}>
                      {formatDateLabel(new Date(fechaInicio))}
                    </ThemedText>
                    <View style={styles.dateRightCol}>
                      <ThemedText style={styles.timeValue}>
                        {formatTimeLabel(new Date(fechaInicio))}
                      </ThemedText>
                    </View>
                  </View>

                  {fechaFin && (
                    <View style={styles.dateRow}>
                      <ThemedText style={styles.dateValue}>
                        {formatDateLabel(new Date(fechaFin))}
                      </ThemedText>
                      <View style={styles.dateRightCol}>
                        <ThemedText style={styles.timeValue}>
                          {formatTimeLabel(new Date(fechaFin))}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </View>

                {/* Participantes */}
                <View style={styles.inviteSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="people-outline" size={18} color={colors.lightTint} />
                      <Text style={[styles.label, styles.labelInline]}>Participantes</Text>
                    </View>
                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowSelector((prev) => !prev)}
                      >
                        <Ionicons name="add" size={16} color={Colors.light.tint} />
                        <Text style={styles.actionButtonText}>Agregar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showSelector && (
                    <View style={styles.selectorCard}>
                      <UserSelector
                        selectedUsers={selectedUsers}
                        onSelectUsers={handleSelectUsers}
                        users={users}
                        roles={allRoles}
                        isLoadingUsers={isLoadingUsers}
                        isLoadingRoles={false}
                        onSearch={setSearchQuery}
                        onSelectRole={handleSelectRole}
                        showSelectedChips={false}
                      />
                    </View>
                  )}

                  {localParticipantes.length === 0 ? (
                    <Text style={styles.sectionValueMuted}>Sin participantes registrados</Text>
                  ) : (
                    <View style={styles.inviteList}>
                      {localParticipantes.map((p) => (
                        <View key={p.user_context_id} style={styles.inviteRow}>
                          {/* Avatar */}
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {getDisplayName(p.user_context_id).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.inviteInfo}>
                            <Text style={styles.inviteName}>{getDisplayName(p.user_context_id)}</Text>
                            <Text style={styles.inviteMeta}>
                              {formatParticipantRole(p.rol)}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveParticipante(p.user_context_id)}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Archivos */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.label}>Archivos enlazados</Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleSeleccionarArchivo}
                    >
                      <Ionicons name="add" size={16} color={Colors.light.tint} />
                      <Text style={styles.actionButtonText}>
                        {isUploadingFile ? 'Subiendo...' : 'Agregar archivos'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inviteList}>
                    {localArchivos.length === 0 && pendingFiles.length === 0 ? (
                      <Text style={styles.sectionValueMuted}>Sin archivos enlazados</Text>
                    ) : (
                      <>
                        {localArchivos.map((archivo) => (
                          <View key={archivo.id} style={styles.inviteRow}>
                            <View style={styles.inviteInfo}>
                              <Text style={styles.inviteName}>{archivo.nombre}</Text>
                              <Text style={styles.inviteMeta}>{archivo.tipo}</Text>
                            </View>
                            <View style={styles.inviteRowActions}>
                              <TouchableOpacity onPress={() => handleOpenArchivo(archivo.id)}>
                                <Ionicons
                                  name="open-outline"
                                  size={20}
                                  color={Colors.light.tint}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleRemoveArchivo(archivo.id)}>
                                <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                        {pendingFiles.map((archivo, index) => (
                          <View key={`${archivo.uri}-${index}`} style={styles.inviteRow}>
                            <View style={styles.inviteInfo}>
                              <Text style={styles.inviteName}>{archivo.name}</Text>
                              <Text style={styles.inviteMeta}>Subiendo...</Text>
                            </View>
                            <View style={styles.inviteRowActions}>
                              <ActivityIndicator size="small" color={Colors.light.tint} />
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* FAB */}
            <View style={styles.fabContainer}>
              {isHost && isFabExpanded && (
                <>
                  <AppFab
                    icon="trash-outline"
                    floating={false}
                    onPress={handleHostDeletePress}
                    backgroundColor={colors.error}
                    style={{ marginBottom: 16 }}
                  />
                  <AppFab
                    icon="create-outline"
                    floating={false}
                    onPress={handleModificarPress}
                    backgroundColor={colors.tint}
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}
              <AppFab
                icon={
                  isGuest
                    ? 'close-outline'
                    : isHost
                      ? isFabExpanded
                        ? 'close-outline'
                        : 'ellipsis-horizontal'
                      : 'create-outline'
                }
                floating={false}
                backgroundColor={isHost && !isFabExpanded ? colors.secondaryText : undefined}
                isLoading={isModifying || isCancelling}
                onPress={handleFabPress}
              />
            </View>

            {/* Modal modificar fechas (sin cambios) */}
            <Modal
              visible={showModifyModal}
              transparent={false}
              animationType="slide"
              onRequestClose={() => {
                setShowDatePicker({ show: false, mode: 'date', target: 'start' });
                setShowModifyModal(false);
              }}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalKavWrapper}
              >
                <View style={styles.modalScreen}>
                  <View style={styles.modalHeaderFullScreen}>
                    <ThemedText type="subtitle" style={styles.modalTitleFullScreen}>
                      Modificar actividad
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDatePicker({ show: false, mode: 'date', target: 'start' });
                        setShowModifyModal(false);
                      }}
                      style={styles.modalHeaderActionBtn}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.modalScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalSection}>
                      <ThemedText style={styles.modalLabel}>Nueva Fecha Inicio</ThemedText>
                      <View style={styles.row}>
                        <TouchableOpacity
                          onPress={() => showPicker('date', 'start')}
                          style={styles.dateBtn}
                        >
                          <ThemedText>{modStartDate.toLocaleDateString('es-AR')}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => showPicker('time', 'start')}
                          style={styles.dateBtn}
                        >
                          <ThemedText>
                            {modStartDate.toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.endDateCollapsible}
                        onPress={() => setShowEndDateFields((prev) => !prev)}
                      >
                        <ThemedText style={styles.endDateCollapsibleText}>
                          {showEndDateFields ? 'Quitar fecha de fin' : 'Agregar fecha de fin'}
                        </ThemedText>
                        <Ionicons
                          name={showEndDateFields ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.secondaryText}
                        />
                      </TouchableOpacity>

                      {showEndDateFields && (
                        <>
                          <ThemedText style={styles.modalLabel}>Nueva Fecha Fin</ThemedText>
                          <View style={styles.row}>
                            <TouchableOpacity
                              onPress={() => showPicker('date', 'end')}
                              style={styles.dateBtn}
                            >
                              <ThemedText>{modEndDate.toLocaleDateString('es-AR')}</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => showPicker('time', 'end')}
                              style={styles.dateBtn}
                            >
                              <ThemedText>
                                {modEndDate.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}

                      {showEndDateFields && modStartDate >= modEndDate && (
                        <ThemedText style={{ color: colors.error, fontSize: 12, marginBottom: 8 }}>
                          La fecha de fin debe ser posterior a la de inicio
                        </ThemedText>
                      )}
                    </View>
                  </ScrollView>

                  <AppFab
                    icon="checkmark"
                    floating={false}
                    onPress={confirmModificar}
                    isLoading={isModifying}
                    disabled={showEndDateFields && modStartDate >= modEndDate}
                    style={styles.modalSubmitFab}
                  />
                </View>

                {showDatePicker.show && (
                  <DateTimePicker
                    key={`${showDatePicker.target}-${showDatePicker.mode}`}
                    visible={showDatePicker.show}
                    testID="actividadDateTimePicker"
                    value={showDatePicker.target === 'start' ? modStartDate : modEndDate}
                    mode={showDatePicker.mode}
                    is24Hour={true}
                    onConfirm={onDateConfirm}
                    onCancel={() =>
                      setShowDatePicker({ show: false, mode: 'date', target: 'start' })
                    }
                  />
                )}
              </KeyboardAvoidingView>
            </Modal>

            <OperacionPendienteModal visible={isModifying || isCancelling} />

            <ValidacionFechasModal
              state={backendRangosOcupados.length > 0 ? 'warnings' : 'idle'}
              avisos={avisosBackend}
              rangosOcupados={backendRangosOcupados}
              onConfirm={() => setBackendRangosOcupados([])}
              onCancel={() => setBackendRangosOcupados([])}
              showConfirmAction={false}
              cancelLabel="Modificar fechas"
              questionText="Modificá las fechas y volvé a intentar."
            />

            {/* Modal selector por rol */}
            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={() => {
                setShowRoleModal(false);
                setActiveRole('');
              }}
              roleName={activeRole}
              roleUsers={roleUsersData ?? []}
              selectedUsers={selectedUsers}
              onToggleUser={handleToggleUser}
              onSelectAll={(usersToSelect) =>
                handleSelectUsers(mergeUsers(selectedUsers, usersToSelect))
              }
              onDeselectAll={(usersToDeselect) =>
                handleSelectUsers(
                  selectedUsers.filter(
                    (u) => !usersToDeselect.some((r) => r.user_context_id === u.user_context_id)
                  )
                )
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    marginTop: '5%',
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: Colors['light'].icon,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 14,
  },
  contentBlock: {
    gap: 6,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  labelInline: {
    marginBottom: 0,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateRightCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  timeValue: {
    marginTop: 2,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  // ─── Participantes / invitados ────────────────────────────────────────────
  inviteSection: {
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorCard: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sectionValueMuted: {
    fontSize: 14,
    color: '#6b7280',
  },
  inviteList: {
    gap: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inviteRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  inviteInfo: {
    flex: 1,
    gap: 4,
    marginLeft: 10,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  inviteMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // ─── Archivos ─────────────────────────────────────────────────────────────
  section: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '12',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  // ─── FAB ──────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    bottom: UI.fab.offsetBottom,
    right: UI.fab.offsetRight,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  // ─── Modal modificar fechas ───────────────────────────────────────────────
  modalKavWrapper: {
    flex: 1,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  modalHeaderFullScreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitleFullScreen: {
    color: colors.text,
  },
  modalHeaderActionBtn: {
    padding: 6,
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  modalSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
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
  endDateCollapsible: {
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.secondaryText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endDateCollapsibleText: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  modalSubmitFab: {
    position: 'absolute',
    right: UI.fab.offsetRight,
    bottom: UI.fab.offsetBottom,
  },
});