function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/**
 * Construye el string CSS `boxShadow` (reemplazo de los shadow* props de RN,
 * deprecados) a partir de los mismos parámetros que antes iban en
 * shadowOffset/shadowOpacity/shadowRadius/shadowColor.
 */
export function boxShadow(
  offset: { width: number; height: number },
  opacity: number,
  radius: number,
  color: string = '#000',
): string {
  return `${offset.width}px ${offset.height}px ${radius}px rgba(${hexToRgb(color)}, ${opacity})`;
}
