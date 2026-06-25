import type { AlertModalAction } from '@/components/AlertModal';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface AlertModalState {
  visible: boolean;
  title: string;
  message?: string;
  actions: AlertModalAction[];
}

/**
 * Estado y helpers para el `AlertModal` compartido por las vistas de
 * conversación. `showModal` envuelve cada acción para cerrar el modal antes
 * de ejecutar el callback; si no se pasan acciones, agrega un "Aceptar".
 *
 * En iOS la acción NO se ejecuta en el `onPress`: se difiere hasta que el
 * `<Modal>` termina de descartarse (`onModalDismiss`, cableado al `onDismiss`
 * del Modal). Si no, una acción que presenta otro view controller —el document
 * picker o la cámara— se dispara mientras el AlertModal todavía está en plena
 * transición de dismiss, y UIKit descarta la presentación en silencio (el
 * picker "no abre"). En Android `onDismiss` no existe, así que la acción corre
 * inline en el `onPress` como siempre.
 */
export function useAlertModal() {
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false, title: '', actions: [],
  });
  const pendingActionRef = useRef<(() => void) | null>(null);

  const closeAlert = useCallback(() => {
    setAlertModal(p => ({ ...p, visible: false }));
  }, []);

  // Ejecuta la acción encolada una vez que el modal salió de la jerarquía de
  // ventanas. Debe cablearse al `onDismiss` del `AlertModal`.
  const onModalDismiss = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
    const normalized: AlertModalAction[] = actions?.length
      ? actions
      : [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' }];
    setAlertModal({
      visible: true, title, message,
      actions: normalized.map(a => ({
        ...a,
        onPress: () => {
          if (Platform.OS === 'ios') {
            pendingActionRef.current = a.onPress;
            setAlertModal(p => ({ ...p, visible: false }));
          } else {
            setAlertModal(p => ({ ...p, visible: false }));
            a.onPress();
          }
        },
      })),
    });
  }, []);

  return { alertModal, showModal, closeAlert, onModalDismiss };
}
