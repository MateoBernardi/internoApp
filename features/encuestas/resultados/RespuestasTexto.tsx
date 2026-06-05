import React from 'react';
import { Text, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { styles } from './styles';

export const RespuestasTexto: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
  return (
    <View>
      {respuestas.map((respuesta, index) => (
        <View key={index} style={styles.respuestaTextoCard}>
          <Text style={styles.respuestaTextoContenido}>
            {respuesta.respuesta_texto || 'Sin respuesta'}
          </Text>
          <View style={styles.respuestaFooter}>
            <Text style={styles.respuestaAutor}>
              {respuesta.nombre && respuesta.apellido
                ? `${respuesta.nombre} ${respuesta.apellido}`
                : 'Anónimo'}
            </Text>
            {respuesta.fecha_respuesta && (
              <Text style={styles.respuestaFecha}>
                {new Date(respuesta.fecha_respuesta).toLocaleDateString('es-ES')}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};
