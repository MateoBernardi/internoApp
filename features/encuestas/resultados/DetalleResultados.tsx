import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Opcion, Respuesta } from '../models/Encuesta';
import { useEliminarOpcion } from '../viewmodels/useEncuestas';
import { ConvocarReunionModal } from './ConvocarReunionModal';
import { GestionParticipantesModal } from './GestionParticipantesModal';
import { RespuestasMultipleChoice } from './RespuestasMultipleChoice';
import { RespuestasRating } from './RespuestasRating';
import { RespuestasSiNo } from './RespuestasSiNo';
import { RespuestasTexto } from './RespuestasTexto';
import { styles } from './styles';
import { getTipoPreguntaLabel, type RespuestaAgrupada } from './utils';

const ROLES_GESTION = new Set(['gerencia', 'presidencia', 'consejo', 'personasRelaciones', 'empleado-admin']);

const colors = Colors['light'];

interface DetalleResultadosProps {
  encuesta: RespuestaAgrupada;
  onVolver: () => void;
  onEliminar: () => void;
  isDeleting: boolean;
  esCreador: boolean;
}

interface VoterEntry {
  voter: Respuesta;
  opcionTexto: string; // ISO datetime del slot
}

export const DetalleResultados: React.FC<DetalleResultadosProps> = ({
  encuesta,
  onVolver,
  onEliminar,
  isDeleting,
  esCreador,
}) => {
  // Map<usuario_id, { voter, opcionTexto }> — solo para preguntas horario
  const [selectedVoters, setSelectedVoters] = useState<Map<number, VoterEntry>>(new Map());
  const [reunionModalVisible, setReunionModalVisible] = useState(false);

  const esEncuestaEnProgreso = () => {
    if (!encuesta.fecha_fin) return false;
    return new Date(encuesta.fecha_fin) > new Date();
  };

  const handleToggleVoter = useCallback((voter: Respuesta, opcionTexto: string) => {
    const uid = voter.usuario_id;
    if (!uid) return;
    setSelectedVoters((prev) => {
      const next = new Map(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.set(uid, { voter, opcionTexto });
      }
      return next;
    });
  }, []);

  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const puedeGestionarParticipantes = ROLES_GESTION.has(user?.rol_nombre ?? '');
  const [gestionModalVisible, setGestionModalVisible] = useState(false);
  const { mutate: eliminarOpcion } = useEliminarOpcion();

  const convocadosIds = new Set((encuesta.convocados ?? []).map(Number));
  const selectedVoterIds = new Set(selectedVoters.keys());
  const selectedCount = selectedVoters.size;
  const personasParaReunion = Array.from(selectedVoters.values());
  const puedeEliminarOpciones = esCreador && esEncuestaEnProgreso();

  const handleEliminarOpcion = useCallback((opcion: Opcion) => {
    Alert.alert(
      'Eliminar Opción',
      '¿Deseas eliminar esta opción de la pregunta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarOpcion(opcion.id, {
              onError: (error) => {
                Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
              },
            });
          },
        },
      ]
    );
  }, [eliminarOpcion]);

  const handleReunionSuccess = () => {
    setSelectedVoters(new Map());
    setReunionModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.detailHeaderContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={onVolver} style={styles.resultadosButton}>
          <Text style={styles.resultadosButtonText}>Resultados</Text>
        </TouchableOpacity>
        <View style={styles.detailTitleContainer}>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{encuesta.encuestaTitulo}</Text>
          {encuesta.es_anonima && (
            <View style={styles.anonimaBadgeSmall}>
              <Ionicons name="eye-off-outline" size={10} color={colors.secondaryText} />
              <Text style={styles.anonimaTextSmall}>Anónima</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {puedeGestionarParticipantes && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setGestionModalVisible(true)}
            >
              <Ionicons name="person-add-outline" size={22} color={colors.lightTint} />
            </TouchableOpacity>
          )}
          {esCreador ? (
            <TouchableOpacity onPress={onEliminar} style={styles.deleteButton} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteButton} />
          )}
        </View>
      </View>

      {encuesta.encuestaDescripcion && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.detailDescription}>{encuesta.encuestaDescripcion}</Text>
        </View>
      )}

      {esEncuestaEnProgreso() && (
        <View style={styles.enProgresoCartel}>
          <Ionicons name="time-outline" size={16} color={colors.componentBackground} />
          <Text style={styles.enProgresoText}>En progreso</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: insets.bottom + (selectedCount > 0 ? 90 : 16) },
        ]}
      >
        {encuesta.preguntas.map((item, index) => {
          const esHorario = item.pregunta.tipo_pregunta === 'horario';
          return (
            <View key={index} style={styles.preguntaResultadoCard}>
              <View style={styles.preguntaHeader}>
                <Text style={styles.preguntaNumero}>Pregunta {index + 1}</Text>
                <Text style={styles.tipoPreguntaBadge}>
                  {getTipoPreguntaLabel(item.pregunta.tipo_pregunta)}
                </Text>
              </View>

              <Text style={styles.preguntaTitulo}>{item.pregunta.titulo}</Text>

              <View style={styles.respuestasContainer}>
                <Text style={styles.respuestasHeader}>
                  Respuestas ({item.respuestas.length})
                </Text>

                {item.pregunta.tipo_pregunta === 'rating' && (
                  <RespuestasRating respuestas={item.respuestas} />
                )}

                {item.pregunta.tipo_pregunta === 'texto' && (
                  <RespuestasTexto respuestas={item.respuestas} />
                )}

                {(item.pregunta.tipo_pregunta === 'multiple_choice' || esHorario) && (
                  <RespuestasMultipleChoice
                    respuestas={item.respuestas}
                    pregunta={item.pregunta}
                    selectedVoterIds={esHorario ? selectedVoterIds : undefined}
                    convocadosIds={esHorario ? convocadosIds : undefined}
                    onToggleVoter={esHorario
                      ? (voter) => {
                          const opcion = item.pregunta.opcionesCompletas?.find(
                            (o) => o.id === voter.opcion_id
                          );
                          handleToggleVoter(voter, opcion?.texto_opcion ?? '');
                        }
                      : undefined}
                    onEliminarOpcion={puedeEliminarOpciones ? handleEliminarOpcion : undefined}
                  />
                )}

                {item.pregunta.tipo_pregunta === 'si_no' && (
                  <RespuestasSiNo respuestas={item.respuestas} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {selectedCount > 0 && (
        <TouchableOpacity
          style={[styles.reunionBar, { paddingBottom: insets.bottom + 14 }]}
          onPress={() => setReunionModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.componentBackground} />
          <Text style={styles.reunionBarText}>Solicitar reunión</Text>
          <View style={styles.reunionBarBadge}>
            <Text style={styles.reunionBarBadgeText}>{selectedCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      <ConvocarReunionModal
        visible={reunionModalVisible}
        encuestaId={encuesta.encuestaId}
        personas={personasParaReunion}
        onClose={() => setReunionModalVisible(false)}
        onSuccess={handleReunionSuccess}
      />

      <GestionParticipantesModal
        visible={gestionModalVisible}
        encuestaId={encuesta.encuestaId}
        participantesActuales={encuesta.participantes ?? []}
        onClose={() => setGestionModalVisible(false)}
      />
    </View>
  );
};
