import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { confirmAction } from '@/shared/ui/confirmAction';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgendaDiaria } from '../components/AgendaDiaria';
import { AgendaSemanal } from '../components/AgendaSemanal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import type { Actividad, Licencia } from '../models/Actividad';
import type { Activity } from '../models/activityTypes';
import {
  useActividadesSemanales,
  useCancelarActividad,
  useCrearActividad,
} from '../viewmodels/useActividades';
import { useValidacionFechas } from '../viewmodels/useValidacionFechas';

const colors = Colors['light'];
const MODAL_MAX_HEIGHT = Math.min(640, Dimensions.get('window').height * 0.8);

function normalizeToMinute(date: Date): Date {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

function ceilToNextMinute(date: Date): Date {
  const normalized = new Date(date);
  if (normalized.getSeconds() > 0 || normalized.getMilliseconds() > 0) {
    normalized.setMinutes(normalized.getMinutes() + 1);
  }
  normalized.setSeconds(0, 0);
  return normalized;
}

function buildDateTimeFromDateAndTime(date: string, time: Date): Date {
  const [year, month, day] = date.split('-').map(Number);
  const merged = new Date(year, (month ?? 1) - 1, day ?? 1, time.getHours(), time.getMinutes(), 0, 0);
  return normalizeToMinute(merged);
}

const AgendaPersonal: React.FC = () => {
  // Queries
  const actividadesSemanalesQuery = useActividadesSemanales();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  // Mutations
  const crearActividadMutation = useCrearActividad();
  const cancelarActividadMutation = useCancelarActividad();
  const validacion = useValidacionFechas();

  const handleRefresh = useCallback(async () => {
    await actividadesSemanalesQuery.refetch();
  }, [actividadesSemanalesQuery]);

  const today = new Date();
  const dayName = today.toLocaleDateString('es-ES', { weekday: 'long' });
  const dateString = today.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  const [newActivity, setNewActivity] = useState({
    date: today.toISOString().split('T')[0],
    startTime: new Date(),
    endTime: new Date(today.getTime() + 3600000),
    title: '',
    description: '',
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'startDate' | 'startTime' | 'endTime' | null>(null);

  const isLoading = actividadesSemanalesQuery.isLoading;

  const isMutating =
    crearActividadMutation.isPending ||
    cancelarActividadMutation.isPending;
  const isValidationInProgress = validacion.state === 'validating' || validacion.state === 'warnings';

  // Mapear actividades desde la API
  const mapActivities = (apiActivities: Actividad[]): Activity[] => {
    return (apiActivities || []).map((act) => {
      const timeMatch = act.fecha_inicio.match(/[T ](\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '00:00';

      const dateMatch = act.fecha_inicio.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : act.fecha_inicio.split(/[T ]/)[0];

      return {
        id: act.id.toString(),
        time,
        title: act.titulo,
        description: act.descripcion,
        completed: false,
        date,
        rol: act.rol,
        participantes: act.participantes,
        solicitud_id: act.solicitud_id,
        fecha_fin: act.fecha_fin,
        tipo: 'actividad',
        tipo_actividad: act.tipo_actividad,
      };
    });
  };

  const mapLicencias = (licencias: Licencia[]): Activity[] => {
    const expanded: Activity[] = [];

    (licencias || []).forEach((lic) => {
      const timeMatch = lic.fecha_inicio.match(/[T ](\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '00:00';

      const start = new Date(lic.fecha_inicio);
      const end = new Date(lic.fecha_fin);
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);

      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);

      while (cursor.getTime() <= endDay.getTime()) {
        const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        expanded.push({
          id: `licencia-${lic.id}-${date}`,
          time,
          title: lic.tipo_licencia_nombre || 'Licencia',
          description: lic.tipo_licencia_nombre || '',
          completed: false,
          date,
          tipo: 'licencia',
          tipo_licencia_id: lic.tipo_licencia_id,
          tipo_licencia_nombre: lic.tipo_licencia_nombre,
          usuario_id: lic.usuario_id,
          fecha_fin: lic.fecha_fin,
        });

        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return expanded;
  };

  // Combinar todas las actividades
  const allActivities = useMemo(() => {
    const weekActivities = actividadesSemanalesQuery.data
      ? [
          ...mapActivities(actividadesSemanalesQuery.data.actividades || []),
          ...mapLicencias(actividadesSemanalesQuery.data.licencias || []),
        ]
      : [];
    return weekActivities;
  }, [actividadesSemanalesQuery.data]);

  const filteredActivities = useMemo(() => {
    if (viewMode === 'day') {
      return allActivities.filter(
        (a) => a.date === today.toISOString().split('T')[0]
      );
    }
    return allActivities;
  }, [viewMode, allActivities, today]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      setActiveDateType(null);
      return;
    }

    if (!selectedDate) return;

    const normalizedSelectedDate = normalizeToMinute(selectedDate);

    if (activeDateType === 'startDate') {
      setNewActivity((prev) => ({
        ...prev,
        date: normalizedSelectedDate.toISOString().split('T')[0],
        startTime: normalizedSelectedDate,
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'startTime') {
      const [date] = newActivity.date.split('T');
      const hours = String(normalizedSelectedDate.getHours()).padStart(2, '0');
      const minutes = String(normalizedSelectedDate.getMinutes()).padStart(2, '0');
      const updated = new Date(`${date}T${hours}:${minutes}`);
      setNewActivity((prev) => ({
        ...prev,
        startTime: normalizeToMinute(updated),
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'endTime') {
      const [date] = newActivity.date.split('T');
      const hours = String(normalizedSelectedDate.getHours()).padStart(2, '0');
      const minutes = String(normalizedSelectedDate.getMinutes()).padStart(2, '0');
      const updated = new Date(`${date}T${hours}:${minutes}`);
      setNewActivity((prev) => ({
        ...prev,
        endTime: normalizeToMinute(updated),
      }));
      setActiveDateType(null);
    }
  };

  const startDateTime = useMemo(
    () => buildDateTimeFromDateAndTime(newActivity.date, newActivity.startTime),
    [newActivity.date, newActivity.startTime]
  );
  const endDateTime = useMemo(
    () => buildDateTimeFromDateAndTime(newActivity.date, newActivity.endTime),
    [newActivity.date, newActivity.endTime]
  );
  const now = useMemo(
    () => ceilToNextMinute(new Date()),
    [newActivity.date, newActivity.startTime, newActivity.endTime, showAddForm]
  );
  const activityDateErrorMessage = useMemo(() => {
    if (startDateTime < now) return 'La fecha de inicio es menor a la actual.';
    if (endDateTime <= startDateTime) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [startDateTime, endDateTime, now]);

  const handleStartDate = () => {
    if (isValidationInProgress) return;
    setActiveDateType('startDate');
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const handleStartTime = () => {
    if (isValidationInProgress) return;
    setActiveDateType('startTime');
    setDatePickerMode('time');
    setShowDatePicker(true);
  };

  const handleEndTime = () => {
    if (isValidationInProgress) return;
    setActiveDateType('endTime');
    setDatePickerMode('time');
    setShowDatePicker(true);
  };

  const closeAddActivityModal = () => {
    setShowDatePicker(false);
    setActiveDateType(null);
    setShowAddForm(false);
  };

  const handleDeleteActivity = async (id: string) => {
    const activity = allActivities.find((a) => a.id === id);
    if (!activity || activity.tipo === 'licencia') return;

    const confirmed = await confirmAction({
      title: '¿Estás seguro?',
      message: `¿Deseas cancelar "${activity.title}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      const actividadId = Number(activity.id);
      if (!Number.isFinite(actividadId)) {
        Alert.alert('Error', 'No se pudo identificar la actividad a eliminar.');
        return;
      }
      await cancelarActividadMutation.mutateAsync({ actividadId });
      Alert.alert('Éxito', 'Actividad cancelada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    }
  };

  const handlePressActivity = useCallback((activity: Activity) => {
    if (activity.tipo === 'licencia') return;
    router.push({
      pathname: '/(extras)/actividad-detalle' as any,
      params: { actividadId: activity.id },
    });
  }, [router]);

  const ejecutarCrearActividad = useCallback(async (payload: {
    titulo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
  }) => {
    try {
      await crearActividadMutation.mutateAsync(payload);

      setNewActivity({
        date: today.toISOString().split('T')[0],
        startTime: new Date(),
        endTime: new Date(today.getTime() + 3600000),
        title: '',
        description: '',
      });
      closeAddActivityModal();
      Alert.alert('Éxito', 'Actividad creada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    }
  }, [crearActividadMutation, today]);

  const handleAddActivity = async () => {
    if (isValidationInProgress) return;

    if (!newActivity.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (activityDateErrorMessage) {
      return;
    }

    const startHours = String(startDateTime.getHours()).padStart(2, '0');
    const startMinutes = String(startDateTime.getMinutes()).padStart(2, '0');
    const endHours = String(endDateTime.getHours()).padStart(2, '0');
    const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0');

    const fechaInicio = `${newActivity.date}T${startHours}:${startMinutes}:00`;
    const fechaFin = `${newActivity.date}T${endHours}:${endMinutes}:00`;
    const payload = {
      titulo: newActivity.title.trim(),
      descripcion: newActivity.description,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    };

    const participantes: number[] = [];
    if (user?.user_context_id) {
      participantes.push(user.user_context_id);
    }

    validacion.validate(
      {
        fechaInicio,
        fechaFin,
        participantes,
        actividadIdExcluir: null,
      },
      () => ejecutarCrearActividad(payload)
    );
  };

  return (
    <View style={styles.container}>
      {/* Título */}
      <ThemedText type="title" style={styles.pageTitle}>Agenda Personal</ThemedText>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{dayName}</Text>
          <Text style={styles.headerSubtitle}>{dateString}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setViewMode('day')}
            style={[
              styles.tab,
              viewMode === 'day' && [styles.tabActive, { borderBottomColor: colors.lightTint }],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'day' && { color: colors.lightTint, fontWeight: 'bold' },
              ]}
            >
              Día
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('week')}
            style={[
              styles.tab,
              viewMode === 'week' && [styles.tabActive, { borderBottomColor: colors.lightTint }],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'week' && { color: colors.lightTint, fontWeight: 'bold' },
              ]}
            >
              Semana
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activities */}
      <ScrollView
        style={styles.activitiesContainer}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={actividadesSemanalesQuery.isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.lightTint]}
            tintColor={colors.lightTint}
          />
        }
      >
        {isLoading ? (
          <ScreenSkeleton rows={4} showHeader={false} />
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay actividades programadas</Text>
          </View>
        ) : viewMode === 'week' ? (
          <AgendaSemanal
            activities={filteredActivities}
            today={today}
            onDeleteActivity={handleDeleteActivity}
            onPressActivity={handlePressActivity}
          />
        ) : (
          <AgendaDiaria
            activities={filteredActivities}
            onDeleteActivity={handleDeleteActivity}
            onPressActivity={handlePressActivity}
          />
        )}
      </ScrollView>

      {/* Floating Menu Button */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16, right: 36 }]}>
        {showFloatingMenu && (
          <>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowAddForm(true);
                setShowFloatingMenu(false);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowFloatingMenu(!showFloatingMenu)}
        >
          <Ionicons
            name={showFloatingMenu ? 'close' : 'ellipsis-vertical'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* ==================== Add Activity Modal ==================== */}
      <Modal
        visible={showAddForm}
        transparent
        animationType="fade"
        onRequestClose={closeAddActivityModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior="position"
            keyboardVerticalOffset={insets.top + 12}
            style={styles.modalKavWrapper}
            contentContainerStyle={styles.modalKavContent}
          >
            <TouchableWithoutFeedback onPress={closeAddActivityModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>

            <View style={styles.modalContainer}>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nueva Actividad</Text>
                  <TouchableOpacity
                    onPress={closeAddActivityModal}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>

                {activityDateErrorMessage && (
                  <Text style={styles.errorTextInline}>{activityDateErrorMessage}</Text>
                )}

                {/* Fecha */}
                <View style={styles.dateSection}>
                  <TouchableOpacity onPress={handleStartDate} style={styles.dateRow}>
                    <Ionicons name="calendar" size={20} color={colors.lightTint} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.dateLabel}>Fecha</Text>
                      <Text style={styles.dateValue}>
                        {new Date(newActivity.date + 'T00:00:00').toLocaleDateString(
                          'es-ES',
                          { weekday: 'short', day: '2-digit', month: 'short' }
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Hora inicio */}
                  <TouchableOpacity onPress={handleStartTime} style={styles.dateRow}>
                    <Ionicons name="time" size={20} color={colors.lightTint} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.dateLabel}>Inicio</Text>
                      <Text style={styles.dateValue}>
                        {newActivity.startTime.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Hora fin */}
                  <TouchableOpacity onPress={handleEndTime} style={styles.dateRow}>
                    <Ionicons name="time" size={20} color={colors.lightTint} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.dateLabel}>Fin</Text>
                      <Text style={styles.dateValue}>
                        {newActivity.endTime.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {showDatePicker && Platform.OS === 'ios' && (
                  <View style={styles.inlinePickerContainer}>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={
                        activeDateType === 'startDate'
                          ? newActivity.startTime
                          : activeDateType === 'startTime'
                          ? newActivity.startTime
                          : newActivity.endTime
                      }
                      mode={datePickerMode}
                      is24Hour={true}
                      display="spinner"
                      onChange={onDateChange}
                    />
                  </View>
                )}

                {/* Título */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Título</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Título (requerido)"
                    value={newActivity.title}
                    onChangeText={(text) => setNewActivity({ ...newActivity, title: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Descripción */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="Descripción (opcional)"
                    value={newActivity.description}
                    onChangeText={(text) => setNewActivity({ ...newActivity, description: text })}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Botones */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeAddActivityModal}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!newActivity.title.trim() || !!activityDateErrorMessage) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleAddActivity}
                    disabled={!newActivity.title.trim() || !!activityDateErrorMessage || isMutating || isValidationInProgress}
                  >
                    {isMutating ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            activeDateType === 'startDate'
              ? newActivity.startTime
              : activeDateType === 'startTime'
              ? newActivity.startTime
              : newActivity.endTime
          }
          mode={datePickerMode}
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    textTransform: 'capitalize',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
  },
  activitiesContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 12,
  },
  errorTextInline: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },

  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    right: 36,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lightTint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMenuItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Modal styles (centered card, aligned with NovedadFormModal style)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKavWrapper: {
    flex: 1,
    width: '100%',
  },
  modalKavContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: MODAL_MAX_HEIGHT,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalScrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  dateSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  inlinePickerContainer: {
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 15,
    color: colors.lightTint,
    fontWeight: '600',
    marginTop: 2,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.lightTint,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AgendaPersonal;
