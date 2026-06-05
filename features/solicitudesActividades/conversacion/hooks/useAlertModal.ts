import type { AlertModalAction } from '@/components/AlertModal';
import { useCallback, useState } from 'react';

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
 */
export function useAlertModal() {
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false, title: '', actions: [],
  });

  const closeAlert = useCallback(() => {
    setAlertModal(p => ({ ...p, visible: false }));
  }, []);

  const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
    const normalized: AlertModalAction[] = actions?.length
      ? actions
      : [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' }];
    setAlertModal({
      visible: true, title, message,
      actions: normalized.map(a => ({
        ...a,
        onPress: () => { setAlertModal(p => ({ ...p, visible: false })); a.onPress(); },
      })),
    });
  }, []);

  return { alertModal, showModal, closeAlert };
}
