import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Pregunta, Respuesta } from '../models/Encuesta';
import { useEliminarEncuesta, useGetRespuestasEncuesta } from '../viewmodels/useEncuestas';

interface VerResultadosEncuestasProps {
  onVolver: () => void;
}

interface RespuestaAgrupada {
  encuestaId: number;
  encuestaTitulo: string;
  encuestaDescripcion?: string;
  fecha_creacion?: string;
  fecha_fin?: string;
  es_anonima?: boolean;
  creador_user_context_id?: number;
  created_by?: number;
  creador_nombre?: string;
  creador_apellido?: string;
  preguntas: {
    pregunta: Pregunta;
    respuestas: Respuesta[];
  }[];
}

const colors = Colors['light'];

export const VerResultadosEncuestas: React.FC<VerResultadosEncuestasProps> = ({ onVolver }) => {
  const { data: encuestas, isLoading, error, refetch } = useGetRespuestasEncuesta();
  const { mutate: eliminarEncuesta, isPending: isDeleting } = useEliminarEncuesta();
  const { user } = useAuth();
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<number | null>(null);

  const handleEliminarEncuesta = (encuestaId: number, titulo: string) => {
    Alert.alert(
      'Eliminar Encuesta',
      `¿Estás seguro de que deseas eliminar la encuesta "${titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarEncuesta(encuestaId, {
              onSuccess: () => {
                Alert.alert('Éxito', 'La encuesta ha sido eliminada correctamente');
                refetch();
              },
              onError: (error) => {
                Alert.alert('Error', 'No se pudo eliminar la encuesta. Verifica tus permisos.');
                console.error(error);
              },
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onVolver} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitleCentered}>Resultados</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.lightTint} />
          <Text style={styles.loadingText}>Cargando resultados...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onVolver} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitleCentered}>Resultados</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Error al cargar resultados</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!encuestas || encuestas.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onVolver} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitleCentered}>Resultados</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.emptyText}>No hay resultados disponibles</Text>
          <Text style={styles.emptySubtext}>
            Las encuestas completadas aparecerán aquí
          </Text>
        </View>
      </View>
    );
  }

  // Agrupar respuestas por encuesta y pregunta
  const respuestasAgrupadas = encuestas && Array.isArray(encuestas) 
    ? agruparEncuestas(encuestas) 
    : [];

  if (respuestasAgrupadas.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={onVolver} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitleCentered}>Resultados</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.emptyText}>No hay resultados disponibles</Text>
          <Text style={styles.emptySubtext}>
            Las encuestas completadas aparecerán aquí
          </Text>
        </View>
      </View>
    );
  }

  if (encuestaSeleccionada !== null) {
    const encuesta = respuestasAgrupadas.find(
      (e) => e.encuestaId === encuestaSeleccionada
    );
    if (encuesta) {
      const esCreador = user?.user_context_id === encuesta.created_by;
      return (
        <DetalleResultados
          encuesta={encuesta}
          onVolver={() => setEncuestaSeleccionada(null)}
          onEliminar={() => handleEliminarEncuesta(encuesta.encuestaId, encuesta.encuestaTitulo)}
          isDeleting={isDeleting}
          esCreador={esCreador}
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onVolver} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitleCentered}>Resultados</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.subHeader}>
        <Text style={styles.headerSubtitle}>
          {respuestasAgrupadas.length} encuesta
          {respuestasAgrupadas.length !== 1 ? 's' : ''} con respuestas
        </Text>
      </View>

      <FlatList
        data={respuestasAgrupadas}
        keyExtractor={(item) => item.encuestaId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.encuestaCard}
            onPress={() => setEncuestaSeleccionada(item.encuestaId)}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.encuestaTitulo}>{item.encuestaTitulo}</Text>
              {item.es_anonima && (
                <View style={styles.anonimaBadge}>
                  <Ionicons name="eye-off-outline" size={12} color={colors.secondaryText} />
                  <Text style={styles.anonimaText}>Anónima</Text>
                </View>
              )}
            </View>
            {item.creador_nombre && (
              <Text style={styles.creadorText}>
                Creada por: {item.creador_nombre} {item.creador_apellido}
              </Text>
            )}
            {item.encuestaDescripcion && (
              <Text style={styles.encuestaDescripcion} numberOfLines={2}>
                {item.encuestaDescripcion}
              </Text>
            )}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Preguntas</Text>
                <Text style={styles.statValue}>{item.preguntas.length}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Respuestas</Text>
                <Text style={styles.statValue}>
                  {calcularTotalRespuestas(item)}
                </Text>
              </View>
            </View>
            <View style={styles.verDetalleButton}>
              <Text style={styles.verDetalleText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.componentBackground} />
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Componente para mostrar el detalle de resultados de una encuesta
interface DetalleResultadosProps {
  encuesta: RespuestaAgrupada;
  onVolver: () => void;
  onEliminar: () => void;
  isDeleting: boolean;
  esCreador: boolean;
}

const DetalleResultados: React.FC<DetalleResultadosProps> = ({
  encuesta,
  onVolver,
  onEliminar,
  isDeleting,
  esCreador,
}) => {
  const esEncuestaEnProgreso = () => {
    if (!encuesta.fecha_fin) return false;
    return new Date(encuesta.fecha_fin) > new Date();
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailHeaderContainer}>
        <TouchableOpacity onPress={onVolver} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
        {esCreador ? (
          <TouchableOpacity 
            onPress={onEliminar} 
            style={styles.deleteButton}
            disabled={isDeleting}
          >
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
        {encuesta.preguntas.map((item, index) => (
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

              {item.pregunta.tipo_pregunta === 'multiple_choice' && (
                <RespuestasMultipleChoice
                  respuestas={item.respuestas}
                  pregunta={item.pregunta}
                />
              )}

              {item.pregunta.tipo_pregunta === 'si_no' && (
                <RespuestasSiNo respuestas={item.respuestas} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// Componentes para mostrar respuestas según el tipo
const RespuestasRating: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
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
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Votaron {ratingSeleccionado}★
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {respuestasRatingSeleccionado.length > 0 ? (
                  respuestasRatingSeleccionado.map((respuesta, index) => (
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
      )}
    </View>
  );
};

const RespuestasTexto: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
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

const RespuestasMultipleChoice: React.FC<{
  respuestas: Respuesta[];
  pregunta: Pregunta;
}> = ({ respuestas, pregunta }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
  const esAnonima = respuestas[0]?.nombre === undefined || respuestas[0]?.nombre === null;

  const opcionesCount = new Map<number, number>();
  const respuestasPorOpcion = new Map<number, Respuesta[]>();

  respuestas.forEach((r) => {
    if (r.opcion_id) {
      opcionesCount.set(r.opcion_id, (opcionesCount.get(r.opcion_id) || 0) + 1);
      if (!respuestasPorOpcion.has(r.opcion_id)) {
        respuestasPorOpcion.set(r.opcion_id, []);
      }
      respuestasPorOpcion.get(r.opcion_id)!.push(r);
    }
  });

  const abrirModal = (opcionId: number) => {
    setOpcionSeleccionada(opcionId);
    setModalVisible(true);
  };

  const respuestasOpcionSeleccionada = opcionSeleccionada ? respuestasPorOpcion.get(opcionSeleccionada) || [] : [];
  const opcionSeleccionadaNombre = pregunta.opcionesCompletas?.find(o => o.id === opcionSeleccionada)?.texto_opcion || '';

  return (
    <View>
      {pregunta.opcionesCompletas?.map((opcion) => {
        const cantidad = opcionesCount.get(opcion.id) || 0;
        const porcentaje = respuestas.length
          ? ((cantidad / respuestas.length) * 100).toFixed(0)
          : '0';

        return (
          <View key={opcion.id}>
            <View style={styles.opcionResultadoCard}>
              <Text style={styles.opcionTexto}>{opcion.texto_opcion}</Text>
              <View style={styles.opcionStatsWrapper}>
                <View style={styles.opcionStats}>
                  <View
                    style={[
                      styles.opcionBarra,
                      { 
                        width: `${porcentaje}%` as any,
                        minWidth: cantidad > 0 ? 30 : 0 
                      },
                    ]}
                  />
                  <Text style={styles.opcionPorcentaje}>
                    {cantidad} ({porcentaje}%)
                  </Text>
                </View>
                {!esAnonima && cantidad > 0 && (
                  <TouchableOpacity
                    style={styles.verRespondentesButtonInline}
                    onPress={() => abrirModal(opcion.id)}
                  >
                    <Text style={styles.verRespondentesText}>Ver</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {!esAnonima && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Usuarios: {opcionSeleccionadaNombre}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {respuestasOpcionSeleccionada.length > 0 ? (
                  respuestasOpcionSeleccionada.map((respuesta, index) => (
                    <TouchableOpacity key={index} style={styles.respondentCard}>
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
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.respondentEmpty}>No hay respuestas</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const RespuestasSiNo: React.FC<{ respuestas: Respuesta[] }> = ({ respuestas }) => {
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
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {tipoSeleccionado === 'Si' ? '✓ Respondieron Sí' : '✗ Respondieron No'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {respuestasSeleccionadas.length > 0 ? (
                  respuestasSeleccionadas.map((respuesta, index) => (
                    <TouchableOpacity key={index} style={styles.respondentCard}>
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
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.respondentEmpty}>No hay respuestas</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// Funciones auxiliares
const agruparEncuestas = (encuestas: any[]): RespuestaAgrupada[] => {
  if (!encuestas || !Array.isArray(encuestas)) {
    console.log('agruparEncuestas: No hay encuestas');
    return [];
  }

  console.log('agruparEncuestas - Encuestas recibidas:', encuestas.length);

  return encuestas
    .filter((encuesta) => encuesta.preguntas && encuesta.preguntas.length > 0)
    .map((encuesta) => {
      const preguntasAgrupadas = encuesta.preguntas?.map((pregunta: any) => ({
        pregunta: pregunta as Pregunta,
        respuestas: pregunta.respuestas || [], // Las respuestas vienen directamente del backend
      })) || [];

      console.log(`Encuesta ${encuesta.titulo}: ${preguntasAgrupadas.length} preguntas agrupadas`);

      return {
        encuestaId: encuesta.id,
        encuestaTitulo: encuesta.titulo,
        encuestaDescripcion: encuesta.descripcion,
        fecha_creacion: encuesta.fecha_creacion,
        fecha_fin: encuesta.fecha_fin,
        es_anonima: encuesta.es_anonima,
        creador_user_context_id: encuesta.creador_user_context_id,
        created_by: encuesta.created_by,
        creador_nombre: encuesta.creador_nombre,
        creador_apellido: encuesta.creador_apellido,
        preguntas: preguntasAgrupadas,
      };
    });
};

const calcularTotalRespuestas = (encuesta: RespuestaAgrupada): number => {
  return encuesta.preguntas.reduce((total, p) => total + p.respuestas.length, 0);
};

const getTipoPreguntaLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    rating: '⭐ Rating',
    texto: '📝 Texto',
    multiple_choice: '☑️ Opción múltiple',
    si_no: '✓/✗ Sí/No',
  };
  return labels[tipo] || tipo;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    paddingBottom: '20%' as any,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCentered: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  detailHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  detailTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detailDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.lightTint,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.componentBackground,
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  anonimaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  anonimaText: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  anonimaBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  anonimaTextSmall: {
    fontSize: 10,
    color: colors.secondaryText,
  },
  header: {
    backgroundColor: colors.componentBackground,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  volverButton: {
    marginBottom: 15,
  },
  volverText: {
    fontSize: 16,
    color: colors.lightTint,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 50,
  },
  encuestaCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  encuestaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  creadorText: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  encuestaDescripcion: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.lightTint,
  },
  verDetalleButton: {
    flexDirection: 'row',
    backgroundColor: colors.lightTint,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verDetalleText: {
    color: colors.componentBackground,
    fontSize: 14,
    fontWeight: '600',
  },
  preguntaResultadoCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preguntaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  preguntaNumero: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightTint,
  },
  tipoPreguntaBadge: {
    fontSize: 12,
    color: colors.secondaryText,
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  preguntaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  respuestasContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  respuestasHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 15,
  },
  promedioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.componentBackground,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  promedioLabel: {
    fontSize: 16,
    color: colors.secondaryText,
    marginRight: 10,
  },
  promedioValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.warning,
  },
  distribucionContainer: {
    gap: 8,
  },
  distribucionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distribucionValor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    width: 30,
  },
  barraContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.componentBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    backgroundColor: colors.warning,
  },
  distribucionCantidad: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 30,
    textAlign: 'right',
  },
  respuestaTextoCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  respuestaTextoContenido: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  respuestaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  respuestaAutor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightTint,
  },
  respuestaFecha: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  opcionResultadoCard: {
    marginBottom: 12,
  },
  opcionStatsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  opcionTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  opcionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flex: 1,
  },
  opcionBarra: {
    height: 24,
    backgroundColor: colors.lightTint,
    borderRadius: 4,
    maxWidth: '80%',
  },
  opcionPorcentaje: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    minWidth: 60,
  },
  siNoResultadosContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  siNoItem: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  siNoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 8,
  },
  siNoValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.lightTint,
  },
  siNoModalButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.lightTint,
    borderRadius: 6,
    alignItems: 'center',
  },
  siNoModalButtonText: {
    color: colors.componentBackground,
    fontSize: 12,
    fontWeight: '600',
  },
  verRespondentesButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: -8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.lightTint,
    borderRadius: 6,
    alignItems: 'center',
  },
  verRespondentesButtonInline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.lightTint,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verRespondentesText: {
    color: colors.componentBackground,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: '20%' as any,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    fontSize: 24,
    color: colors.secondaryText,
  },
  modalScroll: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  respondentCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  respondentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  respondentInfo: {
    flex: 1,
  },
  respondentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  respondentDate: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  respondentArrow: {
    fontSize: 20,
    color: colors.lightTint,
    marginLeft: 10,
  },
  respondentEmpty: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: 20,
  },
  enProgresoCartel: {
    flexDirection: 'row',
    backgroundColor: colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enProgresoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.componentBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.secondaryText,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 5,
  },
});