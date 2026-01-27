import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useArchivoUrl } from '@/features/docs/viewmodels/useArchivos';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EstadoSolicitud } from '../models/SolicitudLicencia';
import {
  useAprobarSolicitudLicencia,
  useCancelarSolicitudLicencia,
  useGetSolicitudesLicencias,
  useRechazarSolicitudLicencia,
} from '../viewmodels/useSolicitudes';

const estadoMapping: Record<EstadoSolicitud, string> = {
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Documentación',
  'PENDIENTE_APROBACION': 'Pendiente Aprobación',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
  'CONSUMIDA': 'Consumida',
};

const getEstadoColor = (estado: string): string => {
  switch (estado) {
    case 'Pendiente':
    case 'Pendiente Documentación':
    case 'Pendiente Aprobación':
      return '#FF9800';
    case 'Aprobada':
      return '#4CAF50';
    case 'Rechazada':
      return '#F44336';
    case 'Cancelada':
      return '#9C27B0';
    case 'Consumida':
      return '#2196F3';
    default:
      return '#757575';
  }
};

export function SolicitudLicencia() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { user } = useAuth();

  const solicitudId = parseInt(id || '0', 10);

  // Fetch solicitudes
  const { data: solicitudes } = useGetSolicitudesLicencias({});

  // Mutations
  const { mutate: aprobarSolicitud, isPending: isApproving } =
    useAprobarSolicitudLicencia();
  const { mutate: rechazarSolicitud, isPending: isRejecting } =
    useRechazarSolicitudLicencia();
  const { mutate: cancelarSolicitud, isPending: isCanceling } =
    useCancelarSolicitudLicencia();

  // States
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedArchivoId, setSelectedArchivoId] = useState<number | undefined>();

  // Get archivo URL
  const { data: archivoUrl, isLoading: isLoadingUrl } = useArchivoUrl(selectedArchivoId);

  // Find solicitud
  const solicitud = useMemo(
    () => solicitudes?.find((s) => s.id === solicitudId),
    [solicitudes, solicitudId]
  );

  const isFromReceivedView = type === 'recibida';
  const isFromSentView = type === 'enviada';
  const isCreator = solicitud?.usuario_id === user?.user_context_id;

  // Open file when URL is available
  React.useEffect(() => {
    if (archivoUrl && selectedArchivoId) {
      Linking.openURL(archivoUrl).catch((err) => {
        Alert.alert('Error', 'No se pudo abrir el archivo');
        console.error('Error opening file:', err);
      });
      setSelectedArchivoId(undefined);
    }
  }, [archivoUrl, selectedArchivoId]);

  const handleOpenFile = useCallback((archivoId: number) => {
    setSelectedArchivoId(archivoId);
  }, []);

  const handleApprovePress = useCallback(() => {
    setActionType('approve');
    setObservationText('');
    setShowObservationModal(true);
    setMenuOpen(false);
  }, []);

  const confirmApprove = useCallback(() => {
    aprobarSolicitud(
      { solicitudId, observacion: observationText },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Solicitud aprobada correctamente');
          setShowObservationModal(false);
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error instanceof Error
              ? error.message
              : 'No se pudo aprobar la solicitud'
          );
        },
      }
    );
  }, [solicitudId, aprobarSolicitud, observationText, router]);

  const handleRejectPress = useCallback(() => {
    setActionType('reject');
    setObservationText('');
    setShowObservationModal(true);
    setMenuOpen(false);
  }, []);

  const confirmReject = useCallback(() => {
    if (!observationText.trim()) {
      Alert.alert('Error', 'Debes proporcionar una observación para rechazar');
      return;
    }

    rechazarSolicitud(
      { solicitudId, observacion: observationText },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Solicitud rechazada correctamente');
          setShowObservationModal(false);
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error instanceof Error
              ? error.message
              : 'No se pudo rechazar la solicitud'
          );
        },
      }
    );
  }, [solicitudId, rechazarSolicitud, observationText, router]);

  const handleCancel = useCallback(() => {
    setMenuOpen(false);
    Alert.alert('Cancelar solicitud', '¿Deseas cancelar esta solicitud?', [
      { text: 'No', onPress: () => {} },
      {
        text: 'Sí, cancelar',
        onPress: () => {
          cancelarSolicitud(solicitudId, {
            onSuccess: () => {
              Alert.alert('Éxito', 'Solicitud cancelada');
              router.back();
            },
            onError: (error: any) => {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'No se pudo cancelar la solicitud'
              );
            },
          });
        },
        style: 'destructive',
      },
    ]);
  }, [solicitudId, cancelarSolicitud, router]);

  const fechaInicio = solicitud ? new Date(solicitud.fecha_inicio) : new Date();
  const fechaFin = solicitud ? new Date(solicitud.fecha_fin) : new Date();

  if (!solicitud) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const estadoUI = estadoMapping[solicitud.estado];
  const canTakeAction = isFromReceivedView && !isCreator && solicitud.estado === 'PENDIENTE';
  const canCancel = isFromSentView && isCreator && solicitud.estado !== 'CANCELADA';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#5f6368" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {type === 'enviada' ? 'Enviada' : 'Recibida'}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado Badge */}
        <View style={styles.estadoSection}>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoColor(estadoUI) + '20' },
            ]}
          >
            <ThemedText
              style={[
                styles.estadoText,
                { color: getEstadoColor(estadoUI) },
              ]}
            >
              {estadoUI}
            </ThemedText>
          </View>
        </View>

        {/* Horario */}
        <View style={styles.dateSection}>
          <View style={styles.switchRow}>
            <Ionicons name="time-outline" size={20} color="#1a73e8" style={{ marginRight: 8 }} />
            <ThemedText style={styles.dateSectionTitle}>
              Período Solicitado
            </ThemedText>
          </View>

          <View style={styles.dateRow}>
            <ThemedText style={styles.dateValue}>
              {fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </ThemedText>
          </View>

          <View style={styles.dateRow}>
            <ThemedText style={styles.dateValue}>
              {fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </ThemedText>
          </View>
        </View>

        {/* Solicitante */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>
            {type === 'enviada' ? 'Solicitante' : 'De'}
          </ThemedText>
          <View style={styles.userChip}>
            <ThemedText style={{ color: '#1a73e8' }}>
              {solicitud.usuario_nombre} {solicitud.usuario_apellido}
            </ThemedText>
          </View>
        </View>

        {/* Tipo de Licencia */}
        <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10 }]}>
          <View style={[styles.chip, { borderColor: '#1a73e8', backgroundColor: 'transparent', borderWidth: 1 }]}>
            <ThemedText style={[styles.chipText, { color: '#1a73e8', fontWeight: 'bold' }]}>
              {solicitud.tipo_nombre}
            </ThemedText>
          </View>
        </View>

        {/* Cantidad de Días */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>Cantidad de Días</ThemedText>
          <ThemedText style={styles.valueText}>{solicitud.cantidad_dias}</ThemedText>
        </View>

        {/* Observación del Solicitante */}
        {solicitud.observacion_solicitud && (
          <View style={styles.messageSection}>
            <ThemedText style={styles.label}>Observación del Solicitante</ThemedText>
            <ThemedText style={styles.messageText}>{solicitud.observacion_solicitud}</ThemedText>
          </View>
        )}

        {/* Historial */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Historial</ThemedText>
        </View>

        <View style={styles.historyContainer}>
          <View style={styles.historyItem}>
            <ThemedText style={styles.historyLabel}>Creado:</ThemedText>
            <ThemedText style={styles.historyValue}>
              {new Date(solicitud.created_at).toLocaleDateString('es-ES')}
            </ThemedText>
          </View>

          {solicitud.fecha_respuesta && (
            <>
              <View style={styles.historyItem}>
                <ThemedText style={styles.historyLabel}>Respondido:</ThemedText>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <ThemedText style={styles.historyValue}>
                    {new Date(solicitud.fecha_respuesta).toLocaleDateString('es-ES')}
                  </ThemedText>
                  {solicitud.aprobador_nombre && (
                    <ThemedText style={[styles.historySubValue, { color: '#5f6368' }]}>
                      por {solicitud.aprobador_nombre} {solicitud.aprobador_apellido}
                    </ThemedText>
                  )}
                </View>
              </View>

              {solicitud.observacion_respuesta && (
                <View style={styles.observationBox}>
                  <ThemedText style={styles.observationLabel}>Observación:</ThemedText>
                  <ThemedText style={styles.observationValue}>
                    {solicitud.observacion_respuesta}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </View>

        {/* Archivos Adjuntos */}
        {solicitud.archivos && solicitud.archivos.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Archivos Adjuntos</ThemedText>
            </View>
            <View style={styles.filesContainer}>
              {solicitud.archivos.map((archivo) => (
                <TouchableOpacity
                  key={archivo.id}
                  style={styles.fileItem}
                  onPress={() => handleOpenFile(archivo.id)}
                  disabled={isLoadingUrl && selectedArchivoId === archivo.id}
                >
                  {isLoadingUrl && selectedArchivoId === archivo.id ? (
                    <ActivityIndicator size="small" color="#1a73e8" />
                  ) : (
                    <Ionicons name="document-outline" size={20} color="#1a73e8" />
                  )}
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <ThemedText numberOfLines={1}>{archivo.nombre}</ThemedText>
                    <ThemedText style={[styles.smallText, { color: '#5f6368' }]}>
                      {(archivo.tamaño / 1024).toFixed(2)} KB
                    </ThemedText>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#5f6368" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer Actions (FABs) */}
      {(canTakeAction || canCancel) && (
        <View style={styles.fabContainer}>
          {/* Secondary Actions (Revealed via Menu) */}
          {menuOpen && (
            <>
              {canTakeAction && (
                <>
                  <TouchableOpacity
                    style={[styles.fab, { backgroundColor: '#d93025', marginRight: 16 }]}
                    onPress={handleRejectPress}
                    disabled={isRejecting}
                  >
                    {isRejecting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="close" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fab, { backgroundColor: '#4CAF50', marginRight: 16 }]}
                    onPress={handleApprovePress}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {canCancel && (
                <TouchableOpacity
                  style={[styles.fab, { backgroundColor: '#d93025', marginRight: 16 }]}
                  onPress={handleCancel}
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Menu Button */}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#5f6368' }]}
            onPress={() => setMenuOpen(!menuOpen)}
          >
            <Ionicons name={menuOpen ? "close" : "ellipsis-horizontal"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Observation Modal */}
      <Modal
        visible={showObservationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowObservationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
              {actionType === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
            </ThemedText>

            <ThemedText style={{ marginBottom: 8, color: '#5f6368' }}>
              {actionType === 'approve' 
                ? 'Agregar observación (opcional)' 
                : 'Agregar observación (obligatorio)'}
            </ThemedText>

            <TextInput
              placeholder={actionType === 'approve' 
                ? "Observación..." 
                : "Motivo del rechazo..."}
              placeholderTextColor="#5f6368"
              value={observationText}
              onChangeText={setObservationText}
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowObservationModal(false)}
                style={styles.modalBtnCancel}
              >
                <ThemedText style={{ color: '#d93025' }}>Cancelar</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={actionType === 'approve' ? confirmApprove : confirmReject}
                disabled={isApproving || isRejecting}
                style={[
                  styles.modalBtnConfirm,
                  { backgroundColor: actionType === 'approve' ? '#4CAF50' : '#d93025' }
                ]}
              >
                {(isApproving || isRejecting) ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
                    {actionType === 'approve' ? 'Aprobar' : 'Rechazar'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: '#1a73e8',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  estadoSection: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  estadoBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSectionTitle: {
    fontSize: 16,
    color: '#202124',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#1a73e8',
  },
  inputSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: '#202124',
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipText: {
    fontSize: 14,
  },
  messageSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    color: '#202124',
    lineHeight: 24,
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5f6368',
  },
  historyContainer: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  historyLabel: {
    fontSize: 13,
    color: '#5f6368',
    fontWeight: '500',
  },
  historyValue: {
    fontSize: 13,
    color: '#202124',
    fontWeight: '600',
    textAlign: 'right',
  },
  historySubValue: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  observationBox: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  observationLabel: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '600',
    marginBottom: 4,
  },
  observationValue: {
    fontSize: 13,
    color: '#202124',
    lineHeight: 18,
  },
  filesContainer: {
    padding: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  smallText: {
    fontSize: 11,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalBtnCancel: {
    padding: 10,
    marginRight: 10,
  },
  modalBtnConfirm: {
    backgroundColor: '#1a73e8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
});