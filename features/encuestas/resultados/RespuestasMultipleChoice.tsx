import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Pregunta, Respuesta } from '../models/Encuesta';
import { formatHorarioSlot } from './utils';
import { VotantesInline } from './VotantesInline';
import { styles } from './styles';

interface RespuestasMultipleChoiceProps {
  respuestas: Respuesta[];
  pregunta: Pregunta;
  // Solo para tipo horario
  selectedVoterIds?: Set<number>;
  convocadosIds?: Set<number>;
  onToggleVoter?: (voter: Respuesta) => void;
}

export const RespuestasMultipleChoice: React.FC<RespuestasMultipleChoiceProps> = ({
  respuestas,
  pregunta,
  selectedVoterIds,
  convocadosIds,
  onToggleVoter,
}) => {
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;
  const esHorario = pregunta.tipo_pregunta === 'horario';

  // Mapa opcion_id → texto ISO para pasar al modal en modo horario
  const opcionTextoMap = useMemo(() => {
    const map = new Map<number, string>();
    pregunta.opcionesCompletas?.forEach((o) => map.set(o.id, o.texto_opcion));
    return map;
  }, [pregunta.opcionesCompletas]);

  const opcionesCount = new Map<number, number>();
  const respuestasPorOpcion = new Map<number, Respuesta[]>();

  respuestas.forEach((r) => {
    if (r.opcion_id) {
      opcionesCount.set(r.opcion_id, (opcionesCount.get(r.opcion_id) || 0) + 1);
      if (!respuestasPorOpcion.has(r.opcion_id)) {
        respuestasPorOpcion.set(r.opcion_id, []);
      }
      respuestasPorOpcion.get(r.opcion_id)!.push(r);
    }
  });

  const maxCantidad = Math.max(0, ...Array.from(opcionesCount.values()));

  return (
    <View>
      {pregunta.opcionesCompletas?.map((opcion) => {
        const cantidad = opcionesCount.get(opcion.id) || 0;
        const porcentaje = respuestas.length
          ? ((cantidad / respuestas.length) * 100).toFixed(0)
          : '0';
        const barraWidth = maxCantidad > 0 ? (cantidad / maxCantidad) * 100 : 0;
        const opcionLabel = esHorario
          ? formatHorarioSlot(opcion.texto_opcion)
          : opcion.texto_opcion;
        const votantesOpcion = respuestasPorOpcion.get(opcion.id) || [];

        return (
          <View key={opcion.id}>
            <View style={styles.opcionResultadoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                {esHorario && (
                  <Ionicons name="time-outline" size={14} color="#2f78e8" />
                )}
                <Text style={[styles.opcionTexto, { flex: 1 }]}>{opcionLabel}</Text>
              </View>
              <View style={styles.opcionStatsWrapper}>
                <View style={styles.opcionStats}>
                  <View
                    style={[
                      styles.opcionBarra,
                      { width: `${barraWidth}%` as any, minWidth: cantidad > 0 ? 30 : 0 },
                    ]}
                  />
                  <Text style={styles.opcionPorcentaje}>
                    {cantidad} ({porcentaje}%)
                  </Text>
                </View>
              </View>
            </View>

            {!esAnonima && cantidad > 0 && (
              <VotantesInline
                respuestas={votantesOpcion}
                opcionLabel={opcionLabel}
                esAnonima={esAnonima}
                esHorario={esHorario}
                selectedVoterIds={selectedVoterIds}
                convocadosIds={convocadosIds}
                onToggleVoter={onToggleVoter}
                opcionTextoMap={esHorario ? opcionTextoMap : undefined}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};
