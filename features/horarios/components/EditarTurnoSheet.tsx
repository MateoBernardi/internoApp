import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { IsolatedMaskedInput, IsolatedMaskedInputHandle } from '@/shared/ui/IsolatedMaskedInput';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import type { SedeDTO } from '../models/HorarioDTO';
import { INK, LINE, MUTED, NAVY, RED_FLASH, TURNO_ACTIVE, TURNO_COLOR, TURNO_SOFT } from '../theme';
import { parseLocal, type Turno } from '../models/Turno';
import { useScanHistory } from '../viewmodels/useHorarios';

interface EditarTurnoSheetProps {
  visible: boolean;
  draft: Turno | null;
  sedes: SedeDTO[];
  isSaving: boolean;
  editKey: number | string;
  onClose: () => void;
  onField: <K extends keyof Turno>(key: K, value: Turno[K]) => void;
  onSave: (turno: Turno) => void;
}


function SedeSelect({
  value,
  sedes,
  onChange,
  disabled,
}: {
  value: number;
  sedes: SedeDTO[];
  onChange: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedName = sedes.find((s) => s.id === value)?.nombre ?? `Sede ${value}`;

  return (
    <>
      <TouchableOpacity
        style={[glassStyles.fieldGlass, styles.sedeBtn, disabled && styles.fieldDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
      >
        <Text style={styles.sedeBtnText}>{selectedName}</Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[glassStyles.modalOverlay, styles.sedeOverlay]} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[glassStyles.modalCard, styles.sedeMenu]}>
            {sedes.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sedeOption, value === s.id && styles.sedeOptionActive]}
                onPress={() => { onChange(s.id); setOpen(false); }}
              >
                <Text style={[styles.sedeOptionText, value === s.id && styles.sedeOptionTextActive]}>
                  {s.nombre}
                </Text>
                {value === s.id && <Ionicons name="checkmark" size={16} color={TURNO_ACTIVE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function EditarTurnoSheet({
  visible,
  draft,
  sedes,
  isSaving,
  editKey,
  onClose,
  onField,
  onSave,
}: EditarTurnoSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const [focusedField, setFocusedField] = useState<'ingreso' | 'egreso' | null>(null);
  const ingresoRef = useRef<IsolatedMaskedInputHandle>(null);
  const egresoRef = useRef<IsolatedMaskedInputHandle>(null);

  // Ref sincrónico: persiste el último draft no-nulo para que el contenido
  // sea visible desde el primer render al abrir, y durante la animación de cierre.
  const lastDraftRef = useRef<Turno | null>(null);
  if (draft !== null) lastDraftRef.current = draft;
  const displayDraft = lastDraftRef.current;
  // Cada lado del turno se bloquea por separado: si el empleado ya salió, el
  // encargado sigue pudiendo corregir la salida mientras el turno está en curso.
  const entradaBloqueada = Boolean(displayDraft?.marcadoInAt);
  const salidaBloqueada = Boolean(displayDraft?.marcadoOutAt);
  // Una vez que hubo algún escaneo, marcar "de licencia" retroactivamente no
  // tiene sentido: el empleado ya fichó ese turno.
  const licenciaBloqueada = entradaBloqueada || salidaBloqueada;

  const scanHistoryQuery = useScanHistory(displayDraft?.id, visible);
  const scanHistory = scanHistoryQuery.data ?? [];

  const handleSave = () => {
    if (!displayDraft) return;
    onSave({
      ...displayDraft,
      ingreso: ingresoRef.current?.getValue() ?? displayDraft.ingreso,
      egreso: egresoRef.current?.getValue() ?? displayDraft.egreso,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[glassStyles.modalOverlay, styles.overlay]}>
        <ModalKeyboardView style={styles.kavWrapper}>
          <View style={[glassStyles.modalCard, styles.container, { paddingBottom: bottomInset }]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Editar turno</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {displayDraft && (
                <>
                  {licenciaBloqueada && (
                    <View style={styles.escaneadoBanner}>
                      <Ionicons name="lock-closed" size={14} color={MUTED} />
                      <Text style={styles.escaneadoBannerText}>
                        {entradaBloqueada && salidaBloqueada
                          ? 'Turno ya escaneado — el horario y la licencia no se pueden modificar'
                          : entradaBloqueada
                          ? 'Entrada ya escaneada — el ingreso y la licencia no se pueden modificar'
                          : 'Salida ya escaneada — el egreso y la licencia no se pueden modificar'}
                      </Text>
                    </View>
                  )}

                  {displayDraft.reportadoTardanza && (
                    <View style={styles.reportadoBanner}>
                      <Ionicons name="alert-circle" size={14} color={RED_FLASH} />
                      <Text style={styles.reportadoBannerText}>
                        Reportado — ya se generó un reporte automático para este turno
                      </Text>
                    </View>
                  )}

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>NOMBRE</Text>
                    <Text style={styles.fieldReadOnly}>{displayDraft.nombre}</Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>FECHA</Text>
                    <Text style={styles.fieldReadOnly}>{displayDraft.fecha}</Text>
                  </View>

                  <View style={styles.row2}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>INGRESO</Text>
                      <View style={[glassStyles.fieldGlass, styles.timeInputContainer, focusedField === 'ingreso' && styles.inputFocused, entradaBloqueada && styles.fieldDisabled]}>
                        <IsolatedMaskedInput
                          key={editKey}
                          ref={ingresoRef}
                          style={[styles.fieldInput, styles.inputNoOutline]}
                          initialValue={displayDraft.ingreso}
                          maxDigits={4}
                          separators={[{ afterDigit: 2, char: ':' }]}
                          placeholder="--:--"
                          placeholderTextColor={MUTED}
                          keyboardType="numeric"
                          maxLength={5}
                          editable={!entradaBloqueada}
                          onFocus={() => setFocusedField('ingreso')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>EGRESO</Text>
                      <View style={[glassStyles.fieldGlass, styles.timeInputContainer, focusedField === 'egreso' && styles.inputFocused, salidaBloqueada && styles.fieldDisabled]}>
                        <IsolatedMaskedInput
                          key={editKey}
                          ref={egresoRef}
                          style={[styles.fieldInput, styles.inputNoOutline]}
                          initialValue={displayDraft.egreso}
                          maxDigits={4}
                          separators={[{ afterDigit: 2, char: ':' }]}
                          placeholder="--:--"
                          placeholderTextColor={MUTED}
                          keyboardType="numeric"
                          maxLength={5}
                          editable={!salidaBloqueada}
                          onFocus={() => setFocusedField('egreso')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>SEDE DE INGRESO</Text>
                    <SedeSelect
                      value={displayDraft.sedeIdIngreso}
                      sedes={sedes}
                      onChange={(id) => onField('sedeIdIngreso', id)}
                      disabled={entradaBloqueada}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>SEDE DE EGRESO</Text>
                    <SedeSelect
                      value={displayDraft.sedeIdEgreso}
                      sedes={sedes}
                      onChange={(id) => onField('sedeIdEgreso', id)}
                      disabled={salidaBloqueada}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>AUSENCIA</Text>
                    <View style={[styles.licenciaRow, licenciaBloqueada && styles.fieldDisabled]}>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, !displayDraft.licencia && styles.licenciaBtnActive]}
                        onPress={() => onField('licencia', false)}
                        disabled={licenciaBloqueada}
                      >
                        <Text style={[styles.licenciaBtnText, !displayDraft.licencia && styles.licenciaBtnTextActive]}>
                          No
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, displayDraft.licencia && styles.licenciaBtnActive]}
                        onPress={() => onField('licencia', true)}
                        disabled={licenciaBloqueada}
                      >
                        <Text style={[styles.licenciaBtnText, displayDraft.licencia && styles.licenciaBtnTextActive]}>
                          Sí
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>FERIADO</Text>
                    <View style={styles.licenciaRow}>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, !displayDraft.feriado && styles.licenciaBtnActive]}
                        onPress={() => onField('feriado', false)}
                      >
                        <Text style={[styles.licenciaBtnText, !displayDraft.feriado && styles.licenciaBtnTextActive]}>
                          No
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, displayDraft.feriado && styles.licenciaBtnActive]}
                        onPress={() => onField('feriado', true)}
                      >
                        <Text style={[styles.licenciaBtnText, displayDraft.feriado && styles.licenciaBtnTextActive]}>
                          Sí
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>HISTORIAL DE MARCADO</Text>
                    <View style={styles.scanList}>
                      {scanHistoryQuery.isFetching && !scanHistoryQuery.data ? (
                        <View style={styles.scanCenterState}>
                          <ActivityIndicator size="small" color={TURNO_COLOR} />
                          <Text style={styles.scanStateText}>Cargando historial…</Text>
                        </View>
                      ) : scanHistoryQuery.isError ? (
                        <View style={styles.scanCenterState}>
                          <Ionicons name="alert-circle-outline" size={24} color={RED_FLASH} style={{ marginBottom: 4 }} />
                          <Text style={styles.scanStateText}>No se pudo cargar el historial.</Text>
                          <TouchableOpacity style={styles.scanRetryBtn} onPress={() => scanHistoryQuery.refetch()}>
                            <Text style={styles.scanRetryBtnText}>Reintentar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : scanHistory.length === 0 ? (
                        <View style={styles.scanCenterState}>
                          <Text style={styles.scanStateText}>Sin marcaciones registradas</Text>
                        </View>
                      ) : (
                        scanHistory.map((scan, i) => {
                          const fecha = parseLocal(scan.createdAt);
                          const pad2 = (n: number) => String(n).padStart(2, '0');
                          return (
                            <View key={`${scan.tipoScan}-${scan.createdAt}-${i}`} style={styles.scanRow}>
                              <View style={styles.scanRowLeft}>
                                <Ionicons
                                  name={scan.tipoScan === 'IN' ? 'log-in-outline' : 'log-out-outline'}
                                  size={16}
                                  color={TURNO_COLOR}
                                />
                                <Text style={styles.scanTipo}>{scan.tipoScan === 'IN' ? 'Entrada' : 'Salida'}</Text>
                              </View>
                              <View style={styles.scanRowRight}>
                                <Text style={styles.scanTime}>{pad2(fecha.getHours())}:{pad2(fecha.getMinutes())}</Text>
                                <Text style={styles.scanCoords}>
                                  {Number.isFinite(Number(scan.latitud)) ? Number(scan.latitud).toFixed(4) : '—'},{' '}
                                  {Number.isFinite(Number(scan.longitud)) ? Number(scan.longitud).toFixed(4) : '—'}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: bottomInset }]}>
              <TouchableOpacity
                style={[styles.btnSave, isSaving && styles.btnSaveDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnSaveText}>Guardar cambios</Text>
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
  },
  kavWrapper: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    marginTop: '15%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldReadOnly: {
    fontSize: 15,
    color: INK,
    paddingVertical: 4,
  },
  timeInputContainer: {
    width: '100%',
  },
  inputFocused: {
    borderColor: glassColors.link,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: INK,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  licenciaRow: {
    flexDirection: 'row',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
  },
  licenciaBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    backgroundColor: TURNO_SOFT,
  },
  licenciaBtnActive: {
    backgroundColor: NAVY,
  },
  licenciaBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
  },
  licenciaBtnTextActive: {
    color: '#ffffff',
  },
  sedeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sedeBtnText: {
    fontSize: 15,
    color: INK,
    flex: 1,
  },
  sedeOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sedeMenu: {
    paddingVertical: 8,
    width: '100%',
    maxWidth: 340,
  },
  sedeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  sedeOptionActive: {
    backgroundColor: TURNO_SOFT,
  },
  sedeOptionText: {
    fontSize: 16,
    color: INK,
  },
  sedeOptionTextActive: {
    color: TURNO_ACTIVE,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  btnSave: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: 'center',
  },
  btnSaveDisabled: {
    opacity: 0.6,
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  escaneadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(17,24,28,0.04)',
  },
  escaneadoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  reportadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  reportadoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: RED_FLASH,
  },
  scanList: {
    gap: 8,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  scanRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanRowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scanTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
  },
  scanTime: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    fontVariant: ['tabular-nums'],
  },
  scanCoords: {
    fontSize: 11,
    color: MUTED,
  },
  scanCenterState: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  scanStateText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  scanRetryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TURNO_COLOR,
  },
  scanRetryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
});
