import { glassColors, glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlanificacionResumen as Resumen } from '../models/Planificacion';
import { ACEPTADO_COLOR, AMBER, MUTED, RED_FLASH } from '../theme';

interface Props {
  resumen: Resumen;
}

// Colores semánticos (no son "chrome"): verde = nuevo, ámbar = cambia, rojo = se elimina.
const TILES: { key: keyof Pick<Resumen, 'altas' | 'modificaciones' | 'bajas' | 'sinCambios'>; label: string; color: string }[] = [
  { key: 'altas', label: 'Nuevos', color: ACEPTADO_COLOR },
  { key: 'modificaciones', label: 'Modificados', color: AMBER },
  { key: 'bajas', label: 'Eliminados', color: RED_FLASH },
  { key: 'sinCambios', label: 'Sin cambios', color: MUTED },
];

/** Cuatro contadores del diff: nuevos, modificados, eliminados y sin cambios. */
export const PlanificacionResumen = React.memo(function PlanificacionResumen({ resumen }: Props) {
  return (
    <View style={styles.row}>
      {TILES.map((t) => (
        <View key={t.key} style={[glassStyles.card, styles.tile]}>
          <Text style={[styles.value, { color: t.color }]}>{resumen[t.key]}</Text>
          <Text style={styles.label} numberOfLines={1}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  value: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { fontSize: 11, fontWeight: '600', color: glassColors.textMuted, marginTop: 2 },
});
