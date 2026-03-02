import { Colors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const colors = Colors['light'];

interface ScreenSkeletonProps {
  /** Número de bloques/filas del esqueleto (default: 5) */
  rows?: number;
  /** Mostrar un bloque de header grande arriba */
  showHeader?: boolean;
}

/**
 * Componente esqueleto reutilizable para pantallas en estado de carga.
 * Reemplaza los mensajes "Cargando..." con una animación de shimmer.
 */
export const ScreenSkeleton: React.FC<ScreenSkeletonProps> = ({
  rows = 5,
  showHeader = true,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {showHeader && (
        <Animated.View style={[styles.headerBlock, { opacity }]} />
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Animated.View style={[styles.circle, { opacity }]} />
          <View style={styles.lines}>
            <Animated.View
              style={[styles.lineWide, { opacity }]}
            />
            <Animated.View
              style={[styles.lineNarrow, { opacity }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.componentBackground,
  },
  headerBlock: {
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginBottom: 24,
    width: '60%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  lines: {
    flex: 1,
  },
  lineWide: {
    height: 14,
    borderRadius: 6,
    backgroundColor: colors.background,
    marginBottom: 8,
    width: '90%',
  },
  lineNarrow: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.background,
    width: '60%',
  },
});
