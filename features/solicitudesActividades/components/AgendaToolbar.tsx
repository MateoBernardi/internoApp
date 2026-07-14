import { Colors, UI } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMonthNameEs } from '../agenda/dateUtils';

const colors = Colors['light'];

type ViewMode = 'month' | 'week' | 'day';

interface AgendaToolbarProps {
  activeMonth: Date;
  viewMode: ViewMode;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  subtitle?: string;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = { month: 'Mes', week: 'Semana', day: 'Día' };

/**
 * Encabezado de la Agenda: navegación de mes y tabs de modo de vista.
 */
export const AgendaToolbar = React.memo(function AgendaToolbar({
  activeMonth, viewMode, onPrevMonth, onNextMonth, onOpenMonthPicker, onChangeViewMode, subtitle,
}: AgendaToolbarProps) {
  return (
    <View style={styles.header}>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.monthHeaderRow}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={UI.icon.md} color={colors.lightTint} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTitleBtn} onPress={onOpenMonthPicker}>
          <Text style={styles.headerTitle}>{getMonthNameEs(activeMonth)} {activeMonth.getFullYear()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={UI.icon.md} color={colors.lightTint} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['month', 'week', 'day'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => onChangeViewMode(mode)}
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
              {VIEW_MODE_LABELS[mode]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 8,
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
});
