import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
  useCreateSolicitudLicencia,
  useGetSaldosLicencias,
  useGetTiposLicencias,
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

export function CrearSolicitudesLicencias() {
  const router = useRouter();

  // --- Estados ---
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
  const [fechaFin, setFechaFin] = useState<Date>(new Date());
  const [tipoLicenciaId, setTipoLicenciaId] = useState<number | null>(null);
  const [observacion, setObservacion] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateType, setActiveDateType] = useState<'start' | 'end' | null>(null);
  const [showTipoLicenciaModal, setShowTipoLicenciaModal] = useState(false);

  // --- Hooks de Datos ---
  const { data: tiposLicencias, isLoading: isLoadingTipos, isError: isErrorTipos } = useGetTiposLicencias();
  const { data: saldosLicencias, isLoading: isLoadingSaldos } = useGetSaldosLicencias();
  const { mutate: crearSolicitud, isPending } = useCreateSolicitudLicencia();

  // --- Lógica de Negocio ---
  const selectedTipo = useMemo(() => 
    tiposLicencias?.find((t) => t.id === tipoLicenciaId), 
  [tiposLicencias, tipoLicenciaId]);

  const saldoCorrespondiente = useMemo(() => {
    if (!tipoLicenciaId || !saldosLicencias) return null;
    return saldosLicencias.find(s => s.tipo_licencia_id === tipoLicenciaId);
  }, [tipoLicenciaId, saldosLicencias]);

  const diasSolicitados = useMemo(() => {
    const diffTime = fechaFin.getTime() - fechaInicio.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [fechaInicio, fechaFin]);

  const saldoDisponible = useMemo(() => {
    if (!saldoCorrespondiente) return 0;
    return saldoCorrespondiente.dias_otorgados - saldoCorrespondiente.dias_consumidos;
  }, [saldoCorrespondiente]);

  const isFormValid = useMemo(() => {
    const tieneTipo = !!tipoLicenciaId;
    const fechasCorrectas = fechaInicio <= fechaFin;
    const saldoSuficiente = selectedTipo?.requiere_saldo 
      ? saldoDisponible >= diasSolicitados 
      : true;

    return tieneTipo && fechasCorrectas && saldoSuficiente && !isPending;
  }, [tipoLicenciaId, fechaInicio, fechaFin, selectedTipo, saldoDisponible, diasSolicitados, isPending]);

  // --- Handlers ---
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') {
      setActiveDateType(null);
      return;
    }

    const currentDate = selectedDate || (activeDateType === 'start' ? fechaInicio : fechaFin);
    if (activeDateType === 'start') {
      setFechaInicio(currentDate);
      if (currentDate > fechaFin) setFechaFin(currentDate);
    } else {
      setFechaFin(currentDate);
    }
    setActiveDateType(null);
  };

  const handleCrearSolicitud = useCallback(() => {
    if (!isFormValid) return;

    crearSolicitud(
      {
        tipo_licencia_id: tipoLicenciaId!,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        observacion: observacion.trim() || undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Solicitud enviada correctamente');
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Hubo un problema al crear la solicitud');
        },
      }
    );
  }, [isFormValid, crearSolicitud, tipoLicenciaId, fechaInicio, fechaFin, observacion, router]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* Header Estilo Limpio */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Nueva Solicitud</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Selección de Fechas (Sin "Todo el día") */}
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

            <TouchableOpacity onPress={() => { setActiveDateType('end'); setShowDatePicker(true); }} style={styles.datePickerRow}>
              <ThemedText style={styles.dateLabel}>Hasta</ThemedText>
              <ThemedText style={styles.dateValue}>
                {fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.summaryContainer}>
               <ThemedText style={styles.summaryText}>
                 Duración: <ThemedText type="defaultSemiBold" style={{ color: colors.lightTint }}>{diasSolicitados} días</ThemedText>
               </ThemedText>
            </View>
          </View>

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
                      onPress={() => { setTipoLicenciaId(tipo.id); setShowTipoLicenciaModal(false); }}
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

          {/* Información de Saldo (Condicional) */}
          {selectedTipo?.requiere_saldo && (
            <View style={[styles.sectionCard, styles.saldoCard, saldoDisponible < diasSolicitados && styles.saldoError]}>
              <Ionicons name="information-circle" size={20} color={saldoDisponible < diasSolicitados ? colors.error : colors.lightTint} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.saldoTitle}>Saldo Disponible</ThemedText>
                <ThemedText style={styles.saldoSubtitle}>
                  {isLoadingSaldos ? 'Cargando saldo...' : `${saldoDisponible} días restantes`}
                </ThemedText>
                {saldoDisponible < diasSolicitados && (
                  <ThemedText style={styles.warningText}>No tienes saldo suficiente para estos días.</ThemedText>
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

        </ScrollView>

        {/* Botón de Acción (FAB) */}
        <TouchableOpacity 
          style={[styles.fab, !isFormValid && styles.fabDisabled]} 
          onPress={handleCrearSolicitud}
          disabled={!isFormValid}
        >
          {isPending ? <ActivityIndicator color={colors.componentBackground} /> : <Ionicons name="checkmark-sharp" size={28} color={colors.componentBackground} />}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.componentBackground 
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
  rowInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
  selectInput: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  selectText: { flex: 1, marginLeft: 12, fontSize: 16 },
  dropdownList: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.background },
  dropdownItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: colors.background
  },
  activeItem: { 
    backgroundColor: colors.componentBackground, 
    marginHorizontal: -16, 
    paddingHorizontal: 16 
  },
  activeItemText: { 
    color: colors.lightTint, 
    fontWeight: '600' 
  },
  saldoCard: { 
    flexDirection: 'row',
    alignItems: 'center', 
    backgroundColor: colors.componentBackground, 
    borderColor: colors.background 
  },
  saldoError: { 
    backgroundColor: colors.componentBackground, 
    borderColor: colors.background 
  },
  saldoTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text
  },
  saldoSubtitle: { 
    fontSize: 13, 
    color: colors.secondaryText, 
  },
  warningText: { 
    fontSize: 12, 
    color: colors.error, 
    marginTop: 4, 
    fontWeight: '500' 
  },
  obsContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  textInput: { 
    flex: 1, 
    marginLeft: 12, 
    fontSize: 16, 
    minHeight: 80, 
    textAlignVertical: 'top' 
  },
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
  fabDisabled: { 
    backgroundColor: colors.background 
  },
  errorText: { 
    color: colors.error, 
    padding: 10, 
    textAlign: 'center' 
  }
});