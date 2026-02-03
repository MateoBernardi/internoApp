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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Actividad, Licencia } from '../models/Actividad';
import {
  useActividadesSemanaAnterior,
  useActividadesSemanales,
  useCancelarActividad,
  useCrearActividad,
} from '../viewmodels/useActividades';

interface Activity {
  id: string;
  time: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string;
  rol?: string;
  prioridad?: number;
  participantes?: number[];
  tipo?: 'actividad' | 'licencia';
  solicitud_id?: number | null;
  tipo_licencia_id?: number;
  tipo_licencia_nombre?: string;
  usuario_id?: number;
  fecha_fin?: string;
}

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
    prioridad: 2,
  });

  const [selectedActivitiesToRepeat, setSelectedActivitiesToRepeat] = useState<string[]>([]);
  const [repeatDate, setRepeatDate] = useState<string>(today.toISOString().split('T')[0]);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'startDate' | 'startTime' | 'endTime' | null>(null);

  const isLoading =
    actividadesSemanalesQuery.isLoading ||
    actividadesSemanaAnteriorQuery.isLoading ||
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
        prioridad: act.prioridad,
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
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const actividadId = Number(activity.id.replace('licencia-', ''));
              await cancelarActividadMutation.mutateAsync({
                actividadId,
              });
              Alert.alert('Éxito', 'Actividad cancelada correctamente.');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Error al cancelar la actividad'
              );
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
        prioridad: newActivity.prioridad,
      });

      setNewActivity({
        date: today.toISOString().split('T')[0],
        startTime: new Date(),
        endTime: new Date(today.getTime() + 3600000),
        title: '',
        description: '',
        prioridad: 2,
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

  const getPriorityColor = (prioridad?: number) => {
    if (prioridad === 1) return '#EF4444';
    if (prioridad === 2) return '#F59E0B';
    return '#10B981';
  };

  const getPriorityLabel = (prioridad?: number) => {
    if (prioridad === 1) return 'P1';
    if (prioridad === 2) return 'P2';
    return 'P3';
  };

  // Vista de Día
  const DayView = () => {
    const sorted = [...filteredActivities].sort((a, b) =>
      (a.time || '23:59').localeCompare(b.time || '23:59')
    );

    return (
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item: activity }) => (
          <View style={styles.activityCardDay}>
            <View style={styles.timeColumnDay}>
              <Text style={styles.timeTextDay}>{activity.time || '—'}</Text>
              {activity.fecha_fin && (
                <Text style={styles.endTimeTextDay}>
                  {(() => {
                    const timeMatch = activity.fecha_fin.match(/[T ](\d{2}:\d{2})/);
                    return timeMatch ? timeMatch[1] : '—';
                  })()}
                </Text>
              )}
            </View>

            <View style={styles.contentColumnDay}>
              <View style={styles.titleRowDay}>
                <Text style={styles.titleTextDay} numberOfLines={2}>
                  {activity.title}
                </Text>
                {activity.prioridad && (
                  <View
                    style={[
                      styles.priorityBadgeDay,
                      {
                        backgroundColor: getPriorityColor(activity.prioridad),
                      },
                    ]}
                  >
                    <Text style={styles.priorityTextDay}>
                      {getPriorityLabel(activity.prioridad)}
                    </Text>
                  </View>
                )}
              </View>
              {activity.tipo === 'licencia' && (
                <Text style={styles.licenseLabelDay}>Licencia</Text>
              )}
              {activity.description && (
                <Text style={styles.descriptionTextDay} numberOfLines={2}>
                  {activity.description}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleDeleteActivity(activity.id)}
              style={styles.deleteButtonDay}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // Vista de Semana
  const WeekView = () => {
    const dayLabels = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const daysOfWeek = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(today);
      const dayOfWeek = dayDate.getDay();
      const daysOffset = i - dayOfWeek;
      dayDate.setDate(dayDate.getDate() + daysOffset);
      const dateStr = dayDate.toISOString().split('T')[0];

      const dayActivities = filteredActivities
        .filter((a) => a.date === dateStr)
        .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

      daysOfWeek.push({
        dateStr,
        dayLabel: dayLabels[i],
        dayNum: dayDate.getDate(),
        activities: dayActivities,
        isToday: dateStr === today.toISOString().split('T')[0],
      });
    }

    return (
      <FlatList
        data={daysOfWeek}
        keyExtractor={(item) => item.dateStr}
        renderItem={({ item: day }) => (
          <View
            style={[
              styles.dayCardWeek,
              day.isToday && styles.dayCardWeekToday,
            ]}
          >
            <View style={styles.dayHeaderWeek}>
              <Text
                style={[
                  styles.dayLabelWeek,
                  day.isToday && styles.dayLabelWeekToday,
                ]}
              >
                {day.dayLabel}
              </Text>
              <Text
                style={[
                  styles.dayDateWeek,
                  day.isToday && styles.dayDateWeekToday,
                ]}
              >
                {new Date(day.dateStr + 'T00:00:00')
                  .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  .toUpperCase()}
              </Text>
            </View>

            {day.activities.length === 0 ? (
              <Text style={styles.noActivitiesTextWeek}>Sin actividades</Text>
            ) : (
              <View style={styles.dayActivitiesContainerWeek}>
                {day.activities.map((activity) => (
                  <View key={activity.id} style={styles.weekActivityCard}>
                    <View style={styles.weekTimeColumn}>
                      <Text style={styles.weekTimeText}>{activity.time || '—'}</Text>
                    </View>

                    <View style={styles.weekContentColumn}>
                      <View style={styles.weekTitleRow}>
                        <Text style={styles.weekTitleText} numberOfLines={2}>
                          {activity.title}
                        </Text>
                        {activity.prioridad && (
                          <View
                            style={[
                              styles.weekPriorityBadge,
                              {
                                backgroundColor: getPriorityColor(
                                  activity.prioridad
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.weekPriorityText}>
                              {getPriorityLabel(activity.prioridad)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteActivity(activity.id)}
                      style={styles.weekDeleteButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.weekListContent}
      />
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
              viewMode === 'day' && [
                styles.tabActive,
                { borderBottomColor: '#1a73e8' },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'day' && {
                  color: '#1a73e8',
                  fontWeight: 'bold',
                },
              ]}
            >
              Día
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('week')}
            style={[
              styles.tab,
              viewMode === 'week' && [
                styles.tabActive,
                { borderBottomColor: '#1a73e8' },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'week' && {
                  color: '#1a73e8',
                  fontWeight: 'bold',
                },
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
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Cargando actividades...</Text>
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay actividades programadas</Text>
          </View>
        ) : viewMode === 'week' ? (
          <WeekView />
        ) : (
          <DayView />
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

      {/* Add Activity Modal */}
      <Modal
        visible={showAddForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddForm(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowAddForm(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nueva Actividad</Text>
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#5f6368" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                {/* Fecha */}
                <View style={styles.dateSection}>
                  <TouchableOpacity
                    onPress={handleStartDate}
                    style={styles.dateRow}
                  >
                    <Ionicons name="calendar" size={20} color="#1a73e8" />
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
                  <TouchableOpacity
                    onPress={handleStartTime}
                    style={styles.dateRow}
                  >
                    <Ionicons name="time" size={20} color="#1a73e8" />
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
                  <TouchableOpacity
                    onPress={handleEndTime}
                    style={styles.dateRow}
                  >
                    <Ionicons name="time" size={20} color="#1a73e8" />
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
                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.input}
                    placeholder="Título (requerido)"
                    value={newActivity.title}
                    onChangeText={(text) =>
                      setNewActivity({ ...newActivity, title: text })
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Prioridad */}
                <View style={styles.inputSection}>
                  <Text style={styles.sectionLabel}>Prioridad</Text>
                  <View style={styles.priorityChips}>
                    {[1, 2, 3].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityChip,
                          newActivity.prioridad === p &&
                            styles.priorityChipActive,
                        ]}
                        onPress={() =>
                          setNewActivity({ ...newActivity, prioridad: p })
                        }
                      >
                        <Text
                          style={[
                            styles.priorityChipText,
                            newActivity.prioridad === p &&
                              styles.priorityChipTextActive,
                          ]}
                        >
                          {p === 1 ? 'Alta' : p === 2 ? 'Media' : 'Baja'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Descripción */}
                <View style={styles.inputSection}>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="Descripción (opcional)"
                    value={newActivity.description}
                    onChangeText={(text) =>
                      setNewActivity({ ...newActivity, description: text })
                    }
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              {/* Botones */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButtonModal}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={styles.cancelButtonTextModal}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButtonModal,
                    !newActivity.title.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleAddActivity}
                  disabled={!newActivity.title.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Repeat Activities Modal */}
      <Modal
        visible={showRepeatForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepeatForm(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowRepeatForm(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContent, styles.largeModalContent]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Repetir actividades</Text>
                <TouchableOpacity
                  onPress={() => setShowRepeatForm(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#5f6368" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                {/* Select all button */}
                <View style={styles.selectAllContainer}>
                  <Text style={styles.selectAllText}>
                    {lastWeekActivities.length} actividades disponibles
                  </Text>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={selectAllActivities}
                  >
                    <Text style={styles.selectAllButtonText}>
                      {selectedActivitiesToRepeat.length ===
                      lastWeekActivities.length
                        ? 'Deseleccionar'
                        : 'Seleccionar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Activities list */}
                <FlatList
                  data={lastWeekActivities.sort((a, b) =>
                    a.time.localeCompare(b.time)
                  )}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: activity }) => {
                    const isSelected = selectedActivitiesToRepeat.includes(
                      activity.id
                    );

                    return (
                      <TouchableOpacity
                        style={[
                          styles.repeatActivityCard,
                          isSelected && styles.repeatActivityCardSelected,
                        ]}
                        onPress={() => toggleActivitySelection(activity.id)}
                      >
                        <View style={styles.checkboxContainer}>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#FFFFFF"
                              />
                            )}
                          </View>
                          <View style={styles.repeatActivityInfo}>
                            <Text style={styles.repeatActivityTime}>
                              {activity.time}
                            </Text>
                            <Text style={styles.repeatActivityTitle}>
                              {activity.title}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  scrollEnabled={false}
                />
              </ScrollView>

              {/* Footer buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButtonModal}
                  onPress={() => setShowRepeatForm(false)}
                >
                  <Text style={styles.cancelButtonTextModal}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButtonModal,
                    selectedActivitiesToRepeat.length === 0 &&
                      styles.submitButtonDisabled,
                  ]}
                  disabled={selectedActivitiesToRepeat.length === 0 || isLoading}
                  onPress={() => {
                    Alert.alert(
                      'Éxito',
                      `Se van a repetir ${selectedActivitiesToRepeat.length} actividades`
                    );
                    setSelectedActivitiesToRepeat([]);
                    setShowRepeatForm(false);
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
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
    backgroundColor: Colors['light'].componentBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    color: Colors['light'].text,
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
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  weekListContent: {
    gap: 8,
    paddingBottom: 16,
  },

  // Styles for Day View
  activityCardDay: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  timeColumnDay: {
    marginRight: 12,
    minWidth: 50,
  },
  timeTextDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  endTimeTextDay: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  contentColumnDay: {
    flex: 1,
  },
  titleRowDay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  titleTextDay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
  },
  priorityBadgeDay: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityTextDay: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  licenseLabelDay: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '600',
    marginTop: 4,
  },
  descriptionTextDay: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 4,
  },
  deleteButtonDay: {
    paddingLeft: 8,
    justifyContent: 'center',
  },

  // Styles for Week View
  dayCardWeek: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dadce0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  dayCardWeekToday: {
    backgroundColor: '#f1f3f4',
    borderLeftColor: '#1a73e8',
  },
  dayHeaderWeek: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayLabelWeek: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelWeekToday: {
    color: '#1a73e8',
  },
  dayDateWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    marginTop: 4,
  },
  dayDateWeekToday: {
    color: '#1a73e8',
  },
  noActivitiesTextWeek: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dayActivitiesContainerWeek: {
    gap: 6,
  },
  weekActivityCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    padding: 10,
  },
  weekTimeColumn: {
    marginRight: 8,
    minWidth: 40,
  },
  weekTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#202124',
  },
  weekContentColumn: {
    flex: 1,
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
  },
  weekPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  weekPriorityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekDeleteButton: {
    paddingLeft: 8,
    justifyContent: 'center',
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
    backgroundColor: '#1a73e8',
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
    backgroundColor: '#34a853',
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
    backgroundColor: '#ea4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  largeModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
  },
  closeButton: {
    padding: 8,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#1a73e8',
    fontWeight: '600',
    marginTop: 2,
  },
  inputSection: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    fontSize: 15,
    color: '#202124',
    padding: 0,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    marginBottom: 8,
  },
  priorityChips: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    backgroundColor: '#f1f3f4',
  },
  priorityChipActive: {
    backgroundColor: '#d2e3fc',
    borderColor: '#1a73e8',
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5f6368',
  },
  priorityChipTextActive: {
    color: '#1a73e8',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  cancelButtonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonTextModal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  submitButtonModal: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
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
    color: '#1a73e8',
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
    borderColor: '#1a73e8',
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
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
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
});

export default AgendaPersonal;