import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shiftWeek, weekLabel, type WeekRange } from '../utils/dateRange';
import { CARD, LINE, NAVY } from '../theme';

interface WeekNavigatorProps {
  week: WeekRange;
  onChange: (week: WeekRange) => void;
}

export function WeekNavigator({ week, onChange }: WeekNavigatorProps) {
  return (
    <View style={styles.weekNav}>
      <TouchableOpacity style={styles.navBtn} onPress={() => onChange(shiftWeek(week, -1))}>
        <Ionicons name="chevron-back" size={22} color={NAVY} />
      </TouchableOpacity>
      <View style={styles.weekLabelBox}>
        <Text style={styles.weekLabel}>Semana {weekLabel(week)}</Text>
      </View>
      <TouchableOpacity style={styles.navBtn} onPress={() => onChange(shiftWeek(week, 1))}>
        <Ionicons name="chevron-forward" size={22} color={NAVY} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  weekLabelBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
});
