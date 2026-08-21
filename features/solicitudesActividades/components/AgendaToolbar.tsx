import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { Colors, UI } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDayLabelEs, formatWeekRangeLabelEs, getMonthNameEs } from '../agenda/dateUtils';

const colors = Colors['light'];

type ViewMode = 'month' | 'week' | 'day';

interface AgendaToolbarProps {
  activeMonth: Date;
  selectedDate: Date;
  viewMode: ViewMode;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onOpenMonthPicker: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  subtitle?: string;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = { month: 'Mes', week: 'Semana', day: 'Día' };
const VIEW_MODE_TABS = (['month', 'week', 'day'] as const).map((key) => ({
  key,
  label: VIEW_MODE_LABELS[key],
}));

function getPeriodLabel(viewMode: ViewMode, activeMonth: Date, selectedDate: Date): string {
  if (viewMode === 'day') return formatDayLabelEs(selectedDate);
  if (viewMode === 'week') return formatWeekRangeLabelEs(selectedDate);
  return `${getMonthNameEs(activeMonth)} ${activeMonth.getFullYear()}`;
}

/**
 * Encabezado de la Agenda: navegación de período (mes/semana/día según
 * `viewMode`) y tabs de modo de vista.
 */
export const AgendaToolbar = React.memo(function AgendaToolbar({
  activeMonth, selectedDate, viewMode, onPrevPeriod, onNextPeriod, onOpenMonthPicker, onChangeViewMode, subtitle,
}: AgendaToolbarProps) {
  return (
    <View style={styles.header}>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.monthHeaderRow}>
        <TouchableOpacity onPress={onPrevPeriod} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={UI.icon.md} color={colors.lightTint} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTitleBtn} onPress={onOpenMonthPicker}>
          <Text style={styles.headerTitle}>{getPeriodLabel(viewMode, activeMonth, selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextPeriod} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={UI.icon.md} color={colors.lightTint} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <GlassTabSelector
          tabs={VIEW_MODE_TABS}
          activeKey={viewMode}
          onChange={(key) => onChangeViewMode(key as ViewMode)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
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
    marginTop: 12,
  },
});
