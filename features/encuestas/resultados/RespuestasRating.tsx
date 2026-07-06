import React from 'react';
import { Text, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { VotantesInline } from './VotantesInline';
import { styles } from './styles';

export const RespuestasRating: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

  const ratings = respuestas.filter((r) => r.valor_rating).map((r) => r.valor_rating!);

  const promedio = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '0';

  const distribucion = [1, 2, 3, 4, 5].map((valor) => ({
    valor,
    cantidad: ratings.filter((r) => r === valor).length,
    respuestas: respuestas.filter((r) => r.valor_rating === valor),
  }));

  return (
    <View>
      <View style={styles.promedioContainer}>
        <Text style={styles.promedioLabel}>Promedio:</Text>
        <Text style={styles.promedioValor}>⭐ {promedio}</Text>
      </View>

      <View style={styles.distribucionContainer}>
        {distribucion.map((item) => {
          const porcentaje = ratings.length ? (item.cantidad / ratings.length) * 100 : 0;
          return (
            <View key={item.valor}>
              <View style={styles.distribucionItem}>
                <Text style={styles.distribucionValor}>{item.valor}★</Text>
                <View style={styles.barraContainer}>
                  <View style={[styles.barra, { width: `${porcentaje}%` as any }]} />
                </View>
                <Text style={styles.distribucionCantidad}>{item.cantidad}</Text>
              </View>
              {!esAnonima && item.cantidad > 0 && (
                <VotantesInline
                  respuestas={item.respuestas}
                  opcionLabel={`${item.valor}★`}
                  esAnonima={esAnonima}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
