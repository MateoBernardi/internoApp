import type { Novedad } from '@/features/novedades/models/Novedades';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const REFERENCE_WIDTH = 375;
const SCALE_FACTOR = width / REFERENCE_WIDTH;
const scale = (size: number) => Math.round(size * SCALE_FACTOR);

interface NovedadCardProps {
  novedad: Novedad & { categoria: string; fecha: string };
  onPress: () => void;
}

const getPrioridadInfo = (prioridad: number): { color: string; bg: string; label: string } => {
  switch (prioridad) {
    case 1:
      return { color: '#dc2626', bg: '#fef2f2', label: 'Alta' };
    case 2:
      return { color: '#d97706', bg: '#fffbeb', label: 'Media' };
    case 3:
      return { color: '#16a34a', bg: '#f0fdf4', label: 'Baja' };
    default:
      return { color: '#6b7280', bg: '#f3f4f6', label: '' };
  }
};

export function NovedadCard({ novedad, onPress }: NovedadCardProps) {
  const prioridad = getPrioridadInfo(novedad.prioridad);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.card, { backgroundColor: '#ffffff' }]}>  
        {/* Barra superior de color prioridad */}
        <View style={[styles.topBar, { backgroundColor: prioridad.color }]} />

        <View style={styles.cardContent}>
          {/* Chip categoría */}
          <View style={styles.chipRow}>
            <View style={[styles.categoryChip, { backgroundColor: prioridad.bg }]}>
              <Text style={[styles.categoryText, { color: prioridad.color }]} numberOfLines={1}>
                {novedad.categoria}
              </Text>
            </View>
          </View>

          {/* Título */}
          <Text style={styles.titulo} numberOfLines={2} ellipsizeMode="tail">
            {novedad.titulo}
          </Text>

          {/* Footer: fecha + prioridad */}
          <View style={styles.footer}>
            <Text style={styles.fecha} numberOfLines={1}>{novedad.fecha}</Text>
            <View style={styles.prioridadRow}>
              <View style={[styles.dot, { backgroundColor: prioridad.color }]} />
              <Text style={[styles.prioridadText, { color: prioridad.color }]}>
                {prioridad.label}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(110),
    marginHorizontal: scale(4),
  },
  card: {
    height: scale(110),
    borderRadius: scale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(6),
    elevation: 3,
  },
  topBar: {
    height: scale(4),
    width: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: scale(10),
    paddingTop: scale(8),
    paddingBottom: scale(8),
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    maxWidth: '100%',
  },
  categoryText: {
    fontSize: scale(9),
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: scale(12),
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: scale(16),
    marginTop: scale(4),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(4),
  },
  fecha: {
    fontSize: scale(9),
    color: '#9ca3af',
    flex: 1,
  },
  prioridadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  prioridadText: {
    fontSize: scale(9),
    fontWeight: '700',
  },
});
