import { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { computeMaskedChange, MaskSeparator } from '@/shared/utils/maskedInput';

export interface IsolatedMaskedInputHandle {
  getValue: () => string;
}

interface IsolatedMaskedInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue' | 'selection'> {
  initialValue?: string;
  maxDigits: number;
  separators: MaskSeparator[];
}

// Misma razón de ser que IsolatedTextInput: el valor y la selección viven ACA,
// aislados de la pantalla grande que rodea al input, para que cada tecleo
// solo re-renderice este componente chico. Acá además hay que controlar
// `selection` a mano (para saltar el cursor después del separador ':'), lo
// que agrega una segunda trampa: onChangeText calcula el cursor correcto,
// pero luego onSelectionChange puede llegar con la posición nativa (previa a
// la corrección) y pisarlo. skipNextSelectionRef ignora ese primer evento
// posterior a cada tecleo para que no gane la carrera.
export const IsolatedMaskedInput = memo(forwardRef<IsolatedMaskedInputHandle, IsolatedMaskedInputProps>(
  function IsolatedMaskedInput({ initialValue = '', maxDigits, separators, ...rest }, ref) {
    const [value, setValue] = useState(initialValue);
    const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
    const skipNextSelectionRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getValue: () => value,
    }), [value]);

    const handleChangeText = (text: string) => {
      const { formatted, cursor } = computeMaskedChange(value, text, maxDigits, separators);
      skipNextSelectionRef.current = true;
      setValue(formatted);
      setSelection({ start: cursor, end: cursor });
    };

    const handleSelectionChange: TextInputProps['onSelectionChange'] = (e) => {
      if (skipNextSelectionRef.current) {
        skipNextSelectionRef.current = false;
        return;
      }
      setSelection(e.nativeEvent.selection);
    };

    return (
      <TextInput
        {...rest}
        value={value}
        selection={selection}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
      />
    );
  },
));
