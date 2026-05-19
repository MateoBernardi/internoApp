import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { Archivo, ArchivoUso } from '@/features/docs/models/Archivo';
import { useGetArchivoUrlFirmada, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
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
  View,
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

interface PendingFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
    if (!byId.has(u.user_context_id)) byId.set(u.user_context_id, u);
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

  // ─── Queries / mutations ──────────────────────────────────────────────────

  const actividadQuery = useActividadById(isValidId ? numericId : undefined);
  const { mutate: modificarFechas, isPending: isModifying } = useModificarActividadFechas();
  const { mutate: cancelarActividad, isPending: isCancelling } = useCancelarActividad();
  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const archivoMutation = useArchivoActividad();
  const participantesMutation = useInvitadosActividad();
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  // ─── Estado: archivos ─────────────────────────────────────────────────────

  const [localArchivos, setLocalArchivos] = useState<Archivo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // ─── Estado: participantes ────────────────────────────────────────────────

  const [localParticipantes, setLocalParticipantes] = useState<ActividadDetalleParticipante[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  // ─── Estado: edición inline de fechas ────────────────────────────────────

  const [isEditingFechas, setIsEditingFechas] = useState(false);
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

  const isLoadingActividad = hasIdParam && actividadQuery.isLoading;
  const hasActividadError = !hasIdParam || !isValidId || actividadQuery.isError || !actividad;

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
    setIsEditingFechas(false);
    setBackendRangosOcupados([]);
  }, [modalVisible]);

  // ─── Inicialización ───────────────────────────────────────────────────────

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

  // ─── Archivos ─────────────────────────────────────────────────────────────

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
            archivoData: {
              nombre: file.name,
              tamano: file.size,
              tipo: file.type,
              uso: ArchivoUso.TAREA,
            },
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
          // Suma los nuevos a los existentes en la UI
          setLocalArchivos((prev) => [...prev, ...nuevosArchivosData]);
          // Solo envía los IDs nuevos al backend
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
          // Quita ese archivo de la UI
          setLocalArchivos((prev) => prev.filter((a) => a.id !== archivoId));
          // Solo envía ese ID al backend
          void archivoMutation.mutateAsync({
            id: numericId,
            action: 'remove',
            archivosIds: [archivoId],
          });
        },
      },
    ]);
  };

  // ─── Participantes ────────────────────────────────────────────────────────

  const getDisplayName = (userId: number) => {
    const p = localParticipantes.find((i) => i.user_context_id === userId);
    if (p?.nombre) return `${p.nombre} ${p.apellido ?? ''}`.trim();
    const matched = selectedUsers.find((u) => u.user_context_id === userId);
    if (matched) return `${matched.nombre} ${matched.apellido}`.trim();
    return `Usuario #${userId}`;
  };

  const handleSelectUsers = (usersToSelect: UserSummary[]) => {
    // Solo los que no estaban ya en la lista
    const existingIds = new Set(localParticipantes.map((p) => p.user_context_id));
    const realmenteNuevos = usersToSelect.filter((u) => !existingIds.has(u.user_context_id));

    if (realmenteNuevos.length === 0) return;

    const nuevosParticipantes: ActividadDetalleParticipante[] = realmenteNuevos.map((u) => ({
      user_context_id: u.user_context_id,
      nombre: u.nombre,
      apellido: u.apellido,
      rol: 'guest',
    }));

    // Suma los nuevos a los existentes en la UI
    setLocalParticipantes((prev) => [...prev, ...nuevosParticipantes]);
    setSelectedUsers((prev) => mergeUsers(prev, realmenteNuevos));

    // Solo envía los nuevos al backend
    void participantesMutation.mutateAsync({
      id: numericId,
      action: 'add',
      invitados: nuevosParticipantes,
    });
  };

  const handleSelectRole = (role: string) => {
    setActiveRole(role);
    setShowRoleModal(true);
  };

  const handleToggleUser = (selectedUser: UserSummary) => {
    const exists = localParticipantes.some((p) => p.user_context_id === selectedUser.user_context_id);

    if (!exists) {
      const nuevo: ActividadDetalleParticipante = {
        user_context_id: selectedUser.user_context_id,
        nombre: selectedUser.nombre,
        apellido: selectedUser.apellido,
        rol: 'guest',
      };
      // Suma solo el nuevo a la UI
      setLocalParticipantes((prev) => [...prev, nuevo]);
      setSelectedUsers((prev) =>
        prev.some((u) => u.user_context_id === selectedUser.user_context_id)
          ? prev
          : [...prev, selectedUser]
      );
      // Envía solo ese nuevo al backend
      void participantesMutation.mutateAsync({
        id: numericId,
        action: 'add',
        invitados: [nuevo],
      });
    } else {
      // Quita de la UI
      setLocalParticipantes((prev) =>
        prev.filter((p) => p.user_context_id !== selectedUser.user_context_id)
      );
      setSelectedUsers((prev) =>
        prev.filter((u) => u.user_context_id !== selectedUser.user_context_id)
      );
      // Envía solo ese al backend para remover
      void participantesMutation.mutateAsync({
        id: numericId,
        action: 'remove',
        invitados: [{ user_context_id: selectedUser.user_context_id, nombre: selectedUser.nombre, apellido: selectedUser.apellido, rol: 'guest' }],
      });
    }
  };

  const handleRemoveParticipante = (userId: number) => {
    const toRemove = localParticipantes.find((p) => p.user_context_id === userId);
    if (!toRemove) return;
    // Quita de la UI
    setLocalParticipantes((prev) => prev.filter((p) => p.user_context_id !== userId));
    setSelectedUsers((prev) => prev.filter((u) => u.user_context_id !== userId));
    // Solo envía el eliminado al backend
    void participantesMutation.mutateAsync({
      id: numericId,
      action: 'remove',
      invitados: [toRemove],
    });
  };

  // ─── Fechas inline ────────────────────────────────────────────────────────

  const handleEditarFechasPress = () => {
    if (!actividad) return;
    const startDate = new Date(actividad.fecha_inicio);
    setModStartDate(startDate);
    setModEndDate(new Date(actividad.fecha_fin ?? startDate.getTime() + 3600000));
    setShowEndDateFields(Boolean(actividad.fecha_fin));
    setIsEditingFechas(true);
  };

  const handleCancelarEdicionFechas = () => {
    setIsEditingFechas(false);
    setShowDatePicker({ show: false, mode: 'date', target: 'start' });
  };

  const handleConfirmarFechas = useCallback(() => {
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
          Alert.alert('Error', error instanceof Error ? error.message : 'Intentá nuevamente');
        },
        onSuccess: (response: ModificarActividadFechasResponse) => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendRangosOcupados(response.rangosOcupados ?? []);
            return;
          }
          setBackendRangosOcupados([]);
          setIsEditingFechas(false);
          Alert.alert('Éxito', 'Fechas modificadas correctamente');
        },
      }
    );
  }, [actividad, modStartDate, modEndDate, modificarFechas, showEndDateFields]);

  const onDateConfirm = (selectedDate: Date) => {
    if (showDatePicker.target === 'start') {
      setModStartDate(selectedDate);
      if (selectedDate > modEndDate) setModEndDate(new Date(selectedDate.getTime() + 3600000));
    } else {
      setModEndDate(selectedDate);
    }
    setShowDatePicker((prev) => ({ ...prev, show: false }));
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    setShowDatePicker({ show: true, mode, target });
  };

  // ─── Eliminar / darse de baja ─────────────────────────────────────────────

  const handleEliminarActividad = useCallback(() => {
    if (!actividad) return;
    const isGuestAction = isGuest && !isHost;
    Alert.alert(
      isGuestAction ? 'Darse de baja' : 'Eliminar actividad',
      isGuestAction
        ? '¿Querés darte de baja de esta actividad?'
        : '¿Querés eliminar esta actividad? Esta acción no se puede deshacer.',
      [
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
                    isGuestAction ? 'Te diste de baja de la actividad' : 'Actividad eliminada'
                  );
                  handleClose();
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
      ]
    );
  }, [actividad, cancelarActividad, isGuest, isHost, handleClose]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.container}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={styles.modalHeader}>
              {isGuest && (
                <TouchableOpacity
                  style={styles.headerLeaveBtn}
                  onPress={handleEliminarActividad}
                  disabled={isCancelling}
                >
                  <Ionicons name="exit-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
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
                keyboardShouldPersistTaps="handled"
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

                {/* ── Fechas ──────────────────────────────────────────────── */}
                <View style={styles.contentBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="time-outline" size={16} color={colors.lightTint} />
                      <ThemedText style={[styles.label, styles.labelInline]}>Fechas</ThemedText>
                    </View>
                    {isHost && !isEditingFechas && (
                      <TouchableOpacity style={styles.actionButton} onPress={handleEditarFechasPress}>
                        <Ionicons name="create-outline" size={14} color={Colors.light.tint} />
                        <Text style={styles.actionButtonText}>Editar</Text>
                      </TouchableOpacity>
                    )}
                    {isHost && isEditingFechas && (
                      <View style={styles.inlineEditActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={handleCancelarEdicionFechas}
                        >
                          <Text style={styles.cancelBtnText}>✕</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveBtn, isModifying && styles.saveBtnDisabled]}
                          onPress={handleConfirmarFechas}
                          disabled={isModifying}
                        >
                          {isModifying ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.saveBtnText}>✓</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {!isEditingFechas ? (
                    /* Vista lectura */
                    <>
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabelSmall}>Inicio</Text>
                        <View style={styles.dateValueRow}>
                          <ThemedText style={styles.dateValue}>
                            {formatDateLabel(new Date(fechaInicio))}
                          </ThemedText>
                          <ThemedText style={styles.timeValue}>
                            {formatTimeLabel(new Date(fechaInicio))}
                          </ThemedText>
                        </View>
                      </View>
                      {fechaFin && (
                        <View style={styles.dateRow}>
                          <Text style={styles.dateLabelSmall}>Fin</Text>
                          <View style={styles.dateValueRow}>
                            <ThemedText style={styles.dateValue}>
                              {formatDateLabel(new Date(fechaFin))}
                            </ThemedText>
                            <ThemedText style={styles.timeValue}>
                              {formatTimeLabel(new Date(fechaFin))}
                            </ThemedText>
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    /* Vista edición inline */
                    <View style={styles.dateEditBlock}>
                      <Text style={styles.modalLabel}>Fecha inicio</Text>
                      <View style={styles.row}>
                        <TouchableOpacity
                          onPress={() => showPicker('date', 'start')}
                          style={styles.dateBtn}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={colors.secondaryText}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText style={styles.dateBtnText}>
                            {modStartDate.toLocaleDateString('es-AR')}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => showPicker('time', 'start')}
                          style={styles.dateBtn}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={colors.secondaryText}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText style={styles.dateBtnText}>
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
                          size={14}
                          color={colors.secondaryText}
                        />
                      </TouchableOpacity>

                      {showEndDateFields && (
                        <>
                          <Text style={[styles.modalLabel, { marginTop: 10 }]}>Fecha fin</Text>
                          <View style={styles.row}>
                            <TouchableOpacity
                              onPress={() => showPicker('date', 'end')}
                              style={styles.dateBtn}
                            >
                              <Ionicons
                                name="calendar-outline"
                                size={14}
                                color={colors.secondaryText}
                                style={{ marginRight: 6 }}
                              />
                              <ThemedText style={styles.dateBtnText}>
                                {modEndDate.toLocaleDateString('es-AR')}
                              </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => showPicker('time', 'end')}
                              style={styles.dateBtn}
                            >
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={colors.secondaryText}
                                style={{ marginRight: 6 }}
                              />
                              <ThemedText style={styles.dateBtnText}>
                                {modEndDate.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                          {modStartDate >= modEndDate && (
                            <Text style={styles.errorText}>
                              La fecha de fin debe ser posterior a la de inicio
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>

                {/* ── Participantes ────────────────────────────────────────── */}
                <View style={styles.inviteSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="people-outline" size={16} color={colors.lightTint} />
                      <Text style={[styles.label, styles.labelInline]}>Participantes</Text>
                    </View>
                    {isHost && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowSelector((prev) => !prev)}
                      >
                        <Ionicons name="add" size={14} color={Colors.light.tint} />
                        <Text style={styles.actionButtonText}>Agregar</Text>
                      </TouchableOpacity>
                    )}
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
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {getDisplayName(p.user_context_id).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.inviteInfo}>
                            <Text style={styles.inviteName}>{getDisplayName(p.user_context_id)}</Text>
                            <Text style={styles.inviteMeta}>{formatParticipantRole(p.rol)}</Text>
                          </View>
                          {isHost && p.rol !== 'host' && (
                            <TouchableOpacity onPress={() => handleRemoveParticipante(p.user_context_id)}>
                              <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* ── Archivos ─────────────────────────────────────────────── */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.label}>Archivos enlazados</Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleSeleccionarArchivo}
                    >
                      <Ionicons name="add" size={14} color={Colors.light.tint} />
                      <Text style={styles.actionButtonText}>
                        {isUploadingFile ? 'Subiendo...' : 'Agregar'}
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
                                <Ionicons name="open-outline" size={20} color={Colors.light.tint} />
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

                {/* ── Botón eliminar (host) ─────────────────────────────────── */}
                {isHost && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleEliminarActividad}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={styles.deleteButtonText}>Eliminar actividad</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* DateTimePicker (fuera del scroll para evitar conflictos de layout) */}
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

            <OperacionPendienteModal visible={isCancelling} />

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
                    (u) =>
                      !usersToDeselect.some((r) => r.user_context_id === u.user_context_id)
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
  // ── Header ────────────────────────────────────────────────────────────────
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: Colors['light'].icon,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  headerLeaveBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.error + '15',
    marginRight: 'auto',
  },
  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Scroll ────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  contentBlock: {
    gap: 6,
  },
  // ── Tipografía ────────────────────────────────────────────────────────────
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
  sectionValueMuted: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 4,
  },
  // ── Encabezados de sección ────────────────────────────────────────────────
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
    marginBottom: 6,
  },
  // ── Fechas: vista lectura ─────────────────────────────────────────────────
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  dateLabelSmall: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    width: 34,
  },
  dateValueRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  dateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  // ── Fechas: edición inline ────────────────────────────────────────────────
  dateEditBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 4,
  },
  modalLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateBtnText: {
    fontSize: 13,
    color: colors.text,
  },
  endDateCollapsible: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.componentBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.secondaryText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endDateCollapsibleText: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  // ── Confirmar / cancelar edición ──────────────────────────────────────────
  inlineEditActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
  },
  saveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // ── Botón acción (pill) ───────────────────────────────────────────────────
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  // ── Participantes ─────────────────────────────────────────────────────────
  inviteSection: {
    gap: 8,
  },
  selectorCard: {
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
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
    gap: 2,
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
    textTransform: 'capitalize',
  },
  // ── Archivos ──────────────────────────────────────────────────────────────
  section: {
    gap: 8,
  },
  // ── Botón eliminar actividad ──────────────────────────────────────────────
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error + '50',
    backgroundColor: colors.error + '08',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
});