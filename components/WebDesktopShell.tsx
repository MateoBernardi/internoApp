import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Layout } from '@/constants/theme';

const colors = Colors.light;

export function WebDesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.pageBackground}>
      <View style={styles.appColumn}>{children}</View>
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
