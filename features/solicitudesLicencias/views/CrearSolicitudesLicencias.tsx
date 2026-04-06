import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateSolicitudDTO } from '../models/SolicitudLicencia';
import {
    useAdjuntarArchivo,
    useCreateSolicitudLicencia,
    useGetSaldosLicencias,
    useGetTiposLicencias,
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

function normalizeToMinute(date: Date): Date {
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);
    return normalized;
}

/** Modo de cantidad: días u horas */
type CantidadMode = 'dias' | 'horas';

/** Formatea la fecha como YYYY-MM-DD para el backend */
function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Texto legible para la cantidad de días seleccionada */
function formatDiasLabel(wholeDays: number, halfDay: boolean): string {
    const total = wholeDays + (halfDay ? 0.5 : 0);
    if (total === 0) return '0 días';
    if (total === 0.5) return 'Medio día';
    if (total === 1) return '1 día';
    if (halfDay) return `${wholeDays} día${wholeDays !== 1 ? 's' : ''} y medio`;
    return `${wholeDays} días`;
}

export function CrearSolicitudesLicencias() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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
    const [archivoAdjunto, setArchivoAdjunto] = useState<{ name: string; uri: string; type: string; size?: number } | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const isSubmittingRef = useRef(false);

    // --- Hooks de Datos ---
    const { data: tiposLicencias, isLoading: isLoadingTipos, isError: isErrorTipos } = useGetTiposLicencias();
    const { data: saldosLicencias, isLoading: isLoadingSaldos } = useGetSaldosLicencias();
    const { mutate: crearSolicitud, isPending } = useCreateSolicitudLicencia();
    const { mutate: adjuntarArchivoMutation, isPending: isAdjuntando } = useAdjuntarArchivo();
    const { mutateAsync: uploadArchivo } = useUploadArchivo();

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
        if (!saldosLicencias || saldosLicencias.length === 0) return null;
        if (!tipoLicenciaId) {
            return saldosLicencias.length === 1 ? saldosLicencias[0] : null;
        }

        const porTipo = saldosLicencias.find(s => s.tipo_licencia_id === tipoLicenciaId);
        if (porTipo) return porTipo;

        // Fallback para respuestas con un unico saldo sin tipo_licencia_id.
        return saldosLicencias.length === 1 ? saldosLicencias[0] : null;
    }, [tipoLicenciaId, saldosLicencias]);

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
    const onDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedDate) {
            setFechaInicio(normalizeToMinute(selectedDate));
        }
    }, []);

    const onTimeChange = useCallback((event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedTime) {
            const updated = new Date(fechaInicio ?? new Date());
            updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            setFechaInicio(normalizeToMinute(updated));
        }
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
            Alert.alert('Error', 'No se pudo seleccionar el archivo.');
        }
    }, []);

    // --- Crear Solicitud ---
    const procederCrearSolicitud = useCallback(() => {
        if (isPending || isSubmittingRef.current) return;
        if (!tipoLicenciaId) return;
        if (!fechaInicio){
            Alert.alert('La fecha de inicio es requerida.');
            return;
        }

        isSubmittingRef.current = true;

        const payload: CreateSolicitudDTO = {
            tipo_licencia_id: tipoLicenciaId!,
            fecha_inicio: formatDate(fechaInicio),
            observacion: observacion.trim() || undefined,
        };

        if (effectiveMode === 'dias') {
            payload.cantidad_dias = cantidadDias > 0 ? cantidadDias : null;
        } else if (effectiveMode === 'horas') {
            payload.cantidad_horas = horas > 0 ? horas : null;
        }

        crearSolicitud(payload, {
            onSuccess: async (nuevaSolicitud: any) => {
                if (archivoAdjunto && nuevaSolicitud?.id) {
                    setIsUploadingFile(true);
                    try {
                        const archivoSubido = await uploadArchivo({
                            archivo: {
                                uri: archivoAdjunto.uri,
                                name: archivoAdjunto.name,
                                type: archivoAdjunto.type,
                                size: archivoAdjunto.size,
                            },
                            data: {
                                nombre: archivoAdjunto.name,
                                tamaño: archivoAdjunto.size,
                                tipo: archivoAdjunto.type,
                                uso: ArchivoUso.LICENCIA,
                            },
                        });
                        const archivoId = archivoSubido.data?.id;
                        if (!archivoId) {
                            setIsUploadingFile(false);
                            Alert.alert(
                            'Solicitud creada',
                            'La solicitud fue creada pero no se pudo obtener el id del archivo para adjuntarlo.'
                            );
                            router.back();
                            return;
                        }
                        adjuntarArchivoMutation(
                            { solicitudId: nuevaSolicitud.id, archivoId },
                            {
                                onSuccess: () => {
                                    setIsUploadingFile(false);
                                    Alert.alert('Éxito', 'Solicitud enviada con archivo adjunto.');
                                    router.back();
                                },
                                onError: () => {
                                    setIsUploadingFile(false);
                                    Alert.alert('Solicitud creada', 'La solicitud fue creada pero no se pudo adjuntar el archivo. Podés adjuntarlo desde el detalle.');
                                    router.back();
                                },
                            }
                        );
                    } catch {
                        setIsUploadingFile(false);
                        Alert.alert('Solicitud creada', 'La solicitud fue creada pero no se pudo subir el archivo. Podés adjuntarlo desde el detalle.');
                        router.back();
                    }
                } else {
                    Alert.alert('Éxito', 'Solicitud enviada correctamente.');
                    router.back();
                }
            },
            onError: (err: any) => {
                isSubmittingRef.current = false;
                Alert.alert('Error', err?.message || 'Intenta nuevamente');
            },
        });
    }, [isPending, crearSolicitud, tipoLicenciaId, fechaInicio, effectiveMode, cantidadDias, horas, observacion, archivoAdjunto, uploadArchivo, adjuntarArchivoMutation, router]);

    const handleCrearSolicitud = useCallback(() => {
        if (!isFormValid || isPending) return;
        if (selectedTipo?.requiere_adjunto && !archivoAdjunto) {
            Alert.alert(
                'Adjunto Requerido',
                'Esta solicitud requiere documentación. Si continuás sin adjuntarla, quedará en estado "Pendiente Documentación".',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Crear sin adjunto', style: 'destructive', onPress: procederCrearSolicitud },
                ]
            );
        } else {
            procederCrearSolicitud();
        }
    }, [isFormValid, isPending, selectedTipo, archivoAdjunto, procederCrearSolicitud]);

    const isSubmitting = isPending || isUploadingFile || isAdjuntando;

    // ==================== RENDER ====================
    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

                    {/* ── Tipo de Licencia ── */}
                    <View style={styles.sectionCard}>
                        <TouchableOpacity onPress={() => setShowTipoLicenciaModal(!showTipoLicenciaModal)} style={styles.selectInput}>
                            <Ionicons name="ribbon-outline" size={20} color={colors.icon} />
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
                                            {tipo.requiere_saldo && <Ionicons name="pie-chart" size={14} color={colors.lightTint} />}
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Fecha de Inicio ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.rowInfo}>
                            <Ionicons name="calendar-outline" size={20} color={colors.lightTint} />
                            <ThemedText style={styles.sectionLabel}>Fecha de Inicio</ThemedText>
                        </View>

                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerRow}>
                            <ThemedText style={styles.dateLabel}>Día</ThemedText>
                            <ThemedText style={styles.dateValue}>
                                {fechaInicio
                                    ? fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                    : 'Seleccionar fecha'}
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerRow}>
                            <ThemedText style={styles.dateLabel}>Hora</ThemedText>
                            <ThemedText style={styles.dateValue}>
                                {fechaInicio
                                    ? fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                    : 'Seleccionar hora'}
                            </ThemedText>
                        </TouchableOpacity>

                        {dateErrorMessage && (
                            <ThemedText style={styles.errorTextInline}>{dateErrorMessage}</ThemedText>
                        )}
                    </View>

                    {/* ── Cantidad ── */}
                    {tipoLicenciaId && (
                        <View style={styles.sectionCard}>
                            <View style={styles.rowInfo}>
                                <Ionicons name="timer-outline" size={20} color={colors.lightTint} />
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
                            <Ionicons name="information-circle" size={20} color={saldoDisponible < cantidadDias ? colors.error : colors.lightTint} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
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

                    {/* ── Observación ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.obsContainer}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.icon} style={{ marginTop: 4 }} />
                            <TextInput
                                placeholder="Añadir una nota u observación..."
                                placeholderTextColor={colors.secondaryText}
                                value={observacion}
                                onChangeText={setObservacion}
                                multiline
                                style={styles.textInput}
                            />
                        </View>
                    </View>

                    {/* ── Adjunto ── */}
                    {selectedTipo?.requiere_adjunto && (
                        <View style={[styles.sectionCard, !archivoAdjunto && styles.adjuntoRequerido]}>
                            <View style={styles.rowInfo}>
                                <Ionicons
                                    name="document-attach-outline"
                                    size={20}
                                    color={!archivoAdjunto ? colors.lightTint : colors.icon}
                                />
                                <ThemedText style={[styles.sectionLabel, !archivoAdjunto && { color: colors.lightTint }]}>
                                    {!archivoAdjunto ? 'Adjunto Requerido' : 'Adjunto'}
                                </ThemedText>
                            </View>

                            {!archivoAdjunto ? (
                                <TouchableOpacity
                                    style={styles.adjuntoButton}
                                    onPress={handleSeleccionarArchivo}
                                    disabled={isUploadingFile}
                                >
                                    <Ionicons name="cloud-upload-outline" size={32} color={colors.lightTint} style={{ marginBottom: 8 }} />
                                    <ThemedText style={{ color: colors.lightTint, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
                                        Cargar archivo requerido
                                    </ThemedText>
                                    <ThemedText style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                                        PDF, DOC, DOCX, JPG o PNG
                                    </ThemedText>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.adjuntoSeleccionado}>
                                    <Ionicons name="document" size={24} color={colors.lightTint} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
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

                {/* FAB */}
                <TouchableOpacity
                    style={[styles.fab, { bottom: 24 + insets.bottom }, (!isFormValid || isSubmitting) && styles.fabDisabled]}
                    onPress={handleCrearSolicitud}
                    disabled={!isFormValid || isSubmitting}
                >
                    {isSubmitting
                        ? <ActivityIndicator color={colors.componentBackground} />
                        : <Ionicons name="checkmark-sharp" size={28} color={colors.componentBackground} />
                    }
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={fechaInicio ?? normalizeToMinute(new Date())}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                    />
                )}

                {showTimePicker && (
                    <DateTimePicker
                        value={fechaInicio ?? normalizeToMinute(new Date())}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}

            </KeyboardAvoidingView>
            <OperacionPendienteModal visible={isPending} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.componentBackground,
    },
    content: { flex: 1 },
    sectionCard: {
        backgroundColor: colors.componentBackground,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.background,
    },
    rowInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionLabel: { marginLeft: 8, fontSize: 14, color: colors.lightTint, fontWeight: '600' },
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.background,
    },
    dateLabel: { fontSize: 15, color: colors.lightTint },
    dateValue: { fontSize: 15, color: colors.text, fontWeight: '500' },
    errorTextInline: { color: colors.error, fontSize: 12, marginTop: 8 },
    summaryContainer: { marginTop: 12, alignItems: 'flex-end' },
    summaryText: { fontSize: 14, color: colors.secondaryText },
    // Toggle Días / Horas
    modeToggleContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.background,
    },
    modeToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: colors.componentBackground,
    },
    modeToggleBtnActive: {
        backgroundColor: colors.lightTint,
    },
    modeToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.secondaryText,
    },
    modeToggleTextActive: {
        color: colors.componentBackground,
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
        borderWidth: 1.5,
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
        borderTopColor: colors.background,
    },
    halfDayLabel: {
        fontSize: 14,
        color: colors.text,
    },
    // Tipo de licencia
    selectInput: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    selectText: { flex: 1, marginLeft: 12, fontSize: 16 },
    dropdownList: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.background },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.background,
    },
    activeItem: {
        backgroundColor: colors.componentBackground,
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    activeItemText: { color: colors.lightTint, fontWeight: '600' },
    // Saldo
    saldoCard: { flexDirection: 'row', alignItems: 'center' },
    saldoError: {},
    saldoTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    saldoSubtitle: { fontSize: 13, color: colors.secondaryText },
    warningText: { fontSize: 12, color: colors.lightTint, marginTop: 4, fontWeight: '500' },
    // Observación
    obsContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    textInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        color: colors.text,
    },
    // Adjuntos
    adjuntoRequerido: {
        borderColor: colors.lightTint,
        borderWidth: 2,
        backgroundColor: colors.lightTint + '08',
    },
    adjuntoButton: {
        marginTop: 8,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: colors.lightTint,
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
    // FAB
    fab: {
        position: 'absolute',
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.lightTint,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    fabDisabled: { backgroundColor: colors.background },
    errorText: { color: colors.error, padding: 10, textAlign: 'center' },
});