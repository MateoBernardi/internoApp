import { glassColors } from '@/shared/ui/glass';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Dato secundario, siempre visible junto al valor (p. ej. "de 4 autores"). */
  detail?: string;
}

interface Props {
  rows: BarRow[];
  emptyText: string;
  selectedKey?: string | null;
  onPressRow?: (row: BarRow) => void;
}

/**
 * Barras horizontales de una sola serie (magnitud, un único tono). El valor va escrito
 * en la punta de cada barra y las etiquetas en tinta de texto, así que no depende del
 * color para leerse: la propia lista hace de vista tabla.
 */
export function BarList({ rows, emptyText, selectedKey, onPressRow }: Props) {
  if (rows.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <View style={styles.list}>
      {rows.map((r) => {
        const selected = selectedKey === r.key;
        const content = (
          <View style={[styles.row, selected && styles.rowSelected]}>
            <View style={styles.labels}>
              <Text style={styles.label} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={styles.value}>
                {r.value}
                {r.detail ? <Text style={styles.detail}>  {r.detail}</Text> : null}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max((r.value / max) * 100, 2)}%` }]} />
            </View>
          </View>
        );
        return onPressRow ? (
          <Pressable key={r.key} onPress={() => onPressRow(r)} accessibilityRole="button" accessibilityLabel={`${r.label}: ${r.value}`}>
            {content}
          </Pressable>
        ) : (
          <View key={r.key}>{content}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  empty: { color: glassColors.textMuted, fontSize: 14, paddingVertical: 8 },
  row: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 10, gap: 4 },
  rowSelected: { backgroundColor: 'rgba(26,115,232,0.08)' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  label: { flex: 1, fontSize: 14, color: glassColors.text },
  value: { fontSize: 14, fontWeight: '700', color: glassColors.text },
  detail: { fontSize: 12, fontWeight: '400', color: glassColors.textMuted },
  // Pista neutra, barra fina (16px) con el extremo de datos redondeado y la base recta.
  track: { height: 16, backgroundColor: 'rgba(17,24,28,0.05)', borderRadius: 4, overflow: 'hidden' },
  fill: {
    height: 16,
    backgroundColor: glassColors.link,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
