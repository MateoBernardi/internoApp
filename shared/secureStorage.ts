import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Wrapper de almacenamiento seguro multiplataforma: `expo-secure-store` en
 * nativo, `localStorage` en web (SecureStore no está disponible ahí). Mismo
 * patrón que `features/auth/services/AuthSessionService.ts`, extraído acá
 * para reutilizarlo en otros features (p. ej. `device_id` persistido, el
 * secreto QR del kiosco).
 */
export const secureStorage = {
  getItem: (key: string): Promise<string | null> =>
    Platform.OS === 'web'
      ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null)
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(
          typeof localStorage !== 'undefined' ? localStorage.setItem(key, value) : undefined
        )
      : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(
          typeof localStorage !== 'undefined' ? localStorage.removeItem(key) : undefined
        )
      : SecureStore.deleteItemAsync(key),
};
