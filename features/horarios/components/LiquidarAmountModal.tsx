import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMinutos, minutosDe } from '@/shared/utils/duracion';
import type { HorasExtraDTO } from '../models/HorasExtra';
import { AMBER, INK, LINE, MUTED, RED_FLASH } from '../theme';

interface LiquidarAmountModalProps {
  visible: boolean;
  empleado: HorasExtraDTO | null;
  isLiquidando: boolean;
  onConfirm: (minutos: number) => void;
  onClose: () => void;
}

/** Entero >= 0 a partir del texto del input ('' cuenta como 0); NaN si no es un entero. */
function parseEntero(text: string): number {
  const t = text.trim();
  if (t === '') return 0;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

/**
 * Modal compartido entre la card de la lista y el sheet de detalle: pide horas y
 * minutos a liquidar (enteros, para que el monto sea exacto), prellenados con el
 * disponible y topeados en él. El backend igual valida el tope server-side (422 si
 * se excede), pero acá se evita el viaje de red en el caso común.
 */
export function LiquidarAmountModal({
  visible,
  empleado,
  isLiquidando,
  onConfirm,
  onClose,
}: LiquidarAmountModalProps) {
  const insets = useSafeAreaInsets();
  const saldo = empleado ? minutosDe(empleado.minutos, empleado.horas) ?? 0 : 0;
  const disponible = Math.max(0, saldo);
  const [horasText, setHorasText] = useState('');
  const [minutosText, setMinutosText] = useState('');
  const [focused, setFocused] = useState<'horas' | 'minutos' | null>(null);

  // Reset de los inputs cada vez que se abre para un nuevo empleado.
  useEffect(() => {
    if (visible) {
      setHorasText(disponible > 0 ? String(Math.floor(disponible / 60)) : '');
      setMinutosText(disponible > 0 ? String(disponible % 60) : '');
    }
  }, [visible, empleado?.userContextId, disponible]);

  const horas = parseEntero(horasText);
  const minutos = parseEntero(minutosText);
  const total = horas * 60 + minutos;
  const hayTexto = horasText.trim().length > 0 || minutosText.trim().length > 0;
  const isValid = hayTexto && Number.isFinite(total) && minutos < 60 && total > 0 && total <= disponible;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[glassStyles.modalOverlay, styles.overlay]}>
        <ModalKeyboardView style={styles.kavWrapper}>
          <View style={[glassStyles.modalCard, styles.card, { marginBottom: insets.bottom + 24 }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Liquidar horas extra</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>

            {empleado && (
              <Text style={styles.subtitle}>
                {empleado.nombre} {empleado.apellido} · disponible {formatMinutos(disponible)}
              </Text>
            )}

            <View style={styles.inputsRow}>
              <View style={[glassStyles.fieldGlass, styles.inputRow, styles.inputHalf, focused === 'horas' && styles.inputFocused]}>
                <TextInput
                  style={[styles.input, styles.inputNoOutline]}
                  keyboardType="number-pad"
                  value={horasText}
                  onChangeText={setHorasText}
                  placeholder="0"
                  placeholderTextColor={MUTED}
                  editable={!isLiquidando}
                  onFocus={() => setFocused('horas')}
                  onBlur={() => setFocused(null)}
                  autoFocus
                />
                <Text style={styles.inputSuffix}>h</Text>
              </View>
              <View style={[glassStyles.fieldGlass, styles.inputRow, styles.inputHalf, focused === 'minutos' && styles.inputFocused]}>
                <TextInput
                  style={[styles.input, styles.inputNoOutline]}
                  keyboardType="number-pad"
                  value={minutosText}
                  onChangeText={setMinutosText}
                  placeholder="0"
                  placeholderTextColor={MUTED}
                  editable={!isLiquidando}
                  onFocus={() => setFocused('minutos')}
                  onBlur={() => setFocused(null)}
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
            </View>

            {hayTexto && !isValid && (
              <Text style={styles.errorText}>
                Ingresá un valor mayor a 0 y hasta {formatMinutos(disponible)} (minutos de 0 a 59).
              </Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={onClose}
                disabled={isLiquidando}
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirm, (!isValid || isLiquidando) && styles.btnDisabled]}
                onPress={() => isValid && onConfirm(total)}
                disabled={!isValid || isLiquidando}
              >
                {isLiquidando ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnConfirmText}>Confirmar</Text>
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
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    width: '100%',
  },
  card: {
    marginHorizontal: 16,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    flex: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
    marginTop: -8,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  inputSuffix: {
    fontSize: 16,
    fontWeight: '700',
    color: MUTED,
  },
  errorText: {
    fontSize: 12,
    color: RED_FLASH,
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: MUTED,
  },
  btnConfirm: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: AMBER,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  inputFocused: {
    borderColor: glassColors.link,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
});
