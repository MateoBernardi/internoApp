import { CreateButton } from '@/components/ui/CreateButton';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors, UI } from '@/constants/theme';
import { useValidacionFechas } from '@/features/solicitudesActividades/viewmodels/useValidacionFechas';
import { AppFab } from '@/shared/ui/AppFab';
import { confirmAction } from '@/shared/ui/confirmAction';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgendaDiaria } from '../components/AgendaDiaria';
import { AgendaSemanal } from '../components/AgendaSemanal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import type { Actividad, Licencia } from '../models/Actividad';
import type { Activity } from '../models/activityTypes';
import {
  buildPeriodoVentanaFromMonth,
  useActividadesPorPeriodo,
  useCancelarActividad,
  useCrearActividad,
} from '../viewmodels/useActividades';

const colors = Colors['light'];
const WEEKDAY_LABELS = ['d', 'l', 'm', 'm', 'j', 'v', 's'];

function getMonthNameEs(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'long' });
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

type MonthGridCell = {
  day: number;
  esMesActual: boolean;
  date: Date;
};

function generarGrillaMes(year: number, month: number): MonthGridCell[] {
  const primerDiaDelMes = new Date(year, month, 1).getDay();
  const primerDiaGrilla = new Date(year, month, 1 - primerDiaDelMes);
  const dias: MonthGridCell[] = [];

  // Matriz fija de 6x7, usando Date de JS (month: 0 = enero).
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(primerDiaGrilla);
    date.setDate(primerDiaGrilla.getDate() + i);
    dias.push({
      day: date.getDate(),
      esMesActual: date.getMonth() === month,
      date,
    });
  }

  return dias;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseLocalDateTime(input?: string | null): Date {
  if (!input) {
    return new Date(NaN);
  }

  // Soporta: Z, +HH:MM, -HH:MM, +HHMM, -HHMM y offsets cortos +HH/-HH.
  const withoutTz = input.replace(/([+-]\d{2}(?::?\d{2})?|Z)$/, '');
  const normalized = withoutTz.replace(' ', 'T');
  const localParsed = new Date(normalized);

  if (!Number.isNaN(localParsed.getTime())) {
    return localParsed;
  }

  // Fallback al parser nativo para formatos no contemplados.
  return new Date(input);
}

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function buildDefaultNewActivityState(viewMode: 'month' | 'day' | 'week', selectedDate: string) {
  const nowPlusTenMinutes = new Date(Date.now() + 10 * 60 * 1000);
  const baseTime = ceilToNextMinute(nowPlusTenMinutes);
  const baseDate = viewMode === 'day'
    ? selectedDate
    : `${baseTime.getFullYear()}-${String(baseTime.getMonth() + 1).padStart(2, '0')}-${String(baseTime.getDate()).padStart(2, '0')}`;

  const [year, month, day] = baseDate.split('-').map(Number);
  const startTime = new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    baseTime.getHours(),
    baseTime.getMinutes(),
    0,
    0
  );
  const endTime = new Date(startTime.getTime() + 3600000);

  return {
    date: baseDate,
    endDate: baseDate,
    startTime,
    endTime,
    title: '',
    description: '',
  };
}

// FIX: mapActivities y mapLicencias movidas FUERA del componente.
// Al estar dentro se redefinían en cada render, impidiendo que useMemo
// pudiera cachear correctamente allActivities.
function mapActivities(apiActivities: Actividad[]): Activity[] {
  const expanded: Activity[] = [];

  (apiActivities || []).forEach((act) => {
    const start = act.fecha_inicio;
    const parsedEnd = act.fecha_fin ?? null;
    const hasValidEnd = !!parsedEnd && parsedEnd > start;
    const end = hasValidEnd ? parsedEnd : new Date(start);

    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      return;
    }

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= endDay.getTime()) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      const segmentStart = start > dayStart ? new Date(start) : dayStart;
      const segmentEnd = end < dayEnd ? new Date(end) : dayEnd;
      const date = formatDateKey(cursor);

      expanded.push({
        id: `actividad-${act.id ?? act.solicitud_id ?? start.getTime()}-${date}`,
        actividad_id: act.id,
        time: formatTimeHHMM(segmentStart),
        title: act.titulo,
        description: act.descripcion,
        completed: false,
        date,
        rol: act.rol,
        participantes: act.participantes,
        solicitud_id: act.solicitud_id,
        fecha_inicio: formatLocalDateTime(segmentStart),
        fecha_fin: act.fecha_fin ? formatLocalDateTime(segmentEnd) : undefined,
        tipo: 'actividad',
        tipo_actividad: act.tipo_actividad,
      });

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return expanded;
}

function mapLicencias(licencias: Licencia[]): Activity[] {
  const expanded: Activity[] = [];

  (licencias || []).forEach((lic) => {
    const start = lic.fecha_inicio;
    const end = lic.fecha_fin;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= endDay.getTime()) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const segmentStart = start > dayStart ? new Date(start) : dayStart;
      const segmentEnd = end < dayEnd ? new Date(end) : dayEnd;
      const date = formatDateKey(cursor);

      expanded.push({
        id: `licencia-${lic.id}-${date}`,
        time: formatTimeHHMM(segmentStart),
        title: lic.tipo_licencia_nombre || 'Licencia',
        description: lic.tipo_licencia_nombre || '',
        completed: false,
        date,
        tipo: 'licencia',
        tipo_licencia_id: lic.tipo_licencia_id,
        tipo_licencia_nombre: lic.tipo_licencia_nombre,
        usuario_id: lic.usuario_id,
        fecha_inicio: formatLocalDateTime(segmentStart),
        fecha_fin: formatLocalDateTime(segmentEnd),
      });

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return expanded;
}

const AgendaPersonal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();

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

  const crearActividadMutation = useCrearActividad();
  const cancelarActividadMutation = useCancelarActividad();
  const validacion = useValidacionFechas();

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

  const isLoading = actividadesPeriodoQuery.isLoading;
  const isMutating = crearActividadMutation.isPending || cancelarActividadMutation.isPending;

  const allActivities = useMemo(() => {
    if (!actividadesPeriodoQuery.data) return [];
    return [
      ...mapActivities(actividadesPeriodoQuery.data.actividades || []),
      ...mapLicencias(actividadesPeriodoQuery.data.licencias || []),
    ];
  }, [actividadesPeriodoQuery.data]);

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

    router.push({
      pathname: '/(extras)/actividad-detalle' as any,
      params: {
        id: String(actividadId),
        actividadId: String(actividadId),
        rol: activity.rol ?? '',
      },
    });
  }, [router]);

  const ejecutarCrearActividad = useCallback(async (payload: {
    titulo: string;
    descripcion: string;
    fecha_inicio: Date;
    fecha_fin?: Date;
  }) => {
    try {
      await crearActividadMutation.mutateAsync(payload);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity onPress={() => handleChangeMonth(-1)} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={UI.icon.md} color={colors.lightTint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerTitleBtn} onPress={handleOpenMonthDatePicker}>
            <Text style={styles.headerTitle}>{getMonthNameEs(activeMonth)} {activeMonth.getFullYear()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleChangeMonth(1)} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={UI.icon.md} color={colors.lightTint} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['month', 'week', 'day'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                styles.tab,
                viewMode === mode && [styles.tabActive, { borderBottomColor: colors.lightTint }],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  viewMode === mode && { color: colors.lightTint, fontWeight: 'bold' },
                ]}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
          <View style={styles.monthViewWrapper}>
            {/* FIX: weekHeaderRow movido DENTRO de monthViewWrapper sin paddingHorizontal
                propio. El padding lo maneja monthPage para que la grilla y los
                labels estén alineados al mismo nivel. */}
            <View style={styles.weekHeaderRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.weekHeaderText}>{label}</Text>
              ))}
            </View>
            <View style={styles.monthPage}>
              <View style={styles.monthPageCard}>
                <View style={styles.monthGrid}>
                  {monthGridDates.map((cell) => {
                    const key = formatDateKey(cell.date);
                    const isCurrentMonth = cell.esMesActual;
                    const isSelected = key === selectedDate;
                    const dayActivities = activitiesByDate.get(key) ?? [];
                    const firstActivityTitle = dayActivities[0]?.title ?? '';
                    const count = dayActivities.length;

                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.dayCell,
                          { height: dayCellHeight },
                          isSelected && styles.dayCellSelected,
                        ]}
                        onPress={() => {
                          setSelectedDate(key);
                          setActiveMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                          setViewMode('day');
                        }}
                      >
                        <Text style={[
                          styles.dayCellNumber,
                          !isCurrentMonth && styles.dayCellTextMuted,
                          isSelected && styles.dayCellTextSelected,
                        ]}>
                          {cell.day}
                        </Text>
                        {count > 0 && (
                          <>
                            <Text
                              style={[
                                styles.dayCellPreview,
                                !isCurrentMonth && styles.dayCellTextMuted,
                              ]}
                              numberOfLines={1}
                            >
                              {firstActivityTitle}
                            </Text>
                            <View style={styles.dayCellBadge}>
                              <Text style={styles.dayCellBadgeText}>{count}</Text>
                            </View>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
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
            onDeleteActivity={handleDeleteActivity}
            onPressActivity={handlePressActivity}
          />
        )}
      </ScrollView>

      {isAddFormMinimized && (
        <View style={[styles.minimizedDraftContainer, { bottom: insets.bottom + UI.spacing.xxl + 68 }]}>
          <TouchableOpacity style={styles.minimizedDraftMain} onPress={openAddActivityModal}>
            <Ionicons name="chevron-up" size={18} color={colors.lightTint} />
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
      <Modal visible={showAddForm} transparent={false} animationType="slide" onRequestClose={minimizeAddActivityModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}
          style={styles.modalKavWrapper}
        >
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nueva Actividad</Text>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity onPress={minimizeAddActivityModal} style={styles.closeButton}>
                    <Ionicons name="chevron-down" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeAddActivityModal} style={styles.closeButton}>
                    <Ionicons name="close" size={22} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>
              </View>

              {activityDateErrorMessage && (
                <Text style={styles.errorTextInline}>{activityDateErrorMessage}</Text>
              )}

              {/* Fecha */}
              <View style={styles.dateSection}>
                <TouchableOpacity onPress={handleStartDate} style={styles.dateRow}>
                  <Ionicons name="calendar" size={20} color={colors.lightTint} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.dateLabel}>Fecha inicio</Text>
                    <Text style={styles.dateValue}>
                      {new Date(newActivity.date + 'T00:00:00').toLocaleDateString(
                        'es-ES',
                        { weekday: 'short', day: '2-digit', month: 'short' }
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleStartTime} style={styles.dateRow}>
                  <Ionicons name="time" size={20} color={colors.lightTint} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.dateLabel}>Hora inicio</Text>
                    <Text style={styles.dateValue}>
                      {newActivity.startTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.endDateCollapsible}
                  onPress={() => {
                    setShowEndDateFields((prev) => {
                      if (prev) return false;
                      setNewActivity((current) => ({
                        ...current,
                        endDate: current.date,
                        endTime: new Date(startDateTime.getTime() + 60 * 60 * 1000),
                      }));
                      return true;
                    });
                  }}
                >
                  <Text style={styles.endDateCollapsibleText}>Agregar fecha de fin</Text>
                  <Ionicons name={showEndDateFields ? 'chevron-up' : 'chevron-down'} size={16} color={colors.secondaryText} />
                </TouchableOpacity>

                {showEndDateFields && (
                  <>
                    <TouchableOpacity onPress={handleEndDate} style={styles.dateRow}>
                      <Ionicons name="calendar" size={20} color={colors.lightTint} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dateLabel}>Fecha fin</Text>
                        <Text style={styles.dateValue}>
                          {new Date(newActivity.endDate + 'T00:00:00').toLocaleDateString(
                            'es-ES',
                            { weekday: 'short', day: '2-digit', month: 'short' }
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleEndTime} style={styles.dateRow}>
                      <Ionicons name="time" size={20} color={colors.lightTint} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dateLabel}>Hora fin</Text>
                        <Text style={styles.dateValue}>
                          {newActivity.endTime.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {showDatePicker && Platform.OS === 'ios' && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={
                      activeDateType === 'monthJump'
                        ? new Date(selectedDate + 'T00:00:00')
                        : activeDateType === 'startDate'
                        ? newActivity.startTime
                        : activeDateType === 'startTime'
                        ? newActivity.startTime
                        : activeDateType === 'endDate'
                        ? new Date(newActivity.endDate + 'T00:00:00')
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
                  onChangeText={(text) => setNewActivity((prev) => ({ ...prev, title: text }))}
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
                  onChangeText={(text) => setNewActivity((prev) => ({ ...prev, description: text }))}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <AppFab
              icon="checkmark"
              floating={false}
              onPress={handleAddActivity}
              disabled={!newActivity.title.trim() || !!activityDateErrorMessage || isMutating}
              isLoading={isMutating}
              style={styles.modalSubmitFab}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker (Android) */}
      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            activeDateType === 'monthJump'
              ? new Date(selectedDate + 'T00:00:00')
              : activeDateType === 'startDate'
              ? newActivity.startTime
              : activeDateType === 'startTime'
              ? newActivity.startTime
              : activeDateType === 'endDate'
              ? new Date(newActivity.endDate + 'T00:00:00')
              : newActivity.endTime
          }
          mode={datePickerMode}
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      <ValidacionFechasModal
        state={validacion.state}
        avisos={validacion.avisos}
        rangosOcupados={validacion.rangosOcupados}
        errorMessage={validacion.errorMessage}
        onConfirm={validacion.confirm}
        onCancel={validacion.cancel}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavBtn: {
    padding: UI.spacing.xs,
  },
  headerTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.lightTint,
    textTransform: 'capitalize',
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
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  monthViewWrapper: {
    flex: 1,
    paddingTop: UI.spacing.xs,
  },
  // FIX: weekHeaderRow ahora tiene paddingHorizontal igual al de monthPage
  // (UI.spacing.md) para que los labels de días queden alineados con la grilla.
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: UI.spacing.md,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  monthPage: {
    paddingHorizontal: UI.spacing.md,
  },
  monthPageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d6d9dd',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  dayCell: {
    width: '14.285714%',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  dayCellSelected: {
    backgroundColor: colors.lightTint + '1A',
  },
  dayCellNumber: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dayCellTextMuted: {
    color: colors.secondaryText,
    opacity: 0.6,
  },
  dayCellTextSelected: {
    color: colors.lightTint,
    fontWeight: '700',
  },
  dayCellPreview: {
    marginTop: 6,
    fontSize: 10,
    color: colors.text,
    fontWeight: '500',
    width: '100%',
  },
  dayCellBadge: {
    marginTop: 'auto',
    marginBottom: 2,
    alignSelf: 'flex-end',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.lightTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  errorTextInline: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
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
  modalKavWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ffffff',
  },
  modalKavContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContainer: {
    backgroundColor: 'white',
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  endDateCollapsible: {
    marginTop: UI.spacing.sm,
    paddingVertical: UI.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutralBorder,
  },
  endDateCollapsibleText: {
    color: colors.secondaryText,
    fontSize: UI.fontSize.sm,
    fontWeight: '600',
  },
  modalSubmitFab: {
    alignSelf: 'flex-end',
    marginRight: UI.spacing.lg,
    marginBottom: UI.spacing.lg,
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