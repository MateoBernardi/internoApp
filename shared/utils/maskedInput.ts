export interface MaskSeparator {
  afterDigit: number;
  char: string;
}

// Formatea un valor enmascarado (ej. HH:MM, XX-XXXXXXXX-X) preservando dónde
// debe quedar el cursor. Reformatear el string entero en cada tecleo sin
// decir dónde va el cursor hace que React Native lo mande al final — esto
// calcula la posición correcta comparando el valor previo formateado contra
// el texto nuevo (aún sin formatear) para ubicar dónde ocurrió la edición.
export function computeMaskedChange(
  oldFormatted: string,
  newRawText: string,
  maxDigits: number,
  separators: MaskSeparator[],
): { formatted: string; cursor: number } {
  let start = 0;
  while (
    start < oldFormatted.length &&
    start < newRawText.length &&
    oldFormatted[start] === newRawText[start]
  ) {
    start++;
  }
  let oldEnd = oldFormatted.length;
  let newEnd = newRawText.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldFormatted[oldEnd - 1] === newRawText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  const editEndInNewText = newEnd;

  const digitsBeforeCursor = newRawText.slice(0, editEndInNewText).replace(/\D/g, '').length;
  const digits = newRawText.replace(/\D/g, '').slice(0, maxDigits);

  let formatted = '';
  let cursor = digitsBeforeCursor === 0 ? 0 : -1;
  for (let i = 0; i < digits.length; i++) {
    const sep = separators.find(s => s.afterDigit === i);
    if (sep) formatted += sep.char;
    formatted += digits[i];
    if (i + 1 === digitsBeforeCursor) cursor = formatted.length;
  }
  if (cursor === -1) cursor = formatted.length;

  return { formatted, cursor };
}
