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
import type { HorasExtraDTO } from '../models/HorasExtra';
import { AMBER, INK, LINE, MUTED, RED_FLASH } from '../theme';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10} hs`;
}

interface LiquidarAmountModalProps {
  visible: boolean;
  empleado: HorasExtraDTO | null;
  isLiquidando: boolean;
  onConfirm: (horas: number) => void;
  onClose: () => void;
}

/**
 * Modal compartido entre la card de la lista y el sheet de detalle: pide una
 * cantidad de horas a liquidar, prellenada con el disponible y topeada en él.
 * El backend igual valida el tope server-side (422 si se excede), pero acá se
 * evita el viaje de red en el caso común.
 */
export function LiquidarAmountModal({
  visible,
  empleado,
  isLiquidando,
  onConfirm,
  onClose,
}: LiquidarAmountModalProps) {
  const insets = useSafeAreaInsets();
  const disponible = empleado && empleado.horas > 0 ? empleado.horas : 0;
  const [text, setText] = useState('');
  const [isInputFocused, setInputFocused] = useState(false);

  // Reset del input cada vez que se abre para un nuevo empleado.
  useEffect(() => {
    if (visible) {
      setText(disponible > 0 ? String(disponible) : '');
    }
  }, [visible, empleado?.userContextId, disponible]);

  const parsed = Number(text.replace(',', '.'));
  const isValid = text.trim().length > 0 && Number.isFinite(parsed) && parsed > 0 && parsed <= disponible;

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
                {empleado.nombre} {empleado.apellido} · disponible {formatHoras(disponible)}
              </Text>
            )}

            <View style={[glassStyles.fieldGlass, styles.inputRow, isInputFocused && styles.inputFocused]}>
              <TextInput
                style={[styles.input, styles.inputNoOutline]}
                keyboardType="decimal-pad"
                value={text}
                onChangeText={setText}
                placeholder="0.0"
                placeholderTextColor={MUTED}
                editable={!isLiquidando}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                autoFocus
              />
              <Text style={styles.inputSuffix}>hs</Text>
            </View>

            {text.trim().length > 0 && !isValid && (
              <Text style={styles.errorText}>
                Ingresá un valor mayor a 0 y hasta {formatHoras(disponible)}.
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
                onPress={() => isValid && onConfirm(parsed)}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
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
