import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Activity } from '../models/activityTypes';

interface AgendaDiariaProps {
  activities: Activity[];
  onDeleteActivity: (id: string) => void;
  onPressActivity?: (activity: Activity) => void;
}

type ActivityHourSegment = {
  activity: Activity;
  isStart: boolean;
  isEnd: boolean;
};

const DashedLine: React.FC<{ color: string; height: number }> = ({ color, height }) => {
  const dash = 4;
  const gap = 4;
  const count = Math.floor(height / (dash + gap));

  return (
    <View style={{ width: 3, height, overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: dash,
            backgroundColor: color,
            borderRadius: 1,
            marginBottom: gap,
          }}
        />
      ))}
    </View>
  );
};

/**
 * Parsea una cadena de fecha/hora siempre como hora local,
 * ignorando cualquier sufijo de zona horaria (Z, +03:00, -03:00, etc.).
 * Esto evita que el backend envíe la fecha en UTC y JS la convierta
 * restando el offset del dispositivo.
 */
const parseLocalDate = (dateStr: string): Date => {
  // Quita el sufijo de zona: Z, +HH:MM, -HH:MM, +HHMM, -HHMM
  const withoutTz = dateStr.replace(/([+-]\d{2}:?\d{2}|Z)$/, '');
  // Normaliza el separador de fecha/hora a 'T' por si viene con espacio
  const normalized = withoutTz.replace(' ', 'T');
  return new Date(normalized);
};

export const AgendaDiaria: React.FC<AgendaDiariaProps> = ({ activities, onDeleteActivity, onPressActivity }) => {
  const hours = React.useMemo(
    () => Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
    []
  );

  const sorted = [...activities].sort((a, b) =>
    (a.time || '23:59').localeCompare(b.time || '23:59')
  );

  const parseActivityRange = React.useCallback((activity: Activity): { start: Date; end?: Date } => {
    const parsedStart = activity.fecha_inicio
      ? parseLocalDate(activity.fecha_inicio)
      : new Date(`${activity.date}T${activity.time || '00:00'}:00`);

    const start = Number.isNaN(parsedStart.getTime())
      ? new Date(`${activity.date}T${activity.time || '00:00'}:00`)
      : parsedStart;

    if (!activity.fecha_fin) {
      return { start };
    }

    const parsedEnd = parseLocalDate(activity.fecha_fin);
    if (Number.isNaN(parsedEnd.getTime()) || parsedEnd <= start) {
      return { start };
    }

    return { start, end: parsedEnd };
  }, []);

  const activitiesByHour = React.useMemo(() => {
    const map = new Map<string, ActivityHourSegment[]>();
    sorted.forEach((activity) => {
      const { start, end } = parseActivityRange(activity);

      // Actividad puntual: solo se muestra en la hora de inicio.
      if (!end) {
        const hourKey = `${String(start.getHours()).padStart(2, '0')}:00`;
        const current = map.get(hourKey) ?? [];
        current.push({
          activity,
          isStart: true,
          isEnd: true,
        });
        map.set(hourKey, current);
        return;
      }

      const dayStart = new Date(`${activity.date}T00:00:00`);

      for (let hour = 0; hour < 24; hour += 1) {
        const slotStart = new Date(dayStart);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        if (start < slotEnd && end > slotStart) {
          const hourKey = `${String(hour).padStart(2, '0')}:00`;
          const current = map.get(hourKey) ?? [];
          current.push({
            activity,
            isStart: start >= slotStart && start < slotEnd,
            isEnd: end > slotStart && end <= slotEnd,
          });
          map.set(hourKey, current);
        }
      }
    });

    map.forEach((items, key) => {
      items.sort((a, b) => (a.activity.time || '23:59').localeCompare(b.activity.time || '23:59'));
      map.set(key, items);
    });

    return map;
  }, [sorted, parseActivityRange]);

  return (
    <FlatList
      data={hours}
      keyExtractor={(item) => item}
      renderItem={({ item: hour }) => {
        const hourActivities = activitiesByHour.get(hour) ?? [];

        return (
          <View style={styles.hourRow}>
            <View style={styles.hourLabelColumn}>
              <Text style={styles.hourLabelText}>{hour}</Text>
            </View>

            <View style={styles.hourContentColumn}>
              {hourActivities.length === 0 ? (
                <View style={styles.emptyHourSlot} />
              ) : (
                hourActivities.map((segment) => {
                  const { activity, isStart, isEnd } = segment;
                  const esReunionVacia =
                    activity.tipo_actividad === 'REUNION' &&
                    (activity.participantes?.length ?? 0) <= 1;
                  const borderColor = esReunionVacia ? '#EF4444' : '#1a73e8';

                  if (!isStart) {
                    if (isEnd) {
                      return (
                        <View key={`${activity.id}-${hour}`} style={styles.continuationLineEndRow}>
                          <View style={styles.lineEndContainer}>
                            <DashedLine color={borderColor} height={20} />
                            <View style={[styles.lineEndCap, { backgroundColor: borderColor }]} />
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={`${activity.id}-${hour}`} style={styles.continuationLineRow}>
                        <DashedLine color={borderColor} height={36} />
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={`${activity.id}-${hour}`}
                      activeOpacity={activity.tipo === 'licencia' ? 1 : 0.7}
                      onPress={() => {
                        if (activity.tipo !== 'licencia' && onPressActivity) {
                          onPressActivity(activity);
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.activityCard,
                          { borderLeftColor: borderColor },
                          !isEnd && styles.activityCardConnectBottom,
                        ]}
                      >
                        <View style={styles.timeColumn}>
                          <Text style={styles.timeText}>{activity.time || '—'}</Text>
                          {activity.fecha_fin && (
                            <Text style={styles.endTimeText}>
                              {(() => {
                                const d = parseLocalDate(activity.fecha_fin);
                                if (Number.isNaN(d.getTime())) return '—';
                                const hh = String(d.getHours()).padStart(2, '0');
                                const mm = String(d.getMinutes()).padStart(2, '0');
                                return `${hh}:${mm}`;
                              })()}
                            </Text>
                          )}
                        </View>

                        <View style={styles.contentColumn}>
                          <Text style={[styles.titleText, esReunionVacia && { color: '#EF4444' }]} numberOfLines={2}>
                            {activity.title}
                          </Text>
                          {activity.tipo === 'licencia' && (
                            <Text style={styles.licenseLabel}>Licencia</Text>
                          )}
                          {esReunionVacia && (
                            <Text style={styles.warningLabel}>Sin participantes</Text>
                          )}
                          {activity.description && (
                            <Text style={styles.descriptionText} numberOfLines={2}>
                              {activity.description}
                            </Text>
                          )}
                        </View>

                        {activity.tipo !== 'licencia' && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(activity.id);
                            }}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
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
    paddingBottom: 16,
  },
  hourRow: {
    flexDirection: 'row',
    marginHorizontal: 8,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  hourLabelColumn: {
    width: 54,
    paddingTop: 6,
  },
  hourLabelText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  hourContentColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  emptyHourSlot: {
    minHeight: 28,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  activityCardConnectBottom: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  continuationLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingLeft: 16,
  },
  continuationLineEndRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
    paddingLeft: 16,
    paddingTop: 2,
  },
  lineEndContainer: {
    alignItems: 'center',
  },
  lineEndCap: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  timeColumn: {
    marginRight: 12,
    minWidth: 50,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  endTimeText: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  contentColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  licenseLabel: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '600',
    marginTop: 4,
  },
  warningLabel: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 4,
  },
  deleteButton: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
});