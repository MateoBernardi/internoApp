import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Respuesta } from '../models/Encuesta';
import { RespondentesModal } from './RespondentesModal';
import { styles } from './styles';

const colors = Colors['light'];

const INLINE_THRESHOLD = 3;

interface VotantesInlineProps {
  respuestas: Respuesta[];
  opcionLabel: string;
  esAnonima: boolean;
  // Solo presente para preguntas tipo horario
  esHorario?: boolean;
  selectedVoterIds?: Set<number>;
  convocadosIds?: Set<number>;
  onToggleVoter?: (voter: Respuesta) => void;
  // Mapa opcion_id → ISO string para badge de slot en modal
  opcionTextoMap?: Map<number, string>;
}

/**
 * Muestra la lista de votantes de una opción.
 * ≤3 votantes → filas inline con checkboxes (si esHorario).
 * >3 votantes → botón "Ver (N)" que abre RespondentesModal.
 */
export const VotantesInline: React.FC<VotantesInlineProps> = ({
  respuestas,
  opcionLabel,
  esAnonima,
  esHorario = false,
  selectedVoterIds,
  convocadosIds,
  onToggleVoter,
  opcionTextoMap,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (esAnonima || respuestas.length === 0) return null;

  const puedeSeleccionar = esHorario && !!onToggleVoter;

  if (respuestas.length > INLINE_THRESHOLD) {
    return (
      <>
        <TouchableOpacity style={styles.verTodosButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="people-outline" size={14} color="#2f78e8" />
          <Text style={styles.verTodosText}>Ver {respuestas.length} votantes</Text>
        </TouchableOpacity>

        <RespondentesModal
          visible={modalVisible}
          title={`Votantes: ${opcionLabel}`}
          respuestas={respuestas}
          onClose={() => setModalVisible(false)}
          esHorario={esHorario}
          selectedVoterIds={selectedVoterIds}
          convocadosIds={convocadosIds}
          onToggleVoter={onToggleVoter}
          opcionTextoMap={opcionTextoMap}
        />
      </>
    );
  }

  return (
    <View style={styles.votantesInlineContainer}>
      {respuestas.map((respuesta, index) => {
        const uid = Number(respuesta.usuario_id ?? -1);
        const yaConvocado = !!convocadosIds?.has(uid);
        const isSelected = !yaConvocado && !!selectedVoterIds?.has(uid);
        const puedeTogglear = puedeSeleccionar && !yaConvocado;

        return (
          <TouchableOpacity
            key={index}
            style={[styles.votanteRow, isSelected && styles.votanteRowSelected, yaConvocado && styles.votanteRowConvocado]}
            onPress={puedeTogglear ? () => onToggleVoter!(respuesta) : undefined}
            activeOpacity={puedeTogglear ? 0.7 : 1}
          >
            {puedeSeleccionar && (
              yaConvocado ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : (
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              )
            )}
            <View style={styles.votanteInfo}>
              <Text style={[styles.votanteNombre, yaConvocado && { color: colors.secondaryText }]}>
                {respuesta.nombre} {respuesta.apellido}
              </Text>
              {yaConvocado ? (
                <Text style={styles.yaConvocadoText}>Ya convocado</Text>
              ) : respuesta.fecha_respuesta ? (
                <Text style={styles.votanteFecha}>
                  {new Date(respuesta.fecha_respuesta).toLocaleDateString('es-ES')}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
