import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AccionDiff, DiffTurnoDetalle } from '../models/Planificacion';
import { ACEPTADO_COLOR, AMBER, INK, LINE, MUTED, RED_FLASH } from '../theme';
import { formatFechaCorta, formatHorario, type GrupoUsuarioDiff } from '../utils/planificacionDiff';

interface Props {
  grupos: GrupoUsuarioDiff[];
}

const ACCION_VISUAL: Record<Exclude<AccionDiff, 'omitido'>, { signo: string; color: string; etiqueta: string }> = {
  alta: { signo: '+', color: ACEPTADO_COLOR, etiqueta: 'Nuevo' },
  modificacion: { signo: '~', color: AMBER, etiqueta: 'Cambia' },
  baja: { signo: '−', color: RED_FLASH, etiqueta: 'Se elimina' },
};

function FilaDiff({ item }: { item: DiffTurnoDetalle }) {
  const visual = ACCION_VISUAL[item.accion as Exclude<AccionDiff, 'omitido'>];
  if (!visual) return null;

  return (
    <View style={styles.fila}>
      <View style={[styles.signo, { backgroundColor: `${visual.color}22` }]}>
        <Text style={[styles.signoText, { color: visual.color }]}>{visual.signo}</Text>
      </View>
      <View style={styles.filaMid}>
        <Text style={styles.filaTitulo}>
          {formatFechaCorta(item.fecha)} · {item.turno}
        </Text>
        {item.accion === 'alta' && <Text style={[styles.despues, { color: visual.color }]}>{formatHorario(item.despues)}</Text>}
        {item.accion === 'baja' && <Text style={[styles.antes, styles.tachado]}>{formatHorario(item.antes)}</Text>}
        {item.accion === 'modificacion' && (
          <View style={styles.cambioRow}>
            <Text style={[styles.antes, styles.tachado]}>{formatHorario(item.antes)}</Text>
            <Ionicons name="arrow-forward" size={12} color={MUTED} />
            <Text style={[styles.despues, { color: visual.color }]}>{formatHorario(item.despues)}</Text>
          </View>
        )}
        {item.accion === 'modificacion' && item.antes?.horarioCorrido && (
          <Text style={styles.nota}>Tenía horario corrido: vuelve a turnos con horario fijo.</Text>
        )}
      </View>
      <Text style={[styles.etiqueta, { color: visual.color }]}>{visual.etiqueta}</Text>
    </View>
  );
}

/** Cambios que se van a aplicar, agrupados por empleado, con "antes → después" al estilo de un diff. */
export const PlanificacionDiffList = React.memo(function PlanificacionDiffList({ grupos }: Props) {
  const conCambios = grupos.filter((g) => g.cambios.length > 0);
  if (conCambios.length === 0) return null;

  return (
    <View style={styles.lista}>
      {conCambios.map((g) => (
        <View key={g.userContextId} style={[glassStyles.card, styles.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.nombre} numberOfLines={1}>
              {g.apellido} {g.nombre}
            </Text>
            <Text style={styles.contador}>
              {g.cambios.length} cambio{g.cambios.length === 1 ? '' : 's'}
            </Text>
          </View>
          {g.cambios.map((c) => (
            <FilaDiff key={`${c.fecha}-${c.turno}`} item={c} />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  lista: { gap: 10 },
  card: { padding: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { flex: 1, fontSize: 15, fontWeight: '800', color: INK },
  contador: { fontSize: 12, fontWeight: '600', color: glassColors.textMuted },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  signo: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  signoText: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  filaMid: { flex: 1, gap: 2 },
  filaTitulo: { fontSize: 13, fontWeight: '700', color: INK },
  cambioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  antes: { fontSize: 13, color: MUTED, fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
  despues: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  nota: { fontSize: 11.5, color: MUTED },
  etiqueta: { fontSize: 11, fontWeight: '700' },
});
