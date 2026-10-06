import { glassColors, glassStyles } from '@/shared/ui/glass';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HistoriaResumenDTO } from '../dto/HistoriaDTO';
import { formatFechaHora, nombreCompleto } from '../utils/format';
import { previewPlano } from '../utils/mentionParser';

interface Props {
  historia: HistoriaResumenDTO;
  onPress: (id: string) => void;
}

export const HistoriaCard = memo(({ historia, onPress }: Props) => {
  const creador = nombreCompleto({ nombre: historia.creador_nombre, apellido: historia.creador_apellido });
  return (
    <Pressable
      onPress={() => onPress(historia.historia_id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir historia de ${creador || 'un usuario'}`}
    >
      <View style={styles.row}>
        <Text style={styles.creator} numberOfLines={1}>
          {creador || 'Usuario'}
        </Text>
        <View style={[styles.pill, historia.cerrada ? styles.pillClosed : styles.pillOpen]}>
          <Text style={[styles.pillText, historia.cerrada ? styles.pillTextClosed : styles.pillTextOpen]}>
            {historia.cerrada ? 'Cerrada' : 'Abierta'}
          </Text>
        </View>
      </View>
      <Text style={styles.preview} numberOfLines={3}>
        {previewPlano(historia.preview)}
      </Text>
      <Text style={styles.meta}>
        {historia.entradas} {historia.entradas === 1 ? 'entrada' : 'entradas'} · última actividad{' '}
        {formatFechaHora(historia.ultima_actividad)}
      </Text>
    </Pressable>
  );
});
HistoriaCard.displayName = 'HistoriaCard';

const styles = StyleSheet.create({
  // Sin elevation: la card es translúcida (ver interno-ui-system §4).
  card: { ...glassStyles.card, padding: 14, marginBottom: 10 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  creator: { flex: 1, fontSize: 16, fontWeight: '700', color: glassColors.text },
  preview: { fontSize: 14, lineHeight: 20, color: glassColors.text, marginTop: 6 },
  meta: { fontSize: 12, color: glassColors.textMuted, marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillOpen: { backgroundColor: 'rgba(46,125,50,0.12)', borderColor: 'rgba(46,125,50,0.35)' },
  pillClosed: { backgroundColor: 'rgba(17,24,28,0.05)', borderColor: 'rgba(17,24,28,0.15)' },
  pillText: { fontSize: 12, fontWeight: '600' },
  pillTextOpen: { color: glassColors.success },
  pillTextClosed: { color: glassColors.textMuted },
});
