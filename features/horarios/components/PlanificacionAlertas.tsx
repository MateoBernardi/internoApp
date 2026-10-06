import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DiffTurnoDetalle, FaltanteHoras, MotivoOmitido, PlanificacionPreviewDTO } from '../models/Planificacion';
import { AMBER, INK, LINE, MUTED, NAVY } from '../theme';
import {
  agruparDiffPorUsuario,
  esOmitidoRelevante,
  formatFechaCorta,
  formatHorario,
  MOTIVO_OMITIDO_TEXTO,
  omitidosPor2h,
} from '../utils/planificacionDiff';

interface Props {
  preview: PlanificacionPreviewDTO;
}

interface BloqueProps {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
  /** Con `children`, el detalle arranca colapsado y se abre al tocar. */
  inicialAbierto?: boolean;
}

function Bloque({ icono, color, titulo, descripcion, children, inicialAbierto = false }: BloqueProps) {
  const [abierto, setAbierto] = useState(inicialAbierto);
  const expandible = Boolean(children);

  return (
    <View style={[glassStyles.card, styles.bloque]}>
      <TouchableOpacity
        style={styles.bloqueHeader}
        onPress={() => expandible && setAbierto((v) => !v)}
        activeOpacity={expandible ? 0.7 : 1}
        accessibilityRole={expandible ? 'button' : undefined}
        accessibilityState={expandible ? { expanded: abierto } : undefined}
      >
        <View style={[styles.icono, { backgroundColor: `${color}1f` }]}>
          <Ionicons name={icono} size={18} color={color} />
        </View>
        <View style={styles.bloqueTextos}>
          <Text style={styles.bloqueTitulo}>{titulo}</Text>
          <Text style={styles.bloqueDescripcion}>{descripcion}</Text>
        </View>
        {expandible && <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />}
      </TouchableOpacity>
      {expandible && abierto && <View style={styles.detalle}>{children}</View>}
    </View>
  );
}

function ListaOmitidos({ detalle, motivos }: { detalle: DiffTurnoDetalle[]; motivos: MotivoOmitido[] }) {
  const grupos = agruparDiffPorUsuario(
    detalle.filter((d) => esOmitidoRelevante(d) && d.motivo && motivos.includes(d.motivo)),
  );
  return (
    <>
      {grupos.map((g) => (
        <View key={g.userContextId} style={styles.omitidoGrupo}>
          <Text style={styles.omitidoNombre}>
            {g.apellido} {g.nombre}
          </Text>
          {g.omitidos.map((o) => (
            <Text key={`${o.fecha}-${o.turno}`} style={styles.omitidoFila}>
              {formatFechaCorta(o.fecha)} · {o.turno} · {formatHorario(o.despues ?? o.antes)}
              {o.motivo ? ` — ${MOTIVO_OMITIDO_TEXTO[o.motivo]}` : ''}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function ListaFaltantes({ titulo, faltantes }: { titulo: string; faltantes: FaltanteHoras[] }) {
  if (faltantes.length === 0) return null;
  return (
    <View style={styles.faltantesSeccion}>
      <Text style={styles.faltantesTitulo}>{titulo}</Text>
      {faltantes.map((f) => (
        <View key={f.user_context_id} style={styles.faltanteFila}>
          <Text style={styles.faltanteNombre} numberOfLines={1}>
            {f.apellido} {f.nombre}
          </Text>
          <Text style={styles.faltanteHoras}>
            {f.horas} h de {f.objetivo} h
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Avisos del preview: cambios omitidos (regla de 2 h, licencias), usuarios que quedan por debajo de
 * su objetivo de horas y empleados que no figuran en la planilla. No bloquean la publicación.
 */
export const PlanificacionAlertas = React.memo(function PlanificacionAlertas({ preview }: Props) {
  const { resumen, detalle, faltantes, usuariosSinTurnos } = preview;
  // Solo los omitidos por 2 h sobre horarios que se modificaron: no se avisa por turnos sin cargar.
  const omitidos2h = omitidosPor2h(detalle).length;
  const hayFaltantes = faltantes.semanaActual.length + faltantes.proximaSemana.length > 0;

  return (
    <View style={styles.contenedor}>
      {resumen.omitidosLicencia > 0 && (
        <Bloque
          icono="medkit-outline"
          color={AMBER}
          titulo={`${resumen.omitidosLicencia} turno${resumen.omitidosLicencia === 1 ? '' : 's'} con licencia`}
          descripcion="No se tocan. Para cambiarlos, marcá la ausencia en el turno y cargalo a mano."
          inicialAbierto
        >
          <ListaOmitidos detalle={detalle} motivos={['LICENCIA']} />
        </Bloque>
      )}

      {omitidos2h > 0 && (
        <Bloque
          icono="time-outline"
          color={NAVY}
          titulo={`${omitidos2h} cambio${omitidos2h === 1 ? '' : 's'} sin aplicar`}
          descripcion="El turno empieza en menos de 2 horas o ya empezó: se mantiene como está."
        >
          <ListaOmitidos detalle={detalle} motivos={['2H', 'MARCADO']} />
        </Bloque>
      )}

      {hayFaltantes && (
        <Bloque
          icono="trending-down-outline"
          color={AMBER}
          titulo="Horas por debajo del objetivo"
          descripcion="Estos empleados quedan con menos horas que su objetivo semanal. Podés publicar igual."
          inicialAbierto
        >
          <ListaFaltantes titulo="Esta semana" faltantes={faltantes.semanaActual} />
          <ListaFaltantes titulo="Semana próxima" faltantes={faltantes.proximaSemana} />
        </Bloque>
      )}

      {usuariosSinTurnos.length > 0 && (
        <Bloque
          icono="person-remove-outline"
          color={glassColors.textMuted}
          titulo={`${usuariosSinTurnos.length} empleado${usuariosSinTurnos.length === 1 ? '' : 's'} sin turnos en la planilla`}
          descripcion="Ya no figuran con horarios. No se modifican sus turnos cargados."
        >
          {usuariosSinTurnos.map((u) => (
            <Text key={u.userContextId} style={styles.omitidoFila}>
              {u.apellido} {u.nombre}
            </Text>
          ))}
        </Bloque>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  contenedor: { gap: 10 },
  bloque: { padding: 12 },
  bloqueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bloqueTextos: { flex: 1, gap: 2 },
  bloqueTitulo: { fontSize: 14, fontWeight: '800', color: INK },
  bloqueDescripcion: { fontSize: 12.5, lineHeight: 17, color: glassColors.textMuted },
  detalle: { marginTop: 10, paddingTop: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE },
  omitidoGrupo: { gap: 2 },
  omitidoNombre: { fontSize: 13, fontWeight: '700', color: INK },
  omitidoFila: { fontSize: 12.5, lineHeight: 17, color: glassColors.textMuted },
  faltantesSeccion: { gap: 4 },
  faltantesTitulo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: MUTED },
  faltanteFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  faltanteNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: INK },
  faltanteHoras: { fontSize: 13, fontWeight: '700', color: AMBER, fontVariant: ['tabular-nums'] },
});
