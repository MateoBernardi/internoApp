import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom safe-area inset with a guaranteed minimum. `insets.bottom` reports 0
 * on web/most desktop browsers (no home indicator), which leaves footer
 * buttons and screen content flush against the viewport edge. Use this
 * instead of raw `insets.bottom` wherever bottom padding/margin needs
 * breathing room regardless of platform.
 */
export function useSafeBottomInset(minPx = 16): number {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, minPx);
}
