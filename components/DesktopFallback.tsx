import React from 'react';
import { Platform } from 'react-native';

import { WebDesktopShell } from '@/components/WebDesktopShell';

/**
 * Wraps children and applies a desktop-friendly web shell
 * while keeping native rendering untouched.
 */
export function DesktopGate({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return <WebDesktopShell>{children}</WebDesktopShell>;
}
