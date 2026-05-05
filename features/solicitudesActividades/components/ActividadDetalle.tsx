import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { AppFab } from '@/shared/ui/AppFab';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { ModificarActividadFechasResponse } from '../models/Actividad';
import type { RangoOcupado } from '../models/Solicitud';
import {
  useActividadById,
  useCancelarActividad,
  useModificarActividadFechas,
} from '../viewmodels/useActividades';
import { ValidacionFechasModal } from './ValidacionFechasModal';

const colors = Colors['light'];

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

interface ActividadDetalleProps {
  actividadId?: number;
  rol?: string;
  visible?: boolean;
  onClose?: () => void;
}

export function ActividadDetalle({ actividadId: actividadIdProp, rol: rolProp, visible, onClose }: ActividadDetalleProps) {
  const router = useRouter();
  const { actividadId: actividadIdParam, id: idParam, rol: rolParam } = useLocalSearchParams<{
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

  const actividadQuery = useActividadById(isValidId ? numericId : undefined);
  const { mutate: modificarFechas, isPending: isModifying } = useModificarActividadFechas();
  const { mutate: cancelarActividad, isPending: isCancelling } = useCancelarActividad();

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

    return Array.from(grouped.entries()).map(([usuario, cantidad]) =>
      `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendRangosOcupados]);

  const actividad = actividadQuery.data ?? null;
  const roleFromParams = typeof resolvedRol === 'string' ? resolvedRol.toLowerCase() : '';
  const roleFromApi = typeof actividad?.rol === 'string' ? actividad.rol.toLowerCase() : '';
  const effectiveRole = roleFromApi || roleFromParams;
  const isHost = effectiveRole === 'host';
  const isGuest = effectiveRole === 'guest';

  const handleModificarPress = useCallback(() => {
    if (!actividad) return;
    setIsFabExpanded(false);
    const startDate = new Date(actividad.fecha_inicio);
    setModStartDate(startDate);
    setModEndDate(new Date(actividad.fecha_fin ?? (startDate.getTime() + 3600000)));
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
                  'Exito',
                  isGuestAction
                    ? 'Te diste de baja de la actividad'
                    : 'Actividad eliminada correctamente'
                );
                router.back();
              },
              onError: (error) => {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Intenta nuevamente'
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
            error instanceof Error ? error.message : 'Intenta nuevamente'
          );
        },
        onSuccess: (response: ModificarActividadFechasResponse) => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendRangosOcupados(response.rangosOcupados ?? []);
            return;
          }

          setBackendRangosOcupados([]);
          setShowModifyModal(false);
          Alert.alert('Exito', 'Fechas de la actividad modificadas');
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

  const isLoadingActividad = hasIdParam && actividadQuery.isLoading;
  const hasActividadError = !hasIdParam || !isValidId || actividadQuery.isError || !actividad;

  const fechaInicio = actividad?.fecha_inicio ?? new Date();
  const fechaFin = actividad?.fecha_fin ?? null;
  const participantes = actividad?.participantes ?? [];

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.container}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {isLoadingActividad ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.lightTint} />
              </View>
            ) : hasActividadError ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={{ color: colors.secondaryText }}>
                  {isValidId ? 'No se pudo cargar la actividad' : 'Actividad invalida'}
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Titulo</ThemedText>
                  <ThemedText style={styles.titulo}>{actividad.titulo}</ThemedText>
                </View>

                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Descripcion</ThemedText>
                  <ThemedText style={styles.descriptionText}>
                    {actividad.descripcion || 'Sin descripcion'}
                  </ThemedText>
                </View>

                <View style={styles.contentBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="time-outline" size={18} color={colors.lightTint} />
                    <ThemedText style={[styles.label, styles.labelInline]}>Fechas</ThemedText>
                  </View>

                  <View style={styles.dateRow}>
                    <ThemedText style={styles.dateValue}>{formatDateLabel(fechaInicio)}</ThemedText>
                    <View style={styles.dateRightCol}>
                      <ThemedText style={styles.timeValue}>{formatTimeLabel(fechaInicio)}</ThemedText>
                    </View>
                  </View>

                  {fechaFin && (
                    <View style={styles.dateRow}>
                      <ThemedText style={styles.dateValue}>{formatDateLabel(fechaFin)}</ThemedText>
                      <View style={styles.dateRightCol}>
                        <ThemedText style={styles.timeValue}>{formatTimeLabel(fechaFin)}</ThemedText>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.contentBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="people-outline" size={18} color={colors.lightTint} />
                    <ThemedText style={[styles.label, styles.labelInline]}>Participantes</ThemedText>
                  </View>

                  {participantes.length === 0 ? (
                    <ThemedText style={styles.emptyParticipantsText}>
                      Sin participantes registrados
                    </ThemedText>
                  ) : (
                    participantes.map((participante, index) => (
                      <View key={`${participante.rol}-${participante.nombre}-${participante.apellido}-${index}`} style={styles.participantRow}>
                        <ThemedText style={styles.participantName}>
                          {[participante.nombre, participante.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre'}
                        </ThemedText>
                        <ThemedText style={styles.participantRole}>
                          {formatParticipantRole(participante.rol)}
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.contentBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText style={styles.label}>Archivos enlazados</ThemedText>
                    <TouchableOpacity style={styles.actionButton} onPress={() => { }}>
                      <Ionicons name="add" size={16} color={Colors.light.tint} />
                      <Text style={styles.actionButtonText}>Agregar archivos</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inviteList}>
                    <View style={styles.inviteRow}>
                      <View>
                        <Text style={styles.inviteName}>Archivo-ejemplo.pdf</Text>
                        <Text style={styles.inviteMeta}>Documento</Text>
                      </View>
                      <View style={styles.inviteRowActions}>
                        <TouchableOpacity onPress={() => { }}>
                          <Ionicons name="open-outline" size={20} color={Colors.light.tint} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { }}>
                          <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

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
                      ? (isFabExpanded ? 'close-outline' : 'ellipsis-horizontal')
                      : 'create-outline'
                }
                floating={false}
                backgroundColor={isHost && !isFabExpanded ? colors.secondaryText : undefined}
                isLoading={isModifying || isCancelling}
                onPress={handleFabPress}
              />
            </View>

            <Modal
              visible={showModifyModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => {
                setShowDatePicker({ show: false, mode: 'date', target: 'start' });
                setShowModifyModal(false);
              }}
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
                  value={
                    showDatePicker.target === 'start' ? modStartDate : modEndDate
                  }
                  mode={showDatePicker.mode}
                  is24Hour={true}
                  onConfirm={onDateConfirm}
                  onCancel={() => setShowDatePicker({ show: false, mode: 'date', target: 'start' })}
                />
              )}
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
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
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
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.background,
  },
  participantName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  participantRole: {
    fontSize: 12,
    color: colors.secondaryText,
    textTransform: 'capitalize',
  },
  emptyParticipantsText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  fabContainer: {
    position: 'absolute',
    bottom: UI.fab.offsetBottom,
    right: UI.fab.offsetRight,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  modalLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
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
});
