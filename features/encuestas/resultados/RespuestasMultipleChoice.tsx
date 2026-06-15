import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Pregunta, Respuesta } from '../models/Encuesta';
import { RespondentesModal } from './RespondentesModal';
import { styles } from './styles';

export const RespuestasMultipleChoice: React.FC<{
  respuestas: Respuesta[];
  pregunta: Pregunta;
}> = ({ respuestas, pregunta }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

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

  const abrirModal = (opcionId: number) => {
    setOpcionSeleccionada(opcionId);
    setModalVisible(true);
  };

  const respuestasOpcionSeleccionada = opcionSeleccionada ? respuestasPorOpcion.get(opcionSeleccionada) || [] : [];
  const opcionSeleccionadaNombre = pregunta.opcionesCompletas?.find(o => o.id === opcionSeleccionada)?.texto_opcion || '';

  return (
    <View>
      {pregunta.opcionesCompletas?.map((opcion) => {
        const cantidad = opcionesCount.get(opcion.id) || 0;
        const porcentaje = respuestas.length
          ? ((cantidad / respuestas.length) * 100).toFixed(0)
          : '0';

        return (
          <View key={opcion.id}>
            <View style={styles.opcionResultadoCard}>
              <Text style={styles.opcionTexto}>{opcion.texto_opcion}</Text>
              <View style={styles.opcionStatsWrapper}>
                <View style={styles.opcionStats}>
                  <View
                    style={[
                      styles.opcionBarra,
                      {
                        width: `${porcentaje}%` as any,
                        minWidth: cantidad > 0 ? 30 : 0
                      },
                    ]}
                  />
                  <Text style={styles.opcionPorcentaje}>
                    {cantidad} ({porcentaje}%)
                  </Text>
                </View>
                {!esAnonima && cantidad > 0 && (
                  <TouchableOpacity
                    style={styles.verRespondentesButtonInline}
                    onPress={() => abrirModal(opcion.id)}
                  >
                    <Text style={styles.verRespondentesText}>Ver</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {!esAnonima && (
        <RespondentesModal
          visible={modalVisible}
          title={`Usuarios: ${opcionSeleccionadaNombre}`}
          respuestas={respuestasOpcionSeleccionada}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
};
