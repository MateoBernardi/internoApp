import { useCallback, useState } from 'react';

export function useFocusBorder() {
  const [isFocused, setIsFocused] = useState(false);
  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(false), []);
  return { isFocused, onFocus, onBlur };
}
