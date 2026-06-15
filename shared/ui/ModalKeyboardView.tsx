import React from 'react';
import { KeyboardAvoidingView, KeyboardAvoidingViewProps, Platform } from 'react-native';
import { KEYBOARD_BEHAVIOR, useKeyboardVisible } from './keyboard';

/**
 * Reemplazo drop-in de KeyboardAvoidingView para modales de Android con edge-to-edge.
 *
 * En Android, keyboardDidHide envía screenY = mVisibleViewArea.height() en lugar de 0
 * porque la ventana del modal es full-screen. KAV calcula paddingBottom > 0 al cerrar
 * el teclado y el modal queda con un espacio residual en la parte inferior.
 * Driving `enabled` desde listeners explícitos de visibilidad fuerza el padding a 0
 * al ocultar sin depender de las coordenadas erróneas del evento.
 * Refs: facebook/react-native#52596, #52626
 */
export function ModalKeyboardView({
    children,
    style,
    keyboardVerticalOffset = 0,
}: {
    children: React.ReactNode;
    style?: KeyboardAvoidingViewProps['style'];
    keyboardVerticalOffset?: number;
}) {
    const keyboardVisible = useKeyboardVisible();
    return (
        <KeyboardAvoidingView
            style={style}
            behavior={KEYBOARD_BEHAVIOR}
            keyboardVerticalOffset={keyboardVerticalOffset}
            enabled={Platform.OS !== 'android' || keyboardVisible}
        >
            {children}
        </KeyboardAvoidingView>
    );
}
