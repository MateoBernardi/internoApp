import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
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
import type { SedeDTO } from '../models/HorarioDTO';
import type { Turno } from '../models/Turno';

const colors = Colors['light'];
const NAVY = '#2b1f5c';
const TURNO_ACTIVE = '#2f86d6';
const TURNO_ACTIVE_SOFT = '#e7f2fb';
const LINE = '#e8eaed';
const MUTED = '#7a8087';
const INK = '#1c2024';

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
}: {
  value: number;
  sedes: SedeDTO[];
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedName = sedes.find((s) => s.id === value)?.nombre ?? `Sede ${value}`;

  return (
    <>
      <TouchableOpacity style={styles.sedeBtn} onPress={() => setOpen(true)}>
        <Text style={styles.sedeBtnText}>{selectedName}</Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.sedeOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sedeMenu}>
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

  // Ref sincrónico: persiste el último draft no-nulo para que el contenido
  // sea visible desde el primer render al abrir, y durante la animación de cierre.
  const formatTime = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  };

  const lastDraftRef = useRef<Turno | null>(null);
  if (draft !== null) lastDraftRef.current = draft;
  const displayDraft = lastDraftRef.current;

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
                      <TextInput
                        style={styles.fieldInput}
                        value={displayDraft.ingreso}
                        onChangeText={(v) => onField('ingreso', formatTime(v))}
                        placeholder="--:--"
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>EGRESO</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={displayDraft.egreso}
                        onChangeText={(v) => onField('egreso', formatTime(v))}
                        placeholder="--:--"
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>SEDE DE INGRESO</Text>
                    <SedeSelect
                      value={displayDraft.sedeIdIngreso}
                      sedes={sedes}
                      onChange={(id) => onField('sedeIdIngreso', id)}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>SEDE DE EGRESO</Text>
                    <SedeSelect
                      value={displayDraft.sedeIdEgreso}
                      sedes={sedes}
                      onChange={(id) => onField('sedeIdEgreso', id)}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.footer}>
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
    backgroundColor: '#f3f4f6',
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
  fieldInput: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: INK,
    backgroundColor: '#f6f7f9',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  sedeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#f6f7f9',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 24,
  },
  sedeMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
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
    backgroundColor: TURNO_ACTIVE_SOFT,
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
});
