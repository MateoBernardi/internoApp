import type { Novedad } from '@/features/novedades/models/Novedades';
import {
  getNovedadCategoryColor,
  getNovedadPriority,
} from '@/features/novedades/novedadPresentation';
import { glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NovedadCardProps {
  novedad: Novedad & { categoria: string; fecha: string };
  onPress: () => void;
}

export function NovedadCard({ novedad, onPress }: NovedadCardProps) {
  const prioridad = getNovedadPriority(novedad.prioridad);
  const categoryColor = getNovedadCategoryColor(novedad.id_etiqueta);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`${novedad.categoria}: ${novedad.titulo}. Prioridad ${prioridad.label}`}
    >
      <View
        style={[
          glassStyles.card,
          styles.card,
          { backgroundColor: prioridad.backgroundColor, borderLeftColor: prioridad.color },
        ]}
      >
        <View style={styles.categoryRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
            {novedad.categoria}
          </Text>
        </View>

        <Text style={styles.titulo} numberOfLines={1} ellipsizeMode="tail">
          {novedad.titulo}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.fecha} numberOfLines={1}>{novedad.fecha}</Text>
          <View style={[styles.priorityChip, { backgroundColor: prioridad.backgroundColor }]}>
            <View style={[styles.priorityDot, { backgroundColor: prioridad.color }]} />
            <Text style={[styles.prioridadText, { color: prioridad.color }]}>
              {prioridad.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    minHeight: 92,
    marginRight: 10,
  },
  card: {
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
    borderLeftWidth: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#172033',
    lineHeight: 18,
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fecha: {
    flexShrink: 1,
    fontSize: 10,
    color: '#667085',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
