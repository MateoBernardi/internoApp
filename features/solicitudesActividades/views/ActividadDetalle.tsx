import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import {
  useActividadesSemanales,
  useCancelarActividad,
  useModificarActividadFechas,
} from '../viewmodels/useActividades';
import { useValidacionFechas } from '../viewmodels/useValidacionFechas';

const colors = Colors['light'];

export function ActividadDetalle() {
  const router = useRouter();
  const { actividadId } = useLocalSearchParams<{ actividadId: string }>();
  const { user } = useAuth();

  const { data: semanalesData } = useActividadesSemanales();
  const { mutate: cancelarActividad, isPending: isCancelling } = useCancelarActividad();
  const { mutate: modificarFechas, isPending: isModifying } = useModificarActividadFechas();
  const validacion = useValidacionFechas();

  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modStartDate, setModStartDate] = useState(new Date());
  const [modEndDate, setModEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    mode: 'date' | 'time';
    target: 'start' | 'end';
  }>({ show: false, mode: 'date', target: 'start' });

  const numericId = parseInt(actividadId);

  const actividad = useMemo(() => {
    if (!semanalesData?.actividades) return null;
    return semanalesData.actividades.find((a) => a.id === numericId) ?? null;
  }, [semanalesData, numericId]);

  const esCreador = actividad?.rol === 'host';
  const esReunionVacia =
    actividad?.tipo_actividad === 'REUNION' &&
    (actividad.participantes?.length ?? 0) <= 1;

  const isMutating = isCancelling || isModifying;

  // ==================== Handlers ====================

  const handleModificarPress = useCallback(() => {
    if (!actividad) return;
    setModStartDate(new Date(actividad.fecha_inicio));
    setModEndDate(new Date(actividad.fecha_fin));
    setShowModifyModal(true);
  }, [actividad]);

  const ejecutarModificar = useCallback(() => {
    if (!actividad) return;
    modificarFechas(
      {
        actividadId: actividad.id,
        nuevaFechaInicio: modStartDate.toISOString(),
        nuevaFechaFin: modEndDate.toISOString(),
      },
      {
        onSuccess: () => {
          setShowModifyModal(false);
          Alert.alert('Éxito', 'Fechas de la actividad modificadas');
        },
        onError: (error) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'Intenta nuevamente'
          );
        },
      }
    );
  }, [actividad, modStartDate, modEndDate, modificarFechas]);

  const confirmModificar = useCallback(() => {
    if (!actividad) return;
    if (modStartDate >= modEndDate) {
      Alert.alert('Error', 'La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    const participantesIds = (actividad.participantes ?? []).map(p => p.user_context_id);

    validacion.validate(
      {
        fechaInicio: modStartDate.toISOString(),
        fechaFin: modEndDate.toISOString(),
        participantes: participantesIds,
      },
      () => ejecutarModificar()
    );
  }, [actividad, modStartDate, modEndDate, validacion, ejecutarModificar]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentTarget = showDatePicker.target;
    if (Platform.OS === 'android') {
      setShowDatePicker((prev) => ({ ...prev, show: false }));
    }
    if (selectedDate && event.type !== 'dismissed') {
      if (currentTarget === 'start') {
        setModStartDate(selectedDate);
        if (selectedDate > modEndDate) {
          setModEndDate(new Date(selectedDate.getTime() + 3600000));
        }
      } else {
        setModEndDate(selectedDate);
      }
    }
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    setShowDatePicker({ show: true, mode, target });
  };

  const handleEliminarDeAgenda = useCallback(() => {
    if (!actividad) return;
    Alert.alert(
      'Eliminar de mi agenda',
      '¿Deseas eliminar esta actividad de tu agenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            cancelarActividad(
              { actividadId: actividad.id },
              {
                onSuccess: () => {
                  Alert.alert('Éxito', 'Actividad eliminada de tu agenda');
                  router.back();
                },
                onError: (error) => {
                  Alert.alert(
                    'Error',
                    error instanceof Error
                      ? error.message
                      : 'Intenta nuevamente'
                  );
                },
              }
            );
          },
        },
      ]
    );
  }, [actividad, cancelarActividad, router]);

  // ==================== Loading State ====================

  if (!actividad && semanalesData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText style={{ color: colors.secondaryText }}>
          Actividad no encontrada
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, padding: 12 }}
        >
          <ThemedText style={{ color: colors.lightTint }}>Volver</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!actividad) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </View>
    );
  }

  const fechaInicio = new Date(actividad.fecha_inicio);
  const fechaFin = new Date(actividad.fecha_fin);
  const numParticipantes = actividad.participantes?.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Detalle de Actividad</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Indicador de REUNION vacía */}
        {esReunionVacia && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <ThemedText style={styles.warningText}>
              Esta reunión no tiene participantes invitados
            </ThemedText>
          </View>
        )}

        {/* Título */}
        <View style={styles.section}>
          <ThemedText style={styles.titulo}>{actividad.titulo}</ThemedText>
          {actividad.tipo_actividad && (
            <View
              style={[
                styles.tipoBadge,
                {
                  borderColor:
                    actividad.tipo_actividad === 'REUNION'
                      ? colors.lightTint
                      : colors.secondaryText,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.tipoBadgeText,
                  {
                    color:
                      actividad.tipo_actividad === 'REUNION'
                        ? colors.lightTint
                        : colors.secondaryText,
                  },
                ]}
              >
                {actividad.tipo_actividad === 'REUNION' ? 'Reunión' : 'Tarea'}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Descripción */}
        {actividad.descripcion ? (
          <View style={styles.section}>
            <ThemedText style={styles.label}>Descripción</ThemedText>
            <ThemedText style={styles.descriptionText}>
              {actividad.descripcion}
            </ThemedText>
          </View>
        ) : null}

        {/* Horario */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="time-outline"
              size={20}
              color={colors.lightTint}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={styles.sectionTitle}>Horario</ThemedText>
          </View>

          <View style={styles.dateRow}>
            <ThemedText style={styles.dateLabel}>Inicio</ThemedText>
            <ThemedText style={styles.dateValue}>
              {fechaInicio.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}{' '}
              {fechaInicio.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>

          <View style={styles.dateRow}>
            <ThemedText style={styles.dateLabel}>Fin</ThemedText>
            <ThemedText style={styles.dateValue}>
              {fechaFin.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}{' '}
              {fechaFin.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>
        </View>

        {/* Rol */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Tu rol</ThemedText>
          <ThemedText style={styles.rolText}>
            {actividad.rol === 'host' ? 'Creador' : 'Invitado'}
          </ThemedText>
        </View>

        {/* Participantes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="people-outline"
              size={20}
              color={colors.lightTint}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={styles.sectionTitle}>Participantes</ThemedText>
          </View>

          {numParticipantes === 0 ? (
            <ThemedText style={{ color: colors.secondaryText, fontSize: 14 }}>
              Sin participantes registrados
            </ThemedText>
          ) : (
            <View>
              <ThemedText style={{ color: colors.secondaryText, fontSize: 13, marginBottom: 8 }}>
                {numParticipantes} participante{numParticipantes !== 1 ? 's' : ''}
              </ThemedText>
              {actividad.participantes!.map((p) => (
                <View key={p.user_context_id} style={styles.participanteRow}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.icon} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ color: colors.text, fontSize: 14 }}>
                      {p.nombre} {p.apellido}
                    </ThemedText>
                    <ThemedText style={{ color: colors.secondaryText, fontSize: 12 }}>
                      {p.rol === 'host' ? 'Creador' : 'Invitado'}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Actions (FABs) */}
      <View style={styles.fabContainer}>
        {/* Modificar fechas — solo para el creador (host) */}
        {esCreador && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.lightTint, marginRight: 16 }]}
            onPress={handleModificarPress}
          >
            <Ionicons name="create-outline" size={24} color={colors.background} />
          </TouchableOpacity>
        )}

        {/* Eliminar de mi agenda — disponible para todos */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.error }]}
          onPress={handleEliminarDeAgenda}
        >
          <Ionicons name="trash-outline" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Modal Modificar Fechas */}
      <Modal visible={showModifyModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setShowModifyModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
                    Modificar Fechas
                  </ThemedText>

                  <ThemedText style={styles.modalLabel}>Nueva Fecha Inicio</ThemedText>
                  <View style={styles.row}>
                    <TouchableOpacity
                      onPress={() => showPicker('date', 'start')}
                      style={styles.dateBtn}
                    >
                      <ThemedText>{modStartDate.toLocaleDateString()}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showPicker('time', 'start')}
                      style={styles.dateBtn}
                    >
                      <ThemedText>{modStartDate.toLocaleTimeString()}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.modalLabel}>Nueva Fecha Fin</ThemedText>
                  <View style={styles.row}>
                    <TouchableOpacity
                      onPress={() => showPicker('date', 'end')}
                      style={styles.dateBtn}
                    >
                      <ThemedText>{modEndDate.toLocaleDateString()}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showPicker('time', 'end')}
                      style={styles.dateBtn}
                    >
                      <ThemedText>{modEndDate.toLocaleTimeString()}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {modStartDate >= modEndDate && (
                    <ThemedText style={{ color: colors.error, fontSize: 12, marginBottom: 8 }}>
                      La fecha de fin debe ser posterior a la de inicio
                    </ThemedText>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => setShowModifyModal(false)}
                      style={styles.modalBtnCancel}
                    >
                      <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmModificar}
                      style={[
                        styles.modalBtnConfirm,
                        { opacity: modStartDate >= modEndDate ? 0.5 : 1 },
                      ]}
                      disabled={isModifying || modStartDate >= modEndDate}
                    >
                      {isModifying ? (
                        <ActivityIndicator color={colors.background} />
                      ) : (
                        <ThemedText style={{ color: colors.background }}>
                          Guardar
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
          {showDatePicker.show && (
            <DateTimePicker
              testID="actividadDateTimePicker"
              value={
                showDatePicker.target === 'start' ? modStartDate : modEndDate
              }
              mode={showDatePicker.mode}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de validación de fechas */}
      <ValidacionFechasModal
        state={validacion.state}
        avisos={validacion.avisos}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  warningText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.background,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tipoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  dateValue: {
    fontSize: 15,
    color: colors.lightTint,
    fontWeight: '500',
  },
  rolText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  participanteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
});
