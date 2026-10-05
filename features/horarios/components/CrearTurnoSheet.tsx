import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { SearchBar } from '@/components/ui/SearchBar';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { IsolatedMaskedInput, IsolatedMaskedInputHandle } from '@/shared/ui/IsolatedMaskedInput';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CrearTurnoPayload } from '../models/Planificacion';
import type { SedeDTO, TurnoEnum } from '../models/HorarioDTO';
import { INK, LINE, MUTED, NAVY, RED_FLASH } from '../theme';
import { validarCrearTurno } from '../utils/crearTurno';
import { SedeSelect } from './SedeSelect';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TURNOS: TurnoEnum[] = ['Mañana', 'Tarde'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dateToISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const labelDia = (iso: string) => {
  const d = isoToDate(iso);
  return `${DAY_NAMES[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

interface CrearTurnoSheetProps {
  visible: boolean;
  /** Día que se estaba viendo en la lista: es la fecha por defecto. */
  defaultDateISO: string;
  sedes: SedeDTO[];
  isSaving: boolean;
  /** Error devuelto por el backend al crear (se muestra en la propia hoja: el toast queda detrás del modal). */
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: CrearTurnoPayload) => void;
}

/**
 * Alta de un turno individual, pensada para empleados rotativos que no figuran en la planilla.
 * El formulario arranca limpio y en `defaultDateISO` al montarse: el padre lo remonta con `key`
 * en cada apertura (así no hace falta resetear estado en un efecto).
 */
export function CrearTurnoSheet({
  visible,
  defaultDateISO,
  sedes,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: CrearTurnoSheetProps) {
  const bottomInset = useSafeBottomInset();
  const ingresoRef = useRef<IsolatedMaskedInputHandle>(null);
  const egresoRef = useRef<IsolatedMaskedInputHandle>(null);

  const [empleado, setEmpleado] = useState<UserSummary | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [fechaISO, setFechaISO] = useState(defaultDateISO);
  const [turno, setTurno] = useState<TurnoEnum>('Mañana');
  const [sedeIngreso, setSedeIngreso] = useState<number | null>(null);
  const [sedeEgreso, setSedeEgreso] = useState<number | null>(null);
  const [mismaSede, setMismaSede] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<'ingreso' | 'egreso' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usuariosQuery = useSearchUsers(busqueda);
  const resultados = busqueda.trim().length > 0 ? usuariosQuery.data ?? [] : [];

  const handleSubmit = () => {
    const validacion = validarCrearTurno(
      {
        userContextId: empleado?.user_context_id ?? null,
        fechaISO,
        turno,
        ingreso: ingresoRef.current?.getValue() ?? '',
        egreso: egresoRef.current?.getValue() ?? '',
        sedeIngreso,
        sedeEgreso: mismaSede ? null : sedeEgreso ?? sedeIngreso,
      },
      dateToISO(new Date()),
    );
    if (!validacion.ok) {
      setError(validacion.error);
      return;
    }
    setError(null);
    onSubmit(validacion.payload);
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
        {/* El teclado achica el contenido dentro de la hoja, que queda fija contra el borde inferior. */}
        <View style={[glassStyles.modalCard, styles.container]}>
          <ModalKeyboardView style={styles.kavWrapper}>
            <View style={styles.header}>
              <Text style={styles.title}>Agregar turno</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={20} color={glassColors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>
                Para empleados rotativos o turnos puntuales. Los turnos de la planilla se cambian en la planilla.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>EMPLEADO</Text>
                {empleado ? (
                  <View style={[glassStyles.fieldGlass, styles.empleadoChip]}>
                    <Text style={styles.empleadoName} numberOfLines={1}>
                      {empleado.nombre} {empleado.apellido}
                    </Text>
                    <TouchableOpacity onPress={() => setEmpleado(null)} accessibilityLabel="Quitar empleado">
                      <Ionicons name="close-circle" size={20} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <SearchBar
                      placeholder="Buscá por nombre o apellido"
                      value={busqueda}
                      onChangeText={setBusqueda}
                      onClear={() => setBusqueda('')}
                    />
                    {busqueda.trim().length > 0 && (
                      <View style={[glassStyles.fieldGlass, styles.resultados]}>
                        {usuariosQuery.isFetching && resultados.length === 0 ? (
                          <ActivityIndicator size="small" color={MUTED} style={styles.resultadosLoading} />
                        ) : resultados.length === 0 ? (
                          <Text style={styles.resultadosEmpty}>Sin resultados.</Text>
                        ) : (
                          resultados.slice(0, 8).map((u) => (
                            <TouchableOpacity
                              key={u.user_context_id}
                              style={styles.resultItem}
                              onPress={() => {
                                setEmpleado(u);
                                setBusqueda('');
                              }}
                            >
                              <Text style={styles.resultName}>
                                {u.nombre} {u.apellido}
                              </Text>
                              <Text style={styles.resultEmail}>{u.email}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>FECHA</Text>
                <TouchableOpacity
                  style={[glassStyles.fieldGlass, styles.fechaBtn]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.fechaText}>{labelDia(fechaISO)}</Text>
                  <Ionicons name="calendar-outline" size={16} color={NAVY} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TURNO</Text>
                <View style={styles.chipRow}>
                  {TURNOS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, turno === t && styles.chipActive]}
                      onPress={() => setTurno(t)}
                    >
                      <Text style={[styles.chipText, turno === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row2}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>INGRESO</Text>
                  <View style={[glassStyles.fieldGlass, styles.timeBox, focusedField === 'ingreso' && styles.inputFocused]}>
                    <IsolatedMaskedInput
                                            ref={ingresoRef}
                      style={[styles.input, styles.inputNoOutline]}
                      initialValue=""
                      maxDigits={4}
                      separators={[{ afterDigit: 2, char: ':' }]}
                      placeholder="--:--"
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      maxLength={5}
                      onFocus={() => setFocusedField('ingreso')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>EGRESO</Text>
                  <View style={[glassStyles.fieldGlass, styles.timeBox, focusedField === 'egreso' && styles.inputFocused]}>
                    <IsolatedMaskedInput
                                            ref={egresoRef}
                      style={[styles.input, styles.inputNoOutline]}
                      initialValue=""
                      maxDigits={4}
                      separators={[{ afterDigit: 2, char: ':' }]}
                      placeholder="--:--"
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      maxLength={5}
                      onFocus={() => setFocusedField('egreso')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SEDE DE INGRESO</Text>
                <SedeSelect value={sedeIngreso} sedes={sedes} onChange={setSedeIngreso} />
              </View>

              <View style={styles.field}>
                <View style={styles.sedeEgresoHeader}>
                  <Text style={styles.fieldLabel}>SEDE DE EGRESO</Text>
                  <TouchableOpacity
                    style={styles.mismaSedeBtn}
                    onPress={() => setMismaSede((v) => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: mismaSede }}
                  >
                    <Ionicons name={mismaSede ? 'checkbox' : 'square-outline'} size={18} color={NAVY} />
                    <Text style={styles.mismaSedeText}>Igual a la de ingreso</Text>
                  </TouchableOpacity>
                </View>
                {!mismaSede && <SedeSelect value={sedeEgreso ?? sedeIngreso} sedes={sedes} onChange={setSedeEgreso} />}
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 8) }]}>
              {!!(error ?? submitError) && <Text style={styles.error}>{error ?? submitError}</Text>}
              <TouchableOpacity
                style={[styles.btnSave, isSaving && styles.btnSaveDisabled]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.btnSaveText}>Crear turno</Text>}
              </TouchableOpacity>
            </View>
          </ModalKeyboardView>
        </View>
      </View>

      {showDatePicker && (
        <FullScreenPortal>
          <DateTimePicker
            visible={showDatePicker}
            value={isoToDate(fechaISO)}
            mode="date"
            onConfirm={(date) => {
              setFechaISO(dateToISO(date));
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </FullScreenPortal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Mismo chrome que EditarTurnoSheet: hoja sólida que sube desde abajo.
  overlay: { flex: 1 },
  kavWrapper: { flex: 1, width: '100%' },
  container: {
    flex: 1,
    width: '100%',
    marginTop: '15%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: INK,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  hint: { fontSize: 12.5, color: MUTED, lineHeight: 17 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: MUTED },
  row2: { flexDirection: 'row', gap: 12 },
  empleadoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  empleadoName: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  resultados: { maxHeight: 240, overflow: 'hidden' },
  resultadosLoading: { paddingVertical: 16 },
  resultadosEmpty: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 16 },
  resultItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: INK },
  resultEmail: { fontSize: 12, color: MUTED, marginTop: 2 },
  fechaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fechaText: { fontSize: 15, color: INK, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  chipActive: { borderColor: 'rgba(26,115,232,0.35)', backgroundColor: 'rgba(26,115,232,0.12)' },
  chipText: { fontSize: 13, fontWeight: '600', color: glassColors.textMuted },
  chipTextActive: { color: glassColors.link },
  timeBox: { width: '100%' },
  inputFocused: { borderColor: glassColors.link },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK },
  inputNoOutline: { outlineStyle: 'none', outlineWidth: 0 } as any,
  sedeEgresoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mismaSedeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mismaSedeText: { fontSize: 12.5, fontWeight: '600', color: NAVY },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  error: { marginBottom: 8, fontSize: 13, fontWeight: '600', color: RED_FLASH },
  btnSave: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: 'center',
  },
  btnSaveDisabled: { opacity: 0.6 },
  btnSaveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
