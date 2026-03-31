/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#00054bff';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    secondaryText: '#687076',
    background: '#eeeeee',
    componentBackground: '#ffffff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    lightTint: '#1a73e8',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
  },
  dark: {
    text: '#dddedfff',
    secondaryText: '#9BA1A6',
    background: '#151718',
    componentBackground: '#1E2022',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    lightTint: '#4dabf7',
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFA726',
  },
  transparent: {
    text: '#11181C',
    background: 'transparent',
    tint: tintColorLight,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorLight,
  }
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Layout = {
  web: {
    mobileMaxWidth: 640,
    desktopMinWidth: 1024,
    desktopMaxWidth: 1120,
    desktopXlMinWidth: 1440,
    desktopXlMaxWidth: 1440,
    containerMaxWidth: 640,
    desktopHorizontalGutter: 24,
    desktopHorizontalGutterWide: 32,
    desktopHorizontalGutterXl: 40,
  },
};

export const Breakpoints = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  desktopXl: 1440,
} as const;

export function getWebLayoutMetrics(viewportWidth: number) {
  if (viewportWidth >= Layout.web.desktopXlMinWidth) {
    return {
      variant: 'desktop-xl' as const,
      maxWidth: Layout.web.desktopXlMaxWidth,
      horizontalGutter: Layout.web.desktopHorizontalGutterXl,
    };
  }

  if (viewportWidth >= Layout.web.desktopMinWidth) {
    return {
      variant: 'desktop' as const,
      maxWidth: Layout.web.desktopMaxWidth,
      horizontalGutter: Layout.web.desktopHorizontalGutterWide,
    };
  }

  return {
    variant: 'mobile' as const,
    maxWidth: Layout.web.mobileMaxWidth,
    horizontalGutter: Layout.web.desktopHorizontalGutter,
  };
}
