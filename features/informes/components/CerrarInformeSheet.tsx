import { glassColors, focusBorderStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  visible: boolean;
  cerrando: boolean;
  onCancel: () => void;
  onConfirm: (texto: string) => void;
}

export function CerrarInformeSheet({ visible, cerrando, onCancel, onConfirm }: Props) {
  const [texto, setTexto] = useState('');
  const { isFocused, onFocus, onBlur } = useFocusBorder();

  useEffect(() => {
    if (!visible) setTexto('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={styles.fill} onPress={onCancel} accessibilityLabel="Cerrar hoja" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Cerrar informe</Text>
          <Text style={styles.help}>Se agrega una entrada de cierre. Después nadie podrá escribir ni editar.</Text>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            onFocus={onFocus}
            onBlur={onBlur}
            multiline
            numberOfLines={3}
            placeholder="Motivo o resolución (opcional)"
            placeholderTextColor={glassColors.placeholder}
            style={[
              styles.input,
              focusBorderStyles.inputBorderDefault,
              isFocused && focusBorderStyles.inputBorderFocused,
              focusBorderStyles.inputNoOutline,
            ]}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={cerrando} style={[styles.button, styles.cancel]} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(texto.trim())}
              disabled={cerrando}
              style={[styles.button, styles.confirm]}
              accessibilityRole="button"
            >
              {cerrando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={14} color="#fff" />
                  <Text style={styles.confirmText}>Cerrar informe</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,28,0.45)', justifyContent: 'flex-end' },
  fill: { flex: 1 },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 22 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#dcdfe3', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '800', color: glassColors.text },
  help: { fontSize: 13.5, color: glassColors.textMuted, marginTop: 4, marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
    color: glassColors.text,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, minHeight: 42 },
  cancel: { backgroundColor: 'rgba(17,24,28,0.06)' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#4a5058' },
  confirm: { backgroundColor: glassColors.text },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
