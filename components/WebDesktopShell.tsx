import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Colors, Layout } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const colors = Colors.light;

export function WebDesktopShell({ children }: { children: React.ReactNode }) {
  const responsiveLayout = useResponsiveLayout();
  const viewportWidth =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.innerWidth
      : responsiveLayout.width;
  const isBrowserDesktop = Platform.OS === 'web' && viewportWidth >= 900;
  const isStandaloneWebApp =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any)?.standalone === true);
  const shouldUseDesktopShell = isStandaloneWebApp || isBrowserDesktop;
  const shellHorizontalPadding = shouldUseDesktopShell
    ? Layout.web.desktopHorizontalGutterWide
    : responsiveLayout.horizontalGutter;
  const shellMaxWidth = shouldUseDesktopShell ? Layout.web.desktopMaxWidth : responsiveLayout.maxWidth;

  return (
    <View
      style={[
        styles.pageBackground,
        { paddingHorizontal: shellHorizontalPadding },
      ]}
    >
      <View
        style={[
          styles.appColumn,
          isStandaloneWebApp ? styles.appColumnStandalone : { maxWidth: shellMaxWidth },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    paddingHorizontal: Layout.web.desktopHorizontalGutter,
    alignItems: 'center',
  },
  appColumn: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.web.containerMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.componentBackground,
  },
  appColumnStandalone: {
    maxWidth: '100%',
  },
});
