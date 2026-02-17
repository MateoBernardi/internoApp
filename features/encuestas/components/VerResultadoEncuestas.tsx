import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pregunta, Respuesta } from '../models/Encuesta';
import { useGetRespuestasEncuesta } from '../viewmodels/useEncuestas';

interface RespuestaAgrupada {
  encuestaId: number;
  encuestaTitulo: string;
  encuestaDescripcion?: string;
  fecha_creacion?: string;
  fecha_fin?: string;
  es_anonima?: boolean;
  preguntas: {
    pregunta: Pregunta;
    respuestas: Respuesta[];
  }[];
}

const colors = Colors['light'];

export const VerResultadosEncuestas: React.FC = () => {
  // Usamos useGetRespuestasEncuesta para obtener las encuestas con sus respuestas
  const { data: encuestas, isLoading, error } = useGetRespuestasEncuesta();
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<number | null>(null);

  console.log('VerResultadosEncuestas - Datos recibidos:', {
    isLoading,
    hasData: !!encuestas,
    dataLength: encuestas?.length || 0,
    error: error?.message
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.lightTint} />
        <Text style={styles.loadingText}>Cargando resultados...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error al cargar resultados</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  if (!encuestas || encuestas.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No hay resultados disponibles</Text>
        <Text style={styles.emptySubtext}>
          Las encuestas completadas aparecerán aquí
        </Text>
      </View>
    );
  }

  // Agrupar respuestas por encuesta y pregunta
  const respuestasAgrupadas = encuestas && Array.isArray(encuestas) 
    ? agruparEncuestas(encuestas) 
    : [];

  if (respuestasAgrupadas.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No hay resultados disponibles</Text>
        <Text style={styles.emptySubtext}>
          Las encuestas completadas aparecerán aquí
        </Text>
      </View>
    );
  }

  if (encuestaSeleccionada !== null) {
    const encuesta = respuestasAgrupadas.find(
      (e) => e.encuestaId === encuestaSeleccionada
    );
    if (encuesta) {
      return (
        <DetalleResultados
          encuesta={encuesta}
          onVolver={() => setEncuestaSeleccionada(null)}
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resultados de Encuestas</Text>
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
            <Text style={styles.encuestaTitulo}>{item.encuestaTitulo}</Text>
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
}

const DetalleResultados: React.FC<DetalleResultadosProps> = ({
  encuesta,
  onVolver,
}) => {
  const esEncuestaEnProgreso = () => {
    if (!encuesta.fecha_fin) return false;
    return new Date(encuesta.fecha_fin) > new Date();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.volverButton} onPress={onVolver}>
          <Text style={styles.volverText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{encuesta.encuestaTitulo}</Text>
        {encuesta.encuestaDescripcion && (
          <Text style={styles.headerSubtitle}>{encuesta.encuestaDescripcion}</Text>
        )}
      </View>

      {esEncuestaEnProgreso() && (
        <View style={styles.enProgresoCartel}>
          <Text style={styles.enProgresoText}>⏳ En progreso</Text>
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
  const ratings = respuestas
    .filter((r) => r.valor_rating)
    .map((r) => r.valor_rating!);

  const promedio = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '0';

  const distribucion = [1, 2, 3, 4, 5].map((valor) => ({
    valor,
    cantidad: ratings.filter((r) => r === valor).length,
  }));

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
            </View>
          );
        })}
      </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.lightTint,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
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
    backgroundColor: colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
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