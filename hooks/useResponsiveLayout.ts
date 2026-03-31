import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { Breakpoints, getWebLayoutMetrics } from '@/constants/theme';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const layout = getWebLayoutMetrics(width);

    return {
      width,
      ...layout,
      isDesktop: width >= Breakpoints.desktop,
      isDesktopXl: width >= Breakpoints.desktopXl,
    };
  }, [width]);
}
