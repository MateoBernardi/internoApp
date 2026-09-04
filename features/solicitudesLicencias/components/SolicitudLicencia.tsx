import { AlertModal } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DocsList } from '@/features/docs/components/DocsList';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useArchivoUrl, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { useAlertModal } from '@/features/solicitudesActividades/conversacion/hooks/useAlertModal';
import { conversacionStyles } from '@/features/solicitudesActividades/conversacion/styles';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { GlassButton } from '@/shared/ui/GlassButton';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstadoSolicitud } from '../models/SolicitudLicencia';
import { formatCantidadLicencia } from '../utils/formatCantidad';
import {
  useAdjuntarArchivo,
  useAprobarSolicitudLicencia,
  useCancelarSolicitudLicencia,
  useGetSolicitudesLicencias,
  useGetSolicitudesUsuario,
  useGetTiposLicencias,
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
  'EXPIRADA': 'Expirada',
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
    case 'Expirada':
      return '#757575';
    default:
      return '#757575';
  }
};

const colors = Colors['light'];

interface SolicitudLicenciaProps {
  solicitudId?: number;
  type?: 'enviada' | 'recibida';
  visible?: boolean;
  onClose?: () => void;
}

export function SolicitudLicencia(props?: SolicitudLicenciaProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const { user } = useAuth();
  const resolvedId = props?.solicitudId ?? Number.parseInt(params.id ?? '', 10);
  const resolvedType = props?.type ?? (params.type as 'enviada' | 'recibida' | undefined);
  const solicitudId = Number.isFinite(resolvedId) ? resolvedId : -1;
  const modalVisible = props?.visible ?? true;
  const handleClose = props?.onClose ?? (() => router.back());

  useEffect(() => {
    if (!modalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [modalVisible, handleClose]);

  // Fetch solicitudes from the correct source based on navigation type
  const { data: solicitudesAdmin } = useGetSolicitudesLicencias(
    resolvedType === 'recibida' ? {} : undefined
  );
  const { data: solicitudesUsuario } = useGetSolicitudesUsuario(
    resolvedType === 'enviada'
  );
  const { data: tiposLicencias } = useGetTiposLicencias();

  // Mutations
  const { mutate: aprobarSolicitud, isPending: isApproving } =
    useAprobarSolicitudLicencia();
  const { mutate: rechazarSolicitud, isPending: isRejecting } =
    useRechazarSolicitudLicencia();
  const { mutate: cancelarSolicitud, isPending: isCanceling } =
    useCancelarSolicitudLicencia();
  const { mutate: adjuntarArchivoMutation, isPending: isAdjuntando } = useAdjuntarArchivo();
  const { mutateAsync: uploadArchivoAsync } = useUploadArchivo();
  const { alertModal, showModal, closeAlert, onModalDismiss } = useAlertModal();

  // States
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationText, setObservationText] = useState('');
  const observationFocus = useFocusBorder();
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedArchivoId, setSelectedArchivoId] = useState<number | undefined>();
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Get archivo URL
  const { data: archivoUrl, isLoading: isLoadingUrl } = useArchivoUrl(selectedArchivoId);

  // Find solicitud from the correct data source
  const solicitudes = resolvedType === 'enviada' ? solicitudesUsuario : solicitudesAdmin;
  const solicitud = useMemo(
    () => solicitudes?.find((s) => s.id === solicitudId),
    [solicitudes, solicitudId]
  );

  const isFromReceivedView = resolvedType === 'recibida';
  const isFromSentView = resolvedType === 'enviada';
  const isCreator = solicitud?.usuario_id === user?.user_context_id;

  // Open file when URL is available
  React.useEffect(() => {
    if (archivoUrl && selectedArchivoId) {
      Linking.openURL(archivoUrl).catch((err) => {
        showModal('Error', 'No se pudo abrir el archivo');
        console.error('Error opening file:', err);
      });
      setSelectedArchivoId(undefined);
    }
  }, [archivoUrl, selectedArchivoId, showModal]);

  const handleOpenFile = useCallback((archivoId: number) => {
    setSelectedArchivoId(archivoId);
  }, []);

  const handleApprovePress = useCallback(() => {
    setActionType('approve');
    setObservationText('');
    setShowObservationModal(true);
  }, []);

  const confirmApprove = useCallback(() => {
    aprobarSolicitud(
      { solicitudId, observacion: observationText },
      {
        onSuccess: () => {
          setShowObservationModal(false);
          showModal('Éxito', 'Solicitud aprobada correctamente', [
            { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
          ]);
        },
        onError: (error: any) => {
          showModal('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, aprobarSolicitud, observationText, handleClose, showModal]);

  const handleRejectPress = useCallback(() => {
    setActionType('reject');
    setObservationText('');
    setShowObservationModal(true);
  }, []);

  const confirmReject = useCallback(() => {
    if (!observationText.trim()) {
      showModal('Error', 'Debes proporcionar una observación para rechazar');
      return;
    }

    rechazarSolicitud(
      { solicitudId, observacion: observationText },
      {
        onSuccess: () => {
          setShowObservationModal(false);
          showModal('Éxito', 'Solicitud rechazada correctamente', [
            { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
          ]);
        },
        onError: (error: any) => {
          showModal('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, rechazarSolicitud, observationText, handleClose, showModal]);

  const handleCancel = useCallback(() => {
    showModal('Cancelar solicitud', '¿Deseas cancelar esta solicitud?', [
      { key: 'no', label: 'No', onPress: () => { } },
      {
        key: 'yes',
        label: 'Sí, cancelar',
        variant: 'destructive',
        onPress: () => {
          cancelarSolicitud(solicitudId, {
            onSuccess: () => {
              showModal('Éxito', 'Solicitud cancelada', [
                { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
              ]);
            },
            onError: (error: any) => {
              showModal('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
            },
          });
        },
      },
    ]);
  }, [solicitudId, cancelarSolicitud, handleClose, showModal]);

  const handleUploadDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setIsUploadingDoc(true);
      try {
        const archivoSubido = await uploadArchivoAsync({
          item: [
            {
              archivo: {
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType ?? 'application/octet-stream',
                size: asset.size,
              },
              archivoData: {
                nombre: asset.name,
                tamaño: asset.size,
                tipo: asset.mimeType ?? 'application/octet-stream',
                uso: ArchivoUso.LICENCIA,
              },
            },
          ],
        });
        const archivoId = archivoSubido.exitosos?.[0]?.data?.id;
        if (!archivoId) {
          throw new Error('No se recibió información del archivo subido');
        }
        adjuntarArchivoMutation(
          {
            solicitudId,
            archivoId,
            // Key por adjunto: vive en las variables de la mutación, así los
            // reintentos automáticos reusan exactamente la misma.
            idempotencyKey: generateIdempotencyKey(),
          },
          {
            onSuccess: () => {
              setIsUploadingDoc(false);
              showModal('Éxito', 'Documento adjuntado correctamente.');
            },
            onError: () => {
              setIsUploadingDoc(false);
              showModal('Error', 'No se pudo adjuntar el documento.');
            },
          }
        );
      } catch {
        setIsUploadingDoc(false);
        showModal('Error', 'No se pudo subir el archivo.');
      }
    } catch {
      showModal('Error', 'No se pudo abrir el selector de archivos.');
    }
  }, [solicitudId, uploadArchivoAsync, adjuntarArchivoMutation, showModal]);

  const fechaInicio = solicitud ? new Date(solicitud.fecha_inicio) : new Date();
  const fechaFin = solicitud ? new Date(solicitud.fecha_fin) : new Date();

  if (!modalVisible) return null;

  if (!solicitud) {
    return (
      <FullScreenPortal>
      <View style={styles.fullScreen}>
        <View style={styles.keyboardContainer}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingBottom: bottomInset }]}>
            <View style={[conversacionStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={handleClose} style={conversacionStyles.backButton}>
                <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
              </TouchableOpacity>
            </View>
            <ActivityIndicator size="large" color={colors.lightTint} />
          </View>
        </View>
      </View>
      </FullScreenPortal>
    );
  }

  const estadoUI = estadoMapping[solicitud.estado];
  const isExpiredState = solicitud.estado === 'EXPIRADA';
  const isGerencia = user?.rol_nombre === 'gerencia';
  const canTakeAction =
    isFromReceivedView &&
    !isCreator &&
    ['PENDIENTE', 'PENDIENTE_APROBACION'].includes(solicitud.estado) &&
    !isExpiredState;
  const canApproveExpired = isFromReceivedView && !isCreator && isGerencia && isExpiredState;
  const isExpired = solicitud.fecha_fin ? new Date(solicitud.fecha_fin) < new Date() : false;
  const hasStarted = (() => {
    if (!solicitud.fecha_inicio) return false;
    const startMS = new Date(solicitud.fecha_inicio).getTime();
    if (Number.isNaN(startMS)) return false;
    return startMS <= Date.now();
  })();
  const canCancel =
    isFromSentView &&
    isCreator &&
    solicitud.estado !== 'CANCELADA' &&
    solicitud.estado !== 'CONSUMIDA' &&
    solicitud.estado !== 'RECHAZADA' &&
    !isExpired &&
    !isExpiredState &&
    !hasStarted;
  const tipoLicencia = tiposLicencias?.find((t) => t.id === solicitud.tipo_licencia_id);
  const canUploadDoc =
    (isCreator && solicitud.estado === 'PENDIENTE_DOCUMENTACION') ||
    (isGerencia && solicitud.estado === 'EXPIRADA' && !!tipoLicencia?.requiere_adjunto);

  return (
    <FullScreenPortal>
    <View style={styles.fullScreen}>
      <View style={styles.keyboardContainer}>
        <View style={[styles.container, { paddingBottom: bottomInset }]}>
          <View style={[conversacionStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={handleClose} style={conversacionStyles.backButton}>
              <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
            </TouchableOpacity>
            <Text style={[conversacionStyles.modalHeaderTitle, styles.headerTitleCentered]} numberOfLines={1}>
              {solicitud.tipo_nombre ?? 'Solicitud de Licencia'}
            </Text>
            <View style={[styles.headerSpacer, { pointerEvents: 'none' }]} />
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
                  <Ionicons name="time-outline" size={20} color={colors.lightTint} style={{ marginRight: 8 }} />
                  <ThemedText style={styles.dateSectionTitle}>
                    Período Solicitado
                  </ThemedText>
                </View>

                <View style={styles.dateRow}>
                  <ThemedText style={styles.dateValue}>
                    {fechaInicio ? `${fechaInicio.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}\n` : ''}
                    {fechaFin ? `${fechaFin.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
                  </ThemedText>
                </View>

              </View>

              {/* Solicitante */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.label}>
                  {resolvedType === 'enviada' ? 'Solicitante' : 'De'}
                </ThemedText>
                <View style={styles.userChip}>
                  <ThemedText style={{ color: colors.lightTint }}>
                    {solicitud.usuario_nombre} {solicitud.usuario_apellido}
                  </ThemedText>
                </View>
              </View>

              {/* Tipo de Licencia */}
              <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10 }]}>
                <View style={[styles.chip, { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}>
                  <ThemedText style={[styles.chipText, { color: colors.lightTint, fontWeight: 'bold' }]}>
                    {solicitud.tipo_nombre}
                  </ThemedText>
                </View>
              </View>

              {/* Cantidad */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.label}>Cantidad</ThemedText>
                <ThemedText style={styles.valueText}>
                  {formatCantidadLicencia(solicitud.cantidad_dias, solicitud.cantidad_horas)}
                </ThemedText>
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
                    {solicitud.aprobador_nombre && (
                      <View style={styles.historyItem}>
                        <ThemedText style={styles.historyLabel}>Respondido por:</ThemedText>
                        <ThemedText style={styles.historyValue}>
                          {solicitud.aprobador_nombre} {solicitud.aprobador_apellido}
                        </ThemedText>
                      </View>
                    )}

                    <View style={styles.historyItem}>
                      <ThemedText style={styles.historyLabel}>Respondido:</ThemedText>
                      <ThemedText style={styles.historyValue}>
                        {new Date(solicitud.fecha_respuesta).toLocaleDateString('es-ES')}
                      </ThemedText>
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
                    <DocsList
                      archivos={solicitud.archivos}
                      onOpen={handleOpenFile}
                    />
                  </View>
                </>
              )}

              {/* Upload documento pendiente */}
              {canUploadDoc && (
                <View style={styles.uploadSection}>
                  <ThemedText style={styles.uploadLabel}>
                    {solicitud.archivos && solicitud.archivos.length > 0
                      ? 'Podés agregar otro archivo si lo necesitás.'
                      : 'Esta solicitud requiere documentación adjunta.'}
                  </ThemedText>
                  <GlassButton
                    label="Adjuntar documento"
                    onPress={handleUploadDocument}
                    disabled={isUploadingDoc || isAdjuntando}
                    loading={isUploadingDoc}
                    icon={(color) => <Ionicons name="cloud-upload-outline" size={20} color={color} />}
                    style={styles.uploadBtn}
                  />
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            {(canTakeAction || canApproveExpired || canCancel) && (
              <View style={styles.footerActions}>
                {canTakeAction && (
                  <GlassButton
                    variant="danger"
                    label="Rechazar"
                    onPress={handleRejectPress}
                    disabled={isRejecting}
                    style={styles.footerActionBtn}
                  />
                )}

                {(canTakeAction || canApproveExpired) && (
                  <GlassButton
                    variant="success"
                    label="Aprobar"
                    onPress={handleApprovePress}
                    disabled={isApproving}
                    style={styles.footerActionBtn}
                  />
                )}

                {canCancel && (
                  <GlassButton
                    variant="danger"
                    label="Cancelar solicitud"
                    onPress={handleCancel}
                    disabled={isCanceling}
                    style={styles.footerActionBtn}
                  />
                )}
              </View>
            )}

            {/* Observation Modal */}
            <Modal
              visible={showObservationModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowObservationModal(false)}
            >
              <View style={glassStyles.modalOverlay}>
                <View style={[styles.observationModalContent, glassStyles.modalCard]}>
                  <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
                    {actionType === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                  </ThemedText>

                  <ThemedText style={{ marginBottom: 8, color: colors.secondaryText }}>
                    {actionType === 'approve'
                      ? 'Agregar observación (opcional)'
                      : 'Agregar observación (obligatorio)'}
                  </ThemedText>

                  <TextInput
                    placeholder={actionType === 'approve'
                      ? "Observación..."
                      : "Motivo del rechazo..."}
                    placeholderTextColor={colors.secondaryText}
                    value={observationText}
                    onChangeText={setObservationText}
                    onFocus={observationFocus.onFocus}
                    onBlur={observationFocus.onBlur}
                    multiline
                    numberOfLines={4}
                    style={[
                      glassStyles.fieldGlass,
                      styles.input,
                      focusBorderStyles.inputNoOutline,
                      observationFocus.isFocused && { borderColor: glassColors.link },
                    ]}
                  />

                  <View style={styles.modalActions}>
                    <GlassButton
                      variant="secondary"
                      label="Cancelar"
                      onPress={() => setShowObservationModal(false)}
                      style={styles.modalBtnCancel}
                    />

                    <GlassButton
                      variant={actionType === 'approve' ? 'success' : 'danger'}
                      label={actionType === 'approve' ? 'Aprobar' : 'Rechazar'}
                      onPress={actionType === 'approve' ? confirmApprove : confirmReject}
                      loading={isApproving || isRejecting}
                    />
                  </View>
                </View>
              </View>
            </Modal>
            <OperacionPendienteModal visible={isApproving || isRejecting || isCanceling || isAdjuntando} />
            <AlertModal {...alertModal} onClose={closeAlert} onDismiss={onModalDismiss} />
          </View>
        </View>
      </View>
    </FullScreenPortal>
  );
} const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.componentBackground,
    zIndex: 1000,
    elevation: 8,
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  // El título usa flex:1 entre el back button y este spacer del mismo ancho
  // (40, igual a conversacionStyles.backButton) para quedar centrado en toda
  // la barra, ya que este header solo tiene un ícono (a diferencia del de
  // chat, que tiene varios y por eso no se centra globalmente).
  headerTitleCentered: {
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
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
    borderBottomColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.background,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSectionTitle: {
    fontSize: 16,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateValue: {
    fontSize: 16,
    color: colors.lightTint,
  },
  inputSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.background,
  },
  label: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: colors.text,
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
    borderColor: colors.background,
  },
  chipText: {
    fontSize: 14,
  },
  messageSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.background,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.componentBackground,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondaryText,
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
    color: colors.secondaryText,
    fontWeight: '500',
  },
  historyValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  observationBox: {
    backgroundColor: colors.componentBackground,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  observationLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '600',
    marginBottom: 4,
  },
  observationValue: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  filesContainer: {
    padding: 16,
  },
  smallText: {
    fontSize: 11,
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.background,
  },
  footerActionBtn: {
    flex: 1,
  },
  observationModalContent: {
    width: '85%',
    padding: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalBtnCancel: {
    marginRight: 10,
  },
  input: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    color: colors.text,
  },
  uploadSection: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.background,
    gap: 12,
  },
  uploadLabel: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '600',
  },
  uploadBtn: {
    alignSelf: 'stretch',
  },
});