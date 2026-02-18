import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '../components/activityTypes';
import { AgendaDiaria } from '../components/AgendaDiaria';
import { AgendaSemanal } from '../components/AgendaSemanal';
import type { Actividad, Licencia } from '../models/Actividad';
import {
  useActividadesSemanaAnterior,
  useActividadesSemanales,
  useCancelarActividad,
  useCrearActividad,
} from '../viewmodels/useActividades';

const colors = Colors['light'];

const AgendaPersonal: React.FC = () => {
  // Queries
  const actividadesSemanalesQuery = useActividadesSemanales();
  const actividadesSemanaAnteriorQuery = useActividadesSemanaAnterior();
  const insets = useSafeAreaInsets();

  // Mutations
  const crearActividadMutation = useCrearActividad();
  const cancelarActividadMutation = useCancelarActividad();

  const today = new Date();
  const dayName = today.toLocaleDateString('es-ES', { weekday: 'long' });
  const dateString = today.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRepeatForm, setShowRepeatForm] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  const [newActivity, setNewActivity] = useState({
    date: today.toISOString().split('T')[0],
    startTime: new Date(),
    endTime: new Date(today.getTime() + 3600000),
    title: '',
    description: '',
  });

  const [selectedActivitiesToRepeat, setSelectedActivitiesToRepeat] = useState<string[]>([]);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'startDate' | 'startTime' | 'endTime' | null>(null);

  const isLoading =
    actividadesSemanalesQuery.isLoading ||
    actividadesSemanaAnteriorQuery.isLoading;

  const isMutating =
    crearActividadMutation.isPending ||
    cancelarActividadMutation.isPending;

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
      };
    });
  };

  const mapLicencias = (licencias: Licencia[]): Activity[] => {
    return (licencias || []).map((lic) => {
      const timeMatch = lic.fecha_inicio.match(/[T ](\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '00:00';

      const dateMatch = lic.fecha_inicio.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : lic.fecha_inicio.split(/[T ]/)[0];

      return {
        id: `licencia-${lic.id}`,
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
      };
    });
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

  const lastWeekActivities = useMemo(() => {
    return actividadesSemanaAnteriorQuery.data
      ? mapActivities(actividadesSemanaAnteriorQuery.data.actividades || [])
      : [];
  }, [actividadesSemanaAnteriorQuery.data]);

  const filteredActivities = useMemo(() => {
    if (viewMode === 'day') {
      return allActivities.filter(
        (a) => a.date === today.toISOString().split('T')[0]
      );
    }
    return allActivities;
  }, [viewMode, allActivities, today]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      setActiveDateType(null);
      return;
    }

    if (!selectedDate) return;

    if (activeDateType === 'startDate') {
      setNewActivity((prev) => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedDate,
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'startTime') {
      const [date] = newActivity.date.split('T');
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const updated = new Date(`${date}T${hours}:${minutes}`);
      setNewActivity((prev) => ({
        ...prev,
        startTime: updated,
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'endTime') {
      const [date] = newActivity.date.split('T');
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const updated = new Date(`${date}T${hours}:${minutes}`);
      setNewActivity((prev) => ({
        ...prev,
        endTime: updated,
      }));
      setActiveDateType(null);
    }
  };

  const handleStartDate = () => {
    setActiveDateType('startDate');
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const handleStartTime = () => {
    setActiveDateType('startTime');
    setDatePickerMode('time');
    setShowDatePicker(true);
  };

  const handleEndTime = () => {
    setActiveDateType('endTime');
    setDatePickerMode('time');
    setShowDatePicker(true);
  };

  const handleDeleteActivity = async (id: string) => {
    const activity = allActivities.find((a) => a.id === id);
    if (!activity) return;

    Alert.alert(
      '¿Estás seguro?',
      `¿Deseas cancelar "${activity.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const actividadId = Number(activity.id.replace('licencia-', ''));
              await cancelarActividadMutation.mutateAsync({ actividadId });
              Alert.alert('Éxito', 'Actividad cancelada correctamente.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Error al cancelar la actividad');
            }
          },
        },
      ]
    );
  };

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    try {
      const startHours = String(newActivity.startTime.getHours()).padStart(2, '0');
      const startMinutes = String(newActivity.startTime.getMinutes()).padStart(2, '0');
      const endHours = String(newActivity.endTime.getHours()).padStart(2, '0');
      const endMinutes = String(newActivity.endTime.getMinutes()).padStart(2, '0');

      const fechaInicio = `${newActivity.date}T${startHours}:${startMinutes}:00`;
      const fechaFin = `${newActivity.date}T${endHours}:${endMinutes}:00`;

      await crearActividadMutation.mutateAsync({
        titulo: newActivity.title,
        descripcion: newActivity.description,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });

      setNewActivity({
        date: today.toISOString().split('T')[0],
        startTime: new Date(),
        endTime: new Date(today.getTime() + 3600000),
        title: '',
        description: '',
      });
      setShowAddForm(false);
      Alert.alert('Éxito', 'Actividad creada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear la actividad');
    }
  };

  const toggleActivitySelection = (id: string) => {
    setSelectedActivitiesToRepeat((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    );
  };

  const selectAllActivities = () => {
    if (selectedActivitiesToRepeat.length === lastWeekActivities.length) {
      setSelectedActivitiesToRepeat([]);
    } else {
      setSelectedActivitiesToRepeat(lastWeekActivities.map((a) => a.id));
    }
  };

  const handleRepeatActivities = async () => {
    if (selectedActivitiesToRepeat.length === 0) return;

    const activitiesToRepeat = lastWeekActivities.filter((a) =>
      selectedActivitiesToRepeat.includes(a.id)
    );

    let successCount = 0;
    let errorCount = 0;

    for (const activity of activitiesToRepeat) {
      try {
        // Calcular la nueva fecha: misma hora, pero en la semana actual
        const originalDate = new Date(activity.date + 'T' + activity.time + ':00');
        const dayOfWeek = originalDate.getDay();

        const newDate = new Date(today);
        const currentDay = newDate.getDay();
        const daysOffset = dayOfWeek - currentDay;
        newDate.setDate(newDate.getDate() + daysOffset);
        const newDateStr = newDate.toISOString().split('T')[0];

        const fechaInicio = `${newDateStr}T${activity.time}:00`;

        // Calcular fecha fin basándose en la duración original
        let fechaFin = `${newDateStr}T${activity.time}:00`;
        if (activity.fecha_fin) {
          const finMatch = activity.fecha_fin.match(/[T ](\d{2}:\d{2})/);
          if (finMatch) {
            fechaFin = `${newDateStr}T${finMatch[1]}:00`;
          }
        }

        await crearActividadMutation.mutateAsync({
          titulo: activity.title,
          descripcion: activity.description || '',
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setSelectedActivitiesToRepeat([]);
    setShowRepeatForm(false);

    if (errorCount === 0) {
      Alert.alert('Éxito', `Se repitieron ${successCount} actividades correctamente.`);
    } else {
      Alert.alert(
        'Resultado',
        `${successCount} actividades creadas, ${errorCount} con error.`
      );
    }
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
      <ScrollView style={styles.activitiesContainer} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.lightTint} />
            <Text style={styles.loadingText}>Cargando actividades...</Text>
          </View>
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
          />
        ) : (
          <AgendaDiaria
            activities={filteredActivities}
            onDeleteActivity={handleDeleteActivity}
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
            <TouchableOpacity
              style={styles.fabMenuItemRepeat}
              onPress={() => {
                setShowRepeatForm(true);
                setShowFloatingMenu(false);
              }}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
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
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowAddForm(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nueva Actividad</Text>
                  <TouchableOpacity
                    onPress={() => setShowAddForm(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>

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
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddForm(false)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !newActivity.title.trim() && styles.submitButtonDisabled,
                    ]}
                    onPress={handleAddActivity}
                    disabled={!newActivity.title.trim() || isMutating}
                  >
                    {isMutating ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* ==================== Repeat Activities Modal ==================== */}
      <Modal
        visible={showRepeatForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepeatForm(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowRepeatForm(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Repetir actividades</Text>
                <TouchableOpacity
                  onPress={() => setShowRepeatForm(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              {actividadesSemanaAnteriorQuery.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.lightTint} />
                  <Text style={styles.loadingText}>Cargando semana anterior...</Text>
                </View>
              ) : actividadesSemanaAnteriorQuery.isError ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                  <Text style={[styles.emptyText, { color: colors.error }]}>
                    No se pudieron cargar las actividades de la semana anterior.
                  </Text>
                </View>
              ) : lastWeekActivities.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No hay actividades de la semana anterior</Text>
                </View>
              ) : (
                <>
                  {/* Select all button */}
                  <View style={styles.selectAllContainer}>
                    <Text style={styles.selectAllText}>
                      {lastWeekActivities.length} actividades disponibles
                    </Text>
                    <TouchableOpacity style={styles.selectAllButton} onPress={selectAllActivities}>
                      <Text style={styles.selectAllButtonText}>
                        {selectedActivitiesToRepeat.length === lastWeekActivities.length
                          ? 'Deseleccionar'
                          : 'Seleccionar'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Activities list */}
                  <FlatList
                    data={lastWeekActivities.sort((a, b) => a.time.localeCompare(b.time))}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: activity }) => {
                      const isSelected = selectedActivitiesToRepeat.includes(activity.id);
                      const hasParticipants = (activity.participantes?.length ?? 0) > 1;

                      return (
                        <TouchableOpacity
                          style={[
                            styles.repeatActivityCard,
                            isSelected && styles.repeatActivityCardSelected,
                          ]}
                          onPress={() => toggleActivitySelection(activity.id)}
                        >
                          <View style={styles.checkboxContainer}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              )}
                            </View>
                            <View style={styles.repeatActivityInfo}>
                              <Text style={styles.repeatActivityTime}>{activity.time}</Text>
                              <Text style={styles.repeatActivityTitle}>{activity.title}</Text>
                              {hasParticipants && (
                                <Text style={styles.repeatParticipantsText}>
                                  {activity.participantes!.length} participantes
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    scrollEnabled={false}
                  />
                </>
              )}

              {/* Footer buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRepeatForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    selectedActivitiesToRepeat.length === 0 && styles.submitButtonDisabled,
                  ]}
                  disabled={selectedActivitiesToRepeat.length === 0 || isMutating}
                  onPress={handleRepeatActivities}
                >
                  {isMutating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Repetir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
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
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
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
  fabMenuItemRepeat: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error,
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
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
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
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#d2e3fc',
    borderRadius: 6,
  },
  selectAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightTint,
  },
  repeatActivityCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  repeatActivityCardSelected: {
    backgroundColor: '#f1f3f4',
    borderColor: colors.lightTint,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: colors.lightTint,
    borderColor: colors.lightTint,
  },
  repeatActivityInfo: {
    flex: 1,
  },
  repeatActivityTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#202124',
  },
  repeatActivityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginTop: 2,
  },
  repeatParticipantsText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
  },
});

export default AgendaPersonal;
