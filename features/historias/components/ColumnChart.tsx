import { glassColors } from '@/shared/ui/glass';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface Column {
  key: string;
  label: string;
  value: number;
}

const PLOT_HEIGHT = 120;

/** Columnas de una sola serie: valor sobre cada columna, etiqueta del período debajo. */
export function ColumnChart({ columns, emptyText }: { columns: Column[]; emptyText: string }) {
  if (columns.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;
  const max = Math.max(...columns.map((c) => c.value), 1);

  return (
    <View style={styles.wrap}>
      {columns.map((c) => (
        <View key={c.key} style={styles.col} accessible accessibilityLabel={`${c.label}: ${c.value}`}>
          <Text style={styles.value}>{c.value}</Text>
          <View style={styles.plot}>
            <View style={[styles.bar, { height: Math.max((c.value / max) * PLOT_HEIGHT, 2) }]} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {c.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: glassColors.textMuted, fontSize: 14, paddingVertical: 8 },
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center', gap: 3 },
  plot: { height: PLOT_HEIGHT, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  // Columna fina, con la tapa redondeada y la base recta sobre la línea base.
  bar: {
    width: '70%',
    maxWidth: 24,
    backgroundColor: glassColors.link,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  value: { fontSize: 11, fontWeight: '700', color: glassColors.text },
  label: { fontSize: 10, color: glassColors.textMuted },
});
