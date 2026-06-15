import { Colors, UI } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDateKey, WEEKDAY_LABELS, type MonthGridCell } from '../agenda/dateUtils';
import type { Activity } from '../models/activityTypes';

const colors = Colors['light'];

interface AgendaMonthGridProps {
  monthGridDates: MonthGridCell[];
  selectedDate: string;
  dayCellHeight: number;
  activitiesByDate: Map<string, Activity[]>;
  onSelectDay: (cell: MonthGridCell) => void;
}

/**
 * Vista mensual de la Agenda: cabecera de días de la semana + grilla 6x7 con
 * preview de la primera actividad y badge de cantidad por día.
 */
export const AgendaMonthGrid = React.memo(function AgendaMonthGrid({
  monthGridDates, selectedDate, dayCellHeight, activitiesByDate, onSelectDay,
}: AgendaMonthGridProps) {
  return (
    <View style={styles.monthViewWrapper}>
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
                  onPress={() => onSelectDay(cell)}
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
  );
});

const styles = StyleSheet.create({
  monthViewWrapper: {
    flex: 1,
    paddingTop: UI.spacing.xs,
  },
  // weekHeaderRow tiene paddingHorizontal igual al de monthPage (UI.spacing.md)
  // para que los labels de días queden alineados con la grilla.
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
});
