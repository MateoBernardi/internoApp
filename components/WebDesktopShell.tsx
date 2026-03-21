import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Layout } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const colors = Colors.light;

export function WebDesktopShell({ children }: { children: React.ReactNode }) {
  const responsiveLayout = useResponsiveLayout();

  return (
    <View
      style={[
        styles.pageBackground,
        { paddingHorizontal: responsiveLayout.horizontalGutter },
      ]}
    >
      <View style={[styles.appColumn, { maxWidth: responsiveLayout.maxWidth }]}>{children}</View>
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
});
