import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

export interface IsolatedTextInputHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  clear: () => void;
}

interface IsolatedTextInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue'> {
  initialValue?: string;
  onHasTextChange?: (hasText: boolean) => void;
}

// El texto vive ACA, aislado, no en la pantalla/modal grande que lo rodea. Si
// viviera arriba (junto con listas de mensajes/bitácora/imágenes y varias
// queries), cada tecleo re-renderiza todo ese árbol -> en Android eso puede
// hacer que el commit de React llegue más lento que los eventos nativos del
// EditText, y el TextInput reaplica texto+cursor desde un estado viejo -> el
// texto sale escrito al revés (cada letra pisa el mismo punto en cada
// tecleo en vez de avanzar el cursor). Aislar el estado acá hace que tipear
// solo re-renderice este componente chico, sin tocar el resto de la pantalla.
export const IsolatedTextInput = memo(forwardRef<IsolatedTextInputHandle, IsolatedTextInputProps>(
  function IsolatedTextInput({ initialValue = '', onHasTextChange, ...rest }, ref) {
    const [value, setValue] = useState(initialValue);
    const hasTextRef = useRef(initialValue.trim().length > 0);

    useImperativeHandle(ref, () => ({
      getValue: () => value,
      setValue,
      clear: () => setValue(''),
    }), [value]);

    const handleChangeText = useCallback((text: string) => {
      setValue(text);
      const hasText = text.trim().length > 0;
      if (hasText !== hasTextRef.current) {
        hasTextRef.current = hasText;
        onHasTextChange?.(hasText);
      }
    }, [onHasTextChange]);

    return <TextInput {...rest} value={value} onChangeText={handleChangeText} />;
  },
));
