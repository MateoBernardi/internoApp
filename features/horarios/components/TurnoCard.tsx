import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SedeDTO } from '../models/HorarioDTO';
import { TURNO_CODE, TURNO_LABEL, type Turno } from '../models/Turno';

const TURNO_SOFT = '#e7f2fb';
const TURNO_COLOR = '#2f86d6';
const TARDE_SOFT = '#fff8e7';
const TARDE_COLOR = '#c98a1a';
const ACEPTADO_COLOR = '#16a34a';

interface TurnoCardProps {
  turno: Turno;
  sedes: SedeDTO[];
  onPress: (turno: Turno) => void;
}

export const TurnoCard = React.memo(function TurnoCard({ turno, sedes, onPress }: TurnoCardProps) {
  const isManana = turno.turno === 'MANANA';
  const badgeBg = isManana ? TURNO_SOFT : TARDE_SOFT;
  const badgeText = isManana ? TURNO_COLOR : TARDE_COLOR;

  const sedesMap = React.useMemo(
    () => Object.fromEntries(sedes.map((s) => [s.id, s.nombre])),
    [sedes],
  );

  const sedeIn = sedesMap[turno.sedeIdIngreso] ?? `#${turno.sedeIdIngreso}`;
  const sedeOut = sedesMap[turno.sedeIdEgreso] ?? `#${turno.sedeIdEgreso}`;

  return (
    <TouchableOpacity
      style={[styles.card, turno.isNew && styles.cardNew]}
      onPress={() => onPress(turno)}
      activeOpacity={0.72}
    >
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeLetter, { color: badgeText }]}>{TURNO_CODE[turno.turno]}</Text>
      </View>

      <View style={styles.mid}>
        <View style={styles.nombreRow}>
          <Text style={styles.nombre} numberOfLines={1}>{turno.nombre}</Text>
          {!!turno.aceptedAt && (
            <View style={styles.aceptadoPill}>
              <Ionicons name="checkmark-circle" size={11} color={ACEPTADO_COLOR} />
              <Text style={styles.aceptadoText}>Aceptado</Text>
            </View>
          )}
        </View>
        <View style={styles.sedeRow}>
          <Ionicons name="location-outline" size={12} color="#7a8087" style={styles.pinIcon} />
          <Text style={styles.sedeText} numberOfLines={1}>
            {sedeIn}{sedeIn !== sedeOut ? ` → ${sedeOut}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.horario}>{turno.ingreso}–{turno.egreso}</Text>
        <Text style={styles.turnoLabel}>{TURNO_LABEL[turno.turno]}</Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color="#9aa3ab" />
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
    borderColor: '#e8eaed',
    gap: 10,
  },
  cardNew: {
    borderColor: '#4ade80',
    backgroundColor: '#f0fdf4',
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLetter: {
    fontSize: 16,
    fontWeight: '800',
  },
  mid: {
    flex: 1,
    gap: 3,
  },
  nombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c2024',
    flexShrink: 1,
  },
  aceptadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#e9f9ef',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  aceptadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  sedeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 3,
  },
  sedeText: {
    fontSize: 12,
    color: '#7a8087',
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  horario: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1c2024',
    fontVariant: ['tabular-nums'],
  },
  turnoLabel: {
    fontSize: 11,
    color: '#7a8087',
    fontWeight: '500',
  },
});
