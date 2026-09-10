import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * expo-notifications ya no soporta push remoto en Expo Go (SDK 53+): el propio
 * paquete lanza una excepción en Android apenas se evalúa el módulo (efecto de
 * import en DevicePushTokenAutoRegistration.fx), lo que tira abajo toda la app.
 * Igual que con GoogleSignin, lo cargamos con `require` sólo fuera de Expo Go.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;

if (!isExpoGo) {
  try {
    notificationsModule = require('expo-notifications');
  } catch {
    notificationsModule = null;
  }
}

export const Notifications = notificationsModule;
