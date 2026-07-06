import { CreateButton } from '@/components/ui/CreateButton';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors, UI } from '@/constants/theme';
import { confirmAction } from '@/shared/ui/confirmAction';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActividadDetalle } from '../components/ActividadDetalle';
import { AgendaDiaria } from '../components/AgendaDiaria';
import { AgendaMonthGrid } from '../components/AgendaMonthGrid';
import { AgendaSemanal } from '../components/AgendaSemanal';
import { AgendaToolbar } from '../components/AgendaToolbar';
import { CrearActividadModal } from '../components/CrearActividadModal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import type { CrearActividadResponse } from '../models/Actividad';
import type { RangoOcupado } from '../models/Solicitud';
import type { Activity } from '../models/activityTypes';
import {
  buildPeriodoVentanaFromMonth,
  useActividadesPorPeriodo,
  useCancelarActividad,
  useCrearActividad,
} from '../viewmodels/useActividades';
import { mapActivities, mapLicencias, mapTurnos } from '../agenda/activityMappers';
import { useTurnosPorPeriodo } from '@/features/horarios/viewmodels/useTurnosAgenda';
import {
  addMonths,
  buildDateTimeFromDateAndTime,
  buildDefaultNewActivityState,
  ceilToNextMinute,
  formatDateKey,
  generarGrillaMes,
  normalizeToMinute,
} from '../agenda/dateUtils';

const colors = Colors['light'];
const AgendaPersonal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { actividadId: actividadIdParam, id: idParam, rol: rolParam } = useLocalSearchParams<{
    actividadId?: string | string[];
    id?: string | string[];
    rol?: string | string[];
  }>();
  const { height: windowHeight } = useWindowDimensions();
  const [selectedActividadId, setSelectedActividadId] = useState<number | null>(null);
  const [selectedActividadRol, setSelectedActividadRol] = useState<string | undefined>(undefined);
  const handledParamRef = useRef<string | null>(null);

  // FIX: today estabilizado con useState para que no cambie de referencia en cada render.
  // Antes era `const today = new Date()` lo que generaba una nueva instancia
  // en cada render, causando re-renders en cadena en los hijos.
  const [today] = useState(() => new Date());

  const [activeMonth, setActiveMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const periodo = useMemo(() => buildPeriodoVentanaFromMonth(activeMonth), [activeMonth]);
  const actividadesPeriodoQuery = useActividadesPorPeriodo(periodo);
  const turnosPeriodoQuery = useTurnosPorPeriodo(periodo);

  const crearActividadMutation = useCrearActividad();
  const cancelarActividadMutation = useCancelarActividad();

  const handleRefresh = useCallback(async () => {
    await actividadesPeriodoQuery.refetch();
  }, [actividadesPeriodoQuery]);

  const [viewMode, setViewMode] = useState<'month' | 'day' | 'week'>('month');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddFormMinimized, setIsAddFormMinimized] = useState(false);
  const [showEndDateFields, setShowEndDateFields] = useState(false);

  const [newActivity, setNewActivity] = useState(() => buildDefaultNewActivityState('month', formatDateKey(new Date())));

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | 'monthJump' | null>(null);
  const [backendRangosOcupados, setBackendRangosOcupados] = useState<RangoOcupado[]>([]);

  const isLoading = actividadesPeriodoQuery.isLoading;
  const isMutating = crearActividadMutation.isPending || cancelarActividadMutation.isPending;

  useEffect(() => {
    const rawActividadId = Array.isArray(actividadIdParam) ? actividadIdParam[0] : actividadIdParam;
    const rawId = rawActividadId ?? (Array.isArray(idParam) ? idParam[0] : idParam);
    const rawRol = Array.isArray(rolParam) ? rolParam[0] : rolParam;

    if (!rawId) return;
    const key = `${rawId}:${rawRol ?? ''}`;
    if (handledParamRef.current === key) return;

    const parsedId = Number(rawId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) return;

    setSelectedActividadId(parsedId);
    setSelectedActividadRol(rawRol ?? undefined);
    handledParamRef.current = key;
  }, [actividadIdParam, idParam, rolParam]);

  const avisosBackend = useMemo(() => {
    const grouped = new Map<string, number>();
    backendRangosOcupados.forEach((rango) => {
      grouped.set(rango.usuario, (grouped.get(rango.usuario) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([usuario, cantidad]) =>
      `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendRangosOcupados]);

  const allActivities = useMemo(() => {
    if (!actividadesPeriodoQuery.data) return [];
    return [
      ...mapActivities(actividadesPeriodoQuery.data.actividades || []),
      ...mapLicencias(actividadesPeriodoQuery.data.licencias || []),
      ...mapTurnos(turnosPeriodoQuery.data || []),
    ];
  }, [actividadesPeriodoQuery.data, turnosPeriodoQuery.data]);

  const filteredActivities = useMemo(() => {
    if (viewMode === 'day') {
      return allActivities.filter((a) => a.date === selectedDate);
    }
    return allActivities;
  }, [viewMode, allActivities, selectedDate]);

  const monthGridDates = useMemo(
    () => generarGrillaMes(activeMonth.getFullYear(), activeMonth.getMonth()),
    [activeMonth]
  );

  const dayCellHeight = useMemo(() => {
    const maxByHeight = (windowHeight - 260) / 6;
    return Math.max(72, Math.min(108, maxByHeight));
  }, [windowHeight]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    allActivities.forEach((activity) => {
      const current = map.get(activity.date) ?? [];
      current.push(activity);
      map.set(activity.date, current);
    });

    map.forEach((items, dateKey) => {
      items.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
      map.set(dateKey, items);
    });

    return map;
  }, [allActivities]);

  const handleChangeMonth = useCallback((delta: number) => {
    const nextMonth = addMonths(activeMonth, delta);
    setActiveMonth(nextMonth);
    setSelectedDate(formatDateKey(nextMonth));
  }, [activeMonth]);

  const onDateCancel = () => {
    setShowDatePicker(false);
    setActiveDateType(null);
  };

  const onDateConfirm = (selectedDate: Date) => {
    const normalizedSelectedDate = normalizeToMinute(selectedDate);

    if (activeDateType === 'startDate') {
      setNewActivity((prev) => ({
        ...prev,
        date: formatDateKey(normalizedSelectedDate),
        endDate: showEndDateFields ? prev.endDate : formatDateKey(normalizedSelectedDate),
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
    } else if (activeDateType === 'endDate') {
      setNewActivity((prev) => ({
        ...prev,
        endDate: formatDateKey(normalizedSelectedDate),
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'endTime') {
      const [date] = newActivity.endDate.split('T');
      const hours = String(normalizedSelectedDate.getHours()).padStart(2, '0');
      const minutes = String(normalizedSelectedDate.getMinutes()).padStart(2, '0');
      const updated = new Date(`${date}T${hours}:${minutes}`);
      setNewActivity((prev) => ({
        ...prev,
        endTime: normalizeToMinute(updated),
      }));
      setActiveDateType(null);
    } else if (activeDateType === 'monthJump') {
      const picked = new Date(normalizedSelectedDate);
      setActiveMonth(new Date(picked.getFullYear(), picked.getMonth(), 1));
      setSelectedDate(formatDateKey(picked));
      setActiveDateType(null);
    }

    setShowDatePicker(false);
  };

  const startDateTime = useMemo(
    () => buildDateTimeFromDateAndTime(newActivity.date, newActivity.startTime),
    [newActivity.date, newActivity.startTime]
  );

  const endDateTime = useMemo(() => {
    if (!showEndDateFields) {
      return new Date(startDateTime.getTime() + 60 * 60 * 1000);
    }
    return buildDateTimeFromDateAndTime(newActivity.endDate, newActivity.endTime);
  }, [showEndDateFields, newActivity.endDate, newActivity.endTime, startDateTime]);

  // FIX: now ya no tiene dependencias del formulario. Antes dependía de
  // newActivity.date, startTime, endTime y showAddForm, lo que lo recalculaba
  // al tocar cualquier campo y generaba re-renders en cadena que podían
  // re-disparar el query. `now` solo necesita calcularse al montar.
  const now = useMemo(() => ceilToNextMinute(new Date()), []);

  const activityDateErrorMessage = useMemo(() => {
    if (startDateTime < now) return 'La fecha de inicio es menor a la actual.';
    if (showEndDateFields && endDateTime <= startDateTime) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [startDateTime, endDateTime, now, showEndDateFields]);

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

  const handleEndDate = () => {
    setActiveDateType('endDate');
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const handleOpenMonthDatePicker = () => {
    setActiveDateType('monthJump');
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const closeAddActivityModal = useCallback(() => {
    setShowDatePicker(false);
    setActiveDateType(null);
    setShowAddForm(false);
    setIsAddFormMinimized(false);
    setNewActivity(buildDefaultNewActivityState(viewMode, selectedDate));
    setShowEndDateFields(false);
  }, [viewMode, selectedDate]);

  const openAddActivityModal = () => {
    if (!isAddFormMinimized) {
      setNewActivity(buildDefaultNewActivityState(viewMode, selectedDate));
      setShowEndDateFields(false);
    }
    setShowAddForm(true);
    setIsAddFormMinimized(false);
  };

  const minimizeAddActivityModal = () => {
    setShowDatePicker(false);
    setActiveDateType(null);
    setShowAddForm(false);
    setIsAddFormMinimized(true);
  };

  // FIX: handleDeleteActivity envuelto en useCallback para evitar que se
  // recree en cada render y fuerze re-renders innecesarios en AgendaSemanal/AgendaDiaria.
  const handleDeleteActivity = useCallback(async (id: string) => {
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
      const actividadId = activity.actividad_id ?? Number(activity.id);
      if (!Number.isFinite(actividadId)) {
        Alert.alert('Error', 'No se pudo identificar la actividad a eliminar.');
        return;
      }
      await cancelarActividadMutation.mutateAsync({ id: actividadId });
      Alert.alert('Éxito', 'Actividad cancelada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    }
  }, [allActivities, cancelarActividadMutation]);

  const handlePressActivity = useCallback((activity: Activity) => {
    if (activity.tipo === 'licencia') return;

    const actividadId = activity.actividad_id ?? Number(activity.id);
    if (!Number.isFinite(actividadId)) return;

    setSelectedActividadId(actividadId);
    setSelectedActividadRol(activity.rol ?? undefined);
  }, []);

  const handleCloseActividad = useCallback(() => {
    setSelectedActividadId(null);
    setSelectedActividadRol(undefined);
  }, []);

  const ejecutarCrearActividad = useCallback(async (payload: {
    titulo: string;
    descripcion: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
  }) => {
    try {
      const response: CrearActividadResponse = await crearActividadMutation.mutateAsync(payload);

      if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
        setBackendRangosOcupados(response.rangosOcupados ?? []);
        return;
      }

      setNewActivity(buildDefaultNewActivityState(viewMode, selectedDate));
      closeAddActivityModal();
      Alert.alert('Éxito', 'Actividad creada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Intenta nuevamente');
    }
  }, [crearActividadMutation, closeAddActivityModal, viewMode, selectedDate]);

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (activityDateErrorMessage) return;

    const payload = {
      titulo: newActivity.title.trim(),
      descripcion: newActivity.description,
      fecha_inicio: startDateTime,
      ...(showEndDateFields ? { fecha_fin: endDateTime } : {}),
    };

    await ejecutarCrearActividad(payload);
  };

  const handleToggleEndDateFields = () => {
    setShowEndDateFields((prev) => {
      if (prev) return false;
      setNewActivity((current) => ({
        ...current,
        endDate: current.date,
        endTime: new Date(startDateTime.getTime() + 60 * 60 * 1000),
      }));
      return true;
    });
  };

  const handleChangeTitle = (text: string) => setNewActivity((prev) => ({ ...prev, title: text }));
  const handleChangeDescription = (text: string) => setNewActivity((prev) => ({ ...prev, description: text }));

  // Valor compartido por el picker de iOS (dentro del modal) y el de Android.
  const datePickerValue = activeDateType === 'monthJump'
    ? new Date(selectedDate + 'T00:00:00')
    : activeDateType === 'startDate'
      ? newActivity.startTime
      : activeDateType === 'startTime'
        ? newActivity.startTime
        : activeDateType === 'endDate'
          ? new Date(newActivity.endDate + 'T00:00:00')
          : newActivity.endTime;
  const pickerKey = `${activeDateType ?? 'none'}-${datePickerMode}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <AgendaToolbar
        activeMonth={activeMonth}
        viewMode={viewMode}
        onPrevMonth={() => handleChangeMonth(-1)}
        onNextMonth={() => handleChangeMonth(1)}
        onOpenMonthPicker={handleOpenMonthDatePicker}
        onChangeViewMode={setViewMode}
        subtitle="Tu turno laboral y tus eventos, en un solo lugar"
      />

      {/* Activities */}
      <ScrollView
        style={styles.activitiesContainer}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: viewMode === 'month' ? 1 : 0 }}
        refreshControl={
          <RefreshControl
            refreshing={actividadesPeriodoQuery.isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.lightTint]}
            tintColor={colors.lightTint}
          />
        }
      >
        {isLoading ? (
          <ScreenSkeleton rows={4} showHeader={false} />
        ) : viewMode === 'month' ? (
          <AgendaMonthGrid
            monthGridDates={monthGridDates}
            selectedDate={selectedDate}
            dayCellHeight={dayCellHeight}
            activitiesByDate={activitiesByDate}
            onSelectDay={(cell) => {
              setSelectedDate(formatDateKey(cell.date));
              setActiveMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
              setViewMode('day');
            }}
          />
        ) : viewMode === 'week' ? (
          <AgendaSemanal
            activities={filteredActivities}
            today={new Date(selectedDate)}
            onDeleteActivity={handleDeleteActivity}
            onPressActivity={handlePressActivity}
            onPressDay={(dateKey) => {
              setSelectedDate(dateKey);
              const nextDate = new Date(dateKey + 'T00:00:00');
              setActiveMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
              setViewMode('day');
            }}
          />
        ) : (
          <AgendaDiaria
            activities={filteredActivities}
            dateKey={selectedDate}
            onDeleteActivity={handleDeleteActivity}
            onPressActivity={handlePressActivity}
          />
        )}
      </ScrollView>

      {isAddFormMinimized && (
        <View style={[styles.minimizedDraftContainer, { bottom: insets.bottom + UI.spacing.xxl + 68 }]}>
          <TouchableOpacity style={styles.minimizedDraftMain} onPress={openAddActivityModal}>
            <Ionicons name="chevron-up" size={18} color="#6b7280" />
            <Text style={styles.minimizedDraftText}>Borrador de actividad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.minimizedDraftClose} onPress={closeAddActivityModal}>
            <Ionicons name="close" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.createButtonContainer, { bottom: insets.bottom + 8, right: 36 }]}>
        <CreateButton
          onPress={openAddActivityModal}
          size={56}
          accessibilityLabel="Crear nueva actividad"
        />
      </View>

      {/* ==================== Add Activity Modal ==================== */}
      <CrearActividadModal
        visible={showAddForm}
        newActivity={newActivity}
        showEndDateFields={showEndDateFields}
        activityDateErrorMessage={activityDateErrorMessage}
        isLoading={isLoading}
        onMinimize={minimizeAddActivityModal}
        onClose={closeAddActivityModal}
        onStartDate={handleStartDate}
        onStartTime={handleStartTime}
        onEndDate={handleEndDate}
        onEndTime={handleEndTime}
        onToggleEndDateFields={handleToggleEndDateFields}
        onChangeTitle={handleChangeTitle}
        onChangeDescription={handleChangeDescription}
        onSubmit={handleAddActivity}
        showDatePicker={showDatePicker}
        datePickerMode={datePickerMode}
        pickerKey={pickerKey}
        datePickerValue={datePickerValue}
        onDateConfirm={onDateConfirm}
        onDateCancel={onDateCancel}
      />

      {/* Date Picker (Android) */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          key={pickerKey}
          visible={showDatePicker}
          testID="dateTimePicker"
          value={datePickerValue}
          mode={datePickerMode}
          is24Hour={true}
          onConfirm={onDateConfirm}
          onCancel={onDateCancel}
        />
      )}

      {selectedActividadId !== null && (
        <ActividadDetalle
          visible
          actividadId={selectedActividadId}
          rol={selectedActividadRol}
          onClose={handleCloseActividad}
        />
      )}

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

      <OperacionPendienteModal visible={isMutating} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  activitiesContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  minimizedDraftContainer: {
    position: 'absolute',
    right: UI.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    borderRadius: UI.radius.md,
    paddingLeft: UI.spacing.sm,
    paddingRight: UI.spacing.xs,
    paddingVertical: UI.spacing.xs,
    shadowColor: UI.shadow.color,
    shadowOffset: UI.shadow.offset,
    shadowOpacity: UI.shadow.opacity,
    shadowRadius: UI.shadow.radius,
    elevation: UI.shadow.elevation,
  },
  minimizedDraftMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: UI.spacing.xs,
  },
  minimizedDraftText: {
    marginLeft: 6,
    color: colors.text,
    fontSize: UI.fontSize.sm,
    fontWeight: '600',
  },
  minimizedDraftClose: {
    marginLeft: 6,
    padding: 4,
  },
  createButtonContainer: {
    position: 'absolute',
  },
});

export default AgendaPersonal;