import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the top safe area inset for native platforms.
 * On web, returns 0 because the CSS env(safe-area-inset-top) is applied
 * globally via WebDesktopShell, avoiding double-counting.
 */
export function useSafeTopInset(): number {
  const { top } = useSafeAreaInsets();
  return Platform.OS === 'web' ? 0 : top;
}
