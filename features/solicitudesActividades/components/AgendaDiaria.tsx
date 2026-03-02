import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Activity } from './activityTypes';

interface AgendaDiariaProps {
  activities: Activity[];
  onDeleteActivity: (id: string) => void;
  onPressActivity?: (activity: Activity) => void;
}

export const AgendaDiaria: React.FC<AgendaDiariaProps> = ({ activities, onDeleteActivity, onPressActivity }) => {
  const sorted = [...activities].sort((a, b) =>
    (a.time || '23:59').localeCompare(b.time || '23:59')
  );

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      renderItem={({ item: activity }) => {
        // REUNION vacía: sin participantes invitados (<=1 porque incluye al creador)
        const esReunionVacia =
          activity.tipo_actividad === 'REUNION' &&
          (activity.participantes?.length ?? 0) <= 1;

        const borderColor = esReunionVacia ? '#EF4444' : '#1a73e8';

        return (
          <TouchableOpacity
            activeOpacity={activity.tipo === 'licencia' ? 1 : 0.7}
            onPress={() => {
              if (activity.tipo !== 'licencia' && onPressActivity) {
                onPressActivity(activity);
              }
            }}
          >
            <View style={[styles.activityCard, { borderLeftColor: borderColor }]}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{activity.time || '—'}</Text>
                {activity.fecha_fin && (
                  <Text style={styles.endTimeText}>
                    {(() => {
                      const timeMatch = activity.fecha_fin.match(/[T ](\d{2}:\d{2})/);
                      return timeMatch ? timeMatch[1] : '—';
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
  activityCard: {
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
