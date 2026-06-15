import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { RespondentesModal } from './RespondentesModal';
import { styles } from './styles';

export const RespuestasSiNo: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'Si' | 'No' | null>(null);
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

  const siRespuestas = respuestas.filter((r) => r.respuesta_texto === 'Sí');
  const noRespuestas = respuestas.filter((r) => r.respuesta_texto === 'No');
  const si = siRespuestas.length;
  const no = noRespuestas.length;
  const total = si + no;

  const abrirModal = (tipo: 'Si' | 'No') => {
    setTipoSeleccionado(tipo);
    setModalVisible(true);
  };

  const respuestasSeleccionadas = tipoSeleccionado === 'Si' ? siRespuestas : noRespuestas;

  return (
    <View>
      <View style={styles.siNoResultadosContainer}>
        <View style={styles.siNoItem}>
          <Text style={styles.siNoLabel}>✓ Sí</Text>
          <Text style={styles.siNoValor}>
            {si} ({total ? ((si / total) * 100).toFixed(0) : 0}%)
          </Text>
          {!esAnonima && si > 0 && (
            <TouchableOpacity
              style={styles.siNoModalButton}
              onPress={() => abrirModal('Si')}
            >
              <Text style={styles.siNoModalButtonText}>Ver personas</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.siNoItem}>
          <Text style={styles.siNoLabel}>✗ No</Text>
          <Text style={styles.siNoValor}>
            {no} ({total ? ((no / total) * 100).toFixed(0) : 0}%)
          </Text>
          {!esAnonima && no > 0 && (
            <TouchableOpacity
              style={styles.siNoModalButton}
              onPress={() => abrirModal('No')}
            >
              <Text style={styles.siNoModalButtonText}>Ver personas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!esAnonima && (
        <RespondentesModal
          visible={modalVisible}
          title={tipoSeleccionado === 'Si' ? '✓ Respondieron Sí' : '✗ Respondieron No'}
          respuestas={respuestasSeleccionadas}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
};
