import React from 'react';
import { Text, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { VotantesInline } from './VotantesInline';
import { styles } from './styles';

export const RespuestasSiNo: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

  const siRespuestas = respuestas.filter((r) => r.respuesta_texto === 'Si');
  const noRespuestas = respuestas.filter((r) => r.respuesta_texto === 'No');
  const si = siRespuestas.length;
  const no = noRespuestas.length;
  const total = si + no;

  return (
    <View>
      <View style={styles.siNoResultadosContainer}>
        <View style={styles.siNoItem}>
          <Text style={styles.siNoLabel}>✓ Sí</Text>
          <Text style={styles.siNoValor}>
            {si} ({total ? ((si / total) * 100).toFixed(0) : 0}%)
          </Text>
        </View>
        <View style={styles.siNoItem}>
          <Text style={styles.siNoLabel}>✗ No</Text>
          <Text style={styles.siNoValor}>
            {no} ({total ? ((no / total) * 100).toFixed(0) : 0}%)
          </Text>
        </View>
      </View>

      {!esAnonima && si > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.respuestasHeader, { fontSize: 12, marginBottom: 4 }]}>✓ Sí</Text>
          <VotantesInline
            respuestas={siRespuestas}
            opcionLabel="Sí"
            esAnonima={esAnonima}
          />
        </View>
      )}

      {!esAnonima && no > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.respuestasHeader, { fontSize: 12, marginBottom: 4 }]}>✗ No</Text>
          <VotantesInline
            respuestas={noRespuestas}
            opcionLabel="No"
            esAnonima={esAnonima}
          />
        </View>
      )}
    </View>
  );
};
