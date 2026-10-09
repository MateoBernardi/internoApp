import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InformeResumen } from '../dto/InformeDTO';
import { nombreCompleto, tiempoRelativo } from '../utils/format';

interface Props {
  informe: InformeResumen;
  onPress: (id: string) => void;
}

export const InformeCard = memo(({ informe, onPress }: Props) => {
  const creador = nombreCompleto({ nombre: informe.creador_nombre, apellido: informe.creador_apellido }) || 'Usuario';
  const n = informe.entradas;
  return (
    <Pressable
      onPress={() => onPress(informe.informe_id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir informe ${informe.titulo}`}
    >
      <View style={styles.status}>
        {informe.cerrada ? (
          <View style={styles.closedDot}>
            <Ionicons name="checkmark" size={11} color="#7a8087" />
          </View>
        ) : (
          <View style={styles.openDot} />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, informe.cerrada && styles.titleClosed]} numberOfLines={1}>
            {informe.titulo || 'Sin título'}
          </Text>
          {informe.cerrada && (
            <View style={styles.closedTag}>
              <Text style={styles.closedTagText}>cerrado</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {creador} · {tiempoRelativo(informe.ultima_actividad)} · {n} {n === 1 ? 'entrada' : 'entradas'}
          </Text>
          {informe.adjuntos > 0 && (
            <View style={styles.clip}>
              <Ionicons name="attach" size={14} color="#5a6068" />
              <Text style={styles.clipText}>{informe.adjuntos}</Text>
            </View>
          )}
        </View>
        {!!informe.preview && (
          <Text style={styles.preview} numberOfLines={2}>
            {informe.preview}
          </Text>
        )}
        {informe.mencionado && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Te mencionaron</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});
InformeCard.displayName = 'InformeCard';

const styles = StyleSheet.create({
  card: { ...glassStyles.card, flexDirection: 'row', gap: 10, padding: 14, marginBottom: 10 },
  pressed: { opacity: 0.85 },
  status: { width: 18, paddingTop: 5, alignItems: 'center' },
  openDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: glassColors.link },
  closedDot: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#e4e7eb', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontSize: 15.5, fontWeight: '700', color: glassColors.text },
  titleClosed: { color: '#4a5058' },
  closedTag: { backgroundColor: '#eef0f2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  closedTagText: { fontSize: 11.5, fontWeight: '600', color: glassColors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flexShrink: 1, fontSize: 12.5, color: glassColors.textMuted },
  clip: { flexDirection: 'row', alignItems: 'center' },
  clipText: { fontSize: 12.5, fontWeight: '600', color: '#5a6068' },
  preview: { fontSize: 13.5, lineHeight: 19, color: '#565c63' },
  badge: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: 'rgba(26,115,232,0.12)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: '#1558b0' },
});
