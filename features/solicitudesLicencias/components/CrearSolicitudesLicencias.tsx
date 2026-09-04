import { AlertModal } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { useAlertModal } from '@/features/solicitudesActividades/conversacion/hooks/useAlertModal';
import { conversacionStyles } from '@/features/solicitudesActividades/conversacion/styles';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type * as ImagePickerTypes from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    ScrollView,
    StyleSheet,
    Switch,
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
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateSolicitudDTO } from '../models/SolicitudLicencia';
import {
    useAdjuntarArchivo,
    useCreateSolicitudLicencia,
    useGetSaldosLicencias,
    useGetTiposLicencias,
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

// expo-image-picker se carga de forma perezosa: en algunos entornos (web/SSR)
// el módulo nativo no está disponible y `require` lanza.
let ImagePicker: typeof ImagePickerTypes | null = null;
try {
    ImagePicker = require('expo-image-picker');
} catch {
    console.warn('expo-image-picker no disponible. La cámara estará deshabilitada.');
}

function normalizeToMinute(date: Date): Date {
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);
    return normalized;
}

/** Modo de cantidad: días u horas */
type CantidadMode = 'dias' | 'horas';

/** Texto legible para la cantidad de días seleccionada */
function formatDiasLabel(wholeDays: number, halfDay: boolean): string {
    const total = wholeDays + (halfDay ? 0.5 : 0);
    if (total === 0) return '0 días';
    if (total === 0.5) return 'Medio día';
    if (total === 1) return '1 día';
    if (halfDay) return `${wholeDays} día${wholeDays !== 1 ? 's' : ''} y medio`;
    return `${wholeDays} días`;
}

interface CrearSolicitudesLicenciasProps {
    visible?: boolean;
    onClose?: () => void;
}

export function CrearSolicitudesLicencias(props?: CrearSolicitudesLicenciasProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomInset = useSafeBottomInset();
    const modalVisible = props?.visible ?? true;
    const handleClose = props?.onClose ?? (() => router.back());

    // --- Estado del formulario ---
    const [tipoLicenciaId, setTipoLicenciaId] = useState<number | null>(null);
    const [showTipoLicenciaModal, setShowTipoLicenciaModal] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Cantidad — Días
    const [wholeDays, setWholeDays] = useState(0);
    const [halfDay, setHalfDay] = useState(false);

    // Cantidad — Horas
    const [horas, setHoras] = useState(0);

    // Modo cantidad (solo visible si !requiere_saldo)
    const [cantidadMode, setCantidadMode] = useState<CantidadMode>('dias');

    const [observacion, setObservacion] = useState('');
    const observacionFocus = useFocusBorder();
    const [archivoAdjunto, setArchivoAdjunto] = useState<{ name: string; uri: string; type: string; size?: number } | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const isSubmittingRef = useRef(false);
    const idempotencyKeyRef = useRef(generateIdempotencyKey());

    // --- Hooks de Datos ---
    const { data: tiposLicencias, isLoading: isLoadingTipos, isError: isErrorTipos } = useGetTiposLicencias();
    const { data: saldosLicencias, isLoading: isLoadingSaldos } = useGetSaldosLicencias();
    const { mutate: crearSolicitud, isPending } = useCreateSolicitudLicencia();
    const { mutate: adjuntarArchivoMutation, isPending: isAdjuntando } = useAdjuntarArchivo();
    const { mutateAsync: uploadArchivo } = useUploadArchivo();
    const { alertModal, showModal, closeAlert, onModalDismiss } = useAlertModal();

    // --- Derivados ---
    const selectedTipo = useMemo(() =>
        tiposLicencias?.find((t) => t.id === tipoLicenciaId),
        [tiposLicencias, tipoLicenciaId]);

    /** El modo efectivo: si requiere saldo, siempre es días */
    const effectiveMode = useMemo<CantidadMode>(() =>
        selectedTipo?.requiere_saldo ? 'dias' : cantidadMode,
        [selectedTipo, cantidadMode]);

    const cantidadDias = useMemo(() => wholeDays + (halfDay ? 0.5 : 0), [wholeDays, halfDay]);

    const saldoCorrespondiente = useMemo(() => {
        const ausencias = saldosLicencias?.ausencias;
        if (!ausencias || ausencias.length === 0) return null;
        if (!tipoLicenciaId) {
            return ausencias.length === 1 ? ausencias[0] : null;
        }

        const porTipo = ausencias.find(s => s.tipo_licencia_id === tipoLicenciaId);
        if (porTipo) return porTipo;

        // Fallback para respuestas con un unico saldo sin tipo_licencia_id.
        return ausencias.length === 1 ? ausencias[0] : null;
    }, [tipoLicenciaId, saldosLicencias]);

    // Franco Compensatorio: saldo puramente informativo (no restringe la creación).
    const franco = saldosLicencias?.francos;
    const esFranco = selectedTipo?.codigo === 'FRANCO';

    const saldoDisponible = useMemo(() => {
        if (!saldoCorrespondiente) return 0;

        if (typeof saldoCorrespondiente.dias_disponibles === 'number' && Number.isFinite(saldoCorrespondiente.dias_disponibles)) {
            return saldoCorrespondiente.dias_disponibles;
        }

        return saldoCorrespondiente.dias_otorgados - saldoCorrespondiente.dias_consumidos;
    }, [saldoCorrespondiente]);

    const now = normalizeToMinute(new Date());
    const isFechaInicioMissing = !fechaInicio;
    const isFechaInicioPast = !!fechaInicio && normalizeToMinute(fechaInicio) < now;
    const dateErrorMessage = useMemo(() => {
        if (isFechaInicioMissing) return 'Seleccioná fecha y hora de inicio.';
        if (isFechaInicioPast) return 'La fecha seleccionada es menor a la actual.';
        return null;
    }, [isFechaInicioMissing, isFechaInicioPast]);

    const isFormValid = useMemo(() => {
        if (!tipoLicenciaId) return false;
        if (dateErrorMessage) return false;
        if (effectiveMode === 'dias' && cantidadDias <= 0) return false;
        if (effectiveMode === 'horas' && horas <= 0) return false;
        if (selectedTipo?.requiere_saldo && saldoDisponible < cantidadDias) return false;
        if (isPending || isAdjuntando) return false;
        return true;
    }, [tipoLicenciaId, dateErrorMessage, effectiveMode, cantidadDias, horas, selectedTipo, saldoDisponible, isPending, isAdjuntando]);

    // --- Handlers Fecha ---
    const onDateConfirm = useCallback((selectedDate: Date) => {
        setFechaInicio(normalizeToMinute(selectedDate));
        setShowDatePicker(false);
        setShowTimePicker(false);
    }, []);

    const onTimeConfirm = useCallback((selectedTime: Date) => {
        const updated = new Date(fechaInicio ?? new Date());
        updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        setFechaInicio(normalizeToMinute(updated));
        setShowDatePicker(false);
        setShowTimePicker(false);
    }, [fechaInicio]);

    // --- Handlers Stepper ---
    const incrementDays = useCallback(() => setWholeDays(prev => Math.min(prev + 1, 60)), []);
    const decrementDays = useCallback(() => setWholeDays(prev => Math.max(prev - 1, 0)), []);

    const incrementHours = useCallback(() => setHoras(prev => Math.min(prev + 0.5, 99)), []);
    const decrementHours = useCallback(() => setHoras(prev => Math.max(prev - 0.5, 0)), []);

    // --- Handler cambio de modo ---
    const handleModeChange = useCallback((mode: CantidadMode) => {
        setCantidadMode(mode);
        // Resetear ambos valores al cambiar de modo
        setWholeDays(0);
        setHalfDay(false);
        setHoras(0);
    }, []);

    // --- Selección de Archivo ---
    const handleSeleccionarArchivo = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'image/jpeg', 'image/png'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setArchivoAdjunto({
                name: asset.name,
                uri: asset.uri,
                type: asset.mimeType ?? 'application/octet-stream',
                size: asset.size,
            });
        } catch {
            showModal('Error', 'No se pudo seleccionar el archivo.');
        }
    }, [showModal]);

    // --- Tomar Foto (cámara) ---
    const handleTomarFoto = useCallback(async () => {
        if (!ImagePicker) {
            showModal('No disponible', 'La cámara no está disponible en este dispositivo.');
            return;
        }
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showModal('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            const ext = asset.uri.split('.').pop() ?? 'jpg';
            setArchivoAdjunto({
                name: asset.fileName ?? `foto_${Date.now()}.${ext}`,
                uri: asset.uri,
                type: asset.mimeType ?? `image/${ext}`,
                size: asset.fileSize,
            });
        }
    }, [showModal]);

    // --- Menú de adjunto (cámara / archivo), igual que en Chats ---
    const handleAgregarAdjunto = useCallback(() => {
        Alert.alert('Adjuntar documentación', 'Elegí una opción', [
            { text: 'Tomar foto', onPress: handleTomarFoto },
            { text: 'Elegir archivo', onPress: handleSeleccionarArchivo },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    }, [handleTomarFoto, handleSeleccionarArchivo]);

    // --- Crear Solicitud ---
    const procederCrearSolicitud = useCallback(() => {
        if (isPending || isSubmittingRef.current) return;
        if (!tipoLicenciaId) return;
        if (!fechaInicio) {
            showModal('La fecha de inicio es requerida.');
            return;
        }

        isSubmittingRef.current = true;

        const payload: CreateSolicitudDTO = {
            tipo_licencia_id: tipoLicenciaId!,
            fecha_inicio: fechaInicio.toISOString(),
            observacion: observacion.trim() || undefined,
        };

        if (effectiveMode === 'dias') {
            payload.cantidad_dias = cantidadDias > 0 ? cantidadDias : null;
        } else if (effectiveMode === 'horas') {
            payload.cantidad_horas = horas > 0 ? horas : null;
        }

        crearSolicitud({ ...payload, idempotencyKey: idempotencyKeyRef.current }, {
            onSuccess: async (nuevaSolicitud: any) => {
                idempotencyKeyRef.current = generateIdempotencyKey();
                if (archivoAdjunto && nuevaSolicitud?.id) {
                    setIsUploadingFile(true);
                    try {
                        const archivoSubido = await uploadArchivo({
                            item: [
                                {
                                    archivo: {
                                        uri: archivoAdjunto.uri,
                                        name: archivoAdjunto.name,
                                        type: archivoAdjunto.type,
                                        size: archivoAdjunto.size,
                                    },
                                    archivoData: {
                                        nombre: archivoAdjunto.name,
                                        tamaño: archivoAdjunto.size,
                                        tipo: archivoAdjunto.type,
                                        uso: ArchivoUso.LICENCIA,
                                    },
                                },
                            ],
                        });
                        const archivosSubidos = archivoSubido?.exitosos;
                        if (!archivosSubidos || archivosSubidos.length === 0) {
                            setIsUploadingFile(false);
                            showModal(
                                'Solicitud creada',
                                'La solicitud fue creada pero no se pudo obtener el archivo para adjuntarlo.',
                                [{ key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' }]
                            );
                            return;
                        }
                        adjuntarArchivoMutation(
                            { solicitudId: nuevaSolicitud.id, archivoId: archivosSubidos[0].data?.id! },
                            {
                                onSuccess: () => {
                                    setIsUploadingFile(false);
                                    showModal('Éxito', 'Solicitud enviada con archivo adjunto.', [
                                        { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
                                    ]);
                                },
                                onError: () => {
                                    setIsUploadingFile(false);
                                    showModal('Solicitud creada', 'La solicitud fue creada pero no se pudo adjuntar el archivo. Podés adjuntarlo desde el detalle.', [
                                        { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
                                    ]);
                                },
                            }
                        );
                    } catch {
                        setIsUploadingFile(false);
                        showModal('Solicitud creada', 'La solicitud fue creada pero no se pudo subir el archivo. Podés adjuntarlo desde el detalle.', [
                            { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
                        ]);
                    }
                } else {
                    showModal('Éxito', 'Solicitud enviada correctamente.', [
                        { key: 'ok', label: 'Aceptar', onPress: handleClose, variant: 'primary' },
                    ]);
                }
            },
            onError: (err: any) => {
                isSubmittingRef.current = false;
                showModal('Error', err?.message || 'Intenta nuevamente');
            },
        });
    }, [isPending, crearSolicitud, tipoLicenciaId, fechaInicio, effectiveMode, cantidadDias, horas, observacion, archivoAdjunto, uploadArchivo, adjuntarArchivoMutation, handleClose, showModal]);

    const handleCrearSolicitud = useCallback(() => {
        if (!isFormValid || isPending) return;
        if (selectedTipo?.requiere_adjunto && !archivoAdjunto) {
            showModal(
                'Adjunto Requerido',
                'Esta solicitud requiere documentación. Si continuás sin adjuntarla, quedará en estado "Pendiente Documentación".',
                [
                    { key: 'cancel', label: 'Cancelar', onPress: () => { } },
                    { key: 'confirm', label: 'Crear sin adjunto', onPress: procederCrearSolicitud, variant: 'destructive' },
                ]
            );
        } else {
            procederCrearSolicitud();
        }
    }, [isFormValid, isPending, selectedTipo, archivoAdjunto, procederCrearSolicitud, showModal]);

    const isSubmitting = isPending || isUploadingFile || isAdjuntando;

    useEffect(() => {
        if (!modalVisible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });
        return () => sub.remove();
    }, [modalVisible, handleClose]);

    if (!modalVisible) return null;

    // ==================== RENDER ====================
    return (
        <FullScreenPortal>
        <View style={styles.fullScreen}>
                <ModalKeyboardView style={styles.keyboardContainer}>
                    <View style={[styles.container, { paddingBottom: bottomInset }]}>
                        <View style={[conversacionStyles.modalHeader, { paddingTop: insets.top + 10, alignItems: 'flex-start' }]}>
                            <TouchableOpacity onPress={handleClose} style={conversacionStyles.backButton}>
                                <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.content}
                            contentContainerStyle={{ paddingBottom: 120 }}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            showsVerticalScrollIndicator={false}
                        >

                            {/* ── Tipo de Licencia ── */}
                            <View style={styles.sectionCard}>
                                <TouchableOpacity onPress={() => setShowTipoLicenciaModal(!showTipoLicenciaModal)} style={styles.selectInput}>
                                    <ThemedText style={[styles.selectText, !tipoLicenciaId && { color: colors.icon }]}>
                                        {selectedTipo?.nombre || 'Seleccionar tipo de licencia'}
                                    </ThemedText>
                                    <Ionicons name={showTipoLicenciaModal ? "chevron-up" : "chevron-down"} size={20} color={colors.icon} />
                                </TouchableOpacity>

                                {showTipoLicenciaModal && (
                                    <View style={styles.dropdownList}>
                                        {isLoadingTipos ? (
                                            <ActivityIndicator size="small" color={colors.lightTint} style={{ margin: 20 }} />
                                        ) : isErrorTipos ? (
                                            <ThemedText style={styles.errorText}>Intenta nuevamente</ThemedText>
                                        ) : (
                                            tiposLicencias?.map((tipo) => (
                                                <TouchableOpacity
                                                    key={tipo.id}
                                                    onPress={() => {
                                                        setTipoLicenciaId(tipo.id);
                                                        setShowTipoLicenciaModal(false);
                                                        setCantidadMode('dias');
                                                        setWholeDays(0);
                                                        setHalfDay(false);
                                                        setHoras(0);
                                                    }}
                                                    style={[styles.dropdownItem, tipoLicenciaId === tipo.id && styles.activeItem]}
                                                >
                                                    <ThemedText style={tipoLicenciaId === tipo.id ? styles.activeItemText : {}}>{tipo.nombre}</ThemedText>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* ── Fecha de Inicio ── */}
                            <View style={styles.sectionCard}>
                                <View style={styles.rowInfo}>
                                    <ThemedText style={styles.sectionLabel}>Fecha de Inicio</ThemedText>
                                </View>

                                <View style={styles.dateRow}>
                                    <TouchableOpacity onPress={() => {
                                        setShowTimePicker(false);
                                        setShowDatePicker(true);
                                    }} style={styles.dateButton}>
                                        <ThemedText style={styles.dateValue}>
                                            {fechaInicio
                                                ? fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                                : 'Seleccionar fecha'}
                                        </ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => {
                                        setShowDatePicker(false);
                                        setShowTimePicker(true);
                                    }} style={styles.timeButton}>
                                        <ThemedText style={[styles.dateValue, styles.timeValue]}>
                                            {fechaInicio
                                                ? fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                                : 'Seleccionar hora'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>

                                {dateErrorMessage && (
                                    <ThemedText style={styles.errorTextInline}>{dateErrorMessage}</ThemedText>
                                )}
                            </View>

                            {/* ── Cantidad ── */}
                            {tipoLicenciaId && (
                                <View style={styles.sectionCard}>
                                    <View style={styles.rowInfo}>
                                        <ThemedText style={styles.sectionLabel}>Cantidad</ThemedText>
                                    </View>

                                    {/* Toggle días/horas — solo si NO requiere saldo */}
                                    {!selectedTipo?.requiere_saldo && (
                                        <View style={styles.modeToggleContainer}>
                                            <TouchableOpacity
                                                style={[styles.modeToggleBtn, effectiveMode === 'dias' && styles.modeToggleBtnActive]}
                                                onPress={() => handleModeChange('dias')}
                                            >
                                                <ThemedText style={[styles.modeToggleText, effectiveMode === 'dias' && styles.modeToggleTextActive]}>
                                                    Días
                                                </ThemedText>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.modeToggleBtn, effectiveMode === 'horas' && styles.modeToggleBtnActive]}
                                                onPress={() => handleModeChange('horas')}
                                            >
                                                <ThemedText style={[styles.modeToggleText, effectiveMode === 'horas' && styles.modeToggleTextActive]}>
                                                    Horas
                                                </ThemedText>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* ─── Stepper de DÍAS ─── */}
                                    {effectiveMode === 'dias' && (
                                        <View style={styles.stepperSection}>
                                            <View style={styles.stepperRow}>
                                                <TouchableOpacity
                                                    onPress={decrementDays}
                                                    style={[styles.stepperButton, wholeDays <= 0 && styles.stepperButtonDisabled]}
                                                    disabled={wholeDays <= 0}
                                                >
                                                    <Ionicons name="remove" size={22} color={wholeDays <= 0 ? colors.secondaryText : colors.lightTint} />
                                                </TouchableOpacity>

                                                <View style={styles.stepperValueContainer}>
                                                    <ThemedText style={styles.stepperValue}>{wholeDays}</ThemedText>
                                                    <ThemedText style={styles.stepperUnit}>día{wholeDays !== 1 ? 's' : ''}</ThemedText>
                                                </View>

                                                <TouchableOpacity
                                                    onPress={incrementDays}
                                                    style={styles.stepperButton}
                                                >
                                                    <Ionicons name="add" size={22} color={colors.lightTint} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Toggle medio día */}
                                            <View style={styles.halfDayRow}>
                                                <ThemedText style={styles.halfDayLabel}>Incluir medio día (+½)</ThemedText>
                                                <Switch
                                                    value={halfDay}
                                                    onValueChange={setHalfDay}
                                                    trackColor={{ false: colors.background, true: colors.lightTint + '40' }}
                                                    thumbColor={halfDay ? colors.lightTint : colors.secondaryText}
                                                />
                                            </View>

                                            {/* Resumen */}
                                            <View style={styles.summaryContainer}>
                                                <ThemedText style={styles.summaryText}>
                                                    Total:{' '}
                                                    <ThemedText type="defaultSemiBold" style={{ color: colors.lightTint }}>
                                                        {formatDiasLabel(wholeDays, halfDay)}
                                                    </ThemedText>
                                                </ThemedText>
                                            </View>
                                        </View>
                                    )}

                                    {/* ─── Stepper de HORAS ─── */}
                                    {effectiveMode === 'horas' && (
                                        <View style={styles.stepperSection}>
                                            <View style={styles.stepperRow}>
                                                <TouchableOpacity
                                                    onPress={decrementHours}
                                                    style={[styles.stepperButton, horas <= 0 && styles.stepperButtonDisabled]}
                                                    disabled={horas <= 0}
                                                >
                                                    <Ionicons name="remove" size={22} color={horas <= 0 ? colors.secondaryText : colors.lightTint} />
                                                </TouchableOpacity>

                                                <View style={styles.stepperValueContainer}>
                                                    <ThemedText style={styles.stepperValue}>{horas}</ThemedText>
                                                    <ThemedText style={styles.stepperUnit}>hs</ThemedText>
                                                </View>

                                                <TouchableOpacity
                                                    onPress={incrementHours}
                                                    style={styles.stepperButton}
                                                >
                                                    <Ionicons name="add" size={22} color={colors.lightTint} />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.summaryContainer}>
                                                <ThemedText style={styles.summaryText}>
                                                    Total:{' '}
                                                    <ThemedText type="defaultSemiBold" style={{ color: colors.lightTint }}>
                                                        {horas} hora{horas !== 1 ? 's' : ''}
                                                    </ThemedText>
                                                </ThemedText>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* ── Saldo ── */}
                            {selectedTipo?.requiere_saldo && (
                                <View style={[styles.sectionCard, styles.saldoCard, saldoDisponible < cantidadDias && styles.saldoError]}>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={styles.saldoTitle}>Saldo Disponible</ThemedText>
                                        <ThemedText style={styles.saldoSubtitle}>
                                            {isLoadingSaldos ? '...' : `${saldoDisponible} días restantes`}
                                        </ThemedText>
                                        {saldoDisponible < cantidadDias && (
                                            <ThemedText style={styles.warningText}>No tenés saldo suficiente para estos días.</ThemedText>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* ── Saldo Franco Compensatorio (informativo) ── */}
                            {esFranco && (
                                <View style={[styles.sectionCard, styles.saldoCard]}>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={styles.saldoTitle}>Saldo de Franco Compensatorio</ThemedText>
                                        <ThemedText style={styles.saldoSubtitle}>
                                            {isLoadingSaldos ? '...' : `${franco ?? 0} horas disponibles`}
                                        </ThemedText>
                                        <ThemedText style={styles.infoText}>
                                            Este dato es sólo informativo. No restringe la creación de la solicitud.
                                        </ThemedText>
                                    </View>
                                </View>
                            )}

                            {/* ── Observación ── */}
                            <View style={[styles.sectionCard, observacionFocus.isFocused && { borderColor: glassColors.link }]}>
                                <View style={styles.obsContainer}>
                                    <TextInput
                                        placeholder="Añadir una nota u observación..."
                                        placeholderTextColor={colors.secondaryText}
                                        value={observacion}
                                        onChangeText={setObservacion}
                                        onFocus={observacionFocus.onFocus}
                                        onBlur={observacionFocus.onBlur}
                                        multiline
                                        style={[styles.textInput, focusBorderStyles.inputNoOutline]}
                                    />
                                </View>
                            </View>

                            {/* ── Adjunto ── */}
                            {selectedTipo?.requiere_adjunto && (
                                <View style={[styles.sectionCard, !archivoAdjunto && styles.adjuntoRequerido]}>
                                    <View style={styles.rowInfo}>
                                        <ThemedText style={[styles.sectionLabel, !archivoAdjunto && { color: colors.lightTint }]}>
                                            {!archivoAdjunto ? 'Adjunto Requerido' : 'Adjunto'}
                                        </ThemedText>
                                    </View>

                                    {!archivoAdjunto ? (
                                        <TouchableOpacity
                                            style={styles.adjuntoButton}
                                            onPress={handleAgregarAdjunto}
                                            disabled={isUploadingFile}
                                        >
                                            <Ionicons name="cloud-upload-outline" size={32} color={colors.lightTint} style={{ marginBottom: 8 }} />
                                            <ThemedText style={{ color: colors.lightTint, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
                                                Cargar archivo requerido
                                            </ThemedText>
                                            <ThemedText style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                                                Tomá una foto o elegí un PDF, DOC, DOCX, JPG o PNG
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.adjuntoSeleccionado}>
                                            <View style={{ flex: 1 }}>
                                                <ThemedText style={styles.adjuntoNombre} numberOfLines={1}>{archivoAdjunto.name}</ThemedText>
                                                {archivoAdjunto.size && (
                                                    <ThemedText style={{ fontSize: 12, color: colors.secondaryText }}>
                                                        {(archivoAdjunto.size / 1024).toFixed(1)} KB
                                                    </ThemedText>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => setArchivoAdjunto(null)}>
                                                <Ionicons name="close-circle" size={24} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                        </ScrollView>

                        <View style={[styles.uploadButtonContainer, { paddingBottom: bottomInset }]}>
                            <GlassButton
                                label="Crear"
                                onPress={handleCrearSolicitud}
                                loading={isPending}
                                disabled={!isFormValid}
                                icon={(color) => <Ionicons name="cloud-upload" size={20} color={color} />}
                                style={styles.uploadButton}
                            />
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                visible={showDatePicker}
                                value={fechaInicio ?? normalizeToMinute(new Date())}
                                mode="date"
                                onConfirm={onDateConfirm}
                                onCancel={() => {
                                    setShowDatePicker(false);
                                    setShowTimePicker(false);
                                }}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                visible={showTimePicker}
                                value={fechaInicio ?? normalizeToMinute(new Date())}
                                mode="time"
                                is24Hour={true}
                                onConfirm={onTimeConfirm}
                                onCancel={() => {
                                    setShowDatePicker(false);
                                    setShowTimePicker(false);
                                }}
                            />
                        )}
                    </View>
                </ModalKeyboardView>
                <OperacionPendienteModal visible={isPending} />
                <AlertModal {...alertModal} onClose={closeAlert} onDismiss={onModalDismiss} />
        </View>
        </FullScreenPortal>
    );
}

const styles = StyleSheet.create({
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
    content: { flex: 1 },
    sectionCard: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        ...glassStyles.card,
    },
    rowInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionLabel: { fontSize: 14, color: colors.lightTint, fontWeight: '600' },
    dateRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'stretch',
    },
    dateButton: {
        ...glassStyles.buttonSecondary,
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    timeButton: {
        ...glassStyles.buttonSecondary,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dateValue: { fontSize: 15, color: colors.lightTint, fontWeight: '500', textAlign: 'center' },
    timeValue: { fontWeight: '600' },
    errorTextInline: { color: colors.error, fontSize: 12, marginTop: 8 },
    summaryContainer: { marginTop: 12, alignItems: 'flex-end' },
    summaryText: { fontSize: 14, color: colors.secondaryText },
    // Toggle Días / Horas
    modeToggleContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        overflow: 'hidden',
        ...glassStyles.fieldGlass,
    },
    modeToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    modeToggleBtnActive: {
        backgroundColor: 'rgba(26,115,232,0.12)',
    },
    modeToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: glassColors.textMuted,
    },
    modeToggleTextActive: {
        color: glassColors.link,
    },
    // Stepper
    stepperSection: {
        marginTop: 4,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    stepperButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.lightTint,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.componentBackground,
    },
    stepperButtonDisabled: {
        borderColor: colors.background,
        backgroundColor: colors.background,
    },
    stepperValueContainer: {
        alignItems: 'center',
        minWidth: 80,
    },
    stepperValue: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.lightTint,
    },
    stepperUnit: {
        fontSize: 13,
        color: colors.secondaryText,
        marginTop: -2,
    },
    // Medio día
    halfDayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(17,24,28,0.08)',
    },
    halfDayLabel: {
        fontSize: 14,
        color: colors.text,
    },
    // Tipo de licencia
    selectInput: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    selectText: { flex: 1, fontSize: 16 },
    dropdownList: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(17,24,28,0.12)' },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(17,24,28,0.08)',
    },
    activeItem: {
        backgroundColor: colors.componentBackground,
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    activeItemText: { color: colors.lightTint, fontWeight: '600' },
    // Saldo
    saldoCard: { flexDirection: 'row', alignItems: 'center' },
    saldoError: {
        backgroundColor: 'rgba(244,67,54,0.08)',
        borderColor: 'rgba(244,67,54,0.35)',
        borderWidth: 1,
    },
    saldoTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    saldoSubtitle: { fontSize: 13, color: colors.secondaryText },
    warningText: { fontSize: 12, color: colors.lightTint, marginTop: 4, fontWeight: '500' },
    infoText: { fontSize: 12, color: colors.secondaryText, marginTop: 4 },
    // Observación
    obsContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    textInput: {
        flex: 1,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        color: colors.text,
    },
    // Adjuntos
    adjuntoRequerido: {
        borderColor: 'rgba(26,115,232,0.35)',
        borderWidth: 1,
        backgroundColor: 'rgba(26,115,232,0.12)',
    },
    adjuntoButton: {
        marginTop: 8,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(26,115,232,0.35)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjuntoSeleccionado: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
    },
    adjuntoNombre: { fontSize: 14, fontWeight: '500', color: colors.text },
    errorText: { color: colors.error, padding: 10, textAlign: 'center' },
    uploadButtonContainer: {
        backgroundColor: Colors['light'].componentBackground,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(17,24,28,0.08)',
        paddingHorizontal: '4%',
        paddingTop: 10,
    },
    uploadButton: {
        alignSelf: 'stretch',
    },
});