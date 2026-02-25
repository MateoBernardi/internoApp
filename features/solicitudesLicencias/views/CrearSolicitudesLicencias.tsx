import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useAdjuntarArchivo,
  useCreateSolicitudLicencia,
  useGetSaldosLicencias,
  useGetTiposLicencias,
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

type DayMode = 'full' | 'morning' | 'afternoon';

const DAY_MODE_OPTIONS: { value: DayMode; label: string; icon: string }[] = [
    { value: 'full', label: 'Día completo', icon: 'sunny-outline' },
    { value: 'morning', label: 'Mañana', icon: 'sunny-outline' },
    { value: 'afternoon', label: 'Tarde', icon: 'moon-outline' },
];

// Morning: 08:00 - 13:00 | Afternoon: 13:00 - 17:00 | Full: 08:00 - 17:00
const HORARIOS: Record<DayMode, { inicio: [number, number]; fin: [number, number] }> = {
    full:      { inicio: [8, 0],  fin: [17, 0] },
    morning:   { inicio: [8, 0],  fin: [13, 0] },
    afternoon: { inicio: [13, 0], fin: [17, 0] },
};

function buildTime(hours: number, minutes: number): Date {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function isMedicalLicense(nombre?: string, codigo?: string): boolean {
    if (!nombre && !codigo) return false;
    const lowerNombre = (nombre ?? '').toLowerCase();
    const lowerCodigo = (codigo ?? '').toLowerCase();
    return lowerNombre.includes('médic') || lowerNombre.includes('medic') || lowerCodigo === 'med';
}

export function CrearSolicitudesLicencias() {
    const router = useRouter();

    // --- Estados ---
    const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
    const [fechaFin, setFechaFin] = useState<Date>(new Date());
    const [tipoLicenciaId, setTipoLicenciaId] = useState<number | null>(null);
    const [observacion, setObservacion] = useState('');
    const [archivoAdjunto, setArchivoAdjunto] = useState<{ name: string; uri: string; type: string; size?: number } | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateType, setActiveDateType] = useState<'start' | 'end' | null>(null);
    const [showTipoLicenciaModal, setShowTipoLicenciaModal] = useState(false);
    const [dayMode, setDayMode] = useState<DayMode>('full');
    const [horaInicio, setHoraInicio] = useState<Date>(() => buildTime(8, 0));
    const [horaFin, setHoraFin] = useState<Date>(() => buildTime(17, 0));
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [activeTimeType, setActiveTimeType] = useState<'start' | 'end' | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [solicitudIdParaAdjunto, setSolicitudIdParaAdjunto] = useState<number | null>(null);
    const isSubmittingRef = useRef(false);

    // --- Hooks de Datos ---
    const { data: tiposLicencias, isLoading: isLoadingTipos, isError: isErrorTipos } = useGetTiposLicencias();
    const { data: saldosLicencias, isLoading: isLoadingSaldos } = useGetSaldosLicencias();
    const { mutate: crearSolicitud, isPending } = useCreateSolicitudLicencia();
    const { mutate: adjuntarArchivoMutation, isPending: isAdjuntando } = useAdjuntarArchivo();
    const { mutateAsync: uploadArchivo } = useUploadArchivo();

    // --- Lógica de Negocio ---
    const selectedTipo = useMemo(() =>
        tiposLicencias?.find((t) => t.id === tipoLicenciaId),
        [tiposLicencias, tipoLicenciaId]);

    const esMedica = useMemo(() =>
        isMedicalLicense(selectedTipo?.nombre, selectedTipo?.codigo),
        [selectedTipo]);

    const saldoCorrespondiente = useMemo(() => {
        if (!tipoLicenciaId || !saldosLicencias) return null;
        return saldosLicencias.find(s => s.tipo_licencia_id === tipoLicenciaId);
    }, [tipoLicenciaId, saldosLicencias]);

    const diasSolicitados = useMemo(() => {
        if (dayMode !== 'full') return 0.5;
        const diffTime = fechaFin.getTime() - fechaInicio.getTime();
        if (diffTime < 0) return 0;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, [fechaInicio, fechaFin, dayMode]);

    const saldoDisponible = useMemo(() => {
        if (!saldoCorrespondiente) return 0;
        return saldoCorrespondiente.dias_otorgados - saldoCorrespondiente.dias_consumidos;
    }, [saldoCorrespondiente]);

    // Horario efectivo: si es médica y modo full, se puede editar libremente.
    // Para otros modos, los horarios vienen predefinidos.
    const horaInicioEfectiva = useMemo(() => {
        if (esMedica) return horaInicio;
        return buildTime(...HORARIOS[dayMode].inicio);
    }, [esMedica, horaInicio, dayMode]);

    const horaFinEfectiva = useMemo(() => {
        if (esMedica) return horaFin;
        return buildTime(...HORARIOS[dayMode].fin);
    }, [esMedica, horaFin, dayMode]);

    const isFormValid = useMemo(() => {
        const tieneTipo = !!tipoLicenciaId;
        const fechasCorrectas = fechaInicio <= fechaFin;
        const saldoSuficiente = selectedTipo?.requiere_saldo
            ? saldoDisponible >= diasSolicitados
            : true;
        const horasCorrectas = horaInicioEfectiva < horaFinEfectiva;
        return tieneTipo && fechasCorrectas && saldoSuficiente && horasCorrectas && !isPending && !isAdjuntando;
    }, [tipoLicenciaId, fechaInicio, fechaFin, selectedTipo, saldoDisponible, diasSolicitados, isPending, isAdjuntando, horaInicioEfectiva, horaFinEfectiva]);

    // --- Handlers de Fecha ---
    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'dismissed') { setActiveDateType(null); return; }
        const currentDate = selectedDate || (activeDateType === 'start' ? fechaInicio : fechaFin);
        if (activeDateType === 'start') {
            setFechaInicio(currentDate);
            if (currentDate > fechaFin) setFechaFin(currentDate);
        } else {
            setFechaFin(currentDate);
        }
        setActiveDateType(null);
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (event.type === 'dismissed') { setActiveTimeType(null); return; }
        const currentTime = selectedTime || (activeTimeType === 'start' ? horaInicio : horaFin);
        if (activeTimeType === 'start') setHoraInicio(currentTime);
        else setHoraFin(currentTime);
        setActiveTimeType(null);
    };

    // --- Handler Modo Día ---
    const handleDayModeChange = useCallback((mode: DayMode) => {
        setDayMode(mode);
        // Para médica, actualizar también los horarios
        if (esMedica) {
            setHoraInicio(buildTime(...HORARIOS[mode].inicio));
            setHoraFin(buildTime(...HORARIOS[mode].fin));
        }
        // Para múltiples días, si cambia a medio día usar solo fecha de inicio
        if (mode !== 'full') {
            setFechaFin(fechaInicio);
        }
    }, [esMedica, fechaInicio]);

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

    // --- Formato Timestamp ---
    const formatTimestamp = (fecha: Date, hora: Date): string => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const hours = String(hora.getHours()).padStart(2, '0');
        const minutes = String(hora.getMinutes()).padStart(2, '0');
        const seconds = String(hora.getSeconds()).padStart(2, '0');
        const ms = String(hora.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
    };

    // --- Crear Solicitud + Adjuntar ---
    const procederCrearSolicitud = useCallback(() => {
        if (isPending || isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        const payload: any = {
            tipo_licencia_id: tipoLicenciaId!,
            observacion: observacion.trim() || undefined,
            fecha_inicio: formatTimestamp(fechaInicio, horaInicioEfectiva),
            fecha_fin: formatTimestamp(dayMode === 'full' ? fechaFin : fechaInicio, horaFinEfectiva),
        };

        crearSolicitud(payload, {
            onSuccess: async (nuevaSolicitud: any) => {
                // Si hay archivo adjunto, subirlo y adjuntarlo
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
                                uso: 'LICENCIA',
                            },
                        });
                        adjuntarArchivoMutation(
                            {
                                solicitudId: nuevaSolicitud.id,
                                archivoId: archivoSubido.id,
                            },
                            {
                                onSuccess: () => {
                                    setIsUploadingFile(false);
                                    Alert.alert('Éxito', 'Solicitud enviada con archivo adjunto.');
                                    router.back();
                                },
                                onError: () => {
                                    setIsUploadingFile(false);
                                    Alert.alert(
                                        'Solicitud creada',
                                        'La solicitud fue creada pero no se pudo adjuntar el archivo. Podés adjuntarlo desde el detalle de la solicitud.',
                                    );
                                    router.back();
                                },
                            }
                        );
                    } catch {
                        setIsUploadingFile(false);
                        Alert.alert(
                            'Solicitud creada',
                            'La solicitud fue creada pero no se pudo subir el archivo. Podés adjuntarlo desde el detalle de la solicitud.',
                        );
                        router.back();
                    }
                } else {
                    Alert.alert('Éxito', 'Solicitud enviada correctamente.');
                    router.back();
                }
            },
            onError: (err: any) => {
                isSubmittingRef.current = false;
                Alert.alert('Error', err?.message || 'Hubo un problema al crear la solicitud');
            },
        });
    }, [isPending, crearSolicitud, tipoLicenciaId, fechaInicio, fechaFin, horaInicioEfectiva, horaFinEfectiva, dayMode, observacion, archivoAdjunto, uploadArchivo, adjuntarArchivoMutation, router]);

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

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={24} color={colors.icon} />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Nueva Solicitud</ThemedText>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>

                    {/* Selector de Tipo de Licencia */}
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
                                    <ThemedText style={styles.errorText}>Error al cargar tipos</ThemedText>
                                ) : (
                                    tiposLicencias?.map((tipo) => (
                                        <TouchableOpacity
                                            key={tipo.id}
                                            onPress={() => {
                                                setTipoLicenciaId(tipo.id);
                                                setShowTipoLicenciaModal(false);
                                                setDayMode('full');
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

                    {/* Selector Día Completo / Medio Día */}
                    <View style={styles.sectionCard}>
                        <View style={styles.rowInfo}>
                            <Ionicons name="today-outline" size={20} color={colors.lightTint} />
                            <ThemedText style={styles.sectionLabel}>Modalidad</ThemedText>
                        </View>
                        <View style={styles.dayModeContainer}>
                            {DAY_MODE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.dayModeButton, dayMode === opt.value && styles.dayModeButtonActive]}
                                    onPress={() => handleDayModeChange(opt.value)}
                                >
                                    <ThemedText style={[styles.dayModeLabel, dayMode === opt.value && styles.dayModeLabelActive]}>
                                        {opt.label}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Selección de Fechas */}
                    <View style={styles.sectionCard}>
                        <View style={styles.rowInfo}>
                            <Ionicons name="calendar-outline" size={20} color={colors.lightTint} />
                            <ThemedText style={styles.sectionLabel}>Periodo</ThemedText>
                        </View>

                        <TouchableOpacity onPress={() => { setActiveDateType('start'); setShowDatePicker(true); }} style={styles.datePickerRow}>
                            <ThemedText style={styles.dateLabel}>Desde</ThemedText>
                            <ThemedText style={styles.dateValue}>
                                {fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </ThemedText>
                        </TouchableOpacity>

                        {dayMode === 'full' && (
                            <TouchableOpacity onPress={() => { setActiveDateType('end'); setShowDatePicker(true); }} style={styles.datePickerRow}>
                                <ThemedText style={styles.dateLabel}>Hasta</ThemedText>
                                <ThemedText style={styles.dateValue}>
                                    {fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                </ThemedText>
                            </TouchableOpacity>
                        )}

                        <View style={styles.summaryContainer}>
                            <ThemedText style={styles.summaryText}>
                                Duración:{' '}
                                <ThemedText type="defaultSemiBold" style={{ color: colors.lightTint }}>
                                    {dayMode === 'full' ? `${diasSolicitados} día${diasSolicitados !== 1 ? 's' : ''}` : 'Medio día'}
                                </ThemedText>
                            </ThemedText>
                        </View>
                    </View>

                    {/* Selector de Horario — solo para licencia médica */}
                    {esMedica && (
                        <View style={styles.sectionCard}>
                            <View style={styles.rowInfo}>
                                <Ionicons name="time-outline" size={20} color={colors.lightTint} />
                                <ThemedText style={styles.sectionLabel}>Horario</ThemedText>
                            </View>

                            <TouchableOpacity onPress={() => { setActiveTimeType('start'); setShowTimePicker(true); }} style={styles.datePickerRow}>
                                <ThemedText style={styles.dateLabel}>Desde</ThemedText>
                                <ThemedText style={styles.dateValue}>
                                    {horaInicioEfectiva.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { setActiveTimeType('end'); setShowTimePicker(true); }} style={styles.datePickerRow}>
                                <ThemedText style={styles.dateLabel}>Hasta</ThemedText>
                                <ThemedText style={styles.dateValue}>
                                    {horaFinEfectiva.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </ThemedText>
                            </TouchableOpacity>

                            {horaInicioEfectiva >= horaFinEfectiva && (
                                <ThemedText style={[styles.warningText, { marginTop: 12, color: colors.error }]}>
                                    La hora final debe ser posterior a la hora inicial
                                </ThemedText>
                            )}
                        </View>
                    )}

                    {/* Información de Saldo */}
                    {selectedTipo?.requiere_saldo && (
                        <View style={[styles.sectionCard, styles.saldoCard, saldoDisponible < diasSolicitados && styles.saldoError]}>
                            <Ionicons name="information-circle" size={20} color={saldoDisponible < diasSolicitados ? colors.error : colors.lightTint} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <ThemedText style={styles.saldoTitle}>Saldo Disponible</ThemedText>
                                <ThemedText style={styles.saldoSubtitle}>
                                    {isLoadingSaldos ? 'Cargando saldo...' : `${saldoDisponible} días restantes`}
                                </ThemedText>
                                {saldoDisponible < diasSolicitados && (
                                    <ThemedText style={styles.warningText}>No tenés saldo suficiente para estos días.</ThemedText>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Observaciones */}
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

                    {/* Sección de Adjuntos — solo si el tipo lo requiere */}
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
                    style={[styles.fab, (!isFormValid || isSubmitting) && styles.fabDisabled]}
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
                        value={activeDateType === 'start' ? fechaInicio : fechaFin}
                        mode="date"
                        minimumDate={activeDateType === 'end' ? fechaInicio : undefined}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                    />
                )}

                {showTimePicker && esMedica && (
                    <DateTimePicker
                        value={activeTimeType === 'start' ? horaInicioEfectiva : horaFinEfectiva}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.componentBackground,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: colors.componentBackground,
    },
    headerTitle: { fontSize: 18, fontWeight: '500', color: colors.text },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
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
    summaryContainer: { marginTop: 12, alignItems: 'flex-end' },
    summaryText: { fontSize: 14, color: colors.secondaryText },
    // Modalidad día
    dayModeContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dayModeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.background,
        alignItems: 'center',
        backgroundColor: colors.componentBackground,
    },
    dayModeButtonActive: {
        borderColor: colors.lightTint,
        backgroundColor: colors.lightTint + '15',
    },
    dayModeLabel: {
        fontSize: 13,
        color: colors.secondaryText,
        fontWeight: '500',
    },
    dayModeLabelActive: {
        color: colors.lightTint,
        fontWeight: '700',
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
        bottom: 32,
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