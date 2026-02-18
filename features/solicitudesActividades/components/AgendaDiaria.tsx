import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Activity } from './activityTypes';

interface AgendaDiariaProps {
  activities: Activity[];
  onDeleteActivity: (id: string) => void;
}

export const AgendaDiaria: React.FC<AgendaDiariaProps> = ({ activities, onDeleteActivity }) => {
  const sorted = [...activities].sort((a, b) =>
    (a.time || '23:59').localeCompare(b.time || '23:59')
  );

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      renderItem={({ item: activity }) => (
        <View style={styles.activityCard}>
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
            <Text style={styles.titleText} numberOfLines={2}>
              {activity.title}
            </Text>
            {activity.tipo === 'licencia' && (
              <Text style={styles.licenseLabel}>Licencia</Text>
            )}
            {activity.description && (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {activity.description}
              </Text>
            )}
          </View>

          {activity.tipo !== 'licencia' && (
            <TouchableOpacity
              onPress={() => onDeleteActivity(activity.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
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
