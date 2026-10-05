import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SedeDTO } from '../models/HorarioDTO';
import type { TurnoEnum } from '../models/HorarioDTO';
import type { Turno } from '../models/Turno';
import { ACEPTADO_COLOR, FERIADO_COLOR, NAVY, NOCHE_COLOR, NOCHE_SOFT, RED_FLASH, ROTATIVO_COLOR, ROTATIVO_SOFT, TARDE_COLOR, TARDE_SOFT, TURNO_COLOR, TURNO_SOFT } from '../theme';


// Letra y colores por nombre exacto del turno: Noche y Rotativo ya no se muestran como "Tarde".
const TURNO_VISUAL: Record<TurnoEnum, { code: string; color: string; soft: string }> = {
  Mañana: { code: 'M', color: TURNO_COLOR, soft: TURNO_SOFT },
  Tarde: { code: 'T', color: TARDE_COLOR, soft: TARDE_SOFT },
  Noche: { code: 'N', color: NOCHE_COLOR, soft: NOCHE_SOFT },
  Rotativo: { code: 'R', color: ROTATIVO_COLOR, soft: ROTATIVO_SOFT },
};

interface TurnoCardProps {
  turno: Turno;
  sedes: SedeDTO[];
  onPress: (turno: Turno) => void;
}

export const TurnoCard = React.memo(function TurnoCard({ turno, sedes, onPress }: TurnoCardProps) {
  const visual = TURNO_VISUAL[turno.turnoNombre];
  const badgeBg = visual.soft;
  const badgeText = visual.color;

  const sedesMap = React.useMemo(
    () => Object.fromEntries(sedes.map((s) => [s.id, s.nombre])),
    [sedes],
  );

  const sedeIn = sedesMap[turno.sedeIdIngreso] ?? `#${turno.sedeIdIngreso}`;
  const sedeOut = sedesMap[turno.sedeIdEgreso] ?? `#${turno.sedeIdEgreso}`;

  return (
    <TouchableOpacity
      style={[glassStyles.card, styles.card, turno.isNew && styles.cardNew]}
      onPress={() => onPress(turno)}
      activeOpacity={0.72}
    >
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeLetter, { color: badgeText }]}>{visual.code}</Text>
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
          {!!turno.marcadoInAt && (
            <View style={styles.aceptadoPill}>
              <Ionicons name="qr-code" size={11} color={ACEPTADO_COLOR} />
              <Text style={styles.aceptadoText}>Escaneado</Text>
            </View>
          )}
          {turno.horarioCorrido && (
            <View style={styles.corridoPill}>
              <Ionicons name="time-outline" size={11} color={NAVY} />
              <Text style={styles.corridoText}>Corrido</Text>
            </View>
          )}
          {turno.feriado && (
            <View style={styles.feriadoPill}>
              <Ionicons name="star" size={11} color={FERIADO_COLOR} />
              <Text style={styles.feriadoText}>Feriado ×2</Text>
            </View>
          )}
          {turno.reportadoTardanza && (
            <View style={styles.reportadoPill}>
              <Ionicons name="alert-circle" size={11} color={RED_FLASH} />
              <Text style={styles.reportadoText}>Reportado</Text>
            </View>
          )}
        </View>
        <View style={styles.sedeRow}>
          <Ionicons name="location-outline" size={12} color={glassColors.textMuted} style={styles.pinIcon} />
          <Text style={styles.sedeText} numberOfLines={1}>
            {sedeIn}{sedeIn !== sedeOut ? ` → ${sedeOut}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.horario}>{turno.ingreso}–{turno.egreso || 'a marcar'}</Text>
        <Text style={styles.turnoLabel}>{turno.turnoNombre}</Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color={glassColors.textMuted} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
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
    minWidth: 0,
    gap: 3,
  },
  nombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    color: glassColors.text,
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
  feriadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(147,51,234,0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  feriadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: FERIADO_COLOR,
  },
  corridoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(26,115,232,0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  corridoText: {
    fontSize: 10,
    fontWeight: '700',
    color: NAVY,
  },
  reportadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  reportadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: RED_FLASH,
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
    color: glassColors.textMuted,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  horario: {
    fontSize: 14,
    fontWeight: '800',
    color: glassColors.text,
    fontVariant: ['tabular-nums'],
  },
  turnoLabel: {
    fontSize: 11,
    color: glassColors.textMuted,
    fontWeight: '500',
  },
});
