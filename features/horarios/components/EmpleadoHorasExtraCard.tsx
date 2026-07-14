import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HorasExtraDTO } from '../models/HorasExtra';

const AMBER = '#c98a1a';
const NAVY = '#2b1f5c';
const MUTED = '#7a8087';
const INK = '#1c2024';
const LINE = '#e8eaed';
const CARD = '#f6f7f9';

function initials(nombre: string, apellido: string): string {
  return `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase();
}

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10}h`;
}

interface EmpleadoHorasExtraCardProps {
  empleado: HorasExtraDTO;
  isLiquidando: boolean;
  onPress: (empleado: HorasExtraDTO) => void;
  onLiquidar: (empleado: HorasExtraDTO) => void;
}

export const EmpleadoHorasExtraCard = React.memo(function EmpleadoHorasExtraCard({
  empleado,
  isLiquidando,
  onPress,
  onLiquidar,
}: EmpleadoHorasExtraCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(empleado)} activeOpacity={0.72}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(empleado.nombre, empleado.apellido)}</Text>
      </View>

      <View style={styles.mid}>
        <Text style={styles.nombre} numberOfLines={1}>
          {empleado.nombre} {empleado.apellido}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.horas}>{formatHoras(empleado.horas)}</Text>
        <Text style={styles.label}>extra</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.liquidarBtn,
          (isLiquidando || empleado.horas <= 0) && styles.liquidarBtnDisabled,
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onLiquidar(empleado);
        }}
        disabled={isLiquidando || empleado.horas <= 0}
      >
        <Ionicons name="cash-outline" size={14} color="#ffffff" />
        <Text style={styles.liquidarBtnText}>Liquidar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: LINE,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  mid: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  horas: {
    fontSize: 15,
    fontWeight: '800',
    color: AMBER,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },
  liquidarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AMBER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liquidarBtnDisabled: {
    opacity: 0.5,
  },
  liquidarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
