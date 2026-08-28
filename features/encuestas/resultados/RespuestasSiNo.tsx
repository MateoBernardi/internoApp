import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { VotantesInline } from './VotantesInline';
import { styles } from './styles';

const colors = Colors['light'];

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
          <View style={styles.siNoLabelRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.siNoLabel}>Sí</Text>
          </View>
          <Text style={styles.siNoValor}>
            {si} ({total ? ((si / total) * 100).toFixed(0) : 0}%)
          </Text>
        </View>
        <View style={styles.siNoItem}>
          <View style={styles.siNoLabelRow}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={styles.siNoLabel}>No</Text>
          </View>
          <Text style={styles.siNoValor}>
            {no} ({total ? ((no / total) * 100).toFixed(0) : 0}%)
          </Text>
        </View>
      </View>

      {!esAnonima && si > 0 && (
        <View style={{ marginTop: 8 }}>
          <View style={[styles.siNoLabelRow, { marginBottom: 4 }]}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={[styles.respuestasHeader, { fontSize: 12 }]}>Sí</Text>
          </View>
          <VotantesInline
            respuestas={siRespuestas}
            opcionLabel="Sí"
            esAnonima={esAnonima}
          />
        </View>
      )}

      {!esAnonima && no > 0 && (
        <View style={{ marginTop: 8 }}>
          <View style={[styles.siNoLabelRow, { marginBottom: 4 }]}>
            <Ionicons name="close-circle" size={13} color={colors.error} />
            <Text style={[styles.respuestasHeader, { fontSize: 12 }]}>No</Text>
          </View>
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
