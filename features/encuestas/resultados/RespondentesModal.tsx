import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { formatHorarioSlot } from './utils';
import { styles } from './styles';

const colors = Colors['light'];

interface RespondentesModalProps {
  visible: boolean;
  title: string;
  respuestas: Respuesta[];
  onClose: () => void;
  // Selección para tipo horario
  esHorario?: boolean;
  selectedVoterIds?: Set<number>;
  convocadosIds?: Set<number>;
  onToggleVoter?: (voter: Respuesta) => void;
  // Mapa opcion_id → texto ISO para mostrar badge de slot en modo horario
  opcionTextoMap?: Map<number, string>;
}

export const RespondentesModal: React.FC<RespondentesModalProps> = ({
  visible,
  title,
  respuestas,
  onClose,
  esHorario = false,
  selectedVoterIds,
  convocadosIds,
  onToggleVoter,
  opcionTextoMap,
}) => {
  const puedeSeleccionar = esHorario && !!onToggleVoter;

  return (
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
              respuestas.map((respuesta, index) => {
                const uid = Number(respuesta.usuario_id ?? -1);
                const yaConvocado = !!convocadosIds?.has(uid);
                const isSelected = !yaConvocado && !!selectedVoterIds?.has(uid);
                const puedeTogglear = puedeSeleccionar && !yaConvocado;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.respondentCard,
                      isSelected && styles.votanteRowSelected,
                      yaConvocado && styles.votanteRowConvocado,
                    ]}
                    onPress={puedeTogglear ? () => onToggleVoter!(respuesta) : undefined}
                    activeOpacity={puedeTogglear ? 0.7 : 1}
                  >
                    <View style={styles.respondentContent}>
                      {puedeSeleccionar && (
                        yaConvocado ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        ) : (
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                        )
                      )}
                      <View style={styles.respondentInfo}>
                        <Text style={[styles.respondentName, yaConvocado && { color: colors.secondaryText }]}>
                          {respuesta.nombre} {respuesta.apellido}
                        </Text>
                        {yaConvocado ? (
                          <Text style={styles.yaConvocadoText}>Ya convocado</Text>
                        ) : respuesta.fecha_respuesta ? (
                          <Text style={styles.respondentDate}>
                            {new Date(respuesta.fecha_respuesta).toLocaleDateString('es-ES')}
                          </Text>
                        ) : null}
                      </View>
                      {esHorario && respuesta.opcion_id && opcionTextoMap?.get(respuesta.opcion_id) && (
                        <View style={styles.slotBadge}>
                          <Ionicons name="time-outline" size={11} color="#2a4f86" />
                          <Text style={styles.slotBadgeText}>
                            {formatHorarioSlot(opcionTextoMap.get(respuesta.opcion_id)!)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.respondentEmpty}>No hay respuestas</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
