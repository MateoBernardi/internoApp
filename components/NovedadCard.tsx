import type { Novedad } from '@/features/novedades/models/Novedades';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    width: 110,
    marginHorizontal: 4,
  },
  card: {
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  topBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  fecha: {
    fontSize: 9,
    color: '#9ca3af',
    flex: 1,
  },
  prioridadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  prioridadText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
