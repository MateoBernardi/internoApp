import { Colors } from '@/constants/theme';
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.lightTint} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
