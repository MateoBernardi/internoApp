import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
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
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import type { SedeDTO } from '../models/HorarioDTO';
import { INK, LINE, MUTED, NAVY, TURNO_ACTIVE, TURNO_SOFT } from '../theme';
import type { Turno } from '../models/Turno';

interface EditarTurnoSheetProps {
  visible: boolean;
  draft: Turno | null;
  sedes: SedeDTO[];
  isSaving: boolean;
  onClose: () => void;
  onField: <K extends keyof Turno>(key: K, value: Turno[K]) => void;
  onSave: () => void;
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
  onClose,
  onField,
  onSave,
}: EditarTurnoSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const [focusedField, setFocusedField] = useState<'ingreso' | 'egreso' | null>(null);

  // Ref sincrónico: persiste el último draft no-nulo para que el contenido
  // sea visible desde el primer render al abrir, y durante la animación de cierre.
  const formatTime = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  };

  const lastDraftRef = useRef<Turno | null>(null);
  if (draft !== null) lastDraftRef.current = draft;
  const displayDraft = lastDraftRef.current;
  // Cada lado del turno se bloquea por separado: si el empleado ya salió, el
  // encargado sigue pudiendo corregir la salida mientras el turno está en curso.
  const entradaBloqueada = Boolean(displayDraft?.marcadoInAt);
  const salidaBloqueada = Boolean(displayDraft?.marcadoOutAt);

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
                  {(entradaBloqueada || salidaBloqueada) && (
                    <View style={styles.escaneadoBanner}>
                      <Ionicons name="lock-closed" size={14} color={MUTED} />
                      <Text style={styles.escaneadoBannerText}>
                        {entradaBloqueada && salidaBloqueada
                          ? 'Turno ya escaneado — el horario no se puede modificar'
                          : entradaBloqueada
                          ? 'Entrada ya escaneada — el ingreso no se puede modificar'
                          : 'Salida ya escaneada — el egreso no se puede modificar'}
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
                        <TextInput
                          style={[styles.fieldInput, styles.inputNoOutline]}
                          value={displayDraft.ingreso}
                          onChangeText={(v) => onField('ingreso', formatTime(v))}
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
                        <TextInput
                          style={[styles.fieldInput, styles.inputNoOutline]}
                          value={displayDraft.egreso}
                          onChangeText={(v) => onField('egreso', formatTime(v))}
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
                    <Text style={styles.fieldLabel}>LICENCIA</Text>
                    <View style={styles.licenciaRow}>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, !displayDraft.licencia && styles.licenciaBtnActive]}
                        onPress={() => onField('licencia', false)}
                      >
                        <Text style={[styles.licenciaBtnText, !displayDraft.licencia && styles.licenciaBtnTextActive]}>
                          No
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.licenciaBtn, displayDraft.licencia && styles.licenciaBtnActive]}
                        onPress={() => onField('licencia', true)}
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
                </>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: bottomInset }]}>
              <TouchableOpacity
                style={[styles.btnSave, isSaving && styles.btnSaveDisabled]}
                onPress={onSave}
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
  fieldDisabled: {
    opacity: 0.55,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
});
