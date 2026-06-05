import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { styles } from './styles';

interface RespondentesModalProps {
  visible: boolean;
  title: string;
  respuestas: Respuesta[];
  onClose: () => void;
}

/**
 * Modal con la lista de personas que respondieron (nombre + fecha). Compartido
 * por los resultados de rating, opción múltiple y sí/no.
 */
export const RespondentesModal: React.FC<RespondentesModalProps> = ({ visible, title, respuestas, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCloseButton}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll}>
          {respuestas.length > 0 ? (
            respuestas.map((respuesta, index) => (
              <View key={index} style={styles.respondentCard}>
                <View style={styles.respondentContent}>
                  <View style={styles.respondentInfo}>
                    <Text style={styles.respondentName}>
                      {respuesta.nombre} {respuesta.apellido}
                    </Text>
                    {respuesta.fecha_respuesta && (
                      <Text style={styles.respondentDate}>
                        {new Date(respuesta.fecha_respuesta).toLocaleDateString('es-ES')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.respondentEmpty}>No hay respuestas</Text>
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);
