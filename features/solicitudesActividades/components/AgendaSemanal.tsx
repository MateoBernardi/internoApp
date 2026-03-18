import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Activity } from '../models/activityTypes';

interface AgendaSemanalProps {
  activities: Activity[];
  today: Date;
  onDeleteActivity: (id: string) => void;
  onPressActivity?: (activity: Activity) => void;
}

export const AgendaSemanal: React.FC<AgendaSemanalProps> = ({ activities, today, onDeleteActivity, onPressActivity }) => {
  const dayLabels = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ];
  const daysOfWeek = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(today);
    const dayOfWeek = dayDate.getDay();
    const daysOffset = i - dayOfWeek;
    dayDate.setDate(dayDate.getDate() + daysOffset);
    const dateStr = dayDate.toISOString().split('T')[0];

    const dayActivities = activities
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
        <View style={[styles.dayCard, day.isToday && styles.dayCardToday]}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
              {day.dayLabel}
            </Text>
            <Text style={[styles.dayDate, day.isToday && styles.dayDateToday]}>
              {new Date(day.dateStr + 'T00:00:00')
                .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                .toUpperCase()}
            </Text>
          </View>

          {day.activities.length === 0 ? (
            <Text style={styles.noActivitiesText}>Sin actividades</Text>
          ) : (
            <View style={styles.activitiesContainer}>
              {day.activities.map((activity) => {
                const esReunionVacia =
                  activity.tipo_actividad === 'REUNION' &&
                  (activity.participantes?.length ?? 0) <= 1;

                return (
                  <TouchableOpacity
                    key={activity.id}
                    activeOpacity={activity.tipo === 'licencia' ? 1 : 0.7}
                    onPress={() => {
                      if (activity.tipo !== 'licencia' && onPressActivity) {
                        onPressActivity(activity);
                      }
                    }}
                  >
                    <View style={[
                      styles.activityCard,
                      esReunionVacia && { borderColor: '#EF4444', borderWidth: 1 },
                    ]}>
                      <View style={styles.timeColumn}>
                        <Text style={styles.timeText}>{activity.time || '—'}</Text>
                      </View>

                      <View style={styles.contentColumn}>
                        <Text
                          style={[styles.titleText, esReunionVacia && { color: '#EF4444' }]}
                          numberOfLines={2}
                        >
                          {activity.title}
                        </Text>
                      </View>

                      {activity.tipo !== 'licencia' && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            onDeleteActivity(activity.id);
                          }}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
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
  dayCardToday: {
    backgroundColor: '#f1f3f4',
    borderLeftColor: '#1a73e8',
  },
  dayHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelToday: {
    color: '#1a73e8',
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    marginTop: 4,
  },
  dayDateToday: {
    color: '#1a73e8',
  },
  noActivitiesText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activitiesContainer: {
    gap: 6,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dadce0',
    padding: 10,
  },
  timeColumn: {
    marginRight: 8,
    minWidth: 40,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#202124',
  },
  contentColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202124',
  },
  deleteButton: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
});
