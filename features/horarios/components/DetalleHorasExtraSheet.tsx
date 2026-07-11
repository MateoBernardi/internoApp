import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMovimientoTipoInfo, type HorasExtraDTO } from '../models/HorasExtra';
import {
  currentMonthISO,
  formatDDMM,
  monthLabel,
  shiftMonth,
} from '../utils/dateRange';
import { useMovimientos, useObjetivosHoras, useUpsertObjetivoHoras } from '../viewmodels/useHorasExtra';

const colors = Colors['light'];
const AMBER = '#c98a1a';
const TURNO_SOFT = '#e7f2fb';
const TURNO_COLOR = '#2f86d6';
const LINE = '#e8eaed';
const MUTED = '#7a8087';
const INK = '#1c2024';
const RED_FLASH = '#e2543b';
const CARD = '#f6f7f9';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10}h`;
}

interface DetalleHorasExtraSheetProps {
  visible: boolean;
  empleado: HorasExtraDTO | null;
  isLiquidando: boolean;
  onClose: () => void;
  onLiquidar: (empleado: HorasExtraDTO) => void;
}

export function DetalleHorasExtraSheet({
  visible,
  empleado,
  isLiquidando,
  onClose,
  onLiquidar,
}: DetalleHorasExtraSheetProps) {
  const insets = useSafeAreaInsets();

  const lastEmpleadoRef = useRef<HorasExtraDTO | null>(null);
  if (empleado !== null) lastEmpleadoRef.current = empleado;
  const displayEmpleado = lastEmpleadoRef.current;

  // Mes del desglose de movimientos: arranca siempre en el mes actual y se
  // reinicia cada vez que se abre el sheet para un empleado distinto.
  const [mes, setMes] = useState(currentMonthISO);
  const [editingObjetivo, setEditingObjetivo] = useState(false);
  const [objetivoText, setObjetivoText] = useState('');
  useEffect(() => {
    if (visible) {
      setMes(currentMonthISO());
      setEditingObjetivo(false);
    }
  }, [visible, displayEmpleado?.userContextId]);

  const isCurrentMonth = mes >= currentMonthISO();
  const movimientosQuery = useMovimientos(displayEmpleado?.userContextId, mes, visible);
  const movimientos = movimientosQuery.data ?? [];

  // Objetivo semanal de horas del empleado (GET /horarios/objetivos, filtrado
  // en el cliente: no hay endpoint por-usuario). Su presencia en la lista
  // decide si al guardar se hace POST (alta) o PATCH (modificación).
  const objetivosQuery = useObjetivosHoras(visible);
  const objetivo = objetivosQuery.data?.find(
    (o) => o.userContextId === displayEmpleado?.userContextId,
  );
  const objetivoExists = objetivo != null;
  const upsertObjetivo = useUpsertObjetivoHoras();

  function startEditingObjetivo() {
    setObjetivoText(objetivo != null ? String(objetivo.horas) : '');
    upsertObjetivo.reset();
    setEditingObjetivo(true);
  }

  const parsedObjetivo = Number(objetivoText.replace(',', '.'));
  const isObjetivoValid = objetivoText.trim().length > 0 && Number.isFinite(parsedObjetivo) && parsedObjetivo > 0;

  function saveObjetivo() {
    if (!isObjetivoValid || !displayEmpleado) return;
    upsertObjetivo.mutate(
      {
        userContextId: displayEmpleado.userContextId,
        horas: parsedObjetivo,
        exists: objetivoExists,
      },
      {
        onSuccess: () => {
          setEditingObjetivo(false);
        },
      },
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <ModalKeyboardView style={styles.kavWrapper}>
          <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{displayEmpleado?.nombre} {displayEmpleado?.apellido}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {displayEmpleado && (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineText}>
                    <Text style={styles.totalLineBold}>{formatHoras(displayEmpleado.horas)}</Text>
                    {' horas extra · saldo actual'}
                  </Text>
                </View>
              )}

              {/*
               * Objetivo semanal de horas (GET/POST/PATCH /horarios/objetivos).
               * No afecta el saldo actual de arriba: sólo el próximo cálculo
               * del batch semanal de acreditación.
               */}
              {displayEmpleado && (
                <View style={styles.objetivoLine}>
                  {editingObjetivo ? (
                    <View style={styles.objetivoEditRow}>
                      <View style={styles.objetivoInputRow}>
                        <TextInput
                          style={styles.objetivoInput}
                          keyboardType="decimal-pad"
                          value={objetivoText}
                          onChangeText={setObjetivoText}
                          placeholder="0.0"
                          placeholderTextColor={MUTED}
                          editable={!upsertObjetivo.isPending}
                          autoFocus
                        />
                        <Text style={styles.objetivoInputSuffix}>h</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.objetivoIconBtn}
                        onPress={() => setEditingObjetivo(false)}
                        disabled={upsertObjetivo.isPending}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={18} color={MUTED} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.objetivoIconBtn,
                          styles.objetivoSaveBtn,
                          (!isObjetivoValid || upsertObjetivo.isPending) && styles.btnDisabled,
                        ]}
                        onPress={saveObjetivo}
                        disabled={!isObjetivoValid || upsertObjetivo.isPending}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {upsertObjetivo.isPending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Ionicons name="checkmark" size={18} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.objetivoReadRow}>
                      <Text style={styles.objetivoLineText}>
                        {'Objetivo semanal: '}
                        {objetivosQuery.isFetching && !objetivosQuery.data ? (
                          <Text style={styles.objetivoPlaceholder}>—</Text>
                        ) : (
                          <Text style={styles.objetivoLineBold}>
                            {objetivoExists ? formatHoras(objetivo!.horas) : 'Sin objetivo'}
                          </Text>
                        )}
                      </Text>
                      <TouchableOpacity
                        style={styles.objetivoIconBtn}
                        onPress={startEditingObjetivo}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={16} color={TURNO_COLOR} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {editingObjetivo && objetivoText.trim().length > 0 && !isObjetivoValid && (
                    <Text style={styles.objetivoErrorText}>Ingresá un valor mayor a 0.</Text>
                  )}
                  {editingObjetivo && upsertObjetivo.isError && (
                    <Text style={styles.objetivoErrorText}>
                      {(upsertObjetivo.error as Error)?.message || 'No se pudo guardar el objetivo.'}
                    </Text>
                  )}
                </View>
              )}

              {/*
               * Desglose de movimientos por mes (GET /horarios/movimientos). El
               * backend no expone un desglose por rango/día para `horas`, así que
               * esto reemplaza esa caja duplicada por el historial real del mes
               * elegido: acreditaciones, consumos, reintegros, liquidaciones y
               * ajustes manuales, con el saldo resultante de cada uno.
               */}
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => setMes((m) => shiftMonth(m, -1))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={20} color={TURNO_COLOR} />
                </TouchableOpacity>
                <Text style={styles.monthNavLabel}>{monthLabel(mes)}</Text>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => !isCurrentMonth && setMes((m) => shiftMonth(m, 1))}
                  disabled={isCurrentMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? MUTED : TURNO_COLOR} />
                </TouchableOpacity>
              </View>

              <View style={styles.movList}>
                {movimientosQuery.isFetching && !movimientosQuery.data ? (
                  <View style={styles.movCenterState}>
                    <ActivityIndicator size="small" color={TURNO_COLOR} />
                    <Text style={styles.movStateText}>Cargando movimientos…</Text>
                  </View>
                ) : movimientosQuery.isError ? (
                  <View style={styles.movCenterState}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={28}
                      color={RED_FLASH}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={styles.movStateText}>No se pudieron cargar los movimientos.</Text>
                    <TouchableOpacity
                      style={styles.movRetryBtn}
                      onPress={() => movimientosQuery.refetch()}
                    >
                      <Text style={styles.movRetryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                ) : movimientos.length === 0 ? (
                  <View style={styles.movCenterState}>
                    <Text style={styles.movStateText}>Sin movimientos este mes</Text>
                  </View>
                ) : (
                  movimientos.map((mov) => {
                    const info = getMovimientoTipoInfo(mov.tipo);
                    const isNegative = info.sign === '−';
                    return (
                      <View key={mov.id} style={styles.movRow}>
                        <View style={styles.movRowLeft}>
                          <Text style={styles.movDate}>{formatDDMM(mov.createdAt.slice(0, 10))}</Text>
                          <Text style={styles.movTipo} numberOfLines={1}>
                            {info.label}
                          </Text>
                        </View>
                        <View style={styles.movRowRight}>
                          <Text style={[styles.movCantidad, isNegative && styles.movCantidadNegative]}>
                            {info.sign}
                            {formatHoras(mov.cantidad)}
                          </Text>
                          {mov.saldoResultante !== null && (
                            <Text style={styles.movSaldo}>saldo {formatHoras(mov.saldoResultante)}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.btnLiquidar,
                  (isLiquidando || (displayEmpleado?.horas ?? 0) <= 0) && styles.btnDisabled,
                ]}
                onPress={() => displayEmpleado && onLiquidar(displayEmpleado)}
                disabled={isLiquidando || !displayEmpleado || displayEmpleado.horas <= 0}
              >
                {isLiquidando ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cash-outline" size={16} color="#ffffff" />
                    <Text style={styles.btnLiquidarText}>Liquidar horas extra</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ModalKeyboardView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kavWrapper: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    marginTop: '15%',
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: INK,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  totalLine: {
    backgroundColor: TURNO_SOFT,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  totalLineText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
  },
  totalLineBold: {
    fontSize: 15,
    fontWeight: '800',
    color: TURNO_COLOR,
    fontVariant: ['tabular-nums'],
  },
  objetivoLine: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: LINE,
    gap: 6,
  },
  objetivoReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  objetivoLineText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
  },
  objetivoLineBold: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    fontVariant: ['tabular-nums'],
  },
  objetivoPlaceholder: {
    fontSize: 14,
    fontWeight: '800',
    color: MUTED,
  },
  objetivoIconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objetivoEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  objetivoInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  objetivoInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  objetivoInputSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  objetivoSaveBtn: {
    backgroundColor: TURNO_COLOR,
  },
  objetivoErrorText: {
    fontSize: 12,
    color: RED_FLASH,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: LINE,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthNavLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: TURNO_COLOR,
    textAlign: 'center',
  },
  movList: {
    gap: 8,
  },
  movRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  movRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  movDate: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
  },
  movTipo: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
    flexShrink: 1,
  },
  movRowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  movCantidad: {
    fontSize: 14,
    fontWeight: '800',
    color: TURNO_COLOR,
    fontVariant: ['tabular-nums'],
  },
  movCantidadNegative: {
    color: RED_FLASH,
  },
  movSaldo: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },
  movCenterState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  movStateText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  movRetryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TURNO_COLOR,
  },
  movRetryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  btnLiquidar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AMBER,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLiquidarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
