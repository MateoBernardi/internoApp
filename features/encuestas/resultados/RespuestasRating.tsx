import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { RespondentesModal } from './RespondentesModal';
import { styles } from './styles';

export const RespuestasRating: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [ratingSeleccionado, setRatingSeleccionado] = useState<number | null>(null);
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

  const ratings = respuestas
    .filter((r) => r.valor_rating)
    .map((r) => r.valor_rating!);

  const promedio = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '0';

  const distribucion = [1, 2, 3, 4, 5].map((valor) => ({
    valor,
    cantidad: ratings.filter((r) => r === valor).length,
    respuestas: respuestas.filter((r) => r.valor_rating === valor),
  }));

  const abrirModal = (rating: number) => {
    setRatingSeleccionado(rating);
    setModalVisible(true);
  };

  const respuestasRatingSeleccionado = ratingSeleccionado
    ? distribucion.find(d => d.valor === ratingSeleccionado)?.respuestas || []
    : [];

  return (
    <View>
      <View style={styles.promedioContainer}>
        <Text style={styles.promedioLabel}>Promedio:</Text>
        <Text style={styles.promedioValor}>⭐ {promedio}</Text>
      </View>

      <View style={styles.distribucionContainer}>
        {distribucion.map((item) => {
          const porcentaje = ratings.length
            ? (item.cantidad / ratings.length) * 100
            : 0;

          return (
            <View key={item.valor} style={styles.distribucionItem}>
              <Text style={styles.distribucionValor}>{item.valor}★</Text>
              <View style={styles.barraContainer}>
                <View
                  style={[
                    styles.barra,
                    {
                      width: `${porcentaje}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distribucionCantidad}>{item.cantidad}</Text>
              {!esAnonima && item.cantidad > 0 && (
                <TouchableOpacity
                  style={styles.verRespondentesButtonInline}
                  onPress={() => abrirModal(item.valor)}
                >
                  <Text style={styles.verRespondentesText}>Ver</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {!esAnonima && (
        <RespondentesModal
          visible={modalVisible}
          title={`Votaron ${ratingSeleccionado}★`}
          respuestas={respuestasRatingSeleccionado}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
};
