import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const AUTH_FORM_MAX_WIDTH = {
  mobile: 360,
  desktop: 440,
  desktopXl: 480,
} as const;

const AUTH_FORM_HORIZONTAL_PADDING = {
  mobile: 20,
  desktop: 32,
} as const;

const AUTH_LOGO_SIZE = {
  mobile: 88,
  desktop: 104,
} as const;

/**
 * Sizing for auth forms (login, crear usuario, cambiar contraseña).
 * Based on actual viewport width (works on web and native alike) instead of
 * Platform.OS, so native tablets/foldables get the same breakpoint logic as web.
 */
export function useAuthFormLayout() {
  const responsiveLayout = useResponsiveLayout();
  const maxWidth = responsiveLayout.isDesktopXl
    ? AUTH_FORM_MAX_WIDTH.desktopXl
    : responsiveLayout.isDesktop
      ? AUTH_FORM_MAX_WIDTH.desktop
      : AUTH_FORM_MAX_WIDTH.mobile;
  const horizontalPadding = responsiveLayout.isDesktop
    ? AUTH_FORM_HORIZONTAL_PADDING.desktop
    : AUTH_FORM_HORIZONTAL_PADDING.mobile;
  const logoSize = responsiveLayout.isDesktop
    ? AUTH_LOGO_SIZE.desktop
    : AUTH_LOGO_SIZE.mobile;

  return { ...responsiveLayout, maxWidth, horizontalPadding, logoSize };
}
