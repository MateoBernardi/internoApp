import type { Novedad } from '@/features/novedades/models/Novedades';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Factor de escala basado en pantallas de referencia
const { width } = Dimensions.get('window');
const REFERENCE_WIDTH = 375; // iPhone SE
const SCALE_FACTOR = width / REFERENCE_WIDTH;

const scale = (size: number) => Math.round(size * SCALE_FACTOR);

interface NovedadCardProps {
  novedad: Novedad & { categoria: string; fecha: string; };
  onPress: () => void;
}

const getCategoriaIcon = (categoria: string): string => {
  switch (categoria.toLowerCase()) {
    case 'general':
      return '📋';
    case 'eventos':
      return '🎉';
    case 'supermercado':
      return '📦';
    case 'mantenimiento':
      return '🔧';
    case 'seguridad e higiene':
      return '🛡️';
    case 'personas y relaciones':
      return '👥';
    case 'capacitación':
      return '🎓';
    case 'comunicados':
      return '📢';
    case 'insumos':
      return '🌱';
    case 'otros':
      return '📌';
    default:
      return '📌';
  }
};

const getPrioridadColor = (prioridad: number): { border: string; background: string } => {
  switch (prioridad) {
    case 1: // Alta
      return { border: '#ef4444', background: '#fee2e2' };
    case 2: // Media
      return { border: '#fbbf24', background: '#fef3c7' };
    case 3: // Baja
      return { border: '#22c55e', background: '#dcfce7' };
    default:
      return { border: '#9ca3af', background: '#f3f4f6' };
  }
};

export function NovedadCard({ novedad, onPress }: NovedadCardProps) {
  const colors = getPrioridadColor(novedad.prioridad);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.card, { borderLeftColor: colors.border, backgroundColor: colors.background }]}>
        {/* Header con icono y categoría */}
        <View style={styles.header}>
          <Text style={styles.icon}>{getCategoriaIcon(novedad.categoria)}</Text>
        </View>

        {/* Título */}
        <Text style={styles.titulo} numberOfLines={2} ellipsizeMode="tail">
          {novedad.titulo}
        </Text>

        {/* Fecha */}
        <Text style={styles.fecha}>{novedad.fecha}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(100),
    marginHorizontal: scale(4),
  },
  card: {
    height: scale(80),
    borderRadius: scale(12),
    borderLeftWidth: scale(4),
    padding: scale(5),
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  icon: {
    fontSize: scale(20),
  },
  categoria: {
    fontSize: scale(10),
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: scale(18),
  },
  fecha: {
    fontSize: scale(11),
    color: '#6b7280',
  },
});
