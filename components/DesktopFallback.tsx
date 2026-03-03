import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const MAX_TABLET_WIDTH = 1024;

/**
 * Wraps children and shows a "mobile only" fallback on web
 * when the viewport exceeds tablet width (1024 px).
 */
export function DesktopGate({ children }: { children: React.ReactNode }) {
  // On native platforms, never gate
  if (Platform.OS !== 'web') return <>{children}</>;

  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  if (width > MAX_TABLET_WIDTH) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>Solo disponible para móviles</Text>
          <Text style={styles.subtitle}>
            Esta aplicación está diseñada para dispositivos móviles y tablets.
          </Text>
          <Text style={styles.hint}>
            Podés instalarla desde tu iPhone o Android agregándola a la pantalla de inicio desde el
            navegador.
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 48,
    maxWidth: 480,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00054b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 20,
  },
});
