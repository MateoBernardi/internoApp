import { KeyboardAvoidingViewProps } from 'react-native';

/**
 * Comportamiento estándar para KeyboardAvoidingView en toda la app.
 *
 * Se usa "padding" en ambas plataformas a propósito:
 * - En Android con edge-to-edge (Expo SDK 54 / nueva arquitectura) la ventana
 *   ya no se redimensiona automáticamente con el teclado, por lo que
 *   `behavior={undefined}` deja de funcionar en builds de producción.
 * - `behavior="height"` mide su frame inicial de forma poco confiable en builds
 *   release (funciona en dev, falla en producción).
 * - `behavior="padding"` se basa en los eventos de frame del teclado y se
 *   comporta de forma consistente entre dev y producción en iOS y Android.
 *
 * Si en algún dispositivo apareciera doble espacio (la ventana sí se
 * redimensiona y además se agrega padding), cambiar este único valor a
 * `undefined` para Android.
 */
export const KEYBOARD_BEHAVIOR: KeyboardAvoidingViewProps['behavior'] = 'padding';
