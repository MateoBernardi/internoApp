import React from 'react';
import { Keyboard, KeyboardAvoidingViewProps, Platform } from 'react-native';

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

/**
 * Retorna true mientras el teclado esté visible.
 * Usado por ModalKeyboardView para el workaround del bug de KAV en Android con
 * edge-to-edge (ver shared/ui/ModalKeyboardView.tsx, RN#52596, #52626).
 */
export function useKeyboardVisible(): boolean {
    const [visible, setVisible] = React.useState(() => Keyboard.isVisible());

    React.useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return visible;
}

/**
 * Altura actual del teclado en px (0 cuando está oculto). Usado por los
 * formularios de creación/edición para sumarle esta altura al padding
 * inferior del contenido scrolleable, así el último campo (y el botón fijo
 * de "Crear" debajo del scroll) nunca queda tapado por el teclado — y vuelve
 * a su posición original apenas el teclado se cierra.
 */
export function useKeyboardHeight(): number {
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        // En iOS, `keyboardWill*` llega antes que `keyboardDid*` (previo a la
        // animación), lo que sincroniza mejor el padding con el movimiento real
        // del teclado. Android no dispara `keyboardWill*` de forma confiable,
        // así que ahí seguimos usando los eventos `Did*`.
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const show = Keyboard.addListener(showEvent, (event) => {
            setHeight(event.endCoordinates.height);
        });
        const hide = Keyboard.addListener(hideEvent, () => {
            setHeight(0);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return height;
}
