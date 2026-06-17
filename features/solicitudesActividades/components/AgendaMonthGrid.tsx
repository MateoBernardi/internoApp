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
 * marcas semánticas de color (turno=celeste, licencia=morado, actividad=verde).
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
              const hasTurno = dayActivities.some((a) => a.tipo === 'turno');
              const hasLicencia = dayActivities.some((a) => a.tipo === 'licencia');
              const hasActividad = dayActivities.some((a) => a.tipo === 'actividad' || !a.tipo);

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
                  {(hasTurno || hasLicencia || hasActividad) && (
                    <View style={styles.dayCellMarks}>
                      {hasTurno && <View style={styles.markTurno} />}
                      {hasLicencia && <View style={styles.markLicencia} />}
                      {hasActividad && <View style={styles.markActividad} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.markTurno, styles.legendMark]} />
          <Text style={styles.legendText}>Turno</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.markLicencia, styles.legendMark]} />
          <Text style={styles.legendText}>Licencia</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.markActividad, styles.legendMark]} />
          <Text style={styles.legendText}>Actividad</Text>
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
  dayCellMarks: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  markTurno: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2f86d6',
  },
  markLicencia: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7b5ce0',
  },
  markActividad: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1f9d57',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendMark: {
    marginTop: 0,
  },
  legendText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
