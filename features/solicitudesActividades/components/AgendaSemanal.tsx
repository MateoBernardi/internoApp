import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AGENDA_COLORS } from '../agenda/agendaColors';
import type { Activity } from '../models/activityTypes';

interface AgendaSemanalProps {
  activities: Activity[];
  today: Date;
  onDeleteActivity: (id: string) => void;
  onPressActivity?: (activity: Activity) => void;
  onPressDay?: (dateKey: string) => void;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const AgendaSemanal: React.FC<AgendaSemanalProps> = ({
  activities,
  today,
  onDeleteActivity,
  onPressActivity,
  onPressDay,
}) => {
  const dayLabels = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ];
  const daysOfWeek = [];

  // FIX: Usamos una copia de today para no mutar la prop
  const todayDateStr = formatDateKey(today);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(today);
    const dayOfWeek = dayDate.getDay();
    const daysOffset = i - dayOfWeek;
    dayDate.setDate(dayDate.getDate() + daysOffset);
    const dateStr = formatDateKey(dayDate);

    const dayActivities = activities
      .filter((a) => a.date === dateStr)
      .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

    daysOfWeek.push({
      dateStr,
      dayLabel: dayLabels[i],
      dayNum: dayDate.getDate(),
      activities: dayActivities,
      isToday: dateStr === todayDateStr,
    });
  }

  return (
    <FlatList
      data={daysOfWeek}
      keyExtractor={(item) => item.dateStr}
      renderItem={({ item: day }) => {
        const turno = day.activities.find((a) => a.tipo === 'turno');
        const licencia = day.activities.find((a) => a.tipo === 'licencia');
        const regularActivities = day.activities.filter(
          (a) => a.tipo !== 'turno' && a.tipo !== 'licencia',
        );

        return (
          <View style={[glassStyles.card, styles.dayCard, day.isToday && styles.dayCardToday, turno && styles.dayCardTurno]}>
            <TouchableOpacity style={styles.dayHeader} onPress={() => onPressDay?.(day.dateStr)}>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.dayLabel}
              </Text>
              <Text style={[styles.dayDate, day.isToday && styles.dayDateToday]}>
                {new Date(day.dateStr + 'T00:00:00')
                  .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  .toUpperCase()}
              </Text>
            </TouchableOpacity>

            <View style={styles.activitiesContainer}>
              {/* Turno chip */}
              {turno ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onPressActivity?.(turno)}
                  style={styles.turnoChip}
                >
                  <Ionicons name="time-outline" size={13} color={AGENDA_COLORS.turno} />
                  <Text style={styles.turnoChipText}>
                    <Text style={styles.turnoChipHora}>{turno.time}–{
                      turno.fecha_fin
                        ? (() => { const d = new Date(turno.fecha_fin); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()
                        : '—'
                    }</Text>
                    {` · Turno ${turno.turno_code ?? ''}`}
                    {turno.sede_ingreso ? ` · ${turno.sede_ingreso}` : ''}
                  </Text>
                </TouchableOpacity>
              ) : licencia ? (
                <View style={styles.licenciaChip}>
                  <Ionicons name="document-text-outline" size={13} color={AGENDA_COLORS.licencia} />
                  <Text style={styles.licenciaChipText}>Licencia · {licencia.title}</Text>
                </View>
              ) : (
                <Text style={styles.sinTurnoText}>Día libre · sin turno</Text>
              )}

              {/* Regular activities */}
              {regularActivities.map((activity) => {
                const esReunionVacia =
                  activity.tipo_actividad === 'REUNION' &&
                  (activity.participantes?.length ?? 0) <= 1;

                return (
                  <TouchableOpacity
                    key={activity.id}
                    activeOpacity={0.7}
                    onPress={() => onPressActivity?.(activity)}
                  >
                    <View style={[
                      styles.activityCard,
                      esReunionVacia && { borderColor: glassColors.error, borderWidth: 1 },
                    ]}>
                      <View style={styles.activityDot} />
                      <View style={styles.contentColumn}>
                        <Text
                          style={[styles.titleText, esReunionVacia && { color: glassColors.error }]}
                          numberOfLines={2}
                        >
                          {activity.time ? `${activity.time} · ` : ''}{activity.title}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteActivity(activity.id);
                        }}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="close-circle" size={20} color={glassColors.error} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {!turno && !licencia && regularActivities.length === 0 && (
                <Text style={styles.emptyText}>Sin actividades</Text>
              )}
            </View>
          </View>
        );
      }}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  dayCard: {
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(17,24,28,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  dayCardToday: {
    backgroundColor: 'rgba(26,115,232,0.06)',
    borderLeftColor: glassColors.link,
  },
  dayCardTurno: {
    borderLeftColor: AGENDA_COLORS.turno,
  },
  turnoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(47,134,214,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(47,134,214,0.35)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  turnoChipText: {
    fontSize: 12,
    color: AGENDA_COLORS.turno,
    fontWeight: '500',
  },
  turnoChipHora: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  licenciaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(123,92,224,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,224,0.35)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  licenciaChipText: {
    fontSize: 12,
    color: AGENDA_COLORS.licencia,
    fontWeight: '500',
  },
  sinTurnoText: {
    fontSize: 12,
    color: glassColors.placeholder,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  activityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: AGENDA_COLORS.actividad,
    marginRight: 8,
    flexShrink: 0,
    marginTop: 3,
  },
  dayHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: glassColors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelToday: {
    color: glassColors.link,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '600',
    color: glassColors.textMuted,
    marginTop: 4,
  },
  dayDateToday: {
    color: glassColors.link,
  },
  activitiesContainer: {
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: glassColors.placeholder,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17,24,28,0.08)',
    padding: 10,
  },
  contentColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    color: glassColors.text,
  },
  deleteButton: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
});