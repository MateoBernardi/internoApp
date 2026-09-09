import { Colors } from '@/constants/theme';
import { glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

const colors = Colors['light'];

interface OperacionPendienteModalProps {
  visible: boolean;
  message?: string;
}

/**
 * Modal bloqueante que muestra un spinner con mensaje.
 * Se usa para operaciones PUT/UPDATE/POST para bloquear la UI y la navegación.
 */
export const OperacionPendienteModal: React.FC<OperacionPendienteModalProps> = ({
  visible,
  message = 'Espere un momento...',
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, glassStyles.modalOverlay]}>
        <View style={[styles.container, glassStyles.modalCard]}>
          <ActivityIndicator size="large" color={colors.lightTint} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {},
  container: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
